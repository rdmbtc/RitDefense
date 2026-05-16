// Shared config, ABI, and viem clients for the RitDefense leaderboard.
// Used by both API routes (server) and the React frontend (client).

import { createPublicClient, defineChain, http, type Address } from 'viem';
import deployed from './leaderboard-deployed.json';

export const RITUAL_CHAIN = defineChain({
  id: 1979,
  name: 'Ritual',
  nativeCurrency: { name: 'RITUAL', symbol: 'RITUAL', decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_RITUAL_RPC_URL ||
          'https://rpc.ritualfoundation.org',
      ],
    },
  },
  blockExplorers: {
    default: {
      name: 'Explorer',
      url: 'https://explorer.ritualfoundation.org',
    },
  },
});

export const LEADERBOARD_ADDRESS = (process.env.NEXT_PUBLIC_LEADERBOARD_ADDRESS ||
  deployed.address) as Address;

export const EXPLORER_URL = 'https://explorer.ritualfoundation.org';

export function explorerTxUrl(hash: string) {
  return `${EXPLORER_URL}/tx/${hash}`;
}
export function explorerAddressUrl(addr: string) {
  return `${EXPLORER_URL}/address/${addr}`;
}

export const LEADERBOARD_ABI = [
  {
    type: 'function',
    name: 'submitScore',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'player', type: 'address' },
      { name: 'score', type: 'uint256' },
      { name: 'gameHash', type: 'bytes32' },
      { name: 'signature', type: 'bytes' },
    ],
    outputs: [
      { name: 'currentBest', type: 'uint256' },
      { name: 'currentTotalSubs', type: 'uint256' },
    ],
  },
  {
    type: 'function',
    name: 'nonces',
    stateMutability: 'view',
    inputs: [{ name: 'player', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'stats',
    stateMutability: 'view',
    inputs: [{ name: 'player', type: 'address' }],
    outputs: [
      { name: 'bestScore', type: 'uint256' },
      { name: 'totalScore', type: 'uint256' },
      { name: 'totalSubmissions', type: 'uint256' },
      { name: 'lastSubmittedAt', type: 'uint256' },
    ],
  },
  {
    type: 'function',
    name: 'playersCount',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'totalSubmissions',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'getPlayers',
    stateMutability: 'view',
    inputs: [
      { name: 'offset', type: 'uint256' },
      { name: 'limit', type: 'uint256' },
    ],
    outputs: [
      { name: 'addrs', type: 'address[]' },
      { name: 'bestScores', type: 'uint256[]' },
      { name: 'totalScores', type: 'uint256[]' },
      { name: 'submissions', type: 'uint256[]' },
      { name: 'lastSubmittedAts', type: 'uint256[]' },
    ],
  },
  {
    type: 'function',
    name: 'relayer',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
] as const;

// EIP-712 signing payload definition (matches the on-chain SCORE_TYPEHASH).
export const SCORE_TYPES = {
  ScoreSubmission: [
    { name: 'player', type: 'address' },
    { name: 'score', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'gameHash', type: 'bytes32' },
  ],
} as const;

export function getDomain() {
  return {
    name: 'RitDefenseLeaderboard',
    version: '1',
    chainId: RITUAL_CHAIN.id,
    verifyingContract: LEADERBOARD_ADDRESS,
  } as const;
}

// Shared read-only viem client (safe to import in client components).
export function getReadClient() {
  return createPublicClient({
    chain: RITUAL_CHAIN,
    transport: http(),
  });
}

export type LeaderboardEntry = {
  address: Address;
  bestScore: number;
  totalScore: number;
  submissions: number;
  lastSubmittedAt: number;
};
