(() => {
  const tg = window.Telegram?.WebApp;
  const base = "https://januqesxribuqzmmmdun.supabase.co/functions/v1/";
  const endpoint = base + "partner-portal";
  const profileEndpoint = base + "telegram-profile";
  const $ = (id) => document.getElementById(id);
  const userId = Number(tg?.initDataUnsafe?.user?.id || 0);
  const isOwner = userId === 7838131644;
  let currentDashboard = null;
  let currentAdmin = null;
  let entryLoading = false;
  let dashboardLoading = false;
  let adminLoading = false;
  let step = 1;
  const stepNames = ["Сервис", "Характеристики", "Партнёрство", "Контакт"];

  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  })[ch]);
  const fmt = value => new Intl.NumberFormat("ru-RU").format(Number(value || 0));
  const statusText = value => ({
    draft:"Черновик",submitted:"Отправлена",reviewing:"На проверке",
    changes_requested:"Нужны изменения",approved:"Одобрена",published:"Опубликована",
    rejected:"Отклонена",pending:"На модерации",active:"Активен",paused:"Приостановлен",
    suspended:"Приостановлен",invited:"Приглашение",revoked:"Отозвано"
  }[value] || "В обработке");
  const statusClass = value => ["active","published"].includes(value) ? "is-active" : ["pending","submitted","reviewing","approved","changes_requested"].includes(value) ? "is-pending" : "";
  function feedback(id, message, error = false) {
    const node = $(id);
    if (!node) return;
    node.textContent = message || "";
    node.style.color = error ? "#FF777B" : "";
  }
  function haptic() {
    try { tg?.HapticFeedback?.selectionChanged(); } catch (_) {}
  }
  async function ensureProfile() {
    if (!tg?.initData) throw new Error("Откройте Mini App через Telegram.");
    const response = await fetch(profileEndpoint, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({initData:tg.initData})
    });
    const result = await response.json().catch(()=>null);
    if (!response.ok || !result?.ok) throw new Error(result?.error || "Не удалось подтвердить Telegram.");
  }
  async function api(action, values = {}) {
    await ensureProfile();
    const response = await fetch(endpoint, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({initData:tg.initData,action,...values})
    });
    const result = await response.json().catch(()=>null);
    if (!response.ok || !result?.ok) throw new Error(result?.error || "Не удалось выполнить запрос.");
    return result;
  }
  function showEntryState(state) {
    $("partner-entry-guest").hidden = state !== "guest";
    $("partner-entry-member").hidden = state !== "member";
    $("partner-entry-application").hidden = state !== "application";
  }
  async function loadEntry() {
    if (entryLoading) return;
    entryLoading = true;
    feedback("partner-entry-status","");
    try {
      const data = await api("dashboard");
      currentDashboard = data;
      if (data.memberships?.length) {
        showEntryState("member");
      } else {
        const app = data.applications?.[0];
        if (app) {
          showEntryState("application");
          $("partner-entry-application").innerHTML =
            '<strong>' + esc(app.service_name) + '</strong>' +
            '<span class="partner-status ' + statusClass(app.status) + '">' + esc(statusText(app.status)) + '</span>' +
            '<p>' + esc(app.admin_note || (app.status === "changes_requested" ? "Проверьте комментарий команды и свяжитесь с поддержкой." : "Мы проверяем заявку. Статус обновится здесь.")) + '</p>';
        } else showEntryState("guest");
      }
    } catch (error) {
      showEntryState("guest");
      feedback("partner-entry-status",error.message,true);
    } finally { entryLoading = false; }
  }
  function serviceStats(stats, id) {
    return (stats || []).find(x => x.service_id === id) || {views:0,clicks:0,unique_clicks:0,conversions:0};
  }
  async function loadDashboard() {
    if (dashboardLoading) return;
    dashboardLoading = true;
    const root = $("partner-dashboard-content");
    if (root) root.innerHTML = '<div class="loading-state"><span class="loader"></span></div>';
    try {
      const data = await api("dashboard");
      currentDashboard = data;
      const groups = data.memberships || [];
      if (!groups.length) {
        root.innerHTML = '<div class="partner-empty">Кабинет пока недоступен.</div>';
        return;
      }
      root.innerHTML = groups.map(group => {
        const services = group.services || [];
        const total = (group.stats || []).reduce((acc,x) => ({
          views:acc.views+Number(x.views||0), clicks:acc.clicks+Number(x.clicks||0),
          unique:acc.unique+Number(x.unique_clicks||0), conversions:acc.conversions+Number(x.conversions||0)
        }),{views:0,clicks:0,unique:0,conversions:0});
        const cards = '<div class="partner-stat-grid">' +
          [['Просмотры',total.views],['Переходы',total.clicks],['Уникальные',total.unique],['Подтверждённые',total.conversions]].map(x =>
            '<div class="partner-stat"><strong>'+fmt(x[1])+'</strong><span>'+x[0]+'</span></div>').join("") + '</div>';
        const serviceRows = services.length ? services.map(service => {
          const stat=serviceStats(group.stats,service.id);
          const program=(group.programs||[]).find(x=>x.service_id===service.id)||{};
          const link=(group.links||[]).find(x=>x.service_id===service.id)||{};
          const details=[service.min_price!==null&&service.min_price!==undefined?String(service.min_price)+" "+(service.price_currency||"RUB"):"",service.trial_days? "Пробный период "+service.trial_days+" дн.":"",service.countries_count?service.countries_count+" стран":"",(service.platforms||[]).join(", ")].filter(Boolean).join(" · ");
          const plans=(service.plans||[]).map(p=>typeof p==="string"?p:[p.name,p.price_rub!==undefined?String(p.price_rub)+" ₽":p.price!==undefined?String(p.price)+" "+(p.currency||service.price_currency||""):"",p.duration_days?(p.duration_days+" дн."):p.duration_months?(p.duration_months+" мес."):p.period??""].filter(x=>x!==null&&x!==undefined&&x!=="").join(" · ")).filter(Boolean).join(" / ");
          return '<div class="partner-service-row"><div class="partner-service-head"><strong>'+esc(service.name)+'</strong><span class="partner-status '+statusClass(link.status)+'">'+esc(statusText(link.status))+'</span></div>'+
            '<div class="partner-service-meta">'+fmt(stat.views)+' просмотров · '+fmt(stat.clicks)+' переходов · '+fmt(stat.unique_clicks)+' уникальных</div>'+
            (details?'<div class="partner-service-meta">'+esc(details)+'</div>':"")+
            (plans?'<div class="partner-service-meta">Тарифы: '+esc(plans)+'</div>':"")+
            '<div class="partner-service-meta">Комиссия: '+esc(program.commission_model==="cpa"?"CPA":program.commission_model==="revshare"?"RevShare":program.commission_model==="hybrid"?"Hybrid":"По договорённости")+
            (program.commission_value!==null&&program.commission_value!==undefined?" · "+esc(program.commission_value)+" "+esc(program.commission_currency||""):"")+'</div>'+
            '<div class="partner-service-meta">Подтверждение: '+esc(program.confirmation_method==="api"?"API":program.confirmation_method==="webhook"?"Webhook":program.confirmation_method==="import"?"Импорт":"Вручную")+'</div>'+
            '<div class="partner-action-row">'+(program.referral_url?'<button type="button" data-action="partner-copy-ref" data-url="'+esc(program.referral_url)+'">Скопировать ссылку</button>':"")+
            '<button type="button" data-action="partner-edit" data-service-id="'+esc(service.id)+'" data-partner-id="'+esc(group.partner.id)+'">Предложить изменения</button></div></div>';
        }).join("") : '<div class="partner-empty">Сервис ещё не добавлен.</div><button class="connect-button" type="button" data-go="partner-apply">Добавить VPN-сервис</button>';
        const versions=(group.versions||[]).slice(0,5).map(v=>'<div class="partner-service-row"><div class="partner-service-head"><strong>Изменение №'+fmt(v.version_number)+'</strong><span class="partner-status '+statusClass(v.status)+'">'+esc(statusText(v.status))+'</span></div><div class="partner-service-meta">'+(v.moderator_note?esc(v.moderator_note):"Ожидает решения команды")+'</div></div>').join("");
        return '<section><h2>'+esc(group.partner.name)+'</h2>'+cards+
          '<div><h2>Мой VPN</h2>'+serviceRows+'</div>'+
          '<div><h2>История изменений</h2>'+(versions||'<div class="partner-empty">Изменений пока нет.</div>')+'</div></section>';
      }).join("");
      $("partner-dashboard-name").textContent = groups.length===1 ? groups[0].partner.name : "Ваши партнёрства";
    } catch(error) {
      root.innerHTML='<div class="partner-empty">'+esc(error.message)+'</div>';
    } finally { dashboardLoading=false; }
  }
  function renderApplication(app) {
    const p=app.payload||{};
    return '<div class="partner-admin-row"><div class="partner-admin-head"><strong>'+esc(app.service_name)+'</strong><span class="partner-status '+statusClass(app.status)+'">'+esc(statusText(app.status))+'</span></div>'+
      '<div class="partner-admin-meta">Заявка '+esc(app.id)+' · Telegram ID '+esc(app.applicant_telegram_id)+'</div>'+
      '<div class="partner-admin-meta">'+esc(p.website_url||"")+' · '+esc(p.contact_telegram||"")+'</div>'+
      '<div class="partner-admin-meta">'+esc(p.description||"Описание не указано")+'</div>'+
      '<div class="partner-admin-meta">Комиссия: '+esc(p.commission_model||"manual")+' · Подтверждение: '+esc(p.confirmation_method||"manual")+'</div>'+
      (app.admin_note?'<div class="partner-admin-meta">Комментарий: '+esc(app.admin_note)+'</div>':"")+
      '<textarea class="partner-admin-note" data-note-id="'+esc(app.id)+'" rows="2" maxlength="1000" placeholder="Комментарий владельцу"></textarea>'+
      '<div class="partner-action-row">'+
      (app.status==="submitted"||app.status==="reviewing"||app.status==="changes_requested"?
        '<button class="is-primary" type="button" data-action="partner-admin-review" data-id="'+esc(app.id)+'" data-decision="approved">Одобрить</button>'+
        '<button type="button" data-action="partner-admin-review" data-id="'+esc(app.id)+'" data-decision="changes_requested">Запросить изменения</button>'+
        '<button type="button" data-action="partner-admin-review" data-id="'+esc(app.id)+'" data-decision="rejected">Отклонить</button>':"")+
      (app.status==="approved"?'<button class="is-primary" type="button" data-action="partner-admin-publish" data-id="'+esc(app.id)+'">Опубликовать</button>':"")+
      '</div></div>';
  }
  async function loadAdmin() {
    if (!isOwner || adminLoading) return;
    adminLoading=true;
    $("partner-admin-applications").innerHTML='<div class="loading-state"></div>';
    $("partner-admin-versions").innerHTML='<div class="loading-state"></div>';
    try {
      const data=await api("admin_list");currentAdmin=data;
      const apps=(data.applications||[]).filter(x=>["submitted","reviewing","changes_requested","approved"].includes(x.status));
      $("partner-admin-applications").innerHTML=apps.length?apps.map(renderApplication).join(""):'<div class="partner-empty">Новых заявок нет.</div>';
      const versions=(data.versions||[]).filter(x=>x.status==="pending"||x.status==="changes_requested");
      $("partner-admin-versions").innerHTML=versions.length?versions.map(v=>
        '<div class="partner-admin-row"><div class="partner-admin-head"><strong>Изменение №'+fmt(v.version_number)+'</strong><span class="partner-status is-pending">На модерации</span></div>'+
        '<div class="partner-admin-meta">Сервис '+esc(v.service_id)+' · Партнёр '+esc(v.partner_id)+'</div>'+
        '<div class="partner-admin-meta">'+esc(JSON.stringify(v.payload||{}).slice(0,500))+'</div>'+
        '<textarea class="partner-admin-note" data-note-id="'+esc(v.id)+'" rows="2" maxlength="1000" placeholder="Комментарий владельцу"></textarea>'+
        '<div class="partner-action-row"><button class="is-primary" type="button" data-action="partner-version-review" data-id="'+esc(v.id)+'" data-decision="approved">Одобрить</button>'+
        '<button type="button" data-action="partner-version-review" data-id="'+esc(v.id)+'" data-decision="changes_requested">Запросить изменения</button>'+
        '<button type="button" data-action="partner-version-review" data-id="'+esc(v.id)+'" data-decision="rejected">Отклонить</button></div></div>').join(""):'<div class="partner-empty">Новых изменений нет.</div>';
    } catch(error) {
      $("partner-admin-applications").innerHTML='<div class="partner-empty">'+esc(error.message)+'</div>';
      $("partner-admin-versions").innerHTML="";
    } finally {adminLoading=false;}
  }
  function setStep(next) {
    step=Math.max(1,Math.min(4,next));
    document.querySelectorAll("#partner-application-form [data-partner-step]").forEach(node=>{
      node.hidden=Number(node.dataset.partnerStep)!==step;
      node.classList.toggle("is-active",Number(node.dataset.partnerStep)===step);
    });
    $("partner-step-label").textContent=step+" / 4";
    $("partner-step-name").textContent=stepNames[step-1];
    document.querySelector('[data-action="partner-step-back"]').hidden=step===1;
    document.querySelector('[data-action="partner-step-next"]').hidden=step===4;
    $("partner-submit-button").hidden=step!==4;
  }
  function validateStep() {
    const form=$("partner-application-form");
    const panel=form.querySelector('[data-partner-step="'+step+'"]');
    const required=[...panel.querySelectorAll("[required]")];
    for(const field of required){
      if(!field.value.trim()||!field.checkValidity()){
        field.reportValidity?.();field.focus();return false;
      }
    }
    return true;
  }
  function parsePlans(value,currency="RUB") {
    return String(value||"").split(/\r?\n/).map(line=>{
      const parts=line.split(/[—–|]/).map(x=>x.trim()).filter(Boolean);
      if(!parts.length)return null;
      const priceText=parts[1]||"",price=Number(priceText.replace(/[^0-9,\.]/g,"").replace(",","."));
      const period=parts[2]||"",duration=Number((period.match(/\d+/)||[])[0]||0);
      const plan={name:parts[0]};
      if(priceText&&Number.isFinite(price)){if(currency==="RUB")plan.price_rub=price;else{plan.price=price;plan.currency=currency;}}
      if(duration){if(/мес|month/i.test(period))plan.duration_months=duration;else plan.duration_days=duration;}
      return plan;
    }).filter(Boolean).slice(0,12);
  }
  function formPayload(form) {
    const f=new FormData(form),get=n=>String(f.get(n)||"").trim();
    return {
      website_url:get("website_url"),telegram_url:get("telegram_url"),description:get("description"),logo_url:get("logo_url"),
      contact_telegram:get("contact_telegram"),platforms:get("platforms").split(",").map(x=>x.trim()).filter(Boolean),
      min_price:get("min_price"),price_currency:get("price_currency")||"RUB",trial_days:get("trial_days"),countries_count:get("countries_count"),
      plans:parsePlans(get("plans"),get("price_currency")||"RUB"),refund_policy:get("refund_policy"),
      referral_url:get("referral_url"),commission_model:get("commission_model")||"manual",commission_value:get("commission_value"),
      commission_currency:"RUB",confirmation_method:get("confirmation_method")||"manual"
    };
  }
  async function submitApplication(form) {
    const button=$("partner-submit-button");button.disabled=true;feedback("partner-application-status","Отправляем…");
    try{
      const name=String(new FormData(form).get("service_name")||"").trim();
      await api("submit_application",{service_name:name,payload:formPayload(form)});
      form.reset();setStep(1);feedback("partner-application-status","Заявка отправлена.");
      setTimeout(()=>{if(document.querySelector('#screen-owners.active'))loadEntry();},350);
      if(tg?.HapticFeedback?.notificationOccurred)tg.HapticFeedback.notificationOccurred("success");
      setTimeout(()=>document.querySelector('[data-go="owners"]')?.click(),900);
    }catch(error){feedback("partner-application-status",error.message,true);}
    finally{button.disabled=false;}
  }
  function openEdit(serviceId,partnerId) {
    const group=(currentDashboard?.memberships||[]).find(x=>x.partner.id===partnerId);
    const service=group?.services?.find(x=>x.id===serviceId);
    const program=group?.programs?.find(x=>x.service_id===serviceId)||{};
    if(!service)return;
    const form=$("partner-edit-form"),f=form.elements;
    f.partner_id.value=partnerId;f.service_id.value=serviceId;f.name.value=service.name||"";
    f.description.value=service.description||"";f.logo_url.value=service.logo_url||"";
    f.referral_url.value=program.referral_url||"";f.min_price.value=service.min_price??service.min_price_rub??"";
    f.price_currency.value=service.price_currency||"RUB";f.platforms.value=(service.platforms||[]).join(", ");
    f.trial_days.value=service.trial_days??"";f.countries_count.value=service.countries_count??"";
    f.refund_policy.value=service.refund_policy||"";
    f.plans.value=(service.plans||[]).map(p=>typeof p==="string"?p:[p.name,p.price_rub??p.price??"",p.duration_days?(p.duration_days+" дней"):p.duration_months?(p.duration_months+" мес."):p.period??""].filter(x=>x!==null&&x!==undefined&&x!=="").join(" — ")).join("\n");
    $("partner-edit-section").hidden=false;
    $("partner-edit-section").scrollIntoView({behavior:"smooth",block:"start"});
  }
  async function submitEdit(form) {
    const f=new FormData(form),get=n=>String(f.get(n)||"").trim(),button=form.querySelector('button[type="submit"]');
    button.disabled=true;feedback("partner-edit-status","Отправляем на модерацию…");
    try{
      const payload={name:get("name"),description:get("description"),logo_url:get("logo_url"),referral_url:get("referral_url"),min_price:get("min_price")===""?null:Number(get("min_price")),price_currency:get("price_currency"),platforms:get("platforms").split(",").map(x=>x.trim()).filter(Boolean),trial_days:get("trial_days")===""?null:Number(get("trial_days")),countries_count:get("countries_count")===""?null:Number(get("countries_count")),plans:parsePlans(get("plans"),get("price_currency")||"RUB"),refund_policy:get("refund_policy")};
      await api("request_update",{partner_id:get("partner_id"),service_id:get("service_id"),payload});
      feedback("partner-edit-status","Изменения отправлены на модерацию.");
      $("partner-edit-section").hidden=true;await loadDashboard();
    }catch(error){feedback("partner-edit-status",error.message,true);}
    finally{button.disabled=false;}
  }
  async function createInvite(form) {
    const f=new FormData(form),name=String(f.get("partner_name")||"").trim(),tid=String(f.get("telegram_id")||"").trim();
    const button=form.querySelector('button[type="submit"]');button.disabled=true;feedback("partner-invite-create-status","Создаём приглашение…");
    try{
      const result=await api("admin_invite_create",{partner_name:name,telegram_id:tid||null});
      $("partner-invite-result").hidden=false;
      $("partner-invite-result").innerHTML='<span>Код приглашения · 7 дней</span><code id="partner-created-code">'+esc(result.code)+'</code><button type="button" data-action="partner-copy-code">Скопировать код</button>';
      form.reset();feedback("partner-invite-create-status","Приглашение создано.");
    }catch(error){feedback("partner-invite-create-status",error.message,true);}
    finally{button.disabled=false;}
  }
  async function adminAction(action,id,decision) {
    if(!window.confirm(decision==="approved"?"Одобрить изменения?":decision==="rejected"?"Отклонить?":decision==="publish"?"Опубликовать VPN в каталоге?":"Запросить изменения?"))return;
    try{
      const note=document.querySelector('.partner-admin-note[data-note-id="'+CSS.escape(id)+'"]')?.value.trim()||"";
      if(decision==="changes_requested"&&!note){tg?.showAlert?.("Добавьте комментарий для владельца.");return;}
      if(action==="application")await api("admin_review",{application_id:id,decision,note});
      if(action==="publish")await api("admin_publish",{application_id:id});
      if(action==="version")await api("admin_version_review",{version_id:id,decision,note});
      await loadAdmin();
    }catch(error){tg?.showAlert?.(error.message||"Ошибка");}
  }
  async function acceptInvite() {
    const code=String($("partner-invite-code")?.value||"").trim();
    if(!code){feedback("partner-invite-status","Введите код приглашения.",true);return;}
    try{await api("invite_accept",{code});feedback("partner-invite-status","Приглашение принято.");$("partner-invite-code").value="";await loadEntry();}
    catch(error){feedback("partner-invite-status",error.message,true);}
  }
  async function copyValue(value) {
    if(!value)return;
    try{await navigator.clipboard.writeText(value);}catch(_){
      const area=document.createElement("textarea");area.value=value;area.style.position="fixed";area.style.opacity="0";document.body.append(area);area.select();document.execCommand("copy");area.remove();
    }
    tg?.showPopup?.({title:"Готово",message:"Ссылка скопирована.",buttons:[{type:"ok"}]});
  }
  async function copyCode() {
    const value=$("partner-created-code")?.textContent||"";if(!value)return;
    try{await navigator.clipboard.writeText(value);}catch(_){
      const area=document.createElement("textarea");area.value=value;area.style.position="fixed";area.style.opacity="0";document.body.append(area);area.select();document.execCommand("copy");area.remove();
    }
    tg?.showPopup?.({title:"Готово",message:"Код приглашения скопирован.",buttons:[{type:"ok"}]});
  }

  document.addEventListener("click",event=>{
    const button=event.target.closest("[data-action^='partner-']");
    if(!button)return;
    const action=button.dataset.action;
    if(action==="partner-step-next"){if(validateStep())setStep(step+1);haptic();}
    else if(action==="partner-step-back"){setStep(step-1);haptic();}
    else if(action==="partner-accept-invite"){acceptInvite();}
    else if(action==="partner-edit"){openEdit(button.dataset.serviceId,button.dataset.partnerId);}
    else if(action==="partner-cancel-edit"){$("partner-edit-section").hidden=true;}
    else if(action==="partner-copy-code"){copyCode();}\n    else if(action==="partner-copy-ref"){copyValue(button.dataset.url||"");}
    else if(action==="partner-admin-review"){adminAction("application",button.dataset.id,button.dataset.decision);}
    else if(action==="partner-admin-publish"){adminAction("publish",button.dataset.id,"publish");}
    else if(action==="partner-version-review"){adminAction("version",button.dataset.id,button.dataset.decision);}
    else return;
    event.preventDefault();event.stopPropagation();
  },true);
  $("partner-application-form")?.addEventListener("submit",event=>{event.preventDefault();event.stopImmediatePropagation();if(step!==4){if(validateStep())setStep(step+1);return;}submitApplication(event.currentTarget);},true);
  $("partner-edit-form")?.addEventListener("submit",event=>{event.preventDefault();event.stopImmediatePropagation();submitEdit(event.currentTarget);},true);
  $("partner-invite-form")?.addEventListener("submit",event=>{event.preventDefault();event.stopImmediatePropagation();createInvite(event.currentTarget);},true);

  if(isOwner&&$("partners-admin-menu-row"))$("partners-admin-menu-row").hidden=false;
  const observer=new MutationObserver(()=>{
    if($("screen-owners")?.classList.contains("active"))loadEntry();
    if($("screen-partner-dashboard")?.classList.contains("active"))loadDashboard();
    if($("screen-partner-admin")?.classList.contains("active"))loadAdmin();
  });
  document.querySelectorAll(".screen").forEach(node=>observer.observe(node,{attributes:true,attributeFilter:["class"]}));
  if($("screen-owners")?.classList.contains("active"))loadEntry();
})();