// SyncWise Error Detection & Alerting System
// Three tiers: Student-facing toasts, Admin email alerts, Claude-readable error logs
// Primary storage: Redis (persistent). Fallback: /tmp filesystem (ephemeral on Vercel).

import fs from 'fs';
import path from 'path';

// Filesystem fallback (ephemeral on Vercel but useful for local dev)
const LOG_DIR = process.env.VERCEL ? '/tmp/logs' : path.join(process.cwd(), 'logs');
const ERROR_LOG = path.join(LOG_DIR, 'errors.jsonl');
const HEALTH_LOG = path.join(LOG_DIR, 'health-checks.jsonl');

try {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
} catch {
  // Silently continue — logging is best-effort
}

// Redis helper — lazy import to avoid build issues
let _redis = null;
async function getRedis() {
  if (_redis) return _redis;
  try {
    const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
    if (!url || !token) return null;
    const { Redis } = await import('@upstash/redis');
    _redis = new Redis({ url, token });
    return _redis;
  } catch {
    return null;
  }
}

// ============================================================
// ERROR SEVERITY LEVELS
// ============================================================

export const SEVERITY = {
  LOW: 'low',           // Minor issue, feature still works (e.g., slow response)
  MEDIUM: 'medium',     // Feature degraded, fallback active (e.g., AI unavailable, using keyword parser)
  HIGH: 'high',         // Feature broken for one user (e.g., their OAuth token expired)
  CRITICAL: 'critical', // Feature broken for all users (e.g., API down, deployment error)
};

// ============================================================
// STUDENT-FACING MESSAGES
// Maps technical errors to plain-language explanations
// ============================================================

const STUDENT_MESSAGES = {
  // Outlook Calendar
  'outlook_calendar_read_failed': {
    message: "We couldn't load your calendar right now.",
    hint: "Your events from earlier today are still showing. We'll try again in a few minutes.",
    action: "The SyncWise team has been notified.",
  },
  'outlook_calendar_write_failed': {
    message: "We couldn't add that event to your Outlook calendar.",
    hint: "Try again in a minute. If it keeps happening, you can add it manually in Outlook.",
    action: "The SyncWise team has been notified.",
  },

  // Outlook Email
  'outlook_email_scan_failed': {
    message: "Inbox scan didn't go through.",
    hint: "This usually fixes itself. Try hitting 'Scan My Inbox' again in a minute.",
    action: "The SyncWise team has been notified.",
  },
  'outlook_auth_expired': {
    message: "Your Outlook connection needs to be refreshed.",
    hint: "Click 'Sign out' and sign back in with your CMU account. Your data will still be here.",
    action: null,
  },

  // D2L
  'd2l_read_failed': {
    message: "We couldn't pull your latest assignments from D2L.",
    hint: "Your existing assignments are still showing. Check D2L directly if you need the latest info.",
    action: "The SyncWise team has been notified.",
  },
  'd2l_auth_expired': {
    message: "Your D2L connection needs to be refreshed.",
    hint: "Click 'Sign out' and sign back in. You won't lose any data.",
    action: null,
  },

  // AI
  'ai_prioritization_failed': {
    message: "Smart prioritization is temporarily using basic mode.",
    hint: "Your assignments are sorted by due date and points instead of AI analysis. Everything still works.",
    action: null,
  },
  'ai_email_parse_failed': {
    message: "Email scanning is running in basic mode.",
    hint: "We're using keyword detection instead of AI analysis. Results may be less precise but still useful.",
    action: null,
  },

  // General
  'network_error': {
    message: "Having trouble connecting.",
    hint: "Check your internet connection. If you're on campus WiFi, try switching to a different network.",
    action: "If the problem continues, the SyncWise team will be notified automatically.",
  },
  'unknown_error': {
    message: "Something unexpected happened.",
    hint: "Try refreshing the page. If it keeps happening, the team will look into it.",
    action: "The SyncWise team has been notified.",
  },
};

