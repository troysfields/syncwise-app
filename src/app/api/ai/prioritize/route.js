// AI Prioritization API Route
// POST /api/ai/prioritize
// Body: { tasks: [...], calendarEvents: [...] }

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { aiPrioritize } from '../../../../lib/ai-prioritize';

export async function POST(request) {
  const session = requireAuth(request);
  if (session instanceof NextResponse) return session;

  try {
    const { tasks, calendarEvents } = await request.json();

    if (!tasks || !Array.isArray(tasks)) {
      return NextResponse.json({ error: 'tasks array required' }, { status: 400 });
    }

    const result = await aiPrioritize(tasks, calendarEvents || []);
    return NextResponse.json(result);
  } catch (err) {
    console.error('AI prioritization error:', err);
    return NextResponse.json({ error: 'Prioritization failed' }, { status: 500 });
  }
}
