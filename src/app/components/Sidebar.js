'use client';

import { useState, useEffect } from 'react';

// ============================================================
// Collapsible Sidebar Navigation
// Shared between student and instructor dashboards
// Sections: Dashboard, Calendar, Grades, Notifications, Settings
// Collapses to icon-only on small screens or user toggle
// ============================================================

const STUDENT_NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊', href: '/dashboard' },
  { id: 'calendar', label: 'Calendar', icon: '📅', href: '/dashboard#calendar' },
  { id: 'grades', label: 'Grades', icon: '📝', href: '/dashboard#grades' },
  { id: 'focus', label: 'Focus Mode', icon: '🎯', href: '/dashboard#focus' },
  { id: 'notifications', label: 'Notifications', icon: '🔔', href: '/settings/notifications' },
  { id: 'settings', label: 'Settings', icon: '⚙️', href: '/settings' },
  { id: 'future-updates', label: 'Future Updates', icon: '🚀', href: '/future-updates' },
];

const INSTRUCTOR_NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊', href: '/instructor' },
  { id: 'calendar', label: 'Calendar', icon: '📅', href: '/instructor#calendar' },
  { id: 'assignments', label: 'Assignments', icon: '📋', href: '/instructor#assignments' },
  { id: 'students', label: 'Student View', icon: '👥', href: '/instructor#student-view' },
  { id: 'notifications', label: 'Notifications', icon: '🔔', href: '/settings/notifications' },
  { id: 'settings', label: 'Settings', icon: '⚙️', href: '/settings' },
  { id: 'future-updates', label: 'Future Updates', icon: '🚀', href: '/future-updates' },
];

export function Sidebar({ role = 'student', activeSection = 'dashboard', onNavigate, unreadCount = 0 }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navItems = role === 'instructor' ? INSTRUCTOR_NAV : STUDENT_NAV;

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [activeSection]);

  // Close on escape key
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') setMobileOpen(false);
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  function handleNavClick(item, e) {
    e.preventDefault();
    if (onNavigate) {
      onNavigate(item.id);
    } else {
      window.location.href = item.href;
    }
    setMobileOpen(false);
  }

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        className="sidebar-mobile-toggle"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle navigation menu"
        aria-expanded={mobileOpen}
      >
        <span className="hamburger-line" />
        <span className="hamburger-line" />
        <span className="hamburger-line" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <nav
        className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''} ${mobileOpen ? 'sidebar-mobile-open' : ''}`}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="sidebar-header">
          {!collapsed && (
            <span className="sidebar-title">
              {role === 'instructor' ? 'Instructor' : 'Student'}
            </span>
          )}
          <button
            className="sidebar-collapse-btn"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? '▶' : '◀'}
          </button>
        </div>

        <ul className="sidebar-nav-list" role="menubar">
          {navItems.map(item => (
            <li key={item.id} role="none">
              <a
                href={item.href}
                role="menuitem"
                className={`sidebar-nav-item ${activeSection === item.id ? 'active' : ''}`}
                onClick={(e) => handleNavClick(item, e)}
                title={collapsed ? item.label : undefined}
                aria-current={activeSection === item.id ? 'page' : undefined}
              >
                <span className="sidebar-nav-icon" aria-hidden="true">{item.icon}</span>
                {!collapsed && <span className="sidebar-nav-label">{item.label}</span>}
                {item.id === 'notifications' && unreadCount > 0 && (
                  <span className="sidebar-badge" aria-label={`${unreadCount} unread notifications`}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </a>
            </li>
          ))}
        </ul>

        {/* Role switch link */}
        <div className="sidebar-footer">
          <a
            href={role === 'instructor' ? '/dashboard' : '/instructor'}
            className="sidebar-switch-role"
            title={role === 'instructor' ? 'Switch to Student View' : 'Switch to Instructor View'}
          >
            <span aria-hidden="true">{role === 'instructor' ? '🎒' : '🎓'}</span>
            {!collapsed && (
              <span>{role === 'instructor' ? 'Student View' : 'Instructor View'}</span>
            )}
          </a>
        </div>
      </nav>
    </>
  );
}

export default Sidebar;
