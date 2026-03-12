// API Route: /api/admin/security-log
// GET: Look up a security event by error code, or list recent events
// Requires ADMIN_SECRET for access.
//
// Usage:
//   GET /api/admin/security-log?code=SEC-FLOG-7K3M2A-x9f2&secret=YOUR_ADMIN_SECRET
//   GET /api/admin/security-log?limit=20&secret=YOUR_ADMIN_SECRET

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { lookupSecurityEvent, listSecurityEvents, notifyAdminAccess } from '@/lib/email';

export async function GET(request) {
  // Require admin authentication
  const adminCheck = requireAdmin(request);
  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const limit = parseInt(url.searchParams.get('limit') || '50', 10);

  // Notify admin that security logs were accessed
  notifyAdminAccess(request, `Security logs accessed. ${code ? `Lookup code: ${code}` : `Listed ${limit} recent events.`}`).catch(() => {});

  // Look up specific event by code
  if (code) {
    const event = await lookupSecurityEvent(code);
    if (!event) {
      return NextResponse.json({
        error: 'Event not found. The code may be invalid or the event may have expired (90-day retention).',
        code,
      }, { status: 404 });
    }
    return NextResponse.json({ success: true, event });
  }

  // List recent events
  const events = await listSecurityEvents(Math.min(limit, 200));
  return NextResponse.json({
    success: true,
    count: events.length,
    events,
  });
}
