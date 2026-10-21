// What the contact form can ask about, and what each thing costs (CAD).
// The same figures are in index.html: the pricing section shows them and the
// form's inputs carry them for the estimate. test/catalog.test.js checks that
// the two agree, so change both together.

export const TOPICS = {
  hiring: { label: "Hiring / co-op" },
  portfolio: { label: "Portfolio site", from: 350 },
  onepage: { label: "One-page site", from: 450 },
  business: { label: "Business website", from: 900 },
  store: { label: "Bookings or store", from: 1500 },
  other: { label: "Custom quote / other" },
};

// "say" is how the thank-you email names it mid-sentence.
export const ADDONS = {
  page: { label: "Extra page", say: "an extra page", price: 90 },
  language: { label: "Second language", say: "a second language", price: 250 },
  copy: { label: "Copywriting", say: "copywriting", price: 150 },
  domain: { label: "Domain and email", say: "domain and email setup", price: 60 },
  linkedin: { label: "LinkedIn refresh", say: "a LinkedIn refresh", price: 80, only: "portfolio" },
  rush: { label: "Rush delivery", say: "rush delivery", percent: 25 },
  care: { label: "Care plan", say: "the care plan", monthly: 29 },
};

// A referred client's discount on their first project, and what the friend
// who sent them gets once it's paid.
export const REFERRAL = { percent: 10, reward: 50 };

export const isPackage = (topic) => TOPICS[topic] && TOPICS[topic].from > 0;

// The starting total and the monthly part for a package and its add-ons,
// less the referral discount when someone sent them.
export function estimate(topic, addons, referred = false) {
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
  const off = referred ? 1 - REFERRAL.percent / 100 : 1;
  return { total: Math.round(total * (1 + percent / 100) * off), monthly };
}

export const money = (n) => "$" + n.toLocaleString("en-CA");
