'use client';

import { useState } from 'react';

// Instructor Dashboard — Create assignments, edit due dates, post content
// Every write action requires explicit confirmation before executing

export default function InstructorDashboard() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [assignments, setAssignments] = useState([
    { id: 1, name: 'Section IV-A: Market Analysis', dueDate: '2026-03-11T23:59:00', points: 50, status: 'active' },
    { id: 2, name: 'Discussion 5', dueDate: '2026-03-12T23:59:00', points: 15, status: 'active' },
    { id: 3, name: 'Section II: Company & Product', dueDate: '2026-03-22T23:59:00', points: 50, status: 'active' },
  ]);
  const [newAssignment, setNewAssignment] = useState({
    name: '', instructions: '', dueDate: '', dueTime: '23:59', points: '',
  });
  const [editingId, setEditingId] = useState(null);
  const [editDate, setEditDate] = useState('');
  const [actionLog, setActionLog] = useState([]);

  // Require confirmation for every write action
  function requestConfirmation(action) {
    setPendingAction(action);
    setShowConfirmModal(true);
  }

  function confirmAction() {
    if (!pendingAction) return;

    const logEntry = {
      time: new Date().toLocaleTimeString(),
      action: pendingAction.description,
    };

    if (pendingAction.type === 'create') {
      const newId = Math.max(...assignments.map(a => a.id), 0) + 1;
      setAssignments([...assignments, {
        id: newId,
        name: newAssignment.name,
        dueDate: `${newAssignment.dueDate}T${newAssignment.dueTime}:00`,
        points: parseInt(newAssignment.points) || 0,
        status: 'active',
      }]);
      setNewAssignment({ name: '', instructions: '', dueDate: '', dueTime: '23:59', points: '' });
      setShowCreateModal(false);
    } else if (pendingAction.type === 'edit_date') {
      setAssignments(assignments.map(a =>
        a.id === pendingAction.assignmentId
          ? { ...a, dueDate: `${editDate}T23:59:00` }
          : a
      ));
      setEditingId(null);
      setEditDate('');
    }

    setActionLog([logEntry, ...actionLog]);
    setShowConfirmModal(false);
    setPendingAction(null);
  }

  function cancelAction() {
    setShowConfirmModal(false);
    setPendingAction(null);
  }

  return (
    <div>
      {/* Top Nav */}
      <nav className="topnav">
        <a className="topnav-logo" href="/instructor">
          <span className="topnav-logo-icon">S</span>
          SyncWise AI
          <span style={{ fontSize: '12px', fontWeight: '500', color: '#64748B', marginLeft: '4px' }}>Instructor</span>
        </a>
        <div className="topnav-user">
          <span className="badge badge-medium">Demo Mode</span>
          <span>Prof. Jouflas</span>
          <a href="/dashboard" style={{ color: '#64748B', textDecoration: 'none', fontSize: '13px' }}>Student View</a>
        </div>
      </nav>

      <div className="container">
        <div className="dash-grid" style={{ marginTop: '20px' }}>
          {/* LEFT: Assignment Manager */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '700' }}>Course Assignments</h2>
              <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                + New Assignment
              </button>
            </div>

            {assignments.map(a => (
              <div key={a.id} className="task-item" style={{ background: 'white', border: '1px solid #F1F5F9' }}>
                <div className="task-info">
                  <div className="task-name">{a.name}</div>
                  <div className="task-meta">
                    {a.points} pts &middot; Due: {new Date(a.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </div>
                </div>
                {editingId === a.id ? (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="date"
                      className="form-input"
                      style={{ width: '160px', padding: '6px 10px' }}
                      value={editDate}
                      onChange={e => setEditDate(e.target.value)}
                    />
                    <button className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '13px' }}
                      onClick={() => requestConfirmation({
                        type: 'edit_date',
                        assignmentId: a.id,
                        description: `Change due date of "${a.name}" to ${editDate}`,
                      })}>
                      Save
                    </button>
                    <button className="btn btn-outline" style={{ padding: '6px 14px', fontSize: '13px' }}
                      onClick={() => { setEditingId(null); setEditDate(''); }}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button className="btn btn-outline" style={{ padding: '6px 14px', fontSize: '13px' }}
                    onClick={() => { setEditingId(a.id); setEditDate(a.dueDate.split('T')[0]); }}>
                    Edit Date
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* RIGHT: Action Log + Quick Stats */}
          <div>
            <div className="card" style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px' }}>Quick Stats</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ background: '#EEF2FF', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: '800', color: '#4F46E5' }}>{assignments.length}</div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>Active Assignments</div>
                </div>
                <div style={{ background: '#ECFDF5', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: '800', color: '#059669' }}>30</div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>Students Enrolled</div>
                </div>
              </div>
            </div>

            <div className="card">
              <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px' }}>Action Log</h2>
              <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '12px' }}>
                Every action is logged for IT transparency.
              </p>
              {actionLog.length === 0 ? (
                <p style={{ fontSize: '13px', color: '#94A3B8', fontStyle: 'italic' }}>No actions taken yet this session.</p>
              ) : (
                actionLog.map((log, i) => (
                  <div key={i} style={{
                    padding: '8px 12px', background: '#F1F5F9', borderRadius: '8px', marginBottom: '6px', fontSize: '13px',
                  }}>
                    <span style={{ color: '#64748B' }}>{log.time}</span> — {log.action}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CREATE ASSIGNMENT MODAL */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Create New Assignment</h3>
            <p>Fill out the details below. You'll review everything before it posts to D2L.</p>

            <div className="form-group">
              <label className="form-label">Assignment Name</label>
              <input className="form-input" placeholder="e.g., Section V: Financial Plan"
                value={newAssignment.name}
                onChange={e => setNewAssignment({ ...newAssignment, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Instructions</label>
              <textarea className="form-input form-textarea" placeholder="Assignment instructions..."
                value={newAssignment.instructions}
                onChange={e => setNewAssignment({ ...newAssignment, instructions: e.target.value })} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Due Date</label>
                <input className="form-input" type="date"
                  value={newAssignment.dueDate}
                  onChange={e => setNewAssignment({ ...newAssignment, dueDate: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Due Time</label>
                <input className="form-input" type="time"
                  value={newAssignment.dueTime}
                  onChange={e => setNewAssignment({ ...newAssignment, dueTime: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Points</label>
                <input className="form-input" type="number" placeholder="50"
                  value={newAssignment.points}
                  onChange={e => setNewAssignment({ ...newAssignment, points: e.target.value })} />
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button className="btn btn-primary"
                disabled={!newAssignment.name || !newAssignment.dueDate}
                onClick={() => requestConfirmation({
                  type: 'create',
                  description: `Create assignment "${newAssignment.name}" due ${newAssignment.dueDate} (${newAssignment.points || 0} pts)`,
                })}>
                Review & Post to D2L
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL — Required for every write action */}
      {showConfirmModal && pendingAction && (
        <div className="modal-overlay">
          <div className="modal">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '22px' }}>&#9888;&#65039;</span> Confirm Action
            </h3>
            <p>SyncWise will make the following change to D2L. Please review and confirm:</p>
            <div style={{
              background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: '8px',
              padding: '14px', marginBottom: '20px', fontSize: '14px', fontWeight: '500',
            }}>
              {pendingAction.description}
            </div>
            <p style={{ fontSize: '12px', color: '#94A3B8' }}>
              This action will be logged for IT audit purposes.
            </p>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={cancelAction}>Cancel</button>
              <button className="btn btn-primary" onClick={confirmAction}>Confirm & Execute</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
