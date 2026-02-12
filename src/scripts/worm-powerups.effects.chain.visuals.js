(function() {
  window.WormPowerUpEffects = window.WormPowerUpEffects || {};

  window.WormPowerUpEffects.applyChainVisuals = function(proto) {
    proto.createLightningBolt = function(x1, y1, x2, y2) {
      const lightning = document.createElement("div");
      const dx = x2 - x1;
      const dy = y2 - y1;
      const length = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      const path = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );

      const segments = Math.max(3, Math.floor(length / 50));
      let pathData = "M 0 0";

      for (let i = 1; i < segments; i++) {
        const progress = i / segments;
        const targetX = length * progress;
        const deviation = (Math.random() - 0.5) * 30;
        pathData += ` L ${targetX} ${deviation}`;
      }
      pathData += ` L ${length} 0`;

      path.setAttribute("d", pathData);
      path.setAttribute("stroke", "#00ffff");
      path.setAttribute("stroke-width", "3");
      path.setAttribute("fill", "none");
      path.setAttribute("filter", "url(#lightning-glow)");

      const defs = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "defs",
      );
      const filter = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "filter",
      );
      filter.setAttribute("id", "lightning-glow");

      const feGaussianBlur = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "feGaussianBlur",
      );
      feGaussianBlur.setAttribute("stdDeviation", "3");
      feGaussianBlur.setAttribute("result", "coloredBlur");

      const feMerge = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "feMerge",
      );
      const feMergeNode1 = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "feMergeNode",
      );
      feMergeNode1.setAttribute("in", "coloredBlur");
      const feMergeNode2 = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "feMergeNode",
      );
      feMergeNode2.setAttribute("in", "SourceGraphic");

      feMerge.appendChild(feMergeNode1);
      feMerge.appendChild(feMergeNode2);
      filter.appendChild(feGaussianBlur);
      filter.appendChild(feMerge);
      defs.appendChild(filter);

      svg.appendChild(defs);
      svg.appendChild(path);

      svg.style.cssText = `
            position: absolute;
            left: 0;
            top: -15px;
            width: ${length}px;
            height: 30px;
            overflow: visible;
            pointer-events: none;
        `;

      lightning.style.cssText = `
            position: fixed;
            left: ${x1}px;
            top: ${y1}px;
            transform-origin: 0 50%;
            transform: rotate(${angle}rad);
            z-index: 10002;
            pointer-events: none;
            animation: lightning-flash 0.3s ease-out;
        `;

      lightning.appendChild(svg);
      document.body.appendChild(lightning);

      this.createLightningSparkles(x2, y2);

      setTimeout(() => {
        if (lightning.parentNode) {
          lightning.parentNode.removeChild(lightning);
        }
      }, 300);
    };

    proto.createLightningSparkles = function(x, y) {
      for (let i = 0; i < 8; i++) {
        const sparkle = document.createElement("div");
        const angle = (Math.PI * 2 * i) / 8;
        const distance = 20 + Math.random() * 20;

        sparkle.style.cssText = `
                position: fixed;
                left: ${x}px;
                top: ${y}px;
                width: 4px;
                height: 4px;
                background: #00ffff;
                border-radius: 50%;
                box-shadow: 0 0 8px #00ffff;
                animation: sparkle-burst 0.4s ease-out forwards;
                --angle-x: ${Math.cos(angle) * distance};
                --angle-y: ${Math.sin(angle) * distance};
                z-index: 10003;
                pointer-events: none;
            `;

        document.body.appendChild(sparkle);

        setTimeout(() => {
          if (sparkle.parentNode) {
            sparkle.parentNode.removeChild(sparkle);
          }
        }, 400);
      }
    };
  };
})();
