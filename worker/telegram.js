// Ryan's Telegram bot. It texts him every message from the contact form
// (with where the sender came from and what they looked at), lets him reply
// to a lead by email straight from Telegram, tracks each lead's status,
// pings him live when someone arrives from a credit tag, a friend's link or
// an AI answer, and answers /stats, /now, /leads, /refs and /alerts. Every
// morning at 9 it sends yesterday's numbers.
//
// It only ever talks to TELEGRAM_CHAT_ID, and only accepts webhook calls
// that carry TELEGRAM_WEBHOOK_SECRET.

import { TOPICS, ADDONS, REFERRAL, money } from "./catalog.js";
import { esc, frame, send, firstName } from "./mail.js";
import { bcDay, journey, minutes, now, pageName, place, sourceLabel, stats } from "./visits.js";

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

// ==================== Commands ====================

const HELP = `<b>What I can do</b>
/stats  visitors, pages, sources: today and the last 7 days
/now  who's on the site right now
/leads  leads still waiting on you
/refs  who has sent you clients (and who you owe $${REFERRAL.reward})
/alerts  on or off: pings for credit tags, friend links and AI answers
/ignoreme  a link that stops counting your own visits

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
          on.map((v) => `• ${esc(pageName(v.path))} · ${esc(place(v))} · ${v.device} · ${esc(sourceLabel(v.source))}`).join("\n"),
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
  await env.DB.prepare("UPDATE messages SET status = ? WHERE id = ?").bind(status, id).run();
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
    if (m.status === "new") await env.DB.prepare("UPDATE messages SET status = 'replied' WHERE id = ?").bind(m.id).run();
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
  await tg(env, "setMyCommands", {
    commands: [
      { command: "stats", description: "Visitors, pages and sources" },
      { command: "now", description: "Who's on the site right now" },
      { command: "leads", description: "Leads waiting on you" },
      { command: "refs", description: "Referrals and who you owe" },
      { command: "alerts", description: "Live alerts on or off" },
      { command: "ignoreme", description: "Stop counting your own visits" },
      { command: "help", description: "What the bot can do" },
    ],
  });
  if (hook && env.TELEGRAM_CHAT_ID) await say(env, "👋 Ping here. I'm connected to ryanyarali.com.\n\n" + HELP);
  return new Response(hook ? "Webhook set. Check Telegram." : "Telegram refused: check TELEGRAM_BOT_TOKEN.", { status: hook ? 200 : 500 });
}

// ==================== Every morning ====================

// 9:00 B.C. time (16:00 UTC, as B.C. stays on UTC-7): yesterday in numbers,
// and any lead that has waited more than a day.
export async function morning(env) {
  if (!ready(env)) return;
  const yesterday = addDays(bcDay(new Date()), -1);
  const s = await stats(env, yesterday, yesterday);
  const { results } = await env.DB.prepare(
    "SELECT name, topic FROM messages WHERE status = 'new' AND created_at < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day') ORDER BY id LIMIT 5",
  ).all();
  let text = "☀️ Good morning!\n\n" + statsText("Yesterday", s);
  if (results.length)
    text += `\n\n⏰ <b>Waiting on you</b>\n` + results.map((r) => `• ${esc(r.name)} · ${esc(TOPICS[r.topic]?.label || r.topic)}`).join("\n") + "\n/leads to answer them";
  await say(env, text, { disable_notification: !results.length && !s.leads });
}
