'use client';

import { useState } from 'react';

// ============================================================
// Manual Event Modal — Create personal calendar entries
// Study blocks, reminders, personal events
// Used by both student and instructor dashboards
// ============================================================

const EVENT_TYPES = [
  { value: 'study', label: 'Study Block', icon: '📚', color: '#5D0022' },
  { value: 'reminder', label: 'Reminder', icon: '⏰', color: '#D97706' },
  { value: 'meeting', label: 'Meeting', icon: '👥', color: '#059669' },
  { value: 'personal', label: 'Personal', icon: '📌', color: '#DC2626' },
  { value: 'office_hours', label: 'Office Hours', icon: '🏫', color: '#7C3AED' },
  { value: 'exam_prep', label: 'Exam Prep', icon: '📝', color: '#0891B2' },
];

const REPEAT_OPTIONS = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'daily', label: 'Every day' },
  { value: 'weekly', label: 'Every week' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Every month' },
];

export function ManualEventModal({ isOpen, onClose, onSave, defaultDate }) {
  const [eventType, setEventType] = useState('study');
  const [name, setName] = useState('');
  const [date, setDate] = useState(defaultDate || new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [allDay, setAllDay] = useState(false);
  const [repeat, setRepeat] = useState('none');
  const [notes, setNotes] = useState('');
  const [course, setCourse] = useState('');

  if (!isOpen) return null;

  const selectedType = EVENT_TYPES.find(t => t.value === eventType);

  function handleSave(e) {
    e.preventDefault();
    if (!name.trim()) return;

    const event = {
      id: `manual-${Date.now()}`,
      type: 'manual',
      eventType,
      name: name.trim(),
      date,
      startTime: allDay ? null : startTime,
      endTime: allDay ? null : endTime,
      allDay,
      repeat,
      notes,
      courseName: course || null,
      courseColor: selectedType?.color || '#5D0022',
      source: 'manual',
      icon: selectedType?.icon || '📌',
      createdAt: new Date().toISOString(),
    };

    onSave(event);
    resetForm();
    onClose();
  }

  function resetForm() {
    setEventType('study');
    setName('');
    setDate(new Date().toISOString().split('T')[0]);
    setStartTime('09:00');
    setEndTime('10:00');
    setAllDay(false);
    setRepeat('none');
    setNotes('');
    setCourse('');
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0 }}>Add Calendar Event</h3>
          <button
            onClick={handleClose}
            style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94A3B8', padding: '4px' }}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSave}>
          {/* Event Type Selector */}
          <div className="form-group">
            <label className="form-label">Event Type</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
              {EVENT_TYPES.map(type => (
                <button
                  key={type.value}
                  type="button"
                  className={`event-type-btn ${eventType === type.value ? 'active' : ''}`}
                  style={{
                    borderColor: eventType === type.value ? type.color : undefined,
                    background: eventType === type.value ? `${type.color}10` : undefined,
                  }}
                  onClick={() => setEventType(type.value)}
                >
                  <span>{type.icon}</span>
                  <span style={{ fontSize: '11px' }}>{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Event Name */}
          <div className="form-group">
            <label className="form-label">Event Name</label>
            <input
              className="form-input"
              type="text"
              placeholder={eventType === 'study' ? 'e.g., Study for ACCT 301 exam' : 'e.g., Team project meeting'}
              value={name}
              onChange={e => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          {/* Date */}
          <div className="form-group">
            <label className="form-label">Date</label>
            <input
              className="form-input"
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
            />
          </div>

          {/* All day toggle + Times */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={allDay}
                onChange={e => setAllDay(e.target.checked)}
                style={{ accentColor: '#5D0022' }}
              />
              All day
            </label>
            {!allDay && (
              <>
                <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="form-label">Start</label>
                  <input className="form-input" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="form-label">End</label>
                  <input className="form-input" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
                </div>
              </>
            )}
          </div>

          {/* Repeat */}
          <div className="form-group">
            <label className="form-label">Repeat</label>
            <select className="form-input" value={repeat} onChange={e => setRepeat(e.target.value)}>
              {REPEAT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Course tag (optional) */}
          <div className="form-group">
            <label className="form-label">Link to Course <span style={{ fontWeight: '400', color: '#94A3B8' }}>(optional)</span></label>
            <input
              className="form-input"
              type="text"
              placeholder="e.g., ENTR 450"
              value={course}
              onChange={e => setCourse(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="form-group">
            <label className="form-label">Notes <span style={{ fontWeight: '400', color: '#94A3B8' }}>(optional)</span></label>
            <textarea
              className="form-input form-textarea"
              style={{ minHeight: '70px' }}
              placeholder="Add any details or reminders..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={handleClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={!name.trim()}>
              Add to Calendar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ManualEventModal;
