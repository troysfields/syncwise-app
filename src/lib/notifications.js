// ============================================================
// Notification Service Layer
// Handles browser push notifications, in-app bell notifications,
// quiet hours, scheduling, and auto-cancellation
// ============================================================

// Default notification preferences
export const DEFAULT_PREFERENCES = {
  preset: 'balanced', // 'minimal', 'balanced', 'everything', 'custom'
  quietHours: {
    enabled: false,
    start: '23:00',
    end: '07:00',
  },
  // Per item type settings
  itemTypes: {
    assignment: {
      enabled: true,
      method: 'both', // 'push', 'bell', 'both', 'none'
      timing: [24, 2], // hours before due
    },
    quiz: {
      enabled: true,
      method: 'both',
      timing: [24, 2],
    },
    discussion: {
      enabled: true,
      method: 'bell',
      timing: [24],
    },
    announcement: {
      enabled: true,
      method: 'bell',
      timing: [],
    },
    checklist: {
      enabled: true,
      method: 'bell',
      timing: [24],
    },
    content: {
      enabled: false,
      method: 'bell',
      timing: [],
    },
    grade: {
      enabled: true,
      method: 'both',
      timing: [],
    },
    calendar: {
      enabled: true,
      method: 'push',
      timing: [0.5], // 30 min before
    },
  },
  // Per-course overrides (courseId -> partial itemTypes override)
  courseOverrides: {},
};

// Preset configurations
export const NOTIFICATION_PRESETS = {
  minimal: {
    label: 'Minimal',
    description: 'Only critical stuff — grades posted, assignments due today',
    config: {
      itemTypes: {
        assignment: { enabled: true, method: 'push', timing: [2] },
        quiz: { enabled: true, method: 'push', timing: [2] },
        discussion: { enabled: false, method: 'none', timing: [] },
        announcement: { enabled: false, method: 'none', timing: [] },
        checklist: { enabled: false, method: 'none', timing: [] },
        content: { enabled: false, method: 'none', timing: [] },
        grade: { enabled: true, method: 'push', timing: [] },
        calendar: { enabled: true, method: 'push', timing: [0.5] },
      },
    },
  },
  balanced: {
    label: 'Balanced',
    description: 'Most things with reasonable timing — the default',
    config: {
      itemTypes: { ...DEFAULT_PREFERENCES.itemTypes },
    },
  },
  everything: {
    label: 'Everything',
    description: 'Full notifications for all activity',
    config: {
      itemTypes: {
        assignment: { enabled: true, method: 'both', timing: [48, 24, 2] },
        quiz: { enabled: true, method: 'both', timing: [48, 24, 2] },
        discussion: { enabled: true, method: 'both', timing: [24, 2] },
        announcement: { enabled: true, method: 'both', timing: [] },
        checklist: { enabled: true, method: 'both', timing: [24] },
        content: { enabled: true, method: 'bell', timing: [] },
        grade: { enabled: true, method: 'both', timing: [] },
        calendar: { enabled: true, method: 'both', timing: [1, 0.5] },
      },
    },
  },
};

// Instructor-specific defaults
export const INSTRUCTOR_DEFAULT_PREFERENCES = {
  ...DEFAULT_PREFERENCES,
  itemTypes: {
    ...DEFAULT_PREFERENCES.itemTypes,
    submission_rate: {
      enabled: true,
      method: 'both',
      timing: [24],
      threshold: 50, // alert if < 50% submitted with < 24hr left
    },
    grading_needed: {
      enabled: true,
      method: 'bell',
      timing: [],
    },
    student_post: {
      enabled: true,
      method: 'bell',
      timing: [],
    },
  },
};

// ============================================================
// Notification State Manager
// ============================================================

let notificationQueue = [];
let bellNotifications = [];
let notificationIdCounter = 0;
let scheduledTimers = {};
let globalBellUpdate = null;

// Register bell update callback
export function onBellUpdate(callback) {
  globalBellUpdate = callback;
}

// Get all bell notifications
export function getBellNotifications() {
  return [...bellNotifications];
}

// Get unread count
export function getUnreadCount() {
  return bellNotifications.filter(n => !n.read).length;
}

// Mark a notification as read
export function markAsRead(notificationId) {
  bellNotifications = bellNotifications.map(n =>
    n.id === notificationId ? { ...n, read: true } : n
  );
  if (globalBellUpdate) globalBellUpdate(bellNotifications);
}

// Mark all as read
export function markAllAsRead() {
  bellNotifications = bellNotifications.map(n => ({ ...n, read: true }));
  if (globalBellUpdate) globalBellUpdate(bellNotifications);
}

