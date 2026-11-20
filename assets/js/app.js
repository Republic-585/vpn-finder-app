(() => {
const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  try { tg.setHeaderColor("#202124"); tg.setBackgroundColor("#202124"); } catch (_) {}
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
  catalogExpanded: false,
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
let moveIndicator = () => {};
function showScreen(name) {
  const navBar = document.querySelector(".bottom-nav");
  const alreadyActive = nav.some(button => button.dataset.go === name && button.classList.contains("active"));
  if (!alreadyActive && navBar) {
    navBar.classList.remove("is-switching");
    void navBar.offsetWidth;
    navBar.classList.add("is-switching");
  }
  screens.forEach(screen => screen.classList.toggle("active", screen.dataset.screen === name));
  nav.forEach(button => {
    const active = button.dataset.go === name;
    button.classList.toggle("active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  moveIndicator();
  haptic();
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (name === "favorites") renderFavorites();
  if (name === "compare") renderCompare();
}
const navBar = document.querySelector(".bottom-nav");
if (navBar) {
  const indicator = document.createElement("span");
  indicator.className = "nav-indicator";
  indicator.setAttribute("aria-hidden", "true");
  navBar.prepend(indicator);
  navBar.addEventListener("animationend", event => {
    if (event.target === navBar && event.animationName === "nav-panel-switch") {
      navBar.classList.remove("is-switching");
    }
  });

  let draggingNav = false;
  let dragMoved = false;
  let startX = 0;
  let suppressNavClickUntil = 0;

  const setIndicator = (left, width) => {
    indicator.style.width = width + "px";
    indicator.style.transform = `translateX(${left}px)`;
  };
  moveIndicator = () => {
    const active = nav.find(button => button.classList.contains("active"));
    if (active) setIndicator(active.offsetLeft, active.offsetWidth);
  };
  const slideIndicatorToFinger = clientX => {
    const navRect = navBar.getBoundingClientRect();
    const points = nav.map(item => {
      const rect = item.getBoundingClientRect();
      return { left: item.offsetLeft, width: item.offsetWidth, center: rect.left + rect.width / 2 - navRect.left };
    });
    if (!points.length) return;
    const x = Math.max(points[0].center, Math.min(clientX - navRect.left, points[points.length - 1].center));
    const right = points.findIndex(point => point.center >= x);
    if (right <= 0) {
      setIndicator(points[0].left, points[0].width);
      return;
    }
    const a = points[right - 1];
    const b = points[right];
    const t = (x - a.center) / (b.center - a.center);
    setIndicator(a.left + (b.left - a.left) * t, a.width + (b.width - a.width) * t);
  };
  const nearestItem = () => {
    const rect = indicator.getBoundingClientRect();
    const center = rect.left + rect.width / 2;
    return nav.reduce((best, item) => {
      const itemRect = item.getBoundingClientRect();
      const distance = Math.abs(center - (itemRect.left + itemRect.width / 2));
      return !best || distance < best.distance ? { item, distance } : best;
    }, null)?.item;
  };

  moveIndicator();
  window.addEventListener("resize", moveIndicator);
  navBar.addEventListener("pointerdown", event => {
    const item = event.target.closest(".nav-item");
    if (!item || !item.classList.contains("active") || event.pointerType === "mouse") return;
    draggingNav = true;
    dragMoved = false;
    startX = event.clientX;
    try { navBar.setPointerCapture(event.pointerId); } catch (_) {}
  });
  navBar.addEventListener("pointermove", event => {
    if (!draggingNav) return;
    if (Math.abs(event.clientX - startX) > 6) dragMoved = true;
    if (dragMoved) slideIndicatorToFinger(event.clientX);
  });
  const stopDragging = event => {
    if (!draggingNav) return;
    draggingNav = false;
    try { navBar.releasePointerCapture(event.pointerId); } catch (_) {}
    if (event.type === "pointercancel" || !dragMoved) {
      moveIndicator();
      return;
    }
    const target = nearestItem();
    if (target) {
      suppressNavClickUntil = Date.now() + 450;
      showScreen(target.dataset.go);
    } else {
      moveIndicator();
    }
  };
  navBar.addEventListener("pointerup", stopDragging);
  navBar.addEventListener("pointercancel", stopDragging);
  navBar.addEventListener("lostpointercapture", () => {
    if (draggingNav) {
      draggingNav = false;
      moveIndicator();
    }
  });
  navBar.addEventListener("click", event => {
    if (Date.now() < suppressNavClickUntil) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);
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
  if (byId("avatar-initial")) byId("avatar-initial").textContent = initial;
  byId("profile-avatar").textContent = initial;
  byId("profile-status").textContent = "Telegram";
}
byId("platform-value").textContent = tg?.platform && tg.platform !== "unknown" ? tg.platform : "Telegram";

const search = byId("search");
const clearSearch = byId("clear-search");
const toggleCatalog = byId("toggle-catalog");
toggleCatalog?.addEventListener("click", () => {
  state.catalogExpanded = !state.catalogExpanded;
  haptic();
  renderCatalog();
});
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
  const hasQuery = Boolean(state.query);
  const shownItems = !state.catalogExpanded && !hasQuery && state.filter === "all"
    ? items.slice(0, 3)
    : items;
  const filterStrip = document.querySelector("#screen-catalog .filter-strip");
  if (filterStrip) filterStrip.hidden = !state.catalogExpanded || hasQuery;
  if (toggleCatalog) {
    toggleCatalog.hidden = hasQuery;
    toggleCatalog.textContent = state.catalogExpanded ? "Свернуть" : "Посмотреть все";
    toggleCatalog.setAttribute("aria-expanded", String(state.catalogExpanded));
  }
  byId("provider-list").innerHTML = shownItems.length
    ? shownItems.map(service => serviceCard(service)).join("")
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
  list.innerHTML = '<div class="loading-state"><svg class="loader-shield" viewBox="0 0 24 24" role="img" aria-label="Загрузка"><path class="shield-outline" d="M12 2.8 20 6v5.2c0 5-3.2 8.2-8 10-4.8-1.8-8-5-8-10V6l8-3.2Z"></path><path class="shield-check" d="m8.5 11.8 2.3 2.3 4.8-4.8"></path></svg></div>';
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