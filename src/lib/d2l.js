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

// Get submission status for a specific dropbox folder
export async function getDropboxSubmissions(accessToken, orgUnitId, folderId, user) {
  return d2lFetch(accessToken, `/le/${LP_VERSION}/${orgUnitId}/dropbox/folders/${folderId}/submissions/mysubmissions/`, {
    user,
    action: 'read_submission_status',
  });
}

// ============================================================
// QUIZZES
// ============================================================

// Get all quizzes for a course
export async function getQuizzes(accessToken, orgUnitId, user) {
  return d2lFetch(accessToken, `/le/${LP_VERSION}/${orgUnitId}/quizzes/`, {
    user,
    action: 'read_quizzes',
  });
}

// Get a specific quiz's details (includes attempt limits, time limit, etc.)
export async function getQuizDetails(accessToken, orgUnitId, quizId, user) {
  return d2lFetch(accessToken, `/le/${LP_VERSION}/${orgUnitId}/quizzes/${quizId}`, {
    user,
    action: 'read_quiz_details',
  });
}

// Get the student's quiz attempts (submission status)
export async function getMyQuizAttempts(accessToken, orgUnitId, quizId, user) {
  return d2lFetch(accessToken, `/le/${LP_VERSION}/${orgUnitId}/quizzes/${quizId}/attempts/`, {
    user,
    action: 'read_quiz_attempts',
  });
}

// ============================================================
// DISCUSSIONS
// ============================================================

// Get all discussion forums for a course
export async function getDiscussionForums(accessToken, orgUnitId, user) {
  return d2lFetch(accessToken, `/le/${LP_VERSION}/${orgUnitId}/discussions/forums/`, {
    user,
    action: 'read_discussion_forums',
  });
}

// Get all topics in a discussion forum
export async function getDiscussionTopics(accessToken, orgUnitId, forumId, user) {
  return d2lFetch(accessToken, `/le/${LP_VERSION}/${orgUnitId}/discussions/forums/${forumId}/topics/`, {
    user,
    action: 'read_discussion_topics',
  });
}

// Get a specific topic's details (includes unread count, due date)
export async function getDiscussionTopicDetails(accessToken, orgUnitId, forumId, topicId, user) {
  return d2lFetch(accessToken, `/le/${LP_VERSION}/${orgUnitId}/discussions/forums/${forumId}/topics/${topicId}`, {
    user,
    action: 'read_discussion_topic_details',
  });
}

// Get the student's posts in a topic (to check if they've posted)
export async function getMyDiscussionPosts(accessToken, orgUnitId, forumId, topicId, user) {
  return d2lFetch(accessToken, `/le/${LP_VERSION}/${orgUnitId}/discussions/forums/${forumId}/topics/${topicId}/posts/`, {
    user,
    action: 'read_my_discussion_posts',
  });
}

// ============================================================
// ANNOUNCEMENTS (News)
// ============================================================

// Get all announcements for a course
export async function getAnnouncements(accessToken, orgUnitId, user) {
  return d2lFetch(accessToken, `/le/${LP_VERSION}/${orgUnitId}/news/`, {
    user,
    action: 'read_announcements',
  });
}

// Get a specific announcement
export async function getAnnouncementDetails(accessToken, orgUnitId, newsId, user) {
  return d2lFetch(accessToken, `/le/${LP_VERSION}/${orgUnitId}/news/${newsId}`, {
    user,
    action: 'read_announcement_details',
  });
}

// Dismiss/mark an announcement as read
export async function dismissAnnouncement(accessToken, orgUnitId, newsId, user) {
  return d2lFetch(accessToken, `/le/${LP_VERSION}/${orgUnitId}/news/${newsId}/dismiss`, {
    method: 'POST',
    user,
    action: 'dismiss_announcement',
  });
}

// ============================================================
// CONTENT MODULES & TOPICS (Student Read)
// ============================================================

