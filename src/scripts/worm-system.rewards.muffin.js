(function() {
  const MUFFIN_CLICKS_REQUIRED = 1;
  const MUFFIN_CLICK_POINTS = 1000;
  const MUFFIN_HIT_ANIMATION_MS = 180;
  const PURPLE_KILL_POINTS = 50000;
  const PURPLE_KILL_POWERUPS = 2;
  const processedRewardWormIds = new Set();
  const processedPurpleBonusWormIds = new Set();

  function getRewardContainer() {
    return window.wormSystem?.crossPanelContainer || document.body;
  }

  function addPoints(points, meta) {
    if (window.ScoreTimerManager?.addBonusPoints) {
      return window.ScoreTimerManager.addBonusPoints(points, meta);
    }
    return null;
  }

  function spawnFireworks(x, y) {
    const container = getRewardContainer();
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const count = reducedMotion ? 6 : 12;

    for (let i = 0; i < count; i++) {
      const spark = document.createElement("div");
      spark.className = "muffin-mini-firework";
      const angle = (i / count) * Math.PI * 2;
      const radius = 20 + Math.random() * 32;
      spark.style.left = `${x}px`;
      spark.style.top = `${y}px`;
      spark.style.setProperty("--firework-x", `${Math.cos(angle) * radius}px`);
      spark.style.setProperty("--firework-y", `${Math.sin(angle) * radius}px`);
      spark.style.setProperty("--firework-delay", `${Math.floor(Math.random() * 120)}ms`);
      container.appendChild(spark);
      setTimeout(() => spark.remove(), reducedMotion ? 420 : 720);
    }
  }

  function showShoutout(x, y, points) {
    const container = getRewardContainer();
    const shoutout = document.createElement("div");
    shoutout.className = "muffin-shoutout";
    shoutout.textContent = `+${points.toLocaleString()} POINTS!`;
    shoutout.style.left = `${x}px`;
    shoutout.style.top = `${y - 24}px`;
    container.appendChild(shoutout);
    setTimeout(() => shoutout.remove(), 1200);
  }

  function createMuffinReward(x, y, source) {
    const container = getRewardContainer();
    const muffin = document.createElement("button");
    muffin.type = "button";
    muffin.className = "worm-muffin-reward";
    muffin.textContent = "🧁";
    muffin.setAttribute("aria-label", "Reward muffin");
    muffin.dataset.clicks = "0";
    muffin.dataset.source = source || "worm";
    muffin.style.left = `${x}px`;
    muffin.style.top = `${y}px`;
    container.appendChild(muffin);

    const handleClick = (event) => {
      if (muffin.disabled) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      const currentClicks = Number(muffin.dataset.clicks || 0);
      if (currentClicks >= MUFFIN_CLICKS_REQUIRED) return;
      const clicks = Math.min(
        MUFFIN_CLICKS_REQUIRED,
        currentClicks + 1,
      );
      muffin.dataset.clicks = String(clicks);
      muffin.classList.remove("muffin-hit");
      void muffin.offsetWidth;
      muffin.classList.add("muffin-hit");
      setTimeout(() => muffin.classList.remove("muffin-hit"), MUFFIN_HIT_ANIMATION_MS);

      addPoints(MUFFIN_CLICK_POINTS, {
        source: "muffin-click",
        click: clicks,
        sourceType: muffin.dataset.source,
      });

      if (clicks >= MUFFIN_CLICKS_REQUIRED) {
        muffin.disabled = true;
        muffin.style.pointerEvents = "none";
        muffin.removeEventListener("pointerdown", handleClick);
        muffin.removeEventListener("keydown", handleKeyboardActivate);
        window.setTimeout(() => {
          showShoutout(x, y, MUFFIN_CLICK_POINTS * MUFFIN_CLICKS_REQUIRED);
          spawnFireworks(x, y);
          muffin.remove();
        }, MUFFIN_HIT_ANIMATION_MS);
      }
    };

    const handleKeyboardActivate = (event) => {
      if (event.key !== "Enter" && event.key !== " " && event.key !== "Spacebar") {
        return;
      }

      handleClick(event);
    };

    muffin.addEventListener("pointerdown", handleClick, { passive: false });
    muffin.addEventListener("keydown", handleKeyboardActivate);
  }

  function onWormExploded(event) {
    const detail = event?.detail || {};
    const wormId = typeof detail.wormId === "string" && detail.wormId ? detail.wormId : null;
    if (wormId && processedRewardWormIds.has(wormId)) return;
    const x = Number(detail.x);
    const y = Number(detail.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;

    if (detail.wasPurple && detail.isRainKill) {
      const canApplyPurpleBonus = !wormId || !processedPurpleBonusWormIds.has(wormId);
      if (canApplyPurpleBonus) {
        addPoints(PURPLE_KILL_POINTS, {
          source: "purple-worm-kill",
          wormId: wormId,
        });
        if (window.wormSystem?.awardPowerUps) {
          window.wormSystem.awardPowerUps(PURPLE_KILL_POWERUPS, "purple-worm-kill");
        }
        if (wormId) {
          processedPurpleBonusWormIds.add(wormId);
        }
        showShoutout(x, y, PURPLE_KILL_POINTS);
        spawnFireworks(x, y);
      }
    }

    if (wormId) {
      processedRewardWormIds.add(wormId);
    }
    createMuffinReward(x, y, detail.wasPurple ? "purple-worm" : "worm");
  }

  document.addEventListener("wormExploded", onWormExploded);
})();
