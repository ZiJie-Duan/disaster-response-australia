"use client";

import React, { useState } from "react";
import Image from "next/image";
import { AlertTriangle, CheckCircle2, Search, Maximize2 } from "lucide-react";
import LoginModal from "./components/LoginModal";
import Map from "./components/map";

// /**
//  * Placeholder implementation for a single-file Next.js (App Router) page.
//  * - All data fields are left blank (displayed as "—"), ready to be replaced with a DATA object or API calls.
//  * - A <div id="map"/> container is reserved for future integration with any map SDK (Mapbox, Leaflet, ArcGIS, etc.).
//  * - Styling is done with Tailwind CSS (assuming Tailwind is set up in the project).
//  *
//  * How to use:
//  * 1) Create this as `(dashboard)/page.tsx` under the `app/` directory or use it directly as `app/page.tsx`.
//  * 2) Integrate a map: Mount your map instance inside the `<div id="map"/>` in the `MapCard` component.
//  * 3) Connect data: Replace the `DATA` object with your API responses or Server Actions.
//  */

// ====== Placeholder data (all replaceable) ======
const DATA = {
  activeAreaName: "", // e.g., "Whitehorse"
  resolvedAreas: "", // e.g., 2
  affectedPopulation: "", // e.g., 4513
  survivorsWithGps: "", // e.g., 42
  latestReleases: [] as { title: string; href?: string }[],
};

// A small utility to display empty values as "—"
const asPlaceholder = (v: React.ReactNode) => (v === undefined || v === null || v === "" ? "—" : v);

export default function DashboardPage() {
  const [isLoginModalOpen, setLoginModalOpen] = useState(false);

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Top navigation bar */}
      <header className="bg-[#0C1E3B] text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          {/* Left side: Logo and title */}
          <div className="flex items-center gap-3">
            <Image src="/logo.svg" alt="Disaster Response Australia Logo" width={80} height={80} />
            <div>
              <div className="text-xs uppercase tracking-widest opacity-80">Disaster Response</div>
              <div className="text-lg font-semibold -mt-0.5">Australia</div>
            </div>
          </div>
          {/* Right side: Actions */}
          { document.cookie.includes("drau_id_token") ? (
            <div className="flex items-center gap-3">
            <button
              onClick={() => {
                document.cookie = "drau_id_token=; path=/; max-age=0";
                window.location.reload();
              }}
              className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur hover:bg-white/15"
            >
              Sign Out
            </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
            <button
              onClick={() => setLoginModalOpen(true)}
              className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur hover:bg-white/15"
            >
              Sign In / Sign Up
            </button>
          </div>
          )}
        </div>
      </header>

      {isLoginModalOpen && <LoginModal onClose={() => setLoginModalOpen(false)} />}

      {/* Statistic cards */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Active Disaster Areas" value={asPlaceholder(DATA.activeAreaName)} />
        <StatCard title="Resolved Areas" value={asPlaceholder(DATA.resolvedAreas)} />
        <StatCard title="Estimated Affected Population" value={asPlaceholder(DATA.affectedPopulation)} />
        <StatCard title="Survivors Sharing GPS Total" value={asPlaceholder(DATA.survivorsWithGps)} />
      </section>

      {/* Main layout */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-6 grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-6 pb-10">
        {/* Left side: Latest Release */}
        <aside className="rounded-2xl bg-card shadow-sm ring-1 ring-border overflow-hidden">
          <div className="bg-[#0C1E3B] text-white px-4 py-3 text-base font-semibold">Latest Release</div>
          <div className="p-0 divide-y divide-border">
            {DATA.latestReleases.length === 0 ? (
              <EmptyReleaseList />
            ) : (
              <ul className="flex flex-col">
                {DATA.latestReleases.map((it, idx) => (
                  <li key={idx} className="px-4 py-3 hover:bg-secondary">
                    {it.href ? (
                      <a className="text-sm text-card-foreground underline" href={it.href}>
                        {it.title}
                      </a>
                    ) : (
                      <span className="text-sm text-card-foreground">{it.title}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        {/* Right side: Map card */}
        <MapCard />
      </section>
    </main>
  );
}

// ====== Component Area ======
function StatCard({ title, value }: { title: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-card shadow-sm ring-1 ring-border p-5">
      <div className="text-sm text-muted-foreground font-extrabold">{title}</div>
      <div className="mt-1 text-3xl font-bold tracking-tight">{value}</div>
    </div>
  );
}

function EmptyReleaseList() {
  // Empty state: show 3 skeleton placeholders
  return (
    <div className="px-4 py-6">
      <p className="text-sm text-muted-foreground mb-3">No updates yet. Releases will be shown here.</p>
      <ul className="space-y-2">
        {[1, 2, 3].map((i) => (
          <li key={i} className="h-10 w-full rounded-md bg-muted animate-pulse" />
        ))}
      </ul>
    </div>
  );
}

function MapCard() {
  return (
    <div className="relative rounded-2xl bg-card shadow-sm ring-1 ring-border overflow-hidden">
      {/* Top filter bar */}
      <div className="absolute right-4 top-4 z-10 flex flex-col gap-3 w-72 max-w-[90vw]">
        <SelectLike label="Disaster Type" />
        <SelectLike label="Rescue Status" />
        <div className="flex items-center gap-2 rounded-xl bg-popover/90 ring-1 ring-border px-3 py-2 shadow-sm">
          <input
            type="text"
            placeholder="Area Search"
            className="w-full bg-transparent placeholder:text-muted-foreground focus:outline-none text-sm"
            disabled
          />
          <Search className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {/* Map container */}
      <div className="h-[640px] bg-secondary">
        <div
          id="map"
          className="h-full w-full border-2 border-dashed border-border"
        >
          <Map editable={false} />
        </div>
      </div>

      {/* Bottom-left legend */}
      <div className="absolute left-4 bottom-4 z-10 rounded-xl bg-popover/90 ring-1 ring-border px-3 py-2 shadow">
        <div className="flex items-center gap-2 text-sm">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <span>Disaster area</span>
        </div>
        <div className="mt-1 flex items-center gap-2 text-sm">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span>Safe area</span>
        </div>
      </div>

      {/* Bottom-right fullscreen button (placeholder) */}
      <button
        type="button"
        className="absolute right-4 bottom-4 z-10 rounded-xl bg-popover/90 ring-1 ring-border p-2 shadow hover:bg-popover"
        aria-label="Toggle full screen"
      >
        <Maximize2 className="h-5 w-5" />
      </button>
    </div>
  );
}

function SelectLike({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-popover/90 ring-1 ring-border px-3 py-2 shadow-sm">
      <span className="text-sm text-popover-foreground">{label}</span>
      <span className="text-xs text-muted-foreground">(Placeholder)</span>
    </div>
  );
}
