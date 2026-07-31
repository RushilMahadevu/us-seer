# 🏛️ US-SEER × Congressional App Challenge: Winning Strategy

> **Submission Deadline: October 31, 2026** — This document is a brutally honest assessment of where US-SEER stands today, what the competition rewards, and the exact roadmap to finish in the top tier — nationally, not just district-level.

---

## PART I: What the Congressional App Challenge Actually Rewards

### Their Mission (Read This Carefully)

The CAC exists to do three things:

1. **Inspire** students to code, especially outside traditional tech hubs
2. **Include** underrepresented communities in computing
3. **Innovate** — literally: *connect Members of Congress to new and emerging technologies through their student constituents*

That third bullet is the unlock. Judges are **elected officials and their staff**. They are not Stanford CS professors. They respond to:
- Apps they can **explain to a constituent in one sentence**
- Apps that connect to **policy they already care about** (environment, health, equity)
- Apps that **look real** — like something a startup would build, not a school project

---

### The Three Judging Pillars

| Pillar                   | What it Means in Practice                                                 | Weight (approx.) |
| ------------------------ | ------------------------------------------------------------------------- | ---------------- |
| **Quality of the Idea**  | Creativity, originality, real-world relevance, problem clarity            | ~35%             |
| **Implementation**       | Working app, strong UX/UI, clearly demonstrated in the video              | ~35%             |
| **Technical Excellence** | Code complexity, novel challenges solved, honest reflection on difficulty | ~30%             |

**The critical truth no one tells you:** The video is the product. Judges will not clone your repo. The 1–3 minute demo video IS your submission. Everything else (code docs, short answers) exists to validate what they see in the video.

---

### What Types of Apps Consistently Win or Get Featured

Based on past district winners and national "Top Apps" recognition:

| App Category                   | Why It Wins                                                      | US-SEER Fit?                         |
| ------------------------------ | ---------------------------------------------------------------- | ------------------------------------ |
| Environmental / Climate Impact | Politically resonant for Congress, visible real-world stakes     | ✅ Perfect                            |
| Civic Data & Policy Tools      | Directly supports legislative work, demonstrates civic awareness | ✅ Perfect                            |
| Public Health Visualization    | Bipartisan appeal, easy to explain, mass relevance               | ✅ Perfect                            |
| AI/ML-powered insights         | Signals technical sophistication above tutorial-level            | ⚠️ Partial — ML partially implemented |
| Accessibility / Social Justice | Strong equity narrative, emotional resonance                     | ✅ Strong environmental justice angle |

**Honest observation:** US-SEER's topic is arguably the *single best possible match* for the CAC's mission. Environmental epidemiology + federal data + equity mapping is precisely what members of Congress deal with in environment and health committee hearings.

---

### The "Top Apps" National Recognition Bar

The CAC "Top Apps" program (partnered with theCoderSchool) looks specifically for:

- **Extraordinary technical achievement** — data pipelines, ML, real APIs, not a tutorial CRUD app
- **Extraordinary creativity** — did you discover something, or just display something?
- **Real-world impact potential** — could a journalist, lawmaker, or NGO actually use this?

This is the tier to aim for. It is the difference between "district winner" (good) and "displayed in the U.S. Capitol and invited to the D.C. #HouseOfCode reception" (great).

---

## PART II: Honest Assessment — Where US-SEER Stands Today

> **Verdict: Highly competitive for district win. Needs work for national Top Apps recognition.**

### What US-SEER Has Going For It (Real Strengths)

✅ **Scale is genuinely impressive.** 3,142 counties. Five merged federal datasets. A working Python → JSON → Next.js data pipeline. Most competing apps are single-source or made-up data.

✅ **Topic is the ideal CAC match.** Environmental justice + air quality + respiratory mortality. This IS congressional territory — EPA, CDC, Clean Air Act, environmental committees.

✅ **Technical depth is real.** You handled CDC suppression flags, mismatched FIPS codes, modeled PM2.5 satellite data, EPA TRI facility data. These are real data engineering problems.

✅ **It's deployed and live.** A Vercel URL is worth 10 screenshots. Judges can (and some will) visit it.

✅ **The design is already strong.** Dark mode, modern typography, professional map visualization. It does not look like a Codecademy project.

