// API Route: /api/feeds/upload
// Instructor document upload — accepts PDF, DOCX, or TXT files
// AI parses the document for exam dates, grading, office hours, etc.
// POST: multipart/form-data with file + courseName

import { NextResponse } from 'next/server';
import { extractTextFromFile, analyzeDocument, convertToCalendarItems } from '@/lib/doc-parser';
import { logApiCall } from '@/lib/logger';
import { requireAuth } from '@/lib/auth';

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['pdf', 'docx', 'doc', 'txt', 'md'];

export async function POST(request) {
  const session = requireAuth(request);
  if (session instanceof NextResponse) return session;

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const courseName = formData.get('courseName') || '';
    const instructorId = formData.get('instructorId') || 'instructor';

    // Validate file exists
    if (!file || typeof file === 'string') {
      return NextResponse.json(
        { error: 'No file uploaded. Send a file in the "file" form field.' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.` },
        { status: 400 }
      );
    }

    // Validate file type
    const fileName = file.name || 'unknown';
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (!ALLOWED_TYPES.includes(ext)) {
      return NextResponse.json(
        { error: `Unsupported file type: .${ext}. Allowed: ${ALLOWED_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Step 1: Extract text from file
    const extracted = await extractTextFromFile(file);

    if (!extracted.text || extracted.text.trim().length < 50) {
      return NextResponse.json(
        { error: 'Could not extract enough text from the file. Try a different format.' },
        { status: 422 }
      );
    }

    // Step 2: AI-powered analysis
    const analysis = await analyzeDocument(
      extracted.text,
      fileName,
      courseName,
      instructorId
    );

    // Step 3: Convert to calendar items for dashboard
    const calendarItems = convertToCalendarItems(analysis);

    // Log the upload
    logApiCall({
      user: instructorId,
      userRole: 'instructor',
      platform: 'upload',
      action: 'upload_document',
      endpoint: '/api/feeds/upload',
      method: 'POST',
      details: {
        fileName,
        fileSize: file.size,
        fileType: ext,
        courseName: analysis.courseName || courseName,
        extractedDates: calendarItems.length,
        aiPowered: analysis.aiPowered,
      },
      status: 'success',
    });

    return NextResponse.json({
      success: true,
      fileName,
      fileType: ext,
      textLength: extracted.text.length,
      analysis,
      calendarItems,
      calendarItemCount: calendarItems.length,
      analyzedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Document upload API error:', error);
    return NextResponse.json(
      { error: 'Internal server error processing document' },
      { status: 500 }
    );
  }
}

// GET endpoint for info
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/feeds/upload',
    method: 'POST',
    contentType: 'multipart/form-data',
    description: 'Upload a course document (syllabus, schedule) for AI analysis',
    fields: {
      file: '(required) PDF, DOCX, or TXT file — max 10MB',
      courseName: '(optional) Course name, e.g., "ENTR 450"',
      instructorId: '(optional) Instructor identifier for audit logging',
    },
    supportedFormats: ALLOWED_TYPES,
    maxSize: '10MB',
  });
}
