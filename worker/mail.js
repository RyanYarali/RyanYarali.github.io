// The two emails a message sets off: the notice to Ryan, with everything in
// it, and the thank-you to the sender. The thank-you only ever repeats what
// the sender picked from fixed lists, never their own words, so the form
// can't be used to mail someone else a stranger's text.

import { TOPICS, ADDONS, REFERRAL, money } from "./catalog.js";

export const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// The first word of the name, letters only, or "there". A name like
// "Visit evil.example" greets "Visit", not a link.
export function firstName(name) {
  const word = String(name).trim().split(/\s+/)[0] || "";
  const clean = word.replace(/[^\p{L}\p{M}'’-]/gu, "").slice(0, 30);
  return clean || "there";
}

// B.C. time, worked out here on the server: the Workers runtime knows B.C.
// stays on UTC-7 from November 2026, where an old device might not.
export function bcTime(date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Vancouver",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

const and = (items) => new Intl.ListFormat("en-CA", { type: "conjunction" }).format(items);

function list(ids) {
  return ids.map((id) => ADDONS[id].label);
}

function estimateText(est) {
  if (!est) return "";
  return `from ${money(est.total)}${est.monthly ? ` + ${money(est.monthly)}/mo` : ""}`;
}

// One shared frame: off-white page, a white card, the blue accent rule.
// Email clients ignore stylesheets, so everything is inline.
export function frame(inner) {
  return `<!doctype html><html><body style="margin:0;padding:24px 12px;background:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#0a0a0b">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e8e8ea;border-radius:14px;border-top:4px solid #2450f5">
<tr><td style="padding:28px 28px 8px;font:500 11px/1 'IBM Plex Mono',Menlo,Consolas,monospace;letter-spacing:.12em;text-transform:uppercase;color:#66666e">PING &middot; ryanyarali.com</td></tr>
<tr><td style="padding:8px 28px 28px;font-size:16px;line-height:1.6">${inner}</td></tr>
</table></td></tr></table></body></html>`;
}

const row = (k, v) =>
  `<tr><td style="padding:8px 12px 8px 0;vertical-align:top;color:#66666e;font-size:14px;white-space:nowrap">${k}</td><td style="padding:8px 0;font-size:15px">${v}</td></tr>`;

export function ownerMail(m, now) {
  const about = TOPICS[m.topic].label;
  const addons = list(m.addons);
  const est = estimateText(m.estimate);
  const subject = `New message: ${about} · ${m.name}`.slice(0, 150);
  const html = frame(`<p style="margin:0 0 10px"><span style="display:inline-block;padding:4px 12px;border-radius:999px;background:#eef1fe;color:#2450f5;font-size:13px;font-weight:600">${esc(about)}</span></p>
<h1 style="margin:0 0 16px;font-size:24px;line-height:1.2;letter-spacing:-.02em">New message from ${esc(m.name)}</h1>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-top:1px solid #e8e8ea;margin-bottom:16px">
${row("From", `${esc(m.name)} &lt;<a href="mailto:${esc(m.email)}" style="color:#2450f5">${esc(m.email)}</a>&gt;`)}
${row("About", esc(about))}
${addons.length ? row("Add-ons", esc(addons.join(", "))) : ""}
${m.ref ? row("Referred by", `${esc(m.ref)} <span style="color:#66666e">(${REFERRAL.percent}% off for them, $${REFERRAL.reward} for the referrer once paid)</span>`) : ""}
${est ? row("Estimate", esc(est + (m.ref ? `, after ${REFERRAL.percent}% referral` : ""))) : ""}
${row("Received", esc(bcTime(now)))}
</table>
<div style="white-space:pre-wrap;padding:16px;background:#f3f3f4;border-radius:10px;font-size:15px">${esc(m.message)}</div>
<p style="margin:20px 0 0"><a href="mailto:${esc(m.email)}?subject=${encodeURIComponent("Re: your message on ryanyarali.com")}" style="display:inline-block;padding:11px 22px;background:#2450f5;color:#ffffff;border-radius:999px;text-decoration:none;font-weight:600">Reply to ${esc(firstName(m.name))}</a></p>`);
  const text = [
    `${m.name} <${m.email}>`,
    `About: ${about}`,
    ...(addons.length ? [`Add-ons: ${addons.join(", ")}`] : []),
    ...(m.ref ? [`Referred by: ${m.ref}`] : []),
    ...(est ? [`Estimate: ${est}${m.ref ? `, after ${REFERRAL.percent}% referral` : ""}`] : []),
    `Received: ${bcTime(now)}`,
    "",
    m.message,
  ].join("\n");
  return { subject, html, text };
}

export function senderMail(m) {
  const name = firstName(m.name);
  const about = TOPICS[m.topic].label;
  const addons = list(m.addons);
  const est = estimateText(m.estimate);
  const lines = [`Thanks for reaching out. Your message made it to my inbox, and I'll get back to you within a day from ryan@ryanyarali.com.`];

  if (m.estimate) {
    lines.push(
      `You asked about a <strong>${esc(about.toLowerCase())}</strong>${addons.length ? `, with ${esc(and(m.addons.map((id) => ADDONS[id].say)))}` : ""}. The starting estimate is <strong>${esc(est)}</strong>${m.ref ? `, with your ${REFERRAL.percent}% referral discount already taken off` : ""}. This is a starting estimate, not a quote: after a free 20-minute call I'll send you a fixed quote, which may be higher or lower once I know the details, before any work begins.`,
      `If you'd like to book that call now, reply with two or three times that suit you.`,
    );
  } else if (m.topic === "other") {
    lines.push(`I'll read through what you need and send you a custom quote. It's free, and you're under no obligation.`);
  } else if (m.topic === "hiring") {
    lines.push(
      `Thanks for thinking of me for a role. My projects and résumé are at <a href="https://ryanyarali.com/" style="color:#2450f5">ryanyarali.com</a> if you'd like them while you wait.`,
    );
  }
  lines.push(`If it's urgent, just reply to this email.`);

  const html = frame(`<h1 style="margin:0 0 16px;font-size:24px;line-height:1.2;letter-spacing:-.02em">Got it, ${esc(name)}!</h1>
${lines.map((l) => `<p style="margin:0 0 14px">${l}</p>`).join("\n")}
<p style="margin:22px 0 0">Ryan Yarali<br><span style="color:#66666e;font-size:14px">Full-stack developer &middot; Coquitlam, BC &middot; <a href="https://ryanyarali.com/" style="color:#2450f5">ryanyarali.com</a></span></p>`);
  const text = [
    `Got it, ${name}!`,
    ...lines.map((l) => l.replace(/<[^>]+>/g, "")),
    "Ryan Yarali\nFull-stack developer · Coquitlam, BC · ryanyarali.com",
  ].join("\n\n");
  return { subject: `Thanks, ${name}. I got your message`, html, text };
}

// Sends through Resend. Never throws: returns whether it went.
export async function send(env, mail) {
  if (!env.RESEND_API_KEY) {
    console.log(`[mail] RESEND_API_KEY not set; skipped "${mail.subject}" to ${mail.to}`);
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: env.MAIL_FROM,
        to: [mail.to],
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        ...(mail.replyTo ? { reply_to: mail.replyTo } : {}),
      }),
    });
    if (!res.ok) console.error(`[mail] Resend ${res.status}: ${await res.text()}`);
    return res.ok;
  } catch (e) {
    console.error("[mail] send failed", e);
    return false;
  }
}
