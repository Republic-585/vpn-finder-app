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
const ANALYTICS_OWNER_TELEGRAM_ID = 7838131644;
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
  const menuRow = byId("analytics-menu-row");
  const currentTelegramId = Number(tg?.initDataUnsafe?.user?.id || 0);
  if (menuRow) menuRow.hidden = currentTelegramId !== ANALYTICS_OWNER_TELEGRAM_ID;
  if (currentTelegramId !== ANALYTICS_OWNER_TELEGRAM_ID) {
    if (root) root.textContent = t("Нет доступа к аналитике.");
    return;
  }
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
    const keyEventNames = {
      app_open: "Открытие приложения",
      service_view: "Просмотр сервиса",
      connect_click: "Переход по ссылке",
      contact_submit: "Сообщение отправлено",
      provider_submit: "Заявка отправлена"
    };
    const formatAnalyticsDateTime = value => {
      const date = new Date(value);
      if (!Number.isFinite(date.getTime())) return { time: "—", date: "—" };
      const time = new Intl.DateTimeFormat("ru-RU", {
        timeZone: "Europe/Moscow", hour: "2-digit", minute: "2-digit", hourCycle: "h23"
      }).format(date);
      const day = new Intl.DateTimeFormat("ru-RU", {
        timeZone: "Europe/Moscow", day: "2-digit", month: "2-digit", year: "numeric"
      }).format(date);
      return { time, date: day };
    };
    const eventItems = (result.events || []).filter(item => keyEventNames[item.event_name]).slice(0, 20);
    const clickItems = (result.clicks || []).slice(0, 25);
    const userItems = (result.users || []).slice(0, 25);
    const usersByTelegramId = new Map(userItems.map(item => [String(item.telegram_id), item]));
    const userRows = userItems.map(item => {
      const profile = item.profile || {};
      const display = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "—";
      const stamp = formatAnalyticsDateTime(item.last_seen_at);
      return '<article class="analytics-list-item"><div class="analytics-list-main"><strong>' + esc(display) + '</strong><span>' + esc(profile.username ? "@" + profile.username : String(item.telegram_id || "—")) + '</span></div><div class="analytics-list-meta"><span>' + t("Источник") + ': ' + esc(item.source || "—") + '</span><time><span>' + stamp.time + '</span><span>' + stamp.date + '</span></time></div></article>';
    }).join("");
    const clickRows = clickItems.map(item => {
      const user = usersByTelegramId.get(String(item.telegram_id)) || {};
      const profile = user.profile || item.profile || {};
      const display = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || item.user_name || "—";
      const username = String(profile.username || item.username || "").replace(/^@/, "");
      const userLink = username
        ? '<a class="analytics-user-link" href="https://t.me/' + encodeURIComponent(username) + '" target="_blank" rel="noopener noreferrer">@' + esc(username) + '</a>'
        : '<span class="analytics-user-link-muted">—</span>';
      const stamp = formatAnalyticsDateTime(item.clicked_at);
      return '<article class="analytics-list-item analytics-click-item"><div class="analytics-list-main"><strong>' + esc(services.get(item.service_id) || item.service_name || item.service_id || "—") + '</strong><span>' + esc(display) + '</span><span>' + userLink + '</span></div><time class="analytics-list-time"><span>' + stamp.time + '</span><span>' + stamp.date + '</span></time></article>';
    }).join("");
    const eventRows = eventItems.map(item => {
      const stamp = formatAnalyticsDateTime(item.occurred_at);
      return '<article class="analytics-list-item"><div class="analytics-list-main"><strong>' + t(keyEventNames[item.event_name]) + '</strong><span>' + esc(String(item.telegram_id || "—")) + (item.service_id ? ' · ' + esc(services.get(item.service_id) || item.service_id) : '') + '</span></div><time class="analytics-list-time"><span>' + stamp.time + '</span><span>' + stamp.date + '</span></time></article>';
    }).join("");
    root.innerHTML =
      '<div class="analytics-summary">' +
      '<article><strong>' + userItems.length + '</strong><span>' + t("Пользователи") + '</span></article>' +
      '<article><strong>' + Number(summary.sessions || 0) + '</strong><span>' + t("Сессии") + '</span></article>' +
      '<article><strong>' + Number(summary.clicks || 0) + '</strong><span>' + t("Партнёрские переходы") + '</span></article>' +
      '</div>' +
      '<details class="analytics-disclosure"><summary><span>' + t("Пользователи") + '</span><span class="analytics-disclosure-count">' + userItems.length + '</span></summary><div class="analytics-list">' + (userRows || '<p class="analytics-empty">—</p>') + '</div></details>' +
      '<section class="analytics-section"><h2>' + t("Партнёрские переходы") + '</h2><div class="analytics-list analytics-clicks">' + (clickRows || '<p class="analytics-empty">—</p>') + '</div></section>' +
      '<details class="analytics-disclosure"><summary><span>' + t("Ключевые события") + '</span><span class="analytics-disclosure-count">' + eventItems.length + '</span></summary><div class="analytics-list">' + (eventRows || '<p class="analytics-empty">—</p>') + '</div></details>';
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
    "Переходы":"Clicks","Последние события":"Recent events","Пользователи":"Users","Источники":"Sources","Ключевые события":"Key events","Открытие приложения":"App opened","Просмотр сервиса":"Service viewed","Переход по ссылке":"Affiliate link opened","Сообщение отправлено":"Message sent","Заявка отправлена":"Provider request sent",
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
function navHaptic() {
  try {
    const feedback = tg?.HapticFeedback;
    if (typeof feedback?.impactOccurred === "function") feedback.impactOccurred("light");
    else feedback?.selectionChanged?.();
  } catch (_) {}
}
let moveIndicator = () => {};
function showScreen(name) {
  if (name === "analytics" && Number(tg?.initDataUnsafe?.user?.id || 0) !== ANALYTICS_OWNER_TELEGRAM_ID) return;
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
  // Keep the detached profile ring blue only while the Profile tab is selected.
  byId("profile-nav-button")?.classList.toggle("is-current", name === "profile");
  moveIndicator();
  if (!alreadyActive) navHaptic();
  if (name === "analytics") loadAnalyticsDashboard();
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (name === "favorites") renderFavorites();
  if (name === "compare") renderCompare();
  if (name === "profile") { syncTelegramProfile(); if (!analyticsAccessChecked) loadAnalyticsDashboard(); }
  const isProfileSubscreen = ["news", "contact", "owners", "analytics"].includes(name);
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
    if (active) {
      indicator.hidden = false;
      setIndicator(active.offsetLeft, active.offsetWidth);
    } else {
      indicator.hidden = true;
    }
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

// Explicit press state for iOS Safari, where :active can be unreliable in embedded apps.
const profileNavButton = byId("profile-nav-button");
if (profileNavButton) {
  const dock = profileNavButton.closest(".bottom-nav-dock");
  const setProfilePressed = pressed => {
    profileNavButton.classList.toggle("is-pressed", pressed);
    dock?.classList.toggle("profile-press-active", pressed);
  };
  profileNavButton.addEventListener("pointerdown", () => setProfilePressed(true));
  ["pointerup", "pointercancel", "pointerleave", "blur"].forEach(type => {
    profileNavButton.addEventListener(type, () => setProfilePressed(false));
  });
}
byId("profile-shortcut")?.addEventListener("click", () => showScreen("profile"));

let profileReady = false;
let profileSyncPromise = null;

function renderTelegramProfile(profile) {
  const name = byId("profile-name");
  const photo = byId("profile-photo");
  const fallback = byId("profile-avatar-fallback");
  const navPhoto = byId("profile-nav-photo");
  const navFallback = byId("profile-nav-fallback");
  name.textContent = profile.display_name || t("Пользователь");
  const initial = (profile.first_name || "V").slice(0, 1).toLocaleUpperCase("ru-RU");
  fallback.textContent = initial;
  if (navFallback) navFallback.textContent = initial;

  if (profile.photo_url) {
    if (navPhoto) {
      navPhoto.onerror = () => { navPhoto.hidden = true; if (navFallback) navFallback.hidden = false; };
      navPhoto.onload = () => { navPhoto.hidden = false; if (navFallback) navFallback.hidden = true; };
      navPhoto.src = profile.photo_url;
    }
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
    if (navPhoto) { navPhoto.removeAttribute("src"); navPhoto.hidden = true; }
    if (navFallback) navFallback.hidden = false;
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
    if (state.filter === "free") return false;
    return true;
  });
}

