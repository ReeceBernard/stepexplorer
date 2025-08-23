"use client";

import L from "leaflet";
import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";

interface ExploredHex {
  type: string;
  geometry: {
    type: string;
    coordinates: number[][][];
  };
  properties: {
    hexIndex: string;
    firstVisited: string;
    explorationMethod: string;
  };
}

interface FogProps {
  exploredHexes: ExploredHex[];
}

// H3-inspired optimizations
class SpatialIndex {
  private hexMap: Map<string, ExploredHex> = new Map();
  private bounds: Map<string, L.LatLngBounds> = new Map();

  constructor(hexes: ExploredHex[]) {
    // Pre-compute bounds for each hex (like H3's lookup tables)
    hexes.forEach((hex) => {
      const coordinates = hex.geometry.coordinates[0];
      let minLat = Infinity,
        maxLat = -Infinity;
      let minLng = Infinity,
        maxLng = -Infinity;

      coordinates.forEach((coord) => {
        minLat = Math.min(minLat, coord[0]);
        maxLat = Math.max(maxLat, coord[0]);
        minLng = Math.min(minLng, coord[1]);
        maxLng = Math.max(maxLng, coord[1]);
      });

      this.hexMap.set(hex.properties.hexIndex, hex);
      this.bounds.set(
        hex.properties.hexIndex,
        L.latLngBounds([minLat, minLng], [maxLat, maxLng])
      );
    });
  }

  // Fast viewport culling (inspired by H3's hierarchical queries)
  getHexesInBounds(viewBounds: L.LatLngBounds): ExploredHex[] {
    const result: ExploredHex[] = [];

    for (const [hexIndex, hexBounds] of this.bounds.entries()) {
      if (viewBounds.intersects(hexBounds)) {
        const hex = this.hexMap.get(hexIndex);
        if (hex) result.push(hex);
      }
    }

    return result;
  }
}

// Level-of-detail system (inspired by H3's resolution levels)
class LODManager {
  static getDetailLevel(zoom: number): "high" | "medium" | "low" {
    if (zoom >= 16) return "high";
    if (zoom >= 12) return "medium";
    return "low";
  }

  static shouldSimplify(zoom: number, hexCount: number): boolean {
    const detailLevel = this.getDetailLevel(zoom);

    switch (detailLevel) {
      case "low":
        return hexCount > 50;
      case "medium":
        return hexCount > 200;
      case "high":
        return hexCount > 500;
    }
  }

  // Simplify hexes by clustering nearby ones
  static simplifyHexes(hexes: ExploredHex[], zoom: number): ExploredHex[] {
    if (!this.shouldSimplify(zoom, hexes.length)) {
      return hexes;
    }

    // Simple clustering - in production you'd use proper spatial clustering
    const gridSize = zoom < 12 ? 0.01 : 0.005; // Degrees
    const clusters = new Map<string, ExploredHex[]>();

    hexes.forEach((hex) => {
      const coords = hex.geometry.coordinates[0][0]; // First coordinate
      const gridX = Math.floor(coords[1] / gridSize);
      const gridY = Math.floor(coords[0] / gridSize);
      const key = `${gridX},${gridY}`;

      if (!clusters.has(key)) {
        clusters.set(key, []);
      }
      clusters.get(key)!.push(hex);
    });

    // Return one representative hex per cluster
    return Array.from(clusters.values()).map((cluster) => cluster[0]);
  }
}

