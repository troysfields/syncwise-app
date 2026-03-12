// API Route: /api/auth/session
// Creates or destroys a session for the consent-based beta.
// POST: Create session (called after setup wizard completes)
// DELETE: Destroy session (logout)
// GET: Check current session status

import { NextResponse } from 'next/server';
import { createSession, getSession, sessionCookieHeader, clearSessionCookieHeader, sanitizeString, sanitizeEmail } from '@/lib/auth';

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, email, role } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'Name is required to create a session.' },
        { status: 400 }
      );
    }

    const token = createSession({
      name: sanitizeString(name, 100),
      email: sanitizeEmail(email || ''),
      role: role === 'instructor' ? 'instructor' : 'student',
    });

    if (!token) {
      return NextResponse.json(
        { error: 'Session creation failed. Server configuration issue (missing secret).' },
        { status: 500 }
      );
    }

    const response = NextResponse.json({
      success: true,
      message: 'Session created.',
      user: { name: sanitizeString(name, 100), role: role === 'instructor' ? 'instructor' : 'student' },
    });

    response.headers.set('Set-Cookie', sessionCookieHeader(token));
    return response;
  } catch (error) {
    console.error('Session creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create session.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  const response = NextResponse.json({ success: true, message: 'Session destroyed.' });
  response.headers.set('Set-Cookie', clearSessionCookieHeader());
  return response;
}

export async function GET(request) {
  const session = getSession(request);
  if (session) {
    return NextResponse.json({
      authenticated: true,
      user: { name: session.name, email: session.email, role: session.role },
      expiresAt: new Date(session.exp).toISOString(),
    });
  }
  return NextResponse.json({ authenticated: false }, { status: 401 });
}
