// life-stats-charts.js — SVG chart builders (line, bar, donut, sparkline)
// Pure DOM via createElementNS. Exposes window.LifeStatsCharts.
(function () {
  const SVG_NS = "http://www.w3.org/2000/svg";

  function el(name, attrs) {
    const node = document.createElementNS(SVG_NS, name);
    if (attrs) {
      for (const k of Object.keys(attrs)) node.setAttribute(k, String(attrs[k]));
    }
    return node;
  }

  // Map a numeric series to y pixel positions within [pad, height-pad].
  function buildScale(values, height, pad) {
    const nums = values.filter((v) => v !== undefined && Number.isFinite(v));
    let min = nums.length ? Math.min(...nums) : 0;
    let max = nums.length ? Math.max(...nums) : 1;
    if (min === max) {
      min -= 1;
      max += 1;
    }
    const span = max - min;
    return {
      min,
      max,
      y: (v) => height - pad - ((v - min) / span) * (height - 2 * pad),
    };
  }

  // ----- Sparkline (menu mini graph) -----
  function buildSparkline(series, opts) {
    opts = opts || {};
    const width = opts.width || 120;
    const height = opts.height || 36;
    const pad = 3;
    const svg = el("svg", {
      viewBox: `0 0 ${width} ${height}`,
      width,
      height,
      role: "img",
      "aria-label": opts.ariaLabel || "sparkline",
      class: "ls-sparkline",
    });
    const defined = series.map((v, i) => ({ v, i })).filter((p) => p.v !== undefined);
    if (defined.length === 0) return svg;
    const scale = buildScale(series, height, pad);
    const stepX = (width - 2 * pad) / Math.max(1, series.length - 1);
    const points = defined
      .map((p) => `${(pad + p.i * stepX).toFixed(2)},${scale.y(p.v).toFixed(2)}`)
      .join(" ");
    svg.appendChild(el("polyline", { points, fill: "none", stroke: opts.color || "#39ff14", "stroke-width": "2" }));
    return svg;
  }

  // ----- Line chart (multi-series trend) -----
  function buildLine(agg, fieldMeta, visibleFields, opts) {
    opts = opts || {};
    const width = opts.width || 720;
    const height = opts.height || 320;
    const pad = 36;
    const svg = el("svg", {
      viewBox: `0 0 ${width} ${height}`,
      width: "100%",
      height,
      role: "img",
      "aria-label": opts.ariaLabel || "Line trend chart",
      class: "ls-chart ls-chart-line",
    });
    const buckets = agg.buckets;
    const n = buckets.length;
    const stepX = (width - 2 * pad) / Math.max(1, n - 1);

    svg.appendChild(el("line", { x1: pad, y1: height - pad, x2: width - pad, y2: height - pad, stroke: "#2a6", "stroke-width": "1" }));
    svg.appendChild(el("line", { x1: pad, y1: pad, x2: pad, y2: height - pad, stroke: "#2a6", "stroke-width": "1" }));

    const desc = el("desc");
    desc.textContent = "Line chart of " + visibleFields.join(", ");
    svg.appendChild(desc);

    for (const fk of visibleFields) {
      const scale = buildScale(agg.series[fk] || [], height, pad);
      const pts = [];
      buckets.forEach((b, i) => {
        const v = agg.series[fk] && agg.series[fk][i];
        if (v === undefined) return;
        pts.push(`${(pad + i * stepX).toFixed(2)},${scale.y(v).toFixed(2)}`);
      });
      if (pts.length === 0) continue;
      const color = colorFor(fk);
      svg.appendChild(
        el("polyline", { points: pts.join(" "), fill: "none", stroke: color, "stroke-width": "2", "data-field": fk }),
      );
    }
    return svg;
  }

  // ----- Bar chart (per-bucket totals, optional stacked) -----
  function buildBar(agg, fieldMeta, visibleFields, opts) {
    opts = opts || {};
    const width = opts.width || 720;
    const height = opts.height || 320;
    const pad = 36;
    const svg = el("svg", {
      viewBox: `0 0 ${width} ${height}`,
      width: "100%",
      height,
      role: "img",
      "aria-label": opts.ariaLabel || "Bar chart",
      class: "ls-chart ls-chart-bar",
    });
    const buckets = agg.buckets;
    const n = buckets.length;
    const slot = (width - 2 * pad) / n;
    const barW = Math.max(1, slot * 0.6);

    let maxTotal = 0;
    for (const b of buckets) {
      let t = 0;
      for (const fk of visibleFields) t += b.totals[fk] || 0;
      if (t > maxTotal) maxTotal = t;
    }
    if (maxTotal <= 0) maxTotal = 1;
    const scaleY = (height - 2 * pad) / maxTotal;

    const desc = el("desc");
    desc.textContent = "Bar chart of " + visibleFields.join(", ");
    svg.appendChild(desc);

    buckets.forEach((b, i) => {
      let yCursor = height - pad;
      for (const fk of visibleFields) {
        const v = b.totals[fk] || 0;
        if (v <= 0) continue;
        const h = v * scaleY;
        yCursor -= h;
        svg.appendChild(
          el("rect", {
            x: (pad + i * slot + (slot - barW) / 2).toFixed(2),
            y: yCursor.toFixed(2),
            width: barW.toFixed(2),
            height: h.toFixed(2),
            fill: colorFor(fk),
            "data-field": fk,
          }),
        );
      }
    });
    return svg;
  }

  // ----- Donut chart (composition by category/note) -----
  function buildDonut(categoryTotals, opts) {
    opts = opts || {};
    const size = opts.size || 200;
    const r = size / 2 - 10;
    const cx = size / 2;
    const cy = size / 2;
    const svg = el("svg", {
      viewBox: `0 0 ${size} ${size}`,
      width: size,
      height: size,
      role: "img",
      "aria-label": opts.ariaLabel || "Composition donut",
      class: "ls-chart ls-chart-donut",
    });
    const entries = Object.entries(categoryTotals).filter(([, v]) => v > 0);
    const total = entries.reduce((s, [, v]) => s + v, 0);
    if (total <= 0) return svg;
    let angle = -Math.PI / 2;
    const circumference = 2 * Math.PI * r;
    for (const [cat, v] of entries) {
      const frac = v / total;
      const color = colorFor(cat);
      const seg = el("circle", {
        cx,
        cy,
        r,
        fill: "none",
        stroke: color,
        "stroke-width": 20,
        "stroke-dasharray": `${(frac * circumference).toFixed(2)} ${(circumference - frac * circumference).toFixed(2)}`,
        "stroke-dashoffset": (-(angle + Math.PI / 2) / (2 * Math.PI) * circumference).toFixed(2),
        transform: `rotate(-90 ${cx} ${cy})`,
        "data-category": cat,
      });
      svg.appendChild(seg);
      angle += frac * 2 * Math.PI;
    }
    return svg;
  }

  // Stable color per key (deterministic)
  const PALETTE = ["#39ff14", "#00e5ff", "#ff5cf0", "#ffd166", "#ff7b00", "#7c4dff", "#18ffb0", "#ff4d6d"];
  function colorFor(key) {
    let h = 0;
    for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
    return PALETTE[h % PALETTE.length];
  }

  window.LifeStatsCharts = { buildScale, buildSparkline, buildLine, buildBar, buildDonut, colorFor, SVG_NS };
})();
