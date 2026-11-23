(() => {
  const screen = document.getElementById("screen-owner-promo");
  const host = document.getElementById("owner-gift-canvas");
  if (!screen || !host || host.dataset.ready === "1") return;

  const gift = document.createElement("img");
  gift.className = "gift-reference-image";
  gift.src = "./assets/images/glossy-blue-gift-reference.png";
  gift.alt = "";
  gift.setAttribute("aria-hidden", "true");
  gift.decoding = "async";
  gift.loading = "eager";
  gift.draggable = false;

  gift.addEventListener("load", () => {
    host.dataset.ready = "1";
  }, { once: true });
  gift.addEventListener("error", () => {
    host.dataset.ready = "error";
    console.error("[VPN Finder] Approved gift reference image failed to load.");
  }, { once: true });

  host.replaceChildren(gift);

  const stage = document.getElementById("owner-gift-stage");
  const observer = new IntersectionObserver(entries => {
    const visible = entries.some(entry => entry.isIntersecting);
    if (visible && screen.classList.contains("active")) {
      stage?.classList.add("is-opening");
    }
  }, { threshold: 0.05 });
  observer.observe(screen);

  const mutation = new MutationObserver(() => {
    if (screen.classList.contains("active")) {
      stage?.classList.remove("is-opening");
      void stage?.offsetWidth;
      requestAnimationFrame(() => stage?.classList.add("is-opening"));
    }
  });
  mutation.observe(screen, { attributes: true, attributeFilter: ["class"] });
})();