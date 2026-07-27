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
} from "lucide-react";

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
    summary:
      "County-level crude and age-adjusted death rates for Chronic Lower Respiratory Diseases (ICD-10 J40–J47).",
    url: "https://wonder.cdc.gov/",
    variables: [
      { name: "Respiratory Mortality Rate", code: "mortalityRate", unit: "per 100k" },
      { name: "Total Respiratory Deaths", code: "deaths", unit: "deaths" },
    ],
    contribution:
      "Serves as the primary epidemiological health endpoint across US-SEER. Enables evaluating respiratory disease mortality burden for all U.S. counties.",
    whyItMatters:
      "Mortality data grounds ambient air quality observations in hard public health outcomes, revealing where environmental hazards manifest in preventable loss of life.",
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
    summary:
      "Ground-level ambient concentrations of fine particulate matter (PM2.5) measured across national monitoring networks.",
    url: "https://www.epa.gov/aqs",
    variables: [
      { name: "Annual Mean PM2.5", code: "pm25Avg", unit: "µg/m³" },
    ],
    contribution:
      "Provides the primary environmental exposure variable. PM2.5 particles (≤2.5 µm) penetrate deep into human lungs and bloodstreams.",
    whyItMatters:
      "Fine particulate matter is a proven driver of inflammation, asthma attacks, and COPD exacerbations. Setting exposure thresholds helps simulate lives saved under EPA policy standard changes.",
    joinKey: "Monitoring Station FIPS / Centroid Kriging",
    resolution: "County Level",
    updateFrequency: "Daily / Annual Aggregated",
    icon: <Wind className="w-5 h-5 text-amber-400" />,
  },
  {
    id: "cdc-places",
    name: "CDC PLACES (Local Data for Better Health)",
    agency: "CDC & Robert Wood Johnson Foundation",
    category: "health",
    status: "active",
    tier: "Integrated",
    summary:
      "County-level model-based prevalence estimates for chronic diseases and risk behaviors.",
    url: "https://data.cdc.gov/500-Cities-Places/PLACES-Local-Data-for-Better-Health-County-Data-20/swc5-untb",
    variables: [
      { name: "COPD Prevalence", code: "copdPrev", unit: "%" },
      { name: "Asthma Prevalence", code: "asthmaPrev", unit: "%" },
      { name: "Smoking Prevalence", code: "smokingPrev", unit: "%" },
    ],
    contribution:
      "CRITICAL CONFOUNDER CONTROL: Smoking is the primary behavioral confounder in respiratory epidemiology. PLACES allows US-SEER to control for smoking rates.",
    whyItMatters:
      "Without controlling for local smoking rates, critics can argue respiratory mortality is driven by tobacco, not air pollution. Controlling for smoking isolates the true PM2.5 attributable risk.",
    joinKey: "LocationID (5-Digit FIPS Code)",
    resolution: "County / Census Tract",
    updateFrequency: "Annual",
    icon: <Activity className="w-5 h-5 text-fuchsia-400" />,
  },
  {
    id: "census-acs",
    name: "U.S. Census Bureau ACS (5-Year Estimates)",
    agency: "U.S. Census Bureau",
    category: "socioeconomic",
    status: "active",
    tier: "Integrated",
    summary:
      "Granular demographic, economic, educational, and housing characteristics for every U.S. county.",
    url: "https://www.census.gov/programs-surveys/acs",
    variables: [
      { name: "Total Population", code: "B01003_001E", unit: "count" },
      { name: "Median Household Income", code: "B19013_001E", unit: "USD" },
      { name: "Poverty Rate", code: "B17001_002E / B17001_001E", unit: "%" },
      { name: "Uninsured Rate", code: "B27001_005E", unit: "%" },
      { name: "Non-Hispanic Black Share", code: "B03002_004E", unit: "%" },
      { name: "Hispanic Share", code: "B03002_012E", unit: "%" },
      { name: "Median Age", code: "B01002_001E", unit: "years" },
      { name: "Less than High School", code: "B15003_002E", unit: "%" },
      { name: "Pre-1940 Built Housing", code: "B25034_011E", unit: "%" },
    ],
    contribution:
      "Enables Environmental Justice analysis and demographic stratification to evaluate how socioeconomic vulnerability interacts with pollution exposure.",
    whyItMatters:
      "Low-income and minority communities frequently bear disproportionate exposure to environmental hazards. ACS data powers equity evaluation.",
    joinKey: "State FIPS + County FIPS",
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
    summary:
      "Facility-level reporting of toxic chemical releases to air, water, and land from industrial operations.",
    url: "https://www.epa.gov/toxics-release-inventory-tri-program",
    variables: [
      { name: "Total Toxic Chemical Releases", code: "toxicReleases", unit: "lbs/yr" },
      { name: "Carcinogenic Releases", code: "CARCINOGEN_CLASSIFICATION", unit: "lbs/yr" },
    ],
    contribution:
      "Adds point-source industrial hazard data to complement ambient PM2.5. Links specific factories, power plants, and refineries to regional health outcomes.",
    whyItMatters:
      "TRI identifies localized industrial chemical burdens, serving as the mechanical link between heavy manufacturing corridors and elevated respiratory disease clusters.",
    joinKey: "Facility Lat/Long -> County Aggregation",
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
    summary:
      "Comprehensive county database detailing healthcare workforce, physician density, and hospital facility capacity.",
    url: "https://data.hrsa.gov/topics/health-workforce/nchwa/ahrf",
    variables: [
      { name: "Primary Care Physician Density", code: "mdRate (F11978)", unit: "MDs per 100k" },
      { name: "Hospital Beds Capacity", code: "F0892110", unit: "beds per 100k" },
    ],
    contribution:
      "HEALTHCARE ACCESS CONFOUNDER CONTROL: Controls for differences in medical care availability across urban and rural counties.",
    whyItMatters:
      "Counties without nearby medical facilities or pulmonologists experience higher mortality regardless of air quality. Controlling for MD density avoids confusing medical deserts with pollution hot spots.",
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
    summary:
      "A 1–9 classification scheme categorizing counties by population size, degree of urbanization, and adjacency to a metro area.",
    url: "https://www.ers.usda.gov/data-products/rural-urban-continuum-codes/",
    variables: [
      { name: "Rural-Urban Continuum Code", code: "rucc (RUCC_2023)", unit: "1-9 Index" },
    ],
    contribution:
      "Enables urban/rural stratification to compare environmental health impacts across dense metropolitan areas vs. rural communities.",
    whyItMatters:
      "Urban and rural counties feature different baseline healthcare access and pollution signatures (traffic vs. agricultural dust). Stratification isolates urbanicity effects.",
    joinKey: "FIPS Code",
    resolution: "County Level",
    updateFrequency: "Decennial / 2023 Update",
    icon: <Map className="w-5 h-5 text-indigo-400" />,
  },
  {
    id: "seer-ovi",
    name: "US-SEER Overall Vulnerability Index",
    agency: "US-SEER Spatial Analytics Engine (Derived Composite)",
    category: "derived",
    status: "active",
    tier: "Integrated",
    summary:
      "Composite risk score combining ambient PM2.5 exposure, industrial toxic releases, COPD/Asthma baseline, poverty rate, and healthcare density.",
    url: "#",
    variables: [
      { name: "Overall Vulnerability Score", code: "overallRisk", unit: "0-100 Score" },
    ],
    contribution:
      "Synthesizes multiple multi-source indicators into a single, intuitive spatial metric representing cumulative environmental and health burden.",
    whyItMatters:
      "Provides policymakers and researchers with an immediate priority ranking of high-risk counties suffering from compound hazards.",
    joinKey: "Derived per FIPS",
    resolution: "County Level",
    updateFrequency: "Real-time Computed",
    icon: <Sparkles className="w-5 h-5 text-teal-400" />,
  },
  {
    id: "cdc-svi",
    name: "CDC Social Vulnerability Index (SVI)",
    agency: "CDC / ATSDR",
    category: "socioeconomic",
    status: "roadmap",
    tier: "Roadmap",
    summary:
      "Composite 0–1 percentile score evaluating 15 census variables across 4 themes: socioeconomic, household, race/language, and housing/transportation.",
    url: "https://www.atsdr.cdc.gov/placeandhealth/svi/index.html",
    variables: [
      { name: "Overall SVI Score", code: "RPL_THEMES", unit: "Percentile (0-1)" },
      { name: "SES Vulnerability", code: "RPL_THEME1", unit: "Percentile" },
    ],
    contribution:
      "Bundles multiple demographic vulnerability metrics into a standardized equity index for rapid scatterplot visualization.",
    whyItMatters:
      "Allows plotting social vulnerability directly against respiratory mortality rate, colored by PM2.5 level to tell the complete environmental justice narrative.",
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
    summary:
      "30-year baseline averages of temperature, precipitation, humidity, and wind dispersion parameters across U.S. weather stations.",
    url: "https://www.ncei.noaa.gov/products/land-based-station/us-climate-normals",
    variables: [
      { name: "30-Yr Mean Temp", code: "TAVG", unit: "°F" },
      { name: "Stagnation Days Index", code: "STAGNATION", unit: "days/yr" },
    ],
    contribution:
      "Controls for meteorological factors such as atmospheric inversions that trap PM2.5 in valleys and temperature extremes that trigger respiratory distress.",
    whyItMatters:
      "Differentiates topographical & weather traps (e.g. California's Central Valley) from regional industrial emission intensity.",
    joinKey: "Spatial Join / Kriging to FIPS",
    resolution: "Station / County Polygon",
    updateFrequency: "Decennial",
    icon: <Layers className="w-5 h-5 text-cyan-400" />,
  },
  {
    id: "bls-oes",
    name: "BLS Occupational Employment Statistics",
    agency: "U.S. Bureau of Labor Statistics",
    category: "socioeconomic",
    status: "roadmap",
    tier: "Roadmap",
    summary:
      "County occupational breakdowns estimating workforce percentages in mining, construction, manufacturing, and agriculture.",
    url: "https://www.bls.gov/oes/",
    variables: [
      { name: "Mining & Extraction Share", code: "OCC_47_5000", unit: "% workforce" },
      { name: "Industrial Manufacturing Share", code: "OCC_51_0000", unit: "% workforce" },
    ],
    contribution:
      "Disentangles workplace dust and chemical exposure (e.g., coal mining or agricultural dust) from outdoor ambient air pollution.",
    whyItMatters:
      "High occupational hazard regions (such as Appalachia) can have elevated COPD mortality independent of ambient air quality. Adding worker metrics closes this gap.",
    joinKey: "FIPS / MSA Code",
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
    summary:
      "County-level groundwater and surface water measurements of nitrates, heavy metals, and industrial contaminants.",
    url: "https://waterdata.usgs.gov/nwis",
    variables: [
      { name: "Nitrate Concentration", code: "p00620", unit: "mg/L" },
      { name: "Arsenic Detection", code: "p01000", unit: "µg/L" },
    ],
    contribution:
      "Extends US-SEER from air quality research to cumulative multi-media environmental burden analysis.",
    whyItMatters:
      "Evaluating compound exposures (poor air quality + contaminated groundwater) represents the cutting edge of modern environmental epidemiology.",
    joinKey: "County Hydrologic Unit Code (HUC) / FIPS",
    resolution: "County Level",
    updateFrequency: "Continuous / Annual",
    icon: <Database className="w-5 h-5 text-blue-500" />,
  },
];

