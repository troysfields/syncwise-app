// SyncWise AI — Authentication & Session Management
// Lightweight session system for the consent-based beta.
// Uses HMAC-signed cookies (no database needed yet).
// Upgrade path: swap for NextAuth sessions when OAuth is wired.

import { NextResponse } from 'next/server';
import crypto from 'crypto';

// ─── Configuration ───
const SESSION_COOKIE = 'syncwise_session';
const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds
const SIGNING_SECRET = process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET || null;
const ADMIN_SECRET = process.env.ADMIN_SECRET || null;

// ─── Token Signing ───

function sign(payload) {
  if (!SIGNING_SECRET) {
    console.warn('[AUTH] No NEXTAUTH_SECRET or SESSION_SECRET set — sessions will not work');
    return null;
  }
  const data = JSON.stringify(payload);
  const encoded = Buffer.from(data).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SIGNING_SECRET)
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${signature}`;
}

function verify(token) {
  if (!token || !SIGNING_SECRET) return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [encoded, signature] = parts;
  const expectedSig = crypto
    .createHmac('sha256', SIGNING_SECRET)
    .update(encoded)
    .digest('base64url');

  // Timing-safe comparison to prevent timing attacks
  if (signature.length !== expectedSig.length) return null;
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSig);
  if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) return null;

  try {
    const data = JSON.parse(Buffer.from(encoded, 'base64url').toString());

    // Check expiration
    if (data.exp && Date.now() > data.exp) return null;

    return data;
  } catch {
    return null;
  }
}

// ─── Session Management ───

/**
 * Create a session token for a user.
 * Call this when setup completes or user logs in.
 * Returns the token string to set as a cookie.
 */
export function createSession(userData) {
  const payload = {
    sub: userData.email || userData.name || 'anonymous',
    name: userData.name || '',
    email: userData.email || '',
    role: userData.role || 'student',
    iat: Date.now(),
    exp: Date.now() + (SESSION_MAX_AGE * 1000),
  };
  return sign(payload);
}

/**
 * Parse and validate the session from a request.
 * Returns the session data or null if invalid/missing.
 */
export function getSession(request) {
  // Check cookie
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [key, ...val] = c.trim().split('=');
      return [key, val.join('=')];
    })
  );

  const token = cookies[SESSION_COOKIE];
  if (token) {
    const session = verify(decodeURIComponent(token));
    if (session) return session;
  }

  // Also check Authorization header (for API clients)
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const bearerToken = authHeader.slice(7);
    const session = verify(bearerToken);
    if (session) return session;
  }

  return null;
}

/**
 * Require authentication — returns error response or session data.
 * Use in API routes: const session = requireAuth(request); if (session instanceof NextResponse) return session;
 */
export function requireAuth(request) {
  const session = getSession(request);
  if (!session) {
    return NextResponse.json(
      { error: 'Authentication required. Please complete setup or log in.' },
      { status: 401 }
    );
  }
  return session;
}

/**
 * Require admin access — checks ADMIN_SECRET from header or query param.
 * FAILS CLOSED: if ADMIN_SECRET is not configured, admin access is denied.
 */
export function requireAdmin(request) {
  // Fail closed — if no ADMIN_SECRET is set, nobody gets in
  if (!ADMIN_SECRET) {
    return NextResponse.json(
      { error: 'Admin access is not configured. Set ADMIN_SECRET environment variable.' },
      { status: 403 }
    );
  }

  const url = new URL(request.url);
  const querySecret = url.searchParams.get('secret');
  const headerSecret = request.headers.get('x-admin-secret');

  if (querySecret !== ADMIN_SECRET && headerSecret !== ADMIN_SECRET) {
    return NextResponse.json(
      { error: 'Unauthorized — valid admin credentials required.' },
      { status: 401 }
    );
  }

  return true; // Admin access granted
}

/**
 * Require instructor role — checks session for instructor/admin role.
 */
export function requireInstructor(request) {
  const session = getSession(request);
  if (!session) {
    return NextResponse.json(
      { error: 'Authentication required.' },
      { status: 401 }
    );
  }
  if (session.role !== 'instructor' && session.role !== 'admin') {
    return NextResponse.json(
      { error: 'Instructor access required.' },
      { status: 403 }
    );
  }
  return session;
}

/**
 * Build a Set-Cookie header string for the session.
 */
export function sessionCookieHeader(token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}${secure}`;
}

/**
 * Build a Set-Cookie header to clear/destroy the session.
 */
export function clearSessionCookieHeader() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

// ─── Input Sanitization ───

/**
 * Sanitize a string input — trim, limit length, strip control chars.
 */
export function sanitizeString(input, maxLength = 1000) {
  if (typeof input !== 'string') return '';
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ''); // strip control chars except \t \n \r
}

/**
 * Sanitize a URL input — must be valid https URL.
 */
export function sanitizeUrl(input) {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Sanitize an email input.
 */
export function sanitizeEmail(input) {
  if (typeof input !== 'string') return '';
  const trimmed = input.trim().toLowerCase().slice(0, 254);
  // Basic email pattern — not exhaustive but catches obvious junk
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return '';
  return trimmed;
}
