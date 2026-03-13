// CMU AI Calendar — Email Service + Security Event Logging
// Handles all outbound emails via Resend API.
// Includes security notification system with traceable error codes.
//
// Error Code Format: SEC-{TYPE}-{TIMESTAMP}-{RAND}
// Example: SEC-FLOG-1773290000-a3f2
//
// Type codes:
//   FLOG = Failed Login
//   FADM = Failed Admin Auth
//   ADMX = Admin Access
//   NWUS = New User Signup
//   INST = Instructor Signup
//   PWRS = Password Reset Request
//   PWCH = Password Changed
//   SESS = Session Anomaly
//   RLIM = Rate Limit Hit
//   GERR = General Error
//
// All events are logged to Redis at key `seclog:{errorCode}`
// and can be looked up by code or listed with `seclog:*` scan.

import crypto from 'crypto';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'troysfields@gmail.com';
const APP_NAME = 'CMU AI Calendar';
const FROM_ADDRESS = `${APP_NAME} <noreply@resend.dev>`;

// ─── Error Code Generator ───

const EVENT_TYPE_CODES = {
  'Failed Login': 'FLOG',
  'Failed Admin Authentication': 'FADM',
  'Admin Dashboard Accessed': 'ADMX',
  'New User Registration': 'NWUS',
  'Instructor Account Created': 'INST',
  'Password Reset Requested': 'PWRS',
  'Password Changed': 'PWCH',
  'Session Anomaly': 'SESS',
  'Rate Limit Hit': 'RLIM',
  'Multiple Failed Login Attempts': 'FLOG',
  'General Error': 'GERR',
};

/**
 * Generate a unique, traceable error code.
 * Format: SEC-{TYPE}-{TIMESTAMP_SHORT}-{RANDOM}
 * Example: SEC-FLOG-7K3M2A-x9f2
 */
function generateErrorCode(eventName) {
  const typeCode = EVENT_TYPE_CODES[eventName] || 'GERR';
  const ts = Math.floor(Date.now() / 1000).toString(36).toUpperCase();
  const rand = crypto.randomBytes(2).toString('hex');
  return `SEC-${typeCode}-${ts}-${rand}`;
}

// ─── Security Event Logger (Redis) ───

/**
 * Log a security event to Redis for later lookup.
 * Stores full context: event, details, IP, user agent, timestamp, severity.
 * Entries expire after 90 days.
 */
async function logSecurityEvent(errorCode, eventData) {
  try {
    // Dynamic import to avoid circular deps with db.js
    const { Redis } = await import('@upstash/redis');
    const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      console.warn('[SECLOG] No Redis config — logging to console only');
      console.log('[SECLOG]', errorCode, JSON.stringify(eventData));
      return;
    }

    const redis = new Redis({ url, token });
    const key = `seclog:${errorCode}`;

    await redis.set(key, {
      ...eventData,
      errorCode,
      loggedAt: new Date().toISOString(),
    });

    // Set 90-day TTL (in seconds)
    await redis.expire(key, 90 * 24 * 60 * 60);

    console.log('[SECLOG] Event logged:', errorCode);
  } catch (err) {
    // Never let logging failure break the app
    console.error('[SECLOG] Failed to log event:', err.message);
    console.log('[SECLOG] Fallback:', errorCode, JSON.stringify(eventData));
  }
}

/**
 * Look up a security event by its error code.
 * Used from admin dashboard or Cowork session.
 */
export async function lookupSecurityEvent(errorCode) {
  try {
    const { Redis } = await import('@upstash/redis');
    const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) return null;

    const redis = new Redis({ url, token });
    return await redis.get(`seclog:${errorCode}`);
  } catch {
    return null;
  }
}

/**
 * List recent security events (most recent first).
 * Returns up to `limit` events.
 */
