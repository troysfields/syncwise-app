// API Route: /api/instructor/conflicts
// Manages date conflicts and instructor date overrides
// Storage: Redis (persistent) — replaces old in-memory Map that was lost on every deploy/cold start
//
// GET: List conflicts (filter by course, include/exclude resolved)
// POST actions:
//   - report: Store new conflicts detected during data fetch
//   - resolve: Teacher picks the correct date for a conflict
//   - override: Teacher changes any date from student view (no conflict needed)
//   - dismiss_all: Dismiss all conflicts for a course
//   - accept_ical: Accept all D2L dates as correct for a course

import { NextResponse } from 'next/server';
import {
  formatConflictsForInstructor,
  resolveConflict,
  instructorOverrideDate,
  getActiveOverrides,
  getOverridesForCourse,
} from '@/lib/dedup-engine';
import { logApiCall } from '@/lib/logger';
import { requireAuth } from '@/lib/auth';
import { saveConflicts, getAllConflicts } from '@/lib/db';

// ─── Redis-backed conflict store helpers ───

async function getConflictMap() {
  try {
    const conflicts = await getAllConflicts();
    const map = new Map();
    for (const c of conflicts) {
      map.set(c.id, c);
    }
    return map;
  } catch {
    return new Map();
  }
}

async function persistConflicts(conflictMap) {
  try {
    const conflicts = Array.from(conflictMap.values());
    // Group by course and save
    const byCourse = {};
    for (const c of conflicts) {
      const key = c.courseName || 'unknown';
      if (!byCourse[key]) byCourse[key] = [];
      byCourse[key].push(c);
    }
    for (const [courseName, courseConflicts] of Object.entries(byCourse)) {
      const courseId = courseName.replace(/\s+/g, '-').toLowerCase();
      await saveConflicts(courseId, courseConflicts);
    }
  } catch (err) {
    console.error('Failed to persist conflicts:', err.message);
  }
}

export async function GET(request) {
  const session = requireAuth(request);
  if (session instanceof NextResponse) return session;

  const { searchParams } = new URL(request.url);
  const course = searchParams.get('course');
  const includeResolved = searchParams.get('includeResolved') === 'true';
  const type = searchParams.get('type'); // 'conflicts', 'overrides', or both (default)

  let response = {};

  // Get conflicts from Redis
  if (!type || type === 'conflicts') {
    const conflictMap = await getConflictMap();
    let conflicts = Array.from(conflictMap.values());

    if (course) {
      conflicts = conflicts.filter(c => c.courseName === course);
    }
    if (!includeResolved) {
      conflicts = conflicts.filter(c => !c.resolved);
    }

    response.conflicts = formatConflictsForInstructor(conflicts);
    response.totalConflicts = conflicts.length;
    response.unresolvedCount = conflicts.filter(c => !c.resolved).length;
  }

  // Get overrides
  if (!type || type === 'overrides') {
    const overrides = course
      ? getOverridesForCourse(course)
      : getActiveOverrides();

    response.overrides = overrides;
    response.totalOverrides = overrides.length;
  }

  const conflictMap = await getConflictMap();
  response.courses = [...new Set(
    Array.from(conflictMap.values()).map(c => c.courseName)
  )];

  return NextResponse.json(response);
}

