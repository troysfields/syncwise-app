// Temporary endpoint to seed Troy's account into new database
// Uses the app's own saveUser + saveUserPassword functions for correct format
// DELETE THIS FILE after account is created

import { NextResponse } from 'next/server';
import { saveUser, saveUserPassword, verifyUserPassword, getUser } from '@/lib/db';

export async function GET() {
  try {
    const email = 'tsfields@mavs.coloradomesa.edu';
    const password = 'tfields1061';
    const name = 'Troy Fields';

    // Save user profile
    await saveUser(email, {
      name,
      email,
      role: 'student',
      setupCompleted: true,
      setupDate: '2026-03-11T00:00:00.000Z',
    });

    // Save password using the app's bcrypt hashing
    await saveUserPassword(email, password);

    // Verify it works
    const user = await getUser(email);
    const passwordValid = await verifyUserPassword(email, password);

    return NextResponse.json({
      success: true,
      userFound: !!user,
      passwordValid,
      userName: user?.name,
      userRole: user?.role,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
