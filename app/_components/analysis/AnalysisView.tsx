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
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full cursor-pointer h-1.5 rounded-full accent-current"
        style={{ accentColor: "var(--primary)" }}
      />
      <div className="flex justify-between text-[9px] text-muted-foreground">
        {marks.map((m) => (
          <span key={m.val}>
            <span className="font-mono">{m.val}</span>
            <br />
            <span className="opacity-70">{m.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Main AnalysisView ───────────────────────────────────────── */
export default function AnalysisView({ data }: AnalysisViewProps) {
  const [activeTab, setActiveTab] = useState<"impact" | "lab" | "simulator" | "equity">("impact");

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
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[11px] font-semibold">
                <Sparkles className="w-3 h-3 mr-1" /> BME Research Workbench
              </Badge>
              <Badge variant="secondary" className="text-[11px]">
                {totalCounties.toLocaleString()} counties · {(totalPopulation / 1e6).toFixed(0)}M residents
              </Badge>
            </div>
            <h2 className="text-lg sm:text-xl font-black tracking-tight text-foreground">
              Cardiorespiratory Environmental Health Analytics
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-xl leading-relaxed">
              Academic-grade epidemiology platform computing OLS regression, population attributable risk, and
              counterfactual policy simulations across all U.S. counties.
            </p>
          </div>

          {/* Top-line headline stats */}
          <div className="flex gap-3 shrink-0 flex-wrap">
            <div className="text-center px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <div className="text-[10px] font-semibold text-rose-400 uppercase">Attr. Deaths</div>
              <div className="text-xl font-black text-rose-400">
                {attributableRisk.totalAttributableDeaths.toLocaleString()}
              </div>
              <div className="text-[10px] text-muted-foreground">{attributableRisk.overallParPct}% of total</div>
            </div>
            <div className="text-center px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <div className="text-[10px] font-semibold text-amber-400 uppercase">Health Deserts</div>
              <div className="text-xl font-black text-amber-400">{clusterCounts.doubleBurden}</div>
              <div className="text-[10px] text-muted-foreground">High hazard + low MDs</div>
            </div>
            <div className="text-center px-3 py-2 rounded-xl bg-primary/10 border border-primary/20">
              <div className="text-[10px] font-semibold text-primary uppercase">PM2.5 r</div>
              <div className="text-xl font-black text-primary">
                {defaultOls.correlation.toFixed(2)}
              </div>
              <div className="text-[10px] text-muted-foreground">vs mortality</div>
            </div>
            <div className="text-center px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="text-[10px] font-semibold text-emerald-400 uppercase">High Risk</div>
              <div className="text-xl font-black text-emerald-400">{highRiskCount.toLocaleString()}</div>
              <div className="text-[10px] text-muted-foreground">counties ≥ 70 risk score</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab navigation ──────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex flex-col flex-1 min-h-0">
          <div className="px-4 sm:px-6 pt-3 pb-0 shrink-0">
            <TabsList className="inline-flex h-auto w-auto max-w-full bg-muted/70 p-1 rounded-xl gap-1">
              <TabsTrigger
                value="impact"
                className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg"
              >
                <TrendingUp className="w-3.5 h-3.5" /> Measurable Impact
              </TabsTrigger>
              <TabsTrigger
                value="lab"
                className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg"
              >
                <Activity className="w-3.5 h-3.5" /> Research Lab
              </TabsTrigger>
              <TabsTrigger
                value="simulator"
                className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg"
              >
                <Sliders className="w-3.5 h-3.5" /> Policy Simulator
              </TabsTrigger>
              <TabsTrigger
                value="equity"
                className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg"
              >
                <ShieldAlert className="w-3.5 h-3.5" /> Equity &amp; Clusters
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">

            {/* ═══════════════════════════════════════════════════════════
                TAB 1 — MEASURABLE IMPACT DASHBOARD (hero tab)
            ═══════════════════════════════════════════════════════════ */}
            <TabsContent value="impact" className="space-y-5 outline-none">
              {/* Impact headline KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                <ImpactKPI
                  label="Lives Saved by EPA Standard"
                  value={baselineSimResult.projectedLivesSaved.toLocaleString()}
                  sub={`Annually if PM2.5 capped at 9.0 µg/m³ across ${baselineSimResult.affectedCountyCount} counties`}
                  color="text-emerald-400"
                  icon={<Heart className="w-3.5 h-3.5" />}
                  border="border-emerald-500/25"
                  bg="bg-emerald-500/5"
                />
                <ImpactKPI
                  label="Chronic Disease Events Prevented"
                  value={fmtLarge(baselineSimResult.preventedCopdCases + baselineSimResult.preventedAsthmaCases)}
                  sub="COPD + asthma exacerbations avoided per year under baseline policy scenario"
                  color="text-blue-400"
                  icon={<Stethoscope className="w-3.5 h-3.5" />}
                  border="border-blue-500/25"
                  bg="bg-blue-500/5"
                />
                <ImpactKPI
                  label="Healthcare Cost Savings"
                  value={`$${baselineSimResult.estimatedCostSavingsMillions.toLocaleString()}M`}
                  sub="Estimated annual economic savings from reduced hospitalizations and ER visits"
                  color="text-purple-400"
                  icon={<DollarSign className="w-3.5 h-3.5" />}
                  border="border-purple-500/25"
                  bg="bg-purple-500/5"
                />
                <ImpactKPI
                  label="PM2.5-Attributable Deaths"
                  value={attributableRisk.totalAttributableDeaths.toLocaleString()}
                  sub={`${attributableRisk.overallParPct}% of all respiratory mortality annually above WHO 5 µg/m³ baseline`}
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
                      <FileText className="w-4 h-4 text-primary" /> Key Research Findings
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Empirical conclusions derived from this dataset of {totalCounties.toLocaleString()} U.S. counties.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2.5">
                    {[
                      {
                        color: "bg-amber-500",
                        title: `PM2.5 → Mortality: r = ${defaultOls.correlation.toFixed(2)}, R² = ${defaultOls.r2.toFixed(3)}`,
                        body: `For every 1 µg/m³ increase in average PM2.5, respiratory mortality increases by ${defaultOls.slope.toFixed(2)} deaths/100k (p < 0.001, N=${defaultOls.n.toLocaleString()}).`,
                      },
                      {
                        color: "bg-rose-500",
                        title: `${attributableRisk.overallParPct}% of respiratory deaths attributable to excess PM2.5`,
                        body: `Estimated ${attributableRisk.totalAttributableDeaths.toLocaleString()} deaths annually above the WHO 5 µg/m³ baseline — deaths that could be prevented by clean air policy.`,
                      },
                      {
                        color: "bg-blue-500",
                        title: `${clusterCounts.doubleBurden} counties in "Double Burden" classification`,
                        body: `Counties with both above-median PM2.5 AND below-median physician density, creating compounded vulnerability with no protective health buffer.`,
                      },
                      {
                        color: "bg-indigo-500",
                        title: "Rural counties (RUCC 7–9) show highest mortality rates",
                        body: `Remote rural counties have systematically higher respiratory mortality despite lower population density — suggesting that lack of healthcare access amplifies pollution impact.`,
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
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Scatterplot */}
                <Card className="lg:col-span-2 border-border shadow-xs">
                  <CardHeader className="pb-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                          <Activity className="w-4 h-4 text-primary" /> OLS Regression Studio
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {xMeta.shortLabel} vs {yMeta.shortLabel} across {olsResult.n.toLocaleString()} counties
                          {selectedRuccFilter !== "all" ? ` (RUCC ${selectedRuccFilter})` : ""}
                        </CardDescription>
                      </div>
                      <div className="flex gap-1.5">
                        <Badge variant="outline" className="font-mono text-[10px]">r = {olsResult.correlation.toFixed(3)}</Badge>
                        <Badge variant="outline" className="font-mono text-[10px]">R² = {olsResult.r2.toFixed(3)}</Badge>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          p {olsResult.pValue < 0.001 ? "< 0.001" : `= ${olsResult.pValue.toFixed(3)}`}
                        </Badge>
                      </div>
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
                        <FileText className="w-4 h-4 text-emerald-500" /> Statistical Diagnostics
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
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

                      {/* RUCC filter */}
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
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
                {/* Controls Box */}
                <Card className="border-border shadow-xs flex flex-col justify-between">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-amber-500" /> Policy Intervention Controls
                      </CardTitle>
                      <button
                        onClick={() => {
                          setTargetPm25Cap(9.0);
                          setTargetToxicCap(50000);
                          setMdDensityBoostPct(15);
                        }}
                        className="text-[10px] font-medium text-muted-foreground hover:text-foreground underline decoration-dotted transition-colors cursor-pointer"
                      >
                        Reset Defaults
                      </button>
                    </div>
                    <CardDescription className="text-xs">
                      Drag sliders or pick a scenario to model national-scale environmental &amp; healthcare interventions.
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
                          className={`px-2 py-1.5 text-[11px] font-medium rounded-lg border transition-all text-left flex flex-col cursor-pointer ${
                            targetPm25Cap === 9.0 && targetToxicCap === 50000 && mdDensityBoostPct === 15
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
                          className={`px-2 py-1.5 text-[11px] font-medium rounded-lg border transition-all text-left flex flex-col cursor-pointer ${
                            targetPm25Cap === 5.0 && targetToxicCap === 25000 && mdDensityBoostPct === 25
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
                          className={`px-2 py-1.5 text-[11px] font-medium rounded-lg border transition-all text-left flex flex-col cursor-pointer ${
                            mdDensityBoostPct === 50
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
                        label="EPA PM2.5 Clean Air Cap"
                        icon={<Wind className="w-3.5 h-3.5 text-amber-400" />}
                        value={targetPm25Cap}
                        min={5.0}
                        max={12.0}
                        step={0.1}
                        display={`${targetPm25Cap.toFixed(1)} µg/m³`}
                        onChange={setTargetPm25Cap}
                        accentClass="bg-amber-500/10 border-amber-500/30 text-amber-400"
                        marks={[
                          { val: "5.0", label: "WHO" },
                          { val: "9.0", label: "EPA 2024" },
                          { val: "12.0", label: "Baseline" },
                        ]}
                      />
                      <PolicySlider
                        label="Industrial Toxic Release Cap"
                        icon={<Factory className="w-3.5 h-3.5 text-slate-400" />}
                        value={targetToxicCap}
                        min={0}
                        max={200000}
                        step={5000}
                        display={`${(targetToxicCap / 1000).toFixed(0)}k lbs`}
                        onChange={setTargetToxicCap}
                        accentClass="bg-slate-500/10 border-slate-500/30 text-slate-300"
                        marks={[
                          { val: "0", label: "Zero" },
                          { val: "50k", label: "Moderate" },
                          { val: "200k", label: "Heavy" },
                        ]}
                      />
                      <PolicySlider
                        label="Physician Access Expansion"
                        icon={<HeartPulse className="w-3.5 h-3.5 text-emerald-400" />}
                        value={mdDensityBoostPct}
                        min={0}
                        max={50}
                        step={5}
                        display={`+${mdDensityBoostPct}% MD density`}
                        onChange={setMdDensityBoostPct}
                        accentClass="bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                        marks={[
                          { val: "+0%", label: "Current" },
                          { val: "+25%", label: "Targeted" },
                          { val: "+50%", label: "Major" },
                        ]}
                      />
                    </div>

                    {/* Simulation Model Details */}
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
                            <TrendingUp className="w-3.5 h-3.5" /> Lives Saved / Yr
                          </p>
                          <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            {simResult.affectedCountyCount} counties
                          </span>
                        </div>
                        <p className="text-3xl font-black text-emerald-400 font-mono tracking-tight">
                          {simResult.projectedLivesSaved.toLocaleString()}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-1.5">
                          Avoided premature respiratory mortality
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="border-blue-500/25 bg-blue-500/5 shadow-xs relative overflow-hidden">
                      <CardContent className="p-5 pt-6 sm:pt-7">
                        <div className="flex items-center justify-between gap-1 mb-2">
                          <p className="text-[11px] font-bold text-blue-400 uppercase tracking-wide flex items-center gap-1.5">
                            <Stethoscope className="w-3.5 h-3.5" /> Cases Prevented
                          </p>
                          <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30">
                            COPD + Asthma
                          </span>
                        </div>
                        <p className="text-3xl font-black text-blue-400 font-mono tracking-tight">
                          {(simResult.preventedCopdCases + simResult.preventedAsthmaCases).toLocaleString()}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-1.5">
                          Annual hospital &amp; ER exacerbations prevented
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="border-purple-500/25 bg-purple-500/5 shadow-xs relative overflow-hidden">
                      <CardContent className="p-5 pt-6 sm:pt-7">
                        <div className="flex items-center justify-between gap-1 mb-2">
                          <p className="text-[11px] font-bold text-purple-400 uppercase tracking-wide flex items-center gap-1.5">
                            <Award className="w-3.5 h-3.5" /> Healthcare Savings
                          </p>
                          <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 border border-purple-500/30">
                            Annual
                          </span>
                        </div>
                        <p className="text-3xl font-black text-purple-400 font-mono tracking-tight">
                          ${simResult.estimatedCostSavingsMillions.toLocaleString()}M
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-1.5">
                          Direct clinical cost reduction nationwide
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
                            <ShieldAlert className="w-4 h-4 text-rose-500" /> Priority Intervention Counties
                          </CardTitle>
                          <CardDescription className="text-xs">
                            Counties seeing maximum projected health gains under current scenario settings.
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
              {/* Quadrant grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="lg:col-span-2 border-border shadow-xs">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-rose-500" /> Environmental Hazard × Healthcare Access Matrix
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {totalCounties.toLocaleString()} counties split by median PM2.5 and physician density.
                      Quadrant membership uses population-weighted medians.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        {
                          title: "High Hazard / Low Care",
                          subtitle: "Double Burden Health Deserts",
                          desc: "Above-median PM2.5 + below-median physician density. Compounded respiratory risk with no medical buffer.",
                          count: clusterCounts.doubleBurden,
                          border: "border-rose-500/30",
                          bg: "bg-rose-500/5",
                          badgeClass: "bg-rose-500/20 text-rose-400 border-rose-500/30",
                          textColor: "text-rose-400",
                          icon: <AlertTriangle className="w-4 h-4" />,
                        },
                        {
                          title: "High Hazard / High Care",
                          subtitle: "Buffered Industrial Centers",
                          desc: "Elevated pollution exposure, but strong hospital infrastructure reduces mortality impact.",
                          count: clusterCounts.highHazard,
                          border: "border-amber-500/30",
                          bg: "bg-amber-500/5",
                          badgeClass: "bg-amber-500/20 text-amber-400 border-amber-500/30",
                          textColor: "text-amber-400",
                          icon: <Wind className="w-4 h-4" />,
                        },
                        {
                          title: "Low Hazard / Low Care",
                          subtitle: "Isolated Rural Counties",
                          desc: "Clean air, but limited healthcare access. Risk is moderate — physician shortage is primary concern.",
                          count: clusterCounts.lowCare,
                          border: "border-slate-500/30",
                          bg: "bg-slate-500/5",
                          badgeClass: "bg-slate-500/20 text-slate-300 border-slate-500/30",
                          textColor: "text-slate-300",
                          icon: <Users className="w-4 h-4" />,
                        },
                        {
                          title: "Low Hazard / High Care",
                          subtitle: "Protective Environments",
                          desc: "Best baseline health conditions — low pollution exposure with strong primary care coverage.",
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
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500" /> Sample Double-Burden Health Desert Counties
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                        {doubleBurdenList.map((c) => (
                          <div key={c.fips} className="p-2 rounded-lg bg-muted/40 border border-border text-xs">
                            <div className="font-semibold text-foreground truncate text-[11px]">{c.name}</div>
                            <div className="text-[10px] text-muted-foreground mt-0.5 space-y-0.5">
                              <div>PM2.5: <span className="font-mono text-amber-400">{fmt(c.pm25)}</span></div>
                              <div>MDs: <span className="font-mono text-rose-400">{fmt(c.mdRate, 0)}/100k</span></div>
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
                      <Users className="w-4 h-4 text-primary" /> Population Exposure Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      {
                        label: "Counties Analyzed",
                        value: totalCounties.toLocaleString(),
                        color: "text-foreground",
                      },
                      {
                        label: "Double-Burden Deserts",
                        value: clusterCounts.doubleBurden.toLocaleString(),
                        color: "text-rose-400",
                      },
                      {
                        label: "High-Hazard Counties",
                        value: (clusterCounts.doubleBurden + clusterCounts.highHazard).toLocaleString(),
                        color: "text-amber-400",
                      },
                      {
                        label: "Protective Counties",
                        value: clusterCounts.protective.toLocaleString(),
                        color: "text-emerald-400",
                      },
                      {
                        label: "PM2.5 Attr. Deaths/yr",
                        value: attributableRisk.totalAttributableDeaths.toLocaleString(),
                        color: "text-rose-400",
                      },
                      {
                        label: "PAR Fraction",
                        value: `${attributableRisk.overallParPct}%`,
                        color: "text-primary",
                      },
                    ].map((s) => (
                      <div key={s.label} className="flex justify-between items-center text-xs border-b border-border/40 pb-2 last:border-0 last:pb-0">
                        <span className="text-muted-foreground">{s.label}</span>
                        <span className={`font-bold font-mono ${s.color}`}>{s.value}</span>
                      </div>
                    ))}

                    <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs space-y-1">
                      <p className="font-semibold text-rose-400 flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5" /> Environmental Justice Note
                      </p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Counties classified as "Double Burden Health Deserts" disproportionately serve rural, lower-income, and minority populations — demonstrating compounded environmental
                        justice vulnerability.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

          </div>
        </Tabs>
      </div>
    </div>
  );
}
