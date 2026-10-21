// ryanyarali.com on Cloudflare. The site itself is static files (wrangler.jsonc
// serves the repo); this Worker only runs for:
//   POST /api/contact   the contact form: check, save to D1, email, thank
//   "/" and other folders, which get their index.html
//   any other path that isn't a file here, which is passed to GitHub Pages,
//   where the client previews live (ryanyarali.com/taha-portfolio and the
//   rest are project pages of Ryan's GitHub account). GitHub's 404 becomes
//   the site's own 404 page.

import { TOPICS, ADDONS, isPackage, estimate } from "./catalog.js";
import { ownerMail, senderMail, send, telegram } from "./mail.js";

const GITHUB = "https://ryanyarali.github.io";
const PER_HOUR = 5; // messages from one visitor
const MAX_BODY = 20000; // bytes

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/api/contact") return contact(request, env, ctx, url);
    if (url.pathname.startsWith("/api/")) return json({ ok: false, error: "Not found" }, 404);
    if (url.pathname.endsWith("/")) {
      const index = await env.ASSETS.fetch(new URL(url.pathname + "index.html", url.origin), request);
      if (index.status !== 404) return index;
    }
    return fromGitHub(request, env, url);
  },
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

// ==================== Client previews ====================

async function fromGitHub(request, env, url) {
  const seg = url.pathname.split("/")[1];
  if ((request.method === "GET" || request.method === "HEAD") && /^[\w.-]+$/.test(seg || "")) {
    const res = await fetch(GITHUB + url.pathname + url.search, {
      method: request.method,
      headers: { Accept: request.headers.get("Accept") || "*/*" },
      redirect: "manual",
    });
    if (res.status !== 404) {
      const headers = new Headers(res.headers);
      // "/taha-portfolio" -> "/taha-portfolio/" comes back pointing at
      // github.io; keep the visitor on this domain.
      const loc = headers.get("Location");
      if (loc && loc.startsWith(GITHUB)) headers.set("Location", url.origin + loc.slice(GITHUB.length));
      return new Response(res.body, { status: res.status, headers });
    }
  }
  // Not a file here and not on GitHub: the site's own 404 page.
  const page = await env.ASSETS.fetch(new URL("/404.html", url.origin));
  return new Response(page.body, { status: 404, headers: page.headers });
}

// ==================== Contact form ====================

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The message, cleaned, or { field, error } for the first thing wrong.
export function check(body) {
  const str = (v) => (typeof v === "string" ? v.trim() : "");
  const topic = str(body.topic);
  // One line: a name goes into the email subject.
  const name = str(body.name).replace(/[\u0000-\u001f\u007f]+/g, " ");
  const email = str(body.email).toLowerCase();
  const message = str(body.message);
  const ref = str(body.ref).replace(/[\u0000-\u001f\u007f]+/g, " ").slice(0, 100);
  const picked = Array.isArray(body.addons) ? [...new Set(body.addons.map(String))] : [];

  if (!TOPICS[topic]) return { field: "topic", error: "Pick what your message is about" };
  if (name.length < 2 || name.length > 100) return { field: "name", error: "Name must be 2 to 100 characters" };
  if (!EMAIL.test(email) || email.length > 200) return { field: "email", error: "Please enter a valid email address" };
  if (message.length < 10 || message.length > 5000)
    return { field: "message", error: "Message must be 10 to 5,000 characters" };

  // Add-ons only go with a package, and some only with one.
  const addons = isPackage(topic)
    ? picked.filter((id) => ADDONS[id] && (!ADDONS[id].only || ADDONS[id].only === topic))
    : [];
  return { topic, name, email, message, addons, ref, estimate: estimate(topic, addons, Boolean(ref)) };
}

async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function human(env, token, ip) {
  // Without a secret (local dev) the check is skipped.
  if (!env.TURNSTILE_SECRET) return true;
  if (!token) return false;
  const form = new FormData();
  form.append("secret", env.TURNSTILE_SECRET);
  form.append("response", token);
  if (ip) form.append("remoteip", ip);
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
    const out = await res.json();
    return out.success === true;
  } catch (e) {
    console.error("[turnstile] verify failed", e);
    return false;
  }
}

async function contact(request, env, ctx, url) {
  if (request.method !== "POST") return json({ ok: false, error: "Use POST" }, 405);
  // Only this site's own pages may post here.
  const origin = request.headers.get("Origin");
  if (origin && origin !== url.origin) return json({ ok: false, error: "Not allowed" }, 403);
  if (!(request.headers.get("Content-Type") || "").includes("application/json"))
    return json({ ok: false, error: "Please email ryan@ryanyarali.com instead." }, 415);

  const raw = await request.text();
  if (raw.length > MAX_BODY) return json({ ok: false, error: "That message is too long." }, 413);
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ ok: false, error: "Something went wrong. Please try again." }, 400);
  }
  if (!body || typeof body !== "object") return json({ ok: false, error: "Something went wrong. Please try again." }, 400);

  // The hidden field: a bot filled it in. Tell it everything went fine.
  if (body.website) return json({ ok: true });

  const m = check(body);
  if (m.error) return json({ ok: false, field: m.field, error: m.error }, 400);

  const ip = request.headers.get("CF-Connecting-IP") || "";
  if (!(await human(env, body.token, ip)))
    return json({ ok: false, error: "Couldn't confirm you're not a bot. Please try again." }, 403);

  const ipHash = await sha256((env.HASH_SALT || "ryanyarali.com") + ip);
  let id = null;
  try {
    const recent = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM messages WHERE ip_hash = ? AND created_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 hour')",
    )
      .bind(ipHash)
      .first();
    if (recent && recent.n >= PER_HOUR)
      return json({ ok: false, error: "That's a lot of messages. Please email ryan@ryanyarali.com instead." }, 429);
    const row = await env.DB.prepare(
      "INSERT INTO messages (topic, addons, estimate, monthly, name, email, message, ref, ip_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id",
    )
      .bind(m.topic, JSON.stringify(m.addons), m.estimate?.total ?? null, m.estimate?.monthly ?? null, m.name, m.email, m.message, m.ref || null, ipHash)
      .first();
    id = row && row.id;
  } catch (e) {
    // Saving failed: still send the emails, so the message isn't lost.
    console.error("[db] save failed", e);
  }

  ctx.waitUntil(notify(env, m, id));
  return json({ ok: true });
}

async function notify(env, m, id) {
  const owner = ownerMail(m, new Date());
  const [notified] = await Promise.all([
    send(env, { ...owner, to: env.MAIL_TO, replyTo: m.email }),
    telegram(env, m),
  ]);

  // One thank-you per address a day, so the form can't flood someone's
  // inbox with them.
  let replied = false;
  let thanked = 0;
  try {
    const r = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM messages WHERE email = ? AND replied = 1 AND created_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day')",
    )
      .bind(m.email)
      .first();
    thanked = r ? r.n : 0;
  } catch (e) {
    console.error("[db] lookup failed", e);
  }
  if (!thanked) replied = await send(env, { ...senderMail(m), to: m.email, replyTo: env.MAIL_TO });

  if (id == null) return;
  try {
    await env.DB.prepare("UPDATE messages SET notified = ?, replied = ? WHERE id = ?")
      .bind(notified ? 1 : 0, replied ? 1 : 0, id)
      .run();
  } catch (e) {
    console.error("[db] update failed", e);
  }
}
