"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, type Variants } from "framer-motion";
import Header from "@/app/_components/header/Header";
import {
  Map as MapIcon,
  HeartPulse,
  Stethoscope,
  CirclePile,
  ArrowRight,
  Landmark,
  Sun,
  Moon,
  ChevronRight,
  ShieldCheck,
  Activity,
  Wind,
  Layers,
} from "lucide-react";
import { fetchCountyData, fetchCitiesData } from "@/app/_lib/data-utils";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.04,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: "easeOut",
    },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut",
    },
  },
};

export default function LandingPage() {
  const router = useRouter();
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark") || true;
    setIsDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add("dark");
    }

    // Pre-warm data cache in the background for instant 0ms map transition
    fetchCountyData().catch(() => { });
    fetchCitiesData().catch(() => { });
  }, []);

  const handleToggleDarkMode = () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const handleViewChange = (view: "map" | "analysis" | "sources") => {
    if (view === "map") router.push("/map");
    else if (view === "analysis") router.push("/lab");
    else if (view === "sources") router.push("/sources");
  };

  const sections = [
    {
      title: "Interactive Map Dashboard",
      description:
        "Choropleth mapping across all 3,142 U.S. counties with 2018-2024 temporal trends, county health profiles, and dual-county comparison.",
      href: "/map",
      icon: MapIcon,
      action: "Open Map",
      badge: "Main Dashboard",
    },
    {
      title: "Epidemiological Research Lab",
      description:
        "Multivariate OLS regressions, scatter plot correlations, and CDC Social Vulnerability Index (SVI) inequality distributions.",
      href: "/lab",
      icon: Stethoscope,
      action: "Open Lab",
      badge: "Statistical Tools",
    },
    {
      title: "Data Sources & Provenance",
      description:
        "Full dataset documentation and citations for EPA NAAQS PM2.5, CDC WONDER respiratory mortality, and EPA TRI industrial releases.",
      href: "/sources",
      icon: CirclePile,
      action: "View Sources",
      badge: "Methodology",
    },
    {
      title: "NV-02 Congressional District Case Study",
      description:
        "In-depth analysis of Nevada's 2nd District, examining mining corridor emissions, rural healthcare access, and environmental justice hotspots.",
      href: "/map?fips=32031",
      icon: Landmark,
      action: "View NV-02",
      badge: "Case Study",
    },
  ];

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="flex flex-col min-h-screen w-full bg-background text-foreground p-3.5 sm:p-5 gap-3.5 sm:gap-4 overflow-x-hidden pt-4 sm:pt-6 pb-6"
    >
      {/* ── Top Header ────────────────────────────────────────────── */}
      <Header
        activeView="map"
        onViewChange={handleViewChange}
        isDarkMode={isDarkMode}
        onToggleDarkMode={handleToggleDarkMode}
        onOpenDistrict={() => router.push("/map?fips=32031")}
      />

      {/* ── Main Content Container ─────────────────────────────────── */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-5xl mx-auto w-full px-2 sm:px-4 py-8 sm:py-12 gap-8 sm:gap-12">
        {/* Hero Section */}
        <motion.div variants={itemVariants} className="text-center flex flex-col items-center max-w-2xl gap-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-card border border-border text-xs font-medium text-muted-foreground shadow-xs">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span>3,142 U.S. Counties Indexed • 2018-2024</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            U.S. Spatial Environmental Exposure &amp; Respiratory Risk Index
          </h1>

          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            US-SEER maps fine particulate air pollution (PM2.5), toxic industrial emissions (EPA TRI), and CDC respiratory disease mortality across all 3,142 U.S. counties with longitudinal trend analysis.
          </p>

          {/* ── PRIMARY ONE-CLICK BUTTON FOR JUDGES ───────────────────── */}
          <div className="flex flex-col sm:flex-row items-center gap-3 mt-3 w-full sm:w-auto">
            <Link
              href="/map"
              id="landing-launch-map-btn"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-md hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <MapIcon className="w-4 h-4" />
              <span>Launch Interactive Map</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/lab"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-card border border-border text-foreground font-semibold text-xs hover:bg-accent hover:border-primary/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Stethoscope className="w-4 h-4 text-muted-foreground" />
              <span>Research Lab</span>
            </Link>

            <Link
              href="/sources"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-card border border-border text-foreground font-semibold text-xs hover:bg-accent hover:border-primary/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <CirclePile className="w-4 h-4 text-muted-foreground" />
              <span>Data Sources</span>
            </Link>
          </div>
        </motion.div>

        {/* ── Key Statistics Row ────────────────────────────────────── */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
          <div className="p-4 rounded-xl bg-card border border-border flex flex-col gap-1 hover:border-primary/40 transition-colors">
            <span className="text-2xl font-bold text-foreground">3,142</span>
            <span className="text-xs text-muted-foreground">U.S. Counties Analyzed</span>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border flex flex-col gap-1 hover:border-primary/40 transition-colors">
            <span className="text-2xl font-bold text-foreground">9</span>
            <span className="text-xs text-muted-foreground">Environmental &amp; Health Metrics</span>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border flex flex-col gap-1 hover:border-primary/40 transition-colors">
            <span className="text-2xl font-bold text-foreground">2018-2024</span>
            <span className="text-xs text-muted-foreground">Temporal Longitudinal Range</span>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border flex flex-col gap-1 hover:border-primary/40 transition-colors">
            <span className="text-2xl font-bold text-foreground">100% Open</span>
            <span className="text-xs text-muted-foreground">EPA &amp; CDC Data Sources</span>
          </div>
        </motion.div>

        {/* ── Platform Sections Grid ─────────────────────────────────── */}
        <motion.div variants={containerVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          {sections.map((sec, idx) => {
            const Icon = sec.icon;
            return (
              <motion.div key={idx} variants={cardVariants}>
                <Link
                  href={sec.href}
                  className="h-full p-5 rounded-xl bg-card border border-border hover:border-primary/50 hover:shadow-md transition-all flex flex-col justify-between gap-4 group cursor-pointer"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="p-2 rounded-lg bg-muted/80 text-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-[11px] font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                        {sec.badge}
                      </span>
                    </div>
                    <h2 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                      {sec.title}
                    </h2>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {sec.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 text-xs font-semibold text-primary pt-2 border-t border-border/60">
                    <span>{sec.action}</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <motion.footer variants={itemVariants} className="w-full max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <HeartPulse className="w-3.5 h-3.5 text-primary" />
          <span className="font-semibold text-foreground">US-SEER</span>
          <span>• Spatial Environmental Exposure &amp; Respiratory Risk Index</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/map" className="hover:text-foreground transition-colors">
            Map
          </Link>
          <Link href="/lab" className="hover:text-foreground transition-colors">
            Lab
          </Link>
          <Link href="/sources" className="hover:text-foreground transition-colors">
            Sources
          </Link>
        </div>
      </motion.footer>
    </motion.div>
  );
}
