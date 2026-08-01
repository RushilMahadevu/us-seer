"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Compass,
  ChevronRight,
  ChevronLeft,
  X,
  Sparkles,
  Map,
  Sliders,
  Calendar,
  BarChart2,
  Landmark,
  FileText,
  CheckCircle2,
  Eye,
  MousePointerClick,
} from "lucide-react";
import { Button } from "@/app/_components/ui/button";
import { MapMetric } from "@/app/_components/map/MapContainer";
import { TemporalYear } from "@/app/_lib/temporal-data";

export interface TourStep {
  id: string;
  targetId: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  requiredView?: "map" | "analysis" | "sources";
  placementPreference?: "top" | "bottom" | "left" | "right" | "auto";
  actionHint?: string;
  requiredAction?: "click_county" | "change_metric" | "change_year" | "open_district" | "switch_lab" | "open_exporter" | "none";
  actionText?: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    targetId: "header-brand",
    title: "Welcome to US-SEER",
    subtitle: "Spatial Environmental Exposure & Respiratory Risk Index",
    description:
      "US-SEER is an interactive national platform for analyzing health vulnerability, air quality (PM2.5), respiratory mortality, and environmental risk across all US counties.",
    icon: <Compass className="w-5 h-5 text-primary" />,
    requiredView: "map",
    placementPreference: "bottom",
    actionHint: "Let's explore the platform step-by-step with live interactions!",
    requiredAction: "none",
  },
  {
    id: "map-viewport",
    targetId: "map-viewport",
    title: "Interactive National Map",
    subtitle: "Click a County to Open Health Profile",
    description:
      "Hover over any county to inspect real-time risk scores. Click a county on the map now to select it and open its full health profile in the side analytics panel!",
    icon: <Map className="w-5 h-5 text-emerald-400" />,
    requiredView: "map",
    placementPreference: "auto",
    actionHint: "Interactive: Click any county on the map to proceed!",
    requiredAction: "click_county",
    actionText: "Click any county on the map to open the side panel analytics!",
  },
  {
    id: "metric-selector",
    targetId: "map-metric-selector",
    title: "Environmental & Health Metrics",
    subtitle: "Select a Map Metric Layer",
    description:
      "Switch choropleth map layers on the fly: PM2.5 Pollution, Asthma & COPD Prevalence, Respiratory Mortality, Primary Care Density, Toxic Releases (TRI), and RUCC.",
    icon: <Sliders className="w-5 h-5 text-amber-400" />,
    requiredView: "map",
    placementPreference: "left",
    actionHint: "Interactive: Click the Metric Layer selector to view options!",
    requiredAction: "change_metric",
    actionText: "Click the Metric dropdown to open map layer options!",
  },
  {
    id: "temporal-scrubber",
    targetId: "temporal-scrubber",
    title: "Historical Timeline (2018–2024)",
    subtitle: "Click a Year on the Scrubber",
    description:
      "Slide through historical years to observe air quality improvements, policy impacts, and changing respiratory health outcomes over time.",
    icon: <Calendar className="w-5 h-5 text-blue-400" />,
    requiredView: "map",
    placementPreference: "left",
    actionHint: "Interactive: Click any year (2018–2024) on the timeline scrubber!",
    requiredAction: "change_year",
    actionText: "Click a historical year on the timeline scrubber!",
  },
  {
    id: "side-panel",
    targetId: "side-panel-container",
    title: "County Analytics & EPA Benchmarks",
    subtitle: "Deep-Dive Risk Diagnostics",
    description:
      "Inspect detailed risk breakdowns, EPA safe limit comparisons, historical charts, demographic equity indexes, and direct lawmaker contact info.",
    icon: <BarChart2 className="w-5 h-5 text-purple-400" />,
    requiredView: "map",
    placementPreference: "left",
    actionHint: "Review risk tiers, EPA benchmarks, and legislative outreach tools.",
    requiredAction: "none",
  },
  {
    id: "my-district",
    targetId: "header-my-district-btn",
    title: "Congressional District Finder",
    subtitle: "Click 'My District' to View NV-02",
    description:
      "Jump straight to congressional district analysis (such as NV-02), view representative profiles, legislative sponsors, and regional health equity breakdowns.",
    icon: <Landmark className="w-5 h-5 text-violet-400" />,
    requiredView: "map",
    placementPreference: "bottom",
    actionHint: "Interactive: Click the 'My District' button in the header toolbar!",
    requiredAction: "open_district",
    actionText: "Click the 'My District' button in the header!",
  },
  {
    id: "analytical-lab",
    targetId: "view-toggle-analysis",
    title: "Analytical Lab & Policy Simulator",
    subtitle: "Causal Modeling & Health Impact Estimator",
    description:
      "Simulate EPA policy interventions (e.g. -15% PM2.5 reduction), calculate lives saved, estimated economic cost savings, and analyze cross-variable scatter plots.",
    icon: <Sparkles className="w-5 h-5 text-teal-400" />,
    requiredView: "analysis",
    placementPreference: "bottom",
    actionHint: "Explore causal policy simulations and scatter plot matrix!",
    requiredAction: "none",
  },
  {
    id: "pdf-exporter",
    targetId: "header-exporter-btn",
    title: "PDF Report Exporter & Briefings",
    subtitle: "Executive Summaries & Reports",
    description:
      "Generate print-ready executive PDF summaries or dual-county comparison briefs. Review methodology, CDC, EPA, Census, and HRSA data sources.",
    icon: <FileText className="w-5 h-5 text-emerald-400" />,
    placementPreference: "bottom",
    actionHint: "Interactive: Click the 'Export PDF' button to complete the tour!",
    requiredAction: "open_exporter",
    actionText: "Click the PDF Exporter button in the header!",
  },
];

