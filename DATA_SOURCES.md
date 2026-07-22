# Additional Data Sources: Going Deeper

You have mortality, pollution, and demographics. Here is every meaningful federal dataset
you can layer on top — all free, all county-level, all joinable on FIPS.

Each one answers a different research question and makes the story richer.

---

## Tier 1 — High Impact, Easy to Add

These join directly on FIPS and can be pulled with a single download or API call.

---

### 1. CDC PLACES (Chronic Disease Prevalence)
**URL:** https://data.cdc.gov/500-Cities-Places/PLACES-Local-Data-for-Better-Health-County-Data-20/swc5-untb  
**What it gives you:** County-level prevalence rates for COPD, asthma, smoking, obesity, physical inactivity, and 30+ other health outcomes. Direct download, CSV.  
**Key columns:** `COPD_CrudePrev`, `CASTHMA_CrudePrev`, `CSMOKING_CrudePrev`  
**Why it matters:** Smoking is the biggest confounder in your current analysis — someone will always say "high respiratory mortality in West Virginia is just smokers." CDC PLACES lets you control for it. You can show that even *after* accounting for local smoking rates, PM2.5 still predicts mortality. That is a publishable-quality finding.

**Join:** `LocationID` column is a 5-digit FIPS code. Drop in directly.

---

### 2. USDA Rural-Urban Continuum Codes (RUCC)
**URL:** https://www.ers.usda.gov/data-products/rural-urban-continuum-codes/  
**What it gives you:** A 1–9 code for every county, from "Metro area of 1M+ people" to "Completely rural."  
**Key columns:** `RUCC_2023`  
**Why it matters:** Urban and rural counties have fundamentally different PM2.5 profiles and healthcare access. Stratifying your correlation by urbanicity is one of the most important cuts you can make — and it takes one merge and one `groupby`.

**Join:** `FIPS` column, 5-digit.

---

### 3. HHS Area Health Resources Files (AHRF)
**URL:** https://data.hrsa.gov/topics/health-workforce/ahrf  
**What it gives you:** Number of primary care physicians, hospital beds, and specialists per county.  
**Key columns:** `F11978` (Active MDs, patient care), `F0892110` (hospital beds)  
**Why it matters:** Healthcare access is the other big confounder. Counties with no nearby pulmonologists will have worse respiratory outcomes regardless of air quality. You can calculate physicians-per-capita and add it as a control variable.

**Join:** `FIPS` column. Annual file, free download.

---

### 4. EPA Toxic Release Inventory (TRI)
**URL:** https://www.epa.gov/toxics-release-inventory-tri-program/tri-basic-plus-data-files-calendar-years  
**What it gives you:** Every industrial facility that releases toxic chemicals, how much, and what kind. Downloadable by year as CSV.  
**Key columns:** `COUNTY`, `ST`, `TOTAL_RELEASES`, `CARCINOGEN_CLASSIFICATION`  
**Why it matters:** PM2.5 is the airborne pollution measure. TRI adds industrial point sources — the specific factories, power plants, and refineries. You can calculate total toxic releases per county and show that TRI-heavy counties cluster with high PM2.5 *and* high mortality. This is the mechanism link.

**Join:** Aggregate to county level first (groupby state + county name → FIPS via Census crosswalk).

---

### 5. Census Additional Variables (Expand Your API Call)
You already have population and median income. Add these to `fetch_census.py` with zero extra work — just add the variable codes to the same API call.

| Variable                        | Code                        | Why                                   |
| ------------------------------- | --------------------------- | ------------------------------------- |
| % below poverty line            | `B17001_002E / B17001_001E` | More granular than income             |
| % without health insurance      | `B27001_005E`               | Access confounder                     |
| % Non-Hispanic Black            | `B03002_004E / B03002_001E` | Environmental justice dimension       |
| % Hispanic                      | `B03002_012E / B03002_001E` | Environmental justice dimension       |
| Median age                      | `B01002_001E`               | Age is a major COPD risk factor       |
| % without a high school diploma | `B15003_002E`               | Socioeconomic depth                   |
| Housing units pre-1940          | `B25034_011E`               | Lead paint / indoor air quality proxy |

Adding these costs you one extra line in `fetch_census.py` and gives you a full socioeconomic and demographic profile for every county.

---

## Tier 2 — More Work, Much Bigger Story

These require more data wrangling but open up entirely new research questions.

---

### 6. NOAA Climate Normals
**URL:** https://www.ncei.noaa.gov/products/land-based-station/us-climate-normals  
**What it gives you:** 30-year average temperature, precipitation, wind speed by weather station.  
**Why it matters:** Climate affects both PM2.5 dispersion (wind breaks up pollution) and respiratory health (cold winters worsen COPD outcomes). Adding a climate variable lets you partially control for geography. California's Central Valley has terrible PM2.5 partly because of geography trapping pollution — you can flag this.

**Complexity:** Station-level data, not county-level. Requires a spatial join to aggregate to county. Medium difficulty.

---

### 7. CDC Social Vulnerability Index (SVI)
**URL:** https://www.atsdr.cdc.gov/placeandhealth/svi/index.html  
**What it gives you:** A composite 0–1 score summarizing a county's social vulnerability across 4 themes: socioeconomic status, household characteristics, racial/ethnic minority status, housing/transportation.  
**Why it matters:** Instead of controlling for poverty, race, and insurance separately, SVI bundles them into one interpretable number. You can make a scatter plot: x = SVI score, y = respiratory mortality rate, colored by PM2.5 level. That visualization tells the entire environmental justice story in one image.

**Join:** Direct FIPS join, CSV download.

---

### 8. BLS Occupational Employment Data
**URL:** https://www.bls.gov/oes/tables.htm  
**What it gives you:** Percentage of workers in each county in specific industries: mining, construction, manufacturing, agriculture.  
**Why it matters:** Occupational exposure to dust, chemicals, and particulates is a major COPD driver independent of ambient air quality. Counties with heavy mining employment (Appalachia) or agriculture (Central Valley) will have elevated mortality even if their PM2.5 numbers look moderate. Adding an occupational exposure index closes this gap.

---

### 9. USGS Water Quality Data (Stretch Goal)
**URL:** https://waterdata.usgs.gov/nwis  
**What it gives you:** County-level contamination data for nitrates, arsenic, and other water pollutants.  
**Why it matters:** This is the biggest pivot — if you can show that counties with *both* poor air quality *and* poor water quality have disproportionately worse health outcomes than either alone, you have moved from an air quality study to a **cumulative environmental burden** study. That is the frontier of environmental health research right now.

---

## Suggested Priority Order

If you want to add data this week, do this:

1. **Add the 7 Census variables** — 10 minutes, zero new files
2. **Download CDC PLACES** — 20 minutes, adds COPD/asthma/smoking prevalence
3. **Download USDA RUCC** — 5 minutes, one column, enables urban/rural stratification
4. **Download EPA TRI** — 1 hour, enables industrial source analysis
5. **Download CDC SVI** — 15 minutes, enables the best single visualization

After those five, you will have data on:
- Air quality (PM2.5)
- Respiratory mortality
- Local COPD and asthma prevalence
- Smoking rates
- Industrial toxic releases
- Income, poverty, insurance coverage
- Race and ethnicity
- Urbanicity
- Healthcare access (SVI)

That is no longer a dashboard. That is an **environmental epidemiology research platform** built by a high school student.
