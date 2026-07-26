import { CountyDataMap, CountyData } from "./types";

export const AVAILABLE_YEARS = [2018, 2019, 2020, 2021, 2022, 2023, 2024] as const;
export type TemporalYear = (typeof AVAILABLE_YEARS)[number];
export const DEFAULT_YEAR: TemporalYear = 2024;

export interface TemporalEvent {
  year: TemporalYear;
  title: string;
  shortBadge: string;
  emoji: string;
  description: string;
  colorClass: string;
}

export const TEMPORAL_EVENTS: Record<TemporalYear, TemporalEvent> = {
  2018: {
    year: 2018,
    title: "Pre-COVID Industrial Baseline",
    shortBadge: "2018 Baseline",
    emoji: "🏭",
    description: "Standard industrial output and vehicular traffic baseline prior to pandemic lockdowns.",
    colorClass: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  },
  2019: {
    year: 2019,
    title: "Pre-Pandemic Economic Peak",
    shortBadge: "Peak Output",
    emoji: "📈",
    description: "Peak pre-pandemic manufacturing and transportation emissions baseline across major industrial corridors.",
    colorClass: "bg-slate-500/10 text-slate-300 border-slate-500/30",
  },
  2020: {
    year: 2020,
    title: "COVID-19 Global Lockdowns (Emissions Drop)",
    shortBadge: "COVID Drop 📉",
    emoji: "📉",
    description: "Unprecedented 12%–18% drop in urban PM2.5 and industrial toxic releases due to stay-at-home orders and reduced transit.",
    colorClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  },
  2021: {
    year: 2021,
    title: "Economic Rebound & Western Wildfire Season",
    shortBadge: "Wildfire Season 🔥",
    emoji: "🔥",
    description: "Rapid post-lockdown industrial recovery coupled with severe wildfire smoke plumes across Western states.",
    colorClass: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  },
  2022: {
    year: 2022,
    title: "Post-Pandemic Stabilization",
    shortBadge: "Stabilization",
    emoji: "⚖️",
    description: "Return to baseline energy consumption and industrial manufacturing patterns nationwide.",
    colorClass: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
  },
  2023: {
    year: 2023,
    title: "Canadian Wildfire Smoke Incursion",
    shortBadge: "Canadian Smoke Plumes 🌲",
    emoji: "🌲",
    description: "Historic wildfire smoke transport causing severe PM2.5 spikes across Northeast, Great Lakes, and Midwest counties.",
    colorClass: "bg-rose-500/10 text-rose-400 border-rose-500/30",
  },
  2024: {
    year: 2024,
    title: "Clean Air Target Baseline",
    shortBadge: "Current Target 🍃",
    emoji: "🍃",
    description: "Contemporary baseline incorporating Clean Air Act regulations and EV fleet adoption trends.",
    colorClass: "bg-teal-500/10 text-teal-400 border-teal-500/30",
  },
};

// Western US State FIPS prefixes (CA, OR, WA, NV, ID, MT, UT, AZ, CO, NM, WY)
const WESTERN_STATE_FIPS = new Set([
  "06", "41", "53", "32", "16", "30", "49", "04", "08", "35", "56",
]);

// Eastern / Midwestern State FIPS prefixes (NY, PA, OH, MI, IL, IN, WI, MN, NJ, CT, MA, MD, VA, NC)
const EASTERN_MIDWEST_STATE_FIPS = new Set([
  "36", "42", "39", "26", "17", "18", "55", "27", "34", "09", "25", "24", "51", "37",
]);

/**
 * Calculates annual multiplier for PM2.5 based on region and historical events.
 */
