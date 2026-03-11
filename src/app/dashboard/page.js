'use client';

import { useState, useEffect } from 'react';

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
    status: 'pending', // pending, accepted, dismissed, snoozed
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

  // Get unique categories from suggestions
  const activeCategories = [...new Set(emailSuggestions.filter(s => s.status === 'pending').map(s => s.category))];

  // Filter suggestions by category
  const filteredSuggestions = emailSuggestions.filter(s => {
    if (s.status !== 'pending') return false;
    if (filterCategory === 'all') return true;
    return s.category === filterCategory;
  });

  // Snoozed suggestions
  const snoozedSuggestions = emailSuggestions.filter(s => s.status === 'snoozed');

  // Handle scanning inbox
  async function handleScanInbox() {
    if (isDemo) {
      // In demo mode, simulate a scan
      setScanning(true);
      setScanComplete(false);
      setTimeout(() => {
        setScanning(false);
        setScanComplete(true);
        setEmailsScanned(47);
        // Reset demo suggestions to show fresh results
        setEmailSuggestions(DEMO_EMAIL_SUGGESTIONS.map(s => ({ ...s, status: 'pending' })));
      }, 2000);
      return;
    }

    // Real scan — call API
    setScanning(true);
    setScanComplete(false);
    try {
      const res = await fetch('/api/email/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: '', // TODO: get from session
          user: '', // TODO: get from session
          days: 7,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEmailsScanned(data.emailsScanned);
        setEmailSuggestions(data.suggestions.map((s, i) => ({
          ...s,
          id: `scan-${i}`,
          status: 'pending',
        })));
        setScanComplete(true);
      }
    } catch (err) {
      console.error('Scan failed:', err);
    }
    setScanning(false);
  }

  // Accept a suggestion — add to calendar
  function handleAccept(suggestionId) {
    setEmailSuggestions(prev => prev.map(s =>
      s.id === suggestionId ? { ...s, status: 'accepted' } : s
    ));

    if (!isDemo) {
      const suggestion = emailSuggestions.find(s => s.id === suggestionId);
      fetch('/api/email/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: '', // TODO: get from session
          user: '',
          suggestion,
        }),
      });
    }
  }

  // Dismiss a suggestion
  function handleDismiss(suggestionId) {
    setEmailSuggestions(prev => prev.map(s =>
      s.id === suggestionId ? { ...s, status: 'dismissed' } : s
    ));
  }

  // Snooze — remind later
  function handleSnooze(suggestionId) {
    setEmailSuggestions(prev => prev.map(s =>
      s.id === suggestionId ? { ...s, status: 'snoozed' } : s
    ));
  }

  // Unsnooze
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

          {/* RIGHT: Today's Calendar */}
          <div className="card">
            <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>&#128197;</span> Today&apos;s Calendar
            </h2>
            {events.map(event => (
              <div key={event.id} className="task-item" style={{ background: '#DBEAFE' }}>
                <div className="task-dot outlook"></div>
                <div className="task-info">
                  <div className="task-name">{event.name}</div>
                  <div className="task-meta">{formatTime(event.start)} — {formatTime(event.end)}</div>
                </div>
                <span className="badge badge-outlook">Outlook</span>
              </div>
            ))}
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
              return (
                <div key={suggestion.id} className="email-suggestion-card">
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
