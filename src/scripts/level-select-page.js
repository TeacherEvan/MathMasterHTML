// src/scripts/level-select-page.js
(function() {
  const matrixBg = document.getElementById("matrixBg");
  const resetButton = document.querySelector(".reset-progress-btn");
  const backButton = document.querySelector(".back-button");
  const title = document.querySelector(".main-title");
  const subtitle = document.querySelector(".subtitle");
  const cards = Array.from(document.querySelectorAll(".level-card"));
  const colors = ["#ffd700", "#ffcc00", "#ffaa00"];

  let titleIntervalId = null;
  let subtitleIntervalId = null;
  let resizeTimer = null;
  let colorIndex = 0;

  function safeGetLocalStorage(key) {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn("⚠️ LocalStorage read failed:", error);
      return null;
    }
  }

  function safeRemoveLocalStorage(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn("⚠️ LocalStorage remove failed:", error);
    }
  }

  function createMatrixRain() {
    if (!matrixBg) return;
    const symbols = "0123456789+-×÷=XxΣπ∞√±∆αβγθλμ";
    const columns = Math.floor(window.innerWidth / 20);

    matrixBg.innerHTML = "";

    for (let i = 0; i < columns; i++) {
      const column = document.createElement("div");
      column.className = "matrix-column";
      column.style.left = `${i * 20}px`;
      column.style.animationDuration = `${Math.random() * 4 + 3}s`;
      column.style.animationDelay = `${Math.random() * 3}s`;

      let text = "";
      const length = Math.floor(Math.random() * 15) + 8;
      for (let j = 0; j < length; j++) {
        text += `${symbols[Math.floor(Math.random() * symbols.length)]}<br>`;
      }
      column.innerHTML = text;
      matrixBg.appendChild(column);
    }
  }

  function createRipple(event, target) {
    const ripple = document.createElement("div");
    ripple.className = "ripple";

    const rect = target.getBoundingClientRect();
    const size = 60;
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;

    target.appendChild(ripple);

    setTimeout(() => {
      if (target.contains(ripple)) {
        target.removeChild(ripple);
      }
    }, 600);
  }

  function selectLevel(levelKey, cardElement, interactionEvent) {
    if (interactionEvent) {
      createRipple(interactionEvent, cardElement);
    }

    cardElement.style.transform = "scale(0.95)";
    setTimeout(() => {
      cardElement.style.transform = "";
    }, 150);

    setTimeout(() => {
      window.location.href = `/src/pages/game.html?level=${levelKey}`;
    }, 300);
  }

  function goBack(interactionEvent) {
    if (interactionEvent?.target) {
      createRipple(interactionEvent, interactionEvent.target);
    }
    setTimeout(() => {
      window.location.href = "/src/pages/index.html";
    }, 300);
  }

  function animateProgress() {
    const levels = ["beginner", "warrior", "master"];
    const progressBars = document.querySelectorAll(".progress-fill");

    progressBars.forEach((bar, index) => {
      const levelName = levels[index];
      const countKey = `mathmaster_problems_${levelName}`;
      const rawValue = safeGetLocalStorage(countKey);
      const problemsCompleted = parseInt(rawValue || "0", 10);

      const maxProblems = 50;
      const percentage = Math.min((problemsCompleted / maxProblems) * 100, 100);

      const card = cards[index];
      const statsSection = card?.querySelector(".level-stats");
      if (statsSection && problemsCompleted > 0) {
        let completionStat = statsSection.querySelector(".completion-stat");
        if (!completionStat) {
          completionStat = document.createElement("div");
          completionStat.className = "stat completion-stat";

          const valueSpan = document.createElement("span");
          valueSpan.className = "stat-value";
          valueSpan.textContent = String(problemsCompleted);

          const labelSpan = document.createElement("span");
          labelSpan.className = "stat-label";
          labelSpan.textContent = "Completed";

          completionStat.appendChild(valueSpan);
          completionStat.appendChild(labelSpan);
          statsSection.appendChild(completionStat);
        } else {
          const valueSpan = completionStat.querySelector(".stat-value");
          if (valueSpan) {
            valueSpan.textContent = String(problemsCompleted);
          }
        }
      }

      bar.style.width = "0%";
      setTimeout(() => {
        bar.style.transition = "width 2s ease-in-out";
        bar.style.width = `${percentage}%`;
      }, index * 200);
    });
  }

  function resetProgress() {
    const confirmReset = confirm(
      "⚠️ Are you sure you want to reset ALL progress? This will clear your console slots and problem completion counts for all levels!",
    );

    if (!confirmReset) return;

    const levels = ["beginner", "warrior", "master"];
    levels.forEach((level) => {
      safeRemoveLocalStorage(`mathmaster_console_${level}`);
      safeRemoveLocalStorage(`mathmaster_problems_${level}`);
    });

    console.log("🔄 All progress reset!");
    alert("✅ Progress reset successfully!");
    window.location.reload();
  }

  function animateCards() {
    cards.forEach((card, index) => {
      card.style.opacity = "0";
      card.style.transform = "translateY(50px)";
      setTimeout(() => {
        card.style.transition = "all 0.6s ease-out";
        card.style.opacity = "1";
        card.style.transform = "translateY(0)";
      }, index * 200 + 500);
    });
  }

  function startDynamicEffects() {
    stopDynamicEffects();
    if (!title || !subtitle) return;

    titleIntervalId = setInterval(() => {
      const intensity = Math.random() * 0.3 + 0.8;
      title.style.filter = `brightness(${intensity})`;
    }, 3000);

    subtitleIntervalId = setInterval(() => {
      subtitle.style.color = colors[colorIndex];
      colorIndex = (colorIndex + 1) % colors.length;
    }, 5000);
  }

  function stopDynamicEffects() {
    if (titleIntervalId) {
      clearInterval(titleIntervalId);
      titleIntervalId = null;
    }
    if (subtitleIntervalId) {
      clearInterval(subtitleIntervalId);
      subtitleIntervalId = null;
    }
  }

  function handleVisibilityChange() {
    if (document.hidden) {
      stopDynamicEffects();
    } else {
      startDynamicEffects();
    }
  }

  function handleResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      createMatrixRain();
    }, 200);
  }

  function handleKeydown(event) {
    const selectedCard = (() => {
      switch (event.key) {
        case "1":
          return cards[0];
        case "2":
          return cards[1];
        case "3":
          return cards[2];
        default:
          return null;
      }
    })();

    if (selectedCard) {
      const levelKey = selectedCard.dataset.level || "beginner";
      selectLevel(levelKey, selectedCard, event);
      selectedCard.style.animation = "bounce-easy 0.3s ease-in-out";
      setTimeout(() => {
        selectedCard.style.animation = "";
      }, 300);
      return;
    }

    if (event.key === "Escape" || event.key === "Backspace") {
      goBack(event);
    }
  }

  function attachCardHandlers() {
    cards.forEach((card, index) => {
      const levelKey =
        card.dataset.level ||
        (index === 1 ? "warrior" : index === 2 ? "master" : "beginner");
      card.addEventListener("click", (event) => {
        selectLevel(levelKey, card, event);
      });
    });
  }

  function attachTouchHandlers() {
    document.addEventListener("touchstart", (event) => {
      const card = event.target.closest(".level-card");
      if (card) {
        card.style.transform = "scale(0.98)";
      }
    });

    document.addEventListener("touchend", (event) => {
      const card = event.target.closest(".level-card");
      if (card) {
        card.style.transform = "";
      }
    });
  }

  window.addEventListener("load", () => {
    createMatrixRain();
    startDynamicEffects();
    animateCards();
    setTimeout(animateProgress, 1000);
  });

  window.addEventListener("resize", handleResize);
  document.addEventListener("visibilitychange", handleVisibilityChange);
  document.addEventListener("keydown", handleKeydown);

  attachCardHandlers();
  attachTouchHandlers();

  if (resetButton) {
    resetButton.addEventListener("click", resetProgress);
  }

  if (backButton) {
    backButton.addEventListener("click", goBack);
  }
})();
