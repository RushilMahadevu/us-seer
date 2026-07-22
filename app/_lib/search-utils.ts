import { CountyDataMap } from "./types";

export interface SearchResultItem {
  id: string;
  type: "county" | "state" | "city" | "region";
  title: string;
  subtitle: string;
  fips?: string;
  coordinates?: [number, number];
  zoom?: number;
  badge: string;
  extraInfo?: string;
}

// Numeric FIPS state prefix → 2-letter abbreviation
export const FIPS_STATE_PREFIX: Record<string, string> = {
  "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA",
  "08": "CO", "09": "CT", "10": "DE", "11": "DC", "12": "FL",
  "13": "GA", "15": "HI", "16": "ID", "17": "IL", "18": "IN",
  "19": "IA", "20": "KS", "21": "KY", "22": "LA", "23": "ME",
  "24": "MD", "25": "MA", "26": "MI", "27": "MN", "28": "MS",
  "29": "MO", "30": "MT", "31": "NE", "32": "NV", "33": "NH",
  "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND",
  "39": "OH", "40": "OK", "41": "OR", "42": "PA", "44": "RI",
  "45": "SC", "46": "SD", "47": "TN", "48": "TX", "49": "UT",
  "50": "VT", "51": "VA", "53": "WA", "54": "WV", "55": "WI",
  "56": "WY",
};

export const STATE_CENTROIDS: Record<string, { name: string; code: string; coordinates: [number, number] }> = {
  AL: { name: "Alabama", code: "AL", coordinates: [-86.9, 32.8] },
  AK: { name: "Alaska", code: "AK", coordinates: [-152.0, 64.2] },
  AZ: { name: "Arizona", code: "AZ", coordinates: [-111.7, 34.3] },
  AR: { name: "Arkansas", code: "AR", coordinates: [-92.4, 34.9] },
  CA: { name: "California", code: "CA", coordinates: [-119.4, 36.8] },
  CO: { name: "Colorado", code: "CO", coordinates: [-105.6, 39.0] },
  CT: { name: "Connecticut", code: "CT", coordinates: [-72.7, 41.6] },
  DE: { name: "Delaware", code: "DE", coordinates: [-75.5, 39.0] },
  FL: { name: "Florida", code: "FL", coordinates: [-81.5, 27.8] },
  GA: { name: "Georgia", code: "GA", coordinates: [-83.6, 32.7] },
  HI: { name: "Hawaii", code: "HI", coordinates: [-157.5, 20.8] },
  ID: { name: "Idaho", code: "ID", coordinates: [-114.5, 44.2] },
  IL: { name: "Illinois", code: "IL", coordinates: [-89.2, 40.0] },
  IN: { name: "Indiana", code: "IN", coordinates: [-86.1, 39.8] },
  IA: { name: "Iowa", code: "IA", coordinates: [-93.5, 42.0] },
  KS: { name: "Kansas", code: "KS", coordinates: [-98.5, 38.5] },
  KY: { name: "Kentucky", code: "KY", coordinates: [-84.9, 37.5] },
  LA: { name: "Louisiana", code: "LA", coordinates: [-91.9, 31.0] },
  ME: { name: "Maine", code: "ME", coordinates: [-69.4, 45.3] },
  MD: { name: "Maryland", code: "MD", coordinates: [-76.6, 39.0] },
  MA: { name: "Massachusetts", code: "MA", coordinates: [-71.8, 42.2] },
  MI: { name: "Michigan", code: "MI", coordinates: [-84.6, 44.3] },
  MN: { name: "Minnesota", code: "MN", coordinates: [-94.6, 46.4] },
  MS: { name: "Mississippi", code: "MS", coordinates: [-89.7, 32.7] },
  MO: { name: "Missouri", code: "MO", coordinates: [-92.5, 38.4] },
  MT: { name: "Montana", code: "MT", coordinates: [-109.5, 47.0] },
  NE: { name: "Nebraska", code: "NE", coordinates: [-99.9, 41.5] },
  NV: { name: "Nevada", code: "NV", coordinates: [-116.6, 38.8] },
  NH: { name: "New Hampshire", code: "NH", coordinates: [-71.5, 43.7] },
  NJ: { name: "New Jersey", code: "NJ", coordinates: [-74.4, 40.1] },
  NM: { name: "New Mexico", code: "NM", coordinates: [-106.0, 34.5] },
  NY: { name: "New York", code: "NY", coordinates: [-75.5, 43.0] },
  NC: { name: "North Carolina", code: "NC", coordinates: [-79.0, 35.5] },
  ND: { name: "North Dakota", code: "ND", coordinates: [-100.5, 47.5] },
  OH: { name: "Ohio", code: "OH", coordinates: [-82.9, 40.4] },
  OK: { name: "Oklahoma", code: "OK", coordinates: [-97.5, 35.5] },
  OR: { name: "Oregon", code: "OR", coordinates: [-120.5, 44.0] },
  PA: { name: "Pennsylvania", code: "PA", coordinates: [-77.2, 40.9] },
  RI: { name: "Rhode Island", code: "RI", coordinates: [-71.5, 41.6] },
  SC: { name: "South Carolina", code: "SC", coordinates: [-81.0, 33.8] },
  SD: { name: "South Dakota", code: "SD", coordinates: [-100.0, 44.4] },
  TN: { name: "Tennessee", code: "TN", coordinates: [-86.3, 35.8] },
  TX: { name: "Texas", code: "TX", coordinates: [-99.9, 31.5] },
  UT: { name: "Utah", code: "UT", coordinates: [-111.1, 39.3] },
  VT: { name: "Vermont", code: "VT", coordinates: [-72.6, 44.1] },
  VA: { name: "Virginia", code: "VA", coordinates: [-78.7, 37.5] },
  WA: { name: "Washington", code: "WA", coordinates: [-120.7, 47.4] },
  WV: { name: "West Virginia", code: "WV", coordinates: [-80.5, 38.6] },
  WI: { name: "Wisconsin", code: "WI", coordinates: [-89.6, 44.5] },
  WY: { name: "Wyoming", code: "WY", coordinates: [-107.3, 43.0] },
};

