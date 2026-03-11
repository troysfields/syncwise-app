'use client';

import { useState, useEffect, useCallback } from 'react';

// ============================================================
// Toast Notification System — Student-facing error alerts
// Shows friendly, non-technical messages when things go wrong
// Auto-dismisses after a few seconds, stacks multiple toasts
// ============================================================

// Toast types: error (red), warning (amber), info (blue), success (green)
const TOAST_STYLES = {
  error: {
    bg: '#FEF2F2',
    border: '#FECACA',
    icon: '⚠️',
    titleColor: '#991B1B',
    textColor: '#7F1D1D',
  },
  warning: {
    bg: '#FFFBEB',
    border: '#FDE68A',
    icon: '⏳',
    titleColor: '#92400E',
    textColor: '#78350F',
  },
  info: {
    bg: '#EFF6FF',
    border: '#BFDBFE',
    icon: 'ℹ️',
    titleColor: '#1E40AF',
    textColor: '#1D4ED8',
  },
  success: {
    bg: '#F0FDF4',
    border: '#BBF7D0',
    icon: '✅',
    titleColor: '#166534',
    textColor: '#15803D',
  },
};

// ============================================================
// useToast Hook — Call this from any component to show toasts
// ============================================================

let toastIdCounter = 0;
let globalAddToast = null;

export function showToast({ type, message, hint, action, duration }) {
  if (globalAddToast) {
    globalAddToast({ type, message, hint, action, duration });
  }
}

// Report an error to the server AND show a student toast
export async function reportError({
  errorCode,
  severity,
  platform,
  endpoint,
  httpStatus,
  errorMessage,
  user,
  context,
}) {
  try {
    const res = await fetch('/api/errors/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        errorCode,
        severity,
        platform,
        endpoint,
        httpStatus,
        errorMessage,
        user,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        context,
      }),
    });
    const data = await res.json();

    if (data.studentMessage) {
      const msg = data.studentMessage;
      showToast({
        type: severity === 'critical' || severity === 'high' ? 'error' : 'warning',
        message: msg.message,
        hint: msg.hint,
        action: msg.action,
        duration: severity === 'critical' ? 15000 : 8000,
      });
    }

    return data;
  } catch (err) {
    // Even the error reporter failed — show a generic toast
    showToast({
      type: 'error',
      message: "Something unexpected happened.",
      hint: "Try refreshing the page.",
      action: "If this keeps happening, the SyncWise team will look into it.",
      duration: 8000,
    });
    return null;
  }
}

// ============================================================
// ToastContainer Component — Renders in the layout
// ============================================================

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ type = 'info', message, hint, action, duration = 8000 }) => {
    const id = ++toastIdCounter;
    setToasts(prev => [...prev, { id, type, message, hint, action, entering: true }]);

    // Auto-dismiss
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 300);
    }, duration);
  }, []);

  // Register global function
  useEffect(() => {
    globalAddToast = addToast;
    return () => { globalAddToast = null; };
  }, [addToast]);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 300);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '70px',
      right: '20px',
      zIndex: 200,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      maxWidth: '400px',
      width: '100%',
    }}>
      {toasts.map(toast => {
        const style = TOAST_STYLES[toast.type] || TOAST_STYLES.info;
        return (
          <div
            key={toast.id}
            style={{
              background: style.bg,
              border: `1px solid ${style.border}`,
              borderRadius: '12px',
              padding: '14px 16px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              opacity: toast.exiting ? 0 : 1,
              transform: toast.exiting ? 'translateX(100%)' : 'translateX(0)',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
            }}
            onClick={() => dismiss(toast.id)}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <span style={{ fontSize: '18px', flexShrink: 0, marginTop: '1px' }}>{style.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: style.titleColor, marginBottom: '3px' }}>
                  {toast.message}
                </div>
                {toast.hint && (
                  <div style={{ fontSize: '12px', color: style.textColor, lineHeight: '1.5', marginBottom: '3px' }}>
                    {toast.hint}
                  </div>
                )}
                {toast.action && (
                  <div style={{ fontSize: '11px', color: '#94A3B8', fontStyle: 'italic' }}>
                    {toast.action}
                  </div>
                )}
              </div>
              <span style={{ fontSize: '14px', color: '#94A3B8', flexShrink: 0, marginTop: '-2px' }}>✕</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
