'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import {
  TerraDraw,
  TerraDrawSelectMode,
  TerraDrawPointMode,
  TerraDrawLineStringMode,
  TerraDrawPolygonMode,
  TerraDrawRectangleMode,
  TerraDrawCircleMode,
  TerraDrawFreehandMode
} from 'terra-draw';
import { TerraDrawGoogleMapsAdapter } from 'terra-draw-google-maps-adapter';
import { createTextOverlayClass } from './TextOverlay';
import { fetchPopulationData, type AreaPolygon, type PopulationDataResponse } from '../services/populationApi';


const colorPalette = [
  "#E74C3C",
  "#FF0066",
  "#9B59B6",
  "#673AB7",
  "#3F51B5",
  "#3498DB",
  "#03A9F4",
  "#00BCD4",
  "#009688",
  "#27AE60",
  "#8BC34A",
  "#CDDC39",
  "#F1C40F",
  "#FFC107",
  "#F39C12",
  "#FF5722",
  "#795548"
];

const getRandomColor = () => colorPalette[Math.floor(Math.random() * colorPalette.length)] as `#${string}`;

function processSnapshotForUndo(snapshot: any[]): any[] {
    // console.log("Processing snapshot for undo:", snapshot);
    return snapshot.map(feature => {
        const newFeature = JSON.parse(JSON.stringify(feature));

        if (newFeature.properties.mode === 'rectangle') {
            // console.log("Processing rectangle for undo:", newFeature);
            newFeature.geometry.type = 'Polygon';
            newFeature.properties.mode = 'polygon';
        } else if (newFeature.properties.mode === 'circle') {
            // console.log("Processing circle for undo:", newFeature);
            newFeature.geometry.type = 'Polygon';
            // The radius is already in properties, so we just need to ensure the mode is correct for re-creation
            newFeature.properties.mode = 'circle';
        }
        return newFeature;
    });
}

type ModeId = 'select' | 'point' | 'linestring' | 'polygon' | 'rectangle' | 'circle' | 'freehand' | 'static' | 'freeze';
type MapMode = 'original'| 'heatmap';
type EditMode = 'view' | 'draw' | 'text';

interface TextLabel {
  id: string;
  position: { lat: number; lng: number };
  text: string;
}

interface TerraDrawAdvancedPageProps {
  key: number
  editMode: EditMode
  mapMode: MapMode
  getFeatures: () => any[]
  setFeatures: (features: any[]) => void
  getTextLabels: () => TextLabel[]
  setTextLabels: (labels: TextLabel[]) => void
  suppressTextLabels?: boolean
  limitToolsTo?: ModeId[]
  mapCenter?: { lat: number; lng: number }
  mapZoom?: number
};

