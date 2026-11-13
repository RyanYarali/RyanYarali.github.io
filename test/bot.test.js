// The bot and the visit counter, run against their real SQL in an in-memory
// SQLite database shaped like D1, with Telegram and Resend replaced by fakes.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import worker, { check } from "../worker/index.js";
import { sourceOf, sourceLabel, bcDay } from "../worker/visits.js";

function d1() {
  const db = new DatabaseSync(":memory:");
  const dir = new URL("../worker/migrations/", import.meta.url);
  for (const f of readdirSync(dir).sort()) db.exec(readFileSync(new URL(f, dir), "utf8"));
  const wrap = (sql, args = []) => ({
    bind: (...a) => wrap(sql, a),
    first: async () => db.prepare(sql).get(...args) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...args) }),
    run: async () => db.prepare(sql).run(...args),
  });
  return { prepare: (sql) => wrap(sql), raw: db };
}

let env, sent, mails;
beforeEach(() => {
  sent = [];
  mails = [];
  env = {
    DB: d1(),
    TELEGRAM_BOT_TOKEN: "t",
    TELEGRAM_CHAT_ID: "42",
    TELEGRAM_WEBHOOK_SECRET: "s3cret",
    RESEND_API_KEY: "k",
    MAIL_FROM: "Ryan <ryan@ryanyarali.com>",
    MAIL_TO: "ryan@ryanyarali.com",
    ASSETS: { fetch: async () => new Response("x") },
  };
  let next = 100;
  globalThis.fetch = async (url, init) => {
    const body = JSON.parse(init.body);
    if (String(url).includes("api.telegram.org")) {
      sent.push({ method: String(url).split("/").pop(), ...body });
      return Response.json({ ok: true, result: { message_id: next++ } });
    }
    if (String(url).includes("api.resend.com")) {
      mails.push(body);
      return Response.json({ id: "m1" });
    }
    throw new Error("unexpected fetch " + url);
  };
});

const ctx = () => {
  const jobs = [];
  return { waitUntil: (p) => jobs.push(p), done: () => Promise.all(jobs) };
};
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Safari/604.1";
const req = (path, body, headers = {}) =>
  new Request("https://ryanyarali.com" + path, {
    method: "POST",
    headers: { "User-Agent": UA, "CF-Connecting-IP": "1.2.3.4", "Content-Type": "application/json", Origin: "https://ryanyarali.com", ...headers },
    body: JSON.stringify(body),
  });
async function call(path, body, headers) {
  const c = ctx();
  const res = await worker.fetch(req(path, body, headers), env, c);
  await c.done();
  return res;
}
const tgUpdate = (update) => call("/api/telegram", update, { "X-Telegram-Bot-Api-Secret-Token": "s3cret" });

test("sources: credit tags, friend links, AI, search, social, direct", () => {
  const s = (query, referrer) => sourceOf({ query, referrer }, "ryanyarali.com");
  assert.equal(s("ref=nooklook", ""), "credit:nooklook");
  assert.equal(s("", "https://www.vancobab.ca/menu"), "credit:vancobab");
  assert.equal(s("friend=Jane-Doe", ""), "friend:Jane Doe");
  assert.equal(s("", "https://chatgpt.com/"), "ai:ChatGPT");
  assert.equal(s("", "https://www.google.ca/"), "search:Google");
  assert.equal(s("", "https://www.linkedin.com/in/x"), "social:LinkedIn");
  assert.equal(s("", "https://ryanyarali.com/projects.html"), "internal");
  assert.equal(s("", ""), "direct");
  assert.equal(sourceLabel("credit:nooklook"), "credit tag on Nooklook");
});