function getPm25Multiplier(fips: string, year: TemporalYear, rucc = 3): number {
  const stateFips = fips.substring(0, 2);
  const isWestern = WESTERN_STATE_FIPS.has(stateFips);
  const isEasternMidwest = EASTERN_MIDWEST_STATE_FIPS.has(stateFips);
  const isUrban = rucc <= 3;

  switch (year) {
    case 2018:
      return isUrban ? 1.04 : 1.02;
    case 2019:
      return isUrban ? 1.03 : 1.01;
    case 2020:
      // Lockdown drop: urban counties dropped 14%-18%, rural dropped ~5%
      return isUrban ? 0.83 : 0.94;
    case 2021:
      // Rebound + Western wildfires (Western states spiked 25-35%, others rebounded to ~1.02)
      return isWestern ? 1.28 : isUrban ? 1.05 : 1.01;
    case 2022:
      return isUrban ? 1.01 : 0.99;
    case 2023:
      // Canadian wildfire smoke incursion: Eastern/Midwestern states spiked 25-40%
      return isEasternMidwest ? 1.32 : isWestern ? 1.08 : 1.02;
    case 2024:
      return 0.96; // Clean Air target baseline
    default:
      return 1.0;
  }
}

/**
 * Calculates annual multiplier for Toxic Chemical Releases.
 */
function getToxicMultiplier(fips: string, year: TemporalYear, rucc = 3): number {
  const isUrban = rucc <= 3;

  switch (year) {
    case 2018:
      return 1.08;
    case 2019:
      return 1.05;
    case 2020:
      // COVID industrial slowdown (-20% urban, -10% rural)
      return isUrban ? 0.78 : 0.88;
    case 2021:
      // Post-COVID manufacturing surge
      return 1.12;
    case 2022:
      return 1.02;
    case 2023:
      return 0.98;
    case 2024:
      return 0.93; // Regulatory compliance drop
    default:
      return 1.0;
  }
}

/**
 * Calculates annual multiplier for Respiratory Mortality Rate.
 */
function getMortalityMultiplier(year: TemporalYear): number {
  switch (year) {
    case 2018:
      return 0.97;
    case 2019:
      return 0.98;
    case 2020:
      // Pandemic respiratory mortality surge
      return 1.16;
    case 2021:
      return 1.14;
    case 2022:
      return 1.04;
    case 2023:
      return 1.01;
    case 2024:
      return 0.97;
    default:
      return 1.0;
  }
}

/**
 * Generate complete CountyDataMap calibrated for a specific calendar year.
 */
export function getCountyDataForYear(baseMap: CountyDataMap, year: TemporalYear): CountyDataMap {
  const result: CountyDataMap = {};

  Object.entries(baseMap).forEach(([fips, baseCounty]) => {
    const rucc = baseCounty.rucc ?? 3;
    const pm25Mult = getPm25Multiplier(fips, year, rucc);
    const toxicMult = getToxicMultiplier(fips, year, rucc);
    const mortalityMult = getMortalityMultiplier(year);

    const pm25Avg = baseCounty.pm25Avg != null ? +(baseCounty.pm25Avg * pm25Mult).toFixed(2) : undefined;
    const toxicReleases = baseCounty.toxicReleases != null ? Math.round(baseCounty.toxicReleases * toxicMult) : undefined;
    const mortalityRate = baseCounty.mortalityRate != null ? +(baseCounty.mortalityRate * mortalityMult).toFixed(1) : undefined;

    // Recalculate composite overall risk score for this year
    let overallRisk = baseCounty.overallRisk;
    if (pm25Avg != null && mortalityRate != null) {
      const pm25Norm = Math.min(100, Math.max(0, (((pm25Avg) - 5.5) / (9.0 - 5.5)) * 100));
      const mortalityNorm = Math.min(100, Math.max(0, (((mortalityRate) - 36) / (113 - 36)) * 100));
      const asthmaNorm = Math.min(100, Math.max(0, ((((baseCounty.asthmaPrev || 9.5)) - 8.9) / (11.4 - 8.9)) * 100));
      const copdNorm = Math.min(100, Math.max(0, ((((baseCounty.copdPrev || 7.5)) - 5.8) / (11.2 - 5.8)) * 100));
      const smokingNorm = Math.min(100, Math.max(0, ((((baseCounty.smokingPrev || 18)) - 15.4) / (25.4 - 15.4)) * 100));
      const toxicNorm = Math.min(100, Math.max(0, (((toxicReleases || 0)) / 500000) * 100));
      const mdNorm = Math.min(100, Math.max(0, ((400 - (baseCounty.mdRate || 300)) / (400 - 250)) * 100));
      const ruccNorm = Math.min(100, Math.max(0, (((rucc) - 1) / (9 - 1)) * 100));

      overallRisk = Math.round(
        pm25Norm * 0.20 +
        mortalityNorm * 0.20 +
        asthmaNorm * 0.15 +
        copdNorm * 0.15 +
        toxicNorm * 0.10 +
        smokingNorm * 0.10 +
        mdNorm * 0.05 +
        ruccNorm * 0.05
      );
    }

    result[fips] = {
      ...baseCounty,
      pm25Avg: pm25Avg ?? baseCounty.pm25Avg,
      toxicReleases: toxicReleases ?? baseCounty.toxicReleases,
      mortalityRate: mortalityRate ?? baseCounty.mortalityRate,
      overallRisk: overallRisk ?? baseCounty.overallRisk,
    };
  });

  return result;
}

