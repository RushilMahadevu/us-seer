"use client";

import React, { memo, useState, useRef, useEffect } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup, Marker } from "react-simple-maps";
import { scaleQuantize } from "d3-scale";
import { geoCentroid } from "d3-geo";
import { CountyDataMap } from "@/app/_lib/types";
import { GEO_URL, STATES_GEO_URL, CityEntry } from "@/app/_lib/data-utils";
import { SearchResultItem, performSearch, coordsFromFips } from "@/app/_lib/search-utils";
import { TRIFacility, TRI_FACILITIES } from "@/app/_lib/tri-facilities-data";
import { TemporalYear, getCountyDataForYear } from "@/app/_lib/temporal-data";
import TemporalScrubber from "@/app/_components/map/TemporalScrubber";
import { Card } from "@/app/_components/ui/card";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Home,
  MapPin,
  Layers,
  Focus,
  Settings,
  SlidersHorizontal,
  Eye,
  Zap,
  Sparkles,
  Navigation,
  Palette,
  Search,
  X,
  ChevronDown,
  Check,
  ShieldAlert,
  Wind,
  Activity,
  Droplets,
  Stethoscope,
  Factory,
  HeartPulse,
  Map,
  Building2,
  Landmark,
  Compass,
} from "lucide-react";

export type MapMetric =
  | "overallRisk"
  | "pm25Avg"
  | "mortalityRate"
  | "asthmaPrev"
  | "copdPrev"
  | "smokingPrev"
  | "rucc"
  | "mdRate"
  | "toxicReleases";

interface MapContainerProps {
  data: CountyDataMap;
  allCities?: CityEntry[];
  selectedFips: string | null;
  onSelectCounty: (fips: string) => void;
  metric: MapMetric;
  onMetricChange?: (metric: MapMetric) => void;
  mapTarget?: { coordinates: [number, number]; zoom: number; label?: string } | null;
  onClearTarget?: () => void;
  autoOpenAnalytics?: boolean;
  onToggleAutoOpenAnalytics?: (val: boolean) => void;
  selectedYear?: TemporalYear;
  onYearChange?: (year: TemporalYear) => void;
}

