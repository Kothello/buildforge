# Job Outreach Playbook — Using BuildForge

BuildForge is a concrete artifact you can point at. The goal of every message below is to get a 20-minute call where you walk through the code.

---

## Target list (start here)

### Tier 1 — Direct fit (3D configurators, CPQ, visual product builders)

| Company            | Why fit                                               | Role to target                  |
| ------------------ | ----------------------------------------------------- | ------------------------------- |
| Threekit           | 3D product configuration platform                     | Forward-Deployed / Product Eng  |
| Shapespark         | Web-based 3D viewer/configurator                      | Full-stack Engineer             |
| 3DCloud (Marxent)  | Furniture/home 3D config for retail                   | Full-stack Engineer             |
| Vectary            | Web 3D design + configurator                          | Frontend Engineer               |
| Roomle             | Furniture configurator SaaS                           | Full-stack Engineer             |
| Spiff              | CPQ (Salesforce-owned, still hiring)                  | Product Engineer                |
| Tacton             | Manufacturing CPQ                                     | Full-stack Engineer             |
| Epicor CPQ         | Industrial CPQ                                        | Full-stack Engineer             |

### Tier 2 — Construction / buildings tech

| Company         | Why fit                                 | Role to target              |
| --------------- | --------------------------------------- | --------------------------- |
| Higharc         | Production homebuilder design platform  | Software Engineer           |
| Plantd          | Prefab housing, digital configurator    | Product Engineer            |
| Juno Residential| Modular / offsite construction          | Full-stack Engineer         |
| BILT            | 3D instructions for assembled products  | Frontend / 3D Engineer      |
| Autodesk Forma  | Early-design software for AEC           | Software Engineer           |
| Procore         | Construction management                 | FDE / Solutions Engineer    |

### Tier 3 — 3D tooling / adjacent

Spline, Rive, Figma Make, Framer, Polycam, Luma AI, World Labs, Hyperhuman, Masterpiece Studio

---

## The outreach formula

Every message follows this skeleton:

1. **Specific** observation about their product (proves you actually looked)
2. **One-sentence** link to what you built (use BuildForge demo URL, not the repo)
3. **Concrete ask** — 20 min, specific time window
4. **Sign-off** that's not desperate

Length target: 4–6 sentences. Anything longer gets skimmed.

---

## Template A — Founders / early-stage (< Series B)

**Subject:** Solo-shipped a configurator like [Product Name]

> Hey [Name],
>
> Saw [Company] lets customers [one specific thing their product does]. I shipped something analogous solo last weekend — a 3D steel building configurator with CRM pipeline and JSONB round-trip: [demo URL]
>
> Camera-aware placement, nested lean-tos, 27/27 red-team tests. Source: github.com/Kothello/buildforge
>
> If you're hiring product engineers or FDEs, I'd love 20 minutes to walk through the architecture. Free Tue/Wed PM next week?
>
> [Your name]

**Channels:** founder's Twitter DM, LinkedIn InMail, or `firstname@company.com`. Try all three if no response in 5 days.

---

## Template B — Eng leaders at Series B–D companies

**Subject:** Full-stack 3D configurator — 20 min?

> Hi [Name],
>
> I've been following [Company's] work on [specific product area]. I recently shipped a 3D building configurator with CRM integration as a portfolio piece and think it demonstrates the kind of end-to-end ownership you value in [their role title] hires.
>
> Live demo: [URL] · Source: github.com/Kothello/buildforge
>
> Open to sharing the architecture decisions in a 20-min call — particularly around the JSONB round-trip and camera-aware placement logic.
>
> Best,
> [Your name]

**Channels:** LinkedIn. Mutual connections help dramatically — check the company page first.

---

## Template C — Cold Loom video (highest response rate)

Record a 2–3 minute Loom walkthrough of BuildForge. Don't read from a script — improvise, show genuine enthusiasm.

**Subject:** 2-min walkthrough of what I built

> Hey [Name],
>
> Rather than write a cover letter, I recorded a quick walkthrough of a 3D configurator + CRM I built that's directly relevant to what [Company] ships:
>
> [Loom URL]
>
> If any of this resonates, happy to jump on a call: [Calendly URL]
>
> Source: github.com/Kothello/buildforge
>
> [Your name]

**Loom script outline:**
- 0:00–0:20 — Who you are (one sentence), what you built (one sentence)
- 0:20–1:00 — Demo the public builder: preset, door, lean-to, color, submit
- 1:00–1:40 — Show the CRM side: login, open lead, Edit Building, Save, reload (same config)
- 1:40–2:30 — One technical decision you're proud of (e.g., "Here's how I avoided re-writing the 3D scene for CRM mode — the same component handles both via a `mode` prop...")

Loom has a free tier. Response rates on Loom cold outreach are 3–8× plain email.

---

## Template D — Twitter DM (short)

> hey [Name], built a 3D building configurator + CRM solo last weekend, thought you might enjoy: [demo URL]
> (source: github.com/Kothello/buildforge)
> hiring product eng or FDE?

---

## Template E — Cribl-style transition story

If you're transitioning from sales/SDR into engineering, own it:

> Hi [Name],
>
> I'm an SDR at Cribl transitioning into product engineering. I built BuildForge — a 3D steel building configurator with CRM — to prove the transition works, not talk about it.
>
> Live: [URL] · Source: github.com/Kothello/buildforge
>
> What I'd bring to [Company]: shipping velocity, sales-side empathy, and the rare ability to articulate what customers actually want because I've spent years on calls with them.
>
> 20 min next week?
>
> [Your name]

This angle converts surprisingly well — "SDR who ships code" is a rare archetype and companies like it.

---

## Where to find people's emails

- **hunter.io** free tier (25 searches/month)
- **Apollo.io** free tier (~50 emails/month)
- **LinkedIn Sales Navigator** — 1-month free trial
- Company-style guessing: `firstname@company.com`, `firstname.lastname@company.com`
- For founders: their public Twitter bio often has `DMs open` or a personal email

## Response follow-up cadence

- Day 0: initial send
- Day 5: soft bump ("floating this back up")
- Day 12: final try with different angle (e.g., share a specific thing you'd improve about their product)
- After day 12: move on

## Volume math

- Cold email response rate (well-targeted): **5–12%**
- Response → call rate: **40–60%**
- Call → offer rate: **5–15%**

→ To land ~1 offer, aim for **50–100 well-targeted sends**.

Spray-and-pray at 500 generic companies will not work. 50 specific companies with personalized first lines will.

## Track everything

Spreadsheet columns: `company | contact | role | sent_at | channel | bumped_at | responded | notes`. Review weekly.

---

## Job boards worth filtering for this skill set

- **WellFound** (formerly AngelList) — filter `threejs`, `react-three-fiber`, `3d`
- **ReadMe Jobs**
- **Vercel Jobs**
- **YC Work at a Startup** — filter `3d`, `configurator`
- **Hacker News "Who's Hiring"** — monthly thread, search for `3d` or `visual`
- **Threejs Discord** — #hiring channel
- **Shapes forum**

## LinkedIn profile moves

1. Pin BuildForge to the **Featured** section with a screenshot
2. Add project entry: title "BuildForge — 3D steel building configurator"
3. Headline: "Full-stack engineer · 3D configurators · Ex-SDR shipping code"
4. Post weekly: progress updates, a Loom walkthrough, a writeup
5. Engage in comments on founders' posts in target companies — that's how warm intros start
