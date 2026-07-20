// life-stats-seed.js — demo data generator (window.LifeStatsSeed)
(function () {
  const DAY = 86400000;

  function rng(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function loadDemoData() {
    const Storage = window.LifeStatsStorage;
    if (!Storage) {
      console.error("❌ LifeStatsStorage not loaded for seed");
      return { count: 0 };
    }
    Storage.init();
    const rand = rng(20260720);

    // Wipe prior demo entries (idempotent) on the live store
    const store = Storage.getStore();
    store.entries = store.entries.filter((e) => !e.id || !e.id.startsWith("demo-"));
    Storage._write(store);
    const now = Date.now();

    const plan = [
      { key: "income", base: 45000, trend: 120, noise: 4000, spike: 0.05 },
      { key: "expenses", base: 28000, trend: 60, noise: 3500, spike: 0.08 },
      { key: "health", base: 55, trend: 0.02, noise: 6, spike: 0.1 },
      { key: "risks", base: 4, trend: -0.005, noise: 2, spike: 0.12 },
      { key: "fuel", base: 40, trend: 0.05, noise: 12, spike: 0.06 },
      { key: "transport", base: 320, trend: 0.4, noise: 60, spike: 0.05 },
    ];

    const NOTE_POOL = {
      expenses: ["rent", "food", "transport", "utilities", "leisure"],
      income: ["salary", "bonus", "freelance"],
      fuel: ["petrol", "diesel"],
      transport: ["bus", "taxi", "train"],
      health: ["steps", "sleep", "gym"],
      risks: ["market", "credit", "health"],
    };

    let count = 0;
    // 18 months of daily detail
    const dailyDays = 545;
    for (let d = 0; d < dailyDays; d++) {
      const ts = now - (dailyDays - 1 - d) * DAY;
      for (const p of plan) {
        const drift = p.trend * d;
        let v = p.base + drift + (rand() - 0.5) * 2 * p.noise;
        if (rand() < p.spike) v *= 1.6; // occasional spike
        v = Math.max(0, v);
        const notes = NOTE_POOL[p.key];
        const note = notes ? notes[Math.floor(rand() * notes.length)] : "";
        const entry = Storage.addEntry({ fieldKey: p.key, value: Math.round(v * 100) / 100, note, ts, id: "demo-" + p.key + "-" + d });
        if (entry) count++;
      }
    }

    // Sparse historical backfill for long ranges (~17 years monthly) for income/expenses
    const backMonths = 204; // ~17 years
    for (let m = 1; m <= backMonths; m++) {
      const ts = now - dailyDays * DAY - m * 30 * DAY;
      for (const p of [plan[0], plan[1]]) {
        const v = Math.max(0, p.base * (1 - m / 260) + (rand() - 0.5) * 2 * p.noise);
        const entry = Storage.addEntry({ fieldKey: p.key, value: Math.round(v * 100) / 100, note: "history", ts, id: "demo-h-" + p.key + "-" + m });
        if (entry) count++;
      }
    }

    // Persist demoLoaded flag on the latest store (addEntry already wrote each entry).
    const latest = Storage.getStore();
    latest.settings.demoLoaded = true;
    Storage._write(latest);
    return { count };
  }

  window.LifeStatsSeed = { loadDemoData };
})();
