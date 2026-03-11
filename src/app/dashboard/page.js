'use client';

import { useState, useEffect } from 'react';
import { reportError, showToast } from '../components/ToastNotifications';

// Demo data — replaced with real API data once D2L/Outlook tokens are available
const DEMO_TASKS = [
  { id: 1, name: 'ENTR 450 — Section IV-A Market Analysis', courseName: 'ENTR 450', dueDate: '2026-03-11T23:59:00', points: 50, source: 'd2l' },
  { id: 2, name: 'ACCT 301 — Chapter 8 Quiz', courseName: 'ACCT 301', dueDate: '2026-03-11T17:00:00', points: 10, source: 'd2l' },
  { id: 3, name: 'ENTR 343 — Idea Journal #3', courseName: 'ENTR 343', dueDate: '2026-03-13T23:59:00', points: 25, source: 'd2l' },
  { id: 4, name: 'BUS 201 — Case Study Write-up', courseName: 'BUS 201', dueDate: '2026-03-14T23:59:00', points: 40, source: 'd2l' },
  { id: 5, name: 'ENTR 450 — Discussion 5 Reply', courseName: 'ENTR 450', dueDate: '2026-03-12T23:59:00', points: 15, source: 'd2l' },
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

// Demo email suggestions to show the feature in demo mode
const DEMO_EMAIL_SUGGESTIONS = [
  {
    id: 'demo-1',
    title: 'ENTR 450 Group Project Meeting',
    date: '2026-03-13T16:00:00',
    endDate: '2026-03-13T17:00:00',
    category: 'Group Project',
    confidence: 'high',
    sourceSubject: 'Re: Group Project — Let\'s meet Thursday at 4pm',
    reason: 'Email thread discussing a group project meeting with explicit date and time',
    status: 'pending',
  },
  {
    id: 'demo-2',
    title: 'Career Fair — Maverick Center',
    date: '2026-03-18T10:00:00',
    endDate: '2026-03-18T14:00:00',
    category: 'Campus Event',
    confidence: 'high',
    sourceSubject: 'Spring Career Fair — March 18th',
    reason: 'Campus-wide email announcing career fair with specific date, time, and location',
    status: 'pending',
  },
  {
    id: 'demo-3',
    title: 'Prof. Williams Review Session',
    date: '2026-03-15T14:00:00',
    endDate: '2026-03-15T15:30:00',
    category: 'Exam / Review',
    confidence: 'medium',
    sourceSubject: 'ACCT 301 — Midterm review this Saturday',
    reason: 'Professor email mentioning a review session with approximate date',
    status: 'pending',
  },
  {
    id: 'demo-4',
    title: 'Entrepreneurship Club Weekly Meeting',
    date: '2026-03-12T18:00:00',
    endDate: '2026-03-12T19:00:00',
    category: 'Club Meeting',
    confidence: 'medium',
    sourceSubject: 'E-Club this Wednesday — guest speaker!',
    reason: 'Club email with meeting details and day of week reference',
    status: 'pending',
  },
];

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffHours = (d - now) / (1000 * 60 * 60);
  if (diffHours < 0) return 'Overdue';
  if (diffHours < 24) return `${Math.round(diffHours)}h left`;
  if (diffHours < 48) return 'Tomorrow';
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatSuggestionDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) +
    ' at ' + d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function getPriorityLevel(task) {
  const hoursLeft = (new Date(task.dueDate) - new Date()) / (1000 * 60 * 60);
  const points = task.points || 10;
  if (hoursLeft <= 12 || (hoursLeft <= 24 && points >= 40)) return 'high';
  if (hoursLeft <= 48) return 'medium';
  return 'low';
}

function getConfidenceStyle(confidence) {
  if (confidence === 'high') return { bg: '#ECFDF5', color: '#059669', label: 'High Confidence' };
  if (confidence === 'medium') return { bg: '#FEF3C7', color: '#D97706', label: 'Likely Match' };
  return { bg: '#FEE2E2', color: '#DC2626', label: 'Maybe' };
}

