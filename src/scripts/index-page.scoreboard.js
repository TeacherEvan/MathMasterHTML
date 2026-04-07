// src/scripts/index-page.scoreboard.js
(function() {
  "use strict";
  const render = window.IndexPageScoreboardRender;

  const state = {
    initialized: false,
    modal: null,
    dialog: null,
    openButton: null,
    closeButton: null,
    playerName: null,
    overallSummary: null,
    levelStats: null,
    historyList: null,
    focusCleanup: null,
  };

  function isOpen() {
    return Boolean(state.modal && !state.modal.hidden);
  }

  function openScoreboard() {
    if (!state.modal || !render?.renderSummary) {
      return false;
    }

    render.renderSummary(state);
    state.modal.hidden = false;
    state.modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("scoreboard-modal-open");
    state.focusCleanup =
      window.UXModules?.AccessibilityManager?.trapFocus?.(state.dialog, {
        initialFocus: state.closeButton,
      }) || null;
    return true;
  }

  function closeScoreboard() {
    if (!state.modal) {
      return false;
    }

    if (typeof state.focusCleanup === "function") {
      state.focusCleanup();
      state.focusCleanup = null;
    }

    state.modal.hidden = true;
    state.modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("scoreboard-modal-open");
    return true;
  }

  function init() {
    if (state.initialized) {
      return;
    }

    if (window.PlayerStorage?.init) {
      window.PlayerStorage.init();
    }

    state.modal = document.getElementById("scoreboard-modal");
  state.dialog = state.modal?.querySelector("[role='dialog']") || null;
    state.openButton = document.getElementById("scoreboard-button");
    state.closeButton = document.getElementById("scoreboard-close-button");
    state.playerName = document.getElementById("scoreboard-player-name");
    state.overallSummary = document.getElementById("scoreboard-overall-summary");
    state.levelStats = document.getElementById("scoreboard-level-stats");
    state.historyList = document.getElementById("scoreboard-history-list");

    if (
      !state.modal ||
      !state.dialog ||
      !state.openButton ||
      !state.closeButton ||
      !state.playerName ||
      !state.overallSummary ||
      !state.levelStats ||
      !state.historyList
    ) {
      return;
    }

    state.openButton.addEventListener("click", (event) => {
      event.preventDefault();
      openScoreboard();
    });

    state.closeButton.addEventListener("click", (event) => {
      event.preventDefault();
      closeScoreboard();
    });

    state.initialized = true;
  }

  function handlePageClick(event) {
    const target = event.target;
    if (!(target instanceof Element)) {
      return false;
    }

    if (target.closest("#scoreboard-button")) {
      openScoreboard();
      return true;
    }

    if (!isOpen()) {
      return false;
    }

    if (
      target.id === "scoreboard-modal" ||
      target.closest("#scoreboard-close-button")
    ) {
      closeScoreboard();
      return true;
    }

    return Boolean(target.closest("[data-no-nav='true']"));
  }

  function handleKeydown(event) {
    const isActionKey = event.key === "Enter" || event.key === " ";
    const activeElement = document.activeElement;
    const activeInsideScoreboard =
      activeElement instanceof Element
        ? activeElement.closest("[data-no-nav='true']")
        : null;

    if (event.key === "Escape" && isOpen()) {
      event.preventDefault();
      closeScoreboard();
      return true;
    }

    if (isActionKey && activeInsideScoreboard) {
      event.preventDefault();
      if (activeElement?.id === "scoreboard-button") {
        openScoreboard();
      } else if (activeElement?.id === "scoreboard-close-button") {
        closeScoreboard();
      }
      return true;
    }

    return false;
  }

  window.IndexPageModules = window.IndexPageModules || {};
  window.IndexPageModules.scoreboard = {
    init,
    isOpen,
    open: openScoreboard,
    close: closeScoreboard,
    handlePageClick,
    handleKeydown,
  };
})();