test("a visit from a credit tag is counted and pings Ryan once a day", async () => {
  await call("/api/hit", { id: "visit-0001", path: "/", r: "https://nooklook.ca/", q: "ref=nooklook" });
  await call("/api/hit", { id: "visit-0002", path: "/projects/nooklook.html", r: "https://ryanyarali.com/" });
  await call("/api/hit", { id: "visit-0001", s: 75 });
  const rows = env.DB.raw.prepare("SELECT path, source, seconds, device FROM visits ORDER BY created_at").all();
  assert.equal(rows.length, 2);
  assert.equal(rows[1].source, "credit:nooklook"); // keeps the source it arrived with
  assert.equal(rows[0].seconds, 75);
  assert.equal(rows[0].device, "phone");
  const pings = sent.filter((m) => m.method === "sendMessage");
  assert.equal(pings.length, 1);
  assert.match(pings[0].text, /credit tag on Nooklook/);
});

test("bots and other sites' pages aren't counted", async () => {
  await call("/api/hit", { id: "visit-0003", path: "/" }, { "User-Agent": "Googlebot/2.1" });
  await call("/api/hit", { id: "visit-0004", path: "/" }, { Origin: "https://evil.example" });
  assert.equal(env.DB.raw.prepare("SELECT COUNT(*) AS n FROM visits").get().n, 0);
});

test("a lead arrives in Telegram with where they came from and what they viewed", async () => {
  await call("/api/hit", { id: "visit-0010", path: "/", q: "friend=Jane-Doe" });
  await call("/api/hit", { id: "visit-0011", path: "/projects/nooklook.html", r: "https://ryanyarali.com/" });
  const res = await call("/api/contact", {
    topic: "business", addons: ["care"], name: "Mina Rahimi", email: "mina@example.com",
    message: "I need a website for my salon in Burnaby.", ref: "Jane Doe",
  });
  assert.equal(res.status, 200);
  const alert = sent.find((m) => m.method === "sendMessage" && m.text.includes("New lead"));
  assert.ok(alert, "lead alert sent");
  assert.match(alert.text, /from \$810 \+ \$39\/mo \(after 10% referral\)/);
  assert.match(alert.text, /Referred by <b>Jane Doe<\/b>/);
  assert.match(alert.text, /friend link from Jane Doe/);
  assert.match(alert.text, /Home → Nooklook/);
  assert.equal(alert.reply_markup.inline_keyboard.length, 2);
  // Telegram worked, so Ryan gets no email; the sender gets their thank-you.
  assert.deepEqual(mails.map((m) => m.to[0]), ["mina@example.com"]);
});

