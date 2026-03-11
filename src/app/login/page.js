'use client';

import { useState } from 'react';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  function getD2LAuthUrl() {
    const baseUrl = process.env.NEXT_PUBLIC_D2L_BASE_URL || 'https://coloradomesa.brightspace.com';
    const params = new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_D2L_CLIENT_ID || 'YOUR_D2L_CLIENT_ID',
      response_type: 'code',
      redirect_uri: `${typeof window !== 'undefined' ? window.location.origin : ''}/api/d2l/callback`,
      scope: 'calendar:events:read grades:own_grades:read',
    });
    return `${baseUrl}/d2l/auth/api/authorize?${params.toString()}`;
  }

  const handleMicrosoftLogin = () => {
    setLoading(true);
    window.location.href = '/api/auth/signin/azure-ad';
  };

  const handleD2LLogin = () => {
    setLoading(true);
    window.location.href = getD2LAuthUrl();
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #EEF2FF 0%, #F1F5F9 100%)',
    }}>
      <div style={{
        background: 'white',
        borderRadius: '20px',
        padding: '48px',
        maxWidth: '440px',
        width: '90%',
        textAlign: 'center',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)',
      }}>
        {/* Logo */}
        <div style={{
          width: '56px',
          height: '56px',
          background: '#4F46E5',
          borderRadius: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '24px',
          fontWeight: '800',
          margin: '0 auto 20px',
        }}>S</div>

        <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '8px' }}>
          Welcome to SyncWise AI
        </h1>
        <p style={{ color: '#64748B', fontSize: '15px', marginBottom: '36px' }}>
          Sign in with your Colorado Mesa University account to get started.
        </p>

        {/* Microsoft Sign In */}
        <button
          onClick={handleMicrosoftLogin}
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px',
            background: '#2563EB',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontSize: '15px',
            fontWeight: '600',
            cursor: loading ? 'wait' : 'pointer',
            opacity: loading ? 0.7 : 1,
            marginBottom: '12px',
            fontFamily: 'inherit',
          }}
        >
          Sign in with CMU Microsoft Account
        </button>

        {/* D2L Sign In */}
        <button
          onClick={handleD2LLogin}
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px',
            background: '#F59E0B',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontSize: '15px',
            fontWeight: '600',
            cursor: loading ? 'wait' : 'pointer',
            opacity: loading ? 0.7 : 1,
            fontFamily: 'inherit',
          }}
        >
          Connect D2L Brightspace
        </button>

        <p style={{ color: '#94A3B8', fontSize: '12px', marginTop: '24px', lineHeight: '1.6' }}>
          By signing in, you grant SyncWise read access to your calendar and assignments.
          You can revoke access at any time. We never share your data.
        </p>
      </div>
    </div>
  );
}
