'use client';

import { useState } from 'react';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleReset = async () => {
    setError('');
    setLoading(true);

    if (password.length < 4) {
      setError('Password must be at least 4 characters.');
      setLoading(false);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords don\'t match.');
      setLoading(false);
      return;
    }

    // Get token from URL
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      setError('Invalid or missing reset link. Please request a new one.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.error || 'Failed to reset password. Please try again.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logoBox}>C</div>

        {success ? (
          <>
            <h1 style={styles.title}>Password Reset!</h1>
            <p style={styles.subtitle}>Your password has been updated. You can now sign in with your new password.</p>
            <a href="/login" style={styles.primaryButton}>Go to Login</a>
          </>
        ) : (
          <>
            <h1 style={styles.title}>Set New Password</h1>
            <p style={styles.subtitle}>Enter your new password below.</p>

            {error && <div style={styles.errorBox}>{error}</div>}

            <div style={styles.field}>
              <label style={styles.label}>New Password</label>
              <div style={styles.passwordWrap}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  placeholder="At least 4 characters"
                  style={{ ...styles.input, paddingRight: '44px' }}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Confirm New Password</label>
              <div style={styles.passwordWrap}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
                  placeholder="Re-enter your password"
                  style={{ ...styles.input, paddingRight: '44px' }}
                  autoComplete="new-password"
                  onKeyDown={e => { if (e.key === 'Enter') handleReset(); }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeBtn}
                  tabIndex={-1}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button
              onClick={handleReset}
              disabled={loading}
              style={{ ...styles.primaryButton, opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

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
    maxWidth: '420px',
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
    margin: '0 auto 20px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '800',
    marginBottom: '8px',
    color: '#111827',
  },
  subtitle: {
    color: '#64748B',
    fontSize: '15px',
    marginBottom: '28px',
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
  passwordWrap: {
    position: 'relative',
  },
  eyeBtn: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '2px',
    lineHeight: 1,
    opacity: 0.7,
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    border: '1px solid #D1D5DB',
    borderRadius: '10px',
    fontSize: '15px',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  primaryButton: {
    display: 'inline-block',
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
    textDecoration: 'none',
    textAlign: 'center',
    boxSizing: 'border-box',
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
};