/* Confounder Matrix items */
const CONFOUNDER_CONTROLS = [
  {
    confounder: "Smoking Prevalence",
    source: "CDC PLACES (`CSMOKING_CrudePrev`)",
    biasCorrected: "Behavioral Confounding",
    explanation:
      "Smoking is the single largest behavioral risk factor for COPD and respiratory mortality. Without controlling for local smoking rates, PM2.5 mortality associations could be dismissed as smoking variance. Controlling for smoking proves PM2.5 remains a statistically significant independent predictor.",
    badgeColor: "border-fuchsia-500/30 text-fuchsia-400 bg-fuchsia-500/10",
  },
  {
    confounder: "Healthcare Access Density",
    source: "HHS AHRF (`F11978` Active Patient-Care MDs)",
    biasCorrected: "Medical Access Confounding",
    explanation:
      "Counties with physician shortages or sparse hospital capacity experience higher disease mortality regardless of air quality due to delayed diagnosis. Controlling for primary care physician density avoids misattributing medical provider shortages to pollution.",
    badgeColor: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10",
  },
  {
    confounder: "Urban-Rural Continuum",
    source: "USDA RUCC (`RUCC_2023` 1-9 Scale)",
    biasCorrected: "Urbanicity Variance",
    explanation:
      "Metropolitan counties and isolated rural counties differ fundamentally in vehicle traffic, healthcare infrastructure, and age distributions. Stratifying regressions by RUCC codes isolates urban traffic pollution from rural agricultural dust.",
    badgeColor: "border-indigo-500/30 text-indigo-400 bg-indigo-500/10",
  },
  {
    confounder: "Socioeconomic Status (Poverty & Uninsured)",
    source: "U.S. Census Bureau ACS (`B17001` Poverty & `B27001` Uninsured)",
    biasCorrected: "Socioeconomic Deprivation Bias",
    explanation:
      "Poverty exacerbates illness through nutrition, housing quality, and stress. Including poverty and uninsured rates allows isolating environmental toxicity from broader economic disadvantage.",
    badgeColor: "border-blue-500/30 text-blue-400 bg-blue-500/10",
  },
];

