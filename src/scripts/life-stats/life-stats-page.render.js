// life-stats-page.render.js — render stat cards + charts from aggregated data
// window.LifeStatsRender
(function () {
  function fmt(value, meta) {
    if (value === undefined || value === null) return "—";
    const v = Number(value);
    const num = Math.abs(v) >= 1000 ? v.toLocaleString(undefined, { maximumFractionDigits: 0 }) : v.toFixed(2);
    return meta && meta.unit ? `${num} ${meta.unit}` : `${num}`;
  }

  function renderCards(container, agg, fields) {
    container.innerHTML = "";
    for (const fk of Object.keys(fields)) {
      const meta = fields[fk];
      const r = (agg.rollups && agg.rollups[fk]) || { latest: 0, avg: 0, min: 0, max: 0, net: 0 };
      const card = document.createElement("div");
      card.className = "ls-card";
      const netUp = r.net >= 0;
      const good = meta.higherIsBetter ? netUp : !netUp;
      card.innerHTML = `
        <h3>${meta.label}</h3>
        <div class="value">${fmt(r.latest, meta)}</div>
        <div class="delta ${good ? "up" : "down"}">${netUp ? "▲" : "▼"} ${fmt(Math.abs(r.net), meta)}</div>
        <div class="sub">avg ${fmt(r.avg, meta)} · min ${fmt(r.min, meta)} · max ${fmt(r.max, meta)}</div>`;
      container.appendChild(card);
    }
    if (Object.keys(fields).length === 0) {
      container.innerHTML = '<p class="ls-empty">No fields to show.</p>';
    }
  }

  function renderCharts(chartsEl, agg, fields, visibleFields, refs, categoryTotals) {
    chartsEl.innerHTML = "";
    const Charts = window.LifeStatsCharts;
    if (!Charts) return;

    // Line chart
    const lineCard = document.createElement("div");
    lineCard.className = "ls-chart-card";
    lineCard.innerHTML = '<h3>Trend (line)</h3>';
    const lineSvg = Charts.buildLine(agg, fields, visibleFields, { ariaLabel: "Trend line chart across the selected range" });
    lineCard.appendChild(lineSvg);
    lineCard.appendChild(buildLegend(fields, visibleFields, refs.toggle));
    chartsEl.appendChild(lineCard);
    refs.line = lineSvg;

    // Bar chart
    const barCard = document.createElement("div");
    barCard.className = "ls-chart-card";
    barCard.innerHTML = '<h3>Totals per period (bar)</h3>';
    const barSvg = Charts.buildBar(agg, fields, visibleFields, { ariaLabel: "Bar chart of totals per period" });
    barCard.appendChild(barSvg);
    chartsEl.appendChild(barCard);
    refs.bar = barSvg;

    // Donut (composition by note category for the first visible field with notes)
    const cat = categoryTotals && categoryTotals[visibleFields[0]];
    if (cat && Object.keys(cat).length > 0) {
      const donutCard = document.createElement("div");
      donutCard.className = "ls-chart-card";
      donutCard.innerHTML = `<h3>Composition — ${fields[visibleFields[0]] ? fields[visibleFields[0]].label : visibleFields[0]}</h3>`;
      const donutSvg = Charts.buildDonut(cat, { ariaLabel: "Composition donut chart" });
      donutCard.appendChild(donutSvg);
      chartsEl.appendChild(donutCard);
      refs.donut = donutSvg;
    }
  }

  function buildLegend(fields, visibleFields, onToggle) {
    const legend = document.createElement("div");
    legend.className = "ls-legend";
    for (const fk of Object.keys(fields)) {
      const meta = fields[fk];
      const btn = document.createElement("button");
      btn.type = "button";
      btn.setAttribute("aria-pressed", String(visibleFields.includes(fk)));
      btn.innerHTML = `<span class="swatch" style="background:${window.LifeStatsCharts.colorFor(fk)}"></span>${meta.label}`;
      btn.onclick = () => onToggle && onToggle(fk);
      legend.appendChild(btn);
    }
    return legend;
  }

  window.LifeStatsRender = { renderCards, renderCharts, fmt };
})();
