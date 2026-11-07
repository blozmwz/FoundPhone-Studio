// server/analytics/dashboard.mjs
var dashboard = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>\u793C\u62DC\u56DB \xB7 \u4F5C\u8005\u7EDF\u8BA1</title><style>body{margin:0 auto;padding:24px;max-width:1100px;background:#111315;color:#e9e6e1;font:16px/1.65 system-ui,sans-serif}h1{font-size:26px}h2{font-size:20px;margin-top:30px}p{color:#bbb}select,button{font:inherit;background:#25282a;color:inherit;border:1px solid #666;border-radius:8px;padding:8px 12px}table{width:100%;border-collapse:collapse;margin:16px 0}td,th{text-align:left;border-bottom:1px solid #383a3c;padding:8px;font-variant-numeric:tabular-nums}.scroll{overflow-x:auto}#error{color:#ffb4a9}.cards{display:flex;gap:28px;flex-wrap:wrap}.card strong{font-size:30px;display:block}small{color:#aaa}</style><body><h1>\u793C\u62DC\u56DB \xB7 \u4F5C\u8005\u7EDF\u8BA1</h1><p>\u4EC5\u4F5C\u8005\u53EF\u89C1 \xB7 \u533F\u540D\u6C47\u603B \xB7 \u4E0D\u5305\u542B\u73A9\u5BB6\u59D3\u540D\u3001\u6D88\u606F\u3001\u8349\u7A3F\u6216\u5B58\u6863</p><label>\u8303\u56F4 <select id="days"><option value="7">\u8FD17\u5929</option><option value="30" selected>\u8FD130\u5929</option><option value="90">\u8FD190\u5929</option><option value="180">\u8FD1180\u5929</option></select></label> <button id="refresh">\u5237\u65B0\u7EDF\u8BA1</button> <a href="/cdn-cgi/access/logout" style="color:inherit">\u9000\u51FA\u767B\u5F55</a><p id="status" role="status">\u6B63\u5728\u52A0\u8F7D\u540E\u53F0\uFF0C\u7EDF\u8BA1\u91C7\u96C6\u4FDD\u6301\u5173\u95ED\u3002\u82E5\u957F\u65F6\u95F4\u6CA1\u6709\u53D8\u5316\uFF0C\u8BF7\u91CD\u65B0\u767B\u5F55\u540E\u518D\u8BD5\u3002</p><p id="error" role="alert"></p><div id="data"><p>\u6B63\u5728\u8BFB\u53D6\u7EDF\u8BA1\u2026</p></div><noscript><p>\u540E\u53F0\u9700\u8981\u542F\u7528 JavaScript \u624D\u80FD\u663E\u793A\u7EDF\u8BA1\u3002\u5F53\u524D\u4E0D\u4F1A\u5F00\u542F\u91C7\u96C6\u3002</p></noscript><p>\u8BBF\u95EE\u91CF\u6309\u9875\u9762\u6253\u5F00\u6B21\u6570\uFF0C\u8BBF\u5BA2\u6309\u672C\u6D4F\u89C8\u5668\u968F\u673A\u6807\u8BC6\u4F30\u7B97\uFF0C\u6E05\u9664\u7F51\u7AD9\u6570\u636E\u6216\u6362\u8BBE\u5907\u4F1A\u8BA1\u4E3A\u4E0D\u540C\u8BBF\u5BA2\u3002\u56DE\u8BBF\u4E3A\u5728\u6B64\u524D\u65E5\u671F\u5DF2\u6709\u91C7\u96C6\u8BB0\u5F55\u7684\u8BBF\u5BA2\uFF1B\u4E0D\u4F1A\u8865\u9020\u4E0A\u7EBF\u524D\u5386\u53F2\u3002\u4F30\u7B97\u5728\u7EBF\u4E3A\u6700\u8FD13\u5206\u949F\u6709\u6709\u6548\u524D\u53F0\u6D3B\u52A8\u5E76\u6210\u529F\u4E0A\u62A5\u7684\u8BBF\u5BA2\u3002</p><p>\u6709\u6548\u6E38\u73A9\u65F6\u957F\u53EA\u7EDF\u8BA1\u9875\u9762\u5728\u524D\u53F0\u3001\u6700\u8FD160\u79D2\u53D1\u751F\u70B9\u51FB\u3001\u89E6\u6478\u3001\u952E\u76D8\u6216\u6EDA\u52A8\u7684\u65F6\u95F4\uFF1B\u540C\u4E00\u6D4F\u89C8\u5668\u591A\u4E2A\u6807\u7B7E\u6BCF\u5206\u949F\u53D6\u6700\u5927\u503C\uFF0C\u6700\u591A60\u79D2\u3002\u540E\u53F0\u3001\u957F\u65F6\u95F4\u6302\u673A\u548C\u79BB\u7EBF\u672A\u6210\u529F\u4E0A\u62A5\u4E0D\u8BA1\uFF1B\u4E0D\u662F\u53EF\u8BC6\u522B\u4E2A\u4EBA\u7684\u51C6\u786E\u4EBA\u6570\u3002\u7AE0\u8282\u5B8C\u6210\u7387\u4EE5\u7EDF\u8BA1\u4E0A\u7EBF\u540E\u771F\u6B63\u5230\u8FBE\u672C\u7AE0\u7684\u72EC\u7ACB\u5468\u76EE\u4E3A\u5206\u6BCD\uFF0C\u65E7\u6863\u76F4\u63A5\u63A5\u7EED\u53E6\u5217\u3002\u5B8C\u6210\u7387\u6309\u540C\u4E00\u6279\u5468\u76EE\u8BA1\u7B97\uFF0C\u53EF\u8DE8\u7EDF\u8BA1\u65E5\u671F\u3002</p><script src="/admin/app.js" defer><\/script></body></html>`;
var dashboardScript = `const $=id=>document.getElementById(id);const names=['','\u7A7A\u51FA\u6765\u7684\u623F\u95F4','\u4E00\u8D77\u770B\u7535\u5F71\u7684\u4EBA','\u518D\u9760\u8FD1\u4E00\u70B9','\u4EC0\u4E48\u4E5F\u4E0D\u505A\u7684\u665A\u4E0A','\u4E0B\u6B21\u662F\u4EC0\u4E48\u65F6\u5019'];const endings={early:'\u4EC0\u4E48\u90FD\u6CA1\u6709\u53D1\u751F',A:'\u8BF4\u8FC7\u4EE5\u540E',B:'\u65E0\u58F0\u544A\u522B'};function el(tag,text){const e=document.createElement(tag);if(text!==undefined)e.textContent=String(text);return e}function table(title,head,rows){const section=el('section'),wrap=el('div');wrap.className='scroll';section.append(el('h2',title));const t=el('table'),h=el('tr');for(const x of head)h.append(el('th',x));t.append(h);if(!rows.length){const tr=el('tr'),td=el('td','\u6682\u65E0\u6570\u636E');td.colSpan=head.length;tr.append(td);t.append(tr)}for(const row of rows){const tr=el('tr');for(const x of row)tr.append(el('td',x));t.append(tr)}wrap.append(t);section.append(wrap);return section}async function load(){try{$('error').textContent='';$('status').textContent='\u6B63\u5728\u8BFB\u53D6\u2026';const r=await fetch('/admin/api/summary?days='+$('days').value,{cache:'no-store',signal:AbortSignal.timeout(12000)});if(r.redirected||!(r.headers.get('content-type')||'').includes('application/json'))throw Error('\u767B\u5F55\u72B6\u6001\u5DF2\u5931\u6548\uFF0C\u8BF7\u70B9\u51FB\u9000\u51FA\u767B\u5F55\u540E\u91CD\u65B0\u767B\u5F55');if(!r.ok)throw Error(r.status===403?'\u767B\u5F55\u5DF2\u5931\u6548\uFF0C\u8BF7\u5237\u65B0\u9875\u9762\u91CD\u65B0\u767B\u5F55':'\u6682\u65F6\u65E0\u6CD5\u8BFB\u53D6\u7EDF\u8BA1\uFF08'+r.status+'\uFF09');const d=await r.json(),root=$('data');root.replaceChildren();const cards=el('div');cards.className='cards';for(const [label,value] of [['\u4F30\u7B97\u5728\u7EBF\u4EBA\u6570 \xB7 \u6700\u8FD13\u5206\u949F',d.onlineEstimate],['\u6709\u6548\u524D\u53F0\u65F6\u957F',Math.round(d.activeTime.reduce((a,r)=>a+r.ms,0)/60000)+' \u5206\u949F'],['\u5DF2\u67E5\u770B\u91CD\u9022\u5F69\u86CB\u7684\u5468\u76EE',d.reunions]]){const c=el('div');c.className='card';c.append(el('strong',value),el('small',label));cards.append(c)}root.append(cards,table('\u6BCF\u65E5\u8BBF\u95EE',['\u65E5\u671F','\u8BBF\u95EE\u91CF','\u4F30\u7B97\u8BBF\u5BA2','\u5F00\u59CB\u6E38\u620F','\u56DE\u8BBF\u8BBF\u5BA2','\u4F1A\u8BDD'],d.daily.map(x=>[x.day,x.views,x.visitors,x.starts,x.returning,x.sessions])),table('\u7AE0\u8282\u5230\u8FBE\u4E0E\u5B8C\u6210',['\u7AE0\u8282','\u6E38\u73A9\u7C7B\u578B','\u5230\u8FBE\u4EBA\u6570','\u5230\u8FBE\u5468\u76EE','\u5DF2\u5B8C\u6210\u5468\u76EE','\u5B8C\u6210\u7387'],d.chapters.map(x=>[x.chapter+' \xB7 '+names[x.chapter],x.mode==='first'?'\u539F\u8FDB\u5EA6':'\u72EC\u7ACB\u91CD\u73A9',x.visitors,x.reached,x.completed,x.reached?(100*x.cohortCompleted/x.reached).toFixed(1)+'%':'\u2014'])),table('\u6700\u540E\u505C\u7559\u7AE0\u8282 \xB7 \u6BCF\u4E2A\u8BBF\u5BA2\u6700\u540E\u4E00\u6B21\u8BB0\u5F55',['\u7AE0\u8282','\u4F30\u7B97\u8BBF\u5BA2'],d.lastChapter.map(x=>[x.chapter+' \xB7 '+names[x.chapter],x.visitors])),table('\u7ED3\u5C40\u8FBE\u6210 \xB7 \u540C\u4E00\u5468\u76EE\u53BB\u91CD',['\u7ED3\u5C40','\u6E38\u73A9\u7C7B\u578B','\u8FBE\u6210\u4EBA\u6570','\u5468\u76EE'],d.endings.map(x=>[endings[x.ending],x.mode==='first'?'\u539F\u8FDB\u5EA6':'\u72EC\u7ACB\u91CD\u73A9',x.visitors,x.count])),table('\u65E7\u8FDB\u5EA6\u9996\u6B21\u63A5\u5165\u7EDF\u8BA1 \xB7 \u4E0D\u5012\u8865\u5386\u53F2',['\u7AE0\u8282','\u6E38\u73A9\u7C7B\u578B','\u5468\u76EE'],d.existingResumes.map(x=>[x.chapter+' \xB7 '+names[x.chapter],x.mode==='first'?'\u539F\u8FDB\u5EA6':'\u72EC\u7ACB\u91CD\u73A9',x.count])),table('\u6BCF\u65E5\u6709\u6548\u65F6\u957F',['\u65E5\u671F','\u5206\u949F'],d.activeTime.map(x=>[x.day,Math.round(x.ms/60000)])));$('status').textContent=(d.started?'':'\u6682\u65E0\u6570\u636E \xB7 \u7EDF\u8BA1\u91C7\u96C6\u5C1A\u672A\u5F00\u542F \xB7 ')+'\u91C7\u96C6\u5F00\u59CB\uFF1A'+(d.started?new Date(d.started).toLocaleString('zh-CN'):'\u5C1A\u65E0\u8BB0\u5F55')+' \xB7 \u65E5\u671F\u65F6\u533A\uFF1A'+d.timeZone+' \xB7 \u66F4\u65B0\uFF1A'+new Date().toLocaleTimeString('zh-CN');}catch(e){$('status').textContent='';$('error').textContent=e.name==='TimeoutError'?'\u8BFB\u53D6\u8D85\u65F6\uFF0C\u8BF7\u70B9\u51FB\u5237\u65B0\u7EDF\u8BA1\u91CD\u8BD5':e.name==='TypeError'?'\u540E\u53F0\u52A0\u8F7D\u5931\u8D25\uFF0C\u8BF7\u91CD\u65B0\u767B\u5F55\u6216\u70B9\u51FB\u5237\u65B0\u7EDF\u8BA1\u91CD\u8BD5':e.message}}$('days').onchange=load;$('refresh').onclick=load;load();`;

// server/analytics/worker.mjs
var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
var KINDS = /* @__PURE__ */ new Set(["view", "start", "resume", "chapter_reach", "chapter_complete", "ending", "reunion", "active"]);
var FIELDS = /* @__PURE__ */ new Set(["id", "visitor", "session", "run", "mode", "kind", "chapter", "ending", "build", "minute", "ms"]);
var headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "X-Frame-Options": "DENY" };
function json(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { ...headers, "Content-Type": "application/json; charset=utf-8" } });
}
function accessConfigured(env) {
  return env.ANALYTICS_DB && /^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(env.CF_ACCESS_ISSUER || "") && /^[a-zA-Z0-9_-]{20,200}$/.test(env.CF_ACCESS_AUD || "") && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.ANALYTICS_OWNER_EMAIL || "") && env.ANALYTICS_ORIGIN === "https://bdg-bp3.pages.dev";
}
function configured(env) {
  return env.ANALYTICS_ENABLED === "1" && accessConfigured(env);
}
function validateEvent(e, now = Date.now()) {
  if (!e || typeof e !== "object" || Array.isArray(e) || Object.keys(e).some((k) => !FIELDS.has(k))) return false;
  if (![e.id, e.visitor, e.session, e.run].every((x) => typeof x === "string" && UUID.test(x))) return false;
  if (!["first", "replay"].includes(e.mode) || !KINDS.has(e.kind) || !Number.isInteger(e.chapter) || e.chapter < 0 || e.chapter > 5) return false;
  if (!["", "early", "A", "B"].includes(e.ending) || typeof e.build !== "string" || !/^[a-zA-Z0-9-]{1,80}$/.test(e.build)) return false;
  if (e.kind === "ending" && !e.ending) return false;
  if (e.kind !== "ending" && e.ending !== "") return false;
  if (["chapter_reach", "chapter_complete", "active"].includes(e.kind) && !e.chapter) return false;
  if (e.kind === "active") return Number.isInteger(e.minute) && Math.abs(e.minute - Math.floor(now / 6e4)) <= 3 && Number.isInteger(e.ms) && e.ms >= 0 && e.ms <= 6e4;
  return e.minute === void 0 && e.ms === void 0;
}
var cache = /* @__PURE__ */ new Map();
function bytes(s) {
  if (!/^[A-Za-z0-9_-]+$/.test(s)) throw Error("encoding");
  return Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
}
async function verifyAccess(request, env, fetcher = fetch, now = Date.now()) {
  if (!accessConfigured(env)) return false;
  const cookie = request.headers.get("Cookie")?.split(";").map((s) => s.trim()).find((s) => s.startsWith("CF_Authorization="))?.slice(17);
  const token = request.headers.get("Cf-Access-Jwt-Assertion") || cookie || "";
  if (token.length > 8192) return false;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const head = JSON.parse(new TextDecoder().decode(bytes(parts[0]))), claim = JSON.parse(new TextDecoder().decode(bytes(parts[1])));
    if (head.alg !== "RS256" || typeof head.kid !== "string" || head.kid.length > 256) return false;
    if (claim.iss !== env.CF_ACCESS_ISSUER || !Number.isFinite(claim.exp) || claim.exp * 1e3 <= now || claim.nbf * 1e3 > now + 3e4 || !claim.email || claim.email.toLowerCase() !== env.ANALYTICS_OWNER_EMAIL.toLowerCase()) return false;
    if (!(Array.isArray(claim.aud) ? claim.aud : [claim.aud]).includes(env.CF_ACCESS_AUD)) return false;
    let entry = cache.get(env.CF_ACCESS_ISSUER);
    if (!entry || entry.until < now) {
      const response = await fetcher(env.CF_ACCESS_ISSUER + "/cdn-cgi/access/certs", { signal: AbortSignal.timeout(5e3) });
      if (!response.ok) return false;
      const body = await response.json();
      if (!Array.isArray(body.keys) || body.keys.length > 30) return false;
      entry = { keys: body.keys, until: now + 3e5 };
      cache.set(env.CF_ACCESS_ISSUER, entry);
    }
    const jwk = entry.keys.find((k) => k.kid === head.kid && k.kty === "RSA");
    if (!jwk) return false;
    const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    return await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, bytes(parts[2]), new TextEncoder().encode(parts[0] + "." + parts[1]));
  } catch {
    return false;
  }
}
function day(now) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Melbourne", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(now));
}
async function recordEvents(db, events, now = Date.now()) {
  const date = day(now), rows = [];
  for (const e of events) {
    if (e.kind === "active") rows.push(db.prepare(`INSERT INTO analytics_active(visitor,minute,session,run,mode,chapter,ms,day,at) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(visitor,minute) DO UPDATE SET ms=MAX(ms,excluded.ms),at=MAX(at,excluded.at),chapter=excluded.chapter,run=excluded.run,mode=excluded.mode,session=excluded.session`).bind(e.visitor, e.minute, e.session, e.run, e.mode, e.chapter, e.ms, date, now));
    else rows.push(db.prepare(`INSERT OR IGNORE INTO analytics_events(id,visitor,session,run,mode,kind,chapter,ending,build,day,at) VALUES(?,?,?,?,?,?,?,?,?,?,?)`).bind(e.id, e.visitor, e.session, e.run, e.mode, e.kind, e.chapter, e.ending, e.build, date, now));
  }
  rows.push(db.prepare(`INSERT OR IGNORE INTO analytics_meta(key,value) VALUES('started',?)`).bind(String(now)));
  await db.batch(rows);
}
async function summary(db, days = 30, now = Date.now()) {
  const since = day(now - days * 864e5), queries = [
    db.prepare(`SELECT value FROM analytics_meta WHERE key='started'`),
    db.prepare(`SELECT day,COUNT(*) FILTER(WHERE kind='view') views,COUNT(DISTINCT visitor) visitors,COUNT(DISTINCT CASE WHEN kind='start' THEN visitor END) starts,COUNT(DISTINCT session) sessions,COUNT(DISTINCT CASE WHEN EXISTS(SELECT 1 FROM analytics_events old WHERE old.visitor=e.visitor AND old.day<e.day) THEN visitor END) AS "returning" FROM analytics_events e WHERE day>=? GROUP BY day ORDER BY day`).bind(since),
    db.prepare(`SELECT chapter,mode,COUNT(DISTINCT CASE WHEN kind='chapter_reach' THEN visitor END) visitors,COUNT(DISTINCT CASE WHEN kind='chapter_reach' THEN run END) reached,COUNT(DISTINCT CASE WHEN kind='chapter_complete' THEN run END) completed, COUNT(DISTINCT CASE WHEN kind='chapter_reach' AND EXISTS(SELECT 1 FROM analytics_events done WHERE done.run=analytics_events.run AND done.kind='chapter_complete' AND done.chapter=analytics_events.chapter) THEN run END) cohortCompleted FROM analytics_events WHERE day>=? AND kind IN ('chapter_reach','chapter_complete') GROUP BY chapter,mode ORDER BY chapter,mode`).bind(since),
    db.prepare(`SELECT ending,mode,COUNT(DISTINCT visitor) visitors,COUNT(DISTINCT run) count FROM analytics_events WHERE day>=? AND kind='ending' GROUP BY ending,mode`).bind(since),
    db.prepare(`SELECT COUNT(DISTINCT visitor) count FROM analytics_active WHERE at>=? AND ms>0`).bind(now - 18e4),
    db.prepare(`SELECT day,SUM(ms) ms FROM analytics_active WHERE day>=? GROUP BY day ORDER BY day`).bind(since),
    db.prepare(`WITH ranked AS (SELECT visitor,chapter,ROW_NUMBER() OVER(PARTITION BY visitor ORDER BY at DESC,rowid DESC) n FROM analytics_events WHERE day>=? AND chapter>0) SELECT chapter,COUNT(*) visitors FROM ranked WHERE n=1 GROUP BY chapter ORDER BY chapter`).bind(since),
    db.prepare(`SELECT COUNT(DISTINCT run) count FROM analytics_events WHERE kind='reunion' AND day>=?`).bind(since),
    db.prepare(`SELECT chapter,mode,COUNT(DISTINCT run) count FROM analytics_events WHERE kind='resume' AND day>=? GROUP BY chapter,mode`).bind(since)
  ];
  const out = await db.batch(queries);
  return { started: Number(out[0].results[0]?.value) || null, days, timeZone: "Australia/Melbourne", daily: out[1].results, chapters: out[2].results, endings: out[3].results, onlineEstimate: out[4].results[0]?.count || 0, activeTime: out[5].results, lastChapter: out[6].results, reunions: out[7].results[0]?.count || 0, existingResumes: out[8].results };
}
async function handle(request, env) {
  const url = new URL(request.url), admin = url.pathname === "/admin" || url.pathname.startsWith("/admin/");
  if (admin) {
    if (!accessConfigured(env)) return json({ error: "\u7EDF\u8BA1\u540E\u53F0\u5C1A\u672A\u914D\u7F6E\uFF0C\u4FDD\u6301\u5173\u95ED" }, 503);
    if (!await verifyAccess(request, env)) return json({ error: "\u8BF7\u901A\u8FC7 Cloudflare Access \u4F7F\u7528\u4F5C\u8005\u8D26\u53F7\u767B\u5F55" }, 403);
    if (request.method !== "GET") return json({ error: "method" }, 405);
    if (url.pathname === "/admin/api/summary") {
      const days = Number(url.searchParams.get("days") || 30);
      if (![7, 30, 90, 180].includes(days)) return json({ error: "days" }, 400);
      return json(await summary(env.ANALYTICS_DB, days));
    }
    if (url.pathname === "/admin" || url.pathname === "/admin/") return new Response(dashboard, { headers: { ...headers, "Content-Type": "text/html; charset=utf-8", "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'" } });
    if (url.pathname === "/admin/app.js") return new Response(dashboardScript, { headers: { ...headers, "Content-Type": "text/javascript; charset=utf-8" } });
    return json({ error: "not found" }, 404);
  }
  if (url.pathname === "/api/analytics/config") return json({ enabled: !!configured(env), schema: 1 });
  if (url.pathname !== "/api/analytics/events") return json({ error: "not found" }, 404);
  if (request.method !== "POST") return json({ error: "method" }, 405);
  if (!configured(env)) return json({ accepted: 0 }, 503);
  if (request.headers.get("Origin") !== env.ANALYTICS_ORIGIN || url.origin !== env.ANALYTICS_ORIGIN) return json({ error: "origin" }, 403);
  if (!(request.headers.get("Content-Type") || "").startsWith("application/json")) return json({ error: "type" }, 415);
  if (Number(request.headers.get("Content-Length") || 0) > 12e3) return json({ error: "size" }, 413);
  const text = await request.text();
  if (text.length > 12e3) return json({ error: "size" }, 413);
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    return json({ error: "json" }, 400);
  }
  if (!body || Object.keys(body).join(",") !== "events" || !Array.isArray(body.events) || !body.events.length || body.events.length > 12 || !body.events.every((e) => validateEvent(e))) return json({ error: "invalid" }, 400);
  if (new Set(body.events.map((e) => e.visitor)).size !== 1) return json({ error: "visitor" }, 400);
  await recordEvents(env.ANALYTICS_DB, body.events);
  return json({ accepted: body.events.length });
}
var worker_default = { async fetch(request, env) {
  try {
    return await handle(request, env);
  } catch {
    return json({ error: "\u7EDF\u8BA1\u6682\u65F6\u4E0D\u53EF\u7528\uFF1B\u4E0D\u5F71\u54CD\u6E38\u620F" }, 503);
  }
} };

// server/analytics/readonly-release.mjs
var readonly_release_default = {
  fetch(request, env) {
    return worker_default.fetch(request, { ...env, ANALYTICS_ENABLED: "0" });
  }
};
export {
  readonly_release_default as default
};
