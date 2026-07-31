"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import MapContainer, { MapMetric } from "@/app/_components/map/MapContainer";
import SidePanel from "@/app/_components/sidebar/SidePanel";
import Header from "@/app/_components/header/Header";
import SearchModal from "@/app/_components/search/SearchModal";
import AnalysisView from "@/app/_components/analysis/AnalysisView";
import CountyCompareModal from "@/app/_components/analysis/CountyCompareModal";
import ReportExporter, { ReportMode } from "@/app/_components/ui/ReportExporter";
import DataSourcesView from "@/app/_components/sources/DataSourcesView";
import Toast from "@/app/_components/ui/Toast";
import MyDistrictPanel from "@/app/_components/ui/MyDistrictPanel";
import AppLoadingScreen from "@/app/_components/ui/AppLoadingScreen";
import { fetchCountyData, fetchCitiesData, CityEntry } from "@/app/_lib/data-utils";
import { CountyDataMap } from "@/app/_lib/types";
import { SearchResultItem, coordsFromFips } from "@/app/_lib/search-utils";
import { TemporalYear, AVAILABLE_YEARS } from "@/app/_lib/temporal-data";
import { useSimpleMode } from "@/app/_lib/simple-mode-context";
import { MY_DISTRICT } from "@/app/_lib/district-data";
import { Loader2, BarChart2, X, ChevronUp, SquaresSubtract } from "lucide-react";

function normalizeMetric(param: string | null): MapMetric {
  if (!param) return "overallRisk";
  const p = param.toLowerCase();
  if (p === "pm25" || p === "pm25avg") return "pm25Avg";
  if (p === "overall" || p === "overallrisk") return "overallRisk";
  if (p === "mortality" || p === "mortalityrate") return "mortalityRate";
  if (p === "asthma" || p === "asthmaprev") return "asthmaPrev";
  if (p === "copd" || p === "copdprev") return "copdPrev";
  if (p === "smoking" || p === "smokingprev") return "smokingPrev";
  if (p === "rucc") return "rucc";
  if (p === "md" || p === "mdrate") return "mdRate";
  if (p === "toxics" || p === "toxic" || p === "toxicreleases") return "toxicReleases";
  return "overallRisk";
}

function normalizeView(param: string | null): "map" | "analysis" | "sources" {
  if (!param) return "map";
  const p = param.toLowerCase();
  if (p === "analysis" || p === "lab") return "analysis";
  if (p === "sources" || p === "data") return "sources";
  return "map";
}

