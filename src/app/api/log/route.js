// API Activity Log Route — For IT Auditing
// GET /api/log — returns recent API activity
// Query params: ?count=100&user=email&platform=d2l|microsoft

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getRecentLogs, getLogsByUser, getLogsByPlatform } from '../../../lib/logger';

export async function GET(request) {
  const adminCheck = requireAdmin(request);
  if (adminCheck instanceof NextResponse) return adminCheck;

  const { searchParams } = new URL(request.url);
  const count = parseInt(searchParams.get('count') || '100');
  const user = searchParams.get('user');
  const platform = searchParams.get('platform');

  // TODO: Add authentication — only allow IT admin or app owner
  // For beta, this is open for transparency

  let logs;
  if (user) {
    logs = await getLogsByUser(user);
  } else if (platform) {
    logs = await getLogsByPlatform(platform);
  } else {
    logs = await getRecentLogs(count);
  }

  return NextResponse.json({
    totalEntries: logs.length,
    logs,
  });
}
