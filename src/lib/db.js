// SyncWise AI — Database Layer
// Persistent storage for user accounts, settings, conflicts, and notifications.
// Uses Upstash Redis in production, in-memory fallback for dev/build.
//
// Data model:
//   user:{email}          → user profile + settings (JSON)
//   conflicts:{courseId}   → array of conflict objects
//   overrides:{courseId}   → array of instructor overrides
//   notifications:{email}  → array of student notifications
//   feedback              → array of feedback entries

let kv = null;

// Detect Upstash Redis env vars (Vercel Marketplace injects these automatically)
function getRedisConfig() {
  // Upstash naming (via Vercel Marketplace)
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) return { url, token };
  return null;
}

// Connect to Upstash Redis or fall back to in-memory for dev/build
async function getKV() {
  if (kv) return kv;

  const config = getRedisConfig();
  if (config) {
    try {
      const { Redis } = await import('@upstash/redis');
      const redis = new Redis({ url: config.url, token: config.token });

      // Wrap Upstash Redis with rate-limit detection
      // If Redis hits the free tier limit, throw a clear error instead of crashing silently
      function wrapRedisCall(fn) {
        return async (...args) => {
          try {
            return await fn(...args);
          } catch (err) {
            if (err?.message?.includes('max requests limit exceeded')) {
              console.error('[DB] Upstash Redis FREE TIER LIMIT REACHED (500K requests/month).');
              const limitErr = new Error('Redis request limit exceeded. Upgrade Upstash plan or wait for monthly reset.');
              limitErr.code = 'REDIS_LIMIT';
              throw limitErr;
            }
            throw err;
          }
        };
      }

      // Wrap Upstash Redis to match our interface (get/set store JSON automatically)
      kv = {
        get: wrapRedisCall(async (key) => {
          const val = await redis.get(key);
          return val ?? null;
        }),
        set: wrapRedisCall(async (key, value) => {
          // Upstash auto-serializes objects to JSON
          await redis.set(key, value);
          return 'OK';
        }),
        del: wrapRedisCall(async (key) => {
          return await redis.del(key);
        }),
        keys: wrapRedisCall(async (pattern) => {
          // Upstash supports SCAN-based keys
          const results = [];
          let cursor = 0;
          do {
            const [nextCursor, keys] = await redis.scan(cursor, { match: pattern, count: 100 });
            cursor = nextCursor;
            results.push(...keys);
          } while (cursor !== 0);
          return results;
        }),
        _redis: redis,
        _isMemory: false,
      };
      console.log('[DB] Connected to Upstash Redis');
      return kv;
    } catch (err) {
      console.warn('[DB] Upstash Redis not available, using in-memory fallback:', err.message);
    }
  }

  // In-memory fallback for local dev and build
  if (!kv) {
    const store = new Map();
    kv = {
      async get(key) { return store.get(key) || null; },
      async set(key, value) { store.set(key, value); return 'OK'; },
      async del(key) { store.delete(key); return 1; },
      async keys(pattern) {
        const prefix = pattern.replace('*', '');
        return [...store.keys()].filter(k => k.startsWith(prefix));
      },
      _isMemory: true,
    };
    console.log('[DB] Using in-memory fallback (no Redis configured)');
  }
  return kv;
}

// ─── User Profiles ───

/**
 * Save or update a user profile.
 * Called after setup wizard or when settings change.
 */
export async function saveUser(email, userData) {
  const db = await getKV();
  const key = `user:${email.toLowerCase()}`;

  const existing = await db.get(key);
  const profile = {
    ...(existing || {}),
    ...userData,
    email: email.toLowerCase(),
    updatedAt: new Date().toISOString(),
    createdAt: existing?.createdAt || new Date().toISOString(),
  };

  await db.set(key, profile);
  return profile;
}

/**
 * Get a user profile by email.
 */
export async function getUser(email) {
  if (!email) return null;
  const db = await getKV();
  return await db.get(`user:${email.toLowerCase()}`);
}

/**
 * Delete a user profile (for account deletion/GDPR).
 */
export async function deleteUser(email) {
  const db = await getKV();
  const key = `user:${email.toLowerCase()}`;
  await db.del(key);
  // Also clean up related data
  await db.del(`notifications:${email.toLowerCase()}`);
  return true;
}

/**
 * List all users (admin only).
 */
export async function listUsers() {
  const db = await getKV();
  const keys = await db.keys('user:*');
  const users = [];
  for (const key of keys) {
    const user = await db.get(key);
    if (user) {
      // Strip sensitive data for listing
      const { icalUrl, ...safe } = user;
      users.push({ ...safe, hasIcal: !!icalUrl });
    }
  }
  return users;
}

// ─── User Settings (subset of profile, for quick access) ───

/**
 * Update specific settings for a user.
 */
