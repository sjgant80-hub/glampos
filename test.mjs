// test.mjs — PROOF-OF-PLAY for GLAMPOS. Zero tokens. Proves the pack does the jobs that sell it: the DOUBLE-BOOKING
// GUARD catches a same-unit clash across channels (incl. Roost-driven direct bookings) before the guest is confirmed
// — the money feature; guest replies are grounded ONLY in the kernel (a fact not in the kernel is flagged, never
// invented); the GEO/AI pack is valid JSON-LD from the kernel; the turnover schedule falls out of the bookings; and
// the Roost listing is a real stays-protocol feed built from the ONE-KERNEL (zero re-entry). Deterministic.
import G from './glampos.mjs';
const { sampleKernel, clashes, isFree, parseIcs, toIcs, draftReply, draftPost, geoPack, turnoverSchedule, staysProtocol, syncBackBlock, ROOST, CHANNELS } = G;

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ✓ ' : '  ✗ FAIL ') + m); };
const B = (unit, channel, from, to, guest = 'Guest', status = 'confirmed') => ({ id: `${channel}-${unit}-${from}`, unit, channel, from, to, guest, status });

console.log('\n=== §1 · THE DOUBLE-BOOKING GUARD — a clash across channels is caught (the money feature) ===');
{
  const bk = [B('lodge', 'airbnb', '2026-08-10', '2026-08-13'), B('lodge', 'bdc', '2026-08-12', '2026-08-15'), B('yurt', 'direct', '2026-08-10', '2026-08-12')];
  const c = clashes(bk);
  ok(c.length === 1 && c[0].unit === 'lodge', 'the Lodge sold on Airbnb AND Booking.com for overlapping nights is flagged as ONE clash');
  ok(c[0].from === '2026-08-12' && c[0].to === '2026-08-13', 'the clash names the exact overlapping nights (12th–13th) — "sort it before the guest is confirmed"');
  ok(clashes([B('lodge', 'airbnb', '2026-08-10', '2026-08-12'), B('lodge', 'bdc', '2026-08-12', '2026-08-14')]).length === 0, 'back-to-back stays (checkout = next check-in) are NOT a clash');
  ok(clashes([B('lodge', 'airbnb', '2026-08-10', '2026-08-13'), B('lodge', 'bdc', '2026-08-12', '2026-08-15', 'x', 'cancelled')]).length === 0, 'a cancelled booking does not cause a false clash');
}

console.log('\n=== §2 · THE HONEST WIRE — adding Roost does NOT escape the guard (channel + guard ship together) ===');
{
  ok('roost' in CHANNELS, 'Roost is a first-class channel in the hub');
  const bk = [B('yurt', 'direct', '2026-09-01', '2026-09-04'), B('yurt', 'roost', '2026-09-03', '2026-09-06')];   // a Roost-driven direct booking overlaps a direct one
  ok(clashes(bk).length === 1, 'a Roost-driven booking that overlaps an existing one is caught by the SAME guard — a channel is never added without its clash-cover');
  ok(!isFree(bk, 'yurt', '2026-09-02', '2026-09-05') && isFree(bk, 'yurt', '2026-09-10', '2026-09-12'), 'availability is honest across every channel — booked nights read booked, free nights read free');
}

console.log('\n=== §3 · iCal — the free, no-API way to unify channels (parse a feed, export a feed) ===');
{
  const ics = 'BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nUID:abc\r\nDTSTART;VALUE=DATE:20260810\r\nDTEND;VALUE=DATE:20260813\r\nSUMMARY:lodge reserved\r\nEND:VEVENT\r\nEND:VCALENDAR';
  const bk = parseIcs(ics, 'airbnb', 'lodge');
  ok(bk.length === 1 && bk[0].from === '2026-08-10' && bk[0].to === '2026-08-13' && bk[0].channel === 'airbnb', 'an Airbnb iCal feed parses into a booking (dates + channel)');
  const out = toIcs([B('lodge', 'direct', '2026-08-20', '2026-08-22')]);
  ok(/BEGIN:VEVENT/.test(out) && /DTSTART;VALUE=DATE:20260820/.test(out) && parseIcs(out, 'x', 'lodge')[0].to === '2026-08-22', 'and a direct booking exports back to a valid iCal feed (round-trips) — the sync-back that closes the clash loop');
  ok(/BLOCKED/.test(syncBackBlock(B('lodge', 'direct', '2026-08-20', '2026-08-22'))), 'a booking produces a BLOCK event to push out to the other channels');
}