const serviceAvatars = {
  "VPN-001": "https://cdn4.telesco.pe/file/j46QtYOOiQPQt2e5sJdYCqT9Y5rx9nvUsxV5Co1yk_3QMoIXgsbgPnifxh6wYahHCf3a0uPnSADmYRwrILknFOmpjLwpSrpldyD6AfJwWTS9vfJ_g_q91jj-geaVjGIwo8DXwE1b3Lco9jbNOOMddhXI-bJ_7MLqc2UGRtnd9DM-X8bujPG0OCrv5C4fLs9l2aMtVzRrf8mp7DU4KcSO0yrapLvn1X58KKjAAilZOFoT0RoKmhQh8BsQj3AFdV1M_csgQ4taBli6q7y1cPnlnYtcvGMgechq4OzAIb94UbuTBVNVIVQGxv-r24IQcutSm_DYInIrdRvDSyGnoUakoQ.jpg",
  "VPN-002": "https://cdn4.telesco.pe/file/ehp8fYyDFuBitN9x8A4gavi--vbavvJdNd_r5_t105Jtt7NlVaDSh7tXUmU99TAZcew1PGSssPuLPC6_sNEBp8MsZlDjud-ua3mnqqHAJNr019vlAV6b7v3Xl39t0uH0vdKfXyhig6NUCJBc-wpYVuYPiZlGz_7u3d5WA0WC4tOTl8NO_SMidnw3q6aiZTzPNgUkzn2HFLy0_GlXWVVTceLUD5sMrzgBhElIk4fnAX4MqX3Bnp7MOUMpVs65eq6IPf79D_N_m0XxMcjDIkOgP_NW91grdAx5RCmeWrhI4oTnqVhpJBNQKo52Axq1AXLCTVj-Ne42L2T1FLPvevABqQ.jpg",
  "VPN-003": "https://cdn4.telesco.pe/file/K4rdDvH4jNZqSQ2BCFAEfI9tYhm1JuKlHDJSIqX-Pug7P1pbU2-euIbmb9t8grRl0mEueCf29Azt-8kC9re2nFcvVDzK_mmlRqFER8FU8IEVHymVirHTz4VRdQR8n0qqgL4c4I-kh6AakwX-DMWu_I8s9SB8u2KTULJw9qbMtF7mnV7NY6XeGj7NlQ2BBbZ2_xoU2NtLeGmDmZZPYWDfGN-mzqvagH06AteXdSLRgSaq1okT3U0-Z-AQCNjTuvmlxmIy5BKJhFvbcRrJMmC_DGVbb7dm_geyWc04-IgfCArfSsFT5an__mtrJDRb9_favTTJov2B1RSZCRWG95R63w.jpg",
  "VPN-004": "https://cdn4.telesco.pe/file/RwycPB0WAQtCY-ED4aJXcLqeKViuo_1wJumK66F8ISOKsLfS7sZSLNpT747zdT_6S4h9nCkIxPGYZGieDqIGqwLtl14quARW63Hdsbjf3qboTz3r_O4Q-8ifXmoWFuN-38UJhjQ0YVsKgNBls23h5wSm00lVJ3xnbjr7mO0l6t2fE2IwJNMoTPqAQMoWFInpAriERJWcI6b1UvF1wQCc7FgmJF3Z54Y3YWd_OhNZUU_PuvlcJhOGV9dOtuIZtK13KIZBeInXAEJ810LX1xpUNW1Ok04sCYVxt4rNJG8jMIBqjRxwDAYyUs04stjNnwJuQCKmdFHMzLuMIQvXNSc-Ag.jpg",
  "VPN-005": "https://cdn4.telesco.pe/file/GskBphrTLR1VGSEizlFuYJ8rUgRCqc-F_YBDNNU0Scoi-4hi8Ls63vVVRiqih-uT864su19WkR6nlLj3oc1TS6PdakkoIMML4hh3svE19fjsvEnculX0RUl35W8z1-UDGG3rvWst5Gkx7G_s0T7NaKMpBCCfFIQzq5D_RVroQIf0IEQn_H3Dn0804HblnQwNDexFUJvjOLia5I4w5AiQZQD047FY_cY-_d4HYx-Ns3XdTct9hoqmD2HSPUVeuAGCbO1dfCIz-_g8w2kmEr4cV6X74-8Xgnl_6rkOQ9DHwkGqBVuZfv5-mTXn0hx6LX51hDLoPXOJx4Y9iAtO1wyFIA.jpg",
  "VPN-006": "https://cdn4.telesco.pe/file/P423oxCFR5L-Hh1qLUgjRny3J17I8AU86gioX5qhjp7NfV2r6kVx40zJf4-qyzPW_4q_ys0v04HPlgBiYGNIu1AO79zzuLDHamUDOIIzER_ByX43WIm5J2BaieLAcuB4GfdpZBpYWiJWfrqWOoynj-8Rdos5O7aQ6ER5kQA1raEUN1ORcMwxmxuZFsmeyiv_v6YCdcDC5T_9ZkMjuqF4bu1cvEsJFj8UQmm9ESg3N3B_7PjhNSRh4F27PP637XJ-L5UAD5N0S-gmnkBMX2MRFdzfttW9Zpk-zM5KvY2UwLUWduylVEk2n_Vc9a8Z7zZv9Tu3AujZtZc4MQJpx-fBxQ.jpg",
  "VPN-007": "https://cdn4.telesco.pe/file/T5-2LHFeRt3_K1MGe8oNjzHp_F-1qNF5DjoF4zFXsPWdbfRuGTGXYpKXmCynAmAZGSYLwSloeoy8BiAeMw2ham5VLFNP8GI-C-e3nYXwono3Px1g79rPZybdzYg8JXH5dcJLtumheG1TTrT70srKMihcC8g7IcdYv7Kxk4GURXJavK2SWSv75vAuIQqg9Qs-qaX7wMkSUD_FhYaGmybREDtzCLF4k8klFnr0LcioRnceMKpm1Ij9PmFQSgw2GFwx6uaYYOV2a6-_lvG7p2srBUVaYYC5qL3PH54VRctBKFtlQ2eAj8I8y7mr_NYbYvF8lWyeNRgM7bSyjRkoIDJRDw.jpg",
  "VPN-008": "https://cdn4.telesco.pe/file/G8AyrXHSsWQ-KLq7L4B7HnffPHRAgbepl2AzgRPXkoKuyCzMjQ0GAVP2NfCoHuVTvHS0koqqcgvI4IBY2-mcde-Rj6EEOzjbyqDE9qD1dLX4DuEW1672zySb5wpanOS1mXYcnRjXkmVZy9SonuatMxdAzqzjKg5nkfPkwQjNJHGU31VnWHnxqyA-WKs-4U5EJzjev0tD4xWfluQbX3bhrKfX222dEwv75E5FxWdTBX0R6yKOJUk_gDey4qwcZaGwtKYfOkInkXtolmD2TM_soGbGMIFDY7CkmOZ-a125VEOgW7xWjGmvXNoO0XOcTYrH6KCLmaibvntMHUfRREwZBA.jpg",
  "VPN-009": "https://gotbot.cc/branding/logo-white.png",
  "VPN-010": "https://cdn1.telesco.pe/file/an8T7RztDFxWIPC1bUqihI9w0cR56kzCl0M3ei5nhWLqvY6jVzmf81ZXxYesBVfe-LBtNYYoo8QJv6MxkelFUoRucqRPtFdPuB_ER7t4AnWFuG_YyyOc1le6ewnT2A-tF-9FJ0Nvo1DT1oPxLzBvUN0Q2_j9Au6HDU4pII1_drJ4WaYh7YMQ5VkRrqMlKDRUMx4U2ZMBElx9dlMLIlyocYATg-BPJWJEzpoperOk_C9abbWKaj_MUUA0zFWhWidrXTgKzzdDSQmTxl_lG9JYcb3HfmDHIER1NjDgb0yd7LEE90viqtmsHKhegT6rWpyS62l-KtHXbjcKd4DuuQLIiA.jpg"
};
function serviceAvatar(service, className = "service-avatar", prioritize = false) {
  const fallbackUrl = serviceAvatars[service.id] || "";
  const databaseUrl = typeof service.logo_url === "string" && /^https:\/\//i.test(service.logo_url.trim())
    ? service.logo_url.trim()
    : "";
  const url = databaseUrl || fallbackUrl;
  const initial = esc((displayServiceName(service) || "V").slice(0, 1).toUpperCase());
  if (!url) return `<span class="${className} avatar-frame"><span class="avatar-fallback">${initial}</span></span>`;
  const fallback = fallbackUrl && fallbackUrl !== url ? fallbackUrl : "";
  return `<span class="${className} avatar-frame" aria-hidden="true">
    <span class="avatar-fallback">${initial}</span>
    <img class="avatar-image" src="${esc(url)}" data-fallback="${esc(fallback)}" alt="" width="64" height="64"
      loading="eager" fetchpriority="${prioritize ? "high" : "low"}" decoding="async"
      onload="this.classList.add('is-loaded')"
      onerror="if(this.dataset.fallback&&!this.dataset.fallbackUsed){this.dataset.fallbackUsed='1';this.src=this.dataset.fallback}else{this.remove()}">
  </span>`;
}


