"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader } from "@googlemaps/js-api-loader";

export default function EmergencyDetails() {
  const router = useRouter();
  const mapRef = useRef<HTMLDivElement>(null);
  const locationInputRef = useRef<HTMLInputElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  // Form state
  const [location, setLocation] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [latitude, setLatitude] = useState<number | null>(-37.8136);
  const [longitude, setLongitude] = useState<number | null>(144.9631);
  const [urgency, setUrgency] = useState("high");
  const [isUpdatingFromCoords, setIsUpdatingFromCoords] = useState(false);

  // Initialize map and autocomplete
  useEffect(() => {
    const initMapAndAutocomplete = async () => {
      const loader = new Loader({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        version: "weekly",
        libraries: ["maps", "marker", "places", "geocoding"],
      });

      try {
        const { Map } = await loader.importLibrary("maps");
        const { AdvancedMarkerElement } = await loader.importLibrary("marker");
        const { Autocomplete } = await loader.importLibrary("places");

        // Initialize Map
        if (mapRef.current && latitude !== null && longitude !== null) {
          const map = new Map(mapRef.current, {
            center: { lat: latitude, lng: longitude },
            zoom: 14,
            mapId: "EMERGENCY_MAP_ID",
          });
          mapInstanceRef.current = map;

          const marker = new AdvancedMarkerElement({
            map: map,
            position: { lat: latitude, lng: longitude },
          });
          markerRef.current = marker;
        }

        // Initialize Autocomplete
        if (locationInputRef.current) {
          const autocomplete = new Autocomplete(locationInputRef.current, {
            fields: ["formatted_address", "geometry", "name"],
            types: ["geocode", "establishment"],
          });
          autocompleteRef.current = autocomplete;

          // Listen for place selection
          autocomplete.addListener("place_changed", () => {
            const place = autocomplete.getPlace();
            
            if (!place.geometry || !place.geometry.location) {
              console.log("No geometry found for this place");
              return;
            }

            // Update location and coordinates from selected place
            const selectedAddress = place.formatted_address || place.name || "";
            setLocation(selectedAddress);
            
            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();
            setLatitude(lat);
            setLongitude(lng);
          });
        }

        // Get initial address for default coordinates
        reverseGeocode(-37.8136, 144.9631);
      } catch (error) {
        console.error("Error loading Google Maps:", error);
      }
    };

    initMapAndAutocomplete();
  }, []);

  // Reverse geocode function
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      
      if (data.results && data.results[0]) {
        setLocation(data.results[0].formatted_address);
      } else {
        setLocation("None");
      }
    } catch (error) {
      console.error("Error reverse geocoding:", error);
      setLocation("None");
    }
  };

  // Update map when coordinates change
  useEffect(() => {
    if (
      mapInstanceRef.current &&
      markerRef.current &&
      latitude !== null &&
      longitude !== null
    ) {
      const newPosition = { lat: latitude, lng: longitude };
      mapInstanceRef.current.setCenter(newPosition);
      markerRef.current.position = newPosition;
    }
  }, [latitude, longitude]);

  // Handle latitude change - trigger reverse geocode
  const handleLatitudeChange = (value: string) => {
    const lat = parseFloat(value);
    if (!isNaN(lat)) {
      setLatitude(lat);
      setIsUpdatingFromCoords(true);
      
      // Debounce reverse geocode
      setTimeout(() => {
        if (longitude !== null) {
          reverseGeocode(lat, longitude);
        }
        setIsUpdatingFromCoords(false);
      }, 500);
    }
  };

  // Handle longitude change - trigger reverse geocode
  const handleLongitudeChange = (value: string) => {
    const lng = parseFloat(value);
    if (!isNaN(lng)) {
      setLongitude(lng);
      setIsUpdatingFromCoords(true);
      
      // Debounce reverse geocode
      setTimeout(() => {
        if (latitude !== null) {
          reverseGeocode(latitude, lng);
        }
        setIsUpdatingFromCoords(false);
      }, 500);
    }
  };

  // Get current location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setLatitude(lat);
        setLongitude(lng);

        // Reverse geocode to get address
        await reverseGeocode(lat, lng);
      },
      (error) => {
        console.error("Error getting location:", error);
        alert("Unable to retrieve your location");
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  // Submit form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!location.trim() || location === "None") {
      alert("Location is required");
      return;
    }
    
    sessionStorage.setItem(
      "emergencyData",
      JSON.stringify({
        location,
        title,
        description,
        latitude,
        longitude,
        urgency,
        timestamp: new Date().toISOString(),
      })
    );
    router.push("/confirmation");
  };

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "#0b1828", color: "#f8fafc" }}
    >
      {/* Header */}
      <div
        className="w-full text-center py-4 text-2xl font-bold text-white px-6"
        style={{ backgroundColor: "#E53935" }}
      >
        Emergency Details
      </div>

      {/* Map Container */}
      <div ref={mapRef} className="w-full h-[300px] bg-gray-800" />

      {/* Form */}
      <form onSubmit={handleSubmit} className="px-6 pt-12 pb-10 flex flex-col gap-12">
        {/* Location Field with Autocomplete */}
        <div>
          <label className="block mb-2 text-sm font-medium">
            Location: <span className="text-red-500">(required)</span>
          </label>
          <div className="flex gap-2">
            <input
              ref={locationInputRef}
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Search for a location..."
              className="flex-1 px-3 py-5 rounded-md transition-all"
              style={{
                backgroundColor: "#0f2238",
                color: "#FF0000",
                border: "1.5px solid rgba(255,255,255,0.35)",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#E53935";
                e.target.style.boxShadow = "0 0 0 3px rgba(225, 29, 72, 0.35)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "rgba(255,255,255,0.35)";
                e.target.style.boxShadow = "none";
              }}
            />
            <button
              type="button"
              onClick={getCurrentLocation}
              className="px-4 py-2 rounded transition-colors flex items-center gap-1 text-white font-semibold"
              style={{ backgroundColor: "#EF4444" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#DC2626";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#EF4444";
              }}
            >
              📍 Auto
            </button>
          </div>
          <p className="mt-2 text-xs" style={{ color: "#94a3b8" }}>
            Start typing to search for locations, or click Auto to use your current position
          </p>
        </div>

        {/* Latitude and Longitude */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block mb-2 text-sm font-medium">Latitude:</label>
            <input
              type="number"
              step="any"
              value={latitude || ""}
              onChange={(e) => handleLatitudeChange(e.target.value)}
              className="w-full px-3 py-5 rounded-md transition-all"
              style={{
                backgroundColor: "#0f2238",
                color: "#FF0000",
                border: "1.5px solid rgba(255,255,255,0.35)",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#E53935";
                e.target.style.boxShadow = "0 0 0 3px rgba(225, 29, 72, 0.35)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "rgba(255,255,255,0.35)";
                e.target.style.boxShadow = "none";
              }}
            />
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium">Longitude:</label>
            <input
              type="number"
              step="any"
              value={longitude || ""}
              onChange={(e) => handleLongitudeChange(e.target.value)}
              className="w-full px-3 py-5 rounded-md transition-all"
              style={{
                backgroundColor: "#0f2238",
                color: "#FF0000",
                border: "1.5px solid rgba(255,255,255,0.35)",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#E53935";
                e.target.style.boxShadow = "0 0 0 3px rgba(225, 29, 72, 0.35)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "rgba(255,255,255,0.35)";
                e.target.style.boxShadow = "none";
              }}
            />
          </div>
        </div>
        <p className="text-xs -mt-8" style={{ color: "#94a3b8" }}>
          {isUpdatingFromCoords ? "🔄 Updating address..." : "💡 Coordinates auto-update when you select a location"}
        </p>

        {/* Urgency */}
        <div>
          <label className="block mb-2 text-sm font-medium">Urgency:</label>
          <select
            value={urgency}
            onChange={(e) => setUrgency(e.target.value)}
            className="w-full px-3 py-5 rounded-md transition-all"
            style={{
              backgroundColor: "#0f2238",
              color: "#FF0000",
              border: "1.5px solid rgba(255,255,255,0.35)",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "#E53935";
              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(225, 29, 72, 0.35)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.35)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Title */}
        <div>
          <label className="block mb-2 text-sm font-medium">Title:</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Need for Water"
            className="w-full px-3 py-5 rounded-md transition-all"
            style={{
              backgroundColor: "#0f2238",
              color: "#FF0000",
              border: "1.5px solid rgba(255,255,255,0.35)",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "#E53935";
              e.target.style.boxShadow = "0 0 0 3px rgba(225, 29, 72, 0.35)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "rgba(255,255,255,0.35)";
              e.target.style.boxShadow = "none";
            }}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block mb-2 text-sm font-medium">Description:</label>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Provide a brief description of the situation"
            className="w-full px-3 py-5 rounded-md transition-all resize-y"
            style={{
              backgroundColor: "#0f2238",
              color: "#FF0000",
              border: "1.5px solid rgba(255,255,255,0.35)",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "#E53935";
              e.target.style.boxShadow = "0 0 0 3px rgba(225, 29, 72, 0.35)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "rgba(255,255,255,0.35)";
              e.target.style.boxShadow = "none";
            }}
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-center mt-4">
          <button
            type="submit"
            className="w-3/4 px-6 py-3 rounded-md text-lg font-semibold text-white transition-all active:translate-y-px"
            style={{
              backgroundColor: "#E53935",
              border: "3px solid white",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#f43f5e";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#E53935";
            }}
          >
            Send Alert
          </button>
        </div>
      </form>
    </div>
  );
}
