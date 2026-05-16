// GET /api/leaderboard/player/[address]
// Returns the player's stats from the on-chain leaderboard.

import { NextRequest, NextResponse } from 'next/server';
import { isAddress, type Address } from 'viem';
import {
  LEADERBOARD_ABI,
  LEADERBOARD_ADDRESS,
  getReadClient,
} from '@/lib/leaderboard';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ address: string }> },
) {
  const { address } = await params;
  if (!isAddress(address)) {
    return NextResponse.json({ ok: false, error: 'Invalid address' }, { status: 400 });
  }

  const client = getReadClient();
  try {
    const [bestScore, totalScore, totalSubmissions, lastSubmittedAt] =
      (await client.readContract({
        address: LEADERBOARD_ADDRESS,
        abi: LEADERBOARD_ABI,
        functionName: 'stats',
        args: [address as Address],
      })) as readonly [bigint, bigint, bigint, bigint];

    const nonce = await client.readContract({
      address: LEADERBOARD_ADDRESS,
      abi: LEADERBOARD_ABI,
      functionName: 'nonces',
      args: [address as Address],
    });

    return NextResponse.json({
      ok: true,
      address,
      bestScore: bestScore.toString(),
      totalScore: totalScore.toString(),
      totalSubmissions: Number(totalSubmissions),
      lastSubmittedAt: Number(lastSubmittedAt),
      nonce: nonce.toString(),
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: 'RPC read failed: ' + (e?.message ?? 'unknown') },
      { status: 502 },
    );
  }
}
