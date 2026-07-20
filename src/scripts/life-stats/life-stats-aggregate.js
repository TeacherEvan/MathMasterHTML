// life-stats-aggregate.js — windowing + bucketing + rollups
// window.LifeStatsAggregate.window(entries, fields, rangeKey, now) -> { buckets, series, rollups }
(function () {
  const DAY = 86400000;

  // rangeKey -> { ms: total span, step: bucket size, count: bucket count }
  const RANGES = {
    "1d": { ms: DAY, step: DAY / 24, count: 24 }, // hourly
    "1w": { ms: 7 * DAY, step: DAY, count: 7 }, // daily
    "1mo": { ms: 30 * DAY, step: DAY, count: 30 }, // daily
    "4mo": { ms: 120 * DAY, step: 30 * DAY, count: 4 }, // monthly
    "6mo": { ms: 180 * DAY, step: 30 * DAY, count: 6 }, // monthly
    "8mo": { ms: 240 * DAY, step: 30 * DAY, count: 8 }, // monthly
    "12mo": { ms: 365 * DAY, step: 30 * DAY, count: 12 }, // monthly
    "48mo": { ms: 1460 * DAY, step: 91 * DAY, count: 16 }, // quarterly
    "96mo": { ms: 2920 * DAY, step: 91 * DAY, count: 32 }, // quarterly
    "212mo": { ms: 6450 * DAY, step: 365 * DAY, count: 18 }, // yearly
  };

  function buildBuckets(range, now) {
    const buckets = [];
    for (let i = 0; i < range.count; i++) {
      const startTs = now - range.ms + i * range.step;
      buckets.push({ index: i, startTs, endTs: startTs + range.step, totals: {}, counts: {} });
    }
    return buckets;
  }

  function bucketIndexFor(ts, range, now) {
    // index 0 = oldest; index count-1 = newest (contains `now`)
    const offset = now - ts; // ms ago
    if (offset < 0) return -1; // future
    const raw = Math.floor(range.count - offset / range.step);
    const idx = Math.min(range.count - 1, raw);
    return idx >= 0 && idx < range.count ? idx : -1;
  }

  function aggregate(entries, fields, rangeKey, now) {
    const range = RANGES[rangeKey];
    if (!range) throw new Error("Unknown range key: " + rangeKey);
    const effectiveNow = typeof now === "number" && Number.isFinite(now) ? now : Date.now();
    const fieldKeys = Object.keys(fields || {});
    const buckets = buildBuckets(range, effectiveNow);
    const startTime = effectiveNow - range.ms;

    const series = {};
    for (const k of fieldKeys) series[k] = new Array(range.count).fill(undefined);

    for (const e of entries || []) {
      const ts = Number(e.ts);
      if (!Number.isFinite(ts) || ts < startTime || ts > effectiveNow) continue;
      const idx = bucketIndexFor(ts, range, effectiveNow);
      if (idx < 0) continue;
      const b = buckets[idx];
      if (b.totals[e.fieldKey] === undefined) {
        b.totals[e.fieldKey] = 0;
        b.counts[e.fieldKey] = 0;
      }
      b.totals[e.fieldKey] += Number(e.value) || 0;
      b.counts[e.fieldKey] += 1;
      if (!series[e.fieldKey]) series[e.fieldKey] = new Array(range.count).fill(undefined);
      series[e.fieldKey][idx] = (series[e.fieldKey][idx] === undefined ? 0 : series[e.fieldKey][idx]) + (Number(e.value) || 0);
    }

    // rollups
    const rollups = {};
    const rollupKeys = Array.from(new Set([...fieldKeys, ...Object.keys(series)]));
    for (const k of rollupKeys) {
      if (!series[k]) continue;
      let latest = undefined;
      let earliest = undefined;
      let min = Infinity;
      let max = -Infinity;
      let sum = 0;
      let n = 0;
      const vals = series[k].filter((v) => v !== undefined);
      for (const v of vals) {
        sum += v;
        n += 1;
        if (v < min) min = v;
        if (v > max) max = v;
      }
      // latest = last defined bucket value; earliest = first defined bucket value
      for (let i = 0; i < series[k].length; i++) {
        if (series[k][i] !== undefined && earliest === undefined) earliest = series[k][i];
        if (series[k][i] !== undefined) latest = series[k][i];
      }
      rollups[k] = {
        latest: latest === undefined ? 0 : latest,
        avg: n ? sum / n : 0,
        min: min === Infinity ? 0 : min,
        max: max === -Infinity ? 0 : max,
        net: latest !== undefined && earliest !== undefined ? latest - earliest : 0,
      };
    }

    // human-readable labels
    for (const b of buckets) b.label = new Date(b.startTs).toISOString().slice(0, 10);

    return { buckets, series, rollups, rangeKey, range };
  }

  window.LifeStatsAggregate = { RANGES, aggregate };
})();
