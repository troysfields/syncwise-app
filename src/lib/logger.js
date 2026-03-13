// API Activity Logger
// Logs every API call SyncWise makes — available to CMU IT on demand
// Primary storage: Redis (persistent). Fallback: /tmp filesystem (ephemeral on Vercel).

import fs from 'fs';
import path from 'path';

// Filesystem fallback (ephemeral on Vercel)
const LOG_DIR = process.env.VERCEL ? '/tmp/logs' : path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'api-activity.jsonl');

try {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
} catch {
  // Silently continue — logging is best-effort
}

// Redis helper — lazy import
let _redis = null;
async function getRedis() {
  if (_redis) return _redis;
  try {
    const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) return null;
    const { Redis } = await import('@upstash/redis');
    _redis = new Redis({ url, token });
    return _redis;
  } catch {
    return null;
  }
}

export function logApiCall({ user, userRole, platform, action, endpoint, method, details, status }) {
  const entry = {
    timestamp: new Date().toISOString(),
    user: user || 'unknown',
    userRole: userRole || 'student',
    platform: platform || 'unknown',
    action: action || 'unknown',
    endpoint: endpoint || '',
    method: method || 'GET',
    details: details || {},
    status: status || 'success',
  };

  // Write to Redis (persistent, fire-and-forget)
  const dateKey = new Date().toISOString().split('T')[0];
  getRedis().then(redis => {
    if (!redis) return;
    redis.lpush(`apilogs:${dateKey}`, JSON.stringify(entry)).catch(() => {});
    redis.expire(`apilogs:${dateKey}`, 90 * 24 * 60 * 60).catch(() => {});
  }).catch(() => {});

  // Also write to filesystem as fallback
  try {
    fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');
  } catch {
    // Best-effort — don't crash the request if logging fails
  }

  return entry;
}

export async function getRecentLogs(count = 100) {
  // Try Redis first
  try {
    const redis = await getRedis();
    if (redis) {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const todayLogs = await redis.lrange(`apilogs:${today}`, 0, count - 1) || [];
      const yesterdayLogs = await redis.lrange(`apilogs:${yesterday}`, 0, count - 1) || [];
      const all = [...todayLogs, ...yesterdayLogs]
        .map(e => typeof e === 'string' ? JSON.parse(e) : e)
        .slice(0, count);
      if (all.length > 0) return all;
    }
  } catch {}

  // Fallback to filesystem
  try {
    if (!fs.existsSync(LOG_FILE)) return [];
    const lines = fs.readFileSync(LOG_FILE, 'utf8').trim().split('\n');
    return lines.slice(-count).map(line => JSON.parse(line));
  } catch {
    return [];
  }
}

export async function getLogsByUser(email) {
  try {
    const logs = await getRecentLogs(500);
    return logs.filter(entry => entry.user === email);
  } catch {
    return [];
  }
}

export async function getLogsByPlatform(platform) {
  try {
    const logs = await getRecentLogs(500);
    return logs.filter(entry => entry.platform === platform);
  } catch {
    return [];
  }
}
