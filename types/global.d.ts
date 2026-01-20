export {};

declare global {
  const Logger: any;
  const normalizeSymbol: any;
  const calculateDistance: any;
  const generateUniqueId: any;
  const WormFactory: any;
  const WormMovement: any;
  const WormSpawnManager: any;

  interface Window {
    WormFactory?: any;
    WormMovement?: any;
    WormSpawnManager?: any;
    WormSpawnCoordinator?: any;
    WormPowerUpSystem?: any;
    WormCursorTracker?: any;
    WormAggressionModel?: any;
    WormPathfinder?: any;
    WormObstacleMap?: any;
    WormEvasion?: any;
    wormSystem?: any;
    consoleManager?: any;
    uiBoundaryManager?: any;
    performanceMonitor?: any;
  }

  interface Element {
    dataset: DOMStringMap;
    style: CSSStyleDeclaration;
  }
}
