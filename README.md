# GLAMPOS — the sovereign site-automation pack

**▶ Live demo: https://sjgant80-hub.github.io/glampos/**

One mobile hub for a small glamping / stays business. Every booking channel in one
view — with **double-bookings caught before the guest is confirmed** — plus guest
replies drafted from your real facts, a turnover cleaning schedule, a **free Roost
co-op listing**, and an AI-visibility pack. Runs from your phone. Nothing sent
without your say-so.

It's the **generic form** of the proven [Wishwood](https://sjgant80-hub.github.io/wishwood/)
deploy: one editable set of site details (the "kernel"), and the whole hub reads from it.
Fill it for any site.

---

## The one that sells it — the double-booking guard

List on Airbnb *and* Booking.com and you eventually sell the same unit twice: a
furious guest, a refund, a scathing review. GLAMPOS overlays every channel (free, by
iCal) and flags a clash **before you confirm anyone** — naming the unit, both
channels, and the exact overlapping nights. One tap releases the losing channel.

Open the demo: the Lodge is deliberately sold on Airbnb *and* Booking.com for the
12th–13th. The guard is red at the top. Resolve it and watch it go green.

## What's in the hub

| Module | What it does | Time it saves |
|---|---|---|
| **Double-booking guard** | Every channel overlaid; same-unit clashes caught before the guest is confirmed | the disaster |
| **Unified bookings** | Direct · Booking.com · Airbnb · Roost on one view, by free iCal | ~2–3 hrs/wk |
| **Guest replies** | Drafted **from your real facts only** — a fact you didn't give it is flagged, never invented | ~3–5 hrs/wk |
| **Turnover schedule** | Every checkout auto-creates a turnover with the cleaning checklist | the Wishwood keeper pattern |
| **Roost listing** | A free [Roost](https://sjgant80-hub.github.io/roost/) co-op listing, auto-built from the same details | zero re-entry |
| **AI-visibility pack** | Drop-in JSON-LD + robots so assistants cite your site → direct bookings | compounding |
| **Social posts** | Drafted from what's *actually* free — never advertise a booked weekend | ~2 hrs/wk |

## Roost — the free, zero-fee channel

[Roost](https://sjgant80-hub.github.io/roost/) is the cooperative, host-owned
alternative to Airbnb: **zero booking fees, ever, in any direction**, a flat £20/mo
co-op membership, and it sends guests **direct to your booking page** — no commission,
no data harvested (~£136 more per £1,000 vs Airbnb). You list by publishing an open
**stays-protocol/1.0** feed; GLAMPOS generates that feed straight from your site
details, so there's nothing extra to fill in.

## Sovereign · hybrid · grounded · honest

- **Sovereign** — runs on your own accounts and your phone; no GLAMPOS server, no data broker.
- **Hybrid** — it drafts, you approve. Nothing is sent without your tap (only truly safe facts flag as auto-safe).
- **Grounded** — replies come only from your details. Missing a fact, it says "let me confirm" — it never invents an answer to a guest.
- **Honest** — real empty states, and iCal has a few-minutes lag (enough to catch clashes before you confirm, not instant — we say so).

## Proof-of-play

The live logic **is** the gated logic. `node test.mjs` → **26/26 CLEAN**, zero tokens:
the guard catches cross-channel clashes (incl. Roost-driven bookings) and ignores
back-to-back stays and cancellations; replies are grounded not invented; the GEO pack
is valid JSON-LD from the kernel; the turnover schedule falls out of the bookings; the
Roost listing is a real stays-protocol feed from the one kernel; determinism + fuzz.

```bash
node test.mjs
```

## Run it locally

```bash
node scripts/serve.mjs   # http://localhost:8250
```

## Files

- `glampos.mjs` — the pure kernel (guard, iCal, grounded replies, GEO pack, turnover, Roost feed). Generators injected; deterministic; gated.
- `test.mjs` — proof-of-play (26/26).
- `index.html` — the mobile-first showcase hub; imports the kernel (`?v=1`).
- `sw.js` · `manifest.webmanifest` — offline PWA.

---

*Part of the estate. Sister to [Wishwood Engine](https://sjgant80-hub.github.io/wishwood/),
[Wishwood Keeper](https://sjgant80-hub.github.io/wishwood-keeper/), and
[Roost](https://sjgant80-hub.github.io/roost/).*
