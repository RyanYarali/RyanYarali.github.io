// The server side of the joke link for friends (assets/js/trace.js).
//
// GET /api/trace: what this one request says about whoever sent it (their
// address and what Cloudflare works out from it: rough place, provider, the
// data centre they came in through). It is sent straight back to the same
// visitor and not stored.
//
// POST /api/trace/done: the joke ran to its end. Ryan's bot gets one
// message with the friend's name, town, network and phone model (no IP
// address), over a made-up list of what was "taken" (worker/telegram.js).

import { alertTrace } from "./telegram.js";
import { bcDay, isBot, visitorId } from "./visits.js";

export function facts(request) {
  const cf = request.cf || {};
  const text = (v, max = 80) => (typeof v === "string" ? v.slice(0, max) : "");
  const num = (v) => (Number.isFinite(Number(v)) && v !== "" && v != null ? Number(v) : null);
  return {
    ip: text(request.headers.get("CF-Connecting-IP"), 45),
    city: text(cf.city),
    region: text(cf.region),
    country: text(cf.country, 2),
    postal: text(cf.postalCode, 12),
    lat: num(cf.latitude),
    lon: num(cf.longitude),
    tz: text(cf.timezone, 40),
    isp: text(cf.asOrganization),
    asn: num(cf.asn),
    colo: text(cf.colo, 4),
    http: text(cf.httpProtocol, 12),
    tls: text(cf.tlsVersion, 12),
  };
}

export async function done(request, env, ctx, url) {
  const none = new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  const origin = request.headers.get("Origin");
  if (request.method !== "POST" || (origin && origin !== url.origin) || isBot(request.headers.get("User-Agent"))) return none;
  let body;
  try {
    body = JSON.parse((await request.text()).slice(0, 2000));
  } catch (e) {
    return none;
  }
  const clean = (v, max) => (typeof v === "string" ? v.replace(/[\u0000-\u001f]+/g, " ").trim().slice(0, max) : "");
  const name = clean(body && body.name, 24);
  if (!name) return none;
  const f = facts(request);
  const day = bcDay(new Date());
  const t = {
    vid: await visitorId(env, request, day),
    day,
    name,
    device: clean(body.device, 60),
    system: clean(body.system, 40),
    mb: body.mb,
    place: [f.city, f.region, f.country].filter(Boolean).join(", "),
    isp: f.isp,
  };
  ctx.waitUntil(alertTrace(env, t).catch((e) => console.error("[telegram] trace", e)));
  return none;
}

export function trace(request) {
  if (request.method !== "GET") return new Response(null, { status: 405 });
  return new Response(JSON.stringify(facts(request)), {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  });
}
