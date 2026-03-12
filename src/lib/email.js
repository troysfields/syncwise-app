// CMU AI Calendar — Email Service
// Handles all outbound emails via Resend API.
// Includes security notification system for admin alerts.

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'troysfields@gmail.com';
const APP_NAME = 'CMU AI Calendar';
const FROM_ADDRESS = `${APP_NAME} <noreply@resend.dev>`;

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
 * Send a security alert to the admin.
 * Called when sensitive actions occur.
 */
export async function notifyAdmin({ event, details, severity = 'info', request = null }) {
  const timestamp = new Date().toISOString();
  const ip = request?.headers?.get('x-forwarded-for') || request?.headers?.get('x-real-ip') || 'Unknown';
  const userAgent = request?.headers?.get('user-agent') || 'Unknown';

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
            <td style="padding: 8px 0; color: #111827; font-weight: 500; border-top: 1px solid #E5E7EB; word-break: break-all;">${userAgent}</td>
          </tr>
          ${details ? `
          <tr>
            <td style="padding: 8px 0; color: #6B7280; border-top: 1px solid #E5E7EB;">Details</td>
            <td style="padding: 8px 0; color: #111827; font-weight: 500; border-top: 1px solid #E5E7EB;">${details}</td>
          </tr>
          ` : ''}
        </table>
      </div>

      <p style="color: #6B7280; font-size: 13px; line-height: 1.6;">
        This is an automated security notification from ${APP_NAME}. If you did not perform this action,
        please investigate immediately and consider rotating your ADMIN_SECRET.
      </p>

      <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;" />
      <p style="color: #9CA3AF; font-size: 12px; text-align: center;">
        ${APP_NAME} by SyncWise AI — Security Monitoring
      </p>
    </div>
  `;

  return await sendEmail({
    to: ADMIN_EMAIL,
    subject: `[${severityLabel}] ${APP_NAME}: ${event}`,
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
    details: 'Invalid admin credentials were submitted.',
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
    details: `Reset requested for: ${email}`,
    severity: 'warning',
    request,
  });
}

export async function notifyMultipleFailedLogins(request, email, attempts) {
  return notifyAdmin({
    event: 'Multiple Failed Login Attempts',
    details: `${attempts} failed attempts for: ${email}`,
    severity: 'critical',
    request,
  });
}

export async function notifyInstructorSignup(request, { name, email }) {
  return notifyAdmin({
    event: 'Instructor Account Created',
    details: `${name} (${email}) registered as an instructor with @coloradomesa.edu verification.`,
    severity: 'warning',
    request,
  });
}
