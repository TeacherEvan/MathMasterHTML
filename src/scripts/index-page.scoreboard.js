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
    profileForm: null,
    nameInput: null,
    nameSaveButton: null,
    nameFeedback: null,
    playerName: null,
    overallSummary: null,
    levelStats: null,
    historyList: null,
    focusCleanup: null,
  };

  function isOpen() {
    return Boolean(state.modal && !state.modal.hidden);
  }

  function setNameFeedback(message, tone = "neutral") {
    if (!state.nameFeedback) {
      return;
    }

    state.nameFeedback.textContent = message;
    state.nameFeedback.dataset.tone = tone;
  }

  function syncProfileEditor(displayName) {
    if (state.nameInput) {
      state.nameInput.value = displayName;
    }

    setNameFeedback("Saved on this device only.", "neutral");
  }

  function openScoreboard() {
    if (!state.modal || !render?.renderSummary) {
      return false;
    }

    const summary = render.renderSummary(state);
    syncProfileEditor(render.getDisplayName?.(summary?.profile));
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
    state.openButton?.focus?.({ preventScroll: true });
    return true;
  }

  function savePlayerName() {
    if (!window.PlayerStorage?.setPlayerName) {
      return false;
    }

    const savedName = window.PlayerStorage.setPlayerName(state.nameInput?.value);
    if (state.nameInput) {
      state.nameInput.value = savedName;
    }
    render.renderSummary(state);
    setNameFeedback(`Saved as ${savedName}.`, "success");
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
    state.profileForm = document.getElementById("scoreboard-profile-form");
    state.nameInput = document.getElementById("scoreboard-name-input");
    state.nameSaveButton = document.getElementById("scoreboard-name-save");
    state.nameFeedback = document.getElementById("scoreboard-name-feedback");
    state.playerName = document.getElementById("scoreboard-player-name");
    state.overallSummary = document.getElementById("scoreboard-overall-summary");
    state.levelStats = document.getElementById("scoreboard-level-stats");
    state.historyList = document.getElementById("scoreboard-history-list");

    if (
      !state.modal ||
      !state.dialog ||
      !state.openButton ||
      !state.closeButton ||
      !state.profileForm ||
      !state.nameInput ||
      !state.nameSaveButton ||
      !state.nameFeedback ||
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

    state.profileForm.addEventListener("submit", (event) => {
      event.preventDefault();
      savePlayerName();
    });

    state.nameInput.addEventListener("input", () => {
      setNameFeedback("Saved on this device only.", "neutral");
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
    const isTextEntryTarget =
      activeElement instanceof HTMLElement &&
      (activeElement.matches("input, textarea, select") ||
        activeElement.isContentEditable);
    const activeInsideScoreboard =
      activeElement instanceof Element
        ? activeElement.closest("[data-no-nav='true']")
        : null;

    if (event.key === "Escape" && isOpen()) {
      event.preventDefault();
      closeScoreboard();
      return true;
    }

    if (isActionKey && activeInsideScoreboard && !isTextEntryTarget) {
      if (
        activeElement?.id !== "scoreboard-button" &&
        activeElement?.id !== "scoreboard-close-button"
      ) {
        return false;
      }

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
