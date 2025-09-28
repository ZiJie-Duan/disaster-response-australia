'use client';

import { useState, type ReactNode } from 'react';
import styles from './console.module.css';

type Alert = {
  id: string;
  deviceId: string | number;
  message: string;
};

type ConsoleStats = {
  deviceCount?: number;
  affectedPopulation?: number;
  lastUpdatedLabel?: string;
};

type ConsoleData = {
  zones: string[];
  alerts: Alert[];
  stats: ConsoleStats;
};

// TODO: when the backend API is served, placeholder values would be replaced with real data.
const EMPTY_CONSOLE_DATA: ConsoleData = {
  zones: [],
  alerts: [],
  stats: {},
};

export default function RescuerConsolePage({
  initialData = EMPTY_CONSOLE_DATA,
}: { initialData?: ConsoleData } = {}) {
  // TODO: 等待后台打通后，把这里替换成真实的请求结果（参考下面 ConsoleData 的结构）。
  // 例如：
  //   const [consoleData, setConsoleData] = useState(EMPTY_CONSOLE_DATA);
  //   useEffect(() => {
  //     fetch('/api/console').then((res) => res.json()).then(setConsoleData);
  //   }, []);
  const consoleData = initialData; // 暂时使用占位数据，便于前端联调。
  const [selectedZone, setSelectedZone] = useState(() => consoleData.zones[0] ?? '');

  const zones = consoleData.zones;
  // Geofence alerts come from backend data, it will be rendered as cards on the right in the future.
  const alerts = consoleData.alerts;
  const hasZones = zones.length > 0;
  const stats = consoleData.stats;

  return (
    <main className={styles.page}>
      {/* Top title + bell */}
      <header className={styles.header}>
        <h1 className={styles.title}>Rescuer Console</h1>
        <button className={styles.bellBtn} aria-label="Notifications">
          {/* Simple inline SVG bell to avoid installing dependencies */}
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 3a6 6 0 00-6 6v3.586l-1.293 1.293A1 1 0 005 16h14a1 1 0 00.707-1.707L18.414 12.586V9a6 6 0 00-6-6z" fill="currentColor"/>
            <path d="M9.5 18a2.5 2.5 0 005 0h-5z" fill="currentColor"/>
          </svg>
        </button>
      </header>

      {/* Three-column layout: left statistics column / middle map placeholder / right alert column */}
      <div className={styles.columns}>
        {/* Left side */}
        <aside className={styles.leftCol}>
          <div className={styles.card}>
            <label className={styles.label}>Area Zone</label>
            <div className={styles.selectWrap}>
              <select
                className={styles.select}
                value={selectedZone}
                onChange={(e) => setSelectedZone(e.target.value)}
                data-testid="zone-select"
                disabled={!hasZones}
              >
                {hasZones ? (
                  zones.map((z) => (
                    <option key={z} value={z}>{z}</option>
                  ))
                ) : (
                  <option value="">No zones available yet</option>
                )}
              </select>
              <span className={styles.selectChevron} aria-hidden>▾</span>
            </div>
          </div>

          <MetricCard title="Device count" value={metricValue(stats.deviceCount)} />
          <MetricCard title="Estimated affected population" value={metricValue(stats.affectedPopulation)} />
          <div className={styles.card}>
            <div className={styles.kpiTitle}>Last updated</div>
            <div className={styles.kpiValueSmall}>{metricValue(stats.lastUpdatedLabel)}</div>
          </div>
        </aside>

        {/* Middle: Map placeholder (embed Map SDK later) */}
        <section className={styles.mapSection}>
          <div className={styles.mapCard}>
            <div className={styles.mapSurface} id="map-container" data-testid="map-placeholder">
              {/* This is an empty container: change the map instance from  mount  to #map-container in the future */}
              {/* You can also uncomment the following "temporary polygon/marker" as a pure front-end schematic layer */}
              {/*
              <div className={styles.demoPolygon} />
              <div className={styles.demoPin}>SOS</div>
              <div className={styles.demoBadge} style={{ left: 110, top: 120 }}>Verified</div>
              <div className={styles.demoBadge} style={{ left: 140, top: 210 }}>Medical</div>
              <div className={styles.demoBadge} style={{ left: 210, top: 290 }}>Safe</div>
              */}
              <StatusActionPanel />
            </div>
          </div>
        </section>

        {/* Right: Geofence Alerts */}
        <aside className={styles.rightCol}>
          <div className={styles.rightPanel}>
            <div className={styles.rightTitle}>Geofence Alerts</div>
            {/* Showing the list when there is real alert data, otherwise keep the placeholder text */}
            {alerts.length === 0 ? (
              <EmptyAlertState />
            ) : (
              <div className={styles.alertList}>
                {alerts.map((alert) => (
                  <div key={alert.id} className={styles.alertCard}>
                    <div className={styles.alertLine}>Device ID {alert.deviceId}</div>
                    <div className={styles.alertSub}>{alert.message}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}

/** Left KPI Card */
function MetricCard({ title, value }: { title: string; value: ReactNode }) {
  return (
    <div className={styles.card}>
      <div className={styles.kpiTitle}>{title}</div>
      <div className={styles.kpiValue}>{value}</div>
    </div>
  );
}

function EmptyAlertState() {
  return (
    <div className={styles.alertList}>
      <div className={styles.alertCard}>
        <div className={styles.alertLine}>No alerts yet</div>
        <div className={styles.alertSub}>Hook up the geofence feed when the backend is ready.</div>
      </div>
    </div>
  );
}

function metricValue(value?: number | string): ReactNode {
  return value === undefined || value === null || value === '' ? '—' : value;
}

function StatusActionPanel() {
  return (
    <div className={styles.statusPanel} aria-label="Status quick actions">
      <div className={styles.statusItem}>
        <SafeIcon />
        <span>Safe</span>
      </div>
      <div className={styles.statusItem}>
        <MedicalIcon />
        <span>Medical</span>
      </div>
      <div className={styles.statusItem}>
        <SosIcon />
        <span>SOS</span>
      </div>
    </div>
  );
}

/* Simple inline SVG icons to avoid installing dependencies */
function SafeIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
function MedicalIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="4">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function SosIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2"/>
      <text x="12" y="14" fontSize="8" textAnchor="middle" fill="currentColor">SOS</text>
    </svg>
  );
}