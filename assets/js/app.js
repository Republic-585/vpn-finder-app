(() => {
  const tg = window.Telegram?.WebApp;
  if (tg) {
    tg.ready();
    tg.expand();
    try { tg.setHeaderColor("#17212B"); tg.setBackgroundColor("#17212B"); } catch (_) {}
  }

  const byId = (id) => document.getElementById(id);
  const screens = [...document.querySelectorAll("[data-screen]")];
  const navItems = [...document.querySelectorAll(".nav-item")];

  function showScreen(name) {
    screens.forEach((screen) => screen.classList.toggle("active", screen.dataset.screen === name));
    navItems.forEach((item) => {
      const active = item.dataset.go === name;
      item.classList.toggle("active", active);
      if (active) item.setAttribute("aria-current", "page");
      else item.removeAttribute("aria-current");
    });
    if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  document.querySelectorAll("[data-go]").forEach((button) => {
    button.addEventListener("click", () => showScreen(button.dataset.go));
  });
  byId("profile-shortcut")?.addEventListener("click", () => showScreen("profile"));

  const user = tg?.initDataUnsafe?.user;
  if (user) {
    const name = [user.first_name, user.last_name].filter(Boolean).join(" ") || "Пользователь";
    byId("profile-name").textContent = name;
    byId("profile-status").textContent = "Подключён через Telegram";
    byId("avatar-initial").textContent = (user.first_name || "V").slice(0, 1).toUpperCase();
    byId("profile-avatar").textContent = (user.first_name || "V").slice(0, 1).toUpperCase();
  }

  const platform = tg?.platform;
  if (platform) byId("platform-value").textContent = platform;

  const search = byId("search");
  const clearSearch = byId("clear-search");
  search?.addEventListener("input", () => {
    clearSearch.hidden = !search.value;
  });
  clearSearch?.addEventListener("click", () => {
    search.value = "";
    clearSearch.hidden = true;
    search.focus();
  });

  document.querySelectorAll(".filter-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".filter-chip").forEach((item) => item.classList.remove("active"));
      chip.classList.add("active");
      if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged();
    });
  });

  byId("open-filters")?.addEventListener("click", () => {
    if (tg?.showPopup) {
      tg.showPopup({
        title: "Фильтры VPN",
        message: "Расширенные фильтры появятся после подключения каталога.",
        buttons: [{ id: "ok", type: "ok", text: "Понятно" }]
      });
    } else {
      alert("Расширенные фильтры появятся после подключения каталога.");
    }
  });

  byId("sort-button")?.addEventListener("click", () => {
    if (tg?.showPopup) {
      tg.showPopup({
        title: "Сортировка",
        message: "Сортировка станет доступна после загрузки предложений.",
        buttons: [{ id: "ok", type: "ok", text: "Понятно" }]
      });
    } else {
      alert("Сортировка станет доступна после загрузки предложений.");
    }
  });
})();
