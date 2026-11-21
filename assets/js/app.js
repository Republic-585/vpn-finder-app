(() => {
const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  try { tg.setHeaderColor("#202124"); tg.setBackgroundColor("#202124"); } catch (_) {}
}

const SUPABASE_URL = "https://januqesxribuqzmmmdun.supabase.co";
const SUPABASE_KEY = "sb_publishable_BaYxtXvRZCmfEzMHJbSCog_ebs4k6oK";
const ANALYTICS_SESSION_KEY = "vpn-finder-analytics-session";
const ANALYTICS_SESSION_ACTIVITY_KEY = "vpn-finder-analytics-session-activity";
const ANALYTICS_SESSION_IDLE_MS = 30 * 60 * 1000;
function analyticsSessionToken() {
  const now = Date.now();
  try {
    const lastActivity = Number(localStorage.getItem(ANALYTICS_SESSION_ACTIVITY_KEY) || 0);
    let token = localStorage.getItem(ANALYTICS_SESSION_KEY);
    if (!token || !Number.isFinite(lastActivity) || now - lastActivity >= ANALYTICS_SESSION_IDLE_MS) {
      token = crypto.randomUUID();
      localStorage.setItem(ANALYTICS_SESSION_KEY, token);
    }
    localStorage.setItem(ANALYTICS_SESSION_ACTIVITY_KEY, String(now));
    return token;
  } catch (_) { return crypto.randomUUID(); }
}
let analyticsToken = analyticsSessionToken();
let analyticsAccessChecked = false;
let analyticsDashboardLoading = false;
async function trackEvent(eventName, eventData = {}, serviceId = null) {
  if (!tg?.initData) return;
  try {
    // Ensure the Telegram profile exists before writing rows that reference it.
    await syncTelegramProfile();
    if (!profileReady) return;
    analyticsToken = analyticsSessionToken();
    await fetch(SUPABASE_URL + "/functions/v1/analytics-ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        initData: tg.initData,
        session_token: analyticsToken,
        event_name: eventName,
        event_data: eventData,
        service_id: serviceId,
        source: new URLSearchParams(window.location.search).get("utm_source") || "telegram",
        medium: new URLSearchParams(window.location.search).get("utm_medium") || "miniapp",
        campaign: new URLSearchParams(window.location.search).get("utm_campaign") || "",
        referrer_host: (() => { try { return document.referrer ? new URL(document.referrer).hostname : ""; } catch (_) { return ""; } })()
      })
    });
  } catch (_) { /* Analytics must never interrupt the Mini App. */ }
}
async function loadAnalyticsDashboard() {
  const root = byId("analytics-dashboard");
  if (!root || analyticsDashboardLoading || !tg?.initData) return;
  analyticsDashboardLoading = true;
  root.textContent = t("Загрузка аналитики…");
  try {
    const response = await fetch(SUPABASE_URL + "/functions/v1/analytics-admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData: tg.initData })
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.ok) {
      byId("analytics-menu-row").hidden = true;
      root.textContent = t("Нет доступа к аналитике.");
      return;
    }
    analyticsAccessChecked = true;
    byId("analytics-menu-row").hidden = false;
    const summary = result.summary || {};
    const services = new Map((result.services || []).map(item => [item.id, item.name]));
    const eventRows = (result.events || []).slice(0, 25).map(item =>
      '<tr><td>' + esc(item.event_name) + '</td><td>' + esc(String(item.telegram_id || "—")) + '</td><td>' + esc(services.get(item.service_id) || item.service_id || "—") + '</td><td>' + esc(new Date(item.occurred_at).toLocaleString()) + '</td></tr>'
    ).join("");
    const clickRows = (result.clicks || []).slice(0, 25).map(item =>
      '<tr><td>' + esc(services.get(item.service_id) || item.service_id) + '</td><td>' + esc(String(item.telegram_id || "—")) + '</td><td>' + esc(new Date(item.clicked_at).toLocaleString()) + '</td></tr>'
    ).join("");
    const userRows = (result.users || []).slice(0, 25).map(item => {
      const profile = item.profile || {};
      const display = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "—";
      return '<tr><td>' + esc(display) + '</td><td>' + esc(profile.username ? "@" + profile.username : String(item.telegram_id || "—")) + '</td><td>' + esc(item.source || "—") + '</td><td>' + esc(new Date(item.last_seen_at).toLocaleString()) + '</td></tr>';
    }).join("");
    const sourceCounts = new Map();
    (result.users || []).forEach(item => {
      const source = item.source || "unknown";
      sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1);
    });
    const sourceRows = [...sourceCounts.entries()].sort((a,b)=>b[1]-a[1]).map(([source,count]) =>
      '<tr><td>' + esc(source) + '</td><td>' + count + '</td></tr>'
    ).join("");
    root.innerHTML =
      '<div class="analytics-summary">' +
      '<article><strong>' + Number(summary.sessions || 0) + '</strong><span>' + t("Сессии") + '</span></article>' +
      '<article><strong>' + Number(summary.events || 0) + '</strong><span>' + t("События") + '</span></article>' +
      '<article><strong>' + Number(summary.clicks || 0) + '</strong><span>' + t("Переходы") + '</span></article>' +
      '<h2>' + t("Пользователи и сессии") + '</h2><div class="analytics-table-wrap"><table><thead><tr><th>' + t("Пользователь") + '</th><th>Telegram</th><th>' + t("Источник") + '</th><th>' + t("Активность") + '</th></tr></thead><tbody>' + (userRows || '<tr><td colspan="4">—</td></tr>') + '</tbody></table></div>' +
      '<h2>' + t("Источники (последние сессии)") + '</h2><div class="analytics-table-wrap"><table><thead><tr><th>' + t("Источник") + '</th><th>' + t("Сессии") + '</th></tr></thead><tbody>' + (sourceRows || '<tr><td colspan="2">—</td></tr>') + '</tbody></table></div>' +
      '<h2>' + t("Последние события") + '</h2><div class="analytics-table-wrap"><table><thead><tr><th>' + t("Событие") + '</th><th>Telegram ID</th><th>' + t("Сервис") + '</th><th>' + t("Время") + '</th></tr></thead><tbody>' + (eventRows || '<tr><td colspan="4">—</td></tr>') + '</tbody></table></div>' +
      '<h2>' + t("Партнёрские переходы") + '</h2><div class="analytics-table-wrap"><table><thead><tr><th>' + t("Сервис") + '</th><th>Telegram ID</th><th>' + t("Время") + '</th></tr></thead><tbody>' + (clickRows || '<tr><td colspan="3">—</td></tr>') + '</tbody></table></div>' +
  } catch (_) {
    root.textContent = t("Не удалось загрузить аналитику.");
  } finally {
    analyticsDashboardLoading = false;
  }
}
const byId = id => document.getElementById(id);
const LANGUAGE_KEY = "vpn-finder-language";
const translations = {
  ru: {},
  en: {
    "Язык":"Language","Русский":"Russian","English":"English","Выберите язык приложения":"Choose the app language",
    "Откройте приложение в Telegram, чтобы сменить язык.":"Open the app in Telegram to change the language.",
    "Загрузка аналитики…":"Loading analytics…","Нет доступа к аналитике.":"No access to analytics.",
    "Не удалось загрузить аналитику.":"Could not load analytics.","Сессии":"Sessions","События":"Events",
    "Переходы":"Clicks","Последние события":"Recent events",
    "Партнёрские переходы":"Affiliate clicks","Событие":"Event","Сервис":"Service","Время":"Time",
    "Аналитика":"Analytics","Пользователи и сессии":"Users and sessions","Пользователь":"User","Источник":"Source","Активность":"Activity","Источники трафика":"Traffic sources","Тип":"Type","Статус":"Status","Сумма":"Amount","Комиссия":"Commission","Не удалось открыть партнёрскую ссылку. Попробуйте ещё раз.":"Could not open the partner link. Please try again.",
    "Поиск":"Search","Очистить поиск":"Clear search","Популярный выбор":"Popular services","Посмотреть все":"View all","Свернуть":"Show less",
    "Фильтры":"Filters","Все":"All","Бесплатно":"Free","Сравнение":"Compare","Избранное":"Favorites","Профиль":"Profile",
    "Загрузка профиля…":"Loading profile…","Не удалось загрузить профиль":"Could not load profile","Пользователь":"User","Откройте приложение через Telegram":"Open the app through Telegram",
    "Добавление Finder VPN на экран Домой":"Add Finder VPN to your Home Screen","Открывайте":"Open","в одно касание.":"with one tap.",
    "Добавьте":"Add","на экран Домой для быстрого доступа.":"to your Home Screen for quick access.",
    "Добавить на экран Домой":"Add to Home Screen","Скрыть":"Hide","Добавлено на экран Домой":"Added to Home Screen",
    "Finder VPN теперь можно открывать с домашнего экрана.":"You can now open Finder VPN from your Home Screen.",
    "Добавление на экран Домой не поддерживается на этом устройстве или в этой версии Telegram.":"Adding to the Home Screen is not supported on this device or this Telegram version.",
    "Не удалось добавить Finder VPN. Попробуйте ещё раз.":"Could not add Finder VPN. Please try again.",
    "Откройте Finder VPN в актуальной версии Telegram, чтобы добавить его на экран Домой.":"Open Finder VPN in the latest version of Telegram to add it to your Home Screen.",
    "Новости":"News","Связаться":"Contact us","Владельцам VPN":"For VPN providers","Новости и обновления VPN Finder.":"VPN Finder news and updates.",
    "Пока новостей нет":"No news yet","Напишите нам. Сообщение придёт владельцу VPN Finder.":"Send us a message. It will be delivered to the VPN Finder team.",
    "Ваше сообщение":"Your message","Напишите сообщение…":"Write your message…","Отправить сообщение":"Send message",
    "Добавьте свой сервис в каталог VPN Finder.":"Add your service to the VPN Finder directory.","Название сервиса":"Service name",
    "Название VPN":"VPN name","Официальный сайт":"Official website","Описание":"Description","Расскажите о сервисе":"Tell us about your service",
    "Контакт для связи":"Contact details","@username или email":"@username or email","Отправить заявку":"Submit request",
    "Finder":"Finder","Сравнить":"Compare","Каталог":"Directory","Ничего не найдено":"No results found","Пусто":"Nothing here yet",
    "Выберите сервисы":"Choose services","Цена":"Price","Цена —":"Price —","Устройства":"Devices","Страны":"Countries","Нет данных":"Not available",
    "В боте":"In bot","Убрать":"Remove","Подключить":"Connect","Тарифы в боте":"Plans in bot",
    "Стоимость":"Price","от ":"from ","Пробный период":"Free trial"," дн.":" days","Трафик":"Data",
    "Платформы":"Platforms","Оплата":"Payment","Возможности":"Features"," устр.":" devices"," стран":" countries",
    "Тест ":"Trial ","Без теста":"No trial","Тест —":"Trial —","Устр. —":"Devices —","Трафик —":"Data —",
    "Загрузка":"Loading","Не удалось загрузить":"Could not load","Повторить":"Try again",
    "Откройте приложение через Telegram, чтобы отправить сообщение.":"Open the app through Telegram to send a message.",
    "Отправляем…":"Sending…","Сообщение отправлено.":"Message sent.","Не удалось отправить. Попробуйте ещё раз.":"Could not send. Please try again."
  }
};
let appLanguage = (() => {
  try {
    const saved = localStorage.getItem(LANGUAGE_KEY);
    return saved === "en" || saved === "ru" ? saved : (tg?.initDataUnsafe?.user?.language_code?.toLowerCase().startsWith("en") ? "en" : "ru");
  } catch (_) { return "ru"; }
})();
const t = value => translations[appLanguage]?.[value] || value;
function translateStaticContent() {
  document.documentElement.lang = appLanguage;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    const raw = node.nodeValue;
    const trimmed = raw.trim();
    if (translations.en[trimmed]) node.nodeValue = raw.replace(trimmed, t(trimmed));
  }
  document.querySelectorAll("[placeholder],[aria-label],[title]").forEach(el => {
    ["placeholder","aria-label","title"].forEach(attr => {
      const value = el.getAttribute(attr);
      if (value && translations.en[value]) el.setAttribute(attr, t(value));
    });
  });
  updateLanguageLabel();
}
function updateLanguageLabel() {
  const value = byId("profile-language-value");
  if (value) value.textContent = appLanguage === "en" ? "English" : "Русский";
}
function chooseLanguage() {
  if (typeof tg?.showPopup !== "function") {
    try { tg?.showAlert?.(t("Откройте приложение в Telegram, чтобы сменить язык.")); } catch (_) {}
    return;
  }
  tg.showPopup({
    title: t("Язык"),
    message: t("Выберите язык приложения"),
    buttons: [
      { id: "ru", type: appLanguage === "ru" ? "default" : "default", text: "Русский" },
      { id: "en", type: appLanguage === "en" ? "default" : "default", text: "English" },
      { type: "cancel" }
    ]
  }, buttonId => {
    if (buttonId !== "ru" && buttonId !== "en") return;
    if (appLanguage === buttonId) return;
    appLanguage = buttonId;
    trackEvent("language_change", { language: appLanguage });
    try { localStorage.setItem(LANGUAGE_KEY, appLanguage); } catch (_) {}
    translateStaticContent();
    renderCatalog();
    renderFavorites();
    renderCompare();
    try { tg?.HapticFeedback?.selectionChanged(); } catch (_) {}
  });
}
translateStaticContent();
byId("language-selector")?.addEventListener("click", chooseLanguage);

