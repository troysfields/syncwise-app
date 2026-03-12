// iCal Feed Parser for D2L Calendar Feeds
// Parses .ics (iCalendar) URLs from D2L Brightspace into SyncWise dashboard items
// No API key or IT approval needed — students enable this in D2L Calendar Settings
// Feed URL format: https://d2l.coloradomesa.edu/d2l/le/calendar/feed/user/feed.ics?token=...

import { logApiCall } from './logger';

// ============================================================
// ICS PARSING ENGINE
// ============================================================

// Parse raw iCal text into structured event objects
export function parseICalText(icsText) {
  const events = [];
  const lines = unfoldICalLines(icsText);

  let currentEvent = null;
  let inAlarm = false;

  for (const line of lines) {
    // Skip alarm sub-components
    if (line === 'BEGIN:VALARM') { inAlarm = true; continue; }
    if (line === 'END:VALARM') { inAlarm = false; continue; }
    if (inAlarm) continue;

    if (line === 'BEGIN:VEVENT') {
      currentEvent = {};
      continue;
    }

    if (line === 'END:VEVENT') {
      if (currentEvent) {
        events.push(normalizeICalEvent(currentEvent));
      }
      currentEvent = null;
      continue;
    }

    if (currentEvent) {
      const { key, params, value } = parseICalLine(line);
      if (key) {
        currentEvent[key] = { value, params };
      }
    }
  }

  return events;
}

// iCal lines can be "folded" — continued lines start with a space or tab
function unfoldICalLines(text) {
  const raw = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const unfolded = raw.replace(/\n[ \t]/g, '');
  return unfolded.split('\n').filter(l => l.trim().length > 0);
}

// Parse a single iCal property line: KEY;PARAM=VAL:VALUE
function parseICalLine(line) {
  const colonIdx = line.indexOf(':');
  if (colonIdx === -1) return { key: null, params: {}, value: '' };

  const left = line.substring(0, colonIdx);
  const value = line.substring(colonIdx + 1);

  // Split key from parameters
  const semiIdx = left.indexOf(';');
  const key = semiIdx === -1 ? left : left.substring(0, semiIdx);
  const paramStr = semiIdx === -1 ? '' : left.substring(semiIdx + 1);

  // Parse parameters
  const params = {};
  if (paramStr) {
    for (const part of paramStr.split(';')) {
      const eqIdx = part.indexOf('=');
      if (eqIdx !== -1) {
        params[part.substring(0, eqIdx)] = part.substring(eqIdx + 1);
      }
    }
  }

  return { key: key.toUpperCase(), params, value };
}

// ============================================================
// DATE PARSING
// ============================================================

// Parse iCal date/datetime values
// Formats: 20260315T235959Z, 20260315T235959, 20260315, TZID=America/Denver:20260315T235959
function parseICalDate(prop) {
  if (!prop) return null;

  const { value, params } = prop;
  if (!value) return null;

  const tzid = params?.TZID || null;

  // Remove any trailing Z for parsing, we'll handle timezone separately
  const clean = value.replace(/Z$/, '');

  let year, month, day, hour = 0, minute = 0, second = 0;

  if (clean.includes('T')) {
    // DateTime format: 20260315T235959
    const [datePart, timePart] = clean.split('T');
    year = parseInt(datePart.substring(0, 4));
    month = parseInt(datePart.substring(4, 6)) - 1; // JS months are 0-indexed
    day = parseInt(datePart.substring(6, 8));
    hour = parseInt(timePart.substring(0, 2));
    minute = parseInt(timePart.substring(2, 4));
    second = parseInt(timePart.substring(4, 6)) || 0;
  } else {
    // Date-only format: 20260315
    year = parseInt(clean.substring(0, 4));
    month = parseInt(clean.substring(4, 6)) - 1;
    day = parseInt(clean.substring(6, 8));
  }

  // If the original value ends with Z, it's UTC
  if (value.endsWith('Z')) {
    return new Date(Date.UTC(year, month, day, hour, minute, second));
  }

  // Otherwise, create in local time (D2L typically uses the institution's timezone)
  return new Date(year, month, day, hour, minute, second);
}

// ============================================================
// EVENT NORMALIZATION
// ============================================================

