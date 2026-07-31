/**
 * district-data.ts
 * -----------------
 * C-3: Local District Angle — Nevada's 2nd Congressional District
 * Representative: Mark Amodei (R)
 * Home county: Washoe County, NV (Reno)
 *
 * NV-02 covers all of northern Nevada, the largest congressional district
 * by land area in the contiguous US.
 *
 * Source: U.S. House of Representatives, 119th Congress
 * https://www.house.gov/representatives/find-your-representative
 */

export interface DistrictCounty {
  fips: string;
  name: string;
  shortName: string;
  isHome: boolean; // true = Washoe County (home county)
  note?: string;
}

export interface DistrictConfig {
  districtNumber: number;
  state: string;
  stateAbbr: string;
  stateFipsPrefix: string;
  representative: string;
  representativeParty: "D" | "R" | "I";
  congress: string;
  mapCenter: [number, number]; // [lng, lat]
  mapZoom: number;
  homeCountyFips: string;
  homeCountyName: string;
  homeCity: string;
  counties: DistrictCounty[];
}

export const MY_DISTRICT: DistrictConfig = {
  districtNumber: 2,
  state: "Nevada",
  stateAbbr: "NV",
  stateFipsPrefix: "32",
  representative: "Rep. Mark Amodei",
  representativeParty: "R",
  congress: "119th Congress",
  mapCenter: [-117.0, 40.2],   // Northern Nevada center
  mapZoom: 5.5,
  homeCountyFips: "32031",
  homeCountyName: "Washoe County",
  homeCity: "Reno",
  counties: [
    { fips: "32031", name: "Washoe County, Nevada",    shortName: "Washoe",    isHome: true,  note: "Reno-Sparks metropolitan area" },
    { fips: "32510", name: "Carson City, Nevada",      shortName: "Carson City", isHome: false, note: "State capital (independent city)" },
    { fips: "32005", name: "Douglas County, Nevada",   shortName: "Douglas",   isHome: false },
    { fips: "32007", name: "Elko County, Nevada",      shortName: "Elko",      isHome: false, note: "Gold mining region" },
    { fips: "32001", name: "Churchill County, Nevada", shortName: "Churchill", isHome: false },
    { fips: "32013", name: "Humboldt County, Nevada",  shortName: "Humboldt",  isHome: false },
    { fips: "32015", name: "Lander County, Nevada",    shortName: "Lander",    isHome: false },
    { fips: "32019", name: "Lyon County, Nevada",      shortName: "Lyon",      isHome: false },
    { fips: "32027", name: "Pershing County, Nevada",  shortName: "Pershing",  isHome: false },
    { fips: "32029", name: "Storey County, Nevada",    shortName: "Storey",    isHome: false, note: "Virginia City historic district" },
    { fips: "32033", name: "White Pine County, Nevada", shortName: "White Pine", isHome: false },
    { fips: "32011", name: "Eureka County, Nevada",    shortName: "Eureka",    isHome: false },
  ],
};

/** Contact link for Rep. Amodei */
export const REPRESENTATIVE_CONTACT = "https://amodei.house.gov/contact";

/**
 * Returns district counties sorted by a given data metric descending.
 * Pass in a partial record of fips → metric value.
 */
export function getRankedDistrictCounties(
  metricByFips: Record<string, number | null | undefined>,
  ascending = false
): Array<DistrictCounty & { metricValue: number | null }> {
  return MY_DISTRICT.counties
    .map((c) => ({
      ...c,
      metricValue: metricByFips[c.fips] ?? null,
    }))
    .sort((a, b) => {
      if (a.metricValue === null) return 1;
      if (b.metricValue === null) return -1;
      return ascending
        ? a.metricValue - b.metricValue
        : b.metricValue - a.metricValue;
    });
}
