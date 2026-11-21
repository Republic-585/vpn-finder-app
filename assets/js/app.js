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
  expandedServiceId: null,
  featuredIds: [],
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
function displayServiceName(service) {
  const clean = String(service?.name || "")
    .replace(/vpn/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("ru-RU");
  return clean ? clean[0].toLocaleUpperCase("ru-RU") + clean.slice(1) : "";
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
    return true;
  });
}

const serviceAvatars = {
  "VPN-001": "https://cdn4.telesco.pe/file/HFTCXNtS1l9FyWHH7x1wQZnBUel9c00BMEdkAAfnPj6cHNr7yJdVnYz9dnAAhqA6_P525XMcW62zfrgrQEiWsuy_6HF45E2Yq8r80-UqknwyAUi8FVIOyOosRm-chouDIOxakBrSdOYFXYvw7EIB2nkqY9-LUx5qRP2WHzBVbAJD7N0ihDAyMQcTthgc4YCboAJwm1r46Jw5BasipUyZ7q4HHCZA9QW6sxH-Bb9YvmXAot4nvPAmzoqSQ9I0k4Quhql27J2GB6GZGq6nzkVBk9EkYRhqvk0cdwK0xFjjsBdABUP4svtgdEq9Vl91OiVo4BiZmZUzT-lrK9hYzUMckw.jpg",
  "VPN-002": "https://cdn4.telesco.pe/file/ehp8fYyDFuBitN9x8A4gavi--vbavvJdNd_r5_t105Jtt7NlVaDSh7tXUmU99TAZcew1PGSssPuLPC6_sNEBp8MsZlDjud-ua3mnqqHAJNr019vlAV6b7v3Xl39t0uH0vdKfXyhig6NUCJBc-wpYVuYPiZlGz_7u3d5WA0WC4tOTl8NO_SMidnw3q6aiZTzPNgUkzn2HFLy0_GlXWVVTceLUD5sMrzgBhElIk4fnAX4MqX3Bnp7MOUMpVs65eq6IPf79D_N_m0XxMcjDIkOgP_NW91grdAx5RCmeWrhI4oTnqVhpJBNQKo52Axq1AXLCTVj-Ne42L2T1FLPvevABqQ.jpg",
  "VPN-003": "https://vlesswb.com/assets/logo.svg",
  "VPN-004": "https://cdn4.telesco.pe/file/NJ2FgzPSeDiOrVJ0rKjFOunN8pdhXHFKDZRZWUSY1e8z8pQLL0sPgxRbbv5hXMLEHuk51_ptdK2ce6uTziYAY_SUqDP6MXP7ZqBCellsIN_PozZx7ZoAncBD7OJJBgCkyiXIqs6TRQM9kjF3X88g1giMFl7vtdgv4MNcl-hcxm5A5rtnAM-Cc4DFdoYv6qpQd6_ao6jPe0naAtlL5bL14Mw5kJIUeoHCM3HXGgHvksoJgUzn1tMjP-mRacP3NsxfmcC9dCHPOSkb2DOqNqoybZDzq5X33u3pM0QDsdPUvgwkxggeIqzwQcfvsYh5Zmyl1j0JwpdJK0gizbtNU6KD7w.jpg",
  "VPN-005": "https://cdn4.telesco.pe/file/GskBphrTLR1VGSEizlFuYJ8rUgRCqc-F_YBDNNU0Scoi-4hi8Ls63vVVRiqih-uT864su19WkR6nlLj3oc1TS6PdakkoIMML4hh3svE19fjsvEnculX0RUl35W8z1-UDGG3rvWst5Gkx7G_s0T7NaKMpBCCfFIQzq5D_RVroQIf0IEQn_H3Dn0804HblnQwNDexFUJvjOLia5I4w5AiQZQD047FY_cY-_d4HYx-Ns3XdTct9hoqmD2HSPUVeuAGCbO1dfCIz-_g8w2kmEr4cV6X74-8Xgnl_6rkOQ9DHwkGqBVuZfv5-mTXn0hx6LX51hDLoPXOJx4Y9iAtO1wyFIA.jpg",
  "VPN-006": "https://cdn4.telesco.pe/file/P423oxCFR5L-Hh1qLUgjRny3J17I8AU86gioX5qhjp7NfV2r6kVx40zJf4-qyzPW_4q_ys0v04HPlgBiYGNIu1AO79zzuLDHamUDOIIzER_ByX43WIm5J2BaieLAcuB4GfdpZBpYWiJWfrqWOoynj-8Rdos5O7aQ6ER5kQA1raEUN1ORcMwxmxuZFsmeyiv_v6YCdcDC5T_9ZkMjuqF4bu1cvEsJFj8UQmm9ESg3N3B_7PjhNSRh4F27PP637XJ-L5UAD5N0S-gmnkBMX2MRFdzfttW9Zpk-zM5KvY2UwLUWduylVEk2n_Vc9a8Z7zZv9Tu3AujZtZc4MQJpx-fBxQ.jpg",
  "VPN-007": "https://cdn4.telesco.pe/file/L388RX3gGbzK6rsz_FkCnNraE6C_dAIaayCQpRTCBSdGlwGq7DY6LsNglMAH1f-uUuf_xUeZ25L1muFHjqvUrci5ljxJrtZx5VQzfeacIdtIf-0N6_EpKu1F3pFxL5fyijDb8EB_a9RZErXfJBGfGBFAM8kr1nBCAqc6n0BaLFE8JJggJGUG203URX9WUXwxihv9EhsEF-MQsusD26HlQG-pvO9mHc-asAoaUJgAK3DqnAWLeEGqfu56homL9Ts7THI1OJKERoULUe5yT4WCK4K_Lf9BRJfQI41w8Mg2aGASE06SlT2aqvPZ4KIxH1tzwfAQ8ZZYW9HTutzWOImgSg.jpg",
  "VPN-008": "https://cdn4.telesco.pe/file/cyIVFb2jsQfy7VDfcIJ4iFiHtj2Hr4OF4AlO4H0b5SKHyo-2Bv-fmwaptgqXGFzEMVAAoSLmfZKIPcmGC1WBYt-ujRo6lIoOF_wjmMiP2xSeeN6m4OJaP4gNMr0QjzlQ9_1UDsCOZwK9CGzCsdscaVke6L5Hq9V31RGh0jtok2jq3bk_kWWdY8pNS4_dTRwqHXBUMQODFCGKS-iG2ZXcNtz9cxm92wSfhUvJ0WMkbprgzLqPYesgznss4mjsW570FwqMjsjRG6Uste2TJKwENwcKsWoFh7Rxi9ADetSdyt2zuxZkWXF8DAa1tZe49Um8N89aNi8rmjR4Rof4-XoAKg.jpg",
  "VPN-009": "https://gotbot.cc/branding/apple-touch-icon.png?v=1",
  "VPN-010": "https://cdn1.telesco.pe/file/WBw7jIbPbzVEzT489R3Avp8SK9qg6D3XllcC4_FK93ep1X1ehIc12VYpBU62jxzzlv6yco9fChzxSWscxh5wUeAHfHojLR_cBf64kMyCenPDk_3dS_dmPkUHiQ2-3D2RPQOXYVBZAecf6yLrP_V8zvzjOuBmjMo1QJ1xmyRTU-0pN21_m0lO-5orwgFOtsg1IIrLfNyPhimgXXcGF5HTqMwBzumSwNvYWinH9RKWOhKi4-JLX1roNXRB7ptd1djFNHJka8eTG2pEYgCjUbiJjvmboaelqbIK6vmsHSRzxs-T05Gki5-JVjaYKdQQfc6U5P245Qvk_c77Nx3KKxOkiw.jpg"
};
function serviceAvatar(service, className = "service-avatar") {
  const url = serviceAvatars[service.id];
  const initial = esc((displayServiceName(service) || "V").slice(0, 1).toUpperCase());
  return url
    ? `<img class="${className}" src="${url}" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'${className} avatar-fallback',textContent:'${initial}'}))">`
    : `<span class="${className} avatar-fallback">${initial}</span>`;
}
function serviceDetails(service) {
  const facts = [];
  if (service.min_price_rub != null) facts.push(["Стоимость", "от " + money(service.min_price_rub) + " ₽"]);
  if (service.devices_limit) facts.push(["Устройства", service.devices_limit]);
  if (service.countries_count) facts.push(["Страны", service.countries_count + "+"]);
  if (service.trial_days) facts.push(["Пробный период", service.trial_days + " дн."]);
  if (service.traffic_limit) facts.push(["Трафик", service.traffic_limit]);
  const platforms = Array.isArray(service.platforms) ? service.platforms : [];
  const features = Array.isArray(service.features) ? service.features : [];
  return `<div class="service-detail-panel">
    ${service.description ? `<p class="service-detail-description">${esc(service.description)}</p>` : ""}
    ${facts.length ? `<div class="service-detail-facts">${facts.map(([label,value]) => `<div class="service-detail-fact"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join("")}</div>` : ""}
    ${platforms.length ? `<div class="service-detail-group"><span class="service-detail-label">Платформы</span><div class="service-detail-chips">${platforms.map(item => `<span>${esc(item)}</span>`).join("")}</div></div>` : ""}
    ${features.length ? `<div class="service-detail-group"><span class="service-detail-label">Возможности</span><div class="service-detail-chips">${features.map(item => `<span>${esc(item)}</span>`).join("")}</div></div>` : ""}
    <button class="connect-button service-detail-connect" type="button" data-action="connect" data-id="${esc(service.id)}">Подключить</button>
  </div>`;
}
function serviceMiniCard(service) {
  const id = esc(service.id);
  const expanded = state.expandedServiceId === service.id;
  const compactFacts = [
    service.min_price_rub == null ? "Цена —" : "от " + money(service.min_price_rub) + " ₽",
    service.devices_limit ? service.devices_limit + " устр." : "Устр. —",
    service.traffic_limit ? service.traffic_limit : "Трафик —",
    service.trial_days != null ? (Number(service.trial_days) > 0 ? "Тест " + service.trial_days + " дн." : "Без теста") : "Тест —"
  ];
  return `<article class="service-list-card ${expanded ? "expanded" : ""}">
    <button class="service-mini-card" type="button" data-action="toggle-details" data-id="${id}" aria-expanded="${expanded}">
      ${serviceAvatar(service)}
      <span class="service-mini-copy"><span class="service-mini-name">${esc(displayServiceName(service))}</span><span class="service-mini-subtitle">${compactFacts.map(item => `<span>${esc(item)}</span>`).join('<span class="service-mini-dot">·</span>')}</span></span>
      <svg class="service-mini-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"></path></svg>
    </button>
    ${expanded ? serviceDetails(service) : ""}
  </article>`;
}
function serviceFeaturedItem(service) {
  const id = esc(service.id);
  return `<button class="popular-service" type="button" data-action="connect" data-id="${id}">
    ${serviceAvatar(service, "popular-avatar")}
    <span>${esc(displayServiceName(service))}</span>
  </button>`;
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
  return `<article class="vpn-card" data-service="${id}">
    <div class="vpn-card-top">
      <div class="service-mark">${esc((displayServiceName(service) || "V").slice(0, 1))}</div>
      <div class="service-title"><h3>${esc(displayServiceName(service))}</h3><div class="service-price">${price}</div></div>
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
  const isFiltered = state.filter !== "all";
  const showCompactResults = hasQuery || isFiltered;
  const filterStrip = document.querySelector("#screen-catalog .filter-strip");
  if (filterStrip) filterStrip.hidden = !state.catalogExpanded || hasQuery;
  if (toggleCatalog) {
    toggleCatalog.hidden = hasQuery;
    toggleCatalog.textContent = state.catalogExpanded ? "Свернуть" : "Посмотреть все";
    toggleCatalog.setAttribute("aria-expanded", String(state.catalogExpanded));
  }
  const list = byId("provider-list");
  if (!items.length) {
    list.innerHTML = '<div class="empty-state"><h3>Ничего не найдено</h3></div>';
    return;
  }
  if (showCompactResults) {
    list.innerHTML = `<div class="catalog-compact-list">${items.map(serviceMiniCard).join("")}</div>`;
    return;
  }
  if (!state.featuredIds.length) state.featuredIds = state.services.slice(0, 4).map(service => service.id);
  const featured = state.featuredIds.map(id => state.services.find(service => service.id === id)).filter(Boolean);
  if (state.catalogExpanded) {
    list.innerHTML = `<section class="popular-card"><div class="catalog-compact-list catalog-rest-list">${items.map(serviceMiniCard).join("")}</div></section>`;
    return;
  }
  list.innerHTML = `<section class="popular-card">
    <div class="popular-grid">${featured.map(serviceFeaturedItem).join("")}</div>
  </section>`;
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
  ];
  byId("compare-list").innerHTML = `
    <div class="compare-table-wrap"><table class="compare-table">
      <thead><tr><th></th>${items.map(service => `<th><span>${esc(displayServiceName(service))}</span><button type="button" data-action="remove-compare" data-id="${esc(service.id)}" aria-label="Убрать">×</button></th>`).join("")}</tr></thead>
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
  if (action === "toggle-details") {
    state.expandedServiceId = state.expandedServiceId === service.id ? null : service.id;
    renderCatalog();
    return;
  }
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
    const url = SUPABASE_URL + "/rest/v1/vpn_services?select=id,slug,name,referral_url,logo_url,description,min_price_rub,devices_limit,countries_count,trial_days,traffic_limit,platforms,plans,features,status,sort_order&status=eq.active&order=sort_order.asc";
    const response = await fetch(url, { headers: { apikey: SUPABASE_KEY } });
    if (!response.ok) throw new Error("Catalog request failed");
    state.services = await response.json();
    state.featuredIds = state.services.slice(0, 4).map(service => service.id);
    renderCatalog();
    updateCounts();
  } catch (_) {
    list.innerHTML = '<div class="empty-state"><h3>Не удалось загрузить</h3><button class="primary-button" type="button" id="retry-load">Повторить</button></div>';
    byId("retry-load")?.addEventListener("click", loadServices);
  }
}
loadServices();

function rotateFeaturedServices() {
  if (document.visibilityState !== "visible") return;
  const catalog = byId("screen-catalog");
  if (!catalog?.classList.contains("active") || state.catalogExpanded || state.query || state.filter !== "all" || state.services.length <= 4) return;
  const previous = new Set(state.featuredIds);
  let pool = state.services.filter(service => !previous.has(service.id));
  if (pool.length < 4) pool = [...state.services];
  const next = [];
  while (next.length < 4 && pool.length) {
    const index = Math.floor(Math.random() * pool.length);
    next.push(pool.splice(index, 1)[0]);
  }
  state.featuredIds = next.map(service => service.id);
  renderCatalog();
}
window.setInterval(rotateFeaturedServices, 7000);
})();