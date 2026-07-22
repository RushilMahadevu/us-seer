export interface CountyData {
  mortalityRate: number;
  pm25Avg: number;
  population: number;
  medianIncome?: number;
  pctPoverty?: number;
  pctUninsured?: number;
  pctBlack?: number;
  pctHispanic?: number;
  medianAge?: number;
  pctNoHS?: number;
  housingPre1940?: number;
  County_Name?: string;
  deaths?: number;
  asthmaPrev?: number;
  copdPrev?: number;
  smokingPrev?: number;
  rucc?: number;
  mdRate?: number;
  toxicReleases?: number;
  overallRisk?: number;
}

export type CountyDataMap = Record<string, CountyData>;
