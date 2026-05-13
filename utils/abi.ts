export const UPDATE_PLAYER_DATA_ABI = [
  {
    inputs: [
      {
        components: [
          { name: "player", type: "address" },
          { name: "score", type: "uint256" },
          { name: "transactions", type: "uint256" }
        ],
        name: "_playerData",
        type: "tuple"
      }
    ],
    name: "updatePlayerData",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  }
] as const;

export const CONTRACT_ABI = UPDATE_PLAYER_DATA_ABI;
