// AI Task Prioritization Engine
// Takes assignments + calendar events and returns prioritized task list
// Uses Claude API (Anthropic) or OpenAI — configurable

import { config } from './config';

// Score tasks based on due date proximity, point value, and estimated effort
// This runs locally first as a fast heuristic, then AI refines it
export function quickPrioritize(tasks) {
  const now = new Date();

  return tasks.map(task => {
    const dueDate = new Date(task.dueDate);
    const hoursUntilDue = (dueDate - now) / (1000 * 60 * 60);
    const points = task.points || 10; // default if unknown

    // Priority score: higher = more urgent
    let score = 0;

    // Time urgency (exponential as deadline approaches)
    if (hoursUntilDue <= 0) score += 100; // overdue
    else if (hoursUntilDue <= 6) score += 90;
    else if (hoursUntilDue <= 12) score += 75;
    else if (hoursUntilDue <= 24) score += 60;
    else if (hoursUntilDue <= 48) score += 40;
    else if (hoursUntilDue <= 72) score += 25;
    else if (hoursUntilDue <= 168) score += 10; // within a week
    else score += 5;

    // Point value weight
    score += Math.min(points / 2, 25); // cap at 25 bonus points

    // Penalty for far-out deadlines with low points
    if (hoursUntilDue > 168 && points < 20) score -= 10;

    return {
      ...task,
      priorityScore: Math.max(0, Math.round(score)),
      priorityLevel: score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low',
      hoursUntilDue: Math.round(hoursUntilDue * 10) / 10,
    };
  }).sort((a, b) => b.priorityScore - a.priorityScore);
}

// AI-powered prioritization — sends context to Claude/OpenAI for smart suggestions
export async function aiPrioritize(tasks, calendarEvents) {
  const apiKey = config.ai.apiKey;
  if (!apiKey || apiKey.startsWith('YOUR_')) {
    // Fallback to quick prioritize if no AI key configured
    return {
      tasks: quickPrioritize(tasks),
      suggestions: generateFallbackSuggestions(quickPrioritize(tasks)),
    };
  }

  const taskSummary = tasks.map(t => {
    const due = new Date(t.dueDate);
    const hoursLeft = Math.round((due - new Date()) / (1000 * 60 * 60));
    return `- ${t.name} (${t.courseName || 'Unknown course'}) — ${t.points || '?'} pts — due in ${hoursLeft}h`;
  }).join('\n');

  const eventSummary = calendarEvents.map(e => {
    const start = new Date(e.start);
    return `- ${e.name} at ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }).join('\n');

  const prompt = `You are SyncWise AI, a student productivity assistant. Given the student's upcoming assignments and today's calendar, provide:
1. A prioritized task order with brief reasoning
2. 2-3 specific, actionable suggestions (e.g., "Start ENTR 450 first — it's worth 50pts and due tonight")

Assignments:
${taskSummary}

Today's Calendar:
${eventSummary || 'No events today'}

Respond in JSON format:
{
  "prioritizedTasks": [{ "name": "...", "reason": "...", "priorityLevel": "high|medium|low" }],
  "suggestions": [{ "type": "action|reminder|planning", "text": "..." }]
}`;

  try {
    if (config.ai.provider === 'anthropic') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } else {
      // OpenAI fallback
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
        }),
      });
      const data = await res.json();
      return JSON.parse(data.choices[0].message.content);
    }
  } catch (err) {
    console.error('AI prioritization failed, using fallback:', err.message);
  }

  // Fallback
  return {
    tasks: quickPrioritize(tasks),
    suggestions: generateFallbackSuggestions(quickPrioritize(tasks)),
  };
}

function generateFallbackSuggestions(prioritized) {
  const suggestions = [];
  const topTask = prioritized[0];

  if (topTask) {
    if (topTask.hoursUntilDue <= 12) {
      suggestions.push({
        type: 'action',
        text: `Start ${topTask.name} now — it's due in ${Math.round(topTask.hoursUntilDue)} hours${topTask.points ? ` and worth ${topTask.points} points` : ''}.`,
      });
    } else {
      suggestions.push({
        type: 'action',
        text: `Focus on ${topTask.name} first — it has the highest priority score.`,
      });
    }
  }

  const dueThisWeek = prioritized.filter(t => t.hoursUntilDue <= 168);
  if (dueThisWeek.length > 2) {
    suggestions.push({
      type: 'planning',
      text: `You have ${dueThisWeek.length} assignments due this week. Block study time for each one.`,
    });
  }

  return suggestions;
}
