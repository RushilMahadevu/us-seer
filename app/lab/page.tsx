"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import Header from "@/app/_components/header/Header";
import AnalysisView from "@/app/_components/analysis/AnalysisView";
import SearchModal from "@/app/_components/search/SearchModal";
import ReportExporter, { ReportMode } from "@/app/_components/ui/ReportExporter";
import AppLoadingScreen from "@/app/_components/ui/AppLoadingScreen";
import { fetchCountyData, fetchCitiesData, CityEntry } from "@/app/_lib/data-utils";
import { CountyDataMap } from "@/app/_lib/types";
import { SearchResultItem } from "@/app/_lib/search-utils";
import { Loader2 } from "lucide-react";

function LabPageContent() {
  const router = useRouter();
  const [data, setData] = useState<CountyDataMap | null>(null);
  const [citiesData, setCitiesData] = useState<CityEntry[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isExporterOpen, setIsExporterOpen] = useState(false);
  const [exporterFipsA, setExporterFipsA] = useState<string>("48201");
  const [exporterFipsB, setExporterFipsB] = useState<string>("17031");
  const [exporterMode, setExporterMode] = useState<ReportMode>("single");
  const [selectedFips, setSelectedFips] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  const handleToggleDarkMode = () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const handleViewChange = (view: "map" | "analysis" | "sources") => {
    if (view === "map") {
      router.push("/map");
    } else if (view === "sources") {
      router.push("/sources");
    }
  };

  const handleOpenExporter = (fipsA?: string, fipsB?: string, mode?: ReportMode) => {
    if (fipsA) setExporterFipsA(fipsA);
    if (fipsB) setExporterFipsB(fipsB);
    if (mode) setExporterMode(mode);
    setIsExporterOpen(true);
  };

  const handleSelectSearchResult = (result: SearchResultItem) => {
    if (result.type === "county" && result.fips) {
      setSelectedFips(result.fips);
      router.push(`/map?fips=${result.fips}`);
    } else {
      router.push("/map");
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-background text-foreground p-3.5 sm:p-5 gap-3.5 sm:gap-4 overflow-hidden pt-4 sm:pt-6 pb-4 sm:pb-5 relative">
      <AppLoadingScreen isLoading={isLoading} />

      {/* Top Navigation & Control Header */}
      <Header
        mapMetric="overallRisk"
        onMetricChange={() => {}}
        isDarkMode={isDarkMode}
        onToggleDarkMode={handleToggleDarkMode}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenExporter={() => handleOpenExporter(selectedFips || "48201", undefined, "single")}
        activeView="analysis"
        onViewChange={handleViewChange}
      />

      {/* Main Content Area */}
      <main className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
        <AnalysisView
          data={data || {}}
          onOpenExporter={handleOpenExporter}
          selectedFips={selectedFips}
        />
      </main>

      {/* Search Modal */}
      {data && (
        <SearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          countyData={data}
          allCities={citiesData}
          onSelectResult={handleSelectSearchResult}
        />
      )}

      {/* Report Exporter Modal */}
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
    </div>
  );
}

export default function LabPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full h-screen flex flex-col items-center justify-center bg-background text-foreground gap-3">
          <Loader2 className="h-7 w-7 text-primary animate-spin" />
          <p className="text-xs font-semibold text-muted-foreground">Initializing US-SEER Research Lab…</p>
        </div>
      }
    >
      <LabPageContent />
    </Suspense>
  );
}
