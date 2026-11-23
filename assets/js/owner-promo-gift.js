(() => {
  const stage = document.getElementById("owner-gift-stage");
  if (!stage) return;
  let lastOpen = false;
  const haptic = (kind) => {
    try {
      const feedback = window.Telegram?.WebApp?.HapticFeedback;
      if (kind === "impact") feedback?.impactOccurred?.("medium");
      else feedback?.notificationOccurred?.("success");
    } catch (_) {}
  };
  const observer = new MutationObserver(() => {
    const opening = stage.classList.contains("is-opening");
    if (opening && !lastOpen) {
      haptic("impact");
      window.setTimeout(() => {
        if (stage.classList.contains("is-opening")) haptic("success");
      }, 2850);
    }
    lastOpen = opening;
  });
  observer.observe(stage, { attributes: true, attributeFilter: ["class"] });
})();
