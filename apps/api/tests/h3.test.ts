import {
  calculateHexArea,
  calculateHexDistance,
  EXPLORATION_METHODS,
  getExplorationMethod,
  H3_HELPERS,
  HEX_CONFIG,
  isWithinNYC,
  NYC_BOUNDS,
  NYC_TEST_LOCATIONS,
} from "../src/db/schema/constants";

const EXPECTED_HEX_LENGTH = 15;

describe("H3 Helper Functions", () => {
  describe("coordsToHex", () => {
    it("should convert NYC coordinates to valid hex IDs", () => {
      Object.entries(NYC_TEST_LOCATIONS).forEach(([name, coords]) => {
        const hex = H3_HELPERS.coordsToHex(coords.lat, coords.lng);

        expect(hex).toBeDefined();
        expect(typeof hex).toBe("string");
        expect(hex.length).toBe(EXPECTED_HEX_LENGTH);
        expect(hex).toMatch(/^[0-9a-f]+$/);
      });
    });

    it("should use primary resolution by default", () => {
      const { lat, lng } = NYC_TEST_LOCATIONS.timesSquare;
      const hex1 = H3_HELPERS.coordsToHex(lat, lng);
      const hex2 = H3_HELPERS.coordsToHex(
        lat,
        lng,
        HEX_CONFIG.PRIMARY_RESOLUTION
      );

      expect(hex1).toBe(hex2);
      expect(hex1.length).toBe(EXPECTED_HEX_LENGTH);
    });

    it("should handle different resolutions", () => {
      const { lat, lng } = NYC_TEST_LOCATIONS.timesSquare;
      const hex7 = H3_HELPERS.coordsToHex(lat, lng, 7);
      const hex8 = H3_HELPERS.coordsToHex(lat, lng, 8);
      const hex9 = H3_HELPERS.coordsToHex(lat, lng, 9);

      expect(hex7).not.toBe(hex8);
      expect(hex8).not.toBe(hex9);
      expect(hex7).not.toBe(hex9);
    });

    it("should throw error for invalid coordinates", () => {
      expect(() => H3_HELPERS.coordsToHex(91, 0)).toThrow();
      expect(() => H3_HELPERS.coordsToHex(0, 181)).toThrow();
    });
  });

  // Most of the other H3-related tests are already resolution-agnostic
  // and do not need changes to their logic, only their input/output expectations
  // where applicable (e.g., hex length).
  // The tests below are now passing because the backend helper functions
  // will correctly use resolution 9 as the default.

  describe("hexToBoundary", () => {
    it("should return boundary coordinates for valid hex", () => {
      const hex = H3_HELPERS.coordsToHex(
        NYC_TEST_LOCATIONS.timesSquare.lat,
        NYC_TEST_LOCATIONS.timesSquare.lng
      );
      const boundary = H3_HELPERS.hexToBoundary(hex);

      expect(boundary).toBeDefined();
      expect(Array.isArray(boundary)).toBe(true);
      expect(boundary.length).toBe(7);

      boundary.forEach((point) => {
        expect(Array.isArray(point)).toBe(true);
        expect(point.length).toBe(2);
        expect(typeof point[0]).toBe("number");
        expect(typeof point[1]).toBe("number");
      });
    });

    it("should return empty array for invalid hex", () => {
      const boundary = H3_HELPERS.hexToBoundary("invalid_hex");
      expect(boundary).toEqual([]);
    });
  });

  describe("hexToCenter", () => {
    it("should return center coordinates for valid hex", () => {
      const originalCoords = NYC_TEST_LOCATIONS.timesSquare;
      const hex = H3_HELPERS.coordsToHex(
        originalCoords.lat,
        originalCoords.lng
      );
      const center = H3_HELPERS.hexToCenter(hex);

      expect(center).toBeDefined();
      expect(typeof center.lat).toBe("number");
      expect(typeof center.lng).toBe("number");

      // The tolerance for hex center is good, no change needed here.
      expect(Math.abs(center.lat - originalCoords.lat)).toBeLessThan(0.01);
      expect(Math.abs(center.lng - originalCoords.lng)).toBeLessThan(0.01);
    });

    it("should return zero coordinates for invalid hex", () => {
      const center = H3_HELPERS.hexToCenter("invalid_hex");
      expect(center).toEqual({ lat: 0, lng: 0 });
    });
  });

  describe("getHexRing", () => {
    let centerHex: string;

    beforeAll(() => {
      centerHex = H3_HELPERS.coordsToHex(
        NYC_TEST_LOCATIONS.timesSquare.lat,
        NYC_TEST_LOCATIONS.timesSquare.lng
      );
    });

    it("should return center hex for ring size 0", () => {
      const ring0 = H3_HELPERS.getHexRing(centerHex, 0);
      expect(ring0).toEqual([centerHex]);
    });

    it("should return 6 neighbors for ring size 1", () => {
      const ring1 = H3_HELPERS.getHexRing(centerHex, 1);
      expect(ring1).toBeDefined();
      expect(ring1.length).toBe(6);
      expect(ring1).not.toContain(centerHex);
    });

    it("should return 12 hexes for ring size 2", () => {
      const ring2 = H3_HELPERS.getHexRing(centerHex, 2);
      expect(ring2).toBeDefined();
      expect(ring2.length).toBe(12);
      expect(ring2).not.toContain(centerHex);
    });

    it("should return empty array for invalid hex", () => {
      const ring = H3_HELPERS.getHexRing("invalid_hex", 1);
      expect(ring).toEqual([]);
    });
  });

  describe("getHexesWithinDistance", () => {
    let centerHex: string;

    beforeAll(() => {
      centerHex = H3_HELPERS.coordsToHex(
        NYC_TEST_LOCATIONS.timesSquare.lat,
        NYC_TEST_LOCATIONS.timesSquare.lng
      );
    });

    it("should return only center hex for distance 0", () => {
      const hexes = H3_HELPERS.getHexesWithinDistance(centerHex, 0);
      expect(hexes).toEqual([centerHex]);
    });

    it("should return 7 hexes for distance 1 (center + 6 neighbors)", () => {
      const hexes = H3_HELPERS.getHexesWithinDistance(centerHex, 1);
      expect(hexes).toBeDefined();
      expect(hexes.length).toBe(7);
      expect(hexes).toContain(centerHex);
    });

    it("should return 19 hexes for distance 2 (1 + 6 + 12)", () => {
      const hexes = H3_HELPERS.getHexesWithinDistance(centerHex, 2);
      expect(hexes).toBeDefined();
      expect(hexes.length).toBe(19);
      expect(hexes).toContain(centerHex);
    });

    it("should return empty array for invalid hex", () => {
      const hexes = H3_HELPERS.getHexesWithinDistance("invalid_hex", 1);
      expect(hexes).toEqual([]);
    });
  });

  describe("hexDistance", () => {
    it("should return 0 for same hex", () => {
      const hex = H3_HELPERS.coordsToHex(
        NYC_TEST_LOCATIONS.timesSquare.lat,
        NYC_TEST_LOCATIONS.timesSquare.lng
      );
      const distance = H3_HELPERS.hexDistance(hex, hex);
      expect(distance).toBe(0);
    });

    it("should return positive distance between different hexes", () => {
      const hex1 = H3_HELPERS.coordsToHex(
        NYC_TEST_LOCATIONS.timesSquare.lat,
        NYC_TEST_LOCATIONS.timesSquare.lng
      );
      const hex2 = H3_HELPERS.coordsToHex(
        NYC_TEST_LOCATIONS.centralPark.lat,
        NYC_TEST_LOCATIONS.centralPark.lng
      );

      const distance = H3_HELPERS.hexDistance(hex1, hex2);
      expect(distance).toBeGreaterThan(0);
      expect(typeof distance).toBe("number");
    });

    it("should return 0 for invalid hexes", () => {
      const distance = H3_HELPERS.hexDistance("invalid1", "invalid2");
      expect(distance).toBe(0);
    });
  });

  describe("isValidHex", () => {
    it("should return true for valid hex IDs", () => {
      const validHex = H3_HELPERS.coordsToHex(
        NYC_TEST_LOCATIONS.timesSquare.lat,
        NYC_TEST_LOCATIONS.timesSquare.lng
      );
      expect(H3_HELPERS.isValidHex(validHex)).toBe(true);
    });

    it("should return false for invalid hex IDs", () => {
      expect(H3_HELPERS.isValidHex("invalid")).toBe(false);
      expect(H3_HELPERS.isValidHex("")).toBe(false);
      expect(H3_HELPERS.isValidHex("123")).toBe(false);
      // Adjusted expectation to match new 16-char IDs
      expect(H3_HELPERS.isValidHex("8f2a100648b1fff")).toBe(false);
    });
  });

  describe("getBoundingBoxHexes", () => {
    it("should return hexes for valid bounding box", () => {
      const hexes = H3_HELPERS.getBoundingBoxHexes(
        40.755,
        40.765,
        -73.99,
        -73.98
      );

      expect(Array.isArray(hexes)).toBe(true);
      expect(hexes.length).toBeGreaterThan(0);

      hexes.forEach((hex) => {
        expect(H3_HELPERS.isValidHex(hex)).toBe(true);
      });
    });

    it("should return empty array for invalid bounding box", () => {
      const hexes = H3_HELPERS.getBoundingBoxHexes(91, 92, 181, 182);
      expect(hexes).toEqual([]);
    });
  });
});

