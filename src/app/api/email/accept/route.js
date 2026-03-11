// Accept Email Suggestion — Creates a calendar event from an email suggestion
// POST /api/email/accept
// Body: { accessToken, user, suggestion }

import { buildEventFromSuggestion } from '../../../../lib/outlook-mail';
import { createCalendarEvent } from '../../../../lib/outlook';
import { logApiCall } from '../../../../lib/logger';

export async function POST(request) {
  try {
    const { accessToken, user, suggestion } = await request.json();

    if (!accessToken) {
      return Response.json({ error: 'Missing access token' }, { status: 401 });
    }

    if (!suggestion || !suggestion.date) {
      return Response.json({ error: 'Suggestion must include a date' }, { status: 400 });
    }

    // Build the calendar event from the suggestion
    const eventData = buildEventFromSuggestion(suggestion);

    // Create the event in Outlook calendar
    const created = await createCalendarEvent(accessToken, eventData, user || 'unknown', 'student');

    // Log the acceptance
    logApiCall({
      user: user || 'unknown',
      userRole: 'student',
      platform: 'microsoft',
      action: 'accept_email_suggestion',
      endpoint: '/api/email/accept',
      method: 'POST',
      details: {
        eventTitle: suggestion.title,
        category: suggestion.category,
        sourceEmail: suggestion.sourceSubject,
      },
      status: 'success',
    });

    return Response.json({
      success: true,
      event: created,
    });
  } catch (err) {
    console.error('Accept suggestion failed:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
