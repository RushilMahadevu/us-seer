"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
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
import TutorialTourModal from "@/app/_components/ui/TutorialTourModal";
import WelcomeTourBanner from "@/app/_components/ui/WelcomeTourBanner";
import ModeSelectionModal from "@/app/_components/ui/ModeSelectionModal";
import AppLoadingScreen from "@/app/_components/ui/AppLoadingScreen";
import { fetchCountyData, fetchCitiesData, CityEntry } from "@/app/_lib/data-utils";
import { CountyDataMap } from "@/app/_lib/types";
import { SearchResultItem, coordsFromFips } from "@/app/_lib/search-utils";
import { TemporalYear, AVAILABLE_YEARS } from "@/app/_lib/temporal-data";
import { useSimpleMode } from "@/app/_lib/simple-mode-context";
import { MY_DISTRICT } from "@/app/_lib/district-data";
import { Loader2, BarChart2, X, ChevronUp, SquaresSubtract, PanelRightOpen, PanelRightClose, GripVertical } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

function USSEERMapDashboard() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
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
  const [isTourOpen, setIsTourOpen] = useState(false);
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

  // Desktop sidebar collapse & resizing state
  const [sidebarWidth, setSidebarWidth] = useState<number>(420);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isResizingSidebar, setIsResizingSidebar] = useState<boolean>(false);

  // Hydrate sidebar width & collapse state from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedWidth = localStorage.getItem("usseer_sidebar_width");
      if (savedWidth) {
        const parsed = parseInt(savedWidth, 10);
        if (!isNaN(parsed) && parsed >= 300 && parsed <= 800) {
          setSidebarWidth(parsed);
        }
      }
      const savedCollapsed = localStorage.getItem("usseer_sidebar_collapsed");
      if (savedCollapsed !== null) {
        setIsSidebarCollapsed(savedCollapsed === "true");
      }
    }
  }, []);

  const handleToggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("usseer_sidebar_collapsed", String(next));
      }
      return next;
    });
  }, []);

  // Keyboard shortcut: Cmd+\ or Ctrl+\ to toggle sidebar collapse
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
        e.preventDefault();
        handleToggleSidebar();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleToggleSidebar]);

  // Sidebar drag resizer handlers (Desktop only)
  const handleMouseDownResizer = (e: React.MouseEvent) => {
    if (window.innerWidth < 768) return;
    e.preventDefault();
    setIsResizingSidebar(true);
  };

  useEffect(() => {
    if (!isResizingSidebar) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (window.innerWidth < 768) return;
      const containerRight = window.innerWidth - 20;
      const calculatedWidth = containerRight - e.clientX;
      const maxAllowed = Math.min(800, Math.floor(window.innerWidth * 0.55));
      const clampedWidth = Math.max(300, Math.min(maxAllowed, calculatedWidth));
      setSidebarWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizingSidebar(false);
      if (typeof window !== "undefined") {
        localStorage.setItem("usseer_sidebar_width", String(sidebarWidth));
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizingSidebar, sidebarWidth]);

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
      const currentBasePath = "/map";
      const newUrl = queryString ? `${currentBasePath}?${queryString}` : currentBasePath;
      window.history.replaceState(null, "", newUrl);
    },
    []
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

  const handleToggleDarkMode = () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const handleOpenSearch = () => {
    setIsSearchOpen(true);
  };

  const handleSelectSearchResult = (result: SearchResultItem) => {
    if (result.type === "county" && result.fips) {
      setSelectedFips(result.fips);
      const coords = coordsFromFips(result.fips);
      if (coords) {
        setMapTarget({
          coordinates: coords,
          zoom: 4.0,
          label: result.title,
        });
      }
      if (autoOpenAnalytics && window.innerWidth < 768) {
        setIsMobileDrawerOpen(true);
      }
    } else if (result.type === "state" && result.coordinates) {
      setMapTarget({
        coordinates: result.coordinates,
        zoom: result.zoom || 2.0,
        label: result.title,
      });
    } else if (result.type === "city" && result.coordinates) {
      if (result.fips) {
        setSelectedFips(result.fips);
      }
      setMapTarget({
        coordinates: result.coordinates,
        zoom: result.zoom || 4.5,
        label: result.title,
      });
      if (result.fips && autoOpenAnalytics && window.innerWidth < 768) {
        setIsMobileDrawerOpen(true);
      }
    }
  };

  const handleResetMap = () => {
    setSelectedFips(null);
    setMapMetric("overallRisk");
    setSelectedYear(2024);
    setIsResetting(true);
    setIsMobileDrawerOpen(false);
    setTimeout(() => setIsResetting(false), 50);
  };

  const handleZoomToDistrict = () => {
    setMapTarget({
      coordinates: MY_DISTRICT.mapCenter as [number, number],
      zoom: MY_DISTRICT.mapZoom,
      label: "Nevada 2nd Congressional District (NV-02)",
    });
  };

  const handleOpenCompare = (fipsA?: string, fipsB?: string) => {
    if (fipsA) setCompareFipsA(fipsA);
    if (fipsB) setCompareFipsB(fipsB);
    setIsCompareOpen(true);
  };

  const handleOpenExporter = (fipsA?: string, fipsB?: string, mode?: ReportMode) => {
    if (fipsA) setExporterFipsA(fipsA);
    if (fipsB) setExporterFipsB(fipsB);
    if (mode) setExporterMode(mode);
    setIsExporterOpen(true);
  };

  const handleShareLink = () => {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setToastTitle("Link Copied!");
      setToastMessage("The direct URL with your current metric, view, and county selection was copied to clipboard.");
      setToastOpen(true);
    });
  };

  const handleViewChange = (view: "map" | "analysis" | "sources") => {
    setActiveView(view);
    if (view === "analysis") {
      router.push("/lab");
    } else if (view === "sources") {
      router.push("/sources");
    }
  };

  const selectedCountyName =
    selectedFips && data && data[selectedFips]
      ? data[selectedFips].County_Name || `FIPS ${selectedFips}`
      : null;

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-background text-foreground p-3.5 sm:p-5 gap-3.5 sm:gap-4 overflow-hidden pt-4 sm:pt-6 pb-4 sm:pb-5 relative">
      {/* Smooth Loading & Resetting Overlay */}
      <AppLoadingScreen isLoading={isLoading} isResetting={isResetting} />

      {/* Top Navigation & Control Header */}
      <Header
        mapMetric={mapMetric}
        onMetricChange={setMapMetric}
        isDarkMode={isDarkMode}
        onToggleDarkMode={handleToggleDarkMode}
        isSimpleMode={isSimpleMode}
        onToggleSimpleMode={toggleSimpleMode}
        onOpenSearch={handleOpenSearch}
        onOpenCompare={() => handleOpenCompare(selectedFips || "48201", "17031")}
        onOpenExporter={() => handleOpenExporter(selectedFips || "48201", undefined, "single")}
        onShareLink={handleShareLink}
        onOpenDistrict={() => setIsDistrictOpen(true)}
        onStartTour={() => setIsTourOpen(true)}
        activeView={activeView}
        onViewChange={handleViewChange}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={handleToggleSidebar}
      />

      {/* Main Content Area */}
      <main className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
        <AnimatePresence mode="wait">
          {activeView === "map" && (
            <motion.div
              key="map"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full h-full flex flex-col md:flex-row gap-3 min-h-0 overflow-hidden relative"
            >
              {/* Map Canvas Container */}
              <section className="flex-1 h-full min-h-0 min-w-0 flex flex-col relative overflow-hidden rounded-2xl border border-border bg-card">
                <MapContainer
                  data={data || {}}
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
                  allCities={citiesData}
                />

                {/* Collapsed Sidebar Restore Floating Tab (Desktop only) */}
                {isSidebarCollapsed && (
                  <button
                    onClick={handleToggleSidebar}
                    title="Expand county analytics sidebar (Cmd+\)"
                    aria-label="Expand sidebar"
                    className="hidden md:flex absolute top-4 right-4 z-30 items-center gap-2 px-3 py-2 rounded-xl bg-card/90 border border-border shadow-lg backdrop-blur-md text-xs font-semibold text-foreground hover:bg-card hover:border-primary/40 transition-all duration-200 active:scale-95 group cursor-pointer"
                  >
                    <PanelRightOpen className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                    <span>Show Analytics</span>
                    {selectedFips && (
                      <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    )}
                  </button>
                )}
              </section>

              {/* Desktop SidePanel with Smooth Spring Collapse & Resizing */}
              <AnimatePresence initial={false}>
                {!isSidebarCollapsed && (
                  <motion.div
                    key="desktop-sidebar-container"
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: sidebarWidth + 10, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={
                      isResizingSidebar
                        ? { duration: 0 }
                        : { type: "spring", stiffness: 300, damping: 32 }
                    }
                    className="hidden md:flex h-full min-h-0 flex-row overflow-hidden shrink-0"
                  >
                    {/* Resizer Handle Bar */}
                    <div
                      onMouseDown={handleMouseDownResizer}
                      onDoubleClick={() => {
                        setSidebarWidth(420);
                        if (typeof window !== "undefined") {
                          localStorage.setItem("usseer_sidebar_width", "420");
                        }
                      }}
                      title="Drag to resize sidebar width • Double-click to reset (420px)"
                      className={`flex relative z-20 items-center justify-center w-2.5 -mx-1 hover:w-3.5 cursor-col-resize group select-none transition-all duration-150 shrink-0 ${
                        isResizingSidebar ? "w-3.5 bg-primary/20" : ""
                      }`}
                    >
                      <div
                        className={`w-1 h-14 rounded-full transition-all duration-150 flex items-center justify-center ${
                          isResizingSidebar
                            ? "bg-primary shadow-[0_0_10px_rgba(59,130,246,0.8)]"
                            : "bg-border/80 group-hover:bg-primary/80 group-hover:shadow-xs"
                        }`}
                      >
                        <GripVertical className="w-2.5 h-2.5 text-muted-foreground group-hover:text-primary-foreground opacity-60 group-hover:opacity-100" />
                      </div>
                    </div>

                    {/* Desktop Sidebar Analytics */}
                    <aside
                      style={{ width: `${sidebarWidth}px` }}
                      className={`h-full flex-shrink-0 overflow-hidden ${
                        isResizingSidebar ? "select-none pointer-events-none" : ""
                      }`}
                    >
                      <div className="w-full h-full min-w-[300px]">
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
                    </aside>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Floating Mobile Bottom Bar Button */}
              <AnimatePresence>
                {selectedFips && (
                  <motion.button
                    key="mobile-btn"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    onClick={() => setIsMobileDrawerOpen(true)}
                    className="md:hidden absolute bottom-3 left-3 z-30 flex items-center gap-2 px-3.5 py-2 rounded-full bg-primary text-primary-foreground font-bold text-xs shadow-2xl active:scale-95 transition-all hover:scale-105"
                    aria-label="View county analytics"
                  >
                    <BarChart2 className="w-4 h-4 animate-pulse" />
                    <span>{selectedCountyName ? `${selectedCountyName}` : "Analytics"}</span>
                    <ChevronUp className="w-4 h-4 ml-0.5" />
                  </motion.button>
                )}
              </AnimatePresence>

              {/* Mobile Drawer */}
              <AnimatePresence>
                {isMobileDrawerOpen && (
                  <motion.div
                    key="mobile-drawer"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-xs flex flex-col justify-end"
                  >
                    <div
                      className="fixed inset-0"
                      onClick={() => setIsMobileDrawerOpen(false)}
                    />
                    <motion.div
                      initial={{ y: "100%" }}
                      animate={{ y: 0 }}
                      exit={{ y: "100%" }}
                      transition={{ type: "spring", damping: 25, stiffness: 200 }}
                      className="relative z-50 bg-card border-t border-border rounded-t-2xl max-h-[85vh] h-[85vh] flex flex-col overflow-hidden shadow-2xl pb-safe"
                    >
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
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {activeView === "analysis" && (
            <motion.div
              key="analysis"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.28 }}
              className="w-full h-full flex flex-col"
            >
              <AnalysisView
                data={data || {}}
                onOpenExporter={handleOpenExporter}
                selectedFips={selectedFips}
              />
            </motion.div>
          )}

          {activeView === "sources" && (
            <motion.div
              key="sources"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.28 }}
              className="w-full h-full flex flex-col"
            >
              <DataSourcesView />
            </motion.div>
          )}
        </AnimatePresence>
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

      {/* Interactive Platform Guided Tour */}
      <TutorialTourModal
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        activeView={activeView}
        onViewChange={setActiveView}
        selectedFips={selectedFips}
        mapMetric={mapMetric}
        selectedYear={selectedYear}
        isDistrictOpen={isDistrictOpen}
        onCloseDistrict={() => setIsDistrictOpen(false)}
        isExporterOpen={isExporterOpen}
        onCloseExporter={() => setIsExporterOpen(false)}
      />

      {/* First-Visit Tour Welcome Banner */}
      <WelcomeTourBanner onStartTour={() => setIsTourOpen(true)} />

      {/* Mode Selection Prompt (First Visit) */}
      <ModeSelectionModal />

      {/* Toast Notification Container */}
      <Toast
        isOpen={toastOpen}
        title={toastTitle}
        message={toastMessage}
        onClose={() => setToastOpen(false)}
      />

    </div>
  );
}

export default function MapPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full h-screen flex flex-col items-center justify-center bg-background text-foreground gap-3">
          <Loader2 className="h-7 w-7 text-primary animate-spin" />
          <p className="text-xs font-semibold text-muted-foreground">Initializing US-SEER Map Engine…</p>
        </div>
      }
    >
      <USSEERMapDashboard />
    </Suspense>
  );
}
