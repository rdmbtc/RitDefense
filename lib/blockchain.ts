import { createPublicClient, http } from 'viem';
import { defineChain } from 'viem';

// Define Ritual Testnet chain
const ritualTestnet = defineChain({
  id: 1979,
  name: 'Ritual Testnet',
  network: 'ritual-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'RITUAL',
    symbol: 'RITUAL',
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_RITUAL_RPC_URL ?? 'https://rpc.ritualfoundation.org'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Ritual Explorer',
      url: 'https://explorer.ritualfoundation.org'
    },
  },
  testnet: true,
});

// Contract configuration - placeholder (to be updated for Ritual)
export const CONTRACT_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

// ABI will need to be updated for Ritual chain
export const CONTRACT_ABI = [] as const;

// Create public client for reading contract data
export const publicClient = createPublicClient({
  chain: ritualTestnet,
  transport: http()
});

// Helper function to validate Ethereum address
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// Helper function to get player data from contract (global totals)
export async function getPlayerData(playerAddress: string) {
  if (!isValidAddress(playerAddress)) {
    throw new Error('Invalid player address');
  }

  // TODO: Update contract integration for Ritual chain
  throw new Error('Contract integration pending Ritual setup');
}

// Helper function to get player data for a specific game
export async function getPlayerDataPerGame(playerAddress: string, gameAddress: string) {
  if (!isValidAddress(playerAddress) || !isValidAddress(gameAddress)) {
    throw new Error('Invalid player or game address');
  }

  // TODO: Update contract integration for Ritual chain
  throw new Error('Contract integration pending Ritual setup');
}