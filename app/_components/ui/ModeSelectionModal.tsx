"use client";

import React, { useEffect, useState } from "react";
import { Sparkles, FlaskConical, Info } from "lucide-react";
import { Dialog, DialogTitle, DialogDescription } from "@/app/_components/ui/dialog";
import { useSimpleMode } from "@/app/_lib/simple-mode-context";

export default function ModeSelectionModal() {
  const [isOpen, setIsOpen] = useState(false);
  const { isSimpleMode, setIsSimpleMode } = useSimpleMode();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hasChosen = localStorage.getItem("hasChosenMode");
    if (!hasChosen) {
      setIsOpen(true);
    }
  }, []);

  const handleSelectMode = (simple: boolean) => {
    setIsSimpleMode(simple);
    setIsOpen(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("hasChosenMode", "true");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      // Force user to choose a mode, do not close on backdrop click
      if (open) setIsOpen(true);
    }}>
      <div className="p-2 sm:p-4 space-y-6">
        <div className="space-y-3">
          <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight text-foreground text-center">
            Welcome to US-SEER
          </DialogTitle>
          <DialogDescription className="text-center text-sm sm:text-base text-muted-foreground">
            How would you like to experience the spatial intelligence platform?
          </DialogDescription>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Simple Mode Option */}
          <button
            onClick={() => handleSelectMode(true)}
            className="flex flex-col items-center text-center gap-3 p-5 rounded-xl border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/40 transition-all cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-bold text-foreground text-base">Simple Mode</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Plain English summaries, simplified charts, and easy-to-understand metrics. Best for general public and quick insights.
              </p>
            </div>
          </button>

          {/* Advanced Mode Option */}
          <button
            onClick={() => handleSelectMode(false)}
            className="flex flex-col items-center text-center gap-3 p-5 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 transition-all cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
              <FlaskConical className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-bold text-foreground text-base">Advanced Mode</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Academic indicators, causal policy simulation, and complex spatial metrics. Best for researchers and policymakers.
              </p>
            </div>
          </button>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2 text-[11px] text-muted-foreground text-center">
          <Info className="w-4 h-4 text-primary/70 shrink-0" />
          <span>You can easily switch modes later using the widget in the bottom right corner.</span>
        </div>
      </div>
    </Dialog>
  );
}
