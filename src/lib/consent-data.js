// Consent-Based Data Layer
// Aggregates all student data from consent-based sources:
// 1. D2L iCal Calendar Feed (assignments, due dates)
// 2. Instructor-uploaded documents (syllabus, schedule)
// 3. Microsoft Outlook (calendar, email) — coming soon
//
// This replaces the direct D2L API calls for the beta version.
// All data is fetched with student consent — no IT approval needed.

import { fetchAndParseICalFeed, getUpcomingEvents, getOverdueEvents, getThisWeekEvents, assignCourseColors } from './ical-parser';
import { quickPrioritize } from './ai-prioritize';
import { logApiCall } from './logger';
import { deduplicateItems, detectDateConflicts, generateConflictNotifications, getActiveOverrides } from './dedup-engine';

// ============================================================
// MAIN DATA FETCH — Pull everything for a student
// ============================================================

export async function getStudentDashboardData(settings) {
  const { icalUrl, studentEmail = 'anonymous', uploadedDocs = [] } = settings;

  const result = {
    events: [],
    upcoming: [],
    overdue: [],
    thisWeek: [],
    courses: {},
    stats: {},
    errors: [],
    sources: [],
    fetchedAt: new Date().toISOString(),
  };

  // Source 1: D2L iCal Calendar Feed
  if (icalUrl) {
    try {
      const icalResult = await fetchAndParseICalFeed(icalUrl, studentEmail);

      if (icalResult.success) {
        result.events.push(...icalResult.events);
        result.sources.push({
          type: 'ical',
          status: 'connected',
          count: icalResult.count,
          fetchedAt: icalResult.fetchedAt,
        });
      } else {
        result.errors.push({
          source: 'ical',
          error: icalResult.error,
        });
        result.sources.push({
          type: 'ical',
          status: 'error',
          error: icalResult.error,
        });
      }
    } catch (err) {
      result.errors.push({
        source: 'ical',
        error: err.message,
      });
    }
  }

  // Source 2: Instructor-uploaded documents (stored items)
  if (uploadedDocs && uploadedDocs.length > 0) {
    for (const doc of uploadedDocs) {
      if (doc.calendarItems) {
        result.events.push(...doc.calendarItems);
      }
    }
    result.sources.push({
      type: 'instructor_upload',
      status: 'connected',
      count: uploadedDocs.reduce((sum, d) => sum + (d.calendarItems?.length || 0), 0),
    });
  }

  // Source 3: Microsoft Outlook (placeholder for when auth is ready)
  // TODO: Wire in when Azure AD app is registered
  result.sources.push({
    type: 'outlook',
    status: 'not_connected',
    message: 'Coming soon — connect your Outlook calendar and email',
  });

  // ============================================================
  // DEDUPLICATION — Remove duplicates, flag conflicts for teacher
  // Passes in any instructor overrides so resolved items get the correct date
  // ============================================================
  const activeOverrides = await getActiveOverrides();
  const dedupResult = deduplicateItems(result.events, activeOverrides);
  result.events = dedupResult.items;
  result.duplicatesRemoved = dedupResult.duplicatesRemoved;
  result.duplicateDetails = dedupResult.duplicateDetails;
  result.pendingConflicts = dedupResult.pendingConflicts;

  // ============================================================
  // CONFLICT DETECTION — Flag date mismatches for instructor review
  // ============================================================
  // Separate iCal events from instructor-uploaded items
  const icalEvents = result.events.filter(e => e.source === 'ical');
  const uploadedItems = result.events.filter(e => e.source === 'instructor_upload');

  if (icalEvents.length > 0 && uploadedItems.length > 0) {
    const conflicts = detectDateConflicts(icalEvents, uploadedItems);
    result.conflicts = conflicts;
    result.conflictNotifications = generateConflictNotifications(conflicts);
  } else {
    result.conflicts = [];
    result.conflictNotifications = [];
  }

  // Assign course colors consistently
  const { events: coloredEvents, courseMap } = assignCourseColors(result.events);
  result.events = coloredEvents;
  result.courses = courseMap;

  // Generate filtered views
  result.upcoming = getUpcomingEvents(result.events, 30);
  result.overdue = getOverdueEvents(result.events);
  result.thisWeek = getThisWeekEvents(result.events);

  // Quick prioritization (local heuristic)
  const dueItems = result.events.filter(e => e.hasDueDate && !e.submitted);
  result.prioritized = quickPrioritize(dueItems);

  // Stats
  result.stats = {
    totalEvents: result.events.length,
    upcomingCount: result.upcoming.length,
    overdueCount: result.overdue.length,
    thisWeekCount: result.thisWeek.length,
    courseCount: Object.keys(result.courses).length,
    connectedSources: result.sources.filter(s => s.status === 'connected').length,
    totalSources: result.sources.length,
    duplicatesRemoved: dedupResult.duplicatesRemoved,
    dateConflicts: result.conflicts.length,
    pendingConflicts: dedupResult.pendingConflicts.length,
    activeOverrides: activeOverrides.length,
    itemsPendingReview: result.events.filter(e => e.pendingReview).length,
  };

  // Log the dashboard data fetch
  logApiCall({
    user: studentEmail,
    userRole: 'student',
    platform: 'dashboard',
    action: 'fetch_dashboard_data',
    endpoint: '/internal/consent-data',
    method: 'GET',
    details: result.stats,
    status: result.errors.length === 0 ? 'success' : 'partial',
  });

  return result;
}

// ============================================================
// API ROUTE HELPER — For use in /api/dashboard/data route
// ============================================================

export async function handleDashboardDataRequest(request) {
  const body = await request.json();
  const { icalUrl, studentEmail, uploadedDocs } = body;

  if (!icalUrl) {
    return {
      error: 'No data sources configured. Please complete setup first.',
      setupRequired: true,
    };
  }

  return getStudentDashboardData({ icalUrl, studentEmail, uploadedDocs });
}
