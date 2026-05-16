import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Legacy "start session" endpoint. Returns a synthetic local session so
// useGameSession resolves successfully. The on-chain leaderboard does not
// require this token.

export async function POST() {
  return NextResponse.json({
    sessionToken: 'local-noop',
    sessionId: `local-${Date.now()}`,
  });
}