// Convert raw iCal event into SyncWise-compatible format
function normalizeICalEvent(raw) {
  const summary = raw.SUMMARY?.value || 'Untitled Event';
  const description = raw.DESCRIPTION?.value || '';
  const location = raw.LOCATION?.value || '';
  const uid = raw.UID?.value || `ical-${Date.now()}-${Math.random()}`;
  const categories = raw.CATEGORIES?.value?.split(',').map(c => c.trim()) || [];

  const dtStart = parseICalDate(raw.DTSTART);
  const dtEnd = parseICalDate(raw.DTEND);
  const dueDate = parseICalDate(raw.DUE) || dtEnd || dtStart;

  // Try to extract course name from location, categories, summary, or description
  // D2L puts course info in LOCATION field: "ENTR450-001-46711 Entrepreneurship"
  const courseName = extractCourseName(summary, categories, description, location);
  const itemName = cleanItemName(summary, courseName);
  const itemType = detectItemType(summary, description, categories);

  return {
    id: `ical-${uid}`,
    uid,
    type: itemType,
    name: itemName,
    courseName: courseName,
    courseColor: '#5D0022', // Default — dashboard will assign per-course colors
    dueDate: dueDate ? dueDate.toISOString() : null,
    startDate: dtStart ? dtStart.toISOString() : null,
    endDate: dtEnd ? dtEnd.toISOString() : null,
    source: 'ical',
    hasDueDate: !!dueDate,
    submitted: false,
    graded: false,
    grade: null,
    unread: false,
    isRecurring: false,
    recurringLabel: null,
    description: unescapeICalText(description),
    location: unescapeICalText(location),
    categories,
    status: 'active',
    manualDate: null,
    confirmedNoDate: false,
    rawSummary: summary,
  };
}

// Unescape iCal text (\\n -> newline, \\, -> comma, etc.)
function unescapeICalText(text) {
  if (!text) return '';
  return text
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\\\/g, '\\')
    .replace(/\\;/g, ';');
}

// ============================================================
// SMART EXTRACTION — Course name and item type detection
// ============================================================

// Try to extract the course name from event data
// D2L calendar feeds include course info in LOCATION field:
//   "ENTR450-001-46711 Entrepreneurship"
//   "DH314 (MANG471-003-46664 Operations Management)"
//   "ENGR353,ENTR343 Entrepreneurship Opportunities, ..."
function extractCourseName(summary, categories, description, location = '') {
  // D2L course code pattern: 2-5 uppercase letters followed by 3-4 digits (e.g., ENTR450, MANG491, CS101)
  const courseCodeRegex = /([A-Z]{2,5})(\d{3,4})/g;

  // 1. Check LOCATION first — most reliable source for D2L feeds
  //    Format: "ENTR450-001-46711 Entrepreneurship" or "DH314 (MANG471-003-46664 ...)"
  if (location) {
    const locMatches = [...location.matchAll(courseCodeRegex)];
    if (locMatches.length > 0) {
      // Format as "ENTR 450" (with space) and return first real course code
      // Skip room numbers by checking if it looks like a course dept (>= 3 letters or known pattern)
      for (const m of locMatches) {
        const dept = m[1];
        const num = m[2];
        // Room numbers are usually short (2-3 chars) like "DH314" — skip those
        // Course depts are usually 3-5 chars like "ENTR", "MANG", "ENGR", "ACCT", "BUS", "CS"
        if (dept.length >= 3 || /^(CS|IS|IT|ME|CE|EE|PE)$/.test(dept)) {
          return `${dept} ${num}`;
        }
      }
      // Fallback: use first match anyway
      return `${locMatches[0][1]} ${locMatches[0][2]}`;
    }
  }

  // 2. Check categories for course codes
  if (categories.length > 0) {
    const coursePattern = /^[A-Z]{2,5}\s*\d{3,4}/;
    const match = categories.find(c => coursePattern.test(c));
    if (match) return match;
  }

  // 3. Check summary for course codes (e.g., "MANG 491 Final Exam Review")
  const summaryMatches = [...summary.matchAll(courseCodeRegex)];
  if (summaryMatches.length > 0) {
    return `${summaryMatches[0][1]} ${summaryMatches[0][2]}`;
  }

  // 4. Check description for course references or course codes
  const descMatches = [...description.matchAll(courseCodeRegex)];
  if (descMatches.length > 0) {
    return `${descMatches[0][1]} ${descMatches[0][2]}`;
  }

  const courseRefRegex = /(?:Course|Class|Section):\s*(.+?)(?:\n|$)/i;
  const descMatch = description.match(courseRefRegex);
  if (descMatch) return descMatch[1].trim();

  return 'Unknown Course';
}

// Clean the item name — remove course code if embedded, and strip D2L status suffixes
function cleanItemName(summary, courseName) {
  let name = summary;

  // Remove D2L status suffixes: " - Due", " - Available", " - Availability Ends"
  const statusSuffixes = [' - Due', ' - Available', ' - Availability Ends', ' - Overdue', ' - Ended'];
  for (const suffix of statusSuffixes) {
    if (name.endsWith(suffix)) {
      name = name.slice(0, -suffix.length).trim();
      break;
    }
  }

  // Remove course code if embedded in the name
  if (courseName && courseName !== 'Unknown Course') {
    const delimiters = [' - ', ' | ', ' — ', ': '];
    for (const delim of delimiters) {
      if (name.includes(delim + courseName)) {
        name = name.replace(delim + courseName, '').trim();
      }
      if (name.includes(courseName + delim)) {
        name = name.replace(courseName + delim, '').trim();
      }
    }
    // Also remove the compact form (e.g., "ENTR450" without space)
    const compact = courseName.replace(/\s+/g, '');
    for (const delim of delimiters) {
      if (name.includes(delim + compact)) {
        name = name.replace(delim + compact, '').trim();
      }
      if (name.includes(compact + delim)) {
        name = name.replace(compact + delim, '').trim();
      }
    }
  }

  return name || summary;
}

