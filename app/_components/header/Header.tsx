"use client";

import React from "react";
import { Button } from "@/app/_components/ui/button";
import { MapMetric } from "@/app/_components/map/MapContainer";
import {
  Sun,
  Moon,
  Stethoscope,
  HeartPulse,
  Map,
  CirclePile,
  Scale,
  FileText,
  Share2,
} from "lucide-react";

interface HeaderProps {
  mapMetric?: MapMetric;
  onMetricChange?: (metric: MapMetric) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenSearch?: () => void;
  onOpenCompare?: () => void;
  onOpenExporter?: () => void;
  onShareLink?: () => void;
  activeView: "map" | "analysis" | "sources";
  onViewChange: (view: "map" | "analysis" | "sources") => void;
}

export default function Header({
  isDarkMode,
  onToggleDarkMode,
  onOpenCompare,
  onOpenExporter,
  onShareLink,
  activeView,
  onViewChange,
}: HeaderProps) {

  return (
    <header className="flex items-center justify-between gap-2.5 sm:gap-4 px-3 py-2 sm:px-5 sm:py-2.5 rounded-2xl border border-border bg-card/95 backdrop-blur-md shadow-xs animate-in fade-in-50 slide-in-from-top-2 duration-400">
      {/* Left Cluster: Brand Logo & Title */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          <HeartPulse className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-primary" aria-hidden="true" />
        </div>
        <h1 className="text-xs sm:text-sm font-bold tracking-tight text-foreground leading-none">
          BioMap
        </h1>
      </div>

      {/* Center Cluster: View Switcher */}
      <nav className="flex items-center p-1 bg-muted/60 border border-border/80 rounded-xl gap-0.5 sm:gap-1 shrink-0">
        {[
          { id: "map" as const, label: "Map View", Icon: Map },
          { id: "analysis" as const, label: "Analysis Lab", Icon: Stethoscope },
          { id: "sources" as const, label: "Data Sources", Icon: CirclePile },
        ].map(({ id, label, Icon }) => {
          const isActive = activeView === id;
          return (
            <button
              key={id}
              id={`view-toggle-${id}`}
              onClick={() => onViewChange(id)}
              className={`cursor-pointer px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 select-none min-h-[32px] ${isActive
                ? "bg-background text-foreground shadow-xs border border-border/60"
                : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-primary" : ""}`} />
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden text-[11px]">{id === "map" ? "Map" : id === "analysis" ? "Lab" : "Sources"}</span>
            </button>
          );
        })}
      </nav>

      {/* Right Cluster: Quick Tools */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* PDF Exporter Button */}
        {onOpenExporter && (
          <button
            onClick={onOpenExporter}
            id="header-exporter-btn"
            className="cursor-pointer flex items-center justify-center gap-1.5 h-8 sm:h-9 px-2.5 sm:px-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-xs font-semibold text-emerald-500 transition-all duration-150 shadow-2xs active:scale-97"
            aria-label="Open PDF report exporter"
            title="Export PDF / Executive Summary Brief"
          >
            <FileText className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden lg:inline">Export PDF</span>
          </button>
        )}

        {/* Compare Counties */}
        {onOpenCompare && (
          <button
            onClick={onOpenCompare}
            id="header-compare-btn"
            className="cursor-pointer flex items-center justify-center gap-1.5 h-8 sm:h-9 px-2.5 sm:px-3 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/20 text-xs font-semibold text-primary transition-all duration-150 shadow-2xs active:scale-97"
            aria-label="Open county comparison tool"
            title="Compare two counties side-by-side"
          >
            <Scale className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden md:inline">Compare</span>
          </button>
        )}

        {/* Share Link Button */}
        {onShareLink && (
          <button
            onClick={onShareLink}
            id="header-share-btn"
            className="cursor-pointer flex items-center justify-center gap-1.5 h-8 sm:h-9 px-2.5 sm:px-3 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-xs font-semibold text-blue-400 transition-all duration-150 shadow-2xs active:scale-97"
            aria-label="Share bookmark link"
            title="Copy shareable link with current map view, county, and metric state"
          >
            <Share2 className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">Share</span>
          </button>
        )}

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleDarkMode}
          id="theme-toggle-btn"
          className="cursor-pointer h-8 w-8 sm:h-9 sm:w-9 shrink-0 rounded-xl hover:bg-accent text-muted-foreground hover:text-foreground"
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