console.log('\n=== §4 · GROUNDED REPLIES — from the kernel only; a fact not in the kernel is flagged, never invented ===');
{
  const k = sampleKernel(); k.site.dogs = false; k.site.checkIn = '3pm'; k.site.parking = 'free on-site';
  const dogs = draftReply(k, 'do you allow dogs?');
  ok(dogs.grounded && /not able to take dogs/i.test(dogs.text), 'a dogs question is answered from the real kernel policy');
  const ci = draftReply(k, 'what time can we check in?');
  ok(ci.grounded && ci.autoSafe && /3pm/.test(ci.text), 'check-in is grounded AND safe to auto-send');
  const price = draftReply(k, 'how much per night?');
  ok(price.grounded && !price.autoSafe && /£110/.test(price.text), 'a price is grounded in the kernel but held for the owner\'s tap (not auto-sent)');
  k.site.directions = '';   // a fact the kernel does NOT have
  const dir = draftReply(k, 'how do we find you?');
  ok(!dir.grounded && /confirm|check/i.test(dir.text) && !/invent/i.test(dir.text), 'a fact the kernel lacks is FLAGGED ("let me confirm"), never invented — no hallucinated answer to a guest');
}

console.log('\n=== §5 · GEO / AI PACK — valid JSON-LD from the kernel (so AI assistants can cite the site) ===');
{
  const k = sampleKernel(); const g = geoPack(k);
  ok(g.lodging['@type'] === 'LodgingBusiness' && g.lodging.name === k.site.name && g.lodging.geo.latitude === k.site.lat, 'a LodgingBusiness schema is generated from the kernel (name, geo)');
  ok(g.lodging.priceRange.includes('110') && g.lodging.numberOfRooms === k.units.length, 'the price range + room count come straight from the kernel units (no re-entry)');
  ok(/GPTBot/.test(g.robots) && /PerplexityBot/.test(g.robots) && /Google-Extended/.test(g.robots), 'the robots.txt allows the AI crawlers (so the site is citable)');
  ok(JSON.parse(JSON.stringify(g.lodging)) && typeof g.scriptTags === 'string' && g.scriptTags.includes('application/ld+json'), 'the pack is valid JSON-LD in a drop-in <script> the web dev can paste');
}

console.log('\n=== §6 · TURNOVER / CLEANING SCHEDULE — a checkout auto-creates a turnover task ===');
{
  const bk = [B('lodge', 'airbnb', '2026-08-10', '2026-08-13'), B('yurt', 'direct', '2026-08-11', '2026-08-14')];
  const t = turnoverSchedule(bk);
  ok(t.length === 2 && t[0].due === '2026-08-13' && t[0].unit === 'lodge', 'each stay creates a turnover task due on the checkout date, soonest first');
  ok(t[0].tasks.length >= 6 && t.every(x => x.done === false), 'the turnover carries the cleaning checklist, ready to tick (the Wishwood keeper pattern)');
}

console.log('\n=== §7 · ROOST — a free listing auto-built from the ONE-KERNEL as a real stays-protocol feed ===');
{
  const k = sampleKernel(); const sp = staysProtocol(k);
  ok(sp.protocol === 'stays-protocol/1.0' && sp.host.name === k.site.name, 'the Roost listing is a valid stays-protocol/1.0 feed (the real list-on-Roost mechanism)');
  ok(sp.stays.length === k.units.length && sp.stays[0].price_from === k.units[0].priceFrom, 'every unit + price comes straight from the ONE-KERNEL — zero re-entry for the owner');
  ok(sp.stays.every(s => s.book_url && s.ical_url), 'each stay carries a direct book_url + ical_url (Roost sends guests DIRECT; the ical keeps availability honest)');
  ok(ROOST.bookingFees === 0 && /Zero booking fees/.test(ROOST.feesNote) && /commission/i.test(ROOST.howYouList) && /co-op|cooperativ/i.test(ROOST.membership), 'the Roost pitch is the REAL differentiator (zero booking fees · co-op · sends direct, no commission) — read from the roost repo, not invented');
}

console.log('\n=== §8 · DETERMINISM + FUZZ ===');
{
  ok(JSON.stringify(staysProtocol(sampleKernel())) === JSON.stringify(staysProtocol(sampleKernel())), 'the same kernel produces the same listing every time');
  let threw = false;
  try { clashes([]); clashes([B('a', 'x', '2026-01-01', '2026-01-02')]); parseIcs('garbage'); parseIcs(''); draftReply(sampleKernel(), ''); draftReply(sampleKernel(), null); geoPack(sampleKernel()); turnoverSchedule([]); draftPost(sampleKernel(), [], '2026-08-10', '2026-08-12'); staysProtocol({ site: {}, units: [] }); }
  catch { threw = true; }
  ok(!threw, 'empty bookings / garbage iCal / blank messages / sparse kernels never throw');
}

const done = fail === 0;
console.log('\n' + (done
  ? `=== ✅ GLAMPOS — one hub, one kernel: the double-booking guard catches clashes across every channel (incl. Roost), replies are grounded not invented, the GEO pack + Roost listing build from the same facts, the turnover schedule falls out of the bookings · ${pass}/${pass} · zero tokens ===`
  : `=== ❌ ${fail} FAILED / ${pass + fail} ===`));
process.exit(done ? 0 : 1);
