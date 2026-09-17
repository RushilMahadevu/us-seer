"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MapMetric } from "@/app/_components/map/MapContainer";
import { useSimpleMode } from "@/app/_lib/simple-mode-context";
import {
  Sun,
  Moon,
  Stethoscope,
  HeartPulse,
  Map,
  CirclePile,
  Scale,
  FileUp,
  Share2,
  Menu,
  X,
  SquaresSubtract,
  Landmark,
  Compass,
  PanelRightClose,
  PanelRightOpen,
  Settings,
  Search,
  Check,
  ChevronDown,
  Award,
} from "lucide-react";

export interface HeaderProps {
  mapMetric?: MapMetric;
  onMetricChange?: (metric: MapMetric) => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  isSimpleMode?: boolean;
  onToggleSimpleMode?: () => void;
  onOpenSearch?: () => void;
  onOpenCompare?: () => void;
  onOpenExporter?: () => void;
  onShareLink?: () => void;
  onOpenDistrict?: () => void;
  onStartTour?: () => void;
  activeView?: "home" | "map" | "analysis" | "sources";
  onViewChange?: (view: "map" | "analysis" | "sources") => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export default function Header({
  isDarkMode,
  onToggleDarkMode,
  isSimpleMode,
  onToggleSimpleMode,
  onOpenSearch,
  onOpenCompare,
  onOpenExporter,
  onShareLink,
  onOpenDistrict,
  onStartTour,
  activeView,
  onViewChange,
  isSidebarCollapsed,
  onToggleSidebar,
}: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isSimpleMode: ctxSimpleMode, toggleSimpleMode: ctxToggleSimpleMode } = useSimpleMode();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  // Determine current active view tab
  const currentView =
    activeView ||
    (pathname === "/map"
      ? "map"
      : pathname === "/lab" || pathname === "/analysis"
        ? "analysis"
        : pathname === "/sources"
          ? "sources"
          : "home");

  const handleViewChange = (view: "map" | "analysis" | "sources") => {
    if (onViewChange) {
      onViewChange(view);
    } else {
      if (view === "map") router.push("/map");
      else if (view === "analysis") router.push("/lab");
      else if (view === "sources") router.push("/sources");
    }
  };

