import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Returns a stable local CSRF token. The legacy upstream backend was
// removed; the token is consumed only by the existing axios interceptor in
// lib/api.ts and is no longer validated server-side. Returning 200 here keeps
// the interceptor and react-query consumers happy (no retry loops).

export async function GET() {
  return NextResponse.json({
    csrfToken: 'local-noop',
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  });
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