test("Ryan replies from Telegram: preview first, then the email goes out", async () => {
  await call("/api/contact", { topic: "hiring", name: "Alex Chen", email: "alex@corp.example", message: "Co-op opening this winter." });
  const alert = sent.find((m) => m.text && m.text.includes("New lead"));
  const alertId = 100 + sent.indexOf(alert);
  await tgUpdate({ message: { chat: { id: 42 }, text: "Hi Alex, I'd love to.\n\nThanks!", reply_to_message: { message_id: alertId } } });
  const preview = sent[sent.length - 1];
  assert.match(preview.text, /To Alex Chen/);
  assert.equal(mails.length, 1); // only the thank-you so far
  const data = preview.reply_markup.inline_keyboard[0][0].callback_data;
  await tgUpdate({ callback_query: { id: "cq1", data, message: { chat: { id: 42 }, message_id: 999 } } });
  const reply = mails[mails.length - 1];
  assert.equal(reply.to[0], "alex@corp.example");
  assert.match(reply.html, /Hi Alex, I&#39;d love to\./);
  assert.equal(env.DB.raw.prepare("SELECT status FROM messages").get().status, "replied");
});

test("status buttons update the lead; Won with a referral reminds Ryan who he owes", async () => {
  await call("/api/contact", { topic: "onepage", name: "Reza K", email: "reza@example.com", message: "One-page site for my plumbing business.", ref: "Jane Doe" });
  await tgUpdate({ callback_query: { id: "cq2", data: "st:1:won", message: { chat: { id: 42 }, message_id: 100 } } });
  assert.equal(env.DB.raw.prepare("SELECT status FROM messages").get().status, "won");
  assert.ok(sent.some((m) => m.method === "editMessageText" && m.text.includes("✅ Won")));
  assert.ok(sent.some((m) => m.text && m.text.includes("You owe them $50")));
});

test("commands: /stats, /now, /refs, /alerts; strangers and bad secrets are ignored", async () => {
  await call("/api/hit", { id: "visit-0020", path: "/", r: "https://www.google.com/" });
  await tgUpdate({ message: { chat: { id: 42 }, text: "/stats" } });
  assert.match(sent.at(-1).text, /1 visitors · 1 page views · 0 leads[\s\S]*Google/);
  await tgUpdate({ message: { chat: { id: 42 }, text: "/now" } });
  assert.match(sent.at(-1).text, /1 on the site now/);
  await tgUpdate({ message: { chat: { id: 42 }, text: "/refs" } });
  assert.match(sent.at(-1).text, /Referrals/);
  await tgUpdate({ message: { chat: { id: 42 }, text: "/alerts off" } });
  assert.match(sent.at(-1).text, /off/);
  const before = sent.length;
  await tgUpdate({ message: { chat: { id: 7 }, text: "/stats" } });
  assert.equal(sent.length, before);
  const res = await call("/api/telegram", { message: { chat: { id: 42 }, text: "/stats" } }, { "X-Telegram-Bot-Api-Secret-Token": "wrong" });
  assert.equal(res.status, 403);
});

test("without a working bot, Ryan still gets the lead by email", async () => {
  delete env.TELEGRAM_BOT_TOKEN;
  await call("/api/contact", { topic: "other", name: "Lee", email: "lee@example.com", message: "Can you fix my Shopify store?" });
  assert.deepEqual(mails.map((m) => m.to[0]).sort(), ["lee@example.com", "ryan@ryanyarali.com"]);
});

test("the morning summary", async () => {
  await worker.scheduled({}, env, { waitUntil: async (p) => p });
  await new Promise((r) => setTimeout(r, 20));
  assert.match(sent.at(-1).text, /Good morning[\s\S]*Yesterday/);
});

test("B.C. days", () => {
  assert.equal(bcDay(new Date("2026-12-01T06:30:00Z")), "2026-11-30");
});

test("/forget deletes a sender's messages; the morning tidy drops old data", async () => {
  await call("/api/contact", { topic: "other", name: "Del Me", email: "del@example.com", message: "Please forget me later." });
  await tgUpdate({ message: { chat: { id: 42 }, text: "/forget del@example.com" } });
  assert.match(sent.at(-1).text, /Deleted 1 message/);
  assert.equal(env.DB.raw.prepare("SELECT COUNT(*) AS n FROM messages").get().n, 0);
  env.DB.raw.exec("INSERT INTO visits (id, created_at, day, vid, path, source) VALUES ('old-visit-1', '2024-01-01T00:00:00.000Z', '2024-01-01', 'v', '/', 'direct')");
  env.DB.raw.exec("INSERT INTO messages (created_at, topic, name, email, message, ip_hash, status) VALUES ('2023-01-01T00:00:00.000Z', 'other', 'Old', 'old@example.com', 'old message here', 'h', 'new'), ('2023-01-01T00:00:00.000Z', 'store', 'Client', 'c@example.com', 'paid project here', 'h', 'won')");
  const { tidy } = await import("../worker/telegram.js");
  await tidy(env);
  assert.equal(env.DB.raw.prepare("SELECT COUNT(*) AS n FROM visits WHERE id = 'old-visit-1'").get().n, 0);
  assert.deepEqual(env.DB.raw.prepare("SELECT name FROM messages").all().map((r) => r.name), ["Client"]);
});

// ==================== Signals (migration 0004) ====================

const DESKTOP = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130 Safari/537.36";

test("a résumé download pings Ryan once, with what the visitor read first", async () => {
  await call("/api/hit", { id: "visit-0100", path: "/", r: "https://www.linkedin.com/feed/" });
  await call("/api/hit", { id: "visit-0101", path: "/about.html", r: "https://ryanyarali.com/" });
  await call("/api/hit", { id: "visit-0101", e: "resume" });
  await call("/api/hit", { id: "visit-0101", e: "resume" });
  const pings = sent.filter((m) => /Résumé downloaded/.test(m.text || ""));
  assert.equal(pings.length, 1);
  assert.match(pings[0].text, /Home → About[\s\S]*LinkedIn/);
  assert.equal(env.DB.raw.prepare("SELECT COUNT(*) AS n FROM events WHERE kind = 'resume'").get().n, 1);
});

test("events need a real page view, a known kind, and are clipped", async () => {
  await call("/api/hit", { id: "visit-0110", e: "resume" }); // no such page view
  await call("/api/hit", { id: "visit-0111", path: "/" });
  await call("/api/hit", { id: "visit-0111", e: "hack" });
  await call("/api/hit", { id: "visit-0111", e: "out", d: "GitHub.com" + "x".repeat(300) });
  await call("/api/hit", { id: "visit-0111", e: "out", d: "github.com" }, { "CF-Connecting-IP": "9.9.9.9" }); // someone else's page view
  const rows = env.DB.raw.prepare("SELECT kind, detail FROM events").all();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].kind, "out");
  assert.equal(rows[0].detail.length, 80);
  assert.ok(rows[0].detail.startsWith("github.com"));
});

