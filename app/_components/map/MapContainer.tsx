"use client";

import React, { memo, useState } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { scaleQuantize } from "d3-scale";
import { geoCentroid } from "d3-geo";
import { CountyDataMap } from "@/app/_lib/types";
import { GEO_URL, STATES_GEO_URL } from "@/app/_lib/data-utils";
import { Card } from "@/app/_components/ui/card";
import { ZoomIn, ZoomOut, RotateCcw, MapPin, Layers, Focus, Settings, SlidersHorizontal, Eye, Zap, Sparkles, Navigation, Palette } from "lucide-react";

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
  selectedFips: string | null;
  onSelectCounty: (fips: string) => void;
  metric: MapMetric;
  mapTarget?: { coordinates: [number, number]; zoom: number; label?: string } | null;
  onClearTarget?: () => void;
  autoOpenAnalytics?: boolean;
  onToggleAutoOpenAnalytics?: (val: boolean) => void;
}

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

const DEFAULT_CENTER: [number, number] = [-96, 38];

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
  selectedFips,
  onSelectCounty,
  metric,
  mapTarget,
  onClearTarget,
  autoOpenAnalytics,
  onToggleAutoOpenAnalytics,
}: MapContainerProps) => {
  const [tooltipData, setTooltipData] = useState<{ name: string; valStr: string; fips: string } | null>(null);
  const [lastClickedCoords, setLastClickedCoords] = useState<{ coordinates: [number, number]; label: string } | null>(null);
  const [position, setPosition] = useState<{ coordinates: [number, number]; zoom: number }>({
    coordinates: DEFAULT_CENTER,
    zoom: 1,
  });
  const [isLegendExpanded, setIsLegendExpanded] = useState(false);
  const [showStateBorders, setShowStateBorders] = useState(true);
  const [stateBorderWeight, setStateBorderWeight] = useState<"subtle" | "normal" | "bold">("bold");
  const [stateBorderTone, setStateBorderTone] = useState<"auto" | "white" | "dark" | "accent">("auto");
  const [showCountyBorders, setShowCountyBorders] = useState(true);
  const [countyBorderWeight, setCountyBorderWeight] = useState<"subtle" | "normal">("subtle");
  const [autoZoomOnClick, setAutoZoomOnClick] = useState(false);
  const [autoOpenAnalyticsState, setAutoOpenAnalyticsState] = useState(true);
  const [showLegend, setShowLegend] = useState(true);
  const [showTooltip, setShowTooltip] = useState(true);
  const [selectedGlow, setSelectedGlow] = useState(true);
  const [activeSettingsTab, setActiveSettingsTab] = useState<"layers" | "interaction" | "display">("layers");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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

  const handleResetZoom = () => {
    setPosition({ coordinates: DEFAULT_CENTER, zoom: 1 });
    if (onClearTarget) onClearTarget();
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    setPosition((pos) => {
      const currentZoom = pos?.zoom || 1;
      const newZoom = Math.min(6, Math.max(0.7, currentZoom * zoomFactor));
      return { ...pos, zoom: newZoom };
    });
  };

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

  return (
    <Card className="relative w-full h-full min-h-[350px] sm:min-h-[450px] overflow-hidden border-border bg-card shadow-sm flex flex-col">
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
              { icon: RotateCcw, fn: handleResetZoom, label: "Reset View", badge: "Recenter" },
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
              </>
            )}

            {/* TAB 2: INTERACTION */}
            {activeSettingsTab === "interaction" && (
              <>
                {/* Auto Zoom on Click */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-col pr-2">
                    <span className="text-[11px] font-semibold text-foreground">Auto-Zoom on Click</span>
                    <span className="text-[9px] text-muted-foreground">Automatically focus & center map on selected county</span>
                  </div>
                  <button
                    onClick={() => setAutoZoomOnClick(!autoZoomOnClick)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${autoZoomOnClick ? "bg-primary" : "bg-muted-foreground/30"
                      }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow-lg transition duration-200 ease-in-out ${autoZoomOnClick ? "translate-x-4" : "translate-x-0"
                        }`}
                    />
                  </button>
                </div>

                {/* Auto Open Analytics Panel */}
                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                  <div className="flex flex-col pr-2">
                    <span className="text-[11px] font-semibold text-foreground">Auto-Open Analytics</span>
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
        </div>
      )}

      {/* Location target badge — right side, above legend */}
      {mapTarget?.label && (
        <div className="absolute bottom-16 sm:bottom-20 right-3 sm:right-4 z-10 animate-in fade-in-50 slide-in-from-right-2 duration-200">
          <div className="flex items-center gap-1.5 bg-primary/90 text-primary-foreground backdrop-blur-md px-2.5 py-1.5 rounded-lg shadow-md text-[11px] font-semibold">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate max-w-[130px] sm:max-w-[160px]">{mapTarget.label}</span>
            {onClearTarget && (
              <button
                onClick={onClearTarget}
                className="ml-0.5 rounded p-0.5 hover:bg-white/20 transition-colors cursor-pointer"
                aria-label="Clear target"
              >
                <RotateCcw className="h-2.5 w-2.5" />
              </button>
            )}
          </div>
        </div>
      )}


      {/* Map Graphic */}
      <div
        className="w-full h-full flex-1 relative bg-muted/20 select-none touch-pan-y"
        onWheel={handleWheel}
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
                    const countyData = data[fips];
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
                        onMouseEnter={() => {
                          if (showTooltip) {
                            const displayVal =
                              val != null
                                ? `${typeof val === 'number' && val % 1 !== 0 ? val.toFixed(1) : val.toLocaleString()} ${config.unit}`
                                : "No Data";
                            setTooltipData({ name: geo.properties.name, valStr: displayVal, fips });
                          }
                        }}
                        onMouseLeave={() => {
                          setTooltipData(null);
                        }}
                        onClick={() => {
                          if (fips) {
                            onSelectCounty(fips);
                            if (showTooltip) {
                              const displayVal =
                                val != null
                                  ? `${typeof val === 'number' && val % 1 !== 0 ? val.toFixed(1) : val.toLocaleString()} ${config.unit}`
                                  : "No Data";
                              setTooltipData({ name: geo.properties.name, valStr: displayVal, fips });
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
            </g>
          </ZoomableGroup>
        </ComposableMap>
      </div>

      {/* Floating Tooltip */}
      {showTooltip && tooltipData && (
        <div className="absolute top-12 right-3 sm:top-4 sm:right-4 z-30 pointer-events-none animate-in fade-in-70 slide-in-from-top-1 duration-200">
          <div className="flex items-start gap-2 bg-background/95 backdrop-blur-md px-2.5 py-2 sm:px-3 sm:py-2.5 rounded-xl border border-border shadow-lg max-w-[180px] sm:max-w-[220px]">
            <div className="p-1 sm:p-1.5 rounded-md bg-primary/10 shrink-0 mt-0.5">
              <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary animate-bounce-short" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] sm:text-xs font-bold text-foreground truncate">{tooltipData.name}</div>
              <div className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5 truncate">{config.label}</div>
              <div className="text-xs sm:text-sm font-bold text-foreground">{tooltipData.valStr}</div>
            </div>
          </div>
        </div>
      )}

      {/* Map Legend (Top-Right on Mobile, Bottom-Left on Desktop) */}
      {showLegend && (
        <div className="absolute top-3 right-3 sm:top-auto sm:right-auto sm:bottom-4 sm:left-4 z-20">
          <div className="hidden sm:block bg-background/92 backdrop-blur-md p-3 rounded-xl border border-border shadow-md w-56 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Layers className="h-3 w-3 text-primary animate-pulse" />
                <span className="text-[10px] font-semibold text-foreground">{config.label}</span>
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
