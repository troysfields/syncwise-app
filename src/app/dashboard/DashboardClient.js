

import { useState, useEffect } from 'react';
import { reportError, showToast } from '../components/ToastNotifications';
import { Sidebar } from '../components/Sidebar';
import { ThemeToggle } from '../components/ThemeProvider';
import { NotificationCenter } from '../components/NotificationCenter';
import { ManualEventModal } from '../components/ManualEventModal';
import { scheduleNotifications, cancelItemNotifications, getUnreadCount } from '../../lib/notifications';
import { trackPageView, trackFeatureUsage, trackCalendarView, trackFocusMode, trackExport, trackManualEvent, initSession } from '../../lib/analytics';

// ============================================================
// COURSE COLORS — dynamically assigned when using live data
// ============================================================

const DEFAULT_COURSE_COLORS = {
  'ENTR 450': '#5D0022',
  'ACCT 301': '#059669',
  'ENTR 343': '#D97706',
  'BUS 201': '#DC2626',
  'CSCI 110': '#7C3AED',
  'MANG 471': '#0891B2',
  'MANG 491': '#6D28D9',
  'MANG 499': '#BE185D',
  'ENGR 353': '#EA580C',
};

const DEMO_TASKS = [
  { id: 'd2l-asgn-1', type: 'assignment', name: 'Section IV-A Market Analysis', courseName: 'ENTR 450', courseColor: '#5D0022', dueDate: '2026-03-11T23:59:00', points: 50, source: 'd2l', hasDueDate: true, submitted: false, graded: false, grade: null, unread: false, isRecurring: false, status: 'active', manualDate: null },
  { id: 'd2l-quiz-1', type: 'quiz', name: 'Chapter 8 Quiz', courseName: 'ACCT 301', courseColor: '#059669', dueDate: '2026-03-11T17:00:00', points: 10, source: 'd2l', hasDueDate: true, submitted: false, graded: false, grade: null, unread: false, isRecurring: false, status: 'active', manualDate: null },
  { id: 'd2l-asgn-2', type: 'assignment', name: 'Idea Journal #3', courseName: 'ENTR 343', courseColor: '#D97706', dueDate: '2026-03-13T23:59:00', points: 25, source: 'd2l', hasDueDate: true, submitted: false, graded: false, grade: null, unread: false, isRecurring: false, status: 'active', manualDate: null },
  { id: 'd2l-asgn-3', type: 'assignment', name: 'Case Study Write-up', courseName: 'BUS 201', courseColor: '#DC2626', dueDate: '2026-03-14T23:59:00', points: 40, source: 'd2l', hasDueDate: true, submitted: true, graded: false, grade: null, unread: false, isRecurring: false, status: 'active', manualDate: null },
  { id: 'd2l-disc-1', type: 'discussion', name: 'Discussion 5 — Market Entry Strategies', courseName: 'ENTR 450', courseColor: '#5D0022', dueDate: '2026-03-12T23:59:00', points: 15, source: 'd2l', hasDueDate: true, submitted: false, graded: false, grade: null, unread: true, isRecurring: true, recurringLabel: 'Weekly', status: 'active', manualDate: null },
  { id: 'd2l-quiz-2', type: 'quiz', name: 'Accounting Ethics Quiz', courseName: 'ACCT 301', courseColor: '#059669', dueDate: '2026-03-16T23:59:00', points: 20, source: 'd2l', hasDueDate: true, submitted: false, graded: false, grade: null, unread: false, isRecurring: false, status: 'active', manualDate: null },
  { id: 'd2l-ann-1', type: 'announcement', name: 'Midterm Study Guide Posted', courseName: 'ACCT 301', courseColor: '#059669', dueDate: null, points: null, source: 'd2l', hasDueDate: false, submitted: false, graded: false, grade: null, unread: true, isRecurring: false, status: 'active', manualDate: null },
  { id: 'd2l-ann-2', type: 'announcement', name: 'Guest Speaker Next Week — Bring Questions', courseName: 'ENTR 343', courseColor: '#D97706', dueDate: null, points: null, source: 'd2l', hasDueDate: false, submitted: false, graded: false, grade: null, unread: true, isRecurring: false, status: 'active', manualDate: null },
  { id: 'd2l-check-1', type: 'checklist', name: 'Week 8 Checklist — Read Ch. 9', courseName: 'BUS 201', courseColor: '#DC2626', dueDate: '2026-03-15T23:59:00', points: null, source: 'd2l', hasDueDate: true, submitted: false, graded: false, grade: null, unread: false, isRecurring: false, status: 'active', manualDate: null },
  { id: 'd2l-content-1', type: 'content', name: 'Module 7 — Financial Projections (Lecture Slides)', courseName: 'ENTR 450', courseColor: '#5D0022', dueDate: null, points: null, source: 'd2l', hasDueDate: false, submitted: false, graded: false, grade: null, unread: false, isRecurring: false, status: 'active', manualDate: null },
];

// Demo grade alerts — newly graded items
const DEMO_GRADE_ALERTS = [
  { id: 'grade-1', name: 'Discussion 4 — Competitive Analysis', courseName: 'ENTR 450', courseColor: '#5D0022', grade: { earned: 14, outOf: 15, percentage: 93 }, type: 'discussion' },
  { id: 'grade-2', name: 'Chapter 7 Quiz', courseName: 'ACCT 301', courseColor: '#059669', grade: { earned: 9, outOf: 10, percentage: 90 }, type: 'quiz' },
];

// Demo course progress (completion %)
const DEMO_COURSE_PROGRESS = [
  { courseName: 'ENTR 450', courseColor: '#5D0022', completed: 18, total: 26 },
  { courseName: 'ACCT 301', courseColor: '#059669', completed: 14, total: 22 },
  { courseName: 'ENTR 343', courseColor: '#D97706', completed: 10, total: 18 },
  { courseName: 'BUS 201', courseColor: '#DC2626', completed: 12, total: 20 },
];

const DEMO_EVENTS = [
  { id: 1, name: 'Team Meeting — Marketing Group', start: '2026-03-11T14:00:00', end: '2026-03-11T15:00:00', source: 'outlook' },
  { id: 2, name: 'Office Hours — Prof. Jouflas', start: '2026-03-11T15:30:00', end: '2026-03-11T16:30:00', source: 'outlook' },
  { id: 3, name: 'IT Director Meeting — Mike', start: '2026-03-12T10:00:00', end: '2026-03-12T10:30:00', source: 'outlook' },
  { id: 4, name: 'ENTR 450 Group Presentation Prep', start: '2026-03-13T11:00:00', end: '2026-03-13T12:00:00', source: 'outlook' },
  { id: 5, name: 'Career Fair', start: '2026-03-18T10:00:00', end: '2026-03-18T14:00:00', source: 'outlook' },
  { id: 6, name: 'Study Session — ACCT 301 Midterm', start: '2026-03-15T14:00:00', end: '2026-03-15T16:00:00', source: 'outlook' },
];

