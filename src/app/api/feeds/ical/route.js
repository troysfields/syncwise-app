// API Route: /api/feeds/ical
// Fetches and parses a D2L iCal calendar feed for a student
// POST body: { feedUrl: "https://d2l.coloradomesa.edu/d2l/le/calendar/feed/user/feed.ics?token=..." }

import { NextResponse } from 'next/server';
import { fetchAndParseICalFeed, getUpcomingEvents, assignCourseColors } from '@/lib/ical-parser';
import { requireAuth, sanitizeUrl } from '@/lib/auth';
import { trackICalRefresh, trackError } from '@/lib/analytics';

export async function POST(request) {
  const startTime = Date.now();
  const session = requireAuth(request);
  if (session instanceof NextResponse) return session;

  try {
    const body = await request.json();
    const { feedUrl, user = 'anonymous', daysAhead = 90 } = body;

    // Validate feed URL
    if (!feedUrl) {
      return NextResponse.json(
        { error: 'Missing feedUrl in request body' },
        { status: 400 }
      );
    }

    // Basic URL validation — must be a D2L calendar feed
    if (!feedUrl.includes('/d2l/le/calendar/feed/') && !feedUrl.endsWith('.ics')) {
      return NextResponse.json(
        { error: 'Invalid feed URL. Must be a D2L calendar feed (.ics) URL.' },
        { status: 400 }
      );
    }

    // Fetch and parse the iCal feed
    const result = await fetchAndParseICalFeed(feedUrl, user);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, fetchedAt: result.fetchedAt },
        { status: 502 }
      );
    }

    // Assign consistent course colors
    const { events, courseMap } = assignCourseColors(result.events);

    // Get upcoming events for dashboard view
    const upcoming = getUpcomingEvents(events, daysAhead);

    // Track analytics (fire-and-forget)
    trackICalRefresh({
      userEmail: session.email || session.sub,
      isManual: body.isManual || false,
      courseCount: Object.keys(courseMap || {}).length,
      assignmentCount: events.length,
      responseTimeMs: Date.now() - startTime,
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      events,
      upcoming,
      courseMap,
      totalCount: events.length,
      upcomingCount: upcoming.length,
      fetchedAt: result.fetchedAt,
    });
  } catch (error) {
    console.error('iCal feed API error:', error);
    trackError({ endpoint: '/api/feeds/ical', userEmail: session?.email, errorType: 'ical_error', errorMessage: error.message, statusCode: 500 }).catch(() => {});
    return NextResponse.json(
      { error: 'Internal server error processing iCal feed' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed. Use POST.' }, { status: 405 });
}
