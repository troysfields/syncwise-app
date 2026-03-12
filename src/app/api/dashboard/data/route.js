// API Route: /api/dashboard/data
// Main dashboard data endpoint — aggregates all consent-based data sources
// POST body: { icalUrl, studentEmail, uploadedDocs }

import { NextResponse } from 'next/server';
import { handleDashboardDataRequest } from '@/lib/consent-data';

export async function POST(request) {
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
  return NextResponse.json({
    endpoint: '/api/dashboard/data',
    method: 'POST',
    description: 'Fetch aggregated dashboard data from all consent-based sources',
    body: {
      icalUrl: '(required) D2L calendar feed URL',
      studentEmail: '(optional) Student email for audit logging',
      uploadedDocs: '(optional) Array of instructor-uploaded document analysis results',
    },
  });
}