const DEMO_SUGGESTIONS = [
  { type: 'action', text: 'Start with ENTR 450 Market Analysis — it\'s worth 50 points and due tonight. The Chapter 8 Quiz is only 10 points, so save that for after.' },
  { type: 'reminder', text: 'You have 5 assignments due this week. Block 2 hours tomorrow morning for ENTR 343 Idea Journal.' },
  { type: 'planning', text: 'Your IT meeting with Mike is tomorrow at 10 AM. Review the Beta API Request doc tonight so you\'re ready.' },
];

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatDate(dateStr) {
  if (!dateStr) return 'No date';
  const d = new Date(dateStr);
  const now = new Date();
  const diffHours = (d - now) / (1000 * 60 * 60);
  if (diffHours < 0) return 'Overdue';
  if (diffHours < 24) return `${Math.round(diffHours)}h left`;
  if (diffHours < 48) return 'Tomorrow';
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function getPriorityLevel(task) {
  if (!task.dueDate && !task.manualDate) return 'low';
  const dateToUse = task.manualDate || task.dueDate;
  const hoursLeft = (new Date(dateToUse) - new Date()) / (1000 * 60 * 60);
  const points = task.points || 10;
  if (hoursLeft <= 12 || (hoursLeft <= 24 && points >= 40)) return 'high';
  if (hoursLeft <= 48) return 'medium';
  return 'low';
}


function getItemTypeIcon(type) {
  const icons = {
    assignment: '\u{1F4DD}',
    quiz: '\u{1F9EA}',
    discussion: '\u{1F4AC}',
    announcement: '\u{1F4E2}',
    content: '\u{1F4D6}',
    checklist: '\u{2705}',
  };
  return icons[type] || '\u{1F4CC}';
}

function getItemTypeBadgeClass(type) {
  return `badge badge-${type}`;
}

function getItemTypeLabel(type) {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

// ============================================================
// CALENDAR VIEW HELPERS
// ============================================================

function getWeekDays(referenceDate) {
  const d = new Date(referenceDate);
  const day = d.getDay();
  const start = new Date(d);
  start.setDate(d.getDate() - day);
  start.setHours(0, 0, 0, 0);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    days.push(date);
  }
  return days;
}

function getMonthDays(referenceDate) {
  const d = new Date(referenceDate);
  const year = d.getFullYear();
  const month = d.getMonth();
  const firstDay = new Date(year, month, 1);
  const startDate = new Date(firstDay);
  startDate.setDate(firstDay.getDate() - firstDay.getDay());
  const days = [];
  const current = new Date(startDate);
  for (let i = 0; i < 42; i++) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
}

function isSameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
}

function getEventsForDay(eventsArray, day) {
  return eventsArray.filter(e => isSameDay(new Date(e.start), day));
}

function getTasksForDay(tasks, day) {
  return tasks.filter(t => {
    const d = t.manualDate || t.dueDate;
    return d && isSameDay(new Date(d), day);
  });
}

// ============================================================
// NEEDS ATTENTION — Smart list of items that need action
// ============================================================