function getCategoryIcon(category) {
  const icons = {
    'Group Project': '\u{1F465}',
    'Study Session': '\u{1F4DA}',
    'Campus Event': '\u{1F3DB}',
    'Office Hours': '\u{1F468}\u200D\u{1F3EB}',
    'Club Meeting': '\u{1F91D}',
    'Exam / Review': '\u{1F4DD}',
    'Workshop': '\u{1F6E0}',
    'Social': '\u{1F389}',
    'Other': '\u{1F4CC}',
  };
  return icons[category] || '\u{1F4CC}';
}

// ============================================================
// SMART NOTIFICATION — Urgency detection for <24hr events
// ============================================================

function getUrgencyInfo(suggestion) {
  const eventDate = new Date(suggestion.date);
  const now = new Date();
  const hoursUntil = (eventDate - now) / (1000 * 60 * 60);

  if (hoursUntil < 0) {
    return { isUrgent: false, label: null, style: null };
  }
  if (hoursUntil <= 3) {
    return {
      isUrgent: true,
      label: `Happening in ${Math.max(1, Math.round(hoursUntil * 60))} min — act now!`,
      style: 'critical',
    };
  }
  if (hoursUntil <= 12) {
    return {
      isUrgent: true,
      label: `Today — ${Math.round(hoursUntil)}h away`,
      style: 'urgent',
    };
  }
  if (hoursUntil <= 24) {
    return {
      isUrgent: true,
      label: `Less than 24 hours away`,
      style: 'soon',
    };
  }
  return { isUrgent: false, label: null, style: null };
}

// ============================================================
// CALENDAR VIEW HELPERS
// ============================================================

