// ============================================================
// Session Analytics Stub
// Anonymous usage tracking framework — no actual tracking until
// CMU IT approves. Just the infrastructure for measurable outcomes.
// ============================================================

// In-memory analytics store (no persistence, resets each session)
let sessionEvents = [];
let pageViews = {};
let featureUsage = {};
let sessionStart = null;

// ============================================================
// Track Events
// ============================================================

export function initSession() {
  sessionStart = Date.now();
  sessionEvents = [];
  pageViews = {};
  featureUsage = {};
  trackEvent('session_start', {});
}

export function trackEvent(eventName, metadata = {}) {
  sessionEvents.push({
    event: eventName,
    timestamp: new Date().toISOString(),
    metadata,
  });
}

export function trackPageView(page) {
  pageViews[page] = (pageViews[page] || 0) + 1;
  trackEvent('page_view', { page });
}

export function trackFeatureUsage(feature) {
  featureUsage[feature] = (featureUsage[feature] || 0) + 1;
  trackEvent('feature_use', { feature });
}

// ============================================================
// Feature-Specific Trackers
// ============================================================

export function trackCalendarView(viewType) {
  trackFeatureUsage(`calendar_${viewType}`);
}

export function trackNotificationAction(action, notificationType) {
  trackEvent('notification_action', { action, type: notificationType });
}

export function trackItemAction(action, itemType) {
  trackEvent('item_action', { action, type: itemType });
}

export function trackThemeToggle(theme) {
  trackEvent('theme_toggle', { theme });
}

export function trackFocusMode(enabled) {
  trackEvent('focus_mode', { enabled });
}

export function trackExport(format) {
  trackEvent('export', { format });
}

export function trackManualEvent(eventType) {
  trackEvent('manual_event_created', { type: eventType });
}

export function trackSidebarToggle(collapsed) {
  trackEvent('sidebar_toggle', { collapsed });
}

// ============================================================
// Get Session Summary (for admin dashboard)
// ============================================================

export function getSessionSummary() {
  const now = Date.now();
  const durationMs = sessionStart ? now - sessionStart : 0;
  const durationMinutes = Math.round(durationMs / 60000);

  return {
    sessionDuration: durationMinutes,
    totalEvents: sessionEvents.length,
    pageViews: { ...pageViews },
    featureUsage: { ...featureUsage },
    events: [...sessionEvents],
    peakFeatures: Object.entries(featureUsage)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([feature, count]) => ({ feature, count })),
  };
}

// ============================================================
// API Route Stub (POST session data when session ends)
// ============================================================

export async function reportSession() {
  const summary = getSessionSummary();

  try {
    await fetch('/api/analytics/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        summary,
        // Anonymous — no user identifiers
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (e) {
    // Analytics should never break the app
    console.debug('Analytics report failed (non-critical):', e.message);
  }
}