const HOME_SCREEN_PROMPT_KEY = "vpn-finder-home-screen-prompt-hidden";
function initHomeScreenPrompt() {
  const prompt = byId("home-screen-prompt");
  const hideButton = byId("hide-home-screen-prompt");
  const addButton = byId("add-home-screen");
  const status = byId("home-screen-status");
  if (!prompt || !hideButton || !addButton || !status) return;

  const showStatus = message => {
    status.textContent = message;
    status.hidden = !message;
  };
  const markAdded = () => {
    addButton.textContent = t("Добавлено на экран Домой");
    addButton.disabled = true;
    showStatus(t("Finder VPN теперь можно открывать с домашнего экрана."));
  };

  try {
    prompt.hidden = localStorage.getItem(HOME_SCREEN_PROMPT_KEY) === "1";
  } catch (_) {
    prompt.hidden = false;
  }
  hideButton.addEventListener("click", () => {
    prompt.hidden = true;
    try { localStorage.setItem(HOME_SCREEN_PROMPT_KEY, "1"); } catch (_) {}
  });

  if (tg?.onEvent) {
    tg.onEvent("homeScreenAdded", markAdded);
    tg.onEvent("homeScreenFailed", event => {
      showStatus(event?.error === "UNSUPPORTED"
        ? t("Добавление на экран Домой не поддерживается на этом устройстве или в этой версии Telegram.")
        : t("Не удалось добавить Finder VPN. Попробуйте ещё раз."));
    });
  }

  addButton.addEventListener("click", () => {
    if (typeof tg?.addToHomeScreen !== "function") {
      showStatus(t("Откройте Finder VPN в актуальной версии Telegram, чтобы добавить его на экран Домой."));
      return;
    }
    showStatus("");
    tg.addToHomeScreen();
  });

  if (typeof tg?.checkHomeScreenStatus === "function") {
    tg.checkHomeScreenStatus(result => {
      if (result === "added") markAdded();
      else if (result === "unsupported") {
        showStatus(t("Добавление на экран Домой не поддерживается на этом устройстве или в этой версии Telegram."));
        addButton.disabled = true;
      }
    });
  }
}
initHomeScreenPrompt();
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
  return new Intl.NumberFormat(appLanguage === "en" ? "en-US" : "ru-RU").format(value);
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
  trackEvent("screen_view", { screen: name });
  if (name === "analytics") loadAnalyticsDashboard();
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (name === "favorites") renderFavorites();
  if (name === "compare") renderCompare();
  if (name === "profile") { syncTelegramProfile(); if (!analyticsAccessChecked) loadAnalyticsDashboard(); }
  const isProfileSubscreen = ["news", "contact", "owners"].includes(name);
  try {
    if (isProfileSubscreen) tg?.BackButton?.show();
    else tg?.BackButton?.hide();
  } catch (_) {}
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
if (tg?.BackButton) {
  tg.BackButton.onClick(() => showScreen("profile"));
  try { tg.BackButton.hide(); } catch (_) {}
}
document.querySelectorAll("[data-go]").forEach(button => {
  button.addEventListener("click", () => showScreen(button.dataset.go));
});
byId("profile-shortcut")?.addEventListener("click", () => showScreen("profile"));

