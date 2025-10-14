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

interface TerraDrawAdvancedPageProps {
  editable: boolean,
};

export default function TerraDrawAdvancedPage( { editable = true }: TerraDrawAdvancedPageProps ) {
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const drawRef = useRef<TerraDraw | null>(null);
  const historyRef = useRef<any[]>([]);
  const redoHistoryRef = useRef<any[]>([]);
  const selectedFeatureIdRef = useRef<string | null>(null);
  const isRestoringRef = useRef<boolean>(false);
  const debounceTimeoutRef = useRef<number | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  const [activeMode, setActiveMode] = useState<ModeId>('point');
  const [resizingEnabled, setResizingEnabled] = useState<boolean>(false);

  // Mode switching function
  const switchMode = (mode: ModeId) => {
    if (!drawRef.current) return;
    
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

  function autoSwitchMode() {
    if (!editable) {
      switchMode('freeze');
    }
  };

  useEffect(() => {
    autoSwitchMode();
  }, [editable]);

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
          libraries: ["maps", "drawing", "marker"]
        });

        await loader.load();
        
        const { Map } = await google.maps.importLibrary("maps") as google.maps.MapsLibrary;

        if (cancelled || !mapDivRef.current) return;

        const mapOptions: google.maps.MapOptions = {
          center: { lat: -25.2744, lng: 133.7751 },
          zoom: 12,
          mapId: 'c306b3c6dd3ed8d9',
          mapTypeId: 'roadmap',
          zoomControl: false,
          tilt: 0,
          mapTypeControl: true,
          clickableIcons: false,
          streetViewControl: false,
          fullscreenControl: false,
        };

        const map = new Map(mapDivRef.current, mapOptions);
        mapRef.current = map;

        const TextOverlay = createTextOverlayClass(google.maps);

        new TextOverlay(
          new google.maps.LatLng(48.862, 2.342),
          "Paris this is a complete text overlay",
          map
        );


        map.addListener("click", () => {
          if (drawRef.current) {
            console.log("Current draw mode on map click:", drawRef.current.getMode());
          }
        });

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


          draw.on('ready', () => {
            console.log("TerraDraw is ready!");
            draw.setMode('select');
            setActiveMode('select');

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
              if (isRestoringRef.current) {
                return;
              }

              if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
              }

              debounceTimeoutRef.current = window.setTimeout(() => {
                const snapshot = draw.getSnapshot();
                const processedSnapshot = processSnapshotForUndo(snapshot);
                const filteredSnapshot = processedSnapshot.filter(
                  (f) => !f.properties.midPoint && !f.properties.selectionPoint
                );
                historyRef.current.push(filteredSnapshot);
                redoHistoryRef.current = [];
              }, 200);
            });

            // Keyboard event listener
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
            
            // Return cleanup function
            return () => {
              document.removeEventListener('keydown', handleKeyDown);
            };
          });
        });

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

      // Cleanup event listener
      if (projectionListener) {
        projectionListener.remove();
        projectionListener = null;
      }

      // Cleanup timer
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
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
    <div style={{ height: '100vh', width: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}

      { editable ? (
        <>
          <div
            style={{
              display: 'flex',
              gap: 8,
              padding: 12,
              borderBottom: '1px solid #eee',
              alignItems: 'center',
              flexWrap: 'wrap',
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
            ] as { id: ModeId; label: string; icon: string }[]).map((mode) => (
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

      {/* Map container */}
      <div 
        ref={mapDivRef} 
        style={{ 
          flex: 1, 
          minHeight: 0,
          position: 'relative'
        }} 
      />
      
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