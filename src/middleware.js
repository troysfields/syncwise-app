// SyncWise AI — Route Protection Middleware
// Security layer for all API and admin routes.
// Features: rate limiting, CSP, HSTS, CORS, admin auth (fail-closed),
// content-type validation, security headers.

import { NextResponse } from 'next/server';

// ─── Configuration ───
const ADMIN_SECRET = process.env.ADMIN_SECRET || null;
const ALLOWED_ORIGINS = [
  'https://syncwise-app.vercel.app',
  'https://syncwise-landing.vercel.app',
  process.env.NEXTAUTH_URL || 'http://localhost:3000',
].filter(Boolean);

// ─── Rate Limiting ───
const requestCounts = new Map();
const RATE_WINDOW_MS = 60 * 1000; // 1 minute

// Different limits for different route types
const RATE_LIMITS_BY_ROUTE = {
  '/api/chat': 20,            // 20 chat messages per minute (costs money)
  '/api/ai/prioritize': 10,   // 10 prioritization calls per minute
  '/api/auth/session': 10,    // 10 auth attempts per minute (brute force protection)
  '/api/auth/forgot-password': 3, // 3 password resets per minute
  '/api/feeds/ical': 15,      // 15 iCal refreshes per minute
  '/api/feeds/upload': 10,    // 10 file uploads per minute
  '/api/errors/report': 15,   // 15 error reports per minute (public endpoint)
  '/api/feedback': 5,         // 5 feedback submissions per minute
  '/api/email/scan': 5,       // 5 email scans per minute (triggers AI)
  '/api/admin/': 30,          // 30 admin requests per minute
  _default: 60,               // 60 requests per minute for everything else
};

function getRouteLimit(pathname) {
  for (const [route, limit] of Object.entries(RATE_LIMITS_BY_ROUTE)) {
    if (route !== '_default' && pathname.startsWith(route)) return limit;
  }
  return RATE_LIMITS_BY_ROUTE._default;
}

function checkRateLimit(ip, pathname) {
  const now = Date.now();
  const limit = getRouteLimit(pathname);
  const key = `${ip || 'unknown'}:${pathname.split('/').slice(0, 4).join('/')}`;
  const entry = requestCounts.get(key);

  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    requestCounts.set(key, { windowStart: now, count: 1 });
    return true;
  }

  entry.count++;
  return entry.count <= limit;
}

// Clean up stale rate limit entries every 5 minutes
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

// ─── Routes that don't require auth ───
// These are public endpoints or handle their own auth
const PUBLIC_ROUTES = [
  '/api/auth/',         // NextAuth and session endpoints handle their own auth
  '/api/errors/report', // Error reporting should always work (client may not be authenticated)
];

function isPublicRoute(pathname) {
  return PUBLIC_ROUTES.some(route => pathname.startsWith(route));
}

// ─── Page routes that require a valid session ───
// Any page route NOT in this list is considered public (login, setup, welcome, privacy, etc.)
const PROTECTED_PAGE_ROUTES = [
  '/dashboard',
  '/settings',
  '/instructor',
  '/future-updates',
];

// ─── Main Middleware ───
export function middleware(request) {
  const { pathname } = request.nextUrl;
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
             request.headers.get('x-real-ip') ||
             'unknown';
  const origin = request.headers.get('origin');

  // ─── CORS Preflight ───
  if (request.method === 'OPTIONS' && pathname.startsWith('/api/')) {
    const response = new NextResponse(null, { status: 204 });
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    }
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Secret');
    response.headers.set('Access-Control-Max-Age', '86400');
    return response;
  }

  // ─── Rate Limiting (all API routes) ───
  if (pathname.startsWith('/api/')) {
    if (!checkRateLimit(ip, pathname)) {
      // Track rate limit hit (fire-and-forget, can't use async imports in middleware edge runtime
      // so we log to console — analytics tracking happens at the API layer)
      console.warn(`[RATE_LIMIT] 429 for ${ip} on ${pathname}`);
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.', rateLimited: true },
        { status: 429 }
      );
    }
  }

  // ─── Admin Route Protection (FAIL CLOSED) ───
  // Protect both /api/admin/* AND /admin/* page routes in middleware.
  if (pathname.startsWith('/admin') && !pathname.startsWith('/api/admin')) {
    // /admin/tr0y-health has its own in-page password gate — let it through.
    // It sets the admin_authenticated cookie on success so other admin pages work.
    if (pathname.startsWith('/admin/tr0y-health')) {
      // Allow — page handles its own auth
    } else {
      // All other admin pages require the admin_authenticated cookie
      if (!ADMIN_SECRET) {
        return NextResponse.redirect(new URL('/login', request.url));
      }
      const adminCookie = request.cookies.get('admin_authenticated')?.value;
      if (adminCookie !== ADMIN_SECRET) {
        // Redirect to the admin login page (tr0y-health) instead of /login
        return NextResponse.redirect(new URL('/admin/tr0y-health', request.url));
      }
    }
  }

  if (pathname.startsWith('/api/admin')) {
    if (!ADMIN_SECRET) {
      return NextResponse.json(
        { error: 'Admin access not configured. Set ADMIN_SECRET env var.' },
        { status: 403 }
      );
    }

    const headerSecret = request.headers.get('x-admin-secret');

    if (headerSecret !== ADMIN_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized — admin credentials required.' },
        { status: 401 }
      );
    }
  }

  // ─── Protected Page Routes — require session cookie ───
  // If the user hits /dashboard, /settings, /instructor, /future-updates
  // without a valid session cookie, send them to the landing page.
  // They've never logged in on this browser — show them what the product is first.
  const isProtectedPage = PROTECTED_PAGE_ROUTES.some(route => pathname.startsWith(route));
  if (isProtectedPage) {
    const sessionCookie = request.cookies.get('syncwise_session')?.value;
    if (!sessionCookie) {
      return NextResponse.redirect(new URL('https://syncwise-landing.vercel.app'));
    }
  }

  // ─── API Input Validation ───
  if (pathname.startsWith('/api/feeds/') || pathname.startsWith('/api/dashboard/') || pathname.startsWith('/api/chat')) {
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

  // ─── Security Headers (all responses) ───
  const response = NextResponse.next();

  // Content Security Policy — strict, prevents XSS
  response.headers.set('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",  // Next.js requires unsafe-inline/eval
    "style-src 'self' 'unsafe-inline'",                   // Inline styles for React
    "img-src 'self' data: blob: https:",                   // Allow images from HTTPS sources
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://d2l.coloradomesa.edu https://api.anthropic.com https://*.vercel.app",
    "frame-ancestors 'none'",                               // Prevent clickjacking (like X-Frame-Options)
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join('; '));

  // HTTP Strict Transport Security — force HTTPS
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');

  // XSS Protection (legacy browsers)
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // Referrer policy — don't leak full URL to external sites
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions policy — disable unused browser features
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');

  // CORS headers for API routes
  if (pathname.startsWith('/api/') && origin && ALLOWED_ORIGINS.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  return response;
}

// Only run middleware on relevant paths
export const config = {
  matcher: [
    '/api/:path*',
    '/admin/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