  // Dark mode fallback state
  const [internalDarkMode, setInternalDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem("theme") !== "light";
      } catch {
        return true;
      }
    }
    return true;
  });

  const effectiveDarkMode = isDarkMode !== undefined ? isDarkMode : internalDarkMode;
  const handleToggleDarkMode = () => {
    if (onToggleDarkMode) {
      onToggleDarkMode();
    } else {
      setInternalDarkMode((prev) => {
        const next = !prev;
        if (typeof document !== "undefined") {
          document.documentElement.classList.toggle("dark", next);
          try {
            localStorage.setItem("theme", next ? "dark" : "light");
          } catch {
            /* ignore */
          }
        }
        return next;
      });
    }
  };

  const effectiveSimpleMode = isSimpleMode !== undefined ? isSimpleMode : ctxSimpleMode;
  const handleToggleSimple = () => {
    if (onToggleSimpleMode) onToggleSimpleMode();
    else ctxToggleSimpleMode();
    setDropdownOpen(false);
  };

  const handleSearch = useCallback(() => {
    setDropdownOpen(false);
    setMobileMenuOpen(false);
    if (onOpenSearch) onOpenSearch();
    else router.push("/map?action=search");
  }, [onOpenSearch, router]);

  const handleCompare = () => {
    setDropdownOpen(false);
    setMobileMenuOpen(false);
    if (onOpenCompare) onOpenCompare();
    else router.push("/map?action=compare");
  };

  const handleExport = () => {
    setDropdownOpen(false);
    setMobileMenuOpen(false);
    if (onOpenExporter) onOpenExporter();
    else router.push("/map?action=export");
  };

  const handleDistrict = () => {
    setDropdownOpen(false);
    setMobileMenuOpen(false);
    if (onOpenDistrict) onOpenDistrict();
    else router.push("/map?fips=32031");
  };

  const handleTour = () => {
    setDropdownOpen(false);
    setMobileMenuOpen(false);
    if (onStartTour) onStartTour();
    else router.push("/map?action=tour");
  };

  const handleShare = () => {
    setDropdownOpen(false);
    setMobileMenuOpen(false);
    if (onShareLink) {
      onShareLink();
    } else if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2000);
    }
  };

  // Close dropdown on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDropdownOpen(false);
        setMobileMenuOpen(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        handleSearch();
      }
    };

    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [dropdownOpen, handleSearch]);

  const views = [
    { id: "map" as const, label: "Map", Icon: Map },
    { id: "analysis" as const, label: "Lab", Icon: Stethoscope },
    { id: "sources" as const, label: "Sources", Icon: CirclePile },
  ];

  // ── Scroll-hide / scroll-show logic ───────────────────────────────────
  const [hidden, setHidden] = useState(false);
  const [prevView, setPrevView] = useState(currentView);
  if (prevView !== currentView) {
    setPrevView(currentView);
    setHidden(false);
  }

  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement | Document | Window | null;
      let currentY = 0;

      if (
        target &&
        target !== (typeof document !== "undefined" ? document : null) &&
        target !== (typeof window !== "undefined" ? window : null) &&
        "scrollTop" in (target as HTMLElement) &&
        typeof (target as HTMLElement).scrollTop === "number"
      ) {
        currentY = (target as HTMLElement).scrollTop;
      } else {
        currentY =
          (typeof window !== "undefined" ? window.scrollY : 0) ||
          (typeof document !== "undefined"
            ? document.documentElement.scrollTop || document.body.scrollTop
            : 0) ||
          0;
      }

      const delta = currentY - lastScrollY.current;

      if (currentY <= 25) {
        setHidden(false);
      } else if (delta > 8 && currentY > 50) {
        setHidden(true);
      } else if (delta < -8) {
        setHidden(false);
      }

      lastScrollY.current = currentY;
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY > 18 && lastScrollY.current > 40) {
        setHidden(true);
      } else if (e.deltaY < -18) {
        setHidden(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true, capture: true });
    window.addEventListener("wheel", handleWheel, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll, { capture: true } as EventListenerOptions);
      window.removeEventListener("wheel", handleWheel);
    };
  }, []);

  return (
    <>
      <motion.div
        initial={false}
        animate={{
          height: hidden && !mobileMenuOpen && !dropdownOpen ? 0 : "auto",
          opacity: hidden && !mobileMenuOpen && !dropdownOpen ? 0 : 1,
          y: hidden && !mobileMenuOpen && !dropdownOpen ? -24 : 0,
          marginBottom: hidden && !mobileMenuOpen && !dropdownOpen ? -14 : 0,
        }}
        transition={{
          duration: 0.28,
          ease: [0.16, 1, 0.3, 1],
        }}
        className={`z-50 flex-shrink-0 ${hidden && !mobileMenuOpen && !dropdownOpen ? "overflow-hidden" : "overflow-visible"
          }`}
        style={{ willChange: "transform, opacity, height, margin" }}
      >
        <header className="relative flex items-center justify-between gap-3 px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl border border-border/90 bg-card/95 backdrop-blur-xl shadow-xs">
          {/* Brand */}
          <Link
            href="/"
            className="flex items-center gap-2.5 shrink-0 group transition-opacity hover:opacity-95"
          >
            <div className="relative h-8 w-8 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center shrink-0 group-hover:bg-primary/20 group-hover:border-primary/40 transition-all shadow-2xs">
              <HeartPulse className="h-4 w-4 text-primary transition-transform group-hover:scale-110 duration-200" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                US-SEER
              </span>
              <div className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground px-1.5 py-0.5 rounded bg-muted/80 border border-border/60">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                <span>v1.2</span>
              </div>
            </div>
          </Link>

          {/* Center: View Switcher */}
          <nav className="hidden md:flex items-center p-0.5 bg-muted/60 dark:bg-muted/40 border border-border/80 rounded-xl gap-0.5 shadow-2xs">
            {views.map(({ id, label, Icon }) => {
              const isActive = currentView === id;
              return (
                <button
                  key={id}
                  onClick={() => handleViewChange(id)}
                  className={`relative px-3 py-1.5 rounded-[10px] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${isActive
                    ? "text-foreground font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                    }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-view-pill"
                      className="absolute inset-0 bg-background border border-border/60 rounded-[10px] z-0 shadow-xs"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <Icon className={`w-3.5 h-3.5 ${isActive ? "text-primary" : ""}`} />
                    {label}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Right Tools */}
          <div className="hidden md:flex items-center gap-1.5 shrink-0" ref={menuRef}>
            {/* Quick Tour Button - Elevated to pop out */}
            <button
              onClick={handleTour}
              title="Start guided platform tour"
              aria-label="Start platform tour"
              className="cursor-pointer flex items-center gap-1.5 h-8 px-3 rounded-xl border border-primary/35 bg-gradient-to-r from-primary/15 via-primary/10 to-primary/5 hover:from-primary/25 hover:to-primary/15 text-xs font-bold text-primary shadow-xs hover:shadow-primary/20 transition-all duration-150 active:scale-95 group"
            >
              <Compass className="h-3.5 w-3.5 text-primary group-hover:rotate-45 transition-transform duration-300" />
              <span>Tour</span>
            </button>

            {/* Settings & Tools Button - Elevated with descriptive icon to pop out */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                title="Platform tools & settings"
                aria-label="Toggle settings and tools menu"
                aria-expanded={dropdownOpen}
                className={`cursor-pointer flex items-center gap-1.5 h-8 px-2.5 sm:px-3 rounded-xl text-xs font-semibold border transition-all duration-150 active:scale-95 shadow-xs group ${dropdownOpen
                  ? "bg-primary/15 text-primary border-primary/40 shadow-sm"
                  : "bg-muted/70 text-foreground border-border/80 hover:bg-accent hover:border-border"
                  }`}
              >
                <Settings className={`h-3.5 w-3.5 text-primary transition-transform duration-300 ${dropdownOpen ? "rotate-90" : "group-hover:rotate-45"}`} />
                <span className="hidden sm:inline">Settings</span>
                <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform duration-200 ${dropdownOpen ? "rotate-180 text-primary" : "group-hover:text-foreground"}`} />
              </button>

              {/* Colorful & Clean Dropdown */}
              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.98 }}
                    transition={{ duration: 0.14, ease: "easeOut" }}
                    className="absolute right-0 top-full mt-1.5 w-64 rounded-2xl border border-border/90 bg-card/95 backdrop-blur-xl shadow-2xl p-1.5 z-50 flex flex-col gap-0.5 text-xs font-medium"
                  >
                    {/* Header Title */}
                    <div className="px-2.5 py-2 border-b border-border/60 mb-1 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Settings className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-bold text-foreground tracking-tight">
                          Tools &amp; Settings
                        </span>
                      </div>
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                        US-SEER
                      </span>
                    </div>

                    {/* Search */}
                    <button
                      onClick={handleSearch}
                      className="cursor-pointer w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-blue-500/10 text-foreground transition-colors group"
                    >
                      <span className="flex items-center gap-2">
                        <div className="p-1 rounded-md bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20 transition-colors">
                          <Search className="h-3.5 w-3.5" />
                        </div>
                        <span>Search Counties</span>
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground px-1 py-0.2 rounded bg-muted border border-border/60">
                        ⌘K
                      </span>
                    </button>

                    {/* Compare */}
                    <button
                      onClick={handleCompare}
                      className="cursor-pointer w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-violet-500/10 text-foreground transition-colors group"
                    >
                      <span className="flex items-center gap-2">
                        <div className="p-1 rounded-md bg-violet-500/10 text-violet-400 group-hover:bg-violet-500/20 transition-colors">
                          <Scale className="h-3.5 w-3.5" />
                        </div>
                        <span>Compare Counties</span>
                      </span>
                      <span className="text-[9px] font-mono text-muted-foreground">Side-by-side</span>
                    </button>

                    {/* Export */}
                    <button
                      onClick={handleExport}
                      className="cursor-pointer w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-emerald-500/10 text-foreground transition-colors group"
                    >
                      <span className="flex items-center gap-2">
                        <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                          <FileUp className="h-3.5 w-3.5" />
                        </div>
                        <span>Export PDF Report</span>
                      </span>
                      <span className="text-[9px] font-mono text-muted-foreground">Report</span>
                    </button>

                    {/* District */}
                    <button
                      onClick={handleDistrict}
                      className="cursor-pointer w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-amber-500/10 text-foreground transition-colors group"
                    >
                      <span className="flex items-center gap-2">
                        <div className="p-1 rounded-md bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20 transition-colors">
                          <Landmark className="h-3.5 w-3.5" />
                        </div>
                        <span>My District</span>
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-500 font-bold border border-amber-500/20">
                        NV-02
                      </span>
                    </button>

                    <div className="h-px bg-border/60 my-1" />

                    {/* Simple Mode Toggle */}
                    <button
                      onClick={handleToggleSimple}
                      className="cursor-pointer w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-rose-500/10 text-foreground transition-colors group"
                    >
                      <span className="flex items-center gap-2">
                        <div className="p-1 rounded-md bg-rose-500/10 text-rose-400 group-hover:bg-rose-500/20 transition-colors">
                          <SquaresSubtract className="h-3.5 w-3.5" />
                        </div>
                        <span>Simplified Mode</span>
                      </span>
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${effectiveSimpleMode
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          : "bg-muted text-muted-foreground"
                          }`}
                      >
                        {effectiveSimpleMode ? "ON" : "OFF"}
                      </span>
                    </button>

                    {/* Share Link */}
                    <button
                      onClick={handleShare}
                      className="cursor-pointer w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-sky-500/10 text-foreground transition-colors group"
                    >
                      <span className="flex items-center gap-2">
                        <div className="p-1 rounded-md bg-sky-500/10 text-sky-400 group-hover:bg-sky-500/20 transition-colors">
                          <Share2 className="h-3.5 w-3.5" />
                        </div>
                        <span>Copy Share Link</span>
                      </span>
                      <span className="text-[9px] font-mono text-muted-foreground">URL</span>
                    </button>

                    {/* Earth Prize Candidate Ribbon */}
                    <div className="mt-1 pt-1.5 border-t border-border/60">
                      <div className="px-2 py-1.5 rounded-xl bg-muted/40 border border-border/50 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 text-amber-500" />
                          <span className="text-[10px] font-bold text-foreground">Earth Prize 2026</span>
                        </div>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                          Candidate
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="w-px h-4 bg-border/80 mx-0.5" />

            {/* Sidebar Toggle in Header (on map only) */}
            {onToggleSidebar && currentView === "map" && (
              <button
                onClick={onToggleSidebar}
                title={isSidebarCollapsed ? "Show sidebar (Cmd+\\)" : "Hide sidebar (Cmd+\\)"}
                className={`cursor-pointer h-8 w-8 rounded-xl flex items-center justify-center transition-all duration-150 active:scale-95 ${isSidebarCollapsed
                  ? "bg-primary/10 text-primary border border-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
              >
                {isSidebarCollapsed ? (
                  <PanelRightOpen className="h-4 w-4 text-primary" />
                ) : (
                  <PanelRightClose className="h-4 w-4" />
                )}
              </button>
            )}

            {/* Theme Toggle */}
            <button
              onClick={handleToggleDarkMode}
              title={effectiveDarkMode ? "Switch to light mode" : "Switch to dark mode"}
              className="cursor-pointer h-8 w-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-150 active:scale-95 group"
            >
              {effectiveDarkMode ? (
                <Sun className="h-4 w-4 text-amber-400 group-hover:rotate-45 transition-transform duration-300" />
              ) : (
                <Moon className="h-4 w-4 text-indigo-400 group-hover:-rotate-12 transition-transform duration-300" />
              )}
            </button>
          </div>

          {/* Mobile: Right Tools */}
          <div className="flex items-center gap-1 md:hidden">
            <button
              onClick={handleToggleDarkMode}
              className="cursor-pointer h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent"
              aria-label="Toggle theme"
            >
              {effectiveDarkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-indigo-400" />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="cursor-pointer h-8 w-8 rounded-lg border border-border flex items-center justify-center text-foreground hover:bg-accent"
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>

          {/* Mobile Menu Popover */}
          {mobileMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs md:hidden"
                onClick={() => setMobileMenuOpen(false)}
              />
              <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-card border border-border rounded-2xl shadow-xl md:hidden flex flex-col gap-2 z-50 text-xs animate-in fade-in-50 zoom-in-95 duration-150">
                {/* Views */}
                <div className="grid grid-cols-3 gap-1 pb-2 border-b border-border/60">
                  {views.map(({ id, label, Icon }) => {
                    const isActive = currentView === id;
                    return (
                      <button
                        key={id}
                        onClick={() => {
                          handleViewChange(id);
                          setMobileMenuOpen(false);
                        }}
                        className={`py-2 rounded-xl font-semibold flex flex-col items-center gap-1 cursor-pointer transition-all ${isActive
                          ? "bg-primary/10 text-primary border border-primary/20"
                          : "bg-muted/40 text-muted-foreground hover:bg-muted"
                          }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Mobile Title */}
                <div className="flex items-center gap-1.5 px-1 pt-1 text-[11px] font-bold text-foreground">
                  <Settings className="w-3.5 h-3.5 text-primary" />
                  <span>Tools &amp; Settings</span>
                </div>

                {/* Mobile Tools with Vibrant Colors */}
                <button
                  onClick={handleTour}
                  className="cursor-pointer flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-primary/10 text-primary border border-primary/20 font-bold transition-colors"
                >
                  <div className="p-1 rounded-md bg-primary/20 text-primary">
                    <Compass className="w-4 h-4" />
                  </div>
                  <span>Start Platform Tour</span>
                </button>

                <button
                  onClick={handleSearch}
                  className="cursor-pointer flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-blue-500/10 font-medium text-foreground transition-colors group"
                >
                  <span className="flex items-center gap-2.5">
                    <div className="p-1 rounded-md bg-blue-500/10 text-blue-400">
                      <Search className="w-4 h-4" />
                    </div>
                    <span>Search (⌘K)</span>
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">3,142 Cos.</span>
                </button>

                <button
                  onClick={handleCompare}
                  className="cursor-pointer flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-violet-500/10 font-medium text-foreground transition-colors"
                >
                  <div className="p-1 rounded-md bg-violet-500/10 text-violet-400">
                    <Scale className="w-4 h-4" />
                  </div>
                  <span>Compare Counties</span>
                </button>

                <button
                  onClick={handleExport}
                  className="cursor-pointer flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-emerald-500/10 font-medium text-foreground transition-colors"
                >
                  <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-400">
                    <FileUp className="w-4 h-4" />
                  </div>
                  <span>Export PDF Report</span>
                </button>

                <button
                  onClick={handleDistrict}
                  className="cursor-pointer flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-amber-500/10 font-medium text-foreground transition-colors"
                >
                  <div className="p-1 rounded-md bg-amber-500/10 text-amber-400">
                    <Landmark className="w-4 h-4" />
                  </div>
                  <span>My District (NV-02)</span>
                </button>

                <button
                  onClick={handleToggleSimple}
                  className="cursor-pointer flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-rose-500/10 font-medium text-foreground transition-colors"
                >
                  <span className="flex items-center gap-2.5">
                    <div className="p-1 rounded-md bg-rose-500/10 text-rose-400">
                      <SquaresSubtract className="w-4 h-4" />
                    </div>
                    <span>Simplified Mode</span>
                  </span>
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${effectiveSimpleMode
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      : "bg-muted text-muted-foreground"
                      }`}
                  >
                    {effectiveSimpleMode ? "ON" : "OFF"}
                  </span>
                </button>

                <button
                  onClick={handleShare}
                  className="cursor-pointer flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-sky-500/10 font-medium text-foreground transition-colors"
                >
                  <div className="p-1 rounded-md bg-sky-500/10 text-sky-400">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <span>Copy Share Link</span>
                </button>

                {/* Mobile Earth Prize Ribbon */}
                <div className="mt-1 pt-2 border-t border-border/60">
                  <div className="px-2.5 py-2 rounded-xl bg-muted/50 border border-border/60 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-[11px] font-bold text-foreground">Earth Prize 2026</span>
                    </div>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                      Candidate
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </header>
      </motion.div>

      {/* Copied Toast */}
      {copiedToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border shadow-lg text-xs font-medium text-foreground animate-in fade-in-50">
          <Check className="w-3.5 h-3.5 text-emerald-500" />
          <span>Link copied to clipboard</span>
        </div>
      )}
    </>
  );
}
