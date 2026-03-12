// SyncWise AI — Route Protection Middleware
// Protects API routes and admin pages from unauthorized access
// For the consent-based beta, this provides basic rate limiting and
// request validation. Full OAuth-based auth is wired for when
// D2L/Outlook API access is obtained.

import { NextResponse } from 'next/server';

// Admin routes require a simple secret (set via env var)
const ADMIN_SECRET = process.env.ADMIN_SECRET || null;

// Rate limiting — simple in-memory tracker (swap for Redis in production)
const requestCounts = new Map();
const RATE_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_MINUTE = 60;

function checkRateLimit(ip) {
  const now = Date.now();
  const key = ip || 'unknown';
  const entry = requestCounts.get(key);

  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    requestCounts.set(key, { windowStart: now, count: 1 });
    return true;
  }

  entry.count++;
  if (entry.count > MAX_REQUESTS_PER_MINUTE) {
    return false;
  }
  return true;
}

// Clean up stale entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of requestCounts) {
      if (now - entry.windowStart > RATE_WINDOW_MS * 5) {
        requestCounts.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
             request.headers.get('x-real-ip') ||
             'unknown';

  // ─── Rate Limiting (all API routes) ───
  if (pathname.startsWith('/api/')) {
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }
  }

  // ─── Admin Route Protection ───
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    // If ADMIN_SECRET is set, require it via query param or header
    if (ADMIN_SECRET) {
      const url = new URL(request.url);
      const querySecret = url.searchParams.get('secret');
      const headerSecret = request.headers.get('x-admin-secret');

      if (querySecret !== ADMIN_SECRET && headerSecret !== ADMIN_SECRET) {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json(
            { error: 'Unauthorized — admin access required' },
            { status: 401 }
          );
        }
        // For page routes, redirect to dashboard
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
  }

  // ─── API Input Validation ───
  if (pathname.startsWith('/api/feeds/') || pathname.startsWith('/api/dashboard/')) {
    // Ensure POST requests have content-type
    if (request.method === 'POST') {
      const contentType = request.headers.get('content-type');
      if (!contentType?.includes('application/json') && !contentType?.includes('multipart/form-data')) {
        return NextResponse.json(
          { error: 'Invalid content type. Expected application/json or multipart/form-data.' },
          { status: 400 }
        );
      }
    }
  }

  // ─── CORS Headers for API routes ───
  if (pathname.startsWith('/api/')) {
    const response = NextResponse.next();
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    return response;
  }

  return NextResponse.next();
}

// Only run middleware on relevant paths
export const config = {
  matcher: [
    '/api/:path*',
    '/admin/:path*',
  ],
};
