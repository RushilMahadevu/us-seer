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

export interface EJPercentiles {
  pm25: number;           // 0–100 national percentile (higher = more polluted)
  mortality: number;      // 0–100 national percentile (higher = more deaths)
  income: number;         // 0–100 national percentile (higher = richer, INVERTED for burden)
  incomeVulnerability: number; // 0–100 (100 = poorest → highest vulnerability)
  poverty: number;        // 0–100 (higher = more poverty = more vulnerable)
  uninsured: number;      // 0–100 (higher = more uninsured)
  toxicReleases: number;  // 0–100 (higher = more toxic releases)
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

  return { pm25s, mortalities, incomes, poverties, uninsured, toxics };
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
  const { pm25s, mortalities, incomes, poverties, uninsured, toxics } = getSortedArrays(allData);

  // --- Percentile Rankings ---
  const pm25Pct = county.pm25Avg != null ? percentileRank(pm25s, county.pm25Avg) : 50;
  const mortalityPct = county.mortalityRate != null ? percentileRank(mortalities, county.mortalityRate) : 50;
  const incomePct = county.medianIncome != null ? percentileRank(incomes, county.medianIncome) : 50;
  const incomeVulnPct = 100 - incomePct; // Invert: poorest = 100% vulnerable
  const povertyPct = county.pctPoverty != null ? percentileRank(poverties, county.pctPoverty) : 50;
  const uninsuredPct = county.pctUninsured != null ? percentileRank(uninsured, county.pctUninsured) : 50;
  const toxicPct = county.toxicReleases != null ? percentileRank(toxics, county.toxicReleases) : 0;

  const percentiles: EJPercentiles = {
    pm25: pm25Pct,
    mortality: mortalityPct,
    income: incomePct,
    incomeVulnerability: incomeVulnPct,
    poverty: povertyPct,
    uninsured: uninsuredPct,
    toxicReleases: toxicPct,
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

/** EJ category colors */
export const EJ_CATEGORY_COLORS = {
  critical: { bg: "bg-rose-500/10", border: "border-rose-500/30", text: "text-rose-500", badge: "bg-rose-500" },
  high:     { bg: "bg-orange-500/10", border: "border-orange-500/30", text: "text-orange-500", badge: "bg-orange-500" },
  moderate: { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-500", badge: "bg-amber-500" },
  low:      { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-500", badge: "bg-emerald-500" },
};
