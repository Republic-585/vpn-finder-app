(() => {
document.addEventListener("gesturestart", event => event.preventDefault(), { passive: false });
document.addEventListener("gesturechange", event => event.preventDefault(), { passive: false });
document.addEventListener("touchmove", event => {
  if (event.touches.length > 1) event.preventDefault();
}, { passive: false, capture: true });
const tg = window.Telegram?.WebApp;
const ownerPromoNativeButton = tg?.BottomButton || tg?.MainButton || null;
let nativeButtonMode = "hidden";
function applyNativeButtonParams(params) {
  if (!ownerPromoNativeButton) return;
  if (typeof ownerPromoNativeButton.setParams === "function") {
    ownerPromoNativeButton.setParams(params);
    return;
  }
  // Backward compatibility with Telegram clients exposing the legacy MainButton API.
  if (typeof params.text === "string") ownerPromoNativeButton.setText?.(params.text);
  if (params.color) ownerPromoNativeButton.setColor?.(params.color);
  if (params.text_color) ownerPromoNativeButton.setTextColor?.(params.text_color);
  if (params.is_active === true) ownerPromoNativeButton.enable?.();
  else if (params.is_active === false) ownerPromoNativeButton.disable?.();
  if (params.is_visible === true) ownerPromoNativeButton.show?.();
  else if (params.is_visible === false) ownerPromoNativeButton.hide?.();
}
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
    ownerPromoNativeButton.hide?.();
    return;
  }
  try {
    applyNativeButtonParams({
      text: labels[mode],
      color: tg?.themeParams?.button_color || "#3390EC",
      text_color: tg?.themeParams?.button_text_color || "#FFFFFF",
      has_shine_effect: true,
      is_active: true,
      is_visible: true
    });
  } catch (error) {
    console.error("[VPN Finder] Native button setup error:", error);
  }
}
function handleNativeButtonClick() {
  if (nativeButtonMode === "owner-promo") showScreen("owners", "owner-promo");
  else if (nativeButtonMode === "provider-submit") {
    const form = byId("provider-form");
    if (typeof form?.requestSubmit === "function") form.requestSubmit();
    else form?.querySelector('button[type="submit"]')?.click();
  } else if (nativeButtonMode === "support-stars") {
    startStarsPayment();
  } else if (nativeButtonMode === "support-crypto") {
    copySupportValue(cryptoAddress, "Адрес скопирован.");
  }
}
if (ownerPromoNativeButton) {
  try {
    applyNativeButtonParams({
      text: t("Добавить сервис"),
      color: tg?.themeParams?.button_color || "#3390EC",
      text_color: tg?.themeParams?.button_text_color || "#FFFFFF",
      has_shine_effect: true,
      is_active: true,
      is_visible: false
    });
  } catch (error) {
    console.error("[VPN Finder] Native button initialization error:", error);
  }
  try {
    if (typeof tg?.onEvent === "function") {
      tg.onEvent("mainButtonClicked", handleNativeButtonClick);
    } else {
      ownerPromoNativeButton.onClick?.(handleNativeButtonClick);
    }
  } catch (error) {
    console.error("[VPN Finder] Native button click registration error:", error);
  }
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
  } catch (_) { /* Statistics must never interrupt the Mini App. */ }
}
let analyticsRuntimeErrorCount = 0;
window.addEventListener("error", () => {
  if (analyticsRuntimeErrorCount >= 5) return;
  analyticsRuntimeErrorCount += 1;
  trackEvent("client_error", { kind: "window_error" });
});
window.addEventListener("unhandledrejection", () => {
  if (analyticsRuntimeErrorCount >= 5) return;
  analyticsRuntimeErrorCount += 1;
  trackEvent("client_error", { kind: "unhandled_rejection" });
});
window.addEventListener("load", () => {
  const navigation = performance.getEntriesByType("navigation")[0];
  if (!navigation) return;
  const loadMs = Math.round(navigation.loadEventEnd || navigation.domContentLoadedEventEnd || 0);
  if (loadMs > 0) trackEvent("app_performance", {
    load_ms: loadMs,
    dom_ms: Math.round(navigation.domContentLoadedEventEnd || 0)
  });
}, { once: true });
let analyticsPeriod = "30d";
let analyticsTab = "overview";
const analyticsCache = new Map();
function renderStatisticsDashboard(result) {
  const root = byId("analytics-dashboard");
  if (!root) return;
  const summary = result.summary || {};
  const fmt = new Intl.NumberFormat(appLanguage === "en" ? "en-US" : "ru-RU");
  const dateTime = value => {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return {time:"-",date:"-"};
    return {
      time:new Intl.DateTimeFormat(appLanguage === "en" ? "en-GB" : "ru-RU",{timeZone:"Europe/Moscow",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(date),
      date:new Intl.DateTimeFormat(appLanguage === "en" ? "en-GB" : "ru-RU",{timeZone:"Europe/Moscow",day:"2-digit",month:"2-digit",year:"numeric"}).format(date)
    };
  };
  const percent = (part,total) => total ? Math.round(part/total*100) + "%" : "—";
  const periodOptions = [["today","Сегодня"],["7d","7 дней"],["30d","30 дней"],["all","Всё время"]];
  const tabs = [["overview","Обзор"],["audience","Аудитория"],["funnel","Воронка"],["services","VPN-сервисы"],["finance","Финансы"],["sources","Источники"],["geo","География"],["technical","Техника"]];
  const cards = [
    ["Всего пользователей",summary.total_users],
    ["Новые за период",summary.new_users],
    ["Активные за период",summary.active_users],
    ["Вернувшиеся",summary.returning_users],
    ["Активные за 24 часа",summary.active_24h],
    ["Активные за 7 дней",summary.active_7d],
    ["Активные за 30 дней",summary.active_30d],
    ["Партнёрские переходы",summary.clicks]
  ];
  const userRows = (result.users||[]).slice(0,30).map(item=>{
    const profile=item.profile||{};
    const name=[profile.first_name,profile.last_name].filter(Boolean).join(" ")||"—";
    const stamp=dateTime(item.last_seen_at);
    return '<article class="analytics-list-item"><div class="analytics-list-main"><strong>'+esc(name)+'</strong><span>'+esc(profile.username?"@"+profile.username:String(item.telegram_id||"—"))+'</span></div><div class="analytics-list-meta"><span>'+t("Источник")+": "+esc(item.source||"—")+'</span><time><span>'+stamp.time+'</span><span>'+stamp.date+'</span></time></div></article>';
  }).join("");
  const clickRows=(result.clicks||[]).slice(0,30).map(item=>{
    const stamp=dateTime(item.clicked_at);
    const service=(result.services||[]).find(s=>s.id===item.service_id);
    return '<article class="analytics-list-item"><div class="analytics-list-main"><strong>'+esc(service?.name||item.service_id||"—")+'</strong><span>'+esc(String(item.telegram_id||"—"))+'</span></div><time class="analytics-list-time"><span>'+stamp.time+'</span><span>'+stamp.date+'</span></time></article>';
  }).join("");
  const eventRows=(result.events||[]).slice(0,35).map(item=>{
    const stamp=dateTime(item.occurred_at);
    const service=(result.services||[]).find(s=>s.id===item.service_id);
    const labels={app_open:"Открытие приложения",screen_view:"Просмотр экрана",search:"Поиск",filter_change:"Изменение фильтра",service_view:"Просмотр VPN",favorite_add:"Добавление в избранное",favorite_remove:"Удаление из избранного",compare_add:"Добавление к сравнению",compare_remove:"Удаление из сравнения",connect_click:"Переход к провайдеру",language_change:"Смена языка",contact_submit:"Сообщение отправлено",provider_submit:"Заявка отправлена",client_error:"Ошибка JavaScript",app_performance:"Время загрузки"};
    return '<article class="analytics-list-item"><div class="analytics-list-main"><strong>'+t(labels[item.event_name]||item.event_name)+'</strong><span>'+esc(String(item.telegram_id||"—"))+(service?" · "+esc(service.name):"")+'</span></div><time class="analytics-list-time"><span>'+stamp.time+'</span><span>'+stamp.date+'</span></time></article>';
  }).join("");
  const funnel=summary.funnel||{};
  const funnelRows=[["Открыли приложение",funnel.opened||0],["Посмотрели VPN",funnel.viewed||0],["Перешли к провайдеру",funnel.clicked||0]];
  const maxFunnel=Math.max(1,...funnelRows.map(row=>row[1]));
  const serviceRows=(result.services||[]).map(item=>'<article class="analytics-list-item"><div class="analytics-list-main"><strong>'+esc(item.name)+'</strong><span>'+t("Просмотры")+": "+fmt.format(item.views||0)+" · "+t("Пользователи")+": "+fmt.format(item.active_users||0)+'</span></div><strong class="analytics-list-metric">'+fmt.format(item.clicks||0)+'</strong></article>').join("");
  const sourceRows=(result.sources||[]).map(item=>'<article class="analytics-list-item"><div class="analytics-list-main"><strong>'+esc(item.source||"unknown")+'</strong><span>'+t("Сессии")+'</span></div><strong class="analytics-list-metric">'+fmt.format(item.sessions||0)+'</strong></article>').join("");
  const growth=(result.growth||[]);
  const maxGrowth=Math.max(1,...growth.map(item=>item.count||0));
  const growthBars=growth.length?growth.map(item=>'<div class="analytics-growth-row"><time>'+esc(item.date.slice(5))+'</time><span><i style="width:'+Math.max(2,(item.count/maxGrowth)*100)+'%"></i></span><b>'+fmt.format(item.count)+'</b></div>').join(""):'<p class="analytics-empty">Пока нет данных о новых регистрациях за 30 дней</p>';
  root.innerHTML =
    '<div class="analytics-controls"><div class="analytics-periods">'+periodOptions.map(([key,label])=>'<button type="button" data-analytics-period="'+key+'" class="'+(analyticsPeriod===key?'is-active':'')+'">'+t(label)+'</button>').join("")+'</div>'+
    '<div class="analytics-tabs">'+tabs.map(([key,label])=>'<button type="button" data-analytics-tab="'+key+'" class="'+(analyticsTab===key?'is-active':'')+'">'+t(label)+'</button>').join("")+'</div></div>'+
    '<section class="analytics-panel" data-analytics-panel="overview" '+(analyticsTab!=="overview"?"hidden":"")+'><div class="analytics-summary">'+cards.map(([label,value])=>'<article><strong>'+fmt.format(Number(value||0))+'</strong><span>'+t(label)+'</span></article>').join("")+'</div><div class="analytics-section"><h2>'+t("Рост аудитории за 30 дней")+'</h2><div class="analytics-growth">'+growthBars+'</div></div><div class="analytics-section"><h2>'+t("Последние партнёрские переходы")+'</h2><div class="analytics-list">'+(clickRows||'<p class="analytics-empty">—</p>')+'</div></div></section>'+
    '<section class="analytics-panel" data-analytics-panel="audience" '+(analyticsTab!=="audience"?"hidden":"")+'><div class="analytics-summary">'+[["Всего пользователей",summary.total_users],["Новые за период",summary.new_users],["Активные за период",summary.active_users],["Вернувшиеся",summary.returning_users],["Активные 24 часа",summary.active_24h],["Активные 7 дней",summary.active_7d],["Активные 30 дней",summary.active_30d]].map(([label,value])=>'<article><strong>'+fmt.format(Number(value||0))+'</strong><span>'+t(label)+'</span></article>').join("")+'</div><div class="analytics-section"><h2>'+t("Последние пользователи")+'</h2><div class="analytics-list">'+(userRows||'<p class="analytics-empty">—</p>')+'</div></div></section>'+
    '<section class="analytics-panel" data-analytics-panel="funnel" '+(analyticsTab!=="funnel"?"hidden":"")+'><div class="analytics-section"><h2>'+t("Путь пользователя")+'</h2><div class="analytics-funnel">'+funnelRows.map((row,index)=>'<article><div><span>'+(index+1)+'. '+t(row[0])+'</span><strong>'+fmt.format(row[1])+'</strong></div><i><b style="width:'+((row[1]/maxFunnel)*100)+'%"></b></i><small>'+(index===0?"100%":percent(row[1],funnelRows[0][1]))+'</small></article>').join("")+'</div><p class="analytics-note">'+t("Переход к VPN-провайдеру не означает подтверждённое подключение или покупку.")+'</p></div></section>'+
    '<section class="analytics-panel" data-analytics-panel="services" '+(analyticsTab!=="services"?"hidden":"")+'><div class="analytics-section"><h2>'+t("Эффективность VPN-сервисов")+'</h2><div class="analytics-list">'+(serviceRows||'<p class="analytics-empty">—</p>')+'</div></div></section>'+
    '<section class="analytics-panel" data-analytics-panel="finance" '+(analyticsTab!=="finance"?"hidden":"")+'><div class="analytics-placeholder"><strong>'+t("Финансовая аналитика")+'</strong><p>'+t("Раздел будет активирован после подключения подтверждённых партнёрских конверсий и данных о выплатах. Переходы по ссылкам не считаются доходом.")+'</p></div></section>'+
    '<section class="analytics-panel" data-analytics-panel="sources" '+(analyticsTab!=="sources"?"hidden":"")+'><div class="analytics-section"><h2>'+t("Источники трафика по сессиям")+'</h2><div class="analytics-list">'+(sourceRows||'<p class="analytics-empty">—</p>')+'</div><p class="analytics-note">'+t("Для точной атрибуции используйте UTM-метки в ссылках запуска.")+'</p></div></section>'+
    '<section class="analytics-panel" data-analytics-panel="geo" '+(analyticsTab!=="geo"?"hidden":"")+'><div class="analytics-placeholder"><strong>'+t("География пока не собирается")+'</strong><p>'+t("В текущих данных нет подтверждённой страны пользователя. Язык Telegram не используется как географический признак.")+'</p></div></section>'+
    '<section class="analytics-panel" data-analytics-panel="technical" '+(analyticsTab!=="technical"?"hidden":"")+'><div class="analytics-summary"><article><strong>'+fmt.format(summary.events||0)+'</strong><span>'+t("События за период")+'</span></article><article><strong>'+fmt.format(summary.sessions||0)+'</strong><span>'+t("Сессии за период")+'</span></article><article><strong>'+fmt.format(summary.errors||0)+'</strong><span>'+t("Ошибки JavaScript")+'</span></article><article><strong>'+(summary.avg_load_ms==null?"—":fmt.format(summary.avg_load_ms)+" ms")+'</strong><span>'+t("Среднее время загрузки")+'</span></article></div><p class="analytics-note">'+t("Ошибки браузера ограничены пятью событиями на один запуск приложения. Время загрузки измеряется по Navigation Timing API.")+'</p><div class="analytics-section"><h2>'+t("Последние события")+'</h2><div class="analytics-list">'+(eventRows||'<p class="analytics-empty">—</p>')+'</div></div></section>'+
    '<div class="analytics-updated">'+t("Обновлено")+": "+dateTime(new Date().toISOString()).time+" · "+t("Автообновление раз в час")+'</div>';
  if (!root.dataset.analyticsBound) {
    root.dataset.analyticsBound="true";
    root.addEventListener("click",event=>{
      const periodButton=event.target.closest("[data-analytics-period]");
      if(periodButton){analyticsPeriod=periodButton.dataset.analyticsPeriod;loadStatisticsDashboard(true);return;}
      const tabButton=event.target.closest("[data-analytics-tab]");
      if(tabButton){analyticsTab=tabButton.dataset.analyticsTab;root.querySelectorAll("[data-analytics-tab]").forEach(button=>button.classList.toggle("is-active",button===tabButton));root.querySelectorAll("[data-analytics-panel]").forEach(panel=>panel.hidden=panel.dataset.analyticsPanel!==analyticsTab);}
    });
  }
}
async function loadStatisticsDashboard(force = false) {
  const root=byId("analytics-dashboard");
  const menuRow=byId("analytics-menu-row");
  const inboxMenuRow=byId("support-inbox-menu-row");
  const monitoringMenuRow=byId("monitoring-menu-row");
  const managementGroup=byId("profile-management-group");
  const isOwner=Number(tg?.initDataUnsafe?.user?.id||0)===ANALYTICS_OWNER_TELEGRAM_ID;
  if(menuRow)menuRow.hidden=!isOwner;
  if(inboxMenuRow)inboxMenuRow.hidden=!isOwner;
  if(monitoringMenuRow)monitoringMenuRow.hidden=!isOwner;
  if(managementGroup)managementGroup.hidden=!isOwner;
  if(!isOwner){if(root)root.textContent=t("Нет доступа к статистике.");return;}
  if(!root||analyticsDashboardLoading)return;
  if(!tg?.initData){root.textContent=t("Откройте приложение в Telegram, чтобы посмотреть статистику.");return;}
  const cached=analyticsCache.get(analyticsPeriod);
  if(!force&&cached&&Date.now()-cached.loadedAt<60*60*1000){renderStatisticsDashboard(cached.data);return;}
  analyticsDashboardLoading=true;
  root.classList.add("is-loading");
  try{
    const response=await fetch(SUPABASE_URL+"/functions/v1/analytics-admin",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({initData:tg.initData,period:analyticsPeriod})
    });
    const result=await response.json().catch(()=>null);
    if(!response.ok||!result?.ok){if(menuRow)menuRow.hidden=true;root.textContent=t("Нет доступа к статистике.");return;}
    analyticsAccessChecked=true;
    if(menuRow)menuRow.hidden=false;
    analyticsCache.set(analyticsPeriod,{data:result,loadedAt:Date.now()});
    renderStatisticsDashboard(result);
  }catch(_){root.textContent=t("Не удалось загрузить статистику.");}
  finally{root.classList.remove("is-loading");analyticsDashboardLoading=false;}
}

function monitoringDate(value) {
  if (!value) return "Пока нет данных";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  return new Intl.DateTimeFormat(appLanguage === "en" ? "en-GB" : "ru-RU", {
    timeZone: "Europe/Moscow", day: "2-digit", month: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).format(date);
}
function renderMonitoringDashboard(data) {
  const root = byId("monitoring-dashboard");
  if (!root) return;
  const snapshot = data.snapshot || {};
  const settings = data.settings || {};
  const incidents = Array.isArray(data.incidents) ? data.incidents : [];
  const runs = Array.isArray(data.runs) ? data.runs : [];
  const active = incidents.filter(item => item.status === "active");
  const critical = active.some(item => item.severity === "critical");
  const stateLabel = critical ? "Критическая проблема" : active.length ? "Есть предупреждения" : "Серьёзных отклонений нет";
  const stateClass = critical ? "is-critical" : active.length ? "is-warning" : "is-ok";
  const lastRun = runs[0];
  const fmt = new Intl.NumberFormat(appLanguage === "en" ? "en-US" : "ru-RU");
  const incidentRows = incidents.length ? incidents.map(item => {
    const level = item.severity === "critical" ? "Критично" : item.severity === "warning" ? "Внимание" : "Информация";
    return '<article class="monitoring-incident ' + (item.status === "resolved" ? "is-resolved" : "") + '"><div class="monitoring-incident-top"><strong>' + esc(item.title) + '</strong><span class="monitoring-severity ' + esc(item.severity) + '">' + level + '</span></div><p>' + esc(item.description) + '</p><div class="monitoring-incident-meta"><span>' + (item.status === "active" ? "Активно" : "Устранено") + '</span><time>' + monitoringDate(item.last_seen_at) + '</time><span>Повторений: ' + fmt.format(item.occurrences || 1) + '</span></div></article>';
  }).join("") : '<p class="monitoring-empty">Инцидентов пока нет. Система будет сохранять здесь обнаруженные отклонения.</p>';
  const settingRows = [
    ["technical_enabled", "Техническое состояние", "Доступность приёма событий, ошибки и скорость загрузки"],
    ["business_enabled", "Партнёрские переходы", "Падение общего числа переходов и переходов по отдельным VPN"],
    ["audience_enabled", "Активность аудитории", "Существенное снижение числа активных пользователей"],
    ["quality_enabled", "Качество данных", "События без Telegram ID и некорректные данные"]
  ];
  const settingsHtml = settingRows.map(([key, label, description]) =>
    '<label class="monitoring-setting"><span><strong>' + label + '</strong><small>' + description + '</small></span><input type="checkbox" data-monitoring-setting="' + key + '" ' + (settings[key] !== false ? "checked" : "") + '></label>'
  ).join("");
  const p95 = snapshot.p95_load_ms_24h == null ? "—" : fmt.format(Math.round(Number(snapshot.p95_load_ms_24h))) + " мс";
  root.innerHTML =
    '<div class="monitoring-toolbar"><span class="monitoring-status ' + stateClass + '"><i></i>' + stateLabel + '</span><button type="button" class="monitoring-action" data-monitoring-action="refresh">Обновить</button></div>' +
    '<div class="monitoring-summary">' +
      '<article><span>Активные проблемы</span><strong>' + fmt.format(active.length) + '</strong></article>' +
      '<article><span>События за час</span><strong>' + fmt.format(snapshot.events_1h || 0) + '</strong></article>' +
      '<article><span>Ошибки за час</span><strong>' + fmt.format(snapshot.errors_1h || 0) + '</strong></article>' +
      '<article><span>Переходы за 24 часа</span><strong>' + fmt.format(snapshot.clicks_24h || 0) + '</strong></article>' +
    '</div>' +
    '<section class="monitoring-panel"><div class="monitoring-panel-heading"><h2>Состояние системы</h2><span>Автоматические проверки</span></div>' +
      '<div class="monitoring-metric"><span>Приём аналитических событий</span><strong>' + (lastRun?.status === "ok" ? "Проверка пройдена" : "Ожидает первой проверки") + '</strong></div>' +
      '<div class="monitoring-metric"><span>Последнее событие</span><strong>' + monitoringDate(snapshot.last_event_at) + '</strong></div>' +
      '<div class="monitoring-metric"><span>Последняя успешная запись</span><strong>' + monitoringDate(snapshot.last_ingest_success_at) + '</strong></div>' +
      '<div class="monitoring-metric"><span>p95 загрузки приложения</span><strong>' + p95 + '</strong></div>' +
      '<div class="monitoring-metric"><span>Последняя проверка</span><strong>' + monitoringDate(lastRun?.finished_at || lastRun?.started_at) + '</strong></div>' +
      '<p class="monitoring-note">Отсутствие новых событий само по себе не считается сбоем: при низкой посещаемости это нормально. Доступность функции приёма событий проверяется отдельно.</p>' +
    '</section>' +
    '<section class="monitoring-panel"><div class="monitoring-panel-heading"><h2>Автоматические уведомления</h2><span>Telegram владельцу</span></div>' + settingsHtml +
      '<div class="monitoring-schedule"><span>Технические проверки</span><strong>Каждые 5 минут</strong></div><div class="monitoring-schedule"><span>Бизнес-показатели</span><strong>Каждый час</strong></div><div class="monitoring-schedule"><span>Утренний отчёт</span><strong>Ежедневно в 10:00 МСК</strong></div>' +
      '<button type="button" class="monitoring-primary-action" data-monitoring-action="test" ' + (data.telegram_configured ? "" : "disabled") + '>Отправить тестовое уведомление</button>' +
      '<p class="monitoring-note">В Telegram сразу отправляются только критические проблемы и сообщения об их устранении. Предупреждения сохраняются здесь и включаются в ежедневный отчёт в 10:00 по Москве. Повторы одного инцидента не создают новые сообщения.</p>' +
    '</section>' +
    '<section class="monitoring-panel"><div class="monitoring-panel-heading"><h2>История инцидентов</h2><span>' + fmt.format(incidents.length) + '</span></div><div class="monitoring-incident-list">' + incidentRows + '</div></section>' +
    '<section class="monitoring-panel"><div class="monitoring-panel-heading"><h2>История проверок</h2><span>Последние 20</span></div>' +
      (runs.length ? runs.map(item => '<div class="monitoring-run"><span>' + (item.check_type === "technical" ? "Техническая" : "Бизнес") + '</span><strong class="' + (item.status === "ok" ? "is-ok" : "is-warning") + '">' + (item.status === "ok" ? "Успешно" : "Ошибка") + '</strong><time>' + monitoringDate(item.finished_at || item.started_at) + '</time></div>').join("") : '<p class="monitoring-empty">Проверки ещё не запускались.</p>') +
    '</section>';
  if (!root.dataset.monitoringBound) {
    root.dataset.monitoringBound = "true";
    root.addEventListener("click", async event => {
      const button = event.target.closest("[data-monitoring-action]");
      if (!button) return;
      const action = button.dataset.monitoringAction;
      if (action === "refresh") { await loadMonitoringDashboard(true); return; }
      if (action === "test") {
        button.disabled = true;
        button.textContent = "Отправляем…";
        try {
          const response = await fetch(SUPABASE_URL + "/functions/v1/monitoring-admin", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "test", initData: tg?.initData || "" })
          });
          const result = await response.json().catch(() => null);
          button.textContent = response.ok && result?.ok ? "Тест отправлен" : "Не удалось отправить";
        } catch (_) { button.textContent = "Не удалось отправить"; }
        window.setTimeout(() => { button.disabled = false; button.textContent = "Отправить тестовое уведомление"; }, 2400);
      }
    });
    root.addEventListener("change", async event => {
      const input = event.target.closest("[data-monitoring-setting]");
      if (!input) return;
      const key = input.dataset.monitoringSetting;
      input.disabled = true;
      try {
        const response = await fetch(SUPABASE_URL + "/functions/v1/monitoring-admin", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "update_settings", initData: tg?.initData || "", [key]: input.checked })
        });
        const result = await response.json().catch(() => null);
        if (!response.ok || !result?.ok) throw new Error("Settings update failed");
      } catch (_) { input.checked = !input.checked; }
      finally { input.disabled = false; }
    });
  }
}
async function loadMonitoringDashboard(force = false) {
  const root = byId("monitoring-dashboard");
  if (!root) return;
  const isOwner = Number(tg?.initDataUnsafe?.user?.id || 0) === ANALYTICS_OWNER_TELEGRAM_ID;
  if (!isOwner) { root.textContent = t("Нет доступа к мониторингу."); return; }
  if (!tg?.initData) { root.textContent = t("Откройте приложение в Telegram, чтобы посмотреть мониторинг."); return; }
  if (root.dataset.loading === "true") return;
  root.dataset.loading = "true";
  root.classList.add("is-loading");
  if (force || !root.dataset.loaded) root.innerHTML = '<div class="monitoring-loading">Загружаем состояние системы…</div>';
  try {
    const response = await fetch(SUPABASE_URL + "/functions/v1/monitoring-admin", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "dashboard", initData: tg.initData })
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.ok) throw new Error("Monitoring dashboard request failed");
    renderMonitoringDashboard(result);
    root.dataset.loaded = "true";
  } catch (_) {
    root.innerHTML = '<div class="monitoring-empty">Не удалось загрузить мониторинг. Попробуйте обновить экран.</div><button type="button" class="monitoring-action" data-monitoring-action="refresh">Повторить</button>';
  } finally {
    root.classList.remove("is-loading");
    root.dataset.loading = "false";
  }
}

