// API Route: /api/student/notifications
// Returns date change notifications for a student
// These are generated when an instructor resolves a conflict or overrides a date
//
// GET: Fetch notifications (requires ?courses=COURSE1,COURSE2 query param)
// POST: Mark as read or dismiss (requires courseId + notificationId)

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import {
  getStudentDateNotifications,
  markStudentNotificationRead,
  dismissStudentNotification,
} from '@/lib/dedup-engine';

export async function GET(request) {
  const session = requireAuth(request);
  if (session instanceof NextResponse) return session;

  const { searchParams } = new URL(request.url);
  const coursesParam = searchParams.get('courses'); // comma-separated course names
  const unreadOnly = searchParams.get('unreadOnly') === 'true';

  const courses = coursesParam ? coursesParam.split(',').map(c => c.trim()) : [];

  if (courses.length === 0) {
    return NextResponse.json({
      notifications: [],
      totalCount: 0,
      unreadCount: 0,
      hasDateChanges: false,
      message: 'No courses specified. Pass ?courses=COURSE1,COURSE2 to see notifications.',
    });
  }

  // All functions are now async (Redis-backed)
  const notifications = await getStudentDateNotifications(courses);

  // Filter for unread if requested (already sorted by getDateChangeNotifications)
  const filtered = unreadOnly ? notifications.filter(n => !n.read) : notifications;

  return NextResponse.json({
    notifications: filtered,
    totalCount: filtered.length,
    unreadCount: filtered.filter(n => !n.read).length,
    hasDateChanges: filtered.some(n => n.type === 'date_change' && !n.read),
  });
}

export async function POST(request) {
  const session = requireAuth(request);
  if (session instanceof NextResponse) return session;

  try {
    const body = await request.json();
    const { action, courseId, notificationId, items } = body;
    // items: [{ courseId, notificationId }] for batch operations

    if (action === 'read') {
      // Single read
      if (courseId && notificationId) {
        const success = await markStudentNotificationRead(courseId, notificationId);
        return NextResponse.json({ success });
      }
      // Batch read
      if (items && Array.isArray(items)) {
        let marked = 0;
        for (const item of items) {
          if (item.courseId && item.notificationId) {
            const ok = await markStudentNotificationRead(item.courseId, item.notificationId);
            if (ok) marked++;
          }
        }
        return NextResponse.json({ success: true, marked });
      }
      return NextResponse.json(
        { error: 'Missing courseId + notificationId, or items array' },
        { status: 400 }
      );
    }

    if (action === 'dismiss') {
      // Single dismiss
      if (courseId && notificationId) {
        const success = await dismissStudentNotification(courseId, notificationId);
        return NextResponse.json({ success });
      }
      // Batch dismiss
      if (items && Array.isArray(items)) {
        let dismissed = 0;
        for (const item of items) {
          if (item.courseId && item.notificationId) {
            const ok = await dismissStudentNotification(item.courseId, item.notificationId);
            if (ok) dismissed++;
          }
        }
        return NextResponse.json({ success: true, dismissed });
      }
      return NextResponse.json(
        { error: 'Missing courseId + notificationId, or items array' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Invalid action. Use: read, dismiss' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Student notifications API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
