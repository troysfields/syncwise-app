// API Route: /api/chat
// CMU AI Calendar Chatbot — Beta
// Capabilities: platform guidance, issue reporting, workload check,
// email drafts, feedback collection, study planning
// AUTH: Requires valid session
// Uses Haiku for cost efficiency (~$0.001 per conversation turn)

import { NextResponse } from 'next/server';
import { requireAuth, sanitizeString } from '@/lib/auth';
import { SYNCWISE_SYSTEM_PROMPT, CHATBOT_CONFIG } from '@/lib/chatbot-prompt';
import { getModelForRequest } from '@/lib/rate-limiter';
import { saveFeedback } from '@/lib/db';
import { trackChatMessage, trackError } from '@/lib/analytics';

export async function POST(request) {
  const startTime = Date.now();

  // Auth check
  const session = requireAuth(request);
  if (session instanceof NextResponse) return session;

  try {
    const body = await request.json();
    const { message, history = [], context = {} } = body;

    // Validate input
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required.' },
        { status: 400 }
      );
    }

    const sanitizedMessage = sanitizeString(message, 2000);
    if (!sanitizedMessage) {
      return NextResponse.json(
        { error: 'Message cannot be empty.' },
        { status: 400 }
      );
    }

    // Rate limit / model selection check
    let isLiteMode = false;
    try {
      const modelInfo = getModelForRequest(session.email || session.sub || 'anonymous', 'chatbot');
      isLiteMode = modelInfo?.isLiteMode || false;
    } catch {
      // Rate limiter not configured — continue without
    }

    // Check for API key
    const apiKey = process.env.AI_API_KEY;
    if (!apiKey || apiKey === 'your_anthropic_api_key' || apiKey === 'YOUR_AI_API_KEY') {
      return NextResponse.json({
        success: true,
        response: getFallbackResponse(sanitizedMessage),
        model: 'fallback',
        isLiteMode: false,
      });
    }

    // Build context string from task data (for workload checks)
    let contextStr = '';
    if (context.tasks && Array.isArray(context.tasks) && context.tasks.length > 0) {
      contextStr = '\n\n[STUDENT CONTEXT — Current assignments:\n';
      context.tasks.forEach(t => {
        const due = t.due || t.dueDate || 'unknown';
        contextStr += `- ${t.title || t.name} (${t.course || t.courseName || '?'}) — due ${due}${t.points ? `, ${t.points}pts` : ''}\n`;
      });
      contextStr += ']';
    }

    // Build conversation history for Claude
    const messages = [];

    // Add recent history (limit to last 10 messages for context window)
    const recentHistory = history.slice(-10);
    for (const msg of recentHistory) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({
          role: msg.role,
          content: sanitizeString(msg.content, 2000),
        });
      }
    }

    // Add current message with context
    messages.push({ role: 'user', content: sanitizedMessage + contextStr });

    // Call Claude API
    const model = isLiteMode ? 'claude-haiku-4-5-20251001' : CHATBOT_CONFIG.model;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: CHATBOT_CONFIG.maxTokens,
        temperature: CHATBOT_CONFIG.temperature,
        system: SYNCWISE_SYSTEM_PROMPT,
        messages,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Claude API error:', response.status, errorData);

      return NextResponse.json({
        success: true,
        response: getFallbackResponse(sanitizedMessage),
        model: 'fallback',
        isLiteMode: false,
      });
    }

    const data = await response.json();
    let assistantMessage = data.content?.[0]?.text || 'Sorry, I couldn\'t generate a response. Try again?';

    // Check for action tags and process them
    const actionResult = await processActions(assistantMessage, session, sanitizedMessage, history);
    if (actionResult.processed) {
      assistantMessage = actionResult.cleanMessage;
    }

    // Detect which capability was used
    const capability = detectCapability(sanitizedMessage, actionResult.action);

    // Track analytics (fire-and-forget)
    trackChatMessage({
      userEmail: session.email || session.sub,
      userRole: session.role,
      message: sanitizedMessage,
      model,
      inputTokens: data.usage?.input_tokens || 0,
      outputTokens: data.usage?.output_tokens || 0,
      isLiteMode,
      capability,
      action: actionResult.action,
      responseTimeMs: Date.now() - startTime,
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      response: assistantMessage,
      model,
      isLiteMode,
      action: actionResult.action || null,
      usage: {
        inputTokens: data.usage?.input_tokens,
        outputTokens: data.usage?.output_tokens,
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    trackError({ endpoint: '/api/chat', userEmail: session?.email, errorType: 'chat_error', errorMessage: error.message, statusCode: 500 }).catch(() => {});
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}

// Process action tags from chatbot responses
async function processActions(message, session, userMessage, history) {
  const result = { processed: false, cleanMessage: message, action: null };

  // Check for issue report
  if (message.includes('[ACTION:REPORT_ISSUE]')) {
    try {
      // Extract conversation context for the issue
      const recentMessages = history.slice(-6).map(m => `${m.role}: ${m.content}`).join('\n');

      await saveFeedback({
        type: 'issue',
        userEmail: session.email || session.sub || 'anonymous',
        userRole: session.role || 'unknown',
        description: userMessage,
        conversationContext: recentMessages,
        page: 'chatbot',
        status: 'open',
      });

      result.action = 'issue_reported';
      console.log('[CHAT] Issue reported by', session.email || session.sub);
    } catch (err) {
      console.error('[CHAT] Failed to save issue:', err.message);
    }
    result.processed = true;
    result.cleanMessage = message.replace('[ACTION:REPORT_ISSUE]', '').trim();
  }

  // Check for feedback/suggestion
  if (message.includes('[ACTION:SAVE_FEEDBACK]')) {
    try {
      const recentMessages = history.slice(-6).map(m => `${m.role}: ${m.content}`).join('\n');

      await saveFeedback({
        type: 'suggestion',
        userEmail: session.email || session.sub || 'anonymous',
        userRole: session.role || 'unknown',
        description: userMessage,
        conversationContext: recentMessages,
        page: 'chatbot',
        status: 'new',
      });

      result.action = 'feedback_saved';
      console.log('[CHAT] Feedback saved from', session.email || session.sub);
    } catch (err) {
      console.error('[CHAT] Failed to save feedback:', err.message);
    }
    result.processed = true;
    result.cleanMessage = message.replace('[ACTION:SAVE_FEEDBACK]', '').trim();
  }

  return result;
}

// GET endpoint for info
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed. Use POST.' }, { status: 405 });
}

// ─── Detect which chatbot capability is being used ───
function detectCapability(message, action) {
  if (action === 'issue_reported') return 'issue_report';
  if (action === 'feedback_saved') return 'feedback';
  const lower = message.toLowerCase();
  if (lower.includes('report') && (lower.includes('issue') || lower.includes('bug'))) return 'issue_report';
  if (lower.includes('email') && (lower.includes('professor') || lower.includes('draft'))) return 'email_draft';
  if (lower.includes('workload') || (lower.includes('how') && lower.includes('week')) || lower.includes('busy')) return 'workload_check';
  if (lower.includes('feedback') || lower.includes('suggest') || lower.includes('feature')) return 'feedback';
  if (lower.includes('study') || lower.includes('plan') || lower.includes('pomodoro') || lower.includes('schedule')) return 'study_planning';
  if (lower.includes('setup') || lower.includes('d2l') || lower.includes('connect') || lower.includes('ical')) return 'setup_help';
  if (lower.includes('what can you') || lower.includes('capabilities') || lower.includes('help')) return 'capabilities';
  return 'general';
}

// ─── Fallback responses when API key isn't configured ───
function getFallbackResponse(message) {
  const lower = message.toLowerCase();

  if (lower.includes('what can you') || lower.includes('capabilities') || lower.includes('help me with')) {
    return 'I can help you with:\n• Setting up your D2L calendar connection\n• Reporting bugs or issues (I\'ll log them for the dev team)\n• Checking your workload ("how\'s my week looking?")\n• Drafting emails to professors\n• Giving feedback or suggesting features\n• Study planning and time management tips\n• Navigating dashboard features\n\nJust ask me anything!';
  }

  if (lower.includes('report') && (lower.includes('issue') || lower.includes('bug') || lower.includes('problem'))) {
    return 'I can help you report that! Tell me:\n1. What happened? (what you expected vs what you saw)\n2. What page or feature were you using?\n\nI\'ll log it for the dev team.';
  }

  if (lower.includes('email') && (lower.includes('professor') || lower.includes('draft') || lower.includes('write'))) {
    return 'I can help you draft an email! Tell me:\n1. Who is the professor?\n2. What\'s the email about? (extension request, question about an assignment, office hours, etc.)\n\nI\'ll write a draft you can copy and send.';
  }

  if (lower.includes('workload') || lower.includes('how') && lower.includes('week') || lower.includes('busy')) {
    return 'I can check your workload! To give you the best analysis, make sure you\'re on the dashboard so I can see your upcoming assignments. Then ask me "how\'s my week looking?" and I\'ll break it down for you.';
  }

  if (lower.includes('feedback') || lower.includes('suggest') || lower.includes('feature') || lower.includes('wish')) {
    return 'I\'d love to hear your feedback! Tell me your suggestion or what you\'d like to see improved, and I\'ll log it for the dev team.';
  }

  if (lower.includes('study') || lower.includes('plan') || lower.includes('schedule') || lower.includes('time')) {
    return 'For study planning, I recommend the pomodoro technique: 25 min focused work, 5 min break, repeat. Tackle your highest-point assignments first during your peak focus hours. Want me to look at your upcoming deadlines and suggest a study schedule?';
  }

  if (lower.includes('connect') || lower.includes('d2l') || lower.includes('calendar') || lower.includes('setup') || lower.includes('ical')) {
    return 'To connect your D2L calendar:\n1. Log into D2L at d2l.coloradomesa.edu\n2. Go to Calendar → Settings (gear icon)\n3. Enable Calendar Feeds and click Save\n4. Click Subscribe to see your feed URL\n5. Copy the .ics URL\n6. Go to /setup and paste it in Step 2\n7. Click Test Connection\n\nNeed more help? Email troysfields@gmail.com';
  }

  if (lower.includes('dark mode') || lower.includes('theme')) {
    return 'You can toggle dark mode using the moon/sun icon in the top-right corner of the dashboard. Your preference is saved automatically.';
  }

  if (lower.includes('notification') || lower.includes('alert')) {
    return 'Customize your notifications at Settings → Notifications. You can set alert timing, methods (push, bell, email), quiet hours, and per-course overrides. Try the presets: Minimal, Balanced, or Everything.';
  }

  if (lower.includes('focus') || lower.includes('mode')) {
    return 'Focus Mode hides everything except your top priority tasks. Click the "Focus Mode" button on your dashboard to toggle it on/off.';
  }

  if (lower.includes('instructor') || lower.includes('teacher')) {
    return 'The instructor dashboard lets teachers view assignments and due dates, manage date conflicts, override assignment dates, and see the calendar from a student perspective. Features like submission tracking, grading dashboards, and announcement posting are coming soon — we\'re working with CMU to get full D2L API access. Check out /future-updates for the full roadmap!';
  }

  if (lower.includes('safe') || lower.includes('privacy') || lower.includes('data') || lower.includes('secure')) {
    return 'Your data is protected with HTTPS encryption, signed session cookies, and FERPA-compliant audit logging. Calendar data is processed in real-time and never permanently stored. See our full privacy policy at /privacy.';
  }

  if (lower.includes('canvas') || lower.includes('outlook') || lower.includes('email sync') || lower.includes('submission') || lower.includes('grading')) {
    return 'That feature is on our roadmap! We\'re actively working with CMU to secure D2L API access, which will unlock a lot more functionality. Check out /future-updates to see everything we\'re building — and let us know what matters most to you. Your feedback helps us prioritize!';
  }

  return 'I\'m the CMU AI Calendar assistant! I can help you navigate the platform, set up your D2L calendar, report issues, check your workload, draft emails to professors, or suggest study plans. This is a beta — check out /future-updates to see what\'s coming next! Ask me "what can you do?" for the full list.';
}