// ============================================================
// LOG AN ERROR — Full context for debugging
// Writes to Redis (persistent) + filesystem (fallback)
// ============================================================

export function logError({
  errorCode,
  severity,
  platform,       // 'outlook', 'd2l', 'claude', 'internal'
  endpoint,
  httpStatus,
  errorMessage,
  user,
  userAgent,
  stackTrace,
  context,        // any extra data for debugging
}) {
  const entry = {
    timestamp: new Date().toISOString(),
    errorCode: errorCode || 'unknown_error',
    severity: severity || SEVERITY.MEDIUM,
    platform: platform || 'unknown',
    endpoint: endpoint || '',
    httpStatus: httpStatus || null,
    errorMessage: errorMessage || '',
    user: user || 'unknown',
    userAgent: userAgent || '',
    stackTrace: stackTrace || '',
    context: context || {},
    resolved: false,
    resolvedAt: null,
    resolution: null,
  };

  // Write to Redis (persistent, fire-and-forget)
  const dateKey = new Date().toISOString().split('T')[0];
  getRedis().then(redis => {
    if (!redis) return;
    redis.lpush(`errors:${dateKey}`, JSON.stringify(entry)).catch(() => {});
    // Expire after 90 days
    redis.expire(`errors:${dateKey}`, 90 * 24 * 60 * 60).catch(() => {});
  }).catch(() => {});

  // Also write to filesystem as fallback
  try {
    fs.appendFileSync(ERROR_LOG, JSON.stringify(entry) + '\n');
  } catch (err) {
    console.error('Failed to write error log:', err.message);
  }

  return entry;
}

// ============================================================
// LOG A HEALTH CHECK — Track API status over time
// ============================================================

export function logHealthCheck({ platform, endpoint, status, responseTimeMs }) {
  const entry = {
    timestamp: new Date().toISOString(),
    platform,
    endpoint,
    status, // 'ok' or 'error'
    responseTimeMs,
  };

  // Write to Redis
  const dateKey = new Date().toISOString().split('T')[0];
  getRedis().then(redis => {
    if (!redis) return;
    redis.lpush(`health:${dateKey}`, JSON.stringify(entry)).catch(() => {});
    redis.expire(`health:${dateKey}`, 30 * 24 * 60 * 60).catch(() => {});
  }).catch(() => {});

  // Also write to filesystem as fallback
  try {
    fs.appendFileSync(HEALTH_LOG, JSON.stringify(entry) + '\n');
  } catch (err) {
    console.error('Failed to write health log:', err.message);
  }

  return entry;
}

// ============================================================
// GET STUDENT-FACING MESSAGE
// ============================================================

export function getStudentMessage(errorCode) {
  return STUDENT_MESSAGES[errorCode] || STUDENT_MESSAGES['unknown_error'];
}

// ============================================================
// GET RECENT ERRORS — For admin dashboard (reads from Redis first, falls back to filesystem)
// ============================================================

export async function getRecentErrors(count = 100) {
  // Try Redis first
  try {
    const redis = await getRedis();
    if (redis) {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const todayErrors = await redis.lrange(`errors:${today}`, 0, count - 1) || [];
      const yesterdayErrors = await redis.lrange(`errors:${yesterday}`, 0, count - 1) || [];
      const all = [...todayErrors, ...yesterdayErrors]
        .map(e => typeof e === 'string' ? JSON.parse(e) : e)
        .slice(0, count);
      if (all.length > 0) return all;
    }
  } catch {}

  // Fallback to filesystem
  try {
    if (!fs.existsSync(ERROR_LOG)) return [];
    const lines = fs.readFileSync(ERROR_LOG, 'utf8').trim().split('\n');
    return lines.slice(-count).map(line => JSON.parse(line)).reverse();
  } catch (err) {
    console.error('Failed to read error logs:', err.message);
    return [];
  }
}

