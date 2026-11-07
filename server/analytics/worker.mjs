// Cloudflare Pages advanced-mode Worker. All non-API game assets bypass this
// Worker through _routes.json. Configuration and Access JWTs stay server-side.
import { dashboard, dashboardScript } from './dashboard.mjs';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KINDS=new Set(['view','start','resume','chapter_reach','chapter_complete','ending','reunion','active']);
const FIELDS=new Set(['id','visitor','session','run','mode','kind','chapter','ending','build','minute','ms']);
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY'};
function json(value,status=200){return new Response(JSON.stringify(value),{status,headers:{...headers,'Content-Type':'application/json; charset=utf-8'}});}
function accessConfigured(env){return env.ANALYTICS_DB&&/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(env.CF_ACCESS_ISSUER||'')&&/^[a-zA-Z0-9_-]{20,200}$/.test(env.CF_ACCESS_AUD||'')&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.ANALYTICS_OWNER_EMAIL||'')&&env.ANALYTICS_ORIGIN==='https://bdg-bp3.pages.dev';}
function configured(env){return env.ANALYTICS_ENABLED==='1'&&accessConfigured(env);}
export function validateEvent(e,now=Date.now()){
 if(!e||typeof e!=='object'||Array.isArray(e)||Object.keys(e).some(k=>!FIELDS.has(k)))return false;
 if(![e.id,e.visitor,e.session,e.run].every(x=>typeof x==='string'&&UUID.test(x)))return false;
 if(!['first','replay'].includes(e.mode)||!KINDS.has(e.kind)||!Number.isInteger(e.chapter)||e.chapter<0||e.chapter>5)return false;
 if(!['','early','A','B'].includes(e.ending)||typeof e.build!=='string'||!/^[a-zA-Z0-9-]{1,80}$/.test(e.build))return false;
 if(e.kind==='ending'&&!e.ending)return false;
 if(e.kind!=='ending'&&e.ending!=='')return false;
 if(['chapter_reach','chapter_complete','active'].includes(e.kind)&&!e.chapter)return false;
 if(e.kind==='active')return Number.isInteger(e.minute)&&Math.abs(e.minute-Math.floor(now/60000))<=3&&Number.isInteger(e.ms)&&e.ms>=0&&e.ms<=60000;
 return e.minute===undefined&&e.ms===undefined;
}
const cache=new Map();
function bytes(s){if(!/^[A-Za-z0-9_-]+$/.test(s))throw Error('encoding');return Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));}
export async function verifyAccess(request,env,fetcher=fetch,now=Date.now()){
 if(!accessConfigured(env))return false;
 const cookie=request.headers.get('Cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith('CF_Authorization='))?.slice(17);
 const token=request.headers.get('Cf-Access-Jwt-Assertion')||cookie||'';
 if(token.length>8192)return false;
 try{
  const parts=token.split('.');if(parts.length!==3)return false;
  const head=JSON.parse(new TextDecoder().decode(bytes(parts[0]))),claim=JSON.parse(new TextDecoder().decode(bytes(parts[1])));
  if(head.alg!=='RS256'||typeof head.kid!=='string'||head.kid.length>256)return false;
  if(claim.iss!==env.CF_ACCESS_ISSUER||!Number.isFinite(claim.exp)||claim.exp*1000<=now||claim.nbf*1000>now+30000||!claim.email||claim.email.toLowerCase()!==env.ANALYTICS_OWNER_EMAIL.toLowerCase())return false;
  if(!(Array.isArray(claim.aud)?claim.aud:[claim.aud]).includes(env.CF_ACCESS_AUD))return false;
  let entry=cache.get(env.CF_ACCESS_ISSUER);
  if(!entry||entry.until<now){const response=await fetcher(env.CF_ACCESS_ISSUER+'/cdn-cgi/access/certs',{signal:AbortSignal.timeout(5000)});if(!response.ok)return false;const body=await response.json();if(!Array.isArray(body.keys)||body.keys.length>30)return false;entry={keys:body.keys,until:now+300000};cache.set(env.CF_ACCESS_ISSUER,entry);}
  const jwk=entry.keys.find(k=>k.kid===head.kid&&k.kty==='RSA');if(!jwk)return false;
  const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  return await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,bytes(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1]));
 }catch{return false;}
}
function day(now){return new Intl.DateTimeFormat('en-CA',{timeZone:'Australia/Melbourne',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));}
export async function recordEvents(db,events,now=Date.now()){
 const date=day(now),rows=[];
 for(const e of events){
  if(e.kind==='active')rows.push(db.prepare(`INSERT INTO analytics_active(visitor,minute,session,run,mode,chapter,ms,day,at) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(visitor,minute) DO UPDATE SET ms=MAX(ms,excluded.ms),at=MAX(at,excluded.at),chapter=excluded.chapter,run=excluded.run,mode=excluded.mode,session=excluded.session`).bind(e.visitor,e.minute,e.session,e.run,e.mode,e.chapter,e.ms,date,now));
  else rows.push(db.prepare(`INSERT OR IGNORE INTO analytics_events(id,visitor,session,run,mode,kind,chapter,ending,build,day,at) VALUES(?,?,?,?,?,?,?,?,?,?,?)`).bind(e.id,e.visitor,e.session,e.run,e.mode,e.kind,e.chapter,e.ending,e.build,date,now));
 }
 rows.push(db.prepare(`INSERT OR IGNORE INTO analytics_meta(key,value) VALUES('started',?)`).bind(String(now)));
 await db.batch(rows);
}
export async function summary(db,days=30,now=Date.now()){
 const since=day(now-days*86400000),queries=[
  db.prepare(`SELECT value FROM analytics_meta WHERE key='started'`),
  db.prepare(`SELECT day,COUNT(*) FILTER(WHERE kind='view') views,COUNT(DISTINCT visitor) visitors,COUNT(DISTINCT CASE WHEN kind='start' THEN visitor END) starts,COUNT(DISTINCT session) sessions,COUNT(DISTINCT CASE WHEN EXISTS(SELECT 1 FROM analytics_events old WHERE old.visitor=e.visitor AND old.day<e.day) THEN visitor END) AS "returning" FROM analytics_events e WHERE day>=? GROUP BY day ORDER BY day`).bind(since),
  db.prepare(`SELECT chapter,mode,COUNT(DISTINCT CASE WHEN kind='chapter_reach' THEN visitor END) visitors,COUNT(DISTINCT CASE WHEN kind='chapter_reach' THEN run END) reached,COUNT(DISTINCT CASE WHEN kind='chapter_complete' THEN run END) completed, COUNT(DISTINCT CASE WHEN kind='chapter_reach' AND EXISTS(SELECT 1 FROM analytics_events done WHERE done.run=analytics_events.run AND done.kind='chapter_complete' AND done.chapter=analytics_events.chapter) THEN run END) cohortCompleted FROM analytics_events WHERE day>=? AND kind IN ('chapter_reach','chapter_complete') GROUP BY chapter,mode ORDER BY chapter,mode`).bind(since),
  db.prepare(`SELECT ending,mode,COUNT(DISTINCT visitor) visitors,COUNT(DISTINCT run) count FROM analytics_events WHERE day>=? AND kind='ending' GROUP BY ending,mode`).bind(since),
  db.prepare(`SELECT COUNT(DISTINCT visitor) count FROM analytics_active WHERE at>=? AND ms>0`).bind(now-180000),
  db.prepare(`SELECT day,SUM(ms) ms FROM analytics_active WHERE day>=? GROUP BY day ORDER BY day`).bind(since),
  db.prepare(`WITH ranked AS (SELECT visitor,chapter,ROW_NUMBER() OVER(PARTITION BY visitor ORDER BY at DESC,rowid DESC) n FROM analytics_events WHERE day>=? AND chapter>0) SELECT chapter,COUNT(*) visitors FROM ranked WHERE n=1 GROUP BY chapter ORDER BY chapter`).bind(since),
  db.prepare(`SELECT COUNT(DISTINCT run) count FROM analytics_events WHERE kind='reunion' AND day>=?`).bind(since),
  db.prepare(`SELECT chapter,mode,COUNT(DISTINCT run) count FROM analytics_events WHERE kind='resume' AND day>=? GROUP BY chapter,mode`).bind(since),
 ];
 const out=await db.batch(queries);return {started:Number(out[0].results[0]?.value)||null,days,timeZone:'Australia/Melbourne',daily:out[1].results,chapters:out[2].results,endings:out[3].results,onlineEstimate:out[4].results[0]?.count||0,activeTime:out[5].results,lastChapter:out[6].results,reunions:out[7].results[0]?.count||0,existingResumes:out[8].results};
}
export async function handle(request,env){
 const url=new URL(request.url),admin=url.pathname==='/admin'||url.pathname.startsWith('/admin/');
 if(admin){
  if(!accessConfigured(env))return json({error:'统计后台尚未配置，保持关闭'},503);
  if(!await verifyAccess(request,env))return json({error:'请通过 Cloudflare Access 使用作者账号登录'},403);
  if(request.method!=='GET')return json({error:'method'},405);
  if(url.pathname==='/admin/api/summary'){const days=Number(url.searchParams.get('days')||30);if(![7,30,90,180].includes(days))return json({error:'days'},400);return json(await summary(env.ANALYTICS_DB,days));}
  if(url.pathname==='/admin'||url.pathname==='/admin/')return new Response(dashboard,{headers:{...headers,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'"}});
  if(url.pathname==='/admin/app.js')return new Response(dashboardScript,{headers:{...headers,'Content-Type':'text/javascript; charset=utf-8'}});
  return json({error:'not found'},404);
 }
 if(url.pathname==='/api/analytics/config')return json({enabled:!!configured(env),schema:1});
 if(url.pathname!=='/api/analytics/events')return json({error:'not found'},404);
 if(request.method!=='POST')return json({error:'method'},405);
 if(!configured(env))return json({accepted:0},503);
 if(request.headers.get('Origin')!==env.ANALYTICS_ORIGIN||url.origin!==env.ANALYTICS_ORIGIN)return json({error:'origin'},403);
 if(!(request.headers.get('Content-Type')||'').startsWith('application/json'))return json({error:'type'},415);
 if(Number(request.headers.get('Content-Length')||0)>12000)return json({error:'size'},413);
 const text=await request.text();if(text.length>12000)return json({error:'size'},413);
 let body;try{body=JSON.parse(text);}catch{return json({error:'json'},400);}
 if(!body||Object.keys(body).join(',')!=='events'||!Array.isArray(body.events)||!body.events.length||body.events.length>12||!body.events.every(e=>validateEvent(e)))return json({error:'invalid'},400);
 if(new Set(body.events.map(e=>e.visitor)).size!==1)return json({error:'visitor'},400);
 await recordEvents(env.ANALYTICS_DB,body.events);return json({accepted:body.events.length});
}
export default {async fetch(request,env){try{return await handle(request,env);}catch{return json({error:'统计暂时不可用；不影响游戏'},503);}}};
