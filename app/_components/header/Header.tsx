"use client";

import React, { useState } from "react";
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
  Menu,
  X,
  SquaresSubtract
} from "lucide-react";

interface HeaderProps {
  mapMetric?: MapMetric;
  onMetricChange?: (metric: MapMetric) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  isSimpleMode?: boolean;
  onToggleSimpleMode?: () => void;
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
  isSimpleMode,
  onToggleSimpleMode,
  onOpenCompare,
  onOpenExporter,
  onShareLink,
  activeView,
  onViewChange,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const views = [
    { id: "map" as const, label: "Map View", Icon: Map },
    { id: "analysis" as const, label: "Analysis Lab", Icon: Stethoscope },
    { id: "sources" as const, label: "Data Sources", Icon: CirclePile },
  ];

  return (
    <header className="relative flex items-center justify-between gap-2 px-3 py-2 sm:px-5 sm:py-2.5 rounded-2xl border border-border bg-card/95 backdrop-blur-md shadow-xs animate-in fade-in-50 slide-in-from-top-2 duration-400 z-50">
      {/* Left Cluster: Brand Logo & Title */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          <HeartPulse className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-primary" aria-hidden="true" />
        </div>
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-1.5">
            <h1 className="text-xs sm:text-sm font-bold tracking-tight text-foreground leading-none">
              US-SEER
            </h1>
            <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[9px] font-bold rounded bg-primary/10 text-primary border border-primary/20 leading-none">
              National Index
            </span>
          </div>
          <p className="hidden md:block text-[10px] text-muted-foreground font-medium leading-tight mt-0.5">
            US Spatial Environmental Exposure & Respiratory Risk Index
          </p>
        </div>
      </div>

      {/* Desktop Navigation View Switcher (Hidden on Mobile) */}
      <nav className="hidden md:flex items-center p-1 bg-muted/60 border border-border/80 rounded-xl gap-1 shrink-0">
        {views.map(({ id, label, Icon }) => {
          const isActive = activeView === id;
          return (
            <button
              key={id}
              id={`view-toggle-${id}`}
              onClick={() => onViewChange(id)}
              className={`cursor-pointer px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 select-none min-h-[32px] ${isActive
                ? "bg-background text-foreground shadow-xs border border-border/60"
                : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-primary" : ""}`} />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      {/* Desktop Quick Tools (Hidden on Mobile) */}
      <div className="hidden md:flex items-center gap-2 shrink-0">

        {/* PDF Exporter Button */}
        {onOpenExporter && (
          <button
            onClick={onOpenExporter}
            id="header-exporter-btn"
            className="cursor-pointer flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-xs font-semibold text-emerald-500 transition-all duration-150 shadow-2xs active:scale-97"
            aria-label="Open PDF report exporter"
            title="Export PDF / Executive Summary Brief"
          >
            <FileText className="h-3.5 w-3.5 shrink-0" />
            <span>Export PDF</span>
          </button>
        )}

        {/* Compare Counties */}
        {onOpenCompare && (
          <button
            onClick={onOpenCompare}
            id="header-compare-btn"
            className="cursor-pointer flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/20 text-xs font-semibold text-primary transition-all duration-150 shadow-2xs active:scale-97"
            aria-label="Open county comparison tool"
            title="Compare two counties side-by-side"
          >
            <Scale className="h-3.5 w-3.5 shrink-0" />
            <span>Compare</span>
          </button>
        )}

        {/* Share Link Button */}
        {onShareLink && (
          <button
            onClick={onShareLink}
            id="header-share-btn"
            className="cursor-pointer flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-xs font-semibold text-blue-400 transition-all duration-150 shadow-2xs active:scale-97"
            aria-label="Share bookmark link"
            title="Copy shareable link with current map view, county, and metric state"
          >
            <Share2 className="h-3.5 w-3.5 shrink-0" />
            <span>Share</span>
          </button>
        )}

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleDarkMode}
          id="theme-toggle-btn"
          className="cursor-pointer h-9 w-9 shrink-0 rounded-xl hover:bg-accent text-muted-foreground hover:text-foreground"
          title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          aria-label="Toggle color theme"
        >
          {isDarkMode
            ? <Sun className="h-4 w-4 text-amber-400" />
            : <Moon className="h-4 w-4" />}
        </Button>
      </div>

      {/* Mobile Hamburger Toggle */}
      <div className="flex items-center gap-1.5 md:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleDarkMode}
          className="h-8 w-8 rounded-lg text-muted-foreground"
          aria-label="Toggle dark mode"
        >
          {isDarkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          id="mobile-menu-toggle-btn"
          className="h-8 w-8 rounded-xl border-border/80 bg-background/80"
          aria-label="Toggle Navigation Menu"
        >
          {mobileMenuOpen ? <X className="h-4 w-4 text-foreground" /> : <Menu className="h-4 w-4 text-foreground" />}
        </Button>
      </div>

      {/* Mobile Menu Popover */}
      {mobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-xl md:hidden flex flex-col gap-3 animate-in fade-in-50 zoom-in-95 duration-200 z-50">
          {/* Views Section */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-0.5">
              Views
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {views.map(({ id, label, Icon }) => {
                const isActive = activeView === id;
                return (
                  <button
                    key={id}
                    onClick={() => {
                      onViewChange(id);
                      setMobileMenuOpen(false);
                    }}
                    className={`cursor-pointer px-2 py-2 rounded-xl text-xs font-semibold flex flex-col items-center gap-1 justify-center transition-all ${isActive
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "bg-muted/40 text-muted-foreground hover:bg-muted"
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[11px]">{label.split(" ")[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Actions Section */}
          <div className="flex flex-col gap-1 pt-1 border-t border-border/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-0.5">
              Tools & Actions
            </span>
            <div className="grid grid-cols-1 gap-1.5">
              {onToggleSimpleMode && (
                <button
                  onClick={() => {
                    onToggleSimpleMode();
                    setMobileMenuOpen(false);
                  }}
                  className={`cursor-pointer flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold border active:scale-98 transition-all ${isSimpleMode
                    ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                    : "bg-muted/40 text-muted-foreground border-border/60 hover:bg-muted hover:text-foreground"
                    }`}
                >
                  <SquaresSubtract className="h-4 w-4 text-amber-400" />
                  <span>{isSimpleMode ? "Simplified Mode (Active)" : "Simplify Mode"}</span>
                </button>
              )}

              {onOpenExporter && (
                <button
                  onClick={() => {
                    onOpenExporter();
                    setMobileMenuOpen(false);
                  }}
                  className="cursor-pointer flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 active:scale-98 transition-all"
                >
                  <FileText className="h-4 w-4" />
                  <span>Export PDF Report</span>
                </button>
              )}

              {onOpenCompare && (
                <button
                  onClick={() => {
                    onOpenCompare();
                    setMobileMenuOpen(false);
                  }}
                  className="cursor-pointer flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold bg-primary/10 text-primary border border-primary/20 active:scale-98 transition-all"
                >
                  <Scale className="h-4 w-4" />
                  <span>Compare Counties</span>
                </button>
              )}

              {onShareLink && (
                <button
                  onClick={() => {
                    onShareLink();
                    setMobileMenuOpen(false);
                  }}
                  className="cursor-pointer flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 active:scale-98 transition-all"
                >
                  <Share2 className="h-4 w-4" />
                  <span>Share Link</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

