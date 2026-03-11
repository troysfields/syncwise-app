// SyncWise AI — Rate Limiter & Model Auto-Switcher
// Tracks per-student and global API usage, auto-downgrades to Haiku
// when thresholds are exceeded to control costs.
//
// Models: Sonnet 4.6 (default) → Haiku 4.5 (lite mode)
// Thresholds are per-student unless marked global.

// --- Configuration ---
const RATE_LIMITS = {
  prioritization: {
    maxPerWindow: 10,       // max requests per student per window
    windowMs: 5 * 60 * 1000, // 5 minute window
  },
  emailScan: {
    maxPerWindow: 5,
    windowMs: 60 * 60 * 1000, // 1 hour window
  },
  chatbot: {
    maxPerWindow: 30,
    windowMs: 60 * 60 * 1000, // 1 hour window
  },
  global: {
    maxTokensPerDay: 200000,  // daily token budget across all students
    resetHour: 0,             // midnight reset (local server time)
  },
};

// Model strings
const MODELS = {
  default: 'claude-sonnet-4-6',
  lite: 'claude-haiku-4-5-20251001',
};

// --- In-memory storage ---
// Production: swap this for Redis or a database
const studentRequests = new Map();  // studentId → { feature → [timestamps] }
const globalUsage = {
  tokensToday: 0,
  lastReset: new Date().toDateString(),
};

// --- Core Functions ---

/**
 * Get the current model for a student + feature combo.
 * Returns { model, isLiteMode, reason } so the UI can show a banner.
 */
export function getModelForRequest(studentId, feature) {
  // Check global daily budget first
  resetGlobalIfNewDay();
  if (globalUsage.tokensToday >= RATE_LIMITS.global.maxTokensPerDay) {
    return {
      model: MODELS.lite,
      isLiteMode: true,
      reason: 'Daily usage limit reached — running in lite mode.',
    };
  }

  // Check per-student rate limit
  const limit = RATE_LIMITS[feature];
  if (!limit) {
    return { model: MODELS.default, isLiteMode: false, reason: null };
  }

  const now = Date.now();
  const key = `${studentId}:${feature}`;

  if (!studentRequests.has(key)) {
    studentRequests.set(key, []);
  }

  const timestamps = studentRequests.get(key);

  // Clean up expired timestamps
  const windowStart = now - limit.windowMs;
  const recentRequests = timestamps.filter(t => t > windowStart);
  studentRequests.set(key, recentRequests);

  if (recentRequests.length >= limit.maxPerWindow) {
    return {
      model: MODELS.lite,
      isLiteMode: true,
      reason: `You're using this feature a lot — switching to lite mode temporarily. Full quality returns in ${getTimeRemaining(recentRequests[0], limit.windowMs)}.`,
    };
  }

  return { model: MODELS.default, isLiteMode: false, reason: null };
}

/**
 * Record a request. Call this AFTER getModelForRequest and BEFORE the API call.
 * Returns the updated request count for this window.
 */
export function recordRequest(studentId, feature, tokensUsed = 0) {
  const now = Date.now();
  const key = `${studentId}:${feature}`;

  if (!studentRequests.has(key)) {
    studentRequests.set(key, []);
  }

  studentRequests.get(key).push(now);

  // Track global token usage
  resetGlobalIfNewDay();
  globalUsage.tokensToday += tokensUsed;

  return {
    requestsInWindow: studentRequests.get(key).length,
    globalTokensToday: globalUsage.tokensToday,
  };
}

/**
 * Get usage stats for a student (for the dashboard UI).
 */
export function getStudentUsageStats(studentId) {
  const now = Date.now();
  const stats = {};

  for (const [feature, limit] of Object.entries(RATE_LIMITS)) {
    if (feature === 'global') continue;

    const key = `${studentId}:${feature}`;
    const timestamps = studentRequests.get(key) || [];
    const windowStart = now - limit.windowMs;
    const recentRequests = timestamps.filter(t => t > windowStart);

    stats[feature] = {
      requestsUsed: recentRequests.length,
      requestsMax: limit.maxPerWindow,
      isLimited: recentRequests.length >= limit.maxPerWindow,
      windowResetsIn: recentRequests.length > 0
        ? getTimeRemaining(recentRequests[0], limit.windowMs)
        : null,
    };
  }

  stats.global = {
    tokensUsed: globalUsage.tokensToday,
    tokensMax: RATE_LIMITS.global.maxTokensPerDay,
    isLimited: globalUsage.tokensToday >= RATE_LIMITS.global.maxTokensPerDay,
  };

  return stats;
}

/**
 * Get global usage stats (for admin health dashboard).
 */
export function getGlobalUsageStats() {
  resetGlobalIfNewDay();

  const now = Date.now();
  const activeStudents = new Set();
  let totalRequests = 0;

  for (const [key, timestamps] of studentRequests.entries()) {
    const studentId = key.split(':')[0];
    const feature = key.split(':')[1];
    const limit = RATE_LIMITS[feature];
    if (!limit) continue;

    const windowStart = now - limit.windowMs;
    const recent = timestamps.filter(t => t > windowStart);
    if (recent.length > 0) {
      activeStudents.add(studentId);
      totalRequests += recent.length;
    }
  }

  return {
    tokensToday: globalUsage.tokensToday,
    tokenBudget: RATE_LIMITS.global.maxTokensPerDay,
    tokenUsagePercent: Math.round((globalUsage.tokensToday / RATE_LIMITS.global.maxTokensPerDay) * 100),
    activeStudents: activeStudents.size,
    totalRecentRequests: totalRequests,
    currentModel: globalUsage.tokensToday >= RATE_LIMITS.global.maxTokensPerDay
      ? MODELS.lite
      : MODELS.default,
    isGlobalLiteMode: globalUsage.tokensToday >= RATE_LIMITS.global.maxTokensPerDay,
  };
}

/**
 * Update rate limit thresholds at runtime (admin control).
 */
export function updateRateLimits(feature, newLimits) {
  if (RATE_LIMITS[feature]) {
    Object.assign(RATE_LIMITS[feature], newLimits);
    return true;
  }
  return false;
}

/**
 * Get current rate limit configuration.
 */
export function getRateLimitConfig() {
  return {
    limits: { ...RATE_LIMITS },
    models: { ...MODELS },
  };
}

// --- Helpers ---

function resetGlobalIfNewDay() {
  const today = new Date().toDateString();
  if (globalUsage.lastReset !== today) {
    globalUsage.tokensToday = 0;
    globalUsage.lastReset = today;
  }
}

function getTimeRemaining(oldestTimestamp, windowMs) {
  const expiresAt = oldestTimestamp + windowMs;
  const remaining = expiresAt - Date.now();

  if (remaining <= 0) return 'now';
  if (remaining < 60000) return `${Math.ceil(remaining / 1000)}s`;
  if (remaining < 3600000) return `${Math.ceil(remaining / 60000)}m`;
  return `${Math.round(remaining / 3600000 * 10) / 10}h`;
}
