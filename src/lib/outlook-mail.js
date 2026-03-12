// Microsoft Graph API Client — Outlook Mail (Email Scanning)
// Reads emails and uses AI to detect calendar-worthy events
// Requires Mail.Read delegated permission (read-only, per-user consent)
// Docs: https://learn.microsoft.com/en-us/graph/api/resources/message

import { logApiCall } from './logger';
import { config } from './config';
import { getModelForRequest, recordRequest } from './rate-limiter';

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

async function graphFetch(accessToken, endpoint, { user = '', action = '' } = {}) {
  const url = `${GRAPH_BASE}${endpoint}`;
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  const data = await res.json();

  logApiCall({
    user,
    userRole: 'student',
    platform: 'microsoft',
    action,
    endpoint,
    method: 'GET',
    details: {},
    status: res.ok ? 'success' : `error_${res.status}`,
  });

  if (!res.ok) {
    throw new Error(`Graph API error ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

// ============================================================
// FETCH RECENT EMAILS
// ============================================================

// Get recent emails from inbox (last 7 days by default)
export async function getRecentEmails(accessToken, user, days = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const filter = `receivedDateTime ge ${since}`;
  const select = 'id,subject,bodyPreview,from,receivedDateTime,hasAttachments,importance';
  const endpoint = `/me/messages?$filter=${encodeURIComponent(filter)}&$select=${select}&$orderby=receivedDateTime desc&$top=50`;

  return graphFetch(accessToken, endpoint, {
    user,
    action: 'read_recent_emails',
  });
}

// Search emails by keyword
export async function searchEmails(accessToken, user, query) {
  const endpoint = `/me/messages?$search="${encodeURIComponent(query)}"&$select=id,subject,bodyPreview,from,receivedDateTime&$top=25`;

  return graphFetch(accessToken, endpoint, {
    user,
    action: 'search_emails',
  });
}

// ============================================================
// AI EMAIL PARSER — Extract calendar-worthy events
// ============================================================

const EVENT_CATEGORIES = [
  'Group Project',
  'Study Session',
  'Campus Event',
  'Office Hours',
  'Club Meeting',
  'Exam / Review',
  'Workshop',
  'Social',
  'Other',
];

// Parse emails with AI to find suggested calendar events
// Supports rate limiting with automatic Sonnet → Haiku downgrade
export async function parseEmailsForEvents(emails, existingEvents = [], studentId = 'anonymous') {
  if (!emails || emails.length === 0) return { suggestions: [], isLiteMode: false, liteModeReason: null };

  const apiKey = config.ai.apiKey;

  // Build email summaries for AI
  const emailSummaries = emails.map(e => ({
    id: e.id,
    subject: e.subject || '(no subject)',
    preview: (e.bodyPreview || '').slice(0, 300),
    from: e.from?.emailAddress?.address || 'unknown',
    fromName: e.from?.emailAddress?.name || '',
    date: e.receivedDateTime,
  }));

  // Build existing events list for deduplication
  const existingEventSummary = existingEvents.map(e => {
    const name = e.subject || e.name || '';
    const start = e.start?.dateTime || e.start || '';
    return `- ${name} (${start})`;
  }).join('\n');

  const prompt = `You are CMU AI Calendar, an academic assistant at Colorado Mesa University. Analyze these emails and identify ANY that contain or reference events, meetings, deadlines, or activities that should go on a student's calendar.

For each event found, extract:
- title: clear event name
- date: ISO 8601 datetime (best guess from context, use current year 2026 if not specified)
- endDate: ISO 8601 datetime (estimate 1 hour if not specified)
- category: one of [${EVENT_CATEGORIES.join(', ')}]
- confidence: "high" (explicit date/time mentioned), "medium" (date implied or partial), "low" (vague reference)
- sourceEmailId: the email id it came from
- sourceSubject: the email subject
- reason: brief explanation of why this should be a calendar event

IMPORTANT: Skip anything that's clearly spam, marketing, or automated notifications that aren't actionable.

DEDUPLICATION: These events already exist on the calendar. Do NOT suggest duplicates:
${existingEventSummary || '(no existing events)'}

Emails to analyze:
${JSON.stringify(emailSummaries, null, 2)}

Respond in JSON:
{
  "suggestions": [
    {
      "title": "...",
      "date": "2026-03-...",
      "endDate": "2026-03-...",
      "category": "...",
      "confidence": "high|medium|low",
      "sourceEmailId": "...",
      "sourceSubject": "...",
      "reason": "..."
    }
  ]
}

If no calendar-worthy events are found, return { "suggestions": [] }`;

  // Check rate limits and get the appropriate model
  const { model, isLiteMode, reason } = getModelForRequest(studentId, 'emailScan');

  // Try AI parsing
  if (apiKey && !apiKey.startsWith('YOUR_')) {
    try {
      if (config.ai.provider === 'anthropic') {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model, // Uses Sonnet or Haiku based on rate limiter
            max_tokens: 2048,
            messages: [{ role: 'user', content: prompt }],
          }),
        });
        const data = await res.json();
        const text = data.content?.[0]?.text || '';

        // Track token usage
        const tokensUsed = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);
        recordRequest(studentId, 'emailScan', tokensUsed);

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return { suggestions: parsed.suggestions || [], isLiteMode, liteModeReason: reason };
        }
      } else {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
          }),
        });
        const data = await res.json();
        const parsed = JSON.parse(data.choices[0].message.content);
        return parsed.suggestions || [];
      }
    } catch (err) {
      console.error('AI email parsing failed, using fallback:', err.message);
    }
  }

  // Fallback: basic keyword matching when AI is unavailable
  return { suggestions: fallbackEmailParser(emailSummaries), isLiteMode: false, liteModeReason: null };
}

// ============================================================
// FALLBACK PARSER — Keyword-based detection (no AI needed)
// ============================================================

function fallbackEmailParser(emails) {
  const suggestions = [];

  const patterns = [
    { regex: /meeting|meet up|get together|sync up/i, category: 'Group Project' },
    { regex: /study group|study session|review session/i, category: 'Study Session' },
    { regex: /office hours|come by my office/i, category: 'Office Hours' },
    { regex: /campus event|student event|free food|come join/i, category: 'Campus Event' },
    { regex: /club meeting|organization meeting/i, category: 'Club Meeting' },
    { regex: /exam review|test review|final review/i, category: 'Exam / Review' },
    { regex: /workshop|training|seminar/i, category: 'Workshop' },
  ];

  // Date/time extraction patterns
  const datePatterns = [
    /(\d{1,2}\/\d{1,2}\/\d{2,4})\s*(?:at\s*)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)?/i,
    /(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s*(?:at\s*)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)?/i,
    /(tomorrow|tonight|this\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))\s*(?:at\s*)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)?/i,
  ];

  for (const email of emails) {
    const text = `${email.subject} ${email.preview}`.toLowerCase();

    for (const pattern of patterns) {
      if (pattern.regex.test(text)) {
        // Try to extract a date
        let suggestedDate = null;
        for (const dp of datePatterns) {
          const match = text.match(dp);
          if (match) {
            suggestedDate = match[0];
            break;
          }
        }

        suggestions.push({
          title: email.subject,
          date: suggestedDate || null,
          endDate: null,
          category: pattern.category,
          confidence: suggestedDate ? 'medium' : 'low',
          sourceEmailId: email.id,
          sourceSubject: email.subject,
          reason: `Email contains keywords suggesting a ${pattern.category.toLowerCase()}`,
        });
        break; // one suggestion per email
      }
    }
  }

  return suggestions;
}

// ============================================================
// HELPER — Build Outlook calendar event from a suggestion
// ============================================================

export function buildEventFromSuggestion(suggestion) {
  const startDate = new Date(suggestion.date);
  const endDate = suggestion.endDate ? new Date(suggestion.endDate) : new Date(startDate.getTime() + 60 * 60 * 1000);

  return {
    subject: `[SyncWise] ${suggestion.title}`,
    body: {
      contentType: 'HTML',
      content: `<p><strong>Category:</strong> ${suggestion.category}</p>
        <p><strong>Source:</strong> Email — "${suggestion.sourceSubject}"</p>
        <p><em>Added from email suggestion by CMU AI Calendar</em></p>`,
    },
    start: {
      dateTime: startDate.toISOString(),
      timeZone: 'America/Denver',
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone: 'America/Denver',
    },
    categories: ['SyncWise', suggestion.category],
    isReminderOn: true,
    reminderMinutesBeforeStart: 30,
  };
}
