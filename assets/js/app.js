(() => {
document.addEventListener("gesturestart", event => event.preventDefault(), { passive: false });
document.addEventListener("gesturechange", event => event.preventDefault(), { passive: false });
document.addEventListener("touchmove", event => {
  if (event.touches.length > 1) event.preventDefault();
}, { passive: false, capture: true });
const tg = window.Telegram?.WebApp;
const ownerPromoNativeButton = tg?.BottomButton || tg?.MainButton || null;
let nativeButtonMode = "hidden";
function setNativeButton(mode) {
  nativeButtonMode = mode;
  if (!ownerPromoNativeButton) return;
  const labels = {
    "owner-promo": t("Добавить сервис"),
    "provider-submit": t("Отправить заявку"),
    "support-stars": t("Поддержать Stars"),
    "support-crypto": t("Скопировать адрес")
  };
  if (!labels[mode]) {
    ownerPromoNativeButton.hide();
    return;
  }
  try {
    ownerPromoNativeButton.setParams({
      text: labels[mode],
      color: tg?.themeParams?.button_color || "#3390EC",
      text_color: tg?.themeParams?.button_text_color || "#FFFFFF",
      has_shine_effect: true,
      is_progress_visible: false,
      is_active: true,
      is_visible: true
    });
  } catch (_) {}
}
function handleNativeButtonClick() {
  if (nativeButtonMode === "owner-promo") showScreen("owners", "owner-promo");
  else if (nativeButtonMode === "provider-submit") {
    const form = byId("provider-form");
    if (typeof form?.requestSubmit === "function") form.requestSubmit();
    else form?.querySelector('button[type="submit"]')?.click();
  }
  else if (nativeButtonMode === "support-stars") byId("support-pay-button")?.click();
  else if (nativeButtonMode === "support-crypto") byId("crypto-copy-address")?.click();
}
if (ownerPromoNativeButton) {
  try {
    ownerPromoNativeButton.setParams({
      text: "Добавить сервис",
      color: tg?.themeParams?.button_color || "#3390EC",
      text_color: tg?.themeParams?.button_text_color || "#FFFFFF",
      has_shine_effect: true,
      is_progress_visible: false,
      is_active: true,
      is_visible: false
    });
    ownerPromoNativeButton.onClick(handleNativeButtonClick);
  } catch (_) {}
}
const applyTelegramColors = () => {
  // Match Telegram's native chrome and the startup surface before hiding Telegram's loader.
  const appBg = "#202124";
  document.documentElement.style.setProperty("--bg", appBg);
  document.documentElement.style.setProperty("--tg-native-bg", appBg);
  document.documentElement.style.colorScheme = "dark";
  document.documentElement.style.backgroundColor = appBg;
  document.body.style.backgroundColor = appBg;
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) themeMeta.setAttribute("content", appBg);
  try {
    tg?.setHeaderColor(appBg);
    tg?.setBackgroundColor(appBg);
  } catch (_) {}
};
applyTelegramColors();
if (tg) {
  // Telegram may repaint its native header after a theme transition.
  // Reapply our fixed graphite color after the client finishes that update.
  const reapplyTelegramColors = () => {
    applyTelegramColors();
    window.requestAnimationFrame(() => {
      applyTelegramColors();
      window.setTimeout(applyTelegramColors, 100);
    });
  };
  tg.onEvent?.("themeChanged", reapplyTelegramColors);
  tg.onEvent?.("viewportChanged", applyTelegramColors);
  const syncTelegramFullscreenClass = () => {
    document.body.classList.toggle("telegram-fullscreen", Boolean(tg.isFullscreen));
  };
  tg.onEvent?.("fullscreenChanged", syncTelegramFullscreenClass);
  syncTelegramFullscreenClass();
  try { tg.expand(); } catch (_) {}
  // The static splash and first interface frame are already in the DOM.
  try { tg.ready(); } catch (_) {}
  // Ask Telegram for immersive fullscreen when the client supports Bot API 8.0+.
  try {
    if (typeof tg.requestFullscreen === "function" &&
        (typeof tg.isVersionAtLeast !== "function" || tg.isVersionAtLeast("8.0"))) {
      tg.requestFullscreen();
    }
  } catch (_) {}
  // Protect users from accidentally closing the Mini App.
  try {
    if (typeof tg.enableClosingConfirmation === "function") {
      tg.enableClosingConfirmation();
    }
  } catch (_) {}
}
const startupSplashStartedAt = performance.now();
let startupSplashFinished = false;
let startupCatalogReady = false;
let startupHapticTimer = null;
let startupHapticStage = 0;
const startupHapticLevels = ["soft", "medium", "heavy"];
const startupHapticDurations = [12, 22, 34];
const revealStartupApp = () => {
  if (startupSplashFinished) return;
  startupSplashFinished = true;
  if (startupHapticTimer) window.clearTimeout(startupHapticTimer);
  startupHapticTimer = null;
  const splash = document.getElementById("startup-splash");
  document.body.classList.add("app-ready");
  if (!splash) return;
  const entranceRemaining = Math.max(0, 560 - (performance.now() - startupSplashStartedAt));
  window.setTimeout(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        splash.classList.add("is-leaving");
        window.setTimeout(() => splash.remove(), 380);
      });
    });
  }, entranceRemaining);
};
const pulseStartupHaptic = () => {
  if (startupSplashFinished || document.visibilityState === "hidden") return;
  if (startupHapticStage >= 2 && !startupCatalogReady) {
    startupHapticTimer = null;
    return;
  }
  const level = startupHapticLevels[startupHapticStage];
  try {
    if (tg?.HapticFeedback?.impactOccurred) {
      tg.HapticFeedback.impactOccurred(level);
    } else if (typeof navigator.vibrate === "function") {
      navigator.vibrate(startupHapticDurations[startupHapticStage]);
    }
  } catch (_) {}
  startupHapticStage += 1;
  if (startupHapticStage === 3) {
    // The third, strongest pulse and the main-screen reveal happen together.
    revealStartupApp();
    return;
  }
  startupHapticTimer = window.setTimeout(pulseStartupHaptic, 420);
};
const startStartupHaptics = () => {
  if (startupHapticTimer || startupSplashFinished || startupHapticStage >= 3) return;
  pulseStartupHaptic();
};
const finishStartupSplash = () => {
  startupCatalogReady = true;
  if (startupHapticStage >= 2 && !startupHapticTimer) pulseStartupHaptic();
};

startStartupHaptics();
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && !startupSplashFinished && !startupHapticTimer) startStartupHaptics();
  else if (document.visibilityState === "hidden" && startupHapticTimer) {
    window.clearTimeout(startupHapticTimer);
    startupHapticTimer = null;
  }
});

