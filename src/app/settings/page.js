'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar';
import { ThemeToggle } from '../components/ThemeProvider';
import { NotificationCenter } from '../components/NotificationCenter';

// ============================================================
// Settings Hub — Central settings page with subcategories
// ============================================================

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('settings');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState('student');
  const [icalUrl, setIcalUrl] = useState('');

  useEffect(() => {
    // Load user info from session or localStorage
    async function loadUser() {
      try {
        const res = await fetch('/api/auth/session');
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            setUserName(data.user.name || '');
            setUserEmail(data.user.email || '');
            setUserRole(data.user.role || 'student');
            setIcalUrl(data.user.icalUrl || '');
            return;
          }
        }
      } catch { /* ignore */ }
      // Fall back to localStorage
      try {
        const stored = localStorage.getItem('syncwise_settings');
        if (stored) {
          const parsed = JSON.parse(stored);
          setUserName(parsed.studentName || '');
          setUserEmail(parsed.studentEmail || '');
          setUserRole(parsed.role || 'student');
          setIcalUrl(parsed.icalUrl || '');
        }
      } catch { /* ignore */ }
    }
    loadUser();
  }, []);

  return (
    <div>
      <nav className="topnav">
        <a className="topnav-logo" href="/dashboard">
          <span className="topnav-logo-icon">C</span>
          CMU AI Calendar
        </a>
        <div className="topnav-user">
          <ThemeToggle />
          <NotificationCenter />
          <span>{userName || 'Settings'}</span>
        </div>
      </nav>

      <div className="layout-with-sidebar">
        <Sidebar role={userRole} activeSection={activeSection} onNavigate={setActiveSection} />

        <main className="main-content">
          <div className="settings-container">
            <div className="settings-header">
              <h1>Settings</h1>
              <p>Manage your account, notifications, and preferences.</p>
            </div>

            {/* Account Overview Card */}
            <div className="card" style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>👤</span> Account
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px', fontSize: '14px' }}>
                <span style={{ color: '#64748B', fontWeight: '500' }}>Name</span>
                <span style={{ color: '#111827' }}>{userName || 'Not set'}</span>
                <span style={{ color: '#64748B', fontWeight: '500' }}>Email</span>
                <span style={{ color: '#111827' }}>{userEmail || 'Not set'}</span>
                <span style={{ color: '#64748B', fontWeight: '500' }}>Role</span>
                <span style={{ color: '#111827', textTransform: 'capitalize' }}>{userRole}</span>
                {icalUrl && (
                  <>
                    <span style={{ color: '#64748B', fontWeight: '500' }}>D2L Feed</span>
                    <span style={{ color: '#059669', fontSize: '13px' }}>Connected</span>
                  </>
                )}
              </div>
            </div>

            {/* Settings Categories */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '20px' }}>

              {/* Notifications */}
              <a href="/settings/notifications" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="card" style={{ cursor: 'pointer', transition: 'box-shadow 0.2s, transform 0.2s', height: '100%' }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = ''; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '28px' }}>🔔</span>
                    <h3 style={{ fontSize: '15px', fontWeight: '700', margin: 0 }}>Notifications</h3>
                  </div>
                  <p style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.5', margin: 0 }}>
                    Customize alert timing, methods, quiet hours, and per-course notification preferences.
                  </p>
                  <div style={{ marginTop: '12px', fontSize: '13px', color: '#5D0022', fontWeight: '600' }}>
                    Manage notifications →
                  </div>
                </div>
              </a>

              {/* Appearance */}
              <div className="card" style={{ opacity: 0.6, height: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '28px' }}>🎨</span>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', margin: 0 }}>Appearance</h3>
                </div>
                <p style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.5', margin: 0 }}>
                  Theme, color preferences, and display options. Use the moon/sun toggle in the top bar for now.
                </p>
                <div style={{ marginTop: '12px', fontSize: '12px', color: '#94A3B8', fontWeight: '600' }}>
                  Coming soon
                </div>
              </div>

              {/* Connected Accounts */}
              <div className="card" style={{ opacity: 0.6, height: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '28px' }}>🔗</span>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', margin: 0 }}>Connected Accounts</h3>
                </div>
                <p style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.5', margin: 0 }}>
                  Manage your D2L calendar feed, Outlook integration, and other connected services.
                </p>
                <div style={{ marginTop: '12px', fontSize: '12px', color: '#94A3B8', fontWeight: '600' }}>
                  Coming soon
                </div>
              </div>

              {/* Privacy & Security */}
              <div className="card" style={{ opacity: 0.6, height: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '28px' }}>🔒</span>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', margin: 0 }}>Privacy & Security</h3>
                </div>
                <p style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.5', margin: 0 }}>
                  Password, session management, and data privacy controls.
                </p>
                <div style={{ marginTop: '12px', fontSize: '12px', color: '#94A3B8', fontWeight: '600' }}>
                  Coming soon
                </div>
              </div>
            </div>

            {/* Sign Out */}
            <div className="card" style={{ marginBottom: '40px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>Sign Out</h3>
                  <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>Sign out of your CMU AI Calendar account.</p>
                </div>
                <button
                  onClick={() => { window.location.href = '/login'; }}
                  style={{
                    padding: '8px 20px', background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA',
                    borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                  }}
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
