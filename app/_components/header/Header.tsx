"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  SquaresSubtract,
  Landmark,
  Compass,
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
  onOpenDistrict?: () => void;
  onStartTour?: () => void;
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
  onOpenDistrict,
  onStartTour,
  activeView,
  onViewChange,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const views = [
    { id: "map" as const, label: "Map", Icon: Map },
    { id: "analysis" as const, label: "Lab", Icon: Stethoscope },
    { id: "sources" as const, label: "Sources", Icon: CirclePile },
  ];

  /** Icon-only pill button for desktop quick tools */
  function IconBtn({
    id,
    onClick,
    title,
    ariaLabel,
    children,
    colorClass = "text-muted-foreground hover:text-foreground hover:bg-accent",
  }: {
    id?: string;
    onClick: () => void;
    title: string;
    ariaLabel: string;
    children: React.ReactNode;
    colorClass?: string;
  }) {
    return (
      <button
        id={id}
        onClick={onClick}
        title={title}
        aria-label={ariaLabel}
        className={`cursor-pointer h-8 w-8 rounded-lg flex items-center justify-center transition-all duration-150 active:scale-95 ${colorClass}`}
      >
        {children}
      </button>
    );
  }

  return (
    <header className="relative flex items-center justify-between gap-3 px-3 py-2 sm:px-4 sm:py-2 rounded-2xl border border-border bg-card/95 backdrop-blur-md shadow-xs animate-in fade-in-50 slide-in-from-top-2 duration-400 z-50">

      {/* ── Brand ──────────────────────────────────────────────── */}
      <div id="header-brand" className="flex items-center gap-2.5 shrink-0">
        <div className="h-8 w-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          <HeartPulse className="h-4 w-4 text-primary" aria-hidden="true" />
        </div>
        <div className="flex flex-col justify-center leading-none">
          <div className="flex items-center gap-1.5">
            <h1 className="text-sm font-bold tracking-tight text-foreground">US-SEER</h1>
            <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[9px] font-bold rounded bg-primary/10 text-primary border border-primary/20">
              National Index
            </span>
          </div>
          <p className="hidden lg:block text-[9.5px] text-muted-foreground font-medium mt-0.5 tracking-tight">
            Spatial Environmental Exposure &amp; Respiratory Risk
          </p>
        </div>
      </div>

      {/* ── Desktop: View Switcher ──────────────────────────────── */}
      <nav className="hidden md:flex items-center p-0.5 bg-muted/60 border border-border/80 rounded-xl gap-0.5 shrink-0">
        {views.map(({ id, label, Icon }) => {
          const isActive = activeView === id;
          return (
            <button
              key={id}
              id={`view-toggle-${id}`}
              onClick={() => onViewChange(id)}
              className={`relative cursor-pointer px-3 py-1.5 rounded-[10px] text-xs font-semibold flex items-center gap-1.5 transition-colors duration-150 select-none whitespace-nowrap ${isActive
                ? "text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                }`}
            >
              {isActive && (
                <motion.div
                  layoutId="active-view-pill"
                  className="absolute inset-0 bg-background border border-border/60 rounded-[10px] z-0"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <div className="relative z-10 flex items-center gap-1.5">
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-primary" : ""}`} />
                {label}
              </div>
            </button>
          );
        })}
      </nav>

      {/* ── Desktop: Quick Tools ────────────────────────────────── */}
      <div className="hidden md:flex items-center gap-1 shrink-0">

        {/* Take Tour — interactive platform walkthrough */}
        {onStartTour && (
          <button
            onClick={onStartTour}
            id="header-tour-btn"
            title="Start interactive platform guided tour (Recommended)"
            aria-label="Start interactive guided tour"
            className="cursor-pointer flex items-center gap-1.5 h-8 px-3 rounded-lg border border-primary/40 bg-primary/10 hover:bg-primary/20 text-xs font-bold text-primary transition-all duration-150 active:scale-95 shadow-xs relative group"
          >
            <Compass className="h-3.5 w-3.5 shrink-0 text-primary animate-spin-slow" />
            <span className="hidden sm:inline">Take Tour</span>
          </button>
        )}

        {/* My District — only labeled button (primary CTA) */}
        {onOpenDistrict && (
          <button
            onClick={onOpenDistrict}
            id="header-my-district-btn"
            title="View NV-02 district data"
            aria-label="View my congressional district data"
            className="cursor-pointer flex items-center gap-1.5 h-8 px-3 rounded-lg border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 text-xs font-semibold text-violet-400 transition-all duration-150 active:scale-95"
          >
            <Landmark className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden lg:inline">My District</span>
          </button>
        )}

        {/* Divider */}
        <div className="w-px h-5 bg-border/60 mx-1" />

        {/* Export PDF — icon only */}
        {onOpenExporter && (
          <IconBtn
            id="header-exporter-btn"
            onClick={onOpenExporter}
            title="Export PDF / Executive Summary"
            ariaLabel="Open PDF report exporter"
            colorClass="text-emerald-500 hover:bg-emerald-500/10"
          >
            <FileText className="h-4 w-4" />
          </IconBtn>
        )}

        {/* Compare — icon only */}
        {onOpenCompare && (
          <IconBtn
            id="header-compare-btn"
            onClick={onOpenCompare}
            title="Compare two counties side-by-side"
            ariaLabel="Open county comparison tool"
            colorClass="text-primary hover:bg-primary/10"
          >
            <Scale className="h-4 w-4" />
          </IconBtn>
        )}

        {/* Share — icon only */}
        {onShareLink && (
          <IconBtn
            id="header-share-btn"
            onClick={onShareLink}
            title="Copy shareable link"
            ariaLabel="Copy bookmark link"
            colorClass="text-blue-400 hover:bg-blue-500/10"
          >
            <Share2 className="h-4 w-4" />
          </IconBtn>
        )}

        {/* Divider */}
        <div className="w-px h-5 bg-border/60 mx-1" />

        {/* Theme toggle */}
        <IconBtn
          id="theme-toggle-btn"
          onClick={onToggleDarkMode}
          title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          ariaLabel="Toggle color theme"
        >
          {isDarkMode
            ? <Sun className="h-4 w-4 text-amber-400" />
            : <Moon className="h-4 w-4" />}
        </IconBtn>
      </div>

      {/* ── Mobile: Right cluster ───────────────────────────────── */}
      <div className="flex items-center gap-1 md:hidden">
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

      {/* ── Mobile Menu Popover ─────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-xl md:hidden flex flex-col gap-3 animate-in fade-in-50 zoom-in-95 duration-200 z-50">

          {/* Views */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">Views</span>
            <div className="grid grid-cols-3 gap-1.5">
              {views.map(({ id, label, Icon }) => {
                const isActive = activeView === id;
                return (
                  <button
                    key={id}
                    onClick={() => { onViewChange(id); setMobileMenuOpen(false); }}
                    className={`cursor-pointer px-2 py-2.5 rounded-xl text-xs font-semibold flex flex-col items-center gap-1 justify-center transition-all ${isActive
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "bg-muted/40 text-muted-foreground hover:bg-muted"
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[11px]">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tools */}
          <div className="flex flex-col gap-1 pt-1 border-t border-border/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">Tools</span>
            <div className="grid grid-cols-1 gap-1.5">

              {onStartTour && (
                <button
                  onClick={() => { onStartTour(); setMobileMenuOpen(false); }}
                  id="mobile-tour-btn"
                  className="cursor-pointer flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold bg-primary/15 text-primary border border-primary/30 transition-all shadow-xs"
                >
                  <Compass className="h-4 w-4 shrink-0 text-primary animate-spin-slow" />
                  Take Platform Tour (Recommended)
                </button>
              )}

              {onToggleSimpleMode && (
                <button
                  onClick={() => { onToggleSimpleMode(); setMobileMenuOpen(false); }}
                  className={`cursor-pointer flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all ${isSimpleMode
                    ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                    : "bg-muted/40 text-muted-foreground border-border/60 hover:bg-muted hover:text-foreground"
                    }`}
                >
                  <SquaresSubtract className="h-4 w-4 text-amber-400 shrink-0" />
                  {isSimpleMode ? "Simplified Mode (Active)" : "Simplify Mode"}
                </button>
              )}

              {onOpenDistrict && (
                <button
                  onClick={() => { onOpenDistrict(); setMobileMenuOpen(false); }}
                  id="mobile-my-district-btn"
                  className="cursor-pointer flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/20 transition-all"
                >
                  <Landmark className="h-4 w-4 shrink-0" />
                  My District (NV-02)
                </button>
              )}

              {onOpenExporter && (
                <button
                  onClick={() => { onOpenExporter(); setMobileMenuOpen(false); }}
                  className="cursor-pointer flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 transition-all"
                >
                  <FileText className="h-4 w-4 shrink-0" />
                  Export PDF Report
                </button>
              )}

              {onOpenCompare && (
                <button
                  onClick={() => { onOpenCompare(); setMobileMenuOpen(false); }}
                  className="cursor-pointer flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold bg-primary/10 text-primary border border-primary/20 transition-all"
                >
                  <Scale className="h-4 w-4 shrink-0" />
                  Compare Counties
                </button>
              )}

              {onShareLink && (
                <button
                  onClick={() => { onShareLink(); setMobileMenuOpen(false); }}
                  className="cursor-pointer flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 transition-all"
                >
                  <Share2 className="h-4 w-4 shrink-0" />
                  Share Link
                </button>
              )}

            </div>
          </div>
        </div>
      )}
    </header>
  );
}
