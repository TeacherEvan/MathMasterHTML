export {};

declare global {
  type GameLevel = "h2p" | "beginner" | "warrior" | "master";

  const Logger: any;
  const WormFactory: any;
  const WormMovement: any;
  const WormSpawnManager: any;
  function normalizeGameLevel(level: string | null | undefined): GameLevel;
  function getLevelFromURL(): GameLevel;

  interface ConsoleManager {
    loadProgress(): void;
    setupConsoleButtons(): void;
    setupModalInteractions(): void;
    setupKeyboardShortcuts(): void;
    incrementProblemsCompleted(): void;
    showSymbolSelectionModal(): void;
  }

  interface Window {
    DomSanitizer?: {
      escapeHTML: (value: unknown) => string;
    };
    normalizeSymbol?: (symbol: string) => string;
    calculateDistance?: (x1: number, y1: number, x2: number, y2: number) => number;
    generateUniqueId?: (prefix?: string) => string;
    normalizeGameLevel?: (level: string | null | undefined) => GameLevel;
    getLevelFromURL?: () => GameLevel;
    deferExecution?: (callback: () => void) => void;
    WormFactory?: any;
    WormMovement?: any;
    WormSpawnManager?: any;
    WormSpawnCoordinator?: any;
    WormPowerUpSystem?: any;
    WormSystem?: any;
    WormCursorTracker?: any;
    WormAggressionModel?: any;
    WormPathfinder?: any;
    WormObstacleMap?: any;
    WormEvasion?: any;
    LazyComponentLoader?: any;
    PlayerStorage?: any;
    ScoreTimerManager?: any;
    GameRuntimeCoordinator?: any;
    StartupPreload?: {
      isBlocking?: () => boolean;
      isComplete?: () => boolean;
      requestComplete?: (reason?: string) => void;
      setMessage?: (
        message: string,
        options?: { priority?: "status" | "progress" },
      ) => boolean;
    };
    GameOnboardingStorage?: any;
    GameOnboarding?: {
      level?: string;
      evanMode?: string;
      preloadMode?: string;
    };
    GameInit?: any;
    GameEvents?: Record<string, string>;
    ConsoleManager?: any;
    wormSystem?: any;
    consoleManager?: any;
    uiBoundaryManager?: any;
    performanceMonitor?: any;
  }

  interface ScreenOrientation {
    lock?: (orientation: string) => Promise<void>;
  }

  interface Element {
    dataset: DOMStringMap;
    style: CSSStyleDeclaration;
  }
}
