// VPN Finder Partners portal. Telegram initData is verified server-side for every request.
const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const OWNER_ID = "7838131644";
const enc = new TextEncoder();
const cors = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
function out(data: unknown, status = 200) { return new Response(JSON.stringify(data), {status, headers:{...cors,"Content-Type":"application/json; charset=utf-8"}}); }
function hex(b:ArrayBuffer){return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");}
function eq(a:string,b:string){if(a.length!==b.length)return false;let d=0;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);return d===0;}
async function mac(k:Uint8Array,m:string){const b=new ArrayBuffer(k.byteLength);new Uint8Array(b).set(k);const key=await crypto.subtle.importKey("raw",b,{name:"HMAC",hash:"SHA-256"},false,["sign"]);return crypto.subtle.sign("HMAC",key,enc.encode(m));}
async function verify(raw:string):Promise<Record<string,string>|null>{
 if(!raw||raw.length>16384||!BOT_TOKEN)return null;
 const p=new URLSearchParams(raw),v:Record<string,string>={};
 for(const [k,x] of p.entries()){if(Object.prototype.hasOwnProperty.call(v,k))return null;v[k]=x;}
 const h=v.hash||"",d=Number(v.auth_date),now=Math.floor(Date.now()/1000);
 if(!/^[a-f0-9]{64}$/i.test(h)||!Number.isSafeInteger(d)||d>now+60||now-d>86400)return null;
 const check=Object.keys(v).filter(k=>k!=="hash").sort().map(k=>k+"="+v[k]).join("\n");
 const secret=await mac(enc.encode("WebAppData"),BOT_TOKEN);
 return eq(hex(await mac(new Uint8Array(secret),check)),h.toLowerCase())?v:null;
}
function credentials(){try{const k=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}");if(k.default)return {key:k.default,auth:""};}catch{}const k=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";return k?{key:k,auth:"Bearer "+k}:null;}
async function db(path:string,init:RequestInit={}){const c=credentials();if(!c||!SUPABASE_URL)throw new Error("Supabase credentials unavailable");const r=await fetch(SUPABASE_URL.replace(/\/$/,"")+"/rest/v1/"+path,{...init,headers:{apikey:c.key,...(c.auth?{Authorization:c.auth}:{}),"Content-Type":"application/json",...(init.headers||{})}});const s=await r.text();let v:any=null;try{v=s?JSON.parse(s):null;}catch{v=s;}if(!r.ok){console.error("partner-portal DB error",r.status,path);throw new Error("Database request failed");}return v;}
function clean(v:unknown,n:number){return typeof v==="string"?v.trim().slice(0,n):"";}
function url(v:unknown,telegram=true){const s=clean(v,2048);if(!s)return "";try{const candidate=s.startsWith("@")?"https://t.me/"+s.slice(1):s;const u=new URL(candidate);if(u.protocol!=="https:"||(!telegram&&/(^|\.)t\.me$/i.test(u.hostname)))return "";return candidate===s?s:candidate;}catch{return "";}}
function userFrom(v:Record<string,string>){try{const u=JSON.parse(v.user||"");return Number.isSafeInteger(u.id)&&u.id>0?u:null;}catch{return null;}}
function admin(id:number){return String(id)===OWNER_ID;}
async function hash(s:string){return hex(await crypto.subtle.digest("SHA-256",enc.encode(s)));}
function code(){return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(24)))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");}
function slug(s:string){return s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9а-яё]+/gi,"-").replace(/^-+|-+$/g,"").slice(0,48)||"vpn";}
async function memberships(uid:number,pid?:string){const q="partner_memberships?select=id,partner_id,role,status&telegram_id=eq."+uid+"&status=eq.active"+(pid?"&partner_id=eq."+encodeURIComponent(pid):"");const r=await db(q);return Array.isArray(r)?r:[];}
async function stats(ids:string[]){return ids.length?await db("rpc/partner_dashboard_stats",{method:"POST",body:JSON.stringify({p_service_ids:ids,p_since:null})}):[];}
async function dashboard(uid:number){
 const ms=await memberships(uid),apps=await db("partner_applications?select=id,service_name,status,admin_note,payload,created_at,updated_at&applicant_telegram_id=eq."+uid+"&order=created_at.desc&limit=20");
 if(!ms.length)return {memberships:[],applications:Array.isArray(apps)?apps:[]};
 const result=[];
 for(const m of ms){
  const ps=await db("partners?select=id,name,status,created_at&id=eq."+m.partner_id+"&limit=1"),p=Array.isArray(ps)?ps[0]:null;if(!p)continue;
  const links=await db("partner_services?select=service_id,status,created_at&partner_id=eq."+p.id+"&order=created_at.desc");
  const ids=Array.isArray(links)?links.map((x:any)=>x.service_id):[];
  const services=ids.length?await db("vpn_services?select=id,name,slug,logo_url,description,min_price,min_price_rub,price_currency,platforms,plans,trial_days,countries_count,refund_policy,status,updated_at&id=in.("+ids.map(encodeURIComponent).join(",")+")"):[];
  const programs=ids.length?await db("affiliate_programs?select=service_id,referral_url,commission_model,commission_value,commission_currency,confirmation_method,status&partner_id=eq."+p.id):[];
  const versions=ids.length?await db("partner_service_versions?select=id,service_id,version_number,status,moderator_note,created_at,reviewed_at&partner_id=eq."+p.id+"&order=created_at.desc&limit=30"):[];
  result.push({partner:p,role:m.role,links,services,programs,stats:await stats(ids),versions});
 }
 return {memberships:result,applications:Array.isArray(apps)?apps:[]};
}
async function makeService(app:any,pid:string){
 const p=app.payload||{},sid=app.service_id||"partner-"+app.id,ref=url(p.referral_url);
 if(!app.service_id){
  if(!ref)throw new Error("Partner URL is missing");
  const price=p.min_price===""||p.min_price===null?null:Number(p.min_price);
  await db("vpn_services?on_conflict=id",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({
   id:sid,slug:slug(app.service_name)+"-"+String(app.id).slice(0,6),name:app.service_name,
   bot_url:url(p.telegram_url)||null,referral_url:ref,logo_url:url(p.logo_url,false)||null,
   description:clean(p.description,1500)||null,min_price:price!==null&&Number.isFinite(price)?Math.max(0,price):null,
   min_price_rub:p.price_currency==="RUB"&&price!==null&&Number.isFinite(price)?Math.round(Math.max(0,price)):null,
   price_currency:/^[A-Z]{3}$/.test(clean(p.price_currency,3))?p.price_currency:"RUB",
   platforms:Array.isArray(p.platforms)?p.platforms.filter((x:unknown)=>typeof x==="string").slice(0,12):[],
   plans:Array.isArray(p.plans)?p.plans.slice(0,12):[],trial_days:p.trial_days===""||p.trial_days===null?null:Math.max(0,Math.min(365,Number(p.trial_days))),countries_count:p.countries_count===""||p.countries_count===null?null:Math.max(0,Math.min(250,Number(p.countries_count))),refund_policy:clean(p.refund_policy,500)||null,features:[],whitelist_support:false,status:"draft",sort_order:0,
   source_urls:[url(p.website_url,false),url(p.telegram_url)].filter(Boolean),data_checked_at:null
  })});
  await db("partner_applications?id=eq."+encodeURIComponent(app.id),{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({partner_id:pid,service_id:sid,updated_at:new Date().toISOString()})});
 }
 await db("partner_services?on_conflict=partner_id,service_id",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({partner_id:pid,service_id:sid,status:"pending"})});
 if(ref)await db("affiliate_programs?on_conflict=partner_id,service_id",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({
  partner_id:pid,service_id:sid,referral_url:ref,
  commission_model:["cpa","revshare","hybrid","manual"].includes(p.commission_model)?p.commission_model:"manual",
  commission_value:p.commission_value!==""&&Number.isFinite(Number(p.commission_value))?Number(p.commission_value):null,
  commission_currency:/^[A-Z]{3}$/.test(clean(p.commission_currency,3))?p.commission_currency:"RUB",
  confirmation_method:["manual","api","webhook","import"].includes(p.confirmation_method)?p.confirmation_method:"manual",status:"paused"
 })});
 return sid;
}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return out({ok:false,error:"Method not allowed"},405);
 try{
  const b=await req.json().catch(()=>null);if(!b||typeof b!=="object")return out({ok:false,error:"Invalid request"},400);
  const v=typeof b.initData==="string"?await verify(b.initData):null,u=v?userFrom(v):null;
  if(!u)return out({ok:false,error:"Telegram authorization is invalid or expired"},401);
  const uid=u.id as number,a=clean(b.action,40);

  if(a==="submit_application"){
   const name=clean(b.service_name,120),p=b.payload&&typeof b.payload==="object"&&!Array.isArray(b.payload)?b.payload:{};
   const website=url(p.website_url,false),ref=url(p.referral_url),contact=clean(p.contact_telegram,80);
   if(name.length<2||!website||!ref||!contact)return out({ok:false,error:"Заполните название, сайт, партнёрскую ссылку и контакт."},400);
   const applicationId=clean(b.application_id,64);
   const ms=await memberships(uid),payload={
    website_url:website,telegram_url:url(p.telegram_url),description:clean(p.description,1500),logo_url:url(p.logo_url,false),
    contact_telegram:contact,platforms:Array.isArray(p.platforms)?p.platforms.filter((x:unknown)=>typeof x==="string").slice(0,12):[],plans:Array.isArray(p.plans)?p.plans.slice(0,12):[],countries_count:p.countries_count===""?null:Number(p.countries_count),
    min_price:p.min_price===""?null:Number(p.min_price),price_currency:/^[A-Z]{3}$/.test(clean(p.price_currency,3))?p.price_currency:"RUB",
    trial_days:p.trial_days===""?null:Math.max(0,Math.min(365,Number(p.trial_days))),refund_policy:clean(p.refund_policy,500),
    referral_url:ref,commission_model:["cpa","revshare","hybrid","manual"].includes(p.commission_model)?p.commission_model:"manual",
    commission_value:p.commission_value===""?null:Number(p.commission_value),
    commission_currency:/^[A-Z]{3}$/.test(clean(p.commission_currency,3))?p.commission_currency:"RUB",
    confirmation_method:["manual","api","webhook","import"].includes(p.confirmation_method)?p.confirmation_method:"manual"
   };
   if(applicationId){
    const existingRows=await db("partner_applications?select=id,status&applicant_telegram_id=eq."+uid+"&id=eq."+encodeURIComponent(applicationId)+"&limit=1"),existing=Array.isArray(existingRows)?existingRows[0]:null;
    if(!existing||existing.status!=="changes_requested")return out({ok:false,error:"Эту заявку нельзя изменить."},409);
    const updated=await db("partner_applications?id=eq."+encodeURIComponent(applicationId),{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify({partner_id:ms[0]?.partner_id||null,service_name:name,payload,status:"submitted",admin_note:null,updated_at:new Date().toISOString()})});
    return out({ok:true,application:Array.isArray(updated)?updated[0]:null});
   }
   const prev=await db("partner_applications?select=id&applicant_telegram_id=eq."+uid+"&status=in.(submitted,reviewing,changes_requested,approved)&limit=1");
   if(Array.isArray(prev)&&prev.length)return out({ok:false,error:"У вас уже есть заявка в работе."},409);
   const row=await db("partner_applications",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({applicant_telegram_id:uid,partner_id:ms[0]?.partner_id||null,application_type:"new_service",service_name:name,payload,status:"submitted"})});
   return out({ok:true,application:Array.isArray(row)?row[0]:null});
  }
  if(a==="dashboard")return out({ok:true,...await dashboard(uid)});
  if(a==="invite_accept"){
   const c=clean(b.code,128);if(c.length<20)return out({ok:false,error:"Код приглашения недействителен."},400);
   const rows=await db("partner_invites?select=id,partner_id,preassigned_telegram_id,created_by_telegram_id,expires_at,accepted_at,revoked_at&invite_code_hash=eq."+await hash(c)+"&limit=1"),i=Array.isArray(rows)?rows[0]:null;
   if(!i||i.accepted_at||i.revoked_at||new Date(i.expires_at).getTime()<Date.now())return out({ok:false,error:"Приглашение недействительно или истекло."},404);
   if(i.preassigned_telegram_id&&Number(i.preassigned_telegram_id)!==uid)return out({ok:false,error:"Приглашение предназначено другому аккаунту."},403);
   if(!(await memberships(uid,i.partner_id)).length)await db("partner_memberships",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({partner_id:i.partner_id,telegram_id:uid,role:"owner",status:"active",invited_by_telegram_id:i.created_by_telegram_id})});
   await db("partner_invites?id=eq."+i.id,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({accepted_at:new Date().toISOString(),accepted_by_telegram_id:uid})});
   await db("partners?id=eq."+i.partner_id,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status:"active",updated_at:new Date().toISOString()})});
   return out({ok:true});
  }
  if(a==="request_update"){
   const pid=clean(b.partner_id,64),sid=clean(b.service_id,100);
   if(!(await memberships(uid,pid)).length)return out({ok:false,error:"Доступ не подтверждён."},403);
   const linked=await db("partner_services?select=id&partner_id=eq."+pid+"&service_id=eq."+encodeURIComponent(sid)+"&status=eq.active&limit=1");
   if(!Array.isArray(linked)||!linked.length)return out({ok:false,error:"Сервис не найден."},404);
   const latest=await db("partner_service_versions?select=version_number&service_id=eq."+encodeURIComponent(sid)+"&order=version_number.desc&limit=1");
   const ver=(Array.isArray(latest)&&latest[0]?Number(latest[0].version_number):0)+1,p=b.payload&&typeof b.payload==="object"&&!Array.isArray(b.payload)?b.payload:{};
   const row=await db("partner_service_versions",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({partner_id:pid,service_id:sid,submitted_by_telegram_id:uid,version_number:ver,payload:p,status:"pending"})});
   return out({ok:true,version:Array.isArray(row)?row[0]:null});
  }
  if(!admin(uid))return out({ok:false,error:"Forbidden"},403);

  if(a==="admin_list"){
   const [apps,versions,partners,invites]=await Promise.all([
    db("partner_applications?select=*&order=created_at.desc&limit=100"),
    db("partner_service_versions?select=*&order=created_at.desc&limit=100"),
    db("partners?select=*&order=created_at.desc&limit=100"),
    db("partner_invites?select=id,partner_id,preassigned_telegram_id,expires_at,accepted_at,revoked_at,created_at&order=created_at.desc&limit=100")
   ]);
   return out({ok:true,applications:apps,versions,partners,invites});
  }
  if(a==="admin_review"){
   const id=clean(b.application_id,64),decision=clean(b.decision,32),note=clean(b.note,1000);
   const rows=await db("partner_applications?select=*&id=eq."+encodeURIComponent(id)+"&limit=1"),app=Array.isArray(rows)?rows[0]:null;
   if(!app)return out({ok:false,error:"Заявка не найдена."},404);
   if(["changes_requested","rejected"].includes(decision)){
    await db("partner_applications?id=eq."+encodeURIComponent(id),{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status:decision,admin_note:note,reviewed_by_telegram_id:uid,reviewed_at:new Date().toISOString(),updated_at:new Date().toISOString()})});
    return out({ok:true});
   }
   if(decision!=="approved"||["approved","published"].includes(app.status))return out({ok:false,error:"Невозможно изменить статус заявки."},409);
   let partner:any=null;
   if(app.partner_id){const existing=await db("partners?select=id,name,status&id=eq."+encodeURIComponent(app.partner_id)+"&limit=1");partner=Array.isArray(existing)?existing[0]:null;}
   else {const pr=await db("partners",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({name:app.service_name,status:"active"})});partner=Array.isArray(pr)?pr[0]:null;if(partner?.id)await db("partner_applications?id=eq."+encodeURIComponent(id),{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({partner_id:partner.id,updated_at:new Date().toISOString()})});}
   if(!partner?.id)throw new Error("Partner create failed");
   if(!(await memberships(Number(app.applicant_telegram_id),partner.id)).length)await db("partner_memberships",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({partner_id:partner.id,telegram_id:app.applicant_telegram_id,role:"owner",status:"active",invited_by_telegram_id:uid})});
   const sid=await makeService(app,partner.id);
   await db("partner_applications?id=eq."+encodeURIComponent(id),{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({partner_id:partner.id,service_id:sid,status:"approved",admin_note:note,reviewed_by_telegram_id:uid,reviewed_at:new Date().toISOString(),updated_at:new Date().toISOString()})});
   return out({ok:true,partner_id:partner.id,service_id:sid,publication:"pending"});
  }
  if(a==="admin_publish"){
   const id=clean(b.application_id,64),rows=await db("partner_applications?select=id,partner_id,service_id,status&id=eq."+encodeURIComponent(id)+"&limit=1");
   const app=Array.isArray(rows)?rows[0]:null;if(!app||app.status!=="approved"||!app.partner_id||!app.service_id)return out({ok:false,error:"Заявка не готова к публикации."},409);
   const pr=await db("affiliate_programs?select=referral_url&partner_id=eq."+app.partner_id+"&service_id=eq."+encodeURIComponent(app.service_id)+"&limit=1"),program=Array.isArray(pr)?pr[0]:null;
   if(!program)return out({ok:false,error:"Партнёрская программа не найдена."},409);
   await db("vpn_services?id=eq."+encodeURIComponent(app.service_id),{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status:"active",referral_url:program.referral_url,updated_at:new Date().toISOString()})});
   await db("partner_services?partner_id=eq."+app.partner_id+"&service_id=eq."+encodeURIComponent(app.service_id),{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status:"active"})});
   await db("affiliate_programs?partner_id=eq."+app.partner_id+"&service_id=eq."+encodeURIComponent(app.service_id),{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status:"active",updated_at:new Date().toISOString()})});
   await db("partner_applications?id=eq."+encodeURIComponent(id),{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status:"published",published_at:new Date().toISOString(),updated_at:new Date().toISOString()})});
   return out({ok:true});
  }
  if(a==="admin_version_review"){
   const id=clean(b.version_id,64),decision=clean(b.decision,32),note=clean(b.note,1000);
   const rows=await db("partner_service_versions?select=*&id=eq."+encodeURIComponent(id)+"&limit=1"),ver=Array.isArray(rows)?rows[0]:null;
   if(!ver||!["approved","changes_requested","rejected"].includes(decision))return out({ok:false,error:"Изменение не найдено."},404);
   if(decision==="approved"){
    const p=ver.payload||{},patch:any={updated_at:new Date().toISOString()};
    if(typeof p.name==="string")patch.name=clean(p.name,120);
    if(typeof p.description==="string")patch.description=clean(p.description,1500);
    if(typeof p.logo_url==="string")patch.logo_url=url(p.logo_url,false)||null;
    if(typeof p.referral_url==="string"){const ref=url(p.referral_url);if(ref)patch.referral_url=ref;}
    if(Array.isArray(p.platforms))patch.platforms=p.platforms.filter((x:unknown)=>typeof x==="string").slice(0,12);
    if(Array.isArray(p.plans))patch.plans=p.plans.slice(0,12);
    if(p.min_price!==undefined){patch.min_price=p.min_price===null?null:Number(p.min_price);patch.min_price_rub=p.price_currency==="RUB"&&p.min_price!==null?Math.round(Number(p.min_price)):null;}
    if(typeof p.price_currency==="string"&&/^[A-Z]{3}$/.test(p.price_currency))patch.price_currency=p.price_currency;
    if(p.trial_days!==undefined)patch.trial_days=p.trial_days===null?null:Number(p.trial_days);
    if(p.countries_count!==undefined)patch.countries_count=p.countries_count===null?null:Number(p.countries_count);
    if(typeof p.refund_policy==="string")patch.refund_policy=clean(p.refund_policy,500)||null;
    await db("vpn_services?id=eq."+encodeURIComponent(ver.service_id),{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify(patch)});
    if(typeof p.referral_url==="string"){const ref=url(p.referral_url);if(ref)await db("affiliate_programs?partner_id=eq."+ver.partner_id+"&service_id=eq."+encodeURIComponent(ver.service_id),{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({referral_url:ref,updated_at:new Date().toISOString()})});}
   }
   await db("partner_service_versions?id=eq."+encodeURIComponent(id),{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status:decision,moderator_note:note,reviewed_by_telegram_id:uid,reviewed_at:new Date().toISOString()})});
   return out({ok:true});
  }
  if(a==="admin_invite_create"){
   const name=clean(b.partner_name,120),tid=b.telegram_id?Number(b.telegram_id):null;
   if(name.length<2||(tid!==null&&(!Number.isSafeInteger(tid)||tid<=0)))return out({ok:false,error:"Проверьте название и Telegram ID."},400);
   const pr=await db("partners",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({name,status:"pending"})}),p=Array.isArray(pr)?pr[0]:null;
   if(!p?.id)throw new Error("Invite partner create failed");
   const c=code();await db("partner_invites",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({partner_id:p.id,invite_code_hash:await hash(c),preassigned_telegram_id:tid,created_by_telegram_id:uid,expires_at:new Date(Date.now()+7*86400000).toISOString()})});
   return out({ok:true,code:c,partner_id:p.id,expires_in_days:7});
  }
  return out({ok:false,error:"Unknown action"},400);
 }catch(e){console.error("Partner portal failed",e instanceof Error?e.message:"unknown");return out({ok:false,error:"Не удалось выполнить запрос. Попробуйте ещё раз."},502);}
});