export default function DataSourcesView() {
  const [selectedCategory, setSelectedCategory] = useState<DataSourceCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  // Filtered dataset logic
  const filteredSources = useMemo(() => {
    return DATA_SOURCES.filter((item) => {
      // Category check
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

      // Search query check
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

  return (
    <div className="flex-1 h-full overflow-y-auto pr-1 space-y-5 animate-in fade-in-50 duration-300 pb-8">
      {/* Hero Header Banner */}
      <div className="relative rounded-xl border border-border bg-gradient-to-r from-card via-card/90 to-primary/5 p-4 sm:p-6 shadow-sm overflow-hidden">
        <div className="absolute top-0 right-0 -translate-y-6 translate-x-6 w-64 h-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground">FIPS Standardized</span>
            </div>
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-foreground">
              Data Sources
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              US-SEER integrates 11 federal databases across all 3,142 U.S. counties, combining environmental exposures, health outcomes, and socioeconomic controls.
            </p>
          </div>

          {/* Quick Metrics KPI Pill */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-2 lg:grid-cols-4 gap-2.5 shrink-0">
            <div className="p-2.5 rounded-lg border border-border bg-background/60 backdrop-blur-xs text-center">
              <div className="text-base sm:text-lg font-extrabold text-primary">11</div>
              <div className="text-[10px] text-muted-foreground font-medium">Federal Agencies</div>
            </div>
            <div className="p-2.5 rounded-lg border border-border bg-background/60 backdrop-blur-xs text-center">
              <div className="text-base sm:text-lg font-extrabold text-emerald-400">3,142</div>
              <div className="text-[10px] text-muted-foreground font-medium">U.S. Counties</div>
            </div>
            <div className="p-2.5 rounded-lg border border-border bg-background/60 backdrop-blur-xs text-center">
              <div className="text-base sm:text-lg font-extrabold text-sky-400">30+</div>
              <div className="text-[10px] text-muted-foreground font-medium">Key Variables</div>
            </div>
            <div className="p-2.5 rounded-lg border border-border bg-background/60 backdrop-blur-xs text-center">
              <div className="text-base sm:text-lg font-extrabold text-amber-400">100%</div>
              <div className="text-[10px] text-muted-foreground font-medium">FIPS Joinable</div>
            </div>
          </div>
        </div>
      </div>

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
                {/* Badge Header Row */}
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
                        Active in US-SEER
                      </Badge>
                    ) : (
                      <Badge className="bg-purple-500/15 text-purple-300 border border-purple-500/30 text-[10px] font-semibold px-2 py-0.5">
                        Roadmap (Tier 2)
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Title */}
                <CardTitle className="text-base font-bold text-foreground flex items-center justify-between">
                  <span>{source.name}</span>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground leading-relaxed">
                  {source.summary}
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 pt-0 space-y-3 flex-1 flex flex-col justify-between">
                {/* Metrics / Variables Pills */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-foreground/80 block">
                    Key Variables & Codes:
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

                {/* Contribution Highlight Box */}
                <div className="p-2.5 rounded-lg bg-muted/40 border border-border/80 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-foreground text-[11px]">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>What it contributes:</span>
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    {source.contribution}
                  </p>
                </div>

                {/* Expandable Why it Matters & Join Details */}
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
                        <span className="text-[10px] font-medium text-muted-foreground block">Frequency</span>
                        <span className="text-[10px] font-bold text-foreground truncate block" title={source.updateFrequency}>
                          {source.updateFrequency}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Footer Controls & Link */}
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
                        <span>Details & Join Rule</span>
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
                      <span>Source Portal</span>
                      <ExternalLink className="w-3 h-3" />
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

      {/* Confounder Control & Epidemiological Methodology Section */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-6 space-y-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-emerald-400" />
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              Confounder Controls
            </h2>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Multi-variable controls for smoking, healthcare access, urbanicity, and poverty to isolate air pollution risk.
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

      {/* Data Pipeline Flow Diagram */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-6 space-y-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              Data Pipeline
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">
            How federal datasets standardize and join on 5-digit county FIPS codes.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1.5 relative">
            <div className="text-[10px] font-bold text-primary tracking-wider uppercase">Step 1</div>
            <h3 className="text-xs font-bold text-foreground">Federal API & Data Ingestion</h3>
            <p className="text-[11px] text-muted-foreground">
              Automated fetch scripts query CDC WONDER, EPA AQS, Census ACS API, and USDA tables.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1.5 relative">
            <div className="text-[10px] font-bold text-emerald-400 tracking-wider uppercase">Step 2</div>
            <h3 className="text-xs font-bold text-foreground">5-Digit FIPS Standardization</h3>
            <p className="text-[11px] text-muted-foreground">
              State + County FIPS codes are padded to 5 digits (e.g. `06037` for Los Angeles County).
            </p>
          </div>

          <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1.5 relative">
            <div className="text-[10px] font-bold text-sky-400 tracking-wider uppercase">Step 3</div>
            <h3 className="text-xs font-bold text-foreground">BME Spatial Analytics Engine</h3>
            <p className="text-[11px] text-muted-foreground">
              Calculates OLS regressions, attributable mortality risk, and overall vulnerability index scores.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1.5">
            <div className="text-[10px] font-bold text-amber-400 tracking-wider uppercase">Step 4</div>
            <h3 className="text-xs font-bold text-foreground">Interactive Dashboard & Policy Sim</h3>
            <p className="text-[11px] text-muted-foreground">
              Renders interactive choropleth maps, counterfactual policy sliders, and health desert analytics.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
