// GET /api/leaderboard/list?limit=10
// Returns a sorted (by bestScore desc) list of leaderboard entries.

import { NextRequest, NextResponse } from 'next/server';
import {
  LEADERBOARD_ABI,
  LEADERBOARD_ADDRESS,
  RITUAL_CHAIN,
  getReadClient,
} from '@/lib/leaderboard';
import { type Address } from 'viem';

export const runtime = 'nodejs';
export const revalidate = 5; // small ISR window so reads are cheap

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get('limit') || 25), 100);

  const client = getReadClient();

  let totalPlayers: bigint;
  let totalSubmissions: bigint;
  try {
    [totalPlayers, totalSubmissions] = await Promise.all([
      client.readContract({
        address: LEADERBOARD_ADDRESS,
        abi: LEADERBOARD_ABI,
        functionName: 'playersCount',
      }),
      client.readContract({
        address: LEADERBOARD_ADDRESS,
        abi: LEADERBOARD_ABI,
        functionName: 'totalSubmissions',
      }),
    ]);
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: 'RPC read failed: ' + (e?.message ?? 'unknown') },
      { status: 502 },
    );
  }

  // For now we read all players (paginated if it grows). Contract pages
  // by index on `players[]`.
  const PAGE = 100n;
  let entries: Array<{
    address: Address;
    bestScore: number;
    totalScore: number;
    submissions: number;
    lastSubmittedAt: number;
  }> = [];

  for (let offset = 0n; offset < totalPlayers; offset += PAGE) {
    const [addrs, bestScores, totalScores, submissions, lastSubmittedAts] =
      (await client.readContract({
        address: LEADERBOARD_ADDRESS,
        abi: LEADERBOARD_ABI,
        functionName: 'getPlayers',
        args: [offset, PAGE],
      })) as readonly [
        readonly Address[],
        readonly bigint[],
        readonly bigint[],
        readonly bigint[],
        readonly bigint[],
      ];

    for (let i = 0; i < addrs.length; i++) {
      entries.push({
        address: addrs[i],
        bestScore: Number(bestScores[i]),
        totalScore: Number(totalScores[i]),
        submissions: Number(submissions[i]),
        lastSubmittedAt: Number(lastSubmittedAts[i]),
      });
    }
  }

  entries.sort((a, b) => b.bestScore - a.bestScore || b.submissions - a.submissions);
  const top = entries.slice(0, limit);

  return NextResponse.json({
    ok: true,
    chainId: RITUAL_CHAIN.id,
    contract: LEADERBOARD_ADDRESS,
    totalPlayers: Number(totalPlayers),
    totalSubmissions: Number(totalSubmissions),
    entries: top,
  });
}
