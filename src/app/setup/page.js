'use client';

// Setup / Onboarding Page
// Guides new users through account creation:
// 1. Role selection (student/instructor)
// 2. Basic info + password
// 3. D2L Calendar Feed (iCal URL)
// 4. Review & complete

import { useState } from 'react';

export default function SetupPage() {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState(''); // 'student' or 'instructor'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [icalUrl, setIcalUrl] = useState('');
  const [icalStatus, setIcalStatus] = useState(null);
  const [icalData, setIcalData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // ─── Validation helpers ───
  const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const validateStep2 = () => {
    if (!name.trim()) { setError('Please enter your name.'); return false; }
    if (!email.trim() || !isValidEmail(email)) { setError('Please enter a valid email address.'); return false; }
    if (role === 'instructor' && !email.trim().toLowerCase().endsWith('@coloradomesa.edu')) {
      setError('Instructor accounts require a @coloradomesa.edu email address.');
      return false;
    }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return false; }
    if (password !== confirmPassword) { setError('Passwords don\'t match.'); return false; }
    return true;
  };

  // ─── Test iCal feed ───
  const testICalFeed = async () => {
    setIcalStatus('loading');
    setError('');

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
        body: JSON.stringify({ feedUrl: icalUrl.trim(), user: email || 'setup', setupMode: true }),
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

  // ─── Complete setup ───
  const completeSetup = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role,
          password,
          icalUrl: icalUrl.trim(),
          courses: icalData?.courseMap || {},
        }),
      });

      const data = await res.json();

      if (data.success) {
        // Save to localStorage as fallback
        localStorage.setItem('syncwise_settings', JSON.stringify({
          studentName: name.trim(),
          studentEmail: email.trim(),
          role,
          icalUrl: icalUrl.trim(),
          courses: icalData?.courseMap || {},
          setupCompleted: true,
          setupDate: new Date().toISOString(),
        }));

        // Redirect based on role
        if (role === 'instructor') {
          window.location.href = '/instructor';
        } else {
          window.location.href = '/welcome';
        }
      } else {
        setError(data.error || 'Account creation failed. Please try again.');
        setLoading(false);
      }
    } catch (err) {
      setError('Network error. Please check your connection.');
      setLoading(false);
    }
  };

  const totalSteps = 4;
  const stepLabels = ['Role', 'Your Info', 'D2L Calendar', 'Review'];

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.logoBox}>C</div>
          <h1 style={styles.title}>Create Your Account</h1>
          <p style={styles.brandSub}>CMU AI Calendar by SyncWise AI</p>
        </div>

        {/* Progress Steps */}
        <div style={styles.progressBar}>
          {stepLabels.map((label, i) => {
            const s = i + 1;
            return (
              <div key={s} style={styles.progressStep}>
                <div style={{
                  ...styles.stepCircle,
                  backgroundColor: step >= s ? '#5D0022' : '#E5E7EB',
                  color: step >= s ? '#fff' : '#9CA3AF',
                }}>
                  {step > s ? '✓' : s}
                </div>
                <span style={{
                  ...styles.stepLabel,
                  color: step >= s ? '#5D0022' : '#9CA3AF',
                }}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}

        {/* Step 1: Role Selection */}
        {step === 1 && (
          <div style={styles.stepContent}>
            <h2 style={styles.stepTitle}>I am a...</h2>

            <button
              onClick={() => { setRole('student'); setStep(2); setError(''); }}
              style={{
                ...styles.roleButton,
                borderColor: role === 'student' ? '#5D0022' : '#E5E7EB',
              }}
            >
              <span style={styles.roleIcon}>🎓</span>
              <div style={{ textAlign: 'left' }}>
                <span style={styles.roleButtonTitle}>Student</span>
                <span style={styles.roleButtonDesc}>Connect your D2L calendar and get AI-powered assignment tracking</span>
              </div>
            </button>

            <button
              onClick={() => { setRole('instructor'); setStep(2); setError(''); }}
              style={{
                ...styles.roleButton,
                borderColor: role === 'instructor' ? '#FBCE04' : '#E5E7EB',
              }}
            >
              <span style={styles.roleIcon}>📚</span>
              <div style={{ textAlign: 'left' }}>
                <span style={styles.roleButtonTitle}>Instructor</span>
                <span style={styles.roleButtonDesc}>Upload syllabi, manage courses, and support your students</span>
              </div>
            </button>

            <p style={styles.loginLink}>
              Already have an account?{' '}
              <a href="/login" style={styles.link}>Sign in</a>
            </p>
          </div>
        )}

        {/* Step 2: Basic Info + Password */}
        {step === 2 && (
          <div style={styles.stepContent}>
            <h2 style={styles.stepTitle}>About You</h2>

            <div style={styles.field}>
              <label style={styles.fieldLabel}>Full Name</label>
              <input
                type="text"
                value={name}
                onChange={e => { setName(e.target.value); setError(''); }}
                placeholder="Your name"
                style={styles.input}
                autoComplete="name"
              />
            </div>

            <div style={styles.field}>
              <label style={styles.fieldLabel}>
                Email
                {role === 'instructor' && <span style={styles.required}> (must be @coloradomesa.edu)</span>}
              </label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                placeholder={role === 'instructor' ? 'you@coloradomesa.edu' : 'you@email.com'}
                style={styles.input}
                autoComplete="email"
              />
            </div>

            <div style={styles.field}>
              <label style={styles.fieldLabel}>Create Password</label>
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder="At least 8 characters"
                style={styles.input}
                autoComplete="new-password"
              />
            </div>

            <div style={styles.field}>
              <label style={styles.fieldLabel}>Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
                placeholder="Re-enter your password"
                style={styles.input}
                autoComplete="new-password"
              />
            </div>

            <div style={styles.buttonRow}>
              <button onClick={() => { setStep(1); setError(''); }} style={styles.backButton}>Back</button>
              <button
                onClick={() => {
                  setError('');
                  if (validateStep2()) {
                    setStep(3);
                  }
                }}
                style={styles.primaryButton}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: D2L Calendar (both students and instructors) */}
        {step === 3 && (
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
              <label style={styles.fieldLabel}>D2L Calendar Feed URL</label>
              <input
                type="url"
                value={icalUrl}
                onChange={e => { setIcalUrl(e.target.value); setIcalStatus(null); setError(''); }}
                placeholder="https://d2l.coloradomesa.edu/d2l/le/calendar/feed/user/feed.ics?token=..."
                style={styles.input}
              />
            </div>

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
              <button onClick={() => { setStep(2); setError(''); }} style={styles.backButton}>Back</button>

              {icalStatus !== 'success' ? (
                <button
                  onClick={testICalFeed}
                  disabled={icalStatus === 'loading' || !icalUrl.trim()}
                  style={{
                    ...styles.primaryButton,
                    opacity: (icalStatus === 'loading' || !icalUrl.trim()) ? 0.5 : 1,
                  }}
                >
                  {icalStatus === 'loading' ? 'Testing...' : 'Test Connection'}
                </button>
              ) : (
                <button onClick={() => { setStep(4); setError(''); }} style={styles.primaryButton}>
                  Continue
                </button>
              )}
            </div>

            <button
              onClick={() => { setStep(4); setError(''); }}
              style={styles.skipButton}
            >
              Skip for now — I&apos;ll add this later
            </button>
          </div>
        )}

        {/* Step 4: Review & Complete */}
        {step === 4 && (
          <div style={styles.stepContent}>
            <h2 style={styles.stepTitle}>You&apos;re All Set!</h2>

            <div style={styles.reviewSection}>
              <div style={styles.reviewItem}>
                <span style={styles.reviewLabel}>Role</span>
                <span style={styles.reviewValue}>{role === 'instructor' ? '📚 Instructor' : '🎓 Student'}</span>
              </div>
              <div style={styles.reviewItem}>
                <span style={styles.reviewLabel}>Name</span>
                <span style={styles.reviewValue}>{name}</span>
              </div>
              <div style={styles.reviewItem}>
                <span style={styles.reviewLabel}>Email</span>
                <span style={styles.reviewValue}>{email}</span>
              </div>
              <div style={styles.reviewItem}>
                <span style={styles.reviewLabel}>Password</span>
                <span style={styles.reviewValue}>••••••••</span>
              </div>
              <div style={styles.reviewItem}>
                <span style={styles.reviewLabel}>D2L Calendar</span>
                <span style={{
                  ...styles.reviewValue,
                  color: icalStatus === 'success' ? '#059669' : '#F59E0B',
                }}>
                  {icalStatus === 'success' ? 'Connected' : 'Not connected yet'}
                </span>
              </div>
              {icalData && (
                <>
                  <div style={styles.reviewItem}>
                    <span style={styles.reviewLabel}>Courses</span>
                    <span style={styles.reviewValue}>{Object.keys(icalData.courseMap).length} found</span>
                  </div>
                  <div style={styles.reviewItem}>
                    <span style={styles.reviewLabel}>Upcoming Items</span>
                    <span style={styles.reviewValue}>{icalData.upcomingCount || 0}</span>
                  </div>
                </>
              )}
            </div>

            <div style={styles.consent}>
              <p style={styles.consentText}>
                By continuing, you agree that CMU AI Calendar will access your calendar data
                to display assignments and due dates. Your data is stored securely and
                never shared with third parties. You can delete your account at any time.
              </p>
            </div>

            <div style={styles.buttonRow}>
              <button
                onClick={() => { setStep(3); setError(''); }}
                style={styles.backButton}
              >
                Back
              </button>
              <button
                onClick={completeSetup}
                disabled={loading}
                style={{ ...styles.primaryButton, opacity: loading ? 0.7 : 1 }}
              >
                {loading ? 'Creating Account...' : 'Create Account & Go'}
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <p style={styles.footer}>
          CMU AI Calendar is built by Troy Fields for CMU ENTR 450.
          Your data is encrypted and stored securely.
        </p>
      </div>
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
    background: 'linear-gradient(135deg, #FDF2F4 0%, #F1F5F9 100%)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '20px',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)',
    padding: '2.5rem',
    maxWidth: '540px',
    width: '100%',
  },
  header: {
    textAlign: 'center',
    marginBottom: '1.5rem',
  },
  logoBox: {
    width: '48px',
    height: '48px',
    background: '#5D0022',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '22px',
    fontWeight: '800',
    margin: '0 auto 12px',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: '800',
    color: '#111827',
    margin: '0 0 2px 0',
  },
  brandSub: {
    fontSize: '13px',
    color: '#9CA3AF',
    fontStyle: 'italic',
    margin: 0,
  },
  progressBar: {
    display: 'flex',
    justifyContent: 'center',
    gap: '1.5rem',
    marginBottom: '1.5rem',
    padding: '0 0.5rem',
  },
  progressStep: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.4rem',
  },
  stepCircle: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.8rem',
    fontWeight: '600',
    transition: 'all 0.2s',
  },
  stepLabel: {
    fontSize: '0.7rem',
    fontWeight: '500',
  },
  stepContent: {
    marginTop: '0.5rem',
  },
  stepTitle: {
    fontSize: '1.2rem',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '1.25rem',
    textAlign: 'center',
  },
  roleButton: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px 20px',
    background: '#fff',
    border: '2px solid #E5E7EB',
    borderRadius: '12px',
    cursor: 'pointer',
    marginBottom: '12px',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    fontFamily: 'inherit',
  },
  roleIcon: {
    fontSize: '28px',
    flexShrink: 0,
  },
  roleButtonTitle: {
    display: 'block',
    fontSize: '16px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '2px',
  },
  roleButtonDesc: {
    display: 'block',
    fontSize: '13px',
    color: '#6B7280',
    lineHeight: '1.4',
  },
  field: {
    marginBottom: '1rem',
    textAlign: 'left',
  },
  fieldLabel: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '0.4rem',
  },
  required: {
    color: '#DC2626',
    fontSize: '0.8rem',
    fontWeight: '400',
  },
  input: {
    width: '100%',
    padding: '0.7rem 1rem',
    border: '1px solid #D1D5DB',
    borderRadius: '10px',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'border-color 0.15s',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  primaryButton: {
    backgroundColor: '#5D0022',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    padding: '0.75rem 1.5rem',
    fontSize: '0.95rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
    fontFamily: 'inherit',
  },
  backButton: {
    backgroundColor: '#F3F4F6',
    color: '#374151',
    border: 'none',
    borderRadius: '10px',
    padding: '0.75rem 1.5rem',
    fontSize: '0.95rem',
    fontWeight: '500',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  skipButton: {
    display: 'block',
    width: '100%',
    background: 'none',
    border: 'none',
    color: '#9CA3AF',
    fontSize: '0.85rem',
    cursor: 'pointer',
    marginTop: '12px',
    textDecoration: 'underline',
    fontFamily: 'inherit',
  },
  buttonRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '1.25rem',
  },
  link: {
    color: '#5D0022',
    fontWeight: '600',
    textDecoration: 'none',
  },
  loginLink: {
    fontSize: '14px',
    color: '#6B7280',
    marginTop: '16px',
    textAlign: 'center',
  },
  instructions: {
    backgroundColor: '#F0F5FF',
    borderRadius: '8px',
    padding: '1.25rem',
    marginBottom: '1.25rem',
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
    textAlign: 'left',
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
    borderRadius: '10px',
    padding: '1.25rem',
    marginBottom: '1.25rem',
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
  consent: {
    marginBottom: '0.75rem',
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
