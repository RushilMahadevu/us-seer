/**
 * ej-utils.ts
 * -----------
 * H-1: Environmental Justice Story Loop
 *
 * Computes national percentile rankings and an Environmental Justice (EJ) Index
 * for any selected county, modeled on EPA EJScreen methodology:
 * https://www.epa.gov/ejscreen
 *
 * EJ Index = Pollution Burden × Vulnerability Score
 * - Pollution Burden: weighted composite of PM2.5 percentile + toxic releases percentile
 * - Vulnerability Score: weighted composite of income, poverty, uninsured, race, and education percentiles
 *
 * Hotspot Definition (per FINDINGS.md Finding 5):
 *   Top quartile PM2.5 (≥ 75th percentile nationally)
 *   + Top quartile mortality (≥ 75th percentile nationally)
 *   + Bottom quartile income (≤ 25th percentile nationally)
 */

import { CountyData, CountyDataMap } from "./types";

export interface SVIThemeScores {
  socioeconomic: number; // Theme 1: Poverty, Income, Uninsured (0-100)
  demographic: number;   // Theme 2: Age, Health Vulnerability (0-100)
  minority: number;      // Theme 3: Racial & Ethnic Minority (0-100)
  housing: number;        // Theme 4: Housing Age / Infrastructure (0-100)
}

export interface SVIAnalysis {
  sviScore: number;         // Decimal CDC ATSDR RPL_THEMES score (0.000 - 1.000)
  sviPercentile: number;    // 0-100 national percentile (higher = more vulnerable)
  category: "Very High" | "High" | "Moderate" | "Low";
  categoryColor: string;
  themes: SVIThemeScores;
}

export interface EJPercentiles {
  pm25: number;           // 0–100 national percentile (higher = more polluted)
  mortality: number;      // 0–100 national percentile (higher = more deaths)
  income: number;         // 0–100 national percentile (higher = richer, INVERTED for burden)
  incomeVulnerability: number; // 0–100 (100 = poorest → highest vulnerability)
  poverty: number;        // 0–100 (higher = more poverty = more vulnerable)
  uninsured: number;      // 0–100 (higher = more uninsured)
  toxicReleases: number;  // 0–100 (higher = more toxic releases)
  svi: SVIAnalysis;       // CDC Social Vulnerability Index breakdown
}

export interface EJIndex {
  pollutionBurden: number;      // 0–100 composite pollution score
  vulnerabilityScore: number;   // 0–100 composite social vulnerability score
  ejIndex: number;              // 0–100 combined EJ Index (EPA-style: burden × vulnerability / 100)
  isHotspot: boolean;           // True if county meets EJ hotspot triple threshold
  hotspotCategory: "critical" | "high" | "moderate" | "low";
  hotspotReason: string[];      // Human-readable reasons for hotspot classification
}

export interface EJAnalysis {
  percentiles: EJPercentiles;
  ejIndex: EJIndex;
}

/** Pre-computed national quartile thresholds from full 3,142-county dataset */
export const NATIONAL_THRESHOLDS = {
  pm25: { q25: 6.62, q50: 7.62, q75: 8.53 },
  mortality: { q25: 51.53, q50: 69.84, q75: 92.35 },
  income: { q25: 51823, q50: 60461, q75: 70379 },
};

/**
 * Compute the percentile rank of a value within a sorted array.
 * Returns 0–100.
 */
function percentileRank(sortedValues: number[], value: number): number {
  if (sortedValues.length === 0) return 50;
  let count = 0;
  for (const v of sortedValues) {
    if (v <= value) count++;
  }
  return Math.round((count / sortedValues.length) * 100);
}

/** Extract sorted arrays of each metric from the full county dataset */
function buildSortedArrays(allData: CountyDataMap) {
  const entries = Object.values(allData);

  const pm25s = entries.map((c) => c.pm25Avg).filter((v): v is number => v != null).sort((a, b) => a - b);
  const mortalities = entries.map((c) => c.mortalityRate).filter((v): v is number => v != null).sort((a, b) => a - b);
  const incomes = entries.map((c) => c.medianIncome).filter((v): v is number => v != null).sort((a, b) => a - b);
  const poverties = entries.map((c) => c.pctPoverty).filter((v): v is number => v != null).sort((a, b) => a - b);
  const uninsured = entries.map((c) => c.pctUninsured).filter((v): v is number => v != null).sort((a, b) => a - b);
  const toxics = entries.map((c) => c.toxicReleases).filter((v): v is number => v != null).sort((a, b) => a - b);
  const noHS = entries.map((c) => c.pctNoHS).filter((v): v is number => v != null).sort((a, b) => a - b);
  const minorities = entries.map((c) => ((c.pctBlack ?? 0) + (c.pctHispanic ?? 0))).filter((v): v is number => v != null).sort((a, b) => a - b);
  const housingAge = entries.map((c) => c.housingPre1940).filter((v): v is number => v != null).sort((a, b) => a - b);

  return { pm25s, mortalities, incomes, poverties, uninsured, toxics, noHS, minorities, housingAge };
}

