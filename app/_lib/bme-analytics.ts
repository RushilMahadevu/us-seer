import { CountyDataMap, CountyData } from "@/app/_lib/types";

export interface ScatterPoint {
  fips: string;
  name: string;
  x: number;
  y: number;
  rucc?: number;
  overallRisk?: number;
}

export interface OLSResult {
  slope: number;
  intercept: number;
  r2: number;
  pValue: number;
  correlation: number;
  n: number;
  points: ScatterPoint[];
  regressionLine: { x: number; y: number }[];
}

export interface SimulationResult {
  targetPm25Cap: number;
  targetToxicCap: number;
  mdDensityBoostPct: number;
  projectedLivesSaved: number;
  preventedCopdCases: number;
  preventedAsthmaCases: number;
  asthmaErVisitsPrevented: number;
  epaVslSavingsMillions: number;
  clinicalCostSavingsMillions: number;
  totalEconomicSavingsMillions: number;
  estimatedCostSavingsMillions: number;
  affectedCountyCount: number;
  scope?: "county" | "state" | "national";
  scopeLabel?: string;
  priorityCounties: {
    fips: string;
    name: string;
    currentPm25: number;
    currentMortality: number;
    livesSaved: number;
    riskScore: number;
  }[];
}

export interface HealthDesertCluster {
  fips: string;
  name: string;
  pm25: number;
  toxicReleases: number;
  mdRate: number;
  mortalityRate: number;
  sviRisk: number;
  category: "High Hazard / Low Care" | "High Hazard / High Care" | "Low Hazard / Low Care" | "Low Hazard / High Care";
}

/**
 * Perform Ordinary Least Squares (OLS) linear regression on specified X and Y keys.
 */
export function calculateOLS(
  dataMap: CountyDataMap,
  xKey: keyof CountyData,
  yKey: keyof CountyData
): OLSResult {
  const points: ScatterPoint[] = [];

  Object.entries(dataMap).forEach(([fips, county]) => {
    const xVal = county[xKey];
    const yVal = county[yKey];

    if (
      typeof xVal === "number" &&
      typeof yVal === "number" &&
      !isNaN(xVal) &&
      !isNaN(yVal)
    ) {
      points.push({
        fips,
        name: county.County_Name || `FIPS ${fips}`,
        x: xVal,
        y: yVal,
        rucc: county.rucc,
        overallRisk: county.overallRisk,
      });
    }
  });

  const n = points.length;
  if (n === 0) {
    return {
      slope: 0,
      intercept: 0,
      r2: 0,
      pValue: 1,
      correlation: 0,
      n: 0,
      points: [],
      regressionLine: [],
    };
  }

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  let sumYY = 0;

  points.forEach((p) => {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumXX += p.x * p.x;
    sumYY += p.y * p.y;
  });

  const meanX = sumX / n;
  const meanY = sumY / n;

  const denominator = n * sumXX - sumX * sumX;
  const slope = denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0;
  const intercept = meanY - slope * meanX;

  // Correlation & R2
  const numR = n * sumXY - sumX * sumY;
  const denR = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
  const correlation = denR !== 0 ? numR / denR : 0;
  const r2 = correlation * correlation;

  // Approximate p-value for Pearson correlation
  const tStat = Math.abs(correlation) * Math.sqrt((n - 2) / (1 - r2 + 1e-9));
  // Rough t-distribution p-value approximation for large N
  const pValue = tStat > 3.5 ? 0.0001 : tStat > 2.5 ? 0.01 : tStat > 1.96 ? 0.05 : 0.2;

  // Generate regression line endpoints
  const minX = Math.min(...points.map((p) => p.x));
  const maxX = Math.max(...points.map((p) => p.x));
  const regressionLine = [
    { x: minX, y: slope * minX + intercept },
    { x: maxX, y: slope * maxX + intercept },
  ];

  return {
    slope,
    intercept,
    r2,
    pValue,
    correlation,
    n,
    points,
    regressionLine,
  };
}