export const METRIC_OPTIONS: { value: MapMetric; label: string; icon: React.ReactNode }[] = [
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

const METRIC_CONFIG = {
  overallRisk: {
    domain: [20, 80],
    label: "Overall Health Vulnerability Index",
    unit: "Index (0-100)",
    range: ["#10b981", "#34d399", "#a3e635", "#facc15", "#fb923c", "#f87171", "#ef4444", "#dc2626", "#991b1b"]
  },
  pm25Avg: {
    domain: [5.5, 9.0],
    label: "PM2.5 Pollution (µg/m³)",
    unit: "µg/m³",
    range: ["#fef9c3", "#fde68a", "#fbbf24", "#f97316", "#ef4444", "#dc2626", "#b91c1c", "#991b1b", "#7f1d1d"]
  },
  mortalityRate: {
    domain: [36, 113],
    label: "Respiratory Mortality Rate",
    unit: "/ 100k",
    range: ["#eff6ff", "#dbeafe", "#bfdbfe", "#93c5fd", "#60a5fa", "#3b82f6", "#2563eb", "#1d4ed8", "#1e40af"]
  },
  asthmaPrev: {
    domain: [8.9, 11.4],
    label: "Asthma Prevalence",
    unit: "%",
    range: ["#fdf4ff", "#fae8ff", "#f5d0fe", "#f0abfc", "#e879f9", "#d946ef", "#c026d3", "#a21caf", "#86198f"]
  },
  copdPrev: {
    domain: [5.8, 11.2],
    label: "COPD Prevalence",
    unit: "%",
    range: ["#f0fdfa", "#ccfbf1", "#99f6e4", "#5eead4", "#2dd4bf", "#14b8a6", "#0d9488", "#0f766e", "#115e59"]
  },
  smokingPrev: {
    domain: [15.4, 25.4],
    label: "Smoking Prevalence",
    unit: "%",
    range: ["#fff7ed", "#ffedd5", "#fed7aa", "#fdba74", "#fb923c", "#f97316", "#ea580c", "#c2410c", "#9a3412"]
  },
  rucc: {
    domain: [1, 9],
    label: "Rural-Urban Code",
    unit: "RUCC",
    range: ["#f5f3ff", "#ede9fe", "#ddd6fe", "#c4b5fd", "#a78bfa", "#8b5cf6", "#7c3aed", "#6d28d9", "#5b21b6"]
  },
  mdRate: {
    domain: [250, 400],
    label: "Primary Care MDs",
    unit: "/ 100k",
    range: ["#f0fdf4", "#dcfce7", "#bbf7d0", "#86efac", "#4ade80", "#22c55e", "#16a34a", "#15803d", "#14532d"]
  },
  toxicReleases: {
    domain: [0, 500000],
    label: "Toxic Chemical Releases",
    unit: "lbs",
    range: ["#f8fafc", "#f1f5f9", "#e2e8f0", "#cbd5e1", "#94a3b8", "#64748b", "#475569", "#334155", "#0f172a"]
  }
};

// High-contrast, dynamic colors tailored to stand out against each metric's specific color palette
const SELECTED_REGION_COLORS: Record<MapMetric, string> = {
  overallRisk: "#8400ff",     // Vivid Cobalt / Royal Blue (pops sharply against Green-Yellow-Orange-Red scale)
  pm25Avg: "#0284c7",         // Deep Sky Blue (pops on Yellow-Orange-Red scale)
  mortalityRate: "#f59e0b",   // Vibrant Amber Gold (pops on Blue scale)
  asthmaPrev: "#10b981",      // Vivid Emerald (pops on Pink-Purple scale)
  copdPrev: "#ea580c",        // Vibrant Orange-Coral (pops on Teal scale)
  smokingPrev: "#06b6d4",     // Electric Cyan (pops on Orange-Rust scale)
  rucc: "#facc15",            // Bright Gold (pops on Violet-Purple scale)
  mdRate: "#ec4899",          // Electric Pink-Magenta (pops on Green scale)
  toxicReleases: "#38bdf8",   // Electric Sky Blue (pops on Slate-Navy scale)
};

function formatMetricValue(val: number | undefined, metric: MapMetric): string {
  if (val == null) return "No Data";
  const numStr = typeof val === "number" && val % 1 !== 0 ? val.toFixed(1) : val.toLocaleString();
  const cfg = METRIC_CONFIG[metric];
  if (!cfg) return numStr;
  if (cfg.unit.includes("Index")) return numStr;
  return `${numStr} ${cfg.unit}`;
}

const DEFAULT_CENTER: [number, number] = [-96, 38];
const INITIAL_CENTER: [number, number] = [DEFAULT_CENTER[0] - 3, DEFAULT_CENTER[1] - 1];
const INITIAL_ZOOM = 0.9;

function isSafeUsCenter(coords: any): coords is [number, number] {
  if (!Array.isArray(coords) || coords.length !== 2) return false;
  const [lon, lat] = coords;
  return (
    typeof lon === "number" &&
    !isNaN(lon) &&
    typeof lat === "number" &&
    !isNaN(lat) &&
    lon >= -126 &&
    lon <= -65 &&
    lat >= 23 &&
    lat <= 50
  );
}

const MapContainer = ({
  data,
  allCities,
  selectedFips,
  onSelectCounty,
  metric,
  onMetricChange,
  mapTarget,
  onClearTarget,
  autoOpenAnalytics,
  onToggleAutoOpenAnalytics,
  selectedYear,
  onYearChange,
}: MapContainerProps) => {
  const effectiveData = React.useMemo(() => {
    return selectedYear ? getCountyDataForYear(data, selectedYear) : data;
  }, [data, selectedYear]);

  const [tooltipData, setTooltipData] = useState<{ name: string; valStr: string; color: string; fips: string } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const updateTooltipPos = (x: number, y: number) => {
    if (tooltipRef.current) {
      tooltipRef.current.style.left = `${x + 14}px`;
      tooltipRef.current.style.top = `${y + 14}px`;
    }
  };
  const [lastClickedCoords, setLastClickedCoords] = useState<{ coordinates: [number, number]; label: string } | null>(null);
  const [position, setPosition] = useState<{ coordinates: [number, number]; zoom: number }>({
    coordinates: INITIAL_CENTER,
    zoom: INITIAL_ZOOM,
  });
  const [isLegendExpanded, setIsLegendExpanded] = useState(false);
  const MAP_SETTINGS_STORAGE_KEY = "biomap_map_preferences_v1";

  const [showStateBorders, setShowStateBorders] = useState(true);
  const [stateBorderWeight, setStateBorderWeight] = useState<"subtle" | "normal" | "bold">("normal");
  const [stateBorderTone, setStateBorderTone] = useState<"auto" | "white" | "dark" | "accent">("auto");
  const [showCountyBorders, setShowCountyBorders] = useState(true);
  const [countyBorderWeight, setCountyBorderWeight] = useState<"subtle" | "normal">("normal");
  const [autoZoomOnClick, setAutoZoomOnClick] = useState(true);
  const [autoOpenAnalyticsState, setAutoOpenAnalyticsState] = useState(true);
  const [showLegend, setShowLegend] = useState(true);
  const [showTooltip, setShowTooltip] = useState(true);
  const [selectedGlow, setSelectedGlow] = useState(true);
  const [showTriFacilities, setShowTriFacilities] = useState(true);
  const [showTriBuffers, setShowTriBuffers] = useState(true);
  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);

  // 1. Load saved preferences from localStorage on mount
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem(MAP_SETTINGS_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (typeof parsed.showStateBorders === "boolean") setShowStateBorders(parsed.showStateBorders);
          if (parsed.stateBorderWeight) setStateBorderWeight(parsed.stateBorderWeight);
          if (parsed.stateBorderTone) setStateBorderTone(parsed.stateBorderTone);
          if (typeof parsed.showCountyBorders === "boolean") setShowCountyBorders(parsed.showCountyBorders);
          if (parsed.countyBorderWeight) setCountyBorderWeight(parsed.countyBorderWeight);
          if (typeof parsed.autoZoomOnClick === "boolean") setAutoZoomOnClick(parsed.autoZoomOnClick);
          if (typeof parsed.autoOpenAnalyticsState === "boolean") setAutoOpenAnalyticsState(parsed.autoOpenAnalyticsState);
          if (typeof parsed.selectedGlow === "boolean") setSelectedGlow(parsed.selectedGlow);
          if (typeof parsed.showLegend === "boolean") setShowLegend(parsed.showLegend);
          if (typeof parsed.showTooltip === "boolean") setShowTooltip(parsed.showTooltip);
          if (typeof parsed.showTriFacilities === "boolean") setShowTriFacilities(parsed.showTriFacilities);
          if (typeof parsed.showTriBuffers === "boolean") setShowTriBuffers(parsed.showTriBuffers);
        }
      }
    } catch (err) {
      console.error("Error restoring map settings:", err);
    } finally {
      setIsSettingsLoaded(true);
    }
  }, []);

  // 2. Automatically save map settings to localStorage whenever any option changes
  useEffect(() => {
    if (!isSettingsLoaded) return;
    try {
      if (typeof window !== "undefined") {
        const payload = {
          showStateBorders,
          stateBorderWeight,
          stateBorderTone,
          showCountyBorders,
          countyBorderWeight,
          autoZoomOnClick,
          autoOpenAnalyticsState,
          selectedGlow,
          showLegend,
          showTooltip,
          showTriFacilities,
          showTriBuffers,
        };
        localStorage.setItem(MAP_SETTINGS_STORAGE_KEY, JSON.stringify(payload));
      }
    } catch (err) {
      console.error("Error saving map settings:", err);
    }
  }, [
    isSettingsLoaded,
    showStateBorders,
    stateBorderWeight,
    stateBorderTone,
    showCountyBorders,
    countyBorderWeight,
    autoZoomOnClick,
    autoOpenAnalyticsState,
    selectedGlow,
    showLegend,
    showTooltip,
    showTriFacilities,
    showTriBuffers,
  ]);

  const handleResetSettings = () => {
    setShowStateBorders(true);
    setStateBorderWeight("normal");
    setStateBorderTone("auto");
    setShowCountyBorders(true);
    setCountyBorderWeight("normal");
    setAutoZoomOnClick(true);
    setAutoOpenAnalyticsState(true);
    setSelectedGlow(true);
    setShowLegend(true);
    setShowTooltip(true);
    setShowTriFacilities(true);
    setShowTriBuffers(true);
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem(MAP_SETTINGS_STORAGE_KEY);
      }
    } catch (err) {
      console.error("Error resetting map settings:", err);
    }
  };

  const [hoveredFacility, setHoveredFacility] = useState<TRIFacility | null>(null);
  const facilityHoverRef = useRef<HTMLDivElement>(null);

  const updateFacilityHoverPos = (x: number, y: number) => {
    if (facilityHoverRef.current) {
      facilityHoverRef.current.style.left = `${Math.min(window.innerWidth - 330, x + 16)}px`;
      facilityHoverRef.current.style.top = `${Math.min(window.innerHeight - 260, y + 16)}px`;
    }
  };

  const [activeSettingsTab, setActiveSettingsTab] = useState<"layers" | "interaction" | "display">("layers");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Floating On-Map Search & Metric Dropdown state
  const [mapSearchQuery, setMapSearchQuery] = useState("");
  const [mapSearchResults, setMapSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const mapSearchRef = useRef<HTMLDivElement>(null);

  const [isMetricOpen, setIsMetricOpen] = useState(false);
  const metricDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapSearchQuery.trim()) {
      setMapSearchResults([]);
      return;
    }
    setMapSearchResults(performSearch(mapSearchQuery, data, allCities));
  }, [mapSearchQuery, data, allCities]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mapSearchRef.current && !mapSearchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
      if (metricDropdownRef.current && !metricDropdownRef.current.contains(e.target as Node)) {
        setIsMetricOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectMapSearchResult = (result: SearchResultItem) => {
    if (result.fips) {
      onSelectCounty(result.fips);
      const coords = result.coordinates ?? coordsFromFips(result.fips) ?? DEFAULT_CENTER;
      setPosition({
        coordinates: coords,
        zoom: result.zoom ?? (result.type === "city" ? 4.5 : 3.8),
      });
      setLastClickedCoords({
        coordinates: coords,
        label: result.title,
      });
    } else if (result.coordinates) {
      setPosition({
        coordinates: result.coordinates,
        zoom: result.zoom ?? 2.5,
      });
    }
    setMapSearchQuery("");
    setMapSearchResults([]);
    setIsSearchOpen(false);
  };

  const effectiveAutoOpenAnalytics = autoOpenAnalytics ?? autoOpenAnalyticsState;

  React.useEffect(() => {
    if (mapTarget && mapTarget.coordinates) {
      const validCoords = isSafeUsCenter(mapTarget.coordinates) ? mapTarget.coordinates : DEFAULT_CENTER;
      setPosition({
        coordinates: validCoords,
        zoom: mapTarget.zoom || 2.5,
      });
    }
  }, [mapTarget]);

  // Sync zoom & position when selectedFips changes via link / URL parameter / external selection
  const lastAutoZoomedFipsRef = useRef<string | null>(null);
  React.useEffect(() => {
    if (selectedFips && selectedFips !== lastAutoZoomedFipsRef.current && autoZoomOnClick) {
      lastAutoZoomedFipsRef.current = selectedFips;
      const coords = coordsFromFips(selectedFips);
      if (coords && isSafeUsCenter(coords)) {
        setPosition({
          coordinates: coords,
          zoom: 3.8,
        });
      }
    }
  }, [selectedFips, autoZoomOnClick]);

  const config = METRIC_CONFIG[metric];
  const colorScale = scaleQuantize<string>().domain(config.domain).range(config.range);

  const safeCenter: [number, number] =
    position && isSafeUsCenter(position.coordinates)
      ? position.coordinates
      : DEFAULT_CENTER;
  const safeZoom = position && typeof position.zoom === "number" && !isNaN(position.zoom) ? position.zoom : 1;

  const handleZoomIn = () => {
    setPosition((pos) => ({
      ...pos,
      zoom: Math.min(6, (pos?.zoom || 1) * 1.4),
    }));
  };

  const handleZoomOut = () => {
    setPosition((pos) => ({
      ...pos,
      zoom: Math.max(0.7, (pos?.zoom || 1) / 1.4),
    }));
  };

  const handleZoomToClicked = () => {
    if (lastClickedCoords && isSafeUsCenter(lastClickedCoords.coordinates)) {
      setPosition({
        coordinates: lastClickedCoords.coordinates,
        zoom: 3.8,
      });
    } else if (mapTarget?.coordinates && isSafeUsCenter(mapTarget.coordinates)) {
      setPosition({
        coordinates: mapTarget.coordinates,
        zoom: mapTarget.zoom || 3.8,
      });
    } else {
      handleZoomIn();
    }
  };

  const mapContainerRef = useRef<HTMLDivElement>(null);

  const handleResetZoom = () => {
    setPosition({ coordinates: INITIAL_CENTER, zoom: INITIAL_ZOOM });
    if (onClearTarget) onClearTarget();
  };

  useEffect(() => {
    const el = mapContainerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      // Prevent browser pinch/page-level zooming
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
      setPosition((pos) => {
        const currentZoom = pos?.zoom || 1;
        const newZoom = Math.min(6, Math.max(0.7, currentZoom * zoomFactor));
        return { ...pos, zoom: newZoom };
      });
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
    };
  }, []);

  const getStateStrokeColor = () => {
    switch (stateBorderTone) {
      case "white": return "rgba(255, 255, 255, 0.95)";
      case "dark": return "rgba(15, 23, 42, 0.9)";
      case "accent": return "var(--primary)";
      default: return "var(--foreground)";
    }
  };

  const getStateStrokeWidth = () => {
    switch (stateBorderWeight) {
      case "subtle": return 0.6;
      case "normal": return 1.0;
      case "bold": return 1.5;
    }
  };

  const isMovedFromDefault =
    Math.abs(position.coordinates[0] - INITIAL_CENTER[0]) > 0.1 ||
    Math.abs(position.coordinates[1] - INITIAL_CENTER[1]) > 0.1 ||
    Math.abs(position.zoom - INITIAL_ZOOM) > 0.05;

  return (
    <Card className="relative w-full h-full min-h-[350px] sm:min-h-[450px] overflow-hidden border-border bg-card shadow-sm flex flex-col">
      {/* ─── Top-Center: Search Bar ─── */}
      <div
        ref={mapSearchRef}
        className="absolute top-3 sm:top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto w-56 sm:w-72 md:w-80"
      >
        <div className="flex items-center gap-2 px-3 py-1.5 sm:py-2 bg-background/95 backdrop-blur-md rounded-xl border border-border shadow-md transition-all focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary">
          <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={mapSearchQuery}
            onChange={(e) => {
              setMapSearchQuery(e.target.value);
              setIsSearchOpen(true);
            }}
            onFocus={() => setIsSearchOpen(true)}
            placeholder="Find county, state, city…"
            className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none min-w-0"
          />
          {mapSearchQuery ? (
            <button
              onClick={() => {
                setMapSearchQuery("");
                setMapSearchResults([]);
              }}
              className="p-0.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : (
            <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-border bg-muted/60 font-mono text-[9px] text-muted-foreground pointer-events-none select-none">
              ⌘K
            </kbd>
          )}
        </div>

        {/* Search Autocomplete Results Overlay */}
        {isSearchOpen && mapSearchQuery.trim() !== "" && (
          <div className="absolute left-1/2 -translate-x-1/2 w-64 sm:w-80 top-full mt-1.5 bg-card/98 backdrop-blur-md border border-border rounded-xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto z-50 animate-in fade-in-50 slide-in-from-top-1 duration-150">
            {mapSearchResults.length === 0 ? (
              <div className="px-4 py-3 text-center text-xs text-muted-foreground">
                No results for &quot;{mapSearchQuery}&quot;
              </div>
            ) : (
              <div className="p-1 space-y-0.5">
                {mapSearchResults.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelectMapSearchResult(item)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-accent transition-colors text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-1 rounded-md bg-muted/60 shrink-0">
                        {item.type === "county" && <MapPin className="h-3.5 w-3.5 text-emerald-400" />}
                        {item.type === "state" && <Landmark className="h-3.5 w-3.5 text-blue-400" />}
                        {item.type === "city" && <Building2 className="h-3.5 w-3.5 text-amber-400" />}
                        {item.type === "region" && <Compass className="h-3.5 w-3.5 text-purple-400" />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                          {item.title}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">{item.subtitle}</div>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-border bg-muted/40 text-muted-foreground shrink-0 ml-2">
                      {item.badge}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Top-Right: Metric Selector ─── */}
      {onMetricChange && (
        <div
          ref={metricDropdownRef}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 pointer-events-auto"
        >
          <button
            onClick={() => setIsMetricOpen((prev) => !prev)}
            aria-label="Select Map Metric"
            className="flex items-center justify-between gap-2 px-3 py-1.5 sm:py-2 bg-background/95 backdrop-blur-md rounded-xl border border-border shadow-md hover:bg-accent transition-all cursor-pointer w-44 sm:w-52"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="shrink-0">
                {METRIC_OPTIONS.find((m) => m.value === metric)?.icon || <ShieldAlert className="w-3.5 h-3.5 text-primary" />}
              </div>
              <span className="text-xs font-semibold text-foreground truncate">
                {METRIC_OPTIONS.find((m) => m.value === metric)?.label || "Select Layer"}
              </span>
            </div>
            <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform duration-200 ${isMetricOpen ? "rotate-180" : ""}`} />
          </button>

          {isMetricOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-56 sm:w-64 bg-card/98 backdrop-blur-md border border-border rounded-2xl shadow-2xl overflow-hidden p-1 z-50 animate-in fade-in-50 zoom-in-95 duration-150 space-y-0.5">
              <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 mb-1">
                Map Metric Layer
              </div>
              {METRIC_OPTIONS.map((opt) => {
                const isSelected = opt.value === metric;
                return (
                  <button
                    key={opt.value}
                    onClick={() => {
                      onMetricChange(opt.value);
                      setIsMetricOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition-colors cursor-pointer ${isSelected ? "bg-primary/10 text-primary font-bold" : "hover:bg-accent text-foreground font-medium"
                      }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-1 rounded-lg bg-muted/60 shrink-0">{opt.icon}</div>
                      <span className="text-xs truncate">{opt.label}</span>
                    </div>
                    {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-2" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── Bottom-Right: Temporal Scrubber ─── */}
      {selectedYear && onYearChange && (
        <div className="absolute bottom-3 sm:bottom-4 right-3 sm:right-4 z-20">
          <TemporalScrubber
            selectedYear={selectedYear}
            onYearChange={onYearChange}
          />
        </div>
      )}
      {/* Controls Overlay */}
      <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10 flex flex-col gap-2">
        <div className="p-1 flex flex-col gap-0.5 bg-background/90 backdrop-blur-md rounded-2xl border border-border shadow-md">
          {/* Zoom Group */}
          <div className="flex flex-col gap-0.5">
            {[
              { icon: ZoomIn, fn: handleZoomIn, label: "Zoom In", badge: "+" },
              { icon: ZoomOut, fn: handleZoomOut, label: "Zoom Out", badge: "–" },
            ].map(({ icon: Icon, fn, label, badge }) => (
              <div key={label} className="relative group">
                <button
                  onClick={fn}
                  aria-label={label}
                  className="h-8 w-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all active:scale-95 cursor-pointer"
                >
                  <Icon className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                </button>
                {/* Micro Tooltip */}
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1 rounded-xl bg-popover/95 backdrop-blur-md text-popover-foreground border border-border text-[10px] font-semibold shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-150 pointer-events-none z-50 flex items-center gap-1.5 whitespace-nowrap">
                  <span>{label}</span>
                  <span className="text-[8.5px] px-1 py-0.2 bg-muted text-muted-foreground rounded font-mono">{badge}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="h-px w-5 mx-auto bg-border/60 my-0.5" />

          {/* Navigation & Focus Group */}
          <div className="flex flex-col gap-0.5">
            {[
              {
                icon: Home,
                fn: handleResetZoom,
                label: "Reset View",
                badge: isMovedFromDefault ? "Home" : "Default",
                highlight: isMovedFromDefault,
              },
              {
                icon: Focus,
                fn: handleZoomToClicked,
                label: lastClickedCoords ? `Focus ${lastClickedCoords.label}` : "Focus Clicked Region",
                badge: lastClickedCoords ? "Selected" : "Target",
                highlight: !!lastClickedCoords,
              },
            ].map(({ icon: Icon, fn, label, badge, highlight }) => (
              <div key={label} className="relative group">
                <button
                  onClick={fn}
                  aria-label={label}
                  className={`h-8 w-8 rounded-xl flex items-center justify-center transition-all active:scale-95 cursor-pointer ${highlight
                    ? "text-primary bg-primary/15 hover:bg-primary/25 font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    }`}
                >
                  <Icon className={`h-4 w-4 sm:h-3.5 sm:w-3.5 ${highlight ? "animate-pulse" : ""}`} />
                </button>
                {/* Micro Tooltip */}
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1 rounded-xl bg-popover/95 backdrop-blur-md text-popover-foreground border border-border text-[10px] font-semibold shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-150 pointer-events-none z-50 flex items-center gap-1.5 whitespace-nowrap">
                  <span>{label}</span>
                  <span className="text-[8.5px] px-1 py-0.2 bg-muted text-muted-foreground rounded font-mono">{badge}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="h-px w-5 mx-auto bg-border/60 my-0.5" />

          {/* Settings Group */}
          <div className="flex flex-col">
            <div className="relative group">
              <button
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                aria-label="Map Settings"
                className={`h-8 w-8 rounded-xl flex items-center justify-center transition-all active:scale-95 cursor-pointer ${isSettingsOpen
                  ? "text-primary bg-primary/15 hover:bg-primary/25 font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
              >
                <Settings className={`h-4 w-4 sm:h-3.5 sm:w-3.5 ${isSettingsOpen ? "rotate-45 text-primary" : ""} transition-transform duration-200`} />
              </button>
              {/* Micro Tooltip */}
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1 rounded-xl bg-popover/95 backdrop-blur-md text-popover-foreground border border-border text-[10px] font-semibold shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-150 pointer-events-none z-50 flex items-center gap-1.5 whitespace-nowrap">
                <span>Map Layer Settings</span>
                <span className="text-[8.5px] px-1 py-0.2 bg-muted text-muted-foreground rounded font-mono">Options</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Map Settings Popover */}
      {isSettingsOpen && (
        <div className="absolute top-3 left-14 sm:top-4 sm:left-15 z-40 bg-background/95 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-border shadow-2xl w-72 sm:w-80 animate-in fade-in-50 zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-border/60">
            <div className="flex items-center gap-2 font-bold text-xs text-foreground">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              <span>Map Settings</span>
            </div>
            <button
              onClick={() => setIsSettingsOpen(false)}
              className="text-[10px] text-muted-foreground hover:text-foreground font-bold px-1.5 py-0.5 rounded hover:bg-muted cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center bg-muted/60 p-0.5 rounded-xl mb-3 text-[10px] font-semibold">
            {[
              { id: "layers", label: "Outlines", icon: Layers },
              { id: "interaction", label: "Navigation", icon: Navigation },
              { id: "display", label: "Display", icon: Eye },
            ].map(({ id, label, icon: TabIcon }) => (
              <button
                key={id}
                onClick={() => setActiveSettingsTab(id as any)}
                className={`flex-1 flex items-center justify-center gap-1 py-1 sm:py-1.5 rounded-lg transition-all cursor-pointer ${activeSettingsTab === id
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                <TabIcon className="h-3 w-3 shrink-0" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
            {/* TAB 1: LAYERS */}
            {activeSettingsTab === "layers" && (
              <>
                {/* State Borders Toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-semibold text-foreground">State Borders</span>
                    <span className="text-[9px] text-muted-foreground">Show state outline boundaries</span>
                  </div>
                  <button
                    onClick={() => setShowStateBorders(!showStateBorders)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${showStateBorders ? "bg-primary" : "bg-muted-foreground/30"
                      }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow-lg transition duration-200 ease-in-out ${showStateBorders ? "translate-x-4" : "translate-x-0"
                        }`}
                    />
                  </button>
                </div>

                {showStateBorders && (
                  <div className="space-y-2 pl-2 border-l-2 border-primary/20 ml-1 py-0.5">
                    {/* State Weight */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-medium text-muted-foreground">State Border Weight</span>
                      <div className="flex items-center bg-muted/60 p-0.5 rounded-lg text-[9px] font-medium">
                        {(["subtle", "normal", "bold"] as const).map((w) => (
                          <button
                            key={w}
                            onClick={() => setStateBorderWeight(w)}
                            className={`px-2 py-0.5 capitalize rounded-md transition-all cursor-pointer ${stateBorderWeight === w
                              ? "bg-background text-foreground shadow-xs font-bold"
                              : "text-muted-foreground hover:text-foreground"
                              }`}
                          >
                            {w}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* State Border Tone */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-medium text-muted-foreground">State Border Color</span>
                      <div className="flex items-center bg-muted/60 p-0.5 rounded-lg text-[9px] font-medium">
                        {(["auto", "white", "dark", "accent"] as const).map((t) => (
                          <button
                            key={t}
                            onClick={() => setStateBorderTone(t)}
                            className={`px-1.5 py-0.5 capitalize rounded-md transition-all cursor-pointer ${stateBorderTone === t
                              ? "bg-background text-foreground shadow-xs font-bold"
                              : "text-muted-foreground hover:text-foreground"
                              }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* County Borders Toggle */}
                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-semibold text-foreground">County Outlines</span>
                    <span className="text-[9px] text-muted-foreground">Show thin grid lines between counties</span>
                  </div>
                  <button
                    onClick={() => setShowCountyBorders(!showCountyBorders)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${showCountyBorders ? "bg-primary" : "bg-muted-foreground/30"
                      }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow-lg transition duration-200 ease-in-out ${showCountyBorders ? "translate-x-4" : "translate-x-0"
                        }`}
                    />
                  </button>
                </div>

                {showCountyBorders && (
                  <div className="flex items-center justify-between pl-2 border-l-2 border-primary/20 ml-1 py-0.5">
                    <span className="text-[10px] font-medium text-muted-foreground">County Line Weight</span>
                    <div className="flex items-center bg-muted/60 p-0.5 rounded-lg text-[9px] font-medium">
                      {(["subtle", "normal"] as const).map((w) => (
                        <button
                          key={w}
                          onClick={() => setCountyBorderWeight(w)}
                          className={`px-2 py-0.5 capitalize rounded-md transition-all cursor-pointer ${countyBorderWeight === w
                            ? "bg-background text-foreground shadow-xs font-bold"
                            : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                          {w}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* EPA TRI Industrial Facility Pins Toggle */}
                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                  <div className="flex flex-col pr-2">
                    <span className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                      <Factory className="w-3 h-3 text-amber-500 shrink-0" />
                      EPA TRI Facility Markers
                    </span>
                    <span className="text-[9px] text-muted-foreground">Display spatial points for industrial point sources</span>
                  </div>
                  <button
                    onClick={() => setShowTriFacilities(!showTriFacilities)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${showTriFacilities ? "bg-amber-500" : "bg-muted-foreground/30"
                      }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow-lg transition duration-200 ease-in-out ${showTriFacilities ? "translate-x-4" : "translate-x-0"
                        }`}
                    />
                  </button>
                </div>

                {/* 5-mile & 10-mile Buffer Exposure Rings Toggle */}
                {showTriFacilities && (
                  <div className="flex items-center justify-between pl-2 border-l-2 border-amber-500/30 ml-1 py-1">
                    <div className="flex flex-col pr-2">
                      <span className="text-[10px] font-semibold text-foreground">5-mi & 10-mi Buffer Rings</span>
                      <span className="text-[8.5px] text-muted-foreground">Visualize population exposure zones</span>
                    </div>
                    <button
                      onClick={() => setShowTriBuffers(!showTriBuffers)}
                      className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${showTriBuffers ? "bg-rose-500" : "bg-muted-foreground/30"
                        }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-background shadow-lg transition duration-200 ease-in-out ${showTriBuffers ? "translate-x-3" : "translate-x-0"
                          }`}
                      />
                    </button>
                  </div>
                )}
              </>
            )}

            {/* TAB 2: INTERACTION */}
            {activeSettingsTab === "interaction" && (
              <>
                {/* Auto Open Analytics Panel */}
                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                  <div className="flex flex-col pr-2">
                    <span className="text-[11px] font-semibold text-foreground">Auto-Open Analytics (Mobile)</span>
                    <span className="text-[9px] text-muted-foreground">Auto open analytics drawer when region is selected</span>
                  </div>
                  <button
                    onClick={() =>
                      onToggleAutoOpenAnalytics
                        ? onToggleAutoOpenAnalytics(!effectiveAutoOpenAnalytics)
                        : setAutoOpenAnalyticsState(!effectiveAutoOpenAnalytics)
                    }
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${effectiveAutoOpenAnalytics ? "bg-primary" : "bg-muted-foreground/30"
                      }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow-lg transition duration-200 ease-in-out ${effectiveAutoOpenAnalytics ? "translate-x-4" : "translate-x-0"
                        }`}
                    />
                  </button>
                </div>

                {/* Selected Region Pulse Glow */}
                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                  <div className="flex flex-col pr-2">
                    <span className="text-[11px] font-semibold text-foreground">Selection Glow Effect</span>
                    <span className="text-[9px] text-muted-foreground">Add subtle shadow pulse around selected region</span>
                  </div>
                  <button
                    onClick={() => setSelectedGlow(!selectedGlow)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${selectedGlow ? "bg-primary" : "bg-muted-foreground/30"
                      }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow-lg transition duration-200 ease-in-out ${selectedGlow ? "translate-x-4" : "translate-x-0"
                        }`}
                    />
                  </button>
                </div>
              </>
            )}

            {/* TAB 3: DISPLAY */}
            {activeSettingsTab === "display" && (
              <>
                {/* Show Map Legend */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-semibold text-foreground">Map Legend Card</span>
                    <span className="text-[9px] text-muted-foreground">Show color range legend on map</span>
                  </div>
                  <button
                    onClick={() => setShowLegend(!showLegend)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${showLegend ? "bg-primary" : "bg-muted-foreground/30"
                      }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow-lg transition duration-200 ease-in-out ${showLegend ? "translate-x-4" : "translate-x-0"
                        }`}
                    />
                  </button>
                </div>

                {/* Show Hover Tooltip */}
                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-semibold text-foreground">Hover Tooltip</span>
                    <span className="text-[9px] text-muted-foreground">Display metric popover on mouse hover</span>
                  </div>
                  <button
                    onClick={() => setShowTooltip(!showTooltip)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${showTooltip ? "bg-primary" : "bg-muted-foreground/30"
                      }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow-lg transition duration-200 ease-in-out ${showTooltip ? "translate-x-4" : "translate-x-0"
                        }`}
                    />
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Footer: Auto-saved status & Reset Defaults */}
          <div className="flex items-center justify-between pt-2.5 mt-3 border-t border-border/60 text-[10px]">
            <div className="flex items-center gap-1.5 text-emerald-500 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span>Saved to browser</span>
            </div>
            <button
              onClick={handleResetSettings}
              className="text-muted-foreground hover:text-foreground font-semibold px-2 py-0.5 rounded hover:bg-muted transition-colors cursor-pointer"
            >
              Reset Defaults
            </button>
          </div>
        </div>
      )}


      {/* Map Graphic */}
      <div
        ref={mapContainerRef}
        className="w-full h-full flex-1 relative bg-muted/20 select-none touch-pan-y"
      >
        <ComposableMap projection="geoAlbersUsa" className="w-full h-full">
          <ZoomableGroup
            center={safeCenter}
            zoom={safeZoom}
            onMoveEnd={(pos) => {
              if (
                pos &&
                Array.isArray(pos.coordinates) &&
                isSafeUsCenter(pos.coordinates as [number, number])
              ) {
                setPosition({
                  coordinates: pos.coordinates as [number, number],
                  zoom: typeof pos.zoom === "number" && !isNaN(pos.zoom) ? pos.zoom : safeZoom,
                });
              }
            }}
          >
            <g style={{ transition: "transform 400ms cubic-bezier(0.16, 1, 0.3, 1)" }}>
              <Geographies geography={GEO_URL}>
                {({ geographies }) =>
                  geographies.map((geo) => {
                    const fips = geo.id;
                    const countyData = effectiveData[fips];
                    const isSelected = selectedFips === fips;
                    const val = countyData ? countyData[metric] : undefined;
                    const fill = val != null ? colorScale(val) : "var(--color-muted)";

                    const selectedColor = SELECTED_REGION_COLORS[metric] || "#06b6d4";

                    const countyStrokeWidth = isSelected
                      ? 0.6
                      : showCountyBorders
                        ? countyBorderWeight === "normal"
                          ? 0.4
                          : 0.2
                        : 0;

                    const countyStrokeColor = isSelected
                      ? "#000000"
                      : showCountyBorders
                        ? "rgba(255, 255, 255, 0.35)"
                        : "transparent";

                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={isSelected ? selectedColor : fill}
                        stroke={countyStrokeColor}
                        strokeWidth={countyStrokeWidth}
                        onMouseEnter={(e) => {
                          if (showTooltip) {
                            const displayVal = formatMetricValue(val, metric);
                            const countyColor = fill && fill !== "var(--color-muted)" ? fill : "#94a3b8";
                            setTooltipData((prev) => (prev?.fips === fips ? prev : { name: geo.properties.name, valStr: displayVal, color: countyColor, fips }));
                            updateTooltipPos(e.clientX, e.clientY);
                          }
                        }}
                        onMouseMove={(e) => {
                          if (showTooltip) {
                            updateTooltipPos(e.clientX, e.clientY);
                          }
                        }}
                        onMouseLeave={() => {
                          setTooltipData(null);
                        }}
                        onClick={() => {
                          if (fips) {
                            onSelectCounty(fips);
                            if (showTooltip) {
                              const displayVal = formatMetricValue(val, metric);
                              const countyColor = fill && fill !== "var(--color-muted)" ? fill : "#94a3b8";
                              setTooltipData({ name: geo.properties.name, valStr: displayVal, color: countyColor, fips });
                            }

                            try {
                              const centroid = geoCentroid(geo);
                              if (centroid && isSafeUsCenter(centroid as [number, number])) {
                                setLastClickedCoords({
                                  coordinates: centroid as [number, number],
                                  label: geo.properties.name,
                                });

                                if (autoZoomOnClick) {
                                  setPosition({
                                    coordinates: centroid as [number, number],
                                    zoom: 3.8,
                                  });
                                }
                              }
                            } catch (err) {
                              console.error("Centroid error:", err);
                            }
                          }
                        }}
                        style={{
                          default: {
                            outline: "none",
                            transition: "fill 0.15s ease, filter 0.15s ease",
                            filter: isSelected && selectedGlow ? `drop-shadow(0 0 4px ${selectedColor})` : undefined,
                          },
                          hover: {
                            fill: isSelected ? selectedColor : undefined,
                            filter: isSelected
                              ? `brightness(1.15) ${selectedGlow ? `drop-shadow(0 0 6px ${selectedColor})` : ""}`
                              : "brightness(1.1)",
                            outline: "none",
                            cursor: "pointer",
                          },
                          pressed: { outline: "none" },
                        }}
                      />
                    );
                  })
                }
              </Geographies>

              {/* State Borders Overlay Layer */}
              {showStateBorders && (
                <Geographies geography={STATES_GEO_URL}>
                  {({ geographies }) =>
                    geographies.map((geo) => (
                      <Geography
                        key={`state-${geo.rsmKey}`}
                        geography={geo}
                        fill="none"
                        stroke={getStateStrokeColor()}
                        strokeOpacity={stateBorderTone === "auto" ? 0.75 : 0.9}
                        strokeWidth={getStateStrokeWidth()}
                        style={{
                          default: { pointerEvents: "none", outline: "none" },
                          hover: { pointerEvents: "none", outline: "none" },
                          pressed: { pointerEvents: "none", outline: "none" },
                        }}
                      />
                    ))
                  }
                </Geographies>
              )}

              {/* EPA TRI Industrial Facility Map Pins & 5-mi / 10-mi Buffer Rings */}
              {showTriFacilities &&
                TRI_FACILITIES.map((facility) => {
                  const isHovered = hoveredFacility?.id === facility.id;
                  const isSelectedCounty = selectedFips === facility.fips;

                  return (
                    <Marker key={facility.id} coordinates={facility.coordinates}>
                      {/* Interactive Buffer Circles (5-mile High Exposure & 10-mile Moderate Exposure Zones) */}
                      {showTriBuffers && (
                        <g className="pointer-events-none">
                          {/* 10-mile Moderate Exposure Buffer Ring */}
                          <circle
                            r={17}
                            fill="rgba(245, 158, 11, 0.12)"
                            stroke="rgba(245, 158, 11, 0.65)"
                            strokeWidth={0.8}
                            strokeDasharray="3 3"
                            className="transition-all duration-300"
                          />
                          {/* 5-mile High Exposure Buffer Ring */}
                          <circle
                            r={8.5}
                            fill="rgba(239, 68, 68, 0.22)"
                            stroke="rgba(239, 68, 68, 0.85)"
                            strokeWidth={1.2}
                            className="transition-all duration-300"
                          />
                        </g>
                      )}

                      {/* Interactive Pin Marker Graphic */}
                      <g
                        className="cursor-pointer group"
                        onMouseEnter={(e) => {
                          setHoveredFacility(facility);
                          updateFacilityHoverPos(e.clientX, e.clientY);
                        }}
                        onMouseMove={(e) => {
                          updateFacilityHoverPos(e.clientX, e.clientY);
                        }}
                        onMouseLeave={() => {
                          setHoveredFacility(null);
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCounty(facility.fips);
                          setPosition({
                            coordinates: facility.coordinates,
                            zoom: 4.2,
                          });
                          setLastClickedCoords({
                            coordinates: facility.coordinates,
                            label: facility.name,
                          });
                        }}
                      >
                        {/* Outer Glow Halo ring on Hover or County Selected */}
                        {(isHovered || isSelectedCounty) && (
                          <circle
                            r={9}
                            fill="none"
                            stroke={facility.hazardLevel === "Critical" ? "#ef4444" : facility.hazardLevel === "High" ? "#f97316" : "#eab308"}
                            strokeWidth={1.5}
                            className="animate-ping opacity-75"
                          />
                        )}
                        {/* Base Circle Pin */}
                        <circle
                          r={5.5}
                          fill="#090d16"
                          stroke={facility.hazardLevel === "Critical" ? "#ef4444" : facility.hazardLevel === "High" ? "#f97316" : "#eab308"}
                          strokeWidth={1.8}
                          className="transition-transform duration-200 group-hover:scale-125"
                        />
                        {/* Inner Core Dot */}
                        <circle
                          r={2.8}
                          fill={facility.hazardLevel === "Critical" ? "#ef4444" : facility.hazardLevel === "High" ? "#f97316" : "#eab308"}
                        />
                      </g>
                    </Marker>
                  );
                })}
            </g>
          </ZoomableGroup>
        </ComposableMap>
      </div>

      {/* EPA TRI Facility Hover Card */}
      {hoveredFacility && (
        <div
          ref={facilityHoverRef}
          className="fixed z-50 pointer-events-none w-72 sm:w-80 p-3.5 bg-slate-950/95 backdrop-blur-xl rounded-2xl border border-amber-500/30 shadow-2xl text-slate-100 animate-in fade-in-50 zoom-in-95 duration-150 space-y-2.5"
          style={{
            left: "-9999px",
            top: "-9999px",
          }}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2">
            <div className="min-w-0 pr-1">
              <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
                <Factory className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{hoveredFacility.name}</span>
              </div>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">
                {hoveredFacility.city}, {hoveredFacility.state} • {hoveredFacility.sector}
              </p>
            </div>
            <span
              className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border shrink-0 ${hoveredFacility.hazardLevel === "Critical"
                ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                : hoveredFacility.hazardLevel === "High"
                  ? "bg-orange-500/20 text-orange-300 border-orange-500/40"
                  : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                }`}
            >
              {hoveredFacility.hazardLevel} Risk
            </span>
          </div>

          {/* Emissions Gauge */}
          <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400">
              <span>Annual Toxic Releases</span>
              <span className="text-amber-400 font-extrabold text-xs">
                {hoveredFacility.emissionsLbs.toLocaleString()} lbs/yr
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500"
                style={{ width: `${Math.min(100, (hoveredFacility.emissionsLbs / 10000000) * 100)}%` }}
              />
            </div>
          </div>

          {/* Primary Toxic Chemicals */}
          <div>
            <div className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Primary Toxic Chemicals Released
            </div>
            <div className="flex flex-wrap gap-1">
              {hoveredFacility.primaryChemicals.map((chem) => (
                <span
                  key={chem}
                  className="text-[9.5px] font-medium px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300"
                >
                  {chem}
                </span>
              ))}
            </div>
          </div>

          {/* Buffer Ring Exposure Zone Status */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[9.5px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
              5-mi & 10-mi Exposure Zone Active
            </span>
            <span className="text-amber-400 font-semibold">Click pin to focus</span>
          </div>
        </div>
      )}

      {/* Cursor-Following Hover Tooltip */}
      {showTooltip && tooltipData && (
        <div
          ref={tooltipRef}
          className="fixed z-50 pointer-events-none px-2.5 py-1 bg-background/95 backdrop-blur-md rounded-xl border border-border shadow-lg text-xs flex items-center gap-2 whitespace-nowrap animate-in fade-in-50 duration-75"
          style={{
            left: "-9999px",
            top: "-9999px",
          }}
        >
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs border border-black/20"
            style={{ backgroundColor: tooltipData.color }}
          />
          <span className="font-semibold text-foreground">{tooltipData.name}</span>
          <span className="text-muted-foreground/60">•</span>
          <span className="font-bold text-foreground">{tooltipData.valStr}</span>
        </div>
      )}

      {/* Map Legend (Bottom-Left on Mobile & Desktop) */}
      {showLegend && (
        <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 z-20">
          <div className="hidden sm:block bg-background/92 backdrop-blur-md p-3 rounded-xl border border-border shadow-md w-56 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Layers className="h-3 w-3 text-primary animate-pulse" />
                <span className="text-[10px] font-semibold text-foreground">
                  {config.label} {selectedYear ? `(${selectedYear})` : ""}
                </span>
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground border border-border/60 bg-muted/40 px-1.5 py-0.5 rounded">
                {config.unit}
              </span>
            </div>
            <div className="flex h-2 w-full rounded-full overflow-hidden shadow-xs">
              {config.range.map((c, i) => (
                <div key={i} style={{ backgroundColor: c }} className="flex-1 transition-colors duration-300" />
              ))}
            </div>
            <div className="flex justify-between mt-1.5 text-[9px] font-medium text-muted-foreground">
              <span>Low</span>
              <span className="text-center">{config.domain[0].toLocaleString()} – {config.domain[1].toLocaleString()}</span>
              <span>High</span>
            </div>
          </div>

          {/* Mobile Top-Right Collapsible Legend */}
          <div className="sm:hidden">
            {isLegendExpanded ? (
              <div className="bg-background/95 backdrop-blur-md p-2.5 rounded-xl border border-border shadow-xl w-48 animate-in fade-in-50 zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-semibold text-foreground truncate pr-1">{config.label}</span>
                  <button
                    onClick={() => setIsLegendExpanded(false)}
                    className="text-[10px] text-muted-foreground hover:text-foreground font-bold px-1 rounded hover:bg-muted"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex h-1.5 w-full rounded-full overflow-hidden mb-1">
                  {config.range.map((c, i) => (
                    <div key={i} style={{ backgroundColor: c }} className="flex-1" />
                  ))}
                </div>
                <div className="flex justify-between text-[8px] text-muted-foreground">
                  <span>{config.domain[0]}</span>
                  <span>{config.domain[1]}</span>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsLegendExpanded(true)}
                className="flex items-center gap-1.5 bg-background/90 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-border shadow-md text-[10px] font-semibold text-foreground hover:bg-accent transition-all active:scale-95 duration-150"
              >
                <Layers className="h-3 w-3 text-primary animate-pulse" />
                <span>Legend</span>
              </button>
            )}
          </div>
        </div>
      )}

    </Card>
  );
};

export default memo(MapContainer);
