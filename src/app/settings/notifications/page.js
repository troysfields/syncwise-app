'use client';

import { useState, useEffect } from 'react';
import { DEFAULT_PREFERENCES, NOTIFICATION_PRESETS, requestPushPermission, getPushPermission } from '../../../lib/notifications';
import { Sidebar } from '../../components/Sidebar';
import { ThemeToggle } from '../../components/ThemeProvider';
import { NotificationCenter } from '../../components/NotificationCenter';

// ============================================================
// Notification Preferences Page
// Per-item-type controls, timing, methods, quiet hours,
// per-course overrides, preset profiles
// ============================================================

const TIMING_OPTIONS = [
  { value: 168, label: '1 week' },
  { value: 48, label: '48 hours' },
  { value: 24, label: '24 hours' },
  { value: 12, label: '12 hours' },
  { value: 6, label: '6 hours' },
  { value: 2, label: '2 hours' },
  { value: 1, label: '1 hour' },
  { value: 0.5, label: '30 min' },
];

const METHOD_OPTIONS = [
  { value: 'both', label: 'Push + Bell' },
  { value: 'push', label: 'Push Only' },
  { value: 'bell', label: 'Bell Only' },
  { value: 'none', label: 'Off' },
];

const ITEM_TYPE_LABELS = {
  assignment: { label: 'Assignments', icon: '📝', description: 'Due date reminders for assignments and dropbox submissions' },
  quiz: { label: 'Quizzes', icon: '❓', description: 'Quiz availability and deadline alerts' },
  discussion: { label: 'Discussions', icon: '💬', description: 'New posts, replies, and discussion deadlines' },
  announcement: { label: 'Announcements', icon: '📢', description: 'New announcements from instructors' },
  checklist: { label: 'Checklists', icon: '☑️', description: 'Checklist item reminders' },
  content: { label: 'Course Content', icon: '📄', description: 'New content posted by instructors' },
  grade: { label: 'Grades', icon: '🎯', description: 'New grades posted' },
  calendar: { label: 'Calendar Events', icon: '📅', description: 'Upcoming calendar events and meetings' },
};

// Demo courses for the per-course override section
const DEMO_COURSES = [
  { id: 'ENTR 450', name: 'ENTR 450', color: '#5D0022' },
  { id: 'ACCT 301', name: 'ACCT 301', color: '#059669' },
  { id: 'ENTR 343', name: 'ENTR 343', color: '#D97706' },
  { id: 'BUS 201', name: 'BUS 201', color: '#DC2626' },
  { id: 'CSCI 110', name: 'CSCI 110', color: '#7C3AED' },
];