// Get content table of contents for a course (all modules and topics)
export async function getContentTOC(accessToken, orgUnitId, user) {
  return d2lFetch(accessToken, `/le/${LP_VERSION}/${orgUnitId}/content/toc`, {
    user,
    action: 'read_content_toc',
  });
}

// Get content modules for a course (root level)
export async function getContentModules(accessToken, orgUnitId, user, userRole = 'student') {
  return d2lFetch(accessToken, `/le/${LP_VERSION}/${orgUnitId}/content/root/`, {
    user,
    userRole,
    action: 'read_content_modules',
  });
}

// Get topics within a specific module
export async function getContentTopics(accessToken, orgUnitId, moduleId, user) {
  return d2lFetch(accessToken, `/le/${LP_VERSION}/${orgUnitId}/content/modules/${moduleId}/structure/`, {
    user,
    action: 'read_content_topics',
  });
}

// Get completion status for content topics
export async function getContentCompletion(accessToken, orgUnitId, user) {
  return d2lFetch(accessToken, `/le/${LP_VERSION}/${orgUnitId}/content/completions/mycompletion/`, {
    user,
    action: 'read_content_completion',
  });
}

// ============================================================
// CHECKLISTS
// ============================================================

// Get all checklists for a course
export async function getChecklists(accessToken, orgUnitId, user) {
  return d2lFetch(accessToken, `/le/${LP_VERSION}/${orgUnitId}/checklists/`, {
    user,
    action: 'read_checklists',
  });
}

// Get checklist categories and items
export async function getChecklistItems(accessToken, orgUnitId, checklistId, user) {
  return d2lFetch(accessToken, `/le/${LP_VERSION}/${orgUnitId}/checklists/${checklistId}`, {
    user,
    action: 'read_checklist_items',
  });
}

// ============================================================
// AGGREGATE FUNCTIONS — Pull everything for a student
// ============================================================

// Normalize all D2L items into a unified format for the dashboard
export function normalizeD2LItem(item, type, courseName, courseColor) {
  return {
    id: `d2l-${type}-${item.Id || item.TopicId || item.QuizId || item.NewsId || Math.random()}`,
    type, // 'assignment', 'quiz', 'discussion', 'announcement', 'content', 'checklist'
    name: item.Name || item.Title || item.Subject || item.Heading || 'Untitled',
    courseName: courseName || '',
    courseColor: courseColor || '#F59E0B',
    dueDate: item.DueDate || item.EndDate || item.EndDateTime || null,
    startDate: item.StartDate || item.StartDateTime || null,
    points: item.OutOf || item.GradeItemId ? (item.OutOf || null) : null,
    source: 'd2l',
    hasDueDate: !!(item.DueDate || item.EndDate || item.EndDateTime),
    submitted: false,   // updated per item type
    graded: false,
    grade: null,
    unread: false,
    isRecurring: false,  // tagged by pattern detection
    recurringLabel: null,
    description: item.Instructions?.Html || item.Description?.Html || item.Body?.Html || '',
    status: 'active',   // 'active', 'completed', 'hidden', 'confirmed', 'denied'
    manualDate: null,    // student-set override date
    confirmedNoDate: false, // student confirmed adding item with no due date
  };
}