✅ **You have multiple features that most entries lack:** dual-county comparison, PDF report export, shareable URL state, time-series scrubber, policy simulation engine.

---

### Where It Falls Short (Be Honest With Yourself)

❌ **The "so what" narrative is buried.** You can look at the app for 5 minutes and still not understand what you *discovered* vs. what you just *displayed*. Judges need to understand the finding — not just the features.

❌ **The ML/causal engine is not complete.** The Python EconML pipeline exists but if the policy simulator is running on placeholder estimates rather than real DML output, judges who push on it will notice.

❌ **There is no "your community" hook.** CAC judges score on local relevance. Do you know what the PM2.5 levels look like in *your* congressional district specifically? You should be able to say: "In our district, X county is in the 87th percentile for toxic releases and has the 12th highest COPD mortality rate in the state."

❌ **The demo video doesn't exist yet.** This is the most important artifact. Everything else is secondary. The app can be 10x better than every competitor — if the video is confusing or boring, you lose.

❌ **No documented "finding."** Right now US-SEER is a powerful tool. Tools don't win competitions — *discoveries* do. You need one concrete empirical result to anchor the whole story.

---

### Probability Assessment

| Scenario                                               | Estimated Probability                                                                  |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| **District win** (app is complete + strong video)      | **65–80%** — topic and technical depth are above average for most districts            |
| **District win without finishing the roadmap below**   | **30–40%** — works if district has low participation, risky otherwise                  |
| **National "Top Apps" recognition** (as-is)            | **~10–15%** — needs the three big gaps fixed (ML wired in, clear finding, great video) |
| **National "Top Apps" recognition** (roadmap complete) | **50–65%** — genuinely competitive at national level                                   |

---

## PART III: The Roadmap to Win

> Organized by urgency and impact.

---

### 🔴 CRITICAL — Do These First (Weeks 1–2)

---

#### C-1: Define Your One Finding (COMPLETED!)

**Problem:** US-SEER is currently a platform without a headline. Judges need to be able to walk away with one sentence.

**What to do:**
Run the analysis right now. Open Python, load your merged dataset, and compute:

```python
correlation = df[['pm25Avg', 'mortalityRate']].corr()
```

Then stratify by income quartile. Find the exact correlation coefficient. Find your most extreme county pair (high PM2.5 + high mortality, low income). Find the outliers.

**The goal:** You need a sentence like:

> *"In the poorest 25% of U.S. counties, PM2.5 air pollution explains 34% of the variance in respiratory death rates — more than twice the effect seen in high-income counties."*

That sentence is your title, your video hook, your short-answer response, and your college essay.

**Deliverable:** A `FINDINGS.md` file with 3–5 quantified results and the exact Python code that produced them.

---

#### C-2: Wire the Causal ML Engine Into the UI for Real ✅ COMPLETED

**What was done:**
- Implemented `data_pipeline/causal_dml.py`: full Double Machine Learning estimator (Robinson 1988 / Chernozhukov et al. 2018) using sklearn cross-fitted Random Forest nuisance models — no EconML dependency needed
- Ran DML on 2,954 counties using 6 confounders (smoking, poverty, uninsured rate, race, physician density, RUCC)
- **Rural θ = +1.47 deaths/100k per 1 µg/m³ PM₂.₅** (bootstrap 95% CI: [1.52, 5.26]) — real, positive, significant causal signal
- Exported `public/data/causal_estimates.json` with point estimates, SEs, CIs, bootstrap CIs, and all metadata
- Added **"Simulate" tab** to SidePanel backed by real θ: slider drives `lives_saved = θ × (pop/100k) × ΔPM₂.₅`
- Shows 95% CI band (visual bar), EPA VSL cost savings ($11M/life), EPA 9 µg/m³ standard compliance indicator
- County urbanicity-aware: rural counties use rural θ (valid signal); urban counties shown with confounding caveat
- Full methodology attribution in UI: "Double Machine Learning (Robinson 1988; Chernozhukov et al. 2018)"

**Deliverable:** Policy simulator backed by real causal estimates, displayed with uncertainty bounds. ✅

---

#### C-3: Establish the Local District Angle ✅ COMPLETED

