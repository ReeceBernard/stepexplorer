// api/locations.ts

import { db } from "@/db/config";
import { exploredAreas, users } from "@/db/schema";
import { getExplorationMethod, H3_HELPERS } from "@/db/schema/constants";
import { eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

const router = Router();

const addLocationSchema = z.object({
  speed: z.number().min(0).max(200, "Speed must be between 0 and 200 mph"),
  timeSpent: z.number().min(0).optional().default(0),
});

const locationHeadersSchema = z.object({
  "x-user-id": z.string().uuid("Invalid user ID format"),
  "x-latitude": z.string().transform((val) => {
    const num = parseFloat(val);
    if (isNaN(num) || num < -90 || num > 90) {
      throw new Error("Latitude must be between -90 and 90");
    }
    return num;
  }),
  "x-longitude": z.string().transform((val) => {
    const num = parseFloat(val);
    if (isNaN(num) || num < -180 || num > 180) {
      throw new Error("Longitude must be between -180 and 180");
    }
    return num;
  }),
});

// POST /api/locations - Add single location point and explore hex
router.post("/", async (req, res) => {
  try {
    const headerValidation = locationHeadersSchema.safeParse(req.headers);
    if (!headerValidation.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid headers",
        details: headerValidation.error.issues,
      });
    }

    const bodyValidation = addLocationSchema.safeParse(req.body);
    if (!bodyValidation.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid request body",
        details: bodyValidation.error.issues,
      });
    }

    const {
      "x-user-id": userID,
      "x-latitude": latitude,
      "x-longitude": longitude,
    } = headerValidation.data;
    const { speed, timeSpent } = bodyValidation.data;

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

    // Convert coordinates to H3 hex at the default resolution (now 9)
    const hexIndex = H3_HELPERS.coordsToHex(latitude, longitude);
    const explorationMethod = getExplorationMethod(speed);

    // Add explored area record
    const newExploredArea = await db
      .insert(exploredAreas)
      .values({
        userID: userID,
        hexIndex,
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        speed: speed.toString(),
        explorationMethod,
        timeSpent: timeSpent.toString(),
        visitedAt: new Date(),
      })
      .returning();

    // Update user's current location with the new resolution 9 hex
    await db
      .update(users)
      .set({
        currentLatitude: latitude.toString(),
        currentLongitude: longitude.toString(),
        // The hexIndex is now guaranteed to be resolution 9
        currentHexRes8: hexIndex, // actually 9 but lets wait to migrate
        lastLocationUpdate: new Date(),
        lastActive: new Date(),
      })
      .where(eq(users.id, userID));

    res.json({
      success: true,
      exploredArea: newExploredArea[0],
      hexIndex,
      explorationMethod,
      coordinates: { latitude, longitude },
      message: "Location added and area explored successfully",
    });
  } catch (error) {
    console.error("❌ Add location error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to add location",
    });
  }
});

export default router;
