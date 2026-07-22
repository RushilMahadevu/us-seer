"use client";

import React, { useState, useEffect, useRef } from "react";
import { Dialog } from "@/app/_components/ui/dialog";
import { Badge } from "@/app/_components/ui/badge";
import { SearchResultItem, performSearch } from "@/app/_lib/search-utils";
import { CountyDataMap } from "@/app/_lib/types";
import { Search, MapPin, Building2, Landmark, Compass, X, ChevronRight, Hash } from "lucide-react";
import { CityEntry } from "@/app/_lib/data-utils";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  countyData: CountyDataMap;
  allCities?: CityEntry[];
  onSelectResult: (result: SearchResultItem) => void;
}

const QUICK_SEARCHES = [
  { query: "California",  icon: <Landmark  className="h-3.5 w-3.5 text-blue-400"    />, label: "California",     sub: "State"           },
  { query: "Cook County", icon: <MapPin    className="h-3.5 w-3.5 text-emerald-400" />, label: "Cook County, IL", sub: "Chicago Metro"   },
  { query: "Houston",     icon: <Building2 className="h-3.5 w-3.5 text-amber-400"   />, label: "Houston, TX",    sub: "Harris County"   },
  { query: "Midwest",     icon: <Compass   className="h-3.5 w-3.5 text-purple-400"  />, label: "Midwest",        sub: "12-State Region" },
];

export default function SearchModal({
  isOpen,
  onClose,
  countyData,
  allCities,
  onSelectResult,
}: SearchModalProps) {
  const [query, setQuery]     = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const inputRef              = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    setResults(performSearch(query, countyData, allCities));
  }, [query, countyData, allCities]);

  const handleSelect = (item: SearchResultItem) => {
    onSelectResult(item);
    onClose();
  };

  const typeIcon = (type: SearchResultItem["type"]) => {
    switch (type) {
      case "county": return <MapPin    className="h-3.5 w-3.5 text-emerald-400" />;
      case "state":  return <Landmark  className="h-3.5 w-3.5 text-blue-400"   />;
      case "city":   return <Building2 className="h-3.5 w-3.5 text-amber-400"  />;
      case "region": return <Compass   className="h-3.5 w-3.5 text-purple-400" />;
    }
  };

  const typeBadgeColor = (type: SearchResultItem["type"]) => {
    switch (type) {
      case "county": return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
      case "state":  return "text-blue-400 bg-blue-400/10 border-blue-400/20";
      case "city":   return "text-amber-400 bg-amber-400/10 border-amber-400/20";
      case "region": return "text-purple-400 bg-purple-400/10 border-purple-400/20";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <div className="flex flex-col -m-6 max-h-[80vh] overflow-hidden rounded-xl bg-card border border-border shadow-2xl">

        {/* Input bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            id="search-modal-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search county, state, city, or region…"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {query.trim() === "" ? (
            <div className="p-4 space-y-3">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-1">
                Quick searches
              </div>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_SEARCHES.map((qs) => (
                  <button
                    key={qs.query}
                    onClick={() => setQuery(qs.query)}
                    className="flex items-center gap-2.5 p-2.5 rounded-lg border border-border/60 hover:border-border hover:bg-accent/60 text-left transition-all group"
                  >
                    <div className="p-1.5 rounded-md bg-muted/60">{qs.icon}</div>
                    <div>
                      <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                        {qs.label}
                      </div>
                      <div className="text-[10px] text-muted-foreground">{qs.sub}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-10 text-center text-muted-foreground gap-3">
              <div className="p-3 rounded-full bg-muted/60">
                <Search className="h-5 w-5 opacity-50" />
              </div>
              <div>
                <p className="text-xs font-semibold">No results for &ldquo;{query}&rdquo;</p>
                <p className="text-[11px] mt-1 text-muted-foreground/70">
                  Try a state name, county, or city (e.g. &quot;Texas&quot;, &quot;Seattle&quot;)
                </p>
              </div>
            </div>
          ) : (
            <div className="p-2 space-y-px">
              {results.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-accent transition-colors text-left group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-1.5 rounded-md bg-muted/60 border border-border/40 shrink-0">
                      {typeIcon(item.type)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                        {item.title}
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">{item.subtitle}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {item.extraInfo && (
                      <span className="hidden sm:inline text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border/60">
                        {item.extraInfo}
                      </span>
                    )}
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${typeBadgeColor(item.type)}`}>
                      {item.badge}
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/30 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Hash className="h-3 w-3" />
            40,000+ cities · 3,100+ counties · 50 states
          </span>
          <kbd className="font-mono bg-background border border-border px-1.5 py-0.5 rounded text-[10px]">
            ESC
          </kbd>
        </div>
      </div>
    </Dialog>
  );
}
