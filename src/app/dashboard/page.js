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

function getPriorityLevel(task) {
  const hoursLeft = (new Date(task.dueDate) - new Date()) / (1000 * 60 * 60);
  const points = task.points || 10;
  if (hoursLeft <= 12 || (hoursLeft <= 24 && points >= 40)) return 'high';
  if (hoursLeft <= 48) return 'medium';
  return 'low';
}

export default function StudentDashboard() {
  const [tasks, setTasks] = useState(DEMO_TASKS);
  const [events, setEvents] = useState(DEMO_EVENTS);
  const [suggestions, setSuggestions] = useState(DEMO_SUGGESTIONS);
  const [isDemo, setIsDemo] = useState(true);

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