// Module-level cache so we only sort once per session
let _cachedArrays: ReturnType<typeof buildSortedArrays> | null = null;
let _cachedDataRef: CountyDataMap | null = null;

function getSortedArrays(allData: CountyDataMap) {
  if (_cachedArrays && _cachedDataRef === allData) return _cachedArrays;
  _cachedArrays = buildSortedArrays(allData);
  _cachedDataRef = allData;
  return _cachedArrays;
}

/**
 * Main entry point: compute full EJ analysis for a selected county.
 */
export function computeEJAnalysis(county: CountyData, allData: CountyDataMap): EJAnalysis {
  const { pm25s, mortalities, incomes, poverties, uninsured, toxics, noHS, minorities, housingAge } = getSortedArrays(allData);

  // --- Percentile Rankings ---
  const pm25Pct = county.pm25Avg != null ? percentileRank(pm25s, county.pm25Avg) : 50;
  const mortalityPct = county.mortalityRate != null ? percentileRank(mortalities, county.mortalityRate) : 50;
  const incomePct = county.medianIncome != null ? percentileRank(incomes, county.medianIncome) : 50;
  const incomeVulnPct = 100 - incomePct; // Invert: poorest = 100% vulnerable
  const povertyPct = county.pctPoverty != null ? percentileRank(poverties, county.pctPoverty) : 50;
  const uninsuredPct = county.pctUninsured != null ? percentileRank(uninsured, county.pctUninsured) : 50;
  const toxicPct = county.toxicReleases != null ? percentileRank(toxics, county.toxicReleases) : 0;
  const noHsPct = county.pctNoHS != null ? percentileRank(noHS, county.pctNoHS) : 50;
  const minorityVal = (county.pctBlack ?? 0) + (county.pctHispanic ?? 0);
  const minorityPct = percentileRank(minorities, minorityVal);
  const housingPct = county.housingPre1940 != null ? percentileRank(housingAge, county.housingPre1940) : 50;

  // --- CDC SVI (Social Vulnerability Index) Calculation (CDC ATSDR RPL_THEMES model) ---
  // Theme 1 (Socioeconomic): Income, Poverty, Uninsured, No HS
  const sviTheme1 = Math.round((incomeVulnPct * 0.35 + povertyPct * 0.30 + uninsuredPct * 0.20 + noHsPct * 0.15));
  // Theme 2 (Demographics & Health): Mortality & Chronic Disease vulnerability
  const sviTheme2 = Math.round((mortalityPct * 0.60 + (county.copdPrev ? percentileRank(mortalities, county.copdPrev) : mortalityPct) * 0.40));
  // Theme 3 (Racial & Ethnic Minority Status)
  const sviTheme3 = minorityPct;
  // Theme 4 (Housing & Infrastructure)
  const sviTheme4 = housingPct;

  // Composite CDC SVI Percentile (CDC ATSDR RPL_THEMES)
  const sviCompositePct = county.svi != null
    ? Math.round(county.svi * 100)
    : Math.round(sviTheme1 * 0.40 + sviTheme2 * 0.25 + sviTheme3 * 0.20 + sviTheme4 * 0.15);
  
  const sviScore = county.svi != null ? county.svi : Number((sviCompositePct / 100).toFixed(4));
  
  let sviCategory: SVIAnalysis["category"];
  let sviCategoryColor: string;
  if (sviCompositePct >= 75) {
    sviCategory = "Very High";
    sviCategoryColor = "text-rose-500 bg-rose-500/10 border-rose-500/30";
  } else if (sviCompositePct >= 50) {
    sviCategory = "High";
    sviCategoryColor = "text-orange-500 bg-orange-500/10 border-orange-500/30";
  } else if (sviCompositePct >= 25) {
    sviCategory = "Moderate";
    sviCategoryColor = "text-amber-500 bg-amber-500/10 border-amber-500/30";
  } else {
    sviCategory = "Low";
    sviCategoryColor = "text-emerald-500 bg-emerald-500/10 border-emerald-500/30";
  }

  const sviAnalysis: SVIAnalysis = {
    sviScore,
    sviPercentile: sviCompositePct,
    category: sviCategory,
    categoryColor: sviCategoryColor,
    themes: {
      socioeconomic: sviTheme1,
      demographic: sviTheme2,
      minority: sviTheme3,
      housing: sviTheme4,
    },
  };

  const percentiles: EJPercentiles = {
    pm25: pm25Pct,
    mortality: mortalityPct,
    income: incomePct,
    incomeVulnerability: incomeVulnPct,
    poverty: povertyPct,
    uninsured: uninsuredPct,
    toxicReleases: toxicPct,
    svi: sviAnalysis,
  };

  // --- EJ Index (modeled on EPA EJScreen) ---
  // Pollution Burden: PM2.5 is primary (65%), toxics secondary (35%)
  const pollutionBurden = Math.round(pm25Pct * 0.65 + toxicPct * 0.35);

  // Vulnerability Score: income deprivation (40%), poverty (30%), uninsured (30%)
  const vulnerabilityScore = Math.round(
    incomeVulnPct * 0.40 +
    povertyPct    * 0.30 +
    uninsuredPct  * 0.30
  );

  // EJ Index: burden × vulnerability / 100 (EPA-style product formula, normalized)
  const ejIndexRaw = (pollutionBurden * vulnerabilityScore) / 100;
  const ejIndex = Math.round(Math.min(100, ejIndexRaw));

  // --- EJ Hotspot Classification ---
  // Criteria from FINDINGS.md Finding 5:
  // PM2.5 ≥ 75th pct (>= 8.53 µg/m³)  +  Mortality ≥ 75th pct (>= 92.35)  +  Income ≤ 25th pct (<= $51,823)
  const highPollution = pm25Pct >= 75;
  const highMortality = mortalityPct >= 75;
  const lowIncome = incomePct <= 25;

  const hotspotReason: string[] = [];
  if (highPollution) hotspotReason.push("Top-quartile PM₂.₅ pollution");
  if (highMortality) hotspotReason.push("Top-quartile respiratory mortality");
  if (lowIncome) hotspotReason.push("Bottom-quartile household income");

  const isHotspot = highPollution && highMortality && lowIncome;

  let hotspotCategory: EJIndex["hotspotCategory"];
  const burdenCount = [highPollution, highMortality, lowIncome].filter(Boolean).length;
  if (isHotspot) hotspotCategory = "critical";
  else if (burdenCount === 2) hotspotCategory = "high";
  else if (ejIndex >= 40) hotspotCategory = "moderate";
  else hotspotCategory = "low";

  const ejIndexResult: EJIndex = {
    pollutionBurden,
    vulnerabilityScore,
    ejIndex,
    isHotspot,
    hotspotCategory,
    hotspotReason,
  };

  return { percentiles, ejIndex: ejIndexResult };
}

