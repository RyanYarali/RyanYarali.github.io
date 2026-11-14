// Ryan's Telegram bot. It texts him every message from the contact form
// (with where the sender came from and what they looked at), lets him reply
// to a lead by email straight from Telegram, tracks each lead's status,
// pings him live when someone arrives from a credit tag, a friend's link or
// an AI answer, downloads the résumé or is plainly reading closely, and
// answers /stats, /top, /now, /leads, /find, /refs, /sites and /alerts.
// It also shows him every question a visitor asks Ping on the site.
// Every morning at 9 it sends yesterday's numbers, nudges him about leads
// that went quiet, and on Mondays compares the week with the one before.
// Every five minutes it checks that his clients' sites are up.
//
// It only ever talks to TELEGRAM_CHAT_ID, and only accepts webhook calls
// that carry TELEGRAM_WEBHOOK_SECRET.

import { TOPICS, ADDONS, REFERRAL, money } from "./catalog.js";
import { esc, frame, send, firstName } from "./mail.js";
import { bcDay, journey, minutes, now, pageName, place, sourceLabel, stats, top } from "./visits.js";

export async function tg(env, method, payload) {
  if (!env.TELEGRAM_BOT_TOKEN) return null;
  try {
    const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const out = await res.json().catch(() => ({}));
    if (!out.ok) {
      if (!String(out.description || "").includes("not modified")) console.error(`[telegram] ${method}: ${out.description || res.status}`);
      return null;
    }
    return out.result ?? true;
  } catch (e) {
    console.error(`[telegram] ${method} failed`, e);
    return null;
  }
}

const say = (env, text, extra = {}) =>
  tg(env, "sendMessage", { chat_id: env.TELEGRAM_CHAT_ID, text, parse_mode: "HTML", disable_web_page_preview: true, ...extra });

export const ready = (env) => Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID);

async function setting(env, key, fallback) {
  const r = await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind(key).first();
  return r ? r.value : fallback;
}

const setSetting = (env, key, value) =>
  env.DB.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(key, value).run();

// ==================== Leads ====================

const STATUS = {
  new: "🆕 New",
  replied: "✉️ Replied",
  call: "📞 Call booked",
  won: "✅ Won",
  lost: "❌ Not a fit",
};

function buttons(id, status) {
  const b = (text, data) => ({ text, callback_data: data });
  const rows = [[b("✉️ Reply", `rp:${id}`), b(status === "call" ? "📞 Call booked ✓" : "📞 Call booked", `st:${id}:call`)]];
  rows.push([b(status === "won" ? "✅ Won ✓" : "✅ Won", `st:${id}:won`), b(status === "lost" ? "❌ Not a fit ✓" : "❌ Not a fit", `st:${id}:lost`)]);
  return { inline_keyboard: rows };
}

// A friend's name, checked against past leads: is it someone who paid?
async function referrer(env, ref) {
  if (!ref) return null;
  const r = await env.DB.prepare(
    `SELECT
       (SELECT COUNT(*) FROM messages WHERE lower(name) = lower(?) AND status = 'won') AS client,
       (SELECT COUNT(*) FROM messages WHERE lower(ref) = lower(?)) AS sent`,
  )
    .bind(ref, ref)
    .first();
  return { client: r.client > 0, sent: r.sent };
}

// The text of a lead's alert. `ctx` is what was known when it came in.
export function leadText(m, ctx) {
  const topic = TOPICS[m.topic].label;
  const lines = [`📨 <b>New lead · ${esc(topic)}</b>`, `<b>${esc(m.name)}</b> · ${esc(m.email)}`];
  if (m.estimate) {
    const addons = (m.addons || []).map((id) => ADDONS[id].label);
    lines.push(
      `💰 from ${money(m.estimate.total)}${m.estimate.monthly ? ` + ${money(m.estimate.monthly)}/mo` : ""}${m.ref ? ` (after ${REFERRAL.percent}% referral)` : ""}${addons.length ? ` · ${esc(addons.join(", "))}` : ""}`,
    );
  }
  if (m.ref) {
    const r = ctx.referrer;
    const note = r && r.client ? "✓ a past client" : "not a client I know of yet";
    lines.push(`🤝 Referred by <b>${esc(m.ref)}</b> (${note}${r && r.sent > 1 ? `, ${r.sent} referrals so far` : ""}). They owe $${REFERRAL.reward} once this is paid.`);
  }
  if (ctx.journey) {
    const j = ctx.journey;
    lines.push(`🧭 From ${esc(sourceLabel(j.source))} · ${esc(j.where)} · ${j.device}`);
    lines.push(`👀 Viewed ${esc(j.pages.slice(0, 8).join(" → "))}${j.seconds ? ` · ${minutes(j.seconds)} on the site` : ""}`);
    if (j.org) lines.push(`🏢 Network: ${esc(j.org)}`);
    if (j.resume) lines.push("📄 Downloaded your résumé");
  }
  lines.push("", `💬 ${esc(m.message.slice(0, 1500))}${m.message.length > 1500 ? "…" : ""}`, "", `Status: ${STATUS[m.status || "new"]}`);
  return lines.join("\n");
}