export async function listSecurityEvents(limit = 50) {
  try {
    const { Redis } = await import('@upstash/redis');
    const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) return [];

    const redis = new Redis({ url, token });
    const keys = [];
    let cursor = 0;
    do {
      const [nextCursor, batch] = await redis.scan(cursor, { match: 'seclog:*', count: 100 });
      cursor = nextCursor;
      keys.push(...batch);
    } while (cursor !== 0 && keys.length < limit * 2);

    // Fetch all events
    const events = [];
    for (const key of keys.slice(0, limit)) {
      const data = await redis.get(key);
      if (data) events.push(data);
    }

    // Sort by timestamp descending
    events.sort((a, b) => new Date(b.loggedAt) - new Date(a.loggedAt));
    return events.slice(0, limit);
  } catch {
    return [];
  }
}

// ─── Email Sending ───

/**
 * Send an email via Resend API.
 * Returns true if sent, false if failed or no API key.
 */
export async function sendEmail({ to, subject, html }) {
  if (!RESEND_API_KEY) {
    console.warn('[EMAIL] RESEND_API_KEY not set — email not sent:', subject);
    return false;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[EMAIL] Send failed:', err);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[EMAIL] Send error:', err.message);
    return false;
  }
}

// ─── Security Notification Emails ───

/**
 * Send a security alert to the admin with a traceable error code.
 * Also logs the event to Redis for lookup.
 */
