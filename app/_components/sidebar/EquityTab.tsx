"use client";

/**
 * EquityTab.tsx
 * -------------
 * H-1: Environmental Justice Story Loop
 *
 * Dedicated "Equity Analysis" panel that surfaces the environmental justice
 * story quantitatively for the selected county:
 *
 * 1. National percentile gauges for PM₂.₅, mortality, and income
 * 2. Environmental Justice (EJ) Index scorecard (EPA EJScreen methodology)
 * 3. EJ Hotspot flag with explicit threshold disclosure
 * 4. Social vulnerability breakdown (poverty, uninsured)
 * 5. Contextual citation (EPA EJScreen, FINDINGS.md Finding 5)
 */

import React, { useMemo } from "react";
import { Badge } from "@/app/_components/ui/badge";
import { CountyData, CountyDataMap } from "@/app/_lib/types";
import {
  computeEJAnalysis,
  pollutionPercentileColor,
  incomePercentileColor,
  percentileLabel,
  EJ_CATEGORY_COLORS,
  NATIONAL_THRESHOLDS,
} from "@/app/_lib/ej-utils";
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Info,
  Flame,
  TrendingDown,
  DollarSign,
  Wind,
  Activity,
} from "lucide-react";

interface EquityTabProps {
  county: CountyData;
  allCountyData: CountyDataMap;
  isSimpleMode: boolean;
}

/* ── Small gauge bar component ───────────────────────────────── */
function PercentileGauge({
  label,
  icon,
  value,      // the raw metric value
  percentile, // 0–100
  unit,
  colorClass,
  description,
  isSimple,
  simpleLabel,
}: {
  label: string;
  icon: React.ReactNode;
  value: number | null;
  percentile: number;
  unit: string;
  colorClass: string;
  description: string;
  isSimple?: boolean;
  simpleLabel?: string;
}) {
  const displayLabel = isSimple && simpleLabel ? simpleLabel : label;
  return (
    <div className="p-3 rounded-xl border border-border bg-background/70 space-y-2">
      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider ${colorClass}`}>
          {icon}
          {displayLabel}
        </div>
        <Badge
          variant="outline"
          className={`text-[10px] font-mono font-bold border-current ${colorClass}`}
        >
          {percentile}th pct.
        </Badge>
      </div>

      <div className="flex items-baseline gap-1">
        <span className={`text-xl font-extrabold ${colorClass}`}>
          {value != null ? (Number.isInteger(value) ? value.toLocaleString() : value.toFixed(2)) : "—"}
        </span>
        <span className="text-[10px] text-muted-foreground">{unit}</span>
      </div>

      {/* Percentile bar */}
      <div className="space-y-1">
        <div className="relative h-2.5 w-full bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${percentile}%`,
              background: percentile >= 75
                ? "linear-gradient(90deg, #f97316, #ef4444)"
                : percentile >= 50
                ? "linear-gradient(90deg, #f59e0b, #f97316)"
                : "linear-gradient(90deg, #10b981, #34d399)",
            }}
          />
          {/* 75th pct marker */}
          <div className="absolute top-0 bottom-0 w-px bg-border/80" style={{ left: "75%" }} />
          {/* 25th pct marker */}
          <div className="absolute top-0 bottom-0 w-px bg-border/50" style={{ left: "25%" }} />
        </div>
        <p className="text-[9.5px] text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