// Sends the alert for a new lead. Returns whether Telegram took it.
export async function alertLead(env, m, id) {
  if (!ready(env)) return false;
  const ctx = { journey: await journey(env, m.vid).catch(() => null), referrer: await referrer(env, m.ref).catch(() => null) };
  if (id != null) await env.DB.prepare("UPDATE messages SET context = ? WHERE id = ?").bind(JSON.stringify(ctx), id).run();
  const sent = await say(env, leadText({ ...m, status: "new" }, ctx), id != null ? { reply_markup: buttons(id, "new") } : {});
  if (sent && id != null) await env.DB.prepare("INSERT OR REPLACE INTO tg_links (tg_message_id, message_id) VALUES (?, ?)").bind(sent.message_id, id).run();
  return Boolean(sent);
}

async function loadLead(env, id) {
  const r = await env.DB.prepare("SELECT * FROM messages WHERE id = ?").bind(id).first();
  if (!r) return null;
  return { ...r, addons: JSON.parse(r.addons || "[]"), estimate: r.estimate != null ? { total: r.estimate, monthly: r.monthly || 0 } : null, ctx: JSON.parse(r.context || "{}") };
}

// ==================== Live alerts ====================

// Someone arrived from a credit tag, a friend's link or an AI answer: worth
// a ping, once per visitor a day, unless Ryan turned alerts off.
export async function alertVisit(env, v) {
  if (!ready(env) || !v || !v.firstToday) return;
  const kind = v.source.split(":")[0];
  if (!["credit", "friend", "ai"].includes(kind)) return;
  if ((await setting(env, "alerts", "on")) !== "on") return;
  const icon = { credit: "🏷️", friend: "🤝", ai: "🤖" }[kind];
  await say(env, `${icon} Someone in ${esc(place(v))} just came from your ${esc(sourceLabel(v.source))} (${v.device}), on ${esc(pageName(v.path))}.`, {
    disable_notification: kind === "ai",
  });
}

// True the first time it is asked about this visitor and alert, so each
// ping goes out once.
async function once(env, vid, kind) {
  const r = await env.DB.prepare("INSERT OR IGNORE INTO flags (vid, kind) VALUES (?, ?) RETURNING vid").bind(vid, kind).first();
  return Boolean(r);
}

const trail = (j) =>
  `${esc(j.pages.slice(0, 8).join(" → "))}\n🧭 ${esc(sourceLabel(j.source))} · ${j.device}${j.seconds ? ` · ${minutes(j.seconds)} so far` : ""}${j.org ? `\n🏢 Network: ${esc(j.org)}` : ""}`;

// Someone downloaded the résumé: the one thing a hiring manager does.
async function alertResume(env, vid) {
  if (!(await once(env, vid, "resume"))) return;
  const j = await journey(env, vid);
  if (!j) return;
  await say(env, `📄 <b>Résumé downloaded</b> by someone in ${esc(j.where)}\n👀 ${trail(j)}`);
}

// Someone is reading closely: three different pages, or three minutes.
async function alertHot(env, vid) {
  const j = await journey(env, vid);
  if (!j || (j.distinct < 3 && j.seconds < 180)) return;
  if (!(await once(env, vid, "hot"))) return;
  await say(env, `🔥 <b>Someone in ${esc(j.where)} is taking a good look</b>\n👀 ${trail(j)}`, { disable_notification: true });
}

// Everything /api/hit reports, turned into the pings worth sending.
export async function alertHit(env, hit) {
  if (!ready(env) || !hit) return;
  if (hit.kind === "view") await alertVisit(env, hit);
  if ((await setting(env, "alerts", "on")) !== "on") return;
  if (hit.kind === "event" && hit.event === "resume") return alertResume(env, hit.vid);
  if (hit.kind === "view" || hit.kind === "time") return alertHot(env, hit.vid);
}