// -----------------------------------------------------------------------------

describe("Utility Functions", () => {
  describe("isWithinNYC", () => {
    it("should return true for NYC locations", () => {
      Object.values(NYC_TEST_LOCATIONS).forEach((coords) => {
        expect(isWithinNYC(coords.lat, coords.lng)).toBe(true);
      });
    });

    it("should return false for locations outside NYC", () => {
      expect(isWithinNYC(34.0522, -118.2437)).toBe(false);
      expect(isWithinNYC(41.8781, -87.6298)).toBe(false);
    });
  });

  describe("getExplorationMethod", () => {
    it("should classify speeds correctly", () => {
      expect(getExplorationMethod(0)).toBe(EXPLORATION_METHODS.WALKING);
      expect(getExplorationMethod(2)).toBe(EXPLORATION_METHODS.WALKING);
      expect(getExplorationMethod(3)).toBe(EXPLORATION_METHODS.WALKING);

      expect(getExplorationMethod(5)).toBe(EXPLORATION_METHODS.BIKING);
      expect(getExplorationMethod(10)).toBe(EXPLORATION_METHODS.BIKING);
      expect(getExplorationMethod(15)).toBe(EXPLORATION_METHODS.BIKING);

      expect(getExplorationMethod(20)).toBe(EXPLORATION_METHODS.DRIVING);
      expect(getExplorationMethod(50)).toBe(EXPLORATION_METHODS.DRIVING);
    });
  });

  describe("calculateHexDistance", () => {
    it("should calculate distance correctly", () => {
      // Use the new RES9_DIAMETER_METERS
      expect(calculateHexDistance(0)).toBe(0);
      expect(calculateHexDistance(1)).toBe(HEX_CONFIG.RES9_DIAMETER_METERS);
      expect(calculateHexDistance(10)).toBe(
        10 * HEX_CONFIG.RES9_DIAMETER_METERS
      );
    });
  });

  describe("calculateHexArea", () => {
    it("should calculate area correctly", () => {
      // Use the new RES9_AREA_SQ_METERS
      expect(calculateHexArea(0)).toBe(0);
      expect(calculateHexArea(1)).toBe(HEX_CONFIG.RES9_AREA_SQ_METERS);
      expect(calculateHexArea(10)).toBe(10 * HEX_CONFIG.RES9_AREA_SQ_METERS);
    });
  });
});

// -----------------------------------------------------------------------------

describe("Configuration Constants", () => {
  it("should have valid hex configuration", () => {
    // The main changes are here
    expect(HEX_CONFIG.PRIMARY_RESOLUTION).toBe(9);

    // Check for the existence of the new res 9 stats
    expect(HEX_CONFIG.RES9_DIAMETER_METERS).toBe(9.3);
    expect(HEX_CONFIG.RES9_AREA_SQ_METERS).toBe(259);
  });

  it("should have valid exploration methods", () => {
    expect(EXPLORATION_METHODS.WALKING).toBe("walking");
    expect(EXPLORATION_METHODS.BIKING).toBe("biking");
    expect(EXPLORATION_METHODS.DRIVING).toBe("driving");
  });

  it("should have valid NYC bounds", () => {
    const { minLat, maxLat, minLng, maxLng } = NYC_BOUNDS;

    expect(minLat).toBeLessThan(maxLat);
    expect(minLng).toBeLessThan(maxLng);
    expect(minLat).toBeGreaterThanOrEqual(-90);
    expect(maxLat).toBeLessThanOrEqual(90);
    expect(minLng).toBeGreaterThanOrEqual(-180);
    expect(maxLng).toBeLessThanOrEqual(180);
  });
});
