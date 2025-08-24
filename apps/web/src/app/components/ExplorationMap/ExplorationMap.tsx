"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { API_URL } from "@/lib/utils";
import { Icon } from "leaflet";
import {
  ChevronDown,
  Filter,
  MapPin,
  Navigation,
  User,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

// Fix for default markers in react-leaflet
import "leaflet/dist/leaflet.css";
import Fog from "../Fog/Fog";

// Types (same as before)
interface ExploredArea {
  id: string;
  hexIndex: string;
  latitude: string;
  longitude: string;
  speed: string;
  explorationMethod: string;
  timeSpent: string;
  visitedAt: string;
}

interface ExplorationStats {
  totalVisits: number;
  uniqueHexes: number;
  estimatedDistanceMeters: number;
  totalAreaSqMeters: number;
  estimatedDistanceKm: string;
  estimatedDistanceMiles: string;
  totalAreaSqKm: string;
}

interface ExploredData {
  success: boolean;
  stats: ExplorationStats;
  recentVisits: ExploredArea[];
  hexagons: {
    type: string;
    features: Array<{
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
    }>;
  };
}

interface User {
  id: string;
  username: string;
  currentLatitude?: string;
  currentLongitude?: string;
}

interface ExplorationMapProps {
  user: User;
}

type MapMode = "personal" | "community";

// Custom map control component
function MapController({
  userLocation,
  isFollowing,
  onToggleFollow,
}: {
  userLocation: [number, number] | null;
  isFollowing: boolean;
  onToggleFollow: () => void;
}) {
  const map = useMap();

  // Follow user location
  useEffect(() => {
    if (isFollowing && userLocation) {
      map.setView(userLocation, map.getZoom());
    }
  }, [map, userLocation, isFollowing]);

  // Handle map events
  useMapEvents({
    dragstart: () => {
      if (isFollowing) {
        onToggleFollow();
      }
    },
  });

  return null;
}

// Main map component
export default function ExplorationMap({ user }: ExplorationMapProps) {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null
  );
  const [exploredData, setExploredData] = useState<ExploredData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(true);
  const [mapMode, setMapMode] = useState<MapMode>("personal");

  // Get user's current location from GPS
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);
        },
        (error) => {
          console.error("Geolocation error:", error);
          if (user.currentLatitude && user.currentLongitude) {
            setUserLocation([
              parseFloat(user.currentLatitude),
              parseFloat(user.currentLongitude),
            ]);
          } else {
            setUserLocation([40.7589, -73.9851]);
          }
        }
      );
    }
  }, [user]);

  // Load explored areas
  const loadExploredAreas = useCallback(async () => {
    try {
      const endpoint =
        mapMode === "personal"
          ? `${API_URL}/locations/explored`
          : `${API_URL}/locations/community`;

      const response = await fetch(endpoint, {
        headers: {
          "X-User-ID": user.id,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setExploredData(data);
      }
    } catch (error) {
      console.error("Error loading explored areas:", error);
    } finally {
      setLoading(false);
    }
  }, [user.id, mapMode]);

  useEffect(() => {
    loadExploredAreas();
  }, [loadExploredAreas]);

  // Auto-exploration polling
  useEffect(() => {
    if (!userLocation) return;

    const exploreCurrentLocation = async (location: [number, number]) => {
      try {
        const response = await fetch(`${API_URL}/locations`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-User-ID": user.id,
            "X-Latitude": location[0].toString(),
            "X-Longitude": location[1].toString(),
          },
          body: JSON.stringify({
            speed: 2.5,
            timeSpent: 30, // 30 seconds since last check
          }),
        });

        if (response.ok) {
          const result = await response.json();
          console.log("Location exploration result:", result);

          // Always reload explored areas after sending location
          // This ensures we get the latest hexagon data
          await loadExploredAreas();
        } else {
          console.error("Failed to explore location:", response.status);
        }
      } catch (error) {
        console.error("Error auto-exploring location:", error);
      }
    };

    // Initial exploration
    exploreCurrentLocation(userLocation);

    // Set up polling every 30 seconds
    const interval = setInterval(() => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            const newLocation: [number, number] = [latitude, longitude];
            setUserLocation(newLocation);
            exploreCurrentLocation(newLocation);
          },
          (error) => {
            console.error("Geolocation error during polling:", error);
            // If GPS fails, try with last known location
            exploreCurrentLocation(userLocation);
          },
          {
            enableHighAccuracy: false, // Save battery
            timeout: 10000,
            maximumAge: 30000, // Allow 30s old location data
          }
        );
      }
    }, 30000); // Poll every 30 seconds

    return () => {
      clearInterval(interval);
    };
  }, [userLocation, user.id, loadExploredAreas]);

  const centerOnUser = () => {
    if (userLocation) {
      setIsFollowing(true);
    }
  };

  if (loading || !userLocation) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p>Loading your exploration map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen relative">
      {/* Map Container */}
      <MapContainer
        center={userLocation}
        zoom={16}
        className="h-full w-full"
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />

        <Marker
          position={userLocation}
          icon={
            new Icon({
              iconUrl:
                "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='%23ef4444'%3E%3Ccircle cx='12' cy='12' r='8'/%3E%3Ccircle cx='12' cy='12' r='3' fill='white'/%3E%3C/svg%3E",
              iconSize: [24, 24],
              iconAnchor: [12, 12],
            })
          }
        >
          <Popup>
            <div className="text-center">
              <p className="font-semibold">You are here!</p>
              <p className="text-sm text-gray-600">
                {userLocation[0].toFixed(4)}, {userLocation[1].toFixed(4)}
              </p>
            </div>
          </Popup>
        </Marker>

        <MapController
          userLocation={userLocation}
          isFollowing={isFollowing}
          onToggleFollow={() => setIsFollowing(!isFollowing)}
        />

        {/* Fog Effect */}
        {exploredData && <Fog exploredHexes={exploredData.hexagons.features} />}
      </MapContainer>

      {/* Mobile Layout */}
      <div className="lg:hidden">
        {/* Mobile Top Stats - Clean and Clear */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1001]">
          <Card className="bg-black/90 backdrop-blur-sm border-gray-700 text-white">
            <CardContent className="px-4 py-2">
              {exploredData && (
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4 text-blue-400" />
                    <span className="font-medium">
                      {exploredData.stats.uniqueHexes}
                    </span>
                    <span className="text-xs text-gray-400">areas</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-medium">
                      {exploredData.stats.estimatedDistanceKm}
                    </span>
                    <span className="text-xs text-gray-400">km</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Mobile Map Mode Selector - Top Right */}
        <div className="absolute top-4 right-4 z-[1001]">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-black/90 backdrop-blur-sm border border-gray-700 text-white hover:bg-gray-800 p-2">
                {mapMode === "personal" ? (
                  <User className="h-4 w-4" />
                ) : (
                  <Users className="h-4 w-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-black/90 backdrop-blur-sm border-gray-700 text-white"
            >
              <DropdownMenuItem
                onClick={() => setMapMode("personal")}
                className="flex items-center gap-2 hover:bg-gray-800"
              >
                <User className="h-4 w-4" />
                My Exploration
                {mapMode === "personal" && (
                  <div className="ml-auto w-2 h-2 bg-blue-400 rounded-full" />
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setMapMode("community")}
                className="flex items-center gap-2 hover:bg-gray-800"
              >
                <Users className="h-4 w-4" />
                Community Map
                {mapMode === "community" && (
                  <div className="ml-auto w-2 h-2 bg-blue-400 rounded-full" />
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Mobile Bottom Controls - Just Follow Me */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-[1001]">
          <Button
            onClick={centerOnUser}
            variant={isFollowing ? "default" : "outline"}
            className={`${
              isFollowing
                ? "bg-gray-700 hover:bg-gray-600"
                : "bg-transparent border-gray-600 hover:bg-gray-800"
            } text-white rounded-full h-12 w-12 p-0 flex items-center justify-center shadow-lg bg-black/90 backdrop-blur-sm border border-gray-700`}
            title="Center map on my location"
          >
            <Navigation className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:block">
        {/* Desktop Top Left - Map Mode */}
        <div className="absolute top-4 left-4 z-[1001]">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-black/80 backdrop-blur-sm border border-gray-700 text-white hover:bg-gray-800 flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span>
                  {mapMode === "personal" ? "My Exploration" : "Community Map"}
                </span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-black/90 backdrop-blur-sm border-gray-700 text-white">
              <DropdownMenuItem
                onClick={() => setMapMode("personal")}
                className="flex items-center gap-2 hover:bg-gray-800"
              >
                <User className="h-4 w-4" />
                My Exploration
                {mapMode === "personal" && (
                  <div className="ml-auto w-2 h-2 bg-blue-400 rounded-full" />
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setMapMode("community")}
                className="flex items-center gap-2 hover:bg-gray-800"
              >
                <Users className="h-4 w-4" />
                Community Map
                {mapMode === "community" && (
                  <div className="ml-auto w-2 h-2 bg-blue-400 rounded-full" />
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Desktop Action Buttons - Just Follow Me */}
        <div className="absolute top-20 left-4 z-[1001]">
          <Button
            onClick={centerOnUser}
            variant={isFollowing ? "default" : "outline"}
            className="bg-gray-700 hover:bg-gray-600 text-white shadow-lg flex items-center justify-center min-w-0"
          >
            <Navigation className="h-4 w-4 flex-shrink-0" />
            <span className="ml-2 whitespace-nowrap">Follow Me</span>
          </Button>
        </div>

        {/* Desktop Stats Panel - Clean and Organized */}
        <Card className="absolute top-4 right-4 z-[1001] bg-black/80 backdrop-blur-sm border-gray-700 text-white min-w-[200px]">
          <CardContent className="p-4">
            {exploredData && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-gray-700 pb-2">
                  <MapPin className="h-4 w-4 text-blue-400" />
                  <span className="font-semibold text-sm">
                    Exploration Stats
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">
                      Areas explored:
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {exploredData.stats.uniqueHexes}
                    </Badge>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Distance:</span>
                    <Badge variant="secondary" className="text-xs">
                      {exploredData.stats.estimatedDistanceKm} km
                    </Badge>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Total visits:</span>
                    <span className="text-xs text-white">
                      {exploredData.stats.totalVisits}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Area covered:</span>
                    <span className="text-xs text-white">
                      {exploredData.stats.totalAreaSqKm} km²
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
