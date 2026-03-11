// D2L Brightspace API Client
// Handles OAuth token exchange and all D2L Valence API calls
// Docs: https://docs.valence.desire2learn.com/

import { config } from './config';
import { logApiCall } from './logger';

const BASE_URL = config.d2l.baseUrl;
const LP_VERSION = config.d2l.apiVersion;

// ============================================================
// AUTH
// ============================================================

export async function exchangeD2LToken(authCode, redirectUri) {
  const res = await fetch(`${BASE_URL}${config.d2l.authEndpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: authCode,
      redirect_uri: redirectUri,
      client_id: config.d2l.clientId,
      client_secret: config.d2l.clientSecret,
    }),
  });
  return res.json();
}

export async function refreshD2LToken(refreshToken) {
  const res = await fetch(`${BASE_URL}${config.d2l.authEndpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: config.d2l.clientId,
      client_secret: config.d2l.clientSecret,
    }),
  });
  return res.json();
}

// Generic D2L API call with logging
async function d2lFetch(accessToken, endpoint, { method = 'GET', body = null, user = '', userRole = 'student', action = '' } = {}) {
  const url = `${BASE_URL}/d2l/api${endpoint}`;
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
    platform: 'd2l',
    action,
    endpoint,
    method,
    details: method !== 'GET' ? { requestBody: body } : {},
    status: res.ok ? 'success' : `error_${res.status}`,
  });

  if (!res.ok) {
    throw new Error(`D2L API error ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

// ============================================================
// STUDENT READ-ONLY ENDPOINTS
// ============================================================

// Get the user's enrolled courses (orgUnits)
export async function getEnrollments(accessToken, user) {
  return d2lFetch(accessToken, `/lp/${LP_VERSION}/enrollments/myenrollments/`, {
    user,
    action: 'read_enrollments',
  });
}

// Get calendar events (assignments, due dates) for a course
export async function getCalendarEvents(accessToken, orgUnitId, user) {
  return d2lFetch(accessToken, `/le/${LP_VERSION}/${orgUnitId}/calendar/events/`, {
    user,
    action: 'read_calendar_events',
  });
}

// Get all upcoming events across all courses
export async function getUpcomingEvents(accessToken, user) {
  return d2lFetch(accessToken, `/le/${LP_VERSION}/calendar/events/myEvents/?eventType=6`, {
    user,
    action: 'read_upcoming_events',
  });
}

// Get grades for a course
export async function getGrades(accessToken, orgUnitId, user) {
  return d2lFetch(accessToken, `/le/${LP_VERSION}/${orgUnitId}/grades/values/myGradeValues/`, {
    user,
    action: 'read_own_grades',
  });
}

// Get dropbox folders (assignments) for a course
export async function getDropboxFolders(accessToken, orgUnitId, user) {
  return d2lFetch(accessToken, `/le/${LP_VERSION}/${orgUnitId}/dropbox/folders/`, {
    user,
    action: 'read_assignments',
  });
}

// ============================================================
// INSTRUCTOR WRITE ENDPOINTS
// ============================================================

// Create a new dropbox folder (assignment)
export async function createDropboxFolder(accessToken, orgUnitId, folderData, user) {
  // folderData: { Name, Instructions: { Html }, DueDate, ... }
  return d2lFetch(accessToken, `/le/${LP_VERSION}/${orgUnitId}/dropbox/folders/`, {
    method: 'POST',
    body: folderData,
    user,
    userRole: 'instructor',
    action: 'create_assignment',
  });
}

// Update a dropbox folder (edit assignment details/due date)
export async function updateDropboxFolder(accessToken, orgUnitId, folderId, folderData, user) {
  return d2lFetch(accessToken, `/le/${LP_VERSION}/${orgUnitId}/dropbox/folders/${folderId}`, {
    method: 'PUT',
    body: folderData,
    user,
    userRole: 'instructor',
    action: 'update_assignment',
  });
}

// Create a calendar event (due date on course calendar)
export async function createCalendarEvent(accessToken, orgUnitId, eventData, user) {
  // eventData: { Title, Description, StartDateTime, EndDateTime }
  return d2lFetch(accessToken, `/le/${LP_VERSION}/${orgUnitId}/calendar/event/`, {
    method: 'POST',
    body: eventData,
    user,
    userRole: 'instructor',
    action: 'create_calendar_event',
  });
}

// Update a calendar event
export async function updateCalendarEvent(accessToken, orgUnitId, eventId, eventData, user) {
  return d2lFetch(accessToken, `/le/${LP_VERSION}/${orgUnitId}/calendar/event/${eventId}`, {
    method: 'PUT',
    body: eventData,
    user,
    userRole: 'instructor',
    action: 'update_calendar_event',
  });
}

// Create a content module
export async function createContentModule(accessToken, orgUnitId, moduleData, user) {
  return d2lFetch(accessToken, `/le/${LP_VERSION}/${orgUnitId}/content/root/`, {
    method: 'POST',
    body: moduleData,
    user,
    userRole: 'instructor',
    action: 'create_content_module',
  });
}

// Create a content topic within a module
export async function createContentTopic(accessToken, orgUnitId, moduleId, topicData, user) {
  return d2lFetch(accessToken, `/le/${LP_VERSION}/${orgUnitId}/content/modules/${moduleId}/structure/`, {
    method: 'POST',
    body: topicData,
    user,
    userRole: 'instructor',
    action: 'create_content_topic',
  });
}

// Get content modules for a course (read - used by instructor dashboard)
export async function getContentModules(accessToken, orgUnitId, user) {
  return d2lFetch(accessToken, `/le/${LP_VERSION}/${orgUnitId}/content/root/`, {
    user,
    userRole: 'instructor',
    action: 'read_content_modules',
  });
}
