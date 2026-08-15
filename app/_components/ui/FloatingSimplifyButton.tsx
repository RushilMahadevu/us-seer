"use client";

import React from "react";
import { useSimpleMode } from "@/app/_lib/simple-mode-context";
import { SquaresSubtract } from "lucide-react";

export default function FloatingSimplifyButton() {
  const { isSimpleMode, toggleSimpleMode } = useSimpleMode();

  return (
    <button
      id="floating-simple-mode-btn"
      onClick={toggleSimpleMode}
      title={
        isSimpleMode
          ? "Switch to standard detailed mode"
          : "Switch to Simplify mode (plain English summary)"
      }
      aria-label="Toggle Simplify mode"
      className={`hidden md:flex fixed bottom-5 right-5 z-50 group cursor-pointer items-center gap-2.5 px-4 py-2.5 rounded-full border text-xs font-bold transition-all duration-200 shadow-xl backdrop-blur-xl active:scale-95 hover:scale-105 ${
        isSimpleMode
          ? "bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-amber-500/10 border-amber-500/50 text-amber-400 shadow-amber-500/15 ring-1 ring-amber-500/30"
          : "bg-card/95 border-border/90 text-muted-foreground hover:text-foreground hover:bg-card hover:border-primary/40 hover:shadow-primary/10"
      }`}
    >
      <span
        className={`w-2 h-2 rounded-full transition-all duration-200 ${
          isSimpleMode
            ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)] animate-pulse"
            : "bg-muted-foreground/40 group-hover:bg-primary/70"
        }`}
      />
      <SquaresSubtract
        className={`w-4 h-4 transition-transform duration-200 group-hover:rotate-12 group-hover:scale-110 ${
          isSimpleMode ? "text-amber-400" : "text-muted-foreground group-hover:text-primary"
        }`}
      />
      <span className="select-none tracking-tight">
        {isSimpleMode ? "Simplified" : "Simplify"}
      </span>
    </button>
  );
}