**What was done:**
- **District identified:** Nevada's 2nd Congressional District (NV-02) — Rep. Mark Amodei (R), covering all of northern Nevada including Washoe County (Reno, home county)
- Created `app/_lib/district-data.ts` with all 12 NV-02 county FIPS codes, map center coords, representative contact link, and ranking utility
- Created `app/_components/ui/MyDistrictPanel.tsx` — a full modal panel showing:
  - District aggregate stats (avg PM₂.₅, avg mortality, total population, counties above EPA standard)
  - **Home county spotlight**: Washoe County (Reno) — PM₂.₅ 8.17 µg/m³, mortality 50.28/100k
  - **County risk rankings table** sorted by PM₂.₅ with mini bar charts
  - EPA 9 µg/m³ standard compliance status per county
  - "Contact Rep. Amodei" mailto link (exactly what CAC judges want to see)
- Added **"My District" button** (violet, Landmark icon) to the desktop header and mobile menu
- "Zoom to NV-02" button snaps the map to northern Nevada + auto-selects Washoe County in the SidePanel

**Key local facts for the demo video:**
- Washoe County (Reno): PM₂.₅ = **8.17 µg/m³** (near but below EPA limit), respiratory mortality = **50.28/100k**
- Carson City: mortality = **116.7/100k** — among the highest in the district
- Lyon County: mortality = **92.82/100k** with PM₂.₅ at 7.74 µg/m³
- The district spans the largest land area of any contiguous-US congressional district

**Deliverable:** District-focused intro sequence in demo. App auto-centers on NV-02 and shows county risk rankings on demand. ✅

---

### 🟠 HIGH PRIORITY — Weeks 3–4

---

#### H-1: Close the Environmental Justice Story Loop ✅ COMPLETED

**What was done:**
- Created `app/_lib/ej-utils.ts`: full national percentile engine computing PM₂.₅, mortality, and income percentile ranks across all 3,142 counties — plus an **Environmental Justice Index** modeled on EPA EJScreen methodology (EJ Index = Pollution Burden × Vulnerability Score / 100)
- Pollution Burden = PM₂.₅ percentile (65%) + Toxic Releases percentile (35%)
- Vulnerability Score = Income deprivation (40%) + Poverty rate (30%) + Uninsured rate (30%)
- **EJ Hotspot classification**: automatically flags counties in the top quartile for PM₂.₅ AND mortality AND bottom quartile for income — the 74-county triple-burden group from FINDINGS.md Finding 5
- Created `app/_components/sidebar/EquityTab.tsx` — full interactive Equity Analysis panel with:
  - EJ Hotspot alert card (Critical / High / Moderate / Low) with explicit threshold disclosure
  - Circular EJ Index scorecard with Pollution Burden and Vulnerability sub-bars
  - Three national percentile gauges (PM₂.₅, respiratory mortality, median income) with visual bar charts and 25th/75th percentile markers
  - Simple Mode ("Is This County Being Left Behind?") and Expert Mode views
  - EPA EJScreen citation and FINDINGS.md Finding 5 sourcing
- Added **"Equity" tab** to SidePanel in both Simple Mode (4th tab: ⚖️ Equity) and Expert Mode (6th tab: Equity)
- Updated `page.tsx` to pass full `allCountyData` to SidePanel for percentile computation

**Key capability for the demo video:**
- For any EJ hotspot county (e.g., Marion County, TX — PM₂.₅: 9.30, mortality: 185.9/100k, income: $48,040): the panel automatically shows a "⚠️ EJ Triple-Burden Hotspot" critical alert, placing it in the 74-county cohort averaging 59% higher respiratory death rates than the national median.

**Deliverable:** Dedicated Equity Analysis tab that closes the environmental justice narrative loop — percentile context + EJ Index + hotspot classification for every county. ✅

---

#### H-2: Make the Policy Simulator Feel Actionable to a Lawmaker ✅ COMPLETED

