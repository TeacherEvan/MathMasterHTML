// life-stats-tax.js — persistent TAX awareness (steady red badge, safe pulse, modal + questionnaire)
// window.LifeStatsTax; loads on every page.
(function () {
  const EDU_TEXT =
    "Most working adults have some tax responsibility. Common elements include: " +
    "(1) knowing whether you must file a return; (2) reporting income from all sources; " +
    "(3) tracking deductible expenses to reduce what you owe; (4) paying by the due date to avoid penalties; " +
    "(5) keeping records for several years. Rules vary by country and income type — check your local tax authority. " +
    "This tool only helps you reflect on your own understanding; it does not calculate or file taxes.";

  const QUESTIONS = [
    { name: "understandsFiling", label: "Do you currently file a tax return?", type: "select",
      options: ["Yes", "No", "Unsure"] },
    { name: "filingFrequency", label: "How often do you need to file?", type: "select",
      options: ["Annually", "Quarterly", "Not sure"] },
    { name: "tracksDeductions", label: "Do you track deductible expenses?", type: "select",
      options: ["Yes", "No"] },
    { name: "lastFiledYear", label: "Last filing year (e.g. 2025)", type: "text" },
  ];

  function ensureRoot() {
    let root = document.getElementById("tax-indicator");
    if (root) return root;
    root = document.createElement("button");
    root.id = "tax-indicator";
    root.type = "button";
    root.setAttribute("aria-label", "Tax awareness. Open to review your tax understanding.");
    root.innerHTML = '<span class="dot" aria-hidden="true"></span>TAX';
    document.body.appendChild(root);
    return root;
  }

  function renderBadge() {
    const root = ensureRoot();
    const tax = (window.LifeStatsStorage && window.LifeStatsStorage.getTax()) || { acknowledged: false };
    root.classList.toggle("acknowledged", !!tax.acknowledged);
    root.onclick = openModal;
  }

  function openModal() {
    const existing = document.getElementById("tax-modal");
    if (existing) { existing.hidden = false; return; }

    const modal = document.createElement("div");
    modal.id = "tax-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "tax-modal-title");

    modal.innerHTML = `
      <div class="tax-content" data-no-nav="true">
        <h2 id="tax-modal-title">Do you understand tax?</h2>
        <div id="tax-yesno" class="tax-yesno" data-no-nav="true">
          <button type="button" class="yes" data-no-nav="true">Yes</button>
          <button type="button" class="no" data-no-nav="true">No</button>
        </div>
        <div id="tax-body" data-no-nav="true" hidden>
          <p>${EDU_TEXT}</p>
          <form class="tax-form" data-no-nav="true">
            ${QUESTIONS.map((q) => `
              <label for="tax-${q.name}" data-no-nav="true">${q.label}</label>
              ${q.type === "select"
                ? `<select id="tax-${q.name}" name="${q.name}" data-no-nav="true">
                     <option value="">—</option>
                     ${q.options.map((o) => `<option value="${o}">${o}</option>`).join("")}
                   </select>`
                : `<input id="tax-${q.name}" name="${q.name}" type="text" inputmode="numeric" data-no-nav="true">`}
            `).join("")}
            <label for="tax-notes" data-no-nav="true">Anything you want to remember about your tax situation?</label>
            <textarea id="tax-notes" name="notes" rows="3" data-no-nav="true"></textarea>
          </form>
          <div class="tax-actions" data-no-nav="true">
            <button type="button" class="ls-btn" id="tax-skip" data-no-nav="true">Later</button>
            <button type="button" class="ls-btn primary" id="tax-submit" data-no-nav="true">Save my understanding</button>
          </div>
          <p class="tax-disclaimer" data-no-nav="true">Educational only. Not tax advice, filing, or calculation.</p>
        </div>
      </div>`;

    document.body.appendChild(modal);

    const yesno = modal.querySelector("#tax-yesno");
    const body = modal.querySelector("#tax-body");
    yesno.querySelector(".yes").onclick = () => { yesno.hidden = true; body.hidden = false; };
    yesno.querySelector(".no").onclick = () => { yesno.hidden = true; body.hidden = false; };

    modal.querySelector("#tax-skip").onclick = () => { modal.hidden = true; };

    modal.querySelector("#tax-submit").onclick = () => {
      const form = modal.querySelector(".tax-form");
      const fd = new FormData(form);
      const questionnaire = {};
      for (const q of QUESTIONS) questionnaire[q.name] = fd.get(q.name) || null;
      questionnaire.notes = (fd.get("notes") || "").toString().slice(0, 500);
      if (window.LifeStatsStorage) window.LifeStatsStorage.setTax({ acknowledged: true, questionnaire });
      modal.hidden = true;
      renderBadge();
    };

    // click backdrop to close
    modal.addEventListener("click", (e) => { if (e.target === modal) modal.hidden = true; });
  }

  function init() {
    if (window.LifeStatsStorage) window.LifeStatsStorage.init();
    renderBadge();
  }

  window.LifeStatsTax = { init, renderBadge, openModal, EDU_TEXT, QUESTIONS };
})();
