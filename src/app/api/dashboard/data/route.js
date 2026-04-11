// API Route: /api/dashboard/data
// Main dashboard data endpoint — aggregates all consent-based data sources
// POST body: { icalUrl, studentEmail, uploadedDocs }
// AUTH: Requires valid session
//
// SHADOW MODE (temporary): Runs both consent-data (old) and data-aggregator (new)
// using a SINGLE D2L fetch shared between them. Logs structured diff.
// Returns ONLY the old result to the client.
// Search Vercel logs for "[SHADOW DIFF]" to review comparison output.
// Remove shadow mode once outputs are confirmed identical.

import { NextResponse } from 'next/server';
import { getStudentDashboardData as oldPipeline, setCachedICalResult as seedOldCache } from '@/lib/consent-data';
import { getStudentDashboardData as newPipeline } from '@/lib/data-aggregator';
import { fetchAndParseICalFeed } from '@/lib/ical-parser';
import { requireAuth } from '@/lib/auth';

// Vercel Hobby default is 5s — not enough for D2L fetch + two pipelines.
// 15s covers: ~3s D2L fetch + ~5s pipeline work + margin.
// Remove or reduce once shadow mode is removed.
export const maxDuration = 15;

// ─── Shadow Diff Utilities ───

/**
 * Recursively compare two objects and return an array of differences.
 * Each diff has: { path, type, old?, new? }
 * Types: extra_in_new, missing_in_new, value_mismatch, type_mismatch, array_length
 */
function deepDiff(oldObj, newObj, path = '') {
  const diffs = [];

  // Same reference or both primitively equal
  if (oldObj === newObj) return diffs;

  // Null / type mismatch
  if (oldObj === null || newObj === null || typeof oldObj !== typeof newObj) {
    diffs.push({ path: path || '(root)', type: 'type_mismatch', old: summarize(oldObj), new: summarize(newObj) });
    return diffs;
  }

  // Arrays
  if (Array.isArray(oldObj) && Array.isArray(newObj)) {
    if (oldObj.length !== newObj.length) {
      diffs.push({ path: path || '(root)', type: 'array_length', old: oldObj.length, new: newObj.length });
    }
    // Spot-check first 3 items to keep log volume manageable
    const checkCount = Math.min(oldObj.length, newObj.length, 3);
    for (let i = 0; i < checkCount; i++) {
      diffs.push(...deepDiff(oldObj[i], newObj[i], `${path}[${i}]`));
    }
    return diffs;
  }

  // Objects
  if (typeof oldObj === 'object') {
    const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
    for (const key of allKeys) {
      // Skip internal-only fields that won't be in both
      if (key.startsWith('_')) continue;
      const fullPath = path ? `${path}.${key}` : key;
      if (!(key in oldObj)) {
        diffs.push({ path: fullPath, type: 'extra_in_new', new: summarize(newObj[key]) });
      } else if (!(key in newObj)) {
        diffs.push({ path: fullPath, type: 'missing_in_new', old: summarize(oldObj[key]) });
      } else {
        diffs.push(...deepDiff(oldObj[key], newObj[key], fullPath));
      }
    }
    return diffs;
  }

  // Primitives
  if (oldObj !== newObj) {
    diffs.push({ path: path || '(root)', type: 'value_mismatch', old: oldObj, new: newObj });
  }
  return diffs;
}

/** Summarize a value for log output — keeps lines short */
function summarize(val) {
  if (val === null || val === undefined) return String(val);
  if (Array.isArray(val)) return `Array(${val.length})`;
  if (typeof val === 'object') return `{${Object.keys(val).join(', ')}}`;
  if (typeof val === 'string' && val.length > 60) return `"${val.slice(0, 60)}…"`;
  return val;
}

/**
 * Run the shadow comparison and log results.
 * Grouped under [SHADOW DIFF] prefix for easy Vercel log filtering.
 * This function NEVER throws — all errors are caught internally.
 */