/**
 * Calculates Population Attributable Risk (PAR) fraction of PM2.5 above baseline.
 * Baseline WHO recommendation: 5.0 ug/m3.
 */
export function calculateAttributableRisk(dataMap: CountyDataMap, baselinePm25 = 5.0) {
  let totalPopulation = 0;
  let totalAttributableDeaths = 0;
  let totalDeaths = 0;

  Object.values(dataMap).forEach((county) => {
    const pop = county.population || 0;
    const pm25 = county.pm25Avg || 0;
    const mortalityRate = county.mortalityRate || 0; // per 100k

    totalPopulation += pop;
    const annualDeaths = (mortalityRate / 100000) * pop;
    totalDeaths += annualDeaths;

    if (pm25 > baselinePm25) {
      // Relative Risk (RR) formula per 10 ug/m3 PM2.5 increase ~ 1.06 (6% increase in cardiorespiratory mortality per 10 ug/m3)
      const excessPm25 = pm25 - baselinePm25;
      const rr = Math.exp(0.0058 * excessPm25); // ~ 6% per 10 ug/m3
      const parFraction = (rr - 1) / rr;
      const attributableDeaths = annualDeaths * parFraction;
      totalAttributableDeaths += attributableDeaths;
    }
  });

  const overallParPct = totalDeaths > 0 ? (totalAttributableDeaths / totalDeaths) * 100 : 0;

  return {
    totalPopulation,
    totalDeaths: Math.round(totalDeaths),
    totalAttributableDeaths: Math.round(totalAttributableDeaths),
    overallParPct: +overallParPct.toFixed(2),
  };
}

/**
 * Run counterfactual policy simulation across all or scoped counties.
 */
