"use client";

import { useEffect, useState } from "react";
import Header from "@/app/_components/header/Header";
import DataSourcesView from "@/app/_components/sources/DataSourcesView";
import SearchModal from "@/app/_components/search/SearchModal";
import { fetchCountyData, fetchCitiesData, CityEntry } from "@/app/_lib/data-utils";
import { CountyDataMap } from "@/app/_lib/types";
import { SearchResultItem } from "@/app/_lib/search-utils";
import { useRouter } from "next/navigation";

export default function SourcesPage() {
  const router = useRouter();
  const [data, setData] = useState<CountyDataMap | null>(null);
  const [citiesData, setCitiesData] = useState<CityEntry[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

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
      router.push("/");
    } else if (view === "analysis") {
      router.push("/?view=analysis");
    }
  };

  const handleSelectSearchResult = (_result: SearchResultItem) => {
    router.push("/");
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-background text-foreground p-3.5 sm:p-5 gap-3.5 sm:gap-4 overflow-hidden pt-4 sm:pt-6 pb-4 sm:pb-5">
      {/* Top Navigation & Control Header */}
      <Header
        mapMetric="overallRisk"
        onMetricChange={() => {}}
        isDarkMode={isDarkMode}
        onToggleDarkMode={handleToggleDarkMode}
        onOpenSearch={() => setIsSearchOpen(true)}
        activeView="sources"
        onViewChange={handleViewChange}
      />

      {/* Main Content Area */}
      <main className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
        <DataSourcesView />
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
    </div>
  );
}
