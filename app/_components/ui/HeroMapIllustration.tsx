"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { STATES_GEO_URL } from "@/app/_lib/data-utils";
import { ExternalLink } from "lucide-react";

const KEY_MARKERS = [
  {
    name: "Washoe Co., NV",
    fips: "32031",
    coordinates: [-119.8138, 39.5296] as [number, number],
    color: "#f59e0b",
    metric: "PM₂.₅: 8.4 µg/m³ · Wildfire smoke risk",
  },
  {
    name: "Harris Co., TX",
    fips: "48201",
    coordinates: [-95.3698, 29.7604] as [number, number],
    color: "#f97316",
    metric: "TRI Releases: 48.2M lbs (Petrochemical)",
  },
  {
    name: "Los Angeles, CA",
    fips: "06037",
    coordinates: [-118.2437, 34.0522] as [number, number],
    color: "var(--color-primary)",
    metric: "PM₂.₅: 12.1 µg/m³ · Basin Inversion",
  },
  {
    name: "Cook Co., IL",
    fips: "17031",
    coordinates: [-87.6298, 41.8781] as [number, number],
    color: "#10b981",
    metric: "Resp. Mortality: 44.8 / 100k",
  },
  {
    name: "Allegheny, PA",
    fips: "42003",
    coordinates: [-79.9959, 40.4406] as [number, number],
    color: "var(--color-primary)",
    metric: "Industrial Valley Exposure Corridor",
  },
  {
    name: "Fulton Co., GA",
    fips: "13121",
    coordinates: [-84.388, 33.749] as [number, number],
    color: "#eab308",
    metric: "Urban Particulate & Vulnerability Hotspot",
  },
];

export default function HeroMapIllustration() {
  const [activeMarker, setActiveMarker] = useState<(typeof KEY_MARKERS)[0] | null>(null);

  return (
    <div className="relative w-full max-w-[940px] mx-auto py-1">
      {/* Clean map canvas frame */}
      <div className="relative w-full aspect-[1.5] sm:aspect-[1.55] flex items-center justify-center rounded-2xl bg-muted/20 dark:bg-muted/10 border border-border/50 overflow-hidden p-2 sm:p-4">
        <ComposableMap
          projection="geoAlbersUsa"
          className="w-full h-full drop-shadow-[0_2px_12px_rgba(0,0,0,0.06)] dark:drop-shadow-[0_4px_24px_rgba(0,0,0,0.45)]"
          projectionConfig={{ scale: 1120 }}
        >
          <Geographies geography={STATES_GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  className="fill-muted/80 dark:fill-secondary/55 stroke-foreground/15 dark:stroke-white/20 hover:fill-primary/20 dark:hover:fill-primary/25 hover:stroke-primary/50 dark:hover:stroke-primary/50 transition-colors duration-150 cursor-pointer"
                  style={{
                    default: { outline: "none" },
                    hover: { outline: "none" },
                    pressed: { outline: "none" },
                  }}
                  strokeWidth={1}
                />
              ))
            }
          </Geographies>

          {/* Hotspot Markers */}
          {KEY_MARKERS.map((marker) => (
            <Marker
              key={marker.name}
              coordinates={marker.coordinates}
              onMouseEnter={() => setActiveMarker(marker)}
              onMouseLeave={() => setActiveMarker(null)}
            >
              <g className="cursor-pointer group">
                <circle
                  r={12}
                  fill={marker.color}
                  opacity={0.25}
                  className="animate-ping"
                />
                <circle
                  r={6}
                  fill={marker.color}
                  stroke="var(--color-card)"
                  strokeWidth={2}
                  className="transition-transform group-hover:scale-125"
                />
              </g>
            </Marker>
          ))}
        </ComposableMap>

        {/* Clean Active Marker Tooltip Card */}
        {activeMarker && (
          <div className="absolute top-3 left-3 z-20 px-3.5 py-2.5 rounded-xl bg-card/95 backdrop-blur-md border border-border shadow-lg animate-in fade-in-50 zoom-in-95 duration-150 max-w-xs text-left">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-foreground">{activeMarker.name}</span>
              <span className="text-[9px] font-mono text-muted-foreground">FIPS {activeMarker.fips}</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">{activeMarker.metric}</p>
            <Link
              href={`/map?fips=${activeMarker.fips}`}
              className="inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:underline mt-1.5"
            >
              <span>View county details</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
