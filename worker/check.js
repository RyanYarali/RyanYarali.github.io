// "Check my website" (check.html, assets/js/check.js): a visitor types the
// address of their own site and sees, in plain words, how it does for
// speed, on Google and on phones.
//
// POST /api/check      { url }  -> the quick report: this Worker loads the
//                                  page once, the way a phone would, and
//                                  runs the checks in CHECKS below
// POST /api/check/lab  { url }  -> Google's own phone test (PageSpeed
//                                  Insights), which takes about 20 seconds.
//                                  Needs the PSI_KEY secret; without it the
//                                  page simply leaves that part out.
//
// Only the address of the site and its results are kept: a `check` row in
// the events table (the host name, for the daily limits) and a message to
// Ryan's Telegram, because someone checking their site is someone who may
// want a better one.

import { alertCheck } from "./telegram.js";
import { bcDay, isBot, place, visitorId } from "./visits.js";

export const LIMITS = {
  perVisitor: 8, // sites a day from one visitor
  perDay: 200, // in all
  html: 600000, // characters of the page that are read
  timeout: 12000, // ms to wait for the site
};

const UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36 ryanyarali-check/1.0 (+https://ryanyarali.com/check.html)";

// ==================== The address ====================

// What they typed, as a web address we are willing to load: a public host
// name over http or https on the usual ports. Null for anything else.
export function normalize(input) {
  let text = String(input || "").trim().slice(0, 300);
  if (!text || /\s/.test(text)) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) text = "https://" + text;
  let url;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password || url.port) return null;
  const host = url.hostname.toLowerCase();
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host)) return null; // no bare names, no IPv6
  if (/^\d+(\.\d+){3}$/.test(host)) return null; // no IP addresses
  if (/(^|\.)(localhost|local|internal|lan|home|test|invalid|example)$/.test(host)) return null;
  url.hash = "";
  return url;
}

// ==================== Reading the page ====================

