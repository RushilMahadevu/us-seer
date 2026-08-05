"use client";

import React, { useState, useMemo } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/app/_components/ui/card";
import { Badge } from "@/app/_components/ui/badge";
import {
  Database,
  Search,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Layers,
  Activity,
  Wind,
  Factory,
  HeartPulse,
  Users,
  Map,
  Scale,
  Sparkles,
  FileCode2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Calendar,
  AlertTriangle,
  Copy,
  Check,
  Cpu,
  Lock,
  Radio,
  HelpCircle,
} from "lucide-react";

export type MethodologySubTab = "catalog" | "methodology" | "limitations";

export type DataSourceCategory =
  | "all"
  | "active"
  | "roadmap"
  | "environmental"
  | "health"
  | "socioeconomic";

export interface DataSourceItem {
  id: string;
  name: string;
  agency: string;
  category: "environmental" | "health" | "socioeconomic" | "derived";
  status: "active" | "roadmap";
  tier: "Integrated" | "Roadmap";
  dateRange: string;
  summary: string;
  url: string;
  variables: { name: string; code?: string; unit?: string }[];
  contribution: string;
  whyItMatters: string;
  joinKey: string;
  resolution: string;
  updateFrequency: string;
  icon: React.ReactNode;
}

const DATA_SOURCES: DataSourceItem[] = [
  {
    id: "cdc-mortality",
    name: "CDC Compressed Mortality & WONDER",
    agency: "Centers for Disease Control & Prevention (CDC)",
    category: "health",
    status: "active",
    tier: "Integrated",
    dateRange: "2018–2022 (5-Yr Avg)",
    summary:
      "County death rates for Chronic Lower Respiratory Diseases (ICD-10 J40–J47).",
    url: "https://wonder.cdc.gov/",
    variables: [
      { name: "Respiratory Mortality Rate", code: "mortalityRate", unit: "per 100k" },
      { name: "Total Respiratory Deaths", code: "deaths", unit: "deaths" },
    ],
    contribution:
      "Serves as the primary public health outcome across US-SEER for evaluating respiratory death rates.",
    whyItMatters:
      "Mortality data grounds air pollution numbers in real public health outcomes.",
    joinKey: "5-Digit County FIPS Code",
    resolution: "County Level (3,142 U.S. counties)",
    updateFrequency: "Annual",
    icon: <Activity className="w-5 h-5 text-rose-400" />,
  },
  {
    id: "epa-aqs",
    name: "EPA Air Quality System (AQS)",
    agency: "U.S. Environmental Protection Agency (EPA)",
    category: "environmental",
    status: "active",
    tier: "Integrated",
    dateRange: "2020–2024 (Annual)",
    summary:
      "Ground-level measurements of fine particulate matter (PM2.5) across national monitoring networks.",
    url: "https://www.epa.gov/aqs",
    variables: [
      { name: "Annual Mean PM2.5", code: "pm25Avg", unit: "µg/m³" },
    ],
    contribution:
      "Provides the primary air pollution exposure variable. PM2.5 particles penetrate deep into lungs.",
    whyItMatters:
      "Fine particulate matter drives asthma attacks and COPD. Setting exposure targets estimates lives saved under cleaner air policies.",
    joinKey: "Monitoring Station / Spatial Interpolation",
    resolution: "County Level",
    updateFrequency: "Annual Aggregated",
    icon: <Wind className="w-5 h-5 text-amber-400" />,
  },
  {
    id: "cdc-places",
    name: "CDC PLACES (Local Health Data)",
    agency: "CDC & Robert Wood Johnson Foundation",
    category: "health",
    status: "active",
    tier: "Integrated",
    dateRange: "2023 Release (2021–2022 Data)",
    summary:
      "County prevalence estimates for chronic conditions and health risk behaviors.",
    url: "https://data.cdc.gov/500-Cities-Places/PLACES-Local-Data-for-Better-Health-County-Data-20/swc5-untb",
    variables: [
      { name: "COPD Prevalence", code: "copdPrev", unit: "%" },
      { name: "Asthma Prevalence", code: "asthmaPrev", unit: "%" },
      { name: "Smoking Prevalence", code: "smokingPrev", unit: "%" },
    ],
    contribution:
      "Allows US-SEER to control for local smoking rates, the single largest behavioral confounder in respiratory health.",
    whyItMatters:
      "Controlling for smoking rates proves PM2.5 remains a significant independent risk factor.",
    joinKey: "5-Digit FIPS Code",
    resolution: "County / Census Tract",
    updateFrequency: "Annual",
    icon: <Activity className="w-5 h-5 text-fuchsia-400" />,
  },
  {
    id: "census-acs",
    name: "U.S. Census Bureau ACS (5-Year)",
    agency: "U.S. Census Bureau",
    category: "socioeconomic",
    status: "active",
    tier: "Integrated",
    dateRange: "2018–2022 (5-Yr Rolling)",
    summary:
      "Demographic, income, poverty, insurance, and housing data for every U.S. county.",
    url: "https://www.census.gov/programs-surveys/acs",
    variables: [
      { name: "Total Population", code: "B01003_001E", unit: "count" },
      { name: "Median Household Income", code: "B19013_001E", unit: "USD" },
      { name: "Poverty Rate", code: "B17001", unit: "%" },
      { name: "Uninsured Rate", code: "B27001", unit: "%" },
      { name: "Non-Hispanic Black Share", code: "B03002", unit: "%" },
      { name: "Hispanic Share", code: "B03002", unit: "%" },
    ],
    contribution:
      "Powers environmental justice analysis by connecting pollution exposure to income and demographics.",
    whyItMatters:
      "Low-income communities often face higher pollution burdens. ACS data highlights these disparities.",
    joinKey: "State + County FIPS",
    resolution: "County Level",
    updateFrequency: "Annual (5-Year Rolling)",
    icon: <Users className="w-5 h-5 text-blue-400" />,
  },
  {
    id: "epa-tri",
    name: "EPA Toxic Release Inventory (TRI)",
    agency: "U.S. Environmental Protection Agency (EPA)",
    category: "environmental",
    status: "active",
    tier: "Integrated",
    dateRange: "2022–2024",
    summary:
      "Facility reporting of industrial chemical releases to air, land, and water.",
    url: "https://www.epa.gov/toxics-release-inventory-tri-program",
    variables: [
      { name: "Total Toxic Releases", code: "toxicReleases", unit: "lbs/yr" },
      { name: "Carcinogenic Releases", code: "CARCINOGEN_CLASSIFICATION", unit: "lbs/yr" },
    ],
    contribution:
      "Adds industrial facility sources (refineries, chemical plants) alongside general air pollution.",
    whyItMatters:
      "Connects heavy industrial sites directly to regional health patterns.",
    joinKey: "Facility Location -> County FIPS",
    resolution: "Facility / County Level",
    updateFrequency: "Annual",
    icon: <Factory className="w-5 h-5 text-slate-400" />,
  },
  {
    id: "hrsa-ahrf",
    name: "HHS Area Health Resources Files (AHRF)",
    agency: "Health Resources & Services Administration (HRSA)",
    category: "socioeconomic",
    status: "active",
    tier: "Integrated",
    dateRange: "2022–2023",
    summary:
      "County-level healthcare workforce, primary care doctor density, and hospital capacity.",
    url: "https://data.hrsa.gov/topics/health-workforce/nchwa/ahrf",
    variables: [
      { name: "Primary Care Doctor Density", code: "mdRate (F11978)", unit: "MDs per 100k" },
      { name: "Hospital Beds Capacity", code: "F0892110", unit: "beds per 100k" },
    ],
    contribution:
      "Controls for differences in local healthcare access across urban and rural counties.",
    whyItMatters:
      "Counties with doctor shortages have higher mortality regardless of air quality. Controlling for MD density prevents confusing healthcare deserts with pollution hotspots.",
    joinKey: "FIPS Code",
    resolution: "County Level",
    updateFrequency: "Annual",
    icon: <HeartPulse className="w-5 h-5 text-emerald-400" />,
  },
  {
    id: "usda-rucc",
    name: "USDA Rural-Urban Continuum Codes (RUCC)",
    agency: "USDA Economic Research Service",
    category: "socioeconomic",
    status: "active",
    tier: "Integrated",
    dateRange: "2023 Update",
    summary:
      "A 1–9 classification system categorizing counties from major metro areas to rural communities.",
    url: "https://www.ers.usda.gov/data-products/rural-urban-continuum-codes/",
    variables: [
      { name: "Rural-Urban Code", code: "rucc (RUCC_2023)", unit: "1-9 Scale" },
    ],
    contribution:
      "Enables comparing environmental health impacts between dense urban cities and rural areas.",
    whyItMatters:
      "Urban and rural areas have different pollution types (traffic vs. agricultural dust). RUCC separates these factors.",
    joinKey: "FIPS Code",
    resolution: "County Level",
    updateFrequency: "2023 Update",
    icon: <Map className="w-5 h-5 text-indigo-400" />,
  },
  {
    id: "seer-ovi",
    name: "US-SEER Overall Vulnerability Index",
    agency: "US-SEER Composite Index",
    category: "derived",
    status: "active",
    tier: "Integrated",
    dateRange: "2024 Baseline",
    summary:
      "Composite risk score combining PM2.5, toxic releases, health prevalence, poverty, and healthcare access.",
    url: "#",
    variables: [
      { name: "Overall Vulnerability Score", code: "overallRisk", unit: "0-100 Score" },
    ],
    contribution:
      "Combines multiple data layers into a single score showing overall environmental risk.",
    whyItMatters:
      "Gives policymakers a fast way to identify communities facing multiple compound hazards.",
    joinKey: "Calculated per FIPS",
    resolution: "County Level",
    updateFrequency: "Calculated in App",
    icon: <Sparkles className="w-5 h-5 text-teal-400" />,
  },
  {
    id: "cdc-svi",
    name: "CDC Social Vulnerability Index (SVI)",
    agency: "CDC / ATSDR",
    category: "socioeconomic",
    status: "roadmap",
    tier: "Roadmap",
    dateRange: "2020 / 2022 Release",
    summary:
      "Percentile score evaluating 15 census variables across income, housing, and demographics.",
    url: "https://www.atsdr.cdc.gov/placeandhealth/svi/index.html",
    variables: [
      { name: "Overall SVI Score", code: "RPL_THEMES", unit: "Percentile (0-1)" },
    ],
    contribution:
      "Bundles social vulnerability metrics into a standard 0–1 index.",
    whyItMatters:
      "Simplifies plotting social vulnerability directly against respiratory health outcomes.",
    joinKey: "5-Digit FIPS Code",
    resolution: "County / Census Tract",
    updateFrequency: "Biennial",
    icon: <ShieldCheck className="w-5 h-5 text-purple-400" />,
  },
  {
    id: "noaa-normals",
    name: "NOAA U.S. Climate Normals",
    agency: "NOAA National Centers for Environmental Information",
    category: "environmental",
    status: "roadmap",
    tier: "Roadmap",
    dateRange: "1991–2020 (30-Yr Normals)",
    summary:
      "30-year averages of temperature, precipitation, and wind patterns across weather stations.",
    url: "https://www.ncei.noaa.gov/products/land-based-station/us-climate-normals",
    variables: [
      { name: "30-Yr Average Temp", code: "TAVG", unit: "°F" },
    ],
    contribution:
      "Controls for weather and terrain factors (like valleys that trap air pollution).",
    whyItMatters:
      "Separates weather patterns (like atmospheric inversions) from industrial emissions.",
    joinKey: "Station Join to FIPS",
    resolution: "Station / County",
    updateFrequency: "Decennial",
    icon: <Layers className="w-5 h-5 text-cyan-400" />,
  },
  {
    id: "bls-oes",
    name: "BLS Occupational Employment Data",
    agency: "U.S. Bureau of Labor Statistics",
    category: "socioeconomic",
    status: "roadmap",
    tier: "Roadmap",
    dateRange: "2023 Release",
    summary:
      "County employment percentages in mining, construction, manufacturing, and agriculture.",
    url: "https://www.bls.gov/oes/",
    variables: [
      { name: "Mining & Extraction Share", code: "OCC_47_5000", unit: "% workforce" },
    ],
    contribution:
      "Separates workplace dust and chemical exposure from general outdoor air quality.",
    whyItMatters:
      "Regions with heavy mining or industrial work can have elevated health risks independent of outdoor air quality.",
    joinKey: "FIPS / Metro Area",
    resolution: "County / Metro Area",
    updateFrequency: "Annual",
    icon: <FileCode2 className="w-5 h-5 text-orange-400" />,
  },
  {
    id: "usgs-nwis",
    name: "USGS Water Quality Data (NWIS)",
    agency: "U.S. Geological Survey",
    category: "environmental",
    status: "roadmap",
    tier: "Roadmap",
    dateRange: "2022–2024",
    summary:
      "County-level measurements of nitrates, heavy metals, and industrial water pollutants.",
    url: "https://waterdata.usgs.gov/nwis",
    variables: [
      { name: "Nitrate Concentration", code: "p00620", unit: "mg/L" },
    ],
    contribution:
      "Expands US-SEER to look at combined air and water environmental risks.",
    whyItMatters:
      "Helps analyze communities dealing with both poor air quality and water contamination.",
    joinKey: "Watershed / County FIPS",
    resolution: "County Level",
    updateFrequency: "Annual",
    icon: <Database className="w-5 h-5 text-blue-500" />,
  },
];