function getNeedsAttention(tasks, gradeAlerts) {
  const now = new Date();
  const items = [];

  // Unsubmitted items due within 48 hours
  for (const t of tasks) {
    if (t.status !== 'active') continue;
    if (t.submitted) continue;
    if (!t.hasDueDate && !t.manualDate) continue;
    const dateToUse = t.manualDate || t.dueDate;
    const hoursLeft = (new Date(dateToUse) - now) / (1000 * 60 * 60);
    if (hoursLeft > 0 && hoursLeft <= 48 && (t.type === 'assignment' || t.type === 'quiz' || t.type === 'discussion')) {
      items.push({ ...t, attentionReason: `Due in ${hoursLeft < 24 ? Math.round(hoursLeft) + 'h' : 'tomorrow'} — not submitted` });
    }
  }

  // Unread announcements
  for (const t of tasks) {
    if (t.status !== 'active' || t.type !== 'announcement' || !t.unread) continue;
    items.push({ ...t, attentionReason: 'New announcement — unread' });
  }

  // Unread discussions
  for (const t of tasks) {
    if (t.status !== 'active' || t.type !== 'discussion' || !t.unread || t.submitted) continue;
    if (!items.find(i => i.id === t.id)) {
      items.push({ ...t, attentionReason: 'New replies — unread' });
    }
  }

  // New grades
  for (const g of gradeAlerts) {
    items.push({ ...g, attentionReason: `New grade: ${g.grade.earned}/${g.grade.outOf} (${g.grade.percentage}%)` });
  }

  return items;
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function StudentDashboard() {
  const [tasks, setTasks] = useState(DEMO_TASKS);
  const [events, setEvents] = useState(DEMO_EVENTS);
  const [suggestions, setSuggestions] = useState(DEMO_SUGGESTIONS);
  const [gradeAlerts, setGradeAlerts] = useState(DEMO_GRADE_ALERTS);
  const [courseProgress, setCourseProgress] = useState(DEMO_COURSE_PROGRESS);
  const [isDemo, setIsDemo] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [itemFilter, setItemFilter] = useState('active'); // 'active', 'completed', 'all-types'
  const [typeFilter, setTypeFilter] = useState('all'); // 'all', 'assignment', 'quiz', etc.
  const [editingDateId, setEditingDateId] = useState(null);
  const [editDateValue, setEditDateValue] = useState('');
  const [dismissedGrades, setDismissedGrades] = useState([]);
  const [dateNotifications, setDateNotifications] = useState([]);
  const [pendingConflicts, setPendingConflicts] = useState(0);

  // Calendar view state
  const [calendarView, setCalendarView] = useState('today');
  const [calendarDate, setCalendarDate] = useState(new Date());

  // New feature state variables
  const [activeSection, setActiveSection] = useState('dashboard');
  const [focusMode, setFocusMode] = useState(false);
  const [showManualEventModal, setShowManualEventModal] = useState(false);
  const [manualEvents, setManualEvents] = useState([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [lastRefreshTime, setLastRefreshTime] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ============================================================
  // LIVE DATA FETCH — Pull from consent-data API if user completed setup
  // Auto-refreshes every 10 minutes in the background
  // ============================================================

  // Handle hash-based navigation from sidebar
  useEffect(() => {
    function scrollToHash() {
      const hash = window.location.hash?.slice(1);
      if (hash) {
        const el = document.getElementById(hash);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }
    // Scroll on initial load if hash present
    scrollToHash();
    // Listen for hash changes (sidebar clicks while already on /dashboard)
    window.addEventListener('hashchange', scrollToHash);
    return () => window.removeEventListener('hashchange', scrollToHash);
  }, []);

  useEffect(() => {
    trackPageView('StudentDashboard');
    initSession();
    const unreadCount = getUnreadCount();
    setUnreadNotificationCount(unreadCount);

    // Load user data — try database first, fall back to localStorage
    async function loadUserData() {
      // 1. Try loading from server (persistent account)
      try {
        const res = await fetch('/api/auth/session');
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user?.icalUrl) {
            // Sync to localStorage as cache
            localStorage.setItem('syncwise_settings', JSON.stringify({
              studentName: data.user.name,
              studentEmail: data.user.email,
              icalUrl: data.user.icalUrl,
              courses: data.user.courses || {},
              setupCompleted: true,
            }));
            fetchLiveData({
              icalUrl: data.user.icalUrl,
              studentEmail: data.user.email,
              studentName: data.user.name,
            });
            return;
          }
        }
      } catch { /* server not available — try localStorage */ }

      // 2. Fall back to localStorage
      let settings = null;
      try {
        const raw = localStorage.getItem('syncwise_settings');
        if (raw) settings = JSON.parse(raw);
      } catch (e) { /* ignore parse errors */ }

      if (settings && settings.icalUrl) {
        fetchLiveData(settings);
      } else {
        setIsDemo(true);
        setIsLoading(false);
      }
    }

    loadUserData();

    // Auto-refresh every 10 minutes
    const refreshInterval = setInterval(() => {
      let settings = null;
      try {
        const raw = localStorage.getItem('syncwise_settings');
        if (raw) settings = JSON.parse(raw);
      } catch {}
      if (settings?.icalUrl) {
        console.log('[REFRESH] Auto-refreshing calendar data...');
        fetchLiveData(settings);
      }
    }, 10 * 60 * 1000);

    return () => clearInterval(refreshInterval);
  }, []);

  async function fetchLiveData(settings, isManualRefresh = false) {
    if (isManualRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/dashboard/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          icalUrl: settings.icalUrl,
          studentEmail: settings.studentEmail || 'anonymous',
        }),
      });

      if (!res.ok) throw new Error(`Dashboard API returned ${res.status}`);

      const data = await res.json();

      if (data.events && data.events.length > 0) {
        // Convert consent-data events to dashboard format
        const liveTasks = data.events.map(evt => ({
          id: evt.id || `ical-${Math.random().toString(36).slice(2)}`,
          type: evt.type || 'assignment',
          name: evt.name || evt.summary || 'Untitled',
          courseName: evt.courseName || 'Unknown Course',
          courseColor: (data.courses && data.courses[evt.courseName]?.color) || DEFAULT_COURSE_COLORS[evt.courseName] || '#6B7280',
          dueDate: evt.dueDate || evt.end || evt.start || null,
          points: evt.points || null,
          source: evt.source || 'ical',
          hasDueDate: !!(evt.dueDate || evt.end),
          submitted: evt.submitted || false,
          graded: evt.graded || false,
          grade: evt.grade || null,
          unread: evt.unread || false,
          isRecurring: evt.isRecurring || false,
          recurringLabel: evt.recurringLabel || null,
          status: evt.status || 'active',
          manualDate: evt.manualDate || null,
          pendingReview: evt.pendingReview || false,
          hasConflict: evt.hasConflict || false,
          description: evt.description || '',
        }));

        setTasks(liveTasks);
        setIsDemo(false);

        // Cache tasks for chatbot workload checks
        try {
          localStorage.setItem('syncwise_dashboard_data', JSON.stringify({
            tasks: liveTasks.slice(0, 30).map(t => ({
              title: t.name, course: t.courseName, dueDate: t.dueDate, points: t.points,
            })),
            updatedAt: new Date().toISOString(),
          }));
        } catch { /* ignore storage errors */ }

        // Set course progress from stats
        if (data.courses) {
          const progress = Object.entries(data.courses).map(([name, info]) => ({
            courseName: name,
            courseColor: info.color || DEFAULT_COURSE_COLORS[name] || '#6B7280',
            completed: info.completed || 0,
            total: info.total || 0,
          }));
          setCourseProgress(progress);
        }

        // Set AI suggestions if available
        if (data.suggestions && data.suggestions.length > 0) {
          setSuggestions(data.suggestions);
        }

        // Set date change notifications if available
        if (data.conflictNotifications) {
          setDateNotifications(data.conflictNotifications);
        }

        // Track pending conflicts
        if (data.stats?.pendingConflicts) {
          setPendingConflicts(data.stats.pendingConflicts);
        }

        // No grades in iCal-only mode
        setGradeAlerts([]);
        setEvents([]);
      } else {
        // API returned but no events
        setIsDemo(true);
      }
    } catch (err) {
      console.error('Failed to fetch live data:', err);
      setLoadError(err.message);
      setIsDemo(true); // Fall back to demo data
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setLastRefreshTime(new Date());
    }
  }

  // Refresh data function (called after manual actions or refresh button)
  async function refreshData() {
    let settings = null;
    try {
      const raw = localStorage.getItem('syncwise_settings');
      if (raw) settings = JSON.parse(raw);
    } catch (e) { /* ignore */ }
    if (settings && settings.icalUrl) {
      await fetchLiveData(settings, true);
    }
  }

  // ============================================================
  // EXPORT WEEK FUNCTION
  // ============================================================

  function generateWeekExport() {
    const weekDays = getWeekDays(new Date());
    const startDate = weekDays[0];
    const endDate = weekDays[6];

    let text = `CMU AI CALENDAR — WEEKLY SUMMARY\n`;
    text += `${startDate.toLocaleDateString([], { month: 'short', day: 'numeric' })} – ${endDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}\n`;
    text += `\n${'='.repeat(50)}\n\n`;

    // This week's tasks
    text += `UPCOMING ASSIGNMENTS & DEADLINES:\n`;
    const weekTasks = visibleTasks.filter(t => {
      const d = t.manualDate || t.dueDate;
      if (!d) return false;
      const taskDate = new Date(d);
      return taskDate >= startDate && taskDate <= endDate;
    }).sort((a, b) => new Date(a.manualDate || a.dueDate) - new Date(b.manualDate || b.dueDate));

    if (weekTasks.length === 0) {
      text += `  • No assignments this week\n`;
    } else {
      weekTasks.forEach(t => {
        const dateStr = new Date(t.manualDate || t.dueDate).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
        text += `  • [${dateStr}] ${t.name} (${t.courseName}) — ${t.points || 0} pts\n`;
      });
    }

    // This week's events
    text += `\nCALENDAR EVENTS:\n`;
    const weekEvents = allEvents.filter(e => {
      const eventDate = new Date(e.start);
      return eventDate >= startDate && eventDate <= endDate;
    }).sort((a, b) => new Date(a.start) - new Date(b.start));

    if (weekEvents.length === 0) {
      text += `  • No events scheduled\n`;
    } else {
      weekEvents.forEach(e => {
        const dateStr = new Date(e.start).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
        const timeStr = formatTime(e.start);
        text += `  • [${dateStr} ${timeStr}] ${e.name}\n`;
      });
    }

    // Summary stats
    text += `\n${'='.repeat(50)}\n`;
    text += `STATS:\n`;
    text += `  • Total assignments: ${weekTasks.length}\n`;
    text += `  • Total points: ${weekTasks.reduce((sum, t) => sum + (t.points || 0), 0)}\n`;
    text += `  • Scheduled events: ${weekEvents.length}\n`;

    return text;
  }

  function handleExportWeek() {
    const weekExport = generateWeekExport();
    navigator.clipboard.writeText(weekExport).then(() => {
      showToast({ type: 'success', message: 'Week summary copied to clipboard', duration: 3000 });
      trackExport('week');
    }).catch(() => {
      showToast({ type: 'error', message: 'Failed to copy to clipboard', duration: 3000 });
    });
  }

  function handleAddManualEvent(eventData) {
    const newEvent = {
      id: 'manual-' + Date.now(),
      ...eventData,
      source: 'manual',
    };
    setManualEvents(prev => [...prev, newEvent]);
    setShowManualEventModal(false);
    showToast({ type: 'success', message: 'Event added to calendar', duration: 3000 });
    trackManualEvent('event_created');
  }

  // ============================================================
  // COMPUTED VALUES
  // ============================================================

  // Merge manual events with demo events
  const allEvents = [...events, ...manualEvents];

  // Active tasks (visible on calendar and assignment list)
  const visibleTasks = tasks.filter(t => {
    if (t.status === 'hidden' || t.status === 'completed' || t.status === 'denied') return false;
    return true;
  });

  // Items needing date confirmation (no due date, not yet confirmed or denied)
  const needsConfirmation = tasks.filter(t =>
    t.status === 'active' && !t.hasDueDate && !t.confirmedNoDate && !t.manualDate
  );

  // Needs attention list
  const attentionItems = getNeedsAttention(visibleTasks, gradeAlerts.filter(g => !dismissedGrades.includes(g.id)));

  // Focus mode filtering
  const today = new Date();
  const todayTodayTasks = visibleTasks.filter(t => {
    const d = t.manualDate || t.dueDate;
    return d && isSameDay(new Date(d), today);
  });
  const focusModeAttentionItems = focusMode ? attentionItems : null;
  const focusModeTasks = focusMode ? todayTodayTasks : null;

  // Filter assignment list
  const filteredTasks = visibleTasks.filter(t => {
    if (itemFilter === 'completed') return t.submitted || t.status === 'completed';
    if (itemFilter === 'active') return t.status === 'active' && !t.submitted;
    return true;
  }).filter(t => {
    if (typeFilter === 'all') return true;
    return t.type === typeFilter;
  });

  // Sort tasks by priority
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return (priorityOrder[getPriorityLevel(a)] - priorityOrder[getPriorityLevel(b)]) ||
      (new Date(a.manualDate || a.dueDate || '2099-01-01') - new Date(b.manualDate || b.dueDate || '2099-01-01'));
  });

  // Unique item types for filter
  const uniqueTypes = [...new Set(tasks.map(t => t.type))];

  // ============================================================
  // HANDLERS — Item actions
  // ============================================================

  function handleMarkComplete(taskId) {
    const task = tasks.find(t => t.id === taskId);
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, status: 'completed', submitted: true } : t
    ));
    if (!isDemo && task) {
      cancelItemNotifications(taskId);
    }
    showToast({ type: 'success', message: 'Marked as completed', duration: 3000 });
    trackFeatureUsage('mark_complete');
  }

  function handleRemoveItem(taskId) {
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, status: 'hidden' } : t
    ));
    showToast({ type: 'info', message: 'Item hidden from calendar', duration: 3000 });
  }

  function handleSetDate(taskId) {
    if (!editDateValue) return;
    const task = tasks.find(t => t.id === taskId);
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, manualDate: editDateValue, confirmedNoDate: true } : t
    ));
    setEditingDateId(null);
    setEditDateValue('');
    if (!isDemo && task) {
      scheduleNotifications(taskId, editDateValue);
    }
    showToast({ type: 'success', message: 'Date updated', duration: 3000 });
    trackFeatureUsage('set_manual_date');
  }

  function handleConfirmNoDate(taskId) {
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, confirmedNoDate: true, status: 'active' } : t
    ));
  }

  function handleDenyNoDate(taskId) {
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, status: 'denied' } : t
    ));
  }

  function handleDismissGrade(gradeId) {
    setDismissedGrades(prev => [...prev, gradeId]);
  }

  // Calendar navigation
  function navigateCalendar(direction) {
    const d = new Date(calendarDate);
    if (calendarView === 'week') d.setDate(d.getDate() + (direction * 7));
    else if (calendarView === 'month') d.setMonth(d.getMonth() + direction);
    else d.setDate(d.getDate() + direction);
    setCalendarDate(d);
    trackCalendarView(calendarView);
  }

  function goToToday() { setCalendarDate(new Date()); }

  // Calendar data
  const todayDate = calendarView === 'today' ? calendarDate : new Date();
  const todayEvents = allEvents.filter(e => isSameDay(new Date(e.start), todayDate));
  const todayTasksForCalendar = visibleTasks.filter(t => {
    const d = t.manualDate || t.dueDate;
    return d && isSameDay(new Date(d), todayDate);
  });

  function getCalendarLabel() {
    if (calendarView === 'today') {
      const isActualToday = isSameDay(calendarDate, new Date());
      const label = calendarDate.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
      return isActualToday ? `Today — ${label}` : label;
    }
    if (calendarView === 'week') {
      const weekDays = getWeekDays(calendarDate);
      const start = weekDays[0];
      const end = weekDays[6];
      if (start.getMonth() === end.getMonth()) {
        return `${start.toLocaleDateString([], { month: 'long' })} ${start.getDate()} – ${end.getDate()}, ${start.getFullYear()}`;
      }
      return `${start.toLocaleDateString([], { month: 'short' })} ${start.getDate()} – ${end.toLocaleDateString([], { month: 'short' })} ${end.getDate()}`;
    }
    return calendarDate.toLocaleDateString([], { month: 'long', year: 'numeric' });
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="layout-with-sidebar">
      {/* Sidebar */}
      <Sidebar
        role="student"
        activeSection={activeSection}
        onNavigate={setActiveSection}
        unreadCount={unreadNotificationCount}
        focusMode={focusMode}
        onFocusToggle={() => {
          setFocusMode(!focusMode);
          trackFocusMode(focusMode ? 'disabled' : 'enabled');
          // Scroll to focus content area
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      <main className="main-content">
        {/* Top Nav */}
        <nav className="topnav">
          <a className="topnav-logo" href="/dashboard">
            <span className="topnav-logo-icon">C</span>
            CMU AI Calendar
          </a>
          <div className="topnav-user">
            <ThemeToggle />
            <NotificationCenter />
            {!isDemo && (
              <button
                onClick={refreshData}
                disabled={isRefreshing}
                title={lastRefreshTime ? `Last refreshed: ${lastRefreshTime.toLocaleTimeString()}` : 'Refresh calendar data'}
                style={{
                  background: 'none',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  cursor: isRefreshing ? 'wait' : 'pointer',
                  fontSize: '13px',
                  color: '#64748B',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ display: 'inline-block', animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }}>↻</span>
                {isRefreshing ? 'Refreshing...' : lastRefreshTime ? lastRefreshTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Refresh'}
              </button>
            )}
            {isDemo && <span className="badge badge-medium">Demo Mode</span>}
            {!isDemo && pendingConflicts > 0 && (
              <span className="badge badge-high" title={`${pendingConflicts} date conflicts need instructor review`}>
                {pendingConflicts} Conflicts
              </span>
            )}
            <span>{(() => { try { const s = typeof window !== 'undefined' && localStorage.getItem('syncwise_settings'); return s ? JSON.parse(s).studentName || 'Student' : 'Student'; } catch(e) { return 'Student'; }})()}</span>
            {(() => { try { const s = typeof window !== 'undefined' && localStorage.getItem('syncwise_settings'); const r = s ? JSON.parse(s).role : null; return r === 'instructor' ? <a href="/instructor" style={{ color: '#64748B', textDecoration: 'none', fontSize: '13px' }}>Instructor View</a> : null; } catch(e) { return null; }})()}
          </div>
        </nav>

        <div className="container" id="dashboard">
          {/* Loading State */}
          {isLoading && (
            <div style={{
              background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '10px',
              padding: '20px', margin: '20px 0 0', fontSize: '14px', color: '#1E40AF',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>Loading your dashboard...</div>
              <div>Fetching assignments from D2L calendar feed</div>
            </div>
          )}

          {/* Error Banner */}
          {loadError && !isLoading && (
            <div style={{
              background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px',
              padding: '12px 20px', margin: '20px 0 0', fontSize: '14px', color: '#991B1B',
            }}>
              <strong>Connection Issue</strong> — Could not load live data: {loadError}. Showing demo data instead.
              <button onClick={refreshData} style={{ marginLeft: '12px', padding: '4px 12px', background: '#DC2626', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>Retry</button>
            </div>
          )}

          {/* Demo Banner */}
          {isDemo && !isLoading && (
            <div style={{
              background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: '10px',
              padding: '12px 20px', margin: '20px 0 0', fontSize: '14px', color: '#92400E',
            }}>
              <strong>Demo Mode</strong> — Showing sample data.{' '}
              <a href="/setup" style={{ color: '#92400E', fontWeight: '600' }}>Complete setup</a> to see your real D2L assignments.
            </div>
          )}

          {/* Live Data Banner */}
          {!isDemo && !isLoading && (
            <div style={{
              background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '10px',
              padding: '12px 20px', margin: '20px 0 0', fontSize: '14px', color: '#065F46',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span>Connected to D2L — showing {tasks.length} items across your courses</span>
              <button onClick={refreshData} style={{ padding: '4px 12px', background: '#059669', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>Refresh</button>
            </div>
          )}

          {/* Date Change Notifications */}
          {dateNotifications.length > 0 && !isLoading && (
            <div style={{
              background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '10px',
              padding: '12px 20px', margin: '12px 0 0', fontSize: '14px', color: '#1E40AF',
            }}>
              <strong>Date Changes ({dateNotifications.length})</strong> — Your instructor updated due dates for some assignments.
            </div>
          )}

          {/* Focus Mode Toggle */}
          <div id="focus" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '20px 0', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={() => {
                  setFocusMode(!focusMode);
                  trackFocusMode(focusMode ? 'disabled' : 'enabled');
                }}
                style={{
                  padding: '8px 16px',
                  background: focusMode ? '#5D0022' : '#E2E8F0',
                  color: focusMode ? '#FFFFFF' : '#1E293B',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '600',
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                className={focusMode ? 'focus-mode-active' : ''}
              >
                {focusMode ? '🎯 Focus Mode ON' : '🎯 Focus Mode'}
              </button>
              {focusMode && (
                <span style={{ fontSize: '12px', color: '#5D0022', fontWeight: '500' }}>
                  Showing today's tasks only
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setShowManualEventModal(true)}
                style={{
                  padding: '8px 16px',
                  background: '#059669',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '600',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                + Add Event
              </button>
              {calendarView === 'week' && (
                <button
                  onClick={handleExportWeek}
                  style={{
                    padding: '8px 16px',
                    background: '#7C3AED',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: '600',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  📋 Export Week
                </button>
              )}
            </div>
          </div>

          {/* Manual Event Modal */}
          {showManualEventModal && (
            <ManualEventModal
              onSave={handleAddManualEvent}
              onCancel={() => setShowManualEventModal(false)}
            />
          )}

          {/* Focus Mode View */}
          {focusMode && (
            <div className="card" style={{ margin: '16px 0 0', borderLeft: '4px solid #5D0022' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>🎯</span> Today's Focus
              </h2>
              {focusModeTasks && focusModeTasks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: '#94A3B8' }}>
                  <p style={{ fontSize: '14px' }}>No tasks due today. Great work!</p>
                </div>
              ) : (
                <>
                  <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#64748B' }}>Due Today</h3>
                  {focusModeTasks && focusModeTasks.map(task => (
                    <div key={task.id} className="task-item" style={{ borderLeft: `3px solid ${task.courseColor}` }}>
                      {task.unread && <span className="unread-dot"></span>}
                      <span style={{ fontSize: '16px', flexShrink: 0 }}>{getItemTypeIcon(task.type)}</span>
                      <div className="task-info">
                        <div className="task-name">{task.name}</div>
                        <div className="task-meta">
                          <span style={{ color: task.courseColor, fontWeight: '600' }}>{task.courseName}</span>
                          {task.points && ` · ${task.points} pts`}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '4px', flexShrink: 0, alignItems: 'center' }}>
                        {task.submitted && <span className="badge badge-submitted">Submitted</span>}
                        {!task.submitted && <span className="badge badge-high">Urgent</span>}
                      </div>
                      <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                        {!task.submitted && (
                          <button className="item-action-btn complete" onClick={() => handleMarkComplete(task.id)}
                            title="Mark as completed">✓</button>
                        )}
                        <button className="item-action-btn remove" onClick={() => handleRemoveItem(task.id)}
                          title="Hide from view">✕</button>
                      </div>
                    </div>
                  ))}
                </>
              )}
              {focusModeAttentionItems && focusModeAttentionItems.length > 0 && (
                <>
                  <h3 style={{ fontSize: '14px', fontWeight: '600', marginTop: '16px', marginBottom: '8px', color: '#EF4444' }}>Needs Attention</h3>
                  {focusModeAttentionItems.map((item, i) => (
                    <div key={item.id + '-focus-' + i} className="task-item needs-attention-item" style={{ borderLeft: `3px solid ${item.courseColor || '#EF4444'}` }}>
                      {item.unread && <span className="unread-dot"></span>}
                      <span style={{ fontSize: '16px', flexShrink: 0 }}>{getItemTypeIcon(item.type)}</span>
                      <div className="task-info">
                        <div className="task-name">{item.name}</div>
                        <div className="task-meta">
                          <span style={{ color: item.courseColor, fontWeight: '600' }}>{item.courseName}</span>
                          {' · '}{item.attentionReason}
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

        {/* ============================================================ */}
        {/* NEEDS ATTENTION SECTION — Hidden in focus mode */}
        {/* ============================================================ */}
        {!focusMode && attentionItems.length > 0 && (
          <div className="card" style={{ margin: '20px 0 0', borderLeft: '4px solid #EF4444' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>&#128680;</span> Needs Attention
              <span style={{ fontSize: '12px', fontWeight: '500', color: '#EF4444', background: '#FEF2F2', padding: '2px 8px', borderRadius: '10px' }}>
                {attentionItems.length}
              </span>
            </h2>
            {attentionItems.map((item, i) => (
              <div key={item.id + '-attn-' + i} className="task-item needs-attention-item" style={{ borderLeft: `3px solid ${item.courseColor || '#EF4444'}` }}>
                {item.unread && <span className="unread-dot"></span>}
                <span style={{ fontSize: '16px', flexShrink: 0 }}>{getItemTypeIcon(item.type)}</span>
                <div className="task-info">
                  <div className="task-name">
                    {item.name}
                    {item.isRecurring && <span className="badge badge-recurring" style={{ marginLeft: '6px' }}>{item.recurringLabel}</span>}
                  </div>
                  <div className="task-meta">
                    <span style={{ color: item.courseColor, fontWeight: '600' }}>{item.courseName}</span>
                    {' · '}{item.attentionReason}
                  </div>
                </div>
                {item.grade && (
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: item.grade.percentage >= 80 ? '#059669' : item.grade.percentage >= 60 ? '#D97706' : '#DC2626' }}>
                      {item.grade.percentage}%
                    </div>
                    <div style={{ fontSize: '11px', color: '#94A3B8' }}>{item.grade.earned}/{item.grade.outOf}</div>
                    <button className="item-action-btn" onClick={() => handleDismissGrade(item.id)} style={{ fontSize: '11px', marginTop: '4px' }}>Dismiss</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ============================================================ */}
        {/* ITEMS WITHOUT DUE DATES — Confirm/Deny */}
        {/* ============================================================ */}
        {needsConfirmation.length > 0 && (
          <div className="card" style={{ margin: '16px 0 0', borderLeft: '4px solid #F59E0B' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>&#128197;</span> Add to Calendar?
              <span style={{ fontSize: '12px', fontWeight: '500', color: '#92400E', background: '#FEF3C7', padding: '2px 8px', borderRadius: '10px' }}>
                {needsConfirmation.length} items without due dates
              </span>
            </h2>
            <p style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '12px' }}>
              These items don&apos;t have a due date in D2L. Add a date to track them, or dismiss.
            </p>
            {needsConfirmation.map(item => (
              <div key={item.id} className="task-item" style={{ borderLeft: `3px solid ${item.courseColor}` }}>
                <span style={{ fontSize: '16px', flexShrink: 0 }}>{getItemTypeIcon(item.type)}</span>
                <div className="task-info">
                  <div className="task-name">{item.name}</div>
                  <div className="task-meta">
                    <span style={{ color: item.courseColor, fontWeight: '600' }}>{item.courseName}</span>
                    {' · '}<span className={getItemTypeBadgeClass(item.type)} style={{ fontSize: '11px', padding: '1px 6px' }}>{getItemTypeLabel(item.type)}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
                  {editingDateId === item.id ? (
                    <>
                      <input
                        type="datetime-local"
                        value={editDateValue}
                        onChange={e => setEditDateValue(e.target.value)}
                        style={{ fontSize: '12px', padding: '4px 8px', border: '1px solid #CBD5E1', borderRadius: '6px' }}
                      />
                      <button className="item-action-btn complete" onClick={() => handleSetDate(item.id)}>Save</button>
                      <button className="item-action-btn" onClick={() => setEditingDateId(null)}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <button className="item-action-btn complete" onClick={() => { setEditingDateId(item.id); setEditDateValue(''); }}>
                        Set Date
                      </button>
                      <button className="item-action-btn" onClick={() => handleConfirmNoDate(item.id)}>
                        Keep (no date)
                      </button>
                      <button className="item-action-btn remove" onClick={() => handleDenyNoDate(item.id)}>
                        Dismiss
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ============================================================ */}
        {/* GRADE ALERTS — Hidden in focus mode */}
        {/* ============================================================ */}
        {!focusMode && gradeAlerts.filter(g => !dismissedGrades.includes(g.id)).length > 0 && (
          <div className="card" style={{ margin: '16px 0 0', borderLeft: '4px solid #059669' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>&#127942;</span> New Grades
            </h2>
            {gradeAlerts.filter(g => !dismissedGrades.includes(g.id)).map(g => (
              <div key={g.id} className="task-item" style={{ borderLeft: `3px solid ${g.courseColor}` }}>
                <span style={{ fontSize: '16px', flexShrink: 0 }}>{getItemTypeIcon(g.type)}</span>
                <div className="task-info">
                  <div className="task-name">{g.name}</div>
                  <div className="task-meta"><span style={{ color: g.courseColor, fontWeight: '600' }}>{g.courseName}</span></div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: g.grade.percentage >= 80 ? '#059669' : g.grade.percentage >= 60 ? '#D97706' : '#DC2626' }}>
                    {g.grade.percentage}%
                  </div>
                  <div style={{ fontSize: '11px', color: '#94A3B8' }}>{g.grade.earned}/{g.grade.outOf} pts</div>
                </div>
                <button className="item-action-btn" onClick={() => handleDismissGrade(g.id)} style={{ flexShrink: 0, fontSize: '11px' }}>
                  Dismiss
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ============================================================ */}
        {/* MAIN SECTIONS — Hidden in focus mode */}
        {/* ============================================================ */}
        {!focusMode && (
        <div className="dash-sections" style={{ marginTop: '4px', padding: '0 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* AI Suggestions + Course Progress */}
          <div className="card">
            <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>&#129302;</span> AI Priority Suggestions
            </h2>
            {suggestions.map((s, i) => (
              <div key={i} className="ai-suggestion">
                <div className="ai-suggestion-label">
                  {s.type === 'action' ? 'Recommended Action' : s.type === 'reminder' ? 'Smart Reminder' : 'Plan Ahead'}
                </div>
                <div className="ai-suggestion-text">{s.text}</div>
              </div>
            ))}

            {/* Course Progress */}
            <div style={{ marginTop: '20px', borderTop: '1px solid #E2E8F0', paddingTop: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '16px' }}>&#128200;</span> Course Progress
              </h3>
              {courseProgress.map(cp => {
                const pct = cp.total > 0 ? Math.round((cp.completed / cp.total) * 100) : 0;
                return (
                  <div key={cp.courseName} className="course-progress" style={{ marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: '600', color: cp.courseColor }}>{cp.courseName}</span>
                      <span style={{ color: '#64748B' }}>{cp.completed}/{cp.total} ({pct}%)</span>
                    </div>
                    <div className="course-progress-bar">
                      <div className="course-progress-fill" style={{ width: `${pct}%`, background: cp.courseColor }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Calendar — Own section for distinct scroll target */}
          <div id="calendar" className="card">
            <div className="calendar-header">
              <h2 style={{ fontSize: '16px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <span style={{ fontSize: '20px' }}>&#128197;</span>
                <span className="calendar-title-label">{getCalendarLabel()}</span>
              </h2>
              <div className="calendar-view-toggle">
                <button className={`cal-view-btn ${calendarView === 'today' ? 'active' : ''}`}
                  onClick={() => { setCalendarView('today'); setCalendarDate(new Date()); }}>Day</button>
                <button className={`cal-view-btn ${calendarView === 'week' ? 'active' : ''}`}
                  onClick={() => setCalendarView('week')}>Week</button>
                <button className={`cal-view-btn ${calendarView === 'month' ? 'active' : ''}`}
                  onClick={() => setCalendarView('month')}>Month</button>
              </div>
            </div>

            <div className="calendar-nav">
              <button className="cal-nav-btn" onClick={() => navigateCalendar(-1)}>&lsaquo;</button>
              <button className="cal-nav-today" onClick={goToToday}>Today</button>
              <button className="cal-nav-btn" onClick={() => navigateCalendar(1)}>&rsaquo;</button>
            </div>

            {/* TODAY VIEW */}
            {calendarView === 'today' && (
              <div>
                {todayEvents.length === 0 && todayTasksForCalendar.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '24px 16px', color: '#94A3B8', fontSize: '14px' }}>
                    No events or assignments for this day.
                  </div>
                )}
                {todayEvents.map(event => (
                  <div key={event.id} className="task-item" style={{ background: '#DBEAFE' }}>
                    <div className="task-dot outlook"></div>
                    <div className="task-info">
                      <div className="task-name">{event.name}</div>
                      <div className="task-meta">{formatTime(event.start)} — {formatTime(event.end)}</div>
                    </div>
                    <span className="badge badge-outlook">{event.source === 'manual' ? 'Added' : 'Outlook'}</span>
                  </div>
                ))}
                {todayTasksForCalendar.map(task => (
                  <div key={task.id} className="task-item" style={{ borderLeft: `3px solid ${task.courseColor}` }}>
                    {task.unread && <span className="unread-dot"></span>}
                    <span style={{ fontSize: '14px', flexShrink: 0 }}>{getItemTypeIcon(task.type)}</span>
                    <div className="task-info">
                      <div className="task-name">{task.name}</div>
                      <div className="task-meta">
                        <span style={{ color: task.courseColor, fontWeight: '600' }}>{task.courseName}</span>
                        {task.dueDate && ` · Due ${formatTime(task.manualDate || task.dueDate)}`}
                        {task.points && ` · ${task.points} pts`}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0, alignItems: 'center' }}>
                      {task.submitted && <span className="badge badge-submitted">Submitted</span>}
                      {task.graded && <span className="badge badge-graded">Graded</span>}
                      {!task.submitted && <span className={`badge badge-${getPriorityLevel(task)}`}>
                        {getPriorityLevel(task) === 'high' ? 'Urgent' : getPriorityLevel(task) === 'medium' ? 'Soon' : 'Upcoming'}
                      </span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* WEEK VIEW */}
            {calendarView === 'week' && (
              <div className="week-view">
                {getWeekDays(calendarDate).map((day, i) => {
                  const dayEvents = getEventsForDay(allEvents, day);
                  const dayTasks = getTasksForDay(visibleTasks, day);
                  const isToday = isSameDay(day, new Date());
                  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                  return (
                    <div key={i} className={`week-day-col ${isToday ? 'today' : ''}`}
                      onClick={() => { setCalendarView('today'); setCalendarDate(day); }}>
                      <div className="week-day-header">
                        <span className="week-day-name">{dayNames[i]}</span>
                        <span className={`week-day-num ${isToday ? 'today-num' : ''}`}>{day.getDate()}</span>
                      </div>
                      <div className="week-day-events">
                        {dayEvents.map(e => (
                          <div key={e.id} className="week-event-chip outlook-chip">
                            {formatTime(e.start)} {e.name.length > 18 ? e.name.slice(0, 18) + '...' : e.name}
                          </div>
                        ))}
                        {dayTasks.map(t => (
                          <div key={t.id} className="week-event-chip" style={{ background: t.courseColor + '22', borderLeft: `3px solid ${t.courseColor}`, color: '#1E293B' }}>
                            {getItemTypeIcon(t.type)} {t.name.length > 16 ? t.name.slice(0, 16) + '...' : t.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* MONTH VIEW */}
            {calendarView === 'month' && (
              <div className="month-view">
                <div className="month-header-row">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <div key={d} className="month-header-cell">{d}</div>
                  ))}
                </div>
                <div className="month-grid">
                  {getMonthDays(calendarDate).map((day, i) => {
                    const isCurrentMonth = day.getMonth() === calendarDate.getMonth();
                    const isToday = isSameDay(day, new Date());
                    const dayEvents = getEventsForDay(allEvents, day);
                    const dayTasks = getTasksForDay(visibleTasks, day);
                    const hasItems = dayEvents.length + dayTasks.length > 0;
                    return (
                      <div key={i}
                        className={`month-day-cell ${isCurrentMonth ? '' : 'other-month'} ${isToday ? 'today-cell' : ''} ${hasItems ? 'has-items' : ''}`}
                        onClick={() => { setCalendarView('today'); setCalendarDate(day); }}>
                        <span className={`month-day-num ${isToday ? 'today-num' : ''}`}>{day.getDate()}</span>
                        {dayEvents.length > 0 && (
                          <div className="month-dot-row">
                            {dayEvents.slice(0, 3).map((e, j) => (
                              <span key={j} className="month-dot outlook-dot"></span>
                            ))}
                          </div>
                        )}
                        {dayTasks.length > 0 && (
                          <div className="month-dot-row">
                            {dayTasks.slice(0, 3).map((t, j) => (
                              <span key={j} className="month-dot" style={{ background: t.courseColor }}></span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="month-legend">
                  <span className="legend-item"><span className="month-dot outlook-dot"></span> Outlook</span>
                  {Object.entries(DEFAULT_COURSE_COLORS).map(([name, color]) => (
                    <span key={name} className="legend-item"><span className="month-dot" style={{ background: color }}></span> {name}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ============================================================ */}
          {/* FULL WIDTH: All Items (Assignment Queue) */}
          {/* ============================================================ */}
          <div id="grades" className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <span style={{ fontSize: '20px' }}>&#128218;</span> All Items
                <span style={{ fontSize: '13px', fontWeight: '500', color: '#64748B' }}>
                  {sortedTasks.length} showing
                </span>
              </h2>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {/* Status filter */}
                <button className={`email-filter-btn ${itemFilter === 'active' ? 'active' : ''}`}
                  onClick={() => setItemFilter('active')}>Active</button>
                <button className={`email-filter-btn ${itemFilter === 'completed' ? 'active' : ''}`}
                  onClick={() => setItemFilter('completed')}>Completed</button>
                <button className={`email-filter-btn ${itemFilter === 'all-types' ? 'active' : ''}`}
                  onClick={() => setItemFilter('all-types')}>All</button>
                <span style={{ borderLeft: '1px solid #E2E8F0', margin: '0 4px' }}></span>
                {/* Type filter */}
                <button className={`email-filter-btn ${typeFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setTypeFilter('all')}>All Types</button>
                {uniqueTypes.map(type => (
                  <button key={type} className={`email-filter-btn ${typeFilter === type ? 'active' : ''}`}
                    onClick={() => setTypeFilter(type)}>
                    {getItemTypeIcon(type)} {getItemTypeLabel(type)}
                  </button>
                ))}
              </div>
            </div>

            {sortedTasks.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px', color: '#94A3B8', fontSize: '14px' }}>
                No items match this filter.
              </div>
            )}

            {sortedTasks.map(task => {
              const priority = getPriorityLevel(task);
              const dateToShow = task.manualDate || task.dueDate;
              return (
                <div key={task.id} className="task-item" style={{ borderLeft: `3px solid ${task.courseColor}` }}>
                  {task.unread && <span className="unread-dot"></span>}
                  <span style={{ fontSize: '16px', flexShrink: 0 }}>{getItemTypeIcon(task.type)}</span>
                  <div className="task-info">
                    <div className="task-name">
                      {task.name}
                      {task.isRecurring && <span className="badge badge-recurring" style={{ marginLeft: '6px' }}>{task.recurringLabel}</span>}
                    </div>
                    <div className="task-meta">
                      <span style={{ color: task.courseColor, fontWeight: '600' }}>{task.courseName}</span>
                      {task.points && ` · ${task.points} pts`}
                      {task.manualDate && ' · ✏️ Custom date'}
                    </div>
                  </div>

                  {/* Badges */}
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
                    <span className={getItemTypeBadgeClass(task.type)} style={{ fontSize: '11px', padding: '2px 7px' }}>
                      {getItemTypeLabel(task.type)}
                    </span>
                    {task.submitted && <span className="badge badge-submitted">Submitted</span>}
                    {task.graded && <span className="badge badge-graded">Graded</span>}
                    {!task.submitted && dateToShow && (
                      <span className={`badge badge-${priority}`}>
                        {priority === 'high' ? 'Urgent' : priority === 'medium' ? 'Soon' : 'Upcoming'}
                      </span>
                    )}
                  </div>

                  {/* Date */}
                  <div className="task-time" style={{ minWidth: '80px', textAlign: 'right' }}>
                    {dateToShow ? formatDate(dateToShow) : 'No date'}
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                    {!task.submitted && (
                      <button className="item-action-btn complete" onClick={() => handleMarkComplete(task.id)}
                        title="Mark as completed">&#10003;</button>
                    )}
                    {editingDateId === task.id ? (
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <input type="datetime-local" value={editDateValue}
                          onChange={e => setEditDateValue(e.target.value)}
                          style={{ fontSize: '11px', padding: '3px 6px', border: '1px solid #CBD5E1', borderRadius: '4px', width: '160px' }}
                        />
                        <button className="item-action-btn complete" onClick={() => handleSetDate(task.id)}>&#10003;</button>
                        <button className="item-action-btn" onClick={() => setEditingDateId(null)}>&#10005;</button>
                      </div>
                    ) : (
                      <button className="item-action-btn" onClick={() => { setEditingDateId(task.id); setEditDateValue(dateToShow || ''); }}
                        title="Change date">&#128197;</button>
                    )}
                    <button className="item-action-btn remove" onClick={() => handleRemoveItem(task.id)}
                      title="Hide from calendar">&#10005;</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        )}
      </div>
      </main>
    </div>
  );
}
