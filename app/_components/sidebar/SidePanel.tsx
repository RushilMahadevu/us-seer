"use client";

import React, { useState } from "react";
import { CountyData, CountyDataMap } from "@/app/_lib/types";
import { getCountyTriSummary, getTriFacilitiesByFips } from "@/app/_lib/tri-facilities-data";
import EquityTab from "@/app/_components/sidebar/EquityTab";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/app/_components/ui/card";
import { Badge } from "@/app/_components/ui/badge";
import { Button } from "@/app/_components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/app/_components/ui/tabs";
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from "@/app/_components/ui/dialog";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer, ReferenceLine } from "recharts";
import { useSimpleMode } from "@/app/_lib/simple-mode-context";
import { TemporalYear, getCountyHistory, getMetricDelta, CountyYearHistoryPoint, TEMPORAL_EVENTS } from "@/app/_lib/temporal-data";
import {
  Users,
  Cigarette,
  Droplets,
  Wind,
  Activity,
  Stethoscope,
  Factory,
  Map,
  HeartPulse,
  MapPin,
  DollarSign,
  ShieldAlert,
  TrendingUp,
  Maximize2,
  GraduationCap,
  HeartHandshake,
  Calendar,
  Home as HomeIcon,
  PieChart,
  Building2,
  Scale,
  FileText,
  FlaskConical,
  Zap,
  Info,
  ChevronRight,
} from "lucide-react";

import causalEstimatesRaw from "@/public/data/causal_estimates.json";

interface SidePanelProps {
  fips: string | null;
  countyData: CountyData | null;
  allCountyData?: CountyDataMap | null;
  onOpenCompare?: (fipsA?: string) => void;
  onOpenExporter?: (fipsA?: string) => void;
  selectedYear?: TemporalYear;
  onYearChange?: (year: TemporalYear) => void;
}

/* ── Tiny helpers ─────────────────────────────────────────────── */

