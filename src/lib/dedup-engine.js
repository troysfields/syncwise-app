// Deduplication & Conflict Detection Engine
// Prevents duplicate items when multiple data sources report the same assignment
// Detects date mismatches between sources and PAUSES for instructor resolution
// Instructor can override dates from student view — changes push to all students
//
// KEY BEHAVIOR: When a conflict is detected, the item is FLAGGED (not auto-resolved).
// Students see the iCal date with a "pending review" indicator until the teacher decides.
// The teacher sees the conflict on their dashboard and picks the correct date.
//
// Sources that can overlap:
// 1. D2L iCal feed (assignments, due dates from Brightspace calendar)
// 2. Instructor-uploaded documents (syllabus, schedule — parsed dates)
// 3. Microsoft Outlook calendar (future — meeting invites, class times)
// 4. Instructor manual overrides (teacher sets a date from their dashboard)

// ============================================================
// TEXT SIMILARITY — Fuzzy matching for item names
// ============================================================

function normalize(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function similarity(a, b) {
  const normA = normalize(a);
  const normB = normalize(b);

  if (normA === normB) return 1.0;
  if (!normA || !normB) return 0;

  const tokensA = new Set(normA.split(' ').filter(t => t.length > 1));
  const tokensB = new Set(normB.split(' ').filter(t => t.length > 1));

  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) intersection++;
  }

  const union = new Set([...tokensA, ...tokensB]).size;
  return intersection / union;
}

// Check if two items are likely the same assignment
function isSameItem(itemA, itemB) {
  if (itemA.source === itemB.source) return false;

  if (itemA.courseName && itemB.courseName) {
    const courseMatch = similarity(itemA.courseName, itemB.courseName);
    if (courseMatch < 0.3) return false;
  }

  const nameSim = similarity(itemA.name, itemB.name);

  if (nameSim >= 0.7) return true;
  if (nameSim >= 0.5 && itemA.type === itemB.type) return true;
  if (nameSim >= 0.4 && itemA.dueDate && itemB.dueDate) {
    const daysDiff = Math.abs(
      (new Date(itemA.dueDate) - new Date(itemB.dueDate)) / (1000 * 60 * 60 * 24)
    );
    if (daysDiff <= 7) return true; // widened from 3 to 7 days — syllabi can be off by a week
  }

  return false;
}

// Export for use in conflict detection
export { isSameItem, similarity };

// ============================================================
// DEDUPLICATION — Merge overlapping items, PAUSE on conflicts
// ============================================================

