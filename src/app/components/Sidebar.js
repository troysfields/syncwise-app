'use client';

import { useState, useEffect } from 'react';

// ============================================================
// Collapsible Sidebar Navigation
// Shared between student and instructor dashboards
// Sections: Dashboard, Calendar, Grades, Notifications, Settings
// Collapses to icon-only on small screens or user toggle
// ============================================================

const STUDENT_NAV = [
  { id: 'calendar', label: 'Calendar', icon: '📅', href: '/dashboard', view: 'calendar' },
  { id: 'dashboard', label: 'Dashboard', icon: '📊', href: '/dashboard', view: 'dashboard' },
  { id: 'grades', label: 'All Items', icon: '📝', href: '/dashboard', view: 'grades' },
  { id: 'focus', label: 'Focus Mode', icon: '🎯', href: '/dashboard', action: 'toggle-focus' },
  { id: 'settings', label: 'Settings', icon: '⚙️', href: '/settings' },
  { id: 'future-updates', label: 'Future Updates', icon: '🚀', href: '/future-updates' },
];

const INSTRUCTOR_NAV = [
  { id: 'calendar', label: 'Calendar', icon: '📅', href: '/instructor', view: 'calendar' },
  { id: 'dashboard', label: 'Dashboard', icon: '📊', href: '/instructor', view: 'dashboard' },
  { id: 'assignments', label: 'Assignments', icon: '📋', href: '/instructor', view: 'assignments' },
  { id: 'students', label: 'Student View', icon: '👥', href: '/instructor', view: 'students' },
  { id: 'settings', label: 'Settings', icon: '⚙️', href: '/settings' },
  { id: 'future-updates', label: 'Future Updates', icon: '🚀', href: '/future-updates' },
];

export function Sidebar({ role = 'student', activeSection = 'dashboard', onNavigate, unreadCount = 0, onFocusToggle, focusMode = false }) {
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

    // Special action: Focus Mode toggle
    if (item.action === 'toggle-focus' && onFocusToggle) {
      onFocusToggle(e);
      setMobileOpen(false);
      return;
    }

    // View-based navigation — switch the active view within the dashboard
    if (item.view && onNavigate) {
      onNavigate(item.id);
      // Scroll to top when switching views
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setMobileOpen(false);
      return;
    }

    // External page navigation (Settings, Future Updates, etc.)
    if (item.href) {
      const currentPath = window.location.pathname.replace(/\/$/, '');
      const targetPath = item.href.replace(/\/$/, '');
      if (targetPath !== currentPath) {
        window.location.href = item.href;
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }

    if (onNavigate) {
      onNavigate(item.id);
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
                className={`sidebar-nav-item ${activeSection === item.id ? 'active' : ''} ${item.action === 'toggle-focus' && focusMode ? 'active' : ''}`}
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

        {/* Role switch link — only visible to instructors */}
        {role === 'instructor' && (
          <div className="sidebar-footer">
            <a
              href="/dashboard"
              className="sidebar-switch-role"
              title="Switch to Student View"
            >
              <span aria-hidden="true">🎒</span>
              {!collapsed && (
                <span>Student View</span>
              )}
            </a>
          </div>
        )}
      </nav>
    </>
  );
}

export default Sidebar;
