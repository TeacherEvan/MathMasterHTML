// life-stats-storage.helpers.js — schema, defaults, normalize, migrate
// Loaded before life-stats-storage.js. Exposes window.LifeStatsStorageHelpers.
(function () {
  const STORAGE_VERSION = 1;

  const DEFAULT_FIELDS = {
    expenses: { label: "Expenses", unit: "THB", kind: "money", higherIsBetter: false },
    income: { label: "Income", unit: "THB", kind: "money", higherIsBetter: true },
    risks: { label: "Risks", unit: "lvl", kind: "score", higherIsBetter: false },
    health: { label: "Health", unit: "pts", kind: "score", higherIsBetter: true },
    fuel: { label: "Fuel", unit: "L", kind: "volume", higherIsBetter: false },
    transport: { label: "Transport", unit: "km", kind: "distance", higherIsBetter: false },
  };

  function createDefaultStore() {
    return {
      version: STORAGE_VERSION,
      fields: JSON.parse(JSON.stringify(DEFAULT_FIELDS)),
      entries: [],
      tax: {
        acknowledged: false,
        questionnaire: {
          understandsFiling: null,
          filingFrequency: null,
          tracksDeductions: null,
          lastFiledYear: null,
          notes: "",
        },
      },
      settings: { demoLoaded: false },
    };
  }

  function normalizeField(raw, key) {
    const base = DEFAULT_FIELDS[key] || {};
    return {
      label: (raw && raw.label) || base.label || String(key),
      unit: (raw && raw.unit) || base.unit || "",
      kind: (raw && raw.kind) || base.kind || "number",
      higherIsBetter: raw && typeof raw.higherIsBetter === "boolean" ? raw.higherIsBetter : !!base.higherIsBetter,
    };
  }

  function normalizeFields(rawFields) {
    const fields = {};
    // ensure defaults always present
    for (const key of Object.keys(DEFAULT_FIELDS)) {
      fields[key] = normalizeField(rawFields ? rawFields[key] : undefined, key);
    }
    if (rawFields) {
      for (const key of Object.keys(rawFields)) {
        if (!fields[key]) fields[key] = normalizeField(rawFields[key], key);
      }
    }
    return fields;
  }

  function normalizeEntry(raw) {
    if (!raw || typeof raw !== "object") return null;
    const fieldKey = typeof raw.fieldKey === "string" ? raw.fieldKey.trim() : "";
    const value = Number(raw.value);
    if (!fieldKey || !Number.isFinite(value)) return null;
    return {
      id: typeof raw.id === "string" && raw.id ? raw.id : "ls-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
      fieldKey,
      value,
      note: typeof raw.note === "string" ? raw.note.slice(0, 280) : "",
      ts: typeof raw.ts === "number" && Number.isFinite(raw.ts) ? raw.ts : Date.now(),
    };
  }

  function normalizeTax(raw) {
    const def = createDefaultStore().tax;
    const t = raw && typeof raw === "object" ? raw : {};
    return {
      acknowledged: !!t.acknowledged,
      questionnaire: Object.assign({}, def.questionnaire, t.questionnaire && typeof t.questionnaire === "object" ? t.questionnaire : {}),
    };
  }

  function normalizeEntries(rawEntries, validFieldKeys) {
    if (!Array.isArray(rawEntries)) return [];
    const out = [];
    for (const e of rawEntries) {
      const norm = normalizeEntry(e);
      if (norm && validFieldKeys.has(norm.fieldKey)) out.push(norm);
    }
    return out;
  }

  function migrateStore(raw) {
    const store = createDefaultStore();
    if (!raw || typeof raw !== "object") return store;

    const fields = normalizeFields(raw.fields);
    const validFieldKeys = new Set(Object.keys(fields));

    store.fields = fields;
    store.entries = normalizeEntries(raw.entries, validFieldKeys);
    store.tax = normalizeTax(raw.tax);
    store.settings = Object.assign({}, store.settings, raw.settings && typeof raw.settings === "object" ? raw.settings : {});
    // version bumped to current on every migration for forward-compat
    store.version = STORAGE_VERSION;
    return store;
  }

  window.LifeStatsStorageHelpers = {
    STORAGE_VERSION,
    DEFAULT_FIELDS,
    createDefaultStore,
    normalizeField,
    normalizeFields,
    normalizeEntry,
    normalizeTax,
    normalizeEntries,
    migrateStore,
  };
})();
