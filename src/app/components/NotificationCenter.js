'use client';

import { useState, useEffect, useRef } from 'react';
import {
  getBellNotifications, getUnreadCount, markAsRead,
  markAllAsRead, clearAllNotifications, onBellUpdate
} from '../../lib/notifications';

// ============================================================
// Notification Center — Bell icon with dropdown
// Shows all in-app notifications, unread count badge
// Mark as read, clear all, click to navigate
// ============================================================

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  // Subscribe to notification updates
  useEffect(() => {
    onBellUpdate((updated) => {
      setNotifications([...updated]);
      setUnreadCount(updated.filter(n => !n.read).length);
    });

    // Initial load
    setNotifications(getBellNotifications());
    setUnreadCount(getUnreadCount());
  }, []);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  function handleBellClick() {
    setIsOpen(!isOpen);
  }

  function handleNotificationClick(notification) {
    markAsRead(notification.id);
    // Could navigate to relevant section here
    setIsOpen(false);
  }

  function handleMarkAllRead() {
    markAllAsRead();
  }

  function handleClearAll() {
    clearAllNotifications();
    setIsOpen(false);
  }

  function getTypeIcon(type) {
    const icons = {
      assignment: '📝',
      quiz: '❓',
      discussion: '💬',
      announcement: '📢',
      checklist: '☑️',
      content: '📄',
      grade: '🎯',
      calendar: '📅',
      submission_rate: '📊',
      grading_needed: '✏️',
      student_post: '💬',
    };
    return icons[type] || '🔔';
  }

  function getTimeAgo(timestamp) {
    const now = Date.now();
    const time = new Date(timestamp).getTime();
    const diff = now - time;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }

  return (
    <div className="notification-center" ref={dropdownRef}>
      <button
        className="notification-bell"
        onClick={handleBellClick}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className="bell-icon" aria-hidden="true">🔔</span>
        {unreadCount > 0 && (
          <span className="notification-badge" aria-hidden="true">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown" role="menu" aria-label="Notifications">
          <div className="notification-dropdown-header">
            <h3>Notifications</h3>
            <div className="notification-header-actions">
              {unreadCount > 0 && (
                <button
                  className="notification-action-btn"
                  onClick={handleMarkAllRead}
                  aria-label="Mark all as read"
                >
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  className="notification-action-btn"
                  onClick={handleClearAll}
                  aria-label="Clear all notifications"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="notification-empty">
                <span style={{ fontSize: '24px' }}>🔕</span>
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.slice(0, 50).map(notification => (
                <button
                  key={notification.id}
                  className={`notification-item ${!notification.read ? 'unread' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                  role="menuitem"
                >
                  <span className="notification-item-icon" aria-hidden="true">
                    {getTypeIcon(notification.type)}
                  </span>
                  <div className="notification-item-content">
                    <div className="notification-item-title">
                      {notification.title}
                      {!notification.read && <span className="unread-dot" aria-label="Unread" />}
                    </div>
                    <div className="notification-item-body">{notification.body}</div>
                    <div className="notification-item-meta">
                      {notification.courseName && (
                        <span
                          className="notification-course-tag"
                          style={{ borderColor: notification.courseColor || '#94A3B8' }}
                        >
                          {notification.courseName}
                        </span>
                      )}
                      <span className="notification-time">{getTimeAgo(notification.timestamp)}</span>
                      {notification.duringQuietHours && (
                        <span className="notification-quiet-tag">Received during quiet hours</span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="notification-dropdown-footer">
            <a href="/settings/notifications" className="notification-settings-link">
              Notification Settings
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationCenter;
