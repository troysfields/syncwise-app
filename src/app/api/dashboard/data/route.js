// API Route: /api/dashboard/data
// Main dashboard data endpoint — aggregates all consent-based data sources
// POST body: { icalUrl, studentEmail, uploadedDocs }
// AUTH: Requires valid session

import { NextResponse } from 'next/server';
import { handleDashboardDataRequest } from '@/lib/consent-data';
import { requireAuth } from '@/lib/auth';

export async function POST(request) {
  // Auth check
  const session = requireAuth(request);
  if (session instanceof NextResponse) return session;

  try {
    const result = await handleDashboardDataRequest(request);

    if (result.error) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Dashboard data API error:', error);
    return NextResponse.json(
      { error: 'Internal server error fetching dashboard data' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed. Use POST.' }, { status: 405 });
}
