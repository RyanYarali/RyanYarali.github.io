import { test } from "node:test";
import assert from "node:assert/strict";
import { check } from "../worker/index.js";
import { estimate } from "../worker/catalog.js";
import { esc, firstName, ownerMail, senderMail, bcTime } from "../worker/mail.js";

const good = { topic: "business", name: "Jane Doe", email: "Jane@Example.com", message: "I need a site for my bakery.", addons: ["copy", "care"] };

test("check accepts a good message and works out the estimate", () => {
  const m = check(good);
  assert.equal(m.error, undefined);
  assert.equal(m.email, "jane@example.com");
  assert.deepEqual(m.estimate, { total: 1050, monthly: 29 });
});

test("check names the first bad field", () => {
  assert.equal(check({ ...good, topic: "free-stuff" }).field, "topic");
  assert.equal(check({ ...good, name: "J" }).field, "name");
  assert.equal(check({ ...good, email: "nope" }).field, "email");
  assert.equal(check({ ...good, message: "hi" }).field, "message");
  assert.equal(check({ ...good, message: "x".repeat(5001) }).field, "message");
  assert.equal(check({ ...good, name: 42 }).field, "name");
});

test("a name can't carry line breaks into the subject", () => {
  assert.equal(check({ ...good, name: "Jane\r\nBcc: x@evil.example" }).name, "Jane Bcc: x@evil.example");
});

test("add-ons: unknown ones, duplicates and ones for another package are dropped", () => {
  assert.deepEqual(check({ ...good, addons: ["copy", "copy", "hack", "linkedin"] }).addons, ["copy"]);
  assert.deepEqual(check({ ...good, topic: "portfolio", addons: ["linkedin"] }).addons, ["linkedin"]);
  assert.deepEqual(check({ ...good, topic: "hiring" }).addons, []);
  assert.equal(check({ ...good, topic: "hiring" }).estimate, null);
});

test("rush adds a quarter to the whole build", () => {
  assert.deepEqual(estimate("portfolio", ["page", "rush"]), { total: 550, monthly: 0 });
});

test("a referral takes 10% off the build, not the care plan", () => {
  const m = check({ ...good, ref: "Sara Ahmadi" });
  assert.equal(m.ref, "Sara Ahmadi");
  assert.deepEqual(m.estimate, { total: 945, monthly: 29 });
  assert.equal(check({ ...good, ref: "   " }).estimate.total, 1050);
});

test("the thank-you mentions the referral discount but never the name typed", () => {
  const mail = senderMail(check({ ...good, ref: "visit evil.example" }));
  assert.ok(mail.html.includes("10% referral discount"));
  assert.ok(!mail.html.includes("evil.example"));
  const owner = ownerMail(check({ ...good, ref: "<b>Sara</b>" }), new Date());
  assert.ok(owner.html.includes("&lt;b&gt;Sara"));
  assert.ok(owner.text.includes("Estimate: from $945 + $29/mo, after 10% referral"));
});

test("names are greeted by their first word, letters only", () => {
  assert.equal(firstName("Jane Doe"), "Jane");
  assert.equal(firstName("Visit evil.example"), "Visit");
  assert.equal(firstName("http://evil.example"), "httpevilexample");
  assert.equal(firstName("<script>"), "script");
  assert.equal(firstName("!!!"), "there");
  assert.equal(firstName("رضا یارعلی"), "رضا");
});

test("the notice to Ryan escapes everything the sender typed", () => {
  const m = check({ ...good, name: "<b>Jane</b>", message: "<img src=x onerror=alert(1)> hello there" });
  const mail = ownerMail(m, new Date("2026-12-01T20:00:00Z"));
  assert.ok(!mail.html.includes("<img src=x"));
  assert.ok(mail.html.includes("&lt;img src=x"));
  assert.ok(mail.text.includes("Estimate: from $1,050 + $29/mo"));
});

test("the thank-you never repeats the sender's message", () => {
  const m = check({ ...good, message: "Buy cheap pills at evil.example now!!" });
  const mail = senderMail(m);
  assert.ok(!mail.html.includes("evil.example"));
  assert.ok(!mail.text.includes("evil.example"));
  assert.ok(mail.text.includes("from $1,050 + $29/mo"));
  assert.equal(mail.subject, "Thanks, Jane. I got your message");
});

test("esc covers the HTML specials", () => {
  assert.equal(esc(`<a href="x">'&'</a>`), "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
});

test("times are B.C. time", () => {
  assert.match(bcTime(new Date("2026-07-01T19:00:00Z")), /12:00/);
});

// ==================== Routing ====================
import worker from "../worker/index.js";

function fakeEnv(files) {
  return {
    ASSETS: {
      fetch: async (input) => {
        const path = new URL(input instanceof Request ? input.url : input).pathname;
        return files[path] ? new Response(files[path]) : new Response("not found", { status: 404 });
      },
    },
  };
}

async function withGitHub(pages, fn) {
  const real = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const path = new URL(url).pathname;
    if (path === "/taha-portfolio") return new Response(null, { status: 301, headers: { Location: "https://ryanyarali.github.io/taha-portfolio/" } });
    return pages[path] ? new Response(pages[path]) : new Response("gh 404", { status: 404 });
  };
  try {
    await fn();
  } finally {
    globalThis.fetch = real;
  }
}

test("folders get their index.html; previews come from GitHub; the rest is the 404 page", async () => {
  const env = fakeEnv({ "/index.html": "home", "/404.html": "lost" });
  await withGitHub({ "/taha-portfolio/": "taha" }, async () => {
    const get = (p) => worker.fetch(new Request("https://ryanyarali.com" + p), env, {});
    let r = await get("/");
    assert.equal(await r.text(), "home");
    r = await get("/taha-portfolio/");
    assert.equal(await r.text(), "taha");
    r = await get("/taha-portfolio");
    assert.equal(r.status, 301);
    assert.equal(r.headers.get("Location"), "https://ryanyarali.com/taha-portfolio/");
    r = await get("/nothing-here");
    assert.equal(r.status, 404);
    assert.equal(await r.text(), "lost");
  });
});