// Clear all notifications
export function clearAllNotifications() {
  bellNotifications = [];
  if (globalBellUpdate) globalBellUpdate(bellNotifications);
}

// ============================================================
// Quiet Hours Check
// ============================================================

export function isQuietHours(preferences) {
  if (!preferences.quietHours?.enabled) return false;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startH, startM] = preferences.quietHours.start.split(':').map(Number);
  const [endH, endM] = preferences.quietHours.end.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  // Handle overnight quiet hours (e.g., 23:00 - 07:00)
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

// ============================================================
// Send Notification
// ============================================================

export function sendNotification({ title, body, type, itemId, courseName, courseColor, preferences }) {
  const id = ++notificationIdCounter;
  const timestamp = new Date().toISOString();

  // Get effective settings (with course overrides)
  const effectiveSettings = getEffectiveSettings(type, courseName, preferences);

  if (!effectiveSettings.enabled || effectiveSettings.method === 'none') return;

  const notification = {
    id,
    title,
    body,
    type,
    itemId,
    courseName,
    courseColor,
    timestamp,
    read: false,
    duringQuietHours: false,
  };

  // Always add to bell
  if (effectiveSettings.method === 'bell' || effectiveSettings.method === 'both') {
    if (isQuietHours(preferences)) {
      notification.duringQuietHours = true;
    }
    bellNotifications.unshift(notification);
    // Keep max 100 notifications
    if (bellNotifications.length > 100) {
      bellNotifications = bellNotifications.slice(0, 100);
    }
    if (globalBellUpdate) globalBellUpdate(bellNotifications);
  }

  // Browser push (skip during quiet hours)
  if ((effectiveSettings.method === 'push' || effectiveSettings.method === 'both') && !isQuietHours(preferences)) {
    sendBrowserPush(title, body, courseColor);
  }
}

// ============================================================
// Browser Push Notifications
// ============================================================

export async function requestPushPermission() {
  if (typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';

  const result = await Notification.requestPermission();
  return result;
}

export function getPushPermission() {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}

function sendBrowserPush(title, body, color) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

  try {
    new Notification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: `syncwise-${Date.now()}`,
      requireInteraction: false,
    });
  } catch (e) {
    console.error('Failed to send push notification:', e);
  }
}

// ============================================================
// Scheduled Notifications
// ============================================================

export function scheduleNotifications(items, preferences) {
  // Clear existing timers
  Object.values(scheduledTimers).forEach(timer => clearTimeout(timer));
  scheduledTimers = {};

  const now = Date.now();

  for (const item of items) {
    if (!item.dueDate || item.status === 'completed') continue;

    const dueTime = new Date(item.dueDate).getTime();
    if (dueTime < now) continue;

    const effectiveSettings = getEffectiveSettings(item.type, item.courseName, preferences);
    if (!effectiveSettings.enabled) continue;

    for (const hoursBeforeDue of (effectiveSettings.timing || [])) {
      const msBeforeDue = hoursBeforeDue * 60 * 60 * 1000;
      const fireTime = dueTime - msBeforeDue;
      const delay = fireTime - now;

      if (delay > 0 && delay < 24 * 60 * 60 * 1000) { // Only schedule within 24hrs
        const timerId = `${item.id}-${hoursBeforeDue}`;
        scheduledTimers[timerId] = setTimeout(() => {
          const timeLabel = hoursBeforeDue >= 1
            ? `${hoursBeforeDue}h remaining`
            : `${Math.round(hoursBeforeDue * 60)}min remaining`;

          sendNotification({
            title: `${item.name} — ${timeLabel}`,
            body: `${item.courseName} · Due ${new Date(item.dueDate).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`,
            type: item.type,
            itemId: item.id,
            courseName: item.courseName,
            courseColor: item.courseColor,
            preferences,
          });
        }, delay);
      }
    }
  }
}

// Cancel notifications for a completed item
export function cancelItemNotifications(itemId) {
  const keysToRemove = Object.keys(scheduledTimers).filter(k => k.startsWith(itemId));
  for (const key of keysToRemove) {
    clearTimeout(scheduledTimers[key]);
    delete scheduledTimers[key];
  }
}

// ============================================================
// Get Effective Settings (with course overrides)
// ============================================================

function getEffectiveSettings(itemType, courseName, preferences) {
  const baseSettings = preferences.itemTypes?.[itemType] || { enabled: false, method: 'none', timing: [] };

  // Check for course-specific override
  if (courseName && preferences.courseOverrides?.[courseName]?.[itemType]) {
    return { ...baseSettings, ...preferences.courseOverrides[courseName][itemType] };
  }

  return baseSettings;
}
