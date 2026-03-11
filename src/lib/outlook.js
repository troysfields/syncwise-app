// Microsoft Graph API Client — Outlook Calendar
// Handles reading and writing calendar events via Microsoft Graph
// Docs: https://learn.microsoft.com/en-us/graph/api/resources/calendar

import { logApiCall } from './logger';

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

async function graphFetch(accessToken, endpoint, { method = 'GET', body = null, user = '', userRole = 'student', action = '' } = {}) {
  const url = `${GRAPH_BASE}${endpoint}`;
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(url, options);
  const data = await res.json();

  // Log every API call for IT transparency
  logApiCall({
    user,
    userRole,
    platform: 'microsoft',
    action,
    endpoint,
    method,
    details: method !== 'GET' ? { requestBody: body } : {},
    status: res.ok ? 'success' : `error_${res.status}`,
  });

  if (!res.ok) {
    throw new Error(`Graph API error ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

// ============================================================
// READ — Students + Instructor
// ============================================================

// Get user profile
export async function getProfile(accessToken, user) {
  return graphFetch(accessToken, '/me', {
    user,
    action: 'read_profile',
  });
}

// Get calendar events for a date range
export async function getCalendarEvents(accessToken, startDate, endDate, user) {
  const start = new Date(startDate).toISOString();
  const end = new Date(endDate).toISOString();
  return graphFetch(accessToken, `/me/calendarView?startDateTime=${start}&endDateTime=${end}&$orderby=start/dateTime&$top=50`, {
    user,
    action: 'read_calendar_events',
  });
}

// Get today's events
export async function getTodayEvents(accessToken, user) {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
  return graphFetch(accessToken, `/me/calendarView?startDateTime=${startOfDay}&endDateTime=${endOfDay}&$orderby=start/dateTime`, {
    user,
    action: 'read_today_events',
  });
}

// Get this week's events
export async function getWeekEvents(accessToken, user) {
  const now = new Date();
  const endOfWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return getCalendarEvents(accessToken, now.toISOString(), endOfWeek.toISOString(), user);
}

// ============================================================
// WRITE — Auto-sync due dates to Outlook
// ============================================================

// Create a calendar event (syncs D2L due dates to Outlook)
export async function createCalendarEvent(accessToken, eventData, user, userRole = 'student') {
  // eventData: { subject, start: { dateTime, timeZone }, end: { dateTime, timeZone }, body: { content, contentType } }
  return graphFetch(accessToken, '/me/events', {
    method: 'POST',
    body: eventData,
    user,
    userRole,
    action: 'create_calendar_event_sync',
  });
}

// Update an existing synced calendar event
export async function updateCalendarEvent(accessToken, eventId, eventData, user, userRole = 'student') {
  return graphFetch(accessToken, `/me/events/${eventId}`, {
    method: 'PATCH',
    body: eventData,
    user,
    userRole,
    action: 'update_calendar_event_sync',
  });
}

// Delete a synced calendar event
export async function deleteCalendarEvent(accessToken, eventId, user, userRole = 'student') {
  return graphFetch(accessToken, `/me/events/${eventId}`, {
    method: 'DELETE',
    user,
    userRole,
    action: 'delete_calendar_event_sync',
  });
}

// ============================================================
// HELPER — Create a SyncWise-labeled Outlook event from a D2L assignment
// ============================================================

export function buildSyncWiseEvent(assignment) {
  const dueDate = new Date(assignment.dueDate);
  // Event starts 1 hour before due, ends at due time
  const startDate = new Date(dueDate.getTime() - 60 * 60 * 1000);

  return {
    subject: `[SyncWise] ${assignment.name}`,
    body: {
      contentType: 'HTML',
      content: `<p><strong>Course:</strong> ${assignment.courseName || 'Unknown'}</p>
        <p><strong>Due:</strong> ${dueDate.toLocaleString()}</p>
        <p><strong>Points:</strong> ${assignment.points || 'N/A'}</p>
        <p><em>Synced automatically by SyncWise AI</em></p>`,
    },
    start: {
      dateTime: startDate.toISOString(),
      timeZone: 'America/Denver', // CMU timezone
    },
    end: {
      dateTime: dueDate.toISOString(),
      timeZone: 'America/Denver',
    },
    categories: ['SyncWise'],
    isReminderOn: true,
    reminderMinutesBeforeStart: 60,
  };
}
