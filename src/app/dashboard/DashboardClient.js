

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
  // Sample courses for demo mode
  'COURSE 101': '#5D0022',
  'COURSE 102': '#DC2626',
  'COURSE 201': '#059669',
  'COURSE 301': '#D97706',
};

const DEMO_TASKS = [
  { id: 'd2l-asgn-1', type: 'assignment', name: '(Sample) Research Paper Draft', courseName: 'COURSE 101', courseColor: '#5D0022', dueDate: '2026-03-11T23:59:00', points: 50, source: 'd2l', hasDueDate: true, submitted: false, graded: false, grade: null, unread: false, isRecurring: false, status: 'active', manualDate: null },
  { id: 'd2l-quiz-1', type: 'quiz', name: '(Sample) Chapter 8 Quiz', courseName: 'COURSE 201', courseColor: '#059669', dueDate: '2026-03-11T17:00:00', points: 10, source: 'd2l', hasDueDate: true, submitted: false, graded: false, grade: null, unread: false, isRecurring: false, status: 'active', manualDate: null },
  { id: 'd2l-asgn-2', type: 'assignment', name: '(Sample) Reflection Journal #3', courseName: 'COURSE 301', courseColor: '#D97706', dueDate: '2026-03-13T23:59:00', points: 25, source: 'd2l', hasDueDate: true, submitted: false, graded: false, grade: null, unread: false, isRecurring: false, status: 'active', manualDate: null },
  { id: 'd2l-asgn-3', type: 'assignment', name: '(Sample) Case Study Write-up', courseName: 'COURSE 102', courseColor: '#DC2626', dueDate: '2026-03-14T23:59:00', points: 40, source: 'd2l', hasDueDate: true, submitted: true, graded: false, grade: null, unread: false, isRecurring: false, status: 'active', manualDate: null },
  { id: 'd2l-disc-1', type: 'discussion', name: '(Sample) Discussion 5 — Topic Response', courseName: 'COURSE 101', courseColor: '#5D0022', dueDate: '2026-03-12T23:59:00', points: 15, source: 'd2l', hasDueDate: true, submitted: false, graded: false, grade: null, unread: true, isRecurring: true, recurringLabel: 'Weekly', status: 'active', manualDate: null },
  { id: 'd2l-quiz-2', type: 'quiz', name: '(Sample) Ethics Quiz', courseName: 'COURSE 201', courseColor: '#059669', dueDate: '2026-03-16T23:59:00', points: 20, source: 'd2l', hasDueDate: true, submitted: false, graded: false, grade: null, unread: false, isRecurring: false, status: 'active', manualDate: null },
  { id: 'd2l-ann-1', type: 'announcement', name: '(Sample) Midterm Study Guide Posted', courseName: 'COURSE 201', courseColor: '#059669', dueDate: null, points: null, source: 'd2l', hasDueDate: false, submitted: false, graded: false, grade: null, unread: true, isRecurring: false, status: 'active', manualDate: null },
  { id: 'd2l-ann-2', type: 'announcement', name: '(Sample) Guest Speaker Next Week', courseName: 'COURSE 301', courseColor: '#D97706', dueDate: null, points: null, source: 'd2l', hasDueDate: false, submitted: false, graded: false, grade: null, unread: true, isRecurring: false, status: 'active', manualDate: null },
  { id: 'd2l-check-1', type: 'checklist', name: '(Sample) Weekly Checklist — Read Ch. 9', courseName: 'COURSE 102', courseColor: '#DC2626', dueDate: '2026-03-15T23:59:00', points: null, source: 'd2l', hasDueDate: true, submitted: false, graded: false, grade: null, unread: false, isRecurring: false, status: 'active', manualDate: null },
  { id: 'd2l-content-1', type: 'content', name: '(Sample) Module 7 — Lecture Slides', courseName: 'COURSE 101', courseColor: '#5D0022', dueDate: null, points: null, source: 'd2l', hasDueDate: false, submitted: false, graded: false, grade: null, unread: false, isRecurring: false, status: 'active', manualDate: null },
];

// Demo grade alerts — newly graded items
const DEMO_GRADE_ALERTS = [
  { id: 'grade-1', name: '(Sample) Discussion 4 Response', courseName: 'COURSE 101', courseColor: '#5D0022', grade: { earned: 14, outOf: 15, percentage: 93 }, type: 'discussion' },
  { id: 'grade-2', name: '(Sample) Chapter 7 Quiz', courseName: 'COURSE 201', courseColor: '#059669', grade: { earned: 9, outOf: 10, percentage: 90 }, type: 'quiz' },
];

// Demo course progress (completion %)
const DEMO_COURSE_PROGRESS = [
  { courseName: 'COURSE 101', courseColor: '#5D0022', completed: 18, total: 26 },
  { courseName: 'COURSE 201', courseColor: '#059669', completed: 14, total: 22 },
  { courseName: 'COURSE 301', courseColor: '#D97706', completed: 10, total: 18 },
  { courseName: 'COURSE 102', courseColor: '#DC2626', completed: 12, total: 20 },
];

const DEMO_EVENTS = [
  { id: 1, name: '(Sample) Group Project Meeting', start: '2026-03-11T14:00:00', end: '2026-03-11T15:00:00', source: 'outlook' },
  { id: 2, name: '(Sample) Office Hours', start: '2026-03-11T15:30:00', end: '2026-03-11T16:30:00', source: 'outlook' },
  { id: 3, name: '(Sample) Advisor Check-in', start: '2026-03-12T10:00:00', end: '2026-03-12T10:30:00', source: 'outlook' },
  { id: 4, name: '(Sample) Presentation Prep', start: '2026-03-13T11:00:00', end: '2026-03-13T12:00:00', source: 'outlook' },
  { id: 5, name: '(Sample) Career Fair', start: '2026-03-18T10:00:00', end: '2026-03-18T14:00:00', source: 'outlook' },
  { id: 6, name: '(Sample) Study Session', start: '2026-03-15T14:00:00', end: '2026-03-15T16:00:00', source: 'outlook' },
];

