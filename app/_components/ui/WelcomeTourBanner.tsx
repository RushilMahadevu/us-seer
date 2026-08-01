"use client";

import React, { useEffect, useState } from "react";
import { Sparkles, X, Compass, ArrowRight } from "lucide-react";
import { Button } from "@/app/_components/ui/button";

interface WelcomeTourBannerProps {
  onStartTour: () => void;
}

export default function WelcomeTourBanner({ onStartTour }: WelcomeTourBannerProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hasSeen = localStorage.getItem("hasSeenUSSEERTour");
    if (!hasSeen) {
      // Delay slightly for smooth entrance after page load
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("hasSeenUSSEERTour", "dismissed");
    }
  };

  const handleStart = () => {
    setIsVisible(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("hasSeenUSSEERTour", "completed");
    }
    onStartTour();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-5 left-4 sm:left-6 z-40 max-w-md w-[calc(100vw-32px)] sm:w-auto animate-in fade-in-50 slide-in-from-bottom-4 duration-300">
      <div className="bg-card/95 backdrop-blur-xl border border-primary/40 shadow-2xl rounded-2xl p-4 sm:p-4.5 flex flex-col gap-3 relative ring-1 ring-primary/20">
        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          aria-label="Dismiss welcome banner"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content */}
        <div className="flex items-start gap-3 pr-6">
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary shrink-0 mt-0.5 shadow-xs">
            <Compass className="w-5 h-5 animate-spin-slow text-primary" />
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-foreground tracking-tight">New to US-SEER?</span>
              <span className="px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider rounded-full bg-primary/20 text-primary border border-primary/30 animate-pulse">
                Highly Recommended
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-medium leading-relaxed">
              Take a 1-minute interactive tour to learn how to analyze county risk, simulate EPA policy impacts, and export reports.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-8 px-3 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Skip for now
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleStart}
            className="h-8 px-3.5 text-xs font-bold bg-primary text-primary-foreground shadow-md hover:bg-primary/90 cursor-pointer gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Start Interactive Tour</span>
            <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
