"use client";

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Trophy, ExternalLink, Loader2, Send, X, Skull, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import {
  keccak256,
  toBytes,
  type Address,
  type Hex,
} from 'viem';
import {
  LEADERBOARD_ADDRESS,
  RITUAL_CHAIN,
  SCORE_TYPES,
  getDomain,
  explorerTxUrl,
} from '@/lib/leaderboard';
import { getReadClient } from '@/lib/leaderboard';
import { LEADERBOARD_ABI } from '@/lib/leaderboard';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  score: number;
  isWin: boolean;
  player: Address | null;
  onConnect: () => void;
};

// Build a unique-ish gameHash for off-chain audit. Not validated on-chain.
function computeGameHash(player: string, score: number): Hex {
  const payload = `${player}:${score}:${Date.now()}:${Math.random()}`;
  return keccak256(toBytes(payload));
}

async function readNonce(player: Address): Promise<bigint> {
  const client = getReadClient();
  const nonce = (await client.readContract({
    address: LEADERBOARD_ADDRESS,
    abi: LEADERBOARD_ABI,
    functionName: 'nonces',
    args: [player],
  })) as bigint;
  return nonce;
}

async function ensureCorrectChain(): Promise<void> {
  const eth = (window as any).ethereum;
  if (!eth) throw new Error('No injected wallet found');

  const targetChainHex = `0x${RITUAL_CHAIN.id.toString(16)}`;

  const readChainId = async (): Promise<number> => {
    try {
      const hex: string = await eth.request({ method: 'eth_chainId' });
      return parseInt(hex, 16);
    } catch {
      return -1;
    }
  };

  const isOnTarget = async () => (await readChainId()) === RITUAL_CHAIN.id;

  if (await isOnTarget()) return;

  const switchChain = () =>
    eth.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: targetChainHex }],
    });

  const addChain = () =>
    eth.request({
      method: 'wallet_addEthereumChain',
      params: [
        {
          chainId: targetChainHex,
          chainName: RITUAL_CHAIN.name,
          nativeCurrency: RITUAL_CHAIN.nativeCurrency,
          rpcUrls: RITUAL_CHAIN.rpcUrls.default.http,
          blockExplorerUrls: ['https://explorer.ritualfoundation.org'],
        },
      ],
    });

  try {
    await switchChain();
  } catch (err: any) {
    // 4902 / "unrecognized chain" → add the chain, then switch.
    const msg: string = err?.message ?? '';
    if (err?.code === 4902 || /unrecognized chain|chain.*not.*added/i.test(msg)) {
      await addChain();
      try {
        await switchChain();
      } catch {
        /* some wallets auto-switch after add; ignore */
      }
    } else if (err?.code === 4001) {
      // User rejected — surface a friendlier error.
      throw new Error('Network switch was rejected. Please switch to Ritual Chain (1979) and try again.');
    } else {
      throw err;
    }
  }

  // Wallets often resolve the switch promise before the provider's chainId is
  // updated. Poll briefly so subsequent calls (signing, RPC) see the new chain.
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    if (await isOnTarget()) return;
    await new Promise((r) => setTimeout(r, 150));
  }
  // If still not on target, continue anyway — the on-chain submitScore will
  // verify the EIP-712 domain regardless of wallet UX state.
}

