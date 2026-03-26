// CMU AI Calendar — Analytics & Telemetry
// Tracks every meaningful interaction for usage analysis, cost optimization,
// feature adoption metrics, and model selection decisions.
//
// Storage: Upstash Redis with date-partitioned keys
//   analytics:events:{YYYY-MM-DD}  → array of event objects (90-day TTL)
//   analytics:summary:{YYYY-MM-DD} → daily rollup counters
//
// Design goals:
//   1. Zero-impact on request latency (fire-and-forget writes)
//   2. Structured JSON events that Claude can bulk-analyze
//   3. Date-partitioned for easy range queries
//   4. Auto-expire after 90 days to manage storage

const TTL_DAYS = 90;
const TTL_SECONDS = TTL_DAYS * 24 * 60 * 60;

// Pricing per million tokens (March 2026)
const TOKEN_COSTS = {
  'claude-haiku-4-5-20251001': { input: 1.00, output: 5.00 },
  'claude-sonnet-4-6': { input: 3.00, output: 15.00 },
  'fallback': { input: 0, output: 0 },
};

let _redis = null;

async function getRedis() {
  if (_redis) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  try {
    const { Redis } = await import('@upstash/redis');
    _redis = new Redis({ url, token });
    return _redis;
  } catch {
    return null;
  }
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function estimateCost(model, inputTokens, outputTokens) {
  const rates = TOKEN_COSTS[model] || TOKEN_COSTS['fallback'];
  const ic = (inputTokens / 1_000_000) * rates.input;
  const oc = (outputTokens / 1_000_000) * rates.output;
  return { inputCost: ic, outputCost: oc, totalCost: ic + oc };
}

// ─── Core Event Tracking (fire-and-forget) ───

export async function trackEvent(event) {
  try {
    const redis = await getRedis();
    if (!redis) return;

    const date = todayStr();
    const entry = { ...event, ts: new Date().toISOString(), date };
    const eventsKey = `analytics:events:${date}`;

    const existing = await redis.get(eventsKey) || [];
    existing.push(entry);
    await redis.set(eventsKey, existing, { ex: TTL_SECONDS });

    await updateSummary(redis, date, event);
  } catch (err) {
    console.error('[ANALYTICS] Track failed:', err.message);
  }
}

async function updateSummary(redis, date, event) {
  const key = `analytics:summary:${date}`;
  const s = await redis.get(key) || {
    date,
    totalRequests: 0,
    uniqueUsers: [],
    endpoints: {},
    features: {},
    models: {},
    chatCapabilities: {},
    errors: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    estimatedCostUSD: 0,
    statusCodes: {},
    avgResponseTimeMs: 0,
    _responseTimes: [],
  };

  s.totalRequests++;

  if (event.userEmail && !s.uniqueUsers.includes(event.userEmail)) {
    s.uniqueUsers.push(event.userEmail);
  }

  const ep = event.endpoint || 'unknown';
  s.endpoints[ep] = (s.endpoints[ep] || 0) + 1;

  if (event.feature) {
    s.features[event.feature] = (s.features[event.feature] || 0) + 1;
  }

  if (event.model) {
    if (!s.models[event.model]) {
      s.models[event.model] = { calls: 0, inputTokens: 0, outputTokens: 0, costUSD: 0 };
    }
    s.models[event.model].calls++;
    s.models[event.model].inputTokens += (event.inputTokens || 0);
    s.models[event.model].outputTokens += (event.outputTokens || 0);
    if (event.costUSD) s.models[event.model].costUSD += event.costUSD;
  }

  if (event.capability) {
    s.chatCapabilities[event.capability] = (s.chatCapabilities[event.capability] || 0) + 1;
  }

  if (event.statusCode) {
    const sc = String(event.statusCode);
    s.statusCodes[sc] = (s.statusCodes[sc] || 0) + 1;
  }

  if (event.inputTokens) s.totalInputTokens += event.inputTokens;
  if (event.outputTokens) s.totalOutputTokens += event.outputTokens;
  if (event.costUSD) s.estimatedCostUSD += event.costUSD;
  if (event.error) s.errors++;

  if (event.responseTimeMs) {
    s._responseTimes.push(event.responseTimeMs);
    if (s._responseTimes.length > 500) s._responseTimes = s._responseTimes.slice(-500);
    s.avgResponseTimeMs = Math.round(s._responseTimes.reduce((a, b) => a + b, 0) / s._responseTimes.length);
  }

  await redis.set(key, s, { ex: TTL_SECONDS });
}

// ─── Convenience Trackers ───

export async function trackChatMessage({ userEmail, userRole, message, model, inputTokens, outputTokens, isLiteMode, capability, action, responseTimeMs }) {
  const cost = estimateCost(model, inputTokens || 0, outputTokens || 0);
  await trackEvent({
    type: 'chat_message',
    endpoint: '/api/chat',
    feature: 'chatbot',
    userEmail, userRole,
    messageLength: message?.length || 0,
    model,
    inputTokens: inputTokens || 0,
    outputTokens: outputTokens || 0,
    costUSD: cost.totalCost,
    isLiteMode,
    capability: capability || 'general',
    action: action || null,
    responseTimeMs,
  });
}

export async function trackAIPrioritization({ userEmail, model, inputTokens, outputTokens, taskCount, responseTimeMs }) {
  const cost = estimateCost(model, inputTokens || 0, outputTokens || 0);
  await trackEvent({
    type: 'ai_prioritization',
    endpoint: '/api/ai/prioritize',
    feature: 'prioritization',
    userEmail, model,
    inputTokens: inputTokens || 0,
    outputTokens: outputTokens || 0,
    costUSD: cost.totalCost,
    taskCount,
    responseTimeMs,
  });
}

export async function trackAuth({ userEmail, action, success, method, userRole }) {
  await trackEvent({
    type: 'auth',
    endpoint: '/api/auth/session',
    feature: 'auth',
    userEmail, action, success, method, userRole,
  });
}

export async function trackICalRefresh({ userEmail, isManual, courseCount, assignmentCount, responseTimeMs }) {
  await trackEvent({
    type: 'ical_refresh',
    endpoint: '/api/feeds/ical',
    feature: 'ical_sync',
    userEmail, isManual, courseCount, assignmentCount, responseTimeMs,
  });
}

export async function trackFeatureUsage({ userEmail, feature, metadata }) {
  await trackEvent({ type: 'feature_usage', feature, userEmail, ...(metadata || {}) });
}

export async function trackError({ endpoint, userEmail, errorType, errorMessage, statusCode }) {
  await trackEvent({
    type: 'error', endpoint, userEmail, errorType, errorMessage, statusCode, error: true,
  });
}

export async function trackAPIRequest({ endpoint, method, userEmail, userRole, statusCode, responseTimeMs, error }) {
  await trackEvent({
    type: 'api_request', endpoint, method, userEmail, userRole, statusCode, responseTimeMs, error: error || null,
  });
}

// ─── Data Retrieval ───

export async function getAnalyticsSummary(dateFrom, dateTo) {
  const redis = await getRedis();
  if (!redis) return [];

  const summaries = [];
  const start = new Date(dateFrom);
  const end = new Date(dateTo);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const summary = await redis.get(`analytics:summary:${dateStr}`);
    if (summary) {
      summaries.push({
        ...summary,
        uniqueUserCount: summary.uniqueUsers?.length || 0,
        uniqueUsers: undefined,
        _responseTimes: undefined,
      });
    }
  }
  return summaries;
}

