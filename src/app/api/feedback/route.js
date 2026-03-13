// Feedback API — Stores student feedback for product improvement
// GET: returns all feedback (admin)
// POST: submits new feedback
// Storage: Redis (persistent) — replaces old file-based storage that got wiped on Vercel cold starts

import { NextResponse } from 'next/server';
import { requireAuth, requireAdmin } from '@/lib/auth';
import { saveFeedback, getAllFeedback } from '@/lib/db';

export async function POST(req) {
  const session = requireAuth(req);
  if (session instanceof NextResponse) return session;

  try {
    const body = await req.json();

    const entry = {
      type: 'form_feedback',
      userEmail: body.user || session.email || session.sub || 'anonymous',
      userRole: session.role || 'student',
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
      page: 'feedback_form',
      pageUrl: body.pageUrl || '',
      userAgent: body.userAgent || '',
      status: 'new',
    };

    await saveFeedback(entry);

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
    const allEntries = await getAllFeedback();

    // Separate form feedback from chatbot feedback
    const formFeedback = allEntries.filter(f => f.type === 'form_feedback');
    const chatbotFeedback = allEntries.filter(f => f.type === 'issue' || f.type === 'suggestion');

    // Aggregate stats from form feedback
    const total = formFeedback.length;
    const stats = {
      total,
      easyToNavigate: formFeedback.filter(f => f.easyToNavigate).length,
      aiSuggestionsHelpful: formFeedback.filter(f => f.aiSuggestionsHelpful).length,
      emailScanningUseful: formFeedback.filter(f => f.emailScanningUseful).length,
      calendarViewsWork: formFeedback.filter(f => f.calendarViewsWork).length,
      ranIntoBugs: formFeedback.filter(f => f.ranIntoBugs).length,
      somethingConfusing: formFeedback.filter(f => f.somethingConfusing).length,
      wouldRecommend: formFeedback.filter(f => f.wouldRecommend).length,
      usageBreakdown: {},
    };

    for (const f of formFeedback) {
      stats.usageBreakdown[f.usageFrequency] = (stats.usageBreakdown[f.usageFrequency] || 0) + 1;
    }

    return NextResponse.json({
      feedback: allEntries,
      formFeedback,
      chatbotFeedback,
      stats,
    });
  } catch (err) {
    console.error('Feedback load failed:', err);
    return NextResponse.json({ feedback: [], formFeedback: [], chatbotFeedback: [], stats: {} });
  }
}