// Deduplicate items from multiple sources
// IMPORTANT: When dates conflict, the item is kept but FLAGGED.
// The teacher must resolve it — nothing auto-resolves.
export function deduplicateItems(allItems, resolvedOverrides = []) {
  if (!allItems || allItems.length === 0) {
    return { items: [], duplicatesRemoved: 0, conflicts: [], pendingConflicts: [] };
  }

  // Build a lookup of resolved overrides by item name + course
  const overrideLookup = new Map();
  for (const override of resolvedOverrides) {
    const key = `${normalize(override.itemName)}::${normalize(override.courseName)}`;
    overrideLookup.set(key, override);
  }

  // Group items by source for comparison
  const bySource = {};
  for (const item of allItems) {
    if (!bySource[item.source]) bySource[item.source] = [];
    bySource[item.source].push(item);
  }

  const kept = [];
  const removed = [];
  const conflicts = [];
  const seen = new Set(); // track items we've already processed

  // First pass: add all items, detect duplicates
  for (const item of allItems) {
    const match = kept.find(existing => isSameItem(existing, item));

    if (match) {
      // Check if there's an instructor override for this item
      const overrideKey = `${normalize(match.name)}::${normalize(match.courseName || item.courseName)}`;
      const override = overrideLookup.get(overrideKey);

      if (override && override.resolvedDate) {
        // Teacher already resolved this — use their date
        match.dueDate = override.resolvedDate;
        match.dateOverriddenBy = override.instructorId;
        match.dateOverriddenAt = override.resolvedAt;
        match.dateOverrideSource = 'instructor';
        match.hasConflict = false;
        match.conflictResolved = true;
      } else if (match.dueDate && item.dueDate) {
        // Check for date mismatch
        const dateDiff = Math.abs(
          new Date(match.dueDate) - new Date(item.dueDate)
        );
        const hoursDiff = dateDiff / (1000 * 60 * 60);

        if (hoursDiff > 1) {
          // CONFLICT: dates don't match — FLAG the item, don't auto-resolve
          const conflict = {
            id: `conflict-${match.id}-${item.id}`,
            itemName: match.name,
            courseName: match.courseName || item.courseName,
            sources: {
              ical: {
                source: match.source === 'ical' ? match.source : item.source,
                date: match.source === 'ical' ? match.dueDate : item.dueDate,
                name: match.source === 'ical' ? match.name : item.name,
                id: match.source === 'ical' ? match.id : item.id,
              },
              upload: {
                source: match.source === 'instructor_upload' ? match.source : item.source,
                date: match.source === 'instructor_upload' ? match.dueDate : item.dueDate,
                name: match.source === 'instructor_upload' ? match.name : item.name,
                id: match.source === 'instructor_upload' ? match.id : item.id,
              },
            },
            hoursDifference: Math.round(hoursDiff * 10) / 10,
            daysDifference: Math.round((hoursDiff / 24) * 10) / 10,
            severity: hoursDiff > 72 ? 'high' : hoursDiff > 24 ? 'medium' : 'low',
            message: generateConflictMessage(match, item, hoursDiff),
            resolved: false,
            resolvedBy: null,
            resolvedDate: null,
            detectedAt: new Date().toISOString(),
          };

          conflicts.push(conflict);

          // FLAG the kept item — students see it with a warning
          // We show the iCal date as the temporary display, but mark it pending
          match.hasConflict = true;
          match.conflictId = conflict.id;
          match.conflictResolved = false;
          match.pendingReview = true;
          match.alternateDate = item.dueDate; // the other date for reference
          match.alternateDateSource = item.source;
        }
      }

      // Merge supplementary data (descriptions, points, etc.)
      mergeItemData(match, item);

      removed.push({
        item,
        reason: `Duplicate of "${match.name}" (${match.source})`,
        matchId: match.id,
        nameSimilarity: similarity(match.name, item.name),
      });
    } else {
      kept.push({ ...item });
    }
  }

  // Apply any overrides that weren't caught in dedup (e.g., single-source items)
  for (const item of kept) {
    const overrideKey = `${normalize(item.name)}::${normalize(item.courseName)}`;
    const override = overrideLookup.get(overrideKey);
    if (override && override.resolvedDate && !item.conflictResolved) {
      item.originalDate = item.dueDate;
      item.dueDate = override.resolvedDate;
      item.dateOverriddenBy = override.instructorId;
      item.dateOverriddenAt = override.resolvedAt;
      item.dateOverrideSource = 'instructor';
      item.hasConflict = false;
      item.pendingReview = false;
    }
  }

  return {
    items: kept,
    duplicatesRemoved: removed.length,
    duplicateDetails: removed,
    conflicts,
    pendingConflicts: conflicts.filter(c => !c.resolved),
    conflictCount: conflicts.length,
  };
}

// Merge supplementary data from a duplicate into the primary item
function mergeItemData(primary, secondary) {
  if (!primary.description && secondary.description) {
    primary.description = secondary.description;
  }

  if (!primary.points && secondary.points) {
    primary.points = secondary.points;
  }

  if (!primary.mergedFrom) primary.mergedFrom = [primary.source];
  primary.mergedFrom.push(secondary.source);

  if (primary.type === 'event' && secondary.type !== 'event') {
    primary.type = secondary.type;
  }

  return primary;
}

// ============================================================
// CONFLICT MESSAGES
// ============================================================

function generateConflictMessage(itemA, itemB, hoursDiff) {
  const dateA = new Date(itemA.dueDate);
  const dateB = new Date(itemB.dueDate);
  const strA = dateA.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const strB = dateB.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const daysDiff = Math.round(hoursDiff / 24);

  const name = itemA.name || itemB.name;
  const sourceA = itemA.source === 'ical' ? 'D2L Calendar' : itemA.source === 'instructor_upload' ? 'uploaded document' : itemA.source;
  const sourceB = itemB.source === 'ical' ? 'D2L Calendar' : itemB.source === 'instructor_upload' ? 'uploaded document' : itemB.source;

  if (daysDiff >= 7) {
    return `"${name}" shows ${strA} (${sourceA}) vs ${strB} (${sourceB}). That's ${daysDiff} days apart — please confirm the correct date.`;
  } else if (daysDiff >= 1) {
    return `"${name}" is ${strA} (${sourceA}) but ${strB} (${sourceB}). Off by ${daysDiff} day${daysDiff > 1 ? 's' : ''} — which is correct?`;
  } else {
    return `"${name}" has a time difference: ${strA} (${sourceA}) vs ${strB} (${sourceB}).`;
  }
}

// ============================================================
// INSTRUCTOR DATE OVERRIDE SYSTEM
// ============================================================

