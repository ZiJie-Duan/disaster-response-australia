'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import styles from './management.module.css';
import Map from '../components/map';
import { features } from 'process';

type AreaStatus = 'Active Disaster' | 'Resolved' | 'Safe';

type Area = {
  id: string;
  name: string;
  status: AreaStatus;
};

type AreaDetails = {
  areaName: string;
  disasterType: string;
  affectedPopulation: number | string;
  rescuersDeployed: string;
};

type VerifiedDevice = {
  id: number;
  verified: boolean;
  note?: string;
};

type ManagementData = {
  areas: Area[];
  areaDetails: AreaDetails;
  verifiedDevices: VerifiedDevice[];
};

const EMPTY_MANAGEMENT_DATA: ManagementData = {
  areas: [],
  areaDetails: {
    areaName: "",
    disasterType: "",
    affectedPopulation: "",
    rescuersDeployed: "",
  },
  verifiedDevices: [],
};

export default function DisasterAreaManagementPage({
  initialData = EMPTY_MANAGEMENT_DATA,
}: { initialData?: ManagementData } = {}) {
  // ====== Data placeholder: Replace EMPTY_MANAGEMENT_DATA with data from the API once the backend is ready ======
  // e.g.: const [managementData, setManagementData] = useState(EMPTY_MANAGEMENT_DATA);
  //       useEffect(() => { fetch('/api/management').then(res => res.json()).then(setManagementData); }, []);
  const managementData = initialData; // Using placeholder data for frontend development.

  const [selectedAreaId, setSelectedAreaId] = useState<string>(
    () => managementData.areas[0]?.id ?? ""
  );

  const areas = managementData.areas;
  const areaDetails = managementData.areaDetails;
  const verifiedDevices = managementData.verifiedDevices;

  // ====== Map container: Leave empty, will integrate with Map SDK in the future ======
  const mapRef = useRef<HTMLDivElement | null>(null);

  const [editMode, setEditMode] = useState<boolean>(false);
  const [mapMarkersMemory, setMapMarkersMemory] = useState<any[]>([]);
  const [tempMapFeatures, setTempMapFeatures] = useState<any[]>([]);
  const [mapAction, setMapAction] = useState<string>('show'); // 'show' | 'clean_and_edit' 

  useEffect(() => {
    // TODO[map]: Initialize the map here, e.g.:
    // const map = new mapboxgl.Map({ container: mapRef.current!, ... });
    // return () => map.remove();
  }, []);


  useEffect(() => {
    console.log('tempMapFeatures', tempMapFeatures);
  }, [tempMapFeatures]);

  // ====== Toolbar actions: Placeholders for now, will be connected to map drawing logic in the future ======
  const handleAddPoint = () => {
    // TODO[map]: Activate "add point" mode (click on the map to place a point)
  };
  const handleAddLine = () => {
    // TODO[map]: Activate "add line" mode (polyline)
  };
  const handleAddArea = () => {
    // TODO[map]: Activate "add polygon" mode (polygon)
  };
  const handleDelete = () => {
    // TODO[map]: Delete selected shape/feature
  };

  // ====== Switch area: In the future, fetch area details/device list from the backend and then setState ======
  const selectArea = (id: string) => {
    setSelectedAreaId(id);
    // TODO[backend]: In the future, call the API here based on the area id to update area details and device list.
  };

  return (
    <div className={styles.page}>
      {/* left sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sideTitle}>
          <Link href="/" className={styles.logoLink} aria-label="Back to homepage">
            <span className={styles.logoWrapper}>
              <Image
                src="/lightlogo.png"
                alt="Disaster Response Australia logo"
                fill
                sizes="80px"
                className={`${styles.logoImage} ${styles.logoLight}`}
                priority
                style={{ objectFit: 'contain' }}
              />
              <Image
                src="/darklogo.png"
                alt="Disaster Response Australia logo"
                fill
                sizes="80px"
                className={`${styles.logoImage} ${styles.logoDark}`}
                priority
                style={{ objectFit: 'contain' }}
              />
            </span>
            <span className={styles.sideTitleLabel}>MANAGEMENT SYSTEM</span>
          </Link>
        </div>

        <button className={styles.createBtn}
          onClick={() => {
            // TODO[backend]: Open a creation dialog, and call the backend to create an area upon submission
            setMapAction('clean_and_edit');
            setEditMode(true);
            setTempMapFeatures([]);
          }}
        >
          Create Disaster Area
        </button>

        <nav className={styles.areaList}>
          {areas.length === 0 ? (
            <div className={styles.emptyMessage}>No area data available. Please connect to the backend.</div>
          ) : (
            areas.map(area => (
              <button
                key={area.id}
                className={`${styles.areaItem} ${area.id === selectedAreaId ? styles.areaItemActive : ''}`}
                onClick={() => selectArea(area.id)}
              >
                <div className={styles.areaName}>{area.name}</div>
                <div className={styles.areaStatus}>{area.status}</div>
              </button>
            ))
          )}
        </nav>
      </aside>

      {/* right main area */}
      <section className={styles.main}>

        {mapAction === 'clean_and_edit' && (
          <div className={styles.topbar}>
            {editMode ? (
              <ToolbarButton label="Save" onClick={() => {
                setEditMode(false);
                setMapAction('show');
              }}>
                <PinIcon />
              </ToolbarButton>
            ) : (
              <ToolbarButton label="Edit" onClick={() => setEditMode(true)}>
                <PinIcon />
              </ToolbarButton>
            )}
          </div>
        )}

        {mapAction === 'show' && (
          <div className={styles.topbar}>
            <div className={styles.toolbar}>

              {editMode ? (
                <ToolbarButton label="Save" onClick={() => setEditMode(false)}>
                  <PinIcon />
                </ToolbarButton>
              ) : (
                <ToolbarButton label="Edit" onClick={() => setEditMode(true)}>
                  <PinIcon />
                </ToolbarButton>
              )}

              <ToolbarButton label="Something1" onClick={handleAddLine}>
                <SlashIcon />
              </ToolbarButton>
              <ToolbarButton label="Something2" onClick={handleAddArea}>
                <PlusIcon />
              </ToolbarButton>
              <ToolbarButton label="Something3" onClick={handleDelete} variant="danger">
                <TrashIcon />
              </ToolbarButton>
            </div>

            <div className={styles.userCluster}>
              <button className={styles.bell}>
                <BellIcon />
              </button>
              <div className={styles.userName}>Admin</div>
            </div>
          </div>
        )}

        {/* map card（empty container） */}
        <div className={styles.mapCard}>

          {/* map container */}
          <div ref={mapRef} id="map-container" className={styles.mapSurface} >

            <Map editable={editMode} mapMode="heatmap" getFeatures={
              () => {(tempMapFeatures); return tempMapFeatures;}
            } setFeatures={
              (features) => setTempMapFeatures(features)
            } />

          </div>

          {/* "Verified Device" bubble in the middle (UI placeholder only) */}
          {/* TODO[map]: This will be replaced by a map Marker/Popup, positioned by device coordinates */}
          {verifiedDevices[0] && (
            <div className={styles.deviceBubble} role="dialog" aria-label="Verified Device">
              <div className={styles.deviceBubbleTitle}>Verified Device</div>
              <div className={styles.deviceBubbleLine}>ID {verifiedDevices[0].id}</div>
              {verifiedDevices[0].note && (
                <div className={styles.deviceBubbleLine}>{verifiedDevices[0].note}</div>
              )}
            </div>
          )}

          {/* Bottom-right: white rounded panel (device list + legend) */}
          <div className={styles.dockPanel}>
          <div className={styles.dockTitle}>Verified Devices</div>
          <ul className={styles.deviceList}>
            {verifiedDevices.length === 0 ? (
              <li className={styles.emptyListItem}>No verified devices. Will be displayed here after backend integration.</li>
            ) : (
              verifiedDevices.map(d => (
                <li key={d.id} className={styles.deviceItem}>
                  <span>Device ID {d.id}</span>
                  {d.verified && <span className={styles.tick}>✓</span>}
                </li>
              ))
            )}
          </ul>

            <div className={styles.legend}>
              <LegendSwatch color="#ff3b30" label="Disaster" />
              <LegendSwatch color="#34c759" label="Safe" />
            </div>
          </div>
        </div>

        {/* Bottom "Area Details" information bar */}
        <div className={styles.detailBar}>
          <div className={styles.detailTitle}>AREA DETAILS</div>
          <div className={styles.detailGrid}>
            <DetailItem label="Area Name" value={formatDetailValue(areaDetails.areaName)} />
            <DetailItem label="Disaster type" value={formatDetailValue(areaDetails.disasterType)} />
            <DetailItem label="Affected population" value={formatDetailValue(areaDetails.affectedPopulation)} />
            <DetailItem label="Rescuers deployed" value={formatDetailValue(areaDetails.rescuersDeployed)} />
          </div>
        </div>
      </section>
    </div>
  );
}

