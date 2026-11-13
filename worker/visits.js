// Page views, counted for the Telegram bot. assets/js/hit.js sends one
// beacon per page, a second with the time spent and how far down the visitor
// got when the page is left, and one for each thing worth knowing about (a
// résumé download, a link followed off the site, the contact form started).
// Nothing is stored that could identify someone: vid is a salted hash of IP
// and browser that changes every day.

export const CLIENT_SITES = {
  nooklook: "Nooklook",
  doorlook: "Doorlook",
  vancobab: "Vanco Bab",
  termeh: "Termeh",
  "taha-portfolio": "Taha's portfolio",
  preview: "a client demo",
};

// Hosts of client sites, for visitors whose link lost its ?ref=.
const CLIENT_HOSTS = {
  "nooklook.ca": "nooklook",
  "doorlook.ca": "doorlook",
  "vancobab.ca": "vancobab",
  "termehbc.ca": "termeh",
};

const SEARCH = { google: "Google", bing: "Bing", duckduckgo: "DuckDuckGo", yahoo: "Yahoo", ecosia: "Ecosia", brave: "Brave Search" };
const SOCIAL = {
  "linkedin.com": "LinkedIn",
  "lnkd.in": "LinkedIn",
  "github.com": "GitHub",
  "instagram.com": "Instagram",
  "facebook.com": "Facebook",
  "t.co": "X",
  "x.com": "X",
  "reddit.com": "Reddit",
  "t.me": "Telegram",
  "web.telegram.org": "Telegram",
};
const AI = {
  "chatgpt.com": "ChatGPT",
  "chat.openai.com": "ChatGPT",
  "perplexity.ai": "Perplexity",
  "claude.ai": "Claude",
  "gemini.google.com": "Gemini",
  "copilot.microsoft.com": "Copilot",
};

const BOT = /bot|crawl|spider|slurp|preview|lighthouse|headless|pagespeed|monitor|curl|wget|python|node-fetch/i;
export const isBot = (ua) => !ua || BOT.test(ua);

// The network a visit came over is only interesting when it is a company or
// a school. Internet providers, phone carriers, clouds, VPNs and relays are
// everyone and no one, so they are left out.
const COMMON_NETWORK =
  /telus|shaw|rogers|\bbell\b|\bbce\b|videotron|cogeco|freedom|eastlink|sasktel|teksavvy|novus|comcast|verizon|at&t|at ?and ?t|t-mobile|charter|spectrum|\bcox\b|centurylink|lumen|frontier|sprint|vodafone|orange|telekom|telecom|telefonica|virgin|\bsky\b|\bbt\b|starlink|spacex|mobile|wireless|cellular|broadband|cable|communication|internet|network|\bisp\b|\bdsl\b|fib(er|re)|hosting|datacenter|data center|cloud|google|amazon|microsoft|apple|akamai|fastly|digitalocean|\bovh\b|hetzner|linode|oracle|\bvpn\b|proxy|m247|datacamp|relay|irancell|\bmci\b|mokhaberat|\btci\b|rightel|shatel|pars online/i;
export const company = (org) => (org && !COMMON_NETWORK.test(org) ? String(org) : null);

export const EVENTS = { resume: "résumé download", out: "link out", form: "form started" };

const clip = (v, n) => String(v || "").replace(/[\u0000-\u001f\u007f]+/g, " ").trim().slice(0, n);

// Where a visit came from, as "kind:detail": credit, friend, ai, search,
// social, utm, site, internal or direct.
export function sourceOf({ query = "", referrer = "" }, selfHost) {
  const q = new URLSearchParams(query);
  if (q.get("ref")) return "credit:" + clip(q.get("ref"), 40).toLowerCase();
  if (q.get("friend")) return "friend:" + clip(q.get("friend").replace(/[-_+]+/g, " "), 60);
  if (q.get("utm_source")) return "utm:" + clip(q.get("utm_source"), 40).toLowerCase();
  let host = "";
  try {
    host = new URL(referrer).hostname.replace(/^www\./, "");
  } catch {
    return "direct";
  }
  if (!host) return "direct";
  if (host === selfHost.replace(/^www\./, "")) return "internal";
  if (CLIENT_HOSTS[host]) return "credit:" + CLIENT_HOSTS[host];
  if (AI[host]) return "ai:" + AI[host];
  if (SOCIAL[host]) return "social:" + SOCIAL[host];
  const engine = Object.keys(SEARCH).find((e) => host === e + ".com" || host.startsWith(e + ".") || host.includes("." + e + "."));
  if (engine) return "search:" + SEARCH[engine];
  return "site:" + clip(host, 60);
}

// The source, said in words.
export function sourceLabel(source) {
  const [kind, ...rest] = String(source || "direct").split(":");
  const detail = rest.join(":");
  switch (kind) {
    case "credit":
      return `credit tag on ${CLIENT_SITES[detail] || detail}`;
    case "friend":
      return `friend link from ${detail}`;
    case "ai":
      return `${detail} (AI answer)`;
    case "search":
    case "social":
      return detail;
    case "utm":
      return `campaign: ${detail}`;
    case "site":
      return detail;
    case "internal":
      return "this site";
    default:
      return "direct / typed in";
  }
}

