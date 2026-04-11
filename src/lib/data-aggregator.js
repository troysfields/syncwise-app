// Data Aggregator — Student Dashboard Pipeline
// Replaces consent-data.js with cleaner internal structure.
// Same exports, same return shape, same behavior.
//
// Pipeline: Fetch → Parse → Merge Sources → Dedup → Color → Filter → Prioritize → Stats
//
// Consumers:
//   - /api/dashboard/data/route.js (handleDashboardDataRequest)
//
// Shared modules (NOT merged — used by other routes):
//   - ical-parser.js  → also used by /api/feeds/ical
//   - dedup-engine.js → also used by /api/instructor/conflicts, /api/student/notifications

import {
  fetchAndParseICalFeed,
  getUpcomingEvents,
  getOverdueEvents,
  getThisWeekEvents,
  assignCourseColors,
} from './ical-parser';

import { quickPrioritize } from './ai-prioritize';
import { logApiCall } from './logger';

import {
  deduplicateItems,
  detectDateConflicts,
  generateConflictNotifications,
  getActiveOverrides,
} from './dedup-engine';


// ============================================================
// IN-MEMORY CACHE — Avoid re-fetching iCal on every page load
// Cache lasts 3 minutes per user to keep data fresh but fast.
// Keyed by iCal URL (unique per student).
// ============================================================

const icalCache = new Map();
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes

function getCachedICalResult(icalUrl) {
  const cached = icalCache.get(icalUrl);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
    return cached.data;
  }
  return null;
}

function setCachedICalResult(icalUrl, data) {
  icalCache.set(icalUrl, { data, timestamp: Date.now() });
  // Evict oldest entries if cache grows too large
  if (icalCache.size > 100) {
    const oldest = [...icalCache.entries()]
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
    for (let i = 0; i < 20; i++) icalCache.delete(oldest[i][0]);
  }
}


// ============================================================
// PIPELINE STAGES
// Each stage takes the result object and mutates/augments it.
// Stages are separated for readability, not for reuse —
// they're only called from getStudentDashboardData.
// ============================================================

/**
 * Stage 1: Fetch iCal feed (with cache + timeout)
 * Populates result.events with parsed iCal items.
 *
 * If prefetchedIcalResult is provided (e.g., from shadow mode), uses that
 * instead of fetching. This avoids duplicate D2L requests when running
 * two pipelines in the same API call.
 */
async function fetchICalSource(result, icalUrl, studentEmail, prefetchedIcalResult) {
  if (!icalUrl) return;

  try {
    let icalResult;

    if (prefetchedIcalResult) {
      // Use pre-fetched data — no external request
      icalResult = prefetchedIcalResult;
    } else {
      // Normal path: cache-first, then fetch
      icalResult = getCachedICalResult(icalUrl);
      if (icalResult) {
        icalResult._cached = true;
      } else {
        // fetchAndParseICalFeed handles its own 10s timeout + validation + audit logging
        icalResult = await fetchAndParseICalFeed(icalUrl, studentEmail);
        if (icalResult.success) {
          setCachedICalResult(icalUrl, icalResult);
        }
      }
    }

    if (icalResult.success) {
      result.events.push(...icalResult.events);
      result.sources.push({
        type: 'ical',
        status: 'connected',
        count: icalResult.count,
        fetchedAt: icalResult.fetchedAt,
        cached: !!icalResult._cached,
      });
    } else {
      result.errors.push({ source: 'ical', error: icalResult.error });
      result.sources.push({
        type: 'ical',
        status: 'error',
        error: icalResult.error,
      });
    }
  } catch (err) {
    result.errors.push({ source: 'ical', error: err.message });
  }
}

/**
 * Stage 2: Merge instructor-uploaded document items
 * Adds parsed syllabus/schedule items into the event stream.
 */
