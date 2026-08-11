// life-stats-storage.js — window.LifeStatsStorage (versioned, migrated)
(function () {
  const STORAGE_KEY = "mathmaster_life_stats_v1";
  const helpers = window.LifeStatsStorageHelpers;

  if (!helpers) {
    console.error("❌ LifeStatsStorage helpers not loaded");
    return;
  }

  const { createDefaultStore, migrateStore, normalizeEntry, normalizeFields } = helpers;

  function safeParse(json) {
    if (!json) return null;
    try {
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  const LifeStatsStorage = {
    STORAGE_KEY,

    init() {
      try {
        const raw = safeParse(localStorage.getItem(STORAGE_KEY));
        if (!raw) {
          this._write(createDefaultStore());
          return;
        }
        const migrated = migrateStore(raw);
        this._write(migrated);
      } catch (error) {
        console.warn("⚠️ Failed to initialize life stats store:", error);
      }
    },

    _read() {
      try {
        const raw = safeParse(localStorage.getItem(STORAGE_KEY));
        if (!raw) return null;
        return migrateStore(raw);
      } catch (error) {
        console.warn("⚠️ Failed to read life stats store:", error);
        return null;
      }
    },

    _write(store) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
      } catch (error) {
        console.warn("⚠️ Failed to write life stats store:", error);
      }
    },

    getStore() {
      return this._read() || createDefaultStore();
    },

    getFields() {
      return this.getStore().fields;
    },

    getEntries() {
      return this.getStore().entries;
    },

    addEntry(input) {
      const norm = normalizeEntry(input);
      if (!norm) return null;
      const store = this.getStore();
      if (!store.fields[norm.fieldKey]) return null; // unknown field rejected
      store.entries.push(norm);
      this._write(store);
      return norm;
    },

    addCustomField(key, meta) {
      const store = this.getStore();
      const safeKey = String(key || "").trim();
      if (!safeKey) return false;
      store.fields[safeKey] = normalizeFields({ [safeKey]: meta })[safeKey] || {
        label: safeKey,
        unit: "",
        kind: "number",
        higherIsBetter: true,
      };
      this._write(store);
      return true;
    },

    reset() {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (error) {
        console.warn("⚠️ Failed to reset life stats store:", error);
      }
      this.init();
    },

    setTax(tax) {
      const store = this.getStore();
      const def = createDefaultStore().tax;
      store.tax = {
        acknowledged: !!(tax && tax.acknowledged),
        questionnaire: Object.assign({}, def.questionnaire, tax && tax.questionnaire ? tax.questionnaire : {}),
      };
      this._write(store);
      return store.tax;
    },

    getTax() {
      return this.getStore().tax;
    },
  };

  window.LifeStatsStorage = LifeStatsStorage;
})();