test("a third page makes a visitor hot, once; time and depth are kept", async () => {
  await call("/api/hit", { id: "visit-0120", path: "/" });
  await call("/api/hit", { id: "visit-0121", path: "/projects.html", r: "https://ryanyarali.com/" });
  assert.equal(sent.filter((m) => /good look/.test(m.text || "")).length, 0);
  await call("/api/hit", { id: "visit-0122", path: "/projects/termeh.html", r: "https://ryanyarali.com/projects.html" });
  await call("/api/hit", { id: "visit-0123", path: "/about.html", r: "https://ryanyarali.com/" });
  await call("/api/hit", { id: "visit-0123", s: 40, d: 82 });
  await call("/api/hit", { id: "visit-0123", s: 55, d: 30 }); // a later beacon never lowers the depth
  const hot = sent.filter((m) => /good look/.test(m.text || ""));
  assert.equal(hot.length, 1);
  assert.match(hot[0].text, /Home → Projects → Termeh/);
  const row = env.DB.raw.prepare("SELECT seconds, depth FROM visits WHERE id = 'visit-0123'").get();
  assert.deepEqual({ ...row }, { seconds: 55, depth: 82 });
});

test("three minutes on one page is hot too; /alerts off silences it", async () => {
  await call("/api/hit", { id: "visit-0130", path: "/services.html" });
  await call("/api/hit", { id: "visit-0130", s: 200, d: 100 });
  assert.equal(sent.filter((m) => /good look/.test(m.text || "")).length, 1);
  await tgUpdate({ message: { chat: { id: 42 }, text: "/alerts off" } });
  await call("/api/hit", { id: "visit-0131", path: "/" }, { "CF-Connecting-IP": "5.5.5.5" });
  await call("/api/hit", { id: "visit-0131", s: 500 }, { "CF-Connecting-IP": "5.5.5.5" });
  await call("/api/hit", { id: "visit-0131", e: "resume" }, { "CF-Connecting-IP": "5.5.5.5" });
  assert.equal(sent.filter((m) => /good look|Résumé downloaded/.test(m.text || "")).length, 1);
});

test("company and school networks are kept; providers and clouds are not", async () => {
  const { company } = await import("../worker/visits.js");
  assert.equal(company("TELUS Communications Inc."), null);
  assert.equal(company("Shaw Communications"), null);
  assert.equal(company("Cloudflare WARP"), null);
  assert.equal(company("iCloud Private Relay"), null);
  assert.equal(company("Amazon.com, Inc."), null);
  assert.equal(company(""), null);
  assert.equal(company("British Columbia Institute of Technology"), "British Columbia Institute of Technology");
  assert.equal(company("Electronic Arts, Inc."), "Electronic Arts, Inc.");
});

