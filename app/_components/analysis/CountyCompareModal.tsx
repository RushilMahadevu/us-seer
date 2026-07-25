"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { CountyDataMap, CountyData } from "@/app/_lib/types";
import { Dialog } from "@/app/_components/ui/dialog";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/app/_components/ui/card";
import { Badge } from "@/app/_components/ui/badge";
import { Button } from "@/app/_components/ui/button";
import { useSimpleMode } from "@/app/_lib/simple-mode-context";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";
import {
  X,
  Scale,
  ArrowUpDown,
  Search,
  Check,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Wind,
  Activity,
  Stethoscope,
  Factory,
  HeartPulse,
  Users,
  DollarSign,
  Droplets,
  Sparkles,
  Layers,
  MapPin,
} from "lucide-react";

interface CountyCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  countyDataMap: CountyDataMap;
  initialFipsA?: string | null;
  initialFipsB?: string | null;
}

// Preset popular county comparison pairings
const QUICK_PRESETS = [
  { label: "Harris, TX vs. Cook, IL", fipsA: "48201", fipsB: "17031" },
  { label: "Los Angeles, CA vs. Bronx, NY", fipsA: "06037", fipsB: "36005" },
  { label: "Allegheny, PA vs. Fulton, GA", fipsA: "42003", fipsB: "13121" },
  { label: "Wayne, MI vs. Miami-Dade, FL", fipsA: "26163", fipsB: "12086" },
];

interface MetricConfig {
  key: keyof CountyData;
  label: string;
  shortLabel: string;
  simpleLabel: string;
  unit: string;
  higherIsBad: boolean;
  icon: React.ReactNode;
}

const COMPARISON_METRICS: MetricConfig[] = [
  {
    key: "overallRisk",
    label: "Overall Risk Score",
    shortLabel: "Overall Risk",
    simpleLabel: "Health & Environmental Risk",
    unit: "/100",
    higherIsBad: true,
    icon: <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />,
  },
  {
    key: "pm25Avg",
    label: "PM2.5 Pollution Level",
    shortLabel: "PM2.5",
    simpleLabel: "Air Pollution (PM2.5)",
    unit: "µg/m³",
    higherIsBad: true,
    icon: <Wind className="w-3.5 h-3.5 text-amber-400" />,
  },
  {
    key: "mortalityRate",
    label: "Respiratory Mortality Rate",
    shortLabel: "Mortality",
    simpleLabel: "Lung Disease Deaths",
    unit: "per 100k",
    higherIsBad: true,
    icon: <Activity className="w-3.5 h-3.5 text-blue-400" />,
  },
  {
    key: "toxicReleases",
    label: "Toxic Chemical Releases",
    shortLabel: "Toxic Releases",
    simpleLabel: "Chemical Releases",
    unit: "lbs/yr",
    higherIsBad: true,
    icon: <Factory className="w-3.5 h-3.5 text-slate-400" />,
  },
  {
    key: "copdPrev",
    label: "COPD Prevalence",
    shortLabel: "COPD Rate",
    simpleLabel: "Severe Lung Issues (COPD)",
    unit: "%",
    higherIsBad: true,
    icon: <Stethoscope className="w-3.5 h-3.5 text-teal-400" />,
  },
  {
    key: "asthmaPrev",
    label: "Asthma Prevalence",
    shortLabel: "Asthma Rate",
    simpleLabel: "Asthma Rate",
    unit: "%",
    higherIsBad: true,
    icon: <Droplets className="w-3.5 h-3.5 text-fuchsia-400" />,
  },
  {
    key: "smokingPrev",
    label: "Smoking Prevalence",
    shortLabel: "Smoking Rate",
    simpleLabel: "Smoking Rate",
    unit: "%",
    higherIsBad: true,
    icon: <Activity className="w-3.5 h-3.5 text-orange-400" />,
  },
  {
    key: "mdRate",
    label: "Primary Care MD Density",
    shortLabel: "MD Density",
    simpleLabel: "Doctor Availability",
    unit: "per 100k",
    higherIsBad: false,
    icon: <HeartPulse className="w-3.5 h-3.5 text-emerald-400" />,
  },
  {
    key: "pctPoverty",
    label: "Poverty Rate",
    shortLabel: "Poverty %",
    simpleLabel: "Poverty Level",
    unit: "%",
    higherIsBad: true,
    icon: <DollarSign className="w-3.5 h-3.5 text-yellow-400" />,
  },
  {
    key: "pctUninsured",
    label: "Uninsured Population Rate",
    shortLabel: "Uninsured %",
    simpleLabel: "People Without Insurance",
    unit: "%",
    higherIsBad: true,
    icon: <Users className="w-3.5 h-3.5 text-cyan-400" />,
  },
];

