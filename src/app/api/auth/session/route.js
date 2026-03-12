// API Route: /api/auth/session
// Creates or destroys a session for the beta.
// POST: Create session (from setup) or login with email+password
// DELETE: Destroy session (logout)
// GET: Check current session status + load profile from DB

import { NextResponse } from 'next/server';
import { createSession, getSession, sessionCookieHeader, clearSessionCookieHeader, sanitizeString, sanitizeEmail } from '@/lib/auth';
import { saveUser, getUser, saveUserPassword, verifyUserPassword, hasPassword } from '@/lib/db';

export async function POST(request) {
  try {
    const body = await request.json();
    const { action } = body;

    // ─── LOGIN: email + password ───
    if (action === 'login') {
      const { email, password } = body;
      const cleanEmail = sanitizeEmail(email || '');

      if (!cleanEmail) {
        return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
      }
      if (!password) {
        return NextResponse.json({ error: 'Please enter your password.' }, { status: 400 });
      }

      // Check if user exists
      const user = await getUser(cleanEmail);
      if (!user) {
        return NextResponse.json({ error: 'No account found with that email. Please sign up first.' }, { status: 404 });
      }

      // Verify password
      const valid = await verifyUserPassword(cleanEmail, password);
      if (!valid) {
        return NextResponse.json({ error: 'Incorrect password. Please try again.' }, { status: 401 });
      }

      // Create session
      const token = createSession({
        name: user.name,
        email: cleanEmail,
        role: user.role || 'student',
      });

      if (!token) {
        return NextResponse.json({ error: 'Session creation failed. Server configuration issue.' }, { status: 500 });
      }

      const response = NextResponse.json({
        success: true,
        message: 'Logged in successfully.',
        user: {
          name: user.name,
          email: cleanEmail,
          role: user.role,
          setupCompleted: user.setupCompleted,
        },
      });

      response.headers.set('Set-Cookie', sessionCookieHeader(token));
      return response;
    }

    // ─── SIGNUP: create new account from setup ───
    const { name, email, role, icalUrl, courses, password } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
    }

    const cleanEmail = sanitizeEmail(email || '');
    if (!cleanEmail) {
      return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 });
    }

    const cleanName = sanitizeString(name, 100);
    const userRole = role === 'instructor' ? 'instructor' : 'student';

    // Instructor email verification — must be @coloradomesa.edu
    if (userRole === 'instructor') {
      if (!cleanEmail.endsWith('@coloradomesa.edu')) {
        return NextResponse.json(
          { error: 'Instructor accounts require a @coloradomesa.edu email address.' },
          { status: 403 }
        );
      }
    }

    // Check if account already exists
    const existingUser = await getUser(cleanEmail);
    if (existingUser && await hasPassword(cleanEmail)) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Please log in instead.' },
        { status: 409 }
      );
    }

    // Save password if provided
    if (password) {
      await saveUserPassword(cleanEmail, password);
    }

    // Create signed session token
    const token = createSession({
      name: cleanName,
      email: cleanEmail,
      role: userRole,
    });

    if (!token) {
      return NextResponse.json({ error: 'Session creation failed. Server configuration issue.' }, { status: 500 });
    }

    // Save user profile to database
    let userProfile = null;
    try {
      userProfile = await saveUser(cleanEmail, {
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
      message: 'Account created.',
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
    console.error('Session error:', error);
    return NextResponse.json({ error: 'Failed to process request.' }, { status: 500 });
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