/* ── EJ Index donut-like score display ───────────────────────── */
function EJScorecard({
  ejIndex,
  pollutionBurden,
  vulnerabilityScore,
  isSimple,
}: {
  ejIndex: number;
  pollutionBurden: number;
  vulnerabilityScore: number;
  isSimple: boolean;
}) {
  const scoreColor =
    ejIndex >= 60
      ? "text-rose-500"
      : ejIndex >= 40
      ? "text-orange-500"
      : ejIndex >= 20
      ? "text-amber-500"
      : "text-emerald-500";

  const scoreLabel =
    ejIndex >= 60 ? "High Burden"
    : ejIndex >= 40 ? "Moderate Burden"
    : ejIndex >= 20 ? "Low-Moderate"
    : "Low Burden";

  return (
    <div className="p-3.5 rounded-xl border border-border bg-background/70 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ShieldAlert className="h-3.5 w-3.5 text-primary" />
          <span className="text-[11px] font-bold text-foreground uppercase tracking-wide">
            {isSimple ? "Environmental Justice Score" : "EJ Index (EPA EJScreen Model)"}
          </span>
        </div>
        <Badge
          variant="outline"
          className={`text-[9px] font-semibold border-current ${scoreColor}`}
        >
          {scoreLabel}
        </Badge>
      </div>

      {/* Score display */}
      <div className="flex items-center gap-4">
        {/* Circle-like score */}
        <div className="relative flex items-center justify-center h-16 w-16 shrink-0">
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="26" fill="none" stroke="currentColor" className="text-muted/60" strokeWidth="6" />
            <circle
              cx="32" cy="32" r="26"
              fill="none"
              stroke={ejIndex >= 60 ? "#ef4444" : ejIndex >= 40 ? "#f97316" : ejIndex >= 20 ? "#f59e0b" : "#10b981"}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${(ejIndex / 100) * 163.4} 163.4`}
              className="transition-all duration-700"
            />
          </svg>
          <span className={`text-base font-extrabold z-10 ${scoreColor}`}>{ejIndex}</span>
        </div>

        <div className="flex-1 space-y-2">
          {/* Pollution Burden sub-bar */}
          <div>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">
                {isSimple ? "Air & Chemical Burden" : "Pollution Burden"}
              </span>
              <span className="text-[9px] font-bold text-foreground">{pollutionBurden}/100</span>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-500 rounded-full transition-all duration-500"
                style={{ width: `${pollutionBurden}%` }}
              />
            </div>
          </div>
          {/* Vulnerability sub-bar */}
          <div>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">
                {isSimple ? "Social Vulnerability" : "Vulnerability Score"}
              </span>
              <span className="text-[9px] font-bold text-foreground">{vulnerabilityScore}/100</span>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-violet-500 rounded-full transition-all duration-500"
                style={{ width: `${vulnerabilityScore}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {!isSimple && (
        <p className="text-[9px] text-muted-foreground leading-relaxed border-t border-border/40 pt-2">
          EJ Index = Pollution Burden × Social Vulnerability ÷ 100.
          Modeled on <span className="font-semibold text-foreground">EPA EJScreen</span> methodology.
          Pollution Burden = PM₂.₅ percentile (65%) + Toxics percentile (35%).
          Vulnerability = Income deprivation (40%) + Poverty (30%) + Uninsured (30%).
        </p>
      )}
    </div>
  );
}

