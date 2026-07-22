"use client";

import React from "react";
import { Button } from "@/app/_components/ui/button";
import { MapMetric } from "@/app/_components/map/MapContainer";
import {
  Sun,
  Moon,
  Activity,
  Wind,
  Droplets,
  Stethoscope,
  Factory,
  HeartPulse,
  Map,
  ShieldAlert,
  ChevronDown,
  Search,
} from "lucide-react";

interface HeaderProps {
  mapMetric: MapMetric;
  onMetricChange: (metric: MapMetric) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenSearch: () => void;
  activeView: "map" | "analysis";
  onViewChange: (view: "map" | "analysis") => void;
}

const METRIC_OPTIONS: { value: MapMetric; label: string; icon: React.ReactNode }[] = [
  { value: "overallRisk", label: "Overall Vulnerability", icon: <ShieldAlert className="w-3.5 h-3.5 text-rose-400" /> },
  { value: "pm25Avg", label: "PM2.5 Pollution", icon: <Wind className="w-3.5 h-3.5 text-amber-400" /> },
  { value: "mortalityRate", label: "Respiratory Mortality", icon: <Activity className="w-3.5 h-3.5 text-blue-400" /> },
  { value: "asthmaPrev", label: "Asthma Prevalence", icon: <Droplets className="w-3.5 h-3.5 text-fuchsia-400" /> },
  { value: "copdPrev", label: "COPD Prevalence", icon: <Stethoscope className="w-3.5 h-3.5 text-teal-400" /> },
  { value: "smokingPrev", label: "Smoking Prevalence", icon: <Activity className="w-3.5 h-3.5 text-orange-400" /> },
  { value: "toxicReleases", label: "Toxic Releases", icon: <Factory className="w-3.5 h-3.5 text-slate-400" /> },
  { value: "mdRate", label: "Primary Care Density", icon: <HeartPulse className="w-3.5 h-3.5 text-emerald-400" /> },
  { value: "rucc", label: "Rural-Urban Class.", icon: <Map className="w-3.5 h-3.5 text-indigo-400" /> },
];

export default function Header({
  mapMetric,
  onMetricChange,
  isDarkMode,
  onToggleDarkMode,
  onOpenSearch,
  activeView,
  onViewChange,
}: HeaderProps) {
  const selectedMetric = METRIC_OPTIONS.find((m) => m.value === mapMetric) || METRIC_OPTIONS[0];

  return (
    <header className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 rounded-xl border border-border bg-card shadow-sm">
      {/* Brand & View Switcher */}
      <div className="flex items-center justify-between w-full sm:w-auto gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Activity className="h-4.5 w-4.5 text-primary" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-foreground leading-none">
              GeoHealth Atlas
            </h1>
            <p className="text-[11px] text-muted-foreground mt-0.5 hidden sm:block leading-none">
              U.S. County Environmental &amp; Health Analytics
            </p>
          </div>
        </div>

        {/* View Switcher Segmented Control */}
        <div className="flex items-center p-1 bg-muted/60 border border-border rounded-lg gap-1">
          <button
            id="view-toggle-map"
            onClick={() => onViewChange("map")}
            className={`cursor-pointer px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeView === "map"
                ? "bg-background text-foreground shadow-xs border border-border/50"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Map className="w-3.5 h-3.5" />
            <span>Map</span>
          </button>
          <button
            id="view-toggle-analysis"
            onClick={() => onViewChange("analysis")}
            className={`cursor-pointer px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeView === "analysis"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Analysis</span>
          </button>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
        {/* Search trigger */}
        <button
          onClick={onOpenSearch}
          id="header-search-btn"
          className="cursor-pointer flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-muted/40 hover:bg-accent text-xs text-muted-foreground hover:text-foreground transition-colors shadow-xs"
          aria-label="Open location search"
        >
          <Search className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden sm:inline">Search region, state, city…</span>
          <span className="sm:hidden">Search</span>
          <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-border bg-background font-mono text-[10px] text-muted-foreground pointer-events-none select-none">
            ⌘K
          </kbd>
        </button>

        {/* Metric selector */}
        {activeView === "map" && (
          <div className="relative sm:w-52 md:w-60 flex-1 sm:flex-none">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              {selectedMetric.icon}
            </div>
            <select
              id="metric-selector"
              value={mapMetric}
              onChange={(e) => onMetricChange(e.target.value as MapMetric)}
              className="cursor-pointer w-full h-9 pl-8 pr-7 bg-muted/40 border border-border rounded-lg text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent appearance-none shadow-xs hover:bg-accent transition-colors"
              aria-label="Select map metric"
            >
              {METRIC_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="cursor-pointer">
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          </div>
        )}

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleDarkMode}
          id="theme-toggle-btn"
          className="cursor-pointer h-9 w-9 shrink-0 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground"
          title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          aria-label="Toggle color theme"
        >
          {isDarkMode
            ? <Sun className="h-4 w-4 text-amber-400" />
            : <Moon className="h-4 w-4" />}
        </Button>
      </div>
    </header>
  );
}