export default function NotificationPreferencesPage() {
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [pushPermission, setPushPermission] = useState('default');
  const [activeSection, setActiveSection] = useState('notifications');
  const [saved, setSaved] = useState(false);
  const [expandedCourse, setExpandedCourse] = useState(null);

  useEffect(() => {
    setPushPermission(getPushPermission());
  }, []);

  function updatePreferences(updater) {
    setPreferences(prev => {
      const updated = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      return updated;
    });
    setSaved(false);
  }

  function applyPreset(presetKey) {
    const preset = NOTIFICATION_PRESETS[presetKey];
    if (!preset) return;
    updatePreferences(prev => ({
      ...prev,
      preset: presetKey,
      itemTypes: { ...prev.itemTypes, ...preset.config.itemTypes },
    }));
  }

  function updateItemType(type, field, value) {
    updatePreferences(prev => ({
      ...prev,
      preset: 'custom',
      itemTypes: {
        ...prev.itemTypes,
        [type]: { ...prev.itemTypes[type], [field]: value },
      },
    }));
  }

  function toggleTiming(type, hours) {
    const current = preferences.itemTypes[type]?.timing || [];
    const newTiming = current.includes(hours)
      ? current.filter(h => h !== hours)
      : [...current, hours].sort((a, b) => b - a);
    updateItemType(type, 'timing', newTiming);
  }

  function updateCourseOverride(courseName, type, field, value) {
    updatePreferences(prev => ({
      ...prev,
      courseOverrides: {
        ...prev.courseOverrides,
        [courseName]: {
          ...(prev.courseOverrides[courseName] || {}),
          [type]: {
            ...(prev.courseOverrides[courseName]?.[type] || {}),
            [field]: value,
          },
        },
      },
    }));
  }

  async function handleEnablePush() {
    const result = await requestPushPermission();
    setPushPermission(result);
  }

  function handleSave() {
    // In production, this would POST to an API
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div>
      {/* Top Nav */}
      <nav className="topnav">
        <a className="topnav-logo" href="/dashboard">
          <span className="topnav-logo-icon">C</span>
          CMU AI Calendar
        </a>
        <div className="topnav-user">
          <ThemeToggle />
          <NotificationCenter />
          <span className="badge badge-medium">Demo Mode</span>
          <span>Troy Fields</span>
        </div>
      </nav>

      <div className="layout-with-sidebar">
        <Sidebar role="student" activeSection={activeSection} onNavigate={setActiveSection} />

        <main className="main-content">
          <div className="settings-container">
            <div className="settings-header">
              <h1>Notification Preferences</h1>
              <p>Control how and when CMU AI Calendar alerts you. Changes apply immediately.</p>
            </div>

            {/* Browser Push Permission */}
            {pushPermission !== 'granted' && (
              <div className="card" style={{ marginBottom: '20px', background: '#FDF2F4', border: '1px solid #E8B4BF', color: '#1F2937' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '24px' }}>🔔</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '4px', color: '#5D0022' }}>Enable Browser Notifications</div>
                    <div style={{ fontSize: '13px', color: '#4B5563' }}>
                      {pushPermission === 'denied'
                        ? 'Browser notifications are blocked. Enable them in your browser settings.'
                        : 'Get alerts even when you\'re not on the CMU AI Calendar tab.'}
                    </div>
                  </div>
                  {pushPermission !== 'denied' && (
                    <button className="btn btn-primary" onClick={handleEnablePush}>Enable</button>
                  )}
                </div>
              </div>
            )}

            {/* Preset Profiles */}
            <div className="card" style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '4px' }}>Quick Presets</h2>
              <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '16px' }}>Start from a preset and customize from there.</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                {Object.entries(NOTIFICATION_PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    className={`preset-card ${preferences.preset === key ? 'active' : ''}`}
                    onClick={() => applyPreset(key)}
                  >
                    <div className="preset-card-label">{preset.label}</div>
                    <div className="preset-card-desc">{preset.description}</div>
                  </button>
                ))}
                <div className={`preset-card ${preferences.preset === 'custom' ? 'active' : ''}`}
                  style={{ cursor: 'default', opacity: preferences.preset === 'custom' ? 1 : 0.5 }}>
                  <div className="preset-card-label">Custom</div>
                  <div className="preset-card-desc">Your own configuration</div>
                </div>
              </div>
            </div>

            {/* Quiet Hours */}
            <div className="card" style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '4px' }}>Quiet Hours</h2>
                  <p style={{ fontSize: '13px', color: '#64748B' }}>Push notifications are held during these hours. Bell still collects everything.</p>
                </div>
                <label className="toggle-switch" aria-label="Toggle quiet hours">
                  <input
                    type="checkbox"
                    checked={preferences.quietHours.enabled}
                    onChange={e => updatePreferences(prev => ({
                      ...prev,
                      quietHours: { ...prev.quietHours, enabled: e.target.checked }
                    }))}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>
              {preferences.quietHours.enabled && (
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Start</label>
                    <input
                      type="time"
                      className="form-input"
                      style={{ width: '140px' }}
                      value={preferences.quietHours.start}
                      onChange={e => updatePreferences(prev => ({
                        ...prev,
                        quietHours: { ...prev.quietHours, start: e.target.value }
                      }))}
                    />
                  </div>
                  <span style={{ fontSize: '13px', color: '#64748B', marginTop: '20px' }}>to</span>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">End</label>
                    <input
                      type="time"
                      className="form-input"
                      style={{ width: '140px' }}
                      value={preferences.quietHours.end}
                      onChange={e => updatePreferences(prev => ({
                        ...prev,
                        quietHours: { ...prev.quietHours, end: e.target.value }
                      }))}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Per-Item-Type Settings */}
            <div className="card" style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '4px' }}>Per-Type Settings</h2>
              <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '16px' }}>Customize alerts for each type of D2L item.</p>

              {Object.entries(ITEM_TYPE_LABELS).map(([type, meta]) => {
                const settings = preferences.itemTypes[type] || {};
                return (
                  <div key={type} className="notification-type-row">
                    <div className="notification-type-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '18px' }}>{meta.icon}</span>
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '14px' }}>{meta.label}</div>
                          <div style={{ fontSize: '12px', color: '#64748B' }}>{meta.description}</div>
                        </div>
                      </div>
                      <label className="toggle-switch" aria-label={`Toggle ${meta.label} notifications`}>
                        <input
                          type="checkbox"
                          checked={settings.enabled !== false}
                          onChange={e => updateItemType(type, 'enabled', e.target.checked)}
                        />
                        <span className="toggle-slider" />
                      </label>
                    </div>

                    {settings.enabled !== false && (
                      <div className="notification-type-settings">
                        {/* Alert method */}
                        <div style={{ marginBottom: '10px' }}>
                          <label className="form-label" style={{ marginBottom: '6px' }}>Alert Method</label>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {METHOD_OPTIONS.map(opt => (
                              <button
                                key={opt.value}
                                className={`email-filter-btn ${settings.method === opt.value ? 'active' : ''}`}
                                onClick={() => updateItemType(type, 'method', opt.value)}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Alert timing (only for types with due dates) */}
                        {['assignment', 'quiz', 'discussion', 'checklist', 'calendar'].includes(type) && (
                          <div>
                            <label className="form-label" style={{ marginBottom: '6px' }}>Remind me before due:</label>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              {TIMING_OPTIONS.map(opt => (
                                <button
                                  key={opt.value}
                                  className={`email-filter-btn ${(settings.timing || []).includes(opt.value) ? 'active' : ''}`}
                                  onClick={() => toggleTiming(type, opt.value)}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Per-Course Overrides */}
            <div className="card" style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '4px' }}>Per-Course Overrides</h2>
              <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '16px' }}>
                Override notification settings for specific courses. Default settings apply to courses without overrides.
              </p>

              {DEMO_COURSES.map(course => (
                <div key={course.id} className="course-override-section">
                  <button
                    className="course-override-header"
                    onClick={() => setExpandedCourse(expandedCourse === course.id ? null : course.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="course-color-dot" style={{ background: course.color }} />
                      <span style={{ fontWeight: '600', fontSize: '14px' }}>{course.name}</span>
                      {preferences.courseOverrides[course.id] && (
                        <span className="badge badge-low" style={{ fontSize: '10px' }}>Custom</span>
                      )}
                    </div>
                    <span style={{ color: '#94A3B8' }}>{expandedCourse === course.id ? '▲' : '▼'}</span>
                  </button>

                  {expandedCourse === course.id && (
                    <div className="course-override-body">
                      {Object.entries(ITEM_TYPE_LABELS).map(([type, meta]) => (
                        <div key={type} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '14px' }}>{meta.icon}</span>
                            <span style={{ fontSize: '13px' }}>{meta.label}</span>
                          </div>
                          <select
                            className="form-input"
                            style={{ width: '140px', padding: '4px 8px', fontSize: '12px' }}
                            value={preferences.courseOverrides[course.id]?.[type]?.method || 'default'}
                            onChange={e => {
                              if (e.target.value === 'default') {
                                // Remove override
                                updatePreferences(prev => {
                                  const overrides = { ...prev.courseOverrides };
                                  if (overrides[course.id]) {
                                    delete overrides[course.id][type];
                                    if (Object.keys(overrides[course.id]).length === 0) {
                                      delete overrides[course.id];
                                    }
                                  }
                                  return { ...prev, courseOverrides: overrides };
                                });
                              } else {
                                updateCourseOverride(course.id, type, 'method', e.target.value);
                              }
                            }}
                          >
                            <option value="default">Default</option>
                            <option value="both">Push + Bell</option>
                            <option value="push">Push Only</option>
                            <option value="bell">Bell Only</option>
                            <option value="none">Off</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Save Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginBottom: '40px' }}>
              {saved && (
                <span style={{ color: '#059669', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Saved
                </span>
              )}
              <button className="btn btn-primary" onClick={handleSave}>
                Save Preferences
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