/* Statistical Controls */
const CONFOUNDER_CONTROLS = [
  {
    confounder: "Smoking Rates",
    source: "CDC PLACES (`CSMOKING_CrudePrev`)",
    biasCorrected: "Tobacco Risk Factor",
    explanation:
      "Smoking is the main risk factor for COPD. Controlling for local smoking rates proves that PM2.5 remains an independent predictor of respiratory deaths.",
    badgeColor: "border-fuchsia-500/30 text-fuchsia-400 bg-fuchsia-500/10",
  },
  {
    confounder: "Healthcare Access",
    source: "HHS AHRF (Primary Care Doctors per 100k)",
    biasCorrected: "Medical Access Factor",
    explanation:
      "Counties with fewer doctors have higher death rates regardless of air quality. Controlling for doctor density avoids mistaking medical deserts for pollution hotspots.",
    badgeColor: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10",
  },
  {
    confounder: "Urban vs. Rural Setting",
    source: "USDA RUCC (1-9 Urban-Rural Scale)",
    biasCorrected: "Location Type Factor",
    explanation:
      "Big cities and rural areas differ in traffic, healthcare, and demographics. RUCC codes separate city traffic pollution from rural agricultural dust.",
    badgeColor: "border-indigo-500/30 text-indigo-400 bg-indigo-500/10",
  },
  {
    confounder: "Poverty & Insurance Status",
    source: "U.S. Census Bureau ACS (Poverty & Uninsured Rates)",
    biasCorrected: "Socioeconomic Factor",
    explanation:
      "Poverty affects health through housing quality, nutrition, and healthcare access. Controlling for poverty isolates air quality risks from general economic hardship.",
    badgeColor: "border-blue-500/30 text-blue-400 bg-blue-500/10",
  },
];

