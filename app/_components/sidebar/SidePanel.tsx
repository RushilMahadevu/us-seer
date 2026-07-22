"use client";

import React, { useState } from "react";
import { CountyData } from "@/app/_lib/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/app/_components/ui/card";
import { Badge } from "@/app/_components/ui/badge";
import { Button } from "@/app/_components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/app/_components/ui/tabs";
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from "@/app/_components/ui/dialog";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from "recharts";
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
} from "lucide-react";

interface SidePanelProps {
  fips: string | null;
  countyData: CountyData | null;
}

/* ── Tiny helpers ─────────────────────────────────────────────── */

function StatCard({
  label,
  value,
  unit,
  icon,
  color = "text-primary",
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  icon: React.ReactNode;
  color?: string;
}) {
  return (
    <div className="p-3 rounded-xl border border-border bg-background/70 space-y-1.5 shadow-xs hover:shadow-sm transition-shadow">
      <div className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider ${color}`}>
        {icon}
        {label}
      </div>
      <div className="text-sm font-bold text-foreground leading-none">
        {value}
        {unit && <span className="ml-1 text-[10px] font-normal text-muted-foreground">{unit}</span>}
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

/* ── Main Component ───────────────────────────────────────────── */

export default function SidePanel({ fips, countyData }: SidePanelProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  /* Empty state */
  if (!fips || !countyData) {
    return (
      <Card className="h-full flex flex-col items-center justify-center p-8 text-center border-border bg-card shadow-xs">
        <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/15 flex items-center justify-center mb-4">
          <MapPin className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-base font-bold mb-1.5">Select a County</CardTitle>
        <CardDescription className="max-w-[240px] text-[11px] leading-relaxed">
          Click any county on the map to view health metrics, pollution levels, demographics, and infrastructure data.
        </CardDescription>
      </Card>
    );
  }

  const pm25Display  = countyData.pm25Avg      ? +countyData.pm25Avg.toFixed(2)             : "—";
  const toxicDisplay = countyData.toxicReleases ? Math.round(countyData.toxicReleases).toLocaleString() : "0";

  const riskLevel =
    countyData.overallRisk != null
      ? countyData.overallRisk > 60
        ? { label: "High Risk",     variant: "destructive" as const }
        : countyData.overallRisk > 40
          ? { label: "Moderate",    variant: "secondary"  as const }
          : { label: "Low Risk",    variant: "outline"    as const }
      : null;

  const chartData = [
    { name: "Asthma",  value: countyData.asthmaPrev  || 0, color: "#c026d3" },
    { name: "COPD",    value: countyData.copdPrev    || 0, color: "#0d9488" },
    { name: "Smoking", value: countyData.smokingPrev || 0, color: "#ea580c" },
  ];

  return (
    <>
      <Card className="h-full flex flex-col border-border bg-card shadow-xs overflow-hidden">
        <Tabs defaultValue="overview" className="flex flex-col h-full min-h-0 w-full">

          {/* ── Header ─────────────────────────────────────────── */}
          <CardHeader className="pb-3 pt-4 px-4 border-b border-border/50 shrink-0">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1 min-w-0">
                <Badge variant="outline" className="font-mono text-[9px] tracking-widest uppercase text-muted-foreground px-1.5">
                  FIPS {fips}
                </Badge>
                <CardTitle className="text-lg font-extrabold text-foreground tracking-tight leading-snug truncate">
                  {countyData.County_Name || `County ${fips}`}
                </CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-lg shrink-0 text-muted-foreground hover:text-foreground hover:bg-accent"
                onClick={() => setIsFullscreen(true)}
                title="Expand full analytics"
                aria-label="Open fullscreen analytics"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <CardDescription className="text-[11px] text-muted-foreground mt-0.5">
              Health, pollution &amp; socioeconomic indicators
            </CardDescription>
          </CardHeader>

          {/* ── Tabs bar ───────────────────────────────────────── */}
          <div className="px-4 pt-2.5 pb-2 shrink-0">
            <TabsList className="grid grid-cols-4 h-8 bg-muted/60 p-0.5 rounded-lg">
              <TabsTrigger value="overview"      className="text-[11px] rounded-md">Overview</TabsTrigger>
              <TabsTrigger value="demographics"  className="text-[11px] rounded-md">Census</TabsTrigger>
              <TabsTrigger value="health"        className="text-[11px] rounded-md">Health</TabsTrigger>
              <TabsTrigger value="care"          className="text-[11px] rounded-md">Infra</TabsTrigger>
            </TabsList>
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
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Vulnerability Index
                      </div>
                      <div className="text-base font-bold text-foreground">
                        {countyData.overallRisk}
                        <span className="text-[10px] font-normal text-muted-foreground ml-1">/ 100</span>
                      </div>
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
                />
                <StatCard
                  label="Median Income"
                  icon={<DollarSign className="w-3 h-3" />}
                  value={countyData.medianIncome ? `$${countyData.medianIncome.toLocaleString()}` : "—"}
                  color="text-emerald-500"
                />
                <StatCard
                  label="PM2.5"
                  icon={<Wind className="w-3 h-3" />}
                  value={pm25Display}
                  unit="µg/m³"
                  color="text-amber-500"
                />
                <StatCard
                  label="Mortality Rate"
                  icon={<Activity className="w-3 h-3" />}
                  value={countyData.mortalityRate ?? "—"}
                  unit="/100k"
                  color="text-blue-500"
                />
              </div>

              {/* Prevalence chart */}
              <div className="p-3.5 rounded-xl border border-border bg-background/70 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-primary" />
                    Disease Prevalence
                  </h4>
                  <Badge variant="outline" className="text-[9px] font-semibold tracking-wide uppercase">CDC PLACES</Badge>
                </div>
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
                        formatter={(val) => [`${Number(val).toFixed(1)}%`, ""]}
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

            {/* ── CENSUS / DEMOGRAPHICS ──────────────────────── */}
            <TabsContent value="demographics" className="space-y-3">
              <div className="rounded-xl border border-border bg-background/70 p-3.5 space-y-3">
                <SectionLabel icon={<PieChart className="w-3.5 h-3.5 text-primary" />}>
                  Socioeconomic Profile
                </SectionLabel>
                <div className="grid grid-cols-2 gap-2">
                  <StatCard label="Poverty Rate"  icon={<DollarSign className="w-3 h-3" />}      value={countyData.pctPoverty  != null ? `${countyData.pctPoverty}%`  : "—"} color="text-rose-500" />
                  <StatCard label="Uninsured"     icon={<HeartHandshake className="w-3 h-3" />}  value={countyData.pctUninsured != null ? `${countyData.pctUninsured}%` : "—"} color="text-amber-500" />
                  <StatCard label="Median Age"    icon={<Calendar className="w-3 h-3" />}        value={countyData.medianAge  != null ? `${countyData.medianAge} yrs`  : "—"} color="text-indigo-500" />
                  <StatCard label="No HS Diploma" icon={<GraduationCap className="w-3 h-3" />}   value={countyData.pctNoHS    != null ? `${countyData.pctNoHS}%`    : "—"} color="text-purple-500" />
                </div>
              </div>

              <div className="rounded-xl border border-border bg-background/70 p-3.5 space-y-3">
                <SectionLabel icon={<Users className="w-3.5 h-3.5 text-sky-500" />}>
                  Racial &amp; Ethnic Distribution
                </SectionLabel>
                <div className="grid grid-cols-2 gap-2">
                  <StatCard label="Non-Hisp. Black" icon={<Users className="w-3 h-3" />} value={countyData.pctBlack    != null ? `${countyData.pctBlack}%`    : "—"} color="text-sky-500" />
                  <StatCard label="Hispanic"         icon={<Users className="w-3 h-3" />} value={countyData.pctHispanic != null ? `${countyData.pctHispanic}%` : "—"} color="text-emerald-500" />
                </div>
              </div>

              <div className="rounded-xl border border-border bg-background/70 p-3.5 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <HomeIcon className="w-3 h-3 text-primary" />
                  Pre-1940 Housing Units
                </div>
                <div className="text-sm font-bold text-foreground">
                  {countyData.housingPre1940 != null ? countyData.housingPre1940.toLocaleString() : "—"}
                  <span className="ml-1 text-[10px] font-normal text-muted-foreground">units</span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Proxy for legacy indoor environmental exposures (e.g., lead paint).
                </p>
              </div>
            </TabsContent>

            {/* ── HEALTH ────────────────────────────────────── */}
            <TabsContent value="health" className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <StatCard label="Asthma"        icon={<Droplets className="w-3 h-3" />}    value={countyData.asthmaPrev  ? `${countyData.asthmaPrev}%`  : "—"} color="text-fuchsia-500" />
                <StatCard label="COPD"          icon={<Stethoscope className="w-3 h-3" />} value={countyData.copdPrev    ? `${countyData.copdPrev}%`    : "—"} color="text-teal-500" />
                <StatCard label="Smoking Rate"  icon={<Cigarette className="w-3 h-3" />}   value={countyData.smokingPrev ? `${countyData.smokingPrev}%` : "—"} color="text-orange-500" />
                <StatCard label="Toxic Releases" icon={<Factory className="w-3 h-3" />}    value={toxicDisplay} unit="lbs" color="text-slate-400" />
              </div>
              <div className="p-3.5 rounded-xl border border-border bg-background/70">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  PM2.5 Exposure Level
                </div>
                <div className="flex items-end gap-1.5">
                  <span className="text-2xl font-extrabold text-foreground">{pm25Display}</span>
                  <span className="text-xs text-muted-foreground mb-0.5">µg/m³</span>
                </div>
                {typeof pm25Display === "number" && (
                  <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-400 to-rose-500"
                      style={{ width: `${Math.min(100, (pm25Display / 15) * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ── INFRA ─────────────────────────────────────── */}
            <TabsContent value="care" className="space-y-3">
              <div className="p-3.5 rounded-xl border border-border bg-background/70 space-y-2">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-500">
                  <HeartPulse className="w-3 h-3" />
                  Physician Density
                </div>
                <div className="text-2xl font-extrabold text-foreground">
                  {countyData.mdRate ?? "—"}
                  <span className="text-xs font-normal text-muted-foreground ml-1.5">MDs / 100k</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-border bg-background/70 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-500">
                    <Map className="w-3 h-3" />
                    USDA Rural-Urban Class.
                  </div>
                  <Badge variant="secondary" className="text-[10px] font-semibold">
                    Code {countyData.rucc ?? "—"}
                  </Badge>
                </div>
                <div className="text-sm font-medium text-foreground">
                  {countyData.rucc && countyData.rucc <= 3
                    ? "Metropolitan Area (High Density)"
                    : countyData.rucc && countyData.rucc <= 6
                      ? "Non-metro Urbanized Area"
                      : "Rural / Non-metropolitan Area"}
                </div>
                {countyData.rucc && (
                  <div className="flex gap-0.5 mt-1">
                    {Array.from({ length: 9 }, (_, i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-sm transition-colors ${
                          i + 1 <= countyData.rucc! ? "bg-indigo-500" : "bg-muted"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      {/* ── FULLSCREEN DIALOG ──────────────────────────────────── */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogHeader>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-widest">
              FIPS {fips}
            </Badge>
            <Badge variant="secondary" className="text-[10px] font-semibold">
              Full Analytics View
            </Badge>
          </div>
          <DialogTitle className="text-2xl font-extrabold mt-2">
            {countyData.County_Name || `County ${fips}`}
          </DialogTitle>
          <DialogDescription>
            Unified view of all environmental, epidemiological, and sociodemographic indicators.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto pr-1 space-y-6 mt-2">
          {/* Section 1 */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <ShieldAlert className="w-3.5 h-3.5 text-primary" />
              Vulnerability &amp; Primary Health Indicators
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Vulnerability Index", value: countyData.overallRisk ?? "—", unit: "/ 100" },
                { label: "Mortality Rate",       value: countyData.mortalityRate ?? "—", unit: "/ 100k" },
                { label: "PM2.5 Exposure",       value: pm25Display,  unit: "µg/m³" },
                { label: "Toxic Releases",       value: toxicDisplay, unit: "lbs" },
              ].map((item) => (
                <div key={item.label} className="p-4 rounded-xl border border-border bg-card">
                  <div className="text-[10px] font-medium text-muted-foreground mb-1">{item.label}</div>
                  <div className="text-2xl font-extrabold text-foreground">
                    {item.value}
                    <span className="text-xs font-normal text-muted-foreground ml-1">{item.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2 */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <PieChart className="w-3.5 h-3.5 text-emerald-500" />
              Census &amp; Socioeconomic Indicators
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Poverty Rate",   value: countyData.pctPoverty   != null ? `${countyData.pctPoverty}%`   : "—", color: "text-rose-500" },
                { label: "Uninsured",      value: countyData.pctUninsured != null ? `${countyData.pctUninsured}%` : "—", color: "text-amber-500" },
                { label: "Median Age",     value: countyData.medianAge    != null ? `${countyData.medianAge} yrs` : "—", color: "text-indigo-500" },
                { label: "No HS Diploma",  value: countyData.pctNoHS      != null ? `${countyData.pctNoHS}%`      : "—", color: "text-purple-500" },
                { label: "Black Pop. %",   value: countyData.pctBlack     != null ? `${countyData.pctBlack}%`     : "—", color: "text-sky-500" },
                { label: "Hispanic Pop. %", value: countyData.pctHispanic != null ? `${countyData.pctHispanic}%`  : "—", color: "text-emerald-500" },
                { label: "Median Income",  value: countyData.medianIncome ? `$${countyData.medianIncome.toLocaleString()}` : "—", color: "text-primary" },
                { label: "Pre-1940 Units", value: countyData.housingPre1940 != null ? countyData.housingPre1940.toLocaleString() : "—", color: "text-muted-foreground" },
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
                Chronic Disease Prevalence
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Asthma",  value: countyData.asthmaPrev,  color: "text-fuchsia-500" },
                  { label: "COPD",    value: countyData.copdPrev,    color: "text-teal-500" },
                  { label: "Smoking", value: countyData.smokingPrev, color: "text-orange-500" },
                ].map((item) => (
                  <div key={item.label} className="p-2.5 rounded-lg bg-muted/40 text-center">
                    <div className={`text-[10px] font-bold uppercase mb-1 ${item.color}`}>{item.label}</div>
                    <div className="text-sm font-bold text-foreground">
                      {item.value ? `${item.value}%` : "—"}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-border bg-card space-y-3">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <HeartPulse className="w-3.5 h-3.5 text-emerald-500" />
                Infrastructure &amp; Classification
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-lg bg-muted/40">
                  <div className="text-[10px] font-bold text-emerald-500 uppercase mb-1">Physician Density</div>
                  <div className="text-sm font-bold text-foreground">{countyData.mdRate ? `${countyData.mdRate} MDs` : "—"}</div>
                  <div className="text-[9px] text-muted-foreground">per 100k pop</div>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/40">
                  <div className="text-[10px] font-bold text-indigo-500 uppercase mb-1">USDA RUCC</div>
                  <div className="text-sm font-bold text-foreground">Code {countyData.rucc ?? "—"}</div>
                  <div className="text-[9px] text-muted-foreground">Urban-Rural spectrum</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Dialog>
    </>
  );
}