function serviceDetails(service, hideFavoriteAction = false) {
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
  const favorite = state.favorites.has(service.id);
  return `<div class="service-detail-panel">
    ${hideFavoriteAction ? "" : `<div class="service-detail-actions"><button class="service-detail-favorite ${favorite ? "is-favorite" : ""}" type="button" data-action="favorite-detail" data-id="${esc(service.id)}" aria-label="${favorite ? t("Убрать") : t("Избранное")}" aria-pressed="${favorite}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 8.8c0 5.1-8.8 11-8.8 11s-8.8-5.9-8.8-11A4.8 4.8 0 0 1 12 6.1a4.8 4.8 0 0 1 8.8 2.7Z"></path></svg></button></div>`}
    ${service.description ? `<p class="service-detail-description">${esc(service.description)}</p>` : ""}
    ${facts.length ? `<div class="service-detail-facts">${facts.map(([label,value]) => `<div class="service-detail-fact"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join("")}</div>` : ""}
    ${platforms.length ? `<div class="service-detail-group"><span class="service-detail-label">${t("Платформы")}</span><div class="service-detail-chips">${platforms.map(item => `<span>${esc(item)}</span>`).join("")}</div></div>` : ""}
    ${payments.length ? `<div class="service-detail-group"><span class="service-detail-label">${t("Оплата")}</span><div class="service-detail-chips">${payments.map(item => `<span>${esc(item)}</span>`).join("")}</div></div>` : ""}
    ${features.length ? `<div class="service-detail-group"><span class="service-detail-label">${t("Возможности")}</span><div class="service-detail-chips">${features.map(item => `<span>${esc(item)}</span>`).join("")}</div></div>` : ""}
    <button class="connect-button service-detail-connect" type="button" data-action="connect" data-id="${esc(service.id)}">${t("Подключить")}</button>
  </div>`;
}
function serviceMiniCard(service, index = 0) {
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
      ${serviceAvatar(service, "service-avatar", index < 4)}
      <span class="service-mini-copy"><span class="service-mini-name">${esc(displayServiceName(service))}</span><span class="service-mini-subtitle">${compactFacts.map(item => `<span>${esc(item)}</span>`).join('<span class="service-mini-dot">·</span>')}</span></span>
      <svg class="service-mini-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"></path></svg>
    </button>
    ${expanded ? serviceDetails(service) : ""}
  </article>`;
}
function serviceFeaturedItem(service) {
  const id = esc(service.id);
  return `<button class="popular-service" type="button" data-action="connect" data-id="${id}">
    ${serviceAvatar(service, "popular-avatar", true)}
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
  const expanded = context === "favorites" && state.expandedServiceId === service.id;
  return `<article class="vpn-card ${expanded ? "expanded" : ""}" data-service="${id}" ${context === "favorites" ? `data-action="toggle-favorite-details" data-id="${id}"` : ""}>
    <div class="vpn-card-top">
      ${serviceAvatar(service, "service-avatar", true)}
      <div class="service-title"><h3>${esc(displayServiceName(service))}</h3><div class="service-price">${price}</div></div>
      ${context === "catalog" ? `<div class="card-tools">
        <button class="round-action ${favorite ? "selected" : ""}" type="button" data-action="favorite" data-id="${id}" aria-label="${t("Избранное")}" aria-pressed="${favorite}">
          <svg viewBox="0 0 24 24"><path d="M20.8 8.8c0 5.1-8.8 10.2-8.8 10.2S3.2 13.9 3.2 8.8A4.5 4.5 0 0 1 12 6.5a4.5 4.5 0 0 1 8.8 2.3Z"></path></svg>
        </button>
        <button class="round-action ${compared ? "selected" : ""}" type="button" data-action="compare" data-id="${id}" aria-label="${t("Сравнить")}" aria-pressed="${compared}">
          <svg viewBox="0 0 24 24"><path d="M5 7h14M5 17h14M9 3 5 7l4 4M15 13l4 4-4 4"></path></svg>
        </button>
      </div>` : context === "favorites" ? `<button class="round-action favorites-favorite-action selected" type="button" data-action="favorite" data-id="${id}" aria-label="${t("Избранное")}" aria-pressed="true">
        <svg viewBox="0 0 24 24"><path d="M20.8 8.8c0 5.1-8.8 10.2-8.8 10.2S3.2 13.9 3.2 8.8A4.5 4.5 0 0 1 12 6.5a4.5 4.5 0 0 1 8.8 2.3Z"></path></svg>
      </button>` : ""}
    </div>
    ${details.length ? `<div class="vpn-tags">${details.map(item => `<span class="vpn-tag">${esc(item)}</span>`).join("")}</div>` : ""}
    ${context === "favorites" ? (!expanded ? `<div class="vpn-card-bottom favorites-card-actions">
      <button class="connect-button" type="button" data-action="connect" data-id="${id}">${t("Подключить")}</button>
    </div><button class="favorites-card-toggle" type="button" data-action="toggle-favorite-details" data-id="${id}" aria-label="${t("Возможности")}" aria-expanded="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"></path></svg></button>` : "") : `<div class="vpn-card-bottom">
      <button class="connect-button" type="button" data-action="connect" data-id="${id}">${t("Подключить")}</button>
      ${context === "compare" ? `<button class="remove-button" type="button" data-action="remove-${context}" data-id="${id}">${t("Убрать")}</button>` : ""}
    </div>`}
    ${expanded ? serviceDetails(service, true) + `<button class="favorites-card-toggle is-expanded" type="button" data-action="toggle-favorite-details" data-id="${id}" aria-label="${t("Свернуть")}" aria-expanded="true"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"></path></svg></button>` : ""}
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
    list.innerHTML = `<div class="catalog-compact-list">${items.map((service, index) => serviceMiniCard(service, index)).join("")}</div>`;
    return;
  }
  if (!state.featuredIds.length) state.featuredIds = state.services.slice(0, 4).map(service => service.id);
  const featured = state.featuredIds.map(id => state.services.find(service => service.id === id)).filter(Boolean);
  if (state.catalogExpanded) {
    list.innerHTML = `<section class="popular-card"><div class="catalog-compact-list catalog-rest-list">${items.map((service, index) => serviceMiniCard(service, index)).join("")}</div></section>`;
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
  const root = byId("compare-list");
  if (root) root.innerHTML = "";
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
  if (action === "toggle-favorite-details") {
    const list = byId("favorites-list");
    const currentCard = button.closest(".vpn-card");
    const wasExpanded = state.expandedServiceId === service.id;

    // Update only the affected cards. Keeping the existing cards in the DOM
    // prevents every service avatar from restarting its image load.
    if (state.expandedServiceId) {
      const previousCard = list.querySelector(`.vpn-card[data-service="${CSS.escape(state.expandedServiceId)}"]`);
      if (previousCard && previousCard !== currentCard) {
        previousCard.classList.remove("expanded");
        previousCard.querySelector(".service-detail-panel")?.remove();
        const previousToggle = previousCard.querySelector(".favorites-card-toggle");
        previousToggle?.classList.remove("is-expanded");
        previousToggle?.setAttribute("aria-expanded", "false");
        previousToggle?.setAttribute("aria-label", t("Возможности"));
        const previousActions = previousCard.querySelector(".favorites-card-actions");
        if (previousActions) previousActions.hidden = false;
      }
    }

    const toggle = currentCard?.querySelector(".favorites-card-toggle");
    const actions = currentCard?.querySelector(".favorites-card-actions");
    if (wasExpanded) {
      currentCard?.classList.remove("expanded");
      currentCard?.querySelector(".service-detail-panel")?.remove();
      if (toggle) {
        toggle.classList.remove("is-expanded");
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", t("Возможности"));
      }
      if (actions) actions.hidden = false;
      state.expandedServiceId = null;
    } else {
      if (actions) actions.hidden = true;
      currentCard?.classList.add("expanded");
      if (toggle) {
        toggle.classList.add("is-expanded");
        toggle.setAttribute("aria-expanded", "true");
        toggle.setAttribute("aria-label", t("Свернуть"));
      }
      if (currentCard && toggle) {
        toggle.insertAdjacentHTML("beforebegin", serviceDetails(service, true));
      }
      state.expandedServiceId = service.id;
      trackEvent("service_view", {}, service.id);
    }
    return;
  }
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
  if (action === "favorite-detail") {
    toggleSet(state.favorites, "vpn-finder-favorites", service.id);
    const favorite = state.favorites.has(service.id);
    button.classList.toggle("is-favorite", favorite);
    button.setAttribute("aria-pressed", String(favorite));
    button.setAttribute("aria-label", favorite ? t("Убрать") : t("Избранное"));
    if (byId("screen-favorites")?.classList.contains("active")) renderFavorites();
    return;
  }
  if (action === "favorite") {
    const removing = state.favorites.has(service.id);
    toggleSet(state.favorites, "vpn-finder-favorites", service.id);
    renderCatalog(); renderFavorites();
  }
  if (action === "compare") {
    const removing = state.compare.has(service.id);
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