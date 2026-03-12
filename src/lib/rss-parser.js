// RSS Feed Parser for D2L Course Announcements
// Parses RSS/Atom feeds from D2L Brightspace course news/announcements
// No API key or IT approval needed — students subscribe via D2L course tools
// Feed URL format: https://d2l.coloradomesa.edu/d2l/le/{orgUnitId}/news/rss.xml

import { logApiCall } from './logger';

// ============================================================
// XML PARSING — Lightweight RSS/Atom parser (no external deps)
// ============================================================

// Parse XML text into a simple DOM-like structure
// We avoid external dependencies to keep the bundle small
function parseXML(xmlText) {
  // Clean up the XML
  const clean = xmlText.trim().replace(/^\uFEFF/, ''); // Remove BOM

  const items = [];
  const feedInfo = {};

  // Detect feed type
  const isAtom = clean.includes('<feed') && clean.includes('xmlns="http://www.w3.org/2005/Atom"');
  const isRSS = clean.includes('<rss') || clean.includes('<channel>');

  if (isAtom) {
    return parseAtomFeed(clean);
  } else if (isRSS) {
    return parseRSSFeed(clean);
  }

  throw new Error('Unknown feed format: not RSS or Atom');
}

// Parse RSS 2.0 feed
function parseRSSFeed(xml) {
  const feedInfo = {
    title: extractTag(xml, 'channel', 'title') || '',
    description: extractTag(xml, 'channel', 'description') || '',
    link: extractTag(xml, 'channel', 'link') || '',
    type: 'rss',
  };

  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    items.push({
      title: extractTagValue(itemXml, 'title') || 'Untitled',
      description: extractTagValue(itemXml, 'description') || '',
      link: extractTagValue(itemXml, 'link') || '',
      pubDate: extractTagValue(itemXml, 'pubDate') || '',
      guid: extractTagValue(itemXml, 'guid') || '',
      author: extractTagValue(itemXml, 'author') || extractTagValue(itemXml, 'dc:creator') || '',
      category: extractAllTagValues(itemXml, 'category'),
    });
  }

  return { feedInfo, items };
}

// Parse Atom feed
function parseAtomFeed(xml) {
  const feedInfo = {
    title: extractTagValue(xml, 'title') || '',
    subtitle: extractTagValue(xml, 'subtitle') || '',
    link: extractAtomLink(xml) || '',
    type: 'atom',
  };

  const items = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
  let match;

  while ((match = entryRegex.exec(xml)) !== null) {
    const entryXml = match[1];
    items.push({
      title: extractTagValue(entryXml, 'title') || 'Untitled',
      description: extractTagValue(entryXml, 'content') || extractTagValue(entryXml, 'summary') || '',
      link: extractAtomLink(entryXml) || '',
      pubDate: extractTagValue(entryXml, 'published') || extractTagValue(entryXml, 'updated') || '',
      guid: extractTagValue(entryXml, 'id') || '',
      author: extractTagValue(entryXml, 'name') || '',
      category: extractAtomCategories(entryXml),
    });
  }

  return { feedInfo, items };
}

// ============================================================
// XML HELPER FUNCTIONS
// ============================================================

function extractTagValue(xml, tag) {
  // Handle CDATA sections
  const cdataRegex = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, 'i');
  const cdataMatch = xml.match(cdataRegex);
  if (cdataMatch) return cdataMatch[1].trim();

  // Handle regular content
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const match = xml.match(regex);
  if (match) return decodeXMLEntities(match[1].trim());

  return '';
}

function extractTag(xml, parent, child) {
  const parentRegex = new RegExp(`<${parent}[^>]*>([\\s\\S]*?)</${parent}>`, 'i');
  const parentMatch = xml.match(parentRegex);
  if (!parentMatch) return '';
  return extractTagValue(parentMatch[1], child);
}

function extractAllTagValues(xml, tag) {
  const results = [];
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'gi');
  let match;
  while ((match = regex.exec(xml)) !== null) {
    results.push(decodeXMLEntities(match[1].trim()));
  }
  return results;
}

function extractAtomLink(xml) {
  const match = xml.match(/<link[^>]*href="([^"]*)"[^>]*\/?>/i);
  return match ? match[1] : '';
}

function extractAtomCategories(xml) {
  const results = [];
  const regex = /<category[^>]*term="([^"]*)"[^>]*\/?>/gi;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    results.push(match[1]);
  }
  return results;
}

function decodeXMLEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

// Strip HTML tags from description for clean text
function stripHTML(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ============================================================
// ANNOUNCEMENT NORMALIZATION
// ============================================================

// Convert RSS item into SyncWise announcement format
function normalizeRSSItem(item, courseName, feedUrl) {
  const pubDate = item.pubDate ? new Date(item.pubDate) : null;

  return {
    id: `rss-${item.guid || hashString(item.title + item.pubDate)}`,
    type: 'announcement',
    name: item.title,
    courseName: courseName,
    courseColor: '#4F46E5', // Default — dashboard assigns per-course colors
    dueDate: null, // Announcements don't have due dates
    startDate: pubDate ? pubDate.toISOString() : null,
    publishedAt: pubDate ? pubDate.toISOString() : null,
    source: 'rss',
    hasDueDate: false,
    submitted: false,
    graded: false,
    grade: null,
    unread: true, // New items default to unread
    isRecurring: false,
    recurringLabel: null,
    description: stripHTML(item.description),
    descriptionHtml: item.description,
    author: item.author || '',
    categories: item.category || [],
    link: item.link,
    feedUrl: feedUrl,
    status: 'active',
    manualDate: null,
    confirmedNoDate: false,
  };
}

// Simple string hash for generating IDs when no GUID exists
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

// ============================================================
// FETCH & PARSE — Main entry point
// ============================================================

// Fetch and parse an RSS feed URL
export async function fetchAndParseRSSFeed(feedUrl, courseName = '', user = '') {
  try {
    const res = await fetch(feedUrl, {
      headers: {
        'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml',
        'User-Agent': 'SyncWise-AI/1.0',
      },
    });

    if (!res.ok) {
      throw new Error(`RSS fetch failed: HTTP ${res.status}`);
    }

    const xmlText = await res.text();

    // Validate it's XML
    if (!xmlText.includes('<') || (!xmlText.includes('<rss') && !xmlText.includes('<feed') && !xmlText.includes('<channel'))) {
      throw new Error('Invalid RSS data: not valid XML feed');
    }

    const { feedInfo, items } = parseXML(xmlText);

    // Use feed title as course name if not provided
    const resolvedCourseName = courseName || feedInfo.title || 'Unknown Course';

    const announcements = items.map(item =>
      normalizeRSSItem(item, resolvedCourseName, feedUrl)
    );

    // Log for audit trail
    logApiCall({
      user,
      userRole: 'student',
      platform: 'rss',
      action: 'fetch_announcement_feed',
      endpoint: feedUrl,
      method: 'GET',
      details: { announcementCount: announcements.length, feedTitle: feedInfo.title },
      status: 'success',
    });

    return {
      success: true,
      feedInfo,
      announcements,
      count: announcements.length,
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    logApiCall({
      user,
      userRole: 'student',
      platform: 'rss',
      action: 'fetch_announcement_feed',
      endpoint: feedUrl,
      method: 'GET',
      details: { error: error.message },
      status: 'error',
    });

    return {
      success: false,
      feedInfo: {},
      announcements: [],
      count: 0,
      error: error.message,
      fetchedAt: new Date().toISOString(),
    };
  }
}

// ============================================================
// FILTER & SORT UTILITIES
// ============================================================

// Get recent announcements (last N days)
export function getRecentAnnouncements(announcements, daysBack = 7) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysBack);

  return announcements
    .filter(a => {
      if (!a.publishedAt) return true; // Include items without dates
      return new Date(a.publishedAt) >= cutoff;
    })
    .sort((a, b) => {
      const dateA = a.publishedAt ? new Date(a.publishedAt) : new Date(0);
      const dateB = b.publishedAt ? new Date(b.publishedAt) : new Date(0);
      return dateB - dateA; // Newest first
    });
}

// Get unread announcements
export function getUnreadAnnouncements(announcements) {
  return announcements.filter(a => a.unread);
}

// Group announcements by course
export function groupAnnouncementsByCourse(announcements) {
  const grouped = {};
  for (const item of announcements) {
    const course = item.courseName || 'Unknown Course';
    if (!grouped[course]) grouped[course] = [];
    grouped[course].push(item);
  }
  return grouped;
}

// Mark announcements as read
export function markAsRead(announcements, ids) {
  const idSet = new Set(ids);
  return announcements.map(a => ({
    ...a,
    unread: idSet.has(a.id) ? false : a.unread,
  }));
}