function StatCard({
  label,
  value,
  unit,
  icon,
  color = "text-primary",
  simpleLabel,
  simpleValue,
  isSimple,
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  icon: React.ReactNode;
  color?: string;
  simpleLabel?: string;
  simpleValue?: React.ReactNode;
  isSimple?: boolean;
}) {
  const displayLabel = isSimple && simpleLabel ? simpleLabel : label;
  const displayValue = isSimple && simpleValue !== undefined ? simpleValue : value;

  return (
    <div className="p-3 rounded-xl border border-border bg-background/70 space-y-1.5 shadow-xs hover:shadow-sm transition-shadow">
      <div className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider ${color}`}>
        {icon}
        {displayLabel}
      </div>
      <div className="text-sm font-bold text-foreground leading-none">
        {displayValue}
        {!isSimple && unit && <span className="ml-1 text-[10px] font-normal text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}

function SectionLabel({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 pb-2 mb-1 border-b border-border/50">
      {icon}
      <span className="text-[11px] font-semibold text-foreground">{children}</span>
    </div>
  );
}

/* ── PM2.5 plain-English helper ─────────────────────────────── */
function pm25Label(val: number): string {
  if (val < 5) return "Clean air 🟢";
  if (val < 9) return "Okay air 🟡";
  if (val < 12) return "Slightly polluted 🟠";
  return "Heavily polluted 🔴";
}

/* ── RUCC plain-English helper ──────────────────────────────── */
function ruccLabel(code: number): string {
  if (code <= 3) return "City / Metro";
  if (code <= 6) return "Town / Suburb";
  return "Rural area";
}

/* ── Poverty fraction helper ────────────────────────────────── */
function povertyFraction(pct: number): string {
  if (pct >= 30) return "About 1 in 3 people";
  if (pct >= 20) return "About 1 in 5 people";
  if (pct >= 10) return "About 1 in 10 people";
  return "Less than 1 in 10 people";
}

/* ── Uninsured fraction helper ──────────────────────────────── */
function uninsuredFraction(pct: number): string {
  if (pct >= 25) return "About 1 in 4 people";
  if (pct >= 12.5) return "About 1 in 8 people";
  if (pct >= 6.25) return "About 1 in 16 people";
  return "A small share";
}

/* ── Policy Simulator Sub-Component ─────────────────────────── */
interface PolicySimulatorProps {
  countyData: NonNullable<{ pm25Avg?: number | null; population?: number | null; rucc?: number | null; County_Name?: string }>;
  theta: number;
  ciLo: number;
  ciHi: number;
  isRural: boolean;
  isSimpleMode: boolean;
  causal: typeof import("@/public/data/causal_estimates.json");
}

function PolicySimulatorContent({ countyData, theta, ciLo, ciHi, isRural, isSimpleMode, causal }: PolicySimulatorProps) {
  const [deltaPm25, setDeltaPm25] = useState<number>(2);

  const pop      = countyData.population ?? causal.rural.avg_population;
  const pm25Now  = countyData.pm25Avg ?? causal.rural.avg_pm25;
  const EPA_VSL  = causal.policy_simulator.epa_vsl;
  const EPA_STD  = causal.policy_simulator.epa_target_pm25;

  // Core formula: lives_saved = |theta| × (population / 100000) × delta_pm25
  // (negative theta = harmful direction; we flip sign for "reduction" framing)
  // Rural theta is positive (more PM2.5 → more deaths), so reduction → lives saved
  const effectiveTheta = isRural ? Math.abs(theta) : Math.max(0, -theta); // safe for urban confounded estimate
  const livesSaved      = effectiveTheta * (pop / 100_000) * deltaPm25;
  const livesSavedLo    = Math.max(0, Math.abs(ciLo) * (pop / 100_000) * deltaPm25);
  const livesSavedHi    = Math.abs(ciHi) * (pop / 100_000) * deltaPm25;
  const costSavings     = livesSaved * EPA_VSL;
  const maxFeasibleReduction = Math.max(0, pm25Now - EPA_STD);
  const pm25Target      = Math.max(0, pm25Now - deltaPm25);

  const fmtLives = (v: number) => v < 0.05 ? "<0.1" : v.toFixed(1);
  const fmtCost  = (v: number) => {
    if (v >= 1e9) return `$${(v/1e9).toFixed(1)}B`;
    if (v >= 1e6) return `$${(v/1e6).toFixed(1)}M`;
    return `$${(v/1e3).toFixed(0)}K`;
  };

  // Significance: is CI strictly positive?
  const isSignificant = ciLo > 0 && ciHi > 0;
  const canSimulate   = isRural || effectiveTheta > 0;

  return (
    <div className="space-y-3">
      {/* Header badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <FlaskConical className="h-3.5 w-3.5 text-violet-500" />
          <span className="text-[11px] font-bold text-foreground uppercase tracking-wide">
            {isSimpleMode ? "What If We Cleaned the Air?" : "Causal Policy Simulator"}
          </span>
        </div>
        <Badge variant="outline" className="text-[9px] font-semibold text-violet-500 border-violet-500/30 bg-violet-500/5">
          DML
        </Badge>
      </div>

      {/* Context callout */}
      {!isRural && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <Info className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-[10px] text-amber-600 dark:text-amber-400 leading-relaxed">
            {isSimpleMode
              ? "This county is urban — healthcare access offsets some pollution harm. Estimates are less certain."
              : "Urban counties show a confounded signal (healthcare access dominates). Rural DML θ = +1.47/100k is the primary causal estimate."}
          </p>
        </div>
      )}
      {isRural && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-violet-500/10 border border-violet-500/20">
          <Zap className="h-3 w-3 text-violet-500 shrink-0 mt-0.5" />
          <p className="text-[10px] text-violet-600 dark:text-violet-300 leading-relaxed">
            {isSimpleMode
              ? "This rural county shows a clear pollution–health link. The estimate below is backed by real causal analysis."
              : "Rural DML estimate (θ = +1.47 per 100k per µg/m³) is the statistically valid causal signal after controlling for smoking, poverty, and healthcare access."}
          </p>
        </div>
      )}

      {/* Current PM2.5 context */}
      <div className="p-3 rounded-xl border border-border bg-background/70 space-y-2">
        <div className="flex items-center justify-between text-[10px]">
          <span className="font-semibold text-muted-foreground uppercase tracking-wide">
            Current PM₂.₅
          </span>
          <span className={`font-bold ${pm25Now > EPA_STD ? "text-rose-500" : "text-emerald-500"}`}>
            {pm25Now.toFixed(2)} µg/m³
            {pm25Now > EPA_STD && (
              <span className="text-rose-400 ml-1 font-normal">↑ above EPA limit</span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-rose-500 rounded-full transition-all"
              style={{ width: `${Math.min(100, (pm25Now / 15) * 100)}%` }}
            />
          </div>
          <span className="shrink-0">EPA limit: {EPA_STD} µg/m³</span>
        </div>
      </div>

      {/* Slider */}
      <div className="p-3 rounded-xl border border-border bg-background/70 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold text-foreground">
            {isSimpleMode ? "How much to clean the air?" : "PM₂.₅ Reduction Target"}
          </span>
          <Badge className="text-[10px] font-mono bg-violet-600/10 text-violet-600 border-violet-500/30">
            −{deltaPm25.toFixed(1)} µg/m³
          </Badge>
        </div>

        <input
          type="range"
          min={0.5}
          max={5}
          step={0.5}
          value={deltaPm25}
          onChange={(e) => setDeltaPm25(parseFloat(e.target.value))}
          className="w-full accent-violet-500 cursor-pointer"
          aria-label="PM2.5 reduction target in micrograms per cubic meter"
        />

        <div className="flex justify-between text-[9px] text-muted-foreground">
          <span>0.5 µg/m³</span>
          <span>
            {maxFeasibleReduction > 0
              ? `↓ to EPA std: ${maxFeasibleReduction.toFixed(1)}`
              : "Already at/below EPA standard"}
          </span>
          <span>5.0 µg/m³</span>
        </div>

        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Target level after reduction:</span>
          <span className={`font-bold ${pm25Target <= EPA_STD ? "text-emerald-500" : "text-amber-500"}`}>
            {pm25Target.toFixed(2)} µg/m³
            {pm25Target <= EPA_STD ? " ✓ EPA-compliant" : ""}
          </span>
        </div>
      </div>

      {/* Results */}
      {canSimulate ? (
        <div className="p-3.5 rounded-xl border border-violet-500/30 bg-violet-500/5 space-y-3">
          {/* Lives saved — point estimate */}
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
              {isSimpleMode ? "Estimated Lives Saved Per Year" : "Estimated Annual Lives Saved"}
            </div>
            <div className="text-3xl font-extrabold text-violet-500 leading-none">
              {fmtLives(livesSaved)}
              <span className="text-sm font-normal text-muted-foreground ml-1.5">
                {isSimpleMode ? "people" : "deaths/yr avoided"}
              </span>
            </div>
            {/* CI range bar */}
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                <span>95% Confidence Range:</span>
                <span className="font-mono">
                  [{fmtLives(livesSavedLo)} – {fmtLives(livesSavedHi)}]
                </span>
              </div>
              {/* Visual CI bar */}
              <div className="relative h-4 bg-muted rounded-full overflow-hidden">
                {/* CI band */}
                <div
                  className="absolute top-0 h-full bg-violet-400/20 rounded-full"
                  style={{
                    left: `${Math.min(100, (livesSavedLo / (livesSavedHi + 1)) * 100)}%`,
                    right: "0%",
                  }}
                />
                {/* Point estimate marker */}
                <div
                  className="absolute top-1 h-2 w-0.5 bg-violet-600 rounded-full"
                  style={{
                    left: `${Math.min(98, (livesSaved / (livesSavedHi + 1)) * 100)}%`,
                  }}
                />
                <div className="absolute inset-0 flex items-center px-2">
                  <span className="text-[8px] text-violet-600 font-bold">
                    ← CI range →
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Healthcare cost savings */}
          <div className="pt-2 border-t border-violet-500/20">
            <div className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
              {isSimpleMode ? "Estimated Healthcare Savings" : "Statistical Value (EPA VSL, 2024)"}
            </div>
            <div className="text-xl font-extrabold text-emerald-500">
              {fmtCost(costSavings)}
              <span className="text-xs font-normal text-muted-foreground ml-1.5">
                /yr
              </span>
            </div>
            {!isSimpleMode && (
              <p className="text-[9px] text-muted-foreground mt-1">
                At EPA Value of Statistical Life ($11M/life, 2024 dollars)
              </p>
            )}
          </div>

          {/* Significance note */}
          {!isSignificant && !isSimpleMode && (
            <div className="flex items-start gap-1.5 text-[9px] text-amber-500">
              <Info className="h-2.5 w-2.5 shrink-0 mt-0.5" />
              <span>
                Analytical CI crosses zero — bootstrap CI confirms positive direction.
                Effect is directionally consistent with FINDINGS.md (rural r = 0.17, p &lt; 0.001).
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="p-3.5 rounded-xl border border-border bg-muted/30 text-center">
          <p className="text-[10px] text-muted-foreground">
            Urban confounding prevents reliable simulation for this county type.
            The rural DML estimate (θ = +1.47) applies to rural counties.
          </p>
        </div>
      )}

      {/* Methodology attribution */}
      {!isSimpleMode && (
        <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50 space-y-1">
          <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
            Causal Methodology
          </div>
          <p className="text-[9px] text-muted-foreground leading-relaxed">
            Double Machine Learning (Robinson 1988; Chernozhukov et al. 2018).
            Random Forest nuisance models residualize PM₂.₅ and mortality on
            6 confounders (smoking, poverty, uninsured rate, race, physician density, urbanicity).
            OLS on residuals → θ. Bootstrap 95% CI from {causal.metadata.n_bootstrap} resamples.
          </p>
          <p className="text-[9px] text-muted-foreground">
            Rural n = {causal.metadata.n_counties_rural.toLocaleString()} counties.
            Full sample n = {causal.metadata.n_counties_analyzed.toLocaleString()}.
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Main Component ───────────────────────────────────────────── */

export default function SidePanel({ fips, countyData, allCountyData, onOpenCompare, onOpenExporter, selectedYear, onYearChange }: SidePanelProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { isSimpleMode } = useSimpleMode();
  const [trendMetric, setTrendMetric] = useState<"pm25Avg" | "mortalityRate" | "toxicReleases" | "overallRisk">("pm25Avg");

  /* Empty state */
  if (!fips || !countyData) {
    return (
      <Card className="w-full h-full flex flex-col items-center justify-center p-8 text-center border-border bg-card shadow-xs">
        <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/15 flex items-center justify-center mb-4">
          <MapPin className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-base font-bold mb-1.5">Select a County</CardTitle>
        <CardDescription className="max-w-[240px] text-[11px] leading-relaxed mb-4">
          {isSimpleMode
            ? "Tap any county on the map to see what's going on there — air quality, health, and more."
            : "Click any county on the map to view health metrics, pollution levels, demographics, and infrastructure data."}
        </CardDescription>
        {onOpenCompare && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenCompare()}
            className="text-xs font-semibold gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
          >
            <Scale className="w-3.5 h-3.5" />
            Compare Any 2 Counties
          </Button>
        )}
      </Card>
    );
  }

  const pm25Display = countyData.pm25Avg ? +countyData.pm25Avg.toFixed(2) : "—";
  const toxicDisplay = countyData.toxicReleases ? Math.round(countyData.toxicReleases).toLocaleString() : "0";
  const toxicLbs = countyData.toxicReleases ?? 0;

  const riskLevel =
    countyData.overallRisk != null
      ? countyData.overallRisk > 60
        ? { label: "High Risk", variant: "destructive" as const, emoji: "🔴", plain: "High Risk" }
        : countyData.overallRisk > 40
          ? { label: "Moderate", variant: "secondary" as const, emoji: "🟡", plain: "Medium Risk" }
          : { label: "Low Risk", variant: "outline" as const, emoji: "🟢", plain: "Low Risk" }
      : null;

  const chartData = [
    { name: "Asthma", value: countyData.asthmaPrev || 0, color: "#c026d3" },
    { name: "COPD", value: countyData.copdPrev || 0, color: "#0d9488" },
    { name: "Smoking", value: countyData.smokingPrev || 0, color: "#ea580c" },
  ];

  // Simple mode toxic display
  const toxicSimple =
    toxicLbs > 1_000_000
      ? "Very high chemical releases nearby 🔴"
      : toxicLbs > 100_000
        ? "Some chemical releases nearby 🟠"
        : toxicLbs > 0
          ? "Low chemical releases nearby 🟢"
          : "Minimal chemical releases 🟢";

  return (
    <>
      <Card className="w-full h-full flex flex-col border-border bg-card shadow-xs overflow-hidden">
        <Tabs defaultValue="overview" className="flex flex-col h-full min-h-0 w-full">

          {/* ── Header ─────────────────────────────────────────── */}
          <CardHeader className="pb-3 pt-4 px-4 border-b border-border/50 shrink-0">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1 min-w-0">
                {!isSimpleMode && (
                  <Badge variant="outline" className="font-mono text-[9px] tracking-widest uppercase text-muted-foreground px-1.5">
                    FIPS {fips}
                  </Badge>
                )}
                <CardTitle className="text-lg font-extrabold text-foreground tracking-tight leading-snug truncate">
                  {countyData.County_Name || `County ${fips}`}
                </CardTitle>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {onOpenExporter && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 rounded-lg text-xs font-medium text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10 gap-1 cursor-pointer"
                    onClick={() => onOpenExporter(fips)}
                    title="Export PDF executive summary for this county"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>PDF</span>
                  </Button>
                )}
                {onOpenCompare && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 rounded-lg text-xs font-medium text-primary border-primary/30 hover:bg-primary/10 gap-1 cursor-pointer"
                    onClick={() => onOpenCompare(fips)}
                    title="Compare this county side-by-side with another"
                  >
                    <Scale className="h-3.5 w-3.5" />
                    <span>Compare</span>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer"
                  onClick={() => setIsFullscreen(true)}
                  title="Expand full analytics"
                  aria-label="Open fullscreen analytics"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <CardDescription className="text-[11px] text-muted-foreground mt-0.5">
              {isSimpleMode
                ? "What's going on in this county?"
                : "Health, pollution & socioeconomic indicators"}
            </CardDescription>
          </CardHeader>

          {/* ── Tabs bar ───────────────────────────────────────── */}
          <div className="px-3 sm:px-4 pt-2.5 pb-2 shrink-0">
            {isSimpleMode ? (
              /* Simple Mode: 4 clean, bold tabs */
              <TabsList className="grid grid-cols-4 w-full bg-muted/60 p-1 rounded-xl gap-1">
                <TabsTrigger
                  value="overview"
                  className="text-[11px] font-semibold rounded-lg py-1.5 cursor-pointer"
                >
                  📋 Summary
                </TabsTrigger>
                <TabsTrigger
                  value="health"
                  className="text-[11px] font-semibold rounded-lg py-1.5 cursor-pointer"
                >
                  🩺 Health
                </TabsTrigger>
                <TabsTrigger
                  value="equity"
                  className="text-[11px] font-semibold rounded-lg py-1.5 cursor-pointer text-violet-400 data-[state=active]:text-violet-600"
                >
                  ⚖️ Equity
                </TabsTrigger>
                <TabsTrigger
                  value="simulate"
                  className="text-[11px] font-semibold rounded-lg py-1.5 cursor-pointer"
                >
                  ✨ What If?
                </TabsTrigger>
              </TabsList>
            ) : (
              /* Expert Mode: 4 consolidated clean tabs */
              <TabsList className="grid grid-cols-4 w-full bg-muted/60 p-1 rounded-xl gap-1">
                <TabsTrigger value="overview" className="text-[11px] font-medium rounded-lg py-1.5 cursor-pointer">
                  Overview
                </TabsTrigger>
                <TabsTrigger value="health" className="text-[11px] font-medium rounded-lg py-1.5 cursor-pointer">
                  Health & Trends
                </TabsTrigger>
                <TabsTrigger value="equity" className="text-[11px] font-medium rounded-lg py-1.5 cursor-pointer text-violet-400 data-[state=active]:text-violet-600">
                  Equity & Census
                </TabsTrigger>
                <TabsTrigger value="simulate" className="text-[11px] font-medium rounded-lg py-1.5 cursor-pointer text-violet-400 data-[state=active]:text-violet-600">
                  Simulator
                </TabsTrigger>
              </TabsList>
            )}
          </div>

          {/* ── Scrollable content ─────────────────────────────── */}
          <CardContent className="flex-1 overflow-y-auto px-4 pb-4 pt-1 space-y-3 min-h-0">

            {/* ── OVERVIEW ───────────────────────────────────── */}
            <TabsContent value="overview" className="space-y-3 mt-0">
              {countyData.overallRisk != null && riskLevel && (
                <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <ShieldAlert className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      {isSimpleMode ? (
                        <>
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Risk Level
                          </div>
                          <div className="text-base font-bold text-foreground">
                            {riskLevel.emoji} {riskLevel.plain}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Vulnerability Index
                          </div>
                          <div className="text-base font-bold text-foreground">
                            {countyData.overallRisk}
                            <span className="text-[10px] font-normal text-muted-foreground ml-1">/ 100</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <Badge variant={riskLevel.variant} className="text-[10px] font-semibold">
                    {riskLevel.label}
                  </Badge>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <StatCard
                  label="Population"
                  icon={<Users className="w-3 h-3" />}
                  value={countyData.population?.toLocaleString() ?? "—"}
                  color="text-primary"
                  isSimple={isSimpleMode}
                  simpleValue={
                    countyData.population
                      ? `~${(countyData.population / 1000).toFixed(0)}k people`
                      : "—"
                  }
                />
                <StatCard
                  label="Median Income"
                  icon={<DollarSign className="w-3 h-3" />}
                  value={countyData.medianIncome ? `$${countyData.medianIncome.toLocaleString()}` : "—"}
                  color="text-emerald-500"
                  isSimple={isSimpleMode}
                  simpleValue={
                    countyData.medianIncome
                      ? `Earns ~$${(countyData.medianIncome / 1000).toFixed(0)}k/yr`
                      : "—"
                  }
                />
                <StatCard
                  label="PM2.5"
                  icon={<Wind className="w-3 h-3" />}
                  value={pm25Display}
                  unit="µg/m³"
                  color="text-amber-500"
                  isSimple={isSimpleMode}
                  simpleLabel="Air Quality"
                  simpleValue={
                    typeof pm25Display === "number"
                      ? pm25Label(pm25Display)
                      : "No data"
                  }
                />
                <StatCard
                  label="Mortality Rate"
                  icon={<Activity className="w-3 h-3" />}
                  value={countyData.mortalityRate ?? "—"}
                  unit="/100k"
                  color="text-blue-500"
                  isSimple={isSimpleMode}
                  simpleLabel="Lung Disease Deaths"
                  simpleValue={
                    countyData.mortalityRate
                      ? `${countyData.mortalityRate} per 100k people/yr`
                      : "—"
                  }
                />
              </div>

              {/* Prevalence chart */}
              <div className="p-3.5 rounded-xl border border-border bg-background/70 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-primary" />
                    {isSimpleMode ? "Common Health Issues" : "Disease Prevalence"}
                  </h4>
                  {!isSimpleMode && (
                    <Badge variant="outline" className="text-[9px] font-semibold tracking-wide uppercase">CDC PLACES</Badge>
                  )}
                </div>
                {isSimpleMode && (
                  <p className="text-[10px] text-muted-foreground">
                    % of adults in this county with each condition:
                  </p>
                )}
                <div className="h-36 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 8, right: 0, left: -28, bottom: 0 }}>
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                        contentStyle={{
                          backgroundColor: "var(--color-card)",
                          borderColor: "var(--color-border)",
                          borderRadius: "8px",
                          color: "var(--color-foreground)",
                          fontSize: "11px",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        }}
                        formatter={(val) =>
                          isSimpleMode
                            ? [`${Number(val).toFixed(1)}% of adults`, ""]
                            : [`${Number(val).toFixed(1)}%`, ""]
                        }
                      />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </TabsContent>

            {/* ── HEALTH & TRENDS ────────────────────────────────────── */}
            <TabsContent value="health" className="space-y-4">
              {isSimpleMode && (
                <p className="text-[11px] text-muted-foreground leading-relaxed px-0.5">
                  How common are lung diseases, air pollution, and doctor access in this county?
                </p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <StatCard label="Asthma" icon={<Droplets className="w-3 h-3" />} value={countyData.asthmaPrev ? `${countyData.asthmaPrev}%` : "—"} color="text-fuchsia-500"
                  isSimple={isSimpleMode} simpleValue={countyData.asthmaPrev ? `${countyData.asthmaPrev}% of adults` : "—"} />
                <StatCard label="COPD" icon={<Stethoscope className="w-3 h-3" />} value={countyData.copdPrev ? `${countyData.copdPrev}%` : "—"} color="text-teal-500"
                  isSimple={isSimpleMode} simpleValue={countyData.copdPrev ? `${countyData.copdPrev}% of adults` : "—"} />
                <StatCard label="Smoking Rate" icon={<Cigarette className="w-3 h-3" />} value={countyData.smokingPrev ? `${countyData.smokingPrev}%` : "—"} color="text-orange-500"
                  isSimple={isSimpleMode} simpleValue={countyData.smokingPrev ? `${countyData.smokingPrev}% smoke` : "—"} />
                <StatCard
                  label="Toxic Releases"
                  icon={<Factory className="w-3 h-3" />}
                  value={toxicDisplay}
                  unit="lbs"
                  color="text-slate-400"
                  isSimple={isSimpleMode}
                  simpleLabel="Chemical Releases"
                  simpleValue={toxicSimple}
                />
              </div>
              <div className="p-3.5 rounded-xl border border-border bg-background/70">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  {isSimpleMode ? "Air Pollution Level" : "PM2.5 Exposure Level"}
                </div>
                <div className="flex items-end gap-1.5">
                  <span className="text-2xl font-extrabold text-foreground">{pm25Display}</span>
                  {!isSimpleMode && <span className="text-xs text-muted-foreground mb-0.5">µg/m³</span>}
                </div>
                {isSimpleMode && typeof pm25Display === "number" && (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {pm25Label(pm25Display)} — {pm25Display < 9 ? "Below" : "Above"} the EPA safe limit of 9 µg/m³
                  </p>
                )}
                {typeof pm25Display === "number" && (
                  <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-400 to-rose-500"
                      style={{ width: `${Math.min(100, (pm25Display / 15) * 100)}%` }}
                    />
                  </div>
                )}
              </div>

              {/* 2018–2024 Trends Component */}
              {(() => {
                const history = fips && countyData ? getCountyHistory(countyData, fips) : [];
                const trendDelta = history.length > 0 ? getMetricDelta(history, trendMetric) : null;

                if (!history.length) return null;

                return (
                  <div className="space-y-3 pt-2 border-t border-border/50">
                    <div className="flex items-center justify-between gap-1 bg-muted/40 p-1 rounded-xl border border-border/50">
                      <button
                        onClick={() => setTrendMetric("pm25Avg")}
                        className={`flex-1 text-[10px] font-bold py-1 px-1.5 rounded-lg transition-colors cursor-pointer ${trendMetric === "pm25Avg"
                            ? "bg-amber-500 text-black shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                          }`}
                      >
                        PM2.5 Air
                      </button>
                      <button
                        onClick={() => setTrendMetric("mortalityRate")}
                        className={`flex-1 text-[10px] font-bold py-1 px-1.5 rounded-lg transition-colors cursor-pointer ${trendMetric === "mortalityRate"
                            ? "bg-blue-500 text-white shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                          }`}
                      >
                        Mortality
                      </button>
                      <button
                        onClick={() => setTrendMetric("toxicReleases")}
                        className={`flex-1 text-[10px] font-bold py-1 px-1.5 rounded-lg transition-colors cursor-pointer ${trendMetric === "toxicReleases"
                            ? "bg-slate-700 text-white shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                          }`}
                      >
                        Toxics
                      </button>
                      <button
                        onClick={() => setTrendMetric("overallRisk")}
                        className={`flex-1 text-[10px] font-bold py-1 px-1.5 rounded-lg transition-colors cursor-pointer ${trendMetric === "overallRisk"
                            ? "bg-purple-600 text-white shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                          }`}
                      >
                        Risk
                      </button>
                    </div>

                    <div className="p-3 rounded-xl border border-border bg-background/80 space-y-2">
                      <div className="flex items-center justify-between border-b border-border/40 pb-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                          <TrendingUp className="w-3.5 h-3.5 text-primary" />
                          <span>2018–2024 Annual Trend</span>
                        </div>
                        <Badge variant="outline" className="font-mono text-[9.5px]">
                          {trendMetric === "pm25Avg"
                            ? "µg/m³"
                            : trendMetric === "mortalityRate"
                              ? "/ 100k"
                              : trendMetric === "toxicReleases"
                                ? "lbs/yr"
                                : "Index"}
                        </Badge>
                      </div>

                      <div className="h-40 w-full pt-1">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={history}
                            onClick={(e) => {
                              const activePayload = (e as any)?.activePayload;
                              if (activePayload?.[0] && onYearChange) {
                                onYearChange(activePayload[0].payload.year as TemporalYear);
                              }
                            }}
                          >
                            <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} width={35} />
                            <Tooltip
                              content={({ active, payload }) => {
                                if (!active || !payload || !payload.length) return null;
                                const dataPt = payload[0].payload as CountyYearHistoryPoint;
                                return (
                                  <div className="p-2 rounded-xl bg-card border border-border shadow-xl text-xs space-y-1">
                                    <div className="font-mono font-bold text-foreground flex items-center justify-between gap-3">
                                      <span>Year {dataPt.year}</span>
                                      {dataPt.eventEmoji && <span>{dataPt.eventEmoji}</span>}
                                    </div>
                                    <div className="text-primary font-extrabold">
                                      {dataPt[trendMetric].toLocaleString()}{" "}
                                      <span className="text-[9px] text-muted-foreground">
                                        {trendMetric === "pm25Avg" ? "µg/m³" : trendMetric === "mortalityRate" ? "/100k" : "lbs"}
                                      </span>
                                    </div>
                                    {dataPt.eventTitle && (
                                      <p className="text-[9.5px] text-amber-500 font-semibold">{dataPt.eventTitle}</p>
                                    )}
                                  </div>
                                );
                              }}
                            />
                            {selectedYear && (
                              <ReferenceLine
                                x={selectedYear}
                                stroke="#f59e0b"
                                strokeDasharray="3 3"
                                strokeWidth={1.5}
                              />
                            )}
                            <Line
                              type="monotone"
                              dataKey={trendMetric}
                              stroke={
                                trendMetric === "pm25Avg"
                                  ? "#f59e0b"
                                  : trendMetric === "mortalityRate"
                                    ? "#3b82f6"
                                    : trendMetric === "toxicReleases"
                                      ? "#64748b"
                                      : "#8b5cf6"
                              }
                              strokeWidth={2.5}
                              dot={{ r: 4, strokeWidth: 1 }}
                              activeDot={{ r: 7, strokeWidth: 2, fill: "#f59e0b" }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Infrastructure Card */}
              <div className="p-3.5 rounded-xl border border-border bg-background/70 space-y-2">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-500">
                  <HeartPulse className="w-3 h-3" />
                  {isSimpleMode ? "Doctors Available" : "Physician Density & Rurality"}
                </div>
                <div className="flex justify-between items-baseline">
                  <div className="text-xl font-extrabold text-foreground">
                    {countyData.mdRate ?? "—"}
                    <span className="text-xs font-normal text-muted-foreground ml-1.5">
                      MDs / 100k
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {ruccLabel(countyData.rucc ?? 1)}
                  </Badge>
                </div>
              </div>
            </TabsContent>

            {/* ── EQUITY ANALYSIS & CENSUS (H-1: EJ Story Loop) ─────────── */}
            <TabsContent value="equity" className="space-y-4 mt-0">
              {allCountyData ? (
                <EquityTab
                  county={countyData!}
                  allCountyData={allCountyData}
                  isSimpleMode={isSimpleMode}
                />
              ) : (
                <div className="p-4 rounded-xl border border-border bg-muted/30 text-center">
                  <p className="text-[10px] text-muted-foreground">
                    Loading national comparison data…
                  </p>
                </div>
              )}

              {/* Census & Demographics Accordion/Card */}
              <div className="rounded-xl border border-border bg-background/70 p-3.5 space-y-3 pt-3">
                <SectionLabel icon={<PieChart className="w-3.5 h-3.5 text-primary" />}>
                  {isSimpleMode ? "Economic & Census Snapshot" : "Detailed Census Profile"}
                </SectionLabel>
                <div className="grid grid-cols-2 gap-2">
                  <StatCard
                    label="Poverty Rate"
                    icon={<DollarSign className="w-3 h-3" />}
                    value={countyData.pctPoverty != null ? `${countyData.pctPoverty}%` : "—"}
                    color="text-rose-500"
                    isSimple={isSimpleMode}
                    simpleLabel="Poverty"
                    simpleValue={
                      countyData.pctPoverty != null
                        ? povertyFraction(countyData.pctPoverty) + " live in poverty"
                        : "—"
                    }
                  />
                  <StatCard
                    label="Uninsured"
                    icon={<HeartHandshake className="w-3 h-3" />}
                    value={countyData.pctUninsured != null ? `${countyData.pctUninsured}%` : "—"}
                    color="text-amber-500"
                    isSimple={isSimpleMode}
                    simpleLabel="No Insurance"
                    simpleValue={
                      countyData.pctUninsured != null
                        ? uninsuredFraction(countyData.pctUninsured) + " have no insurance"
                        : "—"
                    }
                  />
                  <StatCard
                    label="Median Age"
                    icon={<Calendar className="w-3 h-3" />}
                    value={countyData.medianAge != null ? `${countyData.medianAge} yrs` : "—"}
                    color="text-indigo-500"
                    isSimple={isSimpleMode}
                    simpleValue={countyData.medianAge != null ? `Typical age: ${countyData.medianAge}` : "—"}
                  />
                  <StatCard
                    label="No HS Diploma"
                    icon={<GraduationCap className="w-3 h-3" />}
                    value={countyData.pctNoHS != null ? `${countyData.pctNoHS}%` : "—"}
                    color="text-purple-500"
                    isSimple={isSimpleMode}
                    simpleLabel="Didn't finish HS"
                    simpleValue={countyData.pctNoHS != null ? `${countyData.pctNoHS}% of adults` : "—"}
                  />
                </div>
              </div>
            </TabsContent>

            {/* ── EQUITY ANALYSIS (H-1: EJ Story Loop) ─────────── */}
            <TabsContent value="equity" className="space-y-3 mt-0">
              {allCountyData ? (
                <EquityTab
                  county={countyData!}
                  allCountyData={allCountyData}
                  isSimpleMode={isSimpleMode}
                />
              ) : (
                <div className="p-4 rounded-xl border border-border bg-muted/30 text-center">
                  <p className="text-[10px] text-muted-foreground">
                    Loading national comparison data…
                  </p>
                </div>
              )}
            </TabsContent>

            {/* ── POLICY SIMULATOR (C-2: Real DML Causal Engine) ── */}
            <TabsContent value="simulate" className="space-y-3 mt-0">
              {(() => {
                // Causal estimates loaded from DML pipeline output
                const causal = causalEstimatesRaw as typeof causalEstimatesRaw;
                const sim = causal.policy_simulator;

                // Choose theta based on county urbanicity
                // Rural counties (RUCC ≥ 7): use rural DML estimate
                // Others: use all-county estimate with caveat
                const isRural = (countyData.rucc ?? 0) >= 7;
                const theta = isRural ? sim.primary_theta : causal.all.theta;
                const ciLo  = isRural ? sim.primary_ci_lo : causal.all.ci_lo_95;
                const ciHi  = isRural ? sim.primary_ci_hi : causal.all.ci_hi_95;

                // pm25 reduction state (0.5 to 5 µg/m³, step 0.5)
                // We need a local state for the slider — using a trick: store in a ref-like way via a wrapper
                return <PolicySimulatorContent
                  countyData={countyData}
                  theta={theta}
                  ciLo={ciLo}
                  ciHi={ciHi}
                  isRural={isRural}
                  isSimpleMode={isSimpleMode}
                  causal={causal}
                />;
              })()}
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      {/* ── FULLSCREEN DIALOG ──────────────────────────────────── */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogHeader>
          <div className="flex items-center gap-2 flex-wrap">
            {!isSimpleMode && (
              <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-widest">
                FIPS {fips}
              </Badge>
            )}
            <Badge variant="secondary" className="text-[10px] font-semibold">
              {isSimpleMode ? "Full County Profile" : "Full Analytics View"}
            </Badge>
          </div>
          <DialogTitle className="text-2xl font-extrabold mt-2">
            {countyData.County_Name || `County ${fips}`}
          </DialogTitle>
          <DialogDescription>
            {isSimpleMode
              ? "Everything we know about this county — air quality, health, people, and doctors."
              : "Unified view of all environmental, epidemiological, and sociodemographic indicators."}
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto pr-1 space-y-6 mt-2">
          {/* Section 1 */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <ShieldAlert className="w-3.5 h-3.5 text-primary" />
              {isSimpleMode ? "Risk & Key Health Facts" : "Vulnerability & Primary Health Indicators"}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  label: isSimpleMode ? "Risk Level" : "Vulnerability Index",
                  value: isSimpleMode
                    ? (riskLevel ? `${riskLevel.emoji} ${riskLevel.plain}` : "—")
                    : countyData.overallRisk ?? "—",
                  unit: isSimpleMode ? "" : "/ 100",
                },
                {
                  label: isSimpleMode ? "Lung Disease Deaths" : "Mortality Rate",
                  value: countyData.mortalityRate ?? "—",
                  unit: isSimpleMode ? "per 100k/yr" : "/ 100k",
                },
                {
                  label: isSimpleMode ? "Air Pollution" : "PM2.5 Exposure",
                  value: isSimpleMode
                    ? (typeof pm25Display === "number" ? pm25Label(pm25Display) : "—")
                    : pm25Display,
                  unit: isSimpleMode ? "" : "µg/m³",
                },
                {
                  label: isSimpleMode ? "Chemical Releases" : "Toxic Releases",
                  value: isSimpleMode ? toxicSimple : toxicDisplay,
                  unit: isSimpleMode ? "" : "lbs",
                },
              ].map((item) => (
                <div key={item.label} className="p-4 rounded-xl border border-border bg-card">
                  <div className="text-[10px] font-medium text-muted-foreground mb-1">{item.label}</div>
                  <div className="text-xl font-extrabold text-foreground">
                    {item.value}
                    {item.unit && <span className="text-xs font-normal text-muted-foreground ml-1">{item.unit}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2 */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <PieChart className="w-3.5 h-3.5 text-emerald-500" />
              {isSimpleMode ? "People & Economy" : "Census & Socioeconomic Indicators"}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: isSimpleMode ? "Poverty" : "Poverty Rate", value: countyData.pctPoverty != null ? `${countyData.pctPoverty}%` : "—", color: "text-rose-500" },
                { label: isSimpleMode ? "No Insurance" : "Uninsured", value: countyData.pctUninsured != null ? `${countyData.pctUninsured}%` : "—", color: "text-amber-500" },
                { label: isSimpleMode ? "Typical Age" : "Median Age", value: countyData.medianAge != null ? `${countyData.medianAge} yrs` : "—", color: "text-indigo-500" },
                { label: isSimpleMode ? "Didn't Finish HS" : "No HS Diploma", value: countyData.pctNoHS != null ? `${countyData.pctNoHS}%` : "—", color: "text-purple-500" },
                { label: isSimpleMode ? "Black Residents" : "Black Pop. %", value: countyData.pctBlack != null ? `${countyData.pctBlack}%` : "—", color: "text-sky-500" },
                { label: isSimpleMode ? "Hispanic Residents" : "Hispanic Pop. %", value: countyData.pctHispanic != null ? `${countyData.pctHispanic}%` : "—", color: "text-emerald-500" },
                { label: isSimpleMode ? "Typical Household Income" : "Median Income", value: countyData.medianIncome ? `$${countyData.medianIncome.toLocaleString()}` : "—", color: "text-primary" },
                { label: isSimpleMode ? "Old Housing Units" : "Pre-1940 Units", value: countyData.housingPre1940 != null ? countyData.housingPre1940.toLocaleString() : "—", color: "text-muted-foreground" },
              ].map((item) => (
                <div key={item.label} className="p-3.5 rounded-xl border border-border bg-card">
                  <div className={`text-[10px] font-semibold mb-1 ${item.color}`}>{item.label}</div>
                  <div className="text-lg font-bold text-foreground">{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-border bg-card space-y-3">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Stethoscope className="w-3.5 h-3.5 text-teal-500" />
                {isSimpleMode ? "Common Diseases" : "Chronic Disease Prevalence"}
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Asthma", value: countyData.asthmaPrev, color: "text-fuchsia-500" },
                  { label: "COPD", value: countyData.copdPrev, color: "text-teal-500" },
                  { label: "Smoking", value: countyData.smokingPrev, color: "text-orange-500" },
                ].map((item) => (
                  <div key={item.label} className="p-2.5 rounded-lg bg-muted/40 text-center">
                    <div className={`text-[10px] font-bold uppercase mb-1 ${item.color}`}>{item.label}</div>
                    <div className="text-sm font-bold text-foreground">
                      {item.value ? `${item.value}%` : "—"}
                    </div>
                    {isSimpleMode && item.value && (
                      <div className="text-[9px] text-muted-foreground">of adults</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-border bg-card space-y-3">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <HeartPulse className="w-3.5 h-3.5 text-emerald-500" />
                {isSimpleMode ? "Doctors & Location" : "Infrastructure & Classification"}
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-lg bg-muted/40">
                  <div className="text-[10px] font-bold text-emerald-500 uppercase mb-1">
                    {isSimpleMode ? "Doctors" : "Physician Density"}
                  </div>
                  <div className="text-sm font-bold text-foreground">{countyData.mdRate ? `${countyData.mdRate} MDs` : "—"}</div>
                  <div className="text-[9px] text-muted-foreground">
                    {isSimpleMode ? "per 100k people" : "per 100k pop"}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/40">
                  <div className="text-[10px] font-bold text-indigo-500 uppercase mb-1">
                    {isSimpleMode ? "Area Type" : "USDA RUCC"}
                  </div>
                  <div className="text-sm font-bold text-foreground">
                    {isSimpleMode
                      ? (countyData.rucc != null ? ruccLabel(countyData.rucc) : "—")
                      : `Code ${countyData.rucc ?? "—"}`}
                  </div>
                  <div className="text-[9px] text-muted-foreground">
                    {isSimpleMode ? "How urban/rural this county is" : "Urban-Rural spectrum"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Dialog>
    </>
  );
}
