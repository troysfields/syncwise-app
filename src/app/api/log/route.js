// API Activity Log Route — For IT Auditing
// GET /api/log — returns recent API activity
// Query params: ?count=100&user=email&platform=d2l|microsoft

import { NextResponse } from 'next/server';
import { getRecentLogs, getLogsByUser, getLogsByPlatform } from '../../../lib/logger';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const count = parseInt(searchParams.get('count') || '100');
  const user = searchParams.get('user');
  const platform = searchParams.get('platform');

  // TODO: Add authentication — only allow IT admin or app owner
  // For beta, this is open for transparency

  let logs;
  if (user) {
    logs = getLogsByUser(user);
  } else if (platform) {
    logs = getLogsByPlatform(platform);
  } else {
    logs = getRecentLogs(count);
  }

  return NextResponse.json({
    totalEntries: logs.length,
    logs,
  });
}