// In-memory store for overrides (swap for DB in production)
const dateOverrides = new Map();
// In-memory store for student notifications (swap for DB in production)
const studentNotifications = [];

// Instructor resolves a conflict by picking or entering a date
export function resolveConflict(conflictId, resolution) {
  const {
    instructorId,
    correctDate,       // ISO date string — the date the teacher picks
    correctSource,     // 'ical', 'upload', or 'custom' (teacher entered a new date)
    note = '',         // optional note explaining the change
    courseName,
    itemName,
  } = resolution;

  const override = {
    id: `override-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    conflictId,
    instructorId,
    courseName,
    itemName,
    resolvedDate: correctDate,
    correctSource,
    note,
    resolvedAt: new Date().toISOString(),
    // Track what students need to be notified
    studentNotificationSent: false,
  };

  // Store the override
  const key = `${normalize(itemName)}::${normalize(courseName)}`;
  dateOverrides.set(key, override);

  // Generate student notification
  const notification = generateStudentDateChangeNotification(override);
  studentNotifications.push(notification);

  return { override, notification };
}

// Instructor overrides a date from the student view on their dashboard
// (not necessarily a conflict — just changing any date they see)
export function instructorOverrideDate(overrideRequest) {
  const {
    instructorId,
    itemId,
    itemName,
    courseName,
    originalDate,
    newDate,
    reason = '',
  } = overrideRequest;

  const override = {
    id: `override-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    conflictId: null, // not from a conflict — direct override
    instructorId,
    courseName,
    itemName,
    itemId,
    originalDate,
    resolvedDate: newDate,
    correctSource: 'instructor_override',
    note: reason,
    resolvedAt: new Date().toISOString(),
    studentNotificationSent: false,
  };

  const key = `${normalize(itemName)}::${normalize(courseName)}`;
  dateOverrides.set(key, override);

  // Generate student notification
  const notification = generateStudentDateChangeNotification(override);
  studentNotifications.push(notification);

  return { override, notification };
}

// Get all active overrides (for applying to dashboard data)
export function getActiveOverrides() {
  return Array.from(dateOverrides.values());
}

// Get overrides for a specific course
export function getOverridesForCourse(courseName) {
  return Array.from(dateOverrides.values()).filter(
    o => normalize(o.courseName) === normalize(courseName)
  );
}

// ============================================================
// STUDENT NOTIFICATIONS — Alert students when dates change
// ============================================================

// Generate a notification for students when an instructor changes a date
function generateStudentDateChangeNotification(override) {
  const originalDate = override.originalDate
    ? new Date(override.originalDate).toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : 'not set';

  const newDate = new Date(override.resolvedDate).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const isEarlier = override.originalDate &&
    new Date(override.resolvedDate) < new Date(override.originalDate);

  return {
    id: `student-notif-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type: 'date_change',
    severity: isEarlier ? 'high' : 'medium', // earlier deadline = more urgent
    title: `Date Changed: ${override.itemName}`,
    message: override.originalDate
      ? `Your instructor updated the due date for "${override.itemName}" in ${override.courseName}. It was ${originalDate}, now it's ${newDate}.`
      : `Your instructor set the due date for "${override.itemName}" in ${override.courseName} to ${newDate}.`,
    details: {
      itemName: override.itemName,
      courseName: override.courseName,
      originalDate: override.originalDate || null,
      newDate: override.resolvedDate,
      changedBy: override.instructorId,
      reason: override.note || null,
      isEarlier,
    },
    // Targeting — which students should see this
    targetCourse: override.courseName,
    targetAll: true, // all students enrolled in this course
    // Status
    read: false,
    dismissed: false,
    createdAt: new Date().toISOString(),
    overrideId: override.id,
  };
}

// Get unread date change notifications for a student
// In production, filter by student's enrolled courses
export function getStudentDateNotifications(studentCourses = []) {
  if (studentCourses.length === 0) {
    return studentNotifications.filter(n => !n.dismissed);
  }

  const normalizedCourses = studentCourses.map(c => normalize(c));
  return studentNotifications.filter(n =>
    !n.dismissed &&
    normalizedCourses.some(c =>
      normalize(n.targetCourse).includes(c) || c.includes(normalize(n.targetCourse))
    )
  );
}

// Mark a student notification as read
export function markStudentNotificationRead(notificationId) {
  const notif = studentNotifications.find(n => n.id === notificationId);
  if (notif) {
    notif.read = true;
    return true;
  }
  return false;
}

// Dismiss a student notification
export function dismissStudentNotification(notificationId) {
  const notif = studentNotifications.find(n => n.id === notificationId);
  if (notif) {
    notif.dismissed = true;
    return true;
  }
  return false;
}

