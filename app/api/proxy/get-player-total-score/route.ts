import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Legacy total-score lookup. The new leaderboard lives on-chain via
// /api/leaderboard/* — this route just returns zeros so usePlayerTotalScore()
// resolves successfully (no retry storm).

export async function POST() {
  return NextResponse.json({ totalScore: 0, bestScore: '0', gamesPlayed: 0 });
}
