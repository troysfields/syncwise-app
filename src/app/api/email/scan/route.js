// Email Scan API — Scans Outlook inbox for calendar-worthy events
// POST /api/email/scan
// Body: { accessToken, user, existingEvents?, days? }

import { getRecentEmails, parseEmailsForEvents } from '../../../../lib/outlook-mail';
import { getWeekEvents } from '../../../../lib/outlook';
import { logApiCall } from '../../../../lib/logger';

export async function POST(request) {
  try {
    const { accessToken, user, existingEvents, days } = await request.json();

    if (!accessToken) {
      return Response.json({ error: 'Missing access token' }, { status: 401 });
    }

    // 1. Fetch recent emails
    const emailResponse = await getRecentEmails(accessToken, user || 'unknown', days || 7);
    const emails = emailResponse.value || [];

    // 2. Get existing calendar events for deduplication
    let calendarEvents = existingEvents || [];
    if (calendarEvents.length === 0) {
      try {
        const eventResponse = await getWeekEvents(accessToken, user);
        calendarEvents = eventResponse.value || [];
      } catch (err) {
        // Calendar fetch failed — continue without deduplication
        console.warn('Could not fetch calendar for dedup:', err.message);
      }
    }

    // 3. Parse emails with AI
    const suggestions = await parseEmailsForEvents(emails, calendarEvents);

    // Log the scan action
    logApiCall({
      user: user || 'unknown',
      userRole: 'student',
      platform: 'microsoft',
      action: 'email_scan_for_events',
      endpoint: '/api/email/scan',
      method: 'POST',
      details: {
        emailsScanned: emails.length,
        suggestionsFound: suggestions.length,
      },
      status: 'success',
    });

    return Response.json({
      success: true,
      emailsScanned: emails.length,
      suggestions: suggestions,
    });
  } catch (err) {
    console.error('Email scan failed:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
