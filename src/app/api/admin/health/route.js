// Admin Health API — Returns error stats, health checks, and recent errors
// Protected: only accessible to admin (Troy)

import { NextResponse } from 'next/server';
import { getRecentErrors, getErrorStats, getHealthStats, formatErrorForClaude } from '@/lib/error-logger';

export async function GET(req) {
  // TODO: Add proper admin auth check (for now, accessible to anyone who knows the URL)
  // In production, verify session token + admin role

  const { searchParams } = new URL(req.url);
  const hours = parseInt(searchParams.get('hours') || '24');
  const format = searchParams.get('format') || 'json'; // 'json' or 'claude'

  const errorStats = await getErrorStats(hours);
  const healthStats = await getHealthStats(hours);
  const recentErrors = await getRecentErrors(50);

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
