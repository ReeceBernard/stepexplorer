"use client";

import { Badge } from "@/components/ui/badge";
import { API_URL } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { getDeviceFingerprint } from "../../components/ComingSoonPage/utils";
import ErrorBoundary from "../../components/ErrorBoundary/ErrorBoundary";

const ExplorationMap = dynamic(
  () => import("../../components/ExplorationMap/ExplorationMap"),
  {
    ssr: false,
    loading: () => (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p>Loading your exploration map...</p>
        </div>
      </div>
    ),
  }
);

const Registration = dynamic(
  () => import("../../components/Registration/Registration"),
  {
    ssr: false,
    loading: () => (
      <div className="h-screen flex items-center justify-center bg-black">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    ),
  }
);

interface User {
  id: string;
  username: string;
  currentLatitude?: string;
  currentLongitude?: string;
  totalDistance: string;
  totalAreaUnlocked: string;
  createdAt: string;
}

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    setIsClient(true);

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const checkExistingUser = async () => {
    if (typeof window === "undefined" || !mountedRef.current) return;

    try {
      setChecking(true);
      setError(null);

      const deviceFingerprint = getDeviceFingerprint();

      const response = await fetch(`${API_URL}/users/authenticate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceFingerprint }),
      });

      if (!mountedRef.current) return;

      const data = await response.json();

      if (data.success && data.user) {
        setUser(data.user);
      }
    } catch (err) {
      console.error("Finding user error:", err);
      if (mountedRef.current) {
        setError("Failed to authenticate user");
      }
    } finally {
      if (mountedRef.current) {
        setChecking(false);
      }
    }
  };

  useEffect(() => {
    if (isClient) {
      checkExistingUser();
    }
  }, [isClient]);

  const handleUserRegistered = (newUser: User) => {
    if (mountedRef.current) {
      setUser(newUser);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-bold text-red-400">Error</h2>
          <p className="text-gray-400">{error}</p>
          <button
            onClick={() => {
              setError(null);
              checkExistingUser();
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (checking || !isClient) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <Badge className="border-blue-800 bg-blue-700 text-white backdrop-blur-sm px-4 py-2">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Checking Device...
          </Badge>
          <p className="text-gray-400">
            Please wait while we check your device...
          </p>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <ErrorBoundary>
        <ExplorationMap user={user} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <Registration onUserRegistered={handleUserRegistered} />
    </ErrorBoundary>
  );
}
