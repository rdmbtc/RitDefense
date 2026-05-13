// Global console log override for development
// This allows disabling console logs without removing them from code

type ConsoleMethod = 'log' | 'warn' | 'error' | 'info' | 'debug';

interface ConsoleConfig {
  enabled: boolean;
  allowedMethods: ConsoleMethod[];
  prefix?: string;
}

class ConsoleManager {
  private originalConsole: Record<ConsoleMethod, (...args: any[]) => void> = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    info: console.info.bind(console),
    debug: console.debug.bind(console)
  };

  private config: ConsoleConfig = {
    enabled: process.env.NEXT_PUBLIC_ENABLE_CONSOLE_LOGS === 'true' || process.env.NODE_ENV === 'development',
    allowedMethods: ['error', 'warn'], // Always allow errors and warnings
    prefix: '[MonDefense]'
  };

  constructor() {
    this.initializeConsoleOverride();
  }

  private initializeConsoleOverride() {
    const methods: ConsoleMethod[] = ['log', 'warn', 'error', 'info', 'debug'];
    
    methods.forEach(method => {
      console[method] = (...args: any[]) => {
        if (this.shouldLog(method)) {
          const prefix = this.config.prefix ? `${this.config.prefix} ` : '';
          this.originalConsole[method](prefix, ...args);
        }
      };
    });
  }

  private shouldLog(method: ConsoleMethod): boolean {
    // Always allow errors and warnings in production
    if (['error', 'warn'].includes(method)) {
      return true;
    }

    // Check if console is globally enabled
    if (!this.config.enabled) {
      return false;
    }

    // Check if specific method is allowed
    return this.config.allowedMethods.includes(method);
  }

  public configure(config: Partial<ConsoleConfig>) {
    this.config = { ...this.config, ...config };
  }

  public enable() {
    this.config.enabled = true;
  }

  public disable() {
    this.config.enabled = false;
  }

  public restore() {
    Object.keys(this.originalConsole).forEach(method => {
      console[method as ConsoleMethod] = this.originalConsole[method as ConsoleMethod];
    });
  }
}

// Create global instance
const consoleManager = new ConsoleManager();

// Configure based on environment variables
if (typeof window !== 'undefined') {
  // Client-side configuration
  const enableConsole = localStorage.getItem('enable-console') === 'true' || 
                       process.env.NODE_ENV === 'development';
  
  consoleManager.configure({
    enabled: enableConsole,
    allowedMethods: enableConsole ? ['log', 'warn', 'error', 'info', 'debug'] : ['error', 'warn']
  });
}

// Export for manual control
export { consoleManager, type ConsoleConfig };

// Auto-initialize
export default consoleManager;