export default function Fog({ exploredHexes }: FogProps) {
  const map = useMap();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const spatialIndexRef = useRef<SpatialIndex | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastZoomRef = useRef<number>(0);
  const isMovingRef = useRef<boolean>(false);
  const settleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fadeAnimationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!map) return;

    // Build spatial index once (like H3's pre-computed tables)
    spatialIndexRef.current = new SpatialIndex(exploredHexes);

    console.log("Built spatial index for", exploredHexes.length, "hexes");

    // Create canvas
    const canvas = document.createElement("canvas");
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "400";

    canvasRef.current = canvas;
    map.getPanes().overlayPane.appendChild(canvas);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Optimize canvas for speed
    ctx.imageSmoothingEnabled = false;

    const updateCanvas = () => {
      const size = map.getSize();
      canvas.width = size.x;
      canvas.height = size.y;
      canvas.style.width = size.x + "px";
      canvas.style.height = size.y + "px";

      const topLeft = map.containerPointToLayerPoint([0, 0]);
      L.DomUtil.setPosition(canvas, topLeft);
    };

    const drawSolidFog = () => {
      if (!ctx) return;

      const size = map.getSize();

      // Clear and fill entire canvas with solid fog
      ctx.clearRect(0, 0, size.x, size.y);
      ctx.fillStyle = "rgba(120, 120, 120, 0.9)";
      ctx.fillRect(0, 0, size.x, size.y);
    };

    const redrawFogWithFade = (fadeProgress: number = 1) => {
      if (!ctx || !spatialIndexRef.current) return;

      const size = map.getSize();
      const zoom = map.getZoom();

      // Clear and fill with fog
      ctx.clearRect(0, 0, size.x, size.y);
      ctx.fillStyle = "rgba(100, 100, 100, 0.85)";
      ctx.fillRect(0, 0, size.x, size.y);

      // Get viewport bounds
      const viewBounds = map.getBounds().pad(0.1);

      // Fast spatial query
      let visibleHexes = spatialIndexRef.current.getHexesInBounds(viewBounds);

      // Apply level-of-detail
      visibleHexes = LODManager.simplifyHexes(visibleHexes, zoom);

      console.log(
        `Rendering ${visibleHexes.length} hexes with fade progress: ${fadeProgress}`
      );

      // Create fade effect by adjusting alpha
      if (fadeProgress < 1) {
        // During fade, create a temporary canvas for the holes
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = size.x;
        tempCanvas.height = size.y;
        const tempCtx = tempCanvas.getContext("2d");

        if (tempCtx) {
          // Draw holes on temp canvas
          tempCtx.globalCompositeOperation = "source-over";
          tempCtx.fillStyle = "white";

          visibleHexes.forEach((hex) => {
            const coordinates = hex.geometry.coordinates[0];

            tempCtx.beginPath();
            coordinates.forEach((coord, index) => {
              const point = map.latLngToContainerPoint([coord[0], coord[1]]);
              if (index === 0) {
                tempCtx.moveTo(point.x, point.y);
              } else {
                tempCtx.lineTo(point.x, point.y);
              }
            });
            tempCtx.closePath();
            tempCtx.fill();
          });

          // Apply faded holes to main canvas
          ctx.globalCompositeOperation = "destination-out";
          ctx.globalAlpha = fadeProgress;
          ctx.drawImage(tempCanvas, 0, 0);
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = "source-over";
        }
      } else {
        // Full opacity - normal rendering
        ctx.globalCompositeOperation = "destination-out";

        visibleHexes.forEach((hex) => {
          const coordinates = hex.geometry.coordinates[0];

          ctx.beginPath();
          coordinates.forEach((coord, index) => {
            const point = map.latLngToContainerPoint([coord[0], coord[1]]);
            if (index === 0) {
              ctx.moveTo(point.x, point.y);
            } else {
              ctx.lineTo(point.x, point.y);
            }
          });
          ctx.closePath();
          ctx.fill();
        });

        ctx.globalCompositeOperation = "source-over";
      }
    };

    const startFadeAnimation = () => {
      const startTime = Date.now();
      const duration = 800; // 800ms fade duration

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Smooth easing function
        const easeProgress = 1 - Math.pow(1 - progress, 3);

        updateCanvas();
        redrawFogWithFade(easeProgress);

        if (progress < 1) {
          fadeAnimationRef.current = requestAnimationFrame(animate);
        } else {
          fadeAnimationRef.current = null;
        }
      };

      fadeAnimationRef.current = requestAnimationFrame(animate);
    };

    const scheduleUpdate = () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(() => {
        if (isMovingRef.current) {
          // Show solid fog during movement
          updateCanvas();
          drawSolidFog();
        } else {
          // Normal rendering when settled
          updateCanvas();
          redrawFogWithFade(1);
        }
      });
    };

    // Movement detection
    const handleMoveStart = () => {
      if (!isMovingRef.current) {
        isMovingRef.current = true;
        console.log("Movement detected - showing solid fog");

        // Cancel any ongoing fade animation
        if (fadeAnimationRef.current) {
          cancelAnimationFrame(fadeAnimationRef.current);
          fadeAnimationRef.current = null;
        }

        // Show solid fog immediately
        scheduleUpdate();
      }

      // Reset settle timer
      if (settleTimeoutRef.current) {
        clearTimeout(settleTimeoutRef.current);
      }
    };

    const handleMoveEnd = () => {
      // Set up settle timer
      settleTimeoutRef.current = setTimeout(() => {
        console.log("Movement settled - starting fade animation");
        isMovingRef.current = false;
        lastZoomRef.current = map.getZoom();

        // Start fade animation
        startFadeAnimation();
      }, 200); // 200ms after movement stops
    };

    // Initial draw
    lastZoomRef.current = map.getZoom();
    scheduleUpdate();

    // Event handling
    map.on("movestart dragstart zoomstart", handleMoveStart);
    map.on("moveend dragend zoomend", handleMoveEnd);

    return () => {
      if (canvasRef.current && canvasRef.current.parentNode) {
        canvasRef.current.parentNode.removeChild(canvasRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (fadeAnimationRef.current) {
        cancelAnimationFrame(fadeAnimationRef.current);
      }
      if (settleTimeoutRef.current) {
        clearTimeout(settleTimeoutRef.current);
      }
      map.off("movestart dragstart zoomstart", handleMoveStart);
      map.off("moveend dragend zoomend", handleMoveEnd);
    };
  }, [map, exploredHexes]);

  return null;
}
