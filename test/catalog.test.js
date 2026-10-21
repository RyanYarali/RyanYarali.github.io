// The prices live in services.html (the pricing section and the form's
// inputs), in the form on index.html, and in worker/catalog.js (the emails
// and the bot). This fails if they drift.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { TOPICS, ADDONS, REFERRAL } from "../worker/catalog.js";

const read = (f) => readFileSync(new URL("../" + f, import.meta.url), "utf8");
const html = read("services.html");
const home = read("index.html");
const attrs = (tag) => Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
const inputs = (name) =>
  [...html.matchAll(new RegExp(`<input[^>]*name="${name}"[^>]*>`, "g"))].map((m) => attrs(m[0]));

test("every topic in the form is in the catalog, with the same starting price", () => {
  const topics = inputs("topic");
  assert.deepEqual(topics.map((t) => t.value).sort(), Object.keys(TOPICS).sort());
  for (const t of topics) assert.equal(Number(t["data-from"] || 0), TOPICS[t.value].from || 0, t.value);
});

test("every add-on in the form matches the catalog", () => {
  const addons = inputs("addons");
  assert.deepEqual(addons.map((a) => a.value).sort(), Object.keys(ADDONS).sort());
  for (const a of addons) {
    const c = ADDONS[a.value];
    assert.equal(Number(a["data-price"] || 0), c.price || 0, a.value);
    assert.equal(Number(a["data-percent"] || 0), c.percent || 0, a.value);
    assert.equal(Number(a["data-monthly"] || 0), c.monthly || 0, a.value);
  }
});

test("the pricing section shows the same package prices", () => {
  for (const [id, t] of Object.entries(TOPICS)) {
    if (!t.from) continue;
    const card = html.slice(html.indexOf(`data-pick="${id}"`) - 2500, html.indexOf(`data-pick="${id}"`));
    assert.match(card, new RegExp(`plan-amount">\\$${t.from.toLocaleString("en-CA")}<`), id);
  }
});

test("the referral discount and reward match the page", () => {
  assert.equal(attrs(html.match(/<input[^>]*id="ref"[^>]*>/)[0])["data-discount"], String(REFERRAL.percent));
  assert.match(html, new RegExp(`They save ${REFERRAL.percent}%\\.`));
  assert.match(html, new RegExp(`You get \\$${REFERRAL.reward}\\.`));
});

test("the form on the home page is the same form", () => {
  const form = (h) => h.slice(h.indexOf('<form\n              class="contact-form"'), h.indexOf("</form>", h.indexOf('class="contact-form"')));
  assert.equal(form(home), form(html));
});

test("the home page points to the services page", () => {
  assert.match(home, /href="services\.html"/);
  assert.doesNotMatch(home, /id="pricing"/);
});