interface ElementRect {
  top: number;
  left: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
}

interface TutorialTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeView: "map" | "analysis" | "sources";
  onViewChange: (view: "map" | "analysis" | "sources") => void;
  selectedFips?: string | null;
  mapMetric?: MapMetric;
  selectedYear?: TemporalYear;
  isDistrictOpen?: boolean;
  onCloseDistrict?: () => void;
  isExporterOpen?: boolean;
  onCloseExporter?: () => void;
}

export default function TutorialTourModal({
  isOpen,
  onClose,
  activeView,
  onViewChange,
  selectedFips,
  mapMetric,
  selectedYear,
  isDistrictOpen,
  onCloseDistrict,
  isExporterOpen,
  onCloseExporter,
}: TutorialTourModalProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<ElementRect | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // References for tracking state changes
  const prevFipsRef = useRef(selectedFips);
  const prevMetricRef = useRef(mapMetric);
  const prevYearRef = useRef(selectedYear);
  const prevDistrictRef = useRef(isDistrictOpen);
  const prevExporterRef = useRef(isExporterOpen);
  const prevViewRef = useRef(activeView);

  const step = TOUR_STEPS[currentStepIndex];

  // Reset to step 0 whenever opened
  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(0);
      prevFipsRef.current = selectedFips;
      prevMetricRef.current = mapMetric;
      prevYearRef.current = selectedYear;
      prevDistrictRef.current = isDistrictOpen;
      prevExporterRef.current = isExporterOpen;
      prevViewRef.current = activeView;
    }
  }, [isOpen]);

  // Snapshot refs whenever step changes
  useEffect(() => {
    if (TOUR_STEPS[currentStepIndex - 1]?.id === "my-district" || (currentStepIndex !== 5 && isDistrictOpen)) {
      if (onCloseDistrict && isDistrictOpen) {
        onCloseDistrict();
      }
    }

    prevFipsRef.current = selectedFips;
    prevMetricRef.current = mapMetric;
    prevYearRef.current = selectedYear;
    prevDistrictRef.current = isDistrictOpen;
    prevExporterRef.current = isExporterOpen;
    prevViewRef.current = activeView;
  }, [currentStepIndex]);

  // Advance to next step helper
  const advanceStep = useCallback(() => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      onClose();
    }
  }, [currentStepIndex, onClose]);

  // Direct click listener on Step 3 Metric Selector: opening options advances immediately to Step 4
  useEffect(() => {
    if (!isOpen || step?.id !== "metric-selector") return;

    const el = document.getElementById("map-metric-selector");
    if (!el) return;

    const handleMetricClick = () => {
      advanceStep();
    };

    el.addEventListener("click", handleMetricClick);
    return () => el.removeEventListener("click", handleMetricClick);
  }, [isOpen, step, advanceStep]);

  // Listen for state changes to advance interactive steps
  useEffect(() => {
    if (!isOpen || !step) return;

    if (step.requiredAction === "click_county") {
      if (selectedFips && selectedFips !== prevFipsRef.current) {
        prevFipsRef.current = selectedFips;
        advanceStep();
      }
    } else if (step.requiredAction === "change_metric") {
      if (mapMetric && mapMetric !== prevMetricRef.current) {
        prevMetricRef.current = mapMetric;
        advanceStep();
      }
    } else if (step.requiredAction === "change_year") {
      if (selectedYear && selectedYear !== prevYearRef.current) {
        prevYearRef.current = selectedYear;
        advanceStep();
      }
    } else if (step.requiredAction === "open_district") {
      if (isDistrictOpen && !prevDistrictRef.current) {
        prevDistrictRef.current = isDistrictOpen;
        if (onCloseDistrict) onCloseDistrict();
        advanceStep();
      }
    } else if (step.requiredAction === "switch_lab") {
      if (activeView === "analysis" && prevViewRef.current !== "analysis") {
        prevViewRef.current = activeView;
        advanceStep();
      }
    } else if (step.requiredAction === "open_exporter") {
      if (isExporterOpen && !prevExporterRef.current) {
        prevExporterRef.current = isExporterOpen;
        if (onCloseExporter) onCloseExporter();
        onClose();
      }
    }
  }, [
    isOpen,
    step,
    currentStepIndex,
    selectedFips,
    mapMetric,
    selectedYear,
    isDistrictOpen,
    isExporterOpen,
    activeView,
    advanceStep,
    onClose,
    onCloseDistrict,
    onCloseExporter,
  ]);

  // Switch view if required for current step
  useEffect(() => {
    if (!isOpen || !step) return;
    if (step.requiredView && activeView !== step.requiredView) {
      onViewChange(step.requiredView);
    }
  }, [isOpen, currentStepIndex, step, activeView, onViewChange]);

  // Recalculate target element position
  const updateTargetRect = useCallback(() => {
    if (!isOpen || !step) return;

    const el = document.getElementById(step.targetId);
    if (el) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setTargetRect({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          right: rect.right,
          bottom: rect.bottom,
        });
        return;
      }
    }

    setTargetRect(null);
  }, [isOpen, step]);

  useEffect(() => {
    if (!isOpen) return;

    updateTargetRect();
    const timeoutId = setTimeout(updateTargetRect, 200);
    const intervalId = setInterval(updateTargetRect, 400);

    const handleResizeOrScroll = () => updateTargetRect();
    window.addEventListener("resize", handleResizeOrScroll);
    window.addEventListener("scroll", handleResizeOrScroll, true);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
      window.removeEventListener("resize", handleResizeOrScroll);
      window.removeEventListener("scroll", handleResizeOrScroll, true);
    };
  }, [isOpen, currentStepIndex, updateTargetRect]);

  // Handle Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (onCloseDistrict && isDistrictOpen) onCloseDistrict();
        onClose();
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        if (currentStepIndex < TOUR_STEPS.length - 1) {
          if (step?.id === "my-district" && onCloseDistrict) onCloseDistrict();
          setCurrentStepIndex((prev) => prev + 1);
        } else {
          onClose();
        }
      } else if (e.key === "ArrowLeft") {
        if (currentStepIndex > 0) {
          setCurrentStepIndex((prev) => prev - 1);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentStepIndex, step, isDistrictOpen, onCloseDistrict, onClose]);

  // Safe backdrop click handler that ignores clicks on dropdowns or open menus
  const handleBackdropClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest("#map-metric-selector") ||
      target.closest("[role='menu']") ||
      target.closest(".z-50")
    ) {
      return;
    }
    if (onCloseDistrict && isDistrictOpen) onCloseDistrict();
    onClose();
  };

  if (!isOpen || !step) return null;

  const totalSteps = TOUR_STEPS.length;
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === totalSteps - 1;

  // Calculate Popover Position relative to screen and target element
  const getPopoverStyle = () => {
    if (typeof window === "undefined") return {};

    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const isMobile = viewportW < 768;

    if (isMobile || !targetRect) {
      return {
        position: "fixed" as const,
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        maxWidth: "calc(100vw - 32px)",
        width: "420px",
      };
    }

    const margin = 16;
    const cardW = 380;
    const cardH = 265;

    // Smart positioning logic: If target element is very large (e.g. map viewport container)
    // place popover card safely near top-left inside the container so it never clips off-screen!
    if (targetRect.height > viewportH - 200) {
      return {
        position: "fixed" as const,
        top: `${Math.max(margin, targetRect.top + 20)}px`,
        left: `${Math.max(margin, targetRect.left + 20)}px`,
        width: `${cardW}px`,
      };
    }

    let pref = step.placementPreference || "auto";

    if (pref === "auto") {
      if (targetRect.top > viewportH - 280) {
        pref = "top";
      } else if (targetRect.left > viewportW - 420) {
        pref = "left";
      } else {
        pref = "bottom";
      }
    }

    let top = 0;
    let left = 0;

    if (pref === "bottom") {
      top = targetRect.bottom + margin;
      left = targetRect.left + targetRect.width / 2 - cardW / 2;
    } else if (pref === "top") {
      top = targetRect.top - cardH - margin;
      left = targetRect.left + targetRect.width / 2 - cardW / 2;
    } else if (pref === "left") {
      top = targetRect.top + targetRect.height / 2 - cardH / 2;
      left = targetRect.left - cardW - margin;
    } else if (pref === "right") {
      top = targetRect.top + targetRect.height / 2 - cardH / 2;
      left = targetRect.right + margin;
    }

    left = Math.max(margin, Math.min(left, viewportW - cardW - margin));
    top = Math.max(margin, Math.min(top, viewportH - cardH - margin));

    return {
      position: "fixed" as const,
      top: `${top}px`,
      left: `${left}px`,
      width: `${cardW}px`,
    };
  };

  const popoverStyle = getPopoverStyle();

  const handleNext = () => {
    if (step?.id === "my-district" && onCloseDistrict) {
      onCloseDistrict();
    }
    if (isLastStep) {
      onClose();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const padding = 8;
  const spotTop = targetRect ? Math.max(0, targetRect.top - padding) : 0;
  const spotLeft = targetRect ? Math.max(0, targetRect.left - padding) : 0;
  const spotWidth = targetRect ? targetRect.width + padding * 2 : 0;
  const spotHeight = targetRect ? targetRect.height + padding * 2 : 0;

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden pointer-events-none">
      {/* ── Spotlight Backdrop & Click-Through Hole ── */}
      {targetRect ? (
        <>
          {/* Spotlight Highlight Box with Box-Shadow Dim Backdrop */}
          <div
            style={{
              top: `${spotTop}px`,
              left: `${spotLeft}px`,
              width: `${spotWidth}px`,
              height: `${spotHeight}px`,
              boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.72)",
            }}
            className="fixed pointer-events-none rounded-xl border-2 border-primary shadow-[0_0_30px_rgba(59,130,246,0.8)] animate-pulse transition-all duration-300 ease-out z-[101]"
          />

          {/* 4 Click-Catcher Backdrops outside target rect (for dismiss on outside click) */}
          <div
            style={{ height: `${spotTop}px` }}
            className="fixed top-0 inset-x-0 z-[102] pointer-events-auto cursor-pointer"
            onClick={handleBackdropClick}
            title="Click outside to exit tutorial"
          />
          <div
            style={{ top: `${spotTop + spotHeight}px` }}
            className="fixed bottom-0 inset-x-0 z-[102] pointer-events-auto cursor-pointer"
            onClick={handleBackdropClick}
            title="Click outside to exit tutorial"
          />
          <div
            style={{ top: `${spotTop}px`, height: `${spotHeight}px`, width: `${spotLeft}px` }}
            className="fixed left-0 z-[102] pointer-events-auto cursor-pointer"
            onClick={handleBackdropClick}
            title="Click outside to exit tutorial"
          />
          <div
            style={{ top: `${spotTop}px`, height: `${spotHeight}px`, left: `${spotLeft + spotWidth}px` }}
            className="fixed right-0 z-[102] pointer-events-auto cursor-pointer"
            onClick={handleBackdropClick}
            title="Click outside to exit tutorial"
          />
        </>
      ) : (
        /* Fallback full screen backdrop if target element not found */
        <div
          className="fixed inset-0 bg-black/75 z-[101] pointer-events-auto cursor-pointer"
          onClick={handleBackdropClick}
        />
      )}

      {/* Dynamic Tooltip Popover Card */}
      <div
        ref={popoverRef}
        style={popoverStyle}
        className="z-[103] pointer-events-auto bg-card/95 backdrop-blur-xl border border-border shadow-2xl rounded-2xl p-4.5 sm:p-5 flex flex-col gap-3.5 animate-in fade-in-50 zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Step Progress Bar Header */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-primary font-bold">
              <Compass className="w-3.5 h-3.5 text-primary animate-spin-slow" />
              Interactive Guided Tour
            </span>
            <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
              <span>
                Step <strong className="text-foreground">{currentStepIndex + 1}</strong> of {totalSteps}
              </span>
              <button
                onClick={() => {
                  if (onCloseDistrict && isDistrictOpen) onCloseDistrict();
                  onClose();
                }}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                aria-label="Close tour"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 ease-out rounded-full"
              style={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Card Content Body */}
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 shrink-0 mt-0.5 shadow-xs">
            {step.icon}
          </div>
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <h3 className="text-sm font-bold text-foreground leading-tight tracking-tight">
              {step.title}
            </h3>
            <p className="text-[11px] font-semibold text-primary/90">
              {step.subtitle}
            </p>
            <p className="text-xs text-muted-foreground font-medium leading-relaxed mt-1">
              {step.description}
            </p>
          </div>
        </div>

        {/* Interactive Action Prompt Callout */}
        {step.requiredAction && step.requiredAction !== "none" ? (
          <div className="px-3 py-2 rounded-xl border bg-rose-500/15 border-rose-500/40 text-rose-400 animate-pulse text-xs font-semibold flex items-center gap-2 transition-all shadow-xs ring-1 ring-rose-500/20">
            <MousePointerClick className="w-4 h-4 text-rose-400 shrink-0 animate-bounce" />
            <span className="leading-tight">
              <strong className="font-extrabold uppercase text-[10px] tracking-wide block text-rose-400">Action Required:</strong>
              {step.actionText || step.actionHint}
            </span>
          </div>
        ) : (
          step.actionHint && (
            <div className="px-2.5 py-1.5 rounded-lg bg-muted/60 border border-border/60 text-[10.5px] text-muted-foreground font-medium flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>{step.actionHint}</span>
            </div>
          )
        )}

        {/* Step Navigation Dots & Control Buttons */}
        <div className="flex items-center justify-between pt-1 border-t border-border/60">
          {/* Step Dots */}
          <div className="flex items-center gap-1">
            {TOUR_STEPS.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => setCurrentStepIndex(idx)}
                title={`Jump to step ${idx + 1}: ${s.title}`}
                className={`h-1.5 rounded-full transition-all duration-200 cursor-pointer ${
                  idx === currentStepIndex
                    ? "w-5 bg-primary"
                    : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60"
                }`}
              />
            ))}
          </div>

          {/* Navigation Action Buttons */}
          <div className="flex items-center gap-1.5">
            {!isFirstStep && (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrev}
                className="h-8 px-2.5 text-xs font-semibold cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-0.5" />
                Back
              </Button>
            )}

            {isLastStep ? (
              <Button
                variant="default"
                size="sm"
                onClick={handleNext}
                className="h-8 px-3 text-xs font-bold bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 cursor-pointer"
              >
                <span>Finish</span>
                <CheckCircle2 className="w-3.5 h-3.5 ml-1" />
              </Button>
            ) : step.requiredAction && step.requiredAction !== "none" ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNext}
                className="h-8 px-2.5 text-[11px] font-medium text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/40 cursor-pointer border border-border/40"
                title="Skip performing this live action"
              >
                <span>Skip Step</span>
                <ChevronRight className="w-3 h-3 ml-0.5 opacity-60" />
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={handleNext}
                className="h-8 px-3 text-xs font-bold bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
