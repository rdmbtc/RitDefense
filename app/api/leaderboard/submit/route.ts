// POST /api/leaderboard/submit
// Body: { player, score, gameHash, signature }
//
// Verifies the player's EIP-712 signature off-chain (sanity check), then
// relays the submitScore transaction on-chain using DEPLOYER_PRIVATE_KEY.
// Returns { ok, txHash, explorerUrl, currentBest, currentTotalSubs }.

import { NextRequest, NextResponse } from 'next/server';
import {
  createPublicClient,
  createWalletClient,
  http,
  isAddress,
  isHex,
  verifyTypedData,
  getContract,
  type Address,
  type Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import {
  LEADERBOARD_ABI,
  LEADERBOARD_ADDRESS,
  RITUAL_CHAIN,
  SCORE_TYPES,
  getDomain,
  explorerTxUrl,
} from '@/lib/leaderboard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function normalizePk(raw: string | undefined) {
  if (!raw) return null;
  let pk = raw.trim();
  if (!pk.startsWith('0x')) pk = '0x' + pk;
  if (!/^0x[0-9a-fA-F]{64}$/.test(pk)) return null;
  return pk as Hex;
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const { player, score, gameHash, signature } = body ?? {};

  if (!isAddress(player)) {
    return NextResponse.json({ ok: false, error: 'Invalid player address' }, { status: 400 });
  }
  const scoreBig = (() => {
    try {
      return BigInt(score);
    } catch {
      return null;
    }
  })();
  if (scoreBig === null || scoreBig < 0n || scoreBig > 2n ** 64n) {
    return NextResponse.json({ ok: false, error: 'Invalid score' }, { status: 400 });
  }
  if (!isHex(gameHash) || (gameHash as string).length !== 66) {
    return NextResponse.json({ ok: false, error: 'gameHash must be 32-byte hex' }, { status: 400 });
  }
  if (!isHex(signature)) {
    return NextResponse.json({ ok: false, error: 'signature must be hex' }, { status: 400 });
  }

  const pk = normalizePk(process.env.DEPLOYER_PRIVATE_KEY);
  if (!pk) {
    return NextResponse.json(
      { ok: false, error: 'Server is missing DEPLOYER_PRIVATE_KEY' },
      { status: 500 },
    );
  }

  const relayerAccount = privateKeyToAccount(pk);

  const publicClient = createPublicClient({ chain: RITUAL_CHAIN, transport: http() });
  const walletClient = createWalletClient({
    account: relayerAccount,
    chain: RITUAL_CHAIN,
    transport: http(),
  });

  const contract = getContract({
    address: LEADERBOARD_ADDRESS,
    abi: LEADERBOARD_ABI,
    client: { public: publicClient, wallet: walletClient },
  });

  // Read the current nonce so we can verify the signature.
  let nonce: bigint;
  try {
    nonce = await contract.read.nonces([player as Address]);
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: 'Failed to read nonce: ' + (e?.message ?? 'unknown') },
      { status: 502 },
    );
  }

  const domain = getDomain();

  // Off-chain sanity check (the contract also enforces this).
  const valid = await verifyTypedData({
    address: player as Address,
    domain,
    types: SCORE_TYPES,
    primaryType: 'ScoreSubmission',
    message: {
      player: player as Address,
      score: scoreBig,
      nonce,
      gameHash: gameHash as Hex,
    },
    signature: signature as Hex,
  });
  if (!valid) {
    return NextResponse.json(
      { ok: false, error: 'Invalid signature for player/score/nonce' },
      { status: 400 },
    );
  }

  // Sanity-check relayer config.
  let onchainRelayer: Address;
  try {
    onchainRelayer = await contract.read.relayer();
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: 'Failed to read relayer: ' + (e?.message ?? 'unknown') },
      { status: 502 },
    );
  }
  if (onchainRelayer.toLowerCase() !== relayerAccount.address.toLowerCase()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'Server relayer does not match the contract relayer. Did the on-chain relayer change?',
        expectedRelayer: onchainRelayer,
        serverRelayer: relayerAccount.address,
      },
      { status: 500 },
    );
  }

  let txHash: Hex;
  try {
    txHash = await walletClient.writeContract({
      address: LEADERBOARD_ADDRESS,
      abi: LEADERBOARD_ABI,
      functionName: 'submitScore',
      args: [
        player as Address,
        scoreBig,
        gameHash as Hex,
        signature as Hex,
      ],
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: 'Tx submission failed: ' + (e?.shortMessage ?? e?.message ?? 'unknown') },
      { status: 502 },
    );
  }

  // Wait for inclusion so we can return updated stats.
  let receipt;
  try {
    receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  } catch (e: any) {
    // Tx is in flight but we can't wait. Still return hash.
    return NextResponse.json({
      ok: true,
      txHash,
      explorerUrl: explorerTxUrl(txHash),
      pending: true,
    });
  }

  if (receipt.status !== 'success') {
    return NextResponse.json(
      {
        ok: false,
        error: 'On-chain reverted',
        txHash,
        explorerUrl: explorerTxUrl(txHash),
      },
      { status: 502 },
    );
  }

  // Post-tx stats.
  let stats: readonly [bigint, bigint, bigint, bigint] | null = null;
  try {
    stats = await contract.read.stats([player as Address]);
  } catch {
    // Non-fatal — submission already succeeded.
  }

  return NextResponse.json({
    ok: true,
    txHash,
    explorerUrl: explorerTxUrl(txHash),
    blockNumber: Number(receipt.blockNumber),
    gasUsed: receipt.gasUsed.toString(),
    bestScore: stats ? stats[0].toString() : null,
    totalScore: stats ? stats[1].toString() : null,
    totalSubmissions: stats ? Number(stats[2]) : null,
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    contract: LEADERBOARD_ADDRESS,
    chainId: RITUAL_CHAIN.id,
    domain: getDomain(),
    types: SCORE_TYPES,
    primaryType: 'ScoreSubmission',
  });
}
