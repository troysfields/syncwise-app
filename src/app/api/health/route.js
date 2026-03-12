// API Route: /api/health
// Public: returns basic status (ok/degraded)
// Authenticated (with ADMIN_SECRET): returns full system diagnostics
//
// GET /api/health → { status: "ok" }
// GET /api/health?secret=ADMIN_SECRET → full diagnostics

import { NextResponse } from 'next/server';
import { dbHealthCheck } from '@/lib/db';

const startTime = Date.now();

export async function GET(request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get('secret');
  const isAdmin = secret && secret === process.env.ADMIN_SECRET;

  // ─── Public health check (no secret) ───
  if (!isAdmin) {
    try {
      const db = await dbHealthCheck();
      return NextResponse.json({
        status: db.connected ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
      });
    } catch {
      return NextResponse.json({ status: 'error', timestamp: new Date().toISOString() }, { status: 500 });
    }
  }

  // ─── Full admin diagnostics ───
  const diagnostics = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: formatUptime(Date.now() - startTime),
    uptimeMs: Date.now() - startTime,
    environment: process.env.NODE_ENV || 'unknown',
    region: process.env.VERCEL_REGION || 'unknown',
    services: {},
    envVars: {},
    runtime: {},
  };

  // ── Database Check ──
  const dbStart = Date.now();
  try {
    const db = await dbHealthCheck();
    diagnostics.services.database = {
      status: db.connected ? 'connected' : 'disconnected',
      type: db.type || 'unknown',
      latencyMs: db.latency || (Date.now() - dbStart),
    };
  } catch (err) {
    diagnostics.services.database = {
      status: 'error',
      error: err.message,
      latencyMs: Date.now() - dbStart,
    };
    diagnostics.status = 'degraded';
  }

  // ── AI API Key Check ──
  const aiKey = process.env.AI_API_KEY;
  if (aiKey) {
    // Test the key with a minimal API call
    const aiStart = Date.now();
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': aiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'ping' }],
        }),
      });
      diagnostics.services.ai = {
        status: res.ok ? 'connected' : 'error',
        provider: 'anthropic',
        keyPrefix: aiKey.slice(0, 12) + '...',
        latencyMs: Date.now() - aiStart,
        httpStatus: res.status,
      };
    } catch (err) {
      diagnostics.services.ai = {
        status: 'error',
        error: err.message,
        latencyMs: Date.now() - aiStart,
      };
      diagnostics.status = 'degraded';
    }
  } else {
    diagnostics.services.ai = {
      status: 'not_configured',
      note: 'AI_API_KEY environment variable is not set. Chatbot will use keyword fallback.',
    };
    diagnostics.status = 'degraded';
  }

  // ── Email Service Check ──
  const resendKey = process.env.RESEND_API_KEY;
  diagnostics.services.email = {
    status: resendKey ? 'configured' : 'not_configured',
    provider: 'resend',
    keyPrefix: resendKey ? resendKey.slice(0, 8) + '...' : null,
    adminEmail: process.env.ADMIN_EMAIL ? '***@' + process.env.ADMIN_EMAIL.split('@')[1] : 'not_set',
  };

  // ── Environment Variables (presence check only, no values) ──
  const requiredVars = [
    'NEXTAUTH_SECRET',
    'ADMIN_SECRET',
    'KV_REST_API_URL',
    'KV_REST_API_TOKEN',
    'AI_API_KEY',
    'RESEND_API_KEY',
    'ADMIN_EMAIL',
  ];

  const optionalVars = [
    'KV_REST_API_READ_ONLY_TOKEN',
    'KV_REST_API_KV_URL',
    'KV_REST_API_REDIS_URL',
    'NEXT_PUBLIC_BASE_URL',
    'NEXT_PUBLIC_D2L_BASE_URL',
    'NEXT_PUBLIC_D2L_CLIENT_ID',
  ];

  diagnostics.envVars.required = {};
  for (const v of requiredVars) {
    diagnostics.envVars.required[v] = !!process.env[v];
  }
  diagnostics.envVars.optional = {};
  for (const v of optionalVars) {
    diagnostics.envVars.optional[v] = !!process.env[v];
  }

  const missingRequired = requiredVars.filter(v => !process.env[v]);
  if (missingRequired.length > 0) {
    diagnostics.envVars.missing = missingRequired;
    diagnostics.status = 'degraded';
  }

  // ── Runtime Info ──
  diagnostics.runtime = {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 10) / 10,
    memoryTotalMB: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 10) / 10,
  };

  // ── Vercel deployment info ──
  diagnostics.deployment = {
    commitSha: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'unknown',
    commitMessage: process.env.VERCEL_GIT_COMMIT_MESSAGE || 'unknown',
    deploymentUrl: process.env.VERCEL_URL || 'unknown',
    branch: process.env.VERCEL_GIT_COMMIT_REF || 'unknown',
  };

  return NextResponse.json(diagnostics);
}

function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
  if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}
