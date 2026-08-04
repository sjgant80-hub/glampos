// glampos.mjs — GLAMPOS, the sovereign site-automation pack. The generic form of the proven Wishwood deploy: ONE
// mobile-first hub reading ONE-KERNEL (a single source-of-truth of the site's real facts) that unifies a site's
// booking channels, CATCHES DOUBLE-BOOKINGS before the guest is confirmed, drafts guest replies + social posts
// grounded ONLY in the kernel (never an invented fact), keeps a turnover/cleaning schedule, and ships a drop-in
// GEO/AI-visibility pack — plus a free Roost listing generated from the same kernel. Built simplest-first, hybrid
// (human approves), sovereign (owner's own accounts), honest (real empty states, iCal lag noted).
//
// The rule: every module READS the kernel; a fact in two places is a bug. And the double-booking GUARD and every
// channel ship TOGETHER — never add a channel the guard doesn't cover (adding channels is what creates the risk).
// Pure kernel, zero-dep, offline, deterministic.

// ── the channels a site sells through. Roost is the stays-protocol marketplace (co-op, zero fees) — it sends
//    guests DIRECT to the host's booking page, so Roost demand lands as DIRECT bookings the guard already covers. ──
export const CHANNELS = {
  direct: { name: 'Direct', kind: 'own' },
  airbnb: { name: 'Airbnb', kind: 'ota', commission: 0.15 },
  bdc: { name: 'Booking.com', kind: 'ota', commission: 0.15 },
  roost: { name: 'Roost', kind: 'commons' },   // discovery → direct booking; no checkout on Roost
};
// the REAL Roost facts (github.com/sjgant80-hub/roost — not invented): a cooperative, host-owned marketplace on the
// open stays-protocol. Wishwood is host #001, the reference implementation. Roost is the sister to Wishwood Engine.
export const ROOST = {
  name: 'Roost', tagline: 'stays as a commons — the Airbnb alternative',
  bookingFees: 0, feesNote: 'Zero booking fees, ever, in any direction.',
  membership: '£20/mo flat, member-owned co-op · 1 host = 1 vote · no per-booking fees',
  howYouList: 'publish a stays-protocol v1 feed from your own domain; roost.land discovers it and sends guests DIRECT to your booking page (no checkout, no commission, no data harvested)',
  vsAirbnb: 'a host keeps ~£136 more per £1,000 booked vs Airbnb (Roost £0 fees; you pay only the ~£14 Stripe fee)',
  apply: 'https://sjgant80-hub.github.io/roost/host.html', protocol: 'https://sjgant80-hub.github.io/roost/protocol.html',
};

// a fresh GENERIC kernel — every field is per-site fillable. This is the spine; every module reads it.
export function sampleKernel() {
  return {
    site: { id: 'yoursite', name: 'Your Glampsite', tagline: 'off-grid stays in the woods', location: 'Somewhere, UK', lat: 51.3, lng: 1.1, domain: 'https://yoursite.example', phone: '', email: 'hello@yoursite.example', checkIn: '3pm', checkOut: '10am', wifi: false, dogs: false, parking: 'free on-site', directions: 'follow the lane past the church; gate code sent the morning of arrival', included: 'wood-burner, fire pit, bedding, welcome basket' },
    units: [{ id: 'lodge', name: 'The Lodge', sleeps: 4, priceFrom: 110 }, { id: 'yurt', name: 'The Yurt', sleeps: 6, priceFrom: 135 }],
    amenities: ['wood-burner', 'fire-pit', 'eco-shower', 'off-grid', 'parking'],
    cancellation: 'free up to 14 days before arrival',
    faqs: [{ q: 'Are dogs allowed?', a: '' }, { q: 'Where do I park?', a: '' }, { q: 'What time is check-in?', a: '' }],
    channels: ['direct', 'airbnb', 'bdc', 'roost'],
  };
}
const kunit = (k, id) => (k.units || []).find(u => u.id === id) || null;

// ══ §3 · THE DOUBLE-BOOKING GUARD — the money feature. Same unit, overlapping dates, any two channels = a CLASH. ══
const overlaps = (a, b) => a.unit === b.unit && a.status !== 'cancelled' && b.status !== 'cancelled' && a.from < b.to && b.from < a.to;
export function clashes(bookings) {
  const out = [];
  for (let i = 0; i < bookings.length; i++) for (let j = i + 1; j < bookings.length; j++) if (overlaps(bookings[i], bookings[j])) out.push({ unit: bookings[i].unit, a: bookings[i], b: bookings[j], from: max(bookings[i].from, bookings[j].from), to: min(bookings[i].to, bookings[j].to) });
  return out;
}
const max = (a, b) => a > b ? a : b, min = (a, b) => a < b ? a : b;
// a unit is free over [from,to) iff no confirmed booking overlaps — used to keep every channel's availability honest.
export function isFree(bookings, unit, from, to) { return !bookings.some(b => overlaps({ unit, from, to, status: 'confirmed' }, b)); }
// availability sync-BACK: when a booking lands (e.g. a Direct/Roost one), the block to PUSH OUT to the other
// channels so they can't re-sell it — closes the clash loop at the source (§7).
export function syncBackBlock(booking) { return icsEvent({ uid: 'block-' + booking.id, from: booking.from, to: booking.to, summary: `BLOCKED · ${booking.unit} · ${booking.channel}` }); }

