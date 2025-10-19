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

// Helper function: Convert API status to AreaStatus used by component
function mapApiStatusToAreaStatus(apiStatus: string): AreaStatus {
  switch (apiStatus?.toLowerCase()) {
    case 'active':
      return 'Active Disaster';
    case 'resolved':
      return 'Resolved';
    case 'safe':
      return 'Safe';
    default:
      return 'Active Disaster'; // Default value
  }
}

// Helper function: Calculate polygon boundary center point
function calculatePolygonCenter(coordinates: number[][][]): { lat: number; lng: number } {
  // Safety check and default fallback (Sydney)
  if (!coordinates || coordinates.length === 0 || coordinates[0].length < 3) {
    return { lat: -33.8688, lng: 151.2093 };
  }

  // Only use outer ring to calculate centroid; coordinates are [lng, lat]
  const ring = coordinates[0];

  // If closed (first and last points are the same), remove the last duplicate point to avoid affecting area
  const n = ring.length;
  const isClosed = n > 1 && ring[0][0] === ring[n - 1][0] && ring[0][1] === ring[n - 1][1];
  const pts = isClosed ? ring.slice(0, n - 1) : ring.slice();

  if (pts.length < 3) {
    return { lat: -33.8688, lng: 151.2093 };
  }

  // Use shoelace formula to calculate area-weighted centroid (approximate planar coordinates)
  let twiceArea = 0; // Actually 2 * signed area
  let cxTimes6Area = 0; // Actually 6 * area * Cx
  let cyTimes6Area = 0; // Actually 6 * area * Cy

  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = [pts[i][0], pts[i][1]]; // lng, lat
    const [x1, y1] = [pts[(i + 1) % pts.length][0], pts[(i + 1) % pts.length][1]];
    const cross = x0 * y1 - x1 * y0;
    twiceArea += cross;
    cxTimes6Area += (x0 + x1) * cross;
    cyTimes6Area += (y0 + y1) * cross;
  }

  // When area is 0 (degenerate polygon), fall back to vertex averaging
  if (twiceArea === 0) {
    let sumX = 0;
    let sumY = 0;
    for (const p of pts) {
      sumX += p[0];
      sumY += p[1];
    }
    return { lat: sumY / pts.length, lng: sumX / pts.length };
  }

  const area = twiceArea / 2;
  const cx = cxTimes6Area / (3 * twiceArea); // (1 / (6A)) * Σ (x0 + x1) * cross
  const cy = cyTimes6Area / (3 * twiceArea); // (1 / (6A)) * Σ (y0 + y1) * cross

  return { lat: cy, lng: cx };
}

