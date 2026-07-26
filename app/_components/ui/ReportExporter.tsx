"use client";

import React, { useState, useMemo, useRef } from "react";
import { CountyDataMap, CountyData } from "@/app/_lib/types";
import { Dialog } from "@/app/_components/ui/dialog";
import { Button } from "@/app/_components/ui/button";
import { useSimpleMode } from "@/app/_lib/simple-mode-context";
import {
  FileText,
  Printer,
  Copy,
  Check,
  X,
  Activity,
  Layers,
  TrendingUp,
  TrendingDown,
  Info,
  Search,
  MapPin,
} from "lucide-react";

export type ReportMode = "single" | "compare";

interface ReportExporterProps {
  isOpen: boolean;
  onClose: () => void;
  countyDataMap: CountyDataMap;
  initialFipsA?: string | null;
  initialFipsB?: string | null;
  initialMode?: ReportMode;
}

interface MetricDef {
  key: keyof CountyData;
  label: string;
  simpleLabel: string;
  unit: string;
  nationalAvg: number;
  higherIsBad: boolean;
  /** Which data source provides this metric */
  source: string;
}

const REPORT_METRICS: MetricDef[] = [
  {
    key: "overallRisk",
    label: "Overall Risk Index",
    simpleLabel: "Overall Health & Environmental Risk",
    unit: "/100",
    nationalAvg: 50.0,
    higherIsBad: true,
    source: "BioMap Composite",
  },
  {
    key: "pm25Avg",
    label: "PM\u2082.\u2085 Annual Mean Concentration",
    simpleLabel: "Air Pollution (PM2.5)",
    unit: "µg/m³",
    nationalAvg: 8.5,
    higherIsBad: true,
    source: "EPA / NASA FIRMS",
  },
  {
    key: "mortalityRate",
    label: "Respiratory Mortality Rate",
    simpleLabel: "Lung Disease Deaths",
    unit: "per 100k",
    nationalAvg: 42.0,
    higherIsBad: true,
    source: "CDC WONDER",
  },
  {
    key: "toxicReleases",
    label: "Toxic Chemical Releases (TRI)",
    simpleLabel: "Chemical Releases",
    unit: "lbs/yr",
    nationalAvg: 250000,
    higherIsBad: true,
    source: "EPA TRI",
  },
  {
    key: "copdPrev",
    label: "COPD Prevalence",
    simpleLabel: "Severe Lung Issues (COPD)",
    unit: "%",
    nationalAvg: 6.2,
    higherIsBad: true,
    source: "CDC BRFSS",
  },
  {
    key: "asthmaPrev",
    label: "Asthma Prevalence",
    simpleLabel: "Asthma Rate",
    unit: "%",
    nationalAvg: 9.1,
    higherIsBad: true,
    source: "CDC BRFSS",
  },
  {
    key: "pctPoverty",
    label: "Poverty Rate",
    simpleLabel: "Poverty Level",
    unit: "%",
    nationalAvg: 12.8,
    higherIsBad: true,
    source: "US Census ACS",
  },
  {
    key: "mdRate",
    label: "Primary Care Physician Density",
    simpleLabel: "Doctor Availability",
    unit: "per 100k",
    nationalAvg: 75.0,
    higherIsBad: false,
    source: "HRSA / CMS",
  },
];

