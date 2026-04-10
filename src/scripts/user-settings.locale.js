(function () {
  const DEFAULT_LOCALE = "en-US";
  const EVENTS = {
    loaded: window.GameEvents?.USER_SETTINGS_LOADED || "userSettingsLoaded",
    changed: window.GameEvents?.USER_SETTINGS_CHANGED || "userSettingsChanged",
  };

  const STRINGS = {
    "en-US": {
      "levelSelect.pageKicker": "Training dossier",
      "levelSelect.subtitle": "Choose a route",
      "levelSelect.subtitleBody":
        "Three tracks. One keyboard. Choose a route and keep the scorebook local.",
      "levelSelect.headerHintLaunch": "Press 1 / 2 / 3 to launch",
      "levelSelect.headerHintProgress": "Progress stays on this device",
      "game.onboarding.kicker": "Field briefing // algebra calibration",
      "game.onboarding.title": "Unlock Your Mind",
      "game.onboarding.intro":
        "Math Master turns each equation into a live reaction drill. Read the line, harvest the right symbols, and keep the lock moving before the clock strips away your score.",
      "game.onboarding.calloutTitle": "Before you drop in",
      "game.onboarding.calloutLine1":
        "Friction is part of training. Pause, breathe, then let the pattern settle.",
      "game.onboarding.calloutLine2":
        "The Help button is unlimited. Use it whenever you need momentum.",
      "game.onboarding.startButton": "Begin calibration",
    },
    "es-ES": {
      "levelSelect.pageKicker": "Expediente de entrenamiento",
      "levelSelect.subtitle": "Elige una ruta",
      "levelSelect.subtitleBody":
        "Tres rutas. Un teclado. Elige una ruta y guarda el progreso en este dispositivo.",
      "levelSelect.headerHintLaunch": "Pulsa 1 / 2 / 3 para iniciar",
      "levelSelect.headerHintProgress": "El progreso se guarda en este dispositivo",
      "game.onboarding.kicker": "Informe de campo // calibración de álgebra",
      "game.onboarding.title": "Desbloquea tu mente",
      "game.onboarding.intro":
        "Math Master convierte cada ecuación en un ejercicio de reacción en vivo. Lee la línea, recoge los símbolos correctos y mantén el candado avanzando antes de que el reloj reduzca tu puntuación.",
      "game.onboarding.calloutTitle": "Antes de empezar",
      "game.onboarding.calloutLine1":
        "La fricción es parte del entrenamiento. Haz una pausa, respira y deja que el patrón se asiente.",
      "game.onboarding.calloutLine2":
        "El botón Help es ilimitado. Úsalo siempre que necesites impulso.",
      "game.onboarding.startButton": "Comenzar calibración",
    },
  };

  function getLocale() {
    return window.UserSettings?.getSettings?.()?.language?.locale || DEFAULT_LOCALE;
  }

  function translate(key, locale = getLocale()) {
    return (
      STRINGS[locale]?.[key] ??
      STRINGS[DEFAULT_LOCALE]?.[key] ??
      key
    );
  }

  function setText(selector, text) {
    const node = document.querySelector(selector);
    if (node) {
      node.textContent = text;
    }
  }

  function applyLevelSelectLocale(locale) {
    setText(".page-kicker", translate("levelSelect.pageKicker", locale));
    setText(".subtitle", translate("levelSelect.subtitle", locale));
    setText(
      ".level-select-subtitle",
      translate("levelSelect.subtitleBody", locale),
    );

    const headerHints = document.querySelectorAll(".header-hint span");
    if (headerHints[0]) {
      headerHints[0].textContent = translate("levelSelect.headerHintLaunch", locale);
    }
    if (headerHints[1]) {
      headerHints[1].textContent = translate("levelSelect.headerHintProgress", locale);
    }
  }

  function applyGameLocale(locale) {
    setText(".how-to-play-kicker", translate("game.onboarding.kicker", locale));
    setText("#how-to-play-title", translate("game.onboarding.title", locale));
    setText("#start-game-btn", translate("game.onboarding.startButton", locale));

    const messageContainer = document.querySelector("#how-to-play-copy");
    if (!messageContainer) {
      return;
    }

    const intro = messageContainer.querySelector("p");
    const calloutTitle = messageContainer.querySelector(".how-to-play-callout strong");
    const calloutItems = messageContainer.querySelectorAll(".how-to-play-callout li");

    if (intro) {
      intro.textContent = translate("game.onboarding.intro", locale);
    }
    if (calloutTitle) {
      calloutTitle.textContent = translate("game.onboarding.calloutTitle", locale);
    }
    if (calloutItems[0]) {
      calloutItems[0].textContent = translate("game.onboarding.calloutLine1", locale);
    }
    if (calloutItems[1]) {
      calloutItems[1].textContent = translate("game.onboarding.calloutLine2", locale);
    }
  }

  function applyLocale(locale = getLocale()) {
    document.documentElement.lang = locale;

    if (document.querySelector(".level-select-subtitle")) {
      applyLevelSelectLocale(locale);
    }

    if (document.getElementById("how-to-play-title")) {
      applyGameLocale(locale);
    }
  }

  function bindLocaleUpdates() {
    document.addEventListener(EVENTS.loaded, () => {
      applyLocale();
    });

    document.addEventListener(EVENTS.changed, (event) => {
      const changedKeys = Array.isArray(event.detail?.changedKeys)
        ? event.detail.changedKeys
        : [];

      if (!changedKeys.includes("language.locale")) {
        return;
      }

      applyLocale();
    });
  }

  window.UserSettingsLocale = {
    DEFAULT_LOCALE,
    translate,
    applyLocale,
  };

  bindLocaleUpdates();
  applyLocale();
})();