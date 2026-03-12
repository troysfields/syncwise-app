// AI Prioritization API Route
// POST /api/ai/prioritize
// Body: { tasks: [...], calendarEvents: [...] }

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { aiPrioritize } from '../../../../lib/ai-prioritize';
import { trackAIPrioritization, trackError } from '@/lib/analytics';

export async function POST(request) {
  const startTime = Date.now();
  const session = requireAuth(request);
  if (session instanceof NextResponse) return session;

  try {
    const { tasks, calendarEvents } = await request.json();

    if (!tasks || !Array.isArray(tasks)) {
      return NextResponse.json({ error: 'tasks array required' }, { status: 400 });
    }

    const result = await aiPrioritize(tasks, calendarEvents || [], session.email || session.sub || 'anonymous');

    // Track analytics (fire-and-forget)
    trackAIPrioritization({
      userEmail: session.email || session.sub,
      model: result.isLiteMode ? 'claude-haiku-4-5-20251001' : 'claude-sonnet-4-6',
      inputTokens: result._usage?.input_tokens || 0,
      outputTokens: result._usage?.output_tokens || 0,
      taskCount: tasks.length,
      responseTimeMs: Date.now() - startTime,
    }).catch(() => {});

    return NextResponse.json(result);
  } catch (err) {
    console.error('AI prioritization error:', err);
    trackError({ endpoint: '/api/ai/prioritize', userEmail: session?.email, errorType: 'prioritization_error', errorMessage: err.message, statusCode: 500 }).catch(() => {});
    return NextResponse.json({ error: 'Prioritization failed' }, { status: 500 });
  }
}