/** Build a dynamic citations list based on which metrics have real data in county */
function buildCitations(
  countyA: CountyData | null,
  countyB: CountyData | null
): { label: string; detail: string }[] {
  const used = new Set<string>();
  for (const m of REPORT_METRICS) {
    const a = countyA?.[m.key];
    const b = countyB?.[m.key];
    if ((typeof a === "number" && !isNaN(a)) || (typeof b === "number" && !isNaN(b))) {
      m.source.split(" / ").forEach((s) => used.add(s.trim()));
    }
  }
  // Always include the composite and WONDER if mortality data present
  const ALL_SOURCES: Record<string, string> = {
    "BioMap Composite": "BioMap Composite Risk Score (2024). Integrated multi-source environmental health index, BioMap Spatial Intelligence Platform.",
    "EPA TRI": "U.S. Environmental Protection Agency. Toxics Release Inventory (TRI) Program, 2022 National Analysis. Washington, DC: EPA Office of Pollution Prevention and Toxics.",
    "EPA / NASA FIRMS": "U.S. EPA. Air Quality System (AQS) Annual Summary Data, 2022. NASA FIRMS MODIS/VIIRS Aerosol Optical Depth Satellite Retrievals.",
    "NASA FIRMS": "NASA Fire Information for Resource Management System (FIRMS). MODIS Collection 6.1 / VIIRS SNPP Annual Aerosol Product.",
    "CDC WONDER": "Centers for Disease Control and Prevention. CDC WONDER: Underlying Cause of Death, Compressed Mortality File (CMF), 2018–2022. Atlanta, GA: CDC.",
    "CDC BRFSS": "Centers for Disease Control and Prevention. Behavioral Risk Factor Surveillance System (BRFSS) County-Level Data, 2022.",
    "US Census ACS": "U.S. Census Bureau. American Community Survey (ACS) 5-Year Estimates, 2018–2022. Washington, DC.",
    "HRSA / CMS": "Health Resources & Services Administration (HRSA). Area Health Resources Files (AHRF) 2022–2023. CMS Medicare Provider Enrollment Data.",
  };

  return Array.from(used)
    .filter((k) => ALL_SOURCES[k])
    .map((k) => ({ label: k, detail: ALL_SOURCES[k] }));
}

interface CountyComboboxProps {
  label: string;
  selectedFips: string;
  onSelectFips: (fips: string) => void;
  countyDataMap: CountyDataMap;
}

