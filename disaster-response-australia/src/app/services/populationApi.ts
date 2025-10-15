"use client";
// Population Data API Service - Simplified

// Type definitions
export interface AreaPolygon {
  type: 'Polygon';
  coordinates: number[][][]; // GeoJSON Polygon format: [[[lng, lat], ...]]
}

export interface PopulationDataRequest {
  area: AreaPolygon;
  time_from: string; // ISO 8601 format
  time_to: string;   // ISO 8601 format
}

// Response format: [longitude, latitude, population_count]
export type PopulationDataPoint = [number, number, number];
export type PopulationDataResponse = PopulationDataPoint[];

/**
 * Check if user is logged in by checking cookie
 * @returns true if user is logged in
 */
function isUserLoggedIn(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.includes("drau_id_token");
}

/**
 * Get token from cookie
 * @returns token string or null
 */
function getTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null;

  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'drau_id_token') {
      return value;
    }
  }
  return null;
}

/**
 * Fetches population data - simplified version
 * Currently uses mock data, but includes commented code for real API calls
 *
 * @param request - The request parameters including area and time range
 * @returns Array of population data points [longitude, latitude, count]
 */
export async function fetchPopulationData(
  request: PopulationDataRequest
): Promise<PopulationDataResponse> {
  try {
    // Check if user is logged in via cookie
    const isLoggedIn = isUserLoggedIn();

    if (!isLoggedIn) {
      console.warn('User not authenticated, using mock data');
      return generateMockPopulationData(request.area);
    }

    // Get token for API authentication
    const token = getTokenFromCookie();

    // TODO: Uncomment below to use real API
    // ============================================
    const backendUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/population_data`;
    
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Backend error (${response.status}):`, errorText);
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const data: PopulationDataResponse = await response.json();
    console.log(`Received ${data.length} population data points from API`);
    return data;
    // ============================================

    // // Currently using mock data
    // console.log('User authenticated, generating mock data');
    // return generateMockPopulationData(request.area);

  } catch (error) {
    console.error('Error fetching population data:', error);
    // Fallback to mock data on error
    // return generateMockPopulationData(request.area);
    throw error;
    return [];
  }
}

/**
 * Generates mock population data within the specified area
 * This is for development/testing purposes only
 *
 * @param area - The polygon area to generate data for
 * @returns Mock population data points
 */
function generateMockPopulationData(area: AreaPolygon): PopulationDataResponse {
  const coordinates = area.coordinates[0]; // Get the outer ring of the polygon

  // Calculate the bounding box from the polygon
  const lngs = coordinates.map(coord => coord[0]);
  const lats = coordinates.map(coord => coord[1]);

  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);

  // Generate 80-120 random points within the bounding box
  const numPoints = Math.floor(Math.random() * 40) + 80;
  const mockData: PopulationDataResponse = [];

  for (let i = 0; i < numPoints; i++) {
    const lng = minLng + Math.random() * (maxLng - minLng);
    const lat = minLat + Math.random() * (maxLat - minLat);

    // Generate realistic population density values
    // Create some clustering by using different ranges
    let weight: number;
    const rand = Math.random();

    if (rand < 0.6) {
      // 60% low density (10-80)
      weight = Math.floor(Math.random() * 70) + 10;
    } else if (rand < 0.85) {
      // 25% medium density (80-200)
      weight = Math.floor(Math.random() * 120) + 80;
    } else {
      // 15% high density (200-500)
      weight = Math.floor(Math.random() * 300) + 200;
    }

    mockData.push([lng, lat, weight]);
  }

  // Add a few hotspot clusters for more realistic visualization
  const numHotspots = Math.floor(Math.random() * 3) + 2; // 2-4 hotspots

  for (let i = 0; i < numHotspots; i++) {
    const centerLng = minLng + Math.random() * (maxLng - minLng);
    const centerLat = minLat + Math.random() * (maxLat - minLat);
    const clusterSize = Math.floor(Math.random() * 10) + 5; // 5-15 points per cluster

    for (let j = 0; j < clusterSize; j++) {
      // Create tight clusters
      const offsetLng = (Math.random() - 0.5) * 0.05;
      const offsetLat = (Math.random() - 0.5) * 0.05;
      const weight = Math.floor(Math.random() * 200) + 300; // High density: 300-500

      mockData.push([
        centerLng + offsetLng,
        centerLat + offsetLat,
        weight
      ]);
    }
  }

  console.log(`Generated ${mockData.length} mock population data points`);
  return mockData;
}