let profileReady = false;
let profileSyncPromise = null;

function renderTelegramProfile(profile) {
  const name = byId("profile-name");
  const photo = byId("profile-photo");
  const fallback = byId("profile-avatar-fallback");
  name.textContent = profile.display_name || t("Пользователь");
  const initial = (profile.first_name || "V").slice(0, 1).toLocaleUpperCase("ru-RU");
  fallback.textContent = initial;

  if (profile.photo_url) {
    photo.onerror = () => {
      photo.hidden = true;
      fallback.hidden = false;
    };
    photo.onload = () => {
      photo.hidden = false;
      fallback.hidden = true;
    };
    photo.src = profile.photo_url;
  } else {
    photo.removeAttribute("src");
    photo.hidden = true;
    fallback.hidden = false;
  }

}

async function syncTelegramProfile() {
  if (profileReady) return;
  if (profileSyncPromise) return profileSyncPromise;
  if (!tg?.initData) {
    byId("profile-name").textContent = t("Откройте приложение через Telegram");
    return;
  }

  profileSyncPromise = (async () => {
    const response = await fetch(SUPABASE_URL + "/functions/v1/telegram-profile", {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ initData: tg.initData })
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.ok || !result.profile) {
      throw new Error("Profile registration failed");
    }
    renderTelegramProfile(result.profile);
    profileReady = true;
  })();

  try {
    await profileSyncPromise;
  } catch (_) {
    byId("profile-name").textContent = t("Не удалось загрузить профиль");
  } finally {
    profileSyncPromise = null;
  }
}

