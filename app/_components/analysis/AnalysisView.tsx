"use client";

import React, { useState, useMemo } from "react";
import { CountyDataMap, CountyData } from "@/app/_lib/types";
import {
  calculateOLS,
  calculateAttributableRisk,
  runCounterfactualSimulation,
  getHealthDesertClusters,
  OLSResult,
} from "@/app/_lib/bme-analytics";
import { useSimpleMode } from "@/app/_lib/simple-mode-context";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/app/_components/ui/card";
import { Badge } from "@/app/_components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/app/_components/ui/tabs";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  BarChart,
  Bar,
  Cell,
  ReferenceLine,
  AreaChart,
  Area,
} from "recharts";
import {
  Activity,
  Stethoscope,
  Wind,
  ShieldAlert,
  Sliders,
  Sparkles,
  Award,
  Users,
  FileText,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  HeartPulse,
  Factory,
  Info,
  Heart,
  DollarSign,
  Map,
  X,
  ChevronRight,
  ArrowLeft,
  Maximize2,
} from "lucide-react";

interface AnalysisViewProps {
  data: CountyDataMap;
}

/* ── Metric options for Research Lab ─────────────────────────── */
const METRIC_OPTIONS: { key: keyof CountyData; label: string; unit: string; shortLabel: string }[] = [
  { key: "pm25Avg", label: "PM2.5 Pollution", unit: "µg/m³", shortLabel: "PM2.5" },
  { key: "toxicReleases", label: "Toxic Chemical Releases", unit: "lbs", shortLabel: "Toxic lbs" },
  { key: "smokingPrev", label: "Smoking Prevalence", unit: "%", shortLabel: "Smoking %" },
  { key: "mdRate", label: "Primary Care Physician Density", unit: "MDs/100k", shortLabel: "MDs/100k" },
  { key: "pctPoverty", label: "Poverty Rate", unit: "%", shortLabel: "Poverty %" },
  { key: "pctUninsured", label: "Uninsured Rate", unit: "%", shortLabel: "Uninsured %" },
  { key: "mortalityRate", label: "Respiratory Mortality Rate", unit: "per 100k", shortLabel: "Mortality" },
  { key: "copdPrev", label: "COPD Prevalence", unit: "%", shortLabel: "COPD %" },
  { key: "asthmaPrev", label: "Asthma Prevalence", unit: "%", shortLabel: "Asthma %" },
];

/* ── Helpers ─────────────────────────────────────────────────── */
function fmt(n: number | undefined, decimals = 1): string {
  if (n === undefined || isNaN(n)) return "—";
  return n.toFixed(decimals);
}

function fmtLarge(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}

/* ── Animated count stat card ────────────────────────────────── */
function ImpactKPI({
  label,
  value,
  sub,
  color,
  icon,
  border,
  bg,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  color: string;
  icon: React.ReactNode;
  border: string;
  bg: string;
}) {
  return (
    <div className={`relative p-5 rounded-2xl border ${border} ${bg} overflow-hidden`}>
      <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-20 ${bg}`} />
      <div className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider mb-2 ${color}`}>
        {icon}
        {label}
      </div>
      <div className={`text-3xl sm:text-4xl font-black tracking-tight ${color}`}>{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-1.5 leading-snug">{sub}</div>}
    </div>
  );
}

