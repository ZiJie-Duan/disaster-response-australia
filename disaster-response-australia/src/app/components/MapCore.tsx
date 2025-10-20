'use client';

import React, { useEffect, useRef, useCallback } from 'react';
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
import type { PopulationDataResponse } from '../services/populationApi';

const colorPalette = [
  "#E74C3C", "#FF0066", "#9B59B6", "#673AB7", "#3F51B5", "#3498DB",
  "#03A9F4", "#00BCD4", "#009688", "#27AE60", "#8BC34A", "#CDDC39",
  "#F1C40F", "#FFC107", "#F39C12", "#FF5722", "#795548"
];

const getRandomColor = () => colorPalette[Math.floor(Math.random() * colorPalette.length)] as `#${string}`;

function processSnapshotForUndo(snapshot: any[]): any[] {
  return snapshot.map(feature => {
    const newFeature = JSON.parse(JSON.stringify(feature));
    if (newFeature.properties.mode === 'rectangle') {
      newFeature.geometry.type = 'Polygon';
      newFeature.properties.mode = 'polygon';
    } else if (newFeature.properties.mode === 'circle') {
      newFeature.geometry.type = 'Polygon';
      newFeature.properties.mode = 'circle';
    }
    return newFeature;
  });
}

export type ModeId = 'select' | 'point' | 'linestring' | 'polygon' | 'rectangle' | 'circle' | 'freehand' | 'static' | 'freeze';
export type MapMode = 'original' | 'heatmap';
export type EditMode = 'view' | 'draw' | 'text';

export interface TextLabel {
  id: string;
  position: { lat: number; lng: number };
  text: string;
}

export interface MapCoreAPI {
  undo: () => void;
  redo: () => void;
  deleteSelected: () => void;
  exportGeoJSON: () => void;
  importGeoJSON: (file: File) => void;
  switchMode: (mode: ModeId) => void;
  toggleResize: () => void;
  centerTo: (center: { lat: number; lng: number }, zoom?: number) => void;
  fitBounds: (bounds: google.maps.LatLngBounds) => void;
}

export interface MapCoreProps {
  mode?: EditMode;
  mapMode?: MapMode;
  features?: any[];
  onFeaturesChange?: (features: any[]) => void;
  textLabels?: TextLabel[];
  onTextLabelsChange?: (labels: TextLabel[]) => void;
  suppressTextLabels?: boolean;
  limitToolsTo?: ModeId[];
  mapCenter?: { lat: number; lng: number };
  mapZoom?: number;
  heatmapData?: PopulationDataResponse;
  onReady?: (api: MapCoreAPI) => void;
  onSelectionChange?: (featureId: string | null) => void;
  onError?: (error: Error, context: string) => void;
  onHeatmapBoundsChange?: (area: { type: 'Polygon'; coordinates: number[][][] }) => void;
  onModeChange?: (mode: ModeId) => void;
  activeDrawMode?: ModeId;
  resizingEnabled?: boolean;
  // External control for text interactions
  textAddActive?: boolean;
  textDeleteActive?: boolean;
}

