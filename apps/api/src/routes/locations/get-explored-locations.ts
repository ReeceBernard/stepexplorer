import { db } from "@/db/config";
import { exploredAreas, users } from "@/db/schema";
import {
  calculateHexArea,
  calculateHexDistance,
  H3_HELPERS,
} from "@/db/schema/constants";
import { countDistinct, desc, eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

const router = Router();

router.get("/explored", async (req, res) => {
  try {
    // Get user ID from header
    const userID = req.headers["x-user-id"] as string;

    if (!userID || typeof userID !== "string") {
      return res.status(400).json({
        success: false,
        error: "Missing X-User-ID header",
      });
    }

    // Validate user ID format
    const userIDValidation = z.uuid().safeParse(userID);
    if (!userIDValidation.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid user ID format",
      });
    }

    // 1. Verify user exists
    const user = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userID))
      .limit(1);

    if (user.length === 0) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    const exploredList = await db
      .select({
        id: exploredAreas.id,
        hexIndex: exploredAreas.hexIndex,
        latitude: exploredAreas.latitude,
        longitude: exploredAreas.longitude,
        speed: exploredAreas.speed,
        explorationMethod: exploredAreas.explorationMethod,
        timeSpent: exploredAreas.timeSpent,
        visitedAt: exploredAreas.visitedAt,
      })
      .from(exploredAreas)
      .where(eq(exploredAreas.userID, userID))
      .orderBy(desc(exploredAreas.visitedAt))
      .limit(100);

    const [uniqueHexes, totalVisits] = await Promise.all([
      db
        .select({ count: countDistinct(exploredAreas.hexIndex) })
        .from(exploredAreas)
        .where(eq(exploredAreas.userID, userID)),
      db
        .select({ count: exploredAreas.id })
        .from(exploredAreas)
        .where(eq(exploredAreas.userID, userID)),
    ]);

    const uniqueHexCount = uniqueHexes[0]?.count || 0;
    const totalVisitCount = totalVisits.length;

    // 4. Calculate derived stats
    const estimatedDistance = calculateHexDistance(totalVisitCount);
    const totalAreaExplored = calculateHexArea(Number(uniqueHexCount));

    // 5. Get unique hexes for map rendering
    const uniqueHexList = await db
      .selectDistinct({
        hexIndex: exploredAreas.hexIndex,
        firstVisited: exploredAreas.visitedAt,
        explorationMethod: exploredAreas.explorationMethod,
      })
      .from(exploredAreas)
      .where(eq(exploredAreas.userID, userID))
      .orderBy(desc(exploredAreas.visitedAt));

    const hexPolygons = uniqueHexList.map((hex) => ({
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [H3_HELPERS.hexToBoundary(hex.hexIndex)],
      },
      properties: {
        hexIndex: hex.hexIndex,
        firstVisited: hex.firstVisited,
        explorationMethod: hex.explorationMethod,
      },
    }));

    res.json({
      success: true,
      stats: {
        totalVisits: totalVisitCount,
        uniqueHexes: Number(uniqueHexCount),
        estimatedDistanceMeters: estimatedDistance,
        totalAreaSqMeters: totalAreaExplored,
        // Display-friendly versions
        estimatedDistanceKm: (estimatedDistance / 1000).toFixed(2),
        estimatedDistanceMiles: (estimatedDistance * 0.000621371).toFixed(2),
        totalAreaSqKm: (totalAreaExplored / 1000000).toFixed(4),
      },
      recentVisits: exploredList,
      hexagons: {
        type: "FeatureCollection",
        features: hexPolygons,
      },
      message: `Found ${uniqueHexCount} unique areas explored`,
    });
  } catch (error) {
    console.error("❌ Get explored areas error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get explored areas",
    });
  }
});

export default router;