// ============================================================
// CONFLICT DETECTION — Find date mismatches for instructor review
// ============================================================

export function detectDateConflicts(icalEvents, uploadedItems) {
  const conflicts = [];

  for (const uploaded of uploadedItems) {
    if (!uploaded.dueDate) continue;

    for (const icalEvent of icalEvents) {
      if (!icalEvent.dueDate) continue;
      if (!isSameItem(icalEvent, uploaded)) continue;

      const dateDiff = Math.abs(
        new Date(icalEvent.dueDate) - new Date(uploaded.dueDate)
      );
      const hoursDiff = dateDiff / (1000 * 60 * 60);

      if (hoursDiff > 1) {
        conflicts.push({
          id: `conflict-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          itemName: icalEvent.name,
          courseName: icalEvent.courseName || uploaded.courseName,
          d2lDate: icalEvent.dueDate,
          uploadedDate: uploaded.dueDate,
          d2lSource: 'D2L Calendar Feed',
          uploadedSource: uploaded.sourceFile || 'Instructor Upload',
          hoursDifference: Math.round(hoursDiff * 10) / 10,
          daysDifference: Math.round((hoursDiff / 24) * 10) / 10,
          severity: hoursDiff > 72 ? 'high' : hoursDiff > 24 ? 'medium' : 'low',
          message: generateConflictMessage(icalEvent, uploaded, hoursDiff),
          resolved: false,
          resolvedBy: null,
          resolvedDate: null,
          detectedAt: new Date().toISOString(),
        });
      }
    }
  }

  return conflicts;
}

// ============================================================
// INSTRUCTOR NOTIFICATIONS — Alert teachers to conflicts
// ============================================================

export function generateConflictNotifications(conflicts) {
  if (!conflicts || conflicts.length === 0) return [];

  const byCourse = {};
  for (const c of conflicts) {
    const course = c.courseName || 'Unknown Course';
    if (!byCourse[course]) byCourse[course] = [];
    byCourse[course].push(c);
  }

  const notifications = [];

  for (const [course, courseConflicts] of Object.entries(byCourse)) {
    const highSeverity = courseConflicts.filter(c => c.severity === 'high');
    const medSeverity = courseConflicts.filter(c => c.severity === 'medium');
    const unresolved = courseConflicts.filter(c => !c.resolved);

    if (unresolved.length === 0) continue; // skip if all resolved

    notifications.push({
      id: `conflict-notif-${course}-${Date.now()}`,
      type: 'date_conflict',
      severity: highSeverity.length > 0 ? 'high' : medSeverity.length > 0 ? 'medium' : 'low',
      title: `Action Required: Date Mismatch${unresolved.length > 1 ? 'es' : ''} in ${course}`,
      message: unresolved.length === 1
        ? unresolved[0].message
        : `${unresolved.length} items in ${course} have different dates between D2L and your uploaded document. Students see the D2L date for now — please confirm the correct dates.`,
      course,
      conflicts: unresolved,
      conflictCount: unresolved.length,
      actions: [
        { label: 'Review & Fix Dates', action: 'review_conflicts', courseFilter: course },
        { label: 'D2L Dates Are Correct', action: 'accept_ical_dates', courseFilter: course },
        { label: 'Dismiss', action: 'dismiss' },
      ],
      read: false,
      createdAt: new Date().toISOString(),
    });
  }

  return notifications;
}

// Format conflicts for instructor dashboard display
export function formatConflictsForInstructor(conflicts) {
  return conflicts.map(c => ({
    ...c,
    d2lDateFormatted: c.d2lDate
      ? new Date(c.d2lDate).toLocaleDateString('en-US', {
          weekday: 'short', month: 'short', day: 'numeric',
          hour: '2-digit', minute: '2-digit',
        })
      : 'No date',
    uploadedDateFormatted: c.uploadedDate
      ? new Date(c.uploadedDate).toLocaleDateString('en-US', {
          weekday: 'short', month: 'short', day: 'numeric',
          hour: '2-digit', minute: '2-digit',
        })
      : 'No date',
    severityColor: c.severity === 'high' ? '#DC2626' : c.severity === 'medium' ? '#D97706' : '#6B7280',
    severityLabel: c.severity === 'high' ? 'Major Mismatch' : c.severity === 'medium' ? 'Minor Mismatch' : 'Time Difference',
    resolution: {
      options: [
        { label: 'Use D2L Date', value: 'ical', date: c.d2lDate },
        { label: 'Use Uploaded Date', value: 'upload', date: c.uploadedDate },
        { label: 'Enter Custom Date', value: 'custom', date: null },
      ],
    },
  }));
}