function USSEERMain() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { isSimpleMode, toggleSimpleMode } = useSimpleMode();

  const [data, setData] = useState<CountyDataMap | null>(null);
  const [citiesData, setCitiesData] = useState<CityEntry[]>([]);
  const [selectedFips, setSelectedFips] = useState<string | null>(null);
  const [mapMetric, setMapMetric] = useState<MapMetric>("overallRisk");
  const [selectedYear, setSelectedYear] = useState<TemporalYear>(2024);
  const [isLoading, setIsLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [compareFipsA, setCompareFipsA] = useState<string>("48201");
  const [compareFipsB, setCompareFipsB] = useState<string>("17031");

  // Report Exporter state
  const [isExporterOpen, setIsExporterOpen] = useState(false);
  const [exporterFipsA, setExporterFipsA] = useState<string>("48201");
  const [exporterFipsB, setExporterFipsB] = useState<string>("17031");
  const [exporterMode, setExporterMode] = useState<ReportMode>("single");
  const [activeView, setActiveView] = useState<"map" | "analysis" | "sources">("map");
  const [mapTarget, setMapTarget] = useState<{ coordinates: [number, number]; zoom: number; label?: string } | null>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [autoOpenAnalytics, setAutoOpenAnalytics] = useState(true);
  const [isDistrictOpen, setIsDistrictOpen] = useState(false);

  // Toast notification state
  const [toastOpen, setToastOpen] = useState(false);
  const [toastTitle, setToastTitle] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  // Initial URL query parameter hydration
  useEffect(() => {
    const fipsParam = searchParams.get("fips");
    const metricParam = searchParams.get("metric");
    const viewParam = searchParams.get("view");
    const yearParam = searchParams.get("year");

    if (metricParam) {
      setMapMetric(normalizeMetric(metricParam));
    }
    if (viewParam) {
      setActiveView(normalizeView(viewParam));
    }
    if (yearParam) {
      const yr = Number(yearParam);
      if (AVAILABLE_YEARS.includes(yr as any)) {
        setSelectedYear(yr as TemporalYear);
      }
    }
    if (fipsParam) {
      setSelectedFips(fipsParam);
      const coords = coordsFromFips(fipsParam);
      if (coords) {
        setMapTarget({
          coordinates: coords,
          zoom: 4.0,
          label: `FIPS ${fipsParam}`,
        });
      }
    }
  }, [searchParams]);

  // Sync state back to URL search params
  const updateUrlParams = useCallback(
    (fips: string | null, metric: MapMetric, view: "map" | "analysis" | "sources", year: TemporalYear) => {
      if (typeof window === "undefined") return;
      const params = new URLSearchParams(window.location.search);

      if (fips) {
        params.set("fips", fips);
      } else {
        params.delete("fips");
      }

      if (metric && metric !== "overallRisk") {
        params.set("metric", metric);
      } else {
        params.delete("metric");
      }

      if (view && view !== "map") {
        params.set("view", view);
      } else {
        params.delete("view");
      }

      if (year && year !== 2024) {
        params.set("year", String(year));
      } else {
        params.delete("year");
      }

      const queryString = params.toString();
      const currentBasePath = pathname === "/map" ? "/map" : "/";
      const newUrl = queryString ? `${currentBasePath}?${queryString}` : currentBasePath;
      window.history.replaceState(null, "", newUrl);
    },
    [pathname]
  );

  useEffect(() => {
    updateUrlParams(selectedFips, mapMetric, activeView, selectedYear);
  }, [selectedFips, mapMetric, activeView, selectedYear, updateUrlParams]);

  // Handle browser back/forward buttons (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const fipsParam = params.get("fips");
      const metricParam = params.get("metric");
      const viewParam = params.get("view");

      setSelectedFips(fipsParam);
      setMapMetric(normalizeMetric(metricParam));
      setActiveView(normalizeView(viewParam));

      if (fipsParam) {
        const coords = coordsFromFips(fipsParam);
        if (coords) {
          setMapTarget({
            coordinates: coords,
            zoom: 4.0,
            label: `FIPS ${fipsParam}`,
          });
        }
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

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

  // Open mobile drawer when a county is selected on smaller screens if autoOpenAnalytics is enabled
  const handleSelectCounty = (fips: string) => {
    if (selectedFips === fips) {
      setSelectedFips(null);
      setIsMobileDrawerOpen(false);
    } else {
      setSelectedFips(fips);
      if (autoOpenAnalytics && window.innerWidth < 768) {
        setIsMobileDrawerOpen(true);
      }
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

  const handleShareLink = () => {
    if (typeof window === "undefined") return;
    const origin = window.location.origin;
    const params = new URLSearchParams();

    if (selectedFips) params.set("fips", selectedFips);
    if (mapMetric) params.set("metric", mapMetric);
    if (activeView) params.set("view", activeView);

    const shareUrl = `${origin}/map?${params.toString()}`;

    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        const countyLabel = selectedFips && data?.[selectedFips] ? data[selectedFips].County_Name : null;
        setToastTitle("Share Link Copied!");
        setToastMessage(
          countyLabel
            ? `Copied bookmark for ${countyLabel} (${selectedFips}) to clipboard.`
            : `Copied current view bookmark URL to clipboard.`
        );
        setToastOpen(true);
      })
      .catch((err) => {
        console.error("Failed to copy link:", err);
        setToastTitle("Share Link Ready");
        setToastMessage(shareUrl);
        setToastOpen(true);
      });
  };

  const selectedCountyName = selectedFips && data?.[selectedFips] ? data[selectedFips].County_Name : null;

  const handleOpenCompare = (initialA?: string) => {
    if (initialA) {
      setCompareFipsA(initialA);
    }
    setIsCompareOpen(true);
  };

  const handleOpenExporter = (fipsA?: string, fipsB?: string) => {
    if (fipsB) {
      setExporterFipsA(fipsA || "48201");
      setExporterFipsB(fipsB);
      setExporterMode("compare");
    } else if (fipsA) {
      setExporterFipsA(fipsA);
      setExporterMode("single");
    } else if (selectedFips) {
      setExporterFipsA(selectedFips);
      setExporterMode("single");
    } else {
      setExporterFipsA("48201");
      setExporterMode("single");
    }
    setIsExporterOpen(true);
  };

  const handleZoomToDistrict = () => {
    setActiveView("map");
    setMapTarget({
      coordinates: MY_DISTRICT.mapCenter as [number, number],
      zoom: MY_DISTRICT.mapZoom,
      label: `NV-${MY_DISTRICT.districtNumber.toString().padStart(2, "0")} — ${MY_DISTRICT.representative}`,
    });
    // Also select home county (Washoe) so SidePanel opens with local data
    setSelectedFips(MY_DISTRICT.homeCountyFips);
  };

  const handleResetApp = useCallback(() => {
    setIsResetting(true);
    setSelectedFips(null);
    setMapMetric("overallRisk");
    setSelectedYear(2024);
    setActiveView("map");
    setMapTarget(null);
    setIsMobileDrawerOpen(false);

    if (typeof window !== "undefined") {
      const currentBasePath = pathname === "/map" ? "/map" : "/";
      window.history.replaceState(null, "", currentBasePath);
    }

    setTimeout(() => {
      setIsResetting(false);
      setToastTitle("Workspace Reset");
      setToastMessage("Restored default map view, metrics, and parameters.");
      setToastOpen(true);
    }, 750);
  }, [pathname]);

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-background text-foreground p-3.5 sm:p-5 gap-3.5 sm:gap-4 overflow-hidden pt-4 sm:pt-6 pb-4 sm:pb-5">
      {/* Fullscreen Overlay Loading Screen (Pre-loads App in Background) */}
      <AppLoadingScreen isLoading={isLoading} isResetting={isResetting} />

      {/* Top Navigation & Control Header */}
      <Header
        isDarkMode={isDarkMode}
        onToggleDarkMode={handleToggleDarkMode}
        isSimpleMode={isSimpleMode}
        onToggleSimpleMode={toggleSimpleMode}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenCompare={() => handleOpenCompare()}
        onOpenExporter={() => handleOpenExporter()}
        onShareLink={handleShareLink}
        onOpenDistrict={() => setIsDistrictOpen(true)}
        activeView={activeView}
        onViewChange={setActiveView}
      />

      {/* Main Container */}
      <main className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
        {activeView === "map" ? (
          <div className="flex-1 flex flex-col md:flex-row gap-3 sm:gap-3.5 min-h-0 relative animate-in fade-in-50 zoom-in-98 duration-400">
            {/* Map Section */}
            <section className="flex-1 h-full min-h-0 flex flex-col">
              <MapContainer
                data={data || {}}
                allCities={citiesData}
                selectedFips={selectedFips}
                onSelectCounty={handleSelectCounty}
                metric={mapMetric}
                onMetricChange={setMapMetric}
                mapTarget={mapTarget}
                onClearTarget={() => setMapTarget(null)}
                autoOpenAnalytics={autoOpenAnalytics}
                onToggleAutoOpenAnalytics={setAutoOpenAnalytics}
                selectedYear={selectedYear}
                onYearChange={setSelectedYear}
              />
            </section>

            {/* Desktop Sidebar Analytics */}
            <aside className="hidden md:flex md:w-[380px] lg:w-[420px] xl:w-[460px] w-full h-full flex-shrink-0">
              <SidePanel
                fips={selectedFips}
                countyData={selectedFips && data ? data[selectedFips] : null}
                allCountyData={data}
                onOpenCompare={handleOpenCompare}
                onOpenExporter={handleOpenExporter}
                selectedYear={selectedYear}
                onYearChange={setSelectedYear}
              />
            </aside>

            {/* Floating Mobile Bottom Bar Button */}
            {selectedFips && (
              <button
                onClick={() => setIsMobileDrawerOpen(true)}
                className="md:hidden absolute bottom-3 left-3 z-30 flex items-center gap-2 px-3.5 py-2 rounded-full bg-primary text-primary-foreground font-bold text-xs shadow-2xl active:scale-95 transition-all duration-300 animate-in fade-in-50 slide-in-from-bottom-3 hover:scale-105"
                aria-label="View county analytics"
              >
                <BarChart2 className="w-4 h-4 animate-pulse" />
                <span>{selectedCountyName ? `${selectedCountyName}` : "Analytics"}</span>
                <ChevronUp className="w-4 h-4 ml-0.5" />
              </button>
            )}

            {/* Mobile Drawer */}
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
                      allCountyData={data}
                      onOpenCompare={handleOpenCompare}
                      onOpenExporter={handleOpenExporter}
                      selectedYear={selectedYear}
                      onYearChange={setSelectedYear}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : activeView === "analysis" ? (
          <AnalysisView
            data={data || {}}
            onOpenExporter={handleOpenExporter}
            selectedFips={selectedFips}
          />
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

      {/* Dual-County Side-by-Side Comparison Modal */}
      {data && (
        <CountyCompareModal
          isOpen={isCompareOpen}
          onClose={() => setIsCompareOpen(false)}
          countyDataMap={data}
          initialFipsA={compareFipsA}
          initialFipsB={compareFipsB}
          onOpenExporter={handleOpenExporter}
        />
      )}

      {/* PDF & Executive Summary Exporter Modal */}
      {data && (
        <ReportExporter
          isOpen={isExporterOpen}
          onClose={() => setIsExporterOpen(false)}
          countyDataMap={data}
          initialFipsA={exporterFipsA}
          initialFipsB={exporterFipsB}
          initialMode={exporterMode}
        />
      )}

      {/* My District Panel — NV-02 */}
      {data && (
        <MyDistrictPanel
          isOpen={isDistrictOpen}
          onClose={() => setIsDistrictOpen(false)}
          countyDataMap={data}
          onZoomToDistrict={handleZoomToDistrict}
          onSelectCounty={(fips) => {
            handleSelectCounty(fips);
            setMapTarget({
              coordinates: MY_DISTRICT.mapCenter as [number, number],
              zoom: MY_DISTRICT.mapZoom,
              label: MY_DISTRICT.homeCountyName,
            });
            setActiveView("map");
          }}
        />
      )}

      {/* Toast Notification Container */}
      <Toast
        isOpen={toastOpen}
        title={toastTitle}
        message={toastMessage}
        onClose={() => setToastOpen(false)}
      />

      {/* Floating Bottom-Right Simplify Mode Toggle Widget (Desktop only, included in Header menu on Mobile) */}
      <button
        id="floating-simple-mode-btn"
        onClick={toggleSimpleMode}
        title={isSimpleMode ? "Switch to standard detailed mode" : "Switch to Simplify mode (plain English summary)"}
        aria-label="Toggle Simplify mode"
        className={`hidden md:flex fixed bottom-5 right-5 z-40 group cursor-pointer items-center gap-2.5 px-4 py-2.5 rounded-full border text-xs font-bold transition-all duration-300 shadow-xl backdrop-blur-xl active:scale-95 hover:scale-105 ${
          isSimpleMode
            ? "bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-amber-500/10 border-amber-500/50 text-amber-400 shadow-amber-500/15 ring-1 ring-amber-500/30"
            : "bg-card/90 border-border/80 text-muted-foreground hover:text-foreground hover:bg-card hover:border-primary/40 hover:shadow-primary/10"
        }`}
      >
        <span
          className={`w-2 h-2 rounded-full transition-all duration-300 ${
            isSimpleMode
              ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)] animate-pulse"
              : "bg-muted-foreground/40 group-hover:bg-primary/70"
          }`}
        />
        <SquaresSubtract
          className={`w-4 h-4 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110 ${
            isSimpleMode ? "text-amber-400" : "text-muted-foreground group-hover:text-primary"
          }`}
        />
        <span className="select-none tracking-tight">
          {isSimpleMode ? "Simplified" : "Simplify"}
        </span>
      </button>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="w-full h-screen flex flex-col items-center justify-center bg-background text-foreground gap-3">
          <Loader2 className="h-7 w-7 text-primary animate-spin" />
          <p className="text-xs font-semibold text-muted-foreground">Initializing US-SEER Engine…</p>
        </div>
      }
    >
      <USSEERMain />
    </Suspense>
  );
}
