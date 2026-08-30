"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  motion,
  AnimatePresence,
  useScroll,
  useSpring,
  useInView,
  useMotionValue,
  useTransform,
  animate,
  type Variants,
} from "framer-motion";
import Header from "@/app/_components/header/Header";
import SearchModal from "@/app/_components/search/SearchModal";

import {
  Map as MapIcon,
  HeartPulse,
  Stethoscope,
  ArrowRight,
  Landmark,
  ChevronRight,
  ChevronDown,
  Activity,
  Layers,
  Search,
  ShieldCheck,
  FileSpreadsheet,
  ExternalLink,
  CheckCircle2,
  Compass,
  Zap,
  AlertTriangle,
  Microscope,
  TrendingUp,
} from "lucide-react";
import { fetchCountyData, fetchCitiesData, CityEntry } from "@/app/_lib/data-utils";
import { CountyDataMap } from "@/app/_lib/types";
import { SearchResultItem, performSearch } from "@/app/_lib/search-utils";

// ── Animation Variants ────────────────────────────────────────────────────────
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const sectionScrollVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

// ── Animated Number Component ─────────────────────────────────────────────────
function AnimatedCount({
  value,
  duration = 1.2,
  className = "",
}: {
  value: number;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });
  const motionVal = useMotionValue(0);
  const rounded = useTransform(motionVal, (latest) =>
    Math.round(latest).toLocaleString()
  );

  useEffect(() => {
    if (isInView) {
      const controls = animate(motionVal, value, {
        duration,
        ease: [0.16, 1, 0.3, 1],
      });
      return controls.stop;
    }
  }, [isInView, value, duration, motionVal]);

  return (
    <motion.span ref={ref} className={className}>
      {rounded}
    </motion.span>
  );
}

// ── Bento Metric Config ───────────────────────────────────────────────────────
interface MetricConfig {
  id: string;
  name: string;
  unit: string;
  natAvg: string;
  description: string;
  range: string;
  gradient: string;
  color: string;
  mapParam: string;
  bars: number[];
}

const BENTO_METRICS: MetricConfig[] = [
  {
    id: "overallRisk",
    name: "Composite Risk Index",
    unit: "0 - 100 Index",
    natAvg: "52.4",
    description: "Multivariate weighted index combining air quality, toxic burden, and respiratory mortality.",
    range: "12 (Low) → 94 (Critical)",
    gradient: "from-emerald-500/15 via-amber-500/15 to-red-500/20",
    color: "text-amber-400",
    mapParam: "overallRisk",
    bars: [22, 38, 54, 72, 88, 64, 45, 30],
  },
  {
    id: "pm25Avg",
    name: "Ambient PM2.5",
    unit: "µg/m³",
    natAvg: "7.85 µg/m³",
    description: "EPA NAAQS ground monitor & satellite calibrated fine particulate matter.",
    range: "3.2 µg/m³ → 14.8 µg/m³",
    gradient: "from-sky-500/15 via-primary/15 to-rose-500/20",
    color: "text-primary",
    mapParam: "pm25Avg",
    bars: [15, 28, 48, 80, 62, 40, 24, 12],
  },
  {
    id: "toxicReleases",
    name: "EPA TRI Releases",
    unit: "Lbs / Year",
    natAvg: "245k lbs",
    description: "EPA Toxic Release Inventory reporting annual chemical pounds discharged to environment.",
    range: "0 lbs → 12.5M lbs",
    gradient: "from-emerald-500/15 via-purple-500/15 to-amber-500/20",
    color: "text-amber-300",
    mapParam: "toxicReleases",
    bars: [85, 45, 28, 18, 12, 8, 5, 2],
  },
  {
    id: "mortalityRate",
    name: "CDC Resp. Mortality",
    unit: "Deaths / 100k",
    natAvg: "68.4",
    description: "CDC WONDER age-adjusted mortality rate per 100,000 from chronic lower respiratory diseases.",
    range: "28.1 → 134.8",
    gradient: "from-teal-500/15 via-rose-500/15 to-red-600/20",
    color: "text-rose-400",
    mapParam: "mortalityRate",
    bars: [18, 32, 58, 76, 68, 48, 26, 14],
  },
  {
    id: "asthmaPrev",
    name: "Adult Asthma",
    unit: "% Adults",
    natAvg: "9.8%",
    description: "CDC PLACES crude adult prevalence diagnosed with active chronic asthma symptoms.",
    range: "7.1% → 14.2%",
    gradient: "from-blue-500/15 via-cyan-500/15 to-emerald-500/20",
    color: "text-cyan-400",
    mapParam: "asthmaPrev",
    bars: [12, 25, 62, 84, 55, 30, 16, 8],
  },
  {
    id: "copdPrev",
    name: "Chronic COPD",
    unit: "% Adults",
    natAvg: "7.6%",
    description: "CDC PLACES chronic obstructive pulmonary disease prevalence among adults 18 and older.",
    range: "4.2% → 16.8%",
    gradient: "from-emerald-500/15 via-amber-500/15 to-rose-500/20",
    color: "text-amber-400",
    mapParam: "copdPrev",
    bars: [14, 30, 52, 70, 60, 42, 28, 12],
  },
];

