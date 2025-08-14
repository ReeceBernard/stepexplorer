import * as THREE from "three";

export const hash = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

export const generateStars = () => {
  const stars = [];
  for (let i = 0; i < 150; i++) {
    const x = hash(i * 7.919) * 100;
    const y = hash(i * 11.139) * 100;
    const delay = hash(i * 3.571) * 4;
    const duration = 3 + hash(i * 5.283) * 2;

    stars.push({ x, y, delay, duration, key: i });
  }
  return stars;
};

export const EARTH_CONFIG = {
  radius: 3,
  segments: 128,
  clouds: {
    radius: 3.05,
    segments: 64,
    opacity: 0.6,
  },
  atmosphere: {
    radius: 3.3,
    segments: 64,
  },
} as const;

export const ANIMATION_CONFIG = {
  earth: 0.003,
  clouds: 0.002,
  atmosphere: 0.001,
} as const;

export const createEarthTexture = (): THREE.CanvasTexture => {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 1024;
  const context = canvas.getContext("2d")!;

  // Ocean gradient with improved colors
  const oceanGradient = context.createLinearGradient(0, 0, 0, canvas.height);
  oceanGradient.addColorStop(0, "#1a365d");
  oceanGradient.addColorStop(0.2, "#2563eb");
  oceanGradient.addColorStop(0.5, "#3b82f6");
  oceanGradient.addColorStop(0.8, "#2563eb");
  oceanGradient.addColorStop(1, "#1a365d");

  context.fillStyle = oceanGradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  // Continent colors
  const continentColors = ["#22c55e", "#16a34a", "#15803d", "#166534"];

  // Draw continents with more realistic shapes
  const continents = [
    { x: 0.55, y: 0.42, radiusX: 80, radiusY: 140, rotation: 0.15, color: 0 }, // Africa
    { x: 0.52, y: 0.22, radiusX: 45, radiusY: 25, rotation: 0, color: 2 }, // Europe
    { x: 0.75, y: 0.28, radiusX: 120, radiusY: 80, rotation: 0.1, color: 0 }, // Asia
    { x: 0.15, y: 0.25, radiusX: 60, radiusY: 90, rotation: -0.1, color: 1 }, // North America
    { x: 0.22, y: 0.58, radiusX: 45, radiusY: 110, rotation: 0.1, color: 2 }, // South America
    { x: 0.82, y: 0.68, radiusX: 40, radiusY: 25, rotation: 0, color: 3 }, // Australia
  ];

  continents.forEach((continent) => {
    context.fillStyle = continentColors[continent.color];
    context.beginPath();
    context.ellipse(
      canvas.width * continent.x,
      canvas.height * continent.y,
      continent.radiusX,
      continent.radiusY,
      continent.rotation,
      0,
      Math.PI * 2
    );
    context.fill();
  });

  // Add islands
  Array.from({ length: 20 }, (_, i) => {
    context.fillStyle = continentColors[i % continentColors.length];
    const x = hash(i * 13.7) * canvas.width;
    const y = hash(i * 17.3) * canvas.height;
    const radius = 3 + hash(i * 23.1) * 8;

    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  });

  return new THREE.CanvasTexture(canvas);
};

export const createBumpTexture = (): THREE.CanvasTexture => {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext("2d")!;

  context.fillStyle = "#606060";
  context.fillRect(0, 0, canvas.width, canvas.height);

  Array.from({ length: 2000 }, (_, i) => {
    const x = hash(i * 2.718) * canvas.width;
    const y = hash(i * 1.618) * canvas.height;
    const radius = hash(i * 0.707) * 4 + 1;
    const intensity = 80 + hash(i * 1.414) * 120;

    context.fillStyle = `rgb(${intensity}, ${intensity}, ${intensity})`;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  });

  return new THREE.CanvasTexture(canvas);
};

export const createSpecularTexture = (): THREE.CanvasTexture => {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext("2d")!;

  context.fillStyle = "#202020";
  context.fillRect(0, 0, canvas.width, canvas.height);

  const gradient = context.createRadialGradient(
    canvas.width * 0.3,
    canvas.height * 0.5,
    0,
    canvas.width * 0.3,
    canvas.height * 0.5,
    canvas.width * 0.4
  );
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(1, "#404040");

  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width * 0.6, canvas.height);

  return new THREE.CanvasTexture(canvas);
};

export const createCloudsTexture = (): THREE.CanvasTexture => {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 1024;
  const context = canvas.getContext("2d")!;

  context.clearRect(0, 0, canvas.width, canvas.height);

  // Main cloud formations
  Array.from({ length: 100 }, (_, i) => {
    const x = hash(i * 3.141) * canvas.width;
    const y = hash(i * 2.718) * canvas.height;
    const size = 20 + hash(i * 1.618) * 80;
    const opacity = 0.3 + hash(i * 0.707) * 0.4;

    const cloudGradient = context.createRadialGradient(x, y, 0, x, y, size);
    cloudGradient.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
    cloudGradient.addColorStop(0.5, `rgba(255, 255, 255, ${opacity * 0.5})`);
    cloudGradient.addColorStop(1, "rgba(255, 255, 255, 0)");

    context.fillStyle = cloudGradient;
    context.beginPath();
    context.arc(x, y, size, 0, Math.PI * 2);
    context.fill();
  });

  // Weather patterns
  Array.from({ length: 20 }, (_, i) => {
    const x = hash(i * 7.389) * canvas.width;
    const y = hash(i * 4.669) * canvas.height;
    const width = 50 + hash(i * 5.551) * 150;
    const height = 20 + hash(i * 6.283) * 40;
    const opacity = 0.2 + hash(i * 9.876) * 0.3;

    context.fillStyle = `rgba(255, 255, 255, ${opacity})`;
    context.fillRect(x, y, width, height);
  });

  return new THREE.CanvasTexture(canvas);
};

export function getDeviceFingerprint(): string {
  let deviceFingerPrint = localStorage.getItem("stepexplorer-device-id");

  if (!deviceFingerPrint) {
    // Generate new device ID
    deviceFingerPrint = generateDeviceFingerprint();
    localStorage.setItem("stepexplorer-device-id", deviceFingerPrint);
    console.log(
      "🆔 Generated new device ID:",
      deviceFingerPrint.substring(0, 8) + "..."
    );
  } else {
    console.log(
      "🔄 Using existing device ID:",
      deviceFingerPrint.substring(0, 8) + "..."
    );
  }

  return deviceFingerPrint;
}

function generateDeviceFingerprint(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function hasStoredDeviceFingerprint(): boolean {
  return localStorage.getItem("stepexplorer-device-id") !== null;
}

export function clearDeviceFingerprint(): void {
  localStorage.removeItem("stepexplorer-device-id");
  console.log("🗑️ Device ID cleared");
}
