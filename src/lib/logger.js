// API Activity Logger
// Logs every API call SyncWise makes — available to CMU IT on demand
// Uses /tmp on Vercel (serverless-safe), falls back to process.cwd()/logs locally.
// Note: /tmp is ephemeral on Vercel — logs persist only for the lifetime of the
// serverless function instance. For durable logging, use the analytics system (Redis-backed).

import fs from 'fs';
import path from 'path';

// Vercel serverless: process.cwd() is read-only, but /tmp is writable
const LOG_DIR = process.env.VERCEL ? '/tmp/logs' : path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'api-activity.jsonl');

// Safely create log directory — never crash on failure
try {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
} catch {
  // Silently continue — logging is best-effort, not mission-critical
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

  try {
    fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');
  } catch {
    // Best-effort — don't crash the request if logging fails
  }

  return entry;
}

export function getRecentLogs(count = 100) {
  try {
    if (!fs.existsSync(LOG_FILE)) return [];
    const lines = fs.readFileSync(LOG_FILE, 'utf8').trim().split('\n');
    return lines.slice(-count).map(line => JSON.parse(line));
  } catch {
    return [];
  }
}

export function getLogsByUser(email) {
  try {
    if (!fs.existsSync(LOG_FILE)) return [];
    const lines = fs.readFileSync(LOG_FILE, 'utf8').trim().split('\n');
    return lines
      .map(line => JSON.parse(line))
      .filter(entry => entry.user === email);
  } catch {
    return [];
  }
}

export function getLogsByPlatform(platform) {
  try {
    if (!fs.existsSync(LOG_FILE)) return [];
    const lines = fs.readFileSync(LOG_FILE, 'utf8').trim().split('\n');
    return lines
      .map(line => JSON.parse(line))
      .filter(entry => entry.platform === platform);
  } catch {
    return [];
  }
}