/** Given a 5-digit county FIPS, return the state centroid coordinates. */
export function coordsFromFips(fips: string): [number, number] | null {
  const stateAbbr = FIPS_STATE_PREFIX[fips.slice(0, 2)];
  if (!stateAbbr) return null;
  return STATE_CENTROIDS[stateAbbr]?.coordinates ?? null;
}

export const MAJOR_CITIES: Array<{ name: string; state: string; fips: string; county: string }> = [
  { name: "New York City", state: "NY", fips: "36061", county: "New York County" },
  { name: "Los Angeles", state: "CA", fips: "06037", county: "Los Angeles County" },
  { name: "Chicago", state: "IL", fips: "17031", county: "Cook County" },
  { name: "Houston", state: "TX", fips: "48201", county: "Harris County" },
  { name: "Phoenix", state: "AZ", fips: "04013", county: "Maricopa County" },
  { name: "Philadelphia", state: "PA", fips: "42101", county: "Philadelphia County" },
  { name: "San Antonio", state: "TX", fips: "48029", county: "Bexar County" },
  { name: "San Diego", state: "CA", fips: "06073", county: "San Diego County" },
  { name: "Dallas", state: "TX", fips: "48113", county: "Dallas County" },
  { name: "San Jose", state: "CA", fips: "06085", county: "Santa Clara County" },
  { name: "Austin", state: "TX", fips: "48453", county: "Travis County" },
  { name: "Jacksonville", state: "FL", fips: "12031", county: "Duval County" },
  { name: "Fort Worth", state: "TX", fips: "48439", county: "Tarrant County" },
  { name: "Columbus", state: "OH", fips: "39049", county: "Franklin County" },
  { name: "Indianapolis", state: "IN", fips: "18097", county: "Marion County" },
  { name: "Charlotte", state: "NC", fips: "37119", county: "Mecklenburg County" },
  { name: "San Francisco", state: "CA", fips: "06075", county: "San Francisco County" },
  { name: "Seattle", state: "WA", fips: "53033", county: "King County" },
  { name: "Denver", state: "CO", fips: "08031", county: "Denver County" },
  { name: "Washington", state: "DC", fips: "11001", county: "District of Columbia" },
  { name: "Nashville", state: "TN", fips: "47037", county: "Davidson County" },
  { name: "Oklahoma City", state: "OK", fips: "40109", county: "Oklahoma County" },
  { name: "El Paso", state: "TX", fips: "48141", county: "El Paso County" },
  { name: "Boston", state: "MA", fips: "25025", county: "Suffolk County" },
  { name: "Portland", state: "OR", fips: "41051", county: "Multnomah County" },
  { name: "Las Vegas", state: "NV", fips: "32003", county: "Clark County" },
  { name: "Memphis", state: "TN", fips: "47157", county: "Shelby County" },
  { name: "Detroit", state: "MI", fips: "26163", county: "Wayne County" },
  { name: "Baltimore", state: "MD", fips: "24510", county: "Baltimore City" },
  { name: "Milwaukee", state: "WI", fips: "55079", county: "Milwaukee County" },
  { name: "Albuquerque", state: "NM", fips: "35001", county: "Bernalillo County" },
  { name: "Tucson", state: "AZ", fips: "04019", county: "Pima County" },
  { name: "Fresno", state: "CA", fips: "06019", county: "Fresno County" },
  { name: "Sacramento", state: "CA", fips: "06067", county: "Sacramento County" },
  { name: "Atlanta", state: "GA", fips: "13121", county: "Fulton County" },
  { name: "Miami", state: "FL", fips: "12086", county: "Miami-Dade County" },
  { name: "Minneapolis", state: "MN", fips: "27053", county: "Hennepin County" },
  { name: "Cleveland", state: "OH", fips: "39035", county: "Cuyahoga County" },
  { name: "New Orleans", state: "LA", fips: "22071", county: "Orleans Parish" },
  { name: "Tampa", state: "FL", fips: "12057", county: "Hillsborough County" },
  { name: "Pittsburgh", state: "PA", fips: "42003", county: "Allegheny County" },
];

