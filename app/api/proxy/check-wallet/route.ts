import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Legacy username lookup. Backend is removed — return a UserData-shaped empty
// payload so useUsername() resolves cleanly without retries.

export async function POST() {
  return NextResponse.json({ hasUsername: false, user: null });
}
