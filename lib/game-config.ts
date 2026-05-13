// Game configuration
export const GAME_CONFIG = {
  // Blockchain configuration for Ritual
  BLOCKCHAIN: {
    // Signer wallet address for on-chain transactions
    SIGNER_WALLET: '0x74E4E54Ac02C560B3a9C4149cDB8FEeC87457338',
  },

  // Game settings
  SCORE_SUBMISSION: {
    // Submit score every X points
    SCORE_THRESHOLD: 10,

    // Track transactions (actions that cost points/tokens)
    TRANSACTION_THRESHOLD: 1,
  },

  // Game metadata
  METADATA: {
    name: 'Rit Defense',
    url: 'https://ritdefense.vercel.app/',
    image: 'https://picsum.photos/536/354'
  }
} as const;