// The joke link (assets/js/trace.js) ran to its end for a friend. This is
// the "proof" Ryan shows them: their name, town, network and phone are real
// (what a visit alert already says); the haul under it is made up to match
// what the page pretended to take. Nothing of it is stored anywhere.
export function traceText(t) {
  const gb = (Math.max(300, Math.min(9000, Number(t.mb) || 2300)) / 1000).toFixed(2);
  const slug = t.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "target";
  return [
    `🎯 <b>Target captured: ${esc(t.name.toUpperCase())}</b>`,
    `📍 ${esc(t.place || "location hidden")}${t.isp ? ` · ${esc(t.isp)}` : ""}`,
    t.device ? `📱 ${esc([t.device, t.system].filter(Boolean).join(" · "))}` : "",
    "",
    "✅ <b>Received and saved on the server</b>",
    "📷 Front camera · 14 frames",
    "🎙 Microphone · 00:21 recording",
    "🖼 Photo library · 4,812 items",
    "👥 Contacts · 316 people",
    "💬 Chats · last 2,000 messages",
    "🔑 Saved passwords · 23",
    "🔎 Search history · 90 days",
    "",
    `📦 <code>${slug}-${t.day}.zip</code> · ${gb} GB`,
    "Status: stored · ready to share",
  ]
    .filter((line, i, all) => line !== "" || all[i - 1] !== "")
    .join("\n");
}

// Once a day per visitor, so the address can't be used to flood the chat.
export async function alertTrace(env, t) {
  if (!ready(env) || !(await once(env, t.vid, "trace"))) return;
  await say(env, traceText(t));
}

// A question put to Ping on the site (worker/ping.js). This message is the
// only place the words are kept, so Ryan sees what people ask and how Ping
// answered. A visitor's first question rings; the rest arrive quietly.
export async function alertChat(env, c) {
  if (!ready(env)) return;
  await say(
    env,
    `💬 <b>Someone in ${esc(c.where)} asked Ping</b>\n“${esc(c.question)}”\n\n🤖 ${esc(c.answer || "(no answer: Ping was unavailable)")}`,
    { disable_notification: !c.first },
  );
}

// Someone ran a site through the checker (worker/check.js): the site, how
// it did, and what failed. Then, quietly, Google's scores when they arrive.
export async function alertCheck(env, c) {
  if (!ready(env)) return;
  if (c.lab) {
    const n = (v) => (v == null ? "?" : v);
    return say(env, `📊 <b>${esc(c.host)}</b> on Google's phone test: speed ${n(c.lab.speed)} · search ${n(c.lab.search)} · accessibility ${n(c.lab.access)}`, {
      disable_notification: true,
    });
  }
  const failed = c.failed.length ? "\n" + c.failed.slice(0, 6).map((t) => `✗ ${esc(t)}`).join("\n") : "";
  await say(env, `🔎 <b>Someone in ${esc(c.where)} checked ${esc(c.host)}</b>\n${c.passed} of ${c.total} checks passed${failed}`);
}

// ==================== Client sites ====================
// Every five minutes: is each client's site answering? Two misses in a row
// count as down (one slow answer is not an outage), and Ryan hears once
// when a site goes down and once when it is back.

export const SITES = ["termehbc.ca", "nooklook.ca", "doorlook.ca", "vancobab.ca"];

async function probe(host) {
  try {
    const res = await fetch(`https://${host}/`, {
      method: "GET",
      redirect: "follow",
      headers: { "User-Agent": "ryanyarali-uptime/1.0 (+https://ryanyarali.com)" },
      signal: AbortSignal.timeout(25000),
    });
    if (res.body) await res.body.cancel().catch(() => {});
    return res.status < 500 ? null : `HTTP ${res.status}`;
  } catch (e) {
    return e && e.name === "TimeoutError" ? "no answer in 25 seconds" : "couldn't connect";
  }
}

export async function watch(env) {
  if (!ready(env)) return;
  const before = await setting(env, "watch", "{}");
  const state = JSON.parse(before || "{}");
  const results = await Promise.all(SITES.map(async (host) => [host, await probe(host)]));
  const at = new Date();
  for (const [host, problem] of results) {
    const st = state[host] || { fails: 0, down: false };
    if (problem) {
      st.fails += 1;
      st.why = problem;
      if (st.fails === 2 && !st.down) {
        st.down = true;
        st.since = at.toISOString();
        await say(env, `🔴 <b>${esc(host)} is down</b> (${esc(problem)}). I'll tell you when it's back.`);
      }
    } else {
      if (st.down) {
        const mins = Math.max(1, Math.round((at - new Date(st.since)) / 60000));
        await say(env, `🟢 <b>${esc(host)} is back up</b> after ${mins < 90 ? `${mins} min` : `${Math.round(mins / 60)} h`}.`);
      }
      st.fails = 0;
      st.down = false;
      delete st.since;
      delete st.why;
    }
    state[host] = st;
  }
  const after = JSON.stringify(state);
  if (after !== before) await setSetting(env, "watch", after);
}