/* Known Limitations */
const KNOWN_LIMITATIONS = [
  {
    id: "ecological-fallacy",
    title: "1. County-Level Aggregation (Ecological Fallacy)",
    tag: "County-Level Aggregation",
    icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
    summary:
      "County averages show overall community risk, not an individual person's exact personal health risk.",
    description:
      "US-SEER analyzes data aggregated at the county level (3,142 U.S. counties). While county-wide patterns reveal broad health trends, an individual person's risk depends on their personal habits, indoor air quality, occupation, and medical history.",
    badgeColor: "border-amber-500/30 text-amber-400 bg-amber-500/10",
  },
  {
    id: "cdc-suppression",
    title: "2. Small County Data Suppression",
    tag: "Data Suppression",
    icon: <Lock className="w-5 h-5 text-rose-400" />,
    summary:
      "The CDC hides death counts below 10 per county per year to protect personal privacy.",
    description:
      "To protect privacy, CDC WONDER suppresses annual death counts between 1 and 9 in small counties. US-SEER handles these using 5-year averages (2018–2022) and state-level baselines instead of treating missing values as zero.",
    badgeColor: "border-rose-500/30 text-rose-400 bg-rose-500/10",
  },
  {
    id: "satellite-kriging",
    title: "3. Satellite Air Quality Modeling",
    tag: "Satellite Interpolation",
    icon: <Radio className="w-5 h-5 text-sky-400" />,
    summary:
      "Rural areas without physical monitoring stations rely on satellite estimates.",
    description:
      "EPA air monitors are located primarily near major cities. In rural counties without monitors, PM2.5 levels are estimated using satellite data (Aerosol Optical Depth) and spatial interpolation. This provides full national coverage, but hyper-local microclimates may be smoothed out.",
    badgeColor: "border-sky-500/30 text-sky-400 bg-sky-500/10",
  },
  {
    id: "unmeasured-confounding",
    title: "4. Other Unmeasured Factors",
    tag: "Unmeasured Factors",
    icon: <HelpCircle className="w-5 h-5 text-purple-400" />,
    summary:
      "Factors like indoor air quality, radon, and workplace dust are not included in federal outdoor datasets.",
    description:
      "While US-SEER controls for smoking, poverty, healthcare access, and location type, some local factors (like indoor radon gas, home heating methods, or specific job dust) are not tracked at the county level.",
    badgeColor: "border-purple-500/30 text-purple-400 bg-purple-500/10",
  },
];

