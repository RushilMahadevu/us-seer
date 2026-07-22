"use client";

import React, { memo, useState } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { scaleQuantize } from "d3-scale";
import { CountyDataMap } from "@/app/_lib/types";
import { GEO_URL } from "@/app/_lib/data-utils";
import { Card } from "@/app/_components/ui/card";
import { ZoomIn, ZoomOut, RotateCcw, MapPin, Layers } from "lucide-react";

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

const DEFAULT_CENTER: [number, number] = [-96, 38];

const MapContainer = ({ data, selectedFips, onSelectCounty, metric, mapTarget, onClearTarget }: MapContainerProps) => {
  const [tooltipData, setTooltipData] = useState<{ name: string; valStr: string; fips: string } | null>(null);
  const [position, setPosition] = useState({ coordinates: DEFAULT_CENTER, zoom: 1 });

  React.useEffect(() => {
    if (mapTarget && mapTarget.coordinates) {
      setPosition({
        coordinates: mapTarget.coordinates,
        zoom: mapTarget.zoom || 2.5,
      });
    }
  }, [mapTarget]);

  const config = METRIC_CONFIG[metric];
  const colorScale = scaleQuantize<string>().domain(config.domain).range(config.range);

  const safeCenter: [number, number] =
    position && Array.isArray(position.coordinates) && position.coordinates[0] != null && position.coordinates[1] != null
      ? position.coordinates
      : DEFAULT_CENTER;
  const safeZoom = position && typeof position.zoom === "number" ? position.zoom : 1;

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

  const handleResetZoom = () => {
    setPosition({ coordinates: DEFAULT_CENTER, zoom: 1 });
    if (onClearTarget) onClearTarget();
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    setPosition((pos) => {
      const newZoom = Math.min(6, Math.max(0.7, (pos?.zoom || 1) * zoomFactor));
      return { ...pos, zoom: newZoom };
    });
  };

  return (
    <Card className="relative w-full h-full min-h-[450px] overflow-hidden border-border bg-card shadow-sm flex flex-col">
      {/* Controls Overlay */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <div className="flex flex-col bg-background/90 backdrop-blur-md rounded-xl border border-border shadow-sm overflow-hidden">
          {[
            { icon: ZoomIn,    fn: handleZoomIn,    title: "Zoom In" },
            { icon: ZoomOut,   fn: handleZoomOut,   title: "Zoom Out" },
            { icon: RotateCcw, fn: handleResetZoom, title: "Reset View" },
          ].map(({ icon: Icon, fn, title }) => (
            <button
              key={title}
              onClick={fn}
              title={title}
              aria-label={title}
              className="h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors active:scale-90"
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>
      </div>

      {/* Location target badge — right side, above legend */}
      {mapTarget?.label && (
        <div className="absolute bottom-20 right-4 z-10 animate-in fade-in-50 slide-in-from-right-2 duration-200">
          <div className="flex items-center gap-1.5 bg-primary/90 text-primary-foreground backdrop-blur-md px-2.5 py-1.5 rounded-lg shadow-md text-[11px] font-semibold">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate max-w-[160px]">{mapTarget.label}</span>
            {onClearTarget && (
              <button
                onClick={onClearTarget}
                className="ml-0.5 rounded p-0.5 hover:bg-white/20 transition-colors"
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
        className="w-full h-full flex-1 relative bg-muted/20 select-none"
        onWheel={handleWheel}
      >
        <ComposableMap projection="geoAlbersUsa" className="w-full h-full">
          <ZoomableGroup
            center={safeCenter}
            zoom={safeZoom}
            onMoveEnd={(pos) => {
              if (pos && Array.isArray(pos.coordinates) && pos.coordinates[0] != null && pos.coordinates[1] != null) {
                setPosition({
                  coordinates: pos.coordinates as [number, number],
                  zoom: typeof pos.zoom === "number" ? pos.zoom : safeZoom,
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

                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={isSelected ? "var(--color-primary)" : fill}
                        stroke={isSelected ? "var(--color-background)" : "rgba(255, 255, 255, 0.4)"}
                        strokeWidth={isSelected ? 1.5 : 0.4}
                        onMouseEnter={() => {
                          const displayVal =
                            val != null
                              ? `${typeof val === 'number' && val % 1 !== 0 ? val.toFixed(1) : val.toLocaleString()} ${config.unit}`
                              : "No Data";
                          setTooltipData({ name: geo.properties.name, valStr: displayVal, fips });
                        }}
                        onMouseLeave={() => {
                          setTooltipData(null);
                        }}
                        onClick={() => {
                          if (fips) onSelectCounty(fips);
                        }}
                        style={{
                          default: { outline: "none", transition: "fill 0.15s ease, transform 0.15s ease" },
                          hover: { fill: "var(--color-ring)", outline: "none", cursor: "pointer" },
                          pressed: { fill: "var(--color-accent)", outline: "none" },
                        }}
                      />
                    );
                  })
                }
              </Geographies>
            </g>
          </ZoomableGroup>
        </ComposableMap>
      </div>

      {/* Floating Hover Tooltip */}
      {tooltipData && (
        <div className="absolute top-4 right-4 z-20 pointer-events-none animate-in fade-in-50 duration-150">
          <div className="flex items-start gap-2.5 bg-background/95 backdrop-blur-md px-3 py-2.5 rounded-xl border border-border shadow-lg max-w-[220px]">
            <div className="p-1.5 rounded-md bg-primary/10 shrink-0 mt-0.5">
              <MapPin className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-foreground truncate">{tooltipData.name}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{config.label}</div>
              <div className="text-sm font-bold text-foreground">{tooltipData.valStr}</div>
            </div>
          </div>
        </div>
      )}

      {/* Map Legend */}
      <div className="absolute bottom-4 right-4 z-10 pointer-events-none">
        <div className="bg-background/92 backdrop-blur-md p-3 rounded-xl border border-border shadow-md w-56">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Layers className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-semibold text-foreground">{config.label}</span>
            </div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground border border-border/60 bg-muted/40 px-1.5 py-0.5 rounded">
              {config.unit}
            </span>
          </div>
          <div className="flex h-2 w-full rounded-full overflow-hidden">
            {config.range.map((c, i) => (
              <div key={i} style={{ backgroundColor: c }} className="flex-1" />
            ))}
          </div>
          <div className="flex justify-between mt-1.5 text-[9px] font-medium text-muted-foreground">
            <span>Low</span>
            <span className="text-center">{config.domain[0].toLocaleString()} – {config.domain[1].toLocaleString()}</span>
            <span>High</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default memo(MapContainer);
