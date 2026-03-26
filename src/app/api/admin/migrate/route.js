// One-time migration: copy all data from old Vercel KV database to new Upstash database
// Protected by ADMIN_SECRET. Delete this file after migration is complete.

import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

export async function POST(request) {
  // Admin auth
  const secret = request.headers.get('x-admin-secret');
  const ADMIN_SECRET = process.env.ADMIN_SECRET;
  if (!ADMIN_SECRET || secret !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Old database (Vercel KV)
    const oldUrl = process.env.KV_REST_API_URL;
    const oldToken = process.env.KV_REST_API_TOKEN;

    // New database (direct Upstash)
    const newUrl = process.env.UPSTASH_REDIS_REST_URL;
    const newToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!oldUrl || !oldToken) {
      return NextResponse.json({ error: 'Old KV_REST_API env vars not found' }, { status: 500 });
    }
    if (!newUrl || !newToken) {
      return NextResponse.json({ error: 'New UPSTASH_REDIS env vars not found' }, { status: 500 });
    }

    // Make sure we're not pointing at the same database
    if (oldUrl === newUrl) {
      return NextResponse.json({ error: 'Old and new databases are the same URL — nothing to migrate' }, { status: 400 });
    }

    const oldDb = new Redis({ url: oldUrl, token: oldToken });
    const newDb = new Redis({ url: newUrl, token: newToken });

    // Scan all keys from old database
    const allKeys = [];
    let cursor = 0;
    do {
      const [nextCursor, keys] = await oldDb.scan(cursor, { count: 100 });
      cursor = nextCursor;
      allKeys.push(...keys);
    } while (cursor !== 0);

    if (allKeys.length === 0) {
      return NextResponse.json({ success: true, message: 'No keys found in old database', migrated: 0 });
    }

    // Copy each key to new database
    let migrated = 0;
    let skipped = 0;
    const errors = [];

    for (const key of allKeys) {
      try {
        // Check if key already exists in new DB (don't overwrite)
        const existingVal = await newDb.get(key);
        if (existingVal !== null) {
          skipped++;
          continue;
        }

        // Get value from old DB
        const value = await oldDb.get(key);
        if (value !== null) {
          await newDb.set(key, value);
          migrated++;
        }
      } catch (err) {
        errors.push({ key, error: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      totalKeys: allKeys.length,
      migrated,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
      keys: allKeys,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
