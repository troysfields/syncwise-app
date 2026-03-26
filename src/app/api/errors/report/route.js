// Error Reporting API — Receives errors from the client dashboard
// Logs them server-side, sends admin email alerts, and triggers spike detection

import { NextResponse } from 'next/server';
import { logError, getStudentMessage, shouldAlertAdmin, getErrorStats, SEVERITY } from '@/lib/error-logger';
import { notifyErrorReport } from '@/lib/email';

export async function POST(req) {
  try {
    // Reject oversized payloads to prevent Redis abuse
    const contentLength = parseInt(req.headers.get('content-length') || '0', 10);
    if (contentLength > 10000) {
      return NextResponse.json({ success: false, error: 'Payload too large' }, { status: 413 });
    }

    const body = await req.json();

    // Truncate all string fields to prevent storing huge payloads in Redis
    const cap = (val, max = 500) => typeof val === 'string' ? val.slice(0, max) : val;

    const {
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
    } = body;

    // Log the error server-side with full detail
    const errorEntry = logError({
      errorCode: cap(errorCode || 'unknown_error', 100),
      severity: severity || SEVERITY.MEDIUM,
      platform: cap(platform || 'client', 50),
      endpoint: cap(endpoint || '', 200),
      httpStatus,
      errorMessage: cap(errorMessage || 'No message provided', 500),
      user: cap(user || 'unknown', 100),
      userAgent: cap(userAgent || '', 300),
      stackTrace: cap(stackTrace || '', 2000),
      context: context || {},
    });

    // Get the student-facing message for this error
    const studentMessage = getStudentMessage(errorCode);

    // Check if we're in a spike
    const alertAdmin = await shouldAlertAdmin();
    let stats = null;

    if (alertAdmin) {
      stats = await getErrorStats(1);
      console.error(`[SYNCWISE ALERT] Error spike detected — ${stats.recentCount} errors in last 10 min.`);
    }

    // Send email notification for all errors (with built-in cooldown per error code)
    // The notifyErrorReport function has a 30-min cooldown per errorCode to avoid spam
    notifyErrorReport({
      errorCode: errorCode || 'unknown_error',
      severity: severity || 'medium',
      platform: platform || 'client',
      endpoint: endpoint || '',
      httpStatus,
      errorMessage: errorMessage || 'No message provided',
      user: user || 'unknown',
      userAgent: userAgent || '',
      stackTrace: stackTrace || '',
      context: context || {},
      spikeDetected: alertAdmin,
      errorStats: stats,
    }).catch(err => {
      // Never let email failure break error reporting
      console.error('[EMAIL] Error notification failed:', err.message);
    });

    return NextResponse.json({
      success: true,
      studentMessage,
      alertTriggered: alertAdmin,
    });
  } catch (err) {
    console.error('Error reporting endpoint failed:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
