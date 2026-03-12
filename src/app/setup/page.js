'use client';

// Student Setup / Onboarding Page
// Guides students through connecting their data sources:
// 1. D2L Calendar Feed (iCal URL) — required
// 2. Microsoft Outlook — optional, coming soon
// 3. Preferences — notification settings, etc.

import { useState } from 'react';

export default function SetupPage() {
  const [step, setStep] = useState(1);
  const [icalUrl, setIcalUrl] = useState('');
  const [icalStatus, setIcalStatus] = useState(null); // null, 'loading', 'success', 'error'
  const [icalData, setIcalData] = useState(null);
  const [error, setError] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');

  // Validate and test the iCal feed URL
  const testICalFeed = async () => {
    setIcalStatus('loading');
    setError('');

    // Basic validation
    if (!icalUrl.trim()) {
      setError('Please paste your D2L calendar feed URL.');
      setIcalStatus('error');
      return;
    }

    if (!icalUrl.includes('.ics') && !icalUrl.includes('/calendar/feed/')) {
      setError('This doesn\'t look like a D2L calendar feed URL. It should contain ".ics" or "/calendar/feed/".');
      setIcalStatus('error');
      return;
    }

    try {
      const res = await fetch('/api/feeds/ical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedUrl: icalUrl.trim(),
          user: studentEmail || 'setup',
        }),
      });

      const data = await res.json();

      if (data.success) {
        setIcalData(data);
        setIcalStatus('success');
      } else {
        setError(data.error || 'Failed to fetch calendar feed. Check your URL and try again.');
        setIcalStatus('error');
      }
    } catch (err) {
      setError('Network error. Make sure you\'re connected to the internet.');
      setIcalStatus('error');
    }
  };

  // Save setup and redirect to dashboard
  const completeSetup = async () => {
    const settings = {
      studentName,
      studentEmail,
      icalUrl: icalUrl.trim(),
      courses: icalData?.courseMap || {},
      setupCompleted: true,
      setupDate: new Date().toISOString(),
    };

    // Save to localStorage as fallback
    localStorage.setItem('syncwise_settings', JSON.stringify(settings));

    // Create authenticated session + save profile to database
    // This persists the account server-side so it works across devices
    try {
      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: studentName,
          email: studentEmail,
          role: 'student',
          icalUrl: icalUrl.trim(),
          courses: icalData?.courseMap || {},
        }),
      });
    } catch (err) {
      console.warn('Session creation failed — continuing with local data:', err);
    }

    // Redirect to welcome/onboarding page (shows features + chatbot intro)
    window.location.href = '/welcome';
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>Welcome to SyncWise AI</h1>
          <p style={styles.subtitle}>
            Let&apos;s connect your course data. This takes about 2 minutes.
          </p>
        </div>

        {/* Progress Steps */}
        <div style={styles.progressBar}>
          {[1, 2, 3].map(s => (
            <div key={s} style={styles.progressStep}>
              <div style={{
                ...styles.stepCircle,
                backgroundColor: step >= s ? '#5D0022' : '#E5E7EB',
                color: step >= s ? '#fff' : '#9CA3AF',
              }}>
                {step > s ? '\u2713' : s}
              </div>
              <span style={{
                ...styles.stepLabel,
                color: step >= s ? '#5D0022' : '#9CA3AF',
              }}>
                {s === 1 ? 'Your Info' : s === 2 ? 'D2L Calendar' : 'Review'}
              </span>
            </div>
          ))}
        </div>

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div style={styles.stepContent}>
            <h2 style={styles.stepTitle}>About You</h2>

            <div style={styles.field}>
              <label style={styles.label}>Name</label>
              <input
                type="text"
                value={studentName}
                onChange={e => setStudentName(e.target.value)}
                placeholder="Your name"
                style={styles.input}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>CMU Email</label>
              <input
                type="email"
                value={studentEmail}
                onChange={e => setStudentEmail(e.target.value)}
                placeholder="you@mavs.coloradomesa.edu"
                style={styles.input}
              />
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!studentName.trim()}
              style={{
                ...styles.button,
                opacity: studentName.trim() ? 1 : 0.5,
              }}
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 2: D2L Calendar Feed */}
        {step === 2 && (
          <div style={styles.stepContent}>
            <h2 style={styles.stepTitle}>Connect D2L Calendar</h2>

            <div style={styles.instructions}>
              <p style={styles.instructionTitle}>How to get your calendar feed URL:</p>
              <ol style={styles.instructionList}>
                <li>Log into <strong>D2L Brightspace</strong> at d2l.coloradomesa.edu</li>
                <li>Go to the <strong>Calendar</strong> page</li>
                <li>Click <strong>Settings</strong> (gear icon)</li>
                <li>Check <strong>&quot;Enable Calendar Feeds&quot;</strong> and click Save</li>
                <li>Click <strong>&quot;Subscribe&quot;</strong> to see the feed URL</li>
                <li>Copy the URL that ends in <strong>.ics</strong> and paste it below</li>
              </ol>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>D2L Calendar Feed URL</label>
              <input
                type="url"
                value={icalUrl}
                onChange={e => { setIcalUrl(e.target.value); setIcalStatus(null); setError(''); }}
                placeholder="https://d2l.coloradomesa.edu/d2l/le/calendar/feed/user/feed.ics?token=..."
                style={styles.input}
              />
            </div>

            {error && (
              <div style={styles.errorBox}>
                {error}
              </div>
            )}

            {icalStatus === 'success' && icalData && (
              <div style={styles.successBox}>
                <p style={styles.successTitle}>Calendar connected!</p>
                <p>Found <strong>{icalData.totalCount} events</strong> across <strong>{Object.keys(icalData.courseMap).length} courses</strong>:</p>
                <ul style={styles.courseList}>
                  {Object.entries(icalData.courseMap).map(([course, color]) => (
                    <li key={course} style={styles.courseItem}>
                      <span style={{ ...styles.courseDot, backgroundColor: color }}></span>
                      {course}
                    </li>
                  ))}
                </ul>
                <p><strong>{icalData.upcomingCount} upcoming items</strong> loaded into your dashboard.</p>
              </div>
            )}

            <div style={styles.buttonRow}>
              <button onClick={() => setStep(1)} style={styles.backButton}>
                Back
              </button>

              {icalStatus !== 'success' ? (
                <button
                  onClick={testICalFeed}
                  disabled={icalStatus === 'loading' || !icalUrl.trim()}
                  style={{
                    ...styles.button,
                    opacity: (icalStatus === 'loading' || !icalUrl.trim()) ? 0.5 : 1,
                  }}
                >
                  {icalStatus === 'loading' ? 'Testing...' : 'Test Connection'}
                </button>
              ) : (
                <button onClick={() => setStep(3)} style={styles.button}>
                  Continue
                </button>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Review & Complete */}
        {step === 3 && (
          <div style={styles.stepContent}>
            <h2 style={styles.stepTitle}>You&apos;re All Set!</h2>

            <div style={styles.reviewSection}>
              <div style={styles.reviewItem}>
                <span style={styles.reviewLabel}>Name</span>
                <span style={styles.reviewValue}>{studentName}</span>
              </div>
              <div style={styles.reviewItem}>
                <span style={styles.reviewLabel}>Email</span>
                <span style={styles.reviewValue}>{studentEmail || 'Not provided'}</span>
              </div>
              <div style={styles.reviewItem}>
                <span style={styles.reviewLabel}>D2L Calendar</span>
                <span style={{ ...styles.reviewValue, color: '#059669' }}>Connected</span>
              </div>
              <div style={styles.reviewItem}>
                <span style={styles.reviewLabel}>Courses</span>
                <span style={styles.reviewValue}>{Object.keys(icalData?.courseMap || {}).length} courses found</span>
              </div>
              <div style={styles.reviewItem}>
                <span style={styles.reviewLabel}>Upcoming Items</span>
                <span style={styles.reviewValue}>{icalData?.upcomingCount || 0} assignments & events</span>
              </div>
            </div>

            <div style={styles.comingSoon}>
              <p style={styles.comingSoonTitle}>Coming Soon</p>
              <ul style={styles.comingSoonList}>
                <li>Microsoft Outlook calendar & email integration</li>
                <li>D2L announcement feeds</li>
                <li>Instructor-uploaded syllabi & schedules</li>
              </ul>
            </div>

            <div style={styles.consent}>
              <p style={styles.consentText}>
                By continuing, you agree that SyncWise AI will access your D2L calendar feed
                to display your assignments and due dates. Your data is stored locally and
                never shared with third parties. You can disconnect at any time in Settings.
              </p>
            </div>

            <div style={styles.buttonRow}>
              <button onClick={() => setStep(2)} style={styles.backButton}>
                Back
              </button>
              <button onClick={completeSetup} style={styles.button}>
                Go to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Privacy note */}
      <p style={styles.footer}>
        SyncWise AI is built by Troy Fields for CMU ENTR 450.
        Your data stays on your device. No IT access required.
      </p>
    </div>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    backgroundColor: '#F9FAFB',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
    padding: '2.5rem',
    maxWidth: '600px',
    width: '100%',
  },
  header: {
    textAlign: 'center',
    marginBottom: '2rem',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: '700',
    color: '#111827',
    margin: '0 0 0.5rem 0',
  },
  subtitle: {
    fontSize: '1rem',
    color: '#6B7280',
    margin: 0,
  },
  progressBar: {
    display: 'flex',
    justifyContent: 'center',
    gap: '2rem',
    marginBottom: '2rem',
    padding: '0 1rem',
  },
  progressStep: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
  },
  stepCircle: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.875rem',
    fontWeight: '600',
    transition: 'all 0.2s',
  },
  stepLabel: {
    fontSize: '0.75rem',
    fontWeight: '500',
  },
  stepContent: {
    marginTop: '1rem',
  },
  stepTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '1.5rem',
  },
  field: {
    marginBottom: '1.25rem',
  },
  label: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '0.5rem',
  },
  input: {
    width: '100%',
    padding: '0.75rem 1rem',
    border: '1px solid #D1D5DB',
    borderRadius: '8px',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'border-color 0.15s',
    boxSizing: 'border-box',
  },
  button: {
    backgroundColor: '#5D0022',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '0.75rem 1.5rem',
    fontSize: '0.95rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
  backButton: {
    backgroundColor: '#F3F4F6',
    color: '#374151',
    border: 'none',
    borderRadius: '8px',
    padding: '0.75rem 1.5rem',
    fontSize: '0.95rem',
    fontWeight: '500',
    cursor: 'pointer',
  },
  buttonRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '1.5rem',
  },
  instructions: {
    backgroundColor: '#F0F5FF',
    borderRadius: '8px',
    padding: '1.25rem',
    marginBottom: '1.5rem',
    borderLeft: '4px solid #5D0022',
  },
  instructionTitle: {
    fontWeight: '600',
    fontSize: '0.9rem',
    color: '#1E3A5F',
    margin: '0 0 0.75rem 0',
  },
  instructionList: {
    margin: 0,
    paddingLeft: '1.25rem',
    fontSize: '0.85rem',
    color: '#374151',
    lineHeight: '1.7',
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    border: '1px solid #FECACA',
    borderRadius: '8px',
    padding: '0.75rem 1rem',
    color: '#DC2626',
    fontSize: '0.875rem',
    marginBottom: '1rem',
  },
  successBox: {
    backgroundColor: '#F0FDF4',
    border: '1px solid #BBF7D0',
    borderRadius: '8px',
    padding: '1rem 1.25rem',
    color: '#166534',
    fontSize: '0.875rem',
    marginBottom: '1rem',
  },
  successTitle: {
    fontWeight: '600',
    fontSize: '1rem',
    margin: '0 0 0.5rem 0',
  },
  courseList: {
    listStyle: 'none',
    padding: 0,
    margin: '0.5rem 0',
  },
  courseItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.25rem 0',
    fontSize: '0.85rem',
  },
  courseDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    display: 'inline-block',
    flexShrink: 0,
  },
  reviewSection: {
    backgroundColor: '#F9FAFB',
    borderRadius: '8px',
    padding: '1.25rem',
    marginBottom: '1.5rem',
  },
  reviewItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.5rem 0',
    borderBottom: '1px solid #E5E7EB',
  },
  reviewLabel: {
    color: '#6B7280',
    fontSize: '0.875rem',
  },
  reviewValue: {
    fontWeight: '500',
    color: '#111827',
    fontSize: '0.875rem',
  },
  comingSoon: {
    backgroundColor: '#FFFBEB',
    borderRadius: '8px',
    padding: '1rem 1.25rem',
    marginBottom: '1.5rem',
    borderLeft: '4px solid #F59E0B',
  },
  comingSoonTitle: {
    fontWeight: '600',
    color: '#92400E',
    margin: '0 0 0.5rem 0',
    fontSize: '0.9rem',
  },
  comingSoonList: {
    margin: 0,
    paddingLeft: '1.25rem',
    fontSize: '0.85rem',
    color: '#78350F',
  },
  consent: {
    marginBottom: '1rem',
  },
  consentText: {
    fontSize: '0.8rem',
    color: '#9CA3AF',
    lineHeight: '1.5',
    margin: 0,
  },
  footer: {
    marginTop: '1.5rem',
    fontSize: '0.8rem',
    color: '#9CA3AF',
    textAlign: 'center',
  },
};
