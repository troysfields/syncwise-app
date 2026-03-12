'use client';

import { Component } from 'react';

// React Error Boundary — Catches crashes on the student dashboard
// Shows a friendly fallback UI instead of a blank white screen
// Reports the crash to the error API so Troy + Claude can debug

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });

    // Report to error API
    fetch('/api/errors/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        errorCode: 'client_crash',
        severity: 'high',
        platform: 'client',
        errorMessage: error?.message || 'Unknown crash',
        stackTrace: error?.stack || '',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        context: {
          componentStack: errorInfo?.componentStack || '',
          url: typeof window !== 'undefined' ? window.location.href : '',
        },
      }),
    }).catch(() => {});
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          fontFamily: 'Inter, -apple-system, sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          padding: '40px',
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '40px',
            maxWidth: '480px',
            textAlign: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>😓</div>
            <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px', color: '#0F172A' }}>
              Something went wrong
            </h2>
            <p style={{ fontSize: '14px', color: '#64748B', lineHeight: '1.6', marginBottom: '20px' }}>
              The dashboard ran into an unexpected issue. Don&apos;t worry — your data is safe.
              The SyncWise team has been automatically notified and is looking into it.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '10px 24px',
                  background: '#5D0022',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Refresh Page
              </button>
              <button
                onClick={() => window.location.href = '/login'}
                style={{
                  padding: '10px 24px',
                  background: 'white',
                  color: '#334155',
                  border: '2px solid #CBD5E1',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Sign In Again
              </button>
            </div>
            <p style={{ fontSize: '11px', color: '#94A3B8', marginTop: '16px' }}>
              If this keeps happening, email troysfields@gmail.com
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