// Detect recurring patterns in items (e.g., Discussion 1, Discussion 2, ...)
export function detectRecurringItems(items) {
  // Group by course + base name pattern
  const patterns = {};

  for (const item of items) {
    // Strip trailing numbers: "Discussion 5" -> "Discussion"
    const baseName = item.name.replace(/\s*#?\d+\s*$/, '').trim();
    const key = `${item.courseName}:${item.type}:${baseName}`;

    if (!patterns[key]) patterns[key] = [];
    patterns[key].push(item);
  }

  // If 3+ items share a pattern, mark them as recurring
  for (const [key, group] of Object.entries(patterns)) {
    if (group.length >= 3) {
      for (const item of group) {
        item.isRecurring = true;
        item.recurringLabel = 'Weekly';
      }
    }
  }

  return items;
}

// Get ALL items across all courses for a student
export async function getAllStudentItems(accessToken, user, enrollments) {
  const allItems = [];
  const courseColors = ['#5D0022', '#059669', '#D97706', '#DC2626', '#7C3AED', '#0891B2', '#DB2777', '#65A30D'];

  for (let i = 0; i < enrollments.length; i++) {
    const course = enrollments[i];
    const orgUnitId = course.OrgUnit?.Id;
    const courseName = course.OrgUnit?.Name || `Course ${i + 1}`;
    const color = courseColors[i % courseColors.length];

    if (!orgUnitId) continue;

    try {
      // Assignments
      const assignments = await getDropboxFolders(accessToken, orgUnitId, user);
      for (const item of (assignments || [])) {
        const normalized = normalizeD2LItem(item, 'assignment', courseName, color);
        // Check submission status
        try {
          const subs = await getDropboxSubmissions(accessToken, orgUnitId, item.Id, user);
          if (subs && subs.length > 0) {
            normalized.submitted = true;
          }
        } catch (e) { /* submission check failed, skip */ }
        allItems.push(normalized);
      }
    } catch (e) { console.error(`Failed to fetch assignments for ${courseName}:`, e.message); }

    try {
      // Quizzes
      const quizzes = await getQuizzes(accessToken, orgUnitId, user);
      for (const item of (quizzes?.Objects || quizzes || [])) {
        const normalized = normalizeD2LItem(item, 'quiz', courseName, color);
        normalized.points = item.OutOf || null;
        // Check if attempted
        try {
          const attempts = await getMyQuizAttempts(accessToken, orgUnitId, item.QuizId, user);
          if (attempts && attempts.length > 0) {
            normalized.submitted = true;
          }
        } catch (e) { /* attempt check failed, skip */ }
        allItems.push(normalized);
      }
    } catch (e) { console.error(`Failed to fetch quizzes for ${courseName}:`, e.message); }

    try {
      // Discussions
      const forums = await getDiscussionForums(accessToken, orgUnitId, user);
      for (const forum of (forums || [])) {
        try {
          const topics = await getDiscussionTopics(accessToken, orgUnitId, forum.ForumId, user);
          for (const topic of (topics || [])) {
            const normalized = normalizeD2LItem(topic, 'discussion', courseName, color);
            normalized.unread = (topic.UnreadCount || 0) > 0;
            // Check if student has posted
            try {
              const posts = await getMyDiscussionPosts(accessToken, orgUnitId, forum.ForumId, topic.TopicId, user);
              if (posts && posts.length > 0) {
                normalized.submitted = true;
              }
            } catch (e) { /* post check failed */ }
            allItems.push(normalized);
          }
        } catch (e) { /* topic fetch failed */ }
      }
    } catch (e) { console.error(`Failed to fetch discussions for ${courseName}:`, e.message); }

    try {
      // Announcements
      const announcements = await getAnnouncements(accessToken, orgUnitId, user);
      for (const item of (announcements || [])) {
        const normalized = normalizeD2LItem(item, 'announcement', courseName, color);
        normalized.unread = !item.IsRead;
        allItems.push(normalized);
      }
    } catch (e) { console.error(`Failed to fetch announcements for ${courseName}:`, e.message); }

    try {
      // Checklists
      const checklists = await getChecklists(accessToken, orgUnitId, user);
      for (const checklist of (checklists || [])) {
        try {
          const details = await getChecklistItems(accessToken, orgUnitId, checklist.ChecklistId, user);
          for (const category of (details?.Categories || [])) {
            for (const item of (category?.Items || [])) {
              const normalized = normalizeD2LItem(item, 'checklist', courseName, color);
              allItems.push(normalized);
            }
          }
        } catch (e) { /* checklist detail fetch failed */ }
      }
    } catch (e) { console.error(`Failed to fetch checklists for ${courseName}:`, e.message); }

    try {
      // Grades — check for newly graded items
      const grades = await getGrades(accessToken, orgUnitId, user);
      for (const grade of (grades || [])) {
        // Find matching item and attach grade
        const matchingItem = allItems.find(item =>
          item.courseName === courseName &&
          grade.GradeObjectName &&
          item.name.includes(grade.GradeObjectName)
        );
        if (matchingItem && grade.PointsNumerator != null) {
          matchingItem.graded = true;
          matchingItem.grade = {
            earned: grade.PointsNumerator,
            outOf: grade.PointsDenominator,
            percentage: grade.PointsDenominator > 0 ?
              Math.round((grade.PointsNumerator / grade.PointsDenominator) * 100) : null,
          };
        }
      }
    } catch (e) { console.error(`Failed to fetch grades for ${courseName}:`, e.message); }
  }

  // Detect recurring patterns
  detectRecurringItems(allItems);

  return allItems;
}

// ============================================================
// SYLLABUS & COURSE DOCUMENTS
// ============================================================

// Find syllabus and course schedule documents from content tree
export async function getCourseSyllabus(accessToken, orgUnitId, user) {
  try {
    const toc = await getContentTOC(accessToken, orgUnitId, user);
    const docs = [];
    findSyllabusInContent(toc?.Modules || [], docs);
    return docs;
  } catch (e) {
    console.error(`Failed to fetch syllabus for org ${orgUnitId}:`, e.message);
    return [];
  }
}

// Recursively search content tree for syllabus/schedule-like items
function findSyllabusInContent(modules, results) {
  const keywords = ['syllabus', 'schedule', 'course calendar', 'course outline', 'course plan', 'class schedule', 'important dates'];

  for (const mod of modules) {
    // Check module title
    const modTitle = (mod.Title || mod.Name || '').toLowerCase();
    const isSyllabusModule = keywords.some(kw => modTitle.includes(kw));

    // Check topics inside module
    for (const topic of (mod.Topics || [])) {
      const topicTitle = (topic.Title || topic.Name || '').toLowerCase();
      const matchesKeyword = keywords.some(kw => topicTitle.includes(kw));

      if (matchesKeyword || isSyllabusModule) {
        results.push({
          id: topic.TopicId || topic.Identifier,
          title: topic.Title || topic.Name,
          type: topic.TypeIdentifier || 'document',
          url: topic.Url || null,
          moduleTitle: mod.Title || mod.Name,
          isFile: topic.TypeIdentifier === 'File',
          isLink: topic.TypeIdentifier === 'Link',
        });
      }
    }

    // Recurse into child modules
    if (mod.Modules && mod.Modules.length > 0) {
      findSyllabusInContent(mod.Modules, results);
    }
  }
}

// Get ALL documents from a course's content tree (for browsing)
export async function getCourseDocuments(accessToken, orgUnitId, user) {
  try {
    const toc = await getContentTOC(accessToken, orgUnitId, user);
    const docs = [];
    extractAllDocuments(toc?.Modules || [], docs, '');
    return docs;
  } catch (e) {
    console.error(`Failed to fetch documents for org ${orgUnitId}:`, e.message);
    return [];
  }
}

// Extract all document/file topics from content tree
function extractAllDocuments(modules, results, parentPath) {
  for (const mod of modules) {
    const modTitle = mod.Title || mod.Name || 'Untitled';
    const path = parentPath ? `${parentPath} > ${modTitle}` : modTitle;

    for (const topic of (mod.Topics || [])) {
      if (topic.TypeIdentifier === 'File' || topic.TypeIdentifier === 'Link') {
        results.push({
          id: topic.TopicId || topic.Identifier,
          title: topic.Title || topic.Name,
          type: topic.TypeIdentifier,
          url: topic.Url || null,
          path: path,
          moduleTitle: modTitle,
        });
      }
    }

    if (mod.Modules && mod.Modules.length > 0) {
      extractAllDocuments(mod.Modules, results, path);
    }
  }
}

// ============================================================
// INSTRUCTOR WRITE ENDPOINTS
// ============================================================

// Create a new dropbox folder (assignment)
export async function createDropboxFolder(accessToken, orgUnitId, folderData, user) {
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
