"use client";

import { useEffect, useState } from "react";
import MapContainer, { MapMetric } from "@/app/_components/map/MapContainer";
import SidePanel from "@/app/_components/sidebar/SidePanel";
import Header from "@/app/_components/header/Header";
import SearchModal from "@/app/_components/search/SearchModal";
import AnalysisView from "@/app/_components/analysis/AnalysisView";
import DataSourcesView from "@/app/_components/sources/DataSourcesView";
import { fetchCountyData, fetchCitiesData, CityEntry } from "@/app/_lib/data-utils";
import { CountyDataMap } from "@/app/_lib/types";
import { SearchResultItem, coordsFromFips } from "@/app/_lib/search-utils";
import { Loader2, BarChart2, X, ChevronUp } from "lucide-react";

export default function Home() {
  const [data, setData] = useState<CountyDataMap | null>(null);
  const [citiesData, setCitiesData] = useState<CityEntry[]>([]);
  const [selectedFips, setSelectedFips] = useState<string | null>(null);
  const [mapMetric, setMapMetric] = useState<MapMetric>("overallRisk");
  const [isLoading, setIsLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeView, setActiveView] = useState<"map" | "analysis" | "sources">("map");
  const [mapTarget, setMapTarget] = useState<{ coordinates: [number, number]; zoom: number; label?: string } | null>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

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

  // Open mobile drawer when a county is selected on smaller screens
  const handleSelectCounty = (fips: string) => {
    setSelectedFips(fips);
    if (window.innerWidth < 768) {
      setIsMobileDrawerOpen(true);
    }
  };

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
      handleSelectCounty(result.fips);
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

  const selectedCountyName = selectedFips && data?.[selectedFips] ? data[selectedFips].County_Name : null;

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-background text-foreground p-3.5 sm:p-5 gap-3.5 sm:gap-4 overflow-hidden pt-4 sm:pt-6 pb-4 sm:pb-5">
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
      <main className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
        {isLoading ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-card border border-border rounded-xl shadow-xs gap-3 animate-in fade-in duration-300">
            <Loader2 className="h-7 w-7 text-primary animate-spin" />
            <div className="text-center">
              <p className="text-xs font-semibold text-foreground">Loading Geospatial Data</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Fetching county health metrics…</p>
            </div>
          </div>
        ) : activeView === "map" ? (
          <div className="flex-1 flex flex-col md:flex-row gap-3 sm:gap-3.5 min-h-0 relative animate-in fade-in-50 zoom-in-98 duration-400">
            {/* Map Section */}
            <section className="flex-1 h-full min-h-0 flex flex-col">
              <MapContainer
                data={data || {}}
                selectedFips={selectedFips}
                onSelectCounty={handleSelectCounty}
                metric={mapMetric}
                mapTarget={mapTarget}
                onClearTarget={() => setMapTarget(null)}
              />
            </section>

            {/* Desktop Sidebar Analytics */}
            <aside className="hidden md:flex md:w-[380px] lg:w-[420px] xl:w-[460px] w-full h-full flex-shrink-0">
              <SidePanel
                fips={selectedFips}
                countyData={selectedFips && data ? data[selectedFips] : null}
              />
            </aside>

            {/* Floating Mobile Bottom Bar Button */}
            {selectedFips && (
              <button
                onClick={() => setIsMobileDrawerOpen(true)}
                className="md:hidden absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-4.5 py-2.5 rounded-full bg-primary text-primary-foreground font-bold text-xs shadow-2xl active:scale-95 transition-all duration-300 animate-in fade-in-50 slide-in-from-bottom-3 hover:scale-105"
                aria-label="View county analytics"
              >
                <BarChart2 className="w-4 h-4 animate-pulse" />
                <span>{selectedCountyName ? `${selectedCountyName} Analytics` : "View Details"}</span>
                <ChevronUp className="w-4 h-4 ml-0.5" />
              </button>
            )}

            {/* Mobile Sheet / Bottom Drawer Overlay */}
            {isMobileDrawerOpen && (
              <div className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-200">
                <div
                  className="fixed inset-0"
                  onClick={() => setIsMobileDrawerOpen(false)}
                />
                <div className="relative z-50 bg-card border-t border-border rounded-t-2xl max-h-[85vh] h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300 pb-safe">
                  {/* Sheet Handle Header */}
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/40 shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-1 rounded-full bg-muted-foreground/30 mx-auto absolute top-2 left-1/2 -translate-x-1/2" />
                      <span className="text-xs font-bold text-foreground">
                        {selectedCountyName ? `${selectedCountyName} Health Profile` : "County Analytics"}
                      </span>
                    </div>
                    <button
                      onClick={() => setIsMobileDrawerOpen(false)}
                      className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                      aria-label="Close analytics drawer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {/* Sheet Body with SidePanel */}
                  <div className="flex-1 overflow-hidden">
                    <SidePanel
                      fips={selectedFips}
                      countyData={selectedFips && data ? data[selectedFips] : null}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : activeView === "analysis" ? (
          <AnalysisView data={data || {}} />
        ) : (
          <DataSourcesView />
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
