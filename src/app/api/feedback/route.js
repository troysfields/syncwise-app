// Feedback API — Stores student feedback for product improvement
// GET: returns all feedback (admin)
// POST: submits new feedback

import { NextResponse } from 'next/server';
import { requireAuth, requireAdmin } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

const LOG_DIR = path.join(process.cwd(), 'logs');
const FEEDBACK_FILE = path.join(LOG_DIR, 'feedback.jsonl');

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

export async function POST(req) {
  const session = requireAuth(req);
  if (session instanceof NextResponse) return session;

  try {
    const body = await req.json();

    const entry = {
      timestamp: new Date().toISOString(),
      user: body.user || 'anonymous',
      // Checkbox ratings
      easyToNavigate: body.easyToNavigate || false,
      aiSuggestionsHelpful: body.aiSuggestionsHelpful || false,
      emailScanningUseful: body.emailScanningUseful || false,
      calendarViewsWork: body.calendarViewsWork || false,
      ranIntoBugs: body.ranIntoBugs || false,
      somethingConfusing: body.somethingConfusing || false,
      wouldRecommend: body.wouldRecommend || false,
      // Usage frequency
      usageFrequency: body.usageFrequency || 'not_specified',
      // Open responses
      mostUsefulThing: body.mostUsefulThing || '',
      wishDifferently: body.wishDifferently || '',
      additionalFeedback: body.additionalFeedback || '',
      // Meta
      pageUrl: body.pageUrl || '',
      userAgent: body.userAgent || '',
    };

    fs.appendFileSync(FEEDBACK_FILE, JSON.stringify(entry) + '\n');

    return NextResponse.json({ success: true, message: 'Feedback received — thank you!' });
  } catch (err) {
    console.error('Feedback submission failed:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function GET(request) {
  // Admin only — feedback data contains user info
  const adminCheck = requireAdmin(request);
  if (adminCheck instanceof NextResponse) return adminCheck;

  try {
    if (!fs.existsSync(FEEDBACK_FILE)) {
      return NextResponse.json({ feedback: [], stats: {} });
    }

    const lines = fs.readFileSync(FEEDBACK_FILE, 'utf8').trim().split('\n');
    const feedback = lines.map(line => JSON.parse(line)).reverse();

    // Aggregate stats
    const total = feedback.length;
    const stats = {
      total,
      easyToNavigate: feedback.filter(f => f.easyToNavigate).length,
      aiSuggestionsHelpful: feedback.filter(f => f.aiSuggestionsHelpful).length,
      emailScanningUseful: feedback.filter(f => f.emailScanningUseful).length,
      calendarViewsWork: feedback.filter(f => f.calendarViewsWork).length,
      ranIntoBugs: feedback.filter(f => f.ranIntoBugs).length,
      somethingConfusing: feedback.filter(f => f.somethingConfusing).length,
      wouldRecommend: feedback.filter(f => f.wouldRecommend).length,
      usageBreakdown: {},
    };

    for (const f of feedback) {
      stats.usageBreakdown[f.usageFrequency] = (stats.usageBreakdown[f.usageFrequency] || 0) + 1;
    }

    return NextResponse.json({ feedback, stats });
  } catch (err) {
    return NextResponse.json({ feedback: [], stats: {} });
  }
}