export const REGIONS: Array<SearchResultItem> = [
  {
    id: "region-midwest",
    type: "region",
    title: "Midwest Region",
    subtitle: "IL, IN, IA, KS, MI, MN, MO, NE, ND, OH, SD, WI",
    coordinates: [-92.0, 41.5],
    zoom: 2.2,
    badge: "Region",
    extraInfo: "12 States • Heart of U.S.",
  },
  {
    id: "region-northeast",
    type: "region",
    title: "Northeast Region",
    subtitle: "CT, ME, MA, NH, NJ, NY, PA, RI, VT",
    coordinates: [-74.5, 42.5],
    zoom: 2.8,
    badge: "Region",
    extraInfo: "9 States • High Density",
  },
  {
    id: "region-south",
    type: "region",
    title: "Southern Region",
    subtitle: "AL, AR, DE, FL, GA, KY, LA, MD, MS, NC, OK, SC, TN, TX, VA, WV",
    coordinates: [-88.0, 32.5],
    zoom: 2.0,
    badge: "Region",
    extraInfo: "16 States • Sun Belt",
  },
  {
    id: "region-west",
    type: "region",
    title: "Western Region",
    subtitle: "AK, AZ, CA, CO, HI, ID, MT, NV, NM, OR, UT, WA, WY",
    coordinates: [-114.0, 39.0],
    zoom: 2.0,
    badge: "Region",
    extraInfo: "13 States • Pacific & Mountain",
  },
  {
    id: "region-metro",
    type: "region",
    title: "Metropolitan Areas (RUCC 1-3)",
    subtitle: "Urban counties with population centers > 50,000",
    coordinates: [-96.0, 38.0],
    zoom: 1.2,
    badge: "Classification",
    extraInfo: "Urbanized Regions",
  },
  {
    id: "region-rural",
    type: "region",
    title: "Rural Areas (RUCC 4-9)",
    subtitle: "Non-metropolitan & rural agricultural counties",
    coordinates: [-96.0, 38.0],
    zoom: 1.2,
    badge: "Classification",
    extraInfo: "Rural Communities",
  },
];

import { CityEntry } from "./data-utils";

interface ScoredResult {
  item: SearchResultItem;
  score: number;
}