/* ── SVI Scorecard component ─────────────────────────────────── */
function SVIScorecard({
  svi,
  isSimple,
}: {
  svi: import("@/app/_lib/ej-utils").SVIAnalysis;
  isSimple: boolean;
}) {
  return (
    <div className="p-3.5 rounded-xl border border-violet-500/25 bg-violet-500/5 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-violet-400" />
          <span className="text-[11px] font-bold text-foreground uppercase tracking-wide">
            {isSimple ? "CDC Vulnerability Index (SVI)" : "CDC Social Vulnerability Index (SVI)"}
          </span>
        </div>
        <Badge variant="outline" className={`text-[9px] font-semibold border-current ${svi.categoryColor}`}>
          {svi.category} Vulnerability
        </Badge>
      </div>

      <div className="flex items-baseline justify-between">
        <div>
          <span className="text-2xl font-extrabold text-violet-400">{svi.sviScore.toFixed(3)}</span>
          <span className="text-[10px] text-muted-foreground ml-1.5 font-medium">
            ({svi.sviPercentile}th percentile nationally)
          </span>
        </div>
        <span className="text-[9.5px] font-mono text-muted-foreground">CDC ATSDR RPL_THEMES</span>
      </div>

      {/* SVI Theme Sub-bars */}
      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/40">
        <div>
          <div className="flex justify-between text-[9px] text-muted-foreground mb-0.5">
            <span>Socioeconomic</span>
            <span className="font-bold text-foreground">{svi.themes.socioeconomic}%</span>
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-violet-500 rounded-full" style={{ width: `${svi.themes.socioeconomic}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-[9px] text-muted-foreground mb-0.5">
            <span>Health & Mortality</span>
            <span className="font-bold text-foreground">{svi.themes.demographic}%</span>
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-rose-500 rounded-full" style={{ width: `${svi.themes.demographic}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-[9px] text-muted-foreground mb-0.5">
            <span>Minority Share</span>
            <span className="font-bold text-foreground">{svi.themes.minority}%</span>
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${svi.themes.minority}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-[9px] text-muted-foreground mb-0.5">
            <span>Housing Age</span>
            <span className="font-bold text-foreground">{svi.themes.housing}%</span>
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-teal-500 rounded-full" style={{ width: `${svi.themes.housing}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── EJ Hotspot alert card ───────────────────────────────────── */
function EJHotspotCard({
  isHotspot,
  category,
  reasons,
  isSimple,
  countyName,
}: {
  isHotspot: boolean;
  category: "critical" | "high" | "moderate" | "low";
  reasons: string[];
  isSimple: boolean;
  countyName: string;
}) {
  const colors = EJ_CATEGORY_COLORS[category];

  if (category === "low" && !isHotspot) {
    return (
      <div className={`p-3 rounded-xl border ${colors.border} ${colors.bg} flex items-center gap-2.5`}>
        <CheckCircle2 className={`h-4 w-4 shrink-0 ${colors.text}`} />
        <div>
          <p className={`text-[11px] font-bold ${colors.text}`}>
            {isSimple ? "Low Environmental Burden" : "Not an EJ Hotspot"}
          </p>
          <p className="text-[9.5px] text-muted-foreground">
            {isSimple
              ? "This county does not simultaneously face high pollution, high mortality, and low income."
              : "Does not meet EPA EJScreen triple-burden threshold (PM₂.₅ ≥ 75th pct + mortality ≥ 75th pct + income ≤ 25th pct)."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-3.5 rounded-xl border ${colors.border} ${colors.bg} space-y-2`}>
      <div className="flex items-start gap-2">
        {category === "critical" ? (
          <Flame className={`h-4 w-4 shrink-0 mt-0.5 ${colors.text} animate-pulse`} />
        ) : (
          <AlertTriangle className={`h-4 w-4 shrink-0 mt-0.5 ${colors.text}`} />
        )}
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`text-[11px] font-extrabold ${colors.text}`}>
              {isHotspot
                ? (isSimple ? "⚠️ Environmental Justice Hotspot" : "⚠️ EJ Triple-Burden Hotspot")
                : (isSimple ? "Elevated Environmental Burden" : `Partial EJ Burden — ${category.charAt(0).toUpperCase() + category.slice(1)} Risk`)}
            </p>
            {isHotspot && (
              <span className={`text-[9px] font-bold text-white px-1.5 py-0.5 rounded-full ${colors.badge}`}>
                {isSimple ? "ALL 3 BURDENS" : "TRIPLE-BURDEN"}
              </span>
            )}
          </div>
          {isHotspot && !isSimple && (
            <p className="text-[9.5px] text-muted-foreground">
              {countyName} is one of ~74 U.S. counties meeting the environmental injustice triple threshold.
              These counties average <strong className="text-foreground">59% higher</strong> respiratory mortality than the national average.
            </p>
          )}
          {isHotspot && isSimple && (
            <p className="text-[9.5px] text-muted-foreground">
              This county has dirty air, high death rates, AND low income — all at the same time.
              Only ~74 of 3,142 U.S. counties face all three at once.
            </p>
          )}
        </div>
      </div>

      {reasons.length > 0 && (
        <ul className="space-y-1 pl-1">
          {reasons.map((r, i) => (
            <li key={i} className={`flex items-center gap-1.5 text-[9.5px] font-medium ${colors.text}`}>
              <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${colors.badge}`} />
              {r}
            </li>
          ))}
        </ul>
      )}

      {!isSimple && (
        <p className="text-[9px] text-muted-foreground border-t border-current/20 pt-1.5">
          Threshold: PM₂.₅ ≥ {NATIONAL_THRESHOLDS.pm25.q75} µg/m³ (75th pct) ·
          Mortality ≥ {NATIONAL_THRESHOLDS.mortality.q75} per 100k (75th pct) ·
          Income ≤ ${NATIONAL_THRESHOLDS.income.q25.toLocaleString()} (25th pct)
        </p>
      )}
    </div>
  );
}

