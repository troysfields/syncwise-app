// Admin Health API — Returns error stats, health checks, and recent errors
// Protected: requires admin auth (admin_authenticated cookie OR x-admin-secret header)

import { NextResponse } from 'next/server';
import { getRecentErrors, getErrorStats, getHealthStats, formatErrorForClaude } from '@/lib/error-logger';

export async function GET(req) {
  // Admin auth — accept either x-admin-secret header or admin_authenticated cookie
  const headerSecret = req.headers.get('x-admin-secret');
  const cookieHeader = req.headers.get('cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [key, ...val] = c.trim().split('=');
      return [key, val.join('=')];
    })
  );
  const adminCookie = cookies['admin_authenticated'];
  const ADMIN_SECRET = process.env.ADMIN_SECRET || null;

  if (!ADMIN_SECRET) {
    return NextResponse.json({ error: 'Admin access not configured.' }, { status: 403 });
  }

  const isAuthorized = headerSecret === ADMIN_SECRET ||
    (adminCookie && decodeURIComponent(adminCookie) === ADMIN_SECRET);

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized — admin credentials required.' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const hours = parseInt(searchParams.get('hours') || '24');
  const format = searchParams.get('format') || 'json'; // 'json' or 'claude'

  const errorStats = getErrorStats(hours);
  const healthStats = getHealthStats(hours);
  const recentErrors = getRecentErrors(50);

  // Claude-readable format for AI debugging sessions
  if (format === 'claude') {
    const claudeReport = [
      `# SyncWise Health Report — Last ${hours} Hours`,
      `Generated: ${new Date().toISOString()}`,
      '',
      `## Summary`,
      `- Total errors: ${errorStats.total}`,
      `- Spike detected: ${errorStats.recentSpike ? 'YES — ' + errorStats.recentCount + ' errors in last 10 min' : 'No'}`,
      `- By severity: ${JSON.stringify(errorStats.bySeverity)}`,
      `- By platform: ${JSON.stringify(errorStats.byPlatform)}`,
      `- By error code: ${JSON.stringify(errorStats.byErrorCode)}`,
      '',
      `## API Health`,
      ...Object.entries(healthStats.platforms || {}).map(([platform, stats]) =>
        `- **${platform}**: ${stats.ok}/${stats.total} OK (${stats.total > 0 ? Math.round(stats.ok / stats.total * 100) : 0}% uptime, avg ${stats.avgResponseMs}ms)`
      ),
      '',
      `## Recent Errors (last 20)`,
      ...recentErrors.slice(0, 20).map(e => formatErrorForClaude(e)),
    ].join('\n');

    return new Response(claudeReport, {
      headers: { 'Content-Type': 'text/markdown' },
    });
  }

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    period: `${hours} hours`,
    errors: errorStats,
    health: healthStats,
    recentErrors: recentErrors.slice(0, 50),
  });
}