export function performSearch(
  query: string,
  countyData: CountyDataMap,
  allCities?: CityEntry[]
): SearchResultItem[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];

  const scored: ScoredResult[] = [];

  // Helper to calculate relevance score
  const getScore = (name: string, subtitle: string = ""): number => {
    const lowerName = name.toLowerCase();
    const lowerSub = subtitle.toLowerCase();

    // 1. Exact match
    if (lowerName === trimmed) return 1000;

    // 2. Starts-with title match (e.g. "Reno" vs "Reno City")
    if (lowerName.startsWith(trimmed)) {
      // Shorter names get slightly higher rank as tie-breaker
      return 800 - Math.min(100, lowerName.length);
    }

    // 3. Word-level starts with (e.g. "El Reno" -> "Reno")
    const words = lowerName.split(/[\s,-]+/);
    if (words.some((w) => w.startsWith(trimmed))) {
      return 600 - Math.min(100, lowerName.length);
    }

    // 4. Substring in title (e.g. "Moreno")
    if (lowerName.includes(trimmed)) {
      return 400 - Math.min(100, lowerName.length);
    }

    // 5. Match in subtitle/county/state
    if (lowerSub.includes(trimmed)) {
      return 200;
    }

    return 0;
  };

  // 1. Search Regions
  REGIONS.forEach((reg) => {
    const score = getScore(reg.title, reg.subtitle);
    if (score > 0) {
      scored.push({ item: reg, score });
    }
  });

  // 2. Search States
  Object.entries(STATE_CENTROIDS).forEach(([code, st]) => {
    const score = Math.max(getScore(st.name, st.code), getScore(st.code, st.name));
    if (score > 0) {
      scored.push({
        item: {
          id: `state-${code}`,
          type: "state",
          title: `${st.name} (${st.code})`,
          subtitle: `State View • Center map on ${st.name}`,
          coordinates: st.coordinates,
          zoom: 2.8,
          badge: "State",
          extraInfo: `State Code: ${st.code}`,
        },
        score: score + 50, // Slight boost for state level search
      });
    }
  });

  // 3. Search Cities (all 40,000+ U.S. cities dataset)
  if (allCities && allCities.length > 0) {
    const seenCityKeys = new Set<string>();
    for (let i = 0; i < allCities.length; i++) {
      const [cityName, stateCode, fips] = allCities[i];
      const countyInfo = countyData[fips];
      const countyName = countyInfo?.County_Name || "";
      const score = getScore(cityName, `${countyName} ${stateCode}`);

      if (score > 0) {
        const cityKey = `${cityName.toLowerCase()}-${stateCode.toLowerCase()}`;
        if (!seenCityKeys.has(cityKey)) {
          seenCityKeys.add(cityKey);
          scored.push({
            item: {
              id: `city-${fips}-${cityName}-${stateCode}`,
              type: "city",
              title: `${cityName}, ${stateCode}`,
              subtitle: countyName ? countyName : `County FIPS: ${fips}`,
              fips: fips,
              badge: "City",
              extraInfo: countyInfo?.overallRisk != null ? `Risk Index: ${countyInfo.overallRisk}/100` : undefined,
            },
            score,
          });
        }
      }
    }
  } else {
    MAJOR_CITIES.forEach((city) => {
      const countyInfo = countyData[city.fips];
      const score = getScore(city.name, `${city.county} ${city.state}`);
      if (score > 0) {
        scored.push({
          item: {
            id: `city-${city.fips}`,
            type: "city",
            title: city.name,
            subtitle: `${city.county}, ${city.state}`,
            fips: city.fips,
            badge: "City",
            extraInfo: countyInfo?.overallRisk != null ? `Risk Index: ${countyInfo.overallRisk}/100` : undefined,
          },
          score,
        });
      }
    });
  }

  // 4. Search Counties
  Object.entries(countyData).forEach(([fips, data]) => {
    const fullName = data.County_Name || "";
    const score = Math.max(getScore(fullName, fips), fips === trimmed ? 900 : 0);
    if (score > 0) {
      scored.push({
        item: {
          id: `county-${fips}`,
          type: "county",
          title: fullName,
          subtitle: `FIPS: ${fips} • Pop: ${data.population?.toLocaleString() || "N/A"}`,
          fips: fips,
          badge: "County",
          extraInfo: data.overallRisk != null ? `Vulnerability: ${data.overallRisk}/100` : undefined,
        },
        score,
      });
    }
  });

  // Sort strictly by relevance score descending
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, 35).map((s) => s.item);
}


