"use client";

import { useEffect, useState } from "react";
import MapContainer, { MapMetric } from "@/app/_components/map/MapContainer";
import SidePanel from "@/app/_components/sidebar/SidePanel";
import Header from "@/app/_components/header/Header";
import SearchModal from "@/app/_components/search/SearchModal";
import AnalysisView from "@/app/_components/analysis/AnalysisView";
import { fetchCountyData, fetchCitiesData, CityEntry } from "@/app/_lib/data-utils";
import { CountyDataMap } from "@/app/_lib/types";
import { SearchResultItem, coordsFromFips } from "@/app/_lib/search-utils";
import { Loader2 } from "lucide-react";

export default function Home() {
  const [data, setData] = useState<CountyDataMap | null>(null);
  const [citiesData, setCitiesData] = useState<CityEntry[]>([]);
  const [selectedFips, setSelectedFips] = useState<string | null>(null);
  const [mapMetric, setMapMetric] = useState<MapMetric>("overallRisk");
  const [isLoading, setIsLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeView, setActiveView] = useState<"map" | "analysis">("map");
  const [mapTarget, setMapTarget] = useState<{ coordinates: [number, number]; zoom: number; label?: string } | null>(null);

  useEffect(() => {
    // Check initial dark mode state
    const isDark = document.documentElement.classList.contains("dark") || true;
    setIsDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add("dark");
    }

    async function loadData() {
      try {
        const [countyData, cities] = await Promise.all([
          fetchCountyData(),
          fetchCitiesData(),
        ]);
        setData(countyData);
        setCitiesData(cities);
      } catch (err) {
        console.error("Failed to load county data:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);


  // Global keyboard shortcut for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleToggleDarkMode = () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const handleSelectSearchResult = (result: SearchResultItem) => {
    if (result.fips) {
      setSelectedFips(result.fips);
      // Resolve coordinates: use explicit coords if present, otherwise derive from FIPS → state centroid
      const coords = result.coordinates ?? coordsFromFips(result.fips) ?? [-96, 38] as [number, number];
      setMapTarget({
        coordinates: coords,
        zoom: result.zoom ?? (result.type === "city" ? 4.5 : 4.0),
        label: result.title,
      });
      setActiveView("map");
    } else if (result.coordinates) {
      setMapTarget({
        coordinates: result.coordinates,
        zoom: result.zoom ?? 2.5,
        label: result.title,
      });
      setActiveView("map");
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-background text-foreground p-2.5 sm:p-3 gap-2.5 sm:gap-3 overflow-hidden">
      {/* Top Navigation & Control Header */}
      <Header
        mapMetric={mapMetric}
        onMetricChange={setMapMetric}
        isDarkMode={isDarkMode}
        onToggleDarkMode={handleToggleDarkMode}
        onOpenSearch={() => setIsSearchOpen(true)}
        activeView={activeView}
        onViewChange={setActiveView}
      />

      {/* Main Container */}
      <main className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {isLoading ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-card border border-border rounded-xl shadow-xs gap-3">
            <Loader2 className="h-7 w-7 text-primary animate-spin" />
            <div className="text-center">
              <p className="text-xs font-semibold text-foreground">Loading Geospatial Data</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Fetching county health metrics…</p>
            </div>
          </div>
        ) : activeView === "map" ? (
          <div className="flex-1 flex flex-col md:flex-row gap-2.5 sm:gap-3 min-h-0">
            {/* Map Section */}
            <section className="flex-1 h-full min-h-0 flex flex-col">
              <MapContainer
                data={data || {}}
                selectedFips={selectedFips}
                onSelectCounty={setSelectedFips}
                metric={mapMetric}
                mapTarget={mapTarget}
                onClearTarget={() => setMapTarget(null)}
              />
            </section>

            {/* Sidebar Analytics */}
            <aside className="w-full md:w-[360px] lg:w-[400px] h-auto md:h-full flex-shrink-0">
              <SidePanel
                fips={selectedFips}
                countyData={selectedFips && data ? data[selectedFips] : null}
              />
            </aside>
          </div>
        ) : (
          <AnalysisView data={data || {}} />
        )}
      </main>

      {/* Search Dialog Modal */}
      {data && (
        <SearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          countyData={data}
          allCities={citiesData}
          onSelectResult={handleSelectSearchResult}
        />
      )}
    </div>
  );
}