// ==================== Commands ====================

const HELP = `<b>What I can do</b>
/stats  visitors, pages, sources: today and the last 7 days
/top 30  the long view: how each page is read, sources, where people click out (any number of days)
/now  who's on the site right now
/leads  leads still waiting on you
/find name  search every lead by name, email or words
/refs  who has sent you clients (and who you owe $${REFERRAL.reward})
/sites  are your clients' sites up?
/alerts  on or off: pings for résumé downloads, close readers, credit tags, friend links and AI answers
/ignoreme  a link that stops counting your own visits
/forget email  delete everything from that address (privacy requests)

Reply to any lead (or press ✉️ Reply) and I'll email your answer from ryan@ryanyarali.com. You'll see it before it goes.`;

function addDays(day, n) {
  const d = new Date(day + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function statsText(title, s) {
  const lines = [`📊 <b>${title}</b>`, `${s.visitors} visitors · ${s.views} page views · ${s.leads} lead${s.leads === 1 ? "" : "s"}`];
  if (s.visitors) {
    lines.push(`📱 ${Math.round((s.phones / s.visitors) * 100)}% on phones · ${minutes(Math.round(s.seconds / s.visitors))} average visit`);
    if (s.resumes || s.forms)
      lines.push(
        [
          s.resumes ? `📄 ${s.resumes} résumé download${s.resumes === 1 ? "" : "s"}` : "",
          s.forms ? `✍️ ${s.forms} started the form, ${Math.min(s.leads, s.forms)} sent it` : "",
        ]
          .filter(Boolean)
          .join(" · "),
      );
    if (s.sources.length) lines.push("", "<b>Came from</b>", ...s.sources.map((r) => `${r.n} · ${esc(sourceLabel(r.source))}`));
    if (s.pages.length) lines.push("", "<b>Top pages</b>", ...s.pages.map((r) => `${r.n} · ${esc(pageName(r.path))}`));
    if (s.places.length) lines.push("", "<b>Where</b>", ...s.places.map((r) => `${r.n} · ${esc(place(r))}`));
  }
  return lines.join("\n");
}

async function command(env, text, url) {
  const [cmd, arg] = text.trim().split(/\s+/, 2);
  const today = bcDay(new Date());
  switch (cmd.replace(/@.*$/, "").toLowerCase()) {
    case "/start":
    case "/help":
      await menu(env);
      return say(env, HELP);
    case "/stats": {
      const t = await stats(env, today, today);
      const w = await stats(env, addDays(today, -6), today);
      return say(env, statsText("Today", t) + "\n\n" + statsText("Last 7 days", w));
    }
    case "/now": {
      const on = await now(env);
      if (!on.length) return say(env, "🌙 Nobody on the site in the last 5 minutes.");
      return say(
        env,
        `🟢 <b>${on.length} on the site now</b>\n` +
          on.map((v) => `• ${esc(pageName(v.path))} · ${esc(place(v))} · ${v.device} · ${esc(sourceLabel(v.source))}${v.org ? ` · 🏢 ${esc(v.org)}` : ""}`).join("\n"),
      );
    }
    case "/leads": {
      const { results } = await env.DB.prepare(
        "SELECT id, name, topic, status, created_at FROM messages WHERE status IN ('new', 'replied', 'call') ORDER BY id DESC LIMIT 10",
      ).all();
      if (!results.length) return say(env, "🎉 No open leads.");
      for (const r of results.slice(0, 5)) {
        const m = await loadLead(env, r.id);
        const sent = await say(env, leadText(m, m.ctx), { reply_markup: buttons(m.id, m.status) });
        if (sent) await env.DB.prepare("INSERT OR REPLACE INTO tg_links (tg_message_id, message_id) VALUES (?, ?)").bind(sent.message_id, m.id).run();
      }
      return results.length > 5 ? say(env, `…and ${results.length - 5} more.`) : null;
    }
    case "/top": {
      const days = Math.max(1, Math.min(396, parseInt(arg, 10) || 30));
      const from = addDays(today, -(days - 1));
      const t = await top(env, from, today);
      const s = await stats(env, from, today);
      const lines = [`🏆 <b>Last ${days} day${days === 1 ? "" : "s"}</b>`, `${s.visitors} visitors · ${s.views} page views · ${s.leads} lead${s.leads === 1 ? "" : "s"} · ${s.resumes} résumé download${s.resumes === 1 ? "" : "s"}`];
      if (!t.pages.length) lines.push("", "Nothing counted yet.");
      if (t.pages.length)
        lines.push(
          "",
          "<b>Pages</b> (views · average time · how far down)",
          ...t.pages.map((r) => `${r.n} · ${esc(pageName(r.path))}${r.seconds ? ` · ${minutes(r.seconds)}` : ""}${r.depth ? ` · ${r.depth}%` : ""}`),
        );
      if (t.sources.length) lines.push("", "<b>Came from</b>", ...t.sources.map((r) => `${r.n} · ${esc(sourceLabel(r.source))}`));
      if (t.out.length) lines.push("", "<b>Clicked out to</b>", ...t.out.map((r) => `${r.n} · ${esc(r.detail)}`));
      if (t.networks.length) lines.push("", "<b>Company and school networks</b>", ...t.networks.map((r) => `${r.n} · ${esc(r.org)}`));
      if (s.forms) lines.push("", `✍️ ${s.forms} started the contact form, ${Math.min(s.leads, s.forms)} sent it`);
      return say(env, lines.join("\n"));
    }
    case "/find": {
      const q = text.trim().replace(/^\S+\s*/, "").slice(0, 80);
      if (q.length < 2) return say(env, "Usage: /find a name, an email or a few words");
      const like = `%${q.replace(/[%_]/g, " ")}%`;
      const { results } = await env.DB.prepare(
        "SELECT id, name, email, topic, status, created_at FROM messages WHERE name LIKE ? OR email LIKE ? OR message LIKE ? ORDER BY id DESC LIMIT 8",
      )
        .bind(like, like, like)
        .all();
      if (!results.length) return say(env, `Nothing found for “${esc(q)}”.`);
      if (results.length === 1) {
        const m = await loadLead(env, results[0].id);
        const sent = await say(env, leadText(m, m.ctx), { reply_markup: buttons(m.id, m.status) });
        if (sent) await env.DB.prepare("INSERT OR REPLACE INTO tg_links (tg_message_id, message_id) VALUES (?, ?)").bind(sent.message_id, m.id).run();
        return sent;
      }
      return say(
        env,
        `🔎 <b>${results.length} lead${results.length === 1 ? "" : "s"} for “${esc(q)}”</b>\n` +
          results
            .map((r) => `• <b>${esc(r.name)}</b> · ${esc(r.email)}\n   ${esc(TOPICS[r.topic]?.label || r.topic)} · ${STATUS[r.status] || r.status} · ${esc(String(r.created_at).slice(0, 10))}`)
            .join("\n") +
          "\n\nSearch a full email address to open one.",
      );
    }
    case "/sites": {
      const state = JSON.parse((await setting(env, "watch", "{}")) || "{}");
      return say(
        env,
        "🛰️ <b>Client sites</b> (checked every 5 minutes)\n" +
          SITES.map((host) => {
            const st = state[host];
            if (!st) return `⚪ ${esc(host)} · not checked yet`;
            return st.down ? `🔴 ${esc(host)} · down since ${esc(String(st.since).slice(11, 16))} UTC (${esc(st.why || "no answer")})` : `🟢 ${esc(host)}`;
          }).join("\n"),
      );
    }
    case "/refs": {
      const { results } = await env.DB.prepare(
        `SELECT ref, COUNT(*) AS leads, SUM(status = 'won') AS won FROM messages WHERE ref IS NOT NULL AND ref != ''
         GROUP BY lower(ref) ORDER BY won DESC, leads DESC LIMIT 15`,
      ).all();
      const clicks = await env.DB.prepare(
        "SELECT source, COUNT(DISTINCT vid) AS n FROM visits WHERE source LIKE 'friend:%' GROUP BY lower(source) ORDER BY n DESC LIMIT 15",
      ).all();
      const lines = ["🤝 <b>Referrals</b>"];
      if (!results.length && !clicks.results.length) lines.push("None yet. Share the link maker on the pricing section.");
      for (const r of results)
        lines.push(`• <b>${esc(r.ref)}</b>: ${r.leads} lead${r.leads === 1 ? "" : "s"}${r.won ? `, ${r.won} won → you owe $${r.won * REFERRAL.reward}` : ""}`);
      if (clicks.results.length)
        lines.push("", "<b>Friend-link visitors</b>", ...clicks.results.map((c) => `• ${esc(c.source.slice(7))}: ${c.n}`));
      return say(env, lines.join("\n"));
    }
    case "/alerts": {
      const want = arg === "off" ? "off" : arg === "on" ? "on" : (await setting(env, "alerts", "on")) === "on" ? "off" : "on";
      await setSetting(env, "alerts", want);
      return say(env, want === "on" ? "🔔 Live alerts are on." : "🔕 Live alerts are off. /alerts to turn them back on.");
    }
    case "/forget": {
      const email = String(arg || "").trim().toLowerCase();
      if (!email.includes("@")) return say(env, "Usage: /forget someone@example.com");
      const { results } = await env.DB.prepare("SELECT id FROM messages WHERE email = ?").bind(email).all();
      for (const r of results) {
        await env.DB.prepare("DELETE FROM tg_links WHERE message_id = ?").bind(r.id).run();
        await env.DB.prepare("DELETE FROM drafts WHERE message_id = ?").bind(r.id).run();
      }
      await env.DB.prepare("DELETE FROM messages WHERE email = ?").bind(email).run();
      return say(
        env,
        results.length
          ? `🗑️ Deleted ${results.length} message${results.length === 1 ? "" : "s"} from ${esc(email)}. Delete their emails in your inbox too.`
          : `Nothing stored for ${esc(email)}.`,
      );
    }
    case "/ignoreme":
      return say(env, `Open this on each of your devices and your own visits stop counting:\n${url.origin}/?notrack=1`);
    default:
      return say(env, "I don't know that one. /help");
  }
}

// ==================== Replies by email ====================

export function replyMail(m, text) {
  const paras = text
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px">${esc(p).replace(/\n/g, "<br>")}</p>`)
    .join("\n");
  return {
    subject: "Re: your message on ryanyarali.com",
    html: frame(`${paras}
<p style="margin:22px 0 0">Ryan Yarali<br><span style="color:#66666e;font-size:14px">Full-stack developer &middot; Coquitlam, BC &middot; <a href="https://ryanyarali.com/" style="color:#2450f5">ryanyarali.com</a></span></p>`),
    text: `${text}\n\nRyan Yarali\nFull-stack developer · Coquitlam, BC · ryanyarali.com`,
  };
}

async function draftReply(env, leadId, text) {
  const m = await loadLead(env, leadId);
  if (!m) return say(env, "I can't find that lead any more.");
  const d = await env.DB.prepare("INSERT INTO drafts (message_id, text) VALUES (?, ?) RETURNING id").bind(leadId, text.slice(0, 4000)).first();
  return say(env, `✉️ <b>To ${esc(m.name)}</b> &lt;${esc(m.email)}&gt;\n\n${esc(text.slice(0, 3500))}`, {
    reply_markup: { inline_keyboard: [[{ text: "Send ✉️", callback_data: `sd:${d.id}` }, { text: "Cancel", callback_data: `cx:${d.id}` }]] },
  });
}

async function setStatus(env, id, status, cq) {
  await env.DB.prepare("UPDATE messages SET status = ?, status_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), nudged = 0 WHERE id = ?").bind(status, id).run();
  const m = await loadLead(env, id);
  if (cq && cq.message)
    await tg(env, "editMessageText", {
      chat_id: env.TELEGRAM_CHAT_ID,
      message_id: cq.message.message_id,
      text: leadText(m, m.ctx),
      parse_mode: "HTML",
      disable_web_page_preview: true,
      reply_markup: buttons(id, status),
    });
  if (status === "won" && m.ref)
    await say(env, `💸 Reminder: <b>${esc(m.ref)}</b> referred ${esc(m.name)}. You owe them $${REFERRAL.reward} off their next invoice once ${esc(firstName(m.name))} pays.`);
}

async function callback(env, cq) {
  const [kind, a, b] = String(cq.data || "").split(":");
  const answer = (text) => tg(env, "answerCallbackQuery", { callback_query_id: cq.id, text });
  if (kind === "st" && STATUS[b]) {
    await setStatus(env, Number(a), b, cq);
    return answer(STATUS[b]);
  }
  if (kind === "rp") {
    const m = await loadLead(env, Number(a));
    const prompt = await say(env, `Write your answer to ${esc(m.name)} as a reply to this message. I'll show it to you before it goes.`, {
      reply_markup: { force_reply: true, input_field_placeholder: `Your reply to ${firstName(m.name)}` },
    });
    if (prompt) await env.DB.prepare("INSERT OR REPLACE INTO tg_links (tg_message_id, message_id) VALUES (?, ?)").bind(prompt.message_id, m.id).run();
    return answer("Write your reply");
  }
  if (kind === "sd" || kind === "cx") {
    const d = await env.DB.prepare("SELECT * FROM drafts WHERE id = ?").bind(Number(a)).first();
    if (!d) return answer("Already handled");
    await env.DB.prepare("DELETE FROM drafts WHERE id = ?").bind(d.id).run();
    const edit = (text) =>
      tg(env, "editMessageText", { chat_id: env.TELEGRAM_CHAT_ID, message_id: cq.message.message_id, text, parse_mode: "HTML" });
    if (kind === "cx") {
      await edit("🗑️ Not sent.");
      return answer("Cancelled");
    }
    const m = await loadLead(env, d.message_id);
    const ok = await send(env, { ...replyMail(m, d.text), to: m.email, replyTo: env.MAIL_TO });
    if (!ok) {
      await edit(`⚠️ That didn't send. Email ${esc(m.email)} yourself, or try again.`);
      return answer("Not sent");
    }
    // Every reply restarts the three-day follow-up clock.
    await env.DB.prepare(
      "UPDATE messages SET status = CASE WHEN status = 'new' THEN 'replied' ELSE status END, status_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), nudged = 0 WHERE id = ?",
    )
      .bind(m.id)
      .run();
    await edit(`✉️ Sent to ${esc(m.name)} &lt;${esc(m.email)}&gt;:\n\n${esc(d.text.slice(0, 3500))}`);
    return answer("Sent");
  }
  return answer("");
}

// POST /api/telegram: the webhook.
export async function webhook(env, request, url) {
  if (!env.TELEGRAM_WEBHOOK_SECRET || request.headers.get("X-Telegram-Bot-Api-Secret-Token") !== env.TELEGRAM_WEBHOOK_SECRET)
    return new Response("Forbidden", { status: 403 });
  const update = await request.json().catch(() => ({}));
  const msg = update.message;
  const cq = update.callback_query;
  const chat = String((msg && msg.chat.id) || (cq && cq.message && cq.message.chat.id) || "");

  // Setting up: tell whoever writes their chat id until one is configured.
  if (!env.TELEGRAM_CHAT_ID) {
    if (msg) await tg(env, "sendMessage", { chat_id: chat, text: `Your chat id is ${chat}. Save it as the TELEGRAM_CHAT_ID secret.` });
    return new Response("ok");
  }
  if (chat !== String(env.TELEGRAM_CHAT_ID)) return new Response("ok");

  try {
    if (cq) await callback(env, cq);
    else if (msg && msg.reply_to_message && msg.text) {
      const link = await env.DB.prepare("SELECT message_id FROM tg_links WHERE tg_message_id = ?").bind(msg.reply_to_message.message_id).first();
      if (link) await draftReply(env, link.message_id, msg.text);
      else await say(env, "Reply to a lead's message (or press ✉️ Reply on it) and I'll email your answer.");
    } else if (msg && msg.text && msg.text.startsWith("/")) await command(env, msg.text, url);
    else if (msg) await say(env, HELP);
  } catch (e) {
    console.error("[telegram] update failed", e);
    await say(env, "⚠️ Something went wrong there. Try again in a moment.");
  }
  return new Response("ok");
}

// The command list Telegram shows behind the "/" button. Sent at setup and
// again whenever Ryan asks for /help, so new commands appear without the
// setup link.
const menu = (env) =>
  tg(env, "setMyCommands", {
    commands: [
      { command: "stats", description: "Visitors, pages and sources" },
      { command: "top", description: "The long view: /top 30" },
      { command: "now", description: "Who's on the site right now" },
      { command: "leads", description: "Leads waiting on you" },
      { command: "find", description: "Search leads: /find name" },
      { command: "refs", description: "Referrals and who you owe" },
      { command: "sites", description: "Are your clients' sites up?" },
      { command: "alerts", description: "Live alerts on or off" },
      { command: "ignoreme", description: "Stop counting your own visits" },
      { command: "forget", description: "Delete someone's data: /forget email" },
      { command: "help", description: "What the bot can do" },
    ],
  });

// GET /api/telegram/setup?key=WEBHOOK_SECRET: points Telegram at this Worker
// and sets the command menu. Run once after setting the secrets.
export async function setup(env, url) {
  if (!env.TELEGRAM_WEBHOOK_SECRET || url.searchParams.get("key") !== env.TELEGRAM_WEBHOOK_SECRET)
    return new Response("Forbidden", { status: 403 });
  const hook = await tg(env, "setWebhook", {
    url: `${url.origin}/api/telegram`,
    secret_token: env.TELEGRAM_WEBHOOK_SECRET,
    allowed_updates: ["message", "callback_query"],
  });
  await menu(env);
  if (hook && env.TELEGRAM_CHAT_ID) await say(env, "👋 Ping here. I'm connected to ryanyarali.com.\n\n" + HELP);
  return new Response(hook ? "Webhook set. Check Telegram." : "Telegram refused: check TELEGRAM_BOT_TOKEN.", { status: hook ? 200 : 500 });
}

// ==================== Every morning ====================

// 9:00 B.C. time (16:00 UTC, as B.C. stays on UTC-7): yesterday in numbers,
// and any lead that has waited more than a day.
export async function morning(env) {
  await tidy(env);
  if (!ready(env)) return;
  const yesterday = addDays(bcDay(new Date()), -1);
  const s = await stats(env, yesterday, yesterday);
  const { results } = await env.DB.prepare(
    "SELECT name, topic FROM messages WHERE status = 'new' AND created_at < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day') ORDER BY id LIMIT 5",
  ).all();
  let text = "☀️ Good morning!\n\n" + statsText("Yesterday", s);
  if (results.length)
    text += `\n\n⏰ <b>Waiting on you</b>\n` + results.map((r) => `• ${esc(r.name)} · ${esc(TOPICS[r.topic]?.label || r.topic)}`).join("\n") + "\n/leads to answer them";
  // Leads Ryan answered that have had three quiet days: one nudge each.
  const quiet = await env.DB.prepare(
    `SELECT id, name, topic FROM messages
     WHERE status = 'replied' AND nudged = 0
       AND COALESCE(status_at, created_at) < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-3 days')
     ORDER BY id LIMIT 5`,
  ).all();
  if (quiet.results.length) {
    text +=
      `\n\n🔔 <b>Worth a follow-up</b> (you replied, then three quiet days)\n` +
      quiet.results.map((r) => `• ${esc(r.name)} · ${esc(TOPICS[r.topic]?.label || r.topic)}`).join("\n") +
      "\n/find a name to open one";
    for (const r of quiet.results) await env.DB.prepare("UPDATE messages SET nudged = 1 WHERE id = ?").bind(r.id).run();
  }
  await say(env, text, { disable_notification: !results.length && !s.leads && !quiet.results.length });
  if (new Date(yesterday + "T12:00:00Z").getUTCDay() === 0) await weekly(env, yesterday);
}

// Mondays: the week that just ended (Monday to Sunday) against the one
// before it.
const change = (a, b) => (b ? ` (${a >= b ? "▲" : "▼"} ${Math.abs(Math.round(((a - b) / b) * 100))}%)` : a ? " (new)" : "");

export async function weekly(env, sunday) {
  const w = await stats(env, addDays(sunday, -6), sunday);
  const p = await stats(env, addDays(sunday, -13), addDays(sunday, -7));
  const lines = [
    "🗓️ <b>Your week</b>",
    `👥 ${w.visitors} visitors${change(w.visitors, p.visitors)}`,
    `📄 ${w.views} page views${change(w.views, p.views)}`,
    `📨 ${w.leads} lead${w.leads === 1 ? "" : "s"}${change(w.leads, p.leads)}`,
    `📎 ${w.resumes} résumé download${w.resumes === 1 ? "" : "s"}${change(w.resumes, p.resumes)}`,
  ];
  if (w.sources.length) lines.push("", `Best source: <b>${esc(sourceLabel(w.sources[0].source))}</b> (${w.sources[0].n})`);
  if (w.pages.length) lines.push(`Most read: <b>${esc(pageName(w.pages[0].path))}</b> (${w.pages[0].n})`);
  if (w.places.length) lines.push(`Mostly from: <b>${esc(place(w.places[0]))}</b>`);
  lines.push("", "/top 7 for the detail");
  await say(env, lines.join("\n"), { disable_notification: true });
}

// What the privacy page promises: messages go after two years (clients'
// stay, for business records), visit counts after thirteen months, unsent
// drafts after a week.
export async function tidy(env) {
  const run = (sql) => env.DB.prepare(sql).run().catch((e) => console.error("[tidy]", sql, e));
  await run("DELETE FROM visits WHERE created_at < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-396 days')");
  await run("DELETE FROM events WHERE created_at < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-396 days')");
  await run("DELETE FROM flags WHERE created_at < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-2 days')");
  await run("DELETE FROM drafts WHERE created_at < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-7 days')");
  await run("DELETE FROM messages WHERE status != 'won' AND created_at < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-2 years')");
  await run("DELETE FROM tg_links WHERE message_id NOT IN (SELECT id FROM messages)");
}