// ── iCal (the free, no-API way to unify Airbnb/BDC/Direct). Parse a feed → bookings; export bookings → a feed. ──
export function parseIcs(text, channel = 'ical', unit = '') {
  const out = []; const blocks = String(text).split(/BEGIN:VEVENT/).slice(1);
  for (const b of blocks) {
    const ds = (b.match(/DTSTART[^:]*:([0-9T]+)/) || [])[1], de = (b.match(/DTEND[^:]*:([0-9T]+)/) || [])[1];
    const sum = ((b.match(/SUMMARY:([^\r\n]+)/) || [])[1] || '').trim(), uid = ((b.match(/UID:([^\r\n]+)/) || [])[1] || '').trim();
    if (!ds || !de) continue;
    out.push({ id: uid || (channel + '-' + out.length), unit: unit || guessUnit(sum), channel, from: iso(ds), to: iso(de), guest: /reserved|not available|blocked/i.test(sum) ? '' : sum, status: 'confirmed' });
  }
  return out;
}
const iso = d => `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
const guessUnit = s => (s.match(/[a-z0-9-]+/i) || [''])[0].toLowerCase();
export function toIcs(bookings, calName = 'GLAMPOS') {
  const ev = bookings.filter(b => b.status !== 'cancelled').map(b => icsEvent({ uid: b.id, from: b.from, to: b.to, summary: `${b.unit} · ${b.guest || b.channel}` })).join('\r\n');
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//GLAMPOS//EN', `X-WR-CALNAME:${calName}`, ev, 'END:VCALENDAR'].join('\r\n');
}
function icsEvent({ uid, from, to, summary }) { const d = s => s.replace(/-/g, ''); return ['BEGIN:VEVENT', `UID:${uid}`, `DTSTART;VALUE=DATE:${d(from)}`, `DTEND;VALUE=DATE:${d(to)}`, `SUMMARY:${summary}`, 'END:VEVENT'].join('\r\n'); }

// ══ §4 · GUEST REPLY DRAFTS — grounded ONLY in the kernel. A fact not in the kernel is NEVER invented. ══
const TOPICS = [
  { key: 'dogs', match: /\bdog|pet\b/i, safe: true, answer: k => k.site.dogs ? 'Yes — dogs are welcome.' : 'Sorry, we\'re not able to take dogs.' },
  { key: 'parking', match: /park/i, safe: true, answer: k => k.site.parking ? `Parking is ${k.site.parking}.` : null },
  { key: 'checkin', match: /check[- ]?in|arrival|arrive/i, safe: true, answer: k => `Check-in is from ${k.site.checkIn}, check-out by ${k.site.checkOut}.` },
  { key: 'wifi', match: /wi[- ]?fi|internet|signal/i, safe: true, answer: k => k.site.wifi ? 'Yes, there\'s wifi.' : 'It\'s off-grid — no wifi (part of the escape!).' },
  { key: 'directions', match: /where|direction|find you|how do (i|we) get|address/i, safe: true, answer: k => k.site.directions || null },
  { key: 'included', match: /includ|come with|provided|bring/i, safe: true, answer: k => k.site.included ? `Included: ${k.site.included}.` : null },
  { key: 'price', match: /price|cost|how much|rate|per night/i, safe: false, answer: k => k.units.length ? 'Our nightly rates: ' + k.units.map(u => `${u.name} from £${u.priceFrom}`).join(', ') + '.' : null },
  { key: 'availability', match: /avail|free|book|dates|weekend|night/i, safe: false, answer: () => null },   // needs the live calendar + a human
];
export function draftReply(kernel, message) {
  const topic = TOPICS.find(t => t.match.test(String(message || '')));
  if (!topic) return { topic: 'other', text: 'Thanks for getting in touch — let me check and come back to you shortly.', grounded: false, autoSafe: false, reason: 'no matching kernel fact — never guess' };
  const a = topic.answer(kernel);
  if (a == null) return { topic: topic.key, text: 'Good question — let me confirm that and come straight back to you.', grounded: false, autoSafe: false, reason: `the kernel has no "${topic.key}" fact yet — flagged, not invented` };
  return { topic: topic.key, text: a, grounded: true, autoSafe: topic.safe, reason: topic.safe ? 'a safe fact from the kernel — can auto-send' : 'kernel-grounded, but wait for your tap (price/availability)' };
}

// ══ §5 · SOCIAL — a post drafted from the kernel + REAL availability (don't advertise a booked weekend). ══
export function draftPost(kernel, bookings, from, to) {
  const free = kernel.units.filter(u => isFree(bookings, u.id, from, to));
  if (!free.length) return null;   // honest: nothing free → no post
  const u = free[0];
  return { text: `${kernel.site.name} — ${u.name} is free ${prettyRange(from, to)}, from £${u.priceFrom}/night. ${cap(kernel.site.tagline)}. Book direct ↗`, unit: u.id, from, to };
}
const prettyRange = (a, b) => `${a.slice(8)}–${b.slice(8)} ${monthName(a)}`;
const monthName = a => ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+a.slice(5, 7) - 1];
const cap = s => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);

// ══ §6 · GEO / AI VISIBILITY — a drop-in pack (JSON-LD + robots) from the kernel, so AI assistants can cite the site. ══
export function geoPack(kernel) {
  const s = kernel.site;
  const lodging = {
    '@context': 'https://schema.org', '@type': 'LodgingBusiness', name: s.name, description: s.tagline,
    address: { '@type': 'PostalAddress', addressLocality: s.location, addressCountry: 'GB' },
    geo: { '@type': 'GeoCoordinates', latitude: s.lat, longitude: s.lng },
    telephone: s.phone || undefined, email: s.email || undefined, url: s.domain,
    priceRange: '£' + Math.min(...kernel.units.map(u => u.priceFrom)) + '–£' + Math.max(...kernel.units.map(u => u.priceFrom)),
    petsAllowed: !!s.dogs, checkinTime: s.checkIn, checkoutTime: s.checkOut,
    amenityFeature: (kernel.amenities || []).map(a => ({ '@type': 'LocationFeatureSpecification', name: a, value: true })),
    numberOfRooms: kernel.units.length,
  };
  const faq = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: (kernel.faqs || []).filter(f => f.a).map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) };
  const robots = ['# GLAMPOS · allow AI assistants to cite this site (drives direct, commission-free bookings)', 'User-agent: GPTBot', 'Allow: /', 'User-agent: PerplexityBot', 'Allow: /', 'User-agent: Google-Extended', 'Allow: /', '', 'User-agent: *', 'Allow: /'].join('\n');
  return { lodging, faq, robots, scriptTags: `<script type="application/ld+json">${JSON.stringify(lodging, null, 2)}</script>\n<script type="application/ld+json">${JSON.stringify(faq, null, 2)}</script>` };
}

// ══ §7 · TURNOVER / CLEANING SCHEDULE — a checkout auto-creates a turnover task (from the Wishwood keeper pattern). ══
export const TURNOVER = ['Strip & remake beds', 'Clean & restock bathroom', 'Sweep & mop', 'Empty bins', 'Restock firewood & welcome basket', 'Wipe surfaces', 'Check for damage / left items', 'Set fire ready for arrival'];
export function turnoverSchedule(bookings) {
  return bookings.filter(b => b.status !== 'cancelled').map(b => ({ id: 'turn-' + b.id, unit: b.unit, due: b.to, from: b.channel, tasks: TURNOVER.slice(), done: false })).sort((a, b) => a.due < b.due ? -1 : 1);
}
// §7 review nudge + welcome — drafted from the kernel, human-approved.
export function reviewNudge(kernel, booking) { return `Hi — hope you loved your stay at ${kernel.site.name}. A quick review helps us hugely and helps other guests find us. Thank you!`; }
export function welcomeMessage(kernel, booking) { return `Welcome! Check-in from ${kernel.site.checkIn} today. ${kernel.site.directions}${kernel.site.wifi ? '' : ' (we\'re off-grid — no wifi).'} Any questions, just reply.`; }

// ══ §10 · ROOST — a free listing, auto-built from the ONE-KERNEL as a stays-protocol v1 feed (the real list-on-Roost
//    mechanism). Zero owner effort; the feed reflects real availability so Roost never sends a guest to a booked unit. ══
export function staysProtocol(kernel) {
  const s = kernel.site;
  return {
    protocol: 'stays-protocol/1.0',
    host: { id: s.id, name: s.name, domain: s.domain, location: s.location, lat: s.lat, lng: s.lng, email: s.email, bio: s.tagline },
    stays: kernel.units.map(u => ({ id: u.id, name: u.name, type: 'glamping', sleeps: u.sleeps, price_from: u.priceFrom, price_currency: 'GBP', amenities: kernel.amenities || [], dogs: !!s.dogs, book_url: `${s.domain}/book#${u.id}`, ical_url: `${s.domain}/ical/${u.id}` })),
  };
}
export const roostChannelHonest = () => ({ ...ROOST, honestWire: 'Roost drives DIRECT bookings (no Roost checkout) → the same double-booking GUARD + sync-back cover them. The listing is generated from the ONE-KERNEL — zero re-entry, and it reflects real availability.' });

// ── stats: hours saved (the pitch math) + the whole hub state read from the kernel + bookings ──
export function hoursSaved() { return { comms: '3–5', calendar: '2–3', social: '2', total: '~7–10/wk', disasters: 'double-bookings prevented', money: 'AI/Roost → direct bookings save 15–18% OTA commission' }; }

export default { CHANNELS, ROOST, sampleKernel, clashes, isFree, syncBackBlock, parseIcs, toIcs, draftReply, draftPost, geoPack, TURNOVER, turnoverSchedule, reviewNudge, welcomeMessage, staysProtocol, roostChannelHonest, hoursSaved };