function fmtVal(val: number | undefined, unit: string, isSimple: boolean): string {
  if (val === undefined || isNaN(val)) return "—";
  if (isSimple) {
    if (unit === "lbs/yr") {
      if (val > 1_000_000) return "Very High 🔴";
      if (val > 100_000) return "Moderate 🟠";
      if (val > 0) return "Low 🟢";
      return "Minimal 🟢";
    }
    if (unit === "µg/m³") {
      if (val < 5) return `${val.toFixed(1)} (Clean) 🟢`;
      if (val < 9) return `${val.toFixed(1)} (Fair) 🟡`;
      if (val < 12) return `${val.toFixed(1)} (Elevated) 🟠`;
      return `${val.toFixed(1)} (High) 🔴`;
    }
  }
  if (unit === "lbs/yr") {
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M lbs`;
    if (val >= 1_000) return `${(val / 1_000).toFixed(1)}k lbs`;
    return `${val.toLocaleString()} lbs`;
  }
  if (unit === "%") return `${val.toFixed(1)}%`;
  if (unit === "/100") return `${val.toFixed(1)} / 100`;
  return `${val.toFixed(1)} ${unit}`;
}

/* ── Custom Search Combobox Component ───────────────────────────── */
function CountySearchInput({
  label,
  color,
  badgeBg,
  countyList,
  selectedFips,
  onSelectFips,
  selectedCountyData,
  isSimpleMode,
}: {
  label: string;
  color: string;
  badgeBg: string;
  countyList: Array<{ fips: string; name: string; state?: string }>;
  selectedFips: string;
  onSelectFips: (fips: string) => void;
  selectedCountyData?: CountyData;
  isSimpleMode?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedItem = useMemo(() => {
    return countyList.find((c) => c.fips === selectedFips);
  }, [countyList, selectedFips]);

  useEffect(() => {
    if (selectedItem) {
      setQuery(selectedItem.name);
    }
  }, [selectedItem]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        // Reset query to selected name if unselected
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
    <div ref={containerRef} className={`p-3.5 rounded-xl border ${badgeBg} space-y-2 relative`}>
      <label className={`text-xs font-bold ${color} flex items-center justify-between`}>
        <span className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${color.replace("text-", "bg-")}`} />
          {label}
        </span>
        <span className="text-[10px] text-muted-foreground font-normal">Type to search</span>
      </label>

      <div className="relative">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          placeholder="Search county name or FIPS code..."
          className="w-full h-10 pl-9 pr-8 rounded-lg border border-border bg-background text-sm font-semibold text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setIsOpen(true);
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Autocomplete Search Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-56 overflow-y-auto bg-popover border border-border rounded-xl shadow-2xl divide-y divide-border/40 animate-in fade-in-50 duration-150">
          {filteredList.length > 0 ? (
            filteredList.map((c) => (
              <button
                key={`search-${c.fips}`}
                onClick={() => {
                  onSelectFips(c.fips);
                  setQuery(c.name);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-accent cursor-pointer transition-colors ${
                  c.fips === selectedFips ? "bg-accent/60 font-bold text-primary" : "text-foreground"
                }`}
              >
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span>{c.name}</span>
                </div>
                <span className="font-mono text-[10px] text-muted-foreground">FIPS {c.fips}</span>
              </button>
            ))
          ) : (
            <div className="p-3 text-xs text-muted-foreground text-center">
              No matching counties found
            </div>
          )}
        </div>
      )}

      {selectedCountyData && (
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
          <span>Pop: {selectedCountyData.population ? selectedCountyData.population.toLocaleString() : "N/A"}</span>
          <span>
            {isSimpleMode ? "Overall Risk: " : "Risk Score: "}
            <strong className="text-foreground">{selectedCountyData.overallRisk?.toFixed(1) ?? "—"}</strong>/100
          </span>
        </div>
      )}
    </div>
  );
}

export default function CountyCompareModal({
  isOpen,
  onClose,
  countyDataMap,
  initialFipsA = "48201", // Harris County, TX
  initialFipsB = "17031", // Cook County, IL
}: CountyCompareModalProps) {
  const { isSimpleMode } = useSimpleMode();

  // All county entries sorted alphabetically by name
  const countyList = useMemo(() => {
    return Object.entries(countyDataMap)
      .map(([fips, data]) => ({
        fips,
        name: data.County_Name || `FIPS ${fips}`,
        data,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [countyDataMap]);

  const [fipsA, setFipsA] = useState<string>(initialFipsA || countyList[0]?.fips || "48201");
  const [fipsB, setFipsB] = useState<string>(initialFipsB || countyList[1]?.fips || "17031");

  const countyA = countyDataMap[fipsA] || countyList[0]?.data;
  const countyB = countyDataMap[fipsB] || countyList[1]?.data;

  const nameA = countyA?.County_Name || "County A";
  const nameB = countyB?.County_Name || "County B";

  // Compute maximum values across dataset for Radar normalization
  const maxValues = useMemo(() => {
    const minsMaxs: Record<string, number> = {};
    COMPARISON_METRICS.forEach((m) => {
      let max = 0;
      Object.values(countyDataMap).forEach((c) => {
        const v = c[m.key];
        if (typeof v === "number" && !isNaN(v) && v > max) max = v;
      });
      minsMaxs[m.key] = max || 1;
    });
    return minsMaxs;
  }, [countyDataMap]);

  // Radar chart dataset normalized to 0-100 scale
  const radarData = useMemo(() => {
    return COMPARISON_METRICS.map((m) => {
      const rawA = countyA ? (countyA[m.key] as number) || 0 : 0;
      const rawB = countyB ? (countyB[m.key] as number) || 0 : 0;
      const max = maxValues[m.key] || 1;

      return {
        subject: isSimpleMode ? m.simpleLabel : m.shortLabel,
        normA: Math.round((rawA / max) * 100),
        normB: Math.round((rawB / max) * 100),
        rawAFormatted: fmtVal(rawA, m.unit, isSimpleMode),
        rawBFormatted: fmtVal(rawB, m.unit, isSimpleMode),
      };
    });
  }, [countyA, countyB, maxValues, isSimpleMode]);

  // Swap Counties A and B
  const handleSwap = () => {
    setFipsA(fipsB);
    setFipsB(fipsA);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4 md:p-6 overflow-y-auto animate-in fade-in duration-200">
        <div className="relative w-full max-w-5xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto">
          
          {/* Header Bar */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-border bg-muted/40 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2 leading-none">
                  {isSimpleMode ? "Compare 2 Counties Side-by-Side" : "Dual-County Side-by-Side Comparison"}
                  {isSimpleMode ? (
                    <Badge variant="outline" className="hidden sm:inline-flex text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/20">
                      Simplify Mode
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="hidden sm:inline-flex text-[10px] bg-primary/10 text-primary border-primary/20">
                      Interactive Lab
                    </Badge>
                  )}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5 leading-none">
                  {isSimpleMode
                    ? "See how two locations stack up in plain English — pollution, health, and doctors"
                    : "Head-to-head spatial vulnerability, environmental exposure, and health metrics"}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Presets Bar */}
          <div className="px-4 sm:px-6 py-2.5 bg-muted/20 border-b border-border flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-none">
            <span className="text-[11px] font-semibold text-muted-foreground shrink-0 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Presets:
            </span>
            {QUICK_PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => {
                  setFipsA(preset.fipsA);
                  setFipsB(preset.fipsB);
                }}
                className={`cursor-pointer px-2.5 py-1 rounded-md text-[11px] font-medium shrink-0 transition-colors ${
                  fipsA === preset.fipsA && fipsB === preset.fipsB
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "bg-background border border-border hover:bg-accent text-foreground"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            
            {/* Search Input Row (Replaced Dropdown Selects) */}
            <div className="grid grid-cols-1 md:grid-cols-11 gap-3 items-center">
              
              {/* County A Search Combobox */}
              <div className="md:col-span-5">
                <CountySearchInput
                  label="Primary County (A)"
                  color="text-primary"
                  badgeBg="border-primary/30 bg-primary/5"
                  countyList={countyList}
                  selectedFips={fipsA}
                  onSelectFips={setFipsA}
                  selectedCountyData={countyA}
                  isSimpleMode={isSimpleMode}
                />
              </div>

              {/* Swap Button */}
              <div className="md:col-span-1 flex justify-center py-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleSwap}
                  className="rounded-full h-9 w-9 border-border bg-background hover:bg-accent shadow-xs hover:rotate-180 transition-transform duration-300 cursor-pointer"
                  title="Swap Counties"
                >
                  <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>

              {/* County B Search Combobox */}
              <div className="md:col-span-5">
                <CountySearchInput
                  label="Comparison County (B)"
                  color="text-sky-400"
                  badgeBg="border-sky-500/30 bg-sky-500/5"
                  countyList={countyList}
                  selectedFips={fipsB}
                  onSelectFips={setFipsB}
                  selectedCountyData={countyB}
                  isSimpleMode={isSimpleMode}
                />
              </div>

            </div>

            {/* Radar Chart & Key Delta Highlights Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              
              {/* Vulnerability Radar Chart */}
              <Card className="lg:col-span-7 flex flex-col justify-between border-border bg-card shadow-xs">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center justify-between">
                    <span>{isSimpleMode ? "Visual Overview Overlay" : "Relative Risk Profile Overlay"}</span>
                    <Badge variant="secondary" className="text-[10px] font-normal">0–100 Normalized Scale</Badge>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {isSimpleMode
                      ? "Easily see which county has higher environmental and health burdens"
                      : "Multi-dimensional radar comparison across 10 key environmental and public health parameters"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 min-h-[300px] sm:min-h-[340px] pt-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                      <PolarGrid stroke="currentColor" className="text-border" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: "currentColor", fontSize: isSimpleMode ? 10 : 11 }} className="text-muted-foreground font-medium" />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="currentColor" className="text-muted-foreground/40 text-[9px]" />
                      <Radar
                        name={nameA}
                        dataKey="normA"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        fillOpacity={0.4}
                      />
                      <Radar
                        name={nameB}
                        dataKey="normB"
                        stroke="#38bdf8"
                        fill="#38bdf8"
                        fillOpacity={0.25}
                      />
                      <Legend
                        wrapperStyle={{ paddingTop: "10px", fontSize: "12px" }}
                      />
                      <RechartsTooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="p-3 bg-popover/95 backdrop-blur-sm border border-border rounded-xl shadow-xl text-xs space-y-1">
                                <p className="font-bold text-foreground">{data.subject}</p>
                                <p className="text-blue-400 font-semibold">{nameA}: {data.rawAFormatted}</p>
                                <p className="text-sky-400 font-semibold">{nameB}: {data.rawBFormatted}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Natural Language Executive Delta Brief */}
              <Card className="lg:col-span-5 flex flex-col border-border bg-card shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    {isSimpleMode ? "Key Differences in Plain English" : "Comparative Insights & Deltas"}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {isSimpleMode ? "Summary of air, chemicals, and doctor availability" : "Automated epidemiological differential assessment"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 flex-1 text-xs">
                  {(() => {
                    const pmA = countyA?.pm25Avg || 0;
                    const pmB = countyB?.pm25Avg || 0;
                    const pmDiffPct = pmB > 0 ? Math.abs(((pmA - pmB) / pmB) * 100).toFixed(0) : "0";

                    const toxA = countyA?.toxicReleases || 0;
                    const toxB = countyB?.toxicReleases || 0;
                    const toxRatio = toxB > 0 ? (toxA / toxB).toFixed(1) : "—";

                    const mdA = countyA?.mdRate || 0;
                    const mdB = countyB?.mdRate || 0;

                    return (
                      <>
                        <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-1">
                          <span className="font-bold text-amber-400 block">Air Quality</span>
                          <p className="text-muted-foreground leading-relaxed">
                            {isSimpleMode ? (
                              <>
                                <strong>{nameA}</strong> has an air pollution level of <strong>{pmA.toFixed(1)}</strong> ({pmA > pmB ? "worse than" : "cleaner than"} <strong>{nameB}</strong> at <strong>{pmB.toFixed(1)}</strong>).
                              </>
                            ) : (
                              <>
                                <strong>{nameA}</strong> has a PM2.5 level of <strong>{pmA.toFixed(1)} µg/m³</strong> compared to <strong>{nameB}</strong> at <strong>{pmB.toFixed(1)} µg/m³</strong> ({pmA > pmB ? `${pmDiffPct}% higher` : `${pmDiffPct}% lower`}).
                              </>
                            )}
                          </p>
                        </div>

                        <div className="p-3 rounded-xl border border-slate-500/20 bg-slate-500/5 space-y-1">
                          <span className="font-bold text-slate-300 block">Toxic Chemical Releases</span>
                          <p className="text-muted-foreground leading-relaxed">
                            {toxA > toxB ? (
                              <><strong>{nameA}</strong> releases <strong>{toxRatio}x</strong> more toxic chemical waste into local areas than <strong>{nameB}</strong>.</>
                            ) : (
                              <><strong>{nameB}</strong> releases <strong>{(toxB / (toxA || 1)).toFixed(1)}x</strong> more toxic emissions than <strong>{nameA}</strong>.</>
                            )}
                          </p>
                        </div>

                        <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-1">
                          <span className="font-bold text-emerald-400 block">{isSimpleMode ? "Doctor Shortages" : "Healthcare Density"}</span>
                          <p className="text-muted-foreground leading-relaxed">
                            {isSimpleMode ? (
                              <>
                                <strong>{nameA}</strong> has <strong>{mdA.toFixed(0)} doctors</strong> per 100k people vs. <strong>{mdB.toFixed(0)} doctors</strong> in {nameB}.
                              </>
                            ) : (
                              <>
                                Primary care physician availability is <strong>{mdA.toFixed(0)} MDs/100k</strong> in {nameA} vs. <strong>{mdB.toFixed(0)} MDs/100k</strong> in {nameB}.
                              </>
                            )}
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </CardContent>
              </Card>

            </div>

            {/* Comprehensive Metrics Scorecard Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  {isSimpleMode ? "Plain-English Metrics Table" : "Head-to-Head Scorecard Table"}
                </h3>
                <span className="text-[11px] text-muted-foreground">Color pills highlight higher burden</span>
              </div>

              <div className="border border-border rounded-xl overflow-hidden bg-card shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                        <th className="py-3 px-4">Metric</th>
                        <th className="py-3 px-4 text-blue-400">{nameA}</th>
                        <th className="py-3 px-4 text-sky-400">{nameB}</th>
                        <th className="py-3 px-4 text-right">Comparison</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {COMPARISON_METRICS.map((m) => {
                        const valA = countyA ? (countyA[m.key] as number) : undefined;
                        const valB = countyB ? (countyB[m.key] as number) : undefined;

                        const hasBoth = valA !== undefined && valB !== undefined && !isNaN(valA) && !isNaN(valB);
                        let diffPct = 0;
                        let aIsWorse = false;

                        if (hasBoth && valB !== 0) {
                          diffPct = ((valA - valB) / Math.abs(valB)) * 100;
                          aIsWorse = m.higherIsBad ? valA > valB : valA < valB;
                        }

                        return (
                          <tr key={m.key} className="hover:bg-muted/30 transition-colors">
                            <td className="py-3 px-4 font-semibold text-foreground flex items-center gap-2">
                              {m.icon}
                              <span>{isSimpleMode ? m.simpleLabel : m.label}</span>
                            </td>
                            <td className={`py-3 px-4 font-bold ${aIsWorse ? "text-rose-400" : "text-foreground"}`}>
                              {fmtVal(valA, m.unit, isSimpleMode)}
                            </td>
                            <td className={`py-3 px-4 font-bold ${hasBoth && !aIsWorse && valA !== valB ? "text-rose-400" : "text-foreground"}`}>
                              {fmtVal(valB, m.unit, isSimpleMode)}
                            </td>
                            <td className="py-3 px-4 text-right font-medium">
                              {hasBoth ? (
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    valA === valB
                                      ? "bg-muted text-muted-foreground"
                                      : aIsWorse
                                      ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                      : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  }`}
                                >
                                  {valA > valB ? (
                                    <TrendingUp className="w-3 h-3" />
                                  ) : valA < valB ? (
                                    <TrendingDown className="w-3 h-3" />
                                  ) : null}
                                  {valA === valB
                                    ? "Equal"
                                    : isSimpleMode
                                    ? `${valA > valB ? "Higher in A" : "Higher in B"}`
                                    : `${Math.abs(diffPct).toFixed(0)}% ${valA > valB ? "Higher in A" : "Lower in A"}`}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>

          {/* Footer Bar */}
          <div className="px-4 sm:px-6 py-3 border-t border-border bg-muted/40 flex items-center justify-between shrink-0">
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Data synchronized with EPA TRI, CDC WONDER, &amp; US Census
            </span>
            <Button variant="default" size="sm" onClick={onClose} className="ml-auto font-semibold cursor-pointer">
              Done Comparing
            </Button>
          </div>

        </div>
      </div>
    </Dialog>
  );
}