export async function notifyAdmin({ event, details, severity = 'info', request = null }) {
  const errorCode = generateErrorCode(event);
  const timestamp = new Date().toISOString();
  const ip = request?.headers?.get('x-forwarded-for') || request?.headers?.get('x-real-ip') || 'Unknown';
  const userAgent = request?.headers?.get('user-agent') || 'Unknown';
  const url = request?.url || 'Unknown';

  // Log to Redis first (fire-and-forget)
  logSecurityEvent(errorCode, {
    event,
    details,
    severity,
    ip,
    userAgent,
    requestUrl: url,
    timestamp,
  }).catch(() => {});

  const severityColors = {
    info: '#3B82F6',
    warning: '#F59E0B',
    critical: '#DC2626',
  };
  const color = severityColors[severity] || severityColors.info;
  const severityLabel = severity.toUpperCase();

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="width: 48px; height: 48px; background: #5D0022; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; color: white; font-size: 20px; font-weight: 800;">C</div>
      </div>

      <div style="background: ${color}15; border-left: 4px solid ${color}; padding: 16px 20px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
        <h2 style="margin: 0 0 4px 0; font-size: 18px; color: #111827;">
          Security Alert: ${event}
        </h2>
        <span style="display: inline-block; background: ${color}; color: white; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 600;">${severityLabel}</span>
      </div>

      <!-- ERROR CODE BLOCK -->
      <div style="background: #111827; border-radius: 10px; padding: 16px 20px; margin-bottom: 20px; text-align: center;">
        <p style="margin: 0 0 4px 0; font-size: 11px; color: #9CA3AF; text-transform: uppercase; letter-spacing: 1px;">Tracking Code</p>
        <code style="font-size: 18px; font-weight: 700; color: #FBCE04; letter-spacing: 1.5px; font-family: 'SF Mono', 'Fira Code', Consolas, monospace;">${errorCode}</code>
        <p style="margin: 8px 0 0 0; font-size: 11px; color: #6B7280;">Use this code in Cowork to look up full event details</p>
      </div>

      <div style="background: #F9FAFB; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 8px 0; color: #6B7280; width: 120px;">Timestamp</td>
            <td style="padding: 8px 0; color: #111827; font-weight: 500;">${timestamp}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6B7280; border-top: 1px solid #E5E7EB;">IP Address</td>
            <td style="padding: 8px 0; color: #111827; font-weight: 500; border-top: 1px solid #E5E7EB;">${ip}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6B7280; border-top: 1px solid #E5E7EB;">User Agent</td>
            <td style="padding: 8px 0; color: #111827; font-weight: 500; border-top: 1px solid #E5E7EB; word-break: break-all; font-size: 12px;">${userAgent}</td>
          </tr>
          ${details ? `
          <tr>
            <td style="padding: 8px 0; color: #6B7280; border-top: 1px solid #E5E7EB;">Details</td>
            <td style="padding: 8px 0; color: #111827; font-weight: 500; border-top: 1px solid #E5E7EB;">${details}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 8px 0; color: #6B7280; border-top: 1px solid #E5E7EB;">Request URL</td>
            <td style="padding: 8px 0; color: #111827; font-weight: 500; border-top: 1px solid #E5E7EB; word-break: break-all; font-size: 12px;">${url}</td>
          </tr>
        </table>
      </div>

      <p style="color: #6B7280; font-size: 13px; line-height: 1.6;">
        This is an automated security notification from ${APP_NAME}. If you did not perform this action,
        investigate immediately. Paste the tracking code above into Cowork to pull up the full log entry with all metadata.
      </p>

      <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;" />
      <p style="color: #9CA3AF; font-size: 12px; text-align: center;">
        ${APP_NAME} by SyncWise AI — Security Monitoring
      </p>
    </div>
  `;

  return await sendEmail({
    to: ADMIN_EMAIL,
    subject: `[${severityLabel}] ${APP_NAME}: ${event} | ${errorCode}`,
    html,
  });
}

// ─── Pre-built Security Events ───

export async function notifyAdminAccess(request, details = '') {
  return notifyAdmin({
    event: 'Admin Dashboard Accessed',
    details: details || 'Someone accessed the admin health dashboard.',
    severity: 'warning',
    request,
  });
}

export async function notifyFailedAdminAuth(request) {
  return notifyAdmin({
    event: 'Failed Admin Authentication',
    details: 'Invalid admin credentials were submitted. Possible unauthorized access attempt.',
    severity: 'critical',
    request,
  });
}

export async function notifyNewUserSignup(request, { name, email, role }) {
  return notifyAdmin({
    event: 'New User Registration',
    details: `${name} (${email}) signed up as ${role}.`,
    severity: 'info',
    request,
  });
}

export async function notifyPasswordReset(request, email) {
  return notifyAdmin({
    event: 'Password Reset Requested',
    details: `Password reset link sent to: ${email}. If this wasn't requested by the account holder, the reset link will expire in 1 hour.`,
    severity: 'warning',
    request,
  });
}

export async function notifyMultipleFailedLogins(request, email, attempts) {
  return notifyAdmin({
    event: 'Multiple Failed Login Attempts',
    details: `${attempts} failed login attempt(s) for account: ${email}. This could indicate a brute-force attack or a user who forgot their password.`,
    severity: 'critical',
    request,
  });
}

export async function notifyInstructorSignup(request, { name, email }) {
  return notifyAdmin({
    event: 'Instructor Account Created',
    details: `${name} (${email}) registered as an instructor. Email verified as @mavs.coloradomesa.edu domain. This account has elevated permissions for course management.`,
    severity: 'warning',
    request,
  });
}

/**
 * Send an email notification when a user submits feedback.
 * Includes all feedback fields so the admin can review without opening the dashboard.
 */
export async function notifyFeedbackSubmission({ userEmail, userRole, feedback }) {
  const errorCode = generateErrorCode('General Error'); // reuse GERR for feedback events
  const timestamp = new Date().toISOString();

  // Log to Redis
  logSecurityEvent(errorCode, {
    event: 'Feedback Submitted',
    details: `${userEmail} (${userRole}) submitted feedback.`,
    severity: 'info',
    timestamp,
  }).catch(() => {});

  // Build checklist items from the boolean fields
  const checks = [
    feedback.easyToNavigate && 'Easy to navigate',
    feedback.aiSuggestionsHelpful && 'AI suggestions helpful',
    feedback.emailScanningUseful && 'Email scanning useful',
    feedback.calendarViewsWork && 'Calendar views work well',
    feedback.ranIntoBugs && 'Ran into bugs',
    feedback.somethingConfusing && 'Something confusing',
    feedback.wouldRecommend && 'Would recommend',
  ].filter(Boolean);

  const checksHtml = checks.length > 0
    ? checks.map(c => `<span style="display:inline-block;background:#ECFDF5;color:#065F46;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:600;margin:2px 4px;">${c}</span>`).join('')
    : '<span style="color:#6B7280;font-size:13px;">No checkboxes selected</span>';

  const openResponses = [
    feedback.mostUsefulThing && { label: 'Most useful thing', value: feedback.mostUsefulThing },
    feedback.wishDifferently && { label: 'Wish was different', value: feedback.wishDifferently },
    feedback.additionalFeedback && { label: 'Additional feedback', value: feedback.additionalFeedback },
  ].filter(Boolean);

  const openResponsesHtml = openResponses.length > 0
    ? openResponses.map(r => `
        <tr>
          <td style="padding:8px 0;color:#6B7280;border-top:1px solid #E5E7EB;width:140px;vertical-align:top;">${r.label}</td>
          <td style="padding:8px 0;color:#111827;font-weight:500;border-top:1px solid #E5E7EB;">${r.value}</td>
        </tr>
      `).join('')
    : '<tr><td style="padding:8px 0;color:#6B7280;" colspan="2">No open-ended responses</td></tr>';

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="width: 48px; height: 48px; background: #5D0022; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; color: white; font-size: 20px; font-weight: 800;">C</div>
      </div>

      <div style="background: #3B82F615; border-left: 4px solid #3B82F6; padding: 16px 20px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
        <h2 style="margin: 0 0 4px 0; font-size: 18px; color: #111827;">New Feedback Submitted</h2>
        <span style="display: inline-block; background: #3B82F6; color: white; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 600;">FEEDBACK</span>
      </div>

      <div style="background: #F9FAFB; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 8px 0; color: #6B7280; width: 140px;">From</td>
            <td style="padding: 8px 0; color: #111827; font-weight: 500;">${userEmail}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6B7280; border-top: 1px solid #E5E7EB;">Role</td>
            <td style="padding: 8px 0; color: #111827; font-weight: 500; border-top: 1px solid #E5E7EB;">${userRole}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6B7280; border-top: 1px solid #E5E7EB;">Usage</td>
            <td style="padding: 8px 0; color: #111827; font-weight: 500; border-top: 1px solid #E5E7EB;">${feedback.usageFrequency || 'not specified'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6B7280; border-top: 1px solid #E5E7EB;">Timestamp</td>
            <td style="padding: 8px 0; color: #111827; font-weight: 500; border-top: 1px solid #E5E7EB;">${timestamp}</td>
          </tr>
        </table>
      </div>

      <div style="margin-bottom: 20px;">
        <p style="font-size: 13px; font-weight: 600; color: #374151; margin: 0 0 8px 0;">Quick Ratings</p>
        <div style="line-height: 2;">${checksHtml}</div>
      </div>

      <div style="background: #F9FAFB; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
        <p style="font-size: 13px; font-weight: 600; color: #374151; margin: 0 0 12px 0;">Open Responses</p>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          ${openResponsesHtml}
        </table>
      </div>

      <p style="color: #6B7280; font-size: 13px; line-height: 1.6;">
        View all feedback on the <a href="https://syncwise-app.vercel.app/admin/feedback" style="color: #3B82F6;">admin dashboard</a>.
      </p>

      <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;" />
      <p style="color: #9CA3AF; font-size: 12px; text-align: center;">
        ${APP_NAME} by SyncWise AI — Feedback Notifications
      </p>
    </div>
  `;

  return await sendEmail({
    to: ADMIN_EMAIL,
    subject: `[FEEDBACK] ${APP_NAME}: New feedback from ${userEmail}`,
    html,
  });
}

// ─── Error Report Email Notifications ───

// In-memory cooldown to avoid spamming the same error repeatedly.
// Key = errorCode, Value = timestamp of last email sent.
// Same error code won't trigger another email for 30 minutes.
const errorEmailCooldowns = new Map();
const ERROR_EMAIL_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Send a diagnostic error report email when the app encounters an error.
 * Includes full stack trace, component stack, URL, and user agent so you
 * can diagnose and fix without digging through logs.
 *
 * Built-in cooldown: same errorCode won't send more than once per 30 min.
 * Returns true if email sent, false if skipped (cooldown) or failed.
 */
export async function notifyErrorReport({
  errorCode,
  severity,
  platform,
  endpoint,
  httpStatus,
  errorMessage,
  user,
  userAgent,
  stackTrace,
  context,
  spikeDetected,
  errorStats,
}) {
  // Cooldown check — don't spam for the same error
  const now = Date.now();
  const lastSent = errorEmailCooldowns.get(errorCode);
  if (lastSent && (now - lastSent) < ERROR_EMAIL_COOLDOWN_MS) {
    console.log(`[EMAIL] Cooldown active for ${errorCode} — skipping notification`);
    return false;
  }

  const timestamp = new Date().toISOString();
  const errorId = `ERR-${(severity || 'med').slice(0, 3).toUpperCase()}-${Math.floor(now / 1000).toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex')}`;

  const severityColors = {
    low: '#3B82F6',
    medium: '#F59E0B',
    high: '#F97316',
    critical: '#DC2626',
  };
  const color = severityColors[severity] || severityColors.medium;
  const severityLabel = (severity || 'medium').toUpperCase();

  // Truncate stack trace for email readability (keep first 40 lines)
  const truncatedStack = stackTrace
    ? stackTrace.split('\n').slice(0, 40).join('\n')
    : 'No stack trace available';

  // Format component stack if present
  const componentStack = context?.componentStack
    ? context.componentStack.split('\n').slice(0, 20).join('\n')
    : null;

  const pageUrl = context?.url || endpoint || 'Unknown';
  const userDisplay = user && user !== 'unknown' ? user : 'Anonymous user';

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 620px; margin: 0 auto; padding: 32px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="width: 48px; height: 48px; background: #5D0022; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; color: white; font-size: 20px; font-weight: 800;">C</div>
      </div>

      <div style="background: ${color}15; border-left: 4px solid ${color}; padding: 16px 20px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
        <h2 style="margin: 0 0 4px 0; font-size: 18px; color: #111827;">
          ${severity === 'critical' || severity === 'high' ? '🚨' : '⚠️'} Error Report: ${errorCode || 'unknown_error'}
        </h2>
        <span style="display: inline-block; background: ${color}; color: white; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 600;">${severityLabel}</span>
        ${spikeDetected ? '<span style="display: inline-block; background: #DC2626; color: white; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; margin-left: 6px;">SPIKE DETECTED</span>' : ''}
      </div>

      <!-- ERROR ID -->
      <div style="background: #111827; border-radius: 10px; padding: 16px 20px; margin-bottom: 20px; text-align: center;">
        <p style="margin: 0 0 4px 0; font-size: 11px; color: #9CA3AF; text-transform: uppercase; letter-spacing: 1px;">Error ID</p>
        <code style="font-size: 16px; font-weight: 700; color: #FBCE04; letter-spacing: 1.5px; font-family: 'SF Mono', 'Fira Code', Consolas, monospace;">${errorId}</code>
      </div>

      <!-- ERROR MESSAGE -->
      <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 10px; padding: 16px 20px; margin-bottom: 20px;">
        <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 600; color: #991B1B; text-transform: uppercase; letter-spacing: 0.5px;">Error Message</p>
        <p style="margin: 0; font-size: 15px; color: #111827; font-weight: 500; line-height: 1.5;">${errorMessage || 'No error message provided'}</p>
      </div>

      <!-- CONTEXT TABLE -->
      <div style="background: #F9FAFB; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 8px 0; color: #6B7280; width: 120px;">Timestamp</td>
            <td style="padding: 8px 0; color: #111827; font-weight: 500;">${timestamp}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6B7280; border-top: 1px solid #E5E7EB;">Platform</td>
            <td style="padding: 8px 0; color: #111827; font-weight: 500; border-top: 1px solid #E5E7EB;">${platform || 'client'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6B7280; border-top: 1px solid #E5E7EB;">Page URL</td>
            <td style="padding: 8px 0; color: #111827; font-weight: 500; border-top: 1px solid #E5E7EB; word-break: break-all; font-size: 12px;">${pageUrl}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6B7280; border-top: 1px solid #E5E7EB;">User</td>
            <td style="padding: 8px 0; color: #111827; font-weight: 500; border-top: 1px solid #E5E7EB;">${userDisplay}</td>
          </tr>
          ${httpStatus ? `
          <tr>
            <td style="padding: 8px 0; color: #6B7280; border-top: 1px solid #E5E7EB;">HTTP Status</td>
            <td style="padding: 8px 0; color: #111827; font-weight: 500; border-top: 1px solid #E5E7EB;">${httpStatus}</td>
          </tr>` : ''}
          <tr>
            <td style="padding: 8px 0; color: #6B7280; border-top: 1px solid #E5E7EB;">User Agent</td>
            <td style="padding: 8px 0; color: #111827; font-weight: 500; border-top: 1px solid #E5E7EB; word-break: break-all; font-size: 11px;">${userAgent || 'Unknown'}</td>
          </tr>
        </table>
      </div>

      <!-- STACK TRACE -->
      <div style="margin-bottom: 20px;">
        <p style="font-size: 13px; font-weight: 600; color: #374151; margin: 0 0 8px 0;">Stack Trace</p>
        <div style="background: #1E293B; border-radius: 8px; padding: 16px; overflow-x: auto;">
          <pre style="margin: 0; font-size: 11px; line-height: 1.6; color: #E2E8F0; font-family: 'SF Mono', 'Fira Code', Consolas, monospace; white-space: pre-wrap; word-break: break-all;">${truncatedStack}</pre>
        </div>
      </div>

      ${componentStack ? `
      <!-- COMPONENT STACK (React) -->
      <div style="margin-bottom: 20px;">
        <p style="font-size: 13px; font-weight: 600; color: #374151; margin: 0 0 8px 0;">React Component Stack</p>
        <div style="background: #1E293B; border-radius: 8px; padding: 16px; overflow-x: auto;">
          <pre style="margin: 0; font-size: 11px; line-height: 1.6; color: #A5B4FC; font-family: 'SF Mono', 'Fira Code', Consolas, monospace; white-space: pre-wrap;">${componentStack}</pre>
        </div>
      </div>
      ` : ''}

      ${spikeDetected && errorStats ? `
      <!-- SPIKE STATS -->
      <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 10px; padding: 16px 20px; margin-bottom: 20px;">
        <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #991B1B;">Error Spike Detected</p>
        <p style="margin: 0; font-size: 13px; color: #111827; line-height: 1.5;">
          ${errorStats.recentCount || 'Multiple'} errors in the last 10 minutes.
          ${errorStats.total || '?'} total errors in the last hour.
        </p>
      </div>
      ` : ''}

      <p style="color: #6B7280; font-size: 13px; line-height: 1.6;">
        This is an automated error notification from ${APP_NAME}. Open Cowork and paste the Error ID above to pull up full logs and context.
      </p>

      <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;" />
      <p style="color: #9CA3AF; font-size: 12px; text-align: center;">
        ${APP_NAME} by SyncWise AI — Error Monitoring
      </p>
    </div>
  `;

  const subjectPrefix = severity === 'critical' || severity === 'high' ? '🚨' : '⚠️';
  const sent = await sendEmail({
    to: ADMIN_EMAIL,
    subject: `${subjectPrefix} [${severityLabel}] ${APP_NAME}: ${errorCode} | ${errorId}`,
    html,
  });

  if (sent) {
    errorEmailCooldowns.set(errorCode, now);
    console.log(`[EMAIL] Error notification sent for ${errorCode} — ${errorId}`);
  }

  return sent;
}