export interface CountyYearHistoryPoint {
  year: TemporalYear;
  pm25Avg: number;
  mortalityRate: number;
  toxicReleases: number;
  overallRisk: number;
  eventTitle?: string;
  eventEmoji?: string;
}

/**
 * Returns annual time-series trend points for a given county from 2018 to 2024.
 */
export function getCountyHistory(baseCounty: CountyData, fips: string): CountyYearHistoryPoint[] {
  return AVAILABLE_YEARS.map((yr) => {
    const rucc = baseCounty.rucc ?? 3;
    const pm25Mult = getPm25Multiplier(fips, yr, rucc);
    const toxicMult = getToxicMultiplier(fips, yr, rucc);
    const mortalityMult = getMortalityMultiplier(yr);

    const pm25Avg = baseCounty.pm25Avg != null ? +(baseCounty.pm25Avg * pm25Mult).toFixed(2) : 0;
    const toxicReleases = baseCounty.toxicReleases != null ? Math.round(baseCounty.toxicReleases * toxicMult) : 0;
    const mortalityRate = baseCounty.mortalityRate != null ? +(baseCounty.mortalityRate * mortalityMult).toFixed(1) : 0;

    const pm25Norm = Math.min(100, Math.max(0, ((pm25Avg - 5.5) / (9.0 - 5.5)) * 100));
    const mortalityNorm = Math.min(100, Math.max(0, ((mortalityRate - 36) / (113 - 36)) * 100));
    const toxicNorm = Math.min(100, Math.max(0, (toxicReleases / 500000) * 100));

    const overallRisk = Math.round(
      pm25Norm * 0.35 +
      mortalityNorm * 0.35 +
      toxicNorm * 0.30
    );

    const event = TEMPORAL_EVENTS[yr];

    return {
      year: yr,
      pm25Avg,
      mortalityRate,
      toxicReleases,
      overallRisk,
      eventTitle: event?.shortBadge,
      eventEmoji: event?.emoji,
    };
  });
}

/**
 * Compute total percentage change for a metric from start year to end year.
 */
export function getMetricDelta(
  history: CountyYearHistoryPoint[],
  metricKey: keyof Omit<CountyYearHistoryPoint, "year" | "eventTitle" | "eventEmoji">,
  startYear: TemporalYear = 2018,
  endYear: TemporalYear = 2024
): { startVal: number; endVal: number; pctChange: number; isImprovement: boolean } {
  const startPt = history.find((p) => p.year === startYear) || history[0];
  const endPt = history.find((p) => p.year === endYear) || history[history.length - 1];

  const startVal = startPt[metricKey] as number;
  const endVal = endPt[metricKey] as number;

  if (!startVal || startVal === 0) {
    return { startVal: 0, endVal, pctChange: 0, isImprovement: true };
  }

  const pctChange = +(((endVal - startVal) / startVal) * 100).toFixed(1);
  // For pollution, mortality, risk, a negative change is an improvement
  const isImprovement = pctChange <= 0;

  return { startVal, endVal, pctChange, isImprovement };
}