export function SubmitScoreModal({ open, onOpenChange, score, isWin, player, onConnect }: Props) {
  const [phase, setPhase] = useState<'idle' | 'signing' | 'relaying' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [serverStats, setServerStats] = useState<{
    bestScore: string | null;
    totalSubmissions: number | null;
  } | null>(null);

  const reset = useCallback(() => {
    setPhase('idle');
    setError(null);
    setTxHash(null);
    setServerStats(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!player) {
      onConnect();
      return;
    }
    setError(null);
    setTxHash(null);
    setServerStats(null);

    try {
      setPhase('signing');
      await ensureCorrectChain();
      const nonce = await readNonce(player);
      const gameHash = computeGameHash(player, score);

      const eth = (window as any).ethereum;
      if (!eth) throw new Error('No injected wallet found');

      const typedData = {
        domain: getDomain(),
        primaryType: 'ScoreSubmission' as const,
        types: {
          // Root domain type required by some wallets
          EIP712Domain: [
            { name: 'name', type: 'string' },
            { name: 'version', type: 'string' },
            { name: 'chainId', type: 'uint256' },
            { name: 'verifyingContract', type: 'address' },
          ],
          ...SCORE_TYPES,
        },
        message: {
          player,
          score: String(score),
          nonce: nonce.toString(),
          gameHash,
        },
      };

      let signature: string;
      try {
        signature = await eth.request({
          method: 'eth_signTypedData_v4',
          params: [player, JSON.stringify(typedData)],
        });
      } catch (e: any) {
        // Some wallets reject with code 4001 (user rejected)
        if (e?.code === 4001) {
          setPhase('idle');
          toast.info('Score submission cancelled.');
          return;
        }
        throw e;
      }

      setPhase('relaying');
      const res = await fetch('/api/leaderboard/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player,
          score,
          gameHash,
          signature,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || `Relay failed (HTTP ${res.status})`);
      }

      setTxHash(data.txHash);
      setServerStats({
        bestScore: data.bestScore ?? null,
        totalSubmissions: data.totalSubmissions ?? null,
      });
      setPhase('success');

      toast.success('Score submitted!', {
        description: 'View on the Ritual explorer →',
        action: {
          label: 'Open',
          onClick: () => window.open(explorerTxUrl(data.txHash), '_blank'),
        },
      });
    } catch (e: any) {
      console.error('[submit-score] failed', e);
      setError(e?.message ?? String(e));
      setPhase('error');
      toast.error('Submission failed', { description: e?.message });
    }
  }, [player, score, onConnect]);

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-md border-white/10 bg-slate-950/95 text-white">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5">
            {isWin ? (
              <Trophy className="h-7 w-7 text-amber-300" />
            ) : (
              <Skull className="h-7 w-7 text-rose-300" />
            )}
          </div>
          <DialogTitle className="text-center text-2xl font-bold">
            {isWin ? 'Victory!' : 'Game Over'}
          </DialogTitle>
          <DialogDescription className="text-center text-white/70">
            {isWin
              ? 'You held the line. Submit your score to the leaderboard.'
              : 'Nice run — submit your score to the on-chain leaderboard.'}
          </DialogDescription>
        </DialogHeader>

        <div className="my-2 rounded-xl border border-white/10 bg-gradient-to-br from-indigo-500/15 to-fuchsia-500/15 p-5 text-center">
          <div className="text-[11px] uppercase tracking-[0.2em] text-white/50">Final Score</div>
          <div className="mt-1 text-5xl font-extrabold tabular-nums tracking-tight text-white">
            {score.toLocaleString()}
          </div>
          {serverStats?.bestScore && (
            <div className="mt-1 flex items-center justify-center gap-1 text-xs text-amber-300">
              <Sparkles className="h-3 w-3" />
              Best on-chain: {Number(serverStats.bestScore).toLocaleString()}
              {serverStats.totalSubmissions != null && (
                <span className="text-white/50">
                  {' '}· {serverStats.totalSubmissions} submission
                  {serverStats.totalSubmissions === 1 ? '' : 's'}
                </span>
              )}
            </div>
          )}
        </div>

        {phase === 'success' && txHash && (
          <div className="rounded-lg border border-emerald-400/25 bg-emerald-500/10 p-3 text-sm text-emerald-100">
            <p className="font-semibold">Submitted on-chain ✓</p>
            <p className="mt-0.5 break-all text-[11px] text-emerald-200/80">tx {txHash}</p>
            <a
              href={explorerTxUrl(txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-white underline underline-offset-2 hover:text-emerald-200"
            >
              View on Ritual Explorer <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}

        {phase === 'error' && error && (
          <div className="rounded-lg border border-rose-400/25 bg-rose-500/10 p-3 text-sm text-rose-100">
            <p className="font-semibold">Submission failed</p>
            <p className="mt-0.5 text-[11px] text-rose-200/80 break-words">{error}</p>
          </div>
        )}

        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          {phase === 'success' ? (
            <Button
              className="flex-1"
              onClick={() => { onOpenChange(false); reset(); }}
            >
              Done
            </Button>
          ) : (
            <>
              <Button
                className="flex-1 gap-2 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 hover:opacity-95"
                disabled={phase === 'signing' || phase === 'relaying'}
                onClick={handleSubmit}
              >
                {phase === 'signing' || phase === 'relaying' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {!player
                  ? 'Connect Wallet'
                  : phase === 'signing'
                    ? 'Sign in your wallet…'
                    : phase === 'relaying'
                      ? 'Submitting on-chain…'
                      : 'Submit Score (gasless)'}
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                onClick={() => { onOpenChange(false); reset(); }}
                disabled={phase === 'signing' || phase === 'relaying'}
              >
                <X className="h-4 w-4" />
                Skip
              </Button>
            </>
          )}
        </div>

        <p className="mt-1 text-center text-[11px] text-white/40">
          You sign for free; the deployer relays the tx and pays gas. Contract:{' '}
          <code className="text-white/60">{LEADERBOARD_ADDRESS.slice(0, 8)}…</code>
        </p>
      </DialogContent>
    </Dialog>
  );
}