function getWeekDays(referenceDate) {
  const d = new Date(referenceDate);
  const day = d.getDay(); // 0 = Sunday
  const start = new Date(d);
  start.setDate(d.getDate() - day); // go to Sunday
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
  const lastDay = new Date(year, month + 1, 0);

  // Start from the Sunday before (or on) the first day
  const startDate = new Date(firstDay);
  startDate.setDate(firstDay.getDate() - firstDay.getDay());

  const days = [];
  const current = new Date(startDate);
  // Always show 6 weeks for consistency
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

function getEventsForDay(events, day) {
  return events.filter(e => {
    const eventDate = new Date(e.start);
    return isSameDay(eventDate, day);
  });
}

function getTasksForDay(tasks, day) {
  return tasks.filter(t => {
    const dueDate = new Date(t.dueDate);
    return isSameDay(dueDate, day);
  });
}

export default function StudentDashboard() {
  const [tasks, setTasks] = useState(DEMO_TASKS);
  const [events, setEvents] = useState(DEMO_EVENTS);
  const [suggestions, setSuggestions] = useState(DEMO_SUGGESTIONS);
  const [emailSuggestions, setEmailSuggestions] = useState(DEMO_EMAIL_SUGGESTIONS);
  const [isDemo, setIsDemo] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [emailsScanned, setEmailsScanned] = useState(0);
  const [filterCategory, setFilterCategory] = useState('all');

  // Calendar view state
  const [calendarView, setCalendarView] = useState('today'); // 'today', 'week', 'month'
  const [calendarDate, setCalendarDate] = useState(new Date());

  // Get unique categories from suggestions
  const activeCategories = [...new Set(emailSuggestions.filter(s => s.status === 'pending').map(s => s.category))];

  // Filter and sort suggestions — urgent ones float to top
  const pendingSuggestions = emailSuggestions.filter(s => s.status === 'pending');

  const sortedPendingSuggestions = [...pendingSuggestions].sort((a, b) => {
    const aUrgency = getUrgencyInfo(a);
    const bUrgency = getUrgencyInfo(b);
    // Urgent items first
    if (aUrgency.isUrgent && !bUrgency.isUrgent) return -1;
    if (!aUrgency.isUrgent && bUrgency.isUrgent) return 1;
    // Among urgent, sooner events first
    if (aUrgency.isUrgent && bUrgency.isUrgent) return new Date(a.date) - new Date(b.date);
    // Non-urgent: by date
    return new Date(a.date) - new Date(b.date);
  });

  const filteredSuggestions = sortedPendingSuggestions.filter(s => {
    if (filterCategory === 'all') return true;
    return s.category === filterCategory;
  });

  // Snoozed suggestions
  const snoozedSuggestions = emailSuggestions.filter(s => s.status === 'snoozed');

  // Handle scanning inbox
  async function handleScanInbox() {
    if (isDemo) {
      setScanning(true);
      setScanComplete(false);
      setTimeout(() => {
        setScanning(false);
        setScanComplete(true);
        setEmailsScanned(47);
        setEmailSuggestions(DEMO_EMAIL_SUGGESTIONS.map(s => ({ ...s, status: 'pending' })));
      }, 2000);
      return;
    }

    // Real scan with retry logic + error reporting
    setScanning(true);
    setScanComplete(false);
    let retries = 0;
    const maxRetries = 2;

    while (retries <= maxRetries) {
      try {
        const res = await fetch('/api/email/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accessToken: '',
            user: '',
            days: 7,
          }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        if (data.success) {
          setEmailsScanned(data.emailsScanned);
          setEmailSuggestions(data.suggestions.map((s, i) => ({
            ...s,
            id: `scan-${i}`,
            status: 'pending',
          })));
          setScanComplete(true);
          break;
        } else {
          throw new Error(data.error || 'Scan returned unsuccessful');
        }
      } catch (err) {
        retries++;
        if (retries > maxRetries) {
          reportError({
            errorCode: 'outlook_email_scan_failed',
            severity: 'medium',
            platform: 'outlook',
            endpoint: '/api/email/scan',
            errorMessage: err.message,
            context: { retries: maxRetries },
          });
        } else {
          await new Promise(r => setTimeout(r, 1000 * retries));
        }
      }
    }
    setScanning(false);
  }

  // Accept a suggestion — add to calendar
  async function handleAccept(suggestionId) {
    setEmailSuggestions(prev => prev.map(s =>
      s.id === suggestionId ? { ...s, status: 'accepted' } : s
    ));

    if (!isDemo) {
      const suggestion = emailSuggestions.find(s => s.id === suggestionId);
      try {
        const res = await fetch('/api/email/accept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accessToken: '',
            user: '',
            suggestion,
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        showToast({ type: 'success', message: 'Event added to your Outlook calendar!', duration: 4000 });
      } catch (err) {
        reportError({
          errorCode: 'outlook_calendar_write_failed',
          severity: 'medium',
          platform: 'outlook',
          endpoint: '/api/email/accept',
          errorMessage: err.message,
          context: { suggestionTitle: suggestion?.title },
        });
      }
    }
  }

  function handleDismiss(suggestionId) {
    setEmailSuggestions(prev => prev.map(s =>
      s.id === suggestionId ? { ...s, status: 'dismissed' } : s
    ));
  }

  function handleSnooze(suggestionId) {
    setEmailSuggestions(prev => prev.map(s =>
      s.id === suggestionId ? { ...s, status: 'snoozed' } : s
    ));
  }

  function handleUnsnooze(suggestionId) {
    setEmailSuggestions(prev => prev.map(s =>
      s.id === suggestionId ? { ...s, status: 'pending' } : s
    ));
  }

  // Sort tasks by priority
  const sortedTasks = [...tasks].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const aPriority = priorityOrder[getPriorityLevel(a)];
    const bPriority = priorityOrder[getPriorityLevel(b)];
    if (aPriority !== bPriority) return aPriority - bPriority;
    return new Date(a.dueDate) - new Date(b.dueDate);
  });

  // Calendar navigation
  function navigateCalendar(direction) {
    const d = new Date(calendarDate);
    if (calendarView === 'week') {
      d.setDate(d.getDate() + (direction * 7));
    } else if (calendarView === 'month') {
      d.setMonth(d.getMonth() + direction);
    } else {
      d.setDate(d.getDate() + direction);
    }
    setCalendarDate(d);
  }

  function goToToday() {
    setCalendarDate(new Date());
  }

  // Get today's events for "today" view
  const todayDate = calendarView === 'today' ? calendarDate : new Date();
  const todayEvents = events.filter(e => isSameDay(new Date(e.start), todayDate));
  const todayTasks = tasks.filter(t => isSameDay(new Date(t.dueDate), todayDate));

  // Calendar header label
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

  return (
    <div>
      {/* Top Nav */}
      <nav className="topnav">
        <a className="topnav-logo" href="/dashboard">
          <span className="topnav-logo-icon">S</span>
          SyncWise AI
        </a>
        <div className="topnav-user">
          {isDemo && <span className="badge badge-medium">Demo Mode</span>}
          <span>Troy Fields</span>
          <a href="/login" style={{ color: '#64748B', textDecoration: 'none', fontSize: '13px' }}>Sign out</a>
        </div>
      </nav>

      <div className="container">
        {/* Demo Banner */}
        {isDemo && (
          <div style={{
            background: '#FEF3C7',
            border: '1px solid #FDE68A',
            borderRadius: '10px',
            padding: '12px 20px',
            margin: '20px 0 0',
            fontSize: '14px',
            color: '#92400E',
          }}>
            <strong>Demo Mode</strong> — Showing sample data. Connect your CMU accounts to see real assignments and events.
          </div>
        )}

        <div className="dash-grid" style={{ marginTop: '4px' }}>
          {/* LEFT: AI Suggestions */}
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
          </div>

          {/* RIGHT: Calendar with View Toggle */}
          <div className="card">
            <div className="calendar-header">
              <h2 style={{ fontSize: '16px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <span style={{ fontSize: '20px' }}>&#128197;</span>
                <span className="calendar-title-label">{getCalendarLabel()}</span>
              </h2>

              {/* View toggle buttons */}
              <div className="calendar-view-toggle">
                <button
                  className={`cal-view-btn ${calendarView === 'today' ? 'active' : ''}`}
                  onClick={() => { setCalendarView('today'); setCalendarDate(new Date()); }}
                >
                  Day
                </button>
                <button
                  className={`cal-view-btn ${calendarView === 'week' ? 'active' : ''}`}
                  onClick={() => setCalendarView('week')}
                >
                  Week
                </button>
                <button
                  className={`cal-view-btn ${calendarView === 'month' ? 'active' : ''}`}
                  onClick={() => setCalendarView('month')}
                >
                  Month
                </button>
              </div>
            </div>

            {/* Calendar Navigation */}
            <div className="calendar-nav">
              <button className="cal-nav-btn" onClick={() => navigateCalendar(-1)}>&lsaquo;</button>
              <button className="cal-nav-today" onClick={goToToday}>Today</button>
              <button className="cal-nav-btn" onClick={() => navigateCalendar(1)}>&rsaquo;</button>
            </div>

            {/* === TODAY VIEW === */}
            {calendarView === 'today' && (
              <div>
                {todayEvents.length === 0 && todayTasks.length === 0 && (
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
                    <span className="badge badge-outlook">Outlook</span>
                  </div>
                ))}
                {todayTasks.map(task => (
                  <div key={task.id} className="task-item">
                    <div className="task-dot d2l"></div>
                    <div className="task-info">
                      <div className="task-name">{task.name}</div>
                      <div className="task-meta">Due {formatTime(task.dueDate)} &middot; {task.points} pts</div>
                    </div>
                    <span className={`badge badge-${getPriorityLevel(task)}`}>
                      {getPriorityLevel(task) === 'high' ? 'Urgent' : getPriorityLevel(task) === 'medium' ? 'Soon' : 'Upcoming'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* === WEEK VIEW === */}
            {calendarView === 'week' && (
              <div className="week-view">
                {getWeekDays(calendarDate).map((day, i) => {
                  const dayEvents = getEventsForDay(events, day);
                  const dayTasks = getTasksForDay(tasks, day);
                  const isToday = isSameDay(day, new Date());
                  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

                  return (
                    <div
                      key={i}
                      className={`week-day-col ${isToday ? 'today' : ''}`}
                      onClick={() => { setCalendarView('today'); setCalendarDate(day); }}
                    >
                      <div className="week-day-header">
                        <span className="week-day-name">{dayNames[i]}</span>
                        <span className={`week-day-num ${isToday ? 'today-num' : ''}`}>
                          {day.getDate()}
                        </span>
                      </div>
                      <div className="week-day-events">
                        {dayEvents.map(e => (
                          <div key={e.id} className="week-event-chip outlook-chip">
                            {formatTime(e.start)} {e.name.length > 18 ? e.name.slice(0, 18) + '...' : e.name}
                          </div>
                        ))}
                        {dayTasks.map(t => (
                          <div key={t.id} className={`week-event-chip task-chip-${getPriorityLevel(t)}`}>
                            {t.name.length > 20 ? t.name.slice(0, 20) + '...' : t.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* === MONTH VIEW === */}
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
                    const dayEvents = getEventsForDay(events, day);
                    const dayTasks = getTasksForDay(tasks, day);
                    const hasItems = dayEvents.length + dayTasks.length > 0;

                    return (
                      <div
                        key={i}
                        className={`month-day-cell ${isCurrentMonth ? '' : 'other-month'} ${isToday ? 'today-cell' : ''} ${hasItems ? 'has-items' : ''}`}
                        onClick={() => { setCalendarView('today'); setCalendarDate(day); }}
                      >
                        <span className={`month-day-num ${isToday ? 'today-num' : ''}`}>
                          {day.getDate()}
                        </span>
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
                              <span key={j} className="month-dot task-dot-indicator"></span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="month-legend">
                  <span className="legend-item"><span className="month-dot outlook-dot"></span> Outlook Event</span>
                  <span className="legend-item"><span className="month-dot task-dot-indicator"></span> D2L Assignment</span>
                </div>
              </div>
            )}
          </div>

          {/* FULL WIDTH: Email Suggested Events */}
          <div className="card dash-full">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <span style={{ fontSize: '20px' }}>&#128233;</span> Suggested Events from Email
                {filteredSuggestions.length > 0 && (
                  <span className="email-scan-count">{filteredSuggestions.length} new</span>
                )}
              </h2>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {scanComplete && (
                  <span style={{ fontSize: '12px', color: '#059669' }}>
                    &#10003; Scanned {emailsScanned} emails
                  </span>
                )}
                <button
                  className="btn btn-primary"
                  onClick={handleScanInbox}
                  disabled={scanning}
                  style={{ fontSize: '13px', padding: '8px 16px', opacity: scanning ? 0.7 : 1 }}
                >
                  {scanning ? 'Scanning...' : 'Scan My Inbox'}
                </button>
              </div>
            </div>

            {/* Category Filter */}
            {activeCategories.length > 1 && (
              <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <button
                  className={`email-filter-btn ${filterCategory === 'all' ? 'active' : ''}`}
                  onClick={() => setFilterCategory('all')}
                >
                  All
                </button>
                {activeCategories.map(cat => (
                  <button
                    key={cat}
                    className={`email-filter-btn ${filterCategory === cat ? 'active' : ''}`}
                    onClick={() => setFilterCategory(cat)}
                  >
                    {getCategoryIcon(cat)} {cat}
                  </button>
                ))}
              </div>
            )}

            {/* Suggestion Cards */}
            {filteredSuggestions.length === 0 && !scanning && (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: '#94A3B8' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>&#128233;</div>
                <p style={{ fontSize: '14px' }}>No pending suggestions. Hit <strong>Scan My Inbox</strong> to check for events in your recent emails.</p>
              </div>
            )}

            {scanning && (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: '#64748B' }}>
                <div className="scan-spinner"></div>
                <p style={{ fontSize: '14px', marginTop: '12px' }}>Scanning your inbox for calendar-worthy events...</p>
              </div>
            )}

            {filteredSuggestions.map(suggestion => {
              const conf = getConfidenceStyle(suggestion.confidence);
              const urgency = getUrgencyInfo(suggestion);

              return (
                <div key={suggestion.id} className={`email-suggestion-card ${urgency.isUrgent ? 'urgency-' + urgency.style : ''}`}>
                  {/* Smart Notification — Urgency Banner */}
                  {urgency.isUrgent && (
                    <div className={`urgency-banner urgency-banner-${urgency.style}`}>
                      <span className="urgency-icon">&#9888;</span> {urgency.label}
                    </div>
                  )}

                  <div className="email-suggestion-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                      <span style={{ fontSize: '18px' }}>{getCategoryIcon(suggestion.category)}</span>
                      <div>
                        <div className="email-suggestion-title">{suggestion.title}</div>
                        <div className="email-suggestion-meta">
                          {formatSuggestionDate(suggestion.date)} &middot; {suggestion.category}
                        </div>
                      </div>
                    </div>
                    <span className="email-confidence-badge" style={{ background: conf.bg, color: conf.color }}>
                      {conf.label}
                    </span>
                  </div>

                  <div className="email-suggestion-source">
                    From email: &quot;{suggestion.sourceSubject}&quot;
                  </div>

                  <div className="email-suggestion-reason">
                    {suggestion.reason}
                  </div>

                  <div className="email-suggestion-actions">
                    <button
                      className="btn btn-primary"
                      style={{ fontSize: '13px', padding: '7px 16px' }}
                      onClick={() => handleAccept(suggestion.id)}
                    >
                      &#10003; Add to Calendar
                    </button>
                    <button
                      className="btn btn-outline"
                      style={{ fontSize: '13px', padding: '7px 16px' }}
                      onClick={() => handleSnooze(suggestion.id)}
                    >
                      &#128340; Remind Later
                    </button>
                    <button
                      className="btn btn-danger"
                      style={{ fontSize: '13px', padding: '7px 16px' }}
                      onClick={() => handleDismiss(suggestion.id)}
                    >
                      &#10005; Dismiss
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Snoozed Section */}
            {snoozedSuggestions.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#94A3B8', marginBottom: '8px' }}>
                  &#128340; Snoozed ({snoozedSuggestions.length})
                </div>
                {snoozedSuggestions.map(suggestion => (
                  <div key={suggestion.id} className="email-suggestion-card snoozed">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px' }}>{getCategoryIcon(suggestion.category)}</span>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#94A3B8' }}>{suggestion.title}</span>
                        <span style={{ fontSize: '12px', color: '#CBD5E1' }}>{formatSuggestionDate(suggestion.date)}</span>
                      </div>
                      <button
                        className="btn btn-outline"
                        style={{ fontSize: '12px', padding: '4px 12px' }}
                        onClick={() => handleUnsnooze(suggestion.id)}
                      >
                        Review
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* FULL WIDTH: Assignment Queue */}
          <div className="card dash-full">
            <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>&#128218;</span> Upcoming Assignments
              <span style={{ fontSize: '13px', fontWeight: '500', color: '#64748B', marginLeft: 'auto' }}>
                {sortedTasks.length} assignments
              </span>
            </h2>
            {sortedTasks.map(task => {
              const priority = getPriorityLevel(task);
              return (
                <div key={task.id} className="task-item">
                  <div className="task-dot d2l"></div>
                  <div className="task-info">
                    <div className="task-name">{task.name}</div>
                    <div className="task-meta">{task.points} pts &middot; {task.courseName}</div>
                  </div>
                  <span className={`badge badge-${priority}`}>
                    {priority === 'high' ? 'Urgent' : priority === 'medium' ? 'Soon' : 'Upcoming'}
                  </span>
                  <div className="task-time">{formatDate(task.dueDate)}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
