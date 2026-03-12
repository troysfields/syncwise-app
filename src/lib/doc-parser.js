// Instructor Document Parser
// Parses uploaded course documents (syllabus, schedule, etc.) using AI
// Extracts: exam dates, assignment due dates, office hours, grading breakdown,
// key deadlines, and course policies
// Teachers upload PDFs/DOCXs → AI extracts structured data → feeds student dashboards

import { config } from './config';
import { logApiCall } from './logger';
import { getModelForRequest, recordRequest } from './rate-limiter';

// ============================================================
// DOCUMENT TEXT EXTRACTION
// ============================================================

// Extract text from uploaded file based on type
// In production, use pdf-parse for PDFs and mammoth for DOCX
// For now, we accept pre-extracted text or use the AI to process raw content
export async function extractTextFromFile(file) {
  const fileName = file.name || '';
  const fileType = fileName.split('.').pop()?.toLowerCase();

  if (fileType === 'txt' || fileType === 'md') {
    // Plain text — read directly
    const text = await file.text();
    return { text, type: 'text', fileName };
  }

  if (fileType === 'pdf') {
    // PDF extraction — use pdf-parse library
    try {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      // Dynamic import to avoid bundling issues
      const pdfParse = (await import('pdf-parse')).default;
      const data = await pdfParse(buffer);
      return { text: data.text, type: 'pdf', fileName, pages: data.numpages };
    } catch (err) {
      console.error('PDF parse failed:', err.message);
      // Fallback: return raw text attempt
      const text = await file.text();
      return { text, type: 'pdf-fallback', fileName };
    }
  }

  if (fileType === 'docx') {
    // DOCX extraction — use mammoth library
    try {
      const arrayBuffer = await file.arrayBuffer();
      const mammoth = (await import('mammoth')).default;
      const result = await mammoth.extractRawText({ arrayBuffer });
      return { text: result.value, type: 'docx', fileName };
    } catch (err) {
      console.error('DOCX parse failed:', err.message);
      const text = await file.text();
      return { text, type: 'docx-fallback', fileName };
    }
  }

  // Unsupported type — try as plain text
  const text = await file.text();
  return { text, type: 'unknown', fileName };
}

// ============================================================
// AI DOCUMENT ANALYSIS
// ============================================================

// Send extracted text to AI for structured extraction
export async function analyzeDocument(text, fileName, courseName, instructorId = 'instructor') {
  const apiKey = config.ai.apiKey;

  // Get rate-limited model
  const { model, isLiteMode, reason } = getModelForRequest(instructorId, 'doc_analysis');

  // If no AI key, use rule-based extraction
  if (!apiKey || apiKey.startsWith('YOUR_')) {
    const result = ruleBasedExtraction(text, courseName);
    return { ...result, isLiteMode: false, aiPowered: false };
  }

  // Truncate very long documents (keep first ~8000 words)
  const truncatedText = truncateText(text, 8000);

  const prompt = `You are an academic document analyzer for SyncWise AI. Extract structured data from this course document.

Document: "${fileName}"
Course: ${courseName || 'Unknown'}

Text:
${truncatedText}

Extract the following and respond in JSON format:
{
  "documentType": "syllabus|schedule|rubric|policy|other",
  "courseName": "Full course name if found",
  "courseCode": "e.g., ENTR 450",
  "instructor": {
    "name": "",
    "email": "",
    "phone": "",
    "officeLocation": "",
    "officeHours": [{ "day": "", "startTime": "", "endTime": "" }]
  },
  "grading": {
    "breakdown": [{ "category": "", "weight": 0, "description": "" }],
    "scale": "e.g., A=90-100, B=80-89..."
  },
  "importantDates": [
    {
      "name": "Event or assignment name",
      "date": "YYYY-MM-DD or descriptive",
      "type": "exam|assignment|project|presentation|deadline|holiday|other",
      "description": "Brief note",
      "points": null
    }
  ],
  "weeklySchedule": [
    {
      "week": 1,
      "dateRange": "",
      "topics": [""],
      "readings": "",
      "assignmentsDue": ""
    }
  ],
  "policies": {
    "attendance": "",
    "lateWork": "",
    "academicHonesty": "",
    "other": []
  },
  "textbooks": [{ "title": "", "author": "", "required": true }]
}

Only include fields where you find actual data. For dates, use YYYY-MM-DD format when possible. If a date mentions "Week 5" or "TBD", include it as-is.`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await res.json();
    const responseText = data.content?.[0]?.text || '';

    // Track token usage
    const tokensUsed = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);
    recordRequest(instructorId, 'doc_analysis', tokensUsed);

    // Log the analysis
    logApiCall({
      user: instructorId,
      userRole: 'instructor',
      platform: 'ai',
      action: 'analyze_document',
      endpoint: 'anthropic/messages',
      method: 'POST',
      details: { fileName, courseName, model, tokensUsed },
      status: 'success',
    });

    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        ...parsed,
        aiPowered: true,
        isLiteMode,
        liteModeReason: reason,
        analyzedAt: new Date().toISOString(),
        sourceFile: fileName,
      };
    }

    throw new Error('No valid JSON in AI response');
  } catch (err) {
    console.error('AI document analysis failed:', err.message);

    logApiCall({
      user: instructorId,
      userRole: 'instructor',
      platform: 'ai',
      action: 'analyze_document',
      endpoint: 'anthropic/messages',
      method: 'POST',
      details: { fileName, error: err.message },
      status: 'error',
    });

    // Fallback to rule-based extraction
    const result = ruleBasedExtraction(text, courseName);
    return { ...result, isLiteMode: false, aiPowered: false };
  }
}

