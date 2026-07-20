// life-stats-page.controls.js — wire tabs, legend toggle, logging form, exports, seed, reset
// window.LifeStatsControls
(function () {
  const RANGES = ["1d", "1w", "1mo", "4mo", "6mo", "8mo", "12mo", "48mo", "96mo", "212mo"];
  const RANGE_LABELS = {
    "1d": "1 Day", "1w": "1 Week", "1mo": "1 Month", "4mo": "4 Months", "6mo": "6 Months",
    "8mo": "8 Months", "12mo": "12 Months", "48mo": "48 Months", "96mo": "96 Months", "212mo": "212 Months",
  };

  function state() {
    return {
      range: "1mo",
      visible: null, // null => all fields visible
    };
  }

  function computeCategoryTotals(entries, range, now) {
    const start = now - window.LifeStatsAggregate.RANGES[range].ms;
    const out = {};
    for (const e of entries) {
      if (e.ts < start || e.ts > now) continue;
      if (!out[e.fieldKey]) out[e.fieldKey] = {};
      const cat = (e.note && e.note.trim()) || "uncategorized";
      out[e.fieldKey][cat] = (out[e.fieldKey][cat] || 0) + (Number(e.value) || 0);
    }
    return out;
  }

  function init() {
    const Storage = window.LifeStatsStorage;
    const Agg = window.LifeStatsAggregate;
    const Render = window.LifeStatsRender;
    const Export = window.LifeStatsExport;
    if (!Storage || !Agg || !Render) {
      console.error("❌ Life stats dependencies missing");
      return;
    }
    Storage.init();
    const s = state();
    s.visible = Object.keys(Storage.getFields());

    const tabsEl = document.getElementById("ls-tabs");
    const cardsEl = document.getElementById("ls-cards");
    const chartsEl = document.getElementById("ls-charts");
    const refs = {};

    function rerender() {
      const store = Storage.getStore();
      const fields = store.fields;
      const entries = store.entries;
      const now = Date.now();
      const visible = s.visible.filter((k) => fields[k]);
      const agg = Agg.aggregate(entries, fields, s.range, now);
      const catTotals = computeCategoryTotals(entries, s.range, now);

      if (entries.length === 0) {
        cardsEl.innerHTML = '<p class="ls-empty">No data yet. Add an entry or load demo data.</p>';
        chartsEl.innerHTML = '<p class="ls-empty">No data yet. Add an entry or load demo data.</p>';
        return;
      }
      Render.renderCards(cardsEl, agg, fields);
      Render.renderCharts(chartsEl, agg, fields, visible.length ? visible : Object.keys(fields), refs, catTotals);
    }

    // Tabs
    function buildTabs() {
      tabsEl.innerHTML = "";
      for (const r of RANGES) {
        const tab = document.createElement("button");
        tab.className = "ls-tab";
        tab.type = "button";
        tab.textContent = RANGE_LABELS[r];
        tab.setAttribute("role", "tab");
        tab.setAttribute("aria-selected", String(r === s.range));
        tab.onclick = () => {
          s.range = r;
          [...tabsEl.children].forEach((c) => c.setAttribute("aria-selected", String(c.textContent === RANGE_LABELS[r])));
          rerender();
        };
        tabsEl.appendChild(tab);
      }
    }
    buildTabs();

    // Legend toggle handler (passed into render)
    refs.toggle = (fk) => {
      if (s.visible.includes(fk)) s.visible = s.visible.filter((k) => k !== fk);
      else s.visible.push(fk);
      rerender();
    };

    // Buttons
    const addBtn = document.getElementById("ls-add");
    const demoBtn = document.getElementById("ls-demo");
    const resetBtn = document.getElementById("ls-reset");
    const jsonBtn = document.getElementById("ls-export-json");
    const csvBtn = document.getElementById("ls-export-csv");
    const svgBtn = document.getElementById("ls-export-svg");
    const pngBtn = document.getElementById("ls-export-png");

    if (addBtn) addBtn.onclick = () => openForm();
    if (demoBtn) demoBtn.onclick = () => { window.LifeStatsSeed.loadDemoData(); rerender(); };
    if (resetBtn) resetBtn.onclick = () => {
      if (confirm("Reset all life-stats data? This cannot be undone.")) { Storage.reset(); s.visible = Object.keys(Storage.getFields()); rerender(); }
    };
    if (jsonBtn) jsonBtn.onclick = () => Export.downloadJSON(Storage.getStore(), s.range);
    if (csvBtn) csvBtn.onclick = () => Export.downloadCSV(Storage.getStore());
    if (svgBtn) svgBtn.onclick = () => Export.downloadSVG(refs.line || refs.bar, "life-stats-" + s.range);
    if (pngBtn) pngBtn.onclick = () => Export.downloadPNG(refs.line || refs.bar, "life-stats-" + s.range);

    // Logging form modal
    function openForm() {
      const modal = document.getElementById("ls-modal");
      modal.hidden = false;
      const feedback = document.getElementById("ls-form-feedback");
      feedback.textContent = "";
      const fieldSel = document.getElementById("ls-field");
      const fields = Storage.getFields();
      fieldSel.innerHTML = Object.keys(fields)
        .map((k) => `<option value="${k}">${fields[k].label}</option>`)
        .join("") + '<option value="__new">+ New custom field…</option>';
    }

    const modal = document.getElementById("ls-modal");
    const form = document.getElementById("ls-form");
    const feedback = document.getElementById("ls-form-feedback");
    document.getElementById("ls-form-cancel").onclick = () => { modal.hidden = true; };
    modal.addEventListener("click", (e) => { if (e.target === modal) modal.hidden = true; });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const fieldSel = document.getElementById("ls-field").value;
      const value = parseFloat(document.getElementById("ls-value").value);
      const note = document.getElementById("ls-note").value;
      const dateVal = document.getElementById("ls-date").value;

      let fieldKey = fieldSel;
      if (fieldKey === "__new") {
        const customName = (document.getElementById("ls-custom-name").value || "").trim();
        if (!customName) { feedback.textContent = "Enter a name for the new field."; return; }
        fieldKey = customName.toLowerCase().replace(/[^a-z0-9]+/g, "_");
        Storage.addCustomField(fieldKey, { label: customName, unit: "", kind: "number", higherIsBetter: true });
        if (!s.visible.includes(fieldKey)) s.visible.push(fieldKey);
      }

      if (!Number.isFinite(value)) { feedback.textContent = "Value must be a number."; return; }

      const ts = dateVal ? new Date(dateVal + "T00:00:00").getTime() : Date.now();
      if (!Number.isFinite(ts)) { feedback.textContent = "Invalid date."; return; }

      const entry = Storage.addEntry({ fieldKey, value, note, ts });
      if (!entry) { feedback.textContent = "Could not save entry."; return; }
      modal.hidden = true;
      form.reset();
      rerender();
    });

    // custom field name input visibility
    const fieldSel = document.getElementById("ls-field");
    const customWrap = document.getElementById("ls-custom-wrap");
    fieldSel.addEventListener("change", () => {
      customWrap.hidden = fieldSel.value !== "__new";
    });

    rerender();
  }

  window.LifeStatsControls = { init, RANGES, RANGE_LABELS };
})();
