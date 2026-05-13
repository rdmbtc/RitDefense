// Global window.ethereum type declaration for wallet providers like MetaMask
interface Window {
  ethereum: {
    isMetaMask?: boolean;
    request: (args: { method: string; params?: any[] }) => Promise<any>;
    on: (eventName: string, callback: (...args: any[]) => void) => void;
    removeListener: (eventName: string, callback: (...args: any[]) => void) => void;
    selectedAddress?: string;
  };
  // Global function for Phaser game to submit scores via API
  submitGameScore?: (score: number, transactionCount: number) => Promise<boolean>;
}

// Ethereum provider error codes
declare const enum ProviderErrorCode {
  UserRejectedRequest = 4001,
  Unauthorized = 4100,
  UnsupportedMethod = 4200,
  Disconnected = 4900,
  ChainDisconnected = 4901,
  ChainNotAdded = 4902,
  RequestPending = -32002
}

// Canvas confetti module declaration
declare module 'canvas-confetti' {
  interface ConfettiOptions {
    particleCount?: number;
    angle?: number;
    spread?: number;
    startVelocity?: number;
    decay?: number;
    gravity?: number;
    drift?: number;
    ticks?: number;
    origin?: { x?: number; y?: number };
    colors?: string[];
    shapes?: string[];
    scalar?: number;
    zIndex?: number;
    disableForReducedMotion?: boolean;
  }

  interface ConfettiFunction {
    (options?: ConfettiOptions): Promise<null>;
    reset(): void;
    create(canvas: HTMLCanvasElement, options?: ConfettiOptions): ConfettiFunction;
  }

  const confetti: ConfettiFunction;
  export = confetti;
}