// ============================================================
// RULE-BASED EXTRACTION (Fallback when AI is unavailable)
// ============================================================

function ruleBasedExtraction(text, courseName) {
  return {
    documentType: detectDocumentType(text),
    courseName: courseName || extractCourseNameFromText(text),
    courseCode: extractCourseCode(text),
    instructor: extractInstructorInfo(text),
    grading: extractGradingInfo(text),
    importantDates: extractDates(text),
    weeklySchedule: [],
    policies: extractPolicies(text),
    textbooks: extractTextbooks(text),
    analyzedAt: new Date().toISOString(),
  };
}

function detectDocumentType(text) {
  const lower = text.toLowerCase();
  if (lower.includes('syllabus')) return 'syllabus';
  if (lower.includes('schedule') || lower.includes('weekly plan')) return 'schedule';
  if (lower.includes('rubric') || lower.includes('grading criteria')) return 'rubric';
  return 'other';
}

function extractCourseNameFromText(text) {
  // Look for patterns like "ENTR 450: Entrepreneurship" or "Course: ..."
  const patterns = [
    /(?:course|class):\s*(.+?)(?:\n|$)/i,
    /([A-Z]{2,5}\s*\d{3,4}[A-Z]?\s*[-—:]\s*.+?)(?:\n|$)/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  return '';
}

function extractCourseCode(text) {
  const match = text.match(/\b([A-Z]{2,5})\s*(\d{3,4}[A-Z]?)\b/);
  return match ? `${match[1]} ${match[2]}` : '';
}

function extractInstructorInfo(text) {
  const info = { name: '', email: '', phone: '', officeLocation: '', officeHours: [] };

  // Email
  const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
  if (emailMatch) info.email = emailMatch[0];

  // Phone
  const phoneMatch = text.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  if (phoneMatch) info.phone = phoneMatch[0];

  // Instructor name (after "Instructor:" or "Professor:")
  const nameMatch = text.match(/(?:instructor|professor|dr\.|taught by)[:.]?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i);
  if (nameMatch) info.name = nameMatch[1].trim();

  // Office hours pattern
  const ohMatch = text.match(/office\s*hours?[:.]?\s*([^\n]+)/i);
  if (ohMatch) {
    info.officeHours = [{ day: '', startTime: '', endTime: '', raw: ohMatch[1].trim() }];
  }

  return info;
}

function extractGradingInfo(text) {
  const breakdown = [];

  // Look for percentage patterns: "Exams: 30%" or "Participation 10%"
  const gradeRegex = /([A-Za-z\s&]+?)\s*[-—:]\s*(\d{1,3})\s*%/g;
  let match;
  while ((match = gradeRegex.exec(text)) !== null) {
    const category = match[1].trim();
    const weight = parseInt(match[2]);
    if (weight > 0 && weight <= 100 && category.length > 1 && category.length < 50) {
      breakdown.push({ category, weight, description: '' });
    }
  }

  return { breakdown, scale: '' };
}

function extractDates(text) {
  const dates = [];

  // Look for date patterns: "March 15", "3/15/2026", "2026-03-15"
  const datePatterns = [
    // "Exam 1: March 15" or "Final Project due April 20"
    /(?:(midterm|final|exam|quiz|test|project|paper|essay|presentation|assignment|homework|lab)\s*\d*)\s*[-—:,]?\s*(?:due\s*)?(?:on\s*)?(\w+\s+\d{1,2}(?:,?\s*\d{4})?)/gi,
    // "Due: March 15" patterns
    /(?:due|deadline)[:.]?\s*(\w+\s+\d{1,2}(?:,?\s*\d{4})?)/gi,
  ];

  for (const pattern of datePatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      dates.push({
        name: match[1] || 'Deadline',
        date: match[2] || match[1],
        type: detectEventType(match[0]),
        description: match[0].trim(),
        points: null,
      });
    }
  }

  return dates;
}