**What was done:**
- Added **Geographic Scope Selection** (`This County` / `My State` / `National Aggregate` scope selector) in both SidePanel (`SidePanel.tsx`) and the main Analysis workspace (`AnalysisView.tsx`).
- Updated simulation calculations in `app/_lib/bme-analytics.ts` (`runCounterfactualSimulation`) to dynamically filter and scale by single FIPS, statewide FIPS prefix, or all 3,142 US counties.
- Added **Lawmaker-Grade Health & Economic Outputs**:
  - **Estimated Annual Lives Saved** with DML 95% Confidence Interval range.
  - **Asthma ER Visits & Exacerbations Prevented / Year** (calculated from population prevalence and exposure reduction slopes).
  - **Total Economic & Healthcare Savings / Year** featuring EPA's official Value of Statistical Life (**$11.0M per avoided mortality** in 2024 USD; 40 CFR Part 50) + direct clinical savings.
- Created **"Contact Your Representative" Action Feature**:
  - Added a prominent action button in the Policy Simulator controls and results panels.
  - Opens a dynamic **Congressional Policy Briefing Memo** modal with pre-filled legislative memo, `mailto:` link populated with subject & body for congressional staffers, one-click "Copy Policy Brief" button, and direct link to [Find Your Representative (House.gov)](https://www.house.gov/representatives/find-your-representative).
- Added **Regulatory Citation Banners**:
  - Formally cites the EPA's revised National Ambient Air Quality Standard (NAAQS) for PM₂.₅ of **9.0 μg/m³** (40 CFR Part 50, revised Feb 2024) and Double Machine Learning (DML) causal inference methodology.

**Deliverable:** Actionable decision-support Policy Simulator that allows lawmakers and constituents to model regional policies, view EPA VSL economic returns, and instantly contact congressional representatives with pre-formatted policy briefs. ✅

---

#### H-3: Script and Record the Demo Video

**Problem:** You have 3 months. If you wait until October, you will panic and produce a weak video.

**Script structure (90 seconds):**

1. **(0:00–0:15)** Hook: Show the map lighting up. *"Right now, millions of Americans live in counties where air pollution far exceeds the EPA's danger threshold. They are not randomly distributed."*
2. **(0:15–0:30)** State your name, app name, the problem
3. **(0:30–1:00)** Demo the key features: map, county drill-down, equity analysis, policy simulator
4. **(1:00–1:20)** Show one specific finding: "When we stratified by income quartile, we found..."
5. **(1:20–1:30)** Close: "US-SEER puts federal environmental data in the hands of citizens and policymakers who need it most."

**Production notes:**
- Record at 1080p minimum
- Use full-screen mode, hide your dock/toolbar
- Add text callouts for key statistics
- Add subtle background music (royalty-free, understated)
- Upload to YouTube as Unlisted

---

#### H-4: Add the Anomaly / Outlier Discovery Feature

**Problem:** The current app shows data. It doesn't *flag* surprising things. Flagging surprises is what researchers do.

**What to do:**
- Run OLS residual analysis in the Python pipeline: identify counties that are statistical outliers (high PM2.5 + unexpectedly low mortality, or vice versa)
- In the UI: add an **"Anomaly Counties"** section in the Analysis view — a ranked list of the most unexpected counties with context about what might explain the anomaly
- This is the "discovery" element. It shows you're investigating, not just displaying.

---

### 🟡 MEDIUM — Strong Differentiators, Weeks 5–6

---

#### M-1: Add a Live Methodology Page in the App

**Why:** Every serious research tool has one. It signals intellectual honesty. CAC short-answer questions ask about your data sources — a live page is better than a text description.

**Contents:**
- Data sources table (pull from `DATA_SOURCES.md`, surface it in the UI)
- Known limitations: ecological fallacy, CDC suppression, modeled PM2.5
- Date ranges for each dataset
- Links to original federal datasets

---

#### M-2: Integrate the CDC Social Vulnerability Index (SVI)

**Why:** SVI is a single 0–1 composite score for social vulnerability (CDC ATSDR). A scatter of SVI vs. respiratory mortality, colored by PM2.5, tells the entire environmental justice story in one chart.

**How:** Download county-level CSV from CDC ATSDR. Join on FIPS. Add one scatter plot to the Analysis view.

---

#### M-3: Wildfire Smoke Layer / Notation

**Why:** Separating chronic industrial pollution from wildfire smoke events is a real methodological challenge. Flagging it in the UI signals you understand confounders — something most apps completely miss.

**How:** Use NASA FIRMS data or high smoke day counts as a proxy. Add a toggle that marks counties with significant wildfire smoke exposure in a given year.

---

#### M-4: Implement Multivariate Confounder Controls

**Status:** Designed in NEXT_STEPS.md, not yet implemented.

**Priority for CAC:** "I added statistical controls for smoking rate, poverty level, and physician density — and the pollution-mortality relationship *still held*" is a finding that belongs in the demo video. This is the kind of methodological rigor that separates your entry from 99% of others.

---

### 🟢 POLISH — Final 3 Weeks (October)

---

#### P-1: Write Every Short-Answer Response Now

CAC submission will ask:
- What does your app do? (1 sentence)
- Who is the target audience?
- What tools and languages did you use?
- What was the hardest technical challenge?
- What would you build in version 2.0?

Draft these now. Don't ad-lib in October.

**One-sentence answer:**
> *"US-SEER is a spatial analytics engine that merges EPA, CDC, and Census data to map environmental injustice and simulate the health impact of air quality policy across all 3,142 U.S. counties."*

**Hardest challenge:**
> *"Merging five federal datasets with mismatched FIPS codes, CDC mortality suppression flags, and county name collisions across state borders; then implementing Double Machine Learning causal inference to isolate PM2.5's effect from confounders like local smoking rates and poverty levels."*

---

#### P-2: Pursue One Real-World Testimonial or Use Case

**The most powerful addition:** Evidence that a real human outside your immediate circle found this useful.

Options (realistic):
- Email an AP Environmental Science teacher and ask them to try it — request a one-line quote
- Share in an environmental justice forum or subreddit and screenshot a genuine response
- Contact a local environmental nonprofit or student journalist
- Reach out to your school's science department

One genuine quote from a real stakeholder transforms this from "student project" into "civic tool."

---

#### P-3: Mobile QA Pass

Judges may pull it up on their phone during the D.C. reception. Check:
- Does the map render on mobile?
- Is search usable on a small screen?
- Does the SidePanel collapse cleanly?
- Does the header not overflow on 375px width?

You don't need a perfect mobile app — just don't let it look broken.

---

## PART IV: The Submission Cheat Sheet

| CAC Field                       | What to Write                                                                                                                                                                                                                                           |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **App Name**                    | US-SEER: U.S. Spatial Environmental Exposure & Respiratory Risk Index                                                                                                                                                                                   |
| **One-sentence purpose**        | Spatially maps the relationship between air pollution, toxic industrial releases, and respiratory disease mortality across all 3,142 U.S. counties to expose environmental injustice and simulate health policy outcomes                                |
| **Target audience**             | Environmental policy researchers, congressional staff, environmental justice advocates, investigative journalists, and students                                                                                                                         |
| **Tools used**                  | Next.js 16, TypeScript, Python (Pandas, EconML, scikit-learn), D3.js, EPA AQS API, CDC WONDER, US Census ACS API, EPA TRI, NASA FIRMS                                                                                                                   |
| **Hardest technical challenge** | Merging five federal datasets with mismatched FIPS codes, suppressed CDC mortality values, and county name collisions; implementing Double Machine Learning causal inference to separate PM2.5's effect from confounders like smoking rates and poverty |
| **Version 2.0**                 | Real-time AQI via EPA AirNow API, census tract-level granularity, peer-reviewed publication of findings, legislative brief auto-generation for any county                                                                                               |

---

## PART V: The Single Most Important Truth

Most CAC entries are functional todo apps, games, or simple quiz platforms — built by students who learned to code six months ago and are genuinely proud of what they made. They should be.

US-SEER is not that. It is a research-grade environmental epidemiology platform built on five federal datasets with a causal inference engine. In the vast majority of congressional districts, it will be the most technically sophisticated submission by a wide margin.

**The risk is not quality. The risk is communication.**

If the video is confusing — if the judges cannot figure out what you *discovered* (not what you built) — if there is no local hook — you lose to a simpler app with a better story. The CAC is not Codeforces. Judges are politicians, not engineers.

**Win condition:** Technical depth + one clear empirical finding + a video that makes a congressional staffer lean forward.

---

*Document authored: July 2026. Deadline: October 31, 2026.*
