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

export default function Fog({ exploredHexes }: FogProps) {
  const map = useMap();
  const fogLayerRef = useRef<L.Layer | null>(null);

  useEffect(() => {
    if (!map) return;

    // Remove existing fog layer
    if (fogLayerRef.current) {
      map.removeLayer(fogLayerRef.current);
    }

    // Get unique hexes using Set
    const uniqueHexIndices = new Set(
      exploredHexes.map((hex) => hex.properties.hexIndex)
    );

    const uniqueHexes = Array.from(uniqueHexIndices)
      .map((hexIndex) =>
        exploredHexes.find((hex) => hex.properties.hexIndex === hexIndex)
      )
      .filter(Boolean) as ExploredHex[];

    console.log(
      "Creating efficient fog with unique hexes:",
      uniqueHexes.length
    );

    // Create a custom Leaflet layer that uses Canvas for maximum performance
    const FogLayer = L.Layer.extend({
      initialize: function () {
        this._canvas = null;
        this._ctx = null;
        this._frame = null;
      },

      onAdd: function (map: L.Map) {
        this._map = map;

        // Create canvas element
        this._canvas = L.DomUtil.create("canvas", "fog-canvas");
        this._canvas.style.position = "absolute";
        this._canvas.style.top = "0";
        this._canvas.style.left = "0";
        this._canvas.style.pointerEvents = "none";
        this._canvas.style.zIndex = "1000";

        this._ctx = this._canvas.getContext("2d");

        // Add to map pane
        map.getPanes().overlayPane.appendChild(this._canvas);

        // Size the canvas
        this._reset();

        // Bind events
        map.on("moveend zoom", this._reset, this);
        map.on("move", this._update, this);
        map.on("viewreset", this._reset, this);

        // Also bind to drag events for real-time updates during swipes
        map.on("drag", this._update, this);
      },

      onRemove: function (map: L.Map) {
        L.DomUtil.remove(this._canvas);
        map.off("moveend zoom", this._reset, this);
        map.off("move", this._update, this);
        map.off("viewreset", this._reset, this);
        map.off("drag", this._update, this);
      },

      _reset: function () {
        const size = this._map.getSize();
        this._canvas.width = size.x;
        this._canvas.height = size.y;

        const pos = L.DomUtil.getPosition(this._canvas);
        L.DomUtil.setPosition(this._canvas, pos);

        this._redraw();
      },

      _update: function () {
        // Update continuously during movement - no frame throttling for real-time movement
        const topLeft = this._map.containerPointToLayerPoint([0, 0]);
        L.DomUtil.setPosition(this._canvas, topLeft);
      },

      _redraw: function () {
        if (!this._ctx) return;

        const ctx = this._ctx;
        const size = this._map.getSize();

        // Clear canvas
        ctx.clearRect(0, 0, size.x, size.y);

        // Fill entire canvas with fog
        ctx.fillStyle = "rgba(128, 128, 128, 0.99)";
        ctx.fillRect(0, 0, size.x, size.y);

        // Use 'destination-out' to cut holes for explored areas
        ctx.globalCompositeOperation = "destination-out";

        // Draw explored hexes as holes
        uniqueHexes.forEach((hex) => {
          const coordinates = hex.geometry.coordinates[0];

          ctx.beginPath();
          coordinates.forEach((coord, index) => {
            const point = this._map.latLngToContainerPoint([
              coord[0],
              coord[1],
            ]);
            if (index === 0) {
              ctx.moveTo(point.x, point.y);
            } else {
              ctx.lineTo(point.x, point.y);
            }
          });
          ctx.closePath();
          ctx.fill();
        });

        // Reset composite operation
        ctx.globalCompositeOperation = "source-over";
      },
    });

    // Create and add the fog layer
    const fogLayer = new FogLayer();
    map.addLayer(fogLayer);
    fogLayerRef.current = fogLayer;

    // Cleanup
    return () => {
      if (fogLayerRef.current) {
        map.removeLayer(fogLayerRef.current);
      }
    };
  }, [map, exploredHexes]);

  return null;
}