// ── Temporal Timeline Points ──────────────────────────────────────────────────
const TEMPORAL_POINTS = [
  { year: 2018, pm25: 8.6, event: "Baseline Measurement Year" },
  { year: 2019, pm25: 8.3, event: "Industrial Emission Reductions" },
  { year: 2020, pm25: 8.9, event: "Severe Western Wildfire Season" },
  { year: 2021, pm25: 8.5, event: "Post-Pandemic Economic Recovery" },
  { year: 2022, pm25: 8.1, event: "Enhanced Clean Air Act Standard" },
  { year: 2023, pm25: 8.4, event: "Canadian Wildfire Smoke Inflow" },
  { year: 2024, pm25: 7.8, event: "Current EPA 9.0 µg/m³ Primary Standard" },
];

export default function LandingPage() {
  const router = useRouter();
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme");
      if (saved === "light") return false;
      if (saved === "dark") return true;
      return document.documentElement.classList.contains("dark");
    }
    return true;
  });

  const [activeMetricId, setActiveMetricId] = useState<string>("overallRisk");
  const [selectedYearIdx, setSelectedYearIdx] = useState<number>(6);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [countyData, setCountyData] = useState<CountyDataMap | null>(null);
  const [citiesData, setCitiesData] = useState<CityEntry[]>([]);

  const { scrollYProgress } = useScroll();
  const smoothScrollProgress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001,
  });

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "light") {
      document.documentElement.classList.remove("dark");
    } else {
      document.documentElement.classList.add("dark");
    }
    fetchCountyData().then((data) => setCountyData(data)).catch(() => {});
    fetchCitiesData().then((cities) => setCitiesData(cities)).catch(() => {});
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchModalOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleToggleDarkMode = () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    try { localStorage.setItem("theme", nextDark ? "dark" : "light"); } catch { /* ignore */ }
    if (nextDark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  };

  const handleViewChange = (view: "map" | "analysis" | "sources") => {
    if (view === "map") router.push("/map");
    else if (view === "analysis") router.push("/lab");
    else if (view === "sources") router.push("/sources");
  };

  const handleSelectSearchResult = (result: SearchResultItem) => {
    if (result.fips) {
      if (result.coordinates) {
        router.push(`/map?fips=${result.fips}&lat=${result.coordinates[1]}&lng=${result.coordinates[0]}&zoom=${result.zoom || 4.2}`);
      } else {
        router.push(`/map?fips=${result.fips}`);
      }
    } else if (result.coordinates) {
      router.push(`/map?lat=${result.coordinates[1]}&lng=${result.coordinates[0]}&zoom=${result.zoom || 4.0}`);
    } else {
      router.push(`/map?search=${encodeURIComponent(result.title)}`);
    }
  };

  const handleHeroSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setIsSearchModalOpen(true);
      return;
    }
    const results = performSearch(searchQuery, countyData || {}, citiesData);
    if (results.length > 0) {
      handleSelectSearchResult(results[0]);
    } else {
      router.push(`/map?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const activeMetric = useMemo(() => {
    return BENTO_METRICS.find((m) => m.id === activeMetricId) || BENTO_METRICS[0];
  }, [activeMetricId]);

  const inlineSearchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return performSearch(searchQuery, countyData || {}, citiesData).slice(0, 5);
  }, [searchQuery, countyData, citiesData]);

  const activeTemporal = TEMPORAL_POINTS[selectedYearIdx];

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="relative flex flex-col min-h-screen w-full bg-background text-foreground overflow-x-hidden selection:bg-primary/30 selection:text-primary-foreground"
    >
      {/* ── Scroll Progress Bar ───────────────────────────────────── */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary via-amber-300 to-primary origin-left z-50"
        style={{ scaleX: smoothScrollProgress }}
      />

      {/* ── Search Modal ──────────────────────────────────────────── */}
      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        countyData={countyData || {}}
        allCities={citiesData}
        onSelectResult={handleSelectSearchResult}
      />

      {/* ════════════════════════════════════════════════════════════
          SECTION 1 — HERO (100vh)
          WebGL Grainient background, headline, search, stat pills
      ════════════════════════════════════════════════════════════ */}
      <section className="relative min-h-screen w-full flex flex-col overflow-hidden">
        {/* Dot-grid background */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          {/* SVG dot grid */}
          <div
            className="absolute inset-0 text-foreground/[0.18] dark:text-foreground/[0.22]"
            style={{
              backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`,
              backgroundSize: "28px 28px",
            }}
          />
          {/* Radial fade — center visible, soft fade to edges */}
          <div
            className="absolute inset-0"
            style={{
              background: "radial-gradient(ellipse 80% 65% at 50% 40%, transparent 20%, var(--background) 95%)",
            }}
          />
        </div>

        {/* Nav */}
        <div className="relative z-40 px-3 sm:px-6 pt-3 sm:pt-4">
          <Header
            activeView="map"
            onViewChange={handleViewChange}
            isDarkMode={isDarkMode}
            onToggleDarkMode={handleToggleDarkMode}
            onOpenSearch={() => setIsSearchModalOpen(true)}
            onOpenDistrict={() => router.push("/map?fips=32031")}
          />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 pt-8 pb-16 text-center max-w-5xl mx-auto w-full gap-7">

          {/* Status pill */}
          <motion.div variants={itemVariants}>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-card/60 border border-border/80 text-[11px] font-medium backdrop-blur-xl shadow-sm">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
              </span>
              <span className="font-bold text-primary tracking-wide uppercase">Live</span>
              <span className="text-muted-foreground/60">·</span>
              <span className="text-muted-foreground">3,142 counties indexed</span>
              <span className="text-muted-foreground/60 hidden sm:inline">·</span>
              <span className="text-muted-foreground hidden sm:inline">EPA & CDC validated</span>
            </div>
          </motion.div>

          {/* Headline */}
          <motion.div variants={itemVariants} className="space-y-4 max-w-3xl">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tighter text-foreground leading-[1.1]">
              U.S. Environmental<br />
              Risk Intelligence<br />
              <span className="relative inline-block">
                at County Resolution
                <span className="absolute -bottom-1 left-0 right-0 h-[3px] rounded-full bg-primary/60" />
              </span>
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-lg mx-auto leading-relaxed">
              Epidemiological surveillance mapping PM2.5, EPA toxics, and CDC respiratory mortality
              across every U.S. county — 2018 through 2024.
            </p>
          </motion.div>

          {/* Search bar */}
          <motion.div variants={itemVariants} className="w-full max-w-2xl mx-auto relative">
            <form onSubmit={handleHeroSearchSubmit} className="relative flex items-center">
              <Search className="absolute left-4 w-4.5 h-4.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search any county, city, or state…"
                className="w-full pl-11 pr-28 py-3.5 rounded-2xl bg-card/70 border border-border/80 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/60 transition-all shadow-lg backdrop-blur-xl"
              />
              <button
                type="submit"
                id="hero-search-submit-btn"
                className="cursor-pointer absolute right-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1.5"
              >
                <span>Search</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Inline dropdown */}
            <AnimatePresence>
              {inlineSearchResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="absolute top-full left-0 right-0 mt-2 z-30 bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl overflow-hidden divide-y divide-border/60 text-left"
                >
                  {inlineSearchResults.map((res) => (
                    <button
                      key={res.id}
                      type="button"
                      onClick={() => { handleSelectSearchResult(res); setSearchQuery(""); }}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-accent transition-colors text-left group cursor-pointer"
                    >
                      <div>
                        <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{res.title}</div>
                        <div className="text-xs text-muted-foreground">{res.subtitle}</div>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-primary font-medium">
                        <span>Open on Map</span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Quick chips */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2.5 text-xs text-muted-foreground">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">Try:</span>
              {[
                { label: "Washoe, NV", fips: "32031" },
                { label: "Harris Co.", fips: "48201" },
                { label: "Cook Co.", fips: "17031" },
                { label: "Los Angeles", fips: "06037" },
                { label: "Allegheny", fips: "42003" },
              ].map((chip) => (
                <button
                  key={chip.fips}
                  type="button"
                  onClick={() => router.push(`/map?fips=${chip.fips}`)}
                  className="cursor-pointer px-2 py-0.5 rounded-md bg-card/60 hover:bg-card border border-border/60 hover:border-primary/40 text-foreground/70 hover:text-foreground text-[11px] font-medium transition-all backdrop-blur-sm"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto">
            <Link
              href="/map"
              id="landing-launch-map-btn"
              className="group relative w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-lg shadow-primary/25 hover:bg-primary/95 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <MapIcon className="w-4 h-4 transition-transform group-hover:rotate-6" />
              <span>Launch Map</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/lab"
              className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-card/60 backdrop-blur-xl border border-border/80 text-foreground font-semibold text-sm hover:bg-card hover:border-rose-400/50 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-sm"
            >
              <Stethoscope className="w-4 h-4 text-rose-400 transition-transform group-hover:scale-110" />
              <span>Epidemiological Lab</span>
            </Link>
            <Link
              href="/map?fips=32031"
              className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-card/60 backdrop-blur-xl border border-border/80 text-foreground font-semibold text-sm hover:bg-card hover:border-amber-400/50 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-sm"
            >
              <Landmark className="w-4 h-4 text-amber-400" />
              <span>NV-02 Case Study</span>
            </Link>
          </motion.div>

          {/* ── Stat Pills Row (embedded in hero) ─────────────── */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full max-w-2xl mt-2"
          >
            {[
              { label: "Counties", value: 3142, suffix: "", icon: <MapIcon className="w-3.5 h-3.5" />, color: "text-primary" },
              { label: "Coverage", value: 100, suffix: "%", icon: <ShieldCheck className="w-3.5 h-3.5" />, color: "text-emerald-400" },
              { label: "Indices", value: 9, suffix: "", icon: <Layers className="w-3.5 h-3.5" />, color: "text-rose-400" },
              { label: "Latency", value: 50, prefix: "<", suffix: "ms", icon: <Zap className="w-3.5 h-3.5" />, color: "text-amber-400" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col items-center justify-center gap-1 p-3 rounded-xl bg-card/50 backdrop-blur-xl border border-border/60 text-center"
              >
                <div className={`${stat.color}`}>{stat.icon}</div>
                <div className="text-xl font-extrabold font-mono text-foreground tracking-tight leading-none">
                  {stat.prefix && <span className="text-sm font-bold text-muted-foreground">{stat.prefix}</span>}
                  <AnimatedCount value={stat.value} duration={1.0} />
                  {stat.suffix && <span className="text-sm font-bold text-muted-foreground ml-0.5">{stat.suffix}</span>}
                </div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">{stat.label}</div>
              </div>
            ))}
          </motion.div>

          {/* Scroll cue */}
          <motion.div
            variants={itemVariants}
            animate={{ y: [0, 5, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <a
              href="#bento-grid"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            >
              <span>Explore platform</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </a>
          </motion.div>
        </div>
      </section>

      {/* ── Section Divider: Hero → Bento ─────────────────────────── */}
      <div className="relative max-w-7xl mx-auto w-full px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground/40 select-none">
            <span>Platform</span>
          </div>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          SECTION 2 — BORDER GRID BENTO
          Shared 1px borders, no gap, hover glow on each cell
      ════════════════════════════════════════════════════════════ */}
      <section id="bento-grid" className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-10">

        {/* Section label */}
        <motion.div
          variants={sectionScrollVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          className="flex items-center gap-3 mb-8"
        >
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-primary uppercase tracking-widest">
            <Layers className="w-3.5 h-3.5" />
            <span>Platform</span>
          </div>
          <div className="flex-1 h-px bg-border" />
          <p className="text-[11px] text-muted-foreground hidden sm:block">National geospatial · OLS regression · Temporal playback</p>
        </motion.div>

        {/* Border grid — outer wrapper has the shared border */}
        <motion.div
          variants={sectionScrollVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="border border-border rounded-2xl overflow-hidden"
        >
          {/* ── ROW 1: Map (7/12) + Lab (5/12) ─────────────────── */}
          <div className="grid grid-cols-12">

            {/* Cell 1 — Spatial Choropleth (7 cols) */}
            <div className="col-span-12 lg:col-span-7 p-6 sm:p-8 border-b border-border lg:border-b-0 lg:border-r hover:bg-primary/[0.02] transition-colors group">
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                      <MapIcon className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-primary font-bold uppercase tracking-widest block">
                        Interactive Map
                      </span>
                      <h3 className="text-lg font-bold text-foreground leading-tight">
                        Spatial Choropleth Navigator
                      </h3>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-muted border border-border text-muted-foreground shrink-0 mt-1">
                    3,142 counties
                  </span>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  Continuous choropleth mapping across all 3,142 U.S. counties with dynamic color-ramps, county boundary inspection, and dual-county comparative audits.
                </p>

                {/* Metric selector tabs */}
                <div className="space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                    Preview metric distribution
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {BENTO_METRICS.map((m) => {
                      const isActive = m.id === activeMetricId;
                      return (
                        <button
                          key={m.id}
                          onClick={() => setActiveMetricId(m.id)}
                          className={`cursor-pointer px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                            isActive
                              ? "bg-primary text-primary-foreground font-bold shadow-sm"
                              : "bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {m.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Live mini-viz */}
                <div className={`p-4 rounded-xl bg-gradient-to-r ${activeMetric.gradient} border border-border/60 space-y-3`}>
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-foreground">{activeMetric.name}</span>
                      <span className="text-muted-foreground ml-1.5 font-mono">({activeMetric.unit})</span>
                    </div>
                    <div className="font-mono font-bold text-foreground text-[11px]">
                      Nat. Avg: <span className={activeMetric.color}>{activeMetric.natAvg}</span>
                    </div>
                  </div>
                  <div className="flex items-end gap-1.5 h-12">
                    {activeMetric.bars.map((height, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                        <div
                          className="w-full bg-primary/60 hover:bg-primary rounded-sm transition-all duration-300"
                          style={{ height: `${height}%` }}
                        />
                        <span className="text-[8px] font-mono text-muted-foreground">Q{i + 1}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/30">
                    <span>{activeMetric.range}</span>
                    <span className="text-foreground font-medium">Full 50-state coverage</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 mt-4 border-t border-border">
                <span className="text-[11px] text-muted-foreground">2018–2024 temporal playback included</span>
                <Link
                  href={`/map?metric=${activeMetric.mapParam}`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-primary group-hover:translate-x-0.5 transition-transform"
                >
                  <span>Explore on Map</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Cell 2 — Epidemiological Lab (5 cols) */}
            <div className="col-span-12 lg:col-span-5 p-6 sm:p-8 border-b border-border lg:border-b-0 hover:bg-rose-500/[0.02] transition-colors group">
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400">
                      <Stethoscope className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-rose-400 font-bold uppercase tracking-widest block">
                        Statistical Suite
                      </span>
                      <h3 className="text-lg font-bold text-foreground leading-tight">
                        Epidemiological Lab
                      </h3>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-muted border border-border text-muted-foreground shrink-0 mt-1">
                    OLS Engine
                  </span>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  Bivariate & multivariate Ordinary Least Squares regression testing air pollution impacts against respiratory mortality and social vulnerability.
                </p>

                {/* OLS viz */}
                <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">PM2.5 vs. Mortality</span>
                    <span className="font-mono text-emerald-400 font-bold text-[11px]">p &lt; 0.001</span>
                  </div>
                  <div className="relative h-20 w-full bg-card/60 rounded-lg border border-border/50 overflow-hidden">
                    <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                      <line x1="8%" y1="82%" x2="92%" y2="18%" stroke="currentColor" strokeWidth="2" className="text-primary" strokeDasharray="none" />
                    </svg>
                    {[
                      { top: "12%", left: "8%", color: "bg-rose-400/70" },
                      { top: "22%", left: "20%", color: "bg-primary/80" },
                      { top: "38%", left: "34%", color: "bg-amber-400/70" },
                      { top: "18%", left: "50%", color: "bg-cyan-400/70" },
                      { top: "52%", left: "62%", color: "bg-primary/80" },
                      { top: "30%", left: "76%", color: "bg-rose-400/70" },
                      { top: "14%", left: "88%", color: "bg-emerald-400/70" },
                    ].map((dot, i) => (
                      <div
                        key={i}
                        className={`absolute w-2 h-2 rounded-full ${dot.color}`}
                        style={{ top: dot.top, left: dot.left }}
                      />
                    ))}
                    <div className="absolute bottom-1.5 right-2 text-[9px] font-mono text-muted-foreground bg-card/90 px-1.5 py-0.5 rounded border border-border">
                      R² = 0.412 · N = 3,142
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                    <div className="p-2 rounded-lg bg-card border border-border/60">
                      <div className="text-muted-foreground text-[9px] uppercase tracking-wide">Slope (β)</div>
                      <div className="font-bold text-foreground mt-0.5">+3.84 deaths/µg</div>
                    </div>
                    <div className="p-2 rounded-lg bg-card border border-border/60">
                      <div className="text-muted-foreground text-[9px] uppercase tracking-wide">T-Stat</div>
                      <div className="font-bold text-emerald-400 mt-0.5">+14.82 ✓</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 mt-4 border-t border-border">
                <span className="text-[11px] text-muted-foreground">Scatter plots & SVI quintiles</span>
                <Link
                  href="/lab"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-400 group-hover:translate-x-0.5 transition-transform"
                >
                  <span>Launch Lab</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* ── ROW 2: Timeline (4) + NV-02 (4) + Export (4) ────── */}
          <div className="grid grid-cols-12 border-t border-border">

            {/* Cell 3 — Temporal Trends (4 cols) */}
            <div className="col-span-12 md:col-span-4 p-6 border-b border-border md:border-b-0 md:border-r hover:bg-amber-500/[0.02] transition-colors group">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-amber-400 font-bold uppercase tracking-widest block">2018–2024</span>
                      <h3 className="text-sm font-bold text-foreground">Temporal Trends</h3>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  Track county particulate shifts across 7 annual snapshots. Wildfire seasons, policy changes, emission events.
                </p>

                {/* Year scrubber */}
                <div className="p-3.5 rounded-xl bg-muted/30 border border-border space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground">{activeTemporal.year}</span>
                    <span className="font-mono text-primary font-bold">{activeTemporal.pm25} µg/m³</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="6"
                    step="1"
                    value={selectedYearIdx}
                    onChange={(e) => setSelectedYearIdx(parseInt(e.target.value, 10))}
                    className="w-full h-1 bg-border rounded-full appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-muted-foreground">
                    <span>2018</span><span>2021</span><span>2024</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground bg-card p-2 rounded-lg border border-border/50">
                    <span className="font-semibold text-foreground">Event: </span>{activeTemporal.event}
                  </div>
                </div>
              </div>

              <Link
                href="/map"
                className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 mt-4 pt-4 border-t border-border w-full group-hover:translate-x-0.5 transition-transform"
              >
                <span>Scrub timeline on map</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Cell 4 — NV-02 Case Study (4 cols) */}
            <div className="col-span-12 md:col-span-4 p-6 border-b border-border md:border-b-0 md:border-r hover:bg-amber-500/[0.02] transition-colors group">
              <div className="space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                    <Landmark className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-amber-400 font-bold uppercase tracking-widest block">Legislative</span>
                    <h3 className="text-sm font-bold text-foreground">NV-02 Case Study</h3>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  Nevada's 2nd District — mining corridor emissions, rural healthcare access, and high-desert particulate dynamics.
                </p>

                <div className="p-3.5 rounded-xl bg-muted/30 border border-border space-y-2 text-xs">
                  {[
                    { label: "Key Counties", value: "Washoe, Elko, Humboldt", color: "text-foreground" },
                    { label: "Provider Ratio", value: "1:2,450 (Deficit)", color: "text-rose-400" },
                    { label: "Wildfire Risk", value: "Elevated — Tier 4", color: "text-amber-400" },
                    { label: "FIPS", value: "32031 (Washoe)", color: "text-primary" },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between">
                      <span className="text-muted-foreground">{row.label}</span>
                      <span className={`font-mono font-bold text-[11px] ${row.color}`}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Link
                href="/map?fips=32031"
                className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 mt-4 pt-4 border-t border-border w-full group-hover:translate-x-0.5 transition-transform"
              >
                <span>Open NV-02 deep dive</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Cell 5 — Clinical Export (4 cols) */}
            <div className="col-span-12 md:col-span-4 p-6 hover:bg-cyan-500/[0.02] transition-colors group">
              <div className="space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-widest block">Pub. Ready</span>
                    <h3 className="text-sm font-bold text-foreground">Clinical Dossier & PDF</h3>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  Publication-ready epidemiological reports, multi-metric radar charts, and single/dual-county policy dossiers.
                </p>

                <div className="p-3.5 rounded-xl bg-muted/30 border border-border space-y-2">
                  {[
                    "Single & dual-county comparison",
                    "EPA NAAQS compliance benchmarks",
                    "High-resolution vector PDF format",
                    "Multi-metric radar chart overlay",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Link
                href="/map?export=true"
                className="inline-flex items-center gap-1 text-xs font-bold text-cyan-400 mt-4 pt-4 border-t border-border w-full group-hover:translate-x-0.5 transition-transform"
              >
                <span>Export county report</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          SECTION 2.5 — KEY RESEARCH FINDINGS
          The headline empirical results from the epidemiological analysis
      ════════════════════════════════════════════════════════════ */}

      {/* ── Section Divider: Bento → Findings ────────────────────── */}
      <div className="relative max-w-7xl mx-auto w-full px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground/40 select-none">
            <span>Findings</span>
          </div>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>
      </div>

      <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-10">
        {/* Section header */}
        <motion.div
          variants={sectionScrollVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          className="flex items-center gap-3 mb-8"
        >
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-rose-400 uppercase tracking-widest">
            <Microscope className="w-3.5 h-3.5" />
            <span>Key Research Findings</span>
          </div>
          <div className="flex-1 h-px bg-border" />
          <p className="text-[11px] text-muted-foreground hidden sm:block">Empirical results from 2,953 U.S. counties · 2018–2022</p>
        </motion.div>

        <motion.div
          variants={sectionScrollVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {/* Finding 1 — EJ Hotspot Counties */}
          <div className="group relative p-5 rounded-2xl border border-border bg-card/50 hover:bg-rose-500/[0.03] transition-all space-y-3 overflow-hidden">
            <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-rose-500/5 blur-2xl pointer-events-none" />
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-mono text-rose-400 font-bold uppercase tracking-widest">EJ Hotspots</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold font-mono text-foreground tracking-tighter">74</span>
              <span className="text-sm font-bold text-muted-foreground">counties</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Simultaneously in the <span className="font-bold text-foreground">top quartile</span> for PM₂.₅ pollution, respiratory mortality, and poverty — averaging <span className="font-bold text-rose-400">+59% higher</span> respiratory death rates than the national average.
            </p>
            <div className="text-[9px] font-mono text-muted-foreground/60 pt-1 border-t border-border/40">
              Tri-quartile intersection · N = 2,953
            </div>
          </div>

          {/* Finding 2 — Rural PM2.5 Signal */}
          <div className="group relative p-5 rounded-2xl border border-border bg-card/50 hover:bg-amber-500/[0.03] transition-all space-y-3 overflow-hidden">
            <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-amber-500/5 blur-2xl pointer-events-none" />
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                <TrendingUp className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-mono text-amber-400 font-bold uppercase tracking-widest">Rural Signal</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold font-mono text-foreground tracking-tighter">r = 0.172</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              In <span className="font-bold text-foreground">rural counties</span> (RUCC 7–9), PM₂.₅ concentration is a <span className="font-bold text-amber-400">significant predictor</span> of respiratory mortality even after controlling for poverty and smoking.
            </p>
            <div className="text-[9px] font-mono text-muted-foreground/60 pt-1 border-t border-border/40">
              p &lt; 0.001 · N = 1,138 rural counties
            </div>
          </div>

          {/* Finding 3 — 5-Variable Model */}
          <div className="group relative p-5 rounded-2xl border border-border bg-card/50 hover:bg-primary/[0.03] transition-all space-y-3 overflow-hidden">
            <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-primary/5 blur-2xl pointer-events-none" />
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Stethoscope className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-mono text-primary font-bold uppercase tracking-widest">Regression</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold font-mono text-foreground tracking-tighter">R² = 35.4%</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              A 5-variable OLS model (PM₂.₅, smoking, poverty, race, uninsured) jointly explains <span className="font-bold text-primary">35.4%</span> of county-level respiratory mortality variance nationally.
            </p>
            <div className="text-[9px] font-mono text-muted-foreground/60 pt-1 border-t border-border/40">
              Multiple regression · N = 2,953
            </div>
          </div>

          {/* Finding 4 — Dominant Driver */}
          <div className="group relative p-5 rounded-2xl border border-border bg-card/50 hover:bg-emerald-500/[0.03] transition-all space-y-3 overflow-hidden">
            <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-emerald-500/5 blur-2xl pointer-events-none" />
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <Activity className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-widest">Key Driver</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold font-mono text-foreground tracking-tighter">27%</span>
              <span className="text-sm font-bold text-muted-foreground">variance</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              <span className="font-bold text-foreground">Smoking prevalence</span> is the single strongest county-level predictor of respiratory mortality (r = 0.52), explaining <span className="font-bold text-emerald-400">27%</span> of all variation.
            </p>
            <div className="text-[9px] font-mono text-muted-foreground/60 pt-1 border-t border-border/40">
              Pearson r = 0.521 · p &lt; 0.001
            </div>
          </div>
        </motion.div>

        {/* Research methodology note */}
        <motion.div
          variants={sectionScrollVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          className="mt-6 p-4 rounded-xl border border-border/60 bg-card/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
        >
          <div className="text-[11px] text-muted-foreground leading-relaxed">
            <span className="font-bold text-foreground">Study design:</span> Observational cross-sectional ecological analysis of 2,953 U.S. counties using EPA AQS, CDC WONDER, Census ACS, CDC PLACES, and USDA RUCC federal datasets (2018–2022 five-year averages). Results represent county-level associations, not individual-level causal effects.
          </div>
          <Link
            href="/lab"
            className="shrink-0 inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
          >
            <span>Explore in Lab</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </motion.div>
      </section>

      {/* ── Section Divider: Findings → CTA ─────────────────────────── */}
      <div className="relative max-w-7xl mx-auto w-full px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground/40 select-none">
            <span>Get Started</span>
          </div>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          SECTION 3 — CTA STRIP
          Gradient banner + 2 buttons + data source pill badges
      ════════════════════════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 pb-14 pt-10">
        <motion.div
          variants={sectionScrollVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-card via-card to-primary/8 p-8 sm:p-12"
        >
          {/* Ambient glow */}
          <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-primary/8 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-amber-500/6 blur-3xl pointer-events-none" />

          <div className="relative flex flex-col lg:flex-row items-center lg:items-start justify-between gap-8">
            <div className="space-y-4 text-center lg:text-left max-w-xl">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight leading-tight">
                Ready to map national
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-amber-300">
                  environmental disparities?
                </span>
              </h2>
              <p className="text-sm text-muted-foreground">
                Launch the interactive choropleth or dive into the research lab. All data is validated and sourced from federal registries.
              </p>

              {/* Source badges */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 pt-1">
                {[
                  { label: "EPA AQS", color: "text-primary border-primary/30 bg-primary/8" },
                  { label: "CDC WONDER", color: "text-rose-400 border-rose-400/30 bg-rose-500/8" },
                  { label: "EPA TRI", color: "text-amber-400 border-amber-400/30 bg-amber-500/8" },
                  { label: "CDC ATSDR SVI", color: "text-cyan-400 border-cyan-400/30 bg-cyan-500/8" },
                  { label: "USDA RUCC", color: "text-emerald-400 border-emerald-400/30 bg-emerald-500/8" },
                ].map((badge) => (
                  <span
                    key={badge.label}
                    className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border ${badge.color}`}
                  >
                    {badge.label}
                  </span>
                ))}
                <Link
                  href="/sources"
                  className="text-[10px] font-mono font-bold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 ml-1"
                >
                  <span>Full docs</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </Link>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row lg:flex-col items-center gap-3 shrink-0">
              <Link
                href="/map"
                className="group w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <MapIcon className="w-4 h-4 transition-transform group-hover:rotate-6" />
                <span>Open Interactive Map</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/lab"
                className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-card border border-border text-foreground font-semibold text-sm hover:bg-accent hover:border-rose-400/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Stethoscope className="w-4 h-4 text-rose-400 transition-transform group-hover:scale-110" />
                <span>Statistical Lab</span>
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="w-full border-t border-border bg-card/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-primary/10 text-primary">
              <HeartPulse className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-foreground">US-SEER</span>
            <span className="text-muted-foreground/60">·</span>
            <span>U.S. Spatial Environmental Exposure & Respiratory Risk Index</span>
          </div>
          <div className="flex flex-wrap items-center gap-5 font-medium">
            <Link href="/map" className="hover:text-foreground transition-colors">Map</Link>
            <Link href="/lab" className="hover:text-foreground transition-colors">Lab</Link>
            <Link href="/sources" className="hover:text-foreground transition-colors">Sources</Link>
            <Link href="/map?fips=32031" className="hover:text-foreground transition-colors">NV-02</Link>
          </div>
        </div>
      </footer>
    </motion.div>
  );
}