export default function DataSourcesView() {
  const [subTab, setSubTab] = useState<MethodologySubTab>("catalog");
  const [selectedCategory, setSelectedCategory] = useState<DataSourceCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [copiedCitation, setCopiedCitation] = useState(false);

  const filteredSources = useMemo(() => {
    return DATA_SOURCES.filter((item) => {
      if (selectedCategory === "active" && item.status !== "active") return false;
      if (selectedCategory === "roadmap" && item.status !== "roadmap") return false;
      if (
        selectedCategory === "environmental" &&
        item.category !== "environmental"
      )
        return false;
      if (selectedCategory === "health" && item.category !== "health")
        return false;
      if (
        selectedCategory === "socioeconomic" &&
        item.category !== "socioeconomic"
      )
        return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchAgency = item.agency.toLowerCase().includes(q);
      const matchSummary = item.summary.toLowerCase().includes(q);
      const matchContribution = item.contribution.toLowerCase().includes(q);
      const matchVar = item.variables.some(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          (v.code && v.code.toLowerCase().includes(q))
      );

      return matchName || matchAgency || matchSummary || matchContribution || matchVar;
    });
  }, [selectedCategory, searchQuery]);

  const activeCount = useMemo(
    () => DATA_SOURCES.filter((d) => d.status === "active").length,
    []
  );
  const roadmapCount = useMemo(
    () => DATA_SOURCES.filter((d) => d.status === "roadmap").length,
    []
  );

  const toggleExpand = (id: string) => {
    setExpandedCardId((prev) => (prev === id ? null : id));
  };

  const handleCopyCitation = () => {
    const citation = `US-SEER Spatial Analytics Engine (2024). "U.S. Spatial Environmental Exposure & Respiratory Risk Index." Integrated Federal Data Pipeline (CDC WONDER 2018–2022, EPA AQS 2020–2024, Census ACS 2018–2022, CDC PLACES 2023, EPA TRI 2022–2024, HRSA AHRF 2022–2023). Methodology: Double Machine Learning Causal Inference (Robinson 1988; Chernozhukov et al. 2018). Available at: https://us-seer.vercel.app/`;
    navigator.clipboard.writeText(citation);
    setCopiedCitation(true);
    setTimeout(() => setCopiedCitation(false), 2500);
  };

  return (
    <div className="flex-1 h-full overflow-y-auto pr-1 space-y-5 animate-in fade-in-50 duration-300 pb-8">
      {/* Header Banner */}
      <div className="relative rounded-xl border border-border bg-gradient-to-r from-card via-card/90 to-primary/5 p-4 sm:p-6 shadow-sm overflow-hidden">
        <div className="absolute top-0 right-0 -translate-y-6 translate-x-6 w-64 h-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                Federal Datasets • All 3,142 U.S. Counties
              </span>
            </div>
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <span>Data &amp; Methodology</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              US-SEER merges 11 federal datasets across all 3,142 U.S. counties, connecting air quality, health outcomes, demographics, and statistical controls.
            </p>
          </div>

          {/* Citation Button & Quick Metrics */}
          <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
            <button
              onClick={handleCopyCitation}
              className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary/20 text-xs font-semibold text-primary transition-all active:scale-95 shadow-xs"
            >
              {copiedCitation ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Citation Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Citation</span>
                </>
              )}
            </button>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-2 lg:grid-cols-4 gap-2">
              <div className="p-2 rounded-lg border border-border bg-background/60 backdrop-blur-xs text-center min-w-[70px]">
                <div className="text-base font-extrabold text-primary">11</div>
                <div className="text-[10px] text-muted-foreground font-medium">Federal Sources</div>
              </div>
              <div className="p-2 rounded-lg border border-border bg-background/60 backdrop-blur-xs text-center min-w-[70px]">
                <div className="text-base font-extrabold text-emerald-400">3,142</div>
                <div className="text-[10px] text-muted-foreground font-medium">U.S. Counties</div>
              </div>
              <div className="p-2 rounded-lg border border-border bg-background/60 backdrop-blur-xs text-center min-w-[70px]">
                <div className="text-base font-extrabold text-sky-400">30+</div>
                <div className="text-[10px] text-muted-foreground font-medium">Variables</div>
              </div>
              <div className="p-2 rounded-lg border border-border bg-background/60 backdrop-blur-xs text-center min-w-[70px]">
                <div className="text-base font-extrabold text-amber-400">100%</div>
                <div className="text-[10px] text-muted-foreground font-medium">FIPS Standard</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Tab Navigation Switcher */}
      <div className="flex items-center gap-1.5 p-1 bg-card border border-border rounded-xl shadow-xs">
        <button
          onClick={() => setSubTab("catalog")}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${subTab === "catalog"
            ? "bg-primary text-primary-foreground shadow-xs"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
        >
          <Database className="w-4 h-4" />
          <span>Data Sources ({DATA_SOURCES.length})</span>
        </button>

        <button
          onClick={() => setSubTab("methodology")}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${subTab === "methodology"
            ? "bg-primary text-primary-foreground shadow-xs"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
        >
          <Cpu className="w-4 h-4" />
          <span>Statistical Model &amp; Controls</span>
        </button>

        <button
          onClick={() => setSubTab("limitations")}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${subTab === "limitations"
            ? "bg-primary text-primary-foreground shadow-xs"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Limitations (4)</span>
        </button>
      </div>

      {/* ── TAB 1: DATA SOURCES ────────────────────────────────────────── */}
      {subTab === "catalog" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card border border-border p-3 rounded-xl shadow-xs">
            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${selectedCategory === "all"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
              >
                All Sources ({DATA_SOURCES.length})
              </button>
              <button
                onClick={() => setSelectedCategory("active")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${selectedCategory === "active"
                  ? "bg-emerald-500 text-white shadow-xs"
                  : "bg-muted/40 text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/10"
                  }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                Active ({activeCount})
              </button>
              <button
                onClick={() => setSelectedCategory("roadmap")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${selectedCategory === "roadmap"
                  ? "bg-purple-500 text-white shadow-xs"
                  : "bg-muted/40 text-muted-foreground hover:text-purple-400 hover:bg-purple-500/10"
                  }`}
              >
                <Clock className="w-3 h-3" />
                Roadmap ({roadmapCount})
              </button>
              <button
                onClick={() => setSelectedCategory("environmental")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${selectedCategory === "environmental"
                  ? "bg-amber-500 text-white shadow-xs"
                  : "bg-muted/40 text-muted-foreground hover:text-amber-400 hover:bg-accent"
                  }`}
              >
                Environmental
              </button>
              <button
                onClick={() => setSelectedCategory("health")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${selectedCategory === "health"
                  ? "bg-rose-500 text-white shadow-xs"
                  : "bg-muted/40 text-muted-foreground hover:text-rose-400 hover:bg-accent"
                  }`}
              >
                Health Outcomes
              </button>
              <button
                onClick={() => setSelectedCategory("socioeconomic")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${selectedCategory === "socioeconomic"
                  ? "bg-blue-500 text-white shadow-xs"
                  : "bg-muted/40 text-muted-foreground hover:text-blue-400 hover:bg-accent"
                  }`}
              >
                Socioeconomic
              </button>
            </div>

            {/* Search input */}
            <div className="relative w-full sm:w-64 shrink-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search datasets, variables, CDC…"
                className="w-full h-8.5 pl-8 pr-3 bg-muted/30 border border-border rounded-lg text-xs font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground hover:text-foreground cursor-pointer px-1 py-0.5 bg-muted rounded"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Dataset Grid List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSources.map((source) => {
              const isExpanded = expandedCardId === source.id;
              return (
                <Card
                  key={source.id}
                  className={`border transition-all duration-200 hover:border-primary/40 hover:shadow-md flex flex-col justify-between overflow-hidden ${source.status === "active"
                    ? "border-border bg-card"
                    : "border-dashed border-purple-500/30 bg-card/60"
                    }`}
                >
                  <CardHeader className="p-4 pb-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0">
                          {source.icon}
                        </div>
                        <div>
                          <span className="text-[11px] font-semibold text-muted-foreground block leading-none">
                            {source.agency}
                          </span>
                          <span className="text-[10px] text-muted-foreground/70 leading-none">
                            {source.tier}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {source.status === "active" ? (
                          <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold px-2 py-0.5">
                            Active
                          </Badge>
                        ) : (
                          <Badge className="bg-purple-500/15 text-purple-300 border border-purple-500/30 text-[10px] font-semibold px-2 py-0.5">
                            Planned
                          </Badge>
                        )}
                      </div>
                    </div>

                    <CardTitle className="text-base font-bold text-foreground flex items-center justify-between">
                      <span>{source.name}</span>
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground leading-relaxed">
                      {source.summary}
                    </CardDescription>

                    <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md w-fit">
                      <Calendar className="w-3 h-3 text-primary" />
                      <span>Coverage: {source.dateRange}</span>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 pt-0 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-semibold text-foreground/80 block">
                        Variables &amp; Metric Codes:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {source.variables.map((v, i) => (
                          <div
                            key={i}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted/60 border border-border text-[11px] font-medium text-foreground"
                          >
                            <span>{v.name}</span>
                            {v.code && (
                              <span className="font-mono text-[10px] text-primary/90 bg-primary/10 px-1 py-0.2 rounded border border-primary/20">
                                {v.code}
                              </span>
                            )}
                            {v.unit && (
                              <span className="text-[10px] text-muted-foreground">({v.unit})</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-muted/40 border border-border/80 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-foreground text-[11px]">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>What it does:</span>
                      </div>
                      <p className="text-muted-foreground text-[11px] leading-relaxed">
                        {source.contribution}
                      </p>
                    </div>

                    {isExpanded && (
                      <div className="space-y-2 pt-2 border-t border-border/60 animate-in fade-in duration-200">
                        <div>
                          <span className="text-[11px] font-semibold text-foreground block">
                            Why it matters:
                          </span>
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                            {source.whyItMatters}
                          </p>
                        </div>

                        <div className="grid grid-cols-3 gap-2 pt-1">
                          <div className="p-2 rounded bg-background border border-border text-center">
                            <span className="text-[10px] font-medium text-muted-foreground block">Join Key</span>
                            <span className="text-[10px] font-bold text-foreground truncate block" title={source.joinKey}>
                              {source.joinKey}
                            </span>
                          </div>
                          <div className="p-2 rounded bg-background border border-border text-center">
                            <span className="text-[10px] font-medium text-muted-foreground block">Resolution</span>
                            <span className="text-[10px] font-bold text-foreground truncate block" title={source.resolution}>
                              {source.resolution}
                            </span>
                          </div>
                          <div className="p-2 rounded bg-background border border-border text-center">
                            <span className="text-[10px] font-medium text-muted-foreground block">Update Rate</span>
                            <span className="text-[10px] font-bold text-foreground truncate block" title={source.updateFrequency}>
                              {source.updateFrequency}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[11px]">
                      <button
                        onClick={() => toggleExpand(source.id)}
                        className="cursor-pointer text-primary hover:underline font-semibold flex items-center gap-1 text-[11px]"
                      >
                        {isExpanded ? (
                          <>
                            <span>Show Less</span>
                            <ChevronUp className="w-3 h-3" />
                          </>
                        ) : (
                          <>
                            <span>Details &amp; Join Key</span>
                            <ChevronDown className="w-3 h-3" />
                          </>
                        )}
                      </button>

                      {source.url !== "#" && (
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="cursor-pointer text-muted-foreground hover:text-foreground inline-flex items-center gap-1 font-medium transition-colors"
                        >
                          <span>Official Portal</span>
                          <ExternalLink className="w-3 h-3 text-primary" />
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredSources.length === 0 && (
            <div className="p-8 text-center bg-card border border-border rounded-xl space-y-2">
              <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto" />
              <h3 className="text-sm font-bold text-foreground">No matching data sources found</h3>
              <p className="text-xs text-muted-foreground">
                Try adjusting your search query or switching category filters.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: STATISTICAL MODEL & CONTROLS ───────────────────────────── */}
      {subTab === "methodology" && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 sm:p-6 space-y-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-primary" />
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                Double Machine Learning (DML) Model
              </h2>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              To separate the impact of PM2.5 air pollution from other factors like smoking, poverty, and healthcare access, US-SEER uses Double Machine Learning (Robinson 1988; Chernozhukov et al. 2018) with cross-fitted Random Forests.
            </p>

            <div className="p-3 bg-background border border-border rounded-lg font-mono text-xs text-foreground/90 space-y-1">
              <div className="text-primary font-bold">Model Formula:</div>
              <div>Mortality_i = θ × PM2.5_i + g(W_i) + U_i</div>
              <div>PM2.5_i = m(W_i) + V_i</div>
              <div className="text-muted-foreground text-[11px] pt-1 font-sans">
                Where W_i represents control variables: [Smoking Rate, Poverty Rate, Uninsured Rate, Doctor Density, Demographics, Urban/Rural Code].
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-2.5 rounded-lg border border-border bg-background/80 text-center">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase block">Estimated Rural Impact (θ)</span>
                <span className="text-base font-extrabold text-emerald-400 block">+1.47 deaths / 100k</span>
                <span className="text-[10px] text-muted-foreground">per 1 µg/m³ PM2.5 reduction</span>
              </div>
              <div className="p-2.5 rounded-lg border border-border bg-background/80 text-center">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase block">95% Confidence Interval</span>
                <span className="text-base font-extrabold text-primary block">[1.52, 5.26]</span>
                <span className="text-[10px] text-muted-foreground">500 bootstrap iterations</span>
              </div>
              <div className="p-2.5 rounded-lg border border-border bg-background/80 text-center">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase block">Cross-Fitting</span>
                <span className="text-base font-extrabold text-sky-400 block">5-Fold Split</span>
                <span className="text-[10px] text-muted-foreground">Random Forest regressors</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 sm:p-6 space-y-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-emerald-400" />
                <h2 className="text-base sm:text-lg font-bold text-foreground">
                  Statistical Controls
                </h2>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Factors controlled for across all 3,142 U.S. counties to isolate air pollution risk.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {CONFOUNDER_CONTROLS.map((ctrl, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-lg border border-border bg-muted/20 space-y-2 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-foreground">{ctrl.confounder}</span>
                    <Badge variant="outline" className={`text-[10px] font-semibold px-2 py-0.5 ${ctrl.badgeColor}`}>
                      {ctrl.biasCorrected}
                    </Badge>
                  </div>

                  <div className="text-[11px] font-mono text-muted-foreground">
                    Data Source: <span className="text-foreground font-semibold">{ctrl.source}</span>
                  </div>

                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {ctrl.explanation}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 sm:p-6 space-y-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                <h2 className="text-base sm:text-lg font-bold text-foreground">
                  Data Pipeline
                </h2>
              </div>
              <p className="text-xs text-muted-foreground">
                How federal datasets are downloaded, standardized on 5-digit FIPS codes, and modeled.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1.5">
                <div className="text-[10px] font-bold text-primary tracking-wider uppercase">Step 1</div>
                <h3 className="text-xs font-bold text-foreground">Data Download</h3>
                <p className="text-[11px] text-muted-foreground">
                  Python scripts pull data from CDC WONDER, EPA AQS, Census API, and USDA.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1.5">
                <div className="text-[10px] font-bold text-emerald-400 tracking-wider uppercase">Step 2</div>
                <h3 className="text-xs font-bold text-foreground">FIPS Standardization</h3>
                <p className="text-[11px] text-muted-foreground">
                  State and county FIPS codes are merged into standard 5-digit identifiers.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1.5">
                <div className="text-[10px] font-bold text-sky-400 tracking-wider uppercase">Step 3</div>
                <h3 className="text-xs font-bold text-foreground">Statistical Modeling</h3>
                <p className="text-[11px] text-muted-foreground">
                  DML cross-fitting isolates pollution effect from confounding factors.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1.5">
                <div className="text-[10px] font-bold text-amber-400 tracking-wider uppercase">Step 4</div>
                <h3 className="text-xs font-bold text-foreground">Interactive Dashboard</h3>
                <p className="text-[11px] text-muted-foreground">
                  Renders choropleth maps, policy simulation sliders, and county comparisons.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: LIMITATIONS ─────────────────────────────────────────────── */}
      {subTab === "limitations" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 sm:p-5 space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                Important Data &amp; Method Limitations
              </h2>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Below are four key limitations to keep in mind when interpreting county-level environmental health data.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {KNOWN_LIMITATIONS.map((item) => (
              <Card
                key={item.id}
                className="border border-border bg-card hover:border-amber-500/40 transition-all shadow-xs flex flex-col justify-between"
              >
                <CardHeader className="p-4 pb-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0">
                        {item.icon}
                      </div>
                      <Badge variant="outline" className={`text-[10px] font-semibold px-2 py-0.5 ${item.badgeColor}`}>
                        {item.tag}
                      </Badge>
                    </div>
                  </div>

                  <CardTitle className="text-base font-bold text-foreground">
                    {item.title}
                  </CardTitle>

                  <CardDescription className="text-xs font-semibold text-foreground/80 leading-snug">
                    {item.summary}
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-4 pt-0">
                  <div className="p-3 rounded-lg bg-muted/30 border border-border/80 text-xs text-muted-foreground leading-relaxed">
                    {item.description}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="p-4 rounded-xl border border-border bg-card flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <div className="font-bold text-foreground">Open Data Transparency</div>
                <div className="text-muted-foreground text-[11px]">
                  All Python data processing scripts and statistical models are open-source.
                </div>
              </div>
            </div>

            <a
              href="https://github.com/RushilMahadevu/us-seer"
              target="_blank"
              rel="noopener noreferrer"
              className="cursor-pointer text-primary hover:underline font-semibold flex items-center gap-1 shrink-0 text-xs bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20"
            >
              <FileCode2 className="w-3.5 h-3.5" />
              <span>Inspect Source Code</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
