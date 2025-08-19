import {
  cellToBoundary,
  cellToLatLng,
  gridDisk,
  gridDistance,
  isValidCell,
  latLngToCell,
} from "h3-js";

// Helper type for coordinate points
export type GeoPoint = {
  lat: number;
  lng: number;
};

export const HEX_CONFIG = {
  PRIMARY_RESOLUTION: 8, // ~25m hexagons for main exploration
  OVERVIEW_RESOLUTION: 7, // ~150m hexagons for zoomed out views
  REGIONAL_RESOLUTION: 6, // ~1km hexagons for state/country views

  // Hex stats for distance calculations
  RES8_DIAMETER_METERS: 25.5,
  RES8_AREA_SQ_METERS: 737,
} as const;

// Exploration methods based on speed
export const EXPLORATION_METHODS = {
  WALKING: "walking", // 0-3 mph
  BIKING: "biking", // 3-15 mph
  DRIVING: "driving", // 15+ mph
} as const;

// NYC bounding box for initial deployment
export const NYC_BOUNDS = {
  minLat: 40.4774, // Southern tip of Staten Island
  maxLat: 40.9176, // Northern Bronx
  minLng: -74.2591, // Western Staten Island
  maxLng: -73.7004, // Eastern Queens
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Speed-based exploration classification
export function getExplorationMethod(speedMph: number): string {
  if (speedMph <= 3) return EXPLORATION_METHODS.WALKING;
  if (speedMph <= 15) return EXPLORATION_METHODS.BIKING;
  return EXPLORATION_METHODS.DRIVING;
}

// Calculate distance traveled based on hex visits
export function calculateHexDistance(hexVisits: number): number {
  // Distance = visits * average hex diameter
  return hexVisits * HEX_CONFIG.RES8_DIAMETER_METERS;
}

// Calculate area explored based on unique hex count
export function calculateHexArea(uniqueHexCount: number): number {
  // Total area = unique hexes * average hex area
  return uniqueHexCount * HEX_CONFIG.RES8_AREA_SQ_METERS;
}

// ============================================================================
// H3 FUNCTIONS (FIXED IMPLEMENTATION)
// ============================================================================

export const H3_HELPERS = {
  // Convert coordinates to hex ID
  coordsToHex: (
    lat: number,
    lng: number,
    resolution: number = HEX_CONFIG.PRIMARY_RESOLUTION
  ): string => {
    // Validate coordinates
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new Error(`Invalid coordinates: lat=${lat}, lng=${lng}`);
    }

    try {
      return latLngToCell(lat, lng, resolution);
    } catch (error) {
      console.error(
        "❌ Error converting coords to hex:",
        { lat, lng, resolution },
        error
      );
      throw new Error(`Invalid coordinates: lat=${lat}, lng=${lng}`);
    }
  },

  // Get hex boundary coordinates (returns array of [lng, lat] pairs for GeoJSON)
  hexToBoundary: (hexId: string): number[][] => {
    if (!H3_HELPERS.isValidHex(hexId)) {
      return [];
    }

    try {
      // cellToBoundary returns [lat, lng] pairs, we need [lng, lat] for GeoJSON
      const boundary = cellToBoundary(hexId, true); // true = counterclockwise
      return boundary.map((coord) => [coord[1], coord[0]]); // Swap to [lng, lat] for GeoJSON
    } catch (error) {
      console.error("❌ Error getting hex boundary:", hexId, error);
      return [];
    }
  },

  // Get hex center coordinates
  hexToCenter: (hexId: string): { lat: number; lng: number } => {
    if (!H3_HELPERS.isValidHex(hexId)) {
      return { lat: 0, lng: 0 };
    }

    try {
      const [lat, lng] = cellToLatLng(hexId);
      return { lat, lng };
    } catch (error) {
      console.error("❌ Error getting hex center:", hexId, error);
      return { lat: 0, lng: 0 };
    }
  },

  // Get neighboring hexes at specified ring distance (just the ring, not including center)
  getHexRing: (hexId: string, ringSize: number): string[] => {
    if (!H3_HELPERS.isValidHex(hexId)) {
      return [];
    }

    try {
      if (ringSize === 0) return [hexId];

      // Get all hexes within ringSize distance
      const allWithinRing = gridDisk(hexId, ringSize);

      if (ringSize === 1) {
        // For ring 1, exclude just the center
        return allWithinRing.filter((hex) => hex !== hexId);
      } else {
        // For ring > 1, exclude all hexes within ringSize - 1
        const innerHexes = new Set(gridDisk(hexId, ringSize - 1));
        return allWithinRing.filter((hex) => !innerHexes.has(hex));
      }
    } catch (error) {
      console.error("❌ Error getting hex ring:", { hexId, ringSize }, error);
      return [];
    }
  },

  // Get all hexes within specified distance (includes center) - simple gridDisk
  getHexesWithinDistance: (hexId: string, distance: number): string[] => {
    if (!H3_HELPERS.isValidHex(hexId)) {
      return [];
    }

    try {
      return gridDisk(hexId, distance);
    } catch (error) {
      console.error(
        "❌ Error getting hexes within distance:",
        { hexId, distance },
        error
      );
      return [];
    }
  },

  // Calculate distance between two hexes
  hexDistance: (hex1: string, hex2: string): number => {
    if (!H3_HELPERS.isValidHex(hex1) || !H3_HELPERS.isValidHex(hex2)) {
      return 0;
    }

    try {
      return gridDistance(hex1, hex2);
    } catch (error) {
      console.error(
        "❌ Error calculating hex distance:",
        { hex1, hex2 },
        error
      );
      return 0;
    }
  },

  // Validate if a string is a valid H3 hex ID
  isValidHex: (hexId: string): boolean => {
    if (!hexId || typeof hexId !== "string") {
      return false;
    }

    try {
      // Use h3-js built-in validation if available
      if (typeof isValidCell === "function") {
        return isValidCell(hexId);
      }

      // Fallback: try to get the center coordinates - if this succeeds, it's valid
      cellToLatLng(hexId);
      return true;
    } catch {
      return false;
    }
  },

  // Get all H3 hexes that intersect with a bounding box
  getBoundingBoxHexes: (
    minLat: number,
    maxLat: number,
    minLng: number,
    maxLng: number,
    resolution: number = HEX_CONFIG.PRIMARY_RESOLUTION
  ): string[] => {
    // Validate bounding box coordinates
    if (
      minLat < -90 ||
      maxLat > 90 ||
      minLng < -180 ||
      maxLng > 180 ||
      minLat >= maxLat ||
      minLng >= maxLng
    ) {
      return [];
    }

    try {
      const hexes = new Set<string>();
      const latStep = (maxLat - minLat) / 20; // Sample 20x20 grid
      const lngStep = (maxLng - minLng) / 20;

      for (let lat = minLat; lat <= maxLat; lat += latStep) {
        for (let lng = minLng; lng <= maxLng; lng += lngStep) {
          try {
            const hex = latLngToCell(lat, lng, resolution);
            hexes.add(hex);
          } catch {
            // Skip invalid coordinates
          }
        }
      }

      return Array.from(hexes);
    } catch (error) {
      console.error(
        "❌ Error getting bounding box hexes:",
        { minLat, maxLat, minLng, maxLng },
        error
      );
      return [];
    }
  },
};

// ============================================================================
// UTILITY FUNCTIONS FOR TESTING
// ============================================================================

// Test if coordinates are within NYC bounds
export function isWithinNYC(lat: number, lng: number): boolean {
  return (
    lat >= NYC_BOUNDS.minLat &&
    lat <= NYC_BOUNDS.maxLat &&
    lng >= NYC_BOUNDS.minLng &&
    lng <= NYC_BOUNDS.maxLng
  );
}

// Get some sample NYC locations for testing
export const NYC_TEST_LOCATIONS = {
  timesSquare: { lat: 40.7589, lng: -73.9851 },
  centralPark: { lat: 40.7812, lng: -73.9665 },
  brooklynBridge: { lat: 40.7061, lng: -73.9969 },
  statueOfLiberty: { lat: 40.6892, lng: -74.0445 },
  yankeeStadium: { lat: 40.8296, lng: -73.9262 },
} as const;
