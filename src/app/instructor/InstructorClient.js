

import { useState, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar';
import { ThemeToggle } from '../components/ThemeProvider';
import { NotificationCenter } from '../components/NotificationCenter';
import { ManualEventModal } from '../components/ManualEventModal';

// ============================================================
// COURSE COLORS — Same as student dashboard
// ============================================================

const DEFAULT_COURSE_COLORS = {
  'ENTR 450': '#5D0022',
  'ACCT 301': '#059669',
  'ENTR 343': '#D97706',
  'BUS 201': '#DC2626',
  'CSCI 110': '#7C3AED',
};

// ============================================================
// DEMO DATA — Instructor-specific
// ============================================================

const DEMO_ITEMS = [
  // ENTR 450 - Assignments
  {
    id: 'd2l-asgn-1',
    type: 'assignment',
    name: 'Section IV-A Market Analysis',
    courseName: 'ENTR 450',
    courseColor: DEFAULT_COURSE_COLORS['ENTR 450'],
    dueDate: '2026-03-11T23:59:00',
    points: 50,
    source: 'd2l',
  },
  {
    id: 'd2l-asgn-2',
    type: 'assignment',
    name: 'Idea Journal #3',
    courseName: 'ENTR 343',
    courseColor: DEFAULT_COURSE_COLORS['ENTR 343'],
    dueDate: '2026-03-13T23:59:00',
    points: 25,
    source: 'd2l',
  },
  {
    id: 'd2l-asgn-3',
    type: 'assignment',
    name: 'Case Study Write-up',
    courseName: 'BUS 201',
    courseColor: DEFAULT_COURSE_COLORS['BUS 201'],
    dueDate: '2026-03-14T23:59:00',
    points: 40,
    source: 'd2l',
  },
  {
    id: 'd2l-asgn-4',
    type: 'assignment',
    name: 'Financial Projections',
    courseName: 'ENTR 450',
    courseColor: DEFAULT_COURSE_COLORS['ENTR 450'],
    dueDate: '2026-03-18T23:59:00',
    points: 75,
    source: 'd2l',
  },
  {
    id: 'd2l-asgn-5',
    type: 'assignment',
    name: 'Accounting Problem Set',
    courseName: 'ACCT 301',
    courseColor: DEFAULT_COURSE_COLORS['ACCT 301'],
    dueDate: '2026-03-12T17:00:00',
    points: 30,
    source: 'd2l',
  },
  {
    id: 'd2l-asgn-6',
    type: 'assignment',
    name: 'Code Review Assignment',
    courseName: 'CSCI 110',
    courseColor: DEFAULT_COURSE_COLORS['CSCI 110'],
    dueDate: '2026-03-15T23:59:00',
    points: 100,
    source: 'd2l',
  },

  // Quizzes
  {
    id: 'd2l-quiz-1',
    type: 'quiz',
    name: 'Chapter 8 Quiz',
    courseName: 'ACCT 301',
    courseColor: DEFAULT_COURSE_COLORS['ACCT 301'],
    dueDate: '2026-03-11T17:00:00',
    points: 10,
    source: 'd2l',
  },
  {
    id: 'd2l-quiz-2',
    type: 'quiz',
    name: 'Venture Fundamentals Quiz',
    courseName: 'ENTR 450',
    courseColor: DEFAULT_COURSE_COLORS['ENTR 450'],
    dueDate: '2026-03-13T23:59:00',
    points: 15,
    source: 'd2l',
  },
  {
    id: 'd2l-quiz-3',
    type: 'quiz',
    name: 'Intro to Business Quiz',
    courseName: 'BUS 201',
    courseColor: DEFAULT_COURSE_COLORS['BUS 201'],
    dueDate: '2026-03-12T23:59:00',
    points: 20,
    source: 'd2l',
  },

  // Discussions
  {
    id: 'd2l-disc-1',
    type: 'discussion',
    name: 'Week 3: Competitive Analysis Discussion',
    courseName: 'ENTR 450',
    courseColor: DEFAULT_COURSE_COLORS['ENTR 450'],
    dueDate: '2026-03-14T23:59:00',
    source: 'd2l',
  },
  {
    id: 'd2l-disc-2',
    type: 'discussion',
    name: 'GAAP Standards Discussion',
    courseName: 'ACCT 301',
    courseColor: DEFAULT_COURSE_COLORS['ACCT 301'],
    dueDate: '2026-03-15T23:59:00',
    source: 'd2l',
  },
  {
    id: 'd2l-disc-3',
    type: 'discussion',
    name: 'Business Ethics Case Study',
    courseName: 'BUS 201',
    courseColor: DEFAULT_COURSE_COLORS['BUS 201'],
    dueDate: '2026-03-13T23:59:00',
    source: 'd2l',
  },

  // Announcements
  {
    id: 'd2l-announce-1',
    type: 'announcement',
    name: 'Upcoming Exam Schedule',
    courseName: 'ACCT 301',
    courseColor: DEFAULT_COURSE_COLORS['ACCT 301'],
    postedDate: '2026-03-10T08:00:00',
    source: 'd2l',
  },
  {
    id: 'd2l-announce-2',
    type: 'announcement',
    name: 'Office Hours Extended Thursday',
    courseName: 'ENTR 450',
    courseColor: DEFAULT_COURSE_COLORS['ENTR 450'],
    postedDate: '2026-03-09T14:30:00',
    source: 'd2l',
  },
  {
    id: 'd2l-announce-3',
    type: 'announcement',
    name: 'Guest Speaker Next Week',
    courseName: 'BUS 201',
    courseColor: DEFAULT_COURSE_COLORS['BUS 201'],
    postedDate: '2026-03-08T10:00:00',
    source: 'd2l',
  },

  // Content & Checklists
  {
    id: 'd2l-content-1',
    type: 'content',
    name: 'Module 4: Market Analysis Framework',
    courseName: 'ENTR 450',
    courseColor: DEFAULT_COURSE_COLORS['ENTR 450'],
    dueDate: '2026-03-11T23:59:00',
    source: 'd2l',
  },
  {
    id: 'd2l-check-1',
    type: 'checklist',
    name: 'Chapter 7 Reading Checklist',
    courseName: 'ACCT 301',
    courseColor: DEFAULT_COURSE_COLORS['ACCT 301'],
    dueDate: '2026-03-12T23:59:00',
    source: 'd2l',
  },
];

const DEMO_CALENDAR_EVENTS = [
  {
    id: 'evt-1',
    title: 'Section IV Due',
    courseName: 'ENTR 450',
    courseColor: DEFAULT_COURSE_COLORS['ENTR 450'],
    date: '2026-03-11',
  },
  {
    id: 'evt-2',
    title: 'Chapter 8 Quiz Due',
    courseName: 'ACCT 301',
    courseColor: DEFAULT_COURSE_COLORS['ACCT 301'],
    date: '2026-03-11',
  },
  {
    id: 'evt-3',
    title: 'Case Study Due',
    courseName: 'BUS 201',
    courseColor: DEFAULT_COURSE_COLORS['BUS 201'],
    date: '2026-03-14',
  },
  {
    id: 'evt-4',
    title: 'Financial Projections Due',
    courseName: 'ENTR 450',
    courseColor: DEFAULT_COURSE_COLORS['ENTR 450'],
    date: '2026-03-18',
  },
];

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function InstructorDashboard() {
  const [calendarView, setCalendarView] = useState('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [showAllItems, setShowAllItems] = useState(false);
  const [showManualEventModal, setShowManualEventModal] = useState(false);
  const [showStudentView, setShowStudentView] = useState(false);
  const [actionLog, setActionLog] = useState([]);
  const [items, setItems] = useState(DEMO_ITEMS);
  const [conflicts, setConflicts] = useState([]);
  const [isDemo, setIsDemo] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefreshTime, setLastRefreshTime] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [courseFilter, setCourseFilter] = useState('all');

  // ============================================================
  // LIVE DATA FETCH — Instructor dashboard
  // Auto-refreshes every 10 minutes in the background
  // ============================================================

  // Hash-based scroll navigation for sidebar links
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
    scrollToHash();
    window.addEventListener('hashchange', scrollToHash);
    return () => window.removeEventListener('hashchange', scrollToHash);
  }, []);

  useEffect(() => {
    // Load user data — try database first, fall back to localStorage
    async function loadData() {
      // 1. Try server session (persistent account)
      try {
        const res = await fetch('/api/auth/session');
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user?.icalUrl) {
            fetchInstructorData({
              icalUrl: data.user.icalUrl,
              studentEmail: data.user.email,
            });
            return;
          }
        }
      } catch { /* server not available */ }

      // 2. Fall back to localStorage
      let settings = null;
      try {
        const raw = typeof window !== 'undefined' && localStorage.getItem('syncwise_settings');
        if (raw) settings = JSON.parse(raw);
      } catch (e) { /* ignore */ }

      if (settings && settings.icalUrl) {
        fetchInstructorData(settings);
      } else {
        setIsDemo(true);
        setIsLoading(false);
      }
    }
    loadData();

    // Auto-refresh every 10 minutes
    const refreshInterval = setInterval(() => {
      let settings = null;
      try {
        const raw = localStorage.getItem('syncwise_settings');
        if (raw) settings = JSON.parse(raw);
      } catch {}
      if (settings?.icalUrl) {
        console.log('[REFRESH] Auto-refreshing instructor data...');
        fetchInstructorData(settings);
      }
    }, 10 * 60 * 1000);

    return () => clearInterval(refreshInterval);
  }, []);

  async function refreshData() {
    let settings = null;
    try {
      const raw = localStorage.getItem('syncwise_settings');
      if (raw) settings = JSON.parse(raw);
    } catch (e) { /* ignore */ }
    if (settings && settings.icalUrl) {
      await fetchInstructorData(settings, true);
    }
  }

  async function fetchInstructorData(settings, isManualRefresh = false) {
    if (isManualRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    try {
      // Fetch dashboard data (same as student, but instructor views it differently)
      const dataRes = await fetch('/api/dashboard/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ icalUrl: settings.icalUrl, studentEmail: settings.studentEmail || 'anonymous' }),
      });

      if (dataRes.ok) {
        const data = await dataRes.json();
        if (data.events && data.events.length > 0) {
          // Convert to instructor view format
          const liveItems = data.events.map(evt => ({
            id: evt.id || `ical-${Math.random().toString(36).slice(2)}`,
            type: evt.type || 'assignment',
            name: evt.name || evt.summary || 'Untitled',
            courseName: evt.courseName || 'Unknown Course',
            courseColor: (data.courses && data.courses[evt.courseName]?.color) || DEFAULT_COURSE_COLORS[evt.courseName] || '#6B7280',
            dueDate: evt.dueDate || evt.end || evt.start || null,
            points: evt.points || null,
            source: evt.source || 'ical',
            pendingReview: evt.pendingReview || false,
            hasConflict: evt.hasConflict || false,
          }));
          setItems(liveItems);
          setIsDemo(false);
        }
      }

      // Fetch conflicts
      const conflictRes = await fetch('/api/instructor/conflicts?includeResolved=false');
      if (conflictRes.ok) {
        const conflictData = await conflictRes.json();
        setConflicts(conflictData.conflicts || []);
      }
    } catch (err) {
      console.error('Failed to fetch instructor data:', err);
      if (!isManualRefresh) setIsDemo(true);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setLastRefreshTime(new Date());
    }
  }

  async function resolveConflict(conflictId, action, resolution = {}) {
    try {
      const res = await fetch('/api/instructor/conflicts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, conflictId, ...resolution }),
      });
      if (res.ok) {
        // Remove resolved conflict from list
        setConflicts(prev => prev.filter(c => c.id !== conflictId));
        setActionLog(prev => [...prev, { action: `Resolved conflict: ${action}`, time: new Date().toLocaleTimeString() }]);
      }
    } catch (err) {
      console.error('Failed to resolve conflict:', err);
    }
  }

  async function overrideDate(itemName, courseName, newDate, reason) {
    try {
      const res = await fetch('/api/instructor/conflicts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'override',
          itemName,
          courseName,
          newDate,
          reason: reason || 'Instructor date override',
          instructorId: 'instructor-1',
        }),
      });
      if (res.ok) {
        setActionLog(prev => [...prev, { action: `Date override: ${itemName} → ${new Date(newDate).toLocaleDateString()}`, time: new Date().toLocaleTimeString() }]);
      }
    } catch (err) {
      console.error('Failed to override date:', err);
    }
  }

  // Determine which items need attention (instructor-specific)
  // Only flag items with conflicts, pending review, or due within 48 hours
  const needsAttentionItems = items.filter(item => {
    if (item.hasConflict || item.pendingReview) return true;

    // Check if due date is approaching (within 48 hours)
    if (item.dueDate) {
      const dueTime = new Date(item.dueDate).getTime();
      const now = new Date().getTime();
      const hoursUntilDue = (dueTime - now) / (1000 * 60 * 60);
      if (hoursUntilDue > 0 && hoursUntilDue <= 48) {
        return true;
      }
    }

    return false;
  });

  // Calendar navigation
  function goToday() {
    setCurrentDate(new Date());
  }

  function goToPrevious() {
    const newDate = new Date(currentDate);
    if (calendarView === 'day') {
      newDate.setDate(newDate.getDate() - 1);
    } else if (calendarView === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
  }

  function goToNext() {
    const newDate = new Date(currentDate);
    if (calendarView === 'day') {
      newDate.setDate(newDate.getDate() + 1);
    } else if (calendarView === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  }

  function getWeekDays(date) {
    const curr = new Date(date);
    const first = curr.getDate() - curr.getDay();
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(curr.setDate(first + i));
      days.push(new Date(d));
    }
    return days;
  }

  function getMonthDays(date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      const prevDate = new Date(year, month, i - startingDayOfWeek + 1);
      days.push(prevDate);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push(new Date(year, month + 1, i));
    }
    return days;
  }

  function getEventsForDate(date) {
    const dateStr = date.toISOString().split('T')[0];
    return calendarFilteredEvents.filter(evt => evt.date === dateStr);
  }

  function getItemsForDate(date) {
    const dateStr = date.toISOString().split('T')[0];
    return calendarFilteredItems.filter(item => {
      if (!item.dueDate) return false;
      const itemDateStr = item.dueDate.split('T')[0];
      return itemDateStr === dateStr;
    });
  }

  function formatDateRange() {
    if (calendarView === 'day') {
      return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    } else if (calendarView === 'week') {
      const days = getWeekDays(new Date(currentDate));
      const start = days[0];
      const end = days[6];
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    } else {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
  }

  function logAction(description) {
    const logEntry = {
      time: new Date().toLocaleTimeString(),
      action: description,
    };
    setActionLog([logEntry, ...actionLog]);
  }

  // Type and status badges
  const typeIcon = (type) => {
    const icons = {
      'assignment': '📝',
      'quiz': '❓',
      'discussion': '💬',
      'announcement': '📢',
      'checklist': '☑️',
      'content': '📄',
    };
    return icons[type] || '📋';
  };

  const typeBadgeClass = (type) => {
    const classes = {
      'assignment': 'badge-assignment',
      'quiz': 'badge-quiz',
      'discussion': 'badge-discussion',
      'announcement': 'badge-announcement',
      'checklist': 'badge-checklist',
      'content': 'badge-content',
    };
    return classes[type] || 'badge';
  };

  const isSubmittableType = (type) => ['assignment', 'quiz', 'discussion', 'checklist'].includes(type);

  // Unique course names for calendar course filter
  const uniqueCourses = [...new Set(items.map(t => t.courseName).filter(Boolean))].sort();

  // Course-filtered data for calendar views
  const calendarFilteredItems = courseFilter === 'all'
    ? items
    : items.filter(t => t.courseName === courseFilter);
  const calendarFilteredEvents = courseFilter === 'all'
    ? DEMO_CALENDAR_EVENTS
    : DEMO_CALENDAR_EVENTS.filter(e => e.courseName === courseFilter);

  // Filtered items (for item list, not calendar)
  let filteredItems = items;
  if (selectedTypeFilter !== 'all') {
    filteredItems = filteredItems.filter(item => item.type === selectedTypeFilter);
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--gray-100)' }}>
      {/* Sidebar */}
      <Sidebar role="instructor" activeSection="dashboard" />

      {/* Main Content */}
      <div style={{ flex: 1 }}>
        {/* Top Nav */}
        <nav className="topnav">
          <a className="topnav-logo" href="/instructor">
            <span className="topnav-logo-icon">C</span>
            CMU AI Calendar
            <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--gray-500)', marginLeft: '4px' }}>Instructor</span>
          </a>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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
                  color: 'var(--gray-500)',
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
            {!isDemo && conflicts.length > 0 && (
              <span className="badge badge-high">{conflicts.length} Conflicts</span>
            )}
            <span style={{ fontSize: '14px', fontWeight: '600' }}>Instructor</span>
            <a href="/dashboard" style={{ color: 'var(--gray-500)', textDecoration: 'none', fontSize: '13px', fontWeight: '500' }}>Student View →</a>
          </div>
        </nav>

        {/* Dashboard Container */}
        <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
          {/* Status Banners */}
          {isLoading && (
            <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '10px', padding: '16px 20px', marginBottom: '16px', fontSize: '14px', color: '#1E40AF', textAlign: 'center' }}>
              Loading instructor dashboard...
            </div>
          )}
          {isDemo && !isLoading && (
            <div style={{ background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: '10px', padding: '12px 20px', marginBottom: '16px', fontSize: '14px', color: '#92400E' }}>
              <strong>Demo Mode</strong> — Showing sample data. <a href="/setup" style={{ color: '#92400E', fontWeight: '600' }}>Complete setup</a> to connect live D2L data.
            </div>
          )}
          {!isDemo && !isLoading && (
            <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '10px', padding: '12px 20px', marginBottom: '16px', fontSize: '14px', color: '#065F46' }}>
              Connected to D2L — showing {items.length} items from calendar feed
            </div>
          )}

          {/* Date Conflict Resolution Panel */}
          {conflicts.length > 0 && !isLoading && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '16px 20px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#991B1B', marginBottom: '12px' }}>
                Date Conflicts ({conflicts.length}) — Requires Your Review
              </h3>
              <p style={{ fontSize: '13px', color: '#7F1D1D', marginBottom: '14px' }}>
                The dates below don&apos;t match between the D2L calendar and your uploaded documents. Please choose the correct date for each item.
              </p>
              {conflicts.slice(0, 5).map(conflict => (
                <div key={conflict.id} style={{ background: '#FFF', borderRadius: '8px', padding: '12px', marginBottom: '8px', border: '1px solid #FECACA' }}>
                  <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '6px' }}>{conflict.itemName || 'Unknown Item'}</div>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px' }}>{conflict.courseName}</div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button onClick={() => resolveConflict(conflict.id, 'resolve', { chosenDate: conflict.icalDate, chosenSource: 'ical' })}
                      style={{ padding: '6px 12px', background: '#5D0022', color: '#FFF', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                      Use D2L Date
                    </button>
                    <button onClick={() => resolveConflict(conflict.id, 'resolve', { chosenDate: conflict.uploadDate, chosenSource: 'upload' })}
                      style={{ padding: '6px 12px', background: '#059669', color: '#FFF', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                      Use Uploaded Date
                    </button>
                    <button onClick={() => resolveConflict(conflict.id, 'dismiss_all')}
                      style={{ padding: '6px 12px', background: '#6B7280', color: '#FFF', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Calendar Section */}
          <div id="calendar" className="card" style={{ marginBottom: '24px' }}>
            <div className="calendar-header">
              <h2 style={{ fontSize: '16px', fontWeight: '700' }}>Calendar View</h2>
              <div className="calendar-view-toggle">
                <button
                  className={`cal-view-btn ${calendarView === 'day' ? 'active' : ''}`}
                  onClick={() => setCalendarView('day')}
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

            <div className="calendar-nav">
              <button className="cal-nav-btn" onClick={goToPrevious}>←</button>
              <span style={{ fontSize: '14px', fontWeight: '600', minWidth: '180px', textAlign: 'center' }}>
                {formatDateRange()}
              </span>
              <button className="cal-nav-btn" onClick={goToNext}>→</button>
              <button className="cal-nav-today" onClick={goToday}>Today</button>
              <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '13px', marginLeft: 'auto' }}
                onClick={() => setShowManualEventModal(true)}>
                + Add Event
              </button>
            </div>

            {/* Course Filter */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid #E2E8F0' }}>
              <button className={`email-filter-btn ${courseFilter === 'all' ? 'active' : ''}`}
                onClick={() => setCourseFilter('all')} style={{ fontSize: '11px' }}>All Classes</button>
              {uniqueCourses.map(course => (
                <button key={course} className={`email-filter-btn ${courseFilter === course ? 'active' : ''}`}
                  onClick={() => setCourseFilter(course)} style={{ fontSize: '11px', borderLeft: `3px solid ${DEFAULT_COURSE_COLORS[course] || '#6B7280'}` }}>
                  {course}
                </button>
              ))}
            </div>

            {/* Week View */}
            {calendarView === 'week' && (
              <div className="week-view">
                {getWeekDays(new Date(currentDate)).map((day, idx) => {
                  const isToday = day.toDateString() === new Date('2026-03-11').toDateString();
                  const events = getEventsForDate(day);
                  const items = getItemsForDate(day);
                  return (
                    <div key={idx} className={`week-day-col ${isToday ? 'today' : ''}`}>
                      <div className="week-day-header">
                        <span className="week-day-name">{day.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                        <span className={`week-day-num ${isToday ? 'today-num' : ''}`}>
                          {day.getDate()}
                        </span>
                      </div>
                      <div className="week-day-events">
                        {events.map(evt => (
                          <div key={evt.id} className="week-event-chip" style={{ backgroundColor: evt.courseColor, color: 'white' }} title={evt.courseName || 'General'}>
                            <div style={{ fontSize: '9px', fontWeight: '700', opacity: 0.8, marginBottom: '1px' }}>{evt.courseName || 'General'}</div>
                            {evt.title}
                          </div>
                        ))}
                        {items.map(item => {
                          const sub = isSubmittableType(item.type);
                          return (
                          <div key={item.id} className="week-event-chip" style={{ background: (item.courseColor || '#6B7280') + (sub ? '22' : '11'), borderLeft: `3px solid ${item.courseColor || '#6B7280'}`, color: '#1E293B', opacity: sub ? 1 : 0.7 }} title={`${item.courseName}${sub && item.dueDate ? ' · Due ' + new Date(item.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}`}>
                            <div style={{ fontSize: '9px', fontWeight: '700', color: item.courseColor || '#6B7280', marginBottom: '1px' }}>{item.courseName}{sub && item.dueDate ? <span style={{ color: 'var(--gray-500)', fontWeight: '600' }}> · {new Date(item.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span> : !sub ? <span style={{ color: '#94A3B8' }}> · Info</span> : ''}</div>
                            {typeIcon(item.type)} {item.name.substring(0, 15)}...
                          </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Month View */}
            {calendarView === 'month' && (
              <div className="month-view">
                <div className="month-header-row">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="month-header-cell">{day}</div>
                  ))}
                </div>
                <div className="month-grid">
                  {getMonthDays(currentDate).map((day, idx) => {
                    const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                    const isToday = day.toDateString() === new Date('2026-03-11').toDateString();
                    const events = getEventsForDate(day);
                    const items = getItemsForDate(day);
                    const hasItems = events.length > 0 || items.length > 0;
                    return (
                      <div key={idx} className={`month-day-cell ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today-cell' : ''}`}>
                        <div className="month-day-num">
                          {isToday ? <span className="month-day-num today-num">{day.getDate()}</span> : day.getDate()}
                        </div>
                        {hasItems && (
                          <div className="month-dot-row">
                            {events.map(evt => (
                              <div key={evt.id} className="month-dot" style={{ background: evt.courseColor }} />
                            ))}
                            {items.map(item => (
                              <div key={item.id} className="month-dot task-dot-indicator" />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="month-legend">
                  <div className="legend-item">
                    <span className="month-dot outlook-dot"></span> <span>Course Event</span>
                  </div>
                  <div className="legend-item">
                    <span className="month-dot task-dot-indicator"></span> <span>Assignment Due</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Two-column grid */}
          <div className="dash-grid">
            {/* LEFT COLUMN — Items & Needs Attention */}
            <div>
              {/* Needs Attention Section */}
              {needsAttentionItems.length > 0 && (
                <div className="card" style={{ marginBottom: '20px', borderLeft: '4px solid #DC2626' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px', color: '#DC2626' }}>
                    🔴 Needs Attention ({needsAttentionItems.length})
                  </h3>
                  {needsAttentionItems.map(item => {
                    const dueTime = new Date(item.dueDate).getTime();
                    const now = new Date().getTime();
                    const hoursUntilDue = (dueTime - now) / (1000 * 60 * 60);
                    const isDueSoon = hoursUntilDue > 0 && hoursUntilDue <= 48;

                    return (
                      <div key={item.id} className="attention-item" style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: '10px', marginBottom: '10px' }}>
                        <span style={{ fontSize: '18px' }}>{typeIcon(item.type)}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: '600' }}>{item.name}</div>
                          <div style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
                            {item.hasConflict && 'Date conflict pending review'}
                            {item.pendingReview && 'Pending review'}
                            {isDueSoon && `Due in ${Math.round(hoursUntilDue)} hours`}
                          </div>
                        </div>
                        <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }}
                          onClick={() => logAction(`Reviewed ${item.name}`)}>
                          Review
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Items List with Filters */}
              <div id="assignments" className="card">
                <div style={{ marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px' }}>D2L Items</h3>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    <button
                      className={`email-filter-btn ${selectedTypeFilter === 'all' ? 'active' : ''}`}
                      onClick={() => setSelectedTypeFilter('all')}
                    >
                      All
                    </button>
                    {['assignment', 'quiz', 'discussion', 'announcement'].map(type => (
                      <button
                        key={type}
                        className={`email-filter-btn ${selectedTypeFilter === type ? 'active' : ''}`}
                        onClick={() => setSelectedTypeFilter(type)}
                      >
                        {typeIcon(type)} {type.charAt(0).toUpperCase() + type.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {(showAllItems ? filteredItems : filteredItems.slice(0, 5)).map(item => {
                  const submittable = isSubmittableType(item.type);
                  return (
                  <div key={item.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '14px',
                    borderRadius: '10px',
                    marginBottom: '8px',
                    borderLeft: '3px solid ' + item.courseColor,
                    background: '#FAFAFA',
                    transition: 'all 0.2s',
                    opacity: submittable ? 1 : 0.75,
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#F1F5F9'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#FAFAFA'}>
                    <span style={{ fontSize: '18px' }}>{typeIcon(item.type)}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: '600' }}>{item.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginBottom: '4px' }}>
                        {item.courseName} • {submittable && item.dueDate ? <span style={{ fontWeight: '600' }}>Due {new Date(item.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span> : !submittable ? <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>No submission required</span> : 'No due date'}
                      </div>
                      {item.points && (
                        <div style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
                          {item.points} points
                        </div>
                      )}
                    </div>

                    {/* Badges and Controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {!submittable && <span className="badge" style={{ background: 'var(--gray-100)', color: 'var(--gray-500)', fontSize: '10px' }}>Info</span>}
                      <span className={`badge ${typeBadgeClass(item.type)}`}>{item.type}</span>

                      {/* Action Buttons */}
                      <div className="item-actions">
                        <button className="item-action-btn" title="Edit"
                          onClick={() => logAction(`Edited ${item.name}`)}>
                          ✏️
                        </button>
                        <button className="item-action-btn" title="Extend deadline"
                          onClick={() => logAction(`Extended deadline for ${item.name}`)}>
                          📅
                        </button>
                        <button className="item-action-btn remove" title="Cancel item"
                          onClick={() => logAction(`Cancelled ${item.name}`)}>
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                  );
                })}

                {filteredItems.length > 5 && (
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
                    {showAllItems ? 'Show less' : `Show all ${filteredItems.length} items`}
                  </button>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN — Admin & Info */}
            <div>
              {/* Student View Toggle */}
              <div id="student-view" className="card" style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '700' }}>What Students See</h3>
                  <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '12px' }}
                    onClick={() => setShowStudentView(!showStudentView)}>
                    {showStudentView ? 'Hide' : 'Show'}
                  </button>
                </div>
                {showStudentView && (
                  <div style={{ fontSize: '12px', color: 'var(--gray-500)', background: 'var(--gray-100)', padding: '12px', borderRadius: '8px' }}>
                    <p style={{ marginBottom: '8px' }}>Students see generic course due dates only. Personal submission data is hidden.</p>
                    <div style={{ marginTop: '12px' }}>
                      {DEMO_CALENDAR_EVENTS.map(evt => (
                        <div key={evt.id} style={{
                          padding: '8px',
                          marginBottom: '4px',
                          background: evt.courseColor,
                          color: 'white',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '600',
                        }}>
                          {evt.title} • {evt.courseName}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Admin Links */}
              <div className="card">
                <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '14px' }}>Admin Tools</h3>
                <a href="/admin/health" className="btn btn-outline" style={{ display: 'block', width: '100%', textAlign: 'center', marginBottom: '8px', textDecoration: 'none' }}>
                  📊 Error Dashboard
                </a>
                <a href="/admin/feedback" className="btn btn-outline" style={{ display: 'block', width: '100%', textAlign: 'center', textDecoration: 'none' }}>
                  💬 Feedback Dashboard
                </a>
              </div>
            </div>
          </div>

          {/* Action Log */}
          <div className="card" style={{ marginTop: '24px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px' }}>Action Log</h3>
            <p style={{ fontSize: '12px', color: 'var(--gray-500)', marginBottom: '12px' }}>
              All actions logged for IT transparency and compliance auditing.
            </p>
            {actionLog.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#94A3B8', fontStyle: 'italic' }}>No actions logged this session.</p>
            ) : (
              actionLog.map((log, i) => (
                <div key={i} style={{
                  padding: '10px 12px',
                  background: 'var(--gray-100)',
                  borderRadius: '8px',
                  marginBottom: '6px',
                  fontSize: '13px',
                  borderLeft: '3px solid ' + DEFAULT_COURSE_COLORS['ENTR 450'],
                }}>
                  <span style={{ color: 'var(--gray-500)', fontWeight: '600' }}>{log.time}</span> — {log.action}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Manual Event Modal */}
      <ManualEventModal
        isOpen={showManualEventModal}
        onClose={() => setShowManualEventModal(false)}
        onSave={(eventData) => {
          logAction(`Added manual event: ${eventData.name}`);
          setShowManualEventModal(false);
        }}
      />
    </div>
  );
}
