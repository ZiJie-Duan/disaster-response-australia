"use client";

import React, { useState } from "react";
import Image from "next/image";
import { AlertTriangle, CheckCircle2, Search, Maximize2 } from "lucide-react";
import LoginModal from "./components/LoginModal";
import Map from "./components/map";
import { useEffect } from "react";

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


// A small utility to display empty values as "—"
const asPlaceholder = (v: React.ReactNode) => (v === undefined || v === null || v === "" ? "—" : v);

export default function DashboardPage() {
  const [isLoginModalOpen, setLoginModalOpen] = useState(false);
  const [isLogIn, setIsLogIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [data, setData] = useState({
    activeAreaName: "",
    resolvedAreas: "",
    affectedPopulation: "",
    survivorsWithGps: "",
    latestReleases: [] as { title: string; href?: string }[],
  });

  // Function to get token from cookie
  const getTokenFromCookie = (): string | null => {
    if (typeof document === 'undefined') return null;
    
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'drau_id_token') {
        return value;
      }
    }
    return null;
  };

  // Function to verify token
  const verifyToken = async () => {
    try {
      setAuthError(null); // Clear previous errors
      const token = getTokenFromCookie();
      if (!token) {
        console.log("Token not found");
        setIsLogIn(false);
        return;
      }

      const backendUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/users/verify-token`;
      const response = await fetch(backendUrl, {
        method: 'GET',
        credentials: 'include', // Include cookies
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.is_valid === true) {
        setIsLogIn(true);
        setAuthError(null);
        console.log("Token verification successful");
      } else {
        // Token invalid, clear cookie and set as not logged in
        document.cookie = "drau_id_token=; path=/; max-age=0";
        setIsLogIn(false);
        setAuthError("Authentication failed, please log in again");
        console.log("Token invalid, cleared");
      }
    } catch (error) {
      // Request error, show network error message
      console.error("Token verification failed:", error);
      setAuthError("Authentication failed, please check network and log in again");
      setIsLogIn(false);
    }
  };

  useEffect(() => {
    if (document && document.cookie.includes("drau_id_token")) {
      // Call API to verify token
      verifyToken();
    }

    // TODO: Replace with actual data from the backend, Fetch here
    const timer = setInterval(() => {
      setData({
        activeAreaName: String(Math.floor(Math.random() * 10)),
        resolvedAreas: String(Math.floor(Math.random() * 8)), 
        affectedPopulation: String(Math.floor(Math.random() * 1000)),
        survivorsWithGps: String(Math.floor(Math.random() * 100)),
        latestReleases: (() => {
          const releases = [];
          for (let i = 2; i < Math.floor(Math.random() * 20); i++) {
            releases.push({ title: `Test Title ${i}`, href: `https://www.google.com` });
          }
          return releases;
        })(),
      });
    }, 3000);
    return () => clearInterval(timer);

  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Error notification */}
      {authError && (
        <div className="bg-red-500 text-white px-4 py-3 text-center">
          <div className="mx-auto max-w-7xl">
            <span className="text-sm font-medium">{authError}</span>
            <button
              onClick={() => setAuthError(null)}
              className="ml-4 text-white hover:text-gray-200 underline"
            >
              Close
            </button>
          </div>
        </div>
      )}
      
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
          { isLogIn ? (
            <div className="flex items-center gap-3">
            <button
              onClick={() => {
                window.location.href = "/management";
              }}
              className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur hover:bg-white/15"
            >
              Management
            </button>
            <button
              onClick={() => {
                document.cookie = "drau_id_token=; path=/; max-age=0";
                setIsLogIn(false);
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

      {isLoginModalOpen && <LoginModal onClose={() => setLoginModalOpen(false)} setIsLogIn={setIsLogIn} />}

      {/* Statistic cards */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Active Disaster Areas" value={data.activeAreaName} />
        <StatCard title="Resolved Areas" value={data.resolvedAreas} />
        <StatCard title="Estimated Affected Population" value={data.affectedPopulation} />
        <StatCard title="Survivors Sharing GPS Total" value={data.survivorsWithGps} />
      </section>

      {/* Main layout */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-6 grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-6 pb-10">
        {/* Left side: Latest Release */}
        <aside className="rounded-2xl bg-card shadow-sm ring-1 ring-border overflow-hidden">
          <div className="bg-[#0C1E3B] text-white px-4 py-3 text-base font-semibold">Latest Release</div>
          <div className="p-0 divide-y divide-border">
            {data.latestReleases.length === 0 ? (
              <EmptyReleaseList />
            ) : (
              <ul className="flex flex-col">
                {data.latestReleases.map((it, idx) => (
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
          <Map editable={false} getFeatures={() => []} setFeatures={() => {}} />
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