export async function getAnalyticsEvents(date, { type, feature, limit = 500 } = {}) {
  const redis = await getRedis();
  if (!redis) return [];

  const events = await redis.get(`analytics:events:${date}`) || [];
  let filtered = events;
  if (type) filtered = filtered.filter(e => e.type === type);
  if (feature) filtered = filtered.filter(e => e.feature === feature);
  return filtered.slice(-limit);
}

export async function getAnalyticsExport(dateFrom, dateTo) {
  const redis = await getRedis();
  if (!redis) return { summaries: [], events: [], aggregate: {} };

  const summaries = await getAnalyticsSummary(dateFrom, dateTo);

  const allEvents = [];
  const start = new Date(dateFrom);
  const end = new Date(dateTo);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const events = await redis.get(`analytics:events:${dateStr}`) || [];
    allEvents.push(...events);
  }

  // Aggregate stats optimized for Claude analysis
  const aggregate = {
    dateRange: { from: dateFrom, to: dateTo },
    totalDays: summaries.length,
    totalRequests: summaries.reduce((s, d) => s + d.totalRequests, 0),
    totalUniqueUsers: [...new Set(allEvents.filter(e => e.userEmail).map(e => e.userEmail))].length,
    totalInputTokens: summaries.reduce((s, d) => s + (d.totalInputTokens || 0), 0),
    totalOutputTokens: summaries.reduce((s, d) => s + (d.totalOutputTokens || 0), 0),
    totalEstimatedCostUSD: Math.round(summaries.reduce((s, d) => s + (d.estimatedCostUSD || 0), 0) * 10000) / 10000,
    totalErrors: summaries.reduce((s, d) => s + (d.errors || 0), 0),
    endpointBreakdown: {},
    featureBreakdown: {},
    modelBreakdown: {},
    chatCapabilities: {},
    hourlyDistribution: new Array(24).fill(0),
    peakHour: null,
    avgResponseTimeMs: null,
    costPerUser: null,
    costPerRequest: null,
    topFeatures: [],
  };

  const responseTimes = [];
  for (const event of allEvents) {
    if (event.endpoint) aggregate.endpointBreakdown[event.endpoint] = (aggregate.endpointBreakdown[event.endpoint] || 0) + 1;
    if (event.feature) aggregate.featureBreakdown[event.feature] = (aggregate.featureBreakdown[event.feature] || 0) + 1;
    if (event.type === 'chat_message' && event.capability) {
      aggregate.chatCapabilities[event.capability] = (aggregate.chatCapabilities[event.capability] || 0) + 1;
    }
    if (event.model) {
      if (!aggregate.modelBreakdown[event.model]) {
        aggregate.modelBreakdown[event.model] = { calls: 0, inputTokens: 0, outputTokens: 0, costUSD: 0 };
      }
      aggregate.modelBreakdown[event.model].calls++;
      aggregate.modelBreakdown[event.model].inputTokens += (event.inputTokens || 0);
      aggregate.modelBreakdown[event.model].outputTokens += (event.outputTokens || 0);
      aggregate.modelBreakdown[event.model].costUSD += (event.costUSD || 0);
    }
    if (event.ts) {
      const hour = new Date(event.ts).getHours();
      aggregate.hourlyDistribution[hour]++;
    }
    if (event.responseTimeMs) responseTimes.push(event.responseTimeMs);
  }

  const maxH = Math.max(...aggregate.hourlyDistribution);
  aggregate.peakHour = maxH > 0 ? aggregate.hourlyDistribution.indexOf(maxH) : null;
  if (responseTimes.length > 0) {
    aggregate.avgResponseTimeMs = Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length);
  }
  if (aggregate.totalUniqueUsers > 0) {
    aggregate.costPerUser = Math.round((aggregate.totalEstimatedCostUSD / aggregate.totalUniqueUsers) * 10000) / 10000;
  }
  if (aggregate.totalRequests > 0) {
    aggregate.costPerRequest = Math.round((aggregate.totalEstimatedCostUSD / aggregate.totalRequests) * 100000) / 100000;
  }
  aggregate.topFeatures = Object.entries(aggregate.featureBreakdown).sort((a, b) => b[1] - a[1]).map(([f, c]) => ({ feature: f, count: c }));

  // Round model costs
  for (const m of Object.values(aggregate.modelBreakdown)) {
    m.costUSD = Math.round(m.costUSD * 10000) / 10000;
  }

  return {
    aggregate,
    dailySummaries: summaries,
    events: allEvents,
    exportedAt: new Date().toISOString(),
    format: 'claude-analysis-v1',
  };
}

// ─── Legacy stubs (for existing dashboard imports) ───

export function initSession() {}
export function trackPageView(page) { trackFeatureUsage({ feature: `page:${page}` }); }
export function trackCalendarView(v) { trackFeatureUsage({ feature: `calendar_${v}` }); }
export function trackNotificationAction(a, t) { trackFeatureUsage({ feature: 'notification', metadata: { action: a, type: t } }); }
export function trackItemAction(a, t) { trackFeatureUsage({ feature: 'item_action', metadata: { action: a, type: t } }); }
export function trackThemeToggle(t) { trackFeatureUsage({ feature: 'theme_toggle', metadata: { theme: t } }); }
export function trackFocusMode(e) { trackFeatureUsage({ feature: 'focus_mode', metadata: { enabled: e } }); }
export function trackExport(f) { trackFeatureUsage({ feature: 'export', metadata: { format: f } }); }
export function trackManualEvent(t) { trackFeatureUsage({ feature: 'manual_event', metadata: { type: t } }); }
export function trackSidebarToggle(c) { trackFeatureUsage({ feature: 'sidebar', metadata: { collapsed: c } }); }
export function getSessionSummary() { return {}; }
export function reportSession() {}