function detectEventType(text) {
  const lower = text.toLowerCase();
  if (/exam|midterm|final|test|quiz/.test(lower)) return 'exam';
  if (/project|paper|essay/.test(lower)) return 'project';
  if (/presentation/.test(lower)) return 'presentation';
  if (/assignment|homework|hw|lab/.test(lower)) return 'assignment';
  return 'deadline';
}

function extractPolicies(text) {
  const policies = { attendance: '', lateWork: '', academicHonesty: '', other: [] };

  // Attendance
  const attMatch = text.match(/attendance[^.]*\./i);
  if (attMatch) policies.attendance = attMatch[0].trim();

  // Late work
  const lateMatch = text.match(/late\s*(?:work|assignment|submission)[^.]*\./i);
  if (lateMatch) policies.lateWork = lateMatch[0].trim();

  return policies;
}

function extractTextbooks(text) {
  const books = [];
  // Look for ISBN patterns or "Required Text:" sections
  const isbnMatch = text.match(/ISBN[:\s]*[\d-X]+/gi);
  if (isbnMatch) {
    books.push({ title: 'See syllabus', author: '', required: true, isbn: isbnMatch[0] });
  }
  return books;
}

// ============================================================
// UTILITIES
// ============================================================

function truncateText(text, maxWords) {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(' ') + '\n\n[Document truncated — showing first ~' + maxWords + ' words]';
}

// ============================================================
// CONVERT EXTRACTED DATA TO DASHBOARD ITEMS
// ============================================================

// Turn parsed document data into SyncWise dashboard items
export function convertToCalendarItems(parsedDoc) {
  const items = [];
  const courseName = parsedDoc.courseName || parsedDoc.courseCode || 'Unknown Course';

  // Convert important dates to calendar items
  if (parsedDoc.importantDates) {
    for (const dateItem of parsedDoc.importantDates) {
      const parsedDate = tryParseDate(dateItem.date);

      items.push({
        id: `doc-${hashString(courseName + dateItem.name + dateItem.date)}`,
        type: mapEventType(dateItem.type),
        name: dateItem.name,
        courseName,
        courseColor: '#5D0022',
        dueDate: parsedDate ? parsedDate.toISOString() : null,
        startDate: null,
        source: 'instructor_upload',
        hasDueDate: !!parsedDate,
        submitted: false,
        graded: false,
        grade: null,
        unread: false,
        isRecurring: false,
        recurringLabel: null,
        description: dateItem.description || '',
        points: dateItem.points || null,
        status: 'active',
        manualDate: null,
        confirmedNoDate: !parsedDate,
        sourceFile: parsedDoc.sourceFile || '',
      });
    }
  }

  // Convert office hours to recurring events
  if (parsedDoc.instructor?.officeHours) {
    for (const oh of parsedDoc.instructor.officeHours) {
      items.push({
        id: `doc-oh-${hashString(courseName + JSON.stringify(oh))}`,
        type: 'office_hours',
        name: `Office Hours — ${parsedDoc.instructor.name || 'Instructor'}`,
        courseName,
        courseColor: '#5D0022',
        dueDate: null,
        startDate: null,
        source: 'instructor_upload',
        hasDueDate: false,
        submitted: false,
        graded: false,
        grade: null,
        unread: false,
        isRecurring: true,
        recurringLabel: oh.day || 'Weekly',
        description: oh.raw || `${oh.day} ${oh.startTime}-${oh.endTime}`,
        status: 'active',
        manualDate: null,
        confirmedNoDate: true,
      });
    }
  }

  return items;
}

function tryParseDate(dateStr) {
  if (!dateStr) return null;

  // Try standard Date parsing
  const d = new Date(dateStr);
  if (!isNaN(d.getTime()) && d.getFullYear() >= 2024 && d.getFullYear() <= 2030) {
    return d;
  }

  // Try "Month Day" format for current academic year
  const monthDayMatch = dateStr.match(/(\w+)\s+(\d{1,2})/);
  if (monthDayMatch) {
    const months = ['january','february','march','april','may','june','july','august','september','october','november','december'];
    const monthIdx = months.indexOf(monthDayMatch[1].toLowerCase());
    if (monthIdx !== -1) {
      const year = new Date().getFullYear();
      const candidate = new Date(year, monthIdx, parseInt(monthDayMatch[2]));
      // If the date is in the past, try next year
      if (candidate < new Date()) {
        return new Date(year + 1, monthIdx, parseInt(monthDayMatch[2]));
      }
      return candidate;
    }
  }

  return null;
}

function mapEventType(type) {
  const map = {
    exam: 'quiz',
    assignment: 'assignment',
    project: 'assignment',
    presentation: 'assignment',
    deadline: 'event',
    holiday: 'event',
    other: 'event',
  };
  return map[type] || 'event';
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}
