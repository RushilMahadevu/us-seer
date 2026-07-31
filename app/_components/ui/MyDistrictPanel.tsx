"use client";

import React, { useMemo } from "react";
import { CountyDataMap } from "@/app/_lib/types";
import { MY_DISTRICT, REPRESENTATIVE_CONTACT } from "@/app/_lib/district-data";
import { useSimpleMode } from "@/app/_lib/simple-mode-context";
import { Badge } from "@/app/_components/ui/badge";
import { Button } from "@/app/_components/ui/button";
import {
  X,
  MapPin,
  Wind,
  Activity,
  TrendingUp,
  ShieldAlert,
  ExternalLink,
  Navigation,
  Star,
  Users,
  Landmark,
} from "lucide-react";

interface MyDistrictPanelProps {
  isOpen: boolean;
  onClose: () => void;
  countyDataMap: CountyDataMap;
  onZoomToDistrict: () => void;
  onSelectCounty: (fips: string) => void;
}

const EPA_PM25_STANDARD = 9.0; // µg/m³

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-rose-500 font-black text-xs">⚠ #1</span>;
  if (rank <= 3) return <span className="text-amber-500 font-bold text-xs">#{rank}</span>;
  return <span className="text-muted-foreground text-xs">#{rank}</span>;
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, max > 0 ? (value / max) * 100 : 0);
  return (
    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function pm25ToLabel(val: number): string {
  if (val > EPA_PM25_STANDARD) return "⚠️ Polluted";
  if (val > 7.5) return "🟡 Watch";
  return "✅ Clean";
}

function mortalityToLabel(val: number): string {
  if (val > 100) return "🔴 Very High";
  if (val > 70) return "🟠 High";
  if (val > 50) return "🟡 Moderate";
  return "🟢 Low";
}

export default function MyDistrictPanel({
  isOpen,
  onClose,
  countyDataMap,
  onZoomToDistrict,
  onSelectCounty,
}: MyDistrictPanelProps) {
  const { isSimpleMode } = useSimpleMode();

  const rows = useMemo(() => {
    return MY_DISTRICT.counties
      .map((c) => {
        const d = countyDataMap[c.fips];
        return {
          ...c,
          pm25: d?.pm25Avg ?? null,
          mortality: d?.mortalityRate ?? null,
          income: d?.medianIncome ?? null,
          population: d?.population ?? null,
          overallRisk: d?.overallRisk ?? null,
          hasData: !!d,
        };
      })
      .sort((a, b) => {
        if (a.pm25 === null) return 1;
        if (b.pm25 === null) return -1;
        return b.pm25 - a.pm25;
      });
  }, [countyDataMap]);

  const withData = rows.filter((r) => r.hasData);
  const avgPm25 = withData.length
    ? withData.reduce((s, r) => s + (r.pm25 ?? 0), 0) / withData.length
    : null;
  const avgMort = withData.length
    ? withData.reduce((s, r) => s + (r.mortality ?? 0), 0) / withData.length
    : null;
  const totalPop = withData.reduce((s, r) => s + (r.population ?? 0), 0);
  const countiesAboveEpa = withData.filter((r) => (r.pm25 ?? 0) > EPA_PM25_STANDARD).length;
  const maxPm25 = Math.max(...withData.map((r) => r.pm25 ?? 0));
  const maxMort = Math.max(...withData.map((r) => r.mortality ?? 0));
  const homeCounty = rows.find((r) => r.isHome);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="My District Panel"
    >
      <div
        className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="px-6 pt-6 pb-4 border-b border-border/60 shrink-0 bg-gradient-to-r from-violet-500/5 via-transparent to-transparent">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <Landmark className="h-4 w-4 text-violet-500" />
                  <Badge className="bg-violet-500/15 text-violet-500 border-violet-500/30 font-mono text-[10px] tracking-widest uppercase">
                    NV-{MY_DISTRICT.districtNumber.toString().padStart(2, "0")}
                  </Badge>
                </div>
                {!isSimpleMode && (
                  <>
                    <Badge variant="outline" className="text-[10px] font-semibold">
                      {MY_DISTRICT.congress}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="text-[10px] font-semibold text-red-400 border-red-400/30"
                    >
                      (R)
                    </Badge>
                  </>
                )}
              </div>

              <h2 className="text-xl font-extrabold text-foreground tracking-tight">
                {isSimpleMode
                  ? "Your Reno District 🏔️"
                  : "Nevada's 2nd Congressional District"}
              </h2>
              <p className="text-[11px] text-muted-foreground font-medium">
                {isSimpleMode
                  ? "Washoe County (Reno) · Rep. Mark Amodei · Northern Nevada"
                  : `${MY_DISTRICT.representative} · Northern Nevada (Reno, Carson City & rural counties)`}
              </p>
            </div>

            <button
              onClick={onClose}
              className="shrink-0 p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
              aria-label="Close district panel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
            {[
              {
                label: isSimpleMode ? "Air Pollution" : "District Avg PM₂.₅",
                value: avgPm25 ? `${avgPm25.toFixed(2)} µg/m³` : "—",
                icon: <Wind className="w-3 h-3" />,
                color: (avgPm25 ?? 0) > EPA_PM25_STANDARD ? "text-rose-500" : "text-amber-500",
                subtext: isSimpleMode
                  ? ((avgPm25 ?? 0) > EPA_PM25_STANDARD ? "⚠️ Above safety limit" : "✅ Within safety limit")
                  : ((avgPm25 ?? 0) > EPA_PM25_STANDARD ? "Above EPA limit" : "Below EPA limit"),
              },
              {
                label: isSimpleMode ? "Lung Disease Deaths" : "Avg Resp. Mortality",
                value: avgMort ? `${avgMort.toFixed(1)}/100k` : "—",
                icon: <Activity className="w-3 h-3" />,
                color: "text-blue-500",
                subtext: isSimpleMode ? "people/year" : "deaths/yr",
              },
              {
                label: isSimpleMode ? "People Here" : "District Population",
                value: totalPop > 0 ? `${(totalPop / 1000).toFixed(0)}K` : "—",
                icon: <Users className="w-3 h-3" />,
                color: "text-primary",
                subtext: isSimpleMode ? "in the district" : `${withData.length} counties`,
              },
              {
                label: isSimpleMode ? "Over Pollution Limit" : "Above EPA Standard",
                value: `${countiesAboveEpa} of ${withData.length}`,
                icon: <ShieldAlert className="w-3 h-3" />,
                color: countiesAboveEpa > 0 ? "text-rose-500" : "text-emerald-500",
                subtext: isSimpleMode
                  ? (countiesAboveEpa > 0 ? "counties need cleaner air" : "counties are safe")
                  : `PM₂.₅ > ${EPA_PM25_STANDARD} µg/m³`,
              },
            ].map((stat) => (
              <div key={stat.label} className="p-3 rounded-xl border border-border bg-background/70 space-y-1">
                <div className={`flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider ${stat.color}`}>
                  {stat.icon}
                  {stat.label}
                </div>
                <div className="text-sm font-extrabold text-foreground leading-none">{stat.value}</div>
                <div className="text-[9px] text-muted-foreground">{stat.subtext}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Home County Spotlight ─────────────────────────────── */}
        {homeCounty && homeCounty.hasData && (
          <div className="px-6 py-3 border-b border-border/40 bg-primary/5 shrink-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-lg bg-primary/15 shrink-0">
                  <Star className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="text-[9px] font-semibold uppercase tracking-widest text-primary mb-0.5">
                    {isSimpleMode ? "Your Home County 🏠" : "Your Home County"}
                  </div>
                  <div className="text-sm font-bold text-foreground">
                    {homeCounty.shortName} County · {MY_DISTRICT.homeCity}
                  </div>
                  {isSimpleMode ? (
                    <div className="text-[10px] text-muted-foreground mt-0.5 flex flex-wrap gap-2">
                      <span>Air: <strong className={(homeCounty.pm25 ?? 0) > EPA_PM25_STANDARD ? "text-rose-500" : "text-emerald-500"}>
                        {pm25ToLabel(homeCounty.pm25 ?? 0)}
                      </strong></span>
                      <span>Deaths: <strong className="text-foreground">{mortalityToLabel(homeCounty.mortality ?? 0)}</strong></span>
                      <span>Pop: <strong className="text-foreground">{homeCounty.population ? `${(homeCounty.population / 1000).toFixed(0)}K` : "—"}</strong></span>
                    </div>
                  ) : (
                    <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-0.5">
                      <span className={(homeCounty.pm25 ?? 0) > EPA_PM25_STANDARD ? "text-rose-500 font-semibold" : "text-emerald-500 font-semibold"}>
                        PM₂.₅ {homeCounty.pm25?.toFixed(2) ?? "—"} µg/m³
                      </span>
                      <span>·</span>
                      <span>Mortality {homeCounty.mortality?.toFixed(1) ?? "—"}/100k</span>
                      <span>·</span>
                      <span>Pop. {homeCounty.population ? `${(homeCounty.population / 1000).toFixed(0)}K` : "—"}</span>
                    </div>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 h-8 px-3 text-xs font-semibold border-primary/40 text-primary hover:bg-primary/10 cursor-pointer gap-1.5"
                onClick={() => { onSelectCounty(homeCounty.fips); onClose(); }}
                id="district-select-home-county-btn"
              >
                <MapPin className="h-3 w-3" />
                {isSimpleMode ? "See Details" : "View Data"}
              </Button>
            </div>
          </div>
        )}

        {/* ── County Rankings ───────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="px-6 py-3 border-b border-border/40 sticky top-0 bg-card/95 backdrop-blur-sm z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
                <h3 className="text-xs font-bold text-foreground">
                  {isSimpleMode
                    ? "Air Pollution by County (Most → Least)"
                    : "County Rankings by PM₂.₅ (Worst → Best)"}
                </h3>
              </div>
              <Badge variant="outline" className="text-[9px]">
                {withData.length} counties
              </Badge>
            </div>
          </div>

          <div className="px-6 py-3 space-y-2">
            {rows.map((county, idx) => (
              <button
                key={county.fips}
                className="w-full text-left p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all duration-150 cursor-pointer group"
                onClick={() => { onSelectCounty(county.fips); onClose(); }}
                id={`district-county-${county.fips}`}
                aria-label={`View data for ${county.name}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 shrink-0 text-center">
                    {county.hasData ? <RankBadge rank={idx + 1} /> : <span className="text-muted-foreground/40 text-xs">—</span>}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-bold truncate ${county.isHome ? "text-primary" : "text-foreground"}`}>
                        {county.shortName}
                        {county.isHome && <span className="ml-1 text-[9px] text-primary font-normal">{isSimpleMode ? "🏠 Home" : "(Home)"}</span>}
                      </span>
                      {county.note && !isSimpleMode && (
                        <span className="text-[9px] text-muted-foreground truncate hidden sm:inline">· {county.note}</span>
                      )}
                    </div>
                    {county.hasData && (
                      <div className="mt-1.5 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[8px] text-muted-foreground w-8 shrink-0">
                            {isSimpleMode ? "Air" : "PM₂.₅"}
                          </span>
                          <MiniBar
                            value={county.pm25 ?? 0}
                            max={maxPm25}
                            color={(county.pm25 ?? 0) > EPA_PM25_STANDARD ? "bg-rose-500" : "bg-amber-400"}
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[8px] text-muted-foreground w-8 shrink-0">
                            {isSimpleMode ? "Deaths" : "Mort."}
                          </span>
                          <MiniBar value={county.mortality ?? 0} max={maxMort} color="bg-blue-500/70" />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 text-right min-w-[60px]">
                    {county.pm25 !== null ? (
                      isSimpleMode ? (
                        <div className="space-y-0.5">
                          <div className="text-xs font-bold">{pm25ToLabel(county.pm25)}</div>
                          <div className="text-[9px] text-muted-foreground">{county.pm25.toFixed(1)} µg/m³</div>
                        </div>
                      ) : (
                        <>
                          <div className={`text-xs font-bold ${(county.pm25 ?? 0) > EPA_PM25_STANDARD ? "text-rose-500" : "text-foreground"}`}>
                            {county.pm25.toFixed(2)}
                            <span className="text-[9px] font-normal text-muted-foreground ml-0.5">µg/m³</span>
                          </div>
                          <div className="text-[9px] text-muted-foreground">{county.mortality?.toFixed(1) ?? "—"}/100k</div>
                        </>
                      )
                    ) : (
                      <span className="text-[10px] text-muted-foreground/50">No data</span>
                    )}
                  </div>

                  <div className="shrink-0 text-muted-foreground/30 group-hover:text-primary transition-colors">
                    <Navigation className="h-3 w-3" />
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Context note */}
          <div className="px-6 pb-4">
            <div className="p-3 rounded-xl bg-muted/40 border border-border/50 text-[10px] text-muted-foreground leading-relaxed space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-foreground text-[10px]">
                <ShieldAlert className="h-3 w-3 text-violet-500" />
                {isSimpleMode ? "What Does This Mean for You?" : `EPA PM₂.₅ Context for NV-${MY_DISTRICT.districtNumber}`}
              </div>
              <p>
                {isSimpleMode ? (
                  <>
                    The U.S. government says air with more than <strong className="text-foreground">9 µg/m³</strong> of fine particles is unsafe long-term.
                    {countiesAboveEpa > 0
                      ? <> <strong className="text-rose-500">{countiesAboveEpa} county/counties in your district</strong> are over that limit — meaning people there breathe dirtier air than the government recommends.</>
                      : <> All counties in your district are currently within the safe limit. Your hometown, Washoe County, is at {homeCounty?.pm25?.toFixed(1)} µg/m³ — close to the line.</>}
                  </>
                ) : (
                  <>
                    The EPA revised its annual PM₂.₅ standard to <strong className="text-foreground">9 µg/m³</strong> in 2024.
                    {countiesAboveEpa > 0
                      ? <> <strong className="text-rose-500">{countiesAboveEpa} of {withData.length} NV-02 counties</strong> exceed this standard: {rows.filter(r => (r.pm25 ?? 0) > EPA_PM25_STANDARD).map(r => r.shortName).join(", ")}.</>
                      : <> All NV-02 counties are at or below the EPA standard — though Washoe County ({homeCounty?.pm25?.toFixed(2)} µg/m³) is within 1 µg/m³ of the limit.</>}
                  </>
                )}
              </p>
              {!isSimpleMode && (
                <p className="text-[9px]">
                  PM₂.₅: EPA satellite-derived 5-year avg (2018–2022). Mortality: CDC WONDER respiratory deaths.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Footer ───────────────────────────────────────────── */}
        <div className="px-6 py-4 border-t border-border/60 shrink-0 bg-card flex items-center justify-between gap-3 flex-wrap">
          <a
            href={REPRESENTATIVE_CONTACT}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
            id="district-contact-rep-btn"
          >
            <ExternalLink className="h-3 w-3" />
            {isSimpleMode ? "Message Rep. Amodei" : `Contact ${MY_DISTRICT.representative}`}
          </a>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 px-3 text-xs font-semibold cursor-pointer" onClick={onClose}>
              Close
            </Button>
            <Button
              size="sm"
              className="h-8 px-4 text-xs font-bold cursor-pointer gap-1.5 bg-violet-600 hover:bg-violet-700 text-white"
              onClick={() => { onZoomToDistrict(); onClose(); }}
              id="district-zoom-btn"
            >
              <MapPin className="h-3.5 w-3.5" />
              {isSimpleMode ? "Show My District on Map" : "Zoom to NV-02 on Map"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
