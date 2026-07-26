"use client";

import React, { useEffect, useRef, useState } from "react";
import { AVAILABLE_YEARS, TemporalYear, TEMPORAL_EVENTS } from "@/app/_lib/temporal-data";
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Calendar,
  Factory,
  TrendingDown,
  Flame,
  TrendingUp,
  BarChart2,
  Wind,
  Leaf,
  X,
} from "lucide-react";

interface TemporalScrubberProps {
  selectedYear: TemporalYear;
  onYearChange: (year: TemporalYear) => void;
  className?: string;
}

// One distinct icon per year
const YEAR_ICONS: Record<TemporalYear, React.ReactNode> = {
  2018: <Factory className="w-3 h-3" />,       // Pre-COVID industrial baseline
  2019: <TrendingUp className="w-3 h-3" />,    // Peak pre-pandemic emissions
  2020: <TrendingDown className="w-3 h-3" />,  // COVID lockdown drop
  2021: <Flame className="w-3 h-3" />,          // Western wildfires
  2022: <BarChart2 className="w-3 h-3" />,      // Stabilization
  2023: <Wind className="w-3 h-3" />,           // Canadian wildfire smoke
  2024: <Leaf className="w-3 h-3" />,           // Clean Air target
};

export default function TemporalScrubber({
  selectedYear,
  onYearChange,
  className = "",
}: TemporalScrubberProps) {
  const [isOpen, setIsOpen] = useState(false); // Starts off closed as requested
  const [isPlaying, setIsPlaying] = useState(false);
  const selectedYearRef = useRef(selectedYear);
  selectedYearRef.current = selectedYear;
  const playTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isPlaying) {
      playTimerRef.current = setInterval(() => {
        const currentIndex = AVAILABLE_YEARS.indexOf(selectedYearRef.current);
        const nextIndex = (currentIndex + 1) % AVAILABLE_YEARS.length;
        onYearChange(AVAILABLE_YEARS[nextIndex]);
      }, 1200);
    } else if (playTimerRef.current) {
      clearInterval(playTimerRef.current);
      playTimerRef.current = null;
    }
    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlaying, onYearChange]);

  const currentIndex = AVAILABLE_YEARS.indexOf(selectedYear);

  if (!isOpen) {
    return (
      <div className={`pointer-events-auto ${className}`}>
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Open timeline scrubber"
          className="flex items-center gap-2.5 px-3 py-2 bg-background/95 backdrop-blur-md border border-border/80 rounded-2xl shadow-xl hover:bg-accent/80 transition-all active:scale-95 cursor-pointer group"
        >
          <div className="p-1.5 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            {YEAR_ICONS[selectedYear]}
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground font-semibold leading-none">
              Timeline
            </span>
            <span className="font-mono font-extrabold text-xs text-foreground leading-tight mt-0.5">
              {selectedYear}
            </span>
          </div>
          <ChevronUp className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-transform ml-1" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-1 bg-background/95 backdrop-blur-md border border-border/80 rounded-2xl px-2 py-1.5 shadow-2xl pointer-events-auto animate-in fade-in-50 zoom-in-95 duration-150 ${className}`}
    >
      {/* Prev */}
      <button
        onClick={() => onYearChange(AVAILABLE_YEARS[Math.max(0, currentIndex - 1)])}
        disabled={currentIndex === 0}
        className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 disabled:opacity-25 disabled:pointer-events-none transition-colors cursor-pointer"
        aria-label="Previous year"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>

      {/* Play / Pause */}
      <button
        onClick={() => setIsPlaying((p) => !p)}
        className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
          isPlaying
            ? "text-amber-500 bg-amber-500/10 hover:bg-amber-500/20"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
        }`}
        aria-label={isPlaying ? "Pause" : "Play trend animation"}
      >
        {isPlaying ? (
          <Pause className="w-3.5 h-3.5 fill-current" />
        ) : (
          <Play className="w-3.5 h-3.5 fill-current ml-px" />
        )}
      </button>

      {/* Divider */}
      <div className="w-px h-5 bg-border/60 mx-0.5" />

      {/* Year buttons — icon + year label */}
      {AVAILABLE_YEARS.map((yr) => {
        const isActive = yr === selectedYear;
        const event = TEMPORAL_EVENTS[yr];
        return (
          <button
            key={yr}
            onClick={() => onYearChange(yr)}
            title={event ? `${yr} — ${event.title}` : String(yr)}
            className={`relative flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all duration-150 cursor-pointer group ${
              isActive
                ? "bg-primary text-primary-foreground shadow-sm scale-105"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <span className={`transition-colors ${isActive ? "text-primary-foreground" : ""}`}>
              {YEAR_ICONS[yr]}
            </span>
            <span className="text-[9px] font-mono font-bold leading-none">{yr}</span>
          </button>
        );
      })}

      {/* Divider */}
      <div className="w-px h-5 bg-border/60 mx-0.5" />

      {/* Next */}
      <button
        onClick={() => onYearChange(AVAILABLE_YEARS[Math.min(AVAILABLE_YEARS.length - 1, currentIndex + 1)])}
        disabled={currentIndex === AVAILABLE_YEARS.length - 1}
        className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 disabled:opacity-25 disabled:pointer-events-none transition-colors cursor-pointer"
        aria-label="Next year"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>

      {/* Collapse / Close Button */}
      <button
        onClick={() => setIsOpen(false)}
        className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors ml-0.5 cursor-pointer"
        title="Collapse timeline scrubber"
        aria-label="Collapse timeline scrubber"
      >
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
