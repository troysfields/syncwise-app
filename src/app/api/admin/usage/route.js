// Admin API — Rate Limiter Usage Stats
// GET: Returns global usage stats, active students, current model, lite mode status
// POST: Update rate limit thresholds at runtime

import { getGlobalUsageStats, getRateLimitConfig, updateRateLimits } from '@/lib/rate-limiter';

export async function GET() {
  try {
    const stats = getGlobalUsageStats();
    const config = getRateLimitConfig();

    return Response.json({
      success: true,
      stats,
      config,
    });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { feature, limits } = body;

    if (!feature || !limits) {
      return Response.json(
        { success: false, error: 'Missing feature or limits in request body' },
        { status: 400 }
      );
    }

    const updated = updateRateLimits(feature, limits);

    if (!updated) {
      return Response.json(
        { success: false, error: `Unknown feature: ${feature}` },
        { status: 400 }
      );
    }

    return Response.json({
      success: true,
      message: `Rate limits updated for ${feature}`,
      config: getRateLimitConfig(),
    });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