/* ── Main EquityTab component ────────────────────────────────── */
export default function EquityTab({ county, allCountyData, isSimpleMode }: EquityTabProps) {
  const analysis = useMemo(
    () => computeEJAnalysis(county, allCountyData),
    [county, allCountyData]
  );
  const { percentiles, ejIndex: ej } = analysis;

  const countyName = county.County_Name ?? "This county";

  return (
    <div className="space-y-3">
      {/* Intro header */}
      <div className="p-3 rounded-xl border border-violet-500/20 bg-violet-500/5">
        <div className="flex items-center gap-1.5 mb-1">
          <ShieldAlert className="h-3.5 w-3.5 text-violet-500" />
          <span className="text-[11px] font-bold text-foreground uppercase tracking-wide">
            {isSimpleMode ? "Is This County Being Left Behind?" : "Environmental Justice Analysis"}
          </span>
        </div>
        <p className="text-[9.5px] text-muted-foreground leading-relaxed">
          {isSimpleMode
            ? "Environmental injustice happens when communities with less money face the worst pollution AND the worst health outcomes. Here's where this county stands nationally."
            : "Quantifies simultaneous exposure to pollution burden and social vulnerability for this county relative to all 3,142 U.S. counties. Methodology: EPA EJScreen · FINDINGS.md Finding 5."}
        </p>
      </div>

      {/* EJ Hotspot classification */}
      <EJHotspotCard
        isHotspot={ej.isHotspot}
        category={ej.hotspotCategory}
        reasons={ej.hotspotReason}
        isSimple={isSimpleMode}
        countyName={countyName}
      />

      {/* EJ Index Scorecard */}
      <EJScorecard
        ejIndex={ej.ejIndex}
        pollutionBurden={ej.pollutionBurden}
        vulnerabilityScore={ej.vulnerabilityScore}
        isSimple={isSimpleMode}
      />

      {/* CDC Social Vulnerability Index (SVI) Scorecard */}
      <SVIScorecard svi={percentiles.svi} isSimple={isSimpleMode} />

      {/* National Percentile Gauges */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-0.5">
          <TrendingDown className="h-3 w-3" />
          {isSimpleMode ? "How This County Ranks Nationally" : "National Percentile Rankings"}
        </div>

        <PercentileGauge
          label="PM₂.₅ Pollution"
          icon={<Wind className="w-3 h-3" />}
          value={county.pm25Avg ?? null}
          percentile={percentiles.pm25}
          unit="µg/m³"
          colorClass={pollutionPercentileColor(percentiles.pm25)}
          description={percentileLabel(percentiles.pm25, "polluted") + " · Bars: 25th & 75th pct markers"}
          isSimple={isSimpleMode}
          simpleLabel="Air Pollution Rank"
        />

        <PercentileGauge
          label="Respiratory Mortality"
          icon={<Activity className="w-3 h-3" />}
          value={county.mortalityRate ?? null}
          percentile={percentiles.mortality}
          unit="per 100k"
          colorClass={pollutionPercentileColor(percentiles.mortality)}
          description={percentileLabel(percentiles.mortality, "deadly") + " · Higher = more respiratory deaths"}
          isSimple={isSimpleMode}
          simpleLabel="Death Rate Rank"
        />

        <PercentileGauge
          label="Median Household Income"
          icon={<DollarSign className="w-3 h-3" />}
          value={county.medianIncome ?? null}
          percentile={percentiles.income}
          unit="USD"
          colorClass={incomePercentileColor(percentiles.income)}
          description={percentileLabel(percentiles.income, "affluent") + " · Lower = more economically vulnerable"}
          isSimple={isSimpleMode}
          simpleLabel="Income Rank"
        />
      </div>

      {/* Context note */}
      {!isSimpleMode && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/40 border border-border/50">
          <Info className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-[9px] text-muted-foreground leading-relaxed">
            Percentiles are computed across all {Object.keys(allCountyData).length.toLocaleString()} counties with available data.
            EJ Hotspot threshold: simultaneously in top 25% for PM₂.₅ pollution AND respiratory mortality, and bottom 25% for income.
            74 U.S. counties meet this definition, averaging 59% higher respiratory death rates than the national median.
            Source: US-SEER FINDINGS.md Finding 5 · EPA EJScreen framework.
          </p>
        </div>
      )}
    </div>
  );
}
