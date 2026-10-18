// What the contact form can ask about, and what each thing costs (CAD).
// The same figures are in index.html: the pricing section shows them and the
// form's inputs carry them for the estimate. test/catalog.test.js checks that
// the two agree, so change both together.

export const TOPICS = {
  hiring: { label: "Hiring / co-op" },
  portfolio: { label: "Portfolio site", from: 600 },
  business: { label: "Business website", from: 1500 },
  custom: { label: "Custom web app", from: 3500 },
  other: { label: "Something else" },
};

// "say" is how the thank-you email names it mid-sentence.
export const ADDONS = {
  page: { label: "Extra page", say: "an extra page", price: 120 },
  language: { label: "Second language", say: "a second language", price: 350 },
  booking: { label: "Booking or order system", say: "a booking or order system", price: 300 },
  copy: { label: "Copywriting", say: "copywriting", price: 200 },
  linkedin: { label: "LinkedIn refresh", say: "a LinkedIn refresh", price: 100, only: "portfolio" },
  domain: { label: "Domain and email", say: "domain and email setup", price: 90 },
  rush: { label: "Rush delivery", say: "rush delivery", percent: 25 },
  care: { label: "Care plan", say: "the care plan", monthly: 49 },
};

export const isPackage = (topic) => TOPICS[topic] && TOPICS[topic].from > 0;

// The starting total and the monthly part for a package and its add-ons.
export function estimate(topic, addons) {
  if (!isPackage(topic)) return null;
  let total = TOPICS[topic].from;
  let percent = 0;
  let monthly = 0;
  for (const id of addons) {
    const a = ADDONS[id];
    total += a.price || 0;
    percent += a.percent || 0;
    monthly += a.monthly || 0;
  }
  return { total: Math.round(total * (1 + percent / 100)), monthly };
}

export const money = (n) => "$" + n.toLocaleString("en-CA");