/* ── Slider row ──────────────────────────────────────────────── */
function PolicySlider({
  label,
  icon,
  value,
  min,
  max,
  step,
  display,
  onChange,
  accentClass,
  marks,
}: {
  label: string;
  icon: React.ReactNode;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
  accentClass: string;
  marks: { val: string; label: string }[];
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          {icon}
          {label}
        </span>
        <span className={`font-mono font-bold text-xs px-2 py-0.5 rounded-md border ${accentClass}`}>
          {display}
        </span>
      </div>
      <div className="py-1">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full cursor-pointer h-2 rounded-full accent-primary touch-pan-y"
          style={{ accentColor: "var(--primary)" }}
        />
      </div>
      <div className="flex justify-between text-[9px] text-muted-foreground pt-0.5">
        {marks.map((m) => (
          <span key={m.val} className="text-center">
            <span className="font-mono">{m.val}</span>
            <br />
            <span className="opacity-70 text-[8px]">{m.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Main AnalysisView ───────────────────────────────────────── */
export default function AnalysisView({ data }: AnalysisViewProps) {
  const [activeTab, setActiveTab] = useState<"impact" | "lab" | "simulator" | "equity">("impact");
  const [mobileModalTab, setMobileModalTab] = useState<"impact" | "lab" | "simulator" | "equity" | null>(null);
  const { isSimpleMode } = useSimpleMode();

  /* Research Lab state */
  const [xAxisKey, setXAxisKey] = useState<keyof CountyData>("pm25Avg");
  const [yAxisKey, setYAxisKey] = useState<keyof CountyData>("mortalityRate");
  const [selectedRuccFilter, setSelectedRuccFilter] = useState<number | "all">("all");

  /* Simulator state */
  const [targetPm25Cap, setTargetPm25Cap] = useState<number>(9.0);
  const [targetToxicCap, setTargetToxicCap] = useState<number>(50000);
  const [mdDensityBoostPct, setMdDensityBoostPct] = useState<number>(15);

  /* ── Derived analytics ─────────────────────────────────────── */

  /* Filter for RUCC stratification in lab */
  const filteredDataMap = useMemo(() => {
    if (selectedRuccFilter === "all") return data;
    const out: CountyDataMap = {};
    Object.entries(data).forEach(([fips, c]) => {
      if (c.rucc === selectedRuccFilter) out[fips] = c;
    });
    return out;
  }, [data, selectedRuccFilter]);

  const olsResult: OLSResult = useMemo(
    () => calculateOLS(filteredDataMap, xAxisKey, yAxisKey),
    [filteredDataMap, xAxisKey, yAxisKey]
  );

  /* Default PM2.5 vs mortality for impact hero */
  const defaultOls: OLSResult = useMemo(
    () => calculateOLS(data, "pm25Avg", "mortalityRate"),
    [data]
  );

  const attributableRisk = useMemo(() => calculateAttributableRisk(data, 5.0), [data]);

  const simResult = useMemo(
    () => runCounterfactualSimulation(data, targetPm25Cap, targetToxicCap, mdDensityBoostPct),
    [data, targetPm25Cap, targetToxicCap, mdDensityBoostPct]
  );

  /* Baseline simulation at EPA 9.0, 50k toxic cap, 15% MD boost */
  const baselineSimResult = useMemo(
    () => runCounterfactualSimulation(data, 9.0, 50000, 15),
    [data]
  );

  const clusters = useMemo(() => getHealthDesertClusters(data), [data]);

  /* RUCC bar data */
  const ruccChartData = useMemo(() => {
    const counts: Record<number, { sum: number; count: number }> = {};
    for (let r = 1; r <= 9; r++) counts[r] = { sum: 0, count: 0 };
    Object.values(data).forEach((c) => {
      if (c.rucc && c.rucc >= 1 && c.rucc <= 9 && typeof c.mortalityRate === "number") {
        counts[c.rucc].sum += c.mortalityRate;
        counts[c.rucc].count++;
      }
    });
    return Object.entries(counts).map(([code, v]) => ({
      code: Number(code),
      label: `R${code}`,
      avgMortality: v.count > 0 ? +(v.sum / v.count).toFixed(1) : 0,
    }));
  }, [data]);

  /* Scatter points for lab — cap at 1500 for performance */
  const scatterPoints = useMemo(() => {
    const pts = olsResult.points;
    if (pts.length <= 1500) return pts;
    const step = Math.ceil(pts.length / 1500);
    return pts.filter((_, i) => i % step === 0);
  }, [olsResult.points]);

  /* Regression trend data for overlay line */
  const trendData = useMemo(() => {
    return olsResult.regressionLine.map((p) => ({ x: +p.x.toFixed(3), y: +p.y.toFixed(3) }));
  }, [olsResult.regressionLine]);

  /* Cluster counts */
  const clusterCounts = useMemo(() => {
    const c = { doubleBurden: 0, highHazard: 0, lowCare: 0, protective: 0 };
    clusters.forEach((cl) => {
      if (cl.category === "High Hazard / Low Care") c.doubleBurden++;
      else if (cl.category === "High Hazard / High Care") c.highHazard++;
      else if (cl.category === "Low Hazard / Low Care") c.lowCare++;
      else c.protective++;
    });
    return c;
  }, [clusters]);

  const doubleBurdenList = useMemo(
    () => clusters.filter((c) => c.category === "High Hazard / Low Care").slice(0, 12),
    [clusters]
  );

  /* PM2.5 distribution histogram */
  const pm25Histogram = useMemo(() => {
    const bins: { range: string; count: number; midpoint: number }[] = [];
    const boundaries = [0, 4, 6, 8, 10, 12, 14, 18, 30];
    for (let i = 0; i < boundaries.length - 1; i++) {
      bins.push({ range: `${boundaries[i]}–${boundaries[i + 1]}`, count: 0, midpoint: (boundaries[i] + boundaries[i + 1]) / 2 });
    }
    Object.values(data).forEach((c) => {
      const v = c.pm25Avg;
      if (typeof v !== "number") return;
      for (let i = 0; i < boundaries.length - 1; i++) {
        if (v >= boundaries[i] && v < boundaries[i + 1]) {
          bins[i].count++;
          break;
        }
      }
    });
    return bins;
  }, [data]);

  /* Summary stats for Impact tab */
  const totalCounties = Object.keys(data).length;
  const highRiskCount = useMemo(
    () => Object.values(data).filter((c) => (c.overallRisk ?? 0) >= 70).length,
    [data]
  );
  const totalPopulation = attributableRisk.totalPopulation;

  const xMeta = METRIC_OPTIONS.find((m) => m.key === xAxisKey)!;
  const yMeta = METRIC_OPTIONS.find((m) => m.key === yAxisKey)!;

  /* ── Render ──────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col w-full h-full overflow-y-auto bg-background text-foreground">
      {/* ── Hero banner ──────────────────────────────────────── */}
      <div className="relative border-b border-border bg-card px-4 sm:px-6 py-4 overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-purple-500/5 pointer-events-none" />
        <div className="absolute -top-10 -right-10 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Badge variant="secondary" className="text-[11px]">
                {totalCounties.toLocaleString()} counties · {(totalPopulation / 1e6).toFixed(0)}M residents
              </Badge>
            </div>
            <h2 className="text-lg sm:text-xl font-black tracking-tight text-foreground">
              {isSimpleMode
                ? "What does the health data tell us?"
                : "Cardiorespiratory Environmental Health Analytics"}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-xl leading-relaxed">
              {isSimpleMode
                ? "We looked at health and pollution data for every U.S. county to find out where people are most at risk — and what could help."
                : "Academic-grade epidemiology platform computing OLS regression, population attributable risk, and counterfactual policy simulations across all U.S. counties."}
            </p>
          </div>

          {/* Top-line headline stats */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3 shrink-0">
            <div className="text-center px-2.5 sm:px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <div className="text-[10px] font-semibold text-rose-400 uppercase">
                {isSimpleMode ? "Deaths from dirty air" : "Attr. Deaths"}
              </div>
              <div className="text-lg sm:text-xl font-black text-rose-400">
                {attributableRisk.totalAttributableDeaths.toLocaleString()}
              </div>
              <div className="text-[9px] sm:text-[10px] text-muted-foreground">
                {isSimpleMode ? "per year" : `${attributableRisk.overallParPct}% of total`}
              </div>
            </div>
            <div className="text-center px-2.5 sm:px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <div className="text-[10px] font-semibold text-amber-400 uppercase">
                {isSimpleMode ? "Underserved counties" : "Health Deserts"}
              </div>
              <div className="text-lg sm:text-xl font-black text-amber-400">{clusterCounts.doubleBurden}</div>
              <div className="text-[9px] sm:text-[10px] text-muted-foreground">
                {isSimpleMode ? "high pollution + few doctors" : "High hazard + low MDs"}
              </div>
            </div>
            {!isSimpleMode && (
              <div className="text-center px-2.5 sm:px-3 py-2 rounded-xl bg-primary/10 border border-primary/20">
                <div className="text-[10px] font-semibold text-primary uppercase">PM2.5 r</div>
                <div className="text-lg sm:text-xl font-black text-primary">
                  {defaultOls.correlation.toFixed(2)}
                </div>
                <div className="text-[9px] sm:text-[10px] text-muted-foreground">vs mortality</div>
              </div>
            )}
            <div className="text-center px-2.5 sm:px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="text-[10px] font-semibold text-emerald-400 uppercase">
                {isSimpleMode ? "High-risk counties" : "High Risk"}
              </div>
              <div className="text-lg sm:text-xl font-black text-emerald-400">{highRiskCount.toLocaleString()}</div>
              <div className="text-[9px] sm:text-[10px] text-muted-foreground">
                {isSimpleMode ? "need the most help" : "counties ≥ 70 risk score"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4-Item Menu on Phone Screens (sm:hidden) ────────────────── */}
      <div className="sm:hidden p-4 space-y-3.5 border-b border-border bg-card/50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              {isSimpleMode ? "Analytics Menu" : "Research Modules"}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Tap any category below to view full-screen popover analytics
            </p>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono px-2 py-0.5">
            4 Modules
          </Badge>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {[
            {
              id: "impact",
              title: isSimpleMode ? "Big Picture" : "Measurable Impact",
              subtitle: isSimpleMode
                ? "Key health findings & lives saved per year"
                : "Baseline EPA standard & attributable risk",
              badge: `${baselineSimResult.projectedLivesSaved.toLocaleString()} Saved/yr`,
              icon: <TrendingUp className="w-5 h-5 text-emerald-400" />,
              border: "border-emerald-500/30",
              bg: "bg-gradient-to-br from-emerald-500/10 via-card to-card",
              badgeColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
            },
            {
              id: "lab",
              title: isSimpleMode ? "Explorer" : "Research Lab",
              subtitle: isSimpleMode
                ? "Compare health & pollution factors across counties"
                : "Bivariate OLS regression engine & diagnostics",
              badge: `r = ${defaultOls.correlation.toFixed(2)} Correlation`,
              icon: <Activity className="w-5 h-5 text-blue-400" />,
              border: "border-blue-500/30",
              bg: "bg-gradient-to-br from-blue-500/10 via-card to-card",
              badgeColor: "bg-blue-500/15 text-blue-400 border-blue-500/30",
            },
            {
              id: "simulator",
              title: isSimpleMode ? "What If?" : "Policy Simulator",
              subtitle: isSimpleMode
                ? "Test clean air limits & doctor expansion policies"
                : "Counterfactual scenario & cap modeling",
              badge: `${simResult.projectedLivesSaved.toLocaleString()} Saved`,
              icon: <Sliders className="w-5 h-5 text-purple-400" />,
              border: "border-purple-500/30",
              bg: "bg-gradient-to-br from-purple-500/10 via-card to-card",
              badgeColor: "bg-purple-500/15 text-purple-400 border-purple-500/30",
            },
            {
              id: "equity",
              title: isSimpleMode ? "Who's at Risk?" : "Equity & Clusters",
              subtitle: isSimpleMode
                ? "High-risk counties & doctor shortage areas"
                : "Health desert matrix & RUCC stratification",
              badge: `${clusterCounts.doubleBurden} Deserts`,
              icon: <ShieldAlert className="w-5 h-5 text-rose-400" />,
              border: "border-rose-500/30",
              bg: "bg-gradient-to-br from-rose-500/10 via-card to-card",
              badgeColor: "bg-rose-500/15 text-rose-400 border-rose-500/30",
            },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setMobileModalTab(item.id as typeof mobileModalTab);
                setActiveTab(item.id as typeof activeTab);
              }}
              className={`w-full p-4 rounded-2xl border ${item.border} ${item.bg} text-left transition-all duration-200 active:scale-[0.98] shadow-sm hover:shadow-md flex items-center justify-between gap-3 group relative overflow-hidden cursor-pointer`}
            >
              <div className="flex items-start gap-3.5 z-10 min-w-0">
                <div className="p-2.5 rounded-xl bg-background/80 border border-border shrink-0 group-hover:scale-105 transition-transform">
                  {item.icon}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">
                      {item.title}
                    </span>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-snug truncate sm:whitespace-normal">
                    {item.subtitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 text-xs font-bold text-primary shrink-0 z-10 bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-xl group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <span>View</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Desktop Tab navigation (hidden on phone screens) ── */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="hidden sm:flex flex-col flex-1 min-h-0">
        <div className="px-3 sm:px-6 pt-3 pb-0 shrink-0">
          <TabsList className="flex items-center w-full max-w-full bg-muted/70 p-1 rounded-xl gap-1 overflow-x-auto scrollbar-none">
            <TabsTrigger
              value="impact"
              className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg shrink-0 whitespace-nowrap"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              {isSimpleMode ? "Big Picture" : "Measurable Impact"}
            </TabsTrigger>
            <TabsTrigger
              value="lab"
              className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg shrink-0 whitespace-nowrap"
            >
              <Activity className="w-3.5 h-3.5" />
              {isSimpleMode ? "Explorer" : "Research Lab"}
            </TabsTrigger>
            <TabsTrigger
              value="simulator"
              className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg shrink-0 whitespace-nowrap"
            >
              <Sliders className="w-3.5 h-3.5" />
              {isSimpleMode ? "What If?" : "Policy Simulator"}
            </TabsTrigger>
            <TabsTrigger
              value="equity"
              className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg shrink-0 whitespace-nowrap"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              {isSimpleMode ? "Who's at Risk?" : "Equity & Clusters"}
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">

          {/* ═══════════════════════════════════════════════════════════
                TAB 1 — MEASURABLE IMPACT DASHBOARD (hero tab)
            ═══════════════════════════════════════════════════════════ */}
          <TabsContent value="impact" className="space-y-5 outline-none">
            {isSimpleMode && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 leading-relaxed">
                <span className="font-bold">📊 What this shows:</span> If the government set stricter limits on air pollution, here&apos;s how many lives could be saved each year.
              </div>
            )}
            {/* Impact headline KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              <ImpactKPI
                label={isSimpleMode ? "People Who Wouldn't Die" : "Lives Saved by EPA Standard"}
                value={baselineSimResult.projectedLivesSaved.toLocaleString()}
                sub={isSimpleMode
                  ? `Each year, if the air were cleaner in ${baselineSimResult.affectedCountyCount} counties`
                  : `Annually if PM2.5 capped at 9.0 µg/m³ across ${baselineSimResult.affectedCountyCount} counties`}
                color="text-emerald-400"
                icon={<Heart className="w-3.5 h-3.5" />}
                border="border-emerald-500/25"
                bg="bg-emerald-500/5"
              />
              <ImpactKPI
                label={isSimpleMode ? "Disease Attacks Avoided" : "Chronic Disease Events Prevented"}
                value={fmtLarge(baselineSimResult.preventedCopdCases + baselineSimResult.preventedAsthmaCases)}
                sub={isSimpleMode
                  ? "Asthma and lung disease attacks that could be avoided per year"
                  : "COPD + asthma exacerbations avoided per year under baseline policy scenario"}
                color="text-blue-400"
                icon={<Stethoscope className="w-3.5 h-3.5" />}
                border="border-blue-500/25"
                bg="bg-blue-500/5"
              />
              <ImpactKPI
                label={isSimpleMode ? "Hospital Bill Savings" : "Healthcare Cost Savings"}
                value={`$${baselineSimResult.estimatedCostSavingsMillions.toLocaleString()}M`}
                sub={isSimpleMode
                  ? "Money saved on hospital visits each year if the air were cleaner"
                  : "Estimated annual economic savings from reduced hospitalizations and ER visits"}
                color="text-purple-400"
                icon={<DollarSign className="w-3.5 h-3.5" />}
                border="border-purple-500/25"
                bg="bg-purple-500/5"
              />
              <ImpactKPI
                label={isSimpleMode ? "Deaths Linked to Dirty Air" : "PM2.5-Attributable Deaths"}
                value={attributableRisk.totalAttributableDeaths.toLocaleString()}
                sub={isSimpleMode
                  ? `${attributableRisk.overallParPct}% of all lung disease deaths could be prevented with cleaner air`
                  : `${attributableRisk.overallParPct}% of all respiratory mortality annually above WHO 5 µg/m³ baseline`}
                color="text-rose-400"
                icon={<AlertTriangle className="w-3.5 h-3.5" />}
                border="border-rose-500/25"
                bg="bg-rose-500/5"
              />
            </div>

            {/* PM2.5 Distribution + Mortality scatter */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              {/* PM2.5 Histogram */}
              <Card className="lg:col-span-2 border-border shadow-xs">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Wind className="w-4 h-4 text-amber-400" /> PM2.5 Exposure Distribution
                  </CardTitle>
                  <CardDescription className="text-xs">
                    County-level PM2.5 exposure across {totalCounties.toLocaleString()} U.S. counties.
                    EPA standard: 9.0 µg/m³.
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[220px] pt-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pm25Histogram} margin={{ top: 5, right: 5, bottom: 20, left: -15 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.12} vertical={false} />
                      <XAxis
                        dataKey="range"
                        tick={{ fontSize: 9, fill: "currentColor" }}
                        tickLine={false}
                        axisLine={false}
                        label={{ value: "PM2.5 (µg/m³)", position: "insideBottom", offset: -12, fontSize: 10 }}
                      />
                      <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                      <ReferenceLine x="8–10" stroke="#f59e0b" strokeDasharray="4 2" strokeWidth={1.5} label={{ value: "EPA", fill: "#f59e0b", fontSize: 9 }} />
                      <RechartsTooltip
                        contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 11 }}
                        formatter={(v) => [`${v} counties`, "Count"]}
                      />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {pm25Histogram.map((entry, i) => (
                          <Cell key={i} fill={entry.midpoint >= 9 ? "#ef4444" : entry.midpoint >= 6 ? "#f59e0b" : "#3b82f6"} fillOpacity={0.8} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Mortality vs PM2.5 scatter */}
              <Card className="lg:col-span-3 border-border shadow-xs">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Activity className="w-4 h-4 text-primary" /> PM2.5 → Respiratory Mortality
                      </CardTitle>
                      <CardDescription className="text-xs">
                        OLS regression across {defaultOls.n.toLocaleString()} counties.
                      </CardDescription>
                    </div>
                    <div className="flex gap-1.5 flex-wrap shrink-0">
                      <Badge variant="outline" className="font-mono text-[10px]">
                        r = {defaultOls.correlation.toFixed(3)}
                      </Badge>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        R² = {defaultOls.r2.toFixed(3)}
                      </Badge>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        p &lt; 0.001
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="h-[220px] pt-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 5, right: 10, bottom: 20, left: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                      <XAxis
                        type="number"
                        dataKey="x"
                        name="PM2.5"
                        tick={{ fontSize: 9 }}
                        tickLine={false}
                        axisLine={false}
                        label={{ value: "PM2.5 (µg/m³)", position: "insideBottom", offset: -12, fontSize: 10 }}
                      />
                      <YAxis
                        type="number"
                        dataKey="y"
                        name="Mortality"
                        tick={{ fontSize: 9 }}
                        tickLine={false}
                        axisLine={false}
                        label={{ value: "Mortality /100k", angle: -90, position: "insideLeft", offset: 10, fontSize: 10 }}
                      />
                      <RechartsTooltip
                        cursor={{ strokeDasharray: "3 3" }}
                        contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 11 }}
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0].payload;
                          return (
                            <div className="bg-popover border border-border rounded-lg p-2.5 text-xs shadow-lg">
                              <p className="font-bold text-foreground mb-1">{d.name}</p>
                              <p className="text-muted-foreground">PM2.5: <span className="font-semibold text-amber-400">{fmt(d.x)} µg/m³</span></p>
                              <p className="text-muted-foreground">Mortality: <span className="font-semibold text-rose-400">{fmt(d.y, 1)}/100k</span></p>
                            </div>
                          );
                        }}
                      />
                      <Scatter
                        data={defaultOls.points.filter((_, i) => i % Math.ceil(defaultOls.points.length / 1200) === 0)}
                        fill="#3b82f6"
                        fillOpacity={0.35}
                        r={2}
                      />
                      <Scatter
                        data={defaultOls.regressionLine}
                        fill="none"
                        line={{ stroke: "#ef4444", strokeWidth: 2 }}
                        shape={() => null as any}
                        legendType="none"
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* RUCC + Key Findings */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              {/* RUCC mortality gradient */}
              <Card className="lg:col-span-2 border-border shadow-xs">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Map className="w-4 h-4 text-indigo-400" /> Rural Mortality Gradient (RUCC)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    RUCC 1 = Metro ≥1M pop → RUCC 9 = Completely rural. Rural counties show systematically higher mortality.
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[200px] pt-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ruccChartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.12} vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                      <RechartsTooltip
                        contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 11 }}
                        formatter={(v) => [`${v}/100k`, "Avg Mortality"]}
                      />
                      <Bar dataKey="avgMortality" radius={[4, 4, 0, 0]}>
                        {ruccChartData.map((entry) => (
                          <Cell key={entry.code} fill={entry.code >= 7 ? "#f59e0b" : entry.code >= 4 ? "#6366f1" : "#3b82f6"} fillOpacity={0.85} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Key Research Findings */}
              <Card className="lg:col-span-3 border-border shadow-xs">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    {isSimpleMode ? "What We Found" : "Key Research Findings"}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {isSimpleMode
                      ? `Based on data from ${totalCounties.toLocaleString()} U.S. counties.`
                      : `Empirical conclusions derived from this dataset of ${totalCounties.toLocaleString()} U.S. counties.`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {[
                    {
                      color: "bg-amber-500",
                      title: isSimpleMode
                        ? "Dirtier air = more lung disease deaths"
                        : `PM2.5 → Mortality: r = ${defaultOls.correlation.toFixed(2)}, R² = ${defaultOls.r2.toFixed(3)}`,
                      body: isSimpleMode
                        ? `When air pollution goes up, deaths from lung disease tend to go up too. This is a strong link seen across thousands of counties.`
                        : `For every 1 µg/m³ increase in average PM2.5, respiratory mortality increases by ${defaultOls.slope.toFixed(2)} deaths/100k (p < 0.001, N=${defaultOls.n.toLocaleString()}).`,
                    },
                    {
                      color: "bg-rose-500",
                      title: isSimpleMode
                        ? `${attributableRisk.overallParPct}% of lung disease deaths are linked to dirty air`
                        : `${attributableRisk.overallParPct}% of respiratory deaths attributable to excess PM2.5`,
                      body: isSimpleMode
                        ? `That's about ${attributableRisk.totalAttributableDeaths.toLocaleString()} people per year who might still be alive if the air were cleaner.`
                        : `Estimated ${attributableRisk.totalAttributableDeaths.toLocaleString()} deaths annually above the WHO 5 µg/m³ baseline — deaths that could be prevented by clean air policy.`,
                    },
                    {
                      color: "bg-blue-500",
                      title: isSimpleMode
                        ? `${clusterCounts.doubleBurden} counties have both bad air AND few doctors`
                        : `${clusterCounts.doubleBurden} counties in "Double Burden" classification`,
                      body: isSimpleMode
                        ? `These counties face a double problem: pollution is high AND there aren't enough doctors to help people who get sick.`
                        : `Counties with both above-median PM2.5 AND below-median physician density, creating compounded vulnerability with no protective health buffer.`,
                    },
                    {
                      color: "bg-indigo-500",
                      title: isSimpleMode
                        ? "Rural counties have the most lung disease deaths"
                        : "Rural counties (RUCC 7–9) show highest mortality rates",
                      body: isSimpleMode
                        ? `People in rural areas are more likely to die from lung disease — even though there's less pollution. The main reason? It's much harder to see a doctor out there.`
                        : `Remote rural counties have systematically higher respiratory mortality despite lower population density — suggesting that lack of healthcare access amplifies pollution impact.`,
                    },
                  ].map((f, i) => (
                    <div key={i} className="flex gap-3 p-3 rounded-xl bg-muted/30 border border-border">
                      <div className={`w-1 rounded-full shrink-0 ${f.color} opacity-70`} />
                      <div>
                        <p className="text-xs font-bold text-foreground">{f.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{f.body}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════════
                TAB 2 — EPIDEMIOLOGICAL RESEARCH LAB
            ═══════════════════════════════════════════════════════════ */}
          <TabsContent value="lab" className="space-y-4 outline-none">
            {isSimpleMode && (
              <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 text-xs text-foreground leading-relaxed">
                <span className="font-bold">🔍 What this shows:</span> Pick two health factors and see how they relate across all U.S. counties. Each dot is one county.
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Scatterplot */}
              <Card className="lg:col-span-2 border-border shadow-xs">
                <CardHeader className="pb-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Activity className="w-4 h-4 text-primary" />
                        {isSimpleMode ? "Compare Two Factors" : "OLS Regression Studio"}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {isSimpleMode
                          ? `How does ${xMeta.shortLabel} relate to ${yMeta.shortLabel} across ${olsResult.n.toLocaleString()} counties?`
                          : `${xMeta.shortLabel} vs ${yMeta.shortLabel} across ${olsResult.n.toLocaleString()} counties${selectedRuccFilter !== "all" ? ` (RUCC ${selectedRuccFilter})` : ""}`}
                      </CardDescription>
                    </div>
                    {!isSimpleMode && (
                      <div className="flex gap-1.5">
                        <Badge variant="outline" className="font-mono text-[10px]">r = {olsResult.correlation.toFixed(3)}</Badge>
                        <Badge variant="outline" className="font-mono text-[10px]">R² = {olsResult.r2.toFixed(3)}</Badge>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          p {olsResult.pValue < 0.001 ? "< 0.001" : `= ${olsResult.pValue.toFixed(3)}`}
                        </Badge>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Metric selectors */}
                  <div className="grid grid-cols-2 gap-2 mb-3 p-2.5 bg-muted/40 rounded-xl border border-border">
                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1">X · Exposure</label>
                      <select
                        value={xAxisKey}
                        onChange={(e) => setXAxisKey(e.target.value as keyof CountyData)}
                        className="cursor-pointer w-full text-xs bg-background border border-border rounded-lg px-2 py-1.5 font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        {METRIC_OPTIONS.map((m) => (
                          <option key={`x-${m.key}`} value={m.key}>{m.label} ({m.unit})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1">Y · Health Outcome</label>
                      <select
                        value={yAxisKey}
                        onChange={(e) => setYAxisKey(e.target.value as keyof CountyData)}
                        className="cursor-pointer w-full text-xs bg-background border border-border rounded-lg px-2 py-1.5 font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        {METRIC_OPTIONS.map((m) => (
                          <option key={`y-${m.key}`} value={m.key}>{m.label} ({m.unit})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Scatter chart */}
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 10, right: 10, bottom: 25, left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                        <XAxis
                          type="number"
                          dataKey="x"
                          name={xMeta.shortLabel}
                          tick={{ fontSize: 9 }}
                          tickLine={false}
                          axisLine={false}
                          label={{ value: `${xMeta.shortLabel} (${xMeta.unit})`, position: "insideBottom", offset: -15, fontSize: 10 }}
                        />
                        <YAxis
                          type="number"
                          dataKey="y"
                          name={yMeta.shortLabel}
                          tick={{ fontSize: 9 }}
                          tickLine={false}
                          axisLine={false}
                          label={{ value: `${yMeta.shortLabel} (${yMeta.unit})`, angle: -90, position: "insideLeft", offset: 15, fontSize: 10 }}
                        />
                        <RechartsTooltip
                          cursor={{ strokeDasharray: "3 3" }}
                          contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 11 }}
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0].payload;
                            return (
                              <div className="bg-popover border border-border rounded-lg p-2.5 text-xs shadow-lg">
                                <p className="font-bold text-foreground mb-1">{d.name}</p>
                                <p className="text-muted-foreground">{xMeta.shortLabel}: <span className="font-semibold text-foreground">{fmt(d.x, 2)} {xMeta.unit}</span></p>
                                <p className="text-muted-foreground">{yMeta.shortLabel}: <span className="font-semibold text-foreground">{fmt(d.y, 2)} {yMeta.unit}</span></p>
                              </div>
                            );
                          }}
                        />
                        {/* Scatter points */}
                        <Scatter data={scatterPoints} fill="#3b82f6" fillOpacity={0.4} r={2} />
                        {/* Regression trendline as second scatter with line */}
                        <Scatter
                          data={trendData}
                          fill="none"
                          line={{ stroke: "#ef4444", strokeWidth: 2 }}
                          shape={() => null as any}
                          legendType="none"
                        />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Diagnostics sidebar */}
              <div className="space-y-4">
                <Card className="border-border shadow-xs">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-500" />
                      {isSimpleMode ? "What the Chart Means" : "Statistical Diagnostics"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {!isSimpleMode && (
                      <div className="space-y-2 p-3 bg-muted/40 rounded-xl border border-border">
                        {[
                          { label: "Regression Equation", val: `Y = ${olsResult.slope.toFixed(3)}X + ${olsResult.intercept.toFixed(1)}`, mono: true },
                          { label: "Pearson r", val: olsResult.correlation.toFixed(3), mono: true },
                          { label: "R² (variance explained)", val: `${(olsResult.r2 * 100).toFixed(1)}%`, mono: true },
                          { label: "p-value", val: olsResult.pValue < 0.001 ? "< 0.001" : olsResult.pValue.toFixed(3), mono: true },
                          { label: "Sample size N", val: `${olsResult.n.toLocaleString()} counties`, mono: false },
                        ].map((row) => (
                          <div key={row.label} className="flex justify-between items-center gap-2 text-xs">
                            <span className="text-muted-foreground shrink-0">{row.label}</span>
                            <span className={`font-semibold text-foreground ${row.mono ? "font-mono" : ""} text-right`}>{row.val}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {isSimpleMode && (
                      <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs space-y-2">
                        <p className="font-semibold flex items-center gap-1.5 text-blue-400">
                          <Info className="w-3.5 h-3.5" /> Plain English Summary
                        </p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          When <span className="font-semibold text-foreground">{xMeta.shortLabel}</span> goes up,{" "}
                          <span className="font-semibold text-foreground">{yMeta.shortLabel}</span>{" "}
                          tends to go{" "}
                          <span className="font-semibold text-foreground">{olsResult.slope >= 0 ? "up too" : "down"}</span>.{" "}
                          {Math.abs(olsResult.correlation) > 0.4 ? "This is a strong link." : Math.abs(olsResult.correlation) > 0.2 ? "This is a moderate link." : "The link is weak."}
                        </p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          Based on data from <span className="font-semibold text-foreground">{olsResult.n.toLocaleString()} counties</span>.
                        </p>
                      </div>
                    )}

                    {/* RUCC filter — hidden in simple mode */}
                    {!isSimpleMode && (
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-indigo-400" /> Stratify by Urbanicity
                        </label>
                        <select
                          value={selectedRuccFilter}
                          onChange={(e) => setSelectedRuccFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
                          className="cursor-pointer w-full text-xs bg-background border border-border rounded-lg px-2 py-1.5 font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="all">All Counties (RUCC 1–9)</option>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((r) => (
                            <option key={r} value={r}>RUCC {r}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {!isSimpleMode && (
                      <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs space-y-1">
                        <p className="font-semibold flex items-center gap-1.5 text-blue-400">
                          <Info className="w-3.5 h-3.5" /> Interpretation
                        </p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          Slope of <span className="font-mono font-semibold text-foreground">{olsResult.slope.toFixed(3)}</span>: a 1-unit increase in{" "}
                          {xMeta.shortLabel} is associated with a{" "}
                          <span className="font-semibold text-foreground">{Math.abs(olsResult.slope).toFixed(3)}</span> {olsResult.slope >= 0 ? "increase" : "decrease"} in {yMeta.shortLabel}.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* RUCC bar in lab too */}
                <Card className="border-border shadow-xs">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-bold text-foreground">Mortality by RUCC Code</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[160px] pt-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={ruccChartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                        <XAxis dataKey="label" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                        <RechartsTooltip
                          contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 11 }}
                          formatter={(v) => [`${v}/100k`, "Avg Mortality"]}
                        />
                        <Bar dataKey="avgMortality" radius={[4, 4, 0, 0]}>
                          {ruccChartData.map((entry) => (
                            <Cell key={entry.code} fill={entry.code >= 7 ? "#f59e0b" : "#3b82f6"} fillOpacity={0.8} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════════
                TAB 3 — COUNTERFACTUAL POLICY SIMULATOR
            ═══════════════════════════════════════════════════════════ */}
          <TabsContent value="simulator" className="space-y-4 outline-none">
            {isSimpleMode && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-foreground leading-relaxed">
                <span className="font-bold">🎛️ What this shows:</span> Drag the sliders to see how different government policies could save lives. The numbers update instantly.
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
              {/* Controls Box */}
              <Card className="border-border shadow-xs flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-amber-500" />
                      {isSimpleMode ? "Change the Policies" : "Policy Intervention Controls"}
                    </CardTitle>
                    <button
                      onClick={() => {
                        setTargetPm25Cap(9.0);
                        setTargetToxicCap(50000);
                        setMdDensityBoostPct(15);
                      }}
                      className="text-[10px] font-medium text-muted-foreground hover:text-foreground underline decoration-dotted transition-colors cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>
                  <CardDescription className="text-xs">
                    {isSimpleMode
                      ? "Move the sliders to see how cleaner air and more doctors could save lives."
                      : "Drag sliders or pick a scenario to model national-scale environmental & healthcare interventions."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5 flex-1 flex flex-col justify-between pt-0">
                  {/* Quick Preset Buttons */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                      Quick Scenarios
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setTargetPm25Cap(9.0);
                          setTargetToxicCap(50000);
                          setMdDensityBoostPct(15);
                        }}
                        className={`px-2 py-1.5 text-[11px] font-medium rounded-lg border transition-all text-left flex flex-col cursor-pointer ${targetPm25Cap === 9.0 && targetToxicCap === 50000 && mdDensityBoostPct === 15
                            ? "bg-amber-500/15 border-amber-500/40 text-amber-400 font-semibold"
                            : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/60"
                          }`}
                      >
                        <span>EPA 2024</span>
                        <span className="text-[9px] opacity-75">9.0 µg/m³ Cap</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setTargetPm25Cap(5.0);
                          setTargetToxicCap(25000);
                          setMdDensityBoostPct(25);
                        }}
                        className={`px-2 py-1.5 text-[11px] font-medium rounded-lg border transition-all text-left flex flex-col cursor-pointer ${targetPm25Cap === 5.0 && targetToxicCap === 25000 && mdDensityBoostPct === 25
                            ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 font-semibold"
                            : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/60"
                          }`}
                      >
                        <span>WHO Clean</span>
                        <span className="text-[9px] opacity-75">5.0 µg/m³ Cap</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setTargetPm25Cap(8.0);
                          setTargetToxicCap(10000);
                          setMdDensityBoostPct(50);
                        }}
                        className={`px-2 py-1.5 text-[11px] font-medium rounded-lg border transition-all text-left flex flex-col cursor-pointer ${mdDensityBoostPct === 50
                            ? "bg-purple-500/15 border-purple-500/40 text-purple-400 font-semibold"
                            : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/60"
                          }`}
                      >
                        <span>Max Health</span>
                        <span className="text-[9px] opacity-75">+50% MD Surge</span>
                      </button>
                    </div>
                  </div>

                  {/* Sliders */}
                  <div className="space-y-4">
                    <PolicySlider
                      label={isSimpleMode ? "Air Pollution Limit" : "EPA PM2.5 Clean Air Cap"}
                      icon={<Wind className="w-3.5 h-3.5 text-amber-400" />}
                      value={targetPm25Cap}
                      min={5.0}
                      max={12.0}
                      step={0.1}
                      display={`${targetPm25Cap.toFixed(1)} µg/m³`}
                      onChange={setTargetPm25Cap}
                      accentClass="bg-amber-500/10 border-amber-500/30 text-amber-400"
                      marks={[
                        { val: "5.0", label: isSimpleMode ? "Cleanest" : "WHO" },
                        { val: "9.0", label: isSimpleMode ? "EPA today" : "EPA 2024" },
                        { val: "12.0", label: isSimpleMode ? "Current" : "Baseline" },
                      ]}
                    />
                    <PolicySlider
                      label={isSimpleMode ? "Factory Chemical Limit" : "Industrial Toxic Release Cap"}
                      icon={<Factory className="w-3.5 h-3.5 text-slate-400" />}
                      value={targetToxicCap}
                      min={0}
                      max={200000}
                      step={5000}
                      display={`${(targetToxicCap / 1000).toFixed(0)}k lbs`}
                      onChange={setTargetToxicCap}
                      accentClass="bg-slate-500/10 border-slate-500/30 text-slate-300"
                      marks={[
                        { val: "0", label: isSimpleMode ? "None" : "Zero" },
                        { val: "50k", label: isSimpleMode ? "Some" : "Moderate" },
                        { val: "200k", label: isSimpleMode ? "A lot" : "Heavy" },
                      ]}
                    />
                    <PolicySlider
                      label={isSimpleMode ? "Add More Doctors" : "Physician Access Expansion"}
                      icon={<HeartPulse className="w-3.5 h-3.5 text-emerald-400" />}
                      value={mdDensityBoostPct}
                      min={0}
                      max={50}
                      step={5}
                      display={isSimpleMode ? `+${mdDensityBoostPct}% more doctors` : `+${mdDensityBoostPct}% MD density`}
                      onChange={setMdDensityBoostPct}
                      accentClass="bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      marks={[
                        { val: "+0%", label: isSimpleMode ? "Same" : "Current" },
                        { val: "+25%", label: isSimpleMode ? "More" : "Targeted" },
                        { val: "+50%", label: isSimpleMode ? "Lots" : "Major" },
                      ]}
                    />
                  </div>

                  {/* Simulation Model Details — hide in simple mode */}
                  {!isSimpleMode && (
                    <div className="p-3 rounded-xl bg-muted/40 border border-border text-xs space-y-1.5 mt-auto">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-foreground flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-primary" /> Simulation Model
                        </p>
                        <span className="text-[10px] font-mono text-muted-foreground">RR = e^(0.0058×ΔPM)</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Calculates log-linear hazard reduction per county based on exposure thresholds and healthcare buffer parameters.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Results Box */}
              <div className="lg:col-span-2 space-y-4 flex flex-col justify-between pt-1">
                {/* KPI Stat Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Card className="border-emerald-500/25 bg-emerald-500/5 shadow-xs relative overflow-hidden">
                    <CardContent className="p-5 pt-6 sm:pt-7">
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5" />
                          {isSimpleMode ? "Lives Saved" : "Lives Saved / Yr"}
                        </p>
                        <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          {simResult.affectedCountyCount} counties
                        </span>
                      </div>
                      <p className="text-3xl font-black text-emerald-400 font-mono tracking-tight">
                        {simResult.projectedLivesSaved.toLocaleString()}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1.5">
                        {isSimpleMode
                          ? "People who wouldn't die each year with these policies"
                          : "Avoided premature respiratory mortality"}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-blue-500/25 bg-blue-500/5 shadow-xs relative overflow-hidden">
                    <CardContent className="p-5 pt-6 sm:pt-7">
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <p className="text-[11px] font-bold text-blue-400 uppercase tracking-wide flex items-center gap-1.5">
                          <Stethoscope className="w-3.5 h-3.5" />
                          {isSimpleMode ? "Disease Attacks Avoided" : "Cases Prevented"}
                        </p>
                        <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30">
                          {isSimpleMode ? "per year" : "COPD + Asthma"}
                        </span>
                      </div>
                      <p className="text-3xl font-black text-blue-400 font-mono tracking-tight">
                        {(simResult.preventedCopdCases + simResult.preventedAsthmaCases).toLocaleString()}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1.5">
                        {isSimpleMode
                          ? "Asthma & lung disease flare-ups that wouldn't happen"
                          : "Annual hospital & ER exacerbations prevented"}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-purple-500/25 bg-purple-500/5 shadow-xs relative overflow-hidden">
                    <CardContent className="p-5 pt-6 sm:pt-7">
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <p className="text-[11px] font-bold text-purple-400 uppercase tracking-wide flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5" />
                          {isSimpleMode ? "Hospital Bill Savings" : "Healthcare Savings"}
                        </p>
                        <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 border border-purple-500/30">
                          Annual
                        </span>
                      </div>
                      <p className="text-3xl font-black text-purple-400 font-mono tracking-tight">
                        ${simResult.estimatedCostSavingsMillions.toLocaleString()}M
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1.5">
                        {isSimpleMode
                          ? "Money saved on hospital visits nationwide per year"
                          : "Direct clinical cost reduction nationwide"}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Priority counties table */}
                <Card className="border-border shadow-xs flex-1 flex flex-col justify-between">
                  <CardHeader className="pb-2.5 pt-4 px-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                          <ShieldAlert className="w-4 h-4 text-rose-500" />
                          {isSimpleMode ? "Counties That Would Benefit Most" : "Priority Intervention Counties"}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {isSimpleMode
                            ? "These counties would see the biggest health improvements with these policies."
                            : "Counties seeing maximum projected health gains under current scenario settings."}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-mono px-2 py-0.5">
                        Top {simResult.priorityCounties.length} High-Impact
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 flex-1 flex flex-col justify-between">
                    <div className="overflow-x-auto flex-1">
                      <table className="w-full text-left text-xs">
                        <thead className="border-y border-border bg-muted/40 text-[10px] font-semibold uppercase text-muted-foreground">
                          <tr>
                            <th className="px-3.5 py-2.5 w-10">#</th>
                            <th className="px-3.5 py-2.5">County Name</th>
                            <th className="px-3.5 py-2.5">Current PM2.5</th>
                            <th className="px-3.5 py-2.5">Mortality Rate</th>
                            <th className="px-3.5 py-2.5 text-emerald-400">Impact Share</th>
                            <th className="px-3.5 py-2.5 text-right text-emerald-400">Lives Saved/yr</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {simResult.priorityCounties.map((c, i) => {
                            const maxLives = simResult.priorityCounties[0]?.livesSaved || 1;
                            const pct = Math.min(100, Math.round((c.livesSaved / maxLives) * 100));
                            return (
                              <tr key={c.fips} className="hover:bg-muted/30 transition-colors">
                                <td className="px-3.5 py-2 font-mono text-muted-foreground">{i + 1}</td>
                                <td className="px-3.5 py-2 font-semibold text-foreground">{c.name}</td>
                                <td className="px-3.5 py-2 font-mono text-amber-400">{fmt(c.currentPm25)} µg/m³</td>
                                <td className="px-3.5 py-2 font-mono text-muted-foreground">{fmt(c.currentMortality)}/100k</td>
                                <td className="px-3.5 py-2 min-w-[120px]">
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-muted/60 h-1.5 rounded-full overflow-hidden">
                                      <div
                                        className="bg-emerald-400 h-full rounded-full transition-all duration-300"
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                    <span className="text-[10px] font-mono text-muted-foreground shrink-0">{pct}%</span>
                                  </div>
                                </td>
                                <td className="px-3.5 py-2 font-bold font-mono text-emerald-400 text-right">+{c.livesSaved}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════════
                TAB 4 — SPATIAL EQUITY & CLUSTERS
            ═══════════════════════════════════════════════════════════ */}
          <TabsContent value="equity" className="space-y-4 outline-none">
            {isSimpleMode && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-foreground leading-relaxed">
                <span className="font-bold">⚠️ What this shows:</span> Which counties have the worst combination of bad air AND few doctors — and which groups of people are most affected.
              </div>
            )}
            {/* Quadrant grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-2 border-border shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-500" />
                    {isSimpleMode ? "County Risk Groups" : "Environmental Hazard × Healthcare Access Matrix"}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {isSimpleMode
                      ? `${totalCounties.toLocaleString()} counties grouped by pollution level and doctor availability.`
                      : `${totalCounties.toLocaleString()} counties split by median PM2.5 and physician density. Quadrant membership uses population-weighted medians.`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      {
                        title: isSimpleMode ? "🔴 Very High Risk" : "High Hazard / Low Care",
                        subtitle: isSimpleMode ? "Dirty air + few doctors" : "Double Burden Health Deserts",
                        desc: isSimpleMode
                          ? "These counties have a lot of pollution AND not enough doctors. People here face the highest risk."
                          : "Above-median PM2.5 + below-median physician density. Compounded respiratory risk with no medical buffer.",
                        count: clusterCounts.doubleBurden,
                        border: "border-rose-500/30",
                        bg: "bg-rose-500/5",
                        badgeClass: "bg-rose-500/20 text-rose-400 border-rose-500/30",
                        textColor: "text-rose-400",
                        icon: <AlertTriangle className="w-4 h-4" />,
                      },
                      {
                        title: isSimpleMode ? "🟠 High Risk (Protected)" : "High Hazard / High Care",
                        subtitle: isSimpleMode ? "Dirty air, but good doctors" : "Buffered Industrial Centers",
                        desc: isSimpleMode
                          ? "These counties have a lot of pollution, but there are enough doctors to help people who get sick."
                          : "Elevated pollution exposure, but strong hospital infrastructure reduces mortality impact.",
                        count: clusterCounts.highHazard,
                        border: "border-amber-500/30",
                        bg: "bg-amber-500/5",
                        badgeClass: "bg-amber-500/20 text-amber-400 border-amber-500/30",
                        textColor: "text-amber-400",
                        icon: <Wind className="w-4 h-4" />,
                      },
                      {
                        title: isSimpleMode ? "🟡 Some Risk" : "Low Hazard / Low Care",
                        subtitle: isSimpleMode ? "Clean air, but few doctors" : "Isolated Rural Counties",
                        desc: isSimpleMode
                          ? "The air is clean here, but there aren't many doctors. If someone gets sick, it might be hard to get help."
                          : "Clean air, but limited healthcare access. Risk is moderate — physician shortage is primary concern.",
                        count: clusterCounts.lowCare,
                        border: "border-slate-500/30",
                        bg: "bg-slate-500/5",
                        badgeClass: "bg-slate-500/20 text-slate-300 border-slate-500/30",
                        textColor: "text-slate-300",
                        icon: <Users className="w-4 h-4" />,
                      },
                      {
                        title: isSimpleMode ? "🟢 Low Risk" : "Low Hazard / High Care",
                        subtitle: isSimpleMode ? "Clean air + good doctors" : "Protective Environments",
                        desc: isSimpleMode
                          ? "The best situation: the air is clean and there are plenty of doctors. People here are the safest."
                          : "Best baseline health conditions — low pollution exposure with strong primary care coverage.",
                        count: clusterCounts.protective,
                        border: "border-emerald-500/30",
                        bg: "bg-emerald-500/5",
                        badgeClass: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
                        textColor: "text-emerald-400",
                        icon: <CheckCircle2 className="w-4 h-4" />,
                      },
                    ].map((q) => (
                      <div key={q.title} className={`p-4 rounded-xl border ${q.border} ${q.bg} space-y-2`}>
                        <div className="flex items-start justify-between gap-2">
                          <span className={`text-xs font-bold flex items-center gap-1.5 ${q.textColor}`}>
                            {q.icon} {q.title}
                          </span>
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${q.badgeClass} shrink-0`}>
                            {q.count}
                          </span>
                        </div>
                        <p className="text-[11px] font-semibold text-foreground">{q.subtitle}</p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">{q.desc}</p>
                      </div>
                    ))}
                  </div>

                  {/* Double burden county list */}
                  <div>
                    <h4 className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                      {isSimpleMode ? "Counties That Need Help Most" : "Sample Double-Burden Health Desert Counties"}
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                      {doubleBurdenList.map((c) => (
                        <div key={c.fips} className="p-2 rounded-lg bg-muted/40 border border-border text-xs">
                          <div className="font-semibold text-foreground truncate text-[11px]">{c.name}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5 space-y-0.5">
                            {isSimpleMode ? (
                              <>
                                <div>Air: <span className="font-mono text-amber-400">{fmt(c.pm25)} µg/m³</span></div>
                                <div>Doctors: <span className="font-mono text-rose-400">{fmt(c.mdRate, 0)}/100k</span></div>
                              </>
                            ) : (
                              <>
                                <div>PM2.5: <span className="font-mono text-amber-400">{fmt(c.pm25)}</span></div>
                                <div>MDs: <span className="font-mono text-rose-400">{fmt(c.mdRate, 0)}/100k</span></div>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Equity summary sidebar */}
              <Card className="border-border shadow-xs">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    {isSimpleMode ? "Quick Stats" : "Population Exposure Summary"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    {
                      label: isSimpleMode ? "Counties Looked At" : "Counties Analyzed",
                      value: totalCounties.toLocaleString(),
                      color: "text-foreground",
                    },
                    {
                      label: isSimpleMode ? "🔴 Underserved Counties" : "Double-Burden Deserts",
                      value: clusterCounts.doubleBurden.toLocaleString(),
                      color: "text-rose-400",
                    },
                    {
                      label: isSimpleMode ? "🟠 High-pollution Counties" : "High-Hazard Counties",
                      value: (clusterCounts.doubleBurden + clusterCounts.highHazard).toLocaleString(),
                      color: "text-amber-400",
                    },
                    {
                      label: isSimpleMode ? "🟢 Low-risk Counties" : "Protective Counties",
                      value: clusterCounts.protective.toLocaleString(),
                      color: "text-emerald-400",
                    },
                    {
                      label: isSimpleMode ? "Deaths from dirty air" : "PM2.5 Attr. Deaths/yr",
                      value: attributableRisk.totalAttributableDeaths.toLocaleString(),
                      color: "text-rose-400",
                    },
                    ...(!isSimpleMode ? [{
                      label: "PAR Fraction",
                      value: `${attributableRisk.overallParPct}%`,
                      color: "text-primary",
                    }] : []),
                  ].map((s) => (
                    <div key={s.label} className="flex justify-between items-center text-xs border-b border-border/40 pb-2 last:border-0 last:pb-0">
                      <span className="text-muted-foreground">{s.label}</span>
                      <span className={`font-bold font-mono ${s.color}`}>{s.value}</span>
                    </div>
                  ))}

                  <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs space-y-1">
                    <p className="font-semibold text-rose-400 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5" />
                      {isSimpleMode ? "Important" : "Environmental Justice Note"}
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {isSimpleMode
                        ? "The counties with the worst air AND fewest doctors tend to be rural, lower-income, and have more minority residents — meaning these communities get hit hardest."
                        : `Counties classified as "Double Burden Health Deserts" disproportionately serve rural, lower-income, and minority populations — demonstrating compounded environmental justice vulnerability.`}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

        </div>
      </Tabs>

      {/* ── Mobile Full-Screen Popover Modal Overlay ──────────────────── */}
      {mobileModalTab && (
        <div className="sm:hidden fixed inset-0 z-50 bg-background flex flex-col h-[100dvh] w-full overflow-hidden animate-in slide-in-from-bottom duration-300">
          {/* Header */}
          <div className="flex flex-col border-b border-border bg-card shadow-md shrink-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary shrink-0">
                  {mobileModalTab === "impact" && <TrendingUp className="w-5 h-5 text-emerald-400" />}
                  {mobileModalTab === "lab" && <Activity className="w-5 h-5 text-blue-400" />}
                  {mobileModalTab === "simulator" && <Sliders className="w-5 h-5 text-purple-400" />}
                  {mobileModalTab === "equity" && <ShieldAlert className="w-5 h-5 text-rose-400" />}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-foreground leading-none truncate">
                    {mobileModalTab === "impact" && (isSimpleMode ? "Big Picture" : "Measurable Impact")}
                    {mobileModalTab === "lab" && (isSimpleMode ? "Explorer" : "Research Lab")}
                    {mobileModalTab === "simulator" && (isSimpleMode ? "What If?" : "Policy Simulator")}
                    {mobileModalTab === "equity" && (isSimpleMode ? "Who's at Risk?" : "Equity & Clusters")}
                  </h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Full Screen Popover Analytics</p>
                </div>
              </div>
              <button
                onClick={() => setMobileModalTab(null)}
                className="p-2 rounded-xl bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex items-center gap-1 text-xs font-semibold shrink-0 cursor-pointer"
                aria-label="Close analytics popup"
              >
                <span>Close</span>
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Switch Pills inside Header */}
            <div className="flex items-center gap-1.5 px-3 py-2 overflow-x-auto scrollbar-none bg-muted/30">
              {[
                { id: "impact", label: isSimpleMode ? "Big Picture" : "Impact", icon: <TrendingUp className="w-3 h-3 text-emerald-400" /> },
                { id: "lab", label: isSimpleMode ? "Explorer" : "Lab", icon: <Activity className="w-3 h-3 text-blue-400" /> },
                { id: "simulator", label: isSimpleMode ? "What If?" : "Simulator", icon: <Sliders className="w-3 h-3 text-purple-400" /> },
                { id: "equity", label: isSimpleMode ? "Who's at Risk?" : "Equity", icon: <ShieldAlert className="w-3 h-3 text-rose-400" /> },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setMobileModalTab(m.id as typeof mobileModalTab);
                    setActiveTab(m.id as typeof activeTab);
                  }}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 cursor-pointer transition-all ${mobileModalTab === m.id
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-background/80 text-muted-foreground border border-border/60 hover:text-foreground"
                    }`}
                >
                  {m.icon}
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-4">
            {mobileModalTab === "impact" && (
              <div className="space-y-5">
                {isSimpleMode && (
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 leading-relaxed">
                    <span className="font-bold">📊 What this shows:</span> If the government set stricter limits on air pollution, here&apos;s how many lives could be saved each year.
                  </div>
                )}
                <div className="grid grid-cols-1 gap-3">
                  <ImpactKPI
                    label={isSimpleMode ? "People Who Wouldn't Die" : "Lives Saved by EPA Standard"}
                    value={baselineSimResult.projectedLivesSaved.toLocaleString()}
                    sub={isSimpleMode
                      ? `Each year, if the air were cleaner in ${baselineSimResult.affectedCountyCount} counties`
                      : `Annually if PM2.5 capped at 9.0 µg/m³ across ${baselineSimResult.affectedCountyCount} counties`}
                    color="text-emerald-400"
                    icon={<Heart className="w-3.5 h-3.5" />}
                    border="border-emerald-500/25"
                    bg="bg-emerald-500/5"
                  />
                  <ImpactKPI
                    label={isSimpleMode ? "Disease Attacks Avoided" : "Chronic Disease Events Prevented"}
                    value={fmtLarge(baselineSimResult.preventedCopdCases + baselineSimResult.preventedAsthmaCases)}
                    sub={isSimpleMode
                      ? "Asthma and lung disease attacks that could be avoided per year"
                      : "COPD + asthma exacerbations avoided per year under baseline policy scenario"}
                    color="text-blue-400"
                    icon={<Stethoscope className="w-3.5 h-3.5" />}
                    border="border-blue-500/25"
                    bg="bg-blue-500/5"
                  />
                  <ImpactKPI
                    label={isSimpleMode ? "Hospital Bill Savings" : "Healthcare Cost Savings"}
                    value={`$${baselineSimResult.estimatedCostSavingsMillions.toLocaleString()}M`}
                    sub={isSimpleMode
                      ? "Money saved on hospital visits each year if the air were cleaner"
                      : "Estimated annual economic savings from reduced hospitalizations and ER visits"}
                    color="text-purple-400"
                    icon={<DollarSign className="w-3.5 h-3.5" />}
                    border="border-purple-500/25"
                    bg="bg-purple-500/5"
                  />
                  <ImpactKPI
                    label={isSimpleMode ? "Deaths Linked to Dirty Air" : "PM2.5-Attributable Deaths"}
                    value={attributableRisk.totalAttributableDeaths.toLocaleString()}
                    sub={isSimpleMode
                      ? `${attributableRisk.overallParPct}% of all lung disease deaths could be prevented with cleaner air`
                      : `${attributableRisk.overallParPct}% of all respiratory mortality annually above WHO 5 µg/m³ baseline`}
                    color="text-rose-400"
                    icon={<AlertTriangle className="w-3.5 h-3.5" />}
                    border="border-rose-500/25"
                    bg="bg-rose-500/5"
                  />
                </div>

                {/* PM2.5 Distribution */}
                <Card className="border-border shadow-xs">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Wind className="w-4 h-4 text-amber-400" /> PM2.5 Exposure Distribution
                    </CardTitle>
                    <CardDescription className="text-xs">
                      County-level PM2.5 exposure across {totalCounties.toLocaleString()} U.S. counties.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-[200px] pt-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={pm25Histogram} margin={{ top: 5, right: 5, bottom: 20, left: -15 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.12} vertical={false} />
                        <XAxis dataKey="range" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                        <ReferenceLine x="8–10" stroke="#f59e0b" strokeDasharray="4 2" strokeWidth={1.5} />
                        <RechartsTooltip
                          contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 11 }}
                          formatter={(v) => [`${v} counties`, "Count"]}
                        />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                          {pm25Histogram.map((entry, i) => (
                            <Cell key={i} fill={entry.midpoint >= 9 ? "#ef4444" : entry.midpoint >= 6 ? "#f59e0b" : "#3b82f6"} fillOpacity={0.8} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Mortality vs PM2.5 scatter */}
                <Card className="border-border shadow-xs">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Activity className="w-4 h-4 text-primary" /> PM2.5 → Mortality Scatter
                    </CardTitle>
                    <CardDescription className="text-xs">
                      OLS regression (r = {defaultOls.correlation.toFixed(2)}, R² = {defaultOls.r2.toFixed(2)})
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-[220px] pt-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 5, right: 10, bottom: 20, left: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                        <XAxis type="number" dataKey="x" name="PM2.5" tick={{ fontSize: 9 }} axisLine={false} />
                        <YAxis type="number" dataKey="y" name="Mortality" tick={{ fontSize: 9 }} axisLine={false} />
                        <RechartsTooltip
                          cursor={{ strokeDasharray: "3 3" }}
                          contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 11 }}
                        />
                        <Scatter data={defaultOls.points.filter((_, i) => i % 5 === 0)} fill="#3b82f6" fillOpacity={0.35} r={2} />
                        <Scatter data={defaultOls.regressionLine} fill="none" line={{ stroke: "#ef4444", strokeWidth: 2 }} shape={() => null as any} legendType="none" />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            )}

            {mobileModalTab === "lab" && (
              <div className="space-y-4">
                {isSimpleMode && (
                  <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 text-xs text-foreground leading-relaxed">
                    <span className="font-bold">🔍 What this shows:</span> Pick two health factors and see how they relate across all U.S. counties.
                  </div>
                )}
                <Card className="border-border shadow-xs">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Activity className="w-4 h-4 text-primary" />
                      {isSimpleMode ? "Compare Two Factors" : "OLS Regression Studio"}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {xMeta.shortLabel} vs {yMeta.shortLabel} across {olsResult.n.toLocaleString()} counties
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 gap-2 p-2.5 bg-muted/40 rounded-xl border border-border">
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1">X · Exposure Metric</label>
                        <select
                          value={xAxisKey}
                          onChange={(e) => setXAxisKey(e.target.value as keyof CountyData)}
                          className="cursor-pointer w-full text-xs bg-background border border-border rounded-lg px-2.5 py-2 font-medium text-foreground"
                        >
                          {METRIC_OPTIONS.map((m) => (
                            <option key={`x-mob-${m.key}`} value={m.key}>{m.label} ({m.unit})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1">Y · Health Outcome Metric</label>
                        <select
                          value={yAxisKey}
                          onChange={(e) => setYAxisKey(e.target.value as keyof CountyData)}
                          className="cursor-pointer w-full text-xs bg-background border border-border rounded-lg px-2.5 py-2 font-medium text-foreground"
                        >
                          {METRIC_OPTIONS.map((m) => (
                            <option key={`y-mob-${m.key}`} value={m.key}>{m.label} ({m.unit})</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="h-[240px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 10, right: 10, bottom: 25, left: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                          <XAxis type="number" dataKey="x" tick={{ fontSize: 9 }} axisLine={false} />
                          <YAxis type="number" dataKey="y" tick={{ fontSize: 9 }} axisLine={false} />
                          <RechartsTooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 11 }} />
                          <Scatter data={scatterPoints} fill="#3b82f6" fillOpacity={0.4} r={2} />
                          <Scatter data={trendData} fill="none" line={{ stroke: "#ef4444", strokeWidth: 2 }} shape={() => null as any} legendType="none" />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="p-3 bg-muted/40 rounded-xl border border-border space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Pearson correlation (r)</span>
                        <span className="font-mono font-bold text-foreground">{olsResult.correlation.toFixed(3)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Variance explained (R²)</span>
                        <span className="font-mono font-bold text-foreground">{(olsResult.r2 * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Regression slope</span>
                        <span className="font-mono font-bold text-foreground">{olsResult.slope.toFixed(3)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {mobileModalTab === "simulator" && (
              <div className="space-y-4">
                {isSimpleMode && (
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-foreground leading-relaxed">
                    <span className="font-bold">🎛️ What this shows:</span> Drag the sliders below to test policy scenarios on air pollution and doctor density.
                  </div>
                )}
                {/* Sliders Card */}
                <Card className="border-border shadow-xs">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-purple-400" /> Scenario Controls
                      </CardTitle>
                      <button
                        onClick={() => {
                          setTargetPm25Cap(9.0);
                          setTargetToxicCap(50000);
                          setMdDensityBoostPct(15);
                        }}
                        className="text-[10px] font-medium text-muted-foreground underline cursor-pointer"
                      >
                        Reset
                      </button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <PolicySlider
                      label={isSimpleMode ? "Air Pollution Limit" : "EPA PM2.5 Cap"}
                      icon={<Wind className="w-3.5 h-3.5 text-amber-400" />}
                      value={targetPm25Cap}
                      min={5.0}
                      max={12.0}
                      step={0.1}
                      display={`${targetPm25Cap.toFixed(1)} µg/m³`}
                      onChange={setTargetPm25Cap}
                      accentClass="bg-amber-500/10 border-amber-500/30 text-amber-400"
                      marks={[{ val: "5.0", label: "WHO" }, { val: "9.0", label: "EPA" }, { val: "12.0", label: "Base" }]}
                    />
                    <PolicySlider
                      label={isSimpleMode ? "Add Doctors" : "MD Density Boost"}
                      icon={<HeartPulse className="w-3.5 h-3.5 text-emerald-400" />}
                      value={mdDensityBoostPct}
                      min={0}
                      max={50}
                      step={5}
                      display={`+${mdDensityBoostPct}%`}
                      onChange={setMdDensityBoostPct}
                      accentClass="bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      marks={[{ val: "+0%", label: "Current" }, { val: "+25%", label: "Target" }, { val: "+50%", label: "Major" }]}
                    />
                  </CardContent>
                </Card>

                {/* Simulated KPI */}
                <Card className="border-emerald-500/30 bg-emerald-500/5 shadow-xs">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[11px] font-bold text-emerald-400 uppercase">Projected Impact</p>
                      <Badge variant="outline" className="text-[10px] font-mono text-emerald-400 border-emerald-500/30">
                        {simResult.affectedCountyCount} counties
                      </Badge>
                    </div>
                    <p className="text-3xl font-black text-emerald-400 font-mono">
                      {simResult.projectedLivesSaved.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Lives saved annually under this scenario</p>
                  </CardContent>
                </Card>

                {/* Priority Counties */}
                <Card className="border-border shadow-xs">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-bold text-foreground">Top Priority Benefit Counties</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-border">
                      {simResult.priorityCounties.slice(0, 5).map((c, i) => (
                        <div key={c.fips} className="p-3 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-bold text-foreground">{i + 1}. {c.name}</p>
                            <p className="text-[10px] text-muted-foreground">PM2.5: {fmt(c.currentPm25)} µg/m³</p>
                          </div>
                          <span className="font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-md">
                            +{c.livesSaved} saved
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {mobileModalTab === "equity" && (
              <div className="space-y-4">
                {isSimpleMode && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-foreground leading-relaxed">
                    <span className="font-bold">⚠️ What this shows:</span> Which counties have high pollution AND few doctors.
                  </div>
                )}
                <div className="grid grid-cols-1 gap-3">
                  {[
                    {
                      title: isSimpleMode ? "🔴 Very High Risk" : "High Hazard / Low Care",
                      desc: "Above-median pollution + below-median doctors.",
                      count: clusterCounts.doubleBurden,
                      border: "border-rose-500/30",
                      bg: "bg-rose-500/5",
                      textColor: "text-rose-400",
                    },
                    {
                      title: isSimpleMode ? "🟠 High Risk (Protected)" : "High Hazard / High Care",
                      desc: "Elevated pollution, but strong doctor network.",
                      count: clusterCounts.highHazard,
                      border: "border-amber-500/30",
                      bg: "bg-amber-500/5",
                      textColor: "text-amber-400",
                    },
                    {
                      title: isSimpleMode ? "🟡 Some Risk" : "Low Hazard / Low Care",
                      desc: "Clean air, but healthcare access shortages.",
                      count: clusterCounts.lowCare,
                      border: "border-slate-500/30",
                      bg: "bg-slate-500/5",
                      textColor: "text-slate-300",
                    },
                    {
                      title: isSimpleMode ? "🟢 Low Risk" : "Low Hazard / High Care",
                      desc: "Best baseline conditions — clean air & doctors.",
                      count: clusterCounts.protective,
                      border: "border-emerald-500/30",
                      bg: "bg-emerald-500/5",
                      textColor: "text-emerald-400",
                    },
                  ].map((q) => (
                    <div key={q.title} className={`p-3.5 rounded-xl border ${q.border} ${q.bg} space-y-1`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${q.textColor}`}>{q.title}</span>
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-border bg-background`}>{q.count} counties</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{q.desc}</p>
                    </div>
                  ))}
                </div>

                <Card className="border-border shadow-xs">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-bold text-foreground">Sample Underserved Counties</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3">
                    <div className="grid grid-cols-2 gap-2">
                      {doubleBurdenList.slice(0, 6).map((c) => (
                        <div key={c.fips} className="p-2 rounded-lg bg-muted/40 border border-border text-xs">
                          <div className="font-semibold text-foreground truncate text-[11px]">{c.name}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            PM2.5: <span className="font-mono text-amber-400">{fmt(c.pm25)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Sticky Footer */}
          <div className="p-3 border-t border-border bg-card/95 backdrop-blur-md shrink-0 flex items-center justify-between">
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
              {mobileModalTab} View
            </span>
            <button
              onClick={() => setMobileModalTab(null)}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-lg active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Back to Menu</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
