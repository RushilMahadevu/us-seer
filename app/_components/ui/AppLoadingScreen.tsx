"use client";

import React, { useEffect, useState } from "react";
import { HeartPulse, Loader2 } from "lucide-react";

interface AppLoadingScreenProps {
  isLoading: boolean;
  isResetting?: boolean;
}

export default function AppLoadingScreen({
  isLoading,
  isResetting = false,
}: AppLoadingScreenProps) {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);
  const [progress, setProgress] = useState(0);

  const active = isLoading || isResetting;

  useEffect(() => {
    if (active) {
      setVisible(true);
      setFading(false);
      setProgress(15);

      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + Math.floor(Math.random() * 15 + 10);
        });
      }, 120);

      return () => clearInterval(interval);
    } else {
      setProgress(100);

      const fadeTimeout = setTimeout(() => {
        setFading(true);
      }, 200);

      const hideTimeout = setTimeout(() => {
        setVisible(false);
      }, 600);

      return () => {
        clearTimeout(fadeTimeout);
        clearTimeout(hideTimeout);
      };
    }
  }, [active]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 bg-background/85 backdrop-blur-lg transition-all duration-500 ease-out select-none ${
        fading ? "opacity-0 scale-98 pointer-events-none" : "opacity-100 scale-100"
      }`}
    >
      {/* Subtle ambient central glow */}
      <div className="absolute w-64 h-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

      {/* Minimal Loader Card */}
      <div className="relative z-10 flex flex-col items-center gap-3 max-w-xs w-full text-center">
        
        {/* Sleek icon */}
        <div className="w-12 h-12 rounded-2xl bg-card border border-border/80 shadow-md flex items-center justify-center relative">
          <HeartPulse className="w-6 h-6 text-primary animate-pulse" />
        </div>

        {/* Minimal text */}
        <div className="space-y-0.5">
          <h2 className="text-sm font-bold tracking-tight text-foreground">US-SEER</h2>
          <div className="text-[11px] text-muted-foreground font-medium flex items-center justify-center gap-1.5">
            <Loader2 className="w-3 h-3 text-primary animate-spin" />
            <span>{isResetting ? "Resetting state..." : "Loading spatial data..."}</span>
            <span className="font-mono font-bold text-primary text-[11px] ml-0.5">{progress}%</span>
          </div>
        </div>

        {/* Minimal Progress Bar */}
        <div className="w-48 h-1 bg-muted rounded-full overflow-hidden mt-1 border border-border/40">
          <div
            className="h-full bg-primary transition-all duration-300 ease-out rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>

      </div>
    </div>
  );
}