export default function MapCore({
  mode = 'view',
  mapMode = 'original',
  features = [],
  onFeaturesChange,
  textLabels = [],
  onTextLabelsChange,
  suppressTextLabels = false,
  limitToolsTo,
  mapCenter,
  mapZoom,
  heatmapData,
  onReady,
  onSelectionChange,
  onError,
  onHeatmapBoundsChange,
  onModeChange,
  activeDrawMode = 'select',
  resizingEnabled = false,
  textAddActive = false,
  textDeleteActive = false,
}: MapCoreProps) {
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const drawRef = useRef<TerraDraw | null>(null);
  const historyRef = useRef<any[]>([]);
  const redoHistoryRef = useRef<any[]>([]);
  const selectedFeatureIdRef = useRef<string | null>(null);
  const isRestoringRef = useRef<boolean>(false);
  const debounceTimeoutRef = useRef<number | undefined>(undefined);
  const lastFeaturesJSONRef = useRef<string>("");
  const textOverlaysRef = useRef<Map<string, any>>(new Map());
  const mapClickListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const isAddingTextRef = useRef<boolean>(false);
  const isDeletingTextRef = useRef<boolean>(false);
  const TextOverlayClassRef = useRef<any>(null);
  const heatmapLayerRef = useRef<google.maps.visualization.HeatmapLayer | null>(null);
  const idleListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const heatmapFetchTimeoutRef = useRef<number | undefined>(undefined);
  
  const MAX_HISTORY = 50;

  // Import features
  const importFeatures = useCallback((featuresToImport: any[]) => {
    if (!drawRef.current) return;
    try {
      // Skip if TerraDraw is not enabled (e.g., in text mode)
      // We only import when TerraDraw is running
      // to avoid "Terra Draw is not enabled" errors
      // and unintended gesture interruptions
      // Consumers should trigger a remount or switch to 'view' to import
      // which our features-sync effect handles
      // If disabled, simply ignore
      // (existing features remain rendered when stopped)
      // @ts-ignore - enabled is a known property on TerraDraw
      if (!(drawRef.current as any).enabled) {
        return;
      }
      drawRef.current.clear();
      drawRef.current.addFeatures(featuresToImport);
    } catch (error) {
      onError?.(error as Error, 'importFeatures');
    }
  }, [onError]);

  // Export features
  const exportFeatures = useCallback(() => {
    if (!drawRef.current) return [];
    return drawRef.current.getSnapshot();
  }, []);

  // Switch drawing mode
  const switchMode = useCallback((newMode: ModeId) => {
    if (!drawRef.current) return;
    if (limitToolsTo && !limitToolsTo.includes(newMode)) return;

    try {
      if (newMode === 'static') {
        drawRef.current.clear();
        drawRef.current.setMode('static');
      } else if (newMode === 'freeze') {
        drawRef.current.setMode('static');
      } else {
        drawRef.current.setMode(newMode);
      }
      onModeChange?.(newMode);
    } catch (error) {
      onError?.(error as Error, 'switchMode');
    }
  }, [limitToolsTo, onModeChange, onError]);

  // Undo
  const undo = useCallback(() => {
    if (!drawRef.current || historyRef.current.length <= 1) return;
    
    try {
      redoHistoryRef.current.push(historyRef.current.pop()!);
      const snapshotToRestore = historyRef.current[historyRef.current.length - 1];
      isRestoringRef.current = true;
      drawRef.current.clear();
      drawRef.current.addFeatures(snapshotToRestore);
      setTimeout(() => { isRestoringRef.current = false; }, 0);
    } catch (error) {
      onError?.(error as Error, 'undo');
    }
  }, [onError]);

  // Redo
  const redo = useCallback(() => {
    if (!drawRef.current || redoHistoryRef.current.length === 0) return;
    
    try {
      const snapshot = redoHistoryRef.current.pop()!;
      historyRef.current.push(snapshot);
      isRestoringRef.current = true;
      drawRef.current.clear();
      drawRef.current.addFeatures(snapshot);
      setTimeout(() => { isRestoringRef.current = false; }, 0);
    } catch (error) {
      onError?.(error as Error, 'redo');
    }
  }, [onError]);

  // Delete selected feature
  const deleteSelected = useCallback(() => {
    if (!drawRef.current) return;
    
    try {
      if (selectedFeatureIdRef.current) {
        drawRef.current.removeFeatures([selectedFeatureIdRef.current]);
      } else {
        const currentFeatures = drawRef.current.getSnapshot();
        if (currentFeatures.length > 0) {
          const lastFeature = currentFeatures[currentFeatures.length - 1];
          if (lastFeature.id) {
            drawRef.current.removeFeatures([lastFeature.id]);
          }
        }
      }
    } catch (error) {
      onError?.(error as Error, 'deleteSelected');
    }
  }, [onError]);

  // Export GeoJSON
  const exportGeoJSON = useCallback(() => {
    if (!drawRef.current) return;
    
    try {
      const currentFeatures = drawRef.current.getSnapshot();
      const geojson = {
        type: "FeatureCollection",
        features: currentFeatures,
      };
      const data = JSON.stringify(geojson, null, 2);
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "drawing.geojson";
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      onError?.(error as Error, 'exportGeoJSON');
    }
  }, [onError]);

  // Import GeoJSON from file
  const importGeoJSON = useCallback((file: File) => {
    if (!drawRef.current) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const geojson = JSON.parse(e.target?.result as string);
        if (geojson.type === "FeatureCollection") {
          drawRef.current!.addFeatures(geojson.features);
        } else {
          onError?.(new Error("Invalid GeoJSON: must be a FeatureCollection"), 'importGeoJSON');
        }
      } catch (error) {
        onError?.(error as Error, 'importGeoJSON');
      }
    };
    reader.readAsText(file);
  }, [onError]);

  // Toggle resize mode
  const toggleResize = useCallback(() => {
    if (!drawRef.current) return;

    try {
      const newResizingEnabled = !resizingEnabled;

      const flags = {
        polygon: { feature: { draggable: true, coordinates: { resizable: newResizingEnabled ? 'center' : undefined, draggable: !newResizingEnabled } } },
        linestring: { feature: { draggable: true, coordinates: { resizable: newResizingEnabled ? 'center' : undefined, draggable: !newResizingEnabled } } },
        rectangle: { feature: { draggable: true, coordinates: { resizable: newResizingEnabled ? 'center' : undefined, draggable: !newResizingEnabled } } },
        circle: { feature: { draggable: true, coordinates: { resizable: newResizingEnabled ? 'center' : undefined, draggable: !newResizingEnabled } } },
        freehand: { feature: { draggable: true, coordinates: { resizable: newResizingEnabled ? 'center' : undefined, draggable: !newResizingEnabled } } },
      };

      drawRef.current.updateModeOptions('select', { flags });
    } catch (error) {
      onError?.(error as Error, 'toggleResize');
    }
  }, [resizingEnabled, onError]);

  // Center map to position
  const centerTo = useCallback((center: { lat: number; lng: number }, zoom?: number) => {
    if (!mapRef.current) return;
    mapRef.current.setCenter(center);
    if (zoom !== undefined) {
      mapRef.current.setZoom(zoom);
    }
  }, []);

  // Fit map to bounds
  const fitBounds = useCallback((bounds: google.maps.LatLngBounds) => {
    if (!mapRef.current) return;
    mapRef.current.fitBounds(bounds);
  }, []);

  // Expose API to parent
  useEffect(() => {
    if (onReady && mapRef.current && drawRef.current) {
      onReady({
        undo,
        redo,
        deleteSelected,
        exportGeoJSON,
        importGeoJSON,
        switchMode,
        toggleResize,
        centerTo,
        fitBounds,
      });
    }
  }, [onReady, undo, redo, deleteSelected, exportGeoJSON, importGeoJSON, switchMode, toggleResize, centerTo, fitBounds]);

  // Get map bounds as polygon
  const getMapBoundsPolygon = useCallback((map: google.maps.Map): { type: 'Polygon'; coordinates: number[][][] } | null => {
    const bounds = map.getBounds();
    if (!bounds) return null;

    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();

    const coordinates = [[
      [sw.lng(), sw.lat()],
      [ne.lng(), sw.lat()],
      [ne.lng(), ne.lat()],
      [sw.lng(), ne.lat()],
      [sw.lng(), sw.lat()],
    ]];

    return { type: 'Polygon', coordinates };
  }, []);

  // Initialize/update heatmap
  useEffect(() => {
    if (!mapRef.current || !google.maps.visualization) return;

    if (mapMode === 'heatmap' && heatmapData) {
      if (!heatmapLayerRef.current) {
        heatmapLayerRef.current = new google.maps.visualization.HeatmapLayer({
          data: [],
          map: mapRef.current,
          radius: 25,
          opacity: 0.2,
        });
      }

      const heatmapPoints = heatmapData.map(([lng, lat, weight]) => ({
        location: new google.maps.LatLng(lat, lng),
        weight: weight,
      }));

      heatmapLayerRef.current.setData(heatmapPoints);
    } else if (heatmapLayerRef.current) {
      heatmapLayerRef.current.setMap(null);
      heatmapLayerRef.current = null;
    }
  }, [mapMode, heatmapData]);

  // Handle map center/zoom changes
  useEffect(() => {
    if (!mapRef.current) return;
    
    if (mapCenter) {
      mapRef.current.setCenter(mapCenter);
    }
    
    if (mapZoom !== undefined) {
      mapRef.current.setZoom(mapZoom);
    }
  }, [mapCenter, mapZoom]);

  // Text label management
  const createTextOverlay = useCallback((label: TextLabel, TextOverlayClass: any) => {
    if (!mapRef.current) return null;
    
    const overlay = new TextOverlayClass(
      new google.maps.LatLng(label.position.lat, label.position.lng),
      label.text,
      mapRef.current,
      label.id,
      (id: string) => handleTextClick(id)
    );
    
    setTimeout(() => {
      overlay.setInteractive(true);
    }, 0);

    return overlay;
  }, []);

  const handleTextClick = useCallback((id: string) => {
    if (isDeletingTextRef.current) {
      const overlay = textOverlaysRef.current.get(id);
      if (overlay) {
        overlay.setMap(null);
        textOverlaysRef.current.delete(id);
      }
      
      const currentLabels = textLabels || [];
      const updatedLabels = currentLabels.filter(label => label.id !== id);
      onTextLabelsChange?.(updatedLabels);
    }
  }, [textLabels, onTextLabelsChange]);

  const loadTextLabels = useCallback((TextOverlayClass: any) => {
    if (!mapRef.current) return;
    
    textOverlaysRef.current.forEach(overlay => overlay.setMap(null));
    textOverlaysRef.current.clear();
    
    if (suppressTextLabels) return;

    textLabels.forEach(label => {
      const overlay = createTextOverlay(label, TextOverlayClass);
      if (overlay) {
        textOverlaysRef.current.set(label.id, overlay);
        
        setTimeout(() => {
          overlay.setInteractive(mode === 'text');
        }, 100);
      }
    });
  }, [textLabels, suppressTextLabels, mode, createTextOverlay]);

  // Handle text label changes
  useEffect(() => {
    if (!mapRef.current || !TextOverlayClassRef.current) return;
    
    if (suppressTextLabels) {
      textOverlaysRef.current.forEach(overlay => overlay.setMap(null));
      textOverlaysRef.current.clear();
    } else {
      loadTextLabels(TextOverlayClassRef.current);
    }
  }, [textLabels, suppressTextLabels, loadTextLabels]);

  // Update text overlay interactivity based on mode
  useEffect(() => {
    textOverlaysRef.current.forEach((overlay) => {
      overlay.setInteractive(mode === 'text');
    });
    
    if (mode !== 'text') {
      if (isAddingTextRef.current) {
        isAddingTextRef.current = false;
      }
      
      if (isDeletingTextRef.current) {
        isDeletingTextRef.current = false;
      }
      
      if (mapRef.current) {
        mapRef.current.setOptions({ draggableCursor: null });
      }
    }
  }, [mode]);

  // Sync external text add/delete active flags into internal refs and cursor
  useEffect(() => {
    isAddingTextRef.current = !!textAddActive && mode === 'text';
    isDeletingTextRef.current = !!textDeleteActive && mode === 'text';
    if (mapRef.current) {
      mapRef.current.setOptions({ draggableCursor: isAddingTextRef.current ? 'crosshair' : (isDeletingTextRef.current ? 'pointer' : null) });
    }
  }, [textAddActive, textDeleteActive, mode]);

  // Handle mode changes
  useEffect(() => {
    if (!drawRef.current) return;
    
    const safeSetMode = (m: ModeId) => {
      if (limitToolsTo && !limitToolsTo.includes(m)) {
        const fallback = limitToolsTo[0] ?? 'select';
        drawRef.current!.setMode(fallback);
        onModeChange?.(fallback);
      } else {
        drawRef.current!.setMode(m);
        onModeChange?.(m);
      }
    };

    try {
      if (mode === 'view') {
        // Ensure TerraDraw is running for selection/static behaviors
        try { drawRef.current.start(); } catch {}
        safeSetMode('static');
      } else if (mode === 'draw') {
        // Always attempt to start; ignore if already started
        try { drawRef.current.start(); } catch {}
        if (activeDrawMode) {
          safeSetMode(activeDrawMode);
        }
      } else if (mode === 'text') {
        // Keep TerraDraw running and switch to static so drawings remain visible
        try { drawRef.current.start(); } catch {}
        safeSetMode('static');
      }
    } catch (error) {
      onError?.(error as Error, 'modeChange');
    }
  }, [mode, activeDrawMode, limitToolsTo, onModeChange, onError]);

  // Sync features from parent when NOT drawing (safe in 'view' or 'text').
  // Avoid importing during 'draw' to prevent interrupting gestures.
  useEffect(() => {
    if (!drawRef.current) return;
    if (mode === 'view' && features) {
      importFeatures(features);
    }
  }, [features, mode, importFeatures]);

  // Apply resizing mode changes
  useEffect(() => {
    if (!drawRef.current) return;

    try {
      const flags = {
        polygon: { feature: { draggable: true, coordinates: { resizable: resizingEnabled ? 'center' : undefined, draggable: !resizingEnabled } } },
        linestring: { feature: { draggable: true, coordinates: { resizable: resizingEnabled ? 'center' : undefined, draggable: !resizingEnabled } } },
        rectangle: { feature: { draggable: true, coordinates: { resizable: resizingEnabled ? 'center' : undefined, draggable: !resizingEnabled } } },
        circle: { feature: { draggable: true, coordinates: { resizable: resizingEnabled ? 'center' : undefined, draggable: !resizingEnabled } } },
        freehand: { feature: { draggable: true, coordinates: { resizable: resizingEnabled ? 'center' : undefined, draggable: !resizingEnabled } } },
      };

      drawRef.current.updateModeOptions('select', { flags });
    } catch (error) {
      onError?.(error as Error, 'applyResizing');
    }
  }, [resizingEnabled, onError]);

  // Initialize map
  useEffect(() => {
    let cancelled = false;
    let projectionListener: google.maps.MapsEventListener | null = null;

    const init = async () => {
      if (typeof window === 'undefined') return;
      if (!mapDivRef.current) return;
      if (mapRef.current || drawRef.current) return;

      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        onError?.(new Error('Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY'), 'initialization');
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
          center: mapCenter || { lat: -37.8136, lng: 144.9631 },
          zoom: mapZoom || 12,
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

        const TextOverlay = createTextOverlayClass(google.maps);
        TextOverlayClassRef.current = TextOverlay;

        loadTextLabels(TextOverlay);

        // Map click for text labels
        mapClickListenerRef.current = map.addListener("click", (e: google.maps.MapMouseEvent) => {
          // Rely solely on refs to avoid stale closures
          if (isAddingTextRef.current && e.latLng) {
            const text = prompt("Enter text label content:");
            if (text && text.trim()) {
              const newLabel: TextLabel = {
                id: crypto.randomUUID(),
                position: { lat: e.latLng.lat(), lng: e.latLng.lng() },
                text: text.trim()
              };
              
              const overlay = createTextOverlay(newLabel, TextOverlayClassRef.current);
              if (overlay) {
                textOverlaysRef.current.set(newLabel.id, overlay);
                
                setTimeout(() => {
                  overlay.setInteractive(true);
                }, 100);
              }
              
              const currentLabels = textLabels || [];
              onTextLabelsChange?.([...currentLabels, newLabel]);
            }
            
            isAddingTextRef.current = false;
            map.setOptions({ draggableCursor: null });
          }
        });

        // Prevent default dblclick behavior to avoid interfering with TerraDraw gestures
        map.addListener("dblclick", (e: google.maps.MapMouseEvent) => {
          if (e.domEvent) {
            e.domEvent.preventDefault?.();
            e.domEvent.stopPropagation?.();
          }
        });

        // Heatmap boundary change listener: triggers after user is idle for 1 second
        idleListenerRef.current = map.addListener("idle", () => {
          if (heatmapFetchTimeoutRef.current) {
            clearTimeout(heatmapFetchTimeoutRef.current);
          }
          heatmapFetchTimeoutRef.current = window.setTimeout(() => {
            if (mapMode === 'heatmap' && onHeatmapBoundsChange) {
              const area = getMapBoundsPolygon(map);
              if (area) {
                onHeatmapBoundsChange(area);
              }
            }
          }, 1000);
        });

        // Cancel pending heatmap data fetch during user interaction
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
                  polygon: { feature: { draggable: true, rotateable: true, coordinates: { midpoints: true, draggable: true, deletable: true } } },
                  linestring: { feature: { draggable: true, rotateable: true, coordinates: { midpoints: true, draggable: true, deletable: true } } },
                  point: { feature: { draggable: true, rotateable: true } },
                  rectangle: { feature: { draggable: true, rotateable: true, coordinates: { midpoints: true, draggable: true, deletable: true } } },
                  circle: { feature: { draggable: true, rotateable: true, coordinates: { midpoints: true, draggable: true, deletable: true } } },
                  freehand: { feature: { draggable: true, rotateable: true, coordinates: { midpoints: true, draggable: true, deletable: true } } },
                },
              }),
              new TerraDrawPointMode({ editable: true, styles: { pointColor: getRandomColor() } }),
              new TerraDrawLineStringMode({ editable: true, styles: { lineStringColor: getRandomColor() } }),
              new TerraDrawPolygonMode({ editable: true, styles: (() => { const color = getRandomColor(); return { fillColor: color, outlineColor: color }; })() }),
              new TerraDrawRectangleMode({ styles: (() => { const color = getRandomColor(); return { fillColor: color, outlineColor: color }; })() }),
              new TerraDrawCircleMode({ styles: (() => { const color = getRandomColor(); return { fillColor: color, outlineColor: color }; })() }),
              new TerraDrawFreehandMode({ styles: (() => { const color = getRandomColor(); return { fillColor: color, outlineColor: color }; })() }),
            ],
          });

          drawRef.current = draw;
          draw.start();
          
          if (limitToolsTo && limitToolsTo.length > 0) {
            try {
              draw.setMode(limitToolsTo[0]);
              onModeChange?.(limitToolsTo[0]);
            } catch {}
          }

          draw.on('ready', () => {
            const initialMode: ModeId = (limitToolsTo && limitToolsTo.length > 0) ? limitToolsTo[0] : 'select';
            try {
              draw.setMode(initialMode);
              onModeChange?.(initialMode);
            } catch {}

            importFeatures(features);

            draw.on("select", (id) => {
              if (selectedFeatureIdRef.current && selectedFeatureIdRef.current !== id) {
                draw.deselectFeature(selectedFeatureIdRef.current);
              }
              selectedFeatureIdRef.current = id as string;
              onSelectionChange?.(id as string);
            });

            draw.on("deselect", () => {
              selectedFeatureIdRef.current = null;
              onSelectionChange?.(null);
            });

            historyRef.current.push(processSnapshotForUndo(draw.getSnapshot()));

            draw.on("change", (ids, type) => {
              if (isRestoringRef.current) return;

              const snapshot = draw.getSnapshot();
              const processedSnapshot = processSnapshotForUndo(snapshot);
              const filteredSnapshot = processedSnapshot.filter(
                (f) => !f.properties.midPoint && !f.properties.selectionPoint
              );

              const json = JSON.stringify(filteredSnapshot);
              if (json !== lastFeaturesJSONRef.current) {
                lastFeaturesJSONRef.current = json;
                onFeaturesChange?.(filteredSnapshot);
              }

              if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
              }

              debounceTimeoutRef.current = window.setTimeout(() => {
                // Limit history to MAX_HISTORY
                if (historyRef.current.length >= MAX_HISTORY) {
                  historyRef.current.shift();
                }
                historyRef.current.push(filteredSnapshot);
                redoHistoryRef.current = [];
              }, 200);
            });
          });
        });

      } catch (e) {
        onError?.(e as Error, 'initialization');
      }
    };

    init();

    return () => {
      cancelled = true;

      if (drawRef.current) {
        try {
          drawRef.current.stop();
        } catch {}
        drawRef.current = null;
      }

      textOverlaysRef.current.forEach(overlay => overlay.setMap(null));
      textOverlaysRef.current.clear();

      if (projectionListener) {
        projectionListener.remove();
      }

      if (mapClickListenerRef.current) {
        mapClickListenerRef.current.remove();
      }

      if (idleListenerRef.current) {
        idleListenerRef.current.remove();
      }

      if (heatmapLayerRef.current) {
        heatmapLayerRef.current.setMap(null);
      }

      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      if (heatmapFetchTimeoutRef.current) {
        clearTimeout(heatmapFetchTimeoutRef.current);
      }

      mapRef.current = null;
    };
  }, []); // Empty deps - only run once

  return (
    <div
      ref={mapDivRef}
      style={{
        height: '100%',
        width: '100%',
        position: 'relative'
      }}
    />
  );
}