// ============================================================
// GET ERROR STATS — Aggregated for admin dashboard
// ============================================================

export async function getErrorStats(hours = 24) {
  try {
    const errors = await getRecentErrors(500);
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    const filtered = errors.filter(e => new Date(e.timestamp) >= since);

    const bySeverity = {};
    const byPlatform = {};
    const byErrorCode = {};

    for (const err of filtered) {
      bySeverity[err.severity] = (bySeverity[err.severity] || 0) + 1;
      byPlatform[err.platform] = (byPlatform[err.platform] || 0) + 1;
      byErrorCode[err.errorCode] = (byErrorCode[err.errorCode] || 0) + 1;
    }

    // Check for spike: >5 errors in last 10 minutes
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentCount = filtered.filter(e => new Date(e.timestamp) >= tenMinAgo).length;

    return {
      total: filtered.length,
      bySeverity,
      byPlatform,
      byErrorCode,
      recentSpike: recentCount >= 5,
      recentCount,
    };
  } catch (err) {
    return { total: 0, bySeverity: {}, byPlatform: {}, recentSpike: false };
  }
}

// ============================================================
// GET HEALTH CHECK STATS
// ============================================================

export async function getHealthStats(hours = 24) {
  try {
    const redis = await getRedis();
    let checks = [];

    if (redis) {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const todayChecks = await redis.lrange(`health:${today}`, 0, 500) || [];
      const yesterdayChecks = await redis.lrange(`health:${yesterday}`, 0, 500) || [];
      checks = [...todayChecks, ...yesterdayChecks].map(c => typeof c === 'string' ? JSON.parse(c) : c);
    }

    // Fallback to filesystem if Redis empty
    if (checks.length === 0) {
      try {
        if (fs.existsSync(HEALTH_LOG)) {
          const lines = fs.readFileSync(HEALTH_LOG, 'utf8').trim().split('\n');
          checks = lines.map(line => JSON.parse(line));
        }
      } catch {}
    }

    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    checks = checks.filter(c => new Date(c.timestamp) >= since);

    const platforms = {};
    for (const check of checks) {
      if (!platforms[check.platform]) {
        platforms[check.platform] = { total: 0, ok: 0, error: 0, avgResponseMs: 0, times: [] };
      }
      platforms[check.platform].total++;
      platforms[check.platform][check.status]++;
      if (check.responseTimeMs) {
        platforms[check.platform].times.push(check.responseTimeMs);
      }
    }

    // Calculate averages
    for (const p of Object.values(platforms)) {
      if (p.times.length > 0) {
        p.avgResponseMs = Math.round(p.times.reduce((a, b) => a + b, 0) / p.times.length);
      }
      delete p.times;
    }

    return { checks: checks.length, platforms };
  } catch (err) {
    return { checks: 0, platforms: {} };
  }
}

// ============================================================
// CHECK IF ADMIN ALERT NEEDED — Spike detection
// ============================================================

export async function shouldAlertAdmin() {
  const stats = await getErrorStats(1); // last hour
  // Alert if: spike detected, or any critical errors, or >10 errors in an hour
  return stats.recentSpike ||
    (stats.bySeverity?.critical || 0) > 0 ||
    stats.total > 10;
}

// ============================================================
// FORMAT ERROR FOR CLAUDE — Structured context for AI debugging
// ============================================================

export function formatErrorForClaude(error) {
  return `## Error Report — ${error.timestamp}
**Code:** ${error.errorCode}
**Severity:** ${error.severity}
**Platform:** ${error.platform}
**Endpoint:** ${error.endpoint}
**HTTP Status:** ${error.httpStatus || 'N/A'}
**Error:** ${error.errorMessage}
**User:** ${error.user}
**Context:** ${JSON.stringify(error.context, null, 2)}
${error.stackTrace ? `**Stack Trace:**\n\`\`\`\n${error.stackTrace}\n\`\`\`` : ''}
---`;
}