export default function TerraDrawAdvancedPage( { key, editMode = 'view', mapMode = 'original', getFeatures, setFeatures, getTextLabels, setTextLabels, suppressTextLabels = false, limitToolsTo, mapCenter, mapZoom }: TerraDrawAdvancedPageProps ) {
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const drawRef = useRef<TerraDraw | null>(null);
  const historyRef = useRef<any[]>([]);
  const redoHistoryRef = useRef<any[]>([]);
  const selectedFeatureIdRef = useRef<string | null>(null);
  const isRestoringRef = useRef<boolean>(false);
  const debounceTimeoutRef = useRef<number | undefined>(undefined);
  const heatmapFetchTimeoutRef = useRef<number | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastFeaturesJSONRef = useRef<string>("");
  const textOverlaysRef = useRef<Map<string, any>>(new Map());
  const mapClickListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const isAddingTextRef = useRef<boolean>(false);
  const isDeletingTextRef = useRef<boolean>(false);
  const TextOverlayClassRef = useRef<any>(null);
  const overlayViewRef = useRef<google.maps.OverlayView | null>(null);
  
  const [activeMode, setActiveMode] = useState<ModeId>('point');
  const [resizingEnabled, setResizingEnabled] = useState<boolean>(false);
  const [heatmapLayer, setHeatmapLayer] = useState<google.maps.visualization.HeatmapLayer | null>(null);
  const [isAddingText, setIsAddingText] = useState<boolean>(false);
  const [isDeletingText, setIsDeletingText] = useState<boolean>(false);

  function importFeatures(features: any[]) {
    if (!drawRef.current) return;
    drawRef.current.clear();
    drawRef.current.addFeatures(features);
  }

  function exportFeatures() {
    if (!drawRef.current) return [];
    return drawRef.current.getSnapshot();
  }

  // Mode switching function
  const switchMode = (mode: ModeId) => {
    if (!drawRef.current) return;
    // If there are restricted tools, only allow whitelisted modes
    if (limitToolsTo && !limitToolsTo.includes(mode)) {
      return;
    }

    // console.log(drawRef.current.getSnapshot());
    // drawRef.current!.addFeatures([{
    //   id: crypto.randomUUID(),
    //   type: "Feature",
    //   geometry: {
    //     type: "Point",
    //     coordinates: [
    //       133.726881602,
    //       -25.23472513
    //     ]
    //   },
    //   properties: {
    //     mode: "point"
    //   }
    // }])

    
    if (mode === 'static') {
      drawRef.current.clear();
      drawRef.current.setMode('static');
    } else if (mode === 'freeze') {
      drawRef.current.setMode('static');
    } else {
      drawRef.current.setMode(mode);
    }
    setActiveMode(mode);
  };

  // Move map when mapCenter or mapZoom changes
  useEffect(() => {
    if (!mapRef.current) return;
    
    if (mapCenter) {
      mapRef.current.setCenter(mapCenter);
    }
    
    if (mapZoom !== undefined) {
      mapRef.current.setZoom(mapZoom);
    }
  }, [mapCenter, mapZoom]);

  // Clear or restore text labels when suppressTextLabels changes
  useEffect(() => {
    if (!mapRef.current) return;
    // Skip if TextOverlayClass is not yet initialized
    const TextOverlayClass = TextOverlayClassRef.current;
    if (suppressTextLabels) {
      // Enter suppression: immediately clear all text overlays
      textOverlaysRef.current.forEach(overlay => overlay.setMap(null));
      textOverlaysRef.current.clear();
    } else if (TextOverlayClass) {
      // Exit suppression: reload
      loadTextLabels(TextOverlayClass);
    }
  }, [suppressTextLabels]);

  // Text label related functions
  const createTextOverlay = (label: TextLabel, TextOverlayClass: any) => {
    if (!mapRef.current) return null;
    
    const overlay = new TextOverlayClass(
      new google.maps.LatLng(label.position.lat, label.position.lng),
      label.text,
      mapRef.current,
      label.id,
      (id: string) => handleTextClick(id)
    );
    
    // Ensure interactivity immediately after creation (in some cases onAdd completes with a slight delay)
    // Schedule both a microtask and a short timeout as double insurance
    setTimeout(() => {
      overlay.setInteractive(true);
    }, 0);

    return overlay;
  };

  const handleTextClick = (id: string) => {
    // Completely rely on isDeletingTextRef to decide behavior, don't check editMode
    // This avoids issues with closures capturing stale editMode values
    
    // If in delete mode, delete directly
    if (isDeletingTextRef.current) {
      const overlay = textOverlaysRef.current.get(id);
      if (overlay) {
        overlay.setMap(null);
        textOverlaysRef.current.delete(id);
      }
      
      // Remove from data
      const currentLabels = getTextLabels();
      const updatedLabels = currentLabels.filter(label => label.id !== id);
      setTextLabels(updatedLabels);
      
      // Keep delete mode active for continuous deletion
    }
    // If not in delete mode, do nothing when clicking text label
  };

  const addTextLabel = () => {
    // Exit delete mode
    setIsDeletingText(false);
    isDeletingTextRef.current = false;
    
    setIsAddingText(true);
    isAddingTextRef.current = true;
    if (mapRef.current) {
      mapRef.current.setOptions({ draggableCursor: 'crosshair' });
    }
  };

  const toggleDeleteText = () => {
    // Exit add mode
    if (isAddingText) {
      setIsAddingText(false);
      isAddingTextRef.current = false;
      if (mapRef.current) {
        mapRef.current.setOptions({ draggableCursor: null });
      }
    }
    
    // Toggle delete mode
    const newDeletingState = !isDeletingText;
    setIsDeletingText(newDeletingState);
    isDeletingTextRef.current = newDeletingState;
    
    if (mapRef.current) {
      mapRef.current.setOptions({ 
        draggableCursor: newDeletingState ? 'pointer' : null 
      });
    }
    
    // When entering delete mode, ensure all text overlays are interactive
    if (newDeletingState) {
      textOverlaysRef.current.forEach((overlay) => {
        overlay.setInteractive(true);
      });
    }
  };

  const loadTextLabels = (TextOverlayClass: any) => {
    if (!mapRef.current) return;
    
    // Clear existing text labels
    textOverlaysRef.current.forEach(overlay => overlay.setMap(null));
    textOverlaysRef.current.clear();
    
    // If suppressed, return early (avoid reloading)
    if (suppressTextLabels) return;

    // Load text labels (only when not suppressed)
    if (!suppressTextLabels) {
      const labels = getTextLabels();
      labels.forEach(label => {
        const overlay = createTextOverlay(label, TextOverlayClass);
        if (overlay) {
          textOverlaysRef.current.set(label.id, overlay);
          
          // Delay setting interactivity to ensure onAdd is complete
          setTimeout(() => {
            overlay.setInteractive(editMode === 'text');
          }, 100);
        }
      });
    }
  };

  const updateTextOverlaysInteractivity = () => {
    textOverlaysRef.current.forEach((overlay) => {
      overlay.setInteractive(editMode === 'text');
    });
    
    // If not in text mode, reset all states
    if (editMode !== 'text') {
      // Reset add text state
      if (isAddingTextRef.current) {
        setIsAddingText(false);
        isAddingTextRef.current = false;
      }
      
      // Reset delete state
      if (isDeletingTextRef.current) {
        setIsDeletingText(false);
        isDeletingTextRef.current = false;
      }
      
      if (mapRef.current) {
        mapRef.current.setOptions({ draggableCursor: null });
      }
    }
  };

  function autoSwitchMode() {
    if (!drawRef.current) return;
    
    // If there are restricted tools, enforce whitelisted modes
    const safeSetMode = (m: ModeId) => {
      if (limitToolsTo && !limitToolsTo.includes(m)) {
        const fallback = limitToolsTo[0] ?? 'select';
        drawRef.current!.setMode(fallback);
        setActiveMode(fallback);
      } else {
        drawRef.current!.setMode(m);
        setActiveMode(m);
      }
    };

    if (editMode === 'view') {
      safeSetMode('static');
    } else if (editMode === 'draw') {
      // Only set once when entering draw mode, don't auto-override user's subsequent choices
      if (!drawRef.current) return;
      const current = drawRef.current.getMode?.();
      const desired = limitToolsTo && limitToolsTo.length > 0 ? limitToolsTo[0] : 'select';
      if (current !== desired) {
        safeSetMode(desired);
      }
    } else if (editMode === 'text') {
      // Keep TerraDraw running and switch to static to keep drawings visible
      try {
        if (!drawRef.current.enabled) {
          drawRef.current.start();
        }
      } catch (e) {
        console.error("Error starting TerraDraw:", e);
      }
      safeSetMode('static');
    }
  };

  useEffect(() => {
    if (!drawRef.current) return;
    
    // If switching out from text mode, need to restart TerraDraw
    if (editMode !== 'text' && !drawRef.current.enabled) {
      try {
        drawRef.current.start();
        // If tools are restricted, switch to first whitelisted mode after starting
        if (limitToolsTo && limitToolsTo.length > 0) {
          drawRef.current.setMode(limitToolsTo[0]);
        } else {
          drawRef.current.setMode('select');
        }
      } catch (e) {
        console.error("Error starting TerraDraw:", e);
      }
    }
    
    autoSwitchMode();
  
    updateTextOverlaysInteractivity();
    
  }, [editMode]);

  useEffect(() => {
    if (editMode !== 'text') {
      console.log('importFeatures', getFeatures());
      importFeatures(getFeatures());
    }
  }, [key, editMode]);

  // Export GeoJSON
  const exportGeoJSON = () => {
    if (!drawRef.current) return;
    
    const features = drawRef.current.getSnapshot();
    const geojson = {
      type: "FeatureCollection",
      features: features,
    };
    const data = JSON.stringify(geojson, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "drawing.geojson";
    link.click();
    URL.revokeObjectURL(url);
  };

  // Import GeoJSON
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !drawRef.current) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const geojson = JSON.parse(e.target?.result as string);
        if (geojson.type === "FeatureCollection") {
          drawRef.current!.addFeatures(geojson.features);
        } else {
          alert("Invalid GeoJSON file: must be a FeatureCollection.");
        }
      } catch (error) {
        alert("Error parsing GeoJSON file.");
      }
    };
    reader.readAsText(file);
    
    // reset the input value of the file, allowing to choose repetitively same file
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Delete selected feature
  const deleteSelected = () => {
    if (!drawRef.current) return;
    
    if (selectedFeatureIdRef.current) {
      drawRef.current.removeFeatures([selectedFeatureIdRef.current]);
    } else {
      const features = drawRef.current.getSnapshot();
      if (features.length > 0) {
        const lastFeature = features[features.length - 1];
        if (lastFeature.id) {
          drawRef.current.removeFeatures([lastFeature.id]);
        }
      }
    }
  };

  // Undo
  const undo = () => {
    if (!drawRef.current || historyRef.current.length <= 1) return;
    
    redoHistoryRef.current.push(historyRef.current.pop()!);
    const snapshotToRestore = historyRef.current[historyRef.current.length - 1];
    isRestoringRef.current = true;
    drawRef.current.clear();
    drawRef.current.addFeatures(snapshotToRestore);
    setTimeout(() => { isRestoringRef.current = false; }, 0);
  };

  // Redo
  const redo = () => {
    if (!drawRef.current || redoHistoryRef.current.length === 0) return;
    
    const snapshot = redoHistoryRef.current.pop()!;
    historyRef.current.push(snapshot);
    isRestoringRef.current = true;
    drawRef.current.clear();
    drawRef.current.addFeatures(snapshot);
    setTimeout(() => { isRestoringRef.current = false; }, 0);
  };

  // Toggle resize mode
  const toggleResize = () => {
    if (!drawRef.current) return;

    const newResizingEnabled = !resizingEnabled;
    setResizingEnabled(newResizingEnabled);

    const flags = {
      polygon: { feature: { draggable: true, coordinates: { resizable: newResizingEnabled ? 'center' : undefined, draggable: !newResizingEnabled } } },
      linestring: { feature: { draggable: true, coordinates: { resizable: newResizingEnabled ? 'center' : undefined, draggable: !newResizingEnabled } } },
      rectangle: { feature: { draggable: true, coordinates: { resizable: newResizingEnabled ? 'center' : undefined, draggable: !newResizingEnabled } } },
      circle: { feature: { draggable: true, coordinates: { resizable: newResizingEnabled ? 'center' : undefined, draggable: !newResizingEnabled } } },
      freehand: { feature: { draggable: true, coordinates: { resizable: newResizingEnabled ? 'center' : undefined, draggable: !newResizingEnabled } } },
    };

    drawRef.current.updateModeOptions('select', { flags });
  };

  // Utility: Get map bounds and convert to GeoJSON Polygon
  const getMapBoundsPolygon = (map: google.maps.Map): AreaPolygon | null => {
    const bounds = map.getBounds();
    if (!bounds) return null;

    const ne = bounds.getNorthEast(); // Northeast corner
    const sw = bounds.getSouthWest(); // Southwest corner

    // Create a rectangle polygon in GeoJSON format (counter-clockwise order)
    // Format: [longitude, latitude]
    const coordinates = [[
      [sw.lng(), sw.lat()], // Southwest
      [ne.lng(), sw.lat()], // Southeast
      [ne.lng(), ne.lat()], // Northeast
      [sw.lng(), ne.lat()], // Northwest
      [sw.lng(), sw.lat()], // Close the polygon
    ]];

    return {
      type: 'Polygon',
      coordinates,
    };
  };

  // Initialize heatmap layer
  const initializeHeatmap = (map: google.maps.Map) => {
    if (!google.maps.visualization) {
      console.error('Google Maps visualization library not loaded');
      return null;
    }

    const heatmap = new google.maps.visualization.HeatmapLayer({
      data: [],
      map: map,
      radius: 25,
      opacity: 0.7,
    });

    setHeatmapLayer(heatmap);
    console.log('Heatmap layer initialized');
    return heatmap;
  };

  // Update heatmap data
  const updateHeatmapData = (
    heatmap: google.maps.visualization.HeatmapLayer,
    data: PopulationDataResponse
  ) => {
    // Convert API data format [lng, lat, weight] to Google Maps format
    const heatmapData = data.map(([lng, lat, weight]) => ({
      location: new google.maps.LatLng(lat, lng),
      weight: weight,
    }));

    heatmap.setData(heatmapData);
    console.log(`Heatmap updated with ${heatmapData.length} data points`);
    console.log('Heatmap data size:', heatmap.getData().getLength());
  };

  // Load heatmap data based on current map bounds
  const loadHeatmapData = async (map: google.maps.Map) => {
    try {
      // Get current map bounds
      const area = getMapBoundsPolygon(map);
      if (!area) {
        console.warn('Could not get map bounds');
        return;
      }

      // Prepare API request
      const now = new Date();
      const request = {
        area,
        time_from: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(), // 24 hours ago
        time_to: now.toISOString(),
      };

      console.log('Fetching population data for area:', area);

      // Fetch data from API (currently returns mock data)
      const data = await fetchPopulationData(request);

      // Initialize heatmap if not already done
      let currentHeatmap = heatmapLayer;
      if (!currentHeatmap) {
        currentHeatmap = initializeHeatmap(map);
        if (!currentHeatmap) return;
      }

      // Update heatmap with new data
      updateHeatmapData(currentHeatmap, data);
    } catch (error) {
      console.error('Error loading heatmap data:', error);
    }
  };

  useEffect(() => {
    let cancelled = false;
    let projectionListener: google.maps.MapsEventListener | null = null;

    const init = async () => {
      if (typeof window === 'undefined') return;
      if (!mapDivRef.current) return;
      if (mapRef.current || drawRef.current) return;

      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        console.error('Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY');
        return;
      }

      try {
        const loader = new Loader({
          apiKey,
          version: "weekly",
          libraries: ["maps", "drawing", "marker", "visualization"]
        });

        await loader.load();
        
        const { Map } = await google.maps.importLibrary("maps") as google.maps.MapsLibrary;

        if (cancelled || !mapDivRef.current) return;

        const mapOptions: google.maps.MapOptions = {
          center: { lat: -37.8136, lng: 144.9631 },
          zoom: 12,
          mapId: 'c306b3c6dd3ed8d9',
          mapTypeId: 'roadmap',
          zoomControl: false,
          tilt: 0,
          mapTypeControl: true,
          clickableIcons: false,
          streetViewControl: false,
          fullscreenControl: false,
          disableDoubleClickZoom: true,
          gestureHandling: 'greedy',
        };

        const map = new Map(mapDivRef.current, mapOptions);
        mapRef.current = map;

        // Apply initial center/zoom if provided via props to avoid missing first effect due to init timing
        if (mapCenter) {
          map.setCenter(mapCenter);
        }
        if (mapZoom !== undefined) {
          map.setZoom(mapZoom);
        }

        const TextOverlay = createTextOverlayClass(google.maps);
        TextOverlayClassRef.current = TextOverlay;

        // Load initial text labels
        loadTextLabels(TextOverlay);

        // Map click event - for adding text labels
        mapClickListenerRef.current = map.addListener("click", (e: google.maps.MapMouseEvent) => {
          // 在文本模式下，允许在 TerraDraw 图形上放置文字：
          // 我们通过 DOM 命中检测来避免 Google Maps 将点击吞给矢量层
          if (editMode === 'text' && isAddingTextRef.current && e.latLng) {
            try {
              const target = (e.domEvent?.target as HTMLElement | undefined);
              // 只要是地图容器或 TerraDraw 画布/矢量上的点击，都允许放置文字
              // 不再阻止在图形上方添加
              // 若未来需要更细控制，可在此基于 className 进行白名单判断
            } catch {}
            const text = prompt("Enter text label content:");
            if (text && text.trim()) {
              const newLabel: TextLabel = {
                id: crypto.randomUUID(),
                position: { lat: e.latLng.lat(), lng: e.latLng.lng() },
                text: text.trim()
              };
              
              // Create text overlay
              const overlay = createTextOverlay(newLabel, TextOverlayClassRef.current);
              if (overlay) {
                textOverlaysRef.current.set(newLabel.id, overlay);
                
                // Delay setting interactivity to ensure onAdd is complete
                setTimeout(() => {
                  overlay.setInteractive(true);
                }, 100);
              }
              
              // Update data
              const currentLabels = getTextLabels();
              setTextLabels([...currentLabels, newLabel]);
            }
            
            // 保持添加模式，以便连续添加；如果希望单次添加后退出，可恢复以下三行
            // setIsAddingText(false);
            // isAddingTextRef.current = false;
            // map.setOptions({ draggableCursor: null });
          }
        });

        // Prevent double-click events from being consumed by map (for polygon/rectangle completion gestures)
        map.addListener("dblclick", (e: google.maps.MapMouseEvent) => {
          if (e.domEvent) {
            e.domEvent.preventDefault?.();
            e.domEvent.stopPropagation?.();
          }
        });

        // Load heatmap数据在用户静止1秒后再拉取，减少卡顿
        map.addListener("idle", () => {
          if (heatmapFetchTimeoutRef.current) {
            clearTimeout(heatmapFetchTimeoutRef.current);
          }
          heatmapFetchTimeoutRef.current = window.setTimeout(() => {
            if (mapMode === 'heatmap') {
              console.log("Map idle for 1s - loading heatmap data");
              loadHeatmapData(map);
            }
          }, 1000);
        });

        // 用户开始交互时（拖拽/缩放/边界变化），取消等待中的热力图拉取
        const cancelPendingHeatmapFetch = () => {
          if (heatmapFetchTimeoutRef.current) {
            clearTimeout(heatmapFetchTimeoutRef.current);
            heatmapFetchTimeoutRef.current = undefined;
          }
        };
        map.addListener("dragstart", cancelPendingHeatmapFetch);
        map.addListener("zoom_changed", cancelPendingHeatmapFetch);
        map.addListener("bounds_changed", cancelPendingHeatmapFetch);

        projectionListener = map.addListener("projection_changed", () => {
          if (drawRef.current || cancelled) return;

          const draw = new TerraDraw({
            adapter: new TerraDrawGoogleMapsAdapter({ map, lib: google.maps, coordinatePrecision: 9 }),
            modes: [
              new TerraDrawSelectMode({
                flags: {
                  polygon: {
                    feature: {
                      draggable: true,
                      rotateable: true,
                      coordinates: {
                        midpoints: true,
                        draggable: true,
                        deletable: true,
                      },
                    },
                  },
                  linestring: {
                    feature: {
                      draggable: true,
                      rotateable: true,
                      coordinates: {
                        midpoints: true,
                        draggable: true,
                        deletable: true,
                      },
                    },
                  },
                  point: {
                    feature: {
                      draggable: true,
                      rotateable: true,
                    },
                  },
                  rectangle: {
                    feature: {
                      draggable: true,
                      rotateable: true,
                      coordinates: {
                        midpoints: true,
                        draggable: true,
                        deletable: true,
                      },
                    },
                  },
                  circle: {
                    feature: {
                      draggable: true,
                      rotateable: true,
                      coordinates: {
                        midpoints: true,
                        draggable: true,
                        deletable: true,
                      },
                    },
                  },
                  freehand: {
                    feature: {
                      draggable: true,
                      rotateable: true,
                      coordinates: {
                        midpoints: true,
                        draggable: true,
                        deletable: true,
                      },
                    },
                  },
                },
              }),
              new TerraDrawPointMode({
                editable: true,
                styles: { pointColor: getRandomColor() },
              }),
              new TerraDrawLineStringMode({
                editable: true,
                styles: { lineStringColor: getRandomColor() },
              }),
              new TerraDrawPolygonMode({
                editable: true,
                styles: (() => {
                  const color = getRandomColor();
                  return {
                    fillColor: color,
                    outlineColor: color,
                  };
                })(),
              }),
              new TerraDrawRectangleMode({
                styles: (() => {
                  const color = getRandomColor();
                  return {
                    fillColor: color,
                    outlineColor: color,
                  };
                })(),
              }),
              new TerraDrawCircleMode({
                styles: (() => {
                  const color = getRandomColor();
                  return {
                    fillColor: color,
                    outlineColor: color,
                  };
                })(),
              }),
              new TerraDrawFreehandMode({
                styles: (() => {
                  const color = getRandomColor();
                  return {
                    fillColor: color,
                    outlineColor: color,
                  };
                })(),
              }),
            ],
          });

          drawRef.current = draw;
          draw.start();
          // If tools are restricted, default to first whitelisted mode
          if (limitToolsTo && limitToolsTo.length > 0) {
            try {
              draw.setMode(limitToolsTo[0]);
              setActiveMode(limitToolsTo[0]);
            } catch {}
          }


          draw.on('ready', () => {
            // After initialization, don't force to select, follow limitToolsTo or keep current mode
            const initialMode: ModeId = (limitToolsTo && limitToolsTo.length > 0)
              ? limitToolsTo[0]
              : 'select';
            try {
              draw.setMode(initialMode);
              setActiveMode(initialMode);
            } catch {}

            // Import initial features once TerraDraw is ready
            importFeatures(getFeatures());

            draw.on("select", (id) => {
              if (selectedFeatureIdRef.current && selectedFeatureIdRef.current !== id) {
                draw.deselectFeature(selectedFeatureIdRef.current);
              }
              selectedFeatureIdRef.current = id as string;
            });

            draw.on("deselect", () => {
              selectedFeatureIdRef.current = null;
            });

            // Initialize history
            historyRef.current.push(processSnapshotForUndo(draw.getSnapshot()));

            draw.on("change", (ids, type) => {
              if (isRestoringRef.current) return;

              // Only sync to parent when features actually change, avoid unnecessary loops
              const snapshot = draw.getSnapshot();
              const processedSnapshot = processSnapshotForUndo(snapshot);
              const filteredSnapshot = processedSnapshot.filter(
                (f) => !f.properties.midPoint && !f.properties.selectionPoint
              );

              const json = JSON.stringify(filteredSnapshot);
              if (json !== lastFeaturesJSONRef.current) {
                lastFeaturesJSONRef.current = json;
                setFeatures(filteredSnapshot);
              }

              if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
              }

              debounceTimeoutRef.current = window.setTimeout(() => {
                historyRef.current.push(filteredSnapshot);
                redoHistoryRef.current = [];
              }, 200);
            });

            // Keyboard event listener (disable browser's default double-click zoom while ensuring TerraDraw's double-click completion)
            const handleKeyDown = (event: KeyboardEvent) => {
              if (event.key === 'r' && selectedFeatureIdRef.current) {
                const features = draw.getSnapshot();
                const selectedFeature = features.find(f => f.id === selectedFeatureIdRef.current);

                if (selectedFeature) {
                  const newFeature = rotateFeature(selectedFeature, 15);
                  draw.addFeatures([newFeature]);
                }
              }
            };

            document.addEventListener('keydown', handleKeyDown);
            // Defensive: some browsers may still have default double-click behavior, disable at document level
            const handleDblClick = (e: MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
            };
            document.addEventListener('dblclick', handleDblClick, { capture: true });
            
            // Return cleanup function
            return () => {
              document.removeEventListener('keydown', handleKeyDown);
              document.removeEventListener('dblclick', handleDblClick, { capture: true } as any);
            };
          });
        });

        // Prepare a lightweight OverlayView for pixel<->latLng conversions used by DOM-level clicks
        try {
          const overlayView = new google.maps.OverlayView();
          overlayView.onAdd = () => {};
          overlayView.draw = () => {};
          overlayView.onRemove = () => {};
          overlayView.setMap(map);
          overlayViewRef.current = overlayView;
        } catch {}

      } catch (e) {
        console.error("Error loading Google Maps API:", e);
      }
    };

    init();

    return () => {
      cancelled = true;

      // Cleanup TerraDraw
      if (drawRef.current) {
        try {
          drawRef.current.stop();
        } catch {}
        drawRef.current = null;
      }

      // Cleanup text overlays
      textOverlaysRef.current.forEach(overlay => overlay.setMap(null));
      textOverlaysRef.current.clear();

      // Cleanup overlay view
      if (overlayViewRef.current) {
        try { overlayViewRef.current.setMap(null as any); } catch {}
        overlayViewRef.current = null;
      }

      // Cleanup event listeners
      if (projectionListener) {
        projectionListener.remove();
        projectionListener = null;
      }

      if (mapClickListenerRef.current) {
        mapClickListenerRef.current.remove();
        mapClickListenerRef.current = null;
      }

      // Cleanup timer
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      // Cleanup heatmap debounce timer
      if (heatmapFetchTimeoutRef.current) {
        clearTimeout(heatmapFetchTimeoutRef.current);
      }

      mapRef.current = null;
    };
  }, []);

  // Helper function for rotating features
  const rotateFeature = (feature: any, angle: number) => {
    const newFeature = JSON.parse(JSON.stringify(feature));
    const coordinates = newFeature.geometry.coordinates;
    const center = getCenter(coordinates);

    const rotatedCoordinates = coordinates.map((ring: any) => {
      return ring.map((point: any) => {
        const x = point[0] - center[0];
        const y = point[1] - center[1];
        const newX = x * Math.cos(angle * Math.PI / 180) - y * Math.sin(angle * Math.PI / 180);
        const newY = x * Math.sin(angle * Math.PI / 180) + y * Math.cos(angle * Math.PI / 180);
        return [newX + center[0], newY + center[1]];
      });
    });

    newFeature.geometry.coordinates = rotatedCoordinates;
    return newFeature;
  };

  const getCenter = (coordinates: any) => {
    let x = 0;
    let y = 0;
    let count = 0;
    coordinates.forEach((ring: any) => {
      ring.forEach((point: any) => {
        x += point[0];
        y += point[1];
        count++;
      });
    });
    return [x / count, y / count];
  };

  return (
    <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}

      { editMode === 'draw' ? (
        <>
          <div
            style={{
              display: 'flex',
              gap: 8,
              padding: 12,
              borderBottom: '1px solid #eee',
              alignItems: 'center',
              flexWrap: 'wrap',
              // Use theme-consistent light background (remove obvious yellow/highlight)
              backgroundColor: '#f8f9fa',
            }}
          >
            {/* Drawing mode buttons */}
            {([
              { id: 'select', label: 'Select', icon: '🎯' },
              { id: 'point', label: 'Point', icon: '📍' },
              { id: 'linestring', label: 'Line', icon: '📏' },
              { id: 'polygon', label: 'Polygon', icon: '🔷' },
              { id: 'rectangle', label: 'Rectangle', icon: '⬜' },
              { id: 'circle', label: 'Circle', icon: '⭕' },
              { id: 'freehand', label: 'Freehand', icon: '✏️' },
              { id: 'static', label: 'Clear', icon: '🗑️' },
            ] as { id: ModeId; label: string; icon: string }[])
              .filter((mode) => !limitToolsTo || limitToolsTo.includes(mode.id))
              .map((mode) => (
              <button
                key={mode.id}
                onClick={() => switchMode(mode.id)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid #ddd',
                  background: activeMode === mode.id ? '#007bff' : '#fff',
                  color: activeMode === mode.id ? '#fff' : '#333',
                  cursor: 'pointer',
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.2s',
                }}
              >
                <span>{mode.icon}</span>
                {mode.label}
              </button>
            ))}

            <div style={{ width: 1, height: 30, backgroundColor: '#ddd', margin: '0 8px' }} />

            {/* Resize button */}
            <button
              onClick={toggleResize}
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid #ddd',
                background: resizingEnabled ? '#28a745' : '#fff',
                color: resizingEnabled ? '#fff' : '#333',
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              🔄 Resize
            </button>

            <div style={{ width: 1, height: 30, backgroundColor: '#ddd', margin: '0 8px' }} />

            {/* Undo/Redo buttons */}
            <button
              onClick={undo}
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid #ddd',
                background: '#fff',
                color: '#333',
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              ↶ Undo
            </button>
            <button
              onClick={redo}
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid #ddd',
                background: '#fff',
                color: '#333',
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              ↷ Redo
            </button>

            <div style={{ width: 1, height: 30, backgroundColor: '#ddd', margin: '0 8px' }} />

            {/* Delete button */}
            <button
              onClick={deleteSelected}
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid #dc3545',
                background: '#fff',
                color: '#dc3545',
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              🗑️ Delete
            </button>

            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              {/* Import button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid #6c757d',
                  background: '#fff',
                  color: '#6c757d',
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                📁 Import
              </button>
              
              {/* Export button */}
              <button
                onClick={exportGeoJSON}
                style={{
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid #17a2b8',
                  background: '#17a2b8',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                💾 Export
              </button>
            </div>
          </div>

        </>
      ) : null }

      { editMode === 'text' ? (
        <div
          style={{
            display: 'flex',
            gap: 8,
            padding: 12,
            borderBottom: '1px solid #eee',
            alignItems: 'center',
            flexWrap: 'wrap',
            // Use theme-consistent light background (remove yellow emphasis)
            backgroundColor: '#f8f9fa',
          }}
        >
          {/* Mode indicator (subdued visual emphasis, matches theme style) */}
          <div style={{
            padding: '6px 10px',
            borderRadius: 6,
            background: '#e9ecef',
            color: '#343a40',
            fontWeight: 500,
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <span>📝</span>
            Text mode
          </div>

          <div style={{ width: 1, height: 30, backgroundColor: '#ddd', margin: '0 8px' }} />
          
          {/* Add text button */}
          <button
            onClick={addTextLabel}
            style={{
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid #ddd',
              background: isAddingText ? '#28a745' : '#fff',
              color: isAddingText ? '#fff' : '#333',
              cursor: 'pointer',
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.2s',
            }}
          >
            <span>➕</span>
            {isAddingText ? 'Adding...' : 'Add Text'}
          </button>

          {/* Delete text button */}
          <button
            onClick={toggleDeleteText}
            style={{
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid #dc3545',
              background: isDeletingText ? '#dc3545' : '#fff',
              color: isDeletingText ? '#fff' : '#dc3545',
              cursor: 'pointer',
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.2s',
            }}
          >
            <span>🗑️</span>
            {isDeletingText ? 'Deleting...' : 'Delete Text'}
          </button>
          
          <div style={{ marginLeft: 'auto', padding: '8px 12px', color: '#856404', fontSize: 12 }}>
            💡 Tip: {isAddingText ? 'Click map to add text' : isDeletingText ? 'Click text label to delete' : 'Select tool to start'}
          </div>
        </div>
      ) : null }

      {/* Map container */}
      <div
        ref={mapDivRef}
        style={{
          flex: 1,
          minHeight: 0,
          position: 'relative'
        }}
      >
        {editMode === 'text' && isAddingText && (
          <div
            onClick={(e) => {
              // 使用 OverlayView 将像素转换为经纬度
              if (!overlayViewRef.current || !mapRef.current) return;
              const projection = overlayViewRef.current.getProjection && overlayViewRef.current.getProjection();
              if (!projection) return;
              const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
              const x = e.clientX - rect.left;
              const y = e.clientY - rect.top;
              try {
                const latLng = projection.fromContainerPixelToLatLng(new google.maps.Point(x, y));
                if (!latLng) return;
                const text = prompt("Enter text label content:");
                if (text && text.trim()) {
                  const newLabel: TextLabel = {
                    id: crypto.randomUUID(),
                    position: { lat: latLng.lat(), lng: latLng.lng() },
                    text: text.trim()
                  };
                  const overlay = createTextOverlay(newLabel, TextOverlayClassRef.current);
                  if (overlay) {
                    textOverlaysRef.current.set(newLabel.id, overlay);
                    setTimeout(() => { overlay.setInteractive(true); }, 100);
                  }
                  const currentLabels = getTextLabels();
                  setTextLabels([...currentLabels, newLabel]);
                }
              } catch {}
              e.stopPropagation();
              e.preventDefault();
            }}
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 5,
              background: 'transparent',
              cursor: 'crosshair',
            }}
          />
        )}
      </div>
      
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".geojson,.json"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />

      {/* Help tips */}
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: 12,
          borderRadius: 6,
          fontSize: 12,
          maxWidth: 300,
        }}
      >
        <div><strong>Shortcuts:</strong></div>
        <div>• Press R to rotate selected shape</div>
        <div>• Click shape to select and edit</div>
        <div>• Drag shape to move</div>
      </div>
    </div>
  );
}