function mergeUploadedDocs(result, uploadedDocs) {
  if (!uploadedDocs || uploadedDocs.length === 0) return;

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

/**
 * Stage 3: Deduplicate events across sources
 * Removes duplicates, flags conflicts for instructor review,
 * applies any existing instructor date overrides from Redis.
 */
async function deduplicateEvents(result) {
  // Load instructor overrides from Redis (fail gracefully)
  let activeOverrides = [];
  try {
    activeOverrides = await getActiveOverrides();
  } catch (e) {
    console.error('Failed to load overrides, continuing without:', e.message);
  }

  const dedupResult = deduplicateItems(result.events, activeOverrides);

  result.events = dedupResult.items;
  result.duplicatesRemoved = dedupResult.duplicatesRemoved;
  result.duplicateDetails = dedupResult.duplicateDetails;
  result.pendingConflicts = dedupResult.pendingConflicts;

  // Store for stats calculation
  result._activeOverrideCount = activeOverrides.length;
}

/**
 * Stage 4: Detect date conflicts between iCal and uploaded items
 * Generates instructor-facing notifications for mismatches.
 */
function detectConflicts(result) {
  const icalEvents = result.events.filter(e => e.source === 'ical');
  const uploadedItems = result.events.filter(e => e.source === 'instructor_upload');

  if (icalEvents.length > 0 && uploadedItems.length > 0) {
    result.conflicts = detectDateConflicts(icalEvents, uploadedItems);
    result.conflictNotifications = generateConflictNotifications(result.conflicts);
  } else {
    result.conflicts = [];
    result.conflictNotifications = [];
  }
}

/**
 * Stage 5: Assign consistent per-course colors
 */
function colorize(result) {
  const { events, courseMap } = assignCourseColors(result.events);
  result.events = events;
  result.courses = courseMap;
}

/**
 * Stage 6: Generate filtered views (upcoming, overdue, this week)
 */
function generateFilteredViews(result) {
  result.upcoming = getUpcomingEvents(result.events, 30);
  result.overdue = getOverdueEvents(result.events);
  result.thisWeek = getThisWeekEvents(result.events);
}

/**
 * Stage 7: Prioritize tasks (local heuristic — fast, no AI call)
 * AI prioritization happens separately via /api/ai/prioritize when requested.
 * quickPrioritize is a safe local fallback that always succeeds.
 */
function prioritizeLocally(result) {
  const dueItems = result.events.filter(e => e.hasDueDate && !e.submitted);
  try {
    result.prioritized = quickPrioritize(dueItems);
  } catch (err) {
    // quickPrioritize is pure math — this should never fail,
    // but if it does, return unprioritized items rather than crashing
    console.error('Priority scoring failed, returning unsorted:', err.message);
    result.prioritized = dueItems;
  }
}

/**
 * Stage 8: Calculate stats summary
 */
function calculateStats(result) {
  result.stats = {
    totalEvents: result.events.length,
    upcomingCount: result.upcoming.length,
    overdueCount: result.overdue.length,
    thisWeekCount: result.thisWeek.length,
    courseCount: Object.keys(result.courses).length,
    connectedSources: result.sources.filter(s => s.status === 'connected').length,
    totalSources: result.sources.length,
    duplicatesRemoved: result.duplicatesRemoved,
    dateConflicts: result.conflicts.length,
    pendingConflicts: result.pendingConflicts.length,
    activeOverrides: result._activeOverrideCount || 0,
    itemsPendingReview: result.events.filter(e => e.pendingReview).length,
  };

  // Clean up internal-only field
  delete result._activeOverrideCount;
}


// ============================================================
// MAIN ENTRY POINT — Full dashboard data fetch
// ============================================================

export async function getStudentDashboardData(settings) {
  const {
    icalUrl,
    studentEmail = 'anonymous',
    uploadedDocs = [],
    _prefetchedIcalResult = null, // Optional: skip D2L fetch if provided (used by shadow mode)
  } = settings;

  // Initialize result with the full shape the dashboard expects
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

  // Run the pipeline
  await fetchICalSource(result, icalUrl, studentEmail, _prefetchedIcalResult); // Stage 1: Fetch iCal
  mergeUploadedDocs(result, uploadedDocs);                 // Stage 2: Merge uploads

  // Placeholder for future Outlook integration
  result.sources.push({
    type: 'outlook',
    status: 'not_connected',
    message: 'Coming soon — connect your Outlook calendar and email',
  });

  await deduplicateEvents(result);                         // Stage 3: Dedup + overrides
  detectConflicts(result);                                 // Stage 4: Conflict detection
  colorize(result);                                        // Stage 5: Course colors
  generateFilteredViews(result);                           // Stage 6: Upcoming/overdue/week
  prioritizeLocally(result);                               // Stage 7: Priority scoring
  calculateStats(result);                                  // Stage 8: Stats

  // Audit log
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
// Same signature as the old consent-data.js export.
// ============================================================

export async function handleDashboardDataRequest(request) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return { error: 'Invalid request body. Expected JSON.' };
  }

  const { icalUrl, studentEmail, uploadedDocs } = body;

  if (!icalUrl) {
    return {
      error: 'No data sources configured. Please complete setup first.',
      setupRequired: true,
    };
  }

  return getStudentDashboardData({ icalUrl, studentEmail, uploadedDocs });
}
