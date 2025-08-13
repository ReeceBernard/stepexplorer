// The goal is to just have local storage for device fingerprints, but if its missing we can generate one
// I hate logging in and creating new accounts so I want to try out no auth.
// If I actually get users that want to log in I can change it, but really i imagine this just works for the 10 people using my app

export function createDeviceFingerprint(req: any): string {
  const userAgent = req.get("User-Agent") || "unknown";
  const acceptLanguage = req.get("Accept-Language") || "";

  // For mobile, focus on more stable identifiers
  // Remove version numbers that change frequently
  const stableUserAgent = userAgent
    .replace(/\d+\.\d+\.\d+/g, "X.X.X") 
    .replace(/Chrome\/[\d.]+/g, "Chrome/XXX")
    .replace(/Safari\/[\d.]+/g, "Safari/XXX")
    .replace(/Version\/[\d.]+/g, "Version/XXX");

  const combined = `${stableUserAgent}|${acceptLanguage}`;

  const crypto = require("crypto");
  const hash = crypto.createHash("sha256").update(combined).digest("hex");

  return hash;
}