export async function updateUserSettings(email, settings) {
  const db = await getKV();
  const key = `user:${email.toLowerCase()}`;
  const existing = await db.get(key);

  if (!existing) return null;

  const updated = {
    ...existing,
    settings: { ...(existing.settings || {}), ...settings },
    updatedAt: new Date().toISOString(),
  };

  await db.set(key, updated);
  return updated;
}

// ─── Conflicts ───

/**
 * Save conflicts for a course.
 */
export async function saveConflicts(courseId, conflicts) {
  const db = await getKV();
  await db.set(`conflicts:${courseId}`, {
    conflicts,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Get conflicts for a course.
 */
export async function getConflicts(courseId) {
  const db = await getKV();
  const data = await db.get(`conflicts:${courseId}`);
  return data?.conflicts || [];
}

/**
 * Get all conflicts across all courses.
 */
export async function getAllConflicts() {
  const db = await getKV();
  const keys = await db.keys('conflicts:*');
  const all = [];
  for (const key of keys) {
    const data = await db.get(key);
    if (data?.conflicts) all.push(...data.conflicts);
  }
  return all;
}

// ─── Instructor Overrides ───

/**
 * Save an instructor override.
 */
export async function saveOverride(courseId, override) {
  const db = await getKV();
  const key = `overrides:${courseId}`;
  const existing = await db.get(key) || { overrides: [] };
  existing.overrides.push({ ...override, createdAt: new Date().toISOString() });
  existing.updatedAt = new Date().toISOString();
  await db.set(key, existing);
  return override;
}

/**
 * Get overrides for a course.
 */
export async function getOverrides(courseId) {
  const db = await getKV();
  const data = await db.get(`overrides:${courseId}`);
  return data?.overrides || [];
}

/**
 * Get all active overrides.
 */
export async function getAllOverrides() {
  const db = await getKV();
  const keys = await db.keys('overrides:*');
  const all = [];
  for (const key of keys) {
    const data = await db.get(key);
    if (data?.overrides) all.push(...data.overrides);
  }
  return all;
}

// ─── Student Notifications ───

/**
 * Add a notification for a student.
 */
export async function addNotification(email, notification) {
  const db = await getKV();
  const key = `notifications:${email.toLowerCase()}`;
  const existing = await db.get(key) || { items: [] };

  existing.items.unshift({
    ...notification,
    id: notification.id || `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    read: false,
    createdAt: new Date().toISOString(),
  });

  // Keep max 100 notifications per student
  if (existing.items.length > 100) {
    existing.items = existing.items.slice(0, 100);
  }

  await db.set(key, existing);
  return existing.items[0];
}

/**
 * Get notifications for a student.
 */
export async function getNotifications(email, { unreadOnly = false, limit = 50 } = {}) {
  const db = await getKV();
  const data = await db.get(`notifications:${email.toLowerCase()}`);
  let items = data?.items || [];

  if (unreadOnly) {
    items = items.filter(n => !n.read);
  }

  return items.slice(0, limit);
}

/**
 * Mark notification(s) as read.
 */
export async function markNotificationsRead(email, notificationIds) {
  const db = await getKV();
  const key = `notifications:${email.toLowerCase()}`;
  const data = await db.get(key);
  if (!data?.items) return 0;

  let count = 0;
  const ids = Array.isArray(notificationIds) ? notificationIds : [notificationIds];

  for (const item of data.items) {
    if (ids.includes(item.id) && !item.read) {
      item.read = true;
      item.readAt = new Date().toISOString();
      count++;
    }
  }

  await db.set(key, data);
  return count;
}

/**
 * Dismiss (delete) notification(s).
 */
export async function dismissNotifications(email, notificationIds) {
  const db = await getKV();
  const key = `notifications:${email.toLowerCase()}`;
  const data = await db.get(key);
  if (!data?.items) return 0;

  const ids = Array.isArray(notificationIds) ? notificationIds : [notificationIds];
  const before = data.items.length;
  data.items = data.items.filter(n => !ids.includes(n.id));
  await db.set(key, data);
  return before - data.items.length;
}

// ─── Course-Based Date Change Notifications ───
// These are notifications generated when an instructor overrides a date.
// Stored per-course so any student enrolled in that course can see them.

/**
 * Add a date change notification for a course.
 * All students enrolled in this course will see it.
 */
export async function addDateChangeNotification(courseId, notification) {
  const db = await getKV();
  const key = `date-changes:${courseId}`;
  const existing = await db.get(key) || { items: [] };

  existing.items.unshift({
    ...notification,
    id: notification.id || `dcn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: notification.createdAt || new Date().toISOString(),
  });

  // Keep max 200 date change notifications per course
  if (existing.items.length > 200) {
    existing.items = existing.items.slice(0, 200);
  }

  existing.updatedAt = new Date().toISOString();
  await db.set(key, existing);
  return existing.items[0];
}

/**
 * Get date change notifications across multiple courses.
 * Used by students to see all date changes for their enrolled courses.
 */
export async function getDateChangeNotifications(courseIds, { unreadOnly = false } = {}) {
  const db = await getKV();
  const all = [];

  for (const courseId of courseIds) {
    const data = await db.get(`date-changes:${courseId}`);
    if (data?.items) {
      all.push(...data.items);
    }
  }

  let items = all.filter(n => !n.dismissed);
  if (unreadOnly) {
    items = items.filter(n => !n.read);
  }

  // Sort: unread first, then by date (newest first)
  items.sort((a, b) => {
    if (a.read !== b.read) return a.read ? 1 : -1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return items;
}

/**
 * Mark a date change notification as read.
 */
export async function markDateChangeRead(courseId, notificationId) {
  const db = await getKV();
  const key = `date-changes:${courseId}`;
  const data = await db.get(key);
  if (!data?.items) return false;

  const notif = data.items.find(n => n.id === notificationId);
  if (!notif) return false;

  notif.read = true;
  notif.readAt = new Date().toISOString();
  await db.set(key, data);
  return true;
}

/**
 * Dismiss a date change notification.
 */
export async function dismissDateChange(courseId, notificationId) {
  const db = await getKV();
  const key = `date-changes:${courseId}`;
  const data = await db.get(key);
  if (!data?.items) return false;

  const notif = data.items.find(n => n.id === notificationId);
  if (!notif) return false;

  notif.dismissed = true;
  await db.set(key, data);
  return true;
}

// ─── Feedback (persistent) ───

/**
 * Save a feedback entry.
 */
export async function saveFeedback(entry) {
  const db = await getKV();
  const existing = await db.get('feedback') || { entries: [] };
  existing.entries.unshift({
    ...entry,
    id: `fb_${Date.now()}`,
    submittedAt: new Date().toISOString(),
  });
  await db.set('feedback', existing);
  return existing.entries[0];
}

/**
 * Get all feedback entries.
 */
export async function getAllFeedback() {
  const db = await getKV();
  const data = await db.get('feedback');
  return data?.entries || [];
}

// ─── Chat History (optional, for Tier 2) ───

/**
 * Save chat history for a user session.
 */
export async function saveChatHistory(email, messages) {
  const db = await getKV();
  const key = `chat:${email.toLowerCase()}`;
  await db.set(key, {
    messages: messages.slice(-200), // Keep last 200 messages (matches 90-day analytics retention)
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Get chat history for a user.
 */
export async function getChatHistory(email) {
  const db = await getKV();
  const data = await db.get(`chat:${email.toLowerCase()}`);
  return data?.messages || [];
}

// ─── Password Management ───

/**
 * Save a hashed password for a user.
 * Uses bcryptjs for secure hashing.
 */
export async function saveUserPassword(email, password) {
  const bcrypt = (await import('bcryptjs')).default;
  const hash = await bcrypt.hash(password, 10);
  const db = await getKV();
  await db.set(`password:${email.toLowerCase()}`, { hash, updatedAt: new Date().toISOString() });
  return true;
}

/**
 * Verify a password against the stored hash.
 * Returns true if valid, false otherwise.
 */
export async function verifyUserPassword(email, password) {
  const bcrypt = (await import('bcryptjs')).default;
  const db = await getKV();
  const stored = await db.get(`password:${email.toLowerCase()}`);
  if (!stored?.hash) return false;
  return await bcrypt.compare(password, stored.hash);
}

/**
 * Check if a user has a password set.
 */
export async function hasPassword(email) {
  const db = await getKV();
  const stored = await db.get(`password:${email.toLowerCase()}`);
  return !!stored?.hash;
}

/**
 * Save a password reset token (expires in 1 hour).
 */
export async function savePasswordResetToken(email, token) {
  const db = await getKV();
  await db.set(`reset:${token}`, {
    email: email.toLowerCase(),
    createdAt: Date.now(),
    expiresAt: Date.now() + (60 * 60 * 1000), // 1 hour
  });
  return true;
}

/**
 * Validate a password reset token. Returns email if valid, null if invalid/expired.
 */
export async function validateResetToken(token) {
  const db = await getKV();
  const data = await db.get(`reset:${token}`);
  if (!data) return null;
  if (Date.now() > data.expiresAt) {
    await db.del(`reset:${token}`);
    return null;
  }
  return data.email;
}

/**
 * Consume (delete) a password reset token after use.
 */
export async function consumeResetToken(token) {
  const db = await getKV();
  await db.del(`reset:${token}`);
}

// ─── Health Check ───

/**
 * Check if the database is connected and working.
 */
export async function dbHealthCheck() {
  try {
    const db = await getKV();
    await db.set('health:ping', { ts: Date.now() });
    const result = await db.get('health:ping');
    return {
      connected: true,
      type: db._isMemory ? 'in-memory' : 'upstash-redis',
      latency: Date.now() - result.ts,
    };
  } catch (err) {
    return { connected: false, error: err.message };
  }
}
