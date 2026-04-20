(() => {
  const script = document.currentScript;
  const target = script?.dataset?.target;

  if (!target) {
    return;
  }

  const nextUrl = `${target}${window.location.search}${window.location.hash}`;
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  if (currentUrl === nextUrl) {
    return;
  }

  window.location.replace(nextUrl);
})();