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
import { saveFeedback, saveChatHistory, getChatHistory } from '@/lib/db';
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

    // Save conversation to Redis (fire-and-forget)
    const userEmail = session.email || session.sub || 'anonymous';
    const updatedHistory = [
      ...recentHistory,
      { role: 'user', content: sanitizedMessage },
      { role: 'assistant', content: assistantMessage },
    ];
    saveChatHistory(userEmail, updatedHistory).catch(() => {});

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

// GET endpoint — load saved chat history
export async function GET(request) {
  const session = requireAuth(request);
  if (session instanceof NextResponse) return session;

  try {
    const userEmail = session.email || session.sub || 'anonymous';
    const history = await getChatHistory(userEmail);
    return NextResponse.json({ success: true, history });
  } catch (error) {
    console.error('Chat history load error:', error);
    return NextResponse.json({ success: true, history: [] });
  }
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
    return 'I can check your workload and tell you what\'s coming up, draft emails to professors, report bugs for the dev team, help with study planning based on your actual assignments, and walk you through D2L setup or any platform features. Just ask away.';
  }

  if (lower.includes('report') && (lower.includes('issue') || lower.includes('bug') || lower.includes('problem'))) {
    return 'Yeah, tell me what happened and what page you were on. I\'ll log it for the dev team.';
  }

  if (lower.includes('email') && (lower.includes('professor') || lower.includes('draft') || lower.includes('write'))) {
    return 'Sure — who\'s the professor and what\'s the email about? I\'ll write you a draft you can copy and send.';
  }

  if (lower.includes('workload') || (lower.includes('how') && lower.includes('week')) || lower.includes('busy')) {
    return 'Make sure you\'re on the dashboard so I can see your assignments, then ask me again. I\'ll break down what\'s coming up and what to hit first.';
  }

  if (lower.includes('feedback') || lower.includes('suggest') || lower.includes('feature') || lower.includes('wish')) {
    return 'What\'s on your mind? Tell me your idea and I\'ll log it for the team.';
  }

  if (lower.includes('study') || lower.includes('plan') || lower.includes('schedule') || lower.includes('time')) {
    return 'Want me to look at your upcoming deadlines and put together a plan? Head to the dashboard first so I can see what you\'ve got coming up.';
  }

  if (lower.includes('connect') || lower.includes('d2l') || lower.includes('calendar') || lower.includes('setup') || lower.includes('ical')) {
    return 'Log into D2L at d2l.coloradomesa.edu, go to Calendar, hit the Settings gear, enable Calendar Feeds, click Save, then Subscribe. Copy that .ics URL and paste it at syncwise-app.vercel.app/setup in Step 2. Hit Test Connection and you\'re good.';
  }

  if (lower.includes('dark mode') || lower.includes('theme')) {
    return 'Hit the moon/sun icon in the top-right corner. It saves automatically.';
  }

  if (lower.includes('notification') || lower.includes('alert')) {
    return 'Go to Settings then Notifications. You can set timing, methods, quiet hours, and per-course overrides.';
  }

  if (lower.includes('focus') || lower.includes('mode')) {
    return 'Focus Mode strips everything down to just your top priorities. Toggle it from the sidebar.';
  }

  if (lower.includes('safe') || lower.includes('privacy') || lower.includes('data') || lower.includes('secure')) {
    return 'Everything\'s encrypted over HTTPS with signed session cookies. Calendar data is processed in real-time, not stored permanently. Full details at /privacy.';
  }

  if (lower.includes('canvas') || lower.includes('outlook') || lower.includes('email sync') || lower.includes('submission') || lower.includes('grading')) {
    return 'That\'s on the roadmap — we\'re working with CMU on getting the API access to make it happen. Check /future-updates for the full list of what\'s coming.';
  }

  return 'Hey — I\'m your SyncWise assistant. I can check your workload, draft emails, report bugs, help with study planning, or walk you through anything on the platform. What do you need?';
}
