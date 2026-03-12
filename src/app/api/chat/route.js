// API Route: /api/chat
// SyncWise AI Chatbot — Tier 1: Platform guidance and navigation
// AUTH: Requires valid session
// Uses Haiku for cost efficiency (~$0.001 per conversation turn)

import { NextResponse } from 'next/server';
import { requireAuth, sanitizeString } from '@/lib/auth';
import { SYNCWISE_SYSTEM_PROMPT, CHATBOT_CONFIG } from '@/lib/chatbot-prompt';
import { getModelForRequest } from '@/lib/rate-limiter';

export async function POST(request) {
  // Auth check
  const session = requireAuth(request);
  if (session instanceof NextResponse) return session;

  try {
    const body = await request.json();
    const { message, history = [] } = body;

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
      // Return a helpful canned response when no API key
      return NextResponse.json({
        success: true,
        response: getFallbackResponse(sanitizedMessage),
        model: 'fallback',
        isLiteMode: false,
      });
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

    // Add current message
    messages.push({ role: 'user', content: sanitizedMessage });

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

      // Fallback to canned responses on API error
      return NextResponse.json({
        success: true,
        response: getFallbackResponse(sanitizedMessage),
        model: 'fallback',
        isLiteMode: false,
      });
    }

    const data = await response.json();
    const assistantMessage = data.content?.[0]?.text || 'Sorry, I couldn\'t generate a response. Try again?';

    return NextResponse.json({
      success: true,
      response: assistantMessage,
      model,
      isLiteMode,
      usage: {
        inputTokens: data.usage?.input_tokens,
        outputTokens: data.usage?.output_tokens,
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}

// GET endpoint for info
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/chat',
    method: 'POST',
    description: 'CMU AI Calendar chatbot — platform guidance and navigation help',
    requires: 'Authentication (session cookie)',
    body: {
      message: '(required) User message, max 2000 chars',
      history: '(optional) Array of { role, content } for conversation context',
    },
  });
}

// ─── Fallback responses when API key isn't configured ───
function getFallbackResponse(message) {
  const lower = message.toLowerCase();

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
    return 'The instructor dashboard lets teachers manage date conflicts, override assignment dates, track submissions, and compose announcements. Instructors access it at /instructor.';
  }

  if (lower.includes('safe') || lower.includes('privacy') || lower.includes('data') || lower.includes('secure')) {
    return 'Your data is protected with HTTPS encryption, signed session cookies, and FERPA-compliant audit logging. Calendar data is processed in real-time and never permanently stored. See our full privacy policy at /privacy.';
  }

  if (lower.includes('help') || lower.includes('what can you')) {
    return 'I can help you with:\n• Setting up your D2L calendar connection\n• Navigating the dashboard features\n• Understanding notifications and settings\n• Explaining how features work\n• Troubleshooting common issues\n\nJust ask me anything!';
  }

  return 'I\'m the CMU AI Calendar assistant! I can help you navigate the platform, set up your D2L calendar, configure notifications, and explain any feature. What would you like to know?';
}
