// API Route: /api/admin/analytics
// Admin-only analytics data export
// GET: Summary for date range (default: last 7 days)
// POST: Full export with events for Claude analysis
//
// Query params:
//   from: YYYY-MM-DD (default: 7 days ago)
//   to: YYYY-MM-DD (default: today)
//   type: summary | events | export (default: summary)

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAnalyticsSummary, getAnalyticsEvents, getAnalyticsExport } from '@/lib/analytics';

const ADMIN_SECRET = process.env.ADMIN_SECRET;

function isAdmin(request, session) {
  // Check for admin secret in header or admin role
  const authHeader = request.headers.get('x-admin-secret');
  if (authHeader && ADMIN_SECRET && authHeader === ADMIN_SECRET) return true;
  if (session.role === 'admin') return true;
  // Allow the app owner (configured via env var)
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail && session.email === adminEmail) return true;
  return false;
}

export async function GET(request) {
  const session = requireAuth(request);
  if (session instanceof NextResponse) return session;
  if (!isAdmin(request, session)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'summary';
  const to = searchParams.get('to') || new Date().toISOString().split('T')[0];
  const fromDefault = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const from = searchParams.get('from') || fromDefault;

  try {
    if (type === 'events') {
      const date = searchParams.get('date') || to;
      const eventType = searchParams.get('eventType') || null;
      const feature = searchParams.get('feature') || null;
      const events = await getAnalyticsEvents(date, { type: eventType, feature });
      return NextResponse.json({ date, eventCount: events.length, events });
    }

    if (type === 'export') {
      const data = await getAnalyticsExport(from, to);
      return NextResponse.json(data);
    }

    // Default: summary
    const summaries = await getAnalyticsSummary(from, to);
    return NextResponse.json({
      dateRange: { from, to },
      days: summaries.length,
      summaries,
    });
  } catch (err) {
    console.error('[ANALYTICS API] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}

// POST for full export (Claude analysis format)
export async function POST(request) {
  const session = requireAuth(request);
  if (session instanceof NextResponse) return session;
  if (!isAdmin(request, session)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { from, to, format = 'claude-analysis-v1' } = body;

    if (!from || !to) {
      return NextResponse.json({ error: 'from and to dates required (YYYY-MM-DD)' }, { status: 400 });
    }

    const data = await getAnalyticsExport(from, to);
    return NextResponse.json({ ...data, requestedFormat: format });
  } catch (err) {
    console.error('[ANALYTICS API] Export error:', err);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