/** Plain-English description of a percentile value */
export function percentileLabel(pct: number, higher = "high"): string {
  if (pct >= 90) return `Top 10% nationally (very ${higher})`;
  if (pct >= 75) return `Top 25% nationally (${higher})`;
  if (pct >= 50) return `Above national median`;
  if (pct >= 25) return `Below national median`;
  return `Bottom 25% nationally`;
}

/** Color class for a pollution/risk percentile (higher = worse) */
export function pollutionPercentileColor(pct: number): string {
  if (pct >= 90) return "text-rose-500";
  if (pct >= 75) return "text-orange-500";
  if (pct >= 50) return "text-amber-500";
  if (pct >= 25) return "text-emerald-500";
  return "text-teal-500";
}

/** Color class for an income/wealth percentile (lower = more vulnerable) */
export function incomePercentileColor(pct: number): string {
  if (pct <= 10) return "text-rose-500";
  if (pct <= 25) return "text-orange-500";
  if (pct <= 50) return "text-amber-500";
  if (pct <= 75) return "text-emerald-500";
  return "text-teal-500";
}

/**
 * Compute the Set of FIPS codes for all Environmental Justice hotspot counties.
 *
 * Criteria (per FINDINGS.md Finding 5 — tri-quartile intersection):
 *   PM2.5      ≥ 75th percentile nationally (≥ 8.53 µg/m³)
 *   Mortality  ≥ 75th percentile nationally (≥ 92.35 / 100k)
 *   Income     ≤ 25th percentile nationally (≤ $51,823)
 *
 * Returns a Set<string> of FIPS codes (typically ~74 counties).
 */
export function getEJHotspotFips(allData: CountyDataMap): Set<string> {
  const hotspots = new Set<string>();
  for (const [fips, county] of Object.entries(allData)) {
    if (
      county.pm25Avg != null &&
      county.mortalityRate != null &&
      county.medianIncome != null &&
      county.pm25Avg >= NATIONAL_THRESHOLDS.pm25.q75 &&
      county.mortalityRate >= NATIONAL_THRESHOLDS.mortality.q75 &&
      county.medianIncome <= NATIONAL_THRESHOLDS.income.q25
    ) {
      hotspots.add(fips);
    }
  }
  return hotspots;
}

/** EJ category colors */
export const EJ_CATEGORY_COLORS = {
  critical: { bg: "bg-rose-500/10", border: "border-rose-500/30", text: "text-rose-500", badge: "bg-rose-500" },
  high:     { bg: "bg-orange-500/10", border: "border-orange-500/30", text: "text-orange-500", badge: "bg-orange-500" },
  moderate: { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-500", badge: "bg-amber-500" },
  low:      { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-500", badge: "bg-emerald-500" },
};
