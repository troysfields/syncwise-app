// API Activity Logger
// Logs every API call SyncWise makes — available to CMU IT on demand
// In production, swap file storage for a database (Supabase, etc.)

import fs from 'fs';
import path from 'path';

const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'api-activity.jsonl');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

export function logApiCall({ user, userRole, platform, action, endpoint, method, details, status }) {
  const entry = {
    timestamp: new Date().toISOString(),
    user: user || 'unknown',
    userRole: userRole || 'student', // 'student' or 'instructor'
    platform: platform || 'unknown', // 'd2l' or 'microsoft'
    action: action || 'unknown', // human-readable: 'read_assignments', 'create_assignment', etc.
    endpoint: endpoint || '',
    method: method || 'GET',
    details: details || {},
    status: status || 'success',
  };

  try {
    fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');
  } catch (err) {
    console.error('Failed to write API log:', err.message);
  }

  return entry;
}

export function getRecentLogs(count = 100) {
  try {
    if (!fs.existsSync(LOG_FILE)) return [];
    const lines = fs.readFileSync(LOG_FILE, 'utf8').trim().split('\n');
    return lines.slice(-count).map(line => JSON.parse(line));
  } catch (err) {
    console.error('Failed to read API logs:', err.message);
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
  } catch (err) {
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
  } catch (err) {
    return [];
  }
}
