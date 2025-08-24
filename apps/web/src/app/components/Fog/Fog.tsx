"use client";

import L from "leaflet";
import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import { latLngBoundsToH3 } from "./h3-helper";

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

// Minimum zoom level to render hexagons.
// A resolution of 9 becomes visible around zoom 11-12.
const MIN_HEX_ZOOM = 12;

class H3SpatialIndex {
  private hexMap: Map<string, ExploredHex> = new Map();

  constructor(hexes: ExploredHex[]) {
    hexes.forEach((hex) => {
      this.hexMap.set(hex.properties.hexIndex, hex);
    });
  }

  getHexesInBounds(viewBounds: L.LatLngBounds): ExploredHex[] {
    const result: ExploredHex[] = [];
    const resolutionToQuery = 9;

    const h3IndexesInView = latLngBoundsToH3(viewBounds, resolutionToQuery);

    h3IndexesInView.forEach((h3Index) => {
      if (this.hexMap.has(h3Index)) {
        result.push(this.hexMap.get(h3Index)!);
      }
    });

    return result;
  }
}

export default function Fog({ exploredHexes }: FogProps) {
  const map = useMap();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const spatialIndexRef = useRef<H3SpatialIndex | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isMovingRef = useRef<boolean>(false);
  const settleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fadeAnimationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!map) return;

    spatialIndexRef.current = new H3SpatialIndex(exploredHexes);

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

    const drawSolidFog = (clearFirst = true) => {
      if (!ctx) return;
      const size = map.getSize();
      if (clearFirst) {
        ctx.clearRect(0, 0, size.x, size.y);
      }
      ctx.fillStyle = "rgba(120, 120, 120, 0.9)";
      ctx.fillRect(0, 0, size.x, size.y);
    };

    const redrawFogWithFade = (fadeProgress: number = 1) => {
      if (!ctx || !spatialIndexRef.current) return;

      const zoom = map.getZoom();

      // Check if the zoom level is below the minimum threshold
      if (zoom < MIN_HEX_ZOOM) {
        drawSolidFog(); // Just draw solid fog
        console.log("Zoom too low, showing solid fog. Zoom level:", zoom);
        return;
      }

      const size = map.getSize();
      ctx.clearRect(0, 0, size.x, size.y);
      ctx.fillStyle = "rgba(100, 100, 100, 0.85)";
      ctx.fillRect(0, 0, size.x, size.y);
      const viewBounds = map.getBounds().pad(0.1);

      const visibleHexes = spatialIndexRef.current.getHexesInBounds(viewBounds);

      if (fadeProgress < 1) {
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = size.x;
        tempCanvas.height = size.y;
        const tempCtx = tempCanvas.getContext("2d");
        if (tempCtx) {
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
          ctx.globalCompositeOperation = "destination-out";
          ctx.globalAlpha = fadeProgress;
          ctx.drawImage(tempCanvas, 0, 0);
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = "source-over";
        }
      } else {
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
      const duration = 800;
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
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
          updateCanvas();
          drawSolidFog();
        } else {
          updateCanvas();
          redrawFogWithFade(1);
        }
      });
    };

    const handleMoveStart = () => {
      if (!isMovingRef.current) {
        isMovingRef.current = true;
        if (fadeAnimationRef.current) {
          cancelAnimationFrame(fadeAnimationRef.current);
          fadeAnimationRef.current = null;
        }
        scheduleUpdate();
      }
      if (settleTimeoutRef.current) {
        clearTimeout(settleTimeoutRef.current);
      }
    };

    const handleMoveEnd = () => {
      settleTimeoutRef.current = setTimeout(() => {
        isMovingRef.current = false;
        startFadeAnimation();
      }, 200);
    };

    scheduleUpdate();
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
