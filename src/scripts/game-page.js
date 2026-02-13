// src/scripts/game-page.js
(function() {
  const backButton = document.getElementById("back-button");

  function goBack() {
    window.location.href = "/src/pages/level-select.html";
  }

  function enterFullscreen() {
    const elem = document.documentElement;
    if (!elem) return;

    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch((err) => {
        console.log(
          "⚠️ Fullscreen request failed (user may need to interact first):",
          err,
        );
      });
    } else if (elem.webkitRequestFullscreen) {
      elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) {
      elem.msRequestFullscreen();
    }
  }

  function setupHowToPlayModal() {
    const modal = document.getElementById("how-to-play-modal");
    const startButton = document.getElementById("start-game-btn");

    if (!modal || !startButton) return;

    modal.style.display = "flex";

    startButton.addEventListener("click", () => {
      modal.style.animation = "modalFadeOut 0.3s ease-out";
      setTimeout(() => {
        modal.style.display = "none";
        console.log("🎮 How to Play modal dismissed - game ready to start");
        window.ScoreTimerManager?.setGameStarted?.();
        enterFullscreen();
      }, 300);
    });
  }

  if (backButton) {
    backButton.addEventListener("click", goBack);
  }

  document.addEventListener("DOMContentLoaded", () => {
    setupHowToPlayModal();
    enterFullscreen();
  });
})();
