// API Route: /api/student/notifications
// Returns date change notifications for a student
// These are generated when an instructor resolves a conflict or overrides a date
import { requireAuth } from '@/lib/auth';
import { NextResponse as NR } from 'next/server';
//
// GET: Fetch notifications (optionally filter by course)
// POST: Mark as read or dismiss

import { NextResponse } from 'next/server';
import {
  getStudentDateNotifications,
  markStudentNotificationRead,
  dismissStudentNotification,
} from '@/lib/dedup-engine';

export async function GET(request) {
  const session = requireAuth(request);
  if (session instanceof NR) return session;

  const { searchParams } = new URL(request.url);
  const coursesParam = searchParams.get('courses'); // comma-separated course names
  const unreadOnly = searchParams.get('unreadOnly') === 'true';

  const courses = coursesParam ? coursesParam.split(',').map(c => c.trim()) : [];
  let notifications = getStudentDateNotifications(courses);

  if (unreadOnly) {
    notifications = notifications.filter(n => !n.read);
  }

  // Sort: unread first, then by date (newest first)
  notifications.sort((a, b) => {
    if (a.read !== b.read) return a.read ? 1 : -1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return NextResponse.json({
    notifications,
    totalCount: notifications.length,
    unreadCount: notifications.filter(n => !n.read).length,
    hasDateChanges: notifications.some(n => n.type === 'date_change' && !n.read),
  });
}

export async function POST(request) {
  const session2 = requireAuth(request);
  if (session2 instanceof NR) return session2;

  try {
    const body = await request.json();
    const { action, notificationId, notificationIds } = body;

    if (action === 'read') {
      if (notificationId) {
        const success = markStudentNotificationRead(notificationId);
        return NextResponse.json({ success });
      }
      // Batch read
      if (notificationIds && Array.isArray(notificationIds)) {
        let marked = 0;
        for (const id of notificationIds) {
          if (markStudentNotificationRead(id)) marked++;
        }
        return NextResponse.json({ success: true, marked });
      }
    }

    if (action === 'dismiss') {
      if (notificationId) {
        const success = dismissStudentNotification(notificationId);
        return NextResponse.json({ success });
      }
      if (notificationIds && Array.isArray(notificationIds)) {
        let dismissed = 0;
        for (const id of notificationIds) {
          if (dismissStudentNotification(id)) dismissed++;
        }
        return NextResponse.json({ success: true, dismissed });
      }
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