export async function POST(request) {
  const session = requireAuth(request);
  if (session instanceof NextResponse) return session;

  try {
    const body = await request.json();
    const { action, instructorId = 'instructor' } = body;

    // ============================================================
    // REPORT — Store new conflicts (called from dashboard data fetch)
    // ============================================================
    if (action === 'report') {
      const { conflicts } = body;
      if (conflicts && Array.isArray(conflicts)) {
        const conflictMap = await getConflictMap();
        for (const conflict of conflicts) {
          conflictMap.set(conflict.id, conflict);
        }
        await persistConflicts(conflictMap);
        return NextResponse.json({ success: true, stored: conflicts.length });
      }
      return NextResponse.json({ error: 'Missing conflicts array' }, { status: 400 });
    }

    // ============================================================
    // RESOLVE — Teacher picks the correct date for a conflict
    // ============================================================
    if (action === 'resolve') {
      const { conflictId, correctDate, correctSource, note } = body;

      if (!conflictId || !correctDate) {
        return NextResponse.json(
          { error: 'Missing conflictId or correctDate' },
          { status: 400 }
        );
      }

      const conflictMap = await getConflictMap();
      const conflict = conflictMap.get(conflictId);
      if (!conflict) {
        return NextResponse.json({ error: 'Conflict not found' }, { status: 404 });
      }

      // Resolve the conflict and create the override
      const { override, notification } = resolveConflict(conflictId, {
        instructorId,
        correctDate,
        correctSource: correctSource || 'custom',
        note: note || '',
        courseName: conflict.courseName,
        itemName: conflict.itemName,
      });

      // Mark conflict as resolved in store
      conflict.resolved = true;
      conflict.resolvedBy = instructorId;
      conflict.resolvedDate = correctDate;
      conflict.resolvedAt = new Date().toISOString();
      conflictMap.set(conflictId, conflict);
      await persistConflicts(conflictMap);

      logApiCall({
        user: instructorId,
        userRole: 'instructor',
        platform: 'conflicts',
        action: 'resolve_conflict',
        endpoint: '/api/instructor/conflicts',
        method: 'POST',
        details: {
          conflictId,
          correctDate,
          correctSource,
          itemName: conflict.itemName,
          courseName: conflict.courseName,
          studentNotificationGenerated: true,
        },
        status: 'success',
      });

      return NextResponse.json({
        success: true,
        override,
        studentNotification: notification,
        message: `Date updated for "${conflict.itemName}". All students in ${conflict.courseName} will be notified.`,
      });
    }

    // ============================================================
    // OVERRIDE — Teacher changes any date (not just conflicts)
    // This is the "override from student view" feature
    // ============================================================
    if (action === 'override') {
      const { itemId, itemName, courseName, originalDate, newDate, reason } = body;

      if (!itemName || !courseName || !newDate) {
        return NextResponse.json(
          { error: 'Missing itemName, courseName, or newDate' },
          { status: 400 }
        );
      }

      const { override, notification } = instructorOverrideDate({
        instructorId,
        itemId,
        itemName,
        courseName,
        originalDate,
        newDate,
        reason: reason || '',
      });

      logApiCall({
        user: instructorId,
        userRole: 'instructor',
        platform: 'overrides',
        action: 'override_date',
        endpoint: '/api/instructor/conflicts',
        method: 'POST',
        details: {
          itemName,
          courseName,
          originalDate,
          newDate,
          reason,
          studentNotificationGenerated: true,
        },
        status: 'success',
      });

      return NextResponse.json({
        success: true,
        override,
        studentNotification: notification,
        message: `Date overridden for "${itemName}". All students in ${courseName} will be notified.`,
      });
    }

    // ============================================================
    // ACCEPT_ICAL — Accept all D2L dates as correct for a course
    // Resolves all conflicts at once by choosing iCal dates
    // ============================================================
    if (action === 'accept_ical') {
      const { course } = body;
      if (!course) {
        return NextResponse.json({ error: 'Missing course' }, { status: 400 });
      }

      const conflictMap = await getConflictMap();
      let resolved = 0;
      const notifications = [];

      for (const [id, conflict] of conflictMap) {
        if (conflict.courseName === course && !conflict.resolved) {
          const { override, notification } = resolveConflict(id, {
            instructorId,
            correctDate: conflict.d2lDate,
            correctSource: 'ical',
            note: 'D2L calendar dates confirmed as correct',
            courseName: conflict.courseName,
            itemName: conflict.itemName,
          });

          conflict.resolved = true;
          conflict.resolvedBy = instructorId;
          conflict.resolvedDate = conflict.d2lDate;
          conflict.resolvedAt = new Date().toISOString();

          notifications.push(notification);
          resolved++;
        }
      }

      await persistConflicts(conflictMap);

      logApiCall({
        user: instructorId,
        userRole: 'instructor',
        platform: 'conflicts',
        action: 'accept_all_ical_dates',
        endpoint: '/api/instructor/conflicts',
        method: 'POST',
        details: { course, conflictsResolved: resolved },
        status: 'success',
      });

      return NextResponse.json({
        success: true,
        resolved,
        studentNotifications: notifications,
        message: `${resolved} conflict${resolved !== 1 ? 's' : ''} resolved — D2L dates confirmed for ${course}.`,
      });
    }

    // ============================================================
    // DISMISS_ALL — Dismiss all conflicts for a course
    // ============================================================
    if (action === 'dismiss_all') {
      const { course } = body;
      const conflictMap = await getConflictMap();
      let dismissed = 0;

      for (const [id, conflict] of conflictMap) {
        if (!course || conflict.courseName === course) {
          conflict.resolved = true;
          conflict.resolvedBy = instructorId;
          conflict.resolvedAt = new Date().toISOString();
          conflict.resolution = 'dismissed';
          dismissed++;
        }
      }

      await persistConflicts(conflictMap);

      return NextResponse.json({ success: true, dismissed });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use: report, resolve, override, accept_ical, dismiss_all' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Conflicts API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
