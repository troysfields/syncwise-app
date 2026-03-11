

import { useState, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar';
import { ThemeToggle } from '../components/ThemeProvider';
import { NotificationCenter } from '../components/NotificationCenter';
import { ManualEventModal } from '../components/ManualEventModal';

// ============================================================
// COURSE COLORS — Same as student dashboard
// ============================================================

const COURSE_COLORS = {
  'ENTR 450': '#4F46E5',
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
    courseColor: COURSE_COLORS['ENTR 450'],
    dueDate: '2026-03-11T23:59:00',
    points: 50,
    submissions: 34,
    totalStudents: 38,
    ungraded: 12,
    averageScore: 87,
    source: 'd2l',
  },
  {
    id: 'd2l-asgn-2',
    type: 'assignment',
    name: 'Idea Journal #3',
    courseName: 'ENTR 343',
    courseColor: COURSE_COLORS['ENTR 343'],
    dueDate: '2026-03-13T23:59:00',
    points: 25,
    submissions: 28,
    totalStudents: 32,
    ungraded: 28,
    averageScore: null,
    source: 'd2l',
  },
  {
    id: 'd2l-asgn-3',
    type: 'assignment',
    name: 'Case Study Write-up',
    courseName: 'BUS 201',
    courseColor: COURSE_COLORS['BUS 201'],
    dueDate: '2026-03-14T23:59:00',
    points: 40,
    submissions: 18,
    totalStudents: 28,
    ungraded: 0,
    averageScore: 91,
    source: 'd2l',
  },
  {
    id: 'd2l-asgn-4',
    type: 'assignment',
    name: 'Financial Projections',
    courseName: 'ENTR 450',
    courseColor: COURSE_COLORS['ENTR 450'],
    dueDate: '2026-03-18T23:59:00',
    points: 75,
    submissions: 5,
    totalStudents: 38,
    ungraded: 5,
    averageScore: null,
    source: 'd2l',
  },
  {
    id: 'd2l-asgn-5',
    type: 'assignment',
    name: 'Accounting Problem Set',
    courseName: 'ACCT 301',
    courseColor: COURSE_COLORS['ACCT 301'],
    dueDate: '2026-03-12T17:00:00',
    points: 30,
    submissions: 26,
    totalStudents: 30,
    ungraded: 3,
    averageScore: 94,
    source: 'd2l',
  },
  {
    id: 'd2l-asgn-6',
    type: 'assignment',
    name: 'Code Review Assignment',
    courseName: 'CSCI 110',
    courseColor: COURSE_COLORS['CSCI 110'],
    dueDate: '2026-03-15T23:59:00',
    points: 100,
    submissions: 20,
    totalStudents: 25,
    ungraded: 20,
    averageScore: null,
    source: 'd2l',
  },

  // Quizzes
  {
    id: 'd2l-quiz-1',
    type: 'quiz',
    name: 'Chapter 8 Quiz',
    courseName: 'ACCT 301',
    courseColor: COURSE_COLORS['ACCT 301'],
    dueDate: '2026-03-11T17:00:00',
    points: 10,
    attempts: 29,
    totalStudents: 30,
    averageScore: 89,
    source: 'd2l',
  },
  {
    id: 'd2l-quiz-2',
    type: 'quiz',
    name: 'Venture Fundamentals Quiz',
    courseName: 'ENTR 450',
    courseColor: COURSE_COLORS['ENTR 450'],
    dueDate: '2026-03-13T23:59:00',
    points: 15,
    attempts: 22,
    totalStudents: 38,
    averageScore: 76,
    source: 'd2l',
  },
  {
    id: 'd2l-quiz-3',
    type: 'quiz',
    name: 'Intro to Business Quiz',
    courseName: 'BUS 201',
    courseColor: COURSE_COLORS['BUS 201'],
    dueDate: '2026-03-12T23:59:00',
    points: 20,
    attempts: 15,
    totalStudents: 28,
    averageScore: 82,
    source: 'd2l',
  },

  // Discussions
  {
    id: 'd2l-disc-1',
    type: 'discussion',
    name: 'Week 3: Competitive Analysis Discussion',
    courseName: 'ENTR 450',
    courseColor: COURSE_COLORS['ENTR 450'],
    dueDate: '2026-03-14T23:59:00',
    postCount: 47,
    studentParticipation: 28,
    unansweredPosts: 5,
    source: 'd2l',
  },
  {
    id: 'd2l-disc-2',
    type: 'discussion',
    name: 'GAAP Standards Discussion',
    courseName: 'ACCT 301',
    courseColor: COURSE_COLORS['ACCT 301'],
    dueDate: '2026-03-15T23:59:00',
    postCount: 12,
    studentParticipation: 11,
    unansweredPosts: 0,
    source: 'd2l',
  },
  {
    id: 'd2l-disc-3',
    type: 'discussion',
    name: 'Business Ethics Case Study',
    courseName: 'BUS 201',
    courseColor: COURSE_COLORS['BUS 201'],
    dueDate: '2026-03-13T23:59:00',
    postCount: 34,
    studentParticipation: 24,
    unansweredPosts: 3,
    source: 'd2l',
  },

  // Announcements
  {
    id: 'd2l-announce-1',
    type: 'announcement',
    name: 'Upcoming Exam Schedule',
    courseName: 'ACCT 301',
    courseColor: COURSE_COLORS['ACCT 301'],
    postedDate: '2026-03-10T08:00:00',
    source: 'd2l',
  },
  {
    id: 'd2l-announce-2',
    type: 'announcement',
    name: 'Office Hours Extended Thursday',
    courseName: 'ENTR 450',
    courseColor: COURSE_COLORS['ENTR 450'],
    postedDate: '2026-03-09T14:30:00',
    source: 'd2l',
  },
  {
    id: 'd2l-announce-3',
    type: 'announcement',
    name: 'Guest Speaker Next Week',
    courseName: 'BUS 201',
    courseColor: COURSE_COLORS['BUS 201'],
    postedDate: '2026-03-08T10:00:00',
    source: 'd2l',
  },

  // Content & Checklists
  {
    id: 'd2l-content-1',
    type: 'content',
    name: 'Module 4: Market Analysis Framework',
    courseName: 'ENTR 450',
    courseColor: COURSE_COLORS['ENTR 450'],
    dueDate: '2026-03-11T23:59:00',
    source: 'd2l',
  },
  {
    id: 'd2l-check-1',
    type: 'checklist',
    name: 'Chapter 7 Reading Checklist',
    courseName: 'ACCT 301',
    courseColor: COURSE_COLORS['ACCT 301'],
    dueDate: '2026-03-12T23:59:00',
    completedCount: 24,
    totalCount: 30,
    source: 'd2l',
  },
];

