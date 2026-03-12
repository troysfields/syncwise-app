'use client';

import { useState } from 'react';

export default function LoginPage() {
  const [view, setView] = useState('pick-role'); // 'pick-role', 'login-student', 'login-instructor', 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // ─── Login handler ───
  const handleLogin = async (role) => {
    setLoading(true);
    setError('');

    if (!email.trim()) {
      setError('Please enter your email.');
      setLoading(false);
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      setLoading(false);
      return;
    }

    // Instructor email check
    if (role === 'instructor' && !email.trim().toLowerCase().endsWith('@coloradomesa.edu')) {
      setError('Instructor accounts require a @coloradomesa.edu email address.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email: email.trim(), password }),
      });
      const data = await res.json();

      if (data.success) {
        // Redirect based on role
        const user = data.user;
        if (user.role === 'instructor') {
          window.location.href = '/instructor';
        } else {
          window.location.href = '/dashboard';
        }
      } else {
        setError(data.error || 'Login failed. Please try again.');
      }
    } catch (err) {
      setError('Network error. Please check your connection.');
    }
    setLoading(false);
  };

  // ─── Forgot password handler ───
  const handleForgotPassword = async () => {
    setLoading(true);
    setError('');
    setMessage('');

    if (!email.trim()) {
      setError('Please enter your email address first.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      setMessage(data.message || 'If an account exists, a reset link has been sent.');
    } catch (err) {
      setError('Network error. Please try again.');
    }
    setLoading(false);
  };

  // ─── OAuth handlers (hidden, kept for future sandbox testing) ───
  // const handleMicrosoftLogin = () => { window.location.href = '/api/auth/signin/azure-ad'; };
  // const handleD2LLogin = () => { ... };

  // ─── Role Picker View ───
  if (view === 'pick-role') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.logoBox}>C</div>
          <h1 style={styles.title}>CMU AI Calendar</h1>
          <p style={styles.brandSub}>by SyncWise AI</p>
          <p style={styles.subtitle}>Sign in to your account to get started.</p>

          <button
            onClick={() => { setView('login-student'); setError(''); setMessage(''); }}
            style={styles.roleButton}
          >
            <span style={styles.roleIcon}>🎓</span>
            <div>
              <span style={styles.roleTitle}>I&apos;m a Student</span>
              <span style={styles.roleDesc}>View your assignments, deadlines, and AI suggestions</span>
            </div>
          </button>

          <button
            onClick={() => { setView('login-instructor'); setError(''); setMessage(''); }}
            style={{ ...styles.roleButton, borderColor: '#FBCE04' }}
          >
            <span style={styles.roleIcon}>📚</span>
            <div>
              <span style={styles.roleTitle}>I&apos;m an Instructor</span>
              <span style={styles.roleDesc}>Upload syllabi, manage courses, and support students</span>
            </div>
          </button>

          <p style={styles.signupLink}>
            Don&apos;t have an account?{' '}
            <a href="/setup" style={styles.link}>Sign up here</a>
          </p>

          <p style={styles.footer}>
            By signing in, you grant CMU AI Calendar read access to your calendar and assignments.
            You can revoke access at any time.
          </p>
        </div>
      </div>
    );
  }

  // ─── Forgot Password View ───
  if (view === 'forgot') {
    const returnView = email.trim().toLowerCase().endsWith('@coloradomesa.edu') ? 'login-instructor' : 'login-student';
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.logoBox}>C</div>
          <h1 style={styles.title}>Reset Password</h1>
          <p style={styles.subtitle}>Enter your email and we&apos;ll send you a reset link.</p>

          {error && <div style={styles.errorBox}>{error}</div>}
          {message && <div style={styles.successBox}>{message}</div>}

          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@email.com"
              style={styles.input}
            />
          </div>

          <button
            onClick={handleForgotPassword}
            disabled={loading}
            style={{ ...styles.primaryButton, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>

          <button
            onClick={() => { setView(returnView); setError(''); setMessage(''); }}
            style={styles.textButton}
          >
            ← Back to login
          </button>
        </div>
      </div>
    );
  }

  // ─── Login Form View (Student or Instructor) ───
  const isInstructor = view === 'login-instructor';
  const roleLabel = isInstructor ? 'Instructor' : 'Student';
  const roleColor = isInstructor ? '#FBCE04' : '#5D0022';

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={{ ...styles.logoBox, background: roleColor, color: isInstructor ? '#5D0022' : '#fff' }}>C</div>
        <h1 style={styles.title}>CMU AI Calendar</h1>
        <p style={styles.brandSub}>by SyncWise AI</p>

        <div style={{
          ...styles.roleBadge,
          background: isInstructor ? '#FFF8E1' : '#FDF2F4',
          color: isInstructor ? '#92400E' : '#5D0022',
          borderColor: isInstructor ? '#FBCE04' : '#E8B4BF',
        }}>
          {isInstructor ? '📚 Instructor Login' : '🎓 Student Login'}
        </div>

        {isInstructor && (
          <p style={styles.instructorNote}>
            Instructor accounts require a <strong>@coloradomesa.edu</strong> email address.
          </p>
        )}

        {error && <div style={styles.errorBox}>{error}</div>}

        <div style={styles.field}>
          <label style={styles.label}>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setError(''); }}
            placeholder={isInstructor ? 'you@coloradomesa.edu' : 'you@email.com'}
            style={styles.input}
            autoComplete="email"
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Password</label>
          <input
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(''); }}
            placeholder="Enter your password"
            style={styles.input}
            autoComplete="current-password"
            onKeyDown={e => { if (e.key === 'Enter') handleLogin(isInstructor ? 'instructor' : 'student'); }}
          />
        </div>

        <button
          onClick={() => handleLogin(isInstructor ? 'instructor' : 'student')}
          disabled={loading}
          style={{
            ...styles.primaryButton,
            background: roleColor,
            color: isInstructor ? '#5D0022' : '#fff',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Signing in...' : `Sign In as ${roleLabel}`}
        </button>

        <div style={styles.linkRow}>
          <button onClick={() => { setView('forgot'); setError(''); }} style={styles.textButton}>
            Forgot password?
          </button>
          <button onClick={() => { setView('pick-role'); setError(''); }} style={styles.textButton}>
            ← Back
          </button>
        </div>

        <p style={styles.signupLink}>
          Don&apos;t have an account?{' '}
          <a href="/setup" style={styles.link}>Sign up here</a>
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
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #FDF2F4 0%, #F1F5F9 100%)',
    padding: '1rem',
  },
  card: {
    background: 'white',
    borderRadius: '20px',
    padding: '48px',
    maxWidth: '440px',
    width: '90%',
    textAlign: 'center',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)',
  },
  logoBox: {
    width: '56px',
    height: '56px',
    background: '#5D0022',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '24px',
    fontWeight: '800',
    margin: '0 auto 16px',
  },
  title: {
    fontSize: '26px',
    fontWeight: '800',
    marginBottom: '2px',
    color: '#111827',
  },
  brandSub: {
    fontSize: '13px',
    color: '#9CA3AF',
    marginBottom: '8px',
    fontStyle: 'italic',
  },
  subtitle: {
    color: '#64748B',
    fontSize: '15px',
    marginBottom: '28px',
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
    textAlign: 'left',
    marginBottom: '12px',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    fontFamily: 'inherit',
  },
  roleIcon: {
    fontSize: '28px',
    flexShrink: 0,
  },
  roleTitle: {
    display: 'block',
    fontSize: '16px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '2px',
  },
  roleDesc: {
    display: 'block',
    fontSize: '13px',
    color: '#6B7280',
    lineHeight: '1.4',
  },
  roleBadge: {
    display: 'inline-block',
    padding: '6px 16px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '600',
    border: '1px solid',
    marginBottom: '20px',
  },
  instructorNote: {
    fontSize: '13px',
    color: '#6B7280',
    marginBottom: '16px',
    lineHeight: '1.5',
  },
  field: {
    marginBottom: '16px',
    textAlign: 'left',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    border: '1px solid #D1D5DB',
    borderRadius: '10px',
    fontSize: '15px',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
    fontFamily: 'inherit',
  },
  primaryButton: {
    width: '100%',
    padding: '14px',
    background: '#5D0022',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'inherit',
    marginTop: '4px',
  },
  textButton: {
    background: 'none',
    border: 'none',
    color: '#5D0022',
    fontSize: '14px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    padding: '4px',
  },
  linkRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '16px',
  },
  link: {
    color: '#5D0022',
    fontWeight: '600',
    textDecoration: 'none',
  },
  signupLink: {
    fontSize: '14px',
    color: '#6B7280',
    marginTop: '20px',
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    border: '1px solid #FECACA',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#DC2626',
    fontSize: '14px',
    marginBottom: '16px',
    textAlign: 'left',
  },
  successBox: {
    backgroundColor: '#F0FDF4',
    border: '1px solid #BBF7D0',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#166534',
    fontSize: '14px',
    marginBottom: '16px',
    textAlign: 'left',
  },
  footer: {
    color: '#94A3B8',
    fontSize: '12px',
    marginTop: '24px',
    lineHeight: '1.6',
  },
};
