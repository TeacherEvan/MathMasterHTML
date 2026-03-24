(function() {
  function escapeHTML(value) {
    const div = document.createElement("div");
    div.textContent = value == null ? "" : String(value);
    return div.innerHTML;
  }

  window.DomSanitizer = Object.freeze({
    escapeHTML,
  });
})();
