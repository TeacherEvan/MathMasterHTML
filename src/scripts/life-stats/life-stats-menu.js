// life-stats-menu.js — menu feature graphs (sparklines) on index.html + TAX init
// window.LifeStatsMenu
(function () {
  function topFields(fields, entries, n) {
    const counts = {};
    for (const e of entries) counts[e.fieldKey] = (counts[e.fieldKey] || 0) + 1;
    return Object.keys(fields)
      .sort((a, b) => (counts[b] || 0) - (counts[a] || 0))
      .slice(0, n);
  }

  function render() {
    const panel = document.getElementById("life-stats-features");
    if (!panel) return;
    const Storage = window.LifeStatsStorage;
    const Charts = window.LifeStatsCharts;
    const Agg = window.LifeStatsAggregate;
    if (!Storage || !Charts || !Agg) return;

    Storage.init();
    const store = Storage.getStore();
    const entries = store.entries;
    if (entries.length === 0) {
      panel.hidden = true;
      panel.innerHTML = "";
      return;
    }

    const fields = store.fields;
    const keys = topFields(fields, entries, 4);
    const now = Date.now();
    const agg = Agg.aggregate(entries, fields, "1w", now);

    panel.hidden = false;
    panel.innerHTML = "";
    for (const fk of keys) {
      const series = agg.series[fk] || [];
      const latest = agg.rollups[fk] ? agg.rollups[fk].latest : 0;
      const wrap = document.createElement("div");
      wrap.className = "ls-feature";
      const label = document.createElement("span");
      label.className = "label";
      label.textContent = fields[fk].label;
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.textContent = window.LifeStatsRender ? window.LifeStatsRender.fmt(latest, fields[fk]) : String(latest);
      const svg = Charts.buildSparkline(series, { ariaLabel: fields[fk].label + " last 7 days", color: Charts.colorFor(fk) });
      wrap.appendChild(label);
      wrap.appendChild(chip);
      wrap.appendChild(svg);
      panel.appendChild(wrap);
    }
  }

  function init() {
    if (window.LifeStatsTax) window.LifeStatsTax.init();
    render();
  }

  window.LifeStatsMenu = { init, render };
})();