const attr = (tag, name) => {
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return m ? (m[1] ?? m[2] ?? m[3] ?? "").trim() : null;
};
const has = (tag, name) => new RegExp(`\\s${name}(\\s|=|>|/)`, "i").test(tag);
const tags = (html, name) => html.match(new RegExp(`<${name}\\b[^>]*>`, "gi")) || [];
const text = (s) =>
  String(s || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

// The facts the checks are made from, pulled out of the page's HTML.
export function facts(html, page = {}) {
  const head = (html.match(/<head\b[\s\S]*?<\/head>/i) || [html.slice(0, 60000)])[0];
  const metas = tags(head, "meta");
  const meta = (key) => {
    const t = metas.find((m) => (attr(m, "name") || attr(m, "property") || "").toLowerCase() === key);
    return t ? attr(t, "content") || "" : null;
  };
  const imgs = tags(html, "img");
  const scripts = tags(html, "script").filter((s) => attr(s, "src"));
  const headScripts = tags(head, "script").filter((s) => attr(s, "src") && !has(s, "async") && !has(s, "defer") && attr(s, "type") !== "module");
  const title = text((html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i) || [])[1]);
  const later = imgs.slice(3);
  return {
    https: page.finalUrl ? page.finalUrl.startsWith("https:") : true,
    ms: page.ms ?? null,
    bytes: page.bytes ?? html.length,
    title,
    description: meta("description"),
    h1: tags(html, "h1").length,
    noindex: /noindex/i.test(meta("robots") || "") || /noindex/i.test(page.robotsHeader || ""),
    viewport: meta("viewport"),
    lang: attr((html.match(/<html\b[^>]*>/i) || [""])[0], "lang"),
    ogTitle: meta("og:title"),
    ogImage: meta("og:image"),
    schema: /<script[^>]+type\s*=\s*["']application\/ld\+json["']/i.test(html),
    images: imgs.length,
    imagesAlt: imgs.filter((i) => attr(i, "alt") !== null).length,
    imagesSized: imgs.filter((i) => attr(i, "width") && attr(i, "height")).length,
    laterImages: later.length,
    laterLazy: later.filter((i) => (attr(i, "loading") || "").toLowerCase() === "lazy").length,
    scripts: scripts.length,
    blocking: headScripts.length,
    tel: /href\s*=\s*["']tel:/i.test(html),
  };
}

// ==================== The checks ====================
// Each one: the group it belongs to, a test on the facts, what it means in
// plain words when it passes, and what to do about it when it doesn't.

const share = (part, whole) => (whole ? part / whole : 1);
const secs = (ms) => (ms / 1000).toFixed(1);

export const CHECKS = [
  {
    id: "fast-answer",
    group: "speed",
    test: (f) => f.ms != null && f.ms <= 800,
    good: (f) => `The server answers quickly (${secs(f.ms)} seconds).`,
    bad: (f) => `The server is slow to answer (${f.ms == null ? "no time measured" : secs(f.ms) + " seconds"}).`,
    fix: "Visitors wait before anything shows. Better hosting or caching usually fixes this.",
  },
  {
    id: "light-page",
    group: "speed",
    test: (f) => f.bytes <= 250000,
    good: () => "The page itself is light.",
    bad: (f) => `The page's code is heavy (${Math.round(f.bytes / 1000)} KB before any images).`,
    fix: "Heavy pages load slowly on phone data. Page builders and unused plugins are the usual cause.",
  },
  {
    id: "few-blocking",
    group: "speed",
    test: (f) => f.blocking <= 3,
    good: () => "Nothing much holds up the first view.",
    bad: (f) => `${f.blocking} scripts load before the page can show anything.`,
    fix: "Each one delays the first view. Most can load after the page is visible.",
  },
  {
    id: "lazy-images",
    group: "speed",
    test: (f) => f.laterImages < 4 || share(f.laterLazy, f.laterImages) >= 0.5,
    good: () => "Images further down the page wait until they are needed.",
    bad: (f) => `All ${f.images} images load at once, even the ones far down the page.`,
    fix: "Loading images only when someone scrolls to them makes the page open much faster.",
  },
  {
    id: "sized-images",
    group: "speed",
    test: (f) => f.images < 3 || share(f.imagesSized, f.images) >= 0.6,
    good: () => "The page holds still while images load.",
    bad: () => "The page jumps around as images load.",
    fix: "Images without a set size push text down as they arrive, so people tap the wrong thing.",
  },
  {
    id: "title",
    group: "google",
    test: (f) => f.title.length >= 10 && f.title.length <= 70,
    good: () => "The page has a clear title for Google.",
    bad: (f) => (f.title ? `The page title is ${f.title.length < 10 ? "too short" : "too long"} for Google to show well.` : "The page has no title for Google."),
    fix: "The title is the blue link people see in search results. It should name the business and the place.",
  },
  {
    id: "description",
    group: "google",
    test: (f) => f.description != null && f.description.length >= 50 && f.description.length <= 180,
    good: () => "It tells Google what to say under the link.",
    bad: (f) => (f.description ? "The summary for search results is the wrong length." : "There is no summary for search results."),
    fix: "Without one, Google picks a random sentence from the page to show under your link.",
  },
  {
    id: "heading",
    group: "google",
    test: (f) => f.h1 === 1,
    good: () => "The page has one main heading.",
    bad: (f) => (f.h1 ? `The page has ${f.h1} main headings; it should have one.` : "The page has no main heading."),
    fix: "One clear main heading tells Google and visitors what the page is about.",
  },
  {
    id: "indexable",
    group: "google",
    test: (f) => !f.noindex,
    good: () => "Google is allowed to list the page.",
    bad: () => "The page tells Google not to list it.",
    fix: "A setting on the site is hiding it from search. This is often left on by mistake after building.",
  },
  {
    id: "secure",
    group: "google",
    test: (f) => f.https,
    good: () => "The site is secure (https).",
    bad: () => "The site is not secure (no https).",
    fix: "Browsers show a warning on sites without https, and Google ranks them lower.",
  },
  {
    id: "share",
    group: "google",
    test: (f) => Boolean(f.ogTitle && f.ogImage),
    good: () => "Links to the site show a picture when shared.",
    bad: () => "Links to the site show no picture when shared.",
    fix: "On Instagram, WhatsApp and Messages the link shows as plain text, so fewer people tap it.",
  },
  {
    id: "schema",
    group: "google",
    test: (f) => f.schema,
    good: () => "It gives Google the business details in its own format.",
    bad: () => "It doesn't give Google the business details in its own format.",
    fix: "This is how hours, address and reviews show up directly in search results.",
  },
  {
    id: "viewport",
    group: "phones",
    test: (f) => /width\s*=\s*device-width/i.test(f.viewport || ""),
    good: () => "The page is built to fit a phone screen.",
    bad: () => "The page is not set up to fit a phone screen.",
    fix: "Phones show it as a tiny desktop page that has to be pinched and zoomed.",
  },
  {
    id: "zoom",
    group: "phones",
    test: (f) => !/user-scalable\s*=\s*(no|0)/i.test(f.viewport || "") && !/maximum-scale\s*=\s*1(\.0+)?\s*(,|$)/i.test(f.viewport || ""),
    good: () => "Visitors can zoom in if they need to.",
    bad: () => "The page stops visitors from zooming in.",
    fix: "People with weaker eyesight can't enlarge the text.",
  },
  {
    id: "call",
    group: "phones",
    test: (f) => f.tel,
    good: () => "The phone number can be tapped to call.",
    bad: () => "There is no phone number that can be tapped to call.",
    fix: "For a local business, a tap-to-call number is the shortest path to a new customer.",
  },
  {
    id: "alt",
    group: "phones",
    test: (f) => f.images < 3 || share(f.imagesAlt, f.images) >= 0.8,
    good: () => "Images are described for people who can't see them.",
    bad: (f) => `${f.images - f.imagesAlt} of ${f.images} images have no description.`,
    fix: "Screen readers skip them, and Google can't tell what the pictures show.",
  },
];

export const GROUPS = { speed: "Speed", google: "On Google", phones: "On phones" };

export function report(f) {
  const checks = CHECKS.map((c) => {
    const ok = Boolean(c.test(f));
    return { id: c.id, group: c.group, ok, text: ok ? c.good(f) : c.bad(f), fix: ok ? null : c.fix };
  });
  return { passed: checks.filter((c) => c.ok).length, total: checks.length, checks };
}

// ==================== Loading the site ====================

// A Worker can't call its own address (Cloudflare answers with an error
// rather than let it loop), so this site's own pages are read the way
// index.js serves them: from the repo's files, or from GitHub Pages for the
// client previews.
const GITHUB = "https://ryanyarali.github.io";
const bare = (host) => host.replace(/^www\./, "");

async function own(env, url) {
  const path = url.pathname.endsWith("/") ? url.pathname + "index.html" : url.pathname;
  const file = await env.ASSETS.fetch(new Request(new URL(path + url.search, url.origin), { headers: { Accept: "text/html" } }));
  if (file.status !== 404) return file;
  return fetch(GITHUB + url.pathname + url.search, { redirect: "follow", headers: { "User-Agent": UA }, signal: AbortSignal.timeout(LIMITS.timeout) });
}

async function load(url, env, self) {
  const started = Date.now();
  const mine = self && bare(url.hostname) === bare(self.hostname);
  if (mine) url = new URL(url.pathname + url.search, self.origin);
  const res = mine
    ? await own(env, url)
    : await fetch(url.toString(), {
        redirect: "follow",
        headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5", "Accept-Language": "en-CA,en;q=0.9" },
        signal: AbortSignal.timeout(LIMITS.timeout),
      });
  const ms = Date.now() - started;
  const type = res.headers.get("Content-Type") || "";
  if (!res.ok) return { error: res.status === 403 || res.status === 429 || res.status === 503 ? "blocked" : "status", status: res.status };
  if (!/html/i.test(type)) return { error: "nothtml" };
  const raw = await res.text();
  return {
    ms,
    finalUrl: mine ? url.toString() : res.url || url.toString(),
    bytes: raw.length,
    robotsHeader: res.headers.get("X-Robots-Tag") || "",
    html: raw.slice(0, LIMITS.html),
  };
}

const WHY = {
  blocked: "That site turned my check away (some sites block automated visitors). I can still look at it for you by hand.",
  status: "That address answered with an error, so there was no page to check. Is the address right?",
  nothtml: "That address isn't a web page. Try the home page of the site.",
  down: "I couldn't reach that site. Check the address, or the site may be down.",
  bad: "That doesn't look like a website address. Try something like yourbusiness.ca.",
  busy: "The checker has had a busy day. Try again tomorrow, or ask Ryan to look at your site: call or text 604-729-3212.",
};

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

// The request, checked the same way for both endpoints.
async function open(request, env, url) {
  if (request.method !== "POST") return { res: json({ ok: false, error: "Method not allowed" }, 405) };
  if (request.headers.get("Origin") !== url.origin) return { res: json({ ok: false, error: "Forbidden" }, 403) };
  if (isBot(request.headers.get("User-Agent") || "")) return { res: json({ ok: false, error: "Forbidden" }, 403) };
  const raw = await request.text();
  if (raw.length > 2000) return { res: json({ ok: false, error: "Too long" }, 413) };
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return { res: json({ ok: false, error: "Bad request" }, 400) };
  }
  const site = normalize(body && body.url);
  if (!site) return { res: json({ ok: false, message: WHY.bad }) };
  const day = bcDay(new Date());
  const vid = await visitorId(env, request, day);
  return { site, day, vid };
}

export async function check(request, env, ctx, url) {
  const o = await open(request, env, url);
  if (o.res) return o.res;
  const { site, day, vid } = o;
  const used = await env.DB.prepare(
    "SELECT COUNT(*) AS today, COALESCE(SUM(vid = ?), 0) AS mine FROM events WHERE kind = 'check' AND day = ?",
  )
    .bind(vid, day)
    .first();
  if (used.mine >= LIMITS.perVisitor || used.today >= LIMITS.perDay) return json({ ok: false, message: WHY.busy });
  await env.DB.prepare("INSERT INTO events (day, vid, kind, detail, path) VALUES (?, ?, 'check', ?, '/check.html')").bind(day, vid, site.hostname).run();

  let page;
  try {
    page = await load(site, env, url);
  } catch {
    page = { error: "down" };
  }
  if (page.error) return json({ ok: false, message: WHY[page.error] || WHY.down });

  const out = report(facts(page.html, page));
  const host = new URL(page.finalUrl).hostname.replace(/^www\./, "");
  const cf = request.cf || {};
  ctx.waitUntil(
    alertCheck(env, {
      where: place({ city: cf.city, country: cf.country }),
      host,
      passed: out.passed,
      total: out.total,
      failed: out.checks.filter((c) => !c.ok).map((c) => c.text),
    }).catch((e) => console.error("[telegram] check alert", e)),
  );
  return json({ ok: true, host, url: page.finalUrl, lab: Boolean(env.PSI_KEY), ...out });
}

// ==================== Google's test ====================

const PSI = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

export async function lab(request, env, ctx, url) {
  const o = await open(request, env, url);
  if (o.res) return o.res;
  const { site, day, vid } = o;
  if (!env.PSI_KEY) return json({ ok: false });
  // Only for a site this visitor has just checked, and once each, so this
  // can't be used as a free door to Google's service.
  const seen = await env.DB.prepare(
    "SELECT COALESCE(SUM(kind = 'check'), 0) AS checked, COALESCE(SUM(kind = 'lab'), 0) AS done FROM events WHERE vid = ? AND day = ? AND detail = ?",
  )
    .bind(vid, day, site.hostname)
    .first();
  if (!seen.checked || seen.done) return json({ ok: false });
  await env.DB.prepare("INSERT INTO events (day, vid, kind, detail, path) VALUES (?, ?, 'lab', ?, '/check.html')").bind(day, vid, site.hostname).run();

  const q = new URLSearchParams({ url: site.toString(), strategy: "mobile", key: env.PSI_KEY });
  for (const c of ["performance", "seo", "accessibility"]) q.append("category", c);
  let data;
  try {
    const res = await fetch(`${PSI}?${q}`, { signal: AbortSignal.timeout(50000) });
    if (!res.ok) return json({ ok: false });
    data = await res.json();
  } catch {
    return json({ ok: false });
  }
  const lr = data && data.lighthouseResult;
  if (!lr || !lr.categories) return json({ ok: false });
  const score = (k) => (lr.categories[k] && lr.categories[k].score != null ? Math.round(lr.categories[k].score * 100) : null);
  const shown = (k) => (lr.audits && lr.audits[k] && lr.audits[k].displayValue) || null;
  const out = {
    speed: score("performance"),
    search: score("seo"),
    access: score("accessibility"),
    paint: shown("largest-contentful-paint"),
  };
  const host = site.hostname.replace(/^www\./, "");
  ctx.waitUntil(alertCheck(env, { host, lab: out }).catch((e) => console.error("[telegram] lab alert", e)));
  return json({ ok: true, ...out });
}