/* ============ Small Components ============ */

function ToolbarButton({
  label,
  onClick,
  children,
  variant = 'default',
}: {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
  variant?: 'default' | 'danger';
}) {
  const buttonClass =
    variant === 'danger'
      ? `${styles.toolbarBtn} ${styles.toolbarBtnDanger}`
      : styles.toolbarBtn;

  return (
    <button className={buttonClass} onClick={onClick}>
      <span className={styles.toolbarIcon}>{children}</span>
      <span>{label}</span>
    </button>
  );
}

function DetailItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className={styles.detailItem}>
      <div className={styles.detailLabel}>{label}</div>
      <div className={styles.detailValue}>{value}</div>
    </div>
  );
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <div className={styles.legendRow}>
      <span className={styles.legendDot} style={{ background: color }} />
      <span>{label}</span>
    </div>
  );
}

/* ============ Simple inline icons (to avoid dependencies) ============ */

function PinIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 22s7-7.11 7-12a7 7 0 10-14 0c0 4.89 7 12 7 12z" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="10" r="2.5" fill="currentColor" />
    </svg>
  );
}
function SlashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 20L20 4" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 7h16M9 7V5h6v2m-8 0l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3a6 6 0 00-6 6v3.5L4.5 14A1 1 0 005 16h14a1 1 0 00.5-1.87L18 12.5V9a6 6 0 00-6-6z" fill="currentColor"/>
      <path d="M9.5 18a2.5 2.5 0 005 0h-5z" fill="currentColor"/>
    </svg>
  );
}

function formatDetailValue(value: string | number | undefined | null): string | number {
  return value === undefined || value === null || value === "" ? "—" : value;
}
