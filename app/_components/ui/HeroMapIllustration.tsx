"use client";

import React from "react";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { STATES_GEO_URL } from "@/app/_lib/data-utils";

const KEY_MARKERS = [
  { name: "Washoe Co., NV", coordinates: [-119.8138, 39.5296] as [number, number], color: "#f59e0b" },
  { name: "Harris Co., TX", coordinates: [-95.3698, 29.7604] as [number, number], color: "#f97316" },
  { name: "Los Angeles, CA", coordinates: [-118.2437, 34.0522] as [number, number], color: "var(--color-primary)" },
  { name: "Cook Co., IL", coordinates: [-87.6298, 41.8781] as [number, number], color: "#10b981" },
  { name: "Allegheny, PA", coordinates: [-79.9959, 40.4406] as [number, number], color: "var(--color-primary)" },
  { name: "Fulton Co., GA", coordinates: [-84.3880, 33.7490] as [number, number], color: "#eab308" },
];

export default function HeroMapIllustration() {
  return (
    <div className="relative w-full max-w-[800px] mx-auto">
      {/* Container for the map */}
      <div className="relative w-full aspect-[1.4] flex items-center justify-center">
        <ComposableMap
          projection="geoAlbersUsa"
          className="w-full h-full drop-shadow-xl"
          projectionConfig={{ scale: 1100 }}
        >
          <Geographies geography={STATES_GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  className="fill-card dark:fill-card stroke-foreground/20 dark:stroke-border/80 hover:fill-muted dark:hover:fill-secondary/60 transition-colors"
                  style={{
                    default: { outline: "none" },
                    hover: { outline: "none" },
                    pressed: { outline: "none" },
                  }}
                  strokeWidth={1.2}
                />
              ))
            }
          </Geographies>

          {/* Markers */}
          {KEY_MARKERS.map((marker) => (
            <Marker key={marker.name} coordinates={marker.coordinates}>
              <g className="cursor-pointer group">
                <circle
                  r={5.5}
                  fill={marker.color}
                  stroke="var(--color-card)"
                  strokeWidth={2}
                />
              </g>
            </Marker>
          ))}
        </ComposableMap>

        {/* Floating SaaS-like element on top of the map */}
        <div className="absolute top-4 right-4 px-4 py-3 rounded-2xl bg-card/95 backdrop-blur-md border border-border shadow-xl pointer-events-none">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
            <div>
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Real-Time Data
              </div>
              <div className="text-sm font-extrabold text-foreground font-mono mt-0.5">
                3,142 Counties Active
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
