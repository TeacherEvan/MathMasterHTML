if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    window.qualityManager = new window.QualityTierManager();
  });
} else {
  window.qualityManager = new window.QualityTierManager();
}
