// API Route: /api/user/profile
// User profile management — load and update user data
// GET: Load user profile (requires auth)
// PUT: Update user settings (requires auth)
// DELETE: Delete account and all data (requires auth)

import { NextResponse } from 'next/server';
import { requireAuth, sanitizeString, sanitizeUrl, sanitizeEmail } from '@/lib/auth';
import { getUser, saveUser, deleteUser, updateUserSettings } from '@/lib/db';

export async function GET(request) {
  const session = requireAuth(request);
  if (session instanceof NextResponse) return session;

  try {
    const profile = await getUser(session.email);

    if (!profile) {
      return NextResponse.json({
        exists: false,
        message: 'No profile found. Complete setup to create your account.',
      }, { status: 404 });
    }

    return NextResponse.json({
      exists: true,
      profile: {
        name: profile.name,
        email: profile.email,
        role: profile.role,
        icalUrl: profile.icalUrl || '',
        courses: profile.courses || {},
        settings: profile.settings || {},
        setupCompleted: profile.setupCompleted || false,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      },
    });
  } catch (error) {
    console.error('Profile load error:', error);
    return NextResponse.json({ error: 'Failed to load profile.' }, { status: 500 });
  }
}

export async function PUT(request) {
  const session = requireAuth(request);
  if (session instanceof NextResponse) return session;

  try {
    const body = await request.json();
    const { name, icalUrl, courses, settings, notificationPreferences } = body;

    const updates = {};
    if (name) updates.name = sanitizeString(name, 100);
    if (icalUrl !== undefined) updates.icalUrl = icalUrl ? sanitizeUrl(icalUrl) : '';
    if (courses) updates.courses = courses;
    if (notificationPreferences) {
      updates.settings = { ...(updates.settings || {}), notifications: notificationPreferences };
    }

    // If updating settings specifically
    if (settings) {
      const profile = await updateUserSettings(session.email, settings);
      if (!profile) {
        return NextResponse.json({ error: 'Profile not found.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, profile });
    }

    // General profile update
    const profile = await saveUser(session.email, updates);
    return NextResponse.json({ success: true, profile });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: 'Failed to update profile.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  const session = requireAuth(request);
  if (session instanceof NextResponse) return session;

  try {
    await deleteUser(session.email);
    return NextResponse.json({
      success: true,
      message: 'Account and all associated data have been deleted.',
    });
  } catch (error) {
    console.error('Account deletion error:', error);
    return NextResponse.json({ error: 'Failed to delete account.' }, { status: 500 });
  }
}
