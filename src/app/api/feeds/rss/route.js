// API Route: /api/feeds/rss
// Fetches and parses D2L RSS announcement feeds for a student
// POST body: { feeds: [{ url: "...", courseName: "ENTR 450" }] }

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { fetchAndParseRSSFeed, getRecentAnnouncements } from '@/lib/rss-parser';

export async function POST(request) {
  const session = requireAuth(request);
  if (session instanceof NextResponse) return session;

  try {
    const body = await request.json();
    const { feeds, user = 'anonymous', daysBack = 30 } = body;

    // Validate input
    if (!feeds || !Array.isArray(feeds) || feeds.length === 0) {
      return NextResponse.json(
        { error: 'Missing or empty feeds array in request body' },
        { status: 400 }
      );
    }

    if (feeds.length > 20) {
      return NextResponse.json(
        { error: 'Too many feeds. Maximum 20 feeds per request.' },
        { status: 400 }
      );
    }

    // Fetch all feeds in parallel
    const results = await Promise.allSettled(
      feeds.map(feed =>
        fetchAndParseRSSFeed(feed.url, feed.courseName || '', user)
      )
    );

    // Combine all announcements
    const allAnnouncements = [];
    const feedResults = [];

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const feedInput = feeds[i];

      if (result.status === 'fulfilled' && result.value.success) {
        allAnnouncements.push(...result.value.announcements);
        feedResults.push({
          url: feedInput.url,
          courseName: feedInput.courseName || result.value.feedInfo?.title || 'Unknown',
          success: true,
          count: result.value.count,
        });
      } else {
        feedResults.push({
          url: feedInput.url,
          courseName: feedInput.courseName || 'Unknown',
          success: false,
          error: result.status === 'rejected'
            ? result.reason?.message
            : result.value?.error || 'Unknown error',
        });
      }
    }

    // Get recent announcements sorted by date
    const recent = getRecentAnnouncements(allAnnouncements, daysBack);

    return NextResponse.json({
      success: true,
      announcements: recent,
      totalCount: allAnnouncements.length,
      recentCount: recent.length,
      feedResults,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('RSS feed API error:', error);
    return NextResponse.json(
      { error: 'Internal server error processing RSS feeds' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed. Use POST.' }, { status: 405 });
}