function logShadowComparison(oldResult, newResult, oldMs, newMs) {
  try {
    const P = '[SHADOW DIFF]'; // prefix for all shadow log lines

    // ── Pipeline errors ──
    if (oldResult._pipelineError) {
      console.error(`${P} OLD pipeline crashed: ${oldResult.error}`);
      return;
    }
    if (newResult._pipelineError) {
      console.error(`${P} NEW pipeline crashed: ${newResult.error}`);
      return;
    }

    // ── Timing ──
    console.log(`${P} ⏱ Old: ${oldMs}ms | New: ${newMs}ms | Delta: ${newMs - oldMs}ms`);

    // ── Top-level key comparison ──
    const oldKeys = Object.keys(oldResult).sort();
    const newKeys = Object.keys(newResult).sort();
    const missingInNew = oldKeys.filter(k => !newKeys.includes(k));
    const extraInNew = newKeys.filter(k => !oldKeys.includes(k));

    if (missingInNew.length > 0) {
      console.warn(`${P} MISSING KEYS in new: ${missingInNew.join(', ')}`);
    }
    if (extraInNew.length > 0) {
      console.warn(`${P} EXTRA KEYS in new: ${extraInNew.join(', ')}`);
    }

    // ── Deep diff ──
    const diffs = deepDiff(oldResult, newResult);

    if (diffs.length === 0 && missingInNew.length === 0 && extraInNew.length === 0) {
      console.log(`${P} ✅ IDENTICAL — 0 differences`);
      return;
    }

    // Group diffs by type for readable output
    const grouped = {};
    for (const d of diffs) {
      if (!grouped[d.type]) grouped[d.type] = [];
      grouped[d.type].push(d);
    }

    console.warn(`${P} ⚠️ ${diffs.length} difference(s) found across ${Object.keys(grouped).length} categories:`);

    for (const [type, items] of Object.entries(grouped)) {
      console.warn(`${P}   [${type}] (${items.length}):`);
      // Show up to 5 per category to avoid log flooding
      for (const d of items.slice(0, 5)) {
        const parts = [`${P}     ${d.path}`];
        if (d.old !== undefined) parts.push(`old=${JSON.stringify(d.old)}`);
        if (d.new !== undefined) parts.push(`new=${JSON.stringify(d.new)}`);
        console.warn(parts.join(' | '));
      }
      if (items.length > 5) {
        console.warn(`${P}     ... +${items.length - 5} more ${type}`);
      }
    }
  } catch (err) {
    // Shadow logging must NEVER break the response
    console.error('[SHADOW DIFF] Comparison crashed:', err.message);
  }
}

// ─── Route Handler ───

export async function POST(request) {
  const session = requireAuth(request);
  if (session instanceof NextResponse) return session;

  try {
    // Read body once — both pipelines need the same input
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: 'Invalid request body. Expected JSON.' }, { status: 400 });
    }

    const { icalUrl, studentEmail, uploadedDocs } = body;

    if (!icalUrl) {
      return NextResponse.json({
        error: 'No data sources configured. Please complete setup first.',
        setupRequired: true,
      }, { status: 400 });
    }

    // ── SHARED FETCH: Hit D2L exactly once ──
    // Both pipelines will use this same iCal result.
    // - Old pipeline: we seed its module-level cache so its internal fetch is a cache hit
    // - New pipeline: we pass the result directly via _prefetchedIcalResult
    const icalResult = await fetchAndParseICalFeed(icalUrl, studentEmail || 'anonymous');

    // Seed the old pipeline's cache so it won't fetch again
    if (icalResult.success) {
      seedOldCache(icalUrl, icalResult);
    }

    const settings = { icalUrl, studentEmail, uploadedDocs };

    // Run both pipelines in parallel — same input data, zero extra D2L requests
    const oldStart = Date.now();
    const oldPromise = oldPipeline(settings)
      .then(r => ({ result: r, ms: Date.now() - oldStart }))
      .catch(err => ({ result: { _pipelineError: 'old', error: err.message }, ms: Date.now() - oldStart }));

    const newStart = Date.now();
    const newPromise = newPipeline({ ...settings, _prefetchedIcalResult: icalResult })
      .then(r => ({ result: r, ms: Date.now() - newStart }))
      .catch(err => ({ result: { _pipelineError: 'new', error: err.message }, ms: Date.now() - newStart }));

    const [oldOut, newOut] = await Promise.all([oldPromise, newPromise]);

    // Shadow comparison — fire and forget, never affects response
    logShadowComparison(oldOut.result, newOut.result, oldOut.ms, newOut.ms);

    // ─── ALWAYS return the OLD result to the client — new pipeline is invisible ───
    if (oldOut.result.error && !oldOut.result._pipelineError) {
      return NextResponse.json(oldOut.result, { status: 400 });
    }
    return NextResponse.json(oldOut.result);

  } catch (error) {
    console.error('Dashboard data API error:', error);
    return NextResponse.json(
      { error: 'Internal server error fetching dashboard data' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed. Use POST.' }, { status: 405 });
}