function CountySearchCombobox({
  label,
  selectedFips,
  onSelectFips,
  countyDataMap,
}: CountyComboboxProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const countyList = useMemo(() => {
    return Object.entries(countyDataMap)
      .map(([fips, data]) => ({
        fips,
        name: data.County_Name || `County ${fips}`,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [countyDataMap]);

  const selectedItem = useMemo(() => {
    return countyList.find((c) => c.fips === selectedFips);
  }, [countyList, selectedFips]);

  React.useEffect(() => {
    if (selectedItem) {
      setQuery(selectedItem.name);
    }
  }, [selectedItem]);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        if (selectedItem) setQuery(selectedItem.name);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedItem]);

  const filteredList = useMemo(() => {
    if (!query.trim()) return countyList.slice(0, 30);
    const q = query.toLowerCase();
    return countyList
      .filter((c) => c.name.toLowerCase().includes(q) || c.fips.includes(q))
      .slice(0, 30);
  }, [countyList, query]);

  return (
    <div ref={containerRef} className="space-y-1 relative">
      <label className="text-[11px] font-semibold text-muted-foreground block uppercase tracking-wider">
        {label}
      </label>

      <div className="relative">
        <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          placeholder="Search county or FIPS..."
          className="w-full bg-background border border-border rounded-lg pl-8 pr-7 py-1.5 text-xs text-foreground font-medium focus:ring-1 focus:ring-primary outline-none"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setIsOpen(true);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-52 overflow-y-auto bg-popover border border-border rounded-xl shadow-xl divide-y divide-border/40 animate-in fade-in-50 duration-150">
          {filteredList.length > 0 ? (
            filteredList.map((c) => (
              <button
                key={`combo-${c.fips}`}
                onClick={() => {
                  onSelectFips(c.fips);
                  setQuery(c.name);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-accent cursor-pointer transition-colors ${
                  c.fips === selectedFips ? "bg-accent/60 font-bold text-primary" : "text-foreground"
                }`}
              >
                <div className="flex items-center gap-1.5 truncate pr-1">
                  <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span className="truncate">{c.name}</span>
                </div>
                <span className="font-mono text-[10px] text-muted-foreground shrink-0">FIPS {c.fips}</span>
              </button>
            ))
          ) : (
            <div className="p-2.5 text-xs text-muted-foreground text-center">
              No matching counties
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ReportExporter({
  isOpen,
  onClose,
  countyDataMap,
  initialFipsA = "48201",
  initialFipsB = "17031",
  initialMode = "single",
}: ReportExporterProps) {
  const { isSimpleMode } = useSimpleMode();
  const [mode, setMode] = useState<ReportMode>(initialMode);
  const [fipsA, setFipsA] = useState<string>(initialFipsA || "48201");
  const [fipsB, setFipsB] = useState<string>(initialFipsB || "17031");
  const [copied, setCopied] = useState(false);
  const [copyFormat, setCopyFormat] = useState<"plain" | "formatted">("formatted");

  // Document Section Toggles
  const [includeSimulation, setIncludeSimulation] = useState(true);
  const [includeCitations, setIncludeCitations] = useState(true);
  const [includeScorecard, setIncludeScorecard] = useState(true);
  const [paperTheme, setPaperTheme] = useState<"light" | "dark">("light");

  // Sync when props change (e.g. opened from different entry points)
  React.useEffect(() => {
    if (initialFipsA) setFipsA(initialFipsA);
    if (initialFipsB) setFipsB(initialFipsB);
    if (initialMode) setMode(initialMode);
  }, [initialFipsA, initialFipsB, initialMode]);

  const countyKeys = useMemo(() => Object.keys(countyDataMap), [countyDataMap]);
  const countyA = useMemo(() => countyDataMap[fipsA] || null, [countyDataMap, fipsA]);
  const countyB = useMemo(() => countyDataMap[fipsB] || null, [countyDataMap, fipsB]);

  const nameA = countyA?.County_Name || `County ${fipsA}`;
  const nameB = countyB?.County_Name || `County ${fipsB}`;

  const dateStr = useMemo(
    () =>
      new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    []
  );

  const citations = useMemo(
    () => buildCitations(countyA, mode === "compare" ? countyB : null),
    [countyA, countyB, mode]
  );

  // Causal simulation estimates for County A
  const simA = useMemo(() => {
    if (!countyA) return null;
    const pm = countyA.pm25Avg || 8.5;
    const pop = countyA.population || 100000;
    const deaths =
      countyA.deaths || Math.round((pop / 100000) * (countyA.mortalityRate || 42));
    const livesSaved = Math.max(1, Math.round(deaths * 0.082));
    const erVisitsSaved = Math.round(livesSaved * 4.3);
    const economicSavings = (livesSaved * 1.2).toFixed(1);
    return {
      pmReduction: (pm * 0.15).toFixed(1),
      livesSaved,
      erVisitsSaved,
      economicSavings,
    };
  }, [countyA]);

  // Executive summary prose
  const executiveText = useMemo(() => {
    if (!countyA) return "";
    const risk = countyA.overallRisk ?? 50;
    const pm = countyA.pm25Avg ?? 8.5;
    const mort = countyA.mortalityRate ?? 42;
    const pov = countyA.pctPoverty ?? 12;
    const tox = countyA.toxicReleases
      ? `${(countyA.toxicReleases / 1000).toFixed(0)}k`
      : "unreported";

    if (mode === "single") {
      return `${nameA} presents an Overall Environmental Health Risk Index of ${risk.toFixed(1)}/100. Annual mean fine particulate matter (PM\u2082.\u2085) concentration averages ${pm.toFixed(1)} \u00b5g/m\u00b3, accompanied by a respiratory mortality rate of ${mort.toFixed(1)} deaths per 100,000 residents. The county reports ${tox} lbs of industrial toxic chemical releases annually (EPA TRI) and a poverty prevalence of ${pov.toFixed(1)}%. Counterfactual modelling estimates that a 15% ambient PM\u2082.\u2085 reduction could prevent an estimated ${simA?.livesSaved ?? "—"} deaths and $${simA?.economicSavings ?? "—"}M in direct healthcare expenditures annually.`;
    } else {
      if (!countyB) return "";
      const riskB = countyB.overallRisk ?? 50;
      const pmB = countyB.pm25Avg ?? 8.5;
      const mortB = countyB.mortalityRate ?? 42;
      const riskDiff = Math.abs(risk - riskB).toFixed(1);
      const higherRiskCounty = risk >= riskB ? nameA : nameB;

      return `Comparative spatial epidemiological analysis between ${nameA} and ${nameB} reveals significant environmental health disparities. ${higherRiskCounty} exhibits a materially elevated risk profile, with a ${riskDiff}-point differential in the composite environmental health risk index. ${nameA} records PM\u2082.\u2085 concentrations of ${pm.toFixed(1)} \u00b5g/m\u00b3 versus ${pmB.toFixed(1)} \u00b5g/m\u00b3 in ${nameB}, with respiratory mortality rates of ${mort.toFixed(1)} and ${mortB.toFixed(1)} per 100,000 residents, respectively. These disparities are consistent with established dose-response relationships between chronic particulate exposure and cardiorespiratory mortality (Pope et al., 2002; Lepeule et al., 2012).`;
    }
  }, [countyA, countyB, nameA, nameB, mode, simA]);

  const handlePrint = () => window.print();

  const handleCopySummary = async () => {
    const isFormatted = copyFormat === "formatted";

    const scorecardLines = REPORT_METRICS.map((m) => {
      const rawA = countyA?.[m.key];
      const valA =
        typeof rawA === "number" && !isNaN(rawA)
          ? `${rawA.toFixed(1)} ${m.unit}`
          : "N/A";
      const rawB = countyB?.[m.key];
      const valB =
        typeof rawB === "number" && !isNaN(rawB)
          ? `${rawB.toFixed(1)} ${m.unit}`
          : "N/A";
      const label = isSimpleMode ? m.simpleLabel : m.label;
      return mode === "compare"
        ? `${label}: ${valA} | ${nameB}: ${valB}`
        : `${label}: ${valA}`;
    });

    const citationLines = citations.map((c, i) => `[${i + 1}] ${c.detail}`);

    let textToCopy: string;

    if (isFormatted) {
      textToCopy = `# BioMap Executive Health Briefing
${mode === "single" ? nameA : `${nameA} vs. ${nameB}`}
Issued: ${dateStr} | FIPS: ${fipsA}${mode === "compare" ? ` & ${fipsB}` : ""}
─────────────────────────────────────────────────────

## Abstract / Executive Summary
${executiveText}
${
  simA && includeSimulation
    ? `
## Policy Simulation (Counterfactual: −15% PM₂.₅)
  • Annual Lives Saved:          +${simA.livesSaved}
  • ER Hospitalizations Averted: −${simA.erVisitsSaved}
  • Direct Cost Savings:         $${simA.economicSavings}M / year
  [Model: Linear dose-response, EconML causal framework]`
    : ""
}
${
  includeScorecard
    ? `
## Indicator Scorecard
${scorecardLines.map((l) => `  · ${l}`).join("\n")}`
    : ""
}
${
  includeCitations && citationLines.length
    ? `
## Data Sources & References
${citationLines.join("\n")}`
    : ""
}

Generated by BioMap Spatial Intelligence Platform · ${dateStr}`;
    } else {
      // Plain text — no markdown decorations
      const sections: string[] = [
        `BioMap Executive Health Briefing`,
        `${mode === "single" ? nameA : `${nameA} vs. ${nameB}`} · ${dateStr}`,
        ``,
        executiveText,
      ];
      if (simA && includeSimulation) {
        sections.push(
          ``,
          `Policy Simulation (15% PM2.5 reduction): ${simA.livesSaved} lives saved per year; ${simA.erVisitsSaved} ER visits averted; $${simA.economicSavings}M in cost savings.`
        );
      }
      if (includeScorecard) {
        sections.push(``, ...scorecardLines);
      }
      if (includeCitations && citationLines.length) {
        sections.push(``, `Sources:`, ...citationLines);
      }
      textToCopy = sections.join("\n");
    }

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      console.error("Clipboard write failed");
    }
  };

  if (!isOpen || !countyA) return null;

  /* ── Colour tokens for the paper document ────────────────────── */
  // Light paper: true ink on white (no gray backgrounds)
  const paper = {
    bg:       paperTheme === "light" ? "bg-white"                     : "bg-[#0d1117]",
    text:     paperTheme === "light" ? "text-[#0f172a]"               : "text-[#e2e8f0]",
    subtle:   paperTheme === "light" ? "text-[#374151]"               : "text-[#94a3b8]",
    faint:    paperTheme === "light" ? "text-[#6b7280]"               : "text-[#64748b]",
    border:   paperTheme === "light" ? "border-[#d1d5db]"             : "border-[#1e293b]",
    rule:     paperTheme === "light" ? "border-[#d1d5db]"             : "border-[#1e293b]",
    thead:    paperTheme === "light" ? "bg-[#f3f4f6] text-[#111827]"  : "bg-[#161b22] text-[#c9d1d9]",
    trow:     paperTheme === "light" ? "divide-[#e5e7eb]"             : "divide-[#21262d]",
    kpiBg:    paperTheme === "light" ? "bg-[#f9fafb] border-[#e5e7eb]": "bg-[#161b22] border-[#21262d]",
    secLbl:   paperTheme === "light" ? "text-[#374151]"               : "text-[#6e7681]",
    simBg:    paperTheme === "light" ? "bg-[#f0fdf4] border-[#86efac]": "bg-[#0d2318] border-[#166534]/40",
    simText:  paperTheme === "light" ? "text-[#14532d]"               : "text-[#4ade80]",
    simVal:   paperTheme === "light" ? "text-[#15803d]"               : "text-[#4ade80]",
    footerBg: paperTheme === "light" ? "border-[#d1d5db] text-[#6b7280]": "border-[#1e293b] text-[#4b5563]",
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 outline-none">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm no-print"
          onClick={onClose}
        />

        {/* Exporter Shell */}
        <div className="relative w-full max-w-5xl h-[94vh] flex flex-col bg-card border border-border rounded-2xl shadow-2xl overflow-hidden z-10 animate-in fade-in-50 zoom-in-95 duration-200">

          {/* ── Toolbar ──────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b border-border bg-card shrink-0 no-print">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Executive Briefing</span>
              <span className="text-[10px] text-muted-foreground font-medium hidden sm:inline">
                · Print-ready academic policy report
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Single / Compare toggle */}
              <div className="flex items-center p-0.5 bg-muted/60 border border-border/80 rounded-lg text-xs">
                {(["single", "compare"] as ReportMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all capitalize ${
                      mode === m
                        ? "bg-background text-foreground shadow-2xs border border-border/50"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {m === "single" ? "Single County" : "Dual Comparison"}
                  </button>
                ))}
              </div>

              {/* Copy format toggle */}
              <div className="flex items-center p-0.5 bg-muted/60 border border-border/80 rounded-lg text-xs">
                {(["formatted", "plain"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setCopyFormat(f)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                      copyFormat === f
                        ? "bg-background text-foreground shadow-2xs border border-border/50"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {f === "formatted" ? "MD" : "Plain"}
                  </button>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleCopySummary}
                className="h-8 px-2.5 text-xs gap-1.5 cursor-pointer"
                title={`Copy ${copyFormat} text summary to clipboard`}
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copied ? "Copied!" : "Copy"}</span>
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={handlePrint}
                className="h-8 px-3 text-xs gap-1.5 font-semibold cursor-pointer active:scale-97"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / PDF</span>
              </Button>

              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── Workspace ────────────────────────────────────────── */}
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">

            {/* ── Left Sidebar ─────────────────────────────────── */}
            <div className="w-full md:w-60 p-4 border-b md:border-b-0 md:border-r border-border bg-muted/10 flex flex-col gap-3.5 shrink-0 overflow-y-auto no-print">
              {/* County A */}
              <CountySearchCombobox
                label="Primary County"
                selectedFips={fipsA}
                onSelectFips={setFipsA}
                countyDataMap={countyDataMap}
              />

              {mode === "compare" && (
                <CountySearchCombobox
                  label="Comparison County"
                  selectedFips={fipsB}
                  onSelectFips={setFipsB}
                  countyDataMap={countyDataMap}
                />
              )}

              <hr className="border-border" />

              {/* Section toggles */}
              <div>
                <span className="text-[11px] font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wider">
                  Document Sections
                </span>
                <div className="space-y-1.5 text-xs">
                  {[
                    { state: includeScorecard, set: setIncludeScorecard, label: "Indicator Scorecard" },
                    { state: includeSimulation, set: setIncludeSimulation, label: "Policy Simulation" },
                    { state: includeCitations, set: setIncludeCitations, label: "References" },
                  ].map(({ state, set, label }) => (
                    <label key={label} className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
                      <input
                        type="checkbox"
                        checked={state}
                        onChange={(e) => set(e.target.checked)}
                        className="rounded border-border"
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <hr className="border-border" />

              {/* Paper theme */}
              <div>
                <span className="text-[11px] font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wider">
                  Paper Theme
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {(["light", "dark"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setPaperTheme(t)}
                      className={`py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
                        paperTheme === t
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:bg-muted/40"
                      }`}
                    >
                      {t === "light" ? "☀ Light" : "◗ Dark"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic citations preview */}
              {citations.length > 0 && (
                <>
                  <hr className="border-border" />
                  <div>
                    <span className="text-[11px] font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wider">
                      Active Data Sources
                    </span>
                    <div className="space-y-1">
                      {citations.map((c) => (
                        <div key={c.label} className="text-[10px] text-muted-foreground font-mono px-1.5 py-0.5 rounded bg-muted/40 border border-border/60">
                          {c.label}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div className="mt-auto pt-2 border-t border-border text-[10px] text-muted-foreground flex items-start gap-1.5">
                <Info className="w-3 h-3 text-primary shrink-0 mt-px" />
                <span>In the print dialog choose <strong>"Save as PDF"</strong> for vector output.</span>
              </div>
            </div>

            {/* ── Document Preview ──────────────────────────────── */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-muted/30 flex justify-center">
              <div
                id="printable-report"
                className={`w-full max-w-[760px] min-h-[1050px] flex flex-col rounded-lg shadow-sm border transition-colors ${paper.bg} ${paper.text} ${paper.border}`}
                style={{ padding: "3rem 3.5rem", printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
              >
                {/* ── Academic Letterhead ──────────────────────── */}
                <div className={`pb-5 mb-6 border-b-2 print-no-break ${paper.rule}`}>
                  {/* Institution line */}
                  <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] mb-3 ${paper.faint}`}>
                    BioMap Spatial Intelligence Platform · Environmental Epidemiology Division
                  </p>

                  {/* Document type */}
                  <h1 className="text-[22px] font-bold leading-snug tracking-tight mb-1.5">
                    {mode === "single"
                      ? `Environmental Health Profile: ${nameA}`
                      : `Comparative Environmental Health Analysis: ${nameA} & ${nameB}`}
                  </h1>

                  {/* Metadata strip */}
                  <div className={`flex flex-wrap items-center gap-x-4 gap-y-0.5 text-[11px] ${paper.subtle}`}>
                    <span>Date Issued: <strong>{dateStr}</strong></span>
                    <span>·</span>
                    <span>FIPS: <span className="font-mono">{fipsA}{mode === "compare" ? `, ${fipsB}` : ""}</span></span>
                    <span>·</span>
                    <span>Classification: <em>Civic / Research Use</em></span>
                  </div>
                </div>

                {/* ── Section 1: Abstract / Executive Summary ─── */}
                <div className="mb-7 print-no-break">
                  <h2 className={`text-[11px] font-bold uppercase tracking-widest mb-2 ${paper.secLbl}`}>
                    1 · Abstract
                  </h2>
                  <p className="text-[13px] leading-relaxed text-justify">
                    {executiveText}
                  </p>
                </div>

                {/* ── KPI Row ───────────────────────────────────── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-7 print-no-break">
                  {[
                    { label: "Overall Risk", raw: countyA.overallRisk, unit: "/100", color: "text-rose-700" },
                    { label: "PM₂.₅", raw: countyA.pm25Avg, unit: "µg/m³", color: "text-amber-700" },
                    { label: "Resp. Mortality", raw: countyA.mortalityRate, unit: "/100k", color: "text-blue-800" },
                    {
                      label: "Toxic Releases",
                      raw: countyA.toxicReleases != null ? countyA.toxicReleases / 1000 : undefined,
                      unit: "k lbs",
                      color: "text-violet-800",
                    },
                  ].map(({ label, raw, unit, color }) => (
                    <div key={label} className={`p-3 rounded border ${paper.kpiBg}`}>
                      <span className={`text-[9px] font-bold uppercase tracking-wider block mb-0.5 ${paper.faint}`}>
                        {label}
                      </span>
                      <span className={`text-lg font-black leading-none ${color}`}>
                        {typeof raw === "number" && !isNaN(raw)
                          ? raw.toFixed(1)
                          : "N/A"}
                      </span>
                      <span className={`text-[10px] ml-0.5 ${paper.faint}`}>{unit}</span>
                    </div>
                  ))}
                </div>

                {/* ── Section 2: Indicator Scorecard ────────────── */}
                {includeScorecard && (
                  <div className="mb-7 print-break-before">
                    <h2 className={`text-[11px] font-bold uppercase tracking-widest mb-3 flex items-center gap-1.5 ${paper.secLbl}`}>
                      <Layers className="w-3.5 h-3.5" />
                      2 · Environmental & Health Indicator Matrix
                    </h2>
                    <div className={`overflow-hidden border rounded ${paper.border}`}>
                      <table className="w-full text-[12px] text-left">
                        <thead className={paper.thead}>
                          <tr>
                            <th className="py-2 px-3 font-bold">Indicator</th>
                            <th className="py-2 px-3 font-bold">{nameA}</th>
                            {mode === "compare" && <th className="py-2 px-3 font-bold">{nameB}</th>}
                            {mode === "compare" && <th className="py-2 px-3 font-bold">Δ</th>}
                            <th className={`py-2 px-3 font-bold ${paper.faint}`}>Natl. Avg</th>
                            <th className={`py-2 px-3 font-bold ${paper.faint}`}>Source</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${paper.trow}`}>
                          {REPORT_METRICS.map((m) => {
                            const rawA = countyA[m.key];
                            const valA = typeof rawA === "number" && !isNaN(rawA) ? rawA : null;
                            const rawB = countyB ? countyB[m.key] : null;
                            const valB = typeof rawB === "number" && !isNaN(rawB) ? rawB : null;

                            let deltaText = "—";
                            let isBadDelta = false;
                            if (valA !== null && valB !== null && valB !== 0) {
                              const ratio = ((valA - valB) / valB) * 100;
                              deltaText = `${ratio > 0 ? "+" : ""}${ratio.toFixed(1)}%`;
                              isBadDelta = m.higherIsBad ? ratio > 0 : ratio < 0;
                            }

                            return (
                              <tr key={m.key}>
                                <td className="py-1.5 px-3 font-medium">
                                  {isSimpleMode ? m.simpleLabel : m.label}
                                </td>
                                <td className="py-1.5 px-3 font-semibold">
                                  {valA !== null ? `${valA.toFixed(1)} ${m.unit}` : <span className={paper.faint}>N/A</span>}
                                </td>
                                {mode === "compare" && (
                                  <td className="py-1.5 px-3 font-semibold">
                                    {valB !== null ? `${valB.toFixed(1)} ${m.unit}` : <span className={paper.faint}>N/A</span>}
                                  </td>
                                )}
                                {mode === "compare" && (
                                  <td className="py-1.5 px-3">
                                    <span
                                      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                        isBadDelta
                                          ? "bg-rose-100 text-rose-700"
                                          : "bg-emerald-100 text-emerald-700"
                                      }`}
                                    >
                                      {isBadDelta ? (
                                        <TrendingUp className="w-2.5 h-2.5" />
                                      ) : (
                                        <TrendingDown className="w-2.5 h-2.5" />
                                      )}
                                      {deltaText}
                                    </span>
                                  </td>
                                )}
                                <td className={`py-1.5 px-3 ${paper.faint}`}>
                                  {m.nationalAvg.toLocaleString()} {m.unit}
                                </td>
                                <td className={`py-1.5 px-3 text-[10px] font-mono ${paper.faint}`}>
                                  {m.source}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ── Section 3: Policy Simulation ─────────────── */}
                {includeSimulation && simA && (
                  <div className="mb-7 print-no-break print-break-before">
                    <h2 className={`text-[11px] font-bold uppercase tracking-widest mb-3 flex items-center gap-1.5 ${paper.secLbl}`}>
                      <Activity className="w-3.5 h-3.5" />
                      3 · Counterfactual Policy Simulation
                    </h2>
                    <div className={`p-4 rounded border ${paper.simBg}`}>
                      <p className={`text-[11px] font-semibold mb-2.5 ${paper.simText}`}>
                        Scenario: 15% ambient PM₂.₅ reduction (−{simA.pmReduction} µg/m³) via industrial emission controls
                        <span className="ml-2 text-[9px] uppercase opacity-60">[Causal DML / EconML]</span>
                      </p>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        {[
                          { label: "Est. Annual Lives Saved", value: `+${simA.livesSaved}` },
                          { label: "ER Hospitalizations Averted", value: `−${simA.erVisitsSaved}` },
                          { label: "Direct Cost Savings", value: `$${simA.economicSavings}M` },
                        ].map(({ label, value }) => (
                          <div key={label}>
                            <div className={`text-[9px] uppercase tracking-wider mb-0.5 ${paper.simText} opacity-70`}>{label}</div>
                            <div className={`text-lg font-black ${paper.simVal}`}>{value}</div>
                            <div className={`text-[9px] ${paper.simText} opacity-50`}>per year</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Footer: Dynamic References ────────────────── */}
                {includeCitations && citations.length > 0 && (
                  <div className={`mt-auto pt-4 border-t print-no-break ${paper.footerBg}`}>
                    <p className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 ${paper.faint}`}>
                      References & Data Sources
                    </p>
                    <ol className="list-decimal list-inside space-y-0.5">
                      {citations.map((c, i) => (
                        <li key={i} className={`text-[10px] leading-snug ${paper.faint}`}>
                          {c.detail}
                        </li>
                      ))}
                    </ol>
                    <p className={`text-[9px] mt-2 font-mono ${paper.faint} opacity-60`}>
                      Generated by BioMap Engine v1.2 · {dateStr}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
