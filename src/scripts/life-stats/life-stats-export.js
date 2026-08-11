// life-stats-export.js — offline export: JSON / CSV (data) + SVG / PNG (charts)
// window.LifeStatsExport
(function () {
  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // revoke after a tick so the download can start
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function isoDate(d) {
    const dt = d ? new Date(d) : new Date();
    return dt.toISOString().slice(0, 10);
  }

  function downloadJSON(store, rangeKey) {
    const payload = {
      exportedAt: Date.now(),
      range: rangeKey || "all",
      fields: store.fields,
      entries: store.entries,
      tax: store.tax,
      settings: store.settings,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    triggerDownload(blob, `life-stats-${rangeKey || "all"}-${isoDate()}.json`);
  }

  function downloadCSV(store) {
    const header = "ts,isoTs,fieldKey,fieldLabel,value,unit,note\r\n";
    const rows = (store.entries || [])
      .slice()
      .sort((a, b) => a.ts - b.ts)
      .map((e) => {
        const label = (store.fields[e.fieldKey] && store.fields[e.fieldKey].label) || e.fieldKey;
        const unit = (store.fields[e.fieldKey] && store.fields[e.fieldKey].unit) || "";
        const esc = (s) => `"${String(s == null ? "" : s).replace(/"/g, '""')}"`;
        return [e.ts, new Date(e.ts).toISOString(), e.fieldKey, label, e.value, unit, e.note].map(esc).join(",");
      })
      .join("\r\n");
    // UTF-8 BOM for Excel compatibility
    const blob = new Blob(["﻿" + header + rows + "\r\n"], { type: "text/csv;charset=utf-8" });
    triggerDownload(blob, `life-stats-${isoDate()}.csv`);
  }

  function serializeSVG(svgEl) {
    const clone = svgEl.cloneNode(true);
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(clone);
  }

  function downloadSVG(svgEl, name) {
    if (!svgEl) return false;
    const data = serializeSVG(svgEl);
    const blob = new Blob([data], { type: "image/svg+xml;charset=utf-8" });
    triggerDownload(blob, `${name || "life-stats-chart"}-${isoDate()}.svg`);
    return true;
  }

  function svgToPngBlob(svgEl, scale) {
    return new Promise((resolve, reject) => {
      if (!svgEl) return reject(new Error("no svg"));
      const scaleFactor = scale || 2;
      const width = parseInt(svgEl.getAttribute("viewBox")?.split(" ")[2] || svgEl.getAttribute("width") || "720", 10) || 720;
      const height = parseInt(svgEl.getAttribute("viewBox")?.split(" ")[3] || svgEl.getAttribute("height") || "320", 10) || 320;
      const data = serializeSVG(svgEl);
      const img = new Image();
      const svgUrl = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(data);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = width * scaleFactor;
        canvas.height = height * scaleFactor;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#04140a";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("toBlob failed"));
        }, "image/png");
      };
      img.onerror = () => reject(new Error("image load failed"));
      img.src = svgUrl;
    });
  }

  async function downloadPNG(svgEl, name) {
    if (!svgEl) return false;
    const blob = await svgToPngBlob(svgEl, 2);
    triggerDownload(blob, `${name || "life-stats-chart"}-${isoDate()}.png`);
    return true;
  }

  window.LifeStatsExport = { downloadJSON, downloadCSV, downloadSVG, downloadPNG, serializeSVG };
})();