const DEMO_CALENDAR_EVENTS = [
  {
    id: 'evt-1',
    title: 'Section IV Due',
    courseName: 'ENTR 450',
    courseColor: COURSE_COLORS['ENTR 450'],
    date: '2026-03-11',
  },
  {
    id: 'evt-2',
    title: 'Chapter 8 Quiz Due',
    courseName: 'ACCT 301',
    courseColor: COURSE_COLORS['ACCT 301'],
    date: '2026-03-11',
  },
  {
    id: 'evt-3',
    title: 'Case Study Due',
    courseName: 'BUS 201',
    courseColor: COURSE_COLORS['BUS 201'],
    date: '2026-03-14',
  },
  {
    id: 'evt-4',
    title: 'Financial Projections Due',
    courseName: 'ENTR 450',
    courseColor: COURSE_COLORS['ENTR 450'],
    date: '2026-03-18',
  },
];

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function InstructorDashboard() {
  const [calendarView, setCalendarView] = useState('week');
  const [currentDate, setCurrentDate] = useState(new Date('2026-03-11'));
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [showManualEventModal, setShowManualEventModal] = useState(false);
  const [showStudentView, setShowStudentView] = useState(false);
  const [showPostAnnouncement, setShowPostAnnouncement] = useState(false);
  const [announcementData, setAnnouncementData] = useState({
    courseId: 'ENTR 450',
    title: '',
    body: '',
  });
  const [showConfirmPost, setShowConfirmPost] = useState(false);
  const [actionLog, setActionLog] = useState([]);

  // Determine which items need attention (instructor-specific)
  const needsAttentionItems = DEMO_ITEMS.filter(item => {
    if (item.type === 'assignment' && item.ungraded > 0 && item.ungraded === item.submissions) {
      return true; // Ungraded submissions
    }
    if (item.type === 'assignment' && item.submissions / item.totalStudents < 0.5) {
      return true; // Low submission rate
    }
    if (item.type === 'discussion' && item.unansweredPosts > 0) {
      return true; // Unanswered discussion posts
    }
    return false;
  });

  // Calendar navigation
  function goToday() {
    setCurrentDate(new Date('2026-03-11'));
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
    return DEMO_CALENDAR_EVENTS.filter(evt => evt.date === dateStr);
  }

  function getItemsForDate(date) {
    const dateStr = date.toISOString().split('T')[0];
    return DEMO_ITEMS.filter(item => {
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

  function handlePostAnnouncement() {
    if (!announcementData.title || !announcementData.body) return;

    const logEntry = {
      time: new Date().toLocaleTimeString(),
      action: `Posted announcement "${announcementData.title}" to ${announcementData.courseId}`,
    };
    setActionLog([logEntry, ...actionLog]);

    setAnnouncementData({ courseId: 'ENTR 450', title: '', body: '' });
    setShowPostAnnouncement(false);
    setShowConfirmPost(false);
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

  const getSubmissionRate = (item) => {
    if (!item.submissions || !item.totalStudents) return 0;
    return (item.submissions / item.totalStudents) * 100;
  };

  const getSubmissionColor = (rate) => {
    if (rate >= 80) return '#059669';
    if (rate >= 50) return '#D97706';
    return '#DC2626';
  };

  // Filtered items
  let filteredItems = DEMO_ITEMS;
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
            <span className="topnav-logo-icon">S</span>
            SyncWise AI
            <span style={{ fontSize: '12px', fontWeight: '500', color: '#64748B', marginLeft: '4px' }}>Instructor</span>
          </a>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <ThemeToggle />
            <NotificationCenter />
            <span className="badge badge-medium">Demo Mode</span>
            <span style={{ fontSize: '14px', fontWeight: '600' }}>Prof. Jouflas</span>
            <a href="/dashboard" style={{ color: '#64748B', textDecoration: 'none', fontSize: '13px', fontWeight: '500' }}>Student View →</a>
          </div>
        </nav>

        {/* Dashboard Container */}
        <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
          {/* Calendar Section */}
          <div className="card" style={{ marginBottom: '24px' }}>
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
                          <div key={evt.id} className="week-event-chip" style={{ backgroundColor: evt.courseColor, color: 'white' }}>
                            {evt.title}
                          </div>
                        ))}
                        {items.map(item => (
                          <div key={item.id} className="week-event-chip task-chip-high">
                            {typeIcon(item.type)} {item.name.substring(0, 15)}...
                          </div>
                        ))}
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
                  {needsAttentionItems.map(item => (
                    <div key={item.id} className="attention-item" style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: '10px', marginBottom: '10px' }}>
                      <span style={{ fontSize: '18px' }}>{typeIcon(item.type)}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: '600' }}>{item.name}</div>
                        <div style={{ fontSize: '12px', color: '#64748B' }}>
                          {item.type === 'assignment' && item.ungraded > 0 && `${item.ungraded} submissions ungraded`}
                          {item.type === 'assignment' && item.submissions / item.totalStudents < 0.5 && `${Math.round((item.submissions / item.totalStudents) * 100)}% submitted`}
                          {item.type === 'discussion' && item.unansweredPosts > 0 && `${item.unansweredPosts} unanswered posts`}
                        </div>
                      </div>
                      <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }}
                        onClick={() => logAction(`Reviewed ${item.name}`)}>
                        Review
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Items List with Filters */}
              <div className="card">
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

                {filteredItems.map(item => (
                  <div key={item.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '14px',
                    borderRadius: '10px',
                    marginBottom: '8px',
                    borderLeft: item.type === 'assignment' && item.ungraded > 0 ? '3px solid #DC2626' : '3px solid ' + item.courseColor,
                    background: '#FAFAFA',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#F1F5F9'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#FAFAFA'}>
                    <span style={{ fontSize: '18px' }}>{typeIcon(item.type)}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: '600' }}>{item.name}</div>
                      <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '4px' }}>
                        {item.courseName} • {item.dueDate ? new Date(item.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit' }) : 'No due date'}
                      </div>

                      {/* Submission Rate Bar for Assignments */}
                      {item.type === 'assignment' && (
                        <div style={{ marginTop: '6px' }}>
                          <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '3px', fontWeight: '500' }}>
                            {item.submissions} of {item.totalStudents} submitted
                          </div>
                          <div className="course-progress-bar" style={{ height: '4px' }}>
                            <div className="course-progress-fill" style={{
                              width: `${getSubmissionRate(item)}%`,
                              background: getSubmissionColor(getSubmissionRate(item)),
                            }} />
                          </div>
                        </div>
                      )}

                      {/* Quiz Stats */}
                      {item.type === 'quiz' && (
                        <div style={{ fontSize: '11px', color: '#64748B' }}>
                          {item.attempts} attempts • Avg: {item.averageScore}%
                        </div>
                      )}

                      {/* Discussion Stats */}
                      {item.type === 'discussion' && (
                        <div style={{ fontSize: '11px', color: '#64748B' }}>
                          {item.postCount} posts • {item.studentParticipation} students
                          {item.unansweredPosts > 0 && <span style={{ color: '#DC2626', fontWeight: '600', marginLeft: '8px' }}>• {item.unansweredPosts} unanswered</span>}
                        </div>
                      )}
                    </div>

                    {/* Badges and Controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={`badge ${typeBadgeClass(item.type)}`}>{item.type}</span>

                      {item.type === 'assignment' && item.ungraded > 0 && (
                        <span className="badge badge-danger" style={{ background: '#FEE2E2', color: '#DC2626' }}>
                          {item.ungraded} ungraded
                        </span>
                      )}

                      {item.type === 'assignment' && item.averageScore && (
                        <span className="badge badge-graded">
                          {item.averageScore}% avg
                        </span>
                      )}

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
                ))}
              </div>
            </div>

            {/* RIGHT COLUMN — Grading, Announcements, Admin */}
            <div>
              {/* Grading-Needed Summary */}
              <div className="card" style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '14px' }}>Grading Queue</h3>
                {DEMO_ITEMS.filter(i => i.type === 'assignment' && i.ungraded > 0).map(item => (
                  <div key={item.id} style={{ paddingBottom: '14px', borderBottom: '1px solid #F1F5F9', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '600' }}>{item.name}</span>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: '#DC2626' }}>{item.ungraded} ungraded</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '8px' }}>
                      Due: {new Date(item.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {item.averageScore && (
                      <div style={{ fontSize: '12px', color: '#64748B' }}>Average: {item.averageScore}%</div>
                    )}
                    <button className="btn btn-primary" style={{ width: '100%', marginTop: '8px', padding: '8px', fontSize: '12px' }}
                      onClick={() => logAction(`Started grading ${item.name}`)}>
                      Grade Submissions
                    </button>
                  </div>
                ))}
              </div>

              {/* Quick Post Announcement */}
              <div className="card" style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '14px' }}>Post Announcement</h3>
                <div className="form-group">
                  <label className="form-label">Course</label>
                  <select className="form-input" value={announcementData.courseId}
                    onChange={(e) => setAnnouncementData({ ...announcementData, courseId: e.target.value })}>
                    {Object.keys(COURSE_COLORS).map(course => (
                      <option key={course} value={course}>{course}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Title</label>
                  <input className="form-input" placeholder="Announcement title"
                    value={announcementData.title}
                    onChange={(e) => setAnnouncementData({ ...announcementData, title: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Body</label>
                  <textarea className="form-input form-textarea" placeholder="Announcement body..."
                    value={announcementData.body}
                    onChange={(e) => setAnnouncementData({ ...announcementData, body: e.target.value })} />
                </div>
                <button className="btn btn-primary" style={{ width: '100%' }}
                  disabled={!announcementData.title || !announcementData.body}
                  onClick={() => setShowConfirmPost(true)}>
                  Post to D2L
                </button>
              </div>

              {/* Student View Toggle */}
              <div className="card" style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '700' }}>What Students See</h3>
                  <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '12px' }}
                    onClick={() => setShowStudentView(!showStudentView)}>
                    {showStudentView ? 'Hide' : 'Show'}
                  </button>
                </div>
                {showStudentView && (
                  <div style={{ fontSize: '12px', color: '#64748B', background: '#F1F5F9', padding: '12px', borderRadius: '8px' }}>
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
            <p style={{ fontSize: '12px', color: '#64748B', marginBottom: '12px' }}>
              All actions logged for IT transparency and compliance auditing.
            </p>
            {actionLog.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#94A3B8', fontStyle: 'italic' }}>No actions logged this session.</p>
            ) : (
              actionLog.map((log, i) => (
                <div key={i} style={{
                  padding: '10px 12px',
                  background: '#F1F5F9',
                  borderRadius: '8px',
                  marginBottom: '6px',
                  fontSize: '13px',
                  borderLeft: '3px solid ' + COURSE_COLORS['ENTR 450'],
                }}>
                  <span style={{ color: '#64748B', fontWeight: '600' }}>{log.time}</span> — {log.action}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Manual Event Modal */}
      {showManualEventModal && (
        <ManualEventModal
          isOpen={showManualEventModal}
          onClose={() => setShowManualEventModal(false)}
          onSubmit={(eventData) => {
            logAction(`Added manual event: ${eventData.title}`);
            setShowManualEventModal(false);
          }}
        />
      )}

      {/* Confirm Post Announcement Modal */}
      {showConfirmPost && (
        <div className="modal-overlay" onClick={() => setShowConfirmPost(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Confirm Announcement</h3>
            <p>You're about to post this announcement to {announcementData.courseId}:</p>
            <div style={{
              background: '#EEF2FF',
              border: '1px solid #C7D2FE',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px',
            }}>
              <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '4px' }}>
                {announcementData.title}
              </div>
              <div style={{ fontSize: '12px', color: '#64748B', lineHeight: '1.5' }}>
                {announcementData.body}
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowConfirmPost(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handlePostAnnouncement}>
                Confirm & Post
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