export function runCounterfactualSimulation(
  dataMap: CountyDataMap,
  targetPm25Cap: number,
  targetToxicCap: number,
  mdDensityBoostPct: number,
  scopeFilter?: {
    scope: "county" | "state" | "national";
    selectedFips?: string;
    selectedState?: string;
  }
): SimulationResult {
  let filteredMap = dataMap;

  // Filter map based on requested scope
  if (scopeFilter?.scope === "county" && scopeFilter.selectedFips) {
    const single = dataMap[scopeFilter.selectedFips] || dataMap[scopeFilter.selectedFips.padStart(5, "0")];
    filteredMap = single ? { [scopeFilter.selectedFips]: single } : {};
  } else if (scopeFilter?.scope === "state") {
    let targetStateCode = scopeFilter.selectedState;
    if (!targetStateCode && scopeFilter.selectedFips) {
      const prefix = scopeFilter.selectedFips.padStart(5, "0").substring(0, 2);
      // Map FIPS prefix to 2-letter state code if needed
      const FIPS_PREFIX_MAP: Record<string, string> = {
        "01":"AL","02":"AK","04":"AZ","05":"AR","06":"CA","08":"CO","09":"CT","10":"DE","11":"DC","12":"FL",
        "13":"GA","15":"HI","16":"ID","17":"IL","18":"IN","19":"IA","20":"KS","21":"KY","22":"LA","23":"ME",
        "24":"MD","25":"MA","26":"MI","27":"MN","28":"MS","29":"MO","30":"MT","31":"NE","32":"NV","33":"NH",
        "34":"NJ","35":"NM","36":"NY","37":"NC","38":"ND","39":"OH","40":"OK","41":"OR","42":"PA","44":"RI",
        "45":"SC","46":"SD","47":"TN","48":"TX","49":"UT","50":"VT","51":"VA","53":"WA","54":"WV","55":"WI","56":"WY"
      };
      targetStateCode = FIPS_PREFIX_MAP[prefix];
    }

    if (targetStateCode) {
      const out: CountyDataMap = {};
      Object.entries(dataMap).forEach(([fips, c]) => {
        const prefix = fips.padStart(5, "0").substring(0, 2);
        const FIPS_PREFIX_MAP: Record<string, string> = {
          "01":"AL","02":"AK","04":"AZ","05":"AR","06":"CA","08":"CO","09":"CT","10":"DE","11":"DC","12":"FL",
          "13":"GA","15":"HI","16":"ID","17":"IL","18":"IN","19":"IA","20":"KS","21":"KY","22":"LA","23":"ME",
          "24":"MD","25":"MA","26":"MI","27":"MN","28":"MS","29":"MO","30":"MT","31":"NE","32":"NV","33":"NH",
          "34":"NJ","35":"NM","36":"NY","37":"NC","38":"ND","39":"OH","40":"OK","41":"OR","42":"PA","44":"RI",
          "45":"SC","46":"SD","47":"TN","48":"TX","49":"UT","50":"VT","51":"VA","53":"WA","54":"WV","55":"WI","56":"WY"
        };
        if (FIPS_PREFIX_MAP[prefix] === targetStateCode) {
          out[fips] = c;
        }
      });
      filteredMap = out;
    }
  }

  let projectedLivesSaved = 0;
  let preventedCopdCases = 0;
  let preventedAsthmaCases = 0;
  let affectedCountyCount = 0;

  const countyImpacts: {
    fips: string;
    name: string;
    currentPm25: number;
    currentMortality: number;
    livesSaved: number;
    riskScore: number;
  }[] = [];

  Object.entries(filteredMap).forEach(([fips, county]) => {
    const pop = county.population || 0;
    const pm25 = county.pm25Avg || 0;
    const mortalityRate = county.mortalityRate || 0;
    const toxic = county.toxicReleases || 0;
    const copd = county.copdPrev || 0;
    const asthma = county.asthmaPrev || 0;

    let pm25Reduction = 0;
    if (pm25 > targetPm25Cap) {
      pm25Reduction = pm25 - targetPm25Cap;
    }

    let toxicReductionPct = 0;
    if (toxic > targetToxicCap && targetToxicCap > 0) {
      toxicReductionPct = Math.min(1.0, (toxic - targetToxicCap) / toxic);
    }

    const mdBoostFactor = 1 + mdDensityBoostPct / 100;

    if (pm25Reduction > 0 || toxicReductionPct > 0 || mdDensityBoostPct > 0) {
      affectedCountyCount++;

      // Mortality reduction model: ~0.6% mortality reduction per 1 ug/m3 PM2.5 drop
      // + physician access buffer (up to 0.3% mortality reduction per 10% MD boost)
      const pm25LifeSavedRate = 0.006 * pm25Reduction;
      const mdBenefitRate = 0.003 * (mdDensityBoostPct / 10);
      const totalMortalityDropRate = Math.min(0.25, pm25LifeSavedRate + mdBenefitRate);

      const baselineDeaths = (mortalityRate / 100000) * pop;
      const livesSavedInCounty = baselineDeaths * totalMortalityDropRate;
      projectedLivesSaved += livesSavedInCounty;

      // Prevented chronic disease exacerbations
      const copdPrevented = (pop * (copd / 100)) * (pm25Reduction * 0.015);
      const asthmaPrevented = (pop * (asthma / 100)) * (pm25Reduction * 0.02 + toxicReductionPct * 0.01);
      preventedCopdCases += copdPrevented;
      preventedAsthmaCases += asthmaPrevented;

      if (livesSavedInCounty > 0.01) {
        countyImpacts.push({
          fips,
          name: county.County_Name || `FIPS ${fips}`,
          currentPm25: pm25,
          currentMortality: mortalityRate,
          livesSaved: +livesSavedInCounty.toFixed(1),
          riskScore: county.overallRisk || 50,
        });
      }
    }
  });

  // Sort priority counties by lives saved descending
  countyImpacts.sort((a, b) => b.livesSaved - a.livesSaved);

  // EPA Standard Value of Statistical Life (VSL): $11.0 Million per avoided mortality (2024 USD)
  const EPA_VSL_PER_LIFE = 11.0; // $11.0M
  const epaVslSavingsMillions = +(projectedLivesSaved * EPA_VSL_PER_LIFE).toFixed(1);

  // Direct clinical cost savings: ~$180k per premature death avoided + ER/hospitalization costs ($4,500/COPD, $1,200/Asthma)
  const clinicalCostSavingsMillions = +(
    (projectedLivesSaved * 0.18 + preventedCopdCases * 0.0045 + preventedAsthmaCases * 0.0012)
  ).toFixed(1);

  const totalEconomicSavingsMillions = +(epaVslSavingsMillions + clinicalCostSavingsMillions).toFixed(1);

  // Estimated asthma & respiratory ER visits prevented (~85% of asthma cases + 45% of COPD flare-ups lead to ER visits)
  const asthmaErVisitsPrevented = Math.round(preventedAsthmaCases * 0.85 + preventedCopdCases * 0.45);

  const scope = scopeFilter?.scope || "national";
  let scopeLabel = "National (All US Counties)";
  if (scope === "county") {
    const fips = scopeFilter?.selectedFips;
    scopeLabel = fips && dataMap[fips]?.County_Name ? dataMap[fips].County_Name! : "Single County";
  } else if (scope === "state") {
    scopeLabel = scopeFilter?.selectedState ? `State (${scopeFilter.selectedState})` : "Statewide";
  }

  return {
    targetPm25Cap,
    targetToxicCap,
    mdDensityBoostPct,
    projectedLivesSaved: Math.round(projectedLivesSaved),
    preventedCopdCases: Math.round(preventedCopdCases),
    preventedAsthmaCases: Math.round(preventedAsthmaCases),
    asthmaErVisitsPrevented,
    epaVslSavingsMillions,
    clinicalCostSavingsMillions,
    totalEconomicSavingsMillions,
    estimatedCostSavingsMillions: totalEconomicSavingsMillions,
    affectedCountyCount,
    scope,
    scopeLabel,
    priorityCounties: countyImpacts.slice(0, 10),
  };
}

