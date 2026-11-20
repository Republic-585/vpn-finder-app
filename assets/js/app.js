(() => {
const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  try { tg.setHeaderColor("#17212B"); tg.setBackgroundColor("#17212B"); } catch (_) {}
}

const SUPABASE_URL = "https://januqesxribuqzmmmdun.supabase.co";
const SUPABASE_KEY = "sb_publishable_BaYxtXvRZCmfEzMHJbSCog_ebs4k6oK";
const byId = id => document.getElementById(id);
const screens = [...document.querySelectorAll("[data-screen]")];
const nav = [...document.querySelectorAll(".nav-item")];
const state = {
  services: [],
  filter: "all",
  query: "",
  favorites: new Set(readSet("vpn-finder-favorites")),
  compare: new Set(readSet("vpn-finder-compare"))
};

function readSet(key) {
  try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch (_) { return []; }
}
function saveSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify([...value])); } catch (_) {}
}
function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[ch]));
}
function money(value) {
  return new Intl.NumberFormat("ru-RU").format(value);
}
function haptic() {
  try { tg?.HapticFeedback?.selectionChanged(); } catch (_) {}
}
function showScreen(name, options = {}) {
  const navBar = document.querySelector(".bottom-nav");
  const alreadyActive = nav.some(button => button.dataset.go === name && button.classList.contains("active"));
  if (!alreadyActive && navBar && !options.drag) {
    navBar.classList.remove("is-switching");
    void navBar.offsetWidth;
    navBar.classList.add("is-switching");
    const finishPanelAnimation = event => {
      if (event.target !== navBar) return;
      navBar.classList.remove("is-switching");
      navBar.removeEventListener("animationend", finishPanelAnimation);
    };
    navBar.addEventListener("animationend", finishPanelAnimation);
  }
  screens.forEach(screen => screen.classList.toggle("active", screen.dataset.screen === name));
  nav.forEach(button => {
    const active = button.dataset.go === name;
    button.classList.toggle("active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  if (typeof moveIndicator === "function") moveIndicator();
  haptic();
  if (!options.drag) window.scrollTo({ top: 0, behavior: "smooth" });
  if (name === "favorites") renderFavorites();
  if (name === "compare") renderCompare();
}
const navBar = document.querySelector(".bottom-nav");
if (navBar) {
  const indicator = document.createElement("span");
  indicator.className = "nav-indicator";
  indicator.setAttribute("aria-hidden", "true");
  navBar.prepend(indicator);
  let draggingNav = false;
  let lastDragTarget = "";
  const moveIndicator = () => {
    const activeIndex = nav.findIndex(button => button.classList.contains("active"));
    if (activeIndex >= 0) indicator.style.transform = `translateX(${activeIndex * 100}%)`;
  };
  moveIndicator();
  const switchFromPointer = event => {
    const underFinger = document.elementFromPoint(event.clientX, event.clientY);
    const target = underFinger?.closest?.(".nav-item");
    if (target && navBar.contains(target) && target.dataset.go !== lastDragTarget) {
      lastDragTarget = target.dataset.go;
      showScreen(lastDragTarget, { drag: true });
      moveIndicator();
    }
  };
  navBar.addEventListener("pointerdown", event => {
    const item = event.target.closest(".nav-item");
    if (!item || !item.classList.contains("active") || event.pointerType === "mouse") return;
    draggingNav = true;
    lastDragTarget = item.dataset.go;
    navBar.setPointerCapture?.(event.pointerId);
  });
  navBar.addEventListener("pointermove", event => {
    if (draggingNav) switchFromPointer(event);
  });
  const stopDragging = event => {
    if (!draggingNav) return;
    draggingNav = false;
    try { navBar.releasePointerCapture?.(event.pointerId); } catch (_) {}
    moveIndicator();
  };
  navBar.addEventListener("pointerup", stopDragging);
  navBar.addEventListener("pointercancel", stopDragging);
  navBar.addEventListener("lostpointercapture", () => { draggingNav = false; });
}
document.querySelectorAll("[data-go]").forEach(button => {
  button.addEventListener("click", () => showScreen(button.dataset.go));
});
byId("profile-shortcut")?.addEventListener("click", () => showScreen("profile"));

const user = tg?.initDataUnsafe?.user;
if (user) {
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ") || "Пользователь";
  const initial = (user.first_name || "V").slice(0, 1).toUpperCase();
  byId("profile-name").textContent = name;
  byId("avatar-initial").textContent = initial;
  byId("profile-avatar").textContent = initial;
  byId("profile-status").textContent = "Telegram";
}
byId("platform-value").textContent = tg?.platform && tg.platform !== "unknown" ? tg.platform : "Telegram";

const search = byId("search");
const clearSearch = byId("clear-search");
search?.addEventListener("input", () => {
  state.query = search.value.trim().toLowerCase();
  clearSearch.hidden = !search.value;
  renderCatalog();
});
clearSearch?.addEventListener("click", () => {
  search.value = "";
  state.query = "";
  clearSearch.hidden = true;
  renderCatalog();
  search.focus();
});

document.querySelectorAll(".filter-chip").forEach(chip => {
  chip.addEventListener("click", () => {
    state.filter = chip.dataset.filter;
    document.querySelectorAll(".filter-chip").forEach(item => item.classList.toggle("active", item === chip));
    haptic();
    renderCatalog();
  });
});

function visibleServices() {
  return state.services.filter(service => {
    const queryMatch = !state.query ||
      [service.name, service.description, ...(service.features || [])].join(" ").toLowerCase().includes(state.query);
    if (!queryMatch) return false;
    if (state.filter === "trial") return Number(service.trial_days) > 0 || (service.plans || []).some(plan => Number(plan.price_rub) === 0);
    if (state.filter === "multi") return Number(service.devices_limit) > 1;
    if (state.filter === "whitelist") return service.whitelist_support === true;
    return true;
  });
}

function serviceCard(service, context = "catalog") {
  const id = esc(service.id);
  const favorite = state.favorites.has(service.id);
  const compared = state.compare.has(service.id);
  const price = service.min_price_rub == null ? "Тарифы в боте" : "от " + money(service.min_price_rub) + " ₽";
  const details = [];
  if (service.devices_limit) details.push(service.devices_limit + " устр.");
  if (service.countries_count) details.push(service.countries_count + "+ стран");
  if (service.trial_days) details.push("Тест " + service.trial_days + " дн.");
  if (service.whitelist_support) details.push("Белые списки");
  const initial = esc((service.name || "V").slice(0, 1).toUpperCase());
  return `<article class="vpn-card" data-service="${id}">
    <div class="vpn-card-top">
      <div class="service-mark">${initial}</div>
      <div class="service-title"><h3>${esc(service.name)}</h3><div class="service-price">${price}</div></div>
      <div class="card-tools">
        <button class="round-action ${favorite ? "selected" : ""}" type="button" data-action="favorite" data-id="${id}" aria-label="Избранное" aria-pressed="${favorite}">
          <svg viewBox="0 0 24 24"><path d="M20.8 8.8c0 5.1-8.8 10.2-8.8 10.2S3.2 13.9 3.2 8.8A4.5 4.5 0 0 1 12 6.5a4.5 4.5 0 0 1 8.8 2.3Z"></path></svg>
        </button>
        <button class="round-action ${compared ? "selected" : ""}" type="button" data-action="compare" data-id="${id}" aria-label="Сравнить" aria-pressed="${compared}">
          <svg viewBox="0 0 24 24"><path d="M5 7h14M5 17h14M9 3 5 7l4 4M15 13l4 4-4 4"></path></svg>
        </button>
      </div>
    </div>
    ${details.length ? `<div class="vpn-tags">${details.map(item => `<span class="vpn-tag">${esc(item)}</span>`).join("")}</div>` : ""}
    <div class="vpn-card-bottom">
      <button class="connect-button" type="button" data-action="connect" data-id="${id}">Подключить</button>
      ${context !== "catalog" ? `<button class="remove-button" type="button" data-action="remove-${context}" data-id="${id}">Убрать</button>` : ""}
    </div>
  </article>`;
}

function renderCatalog() {
  const items = visibleServices();
  byId("result-count").textContent = items.length + " сервисов";
  byId("provider-list").innerHTML = items.length
    ? items.map(service => serviceCard(service)).join("")
    : '<div class="empty-state"><h3>Ничего не найдено</h3></div>';
}
function renderFavorites() {
  const items = state.services.filter(service => state.favorites.has(service.id));
  byId("favorites-list").innerHTML = items.length
    ? '<div class="provider-list">' + items.map(service => serviceCard(service, "favorites")).join("") + "</div>"
    : '<div class="empty-state"><h3>Пусто</h3><button class="primary-button" type="button" data-go="catalog">Каталог</button></div>';
  updateCounts();
}
function renderCompare() {
  const items = state.services.filter(service => state.compare.has(service.id));
  if (!items.length) {
    byId("compare-list").innerHTML = '<div class="empty-state"><h3>Выберите сервисы</h3><button class="primary-button" type="button" data-go="catalog">Каталог</button></div>';
    updateCounts();
    return;
  }
  const rows = [
    ["Цена", service => service.min_price_rub == null ? "В боте" : "от " + money(service.min_price_rub) + " ₽"],
    ["Устройства", service => service.devices_limit ? service.devices_limit : "Нет данных"],
    ["Страны", service => service.countries_count ? service.countries_count + "+" : "Нет данных"],
    ["Белые списки", service => service.whitelist_support ? "Да" : "Нет"]
  ];
  byId("compare-list").innerHTML = `
    <div class="compare-table-wrap"><table class="compare-table">
      <thead><tr><th></th>${items.map(service => `<th><span>${esc(service.name)}</span><button type="button" data-action="remove-compare" data-id="${esc(service.id)}" aria-label="Убрать">×</button></th>`).join("")}</tr></thead>
      <tbody>${rows.map(([label, getter]) => `<tr><th>${label}</th>${items.map(service => `<td>${esc(getter(service))}</td>`).join("")}</tr>`).join("")}</tbody>
    </table></div>`;
  updateCounts();
}

function updateCounts() {
  byId("favorites-count").textContent = state.favorites.size;
  byId("compare-count").textContent = state.compare.size;
}
function toggleSet(set, key, id) {
  if (set.has(id)) set.delete(id); else set.add(id);
  saveSet(key, set);
  updateCounts();
}
function openReferral(service) {
  if (!service?.referral_url) return;
  let url;
  try { url = new URL(service.referral_url); } catch (_) { return; }
  if (url.protocol !== "https:") return;
  if (tg) {
    if (["t.me", "telegram.me"].includes(url.hostname)) tg.openTelegramLink(url.href);
    else tg.openLink(url.href);
  } else {
    window.location.href = url.href;
  }
}

document.addEventListener("click", event => {
  const button = event.target.closest("[data-action], [data-go]");
  if (!button) return;
  if (button.dataset.go) {
    showScreen(button.dataset.go);
    return;
  }
  const service = state.services.find(item => item.id === button.dataset.id);
  if (!service) return;
  const action = button.dataset.action;
  if (action === "connect") openReferral(service);
  if (action === "favorite") {
    toggleSet(state.favorites, "vpn-finder-favorites", service.id);
    renderCatalog(); renderFavorites();
  }
  if (action === "compare") {
    toggleSet(state.compare, "vpn-finder-compare", service.id);
    renderCatalog(); renderCompare();
  }
  if (action === "remove-favorites") {
    toggleSet(state.favorites, "vpn-finder-favorites", service.id);
    renderFavorites(); renderCatalog();
  }
  if (action === "remove-compare") {
    toggleSet(state.compare, "vpn-finder-compare", service.id);
    renderCompare(); renderCatalog();
  }
});

async function loadServices() {
  const list = byId("provider-list");
  list.innerHTML = '<div class="loading-state"><span class="loader"></span></div>';
  try {
    const url = SUPABASE_URL + "/rest/v1/vpn_services?select=id,slug,name,logo_url,description,min_price_rub,devices_limit,countries_count,trial_days,traffic_limit,platforms,plans,features,whitelist_support,status,sort_order&status=eq.active&order=sort_order.asc";
    const response = await fetch(url, { headers: { apikey: SUPABASE_KEY } });
    if (!response.ok) throw new Error("Catalog request failed");
    state.services = await response.json();
    renderCatalog();
    updateCounts();
  } catch (_) {
    list.innerHTML = '<div class="empty-state"><h3>Не удалось загрузить</h3><button class="primary-button" type="button" id="retry-load">Повторить</button></div>';
    byId("retry-load")?.addEventListener("click", loadServices);
  }
}
loadServices();
})();