// The B.C. calendar day, YYYY-MM-DD.
export function bcDay(date) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: "America/Vancouver", year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(date)
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}`;
}

export async function visitorId(env, request, day) {
  const ip = request.headers.get("CF-Connecting-IP") || "";
  const ua = request.headers.get("User-Agent") || "";
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${env.HASH_SALT || "ryanyarali.com"}|${day}|${ip}|${ua}`));
  return [...new Uint8Array(buf)].slice(0, 10).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// POST /api/hit. Returns what happened, so the caller can raise a live
// alert: { kind: "view", ...visit }, { kind: "time", vid } or
// { kind: "event", vid, event, detail, path }. Null when nothing counted.
export async function recordHit(env, request, url) {
  const ua = request.headers.get("User-Agent") || "";
  if (isBot(ua)) return null;
  const raw = await request.text();
  if (raw.length > 2000) return null;
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return null;
  }
  const id = clip(body.id, 40);
  if (!/^[\w-]{8,40}$/.test(id)) return null;
  const now = new Date();
  const day = bcDay(now);
  const vid = await visitorId(env, request, day);

  // The second beacon: time on the page and how far down it they got. Only
  // the same visitor can set it.
  if (body.s != null) {
    const seconds = Math.max(0, Math.min(3600, Math.round(Number(body.s) || 0)));
    const depth = body.d == null ? null : Math.max(0, Math.min(100, Math.round(Number(body.d) || 0)));
    await env.DB.prepare("UPDATE visits SET seconds = ?, depth = MAX(COALESCE(depth, 0), COALESCE(?, depth, 0)) WHERE id = ? AND vid = ?")
      .bind(seconds, depth, id, vid)
      .run();
    return { kind: "time", vid };
  }

  // Something the visitor did on a page they are known to be on.
  if (body.e != null) {
    const event = String(body.e);
    if (!EVENTS[event]) return null;
    const page = await env.DB.prepare("SELECT path FROM visits WHERE id = ? AND vid = ?").bind(id, vid).first();
    if (!page) return null;
    const detail = clip(body.d, 80).toLowerCase() || null;
    // One of each per page view is enough (a second click on the same link
    // says nothing new), and it keeps anyone from flooding the table.
    const dup = await env.DB.prepare("SELECT COUNT(*) AS n FROM events WHERE vid = ? AND kind = ? AND path = ? AND COALESCE(detail, '') = COALESCE(?, '')")
      .bind(vid, event, page.path, detail)
      .first();
    if (dup && dup.n) return null;
    await env.DB.prepare("INSERT INTO events (day, vid, kind, detail, path) VALUES (?, ?, ?, ?, ?)").bind(day, vid, event, detail, page.path).run();
    return { kind: "event", vid, event, detail, path: page.path };
  }

  const cf = request.cf || {};
  const visit = {
    id,
    day,
    vid,
    path: clip(body.path, 200) || "/",
    source: sourceOf({ query: clip(body.q, 300), referrer: clip(body.r, 300) }, url.hostname),
    country: clip(cf.country, 2) || null,
    city: clip(cf.city, 60) || null,
    device: /Mobi|Android|iPhone|iPad/i.test(ua) ? "phone" : "computer",
    org: company(clip(cf.asOrganization, 80)),
  };
  // A page reached from another page of this site keeps the source the
  // visitor arrived with.
  if (visit.source === "internal") {
    const first = await env.DB.prepare("SELECT source FROM visits WHERE vid = ? AND source != 'internal' ORDER BY created_at LIMIT 1")
      .bind(vid)
      .first();
    if (first) visit.source = first.source;
  }
  const seen = await env.DB.prepare("SELECT COUNT(*) AS n FROM visits WHERE vid = ?").bind(vid).first();
  await env.DB.prepare(
    "INSERT OR IGNORE INTO visits (id, day, vid, path, source, country, city, device, org) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
  )
    .bind(visit.id, visit.day, visit.vid, visit.path, visit.source, visit.country, visit.city, visit.device, visit.org)
    .run();
  return { kind: "view", ...visit, firstToday: !seen || seen.n === 0 };
}

const PAGE_NAMES = {
  "/": "Home",
  "/index.html": "Home",
  "/projects.html": "Projects",
  "/about.html": "About",
  "/services.html": "Services",
  "/privacy.html": "Privacy",
  "/resume.html": "Résumé",
  "/projects/termeh.html": "Termeh",
  "/projects/nooklook.html": "Nooklook",
  "/projects/doorlook.html": "Doorlook",
  "/projects/vancobab.html": "Vanco Bab",
  "/projects/taskmate.html": "TaskMate",
  "/projects/foodroutes.html": "FoodRoutes",
  "/projects/hackertycoon.html": "Hacker Tycoon",
  "/projects/this-site.html": "How this site is built",
};
export const pageName = (path) => PAGE_NAMES[path] || path;

export const place = (v) => [v.city, v.country].filter(Boolean).join(", ") || "somewhere";

