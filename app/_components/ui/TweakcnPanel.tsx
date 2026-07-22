"use client";

import React, { useState, useEffect } from "react";
import { Paintbrush, X, ChevronRight, Check, RotateCcw, Code2 } from "lucide-react";
import { PRESET_THEMES, applyTweakcnCSS } from "@/app/_lib/tweakcn";

function resetToDocumentDefaults() {
  const root = document.documentElement;
  const vars = [
    "--background", "--foreground", "--card", "--card-foreground",
    "--popover", "--popover-foreground", "--primary", "--primary-foreground",
    "--secondary", "--secondary-foreground", "--muted", "--muted-foreground",
    "--accent", "--accent-foreground", "--destructive", "--destructive-foreground",
    "--border", "--input", "--ring", "--radius",
  ];
  vars.forEach((v) => root.style.removeProperty(v));
}

export default function TweakcnPanel() {
  const [open, setOpen]           = useState(false);
  const [tab, setTab]             = useState<"presets" | "custom">("presets");
  const [customCSS, setCustomCSS] = useState("");
  const [applied, setApplied]     = useState<string | null>(null);
  const [feedback, setFeedback]   = useState<"ok" | "err" | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const applyPreset = (name: string, css: string) => {
    applyTweakcnCSS(css);
    setApplied(name);
  };

  const applyCustom = () => {
    if (!customCSS.trim()) return;
    try {
      applyTweakcnCSS(customCSS);
      setFeedback("ok");
    } catch {
      setFeedback("err");
    }
    setTimeout(() => setFeedback(null), 2000);
  };

  const reset = () => {
    resetToDocumentDefaults();
    setApplied(null);
    setCustomCSS("");
  };

  return (
    <>
      {/* Trigger */}
      <button
        id="tweakcn-trigger"
        onClick={() => setOpen((o) => !o)}
        title="Open Theme Editor"
        aria-label="Open Tweakcn theme editor"
        className={[
          "fixed bottom-5 right-5 z-[60] h-11 w-11",
          "flex items-center justify-center rounded-full",
          "border border-border bg-card text-foreground shadow-lg",
          "hover:bg-accent hover:scale-105 transition-all duration-200",
          open ? "rotate-180 bg-accent" : "",
        ].join(" ")}
      >
        <Paintbrush className="h-4.5 w-4.5" />
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-[55] bg-black/30 backdrop-blur-xs"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Panel */}
      <div
        className={[
          "fixed bottom-20 right-5 z-[60]",
          "w-[300px] max-h-[70vh]",
          "bg-card border border-border rounded-2xl shadow-2xl",
          "flex flex-col overflow-hidden",
          "transition-all duration-300 origin-bottom-right",
          open
            ? "scale-100 opacity-100 pointer-events-auto"
            : "scale-90 opacity-0 pointer-events-none",
        ].join(" ")}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Paintbrush className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-bold text-foreground">Theme Editor</span>
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              tweakcn
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={reset}
              title="Reset to default theme"
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border shrink-0">
          {(["presets", "custom"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={[
                "flex-1 py-2 text-[11px] font-semibold capitalize transition-colors",
                tab === t
                  ? "text-foreground border-b-2 border-primary -mb-px"
                  : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {t === "presets" ? "Presets" : "Custom CSS"}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
          {tab === "presets" ? (
            PRESET_THEMES.map((theme) => {
              const isActive = applied === theme.name;
              return (
                <button
                  key={theme.name}
                  onClick={() => applyPreset(theme.name, theme.css)}
                  className={[
                    "w-full flex items-center justify-between",
                    "px-3 py-2.5 rounded-xl border text-left transition-all group",
                    isActive
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:bg-accent/50 text-foreground",
                  ].join(" ")}
                >
                  <div>
                    <div className="text-xs font-semibold">{theme.name}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">Click to apply</div>
                  </div>
                  {isActive
                    ? <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                    : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-muted-foreground shrink-0" />}
                </button>
              );
            })
          ) : (
            <div className="space-y-2">
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Paste raw CSS from{" "}
                <a
                  href="https://tweakcn.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  tweakcn.com
                </a>{" "}
                and click Apply.
              </p>
              <textarea
                id="tweakcn-custom-css"
                value={customCSS}
                onChange={(e) => setCustomCSS(e.target.value)}
                placeholder={`:root {\n  --primary: oklch(0.5 0.2 264);\n  --radius: 0.5rem;\n  /* ... */\n}`}
                className="w-full h-44 text-[11px] font-mono bg-muted/40 border border-border rounded-lg p-2.5 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                spellCheck={false}
              />
              <button
                onClick={applyCustom}
                className={[
                  "w-full flex items-center justify-center gap-2 h-9 rounded-lg text-xs font-semibold transition-colors",
                  feedback === "ok"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : feedback === "err"
                      ? "bg-destructive/20 text-destructive border border-destructive/30"
                      : "bg-primary text-primary-foreground hover:opacity-90",
                ].join(" ")}
              >
                <Code2 className="h-3.5 w-3.5" />
                {feedback === "ok" ? "Applied!" : feedback === "err" ? "Parse Error" : "Apply CSS"}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-border bg-muted/30 shrink-0">
          <p className="text-[9px] text-muted-foreground text-center">
            Changes are live — reset to restore defaults
          </p>
        </div>
      </div>
    </>
  );
}