window.setInterval(()=>{
  if(document.visibilityState==="visible"&&byId("screen-analytics")?.classList.contains("active"))loadStatisticsDashboard(true);
},60*60*1000);
document.addEventListener("visibilitychange",()=>{
  if(document.visibilityState==="visible"&&byId("screen-analytics")?.classList.contains("active")){
    const cached=analyticsCache.get(analyticsPeriod);
    if(!cached||Date.now()-cached.loadedAt>=60*60*1000)loadStatisticsDashboard(true);
  }
});

const byId = id => document.getElementById(id);
const LANGUAGE_KEY = "vpn-finder-language";
const translations = {
  ru: {},
  en: {
    "Ошибки JavaScript":"JavaScript errors","Среднее время загрузки":"Average load time",
    "Ошибки браузера ограничены пятью событиями на один запуск приложения. Время загрузки измеряется по Navigation Timing API.":"Browser errors are capped at five events per app launch. Load time is measured with the Navigation Timing API.",
    "Ошибка JavaScript":"JavaScript error","Время загрузки":"Load time",
    "Сегодня":"Today","7 дней":"7 days","30 дней":"30 days","Всё время":"All time",
    "Обзор":"Overview","Аудитория":"Audience","Воронка":"Funnel","VPN-сервисы":"VPN services",
    "Финансы":"Finances","География":"Geography","Техника":"Technical",
    "Новые за период":"New in period","Активные за период":"Active in period","Вернувшиеся":"Returning users",
    "Активные за 24 часа":"Active in 24 hours","Активные за 7 дней":"Active in 7 days","Активные за 30 дней":"Active in 30 days",
    "Активные 24 часа":"Active in 24 hours","Активные 7 дней":"Active in 7 days","Активные 30 дней":"Active in 30 days",
    "Рост аудитории за 30 дней":"Audience growth over 30 days","Последние партнёрские переходы":"Latest affiliate clicks",
    "Последние пользователи":"Recent users","Путь пользователя":"User journey","Открыли приложение":"Opened the app",
    "Посмотрели VPN":"Viewed a VPN","Перешли к провайдеру":"Clicked through to provider","Просмотры":"Views",
    "Пользователи":"Users","Переход к VPN-провайдеру не означает подтверждённое подключение или покупку.":"A click to a VPN provider does not confirm a connection or purchase.",
    "Финансовая аналитика":"Financial analytics","Раздел будет активирован после подключения подтверждённых партнёрских конверсий и данных о выплатах. Переходы по ссылкам не считаются доходом.":"This section will be enabled when verified affiliate conversions and payout data are connected. Link clicks are not revenue.",
    "Источники трафика по сессиям":"Traffic sources by sessions","Для точной атрибуции используйте UTM-метки в ссылках запуска.":"Use UTM parameters in launch links for accurate attribution.",
    "География пока не собирается":"Geography is not collected yet","В текущих данных нет подтверждённой страны пользователя. Язык Telegram не используется как географический признак.":"Current data does not contain a verified user country. Telegram language is not treated as location.",
    "События за период":"Events in period","Сессии за период":"Sessions in period","Мониторинг ошибок и скорости":"Error and performance monitoring",
    "Сейчас собираются продуктовые события. Отдельный сбор ошибок JavaScript, времени загрузки и отказов запросов ещё не подключён, поэтому показатели не имитируются.":"Product events are collected. JavaScript errors, load times and request failures are not tracked yet, so no figures are fabricated.",
    "Последние события":"Recent events","Обновлено":"Updated","Автообновление раз в час":"Refreshes every hour",
    "Изменение фильтра":"Filter changed","Просмотр VPN":"VPN viewed","Добавление в избранное":"Added to favorites",
    "Удаление из избранного":"Removed from favorites","Добавление к сравнению":"Added to comparison",
    "Удаление из сравнения":"Removed from comparison","Переход к провайдеру":"Provider click","Просмотр экрана":"Screen viewed",
    "Язык":"Language","Русский":"Russian","English":"English","Выберите язык приложения":"Choose the app language",
    "Откройте приложение в Telegram, чтобы сменить язык.":"Open the app in Telegram to change the language.",
    "Загрузка статистики…":"Loading statistics…","Нет доступа к статистике.":"No access to statistics.",
    "Не удалось загрузить статистику.":"Could not load statistics.","Сессии":"Sessions","События":"Events",
    "Переходы":"Clicks","Последние события":"Recent events","Пользователи":"Users","Источники":"Sources","Ключевые события":"Key events","Открытие приложения":"App opened","Просмотр сервиса":"Service viewed","Переход по ссылке":"Affiliate link opened","Сообщение отправлено":"Message sent","Заявка отправлена":"Provider request sent",
    "Партнёрские переходы":"Affiliate clicks","Событие":"Event","Сервис":"Service","Время":"Time",
    "Статистика":"Statistics","Пользователи и сессии":"Users and sessions","Пользователь":"User","Источник":"Source","Активность":"Activity","Источники трафика":"Traffic sources","Тип":"Type","Статус":"Status","Сумма":"Amount","Комиссия":"Commission","Не удалось открыть партнёрскую ссылку. Попробуйте ещё раз.":"Could not open the partner link. Please try again.",
    "Всего пользователей":"Total users","Новые за 24 часа":"New in 24 hours","Активные за 24 часа":"Active in 24 hours","Активные за 7 дней":"Active in 7 days","Активные за 30 дней":"Active in 30 days","Всего событий":"Total events","Последние пользователи":"Recent users",
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
    "Рейтинг ":"Rating "," из 5":" out of 5","Рейтинг пока не сформирован":"No rating yet","Поддержать Stars":"Support with Stars",
    "Управление":"Management","Сообщения":"Messages","НОВОЕ":"NEW","Топ":"Top",
    "Сообщение":"Message","Отправить":"Send","Чем можем помочь?":"How can we help?",
    "Задайте вопрос, поделитесь идеей или расскажите о проблеме. Мы прочитаем сообщение и ответим здесь же.":"Ask a question, share an idea, or tell us about a problem. We’ll read your message and reply right here.",
    "Новости. Есть новое обновление":"News. There is a new update",
    "Откройте приложение в Telegram, чтобы посмотреть статистику.":"Open the app in Telegram to view statistics.",
    "Оплата прошла! Значок появится в профиле.":"Payment successful! Your badge will appear in your profile.",
    "Оценить сервис":"Rate this service","Поставить оценку":"Submit rating",
    "Не удалось сохранить оценку. Попробуйте ещё раз.":"Could not save your rating. Please try again.",
    "Сообщения. Новых сообщений: ":"Messages. Unread messages: ","Вы: ":"You: ","Вчера":"Yesterday",
    "Развиваем платформу и расширяем каталог VPN-сервисов":"We're improving the platform and expanding the VPN directory",
    "24 ноября 2026":"November 24, 2026","VPN Finder готовится к запуску":"VPN Finder is getting ready to launch",
    "Проект активно развивается: мы совершенствуем платформу и постепенно добавляем новые VPN-сервисы, чтобы выбирать подходящее решение было ещё удобнее.":"The project is growing: we're improving the platform and gradually adding new VPN services to make it easier to find the right option.",
    "Каталог VPN-сервисов постоянно расширяется.":"The VPN directory is constantly expanding.",
    "Мы открыты к сотрудничеству с владельцами и командами VPN-проектов.":"We welcome partnerships with VPN providers and teams.",
    "Скоро состоится запуск VPN Finder. Следите за обновлениями!":"VPN Finder will be launching soon. Stay tuned!",
    "Хотите добавить свой сервис или обсудить сотрудничество? Напишите нам через разделом":"Want to add your service or discuss a partnership? Contact us through",
    "«Владельцам VPN»":"“For VPN providers”","Метка о новых публикациях в меню профиля":"A badge for new posts in the profile menu",
    "Новости стали удобнее":"News just got better","В меню профиля появляется метка «Новое».":"A “NEW” badge appears in the profile menu.",
    "Откройте новости, чтобы прочитать публикацию.":"Open News to read a post.","После просмотра метка исчезает.":"The badge disappears after you view the post.",
    "Помоги проекту развиваться и делать поиск VPN удобнее.":"Help the project grow and make finding a VPN easier.",
    "Выбери сумму поддержки":"Choose an amount to contribute","КРИПТОВАЛЮТА":"CRYPTOCURRENCY",
    "USDT в сети TON":"USDT on TON","Переведи любую удобную сумму на адрес ниже. Перед отправкой проверь сеть TON.":"Send any amount to the address below. Make sure you select the TON network before sending.",
    "Больше внимания вашему VPN":"Get more visibility for your VPN","Добавьте сервис в каталог Finder и станьте заметнее для новых пользователей.":"Add your service to the Finder directory and get discovered by more users.",
    "VPN FINDER · ДЛЯ ВЛАДЕЛЬЦЕВ":"VPN FINDER · FOR PROVIDERS","Владельцам VPN":"For VPN providers",
    "Добавьте свой сервис в каталог VPN Finder.":"Add your service to the VPN Finder directory.",
    "Название сервиса":"Service name","Название VPN":"VPN name","Оф сайт или ссылка ТГ":"Website or Telegram link",
    "Сайт или ссылка на Telegram":"Website or Telegram link","Расскажите о сервисе":"Tell us about your service",
    "Контакт для связи":"Contact details","@username или email":"@username or email",
    "@username, email или другой контакт":"@username, email, or another contact","Отправить заявку":"Submit application",
    "Для владельцев VPN":"For VPN providers","Голубая стеклянная сфера с золотой звездой":"Blue glass sphere with a golden star",
    "Глянцевая голубая подарочная коробка с золотым бантом":"Glossy blue gift box with a golden bow"
  }
};
let appLanguage = (() => {
  try {
    const saved = localStorage.getItem(LANGUAGE_KEY);
    return saved === "en" || saved === "ru" ? saved : (tg?.initDataUnsafe?.user?.language_code?.toLowerCase().startsWith("en") ? "en" : "ru");
  } catch (_) { return "ru"; }
})();
Object.assign(translations.en, {
  "Мониторинг":"Monitoring","Обновить":"Refresh","Критическая проблема":"Critical issue","Есть предупреждения":"Warnings present","Серьёзных отклонений нет":"No significant issues",
  "Активные проблемы":"Active issues","События за час":"Events in the last hour","Ошибки за час":"Errors in the last hour","Переходы за 24 часа":"Clicks in 24 hours",
  "Состояние системы":"System status","Автоматические проверки":"Automated checks","Приём аналитических событий":"Analytics event intake","Проверка пройдена":"Check passed",
  "Последнее событие":"Last event","Последняя успешная запись":"Last successful write","p95 загрузки приложения":"App load p95","Последняя проверка":"Last check",
  "Пока нет данных":"No data yet","Отсутствие новых событий само по себе не считается сбоем: при низкой посещаемости это нормально. Доступность функции приёма событий проверяется отдельно.":"No new events do not automatically mean an outage; this is normal with low traffic. The event intake endpoint is checked separately.",
  "Автоматические уведомления":"Automatic alerts","Telegram владельцу":"Telegram to owner","Техническое состояние":"Technical health","Доступность приёма событий, ошибки и скорость загрузки":"Event intake, errors and load speed",
  "Партнёрские переходы":"Partner clicks","Падение общего числа переходов и переходов по отдельным VPN":"Drops in total clicks and individual VPN providers",
  "Активность аудитории":"Audience activity","Существенное снижение числа активных пользователей":"Significant decline in active users",
  "Качество данных":"Data quality","События без Telegram ID и некорректные данные":"Events without Telegram ID and invalid data",
  "Технические проверки":"Technical checks","Бизнес-показатели":"Business metrics","Каждые 5 минут":"Every 5 minutes","Каждый час":"Every hour",
  "Отправить тестовое уведомление":"Send test notification","Отправляем…":"Sending…","Тест отправлен":"Test sent","Не удалось отправить":"Could not send",
  "История инцидентов":"Incident history","Инцидентов пока нет. Система будет сохранять здесь обнаруженные отклонения.":"No incidents yet. Detected issues will appear here.",
  "Критично":"Critical","Внимание":"Warning","Информация":"Info","Активно":"Active","Устранено":"Resolved","Повторений: ":"Occurrences: ",
  "История проверок":"Check history","Последние 20":"Last 20","Техническая":"Technical","Бизнес":"Business","Успешно":"Success","Ошибка":"Error",
  "Проверки ещё не запускались.":"No checks have run yet.","Загружаем состояние системы…":"Loading system status…",
  "Не удалось загрузить мониторинг. Попробуйте обновить экран.":"Could not load monitoring. Try refreshing the screen.",
  "Нет доступа к мониторингу.":"Monitoring access denied.","Откройте приложение в Telegram, чтобы посмотреть мониторинг.":"Open the app in Telegram to view monitoring."
});
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
  document.querySelectorAll("[placeholder],[aria-label],[title],[alt]").forEach(el => {
    ["placeholder","aria-label","title","alt"].forEach(attr => {
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
const BACK_SCREENS = new Set(["news", "contact", "owners", "owner-promo", "analytics", "monitoring", "support", "support-inbox"]);
let ownersBackScreen = "catalog";

// Update this version whenever a new news publication is added.
const NEWS_LATEST_ID = "2026-11-24-project-growth-v1";
function newsSeenStorageKey() {
  const telegramId = Number(tg?.initDataUnsafe?.user?.id || 0);
  return "vpn-finder-news-seen:" + (telegramId || "guest");
}
function updateNewsBadge() {
  const row = document.querySelector('.profile-menu-row[data-go="news"]');
  const badge = row?.querySelector(".news-unread-badge");
  if (!row || !badge) return;
  let isUnread = true;
  try { isUnread = localStorage.getItem(newsSeenStorageKey()) !== NEWS_LATEST_ID; } catch (_) {}
  badge.hidden = !isUnread;
  row.setAttribute("aria-label", isUnread ? t("Новости. Есть новое обновление") : t("Новости"));
}
function markNewsAsRead() {
  try { localStorage.setItem(newsSeenStorageKey(), NEWS_LATEST_ID); } catch (_) {}
  updateNewsBadge();
}
updateNewsBadge();

function showScreen(name, backScreen = null) {
  if (tg?.initData && name !== "analytics") trackEvent("screen_view", { screen: name });
  if (name === "profile") loadContactUnreadBadge();
  if (name === "news") markNewsAsRead();
  document.documentElement.classList.toggle("profile-screen-active", name === "profile");
  document.body.classList.toggle("profile-screen-active", name === "profile");
  document.documentElement.classList.toggle("contact-screen-active", name === "contact");
  document.body.classList.toggle("contact-screen-active", name === "contact");
  document.body.classList.toggle("contact-no-bottom-navigation", name === "contact");
  document.documentElement.classList.toggle("support-inbox-screen-active", name === "support-inbox");
  document.body.classList.toggle("support-inbox-screen-active", name === "support-inbox");
  document.documentElement.classList.toggle("support-inbox-list-mode", name === "support-inbox");
  document.documentElement.classList.remove("support-inbox-chat-mode");
  document.documentElement.classList.toggle("support-screen-active", name === "support");
  document.body.classList.toggle("support-screen-active", name === "support");
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
  if ((name === "analytics" || name === "support-inbox" || name === "monitoring") && Number(tg?.initDataUnsafe?.user?.id || 0) !== ANALYTICS_OWNER_TELEGRAM_ID) return;
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
  if (name === "analytics") loadStatisticsDashboard();
  if (name === "monitoring") loadMonitoringDashboard();
  if (name === "contact") loadContactConversation();
  if (name === "support-inbox") loadSupportInbox();
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (name === "favorites") renderFavorites();
  if (name === "compare") renderCompare();
  if (name === "profile") { syncTelegramProfile(); if (!analyticsAccessChecked) loadStatisticsDashboard(); loadSupportUnreadBadge(); }
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
  let lastActiveNavItem = null;

  const setIndicator = (left, width) => {
    const inset = 4;
    indicator.style.width = Math.max(0, width - inset * 2) + "px";
    indicator.style.transform = `translateX(${left + inset}px)`;
  };
  const getNavItemBounds = item => {
    const navRect = navBar.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    return {
      left: itemRect.left - navRect.left,
      width: itemRect.width,
      center: itemRect.left + itemRect.width / 2 - navRect.left
    };
  };

  moveIndicator = () => {
    const active = nav.find(item => item.classList.contains("active"));
    if (!active) {
      indicator.hidden = true;
      lastActiveNavItem = null;
      return;
    }
    const bounds = getNavItemBounds(active);
    if (!bounds.width || !navBar.getBoundingClientRect().width) return;
    indicator.hidden = false;
    setIndicator(bounds.left, bounds.width);

    const changed = lastActiveNavItem !== null && lastActiveNavItem !== active;
    lastActiveNavItem = active;
    if (changed) {
      indicator.classList.remove("is-settling");
      void indicator.offsetWidth;
      indicator.classList.add("is-settling");
    }
  };

  const slideIndicatorToFinger = clientX => {
    const navRect = navBar.getBoundingClientRect();
    const points = nav.map(item => getNavItemBounds(item));
    if (!points.length) return;
    const x = Math.max(points[0].center, Math.min(clientX - navRect.left, points[points.length - 1].center));
    const right = points.findIndex(point => point.center >= x);
    if (right <= 0) {
      setIndicator(points[0].left, points[0].width);
      return;
    }
    const leftPoint = points[right - 1];
    const rightPoint = points[right];
    const distance = rightPoint.center - leftPoint.center || 1;
    const progress = (x - leftPoint.center) / distance;
    setIndicator(
      leftPoint.left + (rightPoint.left - leftPoint.left) * progress,
      leftPoint.width + (rightPoint.width - leftPoint.width) * progress
    );
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

  const clearPressState = () => {
    navBar.classList.remove("is-pressed");
    navBar.querySelectorAll(".nav-item.is-pressed").forEach(item => item.classList.remove("is-pressed"));
    byId("profile-nav-button")?.classList.remove("is-pressed");
  };
  navBar.addEventListener("pointerdown", event => {
    navBar.classList.add("is-pressed");
    const pressedItem = event.target.closest(".nav-item");
    if (pressedItem) pressedItem.classList.add("is-pressed");

    if (!pressedItem || !pressedItem.classList.contains("active") || event.pointerType === "mouse") return;
    draggingNav = true;
    dragMoved = false;
    startX = event.clientX;
    navBar.classList.add("is-dragging");
    try { navBar.setPointerCapture(event.pointerId); } catch (_) {}
  });
  navBar.addEventListener("pointermove", event => {
    if (!draggingNav) return;
    if (Math.abs(event.clientX - startX) > 6) dragMoved = true;
    if (dragMoved) {
      event.preventDefault();
      slideIndicatorToFinger(event.clientX);
    }
  });

  const stopDragging = event => {
    clearPressState();
    if (!draggingNav) return;
    draggingNav = false;
    navBar.classList.remove("is-dragging");
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
  navBar.addEventListener("lostpointercapture", event => {
    if (!draggingNav) return;
    draggingNav = false;
    navBar.classList.remove("is-dragging");
    clearPressState();
    moveIndicator();
  });
  window.addEventListener("pointerup", clearPressState);
  window.addEventListener("pointercancel", clearPressState);

  const profileButton = byId("profile-nav-button");
  if (profileButton) {
    profileButton.addEventListener("pointerdown", () => profileButton.classList.add("is-pressed"));
    ["pointerup", "pointercancel", "pointerleave", "blur"].forEach(type => {
      profileButton.addEventListener(type, () => profileButton.classList.remove("is-pressed"));
    });
  }

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
async function startStarsPayment() {
  const amount = Number(supportAmount?.value);
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > 100000) {
    if (supportStatus) supportStatus.textContent = t("Введите целое число от 1 до 100 000 Stars.");
    return;
  }
  if (!tg?.initData || typeof tg.openInvoice !== "function") {
    if (supportStatus) supportStatus.textContent = t("Откройте VPN Finder через Telegram, чтобы оплатить Stars.");
    return;
  }
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
  } catch (error) {
    console.error("[VPN Finder] Stars payment error:", error);
    if (supportStatus) supportStatus.textContent = t("Не удалось создать счёт Stars. Проверьте соединение и попробуйте ещё раз.");
  } finally {
  }
}


// Manual USDT support. This does not create invoices or verify blockchain payments.
const cryptoStatus = byId("crypto-support-status");
const cryptoAddress = "UQBt5EVLJ5Q4lljC41RKTGMiXZBevXwRVXIES9Cgy_B9lLgo";
function copySupportValue(value, successMessage) {
  // Try the synchronous WebView-compatible clipboard path while the native
  // button's user gesture is still active (important on iOS Telegram).
  let copied = false;
  let field = null;
  try {
    field = document.createElement("textarea");
    field.value = value;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    field.style.pointerEvents = "none";
    document.body.appendChild(field);
    field.focus();
    field.select();
    field.setSelectionRange(0, field.value.length);
    copied = document.execCommand("copy");
  } catch (_) {
    copied = false;
  } finally {
    field?.remove();
  }
  if (copied) {
    if (cryptoStatus) cryptoStatus.textContent = t(successMessage);
    return;
  }
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(value).then(() => {
      if (cryptoStatus) cryptoStatus.textContent = t(successMessage);
    }).catch(() => {
      if (cryptoStatus) cryptoStatus.textContent = t("Не удалось скопировать. Выдели значение и скопируй вручную.");
    });
    return;
  }
  if (cryptoStatus) cryptoStatus.textContent = t("Не удалось скопировать. Выдели значение и скопируй вручную.");
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
let analyticsSearchTimer = null;
let lastTrackedSearch = "";
search?.addEventListener("input", () => {
  state.query = search.value.trim().toLowerCase();
  clearSearch.hidden = !search.value;
  renderCatalog();
  renderSearchSuggestions();
  if (analyticsSearchTimer) window.clearTimeout(analyticsSearchTimer);
  if (state.query.length >= 2 && state.query !== lastTrackedSearch) {
    const queryLength = state.query.length;
    analyticsSearchTimer = window.setTimeout(() => {
      lastTrackedSearch = state.query;
      trackEvent("search", { query_length: queryLength });
    }, 650);
  }
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
    trackEvent("filter_change", { filter: state.filter });
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
    ? `type="button" data-action="toggle-rating-menu" data-id="${esc(serviceId)}" aria-label="${t("Оценить сервис")}" aria-expanded="false" ${disabled ? "disabled" : ""}`
    : 'aria-hidden="true"';
  const starPath = "M12 1.65c.55 0 1.04.31 1.29.81l2.55 5.17 5.7.83c1.18.17 1.65 1.62.8 2.45l-4.12 4.02.97 5.68c.2 1.18-1.03 2.08-2.08 1.52L12 19.45l-5.1 2.68c-1.06.56-2.29-.34-2.09-1.52l.98-5.68-4.13-4.02c-.85-.83-.38-2.28.8-2.45l5.7-.83 2.55-5.17c.25-.5.74-.81 1.29-.81Z";
  return `<div class="service-rating ${interactive ? "is-interactive" : "is-static"}" role="${interactive ? "group" : "img"}" aria-label="${hasRatings ? t("Рейтинг ") + shown + t(" из 5") : t("Рейтинг пока не сформирован")}">
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
    ${interactive ? `<div class="service-rating-choices" hidden>${[1,2,3,4,5].map(value => `<button class="service-rating-choice ${personal === value ? "is-selected" : ""}" type="button" data-action="rate" data-id="${esc(serviceId)}" data-rating="${value}" aria-label="${t("Поставить оценку")} ${value}" ${disabled ? "disabled" : ""}>${value}</button>`).join("")}</div>` : ""}
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
      badge.setAttribute("aria-label", hasRatings ? t("Рейтинг ") + shown + t(" из 5") : t("Рейтинг пока не сформирован"));
      if (badge.tagName === "BUTTON") badge.disabled = state.ratingPending.has(serviceId);
    }
    current.setAttribute("aria-label", hasRatings ? t("Рейтинг ") + shown + t(" из 5") : t("Рейтинг пока не сформирован"));
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
    try { tg?.showAlert?.(t("Не удалось сохранить оценку. Попробуйте ещё раз.")); } catch (_) {}
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
  const price = formattedPrice == null ? t("Тарифы в боте") : t("от ") + formattedPrice;
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
async function supportRequest(action, values = {}) {
  if (!tg?.initData) throw new Error("Telegram authorization required");
  const response = await fetch(SUPABASE_URL + "/functions/v1/miniapp-inbox", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ initData: tg.initData, action, ...values })
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.ok) throw new Error(result?.error || "Inbox request failed");
  return result;
}
function formatSupportTime(value, withDate = false) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const time = date.toLocaleTimeString(appLanguage === "en" ? "en-GB" : "ru-RU", { hour: "2-digit", minute: "2-digit" });
  if (!withDate) return time;
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return time;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return t("Вчера");
  return date.toLocaleDateString(appLanguage === "en" ? "en-GB" : "ru-RU", { day: "2-digit", month: "2-digit" }) + " " + time;
}
function formatSupportMessageDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const locale = appLanguage === "en" ? "en-GB" : "ru-RU";
  const day = date.toLocaleDateString(locale, { day: "numeric", month: "short" });
  const time = date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  return day + " · " + time;
}
function renderSupportMessages(root, messages, viewerRole = "user", lastReadAt = null) {
  if (!root) return;
  const items = messages || [];
  if (!items.length && viewerRole === "user") {
    root.innerHTML = '<div class="contact-empty-state"><strong>Чем можем помочь?</strong><span>Задайте вопрос, поделитесь идеей или расскажите о проблеме…</span></div>';
    return;
  }
  const readAt = lastReadAt ? Date.parse(lastReadAt) : NaN;
  const checkIcon = read => read
    ? '<svg class="support-read-icon is-read" viewBox="0 0 18 12" aria-hidden="true"><path d="m1.5 6 3.2 3.2L10.5 2.5"/><path d="m11.4 8.1 5.1-5.6"/></svg>'
    : '<svg class="support-read-icon" viewBox="0 0 12 12" aria-hidden="true"><path d="m1.5 6 3.2 3.2L10.5 2.5"/></svg>';
  root.innerHTML = items.map(message => {
    const time = viewerRole === "admin" ? formatSupportMessageDateTime(message.created_at) : formatSupportTime(message.created_at);
    const isOutgoing = message.sender === viewerRole;
    const isRead = isOutgoing && Number.isFinite(readAt) && Date.parse(message.created_at) <= readAt;
    const status = isOutgoing
      ? '<span class="support-message-status" aria-label="' + (isRead ? 'Прочитано' : 'Отправлено') + '" title="' + (isRead ? 'Прочитано' : 'Отправлено') + '">' + checkIcon(isRead) + '</span>'
      : '';
    return '<div class="support-message ' + (isOutgoing ? 'support-message-outgoing' : 'support-message-incoming') + '">' +
      '<span class="support-message-body">' + esc(message.body) + '</span>' +
      (time ? '<time class="support-message-time" datetime="' + esc(message.created_at) + '">' + esc(time) + status + '</time>' : '') +
      '</div>';
  }).join("");
  root.scrollTop = root.scrollHeight;
}
byId("contact-bot-link")?.addEventListener("click", event => {
  if (typeof tg?.openTelegramLink === "function") {
    event.preventDefault();
    tg.openTelegramLink("https://t.me/vpn_view_bot");
  }
});
function renderContactUnreadBadge(count) {
  const row = byId("contact-unread-badge");
  if (!row) return;
  const value = Math.max(0, Number(count) || 0);
  row.textContent = value > 99 ? "99+" : String(value);
  row.hidden = value === 0;
  const menuRow = row.closest(".profile-menu-row");
  if (menuRow) menuRow.setAttribute("aria-label", value ? t("Связаться. Новых сообщений: ") + value : t("Связаться"));
}
async function loadContactUnreadBadge() {
  if (!tg?.initData || Number(tg?.initDataUnsafe?.user?.id || 0) === ANALYTICS_OWNER_TELEGRAM_ID) return;
  try {
    const result = await supportRequest("unread_count");
    renderContactUnreadBadge(result.count);
  } catch (_) {}
}
function syncContactKeyboardViewport(scrollToLatest = false) {
  const page = document.documentElement;
  if (!page.classList.contains("contact-screen-active")) return;
  const viewport = window.visualViewport;
  const height = Math.round(viewport?.height || window.innerHeight);
  page.style.setProperty("--contact-viewport-height", height + "px");
  const field = byId("contact-form")?.elements?.message;
  const keyboardOpen = Boolean(field && document.activeElement === field &&
    (window.innerHeight - height > 80 || viewport));
  page.classList.toggle("contact-keyboard-open", keyboardOpen);
  if (scrollToLatest || keyboardOpen) {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const messages = byId("contact-messages");
        if (messages) messages.scrollTop = messages.scrollHeight;
      });
    });
  }
}
const contactMessageField = byId("contact-form")?.elements?.message;
contactMessageField?.addEventListener("focus", () => {
  window.setTimeout(() => syncContactKeyboardViewport(true), 80);
});
contactMessageField?.addEventListener("blur", () => {
  window.setTimeout(() => {
    if (document.activeElement !== contactMessageField) {
      document.documentElement.classList.remove("contact-keyboard-open");
      if (!document.documentElement.classList.contains("contact-screen-active")) {
        document.documentElement.style.removeProperty("--contact-viewport-height");
      }
    }
  }, 120);
});
window.visualViewport?.addEventListener("resize", () => syncContactKeyboardViewport(true));
window.visualViewport?.addEventListener("scroll", () => syncContactKeyboardViewport());
window.addEventListener("resize", () => syncContactKeyboardViewport());
tg?.onEvent?.("viewportChanged", () => syncContactKeyboardViewport(true));

async function loadContactConversation() {
  const root = byId("contact-messages");
  if (!root || !tg?.initData) return;
  try {
    const result = await supportRequest("get");
    renderSupportMessages(root, result.messages, "user", result.thread?.admin_last_read_at);
    renderContactUnreadBadge(0);
  } catch (_) {}
}
byId("contact-form")?.addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  const field = form.elements.message;
  const message = String(field?.value || "").trim();
  if (!message || button.disabled) return;
  button.classList.remove("is-sending");
  const plane = button.querySelector(".contact-send-plane");
  if (plane) {
    plane.addEventListener("animationend", () => button.classList.remove("is-sending"), { once: true });
    void button.offsetWidth;
    button.classList.add("is-sending");
  }
  button.disabled = true;
  try {
    await supportRequest("send", { message });
    form.reset();
    await loadContactConversation();
  } catch (_) {
    // Keep the draft in the input so the user can retry.
  } finally {
    button.disabled = false;
  }
});
function renderSupportUnreadBadge(count) {
  const row = byId("support-inbox-menu-row");
  const badge = row?.querySelector(".support-unread-badge");
  if (!row || !badge) return;
  const value = Math.max(0, Number(count) || 0);
  badge.textContent = value > 99 ? "99+" : String(value);
  badge.hidden = value === 0;
  row.setAttribute("aria-label", value ? t("Сообщения. Новых сообщений: ") + value : t("Сообщения"));
}
async function loadSupportUnreadBadge() {
  const isOwner = Number(tg?.initDataUnsafe?.user?.id || 0) === ANALYTICS_OWNER_TELEGRAM_ID;
  if (!isOwner || !tg?.initData) return;
  try {
    const result = await supportRequest("unread_count");
    renderSupportUnreadBadge(result.count);
  } catch (_) {}
}
let activeSupportThreadId = null;
function renderSupportThreadList(threads) {
  const root = byId("support-inbox-list");
  if (!root) return;
  root.innerHTML = (threads || []).map(thread => {
    const name = [thread.first_name, thread.last_name].filter(Boolean).join(" ") ||
      (thread.username ? "@" + thread.username : String(thread.telegram_id));
    const preview = (thread.last_message?.sender === "admin" ? t("Вы: ") : "") + (thread.last_message?.body || "");
    const timestamp = thread.last_message?.created_at || thread.last_message_at;
    const unread = Math.max(0, Number(thread.admin_unread_count) || 0);
    return '<button type="button" class="support-thread-row' + (unread > 0 || thread.admin_unread ? ' is-unread' : '') +
      '" data-support-thread="' + esc(thread.id) + '" data-support-name="' + esc(name) + '">' +
      '<span class="support-thread-top"><span class="support-thread-name">' + esc(name) + '</span>' +
      '<time class="support-thread-time">' + esc(formatSupportTime(timestamp, true)) + '</time></span>' +
      '<span class="support-thread-bottom"><span class="support-thread-preview">' + esc(preview) + '</span>' +
      (unread ? '<span class="support-thread-unread">' + (unread > 99 ? "99+" : unread) + '</span>' : '') +
      '</span></button>';
  }).join("");
}
async function loadSupportInbox() {
  const row = byId("support-inbox-menu-row");
  const isOwner = Number(tg?.initDataUnsafe?.user?.id || 0) === ANALYTICS_OWNER_TELEGRAM_ID;
  if (row) row.hidden = !isOwner;
  if (!isOwner) return;
  const list = byId("support-inbox-list");
  const conversation = byId("support-inbox-conversation");
  if (conversation) conversation.hidden = true;
  if (list) list.hidden = false;
  document.documentElement.classList.add("support-inbox-list-mode");
  document.documentElement.classList.remove("support-inbox-chat-mode");
  activeSupportThreadId = null;
  try {
    const result = await supportRequest("list");
    renderSupportThreadList(result.threads);
    renderSupportUnreadBadge((result.threads || []).reduce((sum, thread) => sum + (Number(thread.admin_unread_count) || 0), 0));
  } catch (_) {}
}
loadSupportUnreadBadge();
loadContactUnreadBadge();
setInterval(() => {
  if (document.visibilityState !== "visible") return;
  loadSupportUnreadBadge();
  if (byId("screen-contact")?.classList.contains("active")) {
    loadContactConversation();
  } else {
    loadContactUnreadBadge();
  }
}, 15000);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    loadSupportUnreadBadge();
    loadContactUnreadBadge();
    if (byId("screen-contact")?.classList.contains("active")) loadContactConversation();
  }
});
async function openSupportThread(threadId, name) {
  try {
    const result = await supportRequest("get", { thread_id: threadId });
    activeSupportThreadId = threadId;
    byId("support-inbox-list").hidden = true;
    byId("support-inbox-conversation").hidden = false;
    document.documentElement.classList.remove("support-inbox-list-mode");
    document.documentElement.classList.add("support-inbox-chat-mode");
    const threadProfile = result.thread?.profile || {};
    const fullName = [threadProfile.first_name || result.thread?.first_name, threadProfile.last_name || result.thread?.last_name].filter(Boolean).join(" ") || name || "";
    const username = String(threadProfile.username || result.thread?.username || "").replace(/^@/, "");
    const avatarUrl = String(threadProfile.photo_url || "");
    const initial = (fullName || username || "П").slice(0, 1).toLocaleUpperCase(appLanguage === "en" ? "en-GB" : "ru-RU");
    const title = byId("support-thread-title");
    title.innerHTML =
      '<span class="support-thread-header-copy"><strong class="support-thread-header-name">' + esc(fullName) + '</strong>' +
      (username ? '<a class="support-thread-header-username" href="https://t.me/' + encodeURIComponent(username) + '" target="_blank" rel="noopener noreferrer">@' + esc(username) + '</a>' : '') + '</span>' +
      '<span class="support-thread-header-avatar">' +
      (avatarUrl ? '<img src="' + esc(avatarUrl) + '" alt="" referrerpolicy="no-referrer">' : '<span>' + esc(initial) + '</span>') +
      '</span>';
    const threadAvatar = title.querySelector(".support-thread-header-avatar img");
    if (threadAvatar) threadAvatar.addEventListener("error", () => {
      const fallback = document.createElement("span");
      fallback.textContent = initial;
      threadAvatar.replaceWith(fallback);
    }, { once: true });
    renderSupportMessages(byId("support-inbox-messages"), result.messages, "admin", result.thread?.user_last_read_at);
    loadSupportUnreadBadge();
  } catch (_) {}
}
byId("support-inbox-list")?.addEventListener("click", event => {
  const item = event.target.closest("[data-support-thread]");
  if (item) openSupportThread(item.dataset.supportThread, item.dataset.supportName);
});
byId("support-inbox-back")?.addEventListener("click", () => loadSupportInbox());
byId("support-reply-form")?.addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  const message = String(form.elements.message?.value || "").trim();
  if (!activeSupportThreadId || !message || button.disabled) return;
  button.classList.remove("is-sending");
  const plane = button.querySelector(".contact-send-plane");
  if (plane) {
    plane.addEventListener("animationend", () => button.classList.remove("is-sending"), { once: true });
    void button.offsetWidth;
    button.classList.add("is-sending");
  }
  button.disabled = true;
  try {
    await supportRequest("reply", { thread_id: activeSupportThreadId, message });
    form.reset();
    const result = await supportRequest("get", { thread_id: activeSupportThreadId });
    renderSupportMessages(byId("support-inbox-messages"), result.messages, "admin", result.thread?.user_last_read_at);
  } catch (_) {
  } finally {
    button.disabled = false;
  }
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