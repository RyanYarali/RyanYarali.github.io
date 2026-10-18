// The prices live in two places: index.html (the pricing section and the
// form's inputs) and worker/catalog.js (the emails). This fails if they drift.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { TOPICS, ADDONS } from "../worker/catalog.js";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
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
