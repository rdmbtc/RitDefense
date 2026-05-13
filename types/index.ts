export interface ComboEffect {
  id: number;
  x: number;
  y: number;
  count: number;
}

export interface StartButton {
  id: number;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  rotation: number;
  rotationSpeed: number;
  sliced: boolean;
  gravity: number;
}

export interface UserData {
  hasUsername: boolean;
  user: {
    id: number;
    username: string;
    walletAddress: string;
  } | null;
}

export interface SessionData {
  player: string;
  sessionId: string;
  startTime: number;
  iat: number;
}

export interface StartGameSessionRequest {
  walletAddress: string;
}

export interface StartGameSessionResponse {
  sessionToken: string;
  sessionId: string;
}

export interface EndGameSessionRequest {
  sessionId: string;
}

export interface SubmitScoreRequest {
  player: string;
  transactionAmount: number;
  scoreAmount: number;
  sessionId: string;
  timestamp?: number;
  sessionDuration: number;
  gameStartTime: number;
  securityMetadata?: {
    gameStateHash: string;
    clientTimestamp: number;
    sessionStartTime?: number;
    submissionSource?: string;
    gameplayMetrics: {
      totalClicks: number;
      averageReactionTime: number;
      gameplayPattern: string;
    };
  };
}

export interface SubmitScoreResponse {
  success: true;
  transactionHash: string;
  player: `0x${string}`;
  scoreAmount: number;
  transactionAmount: number;
}

// Player score response interface
export interface PlayerScoreResponse {
  totalScore: number;
  bestScore: string;
  gamesPlayed: number;
}

// Username response interface
export interface UsernameResponse {
  hasUsername: boolean;
  user?: {
    username: string;
  };
  error?: string;
}

// Leaderboard interfaces
export interface LeaderBoardData {
  userId: number;
  rank: number;
  walletAddress: string;
  username: string;
  score: number;
}

export interface LeaderboardResponse {
  data: {
    data: LeaderBoardData[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

// Defense game specific interfaces
export interface DefenseGameProps {
  onBack: () => void;
  onGameEnd?: (score: number) => void;
}

// Game event types for defense game
export type GameEventType = 
  | 'coinsEarned'
  | 'enemyDefeated'
  | 'waveComplete'
  | 'gameOver'
  | 'gameWon';

export interface GameEvent {
  type: GameEventType;
  data?: any;
}

// Tower defense specific game objects
export interface Tower {
  id: number;
  type: 'basic' | 'fire' | 'ice' | 'lightning';
  x: number;
  y: number;
  level: number;
  damage: number;
  range: number;
  fireRate: number;
  cost: number;
  upgradeCost: number;
}

export interface Enemy {
  id: number;
  type: 'basic' | 'fast' | 'heavy' | 'flying' | 'boss';
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  speed: number;
  reward: number;
  pathIndex: number;
  isDead: boolean;
}

export interface Wave {
  id: number;
  enemies: Enemy[];
  isComplete: boolean;
  reward: number;
}

export interface GameStats {
  score: number;
  level: number;
  lives: number;
  timeElapsed: number;
}

export interface DefenseGameStats extends GameStats {
  towersBuilt: number;
  enemiesDefeated: number;
  wavesCompleted: number;
  coinsEarned: number;
}
