import { CountyDataMap } from './types';

// We'll use a widely available TopoJSON file for US counties via CDN for the mock
export const GEO_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json";

export async function fetchCountyData(): Promise<CountyDataMap> {
  const res = await fetch('/data/county_data.json');
  if (!res.ok) {
    throw new Error('Failed to fetch county data');
  }
  const rawData: CountyDataMap = await res.json();

  // Compute composite overall health risk score (0-100 index) combining all environmental & health metrics
  Object.values(rawData).forEach((county) => {
    const pm25Norm = Math.min(100, Math.max(0, (((county.pm25Avg || 6.5) - 5.5) / (9.0 - 5.5)) * 100));
    const mortalityNorm = Math.min(100, Math.max(0, (((county.mortalityRate || 50) - 36) / (113 - 36)) * 100));
    const asthmaNorm = Math.min(100, Math.max(0, (((county.asthmaPrev || 9.5) - 8.9) / (11.4 - 8.9)) * 100));
    const copdNorm = Math.min(100, Math.max(0, (((county.copdPrev || 7.5) - 5.8) / (11.2 - 5.8)) * 100));
    const smokingNorm = Math.min(100, Math.max(0, (((county.smokingPrev || 18) - 15.4) / (25.4 - 15.4)) * 100));
    const toxicNorm = Math.min(100, Math.max(0, ((county.toxicReleases || 0) / 500000) * 100));
    const mdNorm = Math.min(100, Math.max(0, ((400 - (county.mdRate || 300)) / (400 - 250)) * 100));
    const ruccNorm = Math.min(100, Math.max(0, (((county.rucc || 3) - 1) / (9 - 1)) * 100));

    // Weighted overall composite risk index
    county.overallRisk = Math.round(
      pm25Norm * 0.20 +
      mortalityNorm * 0.20 +
      asthmaNorm * 0.15 +
      copdNorm * 0.15 +
      toxicNorm * 0.10 +
      smokingNorm * 0.10 +
      mdNorm * 0.05 +
      ruccNorm * 0.05
    );
  });

  return rawData;
}

export type CityEntry = [string, string, string]; // [City Name, State Code, StCnty FIPS Code]

export async function fetchCitiesData(): Promise<CityEntry[]> {
  try {
    const res = await fetch('/data/cities.json');
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.error("Failed to fetch cities data:", e);
    return [];
  }
}