// Detect item type from event content
function detectItemType(summary, description, categories) {
  const text = `${summary} ${description} ${categories.join(' ')}`.toLowerCase();

  if (/\b(quiz|exam|test|midterm|final)\b/.test(text)) return 'quiz';
  if (/\b(discussion|forum|post|respond|reply)\b/.test(text)) return 'discussion';
  if (/\b(assignment|homework|hw|paper|essay|project|submit|dropbox|upload)\b/.test(text)) return 'assignment';
  if (/\b(reading|read|chapter|textbook)\b/.test(text)) return 'reading';
  if (/\b(lecture|class|session|meeting)\b/.test(text)) return 'lecture';
  if (/\b(lab|laboratory|practical)\b/.test(text)) return 'lab';
  if (/\b(office hours|tutoring|help session)\b/.test(text)) return 'office_hours';
  if (/\b(announcement|news|notice)\b/.test(text)) return 'announcement';

  // Default to 'event' for calendar items
  return 'event';
}

// ============================================================
// FETCH & PARSE — Main entry point
// ============================================================

// Fetch and parse an iCal feed URL
export async function fetchAndParseICalFeed(feedUrl, user = '') {
  try {
    const res = await fetch(feedUrl, {
      headers: {
        'Accept': 'text/calendar',
        'User-Agent': 'SyncWise-AI/1.0',
      },
    });

    if (!res.ok) {
      throw new Error(`iCal fetch failed: HTTP ${res.status}`);
    }

    const icsText = await res.text();

    // Validate it's actually an iCal file
    if (!icsText.includes('BEGIN:VCALENDAR')) {
      throw new Error('Invalid iCal data: missing VCALENDAR');
    }

    const events = parseICalText(icsText);

    // Log the fetch for audit trail
    logApiCall({
      user,
      userRole: 'student',
      platform: 'ical',
      action: 'fetch_calendar_feed',
      endpoint: feedUrl.replace(/token=[^&]+/, 'token=REDACTED'),
      method: 'GET',
      details: { eventCount: events.length },
      status: 'success',
    });

    return {
      success: true,
      events,
      count: events.length,
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    logApiCall({
      user,
      userRole: 'student',
      platform: 'ical',
      action: 'fetch_calendar_feed',
      endpoint: feedUrl.replace(/token=[^&]+/, 'token=REDACTED'),
      method: 'GET',
      details: { error: error.message },
      status: 'error',
    });

    return {
      success: false,
      events: [],
      count: 0,
      error: error.message,
      fetchedAt: new Date().toISOString(),
    };
  }
}

// ============================================================
// FILTER & SORT UTILITIES
// ============================================================

// Get only upcoming events (due date in the future)
export function getUpcomingEvents(events, daysAhead = 30) {
  const now = new Date();
  const cutoff = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  return events
    .filter(e => {
      if (!e.dueDate) return false;
      const due = new Date(e.dueDate);
      return due >= now && due <= cutoff;
    })
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
}

// Get overdue events
export function getOverdueEvents(events) {
  const now = new Date();
  return events
    .filter(e => {
      if (!e.dueDate || e.submitted) return false;
      return new Date(e.dueDate) < now;
    })
    .sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate));
}

// Get events due this week
export function getThisWeekEvents(events) {
  const now = new Date();
  const endOfWeek = new Date(now);
  endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
  endOfWeek.setHours(23, 59, 59, 999);

  return events
    .filter(e => {
      if (!e.dueDate) return false;
      const due = new Date(e.dueDate);
      return due >= now && due <= endOfWeek;
    })
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
}

// Group events by course
export function groupByCourse(events) {
  const grouped = {};
  for (const event of events) {
    const course = event.courseName || 'Unknown Course';
    if (!grouped[course]) grouped[course] = [];
    grouped[course].push(event);
  }
  return grouped;
}

// Group events by type
export function groupByType(events) {
  const grouped = {};
  for (const event of events) {
    const type = event.type || 'event';
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push(event);
  }
  return grouped;
}

// Assign consistent colors per course
export function assignCourseColors(events) {
  const courseColors = ['#5D0022', '#059669', '#D97706', '#DC2626', '#7C3AED', '#0891B2', '#DB2777', '#65A30D'];
  const courseMap = {};
  let colorIdx = 0;

  for (const event of events) {
    const course = event.courseName || 'Unknown Course';
    if (!courseMap[course]) {
      courseMap[course] = courseColors[colorIdx % courseColors.length];
      colorIdx++;
    }
    event.courseColor = courseMap[course];
  }

  return { events, courseMap };
}
