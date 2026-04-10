(function () {
  function isH2PLevel() {
    return window.GameOnboarding?.level === "h2p";
  }

  function getBeatState() {
    return (
      window.__h2pBeatState ||
      (window.__h2pBeatState = {
        wormDone: false,
        muffinDone: false,
        powerUpDone: false,
      })
    );
  }

  function markBeatDone(name) {
    getBeatState()[name] = true;
  }

  function resetTutorialState() {
    window.__h2pBeatState = null;
  }

  window.GameTutorialLevel = {
    isH2PLevel,
    getBeatState,
    markBeatDone,
    resetTutorialState,
  };
})();