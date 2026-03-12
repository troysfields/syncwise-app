// API Route: /api/auth/session
// Creates or destroys a session for the consent-based beta.
// POST: Create session + save user to database
// DELETE: Destroy session (logout)
// GET: Check current session status + load profile from DB

import { NextResponse } from 'next/server';
import { createSession, getSession, sessionCookieHeader, clearSessionCookieHeader, sanitizeString, sanitizeEmail } from '@/lib/auth';
import { saveUser, getUser } from '@/lib/db';

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, email, role, icalUrl, courses } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'Name is required to create a session.' },
        { status: 400 }
      );
    }

    const cleanEmail = sanitizeEmail(email || '');
    const cleanName = sanitizeString(name, 100);
    const userRole = role === 'instructor' ? 'instructor' : 'student';

    // Create signed session token (cookie)
    const token = createSession({
      name: cleanName,
      email: cleanEmail,
      role: userRole,
    });

    if (!token) {
      return NextResponse.json(
        { error: 'Session creation failed. Server configuration issue (missing secret).' },
        { status: 500 }
      );
    }

    // Save user profile to database (persistent across sessions/devices)
    let userProfile = null;
    try {
      userProfile = await saveUser(cleanEmail || `anon_${Date.now()}`, {
        name: cleanName,
        email: cleanEmail,
        role: userRole,
        icalUrl: icalUrl || '',
        courses: courses || {},
        setupCompleted: true,
        setupDate: new Date().toISOString(),
      });
    } catch (dbErr) {
      console.warn('[SESSION] DB save failed (continuing with cookie-only):', dbErr.message);
    }

    const response = NextResponse.json({
      success: true,
      message: 'Session created.',
      user: {
        name: cleanName,
        email: cleanEmail,
        role: userRole,
        profileSaved: !!userProfile,
      },
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
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  // Load full profile from database
  let profile = null;
  try {
    profile = await getUser(session.email);
  } catch {
    // DB not available — return session data only
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      name: profile?.name || session.name,
      email: profile?.email || session.email,
      role: profile?.role || session.role,
      icalUrl: profile?.icalUrl || '',
      courses: profile?.courses || {},
      settings: profile?.settings || {},
      setupCompleted: profile?.setupCompleted || false,
      createdAt: profile?.createdAt || null,
    },
    expiresAt: new Date(session.exp).toISOString(),
  });
}