const DEMO_SUGGESTIONS = [
  { type: 'action', text: 'This is sample data — sign in and connect your D2L calendar to see real suggestions based on your actual assignments.' },
  { type: 'reminder', text: 'Once connected, SyncWise will track your deadlines, suggest priorities, and help you stay on top of your week.' },
  { type: 'planning', text: 'Your calendar events, grade alerts, and course progress will all update automatically once you complete setup.' },
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

// Items that require submission vs. informational-only
function isSubmittableType(type) {
  return ['assignment', 'quiz', 'discussion', 'checklist'].includes(type);
}

// ============================================================
// SMART SUGGESTION ENGINE — generates personalized suggestions from live task data
// ============================================================

function generateSmartSuggestions(tasks) {
  const now = new Date();
  const suggestions = [];

  // Filter to active, submittable tasks with due dates
  const activeTasks = tasks.filter(t =>
    t.status === 'active' && !t.submitted && isSubmittableType(t.type) && (t.manualDate || t.dueDate)
  );

  if (activeTasks.length === 0) {
    suggestions.push({ type: 'action', text: 'You\'re all caught up! No active assignments right now. Use this time to review past material or get ahead on readings.' });
    return suggestions;
  }

  // Sort by urgency (hours until due, weighted by points)
  const sorted = activeTasks.map(t => {
    const due = new Date(t.manualDate || t.dueDate);
    const hoursLeft = (due - now) / (1000 * 60 * 60);
    const points = t.points || 10;
    return { ...t, hoursLeft, points, due };
  }).sort((a, b) => {
    // Overdue first, then by urgency score (time * inverse points)
    if (a.hoursLeft <= 0 && b.hoursLeft > 0) return -1;
    if (b.hoursLeft <= 0 && a.hoursLeft > 0) return 1;
    const scoreA = a.hoursLeft - (a.points / 10);
    const scoreB = b.hoursLeft - (b.points / 10);
    return scoreA - scoreB;
  });

  // 1. Recently overdue items (past 3 days only — older items are likely already submitted)
  const recentOverdue = sorted.filter(t => t.hoursLeft <= 0 && t.hoursLeft > -72);
  if (recentOverdue.length > 0) {
    const top = recentOverdue[0];
    const overduePts = recentOverdue.reduce((sum, t) => sum + t.points, 0);
    if (recentOverdue.length === 1) {
      suggestions.push({
        type: 'action',
        text: `${top.name} (${top.courseName}) is overdue${top.points ? ` — worth ${top.points} pts` : ''}. If you haven't submitted it yet, do it ASAP to minimize any late penalty.`,
      });
    } else {
      suggestions.push({
        type: 'action',
        text: `${recentOverdue.length} item${recentOverdue.length > 1 ? 's' : ''} recently passed ${recentOverdue.length > 1 ? 'their' : 'its'} due date (${overduePts} pts). If you haven't submitted ${top.name} (${top.courseName}) yet, prioritize it first.`,
      });
    }
  }

  // 2. Due today — what to focus on right now
  const dueToday = sorted.filter(t => t.hoursLeft > 0 && t.hoursLeft <= 24);
  if (dueToday.length > 0 && suggestions.length < 3) {
    const highest = dueToday.sort((a, b) => b.points - a.points)[0];
    if (dueToday.length === 1) {
      suggestions.push({
        type: 'action',
        text: `${highest.name} is due today${highest.points ? ` (${highest.points} pts)` : ''} for ${highest.courseName}. ${highest.hoursLeft <= 6 ? 'Wrap it up now — you\'ve got ' + Math.round(highest.hoursLeft) + ' hours.' : 'Plan to finish it this afternoon.'}`,
      });
    } else {
      const totalPts = dueToday.reduce((sum, t) => sum + t.points, 0);
      suggestions.push({
        type: 'action',
        text: `${dueToday.length} items due today (${totalPts} pts total). Start with ${highest.name} (${highest.courseName}, ${highest.points} pts) — it carries the most weight.`,
      });
    }
  }

  // 3. Due tomorrow — plan ahead
  const dueTomorrow = sorted.filter(t => t.hoursLeft > 24 && t.hoursLeft <= 48);
  if (dueTomorrow.length > 0 && suggestions.length < 3) {
    const top = dueTomorrow.sort((a, b) => b.points - a.points)[0];
    suggestions.push({
      type: 'reminder',
      text: `Tomorrow: ${top.name} (${top.courseName}${top.points ? `, ${top.points} pts` : ''})${dueTomorrow.length > 1 ? ` + ${dueTomorrow.length - 1} more` : ''}. Get a head start tonight so you're not rushing.`,
    });
  }

  // 4. Week overview — workload awareness
  const dueThisWeek = sorted.filter(t => t.hoursLeft > 0 && t.hoursLeft <= 168);
  if (dueThisWeek.length > 3 && suggestions.length < 3) {
    const totalPts = dueThisWeek.reduce((sum, t) => sum + t.points, 0);
    const courseNames = [...new Set(dueThisWeek.map(t => t.courseName))];
    suggestions.push({
      type: 'planning',
      text: `Heavy week ahead — ${dueThisWeek.length} items (${totalPts} pts) across ${courseNames.length} course${courseNames.length > 1 ? 's' : ''}: ${courseNames.slice(0, 3).join(', ')}${courseNames.length > 3 ? '...' : ''}. Space these out and don't leave them all for the last day.`,
    });
  }

  // 5. High-value upcoming item
  const highValue = sorted.filter(t => t.hoursLeft > 48 && t.points >= 40);
  if (highValue.length > 0 && suggestions.length < 3) {
    const top = highValue[0];
    const daysLeft = Math.round(top.hoursLeft / 24);
    suggestions.push({
      type: 'planning',
      text: `Big one coming: ${top.name} (${top.courseName}, ${top.points} pts) is due in ${daysLeft} days. Start outlining it now so you're not scrambling later.`,
    });
  }

  // 6. Quiet day encouragement
  if (dueToday.length === 0 && recentOverdue.length === 0 && suggestions.length < 2) {
    const nextUp = sorted.find(t => t.hoursLeft > 0);
    if (nextUp) {
      suggestions.push({
        type: 'action',
        text: `Nothing due today — solid chance to get ahead. Your next deadline is ${nextUp.name} (${nextUp.courseName}) in ${Math.round(nextUp.hoursLeft / 24)} day${Math.round(nextUp.hoursLeft / 24) !== 1 ? 's' : ''}.`,
      });
    }
  }

  return suggestions.slice(0, 3); // Max 3 suggestions
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
// CMU ACADEMIC CALENDAR — auto-imported for @mavs.coloradomesa.edu accounts
// Official Spring 2026 dates from coloradomesa.edu/registrar
// ============================================================

function getCMUAcademicCalendar(year) {
  return [
    { date: `${year}-01-19`, name: 'MLK Jr Day — No Classes', type: 'holiday' },
    { date: `${year}-01-20`, name: 'Semester Begins', type: 'academic' },
    { date: `${year}-02-04`, name: 'Last Day Add/Drop', type: 'deadline' },
    { date: `${year}-03-13`, name: 'First Module Ends', type: 'academic' },
    { date: `${year}-03-16`, name: 'Midterm Break', type: 'holiday' },
    { date: `${year}-03-17`, name: 'Midterm Break', type: 'holiday' },
    { date: `${year}-03-18`, name: 'Midterm Break', type: 'holiday' },
    { date: `${year}-03-19`, name: 'Midterm Break', type: 'holiday' },
    { date: `${year}-03-20`, name: 'Midterm Break', type: 'holiday' },
    { date: `${year}-03-23`, name: 'Second Module Begins', type: 'academic' },
    { date: `${year}-04-06`, name: 'Last Day to Withdraw', type: 'deadline' },
    { date: `${year}-05-11`, name: 'Finals Begin', type: 'academic' },
    { date: `${year}-05-12`, name: 'Finals', type: 'academic' },
    { date: `${year}-05-13`, name: 'Finals', type: 'academic' },
    { date: `${year}-05-14`, name: 'Last Day of Semester', type: 'academic' },
    { date: `${year}-05-16`, name: 'Commencement', type: 'academic' },
  ];
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
  const [calendarView, setCalendarView] = useState('week');
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [courseFilter, setCourseFilter] = useState('all'); // 'all' or specific course name
  const [showAllItems, setShowAllItems] = useState(false); // All Items list collapse

  // New feature state variables
  const [activeSection, setActiveSection] = useState('calendar');
  const [focusMode, setFocusMode] = useState(false);
  const [focusTimeframe, setFocusTimeframe] = useState('today'); // 'today' or 'week'
  const [showManualEventModal, setShowManualEventModal] = useState(false);
  const [manualEvents, setManualEvents] = useState([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [lastRefreshTime, setLastRefreshTime] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [semesterView, setSemesterView] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [academicCalendarEvents, setAcademicCalendarEvents] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null); // clicked calendar item for detail modal
  const [selectedItemType, setSelectedItemType] = useState(null); // 'task' or 'event'
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [detailEditDate, setDetailEditDate] = useState('');
  const [detailEditingDate, setDetailEditingDate] = useState(false);

  // Detect fullscreen mode (wide enough window = "fullscreen")
  useEffect(() => {
    function checkFullscreen() {
      // Consider fullscreen if window width >= 1400px (covers maximized browser windows)
      setIsFullscreen(window.innerWidth >= 1400);
    }
    checkFullscreen();
    window.addEventListener('resize', checkFullscreen);
    return () => window.removeEventListener('resize', checkFullscreen);
  }, []);

  // Turn off semester view if user exits fullscreen
  useEffect(() => {
    if (!isFullscreen && semesterView) setSemesterView(false);
  }, [isFullscreen]);

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

    // Load CMU academic calendar for @mavs.coloradomesa.edu accounts
    function loadAcademicCalendar() {
      let email = '';
      try {
        const raw = localStorage.getItem('syncwise_settings');
        if (raw) email = JSON.parse(raw).studentEmail || '';
      } catch {}
      // Auto-import academic calendar for CMU students
      if (email.endsWith('@mavs.coloradomesa.edu') || email.endsWith('@coloradomesa.edu')) {
        const year = new Date().getFullYear();
        setAcademicCalendarEvents(getCMUAcademicCalendar(year));
      }
    }
    loadAcademicCalendar();

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

        // Calculate course progress from live task data
        // Since D2L iCal doesn't track submissions, we estimate:
        // "completed" = submittable items past their due date (likely done)
        // "total" = all submittable items in the course
        const courseProgressMap = {};
        liveTasks.forEach(t => {
          const course = t.courseName || 'Unknown';
          if (!courseProgressMap[course]) {
            courseProgressMap[course] = { total: 0, completed: 0, color: t.courseColor };
          }
          if (isSubmittableType(t.type)) {
            courseProgressMap[course].total++;
            if (t.submitted || t.status === 'completed' || (t.dueDate && new Date(t.dueDate) < new Date())) {
              courseProgressMap[course].completed++;
            }
          }
        });
        const progress = Object.entries(courseProgressMap).map(([name, info]) => ({
          courseName: name,
          courseColor: info.color || DEFAULT_COURSE_COLORS[name] || '#6B7280',
          completed: info.completed,
          total: info.total,
        }));
        setCourseProgress(progress);

        // Generate smart suggestions from live task data
        const smartSuggestions = generateSmartSuggestions(liveTasks);
        if (smartSuggestions.length > 0) {
          setSuggestions(smartSuggestions);
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
    setManualEvents(prev => [...prev, eventData]);
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
    return d && isSameDay(new Date(d), today) && !t.submitted && t.status !== 'completed';
  });

  // Week tasks — next 7 days (including today), uncompleted only
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);
  weekEnd.setHours(23, 59, 59, 999);
  const weekTasks = visibleTasks.filter(t => {
    const d = t.manualDate || t.dueDate;
    if (!d || t.submitted || t.status === 'completed') return false;
    const taskDate = new Date(d);
    return taskDate >= new Date(today.getFullYear(), today.getMonth(), today.getDate()) && taskDate <= weekEnd;
  });

  // Auto-switch: if no uncompleted tasks due today, show week view
  const effectiveFocusTimeframe = todayTodayTasks.length === 0 ? 'week' : focusTimeframe;
  const focusModeAttentionItems = focusMode ? attentionItems : null;
  const focusModeTasks = focusMode ? (effectiveFocusTimeframe === 'week' ? weekTasks : todayTodayTasks) : null;

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

  // Unique course names for calendar course filter
  const uniqueCourses = [...new Set(tasks.map(t => t.courseName).filter(Boolean))].sort();

  // Apply course filter to calendar data
  const calendarFilteredTasks = courseFilter === 'all'
    ? visibleTasks
    : visibleTasks.filter(t => t.courseName === courseFilter);
  const calendarFilteredEvents = courseFilter === 'all'
    ? allEvents
    : allEvents.filter(e => e.courseName === courseFilter);

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

  function openItemDetail(item, itemType) {
    setSelectedItem(item);
    setSelectedItemType(itemType);
    setShowDeleteConfirm(false);
    setDetailEditingDate(false);
    setDetailEditDate(item.manualDate || item.dueDate || item.start || '');
  }

  function closeItemDetail() {
    setSelectedItem(null);
    setSelectedItemType(null);
    setShowDeleteConfirm(false);
    setDetailEditingDate(false);
  }

  function handleDetailSaveDate() {
    if (!detailEditDate || !selectedItem) return;
    if (selectedItemType === 'task') {
      setTasks(prev => prev.map(t =>
        t.id === selectedItem.id ? { ...t, manualDate: detailEditDate, confirmedNoDate: true } : t
      ));
      setSelectedItem(prev => ({ ...prev, manualDate: detailEditDate }));
      showToast({ type: 'success', message: 'Date updated', duration: 3000 });
    }
    setDetailEditingDate(false);
  }

  function handleDetailDelete() {
    if (!selectedItem) return;
    if (selectedItemType === 'task') {
      setTasks(prev => prev.map(t =>
        t.id === selectedItem.id ? { ...t, status: 'hidden' } : t
      ));
      showToast({ type: 'info', message: 'Removed from calendar', duration: 3000 });
    } else if (selectedItemType === 'event') {
      setManualEvents(prev => prev.filter(e => e.id !== selectedItem.id));
      showToast({ type: 'info', message: 'Event removed', duration: 3000 });
    }
    closeItemDetail();
  }

  function handleDetailMarkComplete() {
    if (!selectedItem || selectedItemType !== 'task') return;
    setTasks(prev => prev.map(t =>
      t.id === selectedItem.id ? { ...t, status: 'completed', submitted: true } : t
    ));
    showToast({ type: 'success', message: 'Marked as completed', duration: 3000 });
    closeItemDetail();
  }

  // Calendar scroll-based navigation
  const calendarScrollRef = typeof window !== 'undefined' ? { current: null } : { current: null };
  const [visibleDateLabel, setVisibleDateLabel] = useState('');

  // Generate multiple weeks of days for horizontal scrolling (4 weeks back, 8 weeks forward)
  function getScrollCalendarDays() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 28); // 4 weeks back
    // Align to Sunday
    startDate.setDate(startDate.getDate() - startDate.getDay());
    const days = [];
    for (let i = 0; i < 84; i++) { // 12 weeks total
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      days.push(d);
    }
    return days;
  }

  const scrollCalendarDays = getScrollCalendarDays();

  // Find today's index for initial scroll position
  const todayScrollIndex = scrollCalendarDays.findIndex(d => isSameDay(d, new Date()));

  // Handle scroll to update the date label
  function handleCalendarScroll(e) {
    const container = e.target;
    const scrollLeft = container.scrollLeft;
    const dayWidth = 140; // matches CSS column width
    const visibleIndex = Math.floor(scrollLeft / dayWidth);
    const day = scrollCalendarDays[Math.min(visibleIndex, scrollCalendarDays.length - 1)];
    if (day) {
      const weekStart = new Date(day);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      let label;
      if (weekStart.getMonth() === weekEnd.getMonth()) {
        label = `${weekStart.toLocaleDateString([], { month: 'long' })} ${weekStart.getDate()} – ${weekEnd.getDate()}, ${weekStart.getFullYear()}`;
      } else {
        label = `${weekStart.toLocaleDateString([], { month: 'short' })} ${weekStart.getDate()} – ${weekEnd.toLocaleDateString([], { month: 'short' })} ${weekEnd.getDate()}`;
      }
      setVisibleDateLabel(label);
    }
  }

  // Scroll to today on mount
  useEffect(() => {
    const scrollContainer = document.getElementById('cal-scroll-container');
    if (scrollContainer && todayScrollIndex >= 0) {
      const dayWidth = 140;
      // Center today in the viewport
      const containerWidth = scrollContainer.clientWidth;
      const scrollTarget = (todayScrollIndex * dayWidth) - (containerWidth / 2) + (dayWidth / 2);
      scrollContainer.scrollLeft = Math.max(0, scrollTarget);
      // Set initial label
      handleCalendarScroll({ target: scrollContainer });
    }
  }, [activeSection]); // re-run when switching to calendar view

  // Generate semester months — returns array of { month, year, label, days[] }
  // Only includes months that haven't fully passed yet
  function getSemesterMonths() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const year = today.getFullYear();
    // Spring semester: March through May (earlier months already done by March)
    const semesterMonths = [
      { month: 2, year, label: 'March' },
      { month: 3, year, label: 'April' },
      { month: 4, year, label: 'May' },
    ];
    // Filter out months that are fully in the past
    const activeMonths = semesterMonths.filter(m => {
      const lastDay = new Date(m.year, m.month + 1, 0); // last day of month
      return lastDay >= today;
    });
    return activeMonths.map(m => {
      const daysInMonth = new Date(m.year, m.month + 1, 0).getDate();
      const days = [];
      for (let d = 1; d <= daysInMonth; d++) {
        days.push(new Date(m.year, m.month, d));
      }
      return { ...m, days };
    });
  }

  function scrollToToday() {
    const scrollContainer = document.getElementById('cal-scroll-container');
    if (scrollContainer && todayScrollIndex >= 0) {
      const dayWidth = 140;
      const containerWidth = scrollContainer.clientWidth;
      const scrollTarget = (todayScrollIndex * dayWidth) - (containerWidth / 2) + (dayWidth / 2);
      scrollContainer.scrollTo({ left: Math.max(0, scrollTarget), behavior: 'smooth' });
    }
  }

  // Calendar data (uses course-filtered versions)
  const todayDate = calendarView === 'today' ? calendarDate : new Date();
  const todayEvents = calendarFilteredEvents.filter(e => isSameDay(new Date(e.start), todayDate));
  const todayTasksForCalendar = calendarFilteredTasks.filter(t => {
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

          {/* Manual Event Modal */}
          <ManualEventModal
            isOpen={showManualEventModal}
            onSave={handleAddManualEvent}
            onClose={() => setShowManualEventModal(false)}
          />

          {/* Focus Mode View */}
          {focusMode && (
            <div className="card" style={{ margin: '16px 0 0', borderLeft: '4px solid #5D0022' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '20px' }}>🎯</span> {effectiveFocusTimeframe === 'week' ? "This Week's Focus" : "Today's Focus"}
                </h2>
                {/* Today / Week toggle — only show if today has tasks (otherwise auto-locked to week) */}
                {todayTodayTasks.length > 0 && (
                  <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-tertiary, #1E293B)', borderRadius: '8px', padding: '2px' }}>
                    <button onClick={() => setFocusTimeframe('today')} style={{
                      padding: '4px 12px', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                      background: effectiveFocusTimeframe === 'today' ? '#5D0022' : 'transparent',
                      color: effectiveFocusTimeframe === 'today' ? '#FFFFFF' : '#94A3B8',
                    }}>Today</button>
                    <button onClick={() => setFocusTimeframe('week')} style={{
                      padding: '4px 12px', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                      background: effectiveFocusTimeframe === 'week' ? '#5D0022' : 'transparent',
                      color: effectiveFocusTimeframe === 'week' ? '#FFFFFF' : '#94A3B8',
                    }}>This Week</button>
                  </div>
                )}
                {todayTodayTasks.length === 0 && (
                  <span style={{ fontSize: '11px', color: '#94A3B8', fontStyle: 'italic' }}>Nothing due today — showing week</span>
                )}
              </div>
              {focusModeTasks && focusModeTasks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: '#94A3B8' }}>
                  <p style={{ fontSize: '14px' }}>No upcoming tasks this week. You're all caught up!</p>
                </div>
              ) : effectiveFocusTimeframe === 'week' ? (
                <>
                  {/* Week view — group tasks by day */}
                  {(() => {
                    const dayGroups = {};
                    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                    (focusModeTasks || []).forEach(task => {
                      const d = new Date(task.manualDate || task.dueDate);
                      const key = d.toISOString().split('T')[0];
                      if (!dayGroups[key]) dayGroups[key] = { date: d, tasks: [] };
                      dayGroups[key].tasks.push(task);
                    });
                    const sortedDays = Object.entries(dayGroups).sort(([a], [b]) => a.localeCompare(b));
                    return sortedDays.map(([dayKey, group]) => {
                      const isToday = isSameDay(group.date, today);
                      const isTomorrow = isSameDay(group.date, new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1));
                      const dayLabel = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : `${dayNames[group.date.getDay()]}, ${group.date.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
                      return (
                        <div key={dayKey} style={{ marginBottom: '12px' }}>
                          <h3 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: isToday ? '#EF4444' : '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {dayLabel}
                            <span style={{ fontSize: '11px', fontWeight: '400', color: '#475569' }}>({group.tasks.length})</span>
                          </h3>
                          {group.tasks.map(task => (
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
                                {isToday && !task.submitted && <span className="badge badge-high">Urgent</span>}
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
                        </div>
                      );
                    });
                  })()}
                </>
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
        {/* NEEDS ATTENTION SECTION — Dashboard view only, hidden in focus mode */}
        {/* ============================================================ */}
        {!focusMode && activeSection === 'dashboard' && attentionItems.length > 0 && (
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
        {/* ITEMS WITHOUT DUE DATES — Dashboard view only */}
        {/* ============================================================ */}
        {activeSection === 'dashboard' && needsConfirmation.length > 0 && (
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
        {/* GRADE ALERTS — Dashboard view only, hidden in focus mode */}
        {/* ============================================================ */}
        {!focusMode && activeSection === 'dashboard' && gradeAlerts.filter(g => !dismissedGrades.includes(g.id)).length > 0 && (
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
        {/* VIEW-BASED SECTIONS — Each sidebar tab renders its own view */}
        {/* ============================================================ */}
        {!focusMode && (
        <div className="dash-sections" style={{ marginTop: '4px', padding: '0 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* ============================================================ */}
          {/* CALENDAR VIEW */}
          {/* ============================================================ */}
          {activeSection === 'calendar' && (
          <div id="calendar" className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Sticky date header */}
            <div className="scroll-cal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <span style={{ fontSize: '20px' }}>&#128197;</span>
                  <span>{visibleDateLabel || 'Calendar'}</span>
                </h2>
                <button onClick={scrollToToday} style={{
                  padding: '4px 12px', border: '1px solid #E2E8F0', borderRadius: '6px',
                  background: 'white', fontSize: '12px', fontWeight: '600', color: '#5D0022',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}>Today</button>
                <button onClick={() => setShowManualEventModal(true)} style={{
                  padding: '4px 12px', border: '1px solid #A7F3D0', borderRadius: '6px',
                  background: '#ECFDF5', fontSize: '12px', fontWeight: '600', color: '#059669',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}>+ Add Event</button>
                {isFullscreen && (
                  <button onClick={() => setSemesterView(!semesterView)} style={{
                    padding: '4px 12px', border: semesterView ? '1px solid #5D0022' : '1px solid #E2E8F0', borderRadius: '6px',
                    background: semesterView ? '#5D0022' : 'white', fontSize: '12px', fontWeight: '600',
                    color: semesterView ? '#fff' : '#64748B',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}>Semester</button>
                )}
              </div>
              {/* Course Filter */}
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '8px' }}>
                <button className={`email-filter-btn ${courseFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setCourseFilter('all')} style={{ fontSize: '11px' }}>All Classes</button>
                {uniqueCourses.map(course => (
                  <button key={course} className={`email-filter-btn ${courseFilter === course ? 'active' : ''}`}
                    onClick={() => setCourseFilter(course)} style={{ fontSize: '11px', borderLeft: `3px solid ${DEFAULT_COURSE_COLORS[course] || '#6B7280'}` }}>
                    {course}
                  </button>
                ))}
              </div>
            </div>

            {/* Horizontal scrolling day columns */}
            {!semesterView && (
            <div
              id="cal-scroll-container"
              className="scroll-cal-container"
              onScroll={handleCalendarScroll}
            >
              {scrollCalendarDays.map((day, i) => {
                const dayEvents = getEventsForDay(calendarFilteredEvents, day);
                const dayTasks = getTasksForDay(calendarFilteredTasks, day);
                const isToday = isSameDay(day, new Date());
                const isPast = day < new Date() && !isToday;
                const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                const isWeekStart = day.getDay() === 0;
                const totalItems = dayEvents.length + dayTasks.length;

                return (
                  <div key={i} className={`scroll-cal-day ${isToday ? 'scroll-cal-today' : ''} ${isPast ? 'scroll-cal-past' : ''} ${isWeekStart && i > 0 ? 'scroll-cal-week-start' : ''}`}>
                    <div className="scroll-cal-day-header">
                      <span className="scroll-cal-day-name">{dayNames[day.getDay()]}</span>
                      <span className={`scroll-cal-day-num ${isToday ? 'scroll-cal-today-num' : ''}`}>
                        {day.getDate()}
                      </span>
                      {day.getDate() === 1 && (
                        <span className="scroll-cal-month-label">
                          {day.toLocaleDateString([], { month: 'short' })}
                        </span>
                      )}
                    </div>
                    <div className={`scroll-cal-day-body ${totalItems >= 3 ? 'scroll-cal-compact' : ''}`}>
                      {totalItems === 0 && (
                        <div className="scroll-cal-empty">—</div>
                      )}
                      {dayEvents.map(e => (
                        <div key={e.id} className={`scroll-cal-chip scroll-cal-chip-event ${totalItems >= 3 ? 'scroll-cal-chip-sm' : ''}`} title={`${e.name}\n${formatTime(e.start)} – ${formatTime(e.end)}`}
                          onClick={(ev) => { ev.stopPropagation(); openItemDetail(e, 'event'); }} style={{ cursor: 'pointer' }}>
                          {totalItems < 3 && <div className="scroll-cal-chip-time">{formatTime(e.start)}</div>}
                          <div className="scroll-cal-chip-name">{totalItems >= 3 ? e.name.slice(0, 20) + (e.name.length > 20 ? '…' : '') : e.name}</div>
                        </div>
                      ))}
                      {dayTasks.map(t => {
                        const sub = isSubmittableType(t.type);
                        const compact = totalItems >= 3;
                        return (
                          <div key={t.id}
                            className={`scroll-cal-chip ${!sub ? 'scroll-cal-chip-info' : ''} ${compact ? 'scroll-cal-chip-sm' : ''}`}
                            style={{ background: t.courseColor + '18', borderLeftColor: t.courseColor, cursor: 'pointer' }}
                            title={`${t.courseName} — ${t.name}${sub && t.dueDate ? '\nDue ' + formatTime(t.manualDate || t.dueDate) : ''}${t.points ? '\n' + t.points + ' pts' : ''}`}
                            onClick={(ev) => { ev.stopPropagation(); openItemDetail(t, 'task'); }}
                          >
                            {!compact && <div className="scroll-cal-chip-course" style={{ color: t.courseColor }}>{t.courseName}</div>}
                            <div className="scroll-cal-chip-name">
                              {compact ? t.name.slice(0, 22) + (t.name.length > 22 ? '…' : '') : <>{getItemTypeIcon(t.type)} {t.name}</>}
                            </div>
                            {!compact && sub && t.dueDate && (
                              <div className="scroll-cal-chip-time">Due {formatTime(t.manualDate || t.dueDate)}{t.points ? ` · ${t.points} pts` : ''}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            )}

            {/* SEMESTER VIEW — month rows with day boxes */}
            {semesterView && (() => {
              const months = getSemesterMonths();
              const monthCount = months.length;
              // Adaptive height: fewer months = taller boxes
              const boxHeight = monthCount === 1 ? 80 : monthCount === 2 ? 60 : 46;
              return (
              <div className="semester-view-wrap" style={{ padding: '12px 8px' }}>
                {months.map((m, mi) => (
                  <div key={mi} className="semester-month-row">
                    <div className="semester-month-label">{m.label}</div>
                    <div className="semester-month-days">
                      {m.days.map((day, di) => {
                        const dayTasks = getTasksForDay(calendarFilteredTasks, day);
                        const dayEvents = getEventsForDay(calendarFilteredEvents, day);
                        const isToday = isSameDay(day, new Date());
                        const isPast = day < new Date() && !isToday;
                        const totalItems = dayTasks.length + dayEvents.length;
                        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                        // Check for academic calendar events
                        const acadEvents = (academicCalendarEvents || []).filter(ae => isSameDay(new Date(ae.date), day));
                        return (
                          <div key={di}
                            className={`semester-day-box ${isToday ? 'semester-box-today' : ''} ${isPast ? 'semester-box-past' : ''} ${isWeekend ? 'semester-box-weekend' : ''}`}
                            style={{ height: `${boxHeight}px` }}
                          >
                            <div className="semester-box-date">{day.getDate()}</div>
                            {acadEvents.length > 0 && (
                              <div className="semester-box-acad" title={acadEvents.map(ae => ae.name).join(', ')}>
                                {acadEvents[0].name.slice(0, 12)}{acadEvents[0].name.length > 12 ? '…' : ''}
                              </div>
                            )}
                            <div className="semester-box-items">
                              {dayTasks.slice(0, boxHeight > 55 ? 4 : 2).map(t => (
                                <div key={t.id} className="semester-box-bar"
                                  style={{ background: t.courseColor || '#6B7280', cursor: 'pointer' }}
                                  title={`${t.courseName}: ${t.name}${t.points ? ' (' + t.points + ' pts)' : ''}`}
                                  onClick={() => openItemDetail(t, 'task')}
                                />
                              ))}
                              {dayEvents.slice(0, 1).map(e => (
                                <div key={e.id} className="semester-box-bar"
                                  style={{ background: '#3B82F6', cursor: 'pointer' }}
                                  title={e.name}
                                  onClick={() => openItemDetail(e, 'event')}
                                />
                              ))}
                              {totalItems > (boxHeight > 55 ? 5 : 3) && (
                                <div className="semester-box-more">+{totalItems - (boxHeight > 55 ? 5 : 3)}</div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              );
            })()}
          </div>
          )}

          {/* ============================================================ */}
          {/* DASHBOARD VIEW — AI Suggestions + Course Progress */}
          {/* ============================================================ */}
          {activeSection === 'dashboard' && (
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
          )}

          {/* ============================================================ */}
          {/* GRADES VIEW — All Items (Assignment Queue) */}
          {/* ============================================================ */}
          {activeSection === 'grades' && (
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

            {(showAllItems ? sortedTasks : sortedTasks.slice(0, 5)).map(task => {
              const priority = getPriorityLevel(task);
              const dateToShow = task.manualDate || task.dueDate;
              const submittable = isSubmittableType(task.type);
              return (
                <div key={task.id} className="task-item" style={{ borderLeft: `3px solid ${task.courseColor}`, opacity: submittable ? 1 : 0.75 }}>
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
                      {!submittable && <span style={{ color: '#94A3B8', fontStyle: 'italic' }}> · No submission required</span>}
                    </div>
                  </div>

                  {/* Badges */}
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
                    <span className={getItemTypeBadgeClass(task.type)} style={{ fontSize: '11px', padding: '2px 7px' }}>
                      {getItemTypeLabel(task.type)}
                    </span>
                    {task.submitted && <span className="badge badge-submitted">Submitted</span>}
                    {task.graded && <span className="badge badge-graded">Graded</span>}
                    {submittable && !task.submitted && dateToShow && (
                      <span className={`badge badge-${priority}`}>
                        {priority === 'high' ? 'Urgent' : priority === 'medium' ? 'Soon' : 'Upcoming'}
                      </span>
                    )}
                    {!submittable && <span className="badge" style={{ background: '#F1F5F9', color: '#64748B', fontSize: '10px' }}>Info</span>}
                  </div>

                  {/* Date */}
                  <div className="task-time" style={{ minWidth: '80px', textAlign: 'right' }}>
                    {submittable && dateToShow ? (
                      <span style={{ fontWeight: '600' }}>Due {formatDate(dateToShow)}</span>
                    ) : !submittable && dateToShow ? (
                      <span style={{ color: '#94A3B8', fontSize: '12px' }}>{new Date(dateToShow).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                    ) : (
                      <span style={{ color: '#94A3B8' }}>No date</span>
                    )}
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

            {sortedTasks.length > 5 && (
              <button
                onClick={() => setShowAllItems(!showAllItems)}
                style={{
                  width: '100%',
                  padding: '10px',
                  marginTop: '8px',
                  background: 'none',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  color: '#5D0022',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#FDF2F4'; e.currentTarget.style.borderColor = '#5D0022'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = '#E2E8F0'; }}
              >
                {showAllItems ? `Show less` : `Show all ${sortedTasks.length} items`}
              </button>
            )}
          </div>
          )}

        </div>
        )}
      </div>
      {/* ============================================================ */}
      {/* ITEM DETAIL MODAL — click any calendar chip to open */}
      {/* ============================================================ */}
      {selectedItem && (
        <div className="detail-modal-overlay" onClick={closeItemDetail}>
          <div className="detail-modal" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="detail-modal-header" style={{ borderLeft: `4px solid ${selectedItem.courseColor || '#3B82F6'}` }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', color: selectedItem.courseColor || '#3B82F6', marginBottom: '4px' }}>
                  {selectedItemType === 'task' ? getItemTypeLabel(selectedItem.type) : 'Event'}
                  {selectedItem.courseName && ` · ${selectedItem.courseName}`}
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0, lineHeight: 1.3 }}>{selectedItem.name}</h3>
              </div>
              <button onClick={closeItemDetail} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94A3B8', padding: '4px' }}>✕</button>
            </div>

            {/* Details grid */}
            <div className="detail-modal-body">
              {selectedItemType === 'task' ? (
                <>
                  <div className="detail-row">
                    <span className="detail-label">Course</span>
                    <span className="detail-value" style={{ color: selectedItem.courseColor, fontWeight: '600' }}>{selectedItem.courseName || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Type</span>
                    <span className="detail-value">{getItemTypeIcon(selectedItem.type)} {getItemTypeLabel(selectedItem.type)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Due Date</span>
                    <span className="detail-value">
                      {selectedItem.manualDate || selectedItem.dueDate
                        ? new Date(selectedItem.manualDate || selectedItem.dueDate).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
                          + ' at ' + formatTime(selectedItem.manualDate || selectedItem.dueDate)
                        : 'No due date'}
                      {selectedItem.manualDate && <span style={{ fontSize: '11px', color: '#D97706', marginLeft: '6px' }}>✏️ Custom</span>}
                    </span>
                  </div>
                  {selectedItem.points != null && selectedItem.points > 0 && (
                    <div className="detail-row">
                      <span className="detail-label">Points</span>
                      <span className="detail-value" style={{ fontWeight: '700', fontSize: '16px' }}>{selectedItem.points} pts</span>
                    </div>
                  )}
                  <div className="detail-row">
                    <span className="detail-label">Status</span>
                    <span className="detail-value">
                      {selectedItem.submitted ? <span className="badge badge-submitted">Submitted</span>
                        : selectedItem.status === 'completed' ? <span className="badge badge-submitted">Completed</span>
                        : <span className="badge badge-medium">Not submitted</span>}
                      {selectedItem.graded && selectedItem.grade && (
                        <span style={{ marginLeft: '8px', fontWeight: '700', color: selectedItem.grade.percentage >= 80 ? '#059669' : '#D97706' }}>
                          {selectedItem.grade.percentage}% ({selectedItem.grade.earned}/{selectedItem.grade.outOf})
                        </span>
                      )}
                    </span>
                  </div>
                  {selectedItem.isRecurring && (
                    <div className="detail-row">
                      <span className="detail-label">Recurring</span>
                      <span className="detail-value">{selectedItem.recurringLabel || 'Yes'}</span>
                    </div>
                  )}
                  <div className="detail-row">
                    <span className="detail-label">Source</span>
                    <span className="detail-value">{selectedItem.source === 'd2l' ? 'D2L Calendar Feed' : selectedItem.source === 'manual' ? 'Manually Added' : selectedItem.source || 'Unknown'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Urgency</span>
                    <span className="detail-value">
                      {(() => {
                        const p = getPriorityLevel(selectedItem);
                        return p === 'high' ? <span className="badge badge-high">Urgent</span>
                          : p === 'medium' ? <span className="badge badge-medium">Soon</span>
                          : <span className="badge badge-low">Upcoming</span>;
                      })()}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="detail-row">
                    <span className="detail-label">Time</span>
                    <span className="detail-value">
                      {selectedItem.start && formatTime(selectedItem.start)}
                      {selectedItem.end && ` – ${formatTime(selectedItem.end)}`}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Date</span>
                    <span className="detail-value">
                      {selectedItem.start && new Date(selectedItem.start).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Source</span>
                    <span className="detail-value">{selectedItem.source === 'manual' ? 'Manually Added' : 'Outlook'}</span>
                  </div>
                </>
              )}
            </div>

            {/* Actions */}
            <div className="detail-modal-actions">
              {/* Edit date */}
              {selectedItemType === 'task' && (
                detailEditingDate ? (
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flex: 1 }}>
                    <input type="datetime-local" value={detailEditDate}
                      onChange={e => setDetailEditDate(e.target.value)}
                      style={{ fontSize: '13px', padding: '6px 10px', border: '1px solid #CBD5E1', borderRadius: '6px', flex: 1 }}
                    />
                    <button onClick={handleDetailSaveDate} className="detail-btn detail-btn-save">Save</button>
                    <button onClick={() => setDetailEditingDate(false)} className="detail-btn detail-btn-cancel">Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => { setDetailEditingDate(true); setDetailEditDate(selectedItem.manualDate || selectedItem.dueDate || ''); }} className="detail-btn detail-btn-edit">
                    📅 Edit Date
                  </button>
                )
              )}

              {/* Mark complete */}
              {selectedItemType === 'task' && !selectedItem.submitted && selectedItem.status !== 'completed' && isSubmittableType(selectedItem.type) && (
                <button onClick={handleDetailMarkComplete} className="detail-btn detail-btn-complete">
                  ✓ Mark Complete
                </button>
              )}

              {/* Delete / Remove */}
              {showDeleteConfirm ? (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: '#DC2626', fontWeight: '600' }}>Remove from calendar?</span>
                  <button onClick={handleDetailDelete} className="detail-btn detail-btn-delete">Yes, remove</button>
                  <button onClick={() => setShowDeleteConfirm(false)} className="detail-btn detail-btn-cancel">Cancel</button>
                </div>
              ) : (
                <button onClick={() => setShowDeleteConfirm(true)} className="detail-btn detail-btn-remove">
                  ✕ Remove
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      </main>
    </div>
  );
}
