// Error Reporting API — Receives errors from the client dashboard
// Logs them server-side and triggers admin alerts when needed

import { NextResponse } from 'next/server';
import { logError, getStudentMessage, shouldAlertAdmin, getErrorStats, SEVERITY } from '@/lib/error-logger';

export async function POST(req) {
  try {
    const body = await req.json();

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
      errorCode: errorCode || 'unknown_error',
      severity: severity || SEVERITY.MEDIUM,
      platform: platform || 'client',
      endpoint: endpoint || '',
      httpStatus,
      errorMessage: errorMessage || 'No message provided',
      user: user || 'unknown',
      userAgent: userAgent || '',
      stackTrace: stackTrace || '',
      context: context || {},
    });

    // Get the student-facing message for this error
    const studentMessage = getStudentMessage(errorCode);

    // Check if we need to alert the admin (Troy)
    const alertAdmin = shouldAlertAdmin();

    // If spike detected, log an admin alert
    if (alertAdmin) {
      const stats = getErrorStats(1);
      console.error(`[SYNCWISE ALERT] Error spike detected — ${stats.recentCount} errors in last 10 min. Details:`, {
        total_last_hour: stats.total,
        by_severity: stats.bySeverity,
        by_platform: stats.byPlatform,
        latest_error: errorCode,
      });
      // TODO: Send email to troysfields@gmail.com via SendGrid/Resend when configured
      // For now, logs to Vercel's function logs (visible in Vercel dashboard)
    }

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
