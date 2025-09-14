"use client";

import React from "react";
import { AlertTriangle, CheckCircle2, Search, Maximize2 } from "lucide-react";
import Link from "next/link";

/**
 * Next.js (App Router) 单文件页面占位实现
 * - 所有数据位留白（以“—”显示），以后直接替换 DATA 对象或接入 API 即可
 * - 地图区域留出 <div id="map"/> 容器，后续自行接入任意地图 SDK（Mapbox/Leaflet/ArcGIS/高德/百度等）
 * - 使用 Tailwind CSS 进行样式（建议在项目中已启用 Tailwind）
 *
 * 使用方法：
 * 1) 在 app/ 目录下新建 (dashboard)/page.tsx 或直接作为 app/page.tsx 使用
 * 2) 接入地图：在 MapCard 的 <div id="map"/> 中挂载你自己的地图实例
 * 3) 对接数据：将 DATA 替换成你的 API 返回值或 Server Actions
 */

// ====== 占位数据（全部可替换） ======
const DATA = {
  activeAreaName: "", // 例如 "Whitehorse"
  resolvedAreas: "", // 例如 2
  affectedPopulation: "", // 例如 4513
  survivorsWithGps: "", // 例如 42
  latestReleases: [] as { title: string; href?: string }[],
};

// 一个小工具：把空值显示为 "—"
const asPlaceholder = (v: React.ReactNode) => (v === undefined || v === null || v === "" ? "—" : v);

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-[#1E1E1E] text-slate-900">
      {/* 顶部导航 */}
      <header className="bg-[#1E1E1E] text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          {/* 左侧 Logo 与标题 */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-white/10 grid place-items-center font-bold">
              <span className="text-sm">DRA</span>
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest opacity-80">Disaster Response</div>
              <div className="text-lg font-semibold -mt-0.5">Australia</div>
            </div>
          </div>
          {/* 右侧操作区 */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur hover:bg-white/15"
            >
              🏛️ Sign up (for government)
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur hover:bg-white/15"
            >
              🛟 Sign up (for rescuer)
            </Link>
          </div>
        </div>
      </header>

      {/* 指标卡片 */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Active Disaster Areas" value={asPlaceholder(DATA.activeAreaName)} />
        <StatCard title="Resolved Areas" value={asPlaceholder(DATA.resolvedAreas)} />
        <StatCard title="Estimated Affected Population" value={asPlaceholder(DATA.affectedPopulation)} />
        <StatCard title="Survivors Sharing GPS Total" value={asPlaceholder(DATA.survivorsWithGps)} />
      </section>

      {/* 主体布局 */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-6 grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-6 pb-10">
        {/* 左侧：Latest Release */}
        <aside className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden">
          <div className="bg-[#1E1E1E] text-white px-4 py-3 text-base font-semibold">Latest Release</div>
          <div className="p-0 divide-y divide-slate-100">
            {DATA.latestReleases.length === 0 ? (
              <EmptyReleaseList />
            ) : (
              <ul className="flex flex-col">
                {DATA.latestReleases.map((it, idx) => (
                  <li key={idx} className="px-4 py-3 hover:bg-slate-50">
                    {it.href ? (
                      <a className="text-sm text-slate-800 underline" href={it.href}>
                        {it.title}
                      </a>
                    ) : (
                      <span className="text-sm text-slate-800">{it.title}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        {/* 右侧：地图卡片 */}
        <MapCard />
      </section>
    </main>
  );
}

// ====== 组件区域 ======
function StatCard({ title, value }: { title: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 p-5">
      <div className="text-sm text-slate-600">{title}</div>
      <div className="mt-1 text-3xl font-bold tracking-tight">{value}</div>
    </div>
  );
}

function EmptyReleaseList() {
  // 空状态：展示 3 条骨架占位
  return (
    <div className="px-4 py-6">
      <p className="text-sm text-slate-500 mb-3">暂无更新，发布内容将显示在此处。</p>
      <ul className="space-y-2">
        {[1, 2, 3].map((i) => (
          <li key={i} className="h-10 w-full rounded-md bg-slate-100 animate-pulse" />
        ))}
      </ul>
    </div>
  );
}

function MapCard() {
  return (
    <div className="relative rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden">
      {/* 顶部过滤条 */}
      <div className="absolute right-4 top-4 z-10 flex flex-col gap-3 w-72 max-w-[90vw]">
        <SelectLike label="Disaster Type" />
        <SelectLike label="Rescue Status" />
        <div className="flex items-center gap-2 rounded-xl bg-white/90 ring-1 ring-slate-200 px-3 py-2 shadow-sm">
          <input
            type="text"
            placeholder="Area Search"
            className="w-full bg-transparent placeholder:text-slate-400 focus:outline-none text-sm"
            disabled
          />
          <Search className="h-4 w-4 text-slate-400" />
        </div>
      </div>

      {/* 地图容器 */}
      <div className="h-[640px] bg-slate-50">
        <div
          id="map"
          className="h-full w-full grid place-items-center border-2 border-dashed border-slate-300"
        >
          <div className="text-center">
            <div className="text-sm text-slate-500">地图容器（占位）</div>
            <div className="text-xs text-slate-400 mt-1">在此处挂载你的地图 API（Mapbox/Leaflet/高德/百度/ArcGIS 等）</div>
          </div>
        </div>
      </div>

      {/* 左下角图例 */}
      <div className="absolute left-4 bottom-4 z-10 rounded-xl bg-white/90 ring-1 ring-slate-200 px-3 py-2 shadow">
        <div className="flex items-center gap-2 text-sm">
          <AlertTriangle className="h-4 w-4" />
          <span>Disaster area</span>
        </div>
        <div className="mt-1 flex items-center gap-2 text-sm">
          <CheckCircle2 className="h-4 w-4" />
          <span>Safe area</span>
        </div>
      </div>

      {/* 右下角全屏按钮（占位） */}
      <button
        type="button"
        className="absolute right-4 bottom-4 z-10 rounded-xl bg-white/90 ring-1 ring-slate-200 p-2 shadow hover:bg-white"
        aria-label="Toggle full screen"
      >
        <Maximize2 className="h-5 w-5" />
      </button>
    </div>
  );
}

function SelectLike({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-white/90 ring-1 ring-slate-200 px-3 py-2 shadow-sm">
      <span className="text-sm text-slate-700">{label}</span>
      <span className="text-xs text-slate-400">（占位）</span>
    </div>
  );
}
