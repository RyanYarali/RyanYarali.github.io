// GET /api/trace: what this one request says about whoever sent it (their
// address and what Cloudflare works out from it: rough place, provider, the
// data centre they came in through). It is read, sent straight back to the
// same visitor and never stored or passed on. assets/js/trace.js shows it to
// them (a joke link for friends, see that file).

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

export function trace(request) {
  if (request.method !== "GET") return new Response(null, { status: 405 });
  return new Response(JSON.stringify(facts(request)), {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  });
}
