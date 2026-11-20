(() => {
const tg=window.Telegram?.WebApp;
if(tg){tg.ready();tg.expand();try{tg.setHeaderColor("#17212B");tg.setBackgroundColor("#17212B")}catch(_){}}
const byId=id=>document.getElementById(id),screens=[...document.querySelectorAll("[data-screen]")],nav=[...document.querySelectorAll(".nav-item")];
function showScreen(name){screens.forEach(s=>s.classList.toggle("active",s.dataset.screen===name));nav.forEach(b=>{const active=b.dataset.go===name;b.classList.toggle("active",active);if(active)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current")});if(tg?.HapticFeedback)tg.HapticFeedback.selectionChanged();window.scrollTo({top:0,behavior:"smooth"})}
document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>{showScreen(b.dataset.go);if(b.dataset.focusSearch==="true")byId("search")?.focus()}));
byId("profile-shortcut")?.addEventListener("click",()=>showScreen("profile"));
const user=tg?.initDataUnsafe?.user;if(user){const name=[user.first_name,user.last_name].filter(Boolean).join(" ")||"Пользователь";byId("profile-name").textContent=name;byId("avatar-initial").textContent=(user.first_name||"V").slice(0,1).toUpperCase();byId("profile-avatar").textContent=(user.first_name||"V").slice(0,1).toUpperCase()}
if(tg?.platform)byId("platform-value").textContent=tg.platform;
const search=byId("search"),clear=byId("clear-search");search?.addEventListener("input",()=>clear.hidden=!search.value);clear?.addEventListener("click",()=>{search.value="";clear.hidden=true;search.focus()});
document.querySelectorAll(".filter-chip").forEach(chip=>chip.addEventListener("click",()=>{document.querySelectorAll(".filter-chip").forEach(x=>x.classList.remove("active"));chip.classList.add("active");if(tg?.HapticFeedback)tg.HapticFeedback.selectionChanged()}));
})();