// First launch creates or updates the user's account automatically.
syncTelegramProfile();
trackEvent("app_open", { language: appLanguage });

const search = byId("search");
let searchAnalyticsTimer = null;
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
  clearTimeout(searchAnalyticsTimer);
  searchAnalyticsTimer = setTimeout(() => {
    if (state.query) trackEvent("search", { query_length: state.query.length });
  }, 1200);
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
    trackEvent("filter_change", { filter: state.filter });
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
    if (state.filter === "free") return false;
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
  if (service.min_price_rub != null) facts.push([t("Стоимость"), "от " + money(service.min_price_rub) + " ₽"]);
  if (service.devices_limit) facts.push([t("Устройства"), service.devices_limit]);
  if (service.countries_count) facts.push([t("Страны"), service.countries_count + "+"]);
  if (service.trial_days) facts.push([t("Пробный период"), service.trial_days + " дн."]);
  if (service.traffic_limit) facts.push([t("Трафик"), service.traffic_limit]);
  const platforms = Array.isArray(service.platforms) ? service.platforms : [];
  const allFeatures = Array.isArray(service.features) ? service.features : [];
  const paymentPattern = /сбп|оплат|карт|visa|mastercard|мир|юmoney|юмани|крипт|usdt|ton|telegram stars|звезд|apple pay|google pay|paypal|перевод/i;
  const payments = allFeatures.filter(item => paymentPattern.test(String(item)));
  const features = allFeatures.filter(item => !paymentPattern.test(String(item)));
  return `<div class="service-detail-panel">
    ${service.description ? `<p class="service-detail-description">${esc(service.description)}</p>` : ""}
    ${facts.length ? `<div class="service-detail-facts">${facts.map(([label,value]) => `<div class="service-detail-fact"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join("")}</div>` : ""}
    ${platforms.length ? `<div class="service-detail-group"><span class="service-detail-label">${t("Платформы")}</span><div class="service-detail-chips">${platforms.map(item => `<span>${esc(item)}</span>`).join("")}</div></div>` : ""}
    ${payments.length ? `<div class="service-detail-group"><span class="service-detail-label">${t("Оплата")}</span><div class="service-detail-chips">${payments.map(item => `<span>${esc(item)}</span>`).join("")}</div></div>` : ""}
    ${features.length ? `<div class="service-detail-group"><span class="service-detail-label">${t("Возможности")}</span><div class="service-detail-chips">${features.map(item => `<span>${esc(item)}</span>`).join("")}</div></div>` : ""}
    <button class="connect-button service-detail-connect" type="button" data-action="connect" data-id="${esc(service.id)}">${t("Подключить")}</button>
  </div>`;
}
function serviceMiniCard(service) {
  const id = esc(service.id);
  const expanded = state.expandedServiceId === service.id;
  const compactFacts = [
    service.min_price_rub == null ? t("Цена —") : t("от ") + money(service.min_price_rub) + " ₽",
    service.devices_limit ? service.devices_limit + t(" устр.") : t("Устр. —"),
    service.traffic_limit ? service.traffic_limit : t("Трафик —"),
    service.trial_days != null ? (Number(service.trial_days) > 0 ? t("Тест ") + service.trial_days + t(" дн.") : t("Без теста")) : t("Тест —")
  ];
  return `<article class="service-list-card ${expanded ? "expanded" : ""}" data-service-id="${id}">
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
  const price = service.min_price_rub == null ? t("Тарифы в боте") : "от " + money(service.min_price_rub) + " ₽";
  const details = [];
  if (service.devices_limit) details.push(service.devices_limit + t(" устр."));
  if (service.countries_count) details.push(service.countries_count + t(" стран"));
  if (service.trial_days) details.push(t("Тест ") + service.trial_days + t(" дн."));
  return `<article class="vpn-card" data-service="${id}">
    <div class="vpn-card-top">
      <div class="service-mark">${esc((displayServiceName(service) || "V").slice(0, 1))}</div>
      <div class="service-title"><h3>${esc(displayServiceName(service))}</h3><div class="service-price">${price}</div></div>
      <div class="card-tools">
        <button class="round-action ${favorite ? "selected" : ""}" type="button" data-action="favorite" data-id="${id}" aria-label="${t("Избранное")}" aria-pressed="${favorite}">
          <svg viewBox="0 0 24 24"><path d="M20.8 8.8c0 5.1-8.8 10.2-8.8 10.2S3.2 13.9 3.2 8.8A4.5 4.5 0 0 1 12 6.5a4.5 4.5 0 0 1 8.8 2.3Z"></path></svg>
        </button>
        <button class="round-action ${compared ? "selected" : ""}" type="button" data-action="compare" data-id="${id}" aria-label="${t("Сравнить")}" aria-pressed="${compared}">
          <svg viewBox="0 0 24 24"><path d="M5 7h14M5 17h14M9 3 5 7l4 4M15 13l4 4-4 4"></path></svg>
        </button>
      </div>
    </div>
    ${details.length ? `<div class="vpn-tags">${details.map(item => `<span class="vpn-tag">${esc(item)}</span>`).join("")}</div>` : ""}
    <div class="vpn-card-bottom">
      <button class="connect-button" type="button" data-action="connect" data-id="${id}">${t("Подключить")}</button>
      ${context !== "catalog" ? `<button class="remove-button" type="button" data-action="remove-${context}" data-id="${id}">${t("Убрать")}</button>` : ""}
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
    toggleCatalog.textContent = state.catalogExpanded ? t("Свернуть") : t("Посмотреть все");
    toggleCatalog.setAttribute("aria-expanded", String(state.catalogExpanded));
  }
  const list = byId("provider-list");
  if (!items.length) {
    list.innerHTML = `<div class="empty-state"><h3>${t("Ничего не найдено")}</h3></div>`;
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
    : `<div class="empty-state"><h3>${t("Пусто")}</h3><button class="primary-button" type="button" data-go="catalog">${t("Каталог")}</button></div>`;
  updateCounts();
}
function renderCompare() {
  const items = state.services.filter(service => state.compare.has(service.id));
  if (!items.length) {
    byId("compare-list").innerHTML = `<div class="empty-state"><h3>${t("Выберите сервисы")}</h3><button class="primary-button" type="button" data-go="catalog">${t("Каталог")}</button></div>`;
    updateCounts();
    return;
  }
  const rows = [
    [t("Цена"), service => service.min_price_rub == null ? t("В боте") : t("от ") + money(service.min_price_rub) + " ₽"],
    [t("Устройства"), service => service.devices_limit ? service.devices_limit : t("Нет данных")],
    [t("Страны"), service => service.countries_count ? service.countries_count + "+" : t("Нет данных")],
  ];
  byId("compare-list").innerHTML = `
    <div class="compare-table-wrap"><table class="compare-table">
      <thead><tr><th></th>${items.map(service => `<th><span>${esc(displayServiceName(service))}</span><button type="button" data-action="remove-compare" data-id="${esc(service.id)}" aria-label="${t("Убрать")}">×</button></th>`).join("")}</tr></thead>
      <tbody>${rows.map(([label, getter]) => `<tr><th>${label}</th>${items.map(service => `<td>${esc(getter(service))}</td>`).join("")}</tr>`).join("")}</tbody>
    </table></div>`;
  updateCounts();
}

function updateCounts() {
  const favoritesCount = byId("favorites-count");
  const compareCount = byId("compare-count");
  if (favoritesCount) favoritesCount.textContent = state.favorites.size;
  if (compareCount) compareCount.textContent = state.compare.size;
}
function toggleSet(set, key, id) {
  if (set.has(id)) set.delete(id); else set.add(id);
  saveSet(key, set);
  updateCounts();
}
async function openReferral(service) {
  if (!service?.id || !tg?.initData) return;
  try {
    await syncTelegramProfile();
    if (!profileReady) throw new Error("Telegram profile is not ready");
    analyticsToken = analyticsSessionToken();
    const response = await fetch(SUPABASE_URL + "/functions/v1/affiliate-redirect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        initData: tg.initData, session_token: analyticsToken, service_id: service.id,
        source: new URLSearchParams(window.location.search).get("utm_source") || "telegram",
        medium: new URLSearchParams(window.location.search).get("utm_medium") || "miniapp",
        campaign: new URLSearchParams(window.location.search).get("utm_campaign") || "",
        referrer_host: (() => { try { return document.referrer ? new URL(document.referrer).hostname : ""; } catch (_) { return ""; } })()
      })
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.ok || !result.url) throw new Error("Referral redirect failed");
    if (typeof result.url !== "string" || !result.url.startsWith("https://")) throw new Error("Unsafe referral destination");
    trackEvent("connect_click", { click_id: result.click_id }, service.id);
    if (/^https:\/\/(t\.me|telegram\.me)(\/|\?|#|$)/i.test(result.url)) tg.openTelegramLink(result.url);
    else tg.openLink(result.url);
  } catch (_) {
    try { tg?.showAlert?.(t("Не удалось открыть партнёрскую ссылку. Попробуйте ещё раз.")); } catch (_) {}
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
    const list = byId("provider-list");
    const currentCard = button.closest(".service-list-card");
    const wasExpanded = state.expandedServiceId === service.id;

    // Update only the two affected cards; keep every other card and avatar in the DOM.
    if (state.expandedServiceId) {
      const previousCard = list.querySelector(`.service-list-card[data-service-id="${CSS.escape(state.expandedServiceId)}"]`);
      if (previousCard && previousCard !== currentCard) {
        previousCard.classList.remove("expanded");
        previousCard.querySelector(".service-mini-card")?.setAttribute("aria-expanded", "false");
        previousCard.querySelector(".service-detail-panel")?.remove();
      }
    }

    if (wasExpanded) {
      currentCard?.classList.remove("expanded");
      currentCard?.querySelector(".service-detail-panel")?.remove();
      button.setAttribute("aria-expanded", "false");
      state.expandedServiceId = null;
    } else {
      currentCard?.classList.add("expanded");
      button.setAttribute("aria-expanded", "true");
      trackEvent("service_view", {}, service.id);
      button.insertAdjacentHTML("afterend", serviceDetails(service));
      state.expandedServiceId = service.id;
    }
    return;
  }
  if (action === "connect") openReferral(service);
  if (action === "favorite") {
    const removing = state.favorites.has(service.id);
    toggleSet(state.favorites, "vpn-finder-favorites", service.id);
    trackEvent(removing ? "favorite_remove" : "favorite_add", {}, service.id);
    renderCatalog(); renderFavorites();
  }
  if (action === "compare") {
    const removing = state.compare.has(service.id);
    toggleSet(state.compare, "vpn-finder-compare", service.id);
    trackEvent(removing ? "compare_remove" : "compare_add", {}, service.id);
    renderCatalog(); renderCompare();
  }
  if (action === "remove-favorites") {
    toggleSet(state.favorites, "vpn-finder-favorites", service.id);
    trackEvent("favorite_remove", {}, service.id);
    renderFavorites(); renderCatalog();
  }
  if (action === "remove-compare") {
    toggleSet(state.compare, "vpn-finder-compare", service.id);
    trackEvent("compare_remove", {}, service.id);
    renderCompare(); renderCatalog();
  }
});

async function loadServices() {
  const list = byId("provider-list");
  list.innerHTML = `<div class="loading-state"><svg class="loader-shield" viewBox="0 0 24 24" role="img" aria-label="${t("Загрузка")}"><path class="shield-outline" d="M12 2.8 20 6v5.2c0 5-3.2 8.2-8 10-4.8-1.8-8-5-8-10V6l8-3.2Z"></path><path class="shield-check" d="m8.5 11.8 2.3 2.3 4.8-4.8"></path></svg></div>`;
  try {
    const url = SUPABASE_URL + "/rest/v1/vpn_services?select=id,slug,name,referral_url,logo_url,description,min_price_rub,devices_limit,countries_count,trial_days,traffic_limit,platforms,plans,features,status,sort_order&status=eq.active&order=sort_order.asc";
    const response = await fetch(url, { headers: { apikey: SUPABASE_KEY } });
    if (!response.ok) throw new Error("Catalog request failed");
    state.services = await response.json();
    state.featuredIds = state.services.slice(0, 4).map(service => service.id);
    renderCatalog();
    updateCounts();
  } catch (_) {
    list.innerHTML = `<div class="empty-state"><h3>${t("Не удалось загрузить")}</h3><button class="primary-button" type="button" id="retry-load">${t("Повторить")}</button></div>`;
    byId("retry-load")?.addEventListener("click", loadServices);
  }
}

async function sendProfileInbox(kind, form, statusId) {
  const status = byId(statusId);
  const button = form.querySelector('button[type="submit"]');
  if (!tg?.initData) {
    status.textContent = t("Откройте приложение через Telegram, чтобы отправить сообщение.");
    return;
  }
  button.disabled = true;
  status.textContent = t("Отправляем…");
  try {
    const fields = Object.fromEntries(new FormData(form).entries());
    const response = await fetch(SUPABASE_URL + "/functions/v1/miniapp-inbox", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData: tg.initData, kind, fields, language: appLanguage })
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.ok) throw new Error("Delivery failed");
    status.textContent = t("Сообщение отправлено.");
    trackEvent(kind === "contact" ? "contact_submit" : "provider_submit", {});
    form.reset();
  } catch (_) {
    status.textContent = t("Не удалось отправить. Попробуйте ещё раз.");
  } finally {
    button.disabled = false;
  }
}
byId("contact-form")?.addEventListener("submit", event => {
  event.preventDefault();
  sendProfileInbox("contact", event.currentTarget, "contact-status");
});
byId("provider-form")?.addEventListener("submit", event => {
  event.preventDefault();
  sendProfileInbox("provider", event.currentTarget, "provider-status");
});

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