test("/top, /find and /stats show the new numbers", async () => {
  await call("/api/hit", { id: "visit-0140", path: "/", r: "https://www.google.com/" }, { "User-Agent": DESKTOP });
  await call("/api/hit", { id: "visit-0140", s: 30, d: 60 }, { "User-Agent": DESKTOP });
  await call("/api/hit", { id: "visit-0140", e: "out", d: "github.com" }, { "User-Agent": DESKTOP });
  await call("/api/hit", { id: "visit-0140", e: "form" }, { "User-Agent": DESKTOP });
  await call("/api/hit", { id: "visit-0140", e: "resume" }, { "User-Agent": DESKTOP });
  await tgUpdate({ message: { chat: { id: 42 }, text: "/top 7" } });
  assert.match(sent.at(-1).text, /Last 7 days[\s\S]*1 résumé download[\s\S]*Home · 30s · 60%[\s\S]*Google[\s\S]*github\.com[\s\S]*1 started the contact form, 0 sent it/);
  await tgUpdate({ message: { chat: { id: 42 }, text: "/stats" } });
  assert.match(sent.at(-1).text, /1 résumé download · ✍️ 1 started the form, 0 sent it/);
  await call("/api/contact", { topic: "hiring", name: "Sam Recruiter", email: "sam@example.com", message: "We have a co-op opening for you." });
  await call("/api/contact", { topic: "other", name: "Pat Owner", email: "pat@example.com", message: "Need a site for my bakery please." }, { "CF-Connecting-IP": "8.8.4.4" });
  await tgUpdate({ message: { chat: { id: 42 }, text: "/find recruiter" } });
  assert.match(sent.at(-1).text, /New lead[\s\S]*Sam Recruiter/);
  assert.ok(sent.at(-1).reply_markup);
  await tgUpdate({ message: { chat: { id: 42 }, text: "/find example.com" } });
  assert.match(sent.at(-1).text, /2 leads for[\s\S]*Pat Owner[\s\S]*Sam Recruiter/);
  await tgUpdate({ message: { chat: { id: 42 }, text: "/find zzzz" } });
  assert.match(sent.at(-1).text, /Nothing found/);
});

test("a client site is reported down after two misses, and back once", async () => {
  const tgFetch = globalThis.fetch;
  let broken = true;
  globalThis.fetch = async (url, init) => {
    if (String(url).includes("api.telegram.org")) return tgFetch(url, init);
    if (String(url).includes("nooklook.ca") && broken) return new Response("oops", { status: 503 });
    return new Response("ok");
  };
  const tick = async () => {
    await worker.scheduled({ cron: "*/5 * * * *" }, env, { waitUntil: (p) => p });
    await new Promise((r) => setTimeout(r, 20));
  };
  await tick();
  assert.equal(sent.length, 0); // one miss is not an outage
  await tick();
  await tick();
  const down = sent.filter((m) => /is down/.test(m.text || ""));
  assert.equal(down.length, 1);
  assert.match(down[0].text, /nooklook\.ca is down[\s\S]*HTTP 503/);
  await tgUpdate({ message: { chat: { id: 42 }, text: "/sites" } });
  assert.match(sent.at(-1).text, /🟢 termehbc\.ca[\s\S]*🔴 nooklook\.ca/);
  broken = false;
  await tick();
  await tick();
  assert.equal(sent.filter((m) => /back up/.test(m.text || "")).length, 1);
});

test("a replied lead that goes quiet gets one nudge; Mondays bring the week", async () => {
  await call("/api/contact", { topic: "other", name: "Quiet Person", email: "quiet@example.com", message: "Can we talk about a website?" });
  env.DB.raw.exec("UPDATE messages SET status = 'replied', status_at = '2020-01-01T00:00:00.000Z'");
  const { morning, weekly } = await import("../worker/telegram.js");
  await morning(env);
  assert.match(sent.filter((m) => /Good morning/.test(m.text || "")).at(-1).text, /Worth a follow-up[\s\S]*Quiet Person/);
  await morning(env);
  assert.doesNotMatch(sent.filter((m) => /Good morning/.test(m.text || "")).at(-1).text, /Worth a follow-up/);
  await weekly(env, bcDay(new Date()));
  assert.match(sent.at(-1).text, /Your week[\s\S]*visitors[\s\S]*lead/);
});
