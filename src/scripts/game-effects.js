// src/scripts/game-effects.js - Celebration and completion effects
console.log("🎯 GameEffects loading...");

(function attachGameEffects() {
  function createLightningFlash() {
    const lightning = document.createElement("div");
    lightning.className = "lightning-flash";
    lightning.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: radial-gradient(circle, rgba(255,255,255,0.9), rgba(135,206,250,0.7), transparent);
      z-index: 9999;
      pointer-events: none;
      animation: lightning-strike 1s ease-out forwards;
    `;

    document.body.appendChild(lightning);

    setTimeout(() => {
      lightning.remove();
    }, 1000);
  }

  function createScreenShake() {
    document.body.classList.add("screen-shake");
    setTimeout(() => {
      document.body.classList.remove("screen-shake");
    }, 500);
  }

  function createCelebrationParticles(stepIndex, solutionContainer) {
    const row = solutionContainer.querySelector(
      `[data-step-index="${stepIndex}"]`,
    );
    if (!row) return;

    const rect = row.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const particleContainer = document.createElement("div");
    particleContainer.className = "celebration-particles";
    particleContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 10000;
    `;
    document.body.appendChild(particleContainer);

    const colors = ["#00ffff", "#00ff00", "#ffff00", "#ff00ff", "#ff6600"];
    const symbols = ["★", "✦", "◆", "●", "⚡"];

    for (let i = 0; i < 20; i++) {
      const particle = document.createElement("div");
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
      const angle = (i / 20) * Math.PI * 2;
      const velocity = 150 + Math.random() * 100;
      const endX = Math.cos(angle) * velocity;
      const endY = Math.sin(angle) * velocity;

      particle.textContent = randomSymbol;
      particle.style.cssText = `
        position: absolute;
        left: ${centerX}px;
        top: ${centerY}px;
        font-size: ${16 + Math.random() * 12}px;
        color: ${randomColor};
        text-shadow: 0 0 10px ${randomColor};
        --end-x: ${endX}px;
        --end-y: ${endY}px;
        animation: particle-explode 0.8s ease-out forwards;
      `;
      particleContainer.appendChild(particle);
    }

    setTimeout(() => {
      particleContainer.remove();
    }, 1000);
  }

  function showVictoryBanner(lineNumber) {
    const banner = document.createElement("div");
    banner.className = "victory-banner";
    banner.innerHTML = `<span class="victory-text">LINE ${lineNumber} COMPLETE!</span>`;
    banner.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0);
      font-family: 'Orbitron', monospace;
      font-size: 2em;
      font-weight: bold;
      color: #00ffff;
      text-shadow: 0 0 20px #00ffff, 0 0 40px #00ffff, 2px 2px 0 #000;
      z-index: 10001;
      pointer-events: none;
      animation: victory-popup 1.5s ease-out forwards;
      white-space: nowrap;
    `;

    document.body.appendChild(banner);

    setTimeout(() => {
      banner.remove();
    }, 1500);
  }

  function transformRowToPulsatingCyan(stepIndex, solutionContainer) {
    const rowSymbols = solutionContainer.querySelectorAll(
      `[data-step-index="${stepIndex}"].solution-symbol:not(.hidden-symbol):not(.space-symbol):not(.completed-row-symbol)`,
    );

    rowSymbols.forEach((symbol, index) => {
      symbol.classList.remove("revealed-symbol");
      symbol.classList.add("completed-row-symbol");

      symbol.style.setProperty("--stagger-delay", `${index * 30}ms`);
      symbol.style.animation = `symbol-pop 0.3s ease-out ${index *
        30}ms, pulsating-cyan 2s ease-in-out ${index * 30 + 300}ms infinite`;
    });
  }

  function createDramaticLineCompletion(stepIndex, solutionContainer) {
    createLightningFlash();
    createScreenShake();
    createCelebrationParticles(stepIndex, solutionContainer);
    showVictoryBanner(stepIndex + 1);
    transformRowToPulsatingCyan(stepIndex, solutionContainer);
  }

  window.GameEffects = {
    createDramaticLineCompletion,
  };
})();