// What one visitor did today: where they came from, the pages, the time.
export async function journey(env, vid) {
  if (!vid) return null;
  const { results } = await env.DB.prepare("SELECT path, source, seconds, city, country, device, org FROM visits WHERE vid = ? ORDER BY created_at")
    .bind(vid)
    .all();
  if (!results.length) return null;
  const pages = [];
  for (const r of results) {
    const name = pageName(r.path);
    if (pages[pages.length - 1] !== name) pages.push(name);
  }
  const seconds = results.reduce((n, r) => n + (r.seconds || 0), 0);
  const did = await env.DB.prepare("SELECT kind, detail FROM events WHERE vid = ? ORDER BY id").bind(vid).all();
  return {
    source: results[0].source,
    pages,
    distinct: new Set(pages).size,
    seconds,
    where: place(results[0]),
    device: results[0].device,
    org: (results.find((r) => r.org) || {}).org || null,
    resume: did.results.some((e) => e.kind === "resume"),
    out: [...new Set(did.results.filter((e) => e.kind === "out" && e.detail).map((e) => e.detail))],
  };
}

export const minutes = (s) => (s < 60 ? `${s}s` : `${Math.round(s / 60)} min`);

// Numbers for /stats and the morning summary, for the days from..to.
export async function stats(env, from, to) {
  const one = (sql, ...args) => env.DB.prepare(sql).bind(...args).first();
  const all = async (sql, ...args) => (await env.DB.prepare(sql).bind(...args).all()).results;
  const totals = await one(
    "SELECT COUNT(DISTINCT vid) AS visitors, COUNT(*) AS views, COALESCE(SUM(seconds), 0) AS seconds FROM visits WHERE day BETWEEN ? AND ?",
    from,
    to,
  );
  const leads = await one(
    "SELECT COUNT(*) AS n FROM messages WHERE date(created_at, '-7 hours') BETWEEN ? AND ?",
    from,
    to,
  );
  const pages = await all(
    "SELECT path, COUNT(*) AS n FROM visits WHERE day BETWEEN ? AND ? GROUP BY path ORDER BY n DESC LIMIT 5",
    from,
    to,
  );
  // Sources count visitors, by where each one first came from.
  const sources = await all(
    `SELECT source, COUNT(*) AS n FROM (
       SELECT vid, source FROM visits v WHERE day BETWEEN ? AND ? AND created_at = (SELECT MIN(created_at) FROM visits WHERE vid = v.vid)
     ) GROUP BY source ORDER BY n DESC LIMIT 8`,
    from,
    to,
  );
  const places = await all(
    "SELECT city, country, COUNT(DISTINCT vid) AS n FROM visits WHERE day BETWEEN ? AND ? GROUP BY city, country ORDER BY n DESC LIMIT 4",
    from,
    to,
  );
  const phones = await one(
    "SELECT COUNT(DISTINCT vid) AS n FROM visits WHERE day BETWEEN ? AND ? AND device = 'phone'",
    from,
    to,
  );
  const did = await all("SELECT kind, COUNT(DISTINCT vid) AS n FROM events WHERE day BETWEEN ? AND ? GROUP BY kind", from, to);
  const count = (kind) => (did.find((r) => r.kind === kind) || { n: 0 }).n;
  return { ...totals, leads: leads.n, pages, sources, places, phones: phones.n, resumes: count("resume"), forms: count("form") };
}

// The long view for /top: pages with how they were read, sources, and
// where people went when they left.
export async function top(env, from, to) {
  const all = async (sql, ...args) => (await env.DB.prepare(sql).bind(...args).all()).results;
  const pages = await all(
    `SELECT path, COUNT(*) AS n, ROUND(AVG(seconds)) AS seconds, ROUND(AVG(depth)) AS depth
     FROM visits WHERE day BETWEEN ? AND ? GROUP BY path ORDER BY n DESC LIMIT 8`,
    from,
    to,
  );
  const sources = await all(
    `SELECT source, COUNT(*) AS n FROM (
       SELECT vid, source FROM visits v WHERE day BETWEEN ? AND ? AND created_at = (SELECT MIN(created_at) FROM visits WHERE vid = v.vid)
     ) GROUP BY source ORDER BY n DESC LIMIT 8`,
    from,
    to,
  );
  const out = await all(
    "SELECT detail, COUNT(DISTINCT vid) AS n FROM events WHERE kind = 'out' AND day BETWEEN ? AND ? GROUP BY detail ORDER BY n DESC LIMIT 8",
    from,
    to,
  );
  const networks = await all(
    "SELECT org, COUNT(DISTINCT vid) AS n FROM visits WHERE org IS NOT NULL AND day BETWEEN ? AND ? GROUP BY org ORDER BY n DESC LIMIT 6",
    from,
    to,
  );
  return { pages, sources, out, networks };
}

// Visitors seen in the last five minutes, with the page they're on.
export async function now(env) {
  const { results } = await env.DB.prepare(
    `SELECT vid, path, source, city, country, device, org FROM visits v
     WHERE created_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-5 minutes')
       AND created_at = (SELECT MAX(created_at) FROM visits WHERE vid = v.vid)
     ORDER BY created_at DESC LIMIT 10`,
  ).all();
  return results;
}
