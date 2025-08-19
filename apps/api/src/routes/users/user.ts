import { eq } from "drizzle-orm";
import { Router } from "express";
import { db } from "../../db/config";
import { users } from "../../db/schema";
import { generateUsername } from "./utils/generate-username";

const router = Router();

router.post("/register", async (req, res) => {
  try {
    const { deviceFingerprint } = req.body;

    // Validate deviceId is provided
    if (!deviceFingerprint) {
      return res.status(400).json({
        success: false,
        error: "Device fingerprint is required",
      });
    }

    // Check if user already exists with this device fingerprint
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.deviceFingerprint, deviceFingerprint))
      .limit(1);

    if (existingUser.length > 0) {
      return res.json({
        success: true,
        user: existingUser[0],
        message: `Welcome back ${existingUser[0].username}!`,
      });
    }

    // Generate new username and create user
    const username = generateUsername();

    const newUser = await db
      .insert(users)
      .values({
        username,
        deviceFingerprint,
      })
      .returning();

    res.json({
      success: true,
      user: newUser[0],
      message: `Welcome ${newUser[0].username}!`,
    });
  } catch (error) {
    console.error("❌ Registration error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to register user",
    });
  }
});

router.post("/authenticate", async (req, res) => {
  try {
    const { deviceFingerprint } = req.body;

    // Validate deviceFingerprint is provided
    if (!deviceFingerprint) {
      return res.status(400).json({
        success: false,
        error: "Device fingerprint is required",
      });
    }

    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.deviceFingerprint, deviceFingerprint))
      .limit(1);

    if (existingUser.length > 0) {
      res.json({
        success: true,
        user: existingUser[0],
        message: `Welcome back ${existingUser[0].username}!`,
      });
    } else {
      res.status(404).json({
        success: false,
        error: "User not found. Please register first.",
      });
    }
  } catch (error) {
    console.error("❌ Authentication error:", error);
    res.status(500).json({
      success: false,
      error: "Authentication failed",
    });
  }
});

export default router;
