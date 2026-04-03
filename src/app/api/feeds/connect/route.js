// API Route: /api/feeds/connect
// Connects or updates a D2L calendar feed for an existing logged-in user.
// POST: { icalUrl } → validates, saves to user profile, returns success

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { saveUser, getUser } from '@/lib/db';

export async function POST(request) {
  try {
    // Require authenticated session
    const session = getSession(request);
    if (!session?.email) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
    }

    const body = await request.json();
    const { icalUrl, courses } = body;

    if (!icalUrl || typeof icalUrl !== 'string') {
      return NextResponse.json({ error: 'Calendar feed URL is required.' }, { status: 400 });
    }

    const cleanUrl = icalUrl.trim();

    // Basic URL validation
    if (!cleanUrl.startsWith('https://')) {
      return NextResponse.json({ error: 'URL must use HTTPS.' }, { status: 400 });
    }

    if (!cleanUrl.includes('.ics') && !cleanUrl.includes('/calendar/feed/')) {
      return NextResponse.json({ error: 'This doesn\'t look like a D2L calendar feed URL.' }, { status: 400 });
    }

    // Verify user exists
    const user = await getUser(session.email);
    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    // Update user profile with the new icalUrl
    await saveUser(session.email, {
      icalUrl: cleanUrl,
      courses: courses || user.courses || {},
    });

    return NextResponse.json({
      success: true,
      message: 'Calendar feed connected successfully.',
    });
  } catch (err) {
    console.error('[FEEDS/CONNECT] Error:', err);
    return NextResponse.json({ error: 'Failed to connect calendar.' }, { status: 500 });
  }
}
