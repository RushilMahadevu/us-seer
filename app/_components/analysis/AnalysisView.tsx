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
  Group,
  Sliders,
  Replace,
  Sparkles,
  Award,
  Users,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Rocket,
  HeartPulse,
  ChartLine,
  Factory,
  Info,
  Heart,
  DollarSign,
  Map,
  X,
  ChevronRight,
  Maximize2,
  ScanSearch,
  Microscope,
  Landmark,
  Mail,
  Copy,
  Check,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from "@/app/_components/ui/dialog";

interface AnalysisViewProps {
  data: CountyDataMap;
  onOpenExporter?: (fipsA?: string) => void;
  selectedFips?: string | null;
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

const STATE_PREFIX_MAP: Record<string, string> = {
  "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA", "08": "CO", "09": "CT", "10": "DE", "11": "DC", "12": "FL",
  "13": "GA", "15": "HI", "16": "ID", "17": "IL", "18": "IN", "19": "IA", "20": "KS", "21": "KY", "22": "LA", "23": "ME",
  "24": "MD", "25": "MA", "26": "MI", "27": "MN", "28": "MS", "29": "MO", "30": "MT", "31": "NE", "32": "NV", "33": "NH",
  "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND", "39": "OH", "40": "OK", "41": "OR", "42": "PA", "44": "RI",
  "45": "SC", "46": "SD", "47": "TN", "48": "TX", "49": "UT", "50": "VT", "51": "VA", "53": "WA", "54": "WV", "55": "WI", "56": "WY"
};

type AnomalyCounty = {
  fips: string;
  name: string;
  stateAbbr: string | null;
  pm25: number;
  mortality: number;
  predicted: number;
  residual: number;
  medianIncome: number | undefined;
  mdRate: number | undefined;
  smokingPrev: number | undefined;
  pctPoverty: number | undefined;
  pctUninsured: number | undefined;
  rucc: number | undefined;
};

function getStateAbbrFromFips(fips: string): string | null {
  return STATE_PREFIX_MAP[fips.padStart(5, "0").substring(0, 2)] || null;
}

function formatCountyLabel(county: CountyData, fips: string): string {
  const stateAbbr = getStateAbbrFromFips(fips);
  const countyName = county.County_Name || `FIPS ${fips}`;
  return stateAbbr ? `${countyName}, ${stateAbbr}` : countyName;
}

function buildAnomalyContext(county: CountyData, residual: number): string {
  const notes: string[] = [];

  if (residual < 0) {
    if ((county.mdRate ?? 0) >= 20) notes.push("dense physician access");
    if ((county.medianIncome ?? 0) >= 90000) notes.push("higher income");
    if ((county.pctUninsured ?? 100) <= 8) notes.push("low uninsured rate");
    if ((county.medianAge ?? 0) <= 38) notes.push("younger population");
    if ((county.rucc ?? 10) <= 3) notes.push("urban healthcare access");
  } else {
    if ((county.smokingPrev ?? 0) >= 18) notes.push("high smoking prevalence");
    if ((county.pctPoverty ?? 0) >= 20) notes.push("higher poverty");
    if ((county.pctUninsured ?? 0) >= 12) notes.push("more uninsured residents");
    if ((county.mdRate ?? 100) <= 15) notes.push("limited physician access");
    if ((county.rucc ?? 0) >= 7) notes.push("rural healthcare desert");
  }

  if (notes.length === 0) {
    return residual < 0
      ? "Possible protective factors beyond pollution exposure"
      : "Likely driven by non-pollution risk factors";
  }

  return notes.slice(0, 3).join(" · ");
}

function formatAnomalyResidual(residual: number): string {
  return `${residual > 0 ? "+" : ""}${fmt(residual, 1)} residual`;
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
export default function AnalysisView({ data, onOpenExporter, selectedFips }: AnalysisViewProps) {
  const [activeTab, setActiveTab] = useState<"impact" | "lab" | "simulator" | "equity" | "findings">("impact");
  const [labSubTab, setLabSubTab] = useState<"regression" | "rucc" | "diagnostics">("regression");
  const [mobileModalTab, setMobileModalTab] = useState<"impact" | "lab" | "simulator" | "equity" | "findings" | null>(null);
  const { isSimpleMode } = useSimpleMode();

  /* Grayscale loading transition state when switching tabs or parameters */
  const [isTabSwitching, setIsTabSwitching] = useState(false);

  const handleTabChange = React.useCallback((newTab: "impact" | "lab" | "simulator" | "equity" | "findings") => {
    if (newTab === activeTab) return;
    setIsTabSwitching(true);
    setActiveTab(newTab);
    const timer = setTimeout(() => setIsTabSwitching(false), 300);
    return () => clearTimeout(timer);
  }, [activeTab]);

  const handleLabSubTabChange = React.useCallback((newSubTab: "regression" | "rucc" | "diagnostics") => {
    if (newSubTab === labSubTab) return;
    setIsTabSwitching(true);
    setLabSubTab(newSubTab);
    const timer = setTimeout(() => setIsTabSwitching(false), 300);
    return () => clearTimeout(timer);
  }, [labSubTab]);

  /* Research Lab state */
  const [xAxisKey, setXAxisKey] = useState<keyof CountyData>("pm25Avg");
  const [yAxisKey, setYAxisKey] = useState<keyof CountyData>("mortalityRate");
  const [selectedRuccFilter, setSelectedRuccFilter] = useState<number | "all">("all");

  React.useEffect(() => {
    setIsTabSwitching(true);
    const timer = setTimeout(() => setIsTabSwitching(false), 280);
    return () => clearTimeout(timer);
  }, [selectedFips, xAxisKey, yAxisKey, selectedRuccFilter]);

  /* Simulator state */
  const [targetPm25Cap, setTargetPm25Cap] = useState<number>(9.0);
  const [targetToxicCap, setTargetToxicCap] = useState<number>(50000);
  const [mdDensityBoostPct, setMdDensityBoostPct] = useState<number>(15);
  const [simScope, setSimScope] = useState<"county" | "state" | "national">("national");
  const [simState, setSimState] = useState<string>("MS");
  const [isBriefingModalOpen, setIsBriefingModalOpen] = useState(false);
  const [copiedBriefText, setCopiedBriefText] = useState(false);

  /* Selected county object helper */
  const selectedCounty = useMemo(() => {
    if (!selectedFips || !data) return null;
    return data[selectedFips] || data[selectedFips.padStart(5, "0")] || null;
  }, [selectedFips, data]);

  /* Derive 2-letter state code from selected FIPS */
  const selectedStateAbbr = useMemo(() => {
    if (!selectedFips) return null;
    return getStateAbbrFromFips(selectedFips);
  }, [selectedFips]);

  /* Auto-sync state scope state when selected county changes */
  React.useEffect(() => {
    if (selectedStateAbbr) {
      setSimState(selectedStateAbbr);
    }
  }, [selectedStateAbbr]);

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
    () =>
      runCounterfactualSimulation(data, targetPm25Cap, targetToxicCap, mdDensityBoostPct, {
        scope: simScope,
        selectedFips: selectedFips || undefined,
        selectedState: simState,
      }),
    [data, targetPm25Cap, targetToxicCap, mdDensityBoostPct, simScope, selectedFips, simState]
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

  /* Anomaly counties for discovery section */
  const anomalyCounties = useMemo(() => {
    const points = defaultOls.points
      .map((point) => {
        const county = data[point.fips] || data[point.fips.padStart(5, "0")];
        if (!county) return null;
        const predicted = defaultOls.slope * point.x + defaultOls.intercept;
        const residual = point.y - predicted;
        return {
          fips: point.fips,
          name: formatCountyLabel(county, point.fips),
          stateAbbr: getStateAbbrFromFips(point.fips),
          pm25: point.x,
          mortality: point.y,
          predicted,
          residual,
          medianIncome: county.medianIncome,
          mdRate: county.mdRate,
          smokingPrev: county.smokingPrev,
          pctPoverty: county.pctPoverty,
          pctUninsured: county.pctUninsured,
          rucc: county.rucc,
        };
      })
      .filter((point): point is AnomalyCounty => point !== null);

    const pm25TopQuartile = [...points].map((p) => p.pm25).sort((a, b) => a - b)[Math.floor(points.length * 0.75)] ?? 0;
    const pm25BottomQuartile = [...points].map((p) => p.pm25).sort((a, b) => a - b)[Math.floor(points.length * 0.25)] ?? 0;
    const residuals = [...points].map((p) => p.residual).sort((a, b) => a - b);
    const lowResidualThreshold = residuals[Math.floor(residuals.length * 0.1)] ?? 0;
    const highResidualThreshold = residuals[Math.floor(residuals.length * 0.9)] ?? 0;

    const highPollutionLowMortality = points
      .filter((p) => p.pm25 >= pm25TopQuartile && p.residual <= lowResidualThreshold)
      .sort((a, b) => a.residual - b.residual)
      .slice(0, 3)
      .map((point) => ({
        ...point,
        context: buildAnomalyContext(data[point.fips] || data[point.fips.padStart(5, "0")], point.residual),
      }));

    const lowPollutionHighMortality = points
      .filter((p) => p.pm25 <= pm25BottomQuartile && p.residual >= highResidualThreshold)
      .sort((a, b) => b.residual - a.residual)
      .slice(0, 3)
      .map((point) => ({
        ...point,
        context: buildAnomalyContext(data[point.fips] || data[point.fips.padStart(5, "0")], point.residual),
      }));

    return {
      highPollutionLowMortality,
      lowPollutionHighMortality,
    };
  }, [data, defaultOls.intercept, defaultOls.points, defaultOls.slope]);

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

  /* Highest-risk county as default export target when no county is selected on map */
  const topRiskFips = useMemo(() => {
    let best: string | null = null;
    let bestRisk = -Infinity;
    Object.entries(data).forEach(([fips, c]) => {
      const r = c.overallRisk ?? 0;
      if (r > bestRisk) { bestRisk = r; best = fips; }
    });
    return best ?? "48201";
  }, [data]);

  /* Resolved export FIPS: prefer the map-selected county, fall back to highest-risk */
  const exportFips = selectedFips ?? topRiskFips;
  const exportCountyName = data[exportFips]?.County_Name ?? exportFips;

  /* Helper to render tab scope banner */
  const renderScopeHeader = (tabKey: "impact" | "lab" | "simulator" | "equity" | "findings") => {
    if (tabKey === "simulator") {
      // Policy Simulator is the ONLY tab that actively filters calculations by scope
      if (simScope === "county" && selectedCounty) {
        return (
          <div className="p-3 px-4 rounded-xl border border-amber-500/30 bg-amber-500/10 backdrop-blur-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 mb-4 shadow-2xs">
            <div className="flex items-center gap-2.5 flex-wrap">
              <Badge className="bg-amber-500 text-black font-extrabold text-[10px] tracking-wide uppercase px-2 py-0.5 shadow-2xs">
                🎯 LOCAL COUNTY SIMULATION
              </Badge>
              <span className="text-xs sm:text-sm font-bold text-foreground">
                {selectedCounty.County_Name}
              </span>
              <span className="text-xs font-mono text-muted-foreground">
                (FIPS {selectedFips})
              </span>
            </div>
            <div className="text-[11px] font-medium text-amber-300">
              Policy simulation parameters filtered <strong>strictly to {selectedCounty.County_Name?.split(",")[0] ?? "Selected County"}</strong>.
            </div>
          </div>
        );
      }
      if (simScope === "state") {
        return (
          <div className="p-3 px-4 rounded-xl border border-purple-500/30 bg-purple-500/10 backdrop-blur-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 mb-4 shadow-2xs">
            <div className="flex items-center gap-2.5 flex-wrap">
              <Badge className="bg-purple-500 text-white font-extrabold text-[10px] tracking-wide uppercase px-2 py-0.5 shadow-2xs">
                🏛️ STATEWIDE SIMULATION
              </Badge>
              <span className="text-xs sm:text-sm font-bold text-foreground">
                {simState} Statewide Scope
              </span>
            </div>
            <div className="text-[11px] font-medium text-purple-300">
              Policy simulation parameters applied across <strong>all counties in {simState}</strong>.
            </div>
          </div>
        );
      }
      return (
        <div className="p-2.5 px-4 rounded-xl border border-sky-500/30 bg-sky-500/10 backdrop-blur-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2.5 flex-wrap">
            <Badge variant="outline" className="border-sky-500/40 bg-sky-500/20 text-sky-300 font-bold text-[10px] tracking-wide uppercase px-2 py-0.5">
              🌐 NATIONAL SIMULATION
            </Badge>
            <span className="text-xs text-muted-foreground">
              Policy simulation parameters applied across <strong>all {totalCounties.toLocaleString()} U.S. counties</strong>.
            </span>
          </div>
          <div className="text-[11px] text-sky-400 font-medium">
            Use scope toggle below to simulate a specific County or State.
          </div>
        </div>
      );
    }

    // For all other tabs (Impact, Lab, Equity, Findings), calculations are NATIONAL dataset level
    const tabTitles: Record<string, string> = {
      impact: isSimpleMode ? "Measurable Impact" : "Nationwide Health Impact",
      lab: isSimpleMode ? "Research Lab" : "National OLS Regression Studio",
      equity: isSimpleMode ? "Equity & Clusters" : "National Health Desert Matrix",
      findings: isSimpleMode ? "Key Findings" : "National Empirical Findings",
    };

    return (
      <div className="p-2.5 px-4 rounded-xl border border-border/70 bg-card/40 backdrop-blur-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2.5 flex-wrap">
          <Badge variant="outline" className="border-sky-500/40 bg-sky-500/10 text-sky-400 font-bold text-[10px] tracking-wide uppercase px-2 py-0.5">
            🌐 NATIONAL DATASET
          </Badge>
          <span className="text-xs text-muted-foreground">
            <strong>{tabTitles[tabKey]}</strong> computes stats across all <strong>{totalCounties.toLocaleString()} U.S. counties</strong>.
          </span>
        </div>

        {selectedCounty ? (
          <div className="flex items-center gap-1.5 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-lg shrink-0">
            <span className="font-bold text-[10px] uppercase tracking-wider text-amber-400">Map Focus:</span>
            <span className="font-semibold">{selectedCounty.County_Name?.split(",")[0]}</span>
            <span className="text-[10px] text-muted-foreground font-mono">({selectedFips})</span>
          </div>
        ) : (
          <div className="text-[11px] text-muted-foreground font-medium shrink-0">
            Select a county on the map to highlight its values.
          </div>
        )}
      </div>
    );
  };

  /* ── Render ──────────────────────────────────────────────────── */
  return (
    <div className="flex-1 h-full overflow-y-auto space-y-5 animate-in fade-in-50 duration-300 pb-8">
      {/* ── Hero Header Banner ──────────────────────────────────────── */}
      <div className="relative rounded-xl border border-border bg-gradient-to-r from-card via-card/90 to-primary/5 p-4 sm:p-6 shadow-sm overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 -translate-y-6 translate-x-6 w-64 h-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground">
                {totalCounties.toLocaleString()} Counties · {(totalPopulation / 1e6).toFixed(0)}M Residents
              </span>
              {onOpenExporter && (
                <button
                  onClick={() => onOpenExporter(exportFips)}
                  className="cursor-pointer px-2.5 py-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs"
                  title={`Export PDF brief for ${exportCountyName}`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Export: {exportCountyName}</span>
                </button>
              )}
            </div>
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-foreground">
              {isSimpleMode
                ? "What does the health data tell us?"
                : "Cardiorespiratory Environmental Health Analytics"}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {isSimpleMode
                ? "We looked at health and pollution data for every U.S. county to find out where people are most at risk — and what could help."
                : "Academic-grade epidemiology platform computing OLS regression, population attributable risk, and counterfactual policy simulations across all U.S. counties."}
            </p>
          </div>

          {/* Quick Metrics KPI Pill */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-2 lg:grid-cols-4 gap-2.5 shrink-0">
            <div className="p-2.5 rounded-lg border border-border bg-background/60 backdrop-blur-xs text-center">
              <div className="text-base sm:text-lg font-extrabold text-rose-400">
                {attributableRisk.totalAttributableDeaths.toLocaleString()}
              </div>
              <div className="text-[10px] text-muted-foreground font-medium">
                {isSimpleMode ? "Deaths / Year" : "Attr. Deaths"}
              </div>
            </div>
            <div className="p-2.5 rounded-lg border border-border bg-background/60 backdrop-blur-xs text-center">
              <div className="text-base sm:text-lg font-extrabold text-amber-400">
                {clusterCounts.doubleBurden}
              </div>
              <div className="text-[10px] text-muted-foreground font-medium">
                {isSimpleMode ? "Underserved" : "Health Deserts"}
              </div>
            </div>
            <div className="p-2.5 rounded-lg border border-border bg-background/60 backdrop-blur-xs text-center">
              <div className="text-base sm:text-lg font-extrabold text-sky-400">
                {defaultOls.correlation.toFixed(2)}
              </div>
              <div className="text-[10px] text-muted-foreground font-medium">
                {isSimpleMode ? "Correlation" : "PM2.5 r"}
              </div>
            </div>
            <div className="p-2.5 rounded-lg border border-border bg-background/60 backdrop-blur-xs text-center">
              <div className="text-base sm:text-lg font-extrabold text-emerald-400">
                {highRiskCount.toLocaleString()}
              </div>
              <div className="text-[10px] text-muted-foreground font-medium">
                {isSimpleMode ? "High-Risk" : "High Risk (≥70)"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Active Selection Banner on Analysis Tab ─────────────────── */}
      {selectedCounty ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 sm:p-4 backdrop-blur-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
              <Map className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Active Map Selection</span>
                <Badge variant="outline" className="text-[10px] font-mono border-amber-500/40 text-amber-300 px-1.5 py-0">
                  FIPS {selectedFips}
                </Badge>
              </div>
              <h2 className="text-base sm:text-lg font-black text-foreground tracking-tight">
                {selectedCounty.County_Name}
              </h2>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                <span>Pop: <strong className="text-foreground">{selectedCounty.population?.toLocaleString() ?? "N/A"}</strong></span>
                <span>•</span>
                <span>PM₂.₅: <strong className="text-amber-300">{selectedCounty.pm25Avg ? `${selectedCounty.pm25Avg} µg/m³` : "N/A"}</strong></span>
                <span>•</span>
                <span>Mortality: <strong className="text-rose-300">{selectedCounty.mortalityRate ? `${selectedCounty.mortalityRate} / 100k` : "N/A"}</strong></span>
                {selectedCounty.overallRisk !== undefined && (
                  <>
                    <span>•</span>
                    <span>Risk Index: <strong className="text-violet-300">{selectedCounty.overallRisk}/100</strong></span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end md:self-center shrink-0">
            <button
              onClick={() => {
                setActiveTab("simulator");
                setSimScope("county");
              }}
              className="cursor-pointer px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs transition-all flex items-center gap-1.5 shadow-2xs"
            >
              <Replace className="w-3.5 h-3.5" />
              <span>Simulate Policy for {selectedCounty.County_Name?.split(",")[0] ?? "County"}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-border/60 bg-card/40 px-3.5 py-2.5 text-xs text-muted-foreground flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Info className="w-4 h-4 text-sky-400 shrink-0" />
            <span>No specific county selected on map — showing national aggregate data ({totalCounties.toLocaleString()} counties). Select any county on the map to filter analytics.</span>
          </span>
        </div>
      )}

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
              icon: <Rocket className="w-5 h-5 text-emerald-400" />,
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
              icon: <ChartLine className="w-5 h-5 text-blue-400" />,
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
              icon: <Replace className="w-5 h-5 text-purple-400" />,
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
              icon: <Group className="w-5 h-5 text-rose-400" />,
              border: "border-rose-500/30",
              bg: "bg-gradient-to-br from-rose-500/10 via-card to-card",
              badgeColor: "bg-rose-500/15 text-rose-400 border-rose-500/30",
            },
            {
              id: "findings",
              title: isSimpleMode ? "What We Found" : "Key Findings",
              subtitle: isSimpleMode
                ? "The discoveries US-SEER uncovered from federal data"
                : "Quantified empirical results across 2,953 counties",
              badge: "74 EJ Hotspots",
              icon: <ScanSearch className="w-5 h-5 text-amber-400" />,
              border: "border-amber-500/30",
              bg: "bg-gradient-to-br from-amber-500/10 via-card to-card",
              badgeColor: "bg-amber-500/15 text-amber-400 border-amber-500/30",
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
      <Tabs value={activeTab} onValueChange={(v) => handleTabChange(v as typeof activeTab)} className="hidden sm:flex flex-col flex-1 min-h-0">
        <div className="px-3 sm:px-6 pt-3 pb-0 shrink-0">
          <TabsList className="flex items-center w-full max-w-full bg-muted/70 p-1 rounded-xl gap-1 overflow-x-auto scrollbar-none">
            <TabsTrigger
              value="impact"
              className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg shrink-0 whitespace-nowrap"
            >
              <Rocket className="w-3.5 h-3.5" />
              {isSimpleMode ? "Big Picture" : "Measurable Impact"}
            </TabsTrigger>
            <TabsTrigger
              value="lab"
              className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg shrink-0 whitespace-nowrap"
            >
              <ChartLine className="w-3.5 h-3.5" />
              {isSimpleMode ? "Explorer" : "Research Lab"}
            </TabsTrigger>
            <TabsTrigger
              value="simulator"
              className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg shrink-0 whitespace-nowrap"
            >
              <Replace className="w-3.5 h-3.5" />
              {isSimpleMode ? "What If?" : "Policy Simulator"}
            </TabsTrigger>
            <TabsTrigger
              value="equity"
              className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg shrink-0 whitespace-nowrap"
            >
              <Group className="w-3.5 h-3.5" />
              {isSimpleMode ? "Who's at Risk?" : "Equity & Clusters"}
            </TabsTrigger>
            <TabsTrigger
              value="findings"
              className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg shrink-0 whitespace-nowrap"
            >
              <ScanSearch className="w-3.5 h-3.5" />
              {isSimpleMode ? "What We Found" : "Key Findings"}
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 relative">
          {/* Grayscale loading animation overlay while switching tabs/filters */}
          <AnimatePresence>
            {isTabSwitching && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-background/55 backdrop-blur-xs rounded-2xl pointer-events-none"
              >
                <div className="flex flex-col items-center gap-3 px-6 py-4 rounded-2xl bg-zinc-900/90 border border-zinc-700/60 shadow-2xl text-zinc-100">
                  <div className="flex items-center gap-2.5">
                    <Loader2 className="w-4 h-4 text-zinc-300 animate-spin" />
                    <span className="text-xs font-bold tracking-tight text-zinc-200">
                      {isSimpleMode ? "Switching View..." : "Loading Analytics Module..."}
                    </span>
                  </div>
                  {/* Monochromatic gray pulse loading bar */}
                  <div className="flex items-center gap-1.5 w-36">
                    <div className="h-1.5 flex-1 rounded-full bg-zinc-600 animate-pulse" />
                    <div className="h-1.5 flex-1 rounded-full bg-zinc-500 animate-pulse delay-75" />
                    <div className="h-1.5 flex-1 rounded-full bg-zinc-600 animate-pulse delay-150" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className={`transition-all duration-300 ${isTabSwitching ? "grayscale contrast-75 opacity-40 blur-[0.5px] pointer-events-none scale-[0.996]" : "grayscale-0 opacity-100 scale-100"}`}>

          {/* ═══════════════════════════════════════════════════════════
                TAB 1 — MEASURABLE IMPACT DASHBOARD (hero tab)
            ═══════════════════════════════════════════════════════════ */}
          <TabsContent value="impact" className="space-y-5 outline-none">
            {renderScopeHeader("impact")}
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
                TAB 2 — EPIDEMIOLOGICAL RESEARCH LAB (sub-tabbed)
            ═══════════════════════════════════════════════════════════ */}
          <TabsContent value="lab" className="space-y-4 outline-none">
            {renderScopeHeader("lab")}

            {/* ── Lab Sub-Tab Navigation ────────────────────────────── */}
            <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl border border-border w-full overflow-x-auto scrollbar-none">
              {([
                { id: "regression", icon: <ChartLine className="w-3.5 h-3.5" />, label: isSimpleMode ? "Compare Factors" : "Regression Studio" },
                { id: "rucc", icon: <Map className="w-3.5 h-3.5" />, label: isSimpleMode ? "Rural vs Urban" : "RUCC Analysis" },
                { id: "diagnostics", icon: <Microscope className="w-3.5 h-3.5" />, label: isSimpleMode ? "Stats Details" : "Diagnostics" },
              ] as const).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setLabSubTab(tab.id)}
                  className={`cursor-pointer flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${labSubTab === tab.id
                    ? "bg-background text-foreground shadow-sm border border-border"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── Sub-Tab 1: Regression Studio ─────────────────────── */}
            {labSubTab === "regression" && (
              <div className="space-y-4">
                {isSimpleMode && (
                  <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 text-xs text-foreground leading-relaxed">
                    <span className="font-bold">🔍 What this shows:</span> Pick two health factors and see how they relate across all U.S. counties. Each dot is one county.
                  </div>
                )}

                <Card className="border-border shadow-xs">
                  <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                          <ChartLine className="w-4 h-4 text-primary" />
                          {isSimpleMode ? "Compare Two Factors" : "OLS Regression Studio"}
                        </CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                          {isSimpleMode
                            ? `How does ${xMeta.shortLabel} relate to ${yMeta.shortLabel} across ${olsResult.n.toLocaleString()} counties?`
                            : `${xMeta.shortLabel} vs ${yMeta.shortLabel} · ${olsResult.n.toLocaleString()} counties${selectedRuccFilter !== "all" ? ` · RUCC ${selectedRuccFilter} only` : ""}`}
                        </CardDescription>
                      </div>
                      {!isSimpleMode && (
                        <div className="flex gap-1.5 flex-wrap shrink-0">
                          <Badge variant="outline" className="font-mono text-[10px]">r = {olsResult.correlation.toFixed(3)}</Badge>
                          <Badge variant="outline" className="font-mono text-[10px]">R² = {olsResult.r2.toFixed(3)}</Badge>
                          <Badge variant="outline" className="font-mono text-[10px]">
                            p {olsResult.pValue < 0.001 ? "< 0.001" : `= ${olsResult.pValue.toFixed(3)}`}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Metric selectors */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-muted/40 rounded-xl border border-border">
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">X Axis · Exposure Factor</label>
                        <select
                          value={xAxisKey}
                          onChange={(e) => setXAxisKey(e.target.value as keyof CountyData)}
                          className="cursor-pointer w-full text-xs bg-background border border-border rounded-lg px-2.5 py-2 font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          {METRIC_OPTIONS.map((m) => (
                            <option key={`x-${m.key}`} value={m.key}>{m.label} ({m.unit})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Y Axis · Health Outcome</label>
                        <select
                          value={yAxisKey}
                          onChange={(e) => setYAxisKey(e.target.value as keyof CountyData)}
                          className="cursor-pointer w-full text-xs bg-background border border-border rounded-lg px-2.5 py-2 font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          {METRIC_OPTIONS.map((m) => (
                            <option key={`y-${m.key}`} value={m.key}>{m.label} ({m.unit})</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* RUCC filter — hidden in simple mode */}
                    {!isSimpleMode && (
                      <div className="flex items-center gap-3 px-1">
                        <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5 shrink-0">
                          <Users className="w-3.5 h-3.5 text-indigo-400" /> Stratify by Urbanicity:
                        </label>
                        <div className="flex items-center gap-1 flex-wrap">
                          <button
                            onClick={() => setSelectedRuccFilter("all")}
                            className={`cursor-pointer px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border ${selectedRuccFilter === "all"
                              ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300"
                              : "border-border text-muted-foreground hover:text-foreground"
                              }`}
                          >
                            All
                          </button>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((r) => (
                            <button
                              key={r}
                              onClick={() => setSelectedRuccFilter(r)}
                              className={`cursor-pointer px-2 py-1 rounded-lg text-[10px] font-bold transition-all border ${selectedRuccFilter === r
                                ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300"
                                : "border-border text-muted-foreground hover:text-foreground"
                                }`}
                            >
                              R{r}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Scatter chart — full width, tall */}
                    <div className="h-[360px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 15 }}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                          <XAxis
                            type="number"
                            dataKey="x"
                            name={xMeta.shortLabel}
                            tick={{ fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                            label={{ value: `${xMeta.shortLabel} (${xMeta.unit})`, position: "insideBottom", offset: -18, fontSize: 11 }}
                          />
                          <YAxis
                            type="number"
                            dataKey="y"
                            name={yMeta.shortLabel}
                            tick={{ fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                            label={{ value: `${yMeta.shortLabel} (${yMeta.unit})`, angle: -90, position: "insideLeft", offset: 18, fontSize: 11 }}
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
                          <Scatter data={scatterPoints} fill="#3b82f6" fillOpacity={0.4} r={2.5} />
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

                    {/* Bottom row: interpretation + selected county */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {isSimpleMode ? (
                        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs space-y-2">
                          <p className="font-semibold flex items-center gap-1.5 text-blue-400">
                            <Info className="w-3.5 h-3.5" /> Plain English
                          </p>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            When <span className="font-semibold text-foreground">{xMeta.shortLabel}</span> goes up,{" "}
                            <span className="font-semibold text-foreground">{yMeta.shortLabel}</span>{" "}
                            tends to go{" "}
                            <span className="font-semibold text-foreground">{olsResult.slope >= 0 ? "up too" : "down"}</span>.{" "}
                            {Math.abs(olsResult.correlation) > 0.4 ? "This is a strong link." : Math.abs(olsResult.correlation) > 0.2 ? "This is a moderate link." : "The link is weak."}
                          </p>
                          <p className="text-[11px] text-muted-foreground">Based on <span className="font-semibold text-foreground">{olsResult.n.toLocaleString()} counties</span>.</p>
                        </div>
                      ) : (
                        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs space-y-1.5">
                          <p className="font-semibold flex items-center gap-1.5 text-blue-400">
                            <Info className="w-3.5 h-3.5" /> Interpretation
                          </p>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            Slope = <span className="font-mono font-semibold text-foreground">{olsResult.slope.toFixed(3)}</span>: a 1-unit increase in {xMeta.shortLabel} is associated with a{" "}
                            <span className="font-semibold text-foreground">{Math.abs(olsResult.slope).toFixed(3)}</span>{" "}
                            {olsResult.slope >= 0 ? "increase" : "decrease"} in {yMeta.shortLabel}.
                          </p>
                          <p className="text-[11px] text-muted-foreground">Switch to the <span className="font-semibold text-foreground">Diagnostics</span> sub-tab for full stats.</p>
                        </div>
                      )}

                      {selectedCounty ? (
                        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
                          <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                            <span className="flex items-center gap-1.5">🎯 {selectedCounty.County_Name?.split(",")[0]}</span>
                            <Badge variant="outline" className="text-[9px] font-mono border-amber-500/40 text-amber-300">Map Selection</Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <div>
                              <span className="text-muted-foreground block text-[10px] uppercase">{xMeta.shortLabel}</span>
                              <span className="font-bold text-foreground">{fmt(selectedCounty[xAxisKey] as number | undefined, 2)} {xMeta.unit}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block text-[10px] uppercase">{yMeta.shortLabel}</span>
                              <span className="font-bold text-foreground">{fmt(selectedCounty[yAxisKey] as number | undefined, 2)} {yMeta.unit}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 rounded-xl border border-border/60 bg-card/40 text-xs text-muted-foreground flex items-center gap-2">
                          <Info className="w-4 h-4 text-sky-400 shrink-0" />
                          Select a county on the map to highlight its values on the chart.
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ── Sub-Tab 2: RUCC Analysis ──────────────────────────── */}
            {labSubTab === "rucc" && (
              <div className="space-y-4">
                {isSimpleMode && (
                  <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-foreground leading-relaxed">
                    <span className="font-bold">🏙️ What this shows:</span> Counties are ranked from most urban (R1) to most rural (R9). Rural counties tend to have higher lung disease death rates even though they often have less pollution — because it&apos;s harder to see a doctor.
                  </div>
                )}

                <Card className="border-border shadow-xs">
                  <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                          <Map className="w-4 h-4 text-indigo-400" />
                          {isSimpleMode ? "Rural vs Urban Health Gap" : "Rural-Urban Continuum Code (RUCC) Mortality"}
                        </CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                          {isSimpleMode
                            ? "Average lung disease deaths per 100k people, grouped by how urban or rural the county is."
                            : "Average respiratory mortality rate (deaths/100k) stratified by USDA RUCC classification (1=metro ≥1M pop, 9=completely rural)."}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-mono border-indigo-500/40 text-indigo-400 shrink-0">{totalCounties.toLocaleString()} counties</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {/* Full-width tall RUCC chart */}
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={ruccChartData} margin={{ top: 10, right: 20, bottom: 25, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.12} vertical={false} />
                          <XAxis
                            dataKey="label"
                            tick={{ fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                            label={{ value: "RUCC Code", position: "insideBottom", offset: -14, fontSize: 11 }}
                          />
                          <YAxis
                            tick={{ fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                            label={{ value: "Avg Mortality /100k", angle: -90, position: "insideLeft", offset: 12, fontSize: 10 }}
                          />
                          <RechartsTooltip
                            contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 11 }}
                            content={({ active, payload, label: lbl }) => {
                              if (!active || !payload?.length) return null;
                              const ruccDescriptions: Record<string, string> = {
                                R1: "Metro ≥1M pop", R2: "Metro 250k–1M", R3: "Metro <250k",
                                R4: "Urban ≥20k (adj metro)", R5: "Urban ≥20k (non-adj)",
                                R6: "Urban 2.5k–20k (adj)", R7: "Urban 2.5k–20k (non-adj)",
                                R8: "Rural (adj metro)", R9: "Rural (non-adj)",
                              };
                              return (
                                <div className="bg-popover border border-border rounded-lg p-2.5 text-xs shadow-lg">
                                  <p className="font-bold text-foreground">{lbl} — {ruccDescriptions[lbl as string] ?? ""}</p>
                                  <p className="text-muted-foreground mt-1">Avg Mortality: <span className="font-semibold text-foreground">{payload[0].value}/100k</span></p>
                                </div>
                              );
                            }}
                          />
                          <Bar dataKey="avgMortality" radius={[5, 5, 0, 0]}>
                            {ruccChartData.map((entry) => (
                              <Cell
                                key={entry.code}
                                fill={entry.code >= 7 ? "#f59e0b" : entry.code >= 4 ? "#6366f1" : "#3b82f6"}
                                fillOpacity={0.85}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Color legend */}
                    <div className="flex items-center gap-4 flex-wrap text-[11px] text-muted-foreground px-1">
                      <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-500 opacity-85 shrink-0" />Metro / Urban (R1–R3)</div>
                      <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-indigo-500 opacity-85 shrink-0" />Small city (R4–R6)</div>
                      <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-500 opacity-85 shrink-0" />Rural (R7–R9) — highest mortality</div>
                    </div>

                    {/* RUCC code explainer grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { code: "R1–R3", label: "Metropolitan", color: "border-blue-500/30 bg-blue-500/5", text: "text-blue-400", desc: isSimpleMode ? "Large cities with 1M+ people — best access to doctors and hospitals." : "Metro counties (≥250k pop). Highest physician density and hospital access." },
                        { code: "R4–R6", label: "Micropolitan", color: "border-indigo-500/30 bg-indigo-500/5", text: "text-indigo-400", desc: isSimpleMode ? "Small cities and towns — moderate access to care." : "Adjacent urban and small-city counties (2.5k–20k population centers)." },
                        { code: "R7–R9", label: "Rural / Frontier", color: "border-amber-500/30 bg-amber-500/5", text: "text-amber-400", desc: isSimpleMode ? "Very rural areas — fewest doctors and highest death rates from lung disease." : "Completely rural counties. Below-median physician density, highest respiratory mortality." },
                      ].map((g) => (
                        <div key={g.code} className={`p-3 rounded-xl border ${g.color}`}>
                          <div className={`text-xs font-extrabold ${g.text} mb-0.5`}>{g.code} — {g.label}</div>
                          <p className="text-[11px] text-muted-foreground leading-snug">{g.desc}</p>
                        </div>
                      ))}
                    </div>

                    {/* Key finding callout */}
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex gap-3">
                      <div className="text-amber-400 pt-0.5 shrink-0"><AlertTriangle className="w-4 h-4" /></div>
                      <div>
                        <p className="text-xs font-bold text-amber-300">{isSimpleMode ? "Key Finding: Rural counties are hit hardest" : "Epidemiological Finding: Rural Mortality Paradox"}</p>
                        <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                          {isSimpleMode
                            ? `Rural counties (R7–R9) have the highest lung disease death rates — not because of worse air, but because people live far from doctors and hospitals. This is the healthcare access crisis hiding in the data.`
                            : `RUCC 7–9 counties show systematically elevated respiratory mortality despite lower population density and often lower pollution levels. This suggests healthcare access (physician density, hospital proximity) amplifies pollution-attributable mortality — a compounded vulnerability not captured by pollution metrics alone.`}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ── Sub-Tab 3: Diagnostics ────────────────────────────── */}
            {labSubTab === "diagnostics" && (
              <div className="space-y-4">
                {isSimpleMode && (
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-foreground leading-relaxed">
                    <span className="font-bold">📋 What this shows:</span> The math behind the chart — how strong the link is between the two factors you picked, and what it means.
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Stat table */}
                  <Card className="border-border shadow-xs">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-500" />
                        {isSimpleMode ? "The Numbers" : "Regression Diagnostics"}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {isSimpleMode
                          ? `For: ${xMeta.label} vs ${yMeta.label}`
                          : `OLS fit · ${xMeta.shortLabel} → ${yMeta.shortLabel}`}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Stat pills */}
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: isSimpleMode ? "Correlation (r)" : "Pearson r", val: olsResult.correlation.toFixed(3), color: Math.abs(olsResult.correlation) > 0.4 ? "text-emerald-400" : Math.abs(olsResult.correlation) > 0.2 ? "text-amber-400" : "text-muted-foreground" },
                          { label: isSimpleMode ? "Variance Explained" : "R² (fit quality)", val: `${(olsResult.r2 * 100).toFixed(1)}%`, color: "text-sky-400" },
                          { label: isSimpleMode ? "Statistical Certainty" : "p-value", val: olsResult.pValue < 0.001 ? "< 0.001" : olsResult.pValue.toFixed(3), color: olsResult.pValue < 0.05 ? "text-emerald-400" : "text-rose-400" },
                          { label: isSimpleMode ? "Counties Analyzed" : "Sample N", val: `${olsResult.n.toLocaleString()}`, color: "text-foreground" },
                        ].map((stat) => (
                          <div key={stat.label} className="p-3 rounded-xl bg-muted/40 border border-border">
                            <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-1">{stat.label}</div>
                            <div className={`text-xl font-black font-mono ${stat.color}`}>{stat.val}</div>
                          </div>
                        ))}
                      </div>

                      {/* Regression equation */}
                      <div className="p-3 rounded-xl bg-muted/50 border border-border">
                        <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mb-2">Regression Equation</div>
                        <div className="font-mono text-sm font-bold text-foreground text-center py-2 bg-background rounded-lg border border-border">
                          Y = {olsResult.slope.toFixed(3)}X {olsResult.intercept >= 0 ? "+" : "−"} {Math.abs(olsResult.intercept).toFixed(1)}
                        </div>
                        <div className="flex justify-between text-[10px] text-muted-foreground mt-2">
                          <span>X = {xMeta.shortLabel} ({xMeta.unit})</span>
                          <span>Y = {yMeta.shortLabel} ({yMeta.unit})</span>
                        </div>
                      </div>

                      {/* Full stat table */}
                      {!isSimpleMode && (
                        <div className="space-y-1.5 p-3 bg-muted/30 rounded-xl border border-border">
                          {[
                            { label: "Slope (β)", val: olsResult.slope.toFixed(4), mono: true },
                            { label: "Intercept (α)", val: olsResult.intercept.toFixed(3), mono: true },
                            { label: "Pearson r", val: olsResult.correlation.toFixed(4), mono: true },
                            { label: "R² (variance explained)", val: `${(olsResult.r2 * 100).toFixed(2)}%`, mono: true },
                            { label: "p-value", val: olsResult.pValue < 0.001 ? "< 0.001" : olsResult.pValue.toFixed(4), mono: true },
                            { label: "Sample N", val: `${olsResult.n.toLocaleString()} counties`, mono: false },
                          ].map((row) => (
                            <div key={row.label} className="flex justify-between items-center gap-3 text-xs py-1 border-b border-border/50 last:border-0">
                              <span className="text-muted-foreground">{row.label}</span>
                              <span className={`font-semibold text-foreground ${row.mono ? "font-mono" : ""}`}>{row.val}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Interpretation guide + county spotlight */}
                  <div className="space-y-4">
                    <Card className="border-border shadow-xs">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                          <Info className="w-4 h-4 text-blue-400" />
                          {isSimpleMode ? "How to Read This" : "Interpretation Guide"}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {[
                          {
                            term: isSimpleMode ? "Correlation (r)" : "Pearson r",
                            meaning: isSimpleMode
                              ? "How closely the two factors move together. Closer to 1 = strong link, closer to 0 = weak link."
                              : "Measures the linear association strength. |r| > 0.4 = moderate/strong; < 0.2 = weak.",
                          },
                          {
                            term: isSimpleMode ? "Variance Explained" : "R² (Coefficient of Determination)",
                            meaning: isSimpleMode
                              ? "What % of differences in the health outcome can be explained by the exposure factor you picked."
                              : "Proportion of variance in Y explained by X. R² = 0.25 means 25% of variation in Y is explained by X.",
                          },
                          {
                            term: isSimpleMode ? "Statistical Certainty" : "p-value",
                            meaning: isSimpleMode
                              ? "How confident we are the link is real and not random. Below 0.05 means it is very likely real."
                              : "Probability the observed relationship arose by chance. p < 0.001 indicates extremely high confidence.",
                          },
                          {
                            term: isSimpleMode ? "Slope" : "Slope (β)",
                            meaning: isSimpleMode
                              ? "For every 1-unit increase in the exposure factor, the health outcome changes by this amount."
                              : "Unit change in Y per unit change in X. The sign indicates direction (positive = both rise together).",
                          },
                        ].map((item) => (
                          <div key={item.term} className="space-y-0.5">
                            <p className="text-[11px] font-bold text-foreground">{item.term}</p>
                            <p className="text-[11px] text-muted-foreground leading-snug">{item.meaning}</p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    {/* County spotlight card */}
                    {selectedCounty ? (
                      <Card className="border-amber-500/30 bg-amber-500/5 shadow-xs">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-300">
                            🎯 {selectedCounty.County_Name?.split(",")[0]} — County Spotlight
                          </CardTitle>
                          <CardDescription className="text-xs">How this county sits on the regression for the current metric pair.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="p-2.5 rounded-xl bg-background border border-border text-center">
                              <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">{xMeta.shortLabel}</div>
                              <div className="text-lg font-black text-foreground font-mono">{fmt(selectedCounty[xAxisKey] as number | undefined, 2)}</div>
                              <div className="text-[10px] text-muted-foreground">{xMeta.unit}</div>
                            </div>
                            <div className="p-2.5 rounded-xl bg-background border border-border text-center">
                              <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">{yMeta.shortLabel}</div>
                              <div className="text-lg font-black text-foreground font-mono">{fmt(selectedCounty[yAxisKey] as number | undefined, 2)}</div>
                              <div className="text-[10px] text-muted-foreground">{yMeta.unit}</div>
                            </div>
                          </div>
                          {(() => {
                            const xVal = selectedCounty[xAxisKey] as number | undefined;
                            const yVal = selectedCounty[yAxisKey] as number | undefined;
                            if (xVal == null || yVal == null) return null;
                            const predicted = olsResult.slope * xVal + olsResult.intercept;
                            const residual = yVal - predicted;
                            return (
                              <div className="p-2.5 rounded-xl bg-muted/40 border border-border text-xs">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-muted-foreground">Predicted {yMeta.shortLabel}</span>
                                  <span className="font-mono font-bold text-foreground">{fmt(predicted, 2)} {yMeta.unit}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-muted-foreground">Residual (actual − predicted)</span>
                                  <span className={`font-mono font-bold ${residual > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                                    {residual > 0 ? "+" : ""}{fmt(residual, 2)}
                                  </span>
                                </div>
                              </div>
                            );
                          })()}
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="p-4 rounded-xl border border-border/60 bg-card/40 text-xs text-muted-foreground flex items-center gap-3">
                        <Info className="w-4 h-4 text-sky-400 shrink-0" />
                        <span>Select a county on the map to see its individual stats and how it compares to the national regression line.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════════
                TAB 3 — COUNTERFACTUAL POLICY SIMULATOR
            ═══════════════════════════════════════════════════════════ */}
          <TabsContent value="simulator" className="space-y-4 outline-none">
            {renderScopeHeader("simulator")}
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
                      <Replace className="w-4 h-4 text-amber-500" />
                      {isSimpleMode ? "Change the Policies" : "Policy Intervention Controls"}
                    </CardTitle>
                    <button
                      onClick={() => {
                        setTargetPm25Cap(9.0);
                        setTargetToxicCap(50000);
                        setMdDensityBoostPct(15);
                        setSimScope("national");
                      }}
                      className="text-[10px] font-medium text-muted-foreground hover:text-foreground underline decoration-dotted transition-colors cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>
                  <CardDescription className="text-xs">
                    {isSimpleMode
                      ? "Move the sliders or select a scope to see how cleaner air and more doctors save lives."
                      : "Set geographic scope, target pollution caps, and healthcare expansion parameters."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 flex-1 flex flex-col justify-between pt-0">
                  {/* Geographic Scope Dropdown / Segmented Toggle */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      <span>Geographic Scope</span>
                      <span className="text-amber-500 font-mono font-bold">
                        {simScope === "county"
                          ? `Selected County: ${selectedCounty ? selectedCounty.County_Name : "None (Select on Map)"}`
                          : simScope === "state" ? `${simState} Statewide` : "National (3,142 Counties)"}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 bg-muted/50 p-1 rounded-xl border border-border">
                      <button
                        type="button"
                        onClick={() => setSimScope("national")}
                        className={`py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${simScope === "national"
                          ? "bg-violet-600 text-white shadow-xs"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                          }`}
                      >
                        National
                      </button>
                      <button
                        type="button"
                        onClick={() => setSimScope("state")}
                        className={`py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${simScope === "state"
                          ? "bg-violet-600 text-white shadow-xs"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                          }`}
                      >
                        State
                      </button>
                      <button
                        type="button"
                        onClick={() => setSimScope("county")}
                        className={`py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${simScope === "county"
                          ? "bg-violet-600 text-white shadow-xs"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                          }`}
                      >
                        County
                      </button>
                    </div>

                    {/* State selector dropdown if state scope is selected */}
                    {simScope === "state" && (
                      <div className="pt-1 flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground shrink-0">Select State:</span>
                        <select
                          value={simState}
                          onChange={(e) => setSimState(e.target.value)}
                          className="flex-1 bg-background border border-border text-foreground text-xs rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono"
                        >
                          {["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"].map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

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

                  {/* Contact Representative Action */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setIsBriefingModalOpen(true)}
                      className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                    >
                      <Landmark className="w-4 h-4 shrink-0" />
                      <span>Contact Your Representative</span>
                    </button>
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
                          <Rocket className="w-3.5 h-3.5" />
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
                          {isSimpleMode ? "Asthma ER Visits Avoided" : "Asthma ER Visits Prevented"}
                        </p>
                        <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30">
                          Annual
                        </span>
                      </div>
                      <p className="text-3xl font-black text-blue-400 font-mono tracking-tight">
                        {simResult.asthmaErVisitsPrevented.toLocaleString()}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1.5">
                        {isSimpleMode
                          ? "Asthma attacks and ER visits prevented each year"
                          : "Avoided respiratory emergency room visits"}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-purple-500/25 bg-purple-500/5 shadow-xs relative overflow-hidden">
                    <CardContent className="p-5 pt-6 sm:pt-7">
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <p className="text-[11px] font-bold text-purple-400 uppercase tracking-wide flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5" />
                          {isSimpleMode ? "Economic & Health Savings" : "Healthcare & VSL Savings"}
                        </p>
                        <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 border border-purple-500/30">
                          EPA VSL ($11M)
                        </span>
                      </div>
                      <p className="text-3xl font-black text-purple-400 font-mono tracking-tight">
                        ${simResult.totalEconomicSavingsMillions.toLocaleString()}M
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1.5">
                        {isSimpleMode
                          ? "Value of lives saved and medical bills avoided"
                          : `EPA VSL ($11.0M/life) + clinical savings`}
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
                          <Group className="w-4 h-4 text-rose-500" />
                          {isSimpleMode ? "Counties That Would Benefit Most" : "Priority Intervention Counties"}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {isSimpleMode
                            ? "These counties would see the biggest health improvements with these policies."
                            : `Counties seeing maximum projected health gains under ${simResult.scopeLabel || "current scope"}.`}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] font-mono px-2 py-0.5">
                          Top {simResult.priorityCounties.length} High-Impact
                        </Badge>
                        <button
                          type="button"
                          onClick={() => setIsBriefingModalOpen(true)}
                          className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-400 font-bold text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Landmark className="w-3 h-3" />
                          Congressional Brief
                        </button>
                      </div>
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

                    {/* Regulatory & Legislative Citation Banner */}
                    <div className="p-3 bg-muted/40 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[9px] font-mono border-amber-500/40 text-amber-400 bg-amber-500/5">
                          EPA NAAQS 2024 (40 CFR Part 50)
                        </Badge>
                        <span className="text-[11px]">
                          Models compliance with the EPA&apos;s revised PM₂.₅ annual limit of <strong>9.0 μg/m³</strong>. Valued via EPA VSL standard ($11.0M/life).
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Congressional Policy Briefing Modal */}
            <Dialog open={isBriefingModalOpen} onOpenChange={setIsBriefingModalOpen}>
              <div className="space-y-4 p-1">
                <DialogHeader>
                  <DialogTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                    <Landmark className="h-5 w-5 text-amber-500" />
                    Congressional Policy Briefing Memo
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Pre-formatted legislative document based on current Policy Simulator settings ({simResult.scopeLabel || "National"}).
                  </DialogDescription>
                </DialogHeader>

                <div className="p-4 rounded-xl bg-muted/60 border border-border font-mono text-xs leading-relaxed text-foreground space-y-3 max-h-[300px] overflow-y-auto">
                  <div className="text-amber-500 font-bold text-xs uppercase border-b border-border pb-1.5 flex items-center justify-between">
                    <span>TO: CONGRESSIONAL DELEGATION & LEGISLATIVE STAFF</span>
                    <span>SCOPE: {simResult.scopeLabel?.toUpperCase()}</span>
                  </div>
                  <pre className="whitespace-pre-wrap font-sans text-xs">
                    {`CONGRESSIONAL POLICY BRIEFING MEMORANDUM
SUBJECT: Public Health & Economic Impact Analysis for ${simResult.scopeLabel}
REGULATORY BENCHMARK: EPA Revised PM2.5 Annual Standard of 9.0 μg/m³ (40 CFR Part 50)

KEY SIMULATED OUTCOMES:
• Projected Annual Lives Saved: ${simResult.projectedLivesSaved.toLocaleString()} avoided premature respiratory deaths
• Asthma ER Visits Prevented: ${simResult.asthmaErVisitsPrevented.toLocaleString()} visits / year
• EPA Value of Statistical Life (VSL @ $11.0M/life): $${simResult.epaVslSavingsMillions.toLocaleString()} Million / year
• Total Healthcare & Economic Benefit: $${simResult.totalEconomicSavingsMillions.toLocaleString()} Million / year

METHODOLOGY & CAUSAL INFERENCE:
US-SEER Policy Simulator applies Double Machine Learning (DML; Chernozhukov et al. 2018) residualizing PM2.5 exposure and mortality rates against 6 socioeconomic & clinical confounders across US counties.`}
                  </pre>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <a
                    href={`mailto:?subject=${encodeURIComponent(`Congressional Policy Brief: Air Quality & Health Impact for ${simResult.scopeLabel}`)}&body=${encodeURIComponent(
                      `DEAR CONGRESSIONAL DELEGATION / LEGISLATIVE STAFF,

I am writing to submit a quantitative Policy Briefing Memo regarding air quality compliance and public health outcomes for ${simResult.scopeLabel}.

SUMMARY OF SIMULATED HEALTH & ECONOMIC IMPACTS:
- Target Standard: EPA Revised PM2.5 Annual Limit of 9.0 μg/m³ (40 CFR Part 50)
- Projected Annual Lives Saved: ${simResult.projectedLivesSaved.toLocaleString()} premature deaths avoided per year
- Asthma ER Visits Prevented: ${simResult.asthmaErVisitsPrevented.toLocaleString()} emergency visits avoided per year
- Healthcare & Economic Value: $${simResult.totalEconomicSavingsMillions.toLocaleString()} Million / year (using EPA standard VSL of $11.0M per avoided mortality)

These findings demonstrate that targeted environmental protection and healthcare access investments deliver substantial lives saved and economic savings.

Respectfully submitted,
Constituent & Public Health Advocate`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs transition-colors cursor-pointer text-center"
                  >
                    <Mail className="h-4 w-4" />
                    Send Email
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `CONGRESSIONAL POLICY BRIEFING MEMORANDUM
SUBJECT: Public Health & Economic Impact Analysis for ${simResult.scopeLabel}
REGULATORY BENCHMARK: EPA Revised PM2.5 Annual Standard of 9.0 μg/m³ (40 CFR Part 50)

KEY SIMULATED OUTCOMES:
• Projected Annual Lives Saved: ${simResult.projectedLivesSaved.toLocaleString()}
• Asthma ER Visits Prevented: ${simResult.asthmaErVisitsPrevented.toLocaleString()}
• EPA Value of Statistical Life (VSL @ $11.0M/life): $${simResult.epaVslSavingsMillions.toLocaleString()}M / yr
• Total Healthcare & Economic Benefit: $${simResult.totalEconomicSavingsMillions.toLocaleString()}M / yr`
                      );
                      setCopiedBriefText(true);
                      setTimeout(() => setCopiedBriefText(false), 2500);
                    }}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-muted font-semibold text-xs transition-colors cursor-pointer"
                  >
                    {copiedBriefText ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
                    {copiedBriefText ? "Copied to Clipboard!" : "Copy Policy Brief"}
                  </button>

                  <a
                    href="https://www.house.gov/representatives/find-your-representative"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 font-bold text-xs transition-colors cursor-pointer text-center"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Find Rep Portal
                  </a>
                </div>
              </div>
            </Dialog>
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════════
                TAB 4 — SPATIAL EQUITY & CLUSTERS
            ═══════════════════════════════════════════════════════════ */}
          <TabsContent value="equity" className="space-y-4 outline-none">
            {renderScopeHeader("equity")}
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
                    <Group className="w-4 h-4 text-rose-500" />
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

          {/* ═══════════════════════════════════════════════════════════
                TAB 5 — KEY FINDINGS (empirical results from FINDINGS.md)
            ═══════════════════════════════════════════════════════════ */}
          <TabsContent value="findings" className="space-y-5 outline-none">
            {renderScopeHeader("findings")}
            {isSimpleMode && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 leading-relaxed">
                <span className="font-bold">🔬 What this shows:</span> The actual discoveries US-SEER made by analyzing air quality, poverty, and health outcomes across all 3,142 U.S. counties.
              </div>
            )}

            {/* Headline quote */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-card border border-amber-500/25">
              <div className="flex items-center gap-2 mb-2">
                <Microscope className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Headline Finding</span>
              </div>
              <p className="text-sm font-semibold text-foreground leading-relaxed">
                {isSimpleMode
                  ? "74 counties in America have the worst air, the highest respiratory death rates, and the lowest incomes — all at the same time. They have 59% more respiratory deaths than the national average."
                  : "74 U.S. counties simultaneously rank in the top quartile for PM₂.₅, top quartile for respiratory mortality, and bottom quartile for household income — averaging 59% excess respiratory mortality vs. the national county mean."}
              </p>
            </div>

            {/* Stat grid */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                {
                  label: isSimpleMode ? "Triple-Burden Counties" : "EJ Hotspot Counties",
                  value: "74",
                  sub: isSimpleMode ? "High pollution + high mortality + low income" : "Top-quartile PM₂.₅ + mortality + bottom-quartile income",
                  color: "text-amber-400", border: "border-amber-500/25", bg: "bg-amber-500/5",
                  icon: <Group className="w-3.5 h-3.5" />,
                },
                {
                  label: isSimpleMode ? "Extra Deaths in Those Areas" : "Excess Mortality vs. National Avg",
                  value: "+59%",
                  sub: isSimpleMode ? "More respiratory deaths than average counties" : "EJ hotspot counties average 116.3 vs. national 73.3 per 100k",
                  color: "text-rose-400", border: "border-rose-500/25", bg: "bg-rose-500/5",
                  icon: <HeartPulse className="w-3.5 h-3.5" />,
                },
                {
                  label: isSimpleMode ? "Rural vs City Gap" : "Rural–Urban Mortality Gap",
                  value: "+49%",
                  sub: isSimpleMode ? "Rural areas have way more respiratory deaths than cities, even with cleaner air" : "Rural counties: 82.9/100k median vs. urban 55.7/100k despite lower PM₂.₅",
                  color: "text-blue-400", border: "border-blue-500/25", bg: "bg-blue-500/5",
                  icon: <Map className="w-3.5 h-3.5" />,
                },
                {
                  label: isSimpleMode ? "Smoking Impact" : "Smoking → Mortality (r²)",
                  value: "27.2%",
                  sub: isSimpleMode ? "Of respiratory death differences between counties are explained by how much people smoke" : "Smoking prevalence is the single largest county-level predictor of respiratory mortality",
                  color: "text-purple-400", border: "border-purple-500/25", bg: "bg-purple-500/5",
                  icon: <Wind className="w-3.5 h-3.5" />,
                },
                {
                  label: isSimpleMode ? "Pollution → Lung Disease" : "PM₂.₅ → COPD Prevalence",
                  value: "r = 0.13",
                  sub: isSimpleMode ? "Counties with dirtier air have more lung disease cases (p < 0.001)" : "PM₂.₅ significantly predicts county COPD burden; r = 0.129, p < 0.001 across 2,953 counties",
                  color: "text-cyan-400", border: "border-cyan-500/25", bg: "bg-cyan-500/5",
                  icon: <Stethoscope className="w-3.5 h-3.5" />,
                },
                {
                  label: isSimpleMode ? "5 Factors Explain" : "5-Variable Model R²",
                  value: "35.4%",
                  sub: isSimpleMode ? "Of county respiratory death differences when we combine air quality, smoking, poverty, race, and insurance" : "PM₂.₅ + smoking + poverty + race + uninsured jointly explain 35.4% of county mortality variance",
                  color: "text-emerald-400", border: "border-emerald-500/25", bg: "bg-emerald-500/5",
                  icon: <Activity className="w-3.5 h-3.5" />,
                },
              ].map((s) => (
                <div key={s.label} className={`p-4 rounded-2xl border ${s.border} ${s.bg}`}>
                  <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mb-2 ${s.color}`}>
                    {s.icon}{s.label}
                  </div>
                  <div className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${s.color}`}>{s.value}</div>
                  <p className="text-[10px] text-muted-foreground mt-1.5 leading-snug">{s.sub}</p>
                </div>
              ))}
            </div>

            {/* Urbanicity breakdown */}
            <Card className="border-border shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Map className="w-4 h-4 text-blue-400" />
                  {isSimpleMode ? "Pollution → Deaths by Area Type" : "PM₂.₅ × Mortality by Urbanicity (RUCC)"}
                </CardTitle>
                <CardDescription className="text-xs">
                  {isSimpleMode
                    ? "Why cities show a different pattern than rural areas"
                    : "The PM₂.₅–mortality correlation reverses direction across urban/rural strata — demonstrating the healthcare access confound"}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3">
                <div className="space-y-2.5">
                  {[
                    { type: isSimpleMode ? "Rural Areas" : "Rural (RUCC 7–9)", n: "1,138", pm25: "7.17", mort: "82.9", r: "r = +0.17", rColor: "text-rose-400", note: isSimpleMode ? "Dirtier air reliably predicts more deaths" : "Positive, significant: p < 0.001" },
                    { type: isSimpleMode ? "Suburban Areas" : "Suburban (RUCC 4–6)", n: "650", pm25: "7.81", mort: "73.0", r: "r = +0.19", rColor: "text-amber-400", note: isSimpleMode ? "Similar pattern to rural" : "Positive, significant: p < 0.001" },
                    { type: isSimpleMode ? "Cities" : "Urban (RUCC 1–3)", n: "1,165", pm25: "8.11", mort: "55.7", r: "r = −0.07", rColor: "text-blue-400", note: isSimpleMode ? "Cities have more pollution but better hospitals" : "Negative: healthcare access confound dominates" },
                  ].map((row) => (
                    <div key={row.type} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-foreground">{row.type}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{row.note}</div>
                      </div>
                      <div className="text-right shrink-0 space-y-0.5">
                        <div className={`text-sm font-black font-mono ${row.rColor}`}>{row.r}</div>
                        <div className="text-[9px] text-muted-foreground font-mono">n={row.n}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[10px] text-muted-foreground leading-relaxed p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/15">
                  {isSimpleMode
                    ? "💡 Cities have MORE air pollution but FEWER respiratory deaths — because they also have better hospitals, higher incomes, and more doctors. US-SEER is designed to separate these effects."
                    : "⚠️ The unadjusted overall PM₂.₅–mortality correlation is near zero (r = −0.04) due to this urban confound. Stratification by RUCC and multivariate adjustment reveals the true within-group signal."}
                </p>
              </CardContent>
            </Card>

            {/* Notable outlier counties */}
            <Card className="border-border shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-400" />
                  {isSimpleMode ? "Surprising Counties" : "Anomaly Counties (Regression Residuals)"}
                </CardTitle>
                <CardDescription className="text-xs">
                  {isSimpleMode ? "Places that don't follow the pattern — and why that's interesting" : "Ranked by OLS residuals from the national PM₂.₅ → mortality model"}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 space-y-3">
                <div>
                  <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-2">High Pollution, Unexpectedly Low Mortality</p>
                  <div className="space-y-1.5">
                    {anomalyCounties.highPollutionLowMortality.length > 0 ? anomalyCounties.highPollutionLowMortality.map((c) => (
                      <div key={c.name} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <div className="text-[11px] font-semibold text-foreground">{c.name}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">{isSimpleMode ? c.context : `${formatAnomalyResidual(c.residual)} · ${c.context}`}</div>
                          <div className="flex gap-2 mt-1">
                            <span className="text-[9px] font-mono bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded">PM₂.₅: {fmt(c.pm25, 2)}</span>
                            <span className="text-[9px] font-mono bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded">Mort: {fmt(c.mortality, 1)}</span>
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div className="text-[10px] text-muted-foreground px-2 py-1.5 rounded-md bg-muted/30 border border-border/50">No counties met the high-pollution/low-mortality anomaly filter.</div>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wider mb-2">Clean Air, Unexpectedly High Mortality</p>
                  <div className="space-y-1.5">
                    {anomalyCounties.lowPollutionHighMortality.length > 0 ? anomalyCounties.lowPollutionHighMortality.map((c) => (
                      <div key={c.name} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-rose-500/5 border border-rose-500/15">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <div className="text-[11px] font-semibold text-foreground">{c.name}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">{isSimpleMode ? c.context : `${formatAnomalyResidual(c.residual)} · ${c.context}`}</div>
                          <div className="flex gap-2 mt-1">
                            <span className="text-[9px] font-mono bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded">PM₂.₅: {fmt(c.pm25, 2)}</span>
                            <span className="text-[9px] font-mono bg-rose-500/10 text-rose-400 px-1.5 py-0.5 rounded">Mort: {fmt(c.mortality, 1)}</span>
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div className="text-[10px] text-muted-foreground px-2 py-1.5 rounded-md bg-muted/30 border border-border/50">No counties met the low-pollution/high-mortality anomaly filter.</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Methodology note */}
            <div className="p-3.5 rounded-xl bg-muted/30 border border-border text-[10px] text-muted-foreground leading-relaxed space-y-1">
              <p className="font-semibold text-foreground flex items-center gap-1.5"><Info className="w-3.5 h-3.5" /> Methodological Transparency</p>
              <p>All statistics are computed via <span className="font-mono bg-background px-1 rounded">data_pipeline/findings_analysis.py</span> from 2,953 U.S. counties with complete EPA PM₂.₅ (2018–2022 avg), CDC WONDER mortality, and Census ACS data. Correlations use Pearson r. Regression uses OLS with county-level observations. The ecological fallacy applies — county-level relationships do not prove individual-level causation.</p>
            </div>
          </TabsContent>
        </div>
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
                  {mobileModalTab === "impact" && <Rocket className="w-5 h-5 text-emerald-400" />}
                  {mobileModalTab === "lab" && <Activity className="w-5 h-5 text-blue-400" />}
                  {mobileModalTab === "simulator" && <Replace className="w-5 h-5 text-purple-400" />}
                  {mobileModalTab === "equity" && <Group className="w-5 h-5 text-rose-400" />}
                  {mobileModalTab === "findings" && <ScanSearch className="w-5 h-5 text-amber-400" />}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-foreground leading-none truncate">
                    {mobileModalTab === "impact" && (isSimpleMode ? "Big Picture" : "Measurable Impact")}
                    {mobileModalTab === "lab" && (isSimpleMode ? "Explorer" : "Research Lab")}
                    {mobileModalTab === "simulator" && (isSimpleMode ? "What If?" : "Policy Simulator")}
                    {mobileModalTab === "equity" && (isSimpleMode ? "Who's at Risk?" : "Equity & Clusters")}
                    {mobileModalTab === "findings" && (isSimpleMode ? "What We Found" : "Key Findings")}
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
                { id: "impact", label: isSimpleMode ? "Big Picture" : "Impact", icon: <Rocket className="w-3 h-3 text-emerald-400" /> },
                { id: "lab", label: isSimpleMode ? "Explorer" : "Lab", icon: <Activity className="w-3 h-3 text-blue-400" /> },
                { id: "simulator", label: isSimpleMode ? "What If?" : "Simulator", icon: <Replace className="w-3 h-3 text-purple-400" /> },
                { id: "equity", label: isSimpleMode ? "Who's at Risk?" : "Equity", icon: <Group className="w-3 h-3 text-rose-400" /> },
                { id: "findings", label: isSimpleMode ? "Found" : "Findings", icon: <ScanSearch className="w-3 h-3 text-amber-400" /> },
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
                        <Replace className="w-4 h-4 text-purple-400" /> Scenario Controls
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

            {mobileModalTab === "findings" && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-card border border-amber-500/25">
                  <div className="flex items-center gap-2 mb-2">
                    <Microscope className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Headline Finding</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground leading-relaxed">
                    {isSimpleMode
                      ? "74 counties have the worst air, highest death rates, and lowest incomes — simultaneously. They have 59% more respiratory deaths than the national average."
                      : "74 U.S. counties rank simultaneously in the top quartile for PM₂.₅, respiratory mortality, and bottom quartile for income — averaging 59% excess mortality."}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "EJ Hotspots", value: "74", sub: "+59% mortality", color: "text-amber-400", border: "border-amber-500/25", bg: "bg-amber-500/5" },
                    { label: "Rural Gap", value: "+49%", sub: "vs urban counties", color: "text-blue-400", border: "border-blue-500/25", bg: "bg-blue-500/5" },
                    { label: "Smoking r²", value: "27.2%", sub: "mortality variance", color: "text-purple-400", border: "border-purple-500/25", bg: "bg-purple-500/5" },
                    { label: "5-Factor R²", value: "35.4%", sub: "joint model", color: "text-emerald-400", border: "border-emerald-500/25", bg: "bg-emerald-500/5" },
                  ].map((s) => (
                    <div key={s.label} className={`p-3.5 rounded-2xl border ${s.border} ${s.bg}`}>
                      <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${s.color}`}>{s.label}</div>
                      <div className={`text-2xl font-black font-mono ${s.color}`}>{s.value}</div>
                      <div className="text-[9px] text-muted-foreground mt-0.5">{s.sub}</div>
                    </div>
                  ))}
                </div>
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
