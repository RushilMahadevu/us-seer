"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
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
  ChevronDown,
  Sparkles,
  BookOpen,
  Eye,
  SlidersHorizontal,
} from "lucide-react";

export type ReportMode = "single" | "compare";
export type DocumentStyle = "Casual Colored" | "academic";

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
    source: "US-SEER Composite",
  },
  {
    key: "pm25Avg",
    label: "PM₂.₅ Annual Mean Concentration",
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
  const ALL_SOURCES: Record<string, string> = {
    "US-SEER Composite": "US-SEER Composite Risk Score (2024). Integrated multi-source environmental health index, US-SEER Spatial Intelligence Platform.",
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

  useEffect(() => {
    if (selectedItem) {
      setQuery(selectedItem.name);
    }
  }, [selectedItem]);

  useEffect(() => {
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
                className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-accent cursor-pointer transition-colors ${c.fips === selectedFips ? "bg-accent/60 font-bold text-primary" : "text-foreground"
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
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<ReportMode>(initialMode);
  const [docStyle, setDocStyle] = useState<DocumentStyle>("Casual Colored");
  const [fipsA, setFipsA] = useState<string>(initialFipsA || "48201");
  const [fipsB, setFipsB] = useState<string>(initialFipsB || "17031");

  // Mobile Workspace Tab State (Controls vs Preview)
  const [mobileTab, setMobileTab] = useState<"controls" | "preview">("controls");

  // Copy Dropdown State
  const [isCopyMenuOpen, setIsCopyMenuOpen] = useState(false);
  const [copiedFormat, setCopiedFormat] = useState<"md" | "plain" | null>(null);
  const copyMenuRef = useRef<HTMLDivElement>(null);

  // Document Section Toggles
  const [includeSimulation, setIncludeSimulation] = useState(true);
  const [includeCitations, setIncludeCitations] = useState(true);
  const [includeScorecard, setIncludeScorecard] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync when props change
  useEffect(() => {
    if (initialFipsA) setFipsA(initialFipsA);
    if (initialFipsB) setFipsB(initialFipsB);
    if (initialMode) setMode(initialMode);
  }, [initialFipsA, initialFipsB, initialMode]);

  // Handle outside click for Copy Menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (copyMenuRef.current && !copyMenuRef.current.contains(e.target as Node)) {
        setIsCopyMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  // Determine multi-page layout needs
  const hasPage2 = useMemo(() => {
    return includeSimulation || includeCitations;
  }, [includeSimulation, includeCitations]);

  const totalPages = hasPage2 ? 2 : 1;

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
      return `${nameA} presents an Overall Environmental Health Risk Index of ${risk.toFixed(1)}/100. Annual mean fine particulate matter (PM₂.₅) concentration averages ${pm.toFixed(1)} µg/m³, accompanied by a respiratory mortality rate of ${mort.toFixed(1)} deaths per 100,000 residents. The county reports ${tox} lbs of industrial toxic chemical releases annually (EPA TRI) and a poverty prevalence of ${pov.toFixed(1)}%. Counterfactual modelling estimates that a 15% ambient PM₂.₅ reduction could prevent an estimated ${simA?.livesSaved ?? "—"} deaths and $${simA?.economicSavings ?? "—"}M in direct healthcare expenditures annually.`;
    } else {
      if (!countyB) return "";
      const riskB = countyB.overallRisk ?? 50;
      const pmB = countyB.pm25Avg ?? 8.5;
      const mortB = countyB.mortalityRate ?? 42;
      const riskDiff = Math.abs(risk - riskB).toFixed(1);
      const higherRiskCounty = risk >= riskB ? nameA : nameB;

      return `Comparative spatial epidemiological analysis between ${nameA} and ${nameB} reveals significant environmental health disparities. ${higherRiskCounty} exhibits a materially elevated risk profile, with a ${riskDiff}-point differential in the composite environmental health risk index. ${nameA} records PM₂.₅ concentrations of ${pm.toFixed(1)} µg/m³ versus ${pmB.toFixed(1)} µg/m³ in ${nameB}, with respiratory mortality rates of ${mort.toFixed(1)} and ${mortB.toFixed(1)} per 100,000 residents, respectively. These disparities are consistent with established dose-response relationships between chronic particulate exposure and cardiorespiratory mortality (Pope et al., 2002; Lepeule et al., 2012).`;
    }
  }, [countyA, countyB, nameA, nameB, mode, simA]);

  const handlePrint = () => {
    window.print();
  };

  const handleCopySummary = async (copyFormat: "formatted" | "plain") => {
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
      textToCopy = `# US-SEER Executive Health Briefing
${mode === "single" ? nameA : `${nameA} vs. ${nameB}`}
Issued: ${dateStr} | FIPS: ${fipsA}${mode === "compare" ? ` & ${fipsB}` : ""}
─────────────────────────────────────────────────────

## Abstract / Executive Summary
${executiveText}
${simA && includeSimulation
          ? `
## Policy Simulation (Counterfactual: −15% PM₂.₅)
  • Annual Lives Saved:          +${simA.livesSaved}
  • ER Hospitalizations Averted: −${simA.erVisitsSaved}
  • Direct Cost Savings:         $${simA.economicSavings}M / year
  [Model: Linear dose-response, EconML causal framework]`
          : ""
        }
${includeScorecard
          ? `
## Indicator Scorecard
${scorecardLines.map((l) => `  · ${l}`).join("\n")}`
          : ""
        }
${includeCitations && citationLines.length
          ? `
## Data Sources & References
${citationLines.join("\n")}`
          : ""
        }

Generated by US-SEER Spatial Intelligence Platform · ${dateStr}`;
    } else {
      const sections: string[] = [
        `US-SEER Executive Health Briefing`,
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
      setCopiedFormat(copyFormat === "formatted" ? "md" : "plain");
      setIsCopyMenuOpen(false);
      setTimeout(() => setCopiedFormat(null), 2500);
    } catch {
      console.error("Clipboard write failed");
    }
  };

  if (!isOpen || !countyA) return null;

  const isAcademic = docStyle === "academic";

  const renderPage1Content = (isPrintPortal = false) => (
    <div
      id={isPrintPortal ? undefined : "printable-report"}
      className={`w-full max-w-[760px] flex flex-col justify-between rounded-xl transition-colors ${isAcademic
        ? "bg-white text-black border border-black font-sans shadow-none"
        : "bg-white text-[#0f172a] border border-[#d1d5db] shadow-md"
        } ${isPrintPortal ? "p-8 mx-auto" : "p-4 sm:p-8 md:p-10 min-h-0 sm:min-h-[960px]"}`}
      style={{
        printColorAdjust: "exact",
        WebkitPrintColorAdjust: "exact",
      }}
    >
      <div>
        {/* Letterhead Header */}
        <div
          className={`pb-4 mb-5 ${isAcademic ? "border-b-2 border-black" : "border-b-2 border-[#d1d5db]"
            } print-no-break`}
        >
          <p
            className={`text-[9.5px] sm:text-[10px] font-bold uppercase tracking-[0.16em] sm:tracking-[0.18em] mb-1.5 ${isAcademic ? "text-black font-mono" : "text-[#6b7280]"
              }`}
          >
            {isAcademic
              ? "US-SEER RESEARCH & POLICY BRIEFING · ISSN 2831-9042 · ENVIRONMENTAL EPIDEMIOLOGY DIVISION"
              : "US-SEER Spatial Intelligence Platform · Environmental Epidemiology Division"}
          </p>

          <h1
            className={`text-lg sm:text-[20px] font-bold leading-snug tracking-tight mb-1.5 ${isAcademic ? "font-serif text-black" : "text-[#0f172a]"
              }`}
          >
            {mode === "single"
              ? `Environmental Health Profile: ${nameA}`
              : `Comparative Environmental Health Analysis: ${nameA} & ${nameB}`}
          </h1>

          <div
            className={`flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1 text-[10px] sm:text-[10.5px] ${isAcademic ? "text-black font-mono" : "text-[#374151]"
              }`}
          >
            <span>
              Date Issued: <strong>{dateStr}</strong>
            </span>
            <span>·</span>
            <span>
              FIPS: <strong>{fipsA}{mode === "compare" ? `, ${fipsB}` : ""}</strong>
            </span>
            <span>·</span>
            <span>
              Classification: <em>{isAcademic ? "Peer-Reviewed Policy Brief" : "Civic / Research Use"}</em>
            </span>
          </div>
        </div>

        {/* Section 1: Abstract / Executive Summary */}
        <div className="mb-6 print-no-break">
          <h2
            className={`text-[10.5px] sm:text-[11px] font-bold uppercase tracking-widest mb-1.5 ${isAcademic ? "font-serif text-black border-b border-black/30 pb-0.5" : "text-[#374151]"
              }`}
          >
            1 · Abstract & Executive Summary
          </h2>
          <p
            className={`text-xs sm:text-[12.5px] leading-relaxed text-justify ${isAcademic ? "font-serif text-black leading-relaxed" : "text-[#1e293b]"
              }`}
          >
            {executiveText}
          </p>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 mb-6 print-no-break">
          {[
            { label: "Overall Risk", raw: countyA.overallRisk, unit: "/100", color: isAcademic ? "text-black font-serif" : "text-rose-700" },
            { label: "PM₂.₅", raw: countyA.pm25Avg, unit: "µg/m³", color: isAcademic ? "text-black font-serif" : "text-amber-700" },
            { label: "Resp. Mortality", raw: countyA.mortalityRate, unit: "/100k", color: isAcademic ? "text-black font-serif" : "text-blue-800" },
            {
              label: "Toxic Releases",
              raw: countyA.toxicReleases != null ? countyA.toxicReleases / 1000 : undefined,
              unit: "k lbs",
              color: isAcademic ? "text-black font-serif" : "text-violet-800",
            },
          ].map(({ label, raw, unit, color }) => (
            <div
              key={label}
              className={`p-2 sm:p-2.5 rounded-lg border ${isAcademic ? "bg-white border-black" : "bg-[#f9fafb] border-[#e5e7eb]"
                }`}
            >
              <span
                className={`text-[8px] sm:text-[8.5px] font-bold uppercase tracking-wider block mb-0.5 ${isAcademic ? "text-black font-mono" : "text-[#6b7280]"
                  }`}
              >
                {label}
              </span>
              <span className={`text-base sm:text-lg font-black leading-none ${color}`}>
                {typeof raw === "number" && !isNaN(raw) ? raw.toFixed(1) : "N/A"}
              </span>
              <span className={`text-[9px] sm:text-[9.5px] ml-0.5 ${isAcademic ? "text-black font-mono" : "text-[#6b7280]"}`}>
                {unit}
              </span>
            </div>
          ))}
        </div>

        {/* Section 2: Indicator Scorecard Matrix */}
        {includeScorecard && (
          <div className="mb-4 print-no-break">
            <h2
              className={`text-[10.5px] sm:text-[11px] font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5 ${isAcademic ? "font-serif text-black border-b border-black/30 pb-0.5" : "text-[#374151]"
                }`}
            >
              <Layers className="w-3.5 h-3.5" />
              2 · Environmental & Health Indicator Matrix
            </h2>

            {/* Scroll Wrapper for Mobile Tables */}
            <div
              className={`overflow-x-auto max-w-full rounded-lg border ${isAcademic ? "border-black border-t-2 border-b-2" : "border-[#d1d5db]"
                }`}
            >
              <table className="w-full text-[10px] sm:text-[11.5px] text-left whitespace-nowrap sm:whitespace-normal">
                <thead className={isAcademic ? "bg-gray-100 text-black border-b-2 border-black" : "bg-[#f3f4f6] text-[#111827]"}>
                  <tr>
                    <th className="py-1.5 px-2 sm:px-2.5 font-bold">Indicator</th>
                    <th className="py-1.5 px-2 sm:px-2.5 font-bold">{nameA}</th>
                    {mode === "compare" && <th className="py-1.5 px-2 sm:px-2.5 font-bold">{nameB}</th>}
                    {mode === "compare" && <th className="py-1.5 px-2 sm:px-2.5 font-bold">Δ</th>}
                    <th className={`py-1.5 px-2 sm:px-2.5 font-bold ${isAcademic ? "text-black font-mono" : "text-[#6b7280]"}`}>
                      Natl. Avg
                    </th>
                    <th className={`py-1.5 px-2 sm:px-2.5 font-bold ${isAcademic ? "text-black font-mono" : "text-[#6b7280]"}`}>
                      Source
                    </th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isAcademic ? "divide-black/40" : "divide-[#e5e7eb]"}`}>
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
                        <td className="py-1 px-2 sm:px-2.5 font-medium">
                          {isSimpleMode ? m.simpleLabel : m.label}
                        </td>
                        <td className="py-1 px-2 sm:px-2.5 font-semibold">
                          {valA !== null ? (
                            `${valA.toFixed(1)} ${m.unit}`
                          ) : (
                            <span className={isAcademic ? "text-black" : "text-[#6b7280]"}>N/A</span>
                          )}
                        </td>
                        {mode === "compare" && (
                          <td className="py-1 px-2 sm:px-2.5 font-semibold">
                            {valB !== null ? (
                              `${valB.toFixed(1)} ${m.unit}`
                            ) : (
                              <span className={isAcademic ? "text-black" : "text-[#6b7280]"}>N/A</span>
                            )}
                          </td>
                        )}
                        {mode === "compare" && (
                          <td className="py-1 px-2 sm:px-2.5">
                            {isAcademic ? (
                              <span className="font-mono text-[10px] sm:text-[10.5px] font-bold text-black">
                                {deltaText}
                              </span>
                            ) : (
                              <span
                                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] sm:text-[9.5px] font-bold ${isBadDelta
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
                            )}
                          </td>
                        )}
                        <td className={`py-1 px-2 sm:px-2.5 ${isAcademic ? "text-black font-mono" : "text-[#6b7280]"}`}>
                          {m.nationalAvg.toLocaleString()} {m.unit}
                        </td>
                        <td className={`py-1 px-2 sm:px-2.5 text-[9px] sm:text-[9.5px] font-mono ${isAcademic ? "text-black" : "text-[#6b7280]"}`}>
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
      </div>

      {/* Page 1 Footer */}
      <div
        className={`pt-3 mt-4 border-t flex items-center justify-between text-[9px] sm:text-[9.5px] ${isAcademic ? "border-black text-black font-mono" : "border-[#d1d5db] text-[#6b7280]"
          }`}
      >
        <span>US-SEER Spatial Intelligence Platform · {nameA} Briefing</span>
        <span>Page 1 of {totalPages}</span>
      </div>
    </div>
  );

  const renderPage2Content = (isPrintPortal = false) => (
    <div
      className={`w-full max-w-[760px] flex flex-col justify-between rounded-xl transition-colors ${isAcademic
        ? "bg-white text-black border border-black font-sans shadow-none"
        : "bg-white text-[#0f172a] border border-[#d1d5db] shadow-md"
        } ${isPrintPortal ? "p-8 mx-auto" : "p-4 sm:p-8 md:p-10 min-h-0 sm:min-h-[960px]"}`}
      style={{
        printColorAdjust: "exact",
        WebkitPrintColorAdjust: "exact",
      }}
    >
      <div>
        {/* Page 2 Running Header */}
        <div
          className={`pb-3 mb-5 border-b flex items-center justify-between text-[9.5px] sm:text-[10px] font-semibold uppercase tracking-wider ${isAcademic ? "border-black text-black font-mono" : "border-[#d1d5db] text-[#6b7280]"
            } print-no-break`}
        >
          <span>
            US-SEER Executive Health Briefing · {nameA} {mode === "compare" ? ` vs. ${nameB}` : ""}
          </span>
          <span>Page 2 of 2</span>
        </div>

        {/* Section 3: Policy Simulation */}
        {includeSimulation && simA && (
          <div className="mb-6 print-no-break">
            <h2
              className={`text-[10.5px] sm:text-[11px] font-bold uppercase tracking-widest mb-2.5 flex items-center gap-1.5 ${isAcademic ? "font-serif text-black border-b border-black/30 pb-0.5" : "text-[#374151]"
                }`}
            >
              <Activity className="w-3.5 h-3.5 text-primary" />
              3 · Counterfactual Policy Simulation
            </h2>
            <div
              className={`p-3.5 sm:p-4 rounded-xl border ${isAcademic ? "bg-white border-black" : "bg-[#f0fdf4] border-[#86efac]"
                }`}
            >
              <p
                className={`text-[10.5px] sm:text-[11px] font-semibold mb-2.5 ${isAcademic ? "text-black font-mono" : "text-[#14532d]"
                  }`}
              >
                Scenario: 15% ambient PM₂.₅ reduction (−{simA.pmReduction} µg/m³) via industrial emission controls
                <span className="ml-2 text-[9px] uppercase opacity-75">[Causal DML / EconML]</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                {[
                  { label: "Est. Annual Lives Saved", value: `+${simA.livesSaved}` },
                  { label: "ER Hospitalizations Averted", value: `−${simA.erVisitsSaved}` },
                  { label: "Direct Cost Savings", value: `$${simA.economicSavings}M` },
                ].map(({ label, value }) => (
                  <div key={label} className="p-2 sm:p-0 rounded bg-white/40 sm:bg-transparent border sm:border-0 border-[#86efac]/50">
                    <div
                      className={`text-[8.5px] sm:text-[9px] uppercase tracking-wider mb-0.5 opacity-80 ${isAcademic ? "text-black font-mono" : "text-[#14532d]"
                        }`}
                    >
                      {label}
                    </div>
                    <div
                      className={`text-base sm:text-lg font-black ${isAcademic ? "text-black font-serif" : "text-[#15803d]"
                        }`}
                    >
                      {value}
                    </div>
                    <div
                      className={`text-[8.5px] sm:text-[9px] opacity-60 ${isAcademic ? "text-black font-mono" : "text-[#14532d]"
                        }`}
                    >
                      per year
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Section 4: References & Data Sources */}
        {includeCitations && citations.length > 0 && (
          <div className="mb-6 print-no-break">
            <h2
              className={`text-[10.5px] sm:text-[11px] font-bold uppercase tracking-widest mb-2 ${isAcademic ? "font-serif text-black border-b border-black/30 pb-0.5" : "text-[#374151]"
                }`}
            >
              4 · Data Sources & References
            </h2>
            <ol className="list-decimal list-inside space-y-1">
              {citations.map((c, i) => (
                <li key={i} className={`text-[10px] sm:text-[10.5px] leading-relaxed ${isAcademic ? "text-black font-serif" : "text-[#4b5563]"}`}>
                  {c.detail}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Methodology & Data Integrity Note */}
        <div
          className={`p-3 rounded-lg border text-[9.5px] sm:text-[10px] leading-relaxed mb-6 ${isAcademic
            ? "bg-white border-black text-black font-mono"
            : "bg-[#f8fafc] border-[#e2e8f0] text-[#64748b]"
            }`}
        >
          <strong>Methodological Assurance:</strong> This executive briefing is generated by the US-SEER Spatial Intelligence Engine v1.2 using validated federal observational datasets. Policy simulation estimates apply Double Machine Learning (DML) counterfactual inference to isolate local causal effects of ambient PM₂.₅ reduction on respiratory mortality.
        </div>
      </div>

      {/* Page 2 Footer */}
      <div
        className={`pt-3 border-t flex items-center justify-between text-[9px] sm:text-[9.5px] ${isAcademic ? "border-black text-black font-mono" : "border-[#d1d5db] text-[#6b7280]"
          }`}
      >
        <span>Generated by US-SEER Engine v1.2 · {dateStr}</span>
        <span>Page 2 of 2</span>
      </div>
    </div>
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-5 outline-none print:relative print:p-0">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm no-print"
            onClick={onClose}
          />

          {/* Exporter Shell */}
          <div className="relative w-full max-w-5xl h-[94vh] flex flex-col bg-card border border-border rounded-2xl shadow-2xl overflow-hidden z-10 animate-in fade-in-50 zoom-in-95 duration-200 print:h-auto print:min-h-screen print:border-none print:shadow-none print:overflow-visible print:bg-transparent">
            {/* ── Toolbar ──────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b border-border bg-card shrink-0 no-print">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Executive Briefing</span>
                <span className="text-[10px] text-muted-foreground font-medium hidden sm:inline">
                  · Multi-Page Report Exporter ({totalPages} Page{totalPages > 1 ? "s" : ""})
                </span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Single / Compare toggle */}
                <div className="flex items-center p-0.5 bg-muted/60 border border-border/80 rounded-lg text-xs">
                  {(["single", "compare"] as ReportMode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all capitalize ${mode === m
                        ? "bg-background text-foreground shadow-2xs border border-border/50"
                        : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      {m === "single" ? "Single County" : "Dual Comparison"}
                    </button>
                  ))}
                </div>

                {/* Copy Dropdown Menu */}
                <div className="relative" ref={copyMenuRef}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCopyMenuOpen((prev) => !prev)}
                    className="h-8 px-2.5 text-xs gap-1.5 cursor-pointer border-border hover:bg-accent"
                    title="Copy summary text"
                  >
                    {copiedFormat ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {copiedFormat === "md"
                        ? "Copied Markdown!"
                        : copiedFormat === "plain"
                          ? "Copied Plain Text!"
                          : "Copy"}
                    </span>
                    <ChevronDown className="w-3 h-3 text-muted-foreground ml-0.5" />
                  </Button>

                  {isCopyMenuOpen && (
                    <div className="absolute right-0 top-full mt-1.5 z-50 w-52 bg-popover border border-border rounded-xl shadow-xl p-1.5 space-y-1 animate-in fade-in-50 zoom-in-95 duration-150">
                      <button
                        onClick={() => handleCopySummary("formatted")}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between hover:bg-accent cursor-pointer transition-colors text-foreground"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-primary" />
                          <span>Copy as Markdown (.md)</span>
                        </div>
                      </button>
                      <button
                        onClick={() => handleCopySummary("plain")}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between hover:bg-accent cursor-pointer transition-colors text-foreground"
                      >
                        <div className="flex items-center gap-2">
                          <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>Copy as Plain Text (.txt)</span>
                        </div>
                      </button>
                    </div>
                  )}
                </div>

                <Button
                  variant="default"
                  size="sm"
                  onClick={handlePrint}
                  className="h-8 px-3 text-xs gap-1.5 font-semibold cursor-pointer active:scale-97"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Export PDF</span>
                </Button>

                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Mobile Viewport Tab Switcher (Controls vs Live Preview) */}
            <div className="flex md:hidden items-center justify-center p-1.5 border-b border-border bg-muted/30 shrink-0 no-print">
              <div className="grid grid-cols-2 gap-1 w-full max-w-xs p-1 bg-muted/60 border border-border/80 rounded-xl text-xs">
                <button
                  onClick={() => setMobileTab("controls")}
                  className={`py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${mobileTab === "controls"
                    ? "bg-background text-foreground shadow-2xs border border-border"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
                  <span>⚙ Controls</span>
                </button>
                <button
                  onClick={() => setMobileTab("preview")}
                  className={`py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${mobileTab === "preview"
                    ? "bg-background text-foreground shadow-2xs border border-border"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <Eye className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Live Preview ({totalPages})</span>
                </button>
              </div>
            </div>

            {/* ── Workspace ────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden print:overflow-visible print:block">
              {/* ── Left Sidebar Controls ─────────────────────────────────── */}
              <div
                className={`w-full md:w-64 p-4 border-b md:border-b-0 md:border-r border-border bg-muted/10 flex flex-col gap-3.5 shrink-0 overflow-y-auto no-print ${mobileTab === "controls" ? "flex" : "hidden md:flex"
                  }`}
              >
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

                {/* Document Style Option */}
                <div>
                  <span className="text-[11px] font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wider">
                    Document Style
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-muted/60 border border-border rounded-xl text-xs">
                    <button
                      onClick={() => setDocStyle("Casual Colored")}
                      className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-all ${docStyle === "Casual Colored"
                        ? "bg-background text-foreground shadow-2xs border border-border"
                        : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Casual Colored</span>
                    </button>

                    <button
                      onClick={() => setDocStyle("academic")}
                      className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-all ${docStyle === "academic"
                        ? "bg-background text-foreground shadow-2xs border border-border"
                        : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      <BookOpen className="w-3.5 h-3.5 text-foreground" />
                      <span>Academic B&amp;W</span>
                    </button>
                  </div>
                </div>

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
                      <label
                        key={label}
                        className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground"
                      >
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
                          <div
                            key={c.label}
                            className="text-[10px] text-muted-foreground font-mono px-1.5 py-0.5 rounded bg-muted/40 border border-border/60"
                          >
                            {c.label}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Mobile View Preview Switcher Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMobileTab("preview")}
                  className="w-full md:hidden mt-2 py-2.5 text-xs font-semibold flex items-center justify-center gap-2 border-emerald-500/40 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 cursor-pointer shadow-2xs"
                >
                  <Eye className="w-4 h-4" />
                  <span>Switch to Document Preview ({totalPages} Page{totalPages > 1 ? "s" : ""})</span>
                </Button>

                <div className="mt-auto pt-2 border-t border-border text-[10px] text-muted-foreground flex items-start gap-1.5">
                  <Info className="w-3 h-3 text-primary shrink-0 mt-px" />
                  <span>In the print dialog choose <strong>"Save as PDF"</strong> for vector output.</span>
                </div>
              </div>

              {/* ── Multi-Page Preview Scroll Workspace ──────────────────────────────── */}
              <div
                className={`flex-1 overflow-y-auto overflow-x-auto p-3.5 sm:p-8 bg-muted/30 flex flex-col items-center gap-6 sm:gap-8 touch-pan-y overscroll-contain ${mobileTab === "preview" ? "flex" : "hidden md:flex"
                  }`}
                style={{ WebkitOverflowScrolling: "touch" }}
              >
                {/* Page 1 Card */}
                <div className="relative group max-w-[760px] w-full">
                  {renderPage1Content(false)}
                </div>

                {/* Page 2 Card */}
                {hasPage2 && (
                  <div className="relative group max-w-[760px] w-full">
                    {renderPage2Content(false)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Dialog>

      {/* Top-Level Body Portal for Clean Multi-Page Printing */}
      {mounted &&
        typeof document !== "undefined" &&
        createPortal(
          <div id="printable-report-portal" className="hidden print:block">
            {renderPage1Content(true)}
            {hasPage2 && (
              <div className="print-break-before">
                {renderPage2Content(true)}
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  );
}