export default function DisasterAreaManagementPage({
  initialData = EMPTY_MANAGEMENT_DATA,
}: { initialData?: ManagementData } = {}) {
  // ====== Disaster areas state ======
  const [areas, setAreas] = useState<Area[]>(initialData.areas);
  const [allDisasterAreas, setAllDisasterAreas] = useState<any[]>([]); // Save complete disaster area data
  const [selectedAreaId, setSelectedAreaId] = useState<string>(
    () => initialData.areas[0]?.id ?? ""
  );

  const areaDetails = initialData.areaDetails;
  const verifiedDevices = initialData.verifiedDevices;

  // ====== Map container: Leave empty, will integrate with Map SDK in the future ======
  const mapRef = useRef<HTMLDivElement | null>(null);

  type EditMode = 'view' | 'draw' | 'text';
  type TextLabel = {
    id: string;
    position: { lat: number; lng: number };
    text: string;
  };

  const [editMode, setEditMode] = useState<EditMode>('view');
  const [mapMarkersMemory, setMapMarkersMemory] = useState<any[]>([]);
  const [tempMapFeatures, setTempMapFeatures] = useState<any[]>([]);
  const [textLabelsMemory, setTextLabelsMemory] = useState<TextLabel[]>([]);
  const [tempTextLabels, setTempTextLabels] = useState<TextLabel[]>([]);
  const [mapAction, setMapAction] = useState<string>('show'); // 'show' | 'clean_and_edit' 
  const [disasterAreaName, setDisasterAreaName] = useState<string>("");
  const [disasterAreaDescription, setDisasterAreaDescription] = useState<string>("");
  const [mapRefreshKey, setMapRefreshKey] = useState(0);
  
  // Map center and zoom state
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | undefined>(undefined);
  const [mapZoom, setMapZoom] = useState<number | undefined>(undefined);
  
  // Selected disaster area details
  const [selectedAreaDetails, setSelectedAreaDetails] = useState<any>(null);
  
  // Notification system state
  const [notification, setNotification] = useState<{
    show: boolean;
    type: 'error' | 'success' | 'info';
    message: string;
  }>({
    show: false,
    type: 'info',
    message: ''
  });

  // Helper function to show notifications
  const showNotification = (type: 'error' | 'success' | 'info', message: string) => {
    setNotification({
      show: true,
      type,
      message
    });
    
    // Auto-hide notification after 3 seconds
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 3000);
  };

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

  // Function to fetch disaster areas
  const fetchDisasterAreas = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/disaster_areas`,
        {
          headers: {
            'Authorization': `Bearer ${getTokenFromCookie()}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Save complete disaster area data
      setAllDisasterAreas(data);
      
      // Convert API response format to Area format used by component
      const transformedAreas: Area[] = data.map((item: any) => ({
        id: item.id,
        name: item.title,
        status: mapApiStatusToAreaStatus(item.status),
      }));

      setAreas(transformedAreas);
      
      // If there are disaster areas and none is currently selected, select the first one
      if (transformedAreas.length > 0 && !selectedAreaId) {
        setSelectedAreaId(transformedAreas[0].id);
      }
    } catch (error) {
      console.error('Error fetching disaster areas:', error);
      showNotification('error', 'Failed to load disaster areas');
    }
  };

  function createDisasterArea() {

    if (disasterAreaName === "" || disasterAreaDescription === "") {
      showNotification('error', 'Disaster area name and description are required');
      return;
    }

    if (tempMapFeatures.length != 1) {
      showNotification('error', 'Only one map feature is required to create disaster area');
      return;
    }

    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/disaster_areas`, {
      method: 'POST',
      body: JSON.stringify({
        title: disasterAreaName,
        description: disasterAreaDescription,
        boundary: {
          gid: tempMapFeatures[0].id,
          type: tempMapFeatures[0].geometry.type,
          coordinates: tempMapFeatures[0].geometry.coordinates,
        }
      }),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getTokenFromCookie()}`,
      },
    })
    .then(response => {
      if (response.ok) {
        return response.json();
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    })
    .then(data => {
      console.log('Disaster area created:', data);
      showNotification('success', 'Disaster area created successfully!');
      
      // Clear form
      setDisasterAreaName("");
      setDisasterAreaDescription("");
      setTempMapFeatures([]);
      
      // Re-fetch disaster area list to update display
      fetchDisasterAreas();
    })
    .catch(error => {
      console.error('Error creating disaster area:', error);
      showNotification('error', 'Failed to create disaster area. Please ensure the shape is closed and has no intersecting edges');
    });
  }

  // ====== Fetch disaster areas from API on component mount ======
  useEffect(() => {
    fetchDisasterAreas();
  }, []);
  
  useEffect(() => {
    // TODO[map]: Initialize the map here, e.g.:
    // const map = new mapboxgl.Map({ container: mapRef.current!, ... });
    // return () => map.remove();
  }, []);


  // Avoid frequent logging/render interference in creation mode
  useEffect(() => {
    if (mapAction !== 'clean_and_edit') {
      console.log('tempMapFeatures', tempMapFeatures);
    }
  }, [tempMapFeatures, mapAction]);

  // ====== Toolbar actions: Placeholders for now, will be connected to map drawing logic in the future ======
  const handleAddPoint = () => {
    // TODO[map]: Activate "add point" mode (click on the map to place a point)
  };

  // ====== Switch area: Find area details from local data and update map ======
  const selectArea = (id: string) => {
    // Confirm clearing existing markers and text labels before switching
    const hasExistingData = (mapMarkersMemory.length > 0 || tempMapFeatures.length > 0 || textLabelsMemory.length > 0 || tempTextLabels.length > 0);
    if (hasExistingData) {
      const ok = typeof window !== 'undefined' ? window.confirm('Switching disaster areas will clear current markers and text, continue?') : true;
      if (!ok) return;
    }

    setSelectedAreaId(id);
    
    // Find selected disaster area from loaded complete data
    const areaData = allDisasterAreas.find(area => area.id === id);
    
    if (!areaData) {
      console.warn('Area not found in local data:', id);
      return;
    }
    
    setSelectedAreaDetails(areaData);
    
    // If there's boundary data, calculate center point and move map
    if (areaData.boundary && areaData.boundary.coordinates) {
      const center = calculatePolygonCenter(areaData.boundary.coordinates);
      setMapCenter(center);
      setMapZoom(13);
      
      // Convert boundary data to GeoJSON Feature format
      const feature = {
        id: areaData.boundary.gid || areaData.id,
        type: 'Feature',
        geometry: {
          type: areaData.boundary.type,
          coordinates: areaData.boundary.coordinates
        },
        properties: {
          mode: 'polygon',
          color: '#ff3b30'
        }
      };
      
      // Display on map (if not in edit mode)
      if (mapAction === 'show') {
        // Clear all text labels when switching areas
        setTextLabelsMemory([]);
        setTempTextLabels([]);
        // Replace existing features with the selected area's feature
        setMapMarkersMemory([feature]);
        setTempMapFeatures([feature]);
        setMapRefreshKey(mapRefreshKey + 1);
      }
    }
  };

  return (
    <div className={styles.page}>
      {/* Notification component */}
      {notification.show && (
        <div 
          className={`${styles.notification} ${styles[`notification-${notification.type}`]}`}
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            padding: '12px 20px',
            borderRadius: '8px',
            color: 'white',
            fontWeight: '500',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            maxWidth: '400px',
            animation: 'slideInRight 0.3s ease-out',
            backgroundColor: notification.type === 'error' ? '#ef4444' : 
                           notification.type === 'success' ? '#10b981' : '#3b82f6'
          }}
        >
          {notification.type === 'error' && '❌ '}
          {notification.type === 'success' && '✅ '}
          {notification.type === 'info' && 'ℹ️ '}
          {notification.message}
        </div>
      )}
      
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
            setEditMode('draw');
            setTempMapFeatures([]);
            setTempTextLabels([]);
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

            <div className={styles.toolbar}>
              <label className={styles.toolbarField}>
                <span className={styles.toolbarLabel}>Disaster area name</span>
                <input
                  className={`${styles.toolbarInput} ${styles.toolbarInputName}`}
                  type="text"
                  placeholder="Enter area name"
                  aria-label="Disaster area name"
                  value={disasterAreaName}
                  onChange={(e) => setDisasterAreaName(e.target.value)}
                />
              </label>
              <label className={styles.toolbarField}>
                <span className={styles.toolbarLabel}>Disaster area description</span>
                <input
                  className={`${styles.toolbarInput} ${styles.toolbarInputDesc}`}
                  type="text"
                  placeholder="Add a brief description"
                  aria-label="Disaster area description"
                  value={disasterAreaDescription}
                  onChange={(e) => setDisasterAreaDescription(e.target.value)}
                />
              </label>
            </div>

            {editMode !== 'view' ? (
              <ToolbarButton label="Save" onClick={() => {
                setEditMode('view');
                setMapAction('show');
                createDisasterArea();
                setTempMapFeatures(mapMarkersMemory);
                setTempTextLabels(textLabelsMemory);
              }}>
                <PinIcon />
              </ToolbarButton>
            ) : (
              <ToolbarButton label="Edit" onClick={() => setEditMode('draw')}>
                <PinIcon />
              </ToolbarButton>
            )}
          </div>
        )}

        {mapAction === 'show' && (
          <div className={styles.topbar}>
            <div className={styles.toolbar}>

              {editMode !== 'view' ? (
                <ToolbarButton label="Save" onClick={
                  () => {
                    setEditMode('view');
                    setMapMarkersMemory(tempMapFeatures);
                    setTextLabelsMemory(tempTextLabels);
                    }
                  }>
                  <PinIcon />
                </ToolbarButton>
              ) : (
                <>
                  <ToolbarButton label="Draw" onClick={() => {
                    setEditMode('draw');
                    setTempMapFeatures(mapMarkersMemory);
                    setTempTextLabels(textLabelsMemory);
                  }}>
                    <PinIcon />
                  </ToolbarButton>
                  
                  <ToolbarButton label="Text Label" onClick={() => {
                    setEditMode('text');
                    setTempMapFeatures(mapMarkersMemory);
                    setTempTextLabels(textLabelsMemory);
                  }}>
                    <TextIcon />
                  </ToolbarButton>

                  <ToolbarButton label="Count Statistics" onClick={() => {
                    // TODO: Implement statistics counting functionality
                    showNotification('info', 'Count statistics feature coming soon');
                  }}>
                    <ChartIcon />
                  </ToolbarButton>
                </>
              )}
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

            <Map 
              key={mapRefreshKey}
              editMode={editMode} 
              mapMode={mapAction === 'clean_and_edit' || editMode !== 'view' ? 'original' : 'heatmap'} 
              getFeatures={() => tempMapFeatures}
              setFeatures={(features) => setTempMapFeatures(features)}
              getTextLabels={() => tempTextLabels}
              setTextLabels={(labels) => setTempTextLabels(labels)}
              suppressTextLabels={mapAction === 'clean_and_edit'}
              limitToolsTo={mapAction === 'clean_and_edit' ? ['polygon','rectangle','circle','freehand','static','select'] : undefined}
              mapCenter={mapCenter}
              mapZoom={mapZoom}
            />

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
function TextIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 7h16M9 3v4m6-4v4M9 7v13m6-13v13" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
function ChartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M3 3v18h18M7 16V9m4 7v-5m4 5V8m4 8V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function formatDetailValue(value: string | number | undefined | null): string | number {
  return value === undefined || value === null || value === "" ? "—" : value;
}