/**
 * Cluster counties into Health Desert risk categories based on Exposure vs Care Access.
 */
export function getHealthDesertClusters(dataMap: CountyDataMap): HealthDesertCluster[] {
  const clusters: HealthDesertCluster[] = [];

  // Compute medians for PM2.5 and MD Rate
  const pm25List: number[] = [];
  const mdList: number[] = [];

  Object.values(dataMap).forEach((c) => {
    if (typeof c.pm25Avg === "number") pm25List.push(c.pm25Avg);
    if (typeof c.mdRate === "number") mdList.push(c.mdRate);
  });

  pm25List.sort((a, b) => a - b);
  mdList.sort((a, b) => a - b);

  const medianPm25 = pm25List.length > 0 ? pm25List[Math.floor(pm25List.length / 2)] : 8.5;
  const medianMd = mdList.length > 0 ? mdList[Math.floor(mdList.length / 2)] : 45;

  Object.entries(dataMap).forEach(([fips, c]) => {
    const pm25 = c.pm25Avg ?? 0;
    const mdRate = c.mdRate ?? 0;
    const isHighHazard = pm25 >= medianPm25;
    const isHighCare = mdRate >= medianMd;

    let category: HealthDesertCluster["category"] = "Low Hazard / High Care";
    if (isHighHazard && !isHighCare) category = "High Hazard / Low Care";
    else if (isHighHazard && isHighCare) category = "High Hazard / High Care";
    else if (!isHighHazard && !isHighCare) category = "Low Hazard / Low Care";

    clusters.push({
      fips,
      name: c.County_Name || `FIPS ${fips}`,
      pm25,
      toxicReleases: c.toxicReleases || 0,
      mdRate,
      mortalityRate: c.mortalityRate || 0,
      sviRisk: c.overallRisk || 50,
      category,
    });
  });

  return clusters;
}
