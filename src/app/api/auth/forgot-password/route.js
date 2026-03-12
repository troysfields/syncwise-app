// API Route: /api/auth/forgot-password
// POST: Send password reset email
// PUT: Reset password with token

import { NextResponse } from 'next/server';
import { sanitizeEmail } from '@/lib/auth';
import { getUser, savePasswordResetToken, validateResetToken, consumeResetToken, saveUserPassword } from '@/lib/db';
import { sendEmail, notifyPasswordReset } from '@/lib/email';
import crypto from 'crypto';

// ─── Send reset email ───
export async function POST(request) {
  try {
    const { email } = await request.json();
    const cleanEmail = sanitizeEmail(email || '');

    if (!cleanEmail) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    // Check if user exists
    const user = await getUser(cleanEmail);
    if (!user) {
      // Don't reveal whether the email exists — always return success
      return NextResponse.json({
        success: true,
        message: 'If an account exists with that email, a reset link has been sent.',
      });
    }

    // Generate a secure reset token
    const token = crypto.randomBytes(32).toString('hex');
    await savePasswordResetToken(cleanEmail, token);

    // Send reset email to the user
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://syncwise-app.vercel.app';
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    await sendEmail({
      to: cleanEmail,
      subject: 'Reset your CMU AI Calendar password',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="width: 48px; height: 48px; background: #5D0022; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; color: white; font-size: 20px; font-weight: 800;">C</div>
          </div>
          <h2 style="text-align: center; color: #111827; font-size: 20px;">Reset Your Password</h2>
          <p style="color: #6B7280; font-size: 15px; line-height: 1.6;">
            Hey ${user.name || 'there'}, we got a request to reset your CMU AI Calendar password. Click the button below to set a new one.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}" style="background: #5D0022; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">Reset Password</a>
          </div>
          <p style="color: #9CA3AF; font-size: 13px; line-height: 1.5;">
            This link expires in 1 hour. If you didn't request this, just ignore this email — your password won't change.
          </p>
          <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;" />
          <p style="color: #9CA3AF; font-size: 12px; text-align: center;">
            CMU AI Calendar by SyncWise AI
          </p>
        </div>
      `,
    });

    // Notify admin about password reset request
    notifyPasswordReset(request, cleanEmail).catch(() => {});

    return NextResponse.json({
      success: true,
      message: 'If an account exists with that email, a reset link has been sent.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}

// ─── Reset password with token ───
export async function PUT(request) {
  try {
    const { token, newPassword } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'Reset token is required.' }, { status: 400 });
    }
    if (!newPassword || newPassword.length < 4) {
      return NextResponse.json({ error: 'Password must be at least 4 characters.' }, { status: 400 });
    }

    // Validate the token
    const email = await validateResetToken(token);
    if (!email) {
      return NextResponse.json({ error: 'This reset link has expired or is invalid. Please request a new one.' }, { status: 400 });
    }

    // Update the password
    await saveUserPassword(email, newPassword);
    await consumeResetToken(token);

    return NextResponse.json({
      success: true,
      message: 'Password has been reset. You can now log in with your new password.',
    });
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