const SUPABASE_URL = "https://januqesxribuqzmmmdun.supabase.co";
const SUPABASE_KEY = "sb_publishable_BaYxtXvRZCmfEzMHJbSCog_ebs4k6oK";
const SERVICE_RATINGS_URL = SUPABASE_URL + "/functions/v1/service-ratings";
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
  const loadingOverlay = document.createElement("div");
  loadingOverlay.className = "analytics-loading-overlay";
  loadingOverlay.setAttribute("role", "status");
  loadingOverlay.setAttribute("aria-label", "VPN Finder");
  loadingOverlay.innerHTML =
    '<div class="startup-splash-content">' +
      '<div class="startup-brand-mark" aria-hidden="true">' +
        '<svg viewBox="0 0 512 512" role="presentation" focusable="false">' +
          '<path d="M256 106 C278 116 329 139 378 151 C394 155 402 168 402 185 C402 292 365 362 273 399 C262 404 250 404 239 399 C147 362 110 292 110 185 C110 168 118 155 134 151 C183 139 234 116 256 106 Z"/>' +
          '<path d="M198 255 L247 304 L316 225"/>' +
        '</svg>' +
      '</div>' +
      '<div class="startup-brand-name">VPN Finder</div>' +
      '<div class="startup-loading" aria-hidden="true"><span></span></div>' +
    '</div>';
  document.body.appendChild(loadingOverlay);
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
      if (!Number.isFinite(date.getTime())) return { time: "-", date: "-" };
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
      const display = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "-";
      const stamp = formatAnalyticsDateTime(item.last_seen_at);
      return '<article class="analytics-list-item"><div class="analytics-list-main"><strong>' + esc(display) + '</strong><span>' + esc(profile.username ? "@" + profile.username : String(item.telegram_id || "-")) + '</span></div><div class="analytics-list-meta"><span>' + t("Источник") + ': ' + esc(item.source || "-") + '</span><time><span>' + stamp.time + '</span><span>' + stamp.date + '</span></time></div></article>';
    }).join("");
    const clickRows = clickItems.map(item => {
      const user = usersByTelegramId.get(String(item.telegram_id)) || {};
      const profile = user.profile || item.profile || {};
      const display = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || item.user_name || "-";
      const username = String(profile.username || item.username || "").replace(/^@/, "");
      const userLink = username
        ? '<a class="analytics-user-link" href="https://t.me/' + encodeURIComponent(username) + '" target="_blank" rel="noopener noreferrer">@' + esc(username) + '</a>'
        : '<span class="analytics-user-link-muted">-</span>';
      const stamp = formatAnalyticsDateTime(item.clicked_at);
      return '<article class="analytics-list-item analytics-click-item"><div class="analytics-list-main"><strong>' + esc(services.get(item.service_id) || item.service_name || item.service_id || "-") + '</strong><span>' + esc(display) + '</span><span>' + userLink + '</span></div><time class="analytics-list-time"><span>' + stamp.time + '</span><span>' + stamp.date + '</span></time></article>';
    }).join("");
    const eventRows = eventItems.map(item => {
      const stamp = formatAnalyticsDateTime(item.occurred_at);
      return '<article class="analytics-list-item"><div class="analytics-list-main"><strong>' + t(keyEventNames[item.event_name]) + '</strong><span>' + esc(String(item.telegram_id || "-")) + (item.service_id ? ' · ' + esc(services.get(item.service_id) || item.service_id) : '') + '</span></div><time class="analytics-list-time"><span>' + stamp.time + '</span><span>' + stamp.date + '</span></time></article>';
    }).join("");
    root.innerHTML =
      '<div class="analytics-summary">' +
      '<article><strong>' + userItems.length + '</strong><span>' + t("Пользователи") + '</span></article>' +
      '<article><strong>' + Number(summary.sessions || 0) + '</strong><span>' + t("Сессии") + '</span></article>' +
      '<article><strong>' + Number(summary.clicks || 0) + '</strong><span>' + t("Партнёрские переходы") + '</span></article>' +
      '</div>' +
      '<details class="analytics-disclosure"><summary><span>' + t("Пользователи") + '</span><span class="analytics-disclosure-count">' + userItems.length + '</span></summary><div class="analytics-list">' + (userRows || '<p class="analytics-empty">-</p>') + '</div></details>' +
      '<section class="analytics-section"><h2>' + t("Партнёрские переходы") + '</h2><div class="analytics-list analytics-clicks">' + (clickRows || '<p class="analytics-empty">-</p>') + '</div></section>' +
      '<details class="analytics-disclosure"><summary><span>' + t("Ключевые события") + '</span><span class="analytics-disclosure-count">' + eventItems.length + '</span></summary><div class="analytics-list">' + (eventRows || '<p class="analytics-empty">-</p>') + '</div></details>';
  } catch (_) {
    root.textContent = t("Не удалось загрузить аналитику.");
  } finally {
    loadingOverlay.remove();
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
    "Поиск":"Search","Очистить поиск":"Clear search","Популярный выбор":"Popular services","Добавьте VPN сервис":"Add your VPN service","в каталог":"to the directory","Подробнее":"Learn more","Добавьте ваш сервис":"Add your service","Расскажите о своём VPN — мы рассмотрим заявку для каталога Finder.":"Tell us about your VPN. We’ll review it for the Finder directory.","Добавить сервис":"Add service","Посмотреть все":"View all","Свернуть":"Show less",
    "Фильтры":"Filters","Все":"All","Бесплатно":"Free","Сравнение":"Compare","Избранное":"Favorites","Профиль":"Profile",
    "Загрузка профиля…":"Loading profile…","Не удалось загрузить профиль":"Could not load profile","Пользователь":"User","Откройте приложение через Telegram":"Open the app through Telegram",
    "Добавление Finder VPN на экран Домой":"Add Finder VPN to your Home Screen","Открывайте":"Open","в одно касание.":"with one tap.",
    "Добавьте":"Add","на экран Домой для быстрого доступа.":"to your Home Screen for quick access.",
    "Добавить на экран Домой":"Add to Home Screen","Скрыть":"Hide","Добавлено на экран Домой":"Added to Home Screen",
    "Finder VPN теперь можно открывать с домашнего экрана.":"You can now open Finder VPN from your Home Screen.",
    "Добавление на экран Домой не поддерживается на этом устройстве или в этой версии Telegram.":"Adding to the Home Screen is not supported on this device or this Telegram version.",
    "Не удалось добавить Finder VPN. Попробуйте ещё раз.":"Could not add Finder VPN. Please try again.",
    "Откройте Finder VPN в актуальной версии Telegram, чтобы добавить его на экран Домой.":"Open Finder VPN in the latest version of Telegram to add it to your Home Screen.",
    "Новости":"News","Связаться":"Contact us","Владельцам VPN":"For VPN providers","Каталог активно развивается":"The directory is growing",
    "Мы работаем над сервисом и пополняем каталог новыми VPN. Открыты к сотрудничеству с владельцами сервисов. Чтобы предложить свой VPN, отправьте заявку через форму «Владельцам VPN». После рассмотрения мы добавим сервис в каталог.":"We're improving the service and adding new VPNs to the directory. We welcome partnerships with VPN providers. To suggest your service, submit an application through the “For VPN providers” form. After review, we'll add it to the directory.","Напишите нам. Сообщение придёт владельцу VPN Finder.":"Send us a message. It will be delivered to the VPN Finder team.",
    "Ваше сообщение":"Your message","Напишите сообщение…":"Write your message…","Отправить сообщение":"Send message",
    "Добавьте свой сервис в каталог VPN Finder.":"Add your service to the VPN Finder directory.","Название сервиса":"Service name",
    "Название VPN":"VPN name","Официальный сайт":"Official website","Описание":"Description","Расскажите о сервисе":"Tell us about your service",
    "Контакт для связи":"Contact details","@username или email":"@username or email","Отправить заявку":"Submit request",
    "Finder":"Finder","Сравнить":"Compare","Каталог":"Directory","Ничего не найдено":"No results found","Пусто":"Nothing here yet",
    "Выберите сервисы":"Choose services","Цена":"Price","Цена -":"Price -","Устройства":"Devices","Страны":"Countries","Нет данных":"Not available",
    "В боте":"In bot","Убрать":"Remove","Подключить":"Connect","Тарифы в боте":"Plans in bot",
    "Стоимость":"Price","от ":"from ","Пробный период":"Free trial"," дн.":" days","Трафик":"Data",
    "Платформы":"Platforms","Оплата":"Payment","Возможности":"Features"," устр.":" devices"," стран":" countries",
    "Тест ":"Trial ","Без теста":"No trial","Тест -":"Trial -","Устр. -":"Devices -","Трафик -":"Data -",
    "Загрузка":"Loading","Не удалось загрузить":"Could not load","Повторить":"Try again",
    "Откройте приложение через Telegram, чтобы отправить сообщение.":"Open the app through Telegram to send a message.",
    "Отправляем…":"Sending…","Сообщение отправлено.":"Message sent.","Не удалось отправить. Попробуйте ещё раз.":"Could not send. Please try again.",
    "Поддержать проект":"Support the project","Сумма в Stars":"Amount in Stars","Оплатить ⭐ Stars":"Pay ⭐ Stars",
    "Или укажи другую сумму в Stars":"Or enter another amount in Stars","Ориентир вознаграждения владельцу по ставке Telegram $0,013 за 1 Star; рублёвый пересчёт по курсу ЦБ на 21.11.2026. Это не цена покупки Stars.":"Estimated owner reward at Telegram's rate of $0.013 per Star; RUB conversion uses the Central Bank rate on Nov 21, 2026. This is not the purchase price of Stars.",
    "Укажи любую сумму в Telegram Stars.":"Choose any amount in Telegram Stars.",
    "Спасибо за поддержку VPN Finder!":"Thank you for supporting VPN Finder!",
    "Введите целое число от 1 до 100 000 Stars.":"Enter a whole number from 1 to 100,000 Stars.",
    "Создаём счёт…":"Creating invoice…","Ожидаем подтверждение оплаты…":"Waiting for payment confirmation…",
    "Оплата прошла! Спасибо за поддержку VPN Finder.":"Payment complete! Thank you for supporting VPN Finder.",
    "Оплата отменена.":"Payment cancelled.","Не удалось открыть оплату. Попробуйте ещё раз.":"Could not open payment. Please try again.",
    "Откройте VPN Finder через Telegram, чтобы оплатить Stars.":"Open VPN Finder through Telegram to pay with Stars.",
    "Угостить чашкой кофе":"Buy the project a coffee",
    "Поддержи VPN Finder любой суммой в USDT. Минимум — 2,50 USDT (примерно от 200 ₽).":"Support VPN Finder with any amount of USDT. Minimum: 2.50 USDT (approximately 200 RUB or more).",
    "Сумма в USDT":"Amount in USDT","USDT · сеть TON":"USDT · TON network","Адрес для перевода":"Receiving address",
    "Скопировать сумму":"Copy amount","Скопировать адрес":"Copy address",
    "Перед отправкой проверь сеть: нужен именно USDT в TON. Криптоперевод не подтверждается автоматически и не выдаёт значок Stars-поддержки.":"Before sending, check the network: only USDT on TON is accepted. Crypto transfers are not verified automatically and do not grant the Stars supporter badge.",
    "Не удалось скопировать. Выдели значение и скопируй вручную.":"Could not copy. Select the value and copy it manually.",
    "Минимальная сумма — 2,50 USDT.":"Minimum amount is 2.50 USDT.",
    "Сумма скопирована.":"Amount copied.","Адрес скопирован.":"Address copied.",
    "Каталог Finder":"Finder directory","Добавить в каталог":"Add to directory",
    "Поддержать VPN Finder":"Support VPN Finder","Помоги проекту развиваться и делать поиск VPN удобнее.":"Help the project grow and make finding a VPN easier.",
    "Выбери сумму поддержки":"Choose an amount to support the project","Или введи свою сумму в Stars":"Or enter your own amount in Stars","Оплатить Stars":"Pay with Stars",
    "КРИПТОВАЛЮТА":"CRYPTOCURRENCY","USDT в сети TON":"USDT on TON network","Переведи любую удобную сумму на адрес ниже. Перед отправкой проверь сеть TON.":"Send any amount to the address below. Make sure you select the TON network before sending.",
    "Больше внимания вашему VPN":"Get more attention for your VPN","Добавьте сервис в каталог Finder и станьте заметнее для новых пользователей.":"Add your service to the Finder directory and reach more users.",
    "Оф сайт или ссылка ТГ":"Website or Telegram link","Сайт или ссылка на Telegram":"Website or Telegram link","@username, email или другой контакт":"@username, email, or another contact",
    "Топ":"Top","VPN Finder загружается":"VPN Finder is loading","Подробнее о размещении VPN-сервиса":"Learn more about listing your VPN","Закрыть баннер":"Close banner",
    "Разделы профиля":"Profile sections","Способ поддержки":"Support method","Варианты поддержки":"Support options","Основная навигация":"Main navigation",
    "Рейтинг ":"Rating "," из 5":" out of 5","Рейтинг пока не сформирован":"No rating yet","Поддержать Stars":"Support with Stars"
  }
};
let appLanguage = (() => {
  try {
    const saved = localStorage.getItem(LANGUAGE_KEY);
    return saved === "en" || saved === "ru" ? saved : (tg?.initDataUnsafe?.user?.language_code?.toLowerCase().startsWith("en") ? "en" : "ru");
  } catch (_) { return "ru"; }
})();
const t = value => translations[appLanguage]?.[value] || value;
const originalTextNodes = new WeakMap();
const originalAttributes = new WeakMap();
function translateStaticContent() {
  document.documentElement.lang = appLanguage;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    if (!originalTextNodes.has(node)) originalTextNodes.set(node, node.nodeValue);
    const original = originalTextNodes.get(node);
    const trimmed = original.trim();
    if (translations.en[trimmed]) node.nodeValue = original.replace(trimmed, t(trimmed));
  }
  document.querySelectorAll("[placeholder],[aria-label],[title]").forEach(el => {
    ["placeholder","aria-label","title"].forEach(attr => {
      const value = el.getAttribute(attr);
      if (!value) return;
      let originals = originalAttributes.get(el);
      if (!originals) { originals = {}; originalAttributes.set(el, originals); }
      if (!(attr in originals)) originals[attr] = value;
      if (translations.en[originals[attr]]) el.setAttribute(attr, t(originals[attr]));
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
  ratings: new Map(),
  ratingPending: new Set(),
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
function servicePriceText(service) {
  const amount = service.min_price ?? service.min_price_rub;
  if (amount == null || !Number.isFinite(Number(amount))) return null;
  const currency = String(service.price_currency || "RUB").toUpperCase();
  try {
    return new Intl.NumberFormat(appLanguage === "en" ? "en-US" : "ru-RU", {
      style: "currency", currency, currencyDisplay: "symbol",
      minimumFractionDigits: 0, maximumFractionDigits: 2
    }).format(Number(amount));
  } catch (_) {
    return money(amount) + " " + currency;
  }
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
const BACK_SCREENS = new Set(["news", "contact", "owners", "owner-promo", "analytics", "support"]);
let ownersBackScreen = "catalog";
function showScreen(name, backScreen = null) {
  document.documentElement.classList.toggle("profile-screen-active", name === "profile");
  document.body.classList.toggle("profile-screen-active", name === "profile");
  const supportMethod = document.querySelector("[data-support-tab].is-active")?.dataset.supportTab || "stars";
  const useNativeOwnerPromoButton = name === "owner-promo" && !!ownerPromoNativeButton;
  const useNativeProviderSubmitButton = name === "owners" && !!ownerPromoNativeButton;
  const useNativeSupportButton = name === "support" && !!ownerPromoNativeButton;
  document.body.classList.toggle("owner-promo-native-cta", useNativeOwnerPromoButton);
  document.body.classList.toggle("owners-native-cta", useNativeProviderSubmitButton);
  document.body.classList.toggle("owners-no-bottom-navigation", name === "owners");
  document.body.classList.toggle("support-native-cta", useNativeSupportButton);
  if (useNativeOwnerPromoButton) setNativeButton("owner-promo");
  else if (useNativeProviderSubmitButton) setNativeButton("provider-submit");
  else if (useNativeSupportButton) setNativeButton(supportMethod === "crypto" ? "support-crypto" : "support-stars");
  else setNativeButton("hidden");
  if (name === "owners") {
    const currentScreen = document.querySelector(".screen.active")?.dataset.screen;
    ownersBackScreen = backScreen || (currentScreen && currentScreen !== "owners" ? currentScreen : ownersBackScreen) || "catalog";
  }
  const promoScreen = byId("catalog-promo-screen");
  if (promoScreen && !promoScreen.hidden) {
    promoScreen.hidden = true;
    document.body.classList.remove("catalog-promo-open");
  }
  if (name === "analytics" && Number(tg?.initDataUnsafe?.user?.id || 0) !== ANALYTICS_OWNER_TELEGRAM_ID) return;
  const previousScreenName = document.querySelector(".screen.active")?.dataset.screen;
  const animateFromProfileMenu = previousScreenName === "profile" && BACK_SCREENS.has(name) && previousScreenName !== name;
  const alreadyActive = screens.some(screen => screen.dataset.screen === name && screen.classList.contains("active"));
  screens.forEach(screen => {
    screen.classList.remove("profile-menu-slide-in");
    screen.classList.toggle("active", screen.dataset.screen === name);
  });
  if (animateFromProfileMenu) {
    const destinationScreen = screens.find(screen => screen.dataset.screen === name);
    if (destinationScreen) {
      destinationScreen.classList.add("profile-menu-slide-in");
      // Keep the completed animation class until the next screen change to avoid replaying screen-in.
    }
  }
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
  const isProfileSubscreen = BACK_SCREENS.has(name);
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
  let draggingNav = false;
  let dragMoved = false;
  let startX = 0;
  let suppressNavClickUntil = 0;

  const setIndicator = (left, width) => {
    const inset = 5;
    indicator.style.width = Math.max(0, width - inset * 2) + "px";
    indicator.style.transform = `translateX(${left + inset}px)`;
  };
  const getNavItemBounds = item => {
    const navRect = navBar.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    return { left: itemRect.left - navRect.left, width: itemRect.width, center: itemRect.left + itemRect.width / 2 - navRect.left };
  };
  moveIndicator = () => {
    const active = nav.find(button => button.classList.contains("active"));
    if (active) {
      const bounds = getNavItemBounds(active);
      if (!bounds.width || !navBar.getBoundingClientRect().width) return;
      indicator.hidden = false;
      setIndicator(bounds.left, bounds.width);
    } else {
      indicator.hidden = true;
    }
  };
  const slideIndicatorToFinger = clientX => {
    const navRect = navBar.getBoundingClientRect();
    const points = nav.map(item => {
      const bounds = getNavItemBounds(item);
      return { left: bounds.left, width: bounds.width, center: bounds.center };
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

  const scheduleIndicatorLayout = () => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(moveIndicator));
  };
  scheduleIndicatorLayout();
  window.addEventListener("resize", scheduleIndicatorLayout);
  window.addEventListener("orientationchange", scheduleIndicatorLayout);
  tg?.onEvent?.("viewportChanged", scheduleIndicatorLayout);
  if (typeof ResizeObserver !== "undefined") {
    const navResizeObserver = new ResizeObserver(scheduleIndicatorLayout);
    navResizeObserver.observe(navBar);
    nav.forEach(item => navResizeObserver.observe(item));
  }
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
  tg.BackButton.onClick(() => {
    const promo = byId("catalog-promo-screen");
    if (promo && !promo.hidden) {
      promo.hidden = true;
      document.body.classList.remove("catalog-promo-open");
      try { tg.BackButton.hide(); } catch (_) {}
      return;
    }
    const activeScreen = document.querySelector(".screen.active");
    showScreen(activeScreen?.dataset.screen === "owners" ? ownersBackScreen : activeScreen?.dataset.screen === "owner-promo" ? "catalog" : "profile");
  });
  try { tg.BackButton.hide(); } catch (_) {}
}

// iOS-style edge swipe: start at the left edge and move right to go back.
let backSwipeStart = null;
document.addEventListener("touchstart", event => {
  if (event.touches.length !== 1 || !document.querySelector(".screen.active")) {
    backSwipeStart = null;
    return;
  }
  const activeScreen = document.querySelector(".screen.active");
  if (!BACK_SCREENS.has(activeScreen?.dataset.screen)) {
    backSwipeStart = null;
    return;
  }
  const touch = event.touches[0];
  if (touch.clientX > 64 || event.target.closest("input, textarea, select, [data-no-back-swipe]")) {
    backSwipeStart = null;
    return;
  }
  backSwipeStart = { x: touch.clientX, y: touch.clientY };
}, { passive: true });
document.addEventListener("touchend", event => {
  if (!backSwipeStart || event.changedTouches.length !== 1) {
    backSwipeStart = null;
    return;
  }
  const touch = event.changedTouches[0];
  const deltaX = touch.clientX - backSwipeStart.x;
  const deltaY = Math.abs(touch.clientY - backSwipeStart.y);
  backSwipeStart = null;
  if (deltaX >= 90 && deltaY <= 70 && deltaX > deltaY * 1.25) {
    const activeScreen = document.querySelector(".screen.active");
    if (activeScreen?.dataset.screen === "owner-promo") showScreen("catalog");
    else if (BACK_SCREENS.has(activeScreen?.dataset.screen)) showScreen(activeScreen?.dataset.screen === "owners" ? ownersBackScreen : "profile");
  }
}, { passive: true });
document.addEventListener("touchcancel", () => { backSwipeStart = null; }, { passive: true });

// Horizontal navigation between the four primary tabs.
// Gestures start only on free page space; content and controls keep their native behavior.
const primarySwipeScreens = ["catalog", "compare", "favorites", "profile"];
const tabSwipeExcluded = [
  "button", "a", "input", "textarea", "select", "label",
  ".vpn-card", ".service-list-card", ".popular-card", ".search-box",
  ".filter-strip", ".compare-table-wrap", ".profile-menu", ".home-screen-prompt",
  ".profile-photo-wrap", ".support-tabs", ".support-panel", ".profile-form",
  ".news-post", ".analytics-dashboard", ".catalog-promo-wrap",
  ".owner-promo-content", ".owner-promo-footer", ".page-heading",
  ".catalog-topline", ".catalog-section-heading", "[data-no-tab-swipe]",
  "[contenteditable='true']"
].join(",");
let tabSwipeStart = null;
document.addEventListener("touchstart", event => {
  if (event.touches.length !== 1) {
    tabSwipeStart = null;
    return;
  }
  const active = document.querySelector(".screen.active")?.dataset.screen;
  const touch = event.touches[0];
  if (!primarySwipeScreens.includes(active) || event.target.closest(tabSwipeExcluded)) {
    tabSwipeStart = null;
    return;
  }
  tabSwipeStart = { x: touch.clientX, y: touch.clientY, screen: active };
}, { passive: true });
document.addEventListener("touchend", event => {
  if (!tabSwipeStart || event.changedTouches.length !== 1) {
    tabSwipeStart = null;
    return;
  }
  const touch = event.changedTouches[0];
  const dx = touch.clientX - tabSwipeStart.x;
  const dy = Math.abs(touch.clientY - tabSwipeStart.y);
  const startScreen = tabSwipeStart.screen;
  tabSwipeStart = null;
  if (Math.abs(dx) < 72 || dy > 65 || Math.abs(dx) < dy * 1.35) return;
  const currentIndex = primarySwipeScreens.indexOf(startScreen);
  const nextIndex = currentIndex + (dx < 0 ? 1 : -1);
  if (nextIndex < 0 || nextIndex >= primarySwipeScreens.length) return;
  showScreen(primarySwipeScreens[nextIndex]);
}, { passive: true });
document.addEventListener("touchcancel", () => { tabSwipeStart = null; }, { passive: true });

// Navigation is handled once by the delegated document click listener below.

// Explicit press state for iOS Safari, where :active can be unreliable in embedded apps.
const profileNavButton = byId("profile-nav-button");
if (profileNavButton) {
  const setProfilePressed = pressed => profileNavButton.classList.toggle("is-pressed", pressed);
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
  const username = byId("profile-username");
  const photo = byId("profile-photo");
  const fallback = byId("profile-avatar-fallback");
  const navPhoto = byId("profile-nav-photo");
  const navFallback = byId("profile-nav-fallback");
  name.textContent = profile.display_name || t("Пользователь");
  const telegramUsername = String(profile.username || "").replace(/^@/, "");
  if (username) {
    username.textContent = telegramUsername ? "@" + telegramUsername : "";
    username.hidden = !telegramUsername;
  }
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

async function syncTelegramProfile(force = false) {
  if (force) profileReady = false;
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

// Switch between the two support payment methods.
document.querySelectorAll("[data-support-tab]").forEach(tab => {
  tab.addEventListener("click", () => {
    const selected = tab.dataset.supportTab;
    document.querySelectorAll("[data-support-tab]").forEach(item => {
      const active = item === tab;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-selected", String(active));
    });
    document.querySelectorAll(".support-panel").forEach(panel => {
      panel.hidden = panel.id !== (selected === "crypto" ? "support-panel-crypto" : "support-panel-stars");
    });
    if (document.querySelector("#screen-support.active")) setNativeButton(selected === "crypto" ? "support-crypto" : "support-stars");
  });
});

// Stars support screen. Invoice creation and payment verification stay server-side.
const supportAmount = byId("support-amount");
const supportPayButton = byId("support-pay-button");
const supportStatus = byId("support-dialog-status");
document.querySelectorAll("[data-support-amount]").forEach(option => {
  option.addEventListener("click", () => {
    if (supportAmount) supportAmount.value = option.dataset.supportAmount;
    document.querySelectorAll("[data-support-amount]").forEach(item => item.classList.toggle("is-selected", item === option));
  });
});
supportAmount?.addEventListener("input", () => {
  document.querySelectorAll("[data-support-amount]").forEach(item => item.classList.toggle("is-selected", Number(item.dataset.supportAmount) === Number(supportAmount.value)));
});
supportPayButton?.addEventListener("click", async () => {
  const amount = Number(supportAmount?.value);
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > 100000) {
    if (supportStatus) supportStatus.textContent = t("Введите целое число от 1 до 100 000 Stars.");
    return;
  }
  if (!tg?.initData || typeof tg.openInvoice !== "function") {
    if (supportStatus) supportStatus.textContent = t("Откройте VPN Finder через Telegram, чтобы оплатить Stars.");
    return;
  }
  supportPayButton.disabled = true;
  if (supportStatus) supportStatus.textContent = t("Создаём счёт…");
  try {
    await syncTelegramProfile();
    if (!profileReady) throw new Error("Telegram profile is not ready");
    const response = await fetch(SUPABASE_URL + "/functions/v1/telegram-bot", {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "createSupportInvoice", initData: tg.initData, amount })
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.ok || !result.invoice_url) throw new Error("Invoice creation failed");
    tg.openInvoice(result.invoice_url, status => {
      if (status === "paid") {
        if (supportStatus) supportStatus.textContent = t("Оплата прошла! Значок появится в профиле.");
        window.setTimeout(() => syncTelegramProfile(true), 1500);
      } else if (status === "cancelled") {
        if (supportStatus) supportStatus.textContent = t("Оплата отменена.");
      } else if (status === "failed") {
        if (supportStatus) supportStatus.textContent = t("Не удалось открыть оплату. Попробуйте ещё раз.");
      } else if (status === "pending") {
        if (supportStatus) supportStatus.textContent = t("Ожидаем подтверждение оплаты…");
      }
    });
  } catch (_) {
    if (supportStatus) supportStatus.textContent = t("Не удалось открыть оплату. Попробуйте ещё раз.");
  } finally {
    supportPayButton.disabled = false;
  }
});


// Manual USDT support. This does not create invoices or verify blockchain payments.
const cryptoStatus = byId("crypto-support-status");
const cryptoAddress = "UQBt5EVLJ5Q4lljC41RKTGMiXZBevXwRVXIES9Cgy_B9lLgo";
async function copySupportValue(value, successMessage) {
  try {
    if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
    await navigator.clipboard.writeText(value);
    if (cryptoStatus) cryptoStatus.textContent = t(successMessage);
  } catch (_) {
    if (cryptoStatus) cryptoStatus.textContent = t("Не удалось скопировать. Выдели значение и скопируй вручную.");
  }
}
byId("crypto-copy-address")?.addEventListener("click", () => copySupportValue(cryptoAddress, "Адрес скопирован."));

// First launch creates or updates the user's account automatically.
syncTelegramProfile();
trackEvent("app_open", { language: appLanguage });

const search = byId("search");
const clearSearch = byId("clear-search");
const toggleCatalog = byId("toggle-catalog");
function animateCatalogTransition(list, previousHeight) {
  if (!list || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const nextHeight = list.getBoundingClientRect().height;
  if (!previousHeight || !nextHeight || Math.abs(nextHeight - previousHeight) < 2) return;

  list.style.height = previousHeight + "px";
  list.style.overflow = "hidden";
  const heightAnimation = list.animate(
    [{ height: previousHeight + "px" }, { height: nextHeight + "px" }],
    { duration: 480, easing: "cubic-bezier(.22, 1, .36, 1)" }
  );
  heightAnimation.onfinish = () => {
    list.style.height = "";
    list.style.overflow = "";
  };
  heightAnimation.oncancel = () => {
    list.style.height = "";
    list.style.overflow = "";
  };

  [...list.querySelectorAll(".popular-grid, .service-list-card")].forEach((item, index) => {
    item.animate(
      [
        { opacity: 0, transform: "translateY(9px) scale(.992)" },
        { opacity: 1, transform: "translateY(0) scale(1)" }
      ],
      {
        duration: 330,
        delay: Math.min(index * 12, 150),
        easing: "cubic-bezier(.22, 1, .36, 1)",
        fill: "both"
      }
    );
  });
}

toggleCatalog?.addEventListener("click", () => {
  const list = byId("provider-list");
  const previousHeight = list?.getBoundingClientRect().height || 0;
  state.catalogExpanded = !state.catalogExpanded;
  haptic();
  renderCatalog();
  animateCatalogTransition(list, previousHeight);
});
const searchSuggestions = byId("search-suggestions");
const SEARCH_SUGGESTION_WORDS = [
  "iPhone", "iOS", "Android", "Windows", "macOS", "MacBook",
  "до 100 рублей", "до 200 рублей", "до 300 рублей",
  "безлимит", "пробный период", "белые списки",
  "несколько устройств", "для семьи", "США", "Германия", "Турция"
];
function getSearchSuggestions(value) {
  const query = normalizeSearchText(value);
  if (!query) return [];
  const lastWord = query.split(" ").pop();
  const words = [...SEARCH_SUGGESTION_WORDS];
  state.services.forEach(service => {
    words.push(service.name);
    (service.platforms || []).forEach(item => words.push(item));
    (service.features || []).forEach(item => words.push(String(item)));
  });
  const unique = [...new Set(words.map(item => String(item).trim()).filter(Boolean))];
  return unique
    .filter(item => {
      const normalized = normalizeSearchText(item);
      return normalized.startsWith(lastWord) && normalized !== query;
    })
    .sort((a, b) => a.length - b.length)
    .slice(0, 6);
}
function renderSearchSuggestions() {
  if (!searchSuggestions || !search) return;
  const suggestions = getSearchSuggestions(search.value);
  if (document.activeElement !== search || !suggestions.length) {
    searchSuggestions.hidden = true;
    searchSuggestions.innerHTML = "";
    return;
  }
  searchSuggestions.innerHTML = suggestions.map(item =>
    `<button class="search-suggestion" type="button" data-suggestion="${esc(item)}">${esc(item)}</button>`
  ).join("");
  searchSuggestions.hidden = false;
}
search?.addEventListener("input", () => {
  state.query = search.value.trim().toLowerCase();
  clearSearch.hidden = !search.value;
  renderCatalog();
  renderSearchSuggestions();
});
search?.addEventListener("focus", renderSearchSuggestions);
search?.addEventListener("blur", () => setTimeout(() => {
  if (searchSuggestions) searchSuggestions.hidden = true;
}, 120));
searchSuggestions?.addEventListener("click", event => {
  const button = event.target.closest("[data-suggestion]");
  if (!button || !search) return;
  search.value = button.dataset.suggestion;
  state.query = search.value.trim().toLowerCase();
  clearSearch.hidden = !search.value;
  searchSuggestions.hidden = true;
  renderCatalog();
});
clearSearch?.addEventListener("click", () => {
  search.value = "";
  state.query = "";
  clearSearch.hidden = true;
  if (searchSuggestions) searchSuggestions.hidden = true;
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

function normalizeSearchText(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("ru-RU")
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}
const SEARCH_SYNONYMS = {
  "айфон": ["iphone", "ios"], "айфона": ["iphone", "ios"], "айфоне": ["iphone", "ios"],
  "iphone": ["ios"], "ios": ["iphone"],
  "айпад": ["ipad", "ios"], "ipad": ["ios"],
  "макбук": ["macbook", "macos", "mac"], "мак": ["mac", "macos"], "macbook": ["mac", "macos"],
  "андроид": ["android"], "виндовс": ["windows"], "винда": ["windows"],
  "безлимит": ["безлимитный", "unlimited"], "безлимитный": ["безлимит", "unlimited"],
  "пробник": ["пробный", "тест", "trial"], "триал": ["пробный", "тест", "trial"],
  "семья": ["семейный", "несколько", "устройств"], "семейный": ["семья", "несколько", "устройств"],
};
function searchServiceText(service) {
  const platforms = Array.isArray(service.platforms) ? service.platforms : [];
  const features = Array.isArray(service.features) ? service.features : [];
  const plans = service.plans == null ? "" : JSON.stringify(service.plans);
  const devices = Number(service.devices_limit || 0);
  const extra = [];
  if (devices >= 3) extra.push("семья семейный несколько устройств");
  if (Number(service.trial_days || 0) > 0) extra.push("бесплатный пробный период тест trial");
  if (/безлимит|unlimited/i.test(String(service.traffic_limit || ""))) extra.push("безлимит безлимитный");
  if (service.whitelist_support === true) extra.push("белые списки whitelist");
  return normalizeSearchText([
    service.name, service.description, ...features, ...platforms,
    service.traffic_limit, service.devices_limit, service.countries_count,
    service.min_price, service.min_price_rub, service.trial_days, plans, ...extra
  ].join(" "));
}
function queryMatchesService(query, service) {
  if (!query) return true;
  let remaining = query;
  const priceLimitMatch = remaining.match(/(?:до|не\s+дороже|максимум|меньше)\s*(\d{1,7})\s*(?:₽|руб(?:лей|ля|ль)?|р)?/i);
  if (priceLimitMatch) {
    const price = Number(service.min_price ?? service.min_price_rub);
    if (!Number.isFinite(price) || price > Number(priceLimitMatch[1])) return false;
    remaining = remaining.replace(priceLimitMatch[0], " ");
  }
  const terms = normalizeSearchText(remaining)
    .split(/\s+/)
    .filter(term => !["руб", "рубль", "рубля", "рублей", "р", "цена", "vpn", "для", "на", "и", "с", "по", "мне", "нужен", "нужна"].includes(term));
  if (!terms.length) return true;
  const haystack = searchServiceText(service);
  return terms.every(term => {
    const alternatives = [term, ...(SEARCH_SYNONYMS[term] || [])];
    return alternatives.some(value => haystack.includes(normalizeSearchText(value)));
  });
}
function visibleServices() {
  return state.services.filter(service => {
    if (!queryMatchesService(state.query, service)) return false;
    if (state.filter === "free") return false;
    return true;
  });
}

const serviceAvatars = {
  "VPN-001": "https://cdn4.telesco.pe/file/j46QtYOOiQPQt2e5sJdYCqT9Y5rx9nvUsxV5Co1yk_3QMoIXgsbgPnifxh6wYahHCf3a0uPnSADmYRwrILknFOmpjLwpSrpldyD6AfJwWTS9vfJ_g_q91jj-geaVjGIwo8DXwE1b3Lco9jbNOOMddhXI-bJ_7MLqc2UGRtnd9DM-X8bujPG0OCrv5C4fLs9l2aMtVzRrf8mp7DU4KcSO0yrapLvn1X58KKjAAilZOFoT0RoKmhQh8BsQj3AFdV1M_csgQ4taBli6q7y1cPnlnYtcvGMgechq4OzAIb94UbuTBVNVIVQGxv-r24IQcutSm_DYInIrdRvDSyGnoUakoQ.jpg",
  "VPN-002": "https://cdn4.telesco.pe/file/GgTLUYjThmCR1JOoFP6l19y3J6tZj7AmfMVqf4eMU_oYOvHDECwWx_PS9PzoC7kErc_dn3RNrY_1_PeXLgOn1KLOjUto7Y-eRvt6yRUr0HDFtaL7FzZ2z745U-b302_p68XRpx9H6rcp1Z6nuRhmBSb7WXu3XDCxNdMSY4oGOecwnqIfSivQl8AnmxKfcTqtcNgVQkb93uNto3STW8RiDNo-1l-A_4D-SoN9NmHqI0zfynhhR-kbjVfkIa7MFCTzfGd9MwmKcKp429BDJhxOo7-Zro0PSdtPIg9JQncIzsoDNeTolyyBOSpF7os5UO-LcpVW8HtriXUKrlo_NQ2Nhg.jpg",
  "VPN-003": "https://cdn4.telesco.pe/file/K4rdDvH4jNZqSQ2BCFAEfI9tYhm1JuKlHDJSIqX-Pug7P1pbU2-euIbmb9t8grRl0mEueCf29Azt-8kC9re2nFcvVDzK_mmlRqFER8FU8IEVHymVirHTz4VRdQR8n0qqgL4c4I-kh6AakwX-DMWu_I8s9SB8u2KTULJw9qbMtF7mnV7NY6XeGj7NlQ2BBbZ2_xoU2NtLeGmDmZZPYWDfGN-mzqvagH06AteXdSLRgSaq1okT3U0-Z-AQCNjTuvmlxmIy5BKJhFvbcRrJMmC_DGVbb7dm_geyWc04-IgfCArfSsFT5an__mtrJDRb9_favTTJov2B1RSZCRWG95R63w.jpg",
  "VPN-004": "https://cdn4.telesco.pe/file/RwycPB0WAQtCY-ED4aJXcLqeKViuo_1wJumK66F8ISOKsLfS7sZSLNpT747zdT_6S4h9nCkIxPGYZGieDqIGqwLtl14quARW63Hdsbjf3qboTz3r_O4Q-8ifXmoWFuN-38UJhjQ0YVsKgNBls23h5wSm00lVJ3xnbjr7mO0l6t2fE2IwJNMoTPqAQMoWFInpAriERJWcI6b1UvF1wQCc7FgmJF3Z54Y3YWd_OhNZUU_PuvlcJhOGV9dOtuIZtK13KIZBeInXAEJ810LX1xpUNW1Ok04sCYVxt4rNJG8jMIBqjRxwDAYyUs04stjNnwJuQCKmdFHMzLuMIQvXNSc-Ag.jpg",
  "VPN-005": "https://play-lh.googleusercontent.com/RB7gAkVOOPNKZvn9erHnHpwcNNSEobIb3zPWUsok5giq3uD8_x0V5dhbfIjWNB2_7VW9nldW00v5bbgN0kRR2A",
  "VPN-006": "https://cdn4.telesco.pe/file/Yz5DqYRwYq1cSIEIv4ESx58v9jzTOVjRVH7rprSinl_gujJ9rJ-ojlII7fDezqMhq9TO5_ZtBHjGe0l0qZazFGBMw4nZOEC22BEGU9EtrUKfkKAJDL_VnSng4fg4VfBnO2F108ykGJOAbyPmhZiSaxd67hAYT9VdZU8a1sDKC9XmgIYWi5kM2Vb29NXDwJFAJz20i3ITySmBAV9FdfvdDjsKJojxrvNn7-IZgNcBW5WCQlda18PTelWCfDdTKHf28JqWhKfQsmGH59cacEhJaXXySZ9uHoMBNFimSYjHa_DOA9YumS11WYDUsnxxJ4fthmwoV1UNlApkG5Kg2deUHg.jpg",
  "VPN-007": "https://cdn4.telesco.pe/file/T5-2LHFeRt3_K1MGe8oNjzHp_F-1qNF5DjoF4zFXsPWdbfRuGTGXYpKXmCynAmAZGSYLwSloeoy8BiAeMw2ham5VLFNP8GI-C-e3nYXwono3Px1g79rPZybdzYg8JXH5dcJLtumheG1TTrT70srKMihcC8g7IcdYv7Kxk4GURXJavK2SWSv75vAuIQqg9Qs-qaX7wMkSUD_FhYaGmybREDtzCLF4k8klFnr0LcioRnceMKpm1Ij9PmFQSgw2GFwx6uaYYOV2a6-_lvG7p2srBUVaYYC5qL3PH54VRctBKFtlQ2eAj8I8y7mr_NYbYvF8lWyeNRgM7bSyjRkoIDJRDw.jpg",
  "VPN-008": "https://cdn4.telesco.pe/file/G8AyrXHSsWQ-KLq7L4B7HnffPHRAgbepl2AzgRPXkoKuyCzMjQ0GAVP2NfCoHuVTvHS0koqqcgvI4IBY2-mcde-Rj6EEOzjbyqDE9qD1dLX4DuEW1672zySb5wpanOS1mXYcnRjXkmVZy9SonuatMxdAzqzjKg5nkfPkwQjNJHGU31VnWHnxqyA-WKs-4U5EJzjev0tD4xWfluQbX3bhrKfX222dEwv75E5FxWdTBX0R6yKOJUk_gDey4qwcZaGwtKYfOkInkXtolmD2TM_soGbGMIFDY7CkmOZ-a125VEOgW7xWjGmvXNoO0XOcTYrH6KCLmaibvntMHUfRREwZBA.jpg",
  "VPN-009": "https://gotbot.cc/branding/logo-white.png",
  "VPN-010": "https://cdn1.telesco.pe/file/an8T7RztDFxWIPC1bUqihI9w0cR56kzCl0M3ei5nhWLqvY6jVzmf81ZXxYesBVfe-LBtNYYoo8QJv6MxkelFUoRucqRPtFdPuB_ER7t4AnWFuG_YyyOc1le6ewnT2A-tF-9FJ0Nvo1DT1oPxLzBvUN0Q2_j9Au6HDU4pII1_drJ4WaYh7YMQ5VkRrqMlKDRUMx4U2ZMBElx9dlMLIlyocYATg-BPJWJEzpoperOk_C9abbWKaj_MUUA0zFWhWidrXTgKzzdDSQmTxl_lG9JYcb3HfmDHIER1NjDgb0yd7LEE90viqtmsHKhegT6rWpyS62l-KtHXbjcKd4DuuQLIiA.jpg",
  "VPN-017": "https://cdn4.telesco.pe/file/S6lvx5Gr0od3nYlA8iBDOEOPWdUtSpnAgc775agY1EKqcGlVKH5v2rRKqwKH3Y0vwHpRHe8ZeiRWeOB5puVDNWR60JdTEWS9T3K_m4dRxjCzYPRoiiUlOO8-Rn_ELjzJ4Wo6bkrgnhqioJ2xOSc7y1adoamDJXqXQjkmSJI16_PwFotXgkEu2dSh8pJRx48iPE5phvfHsnGCFeuowcVxLRQJVQgjAmmK7ObmsfwL4z8Vy0glq9wSYqoE8jod7Ghtce71EPy__gF-3lADlDyQLJ-k3BDfyIYzpGtMcgyUODKu0m1RpJGun6fPHst4d1YXBdwOk8mMIEgOvtTlCmk2MA.jpg",
  "VPN-018": "https://cdn4.telesco.pe/file/RFwbkKLrTAMAQVZyU8HUOtZiK40QTr1nGq-wIIkc8ztbQ0YpowmR_BjeC-EzDXWg7K8oIhPRR5WNR9w39-QGBWf0VARj64hR93kslSjFaHaZOORcyeVqlzW2RdumULLfsZZYUSITrCJaP0Gj3UhC6Z9svRezEO4fzn63jJE8J9PXBoj44ChnS-re0DMfBLfv5_V2Qsz6lzCxL6aoEReMBn5fIV0id_c5Pc666FE2xUqD_0Mn6oak17RndvE3NFHCW2xL8ANIeQt7B5irWFzkwzOXj_cbHoEghBGiclcqqgxdxEI5fG9XonioSBBq0FHyq1R-JYJGY8nEMuA-LwBZtg.jpg",
  "VPN-019": "https://cdn4.telesco.pe/file/sFEHtiU25X6Grn__JJRDNLv6Ge0CMtddLC3621-OxjaF3hlcV29SOw-HkVxNZGje6F6NfQNc88PfRxE7TRoiU3M1BXA2l7h-hDJq2_uokEod-yDZs1jUU85uFMOqg8w03ikVTH4mo8nxXL1PXh4BwKjHrK7qf1Ci6LyMYc8f4Ser4U7DVbnPacHcmlByaWMy7dRv8_mfKx_B6A9CMAAKlk68c6c4_Ttg9RBdXmKFAB2z3nc_vqgb0BcOifwk8sMJ83YN8X6_qYeEuZ8an6URAswKkFfE0ZoPGUu8DmRFiV2mWR6DSJxS8824m3rLCa3rkQu5svv5zbIVv8KKvHeV7Q.jpg",
  "VPN-020": "https://cdn4.telesco.pe/file/JxblHdDBlS-Dv21ulf55VuATw7aenF7MiZM1_ZHZhWCw7isj_NHd-TGoMvMZAAj5kCnExFbc6EzhAfmAKH5QAdPePAVsyTYq0plt72tLtkDCQMA9Y737MzE9nUIRBeIdTSmIa8x6URtc1u7FPqfD4wB95uZLUpmrPoeN_JjrbZpYZ88lyAUzEnQkLKyVKlQcdJkB4zKaFEsTl-kb_io9q3niSpqolcvEeuqD3AgXdQxb2sOXbioSQN7VHnxAQPC4pY09lddMtM4SPdCCRui0jW8hmxGUEgXa2Xk6KtQAH1hy-8-Vlyj8A0LwrUtv9d3Z-YYeoD33kYpJiIG92ldNYw.jpg",
  "VPN-014": "https://cdn4.telesco.pe/file/Mq3__E3IpYaBtp30auVdicluM52X1iGGkwaK5KVQL2xS-UWAr1sSZTtfHz9WgF9qNRtCuv9NTQLmQHyk4RhpAzZ8LuYOmiU6hmBganVkH1ey4pwG0YALk6CaS5J5XeJ--yPgvVXDaPkzhKfiJgvA-XTHdsZ5MVelzHdJzJwoOkoInVmk5YPZqfOcnr7E1Np06zE25tXok3_6zxrfD2Bkj-sFStCJ_FNKqUt488ONL7mynTTHQrcvKPrncp6PwvR5x5oL8GUjV-o4D7zVubnh1TWZnaft25E-y0i3CBL3WfghpLML8HUT5ogGN2U1oON_51HlE_-1_LtfToEcdKNkug.jpg",
};
function serviceAvatar(service, className = "service-avatar", prioritize = false) {
  const fallbackUrl = serviceAvatars[service.id] || "";
  const databaseUrl = typeof service.logo_url === "string" && /^https:\/\//i.test(service.logo_url.trim())
    ? service.logo_url.trim()
    : "";
  // Prefer the verified image mirrored to our own GitHub Pages origin.
  const localUrl = window.VPN_AVATAR_ASSETS?.[service.id] || "";
  const defaultUrl = "./assets/avatars/default.svg";
  const url = localUrl || databaseUrl || fallbackUrl || defaultUrl;
  const initial = esc((displayServiceName(service) || "V").slice(0, 1).toUpperCase());
  const fallback = [databaseUrl, fallbackUrl, defaultUrl].find(candidate => candidate && candidate !== url) || "";
  return `<span class="${className} avatar-frame" aria-hidden="true">
    <span class="avatar-fallback">${initial}</span>
    <img class="avatar-image" src="${esc(url)}" data-fallback="${esc(fallback)}" alt="" width="64" height="64"
      loading="eager" fetchpriority="${prioritize ? "high" : "low"}" decoding="async"
      onload="this.classList.add('is-loaded')"
      onerror="if(this.dataset.fallback&&!this.dataset.fallbackUsed){this.dataset.fallbackUsed='1';this.src=this.dataset.fallback}else{this.remove()}">
  </span>`;
}


function cleanCardText(value) {
  return String(value ?? "")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/@[A-Za-z0-9_]{3,}/g, "")
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}
function serviceDetails(service, hideFavoriteAction = false) {
  const facts = [];
  const priceText = servicePriceText(service);
  if (priceText) facts.push([t("Стоимость"), "от " + priceText]);
  if (service.devices_limit) facts.push([t("Устройства"), service.devices_limit]);
  if (service.countries_count) facts.push([t("Страны"), service.countries_count + "+"]);
  if (service.trial_days) facts.push([t("Пробный период"), service.trial_days + " дн."]);
  if (service.traffic_limit) facts.push([t("Трафик"), service.traffic_limit]);
  const platforms = Array.isArray(service.platforms) ? service.platforms : [];
  const allFeatures = Array.isArray(service.features) ? service.features : [];
  const paymentPattern = /сбп|оплат|карт|visa|mastercard|мир|юmoney|юмани|крипт|usdt|ton|telegram stars|звезд|apple pay|google pay|paypal|перевод/i;
  const payments = allFeatures.filter(item => paymentPattern.test(String(item))).map(cleanCardText).filter(Boolean);
  const features = allFeatures.filter(item => !paymentPattern.test(String(item))).map(cleanCardText).filter(Boolean);
  const favorite = state.favorites.has(service.id);
  return `<div class="service-detail-panel">
    ${hideFavoriteAction ? "" : `<div class="service-detail-actions"><button class="service-detail-favorite ${favorite ? "is-favorite" : ""}" type="button" data-action="favorite-detail" data-id="${esc(service.id)}" aria-label="${favorite ? t("Убрать") : t("Избранное")}" aria-pressed="${favorite}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 8.8c0 5.1-8.8 11-8.8 11s-8.8-5.9-8.8-11A4.8 4.8 0 0 1 12 6.1a4.8 4.8 0 0 1 8.8 2.7Z"></path></svg></button></div>`}
    ${facts.length ? `<div class="service-detail-facts">${facts.map(([label,value]) => `<div class="service-detail-fact"><span>${esc(cleanCardText(label))}</span><strong>${esc(cleanCardText(value))}</strong></div>`).join("")}</div>` : ""}
    ${platforms.length ? `<div class="service-detail-group"><span class="service-detail-label">${t("Платформы")}</span><div class="service-detail-chips">${platforms.map(item => `<span>${esc(cleanCardText(item))}</span>`).join("")}</div></div>` : ""}
    ${payments.length ? `<div class="service-detail-group"><span class="service-detail-label">${t("Оплата")}</span><div class="service-detail-chips">${payments.map(item => `<span>${esc(cleanCardText(item))}</span>`).join("")}</div></div>` : ""}
    ${features.length ? `<div class="service-detail-group"><span class="service-detail-label">${t("Возможности")}</span><div class="service-detail-chips">${features.map(item => `<span>${esc(cleanCardText(item))}</span>`).join("")}</div></div>` : ""}
    <button class="connect-button service-detail-connect" type="button" data-action="connect" data-id="${esc(service.id)}">${t("Подключить")}</button>
  </div>`;
}
function ratingMarkup(serviceId, interactive = false) {
  const rating = state.ratings.get(serviceId) || {};
  const personal = Number(rating.my_rating) || 0;
  const average = Number(rating.average) || 0;
  const hasRatings = Number(rating.count) > 0;
  const shown = hasRatings ? Math.max(1, Math.min(5, Math.round(average))) : "";
  const disabled = state.ratingPending.has(serviceId);
  const gradientId = "rating-gold-" + String(serviceId).replace(/[^a-zA-Z0-9_-]/g, "") + "-" + Math.random().toString(36).slice(2, 8);
  const tag = interactive ? "button" : "span";
  const actionAttrs = interactive
    ? `type="button" data-action="toggle-rating-menu" data-id="${esc(serviceId)}" aria-label="Оценить сервис" aria-expanded="false" ${disabled ? "disabled" : ""}`
    : 'aria-hidden="true"';
  const starPath = "M12 1.65c.55 0 1.04.31 1.29.81l2.55 5.17 5.7.83c1.18.17 1.65 1.62.8 2.45l-4.12 4.02.97 5.68c.2 1.18-1.03 2.08-2.08 1.52L12 19.45l-5.1 2.68c-1.06.56-2.29-.34-2.09-1.52l.98-5.68-4.13-4.02c-.85-.83-.38-2.28.8-2.45l5.7-.83 2.55-5.17c.25-.5.74-.81 1.29-.81Z";
  return `<div class="service-rating ${interactive ? "is-interactive" : "is-static"}" role="${interactive ? "group" : "img"}" aria-label="${hasRatings ? "Рейтинг " + shown + " из 5" : "Рейтинг пока не сформирован"}">
    <${tag} class="service-rating-badge ${personal ? "has-vote" : ""} ${interactive ? "is-interactive" : "is-static"}" ${actionAttrs}>
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="${gradientId}" x1="5" y1="2" x2="19" y2="22" gradientUnits="userSpaceOnUse">
            <stop stop-color="#FFF2A6"/><stop offset=".32" stop-color="#FFD84D"/><stop offset=".68" stop-color="#FFB800"/><stop offset="1" stop-color="#E98500"/>
          </linearGradient>
          <linearGradient id="${gradientId}-shine" x1="8" y1="4" x2="16" y2="15" gradientUnits="userSpaceOnUse">
            <stop stop-color="#FFFFFF" stop-opacity=".9"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
          </linearGradient>
          <clipPath id="${gradientId}-clip"><path d="${starPath}"/></clipPath>
        </defs>
        <path class="telegram-star-face" d="${starPath}" fill="url(#${gradientId})" stroke="#D98A00" stroke-width=".55"/>
        <path class="telegram-star-glint" clip-path="url(#${gradientId}-clip)" d="m8 4.1 3.2-1.9 2.7 5.6-5.2 1.3-2.1-.8L8 4.1Z" fill="url(#${gradientId}-shine)"/>
        <path d="m12 2.5 2.05 4.15" fill="none" stroke="#FFFFFF" stroke-linecap="round" stroke-opacity=".8" stroke-width="1.1"/>
      </svg>
      <span>${shown}</span>
    </${tag}>
    ${interactive ? `<div class="service-rating-choices" hidden>${[1,2,3,4,5].map(value => `<button class="service-rating-choice ${personal === value ? "is-selected" : ""}" type="button" data-action="rate" data-id="${esc(serviceId)}" data-rating="${value}" aria-label="Поставить оценку ${value}" ${disabled ? "disabled" : ""}>${value}</button>`).join("")}</div>` : ""}
  </div>`;
}
function refreshRatingBadgesInPlace() {
  document.querySelectorAll(".service-rating").forEach(current => {
    const owner = current.closest("[data-featured-service], .service-list-card[data-service-id], .vpn-card[data-service]");
    if (!owner) return;
    const serviceId = owner.dataset.featuredService || owner.dataset.serviceId || owner.dataset.service;
    if (!serviceId) return;
    // Preserve the original star SVG and layout node; update only rating text/state.
    const rating = state.ratings.get(serviceId) || {};
    const personal = Number(rating.my_rating) || 0;
    const average = Number(rating.average) || 0;
    const hasRatings = Number(rating.count) > 0;
    const shown = hasRatings ? String(Math.max(1, Math.min(5, Math.round(average)))) : "";
    const badge = current.querySelector(".service-rating-badge");
    const number = badge?.querySelector("span");
    if (number) number.textContent = shown;
    if (badge) {
      badge.classList.toggle("has-vote", Boolean(personal));
      badge.setAttribute("aria-label", hasRatings ? "Рейтинг " + shown + " из 5" : "Рейтинг пока не сформирован");
      if (badge.tagName === "BUTTON") badge.disabled = state.ratingPending.has(serviceId);
    }
    current.setAttribute("aria-label", hasRatings ? "Рейтинг " + shown + " из 5" : "Рейтинг пока не сформирован");
    current.querySelectorAll(".service-rating-choice").forEach(choice => {
      choice.classList.toggle("is-selected", Number(choice.dataset.rating) === personal);
      choice.disabled = state.ratingPending.has(serviceId);
    });
  });
}

async function loadServiceRatings() {
  if (!tg?.initData || !state.services.length) return;
  try {
    await syncTelegramProfile();
    if (!profileReady) return;
    const response = await fetch(SERVICE_RATINGS_URL, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "list", initData: tg.initData, service_ids: state.services.map(service => service.id) })
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.ok) return;
    state.ratings = new Map((result.ratings || []).map(item => [item.service_id, item]));
    // Update only the rating badges. Re-rendering the catalog here recreated
    // every avatar and star on each app launch, causing visible position jumps.
    refreshRatingBadgesInPlace();
  } catch (_) { /* Ratings must never interrupt catalog loading. */ }
}
async function saveServiceRating(serviceId, value) {
  if (!tg?.initData || state.ratingPending.has(serviceId)) return;
  state.ratingPending.add(serviceId);
  renderCatalog();
  if (byId("screen-favorites")?.classList.contains("active")) renderFavorites();
  try {
    await syncTelegramProfile();
    if (!profileReady) throw new Error("Profile unavailable");
    const response = await fetch(SERVICE_RATINGS_URL, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "vote", initData: tg.initData, service_id: serviceId, rating: value })
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.ok || !result.rating) throw new Error("Rating save failed");
    state.ratings.set(serviceId, result.rating);
    await loadServiceRatings();
    haptic();
  } catch (_) {
    try { tg?.showAlert?.("Не удалось сохранить оценку. Попробуйте ещё раз."); } catch (_) {}
  } finally {
    state.ratingPending.delete(serviceId);
    renderCatalog();
    if (byId("screen-favorites")?.classList.contains("active")) renderFavorites();
  }
}
function serviceAvatarWithRating(service, index = 0, interactive = true) {
  return `<span class="service-avatar-rating">${serviceAvatar(service, "service-avatar", index < 4)}${ratingMarkup(service.id, interactive)}</span>`;
}
function serviceMiniCard(service, index = 0) {
  const id = esc(service.id);
  const expanded = state.expandedServiceId === service.id;
  const compactFacts = [
    servicePriceText(service) == null ? t("Цена -") : t("от ") + servicePriceText(service),
    service.devices_limit ? service.devices_limit + t(" устр.") : t("Устр. -"),
    service.traffic_limit ? service.traffic_limit : t("Трафик -"),
    service.trial_days != null ? (Number(service.trial_days) > 0 ? t("Тест ") + service.trial_days + t(" дн.") : t("Без теста")) : t("Тест -")
  ];
  return `<article class="service-list-card ${expanded ? "expanded" : ""}" data-service-id="${id}">
    <div class="service-mini-card" role="button" tabindex="0" data-action="toggle-details" data-id="${id}" aria-expanded="${expanded}">
      ${expanded ? serviceAvatarWithRating(service, index) : serviceAvatar(service, "service-avatar", index < 4)}
      <span class="service-mini-copy"><span class="service-mini-title-row"><span class="service-mini-name">${esc(displayServiceName(service))}</span></span><span class="service-mini-subtitle">${compactFacts.map(item => `<span>${esc(cleanCardText(item))}</span>`).join('<span class="service-mini-dot">·</span>')}</span></span>
      <svg class="service-mini-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"></path></svg>
    </div>
    ${expanded ? serviceDetails(service, false) : ""}
  </article>`;
}
function serviceFeaturedItem(service) {
  const id = esc(service.id);
  return `<div class="popular-service" data-featured-service="${id}">
    <div class="popular-service-open">${serviceAvatarWithRating(service, 0, false)}<span>${esc(displayServiceName(service))}</span></div>
  </div>`;
}
function serviceCard(service, context = "catalog") {
  const id = esc(service.id);
  const favorite = state.favorites.has(service.id);
  const compared = state.compare.has(service.id);
  const formattedPrice = servicePriceText(service);
  const price = formattedPrice == null ? t("Тарифы в боте") : "от " + formattedPrice;
  const details = [];
  if (service.devices_limit) details.push(service.devices_limit + t(" устр."));
  if (service.countries_count) details.push(service.countries_count + t(" стран"));
  if (service.trial_days) details.push(t("Тест ") + service.trial_days + t(" дн."));
  const expanded = context === "favorites" && state.expandedServiceId === service.id;
  return `<article class="vpn-card ${expanded ? "expanded" : ""}" data-service="${id}" ${context === "favorites" ? `data-action="toggle-favorite-details" data-id="${id}"` : ""}>
    <div class="vpn-card-top">
      <span class="service-avatar-rating">${serviceAvatar(service, "service-avatar", true)}${ratingMarkup(service.id)}</span>
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

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    const promo = byId("catalog-promo-screen");
    if (promo && !promo.hidden) {
      promo.hidden = true;
      document.body.classList.remove("catalog-promo-open");
      try { tg?.BackButton?.hide(); } catch (_) {}
      return;
    }
  }
  const row = event.target.closest(".service-mini-card[role='button']");
  if (!row || event.target.closest("button") || (event.key !== "Enter" && event.key !== " ")) return;
  event.preventDefault();
  row.click();
});

document.addEventListener("click", event => {
  const button = event.target.closest("[data-action], [data-go]");
  if (!button) return;
  if (button.dataset.action === "dismiss-catalog-promo") {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    const banner = button.closest(".catalog-promo-wrap");
    if (banner) banner.remove();
    haptic();
    return;
  }
  if (button.dataset.go) {
    showScreen(button.dataset.go, button.dataset.backScreen || null);
    return;
  }
  if (button.dataset.action === "open-add-service") {
    const promo = byId("catalog-promo-screen");
    if (promo) {
      promo.hidden = false;
      document.body.classList.add("catalog-promo-open");
      try { tg?.BackButton?.show(); } catch (_) {}
    }
    return;
  }
  if (button.dataset.action === "close-add-service") {
    const promo = byId("catalog-promo-screen");
    if (promo) promo.hidden = true;
    document.body.classList.remove("catalog-promo-open");
    try { tg?.BackButton?.hide(); } catch (_) {}
    return;
  }
  const service = state.services.find(item => item.id === button.dataset.id);
  if (!service) return;
  const action = button.dataset.action;
  if (action === "toggle-rating-menu") {
    event.preventDefault();
    event.stopPropagation();
    const wrap = button.closest(".service-rating");
    const choices = wrap?.querySelector(".service-rating-choices");
    const opening = !!choices?.hidden;
    document.querySelectorAll(".service-rating-choices:not([hidden])").forEach(menu => {
      menu.hidden = true;
      menu.closest(".service-rating")?.querySelector('[data-action="toggle-rating-menu"]')?.setAttribute("aria-expanded", "false");
    });
    if (choices && opening) {
      choices.hidden = false;
      button.setAttribute("aria-expanded", "true");
    }
    return;
  }
  if (action === "rate") {
    event.preventDefault();
    event.stopPropagation();
    saveServiceRating(service.id, Number(button.dataset.rating));
    return;
  }
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
    if (state.expandedServiceId) {
      const previousCard = list.querySelector('.service-list-card[data-service-id="' + CSS.escape(state.expandedServiceId) + '"]');
      if (previousCard && previousCard !== currentCard) {
        previousCard.classList.remove("expanded");
        previousCard.querySelector(".service-mini-card")?.setAttribute("aria-expanded", "false");
        previousCard.querySelector(".service-detail-panel")?.remove();
        const previousAvatarWrap = previousCard.querySelector(".service-avatar-rating");
        if (previousAvatarWrap) previousAvatarWrap.outerHTML = serviceAvatar(state.services.find(item => item.id === state.expandedServiceId), "service-avatar", false);
      }
    }
    if (wasExpanded) {
      currentCard?.classList.remove("expanded");
      currentCard?.querySelector(".service-detail-panel")?.remove();
      button.setAttribute("aria-expanded", "false");
      const avatarWrap = currentCard?.querySelector(".service-avatar-rating");
      if (avatarWrap) avatarWrap.outerHTML = serviceAvatar(service, "service-avatar", false);
      state.expandedServiceId = null;
    } else {
      currentCard?.classList.add("expanded");
      button.setAttribute("aria-expanded", "true");
      trackEvent("service_view", {}, service.id);
      const avatar = button.querySelector(".service-avatar");
      if (avatar) avatar.outerHTML = serviceAvatarWithRating(service, state.services.indexOf(service));
      button.insertAdjacentHTML("afterend", serviceDetails(service, false));
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
  list.innerHTML = `<div class="loading-state" aria-hidden="true"></div>`;
  try {
    const url = SUPABASE_URL + "/rest/v1/vpn_services?select=id,slug,name,referral_url,logo_url,description,min_price_rub,min_price,price_currency,devices_limit,countries_count,trial_days,traffic_limit,platforms,plans,features,whitelist_support,status,sort_order&status=eq.active&order=sort_order.asc";
    const response = await fetch(url, { headers: { apikey: SUPABASE_KEY } });
    if (!response.ok) throw new Error("Catalog request failed");
    state.services = await response.json();
    state.featuredIds = state.services.slice(0, 4).map(service => service.id);
    renderCatalog();
    updateCounts();
    loadServiceRatings();
  } catch (_) {
    list.innerHTML = `<div class="empty-state"><h3>${t("Не удалось загрузить")}</h3><button class="primary-button" type="button" id="retry-load">${t("Повторить")}</button></div>`;
    byId("retry-load")?.addEventListener("click", loadServices);
  } finally {
    finishStartupSplash();
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