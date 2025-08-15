"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { API_URL } from "@/lib/utils";
import { Loader2, MapPin, Users, Zap } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  ANIMATION_CONFIG,
  createBumpTexture,
  createCloudsTexture,
  createEarthTexture,
  createSpecularTexture,
  EARTH_CONFIG,
  generateStars,
  getDeviceFingerprint,
} from "./utils";

interface User {
  id: string;
  username: string;
  totalDistance: string;
  totalAreaUnlocked: string;
  createdAt: string;
}

const useThreeScene = (
  mountRef: React.RefObject<HTMLDivElement | null>,
  isClient: boolean
) => {
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    earth: THREE.Mesh;
    clouds: THREE.Mesh;
    atmosphere: THREE.Mesh;
    animationId?: number;
  } | null>(null);

  const cleanup = useCallback(() => {
    if (sceneRef.current) {
      const { renderer, animationId } = sceneRef.current;
      if (animationId) cancelAnimationFrame(animationId);
      if (mountRef.current?.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      sceneRef.current = null;
    }
  }, [mountRef]);

  useEffect(() => {
    if (!isClient || !mountRef.current) return;

    const currentMount = mountRef.current;

    try {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      );
      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
      });

      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 0);
      currentMount.appendChild(renderer.domElement);

      // Earth
      const earthGeometry = new THREE.SphereGeometry(
        EARTH_CONFIG.radius,
        EARTH_CONFIG.segments,
        EARTH_CONFIG.segments
      );
      const earthMaterial = new THREE.MeshPhongMaterial({
        map: createEarthTexture(),
        bumpMap: createBumpTexture(),
        bumpScale: 0.15,
        specularMap: createSpecularTexture(),
        shininess: 200,
      });
      const earth = new THREE.Mesh(earthGeometry, earthMaterial);
      scene.add(earth);

      // Clouds
      const cloudsGeometry = new THREE.SphereGeometry(
        EARTH_CONFIG.clouds.radius,
        EARTH_CONFIG.clouds.segments,
        EARTH_CONFIG.clouds.segments
      );
      const cloudsMaterial = new THREE.MeshLambertMaterial({
        map: createCloudsTexture(),
        transparent: true,
        opacity: EARTH_CONFIG.clouds.opacity,
      });
      const clouds = new THREE.Mesh(cloudsGeometry, cloudsMaterial);
      scene.add(clouds);

      // Atmosphere
      const atmosphereGeometry = new THREE.SphereGeometry(
        EARTH_CONFIG.atmosphere.radius,
        EARTH_CONFIG.atmosphere.segments,
        EARTH_CONFIG.atmosphere.segments
      );
      const atmosphereMaterial = new THREE.ShaderMaterial({
        vertexShader: `
          varying vec3 vNormal;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec3 vNormal;
          void main() {
            float intensity = pow(0.6 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
            vec3 glow = vec3(0.2, 0.5, 1.0) * intensity;
            gl_FragColor = vec4(glow, 1.0) * intensity;
          }
        `,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        transparent: true,
      });
      const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
      scene.add(atmosphere);

      // Lighting
      const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
      scene.add(ambientLight);
      const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
      directionalLight.position.set(8, 4, 6);
      scene.add(directionalLight);

      camera.position.z = 7;

      sceneRef.current = { scene, camera, renderer, earth, clouds, atmosphere };

      const animate = () => {
        if (!sceneRef.current) return;
        const { earth, clouds, atmosphere, renderer, scene, camera } =
          sceneRef.current;
        sceneRef.current.animationId = requestAnimationFrame(animate);
        earth.rotation.y += ANIMATION_CONFIG.earth;
        clouds.rotation.y += ANIMATION_CONFIG.clouds;
        atmosphere.rotation.y += ANIMATION_CONFIG.atmosphere;
        renderer.render(scene, camera);
      };
      animate();

      const handleResize = () => {
        if (!sceneRef.current) return;
        const { camera, renderer } = sceneRef.current;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      };
      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
        cleanup();
      };
    } catch (error) {
      console.error("Error initializing Three.js scene:", error);
      cleanup();
    }
  }, [isClient, cleanup, mountRef]);

  return cleanup;
};

export default function ComingSoonPage() {
  const [isClient, setIsClient] = useState(false);
  const mountRef = useRef<HTMLDivElement>(null);
  const [stars, setStars] = useState<
    { x: number; y: number; delay: number; duration: number; key: number }[]
  >([]);

  // Registration state
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showRegistration, setShowRegistration] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    setIsClient(true);
    setStars(generateStars());
    checkExistingUser();
  }, []);

  const checkExistingUser = async () => {
    if (typeof window === "undefined") return;

    try {
      setChecking(true);
      const deviceFingerprint = getDeviceFingerprint();

      const response = await fetch(`${API_URL}/users/authenticate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceFingerprint }),
      });

      const data = await response.json();

      if (data.success && data.user) {
        setUser(data.user);
      }
    } catch (err) {
      console.error("Finding user error:", err);
    } finally {
      setChecking(false);
    }
  };

  useThreeScene(mountRef, isClient);

  const registerUser = async () => {
    if (typeof window === "undefined") return;

    try {
      setLoading(true);
      setError("");
      const deviceFingerprint = getDeviceFingerprint();

      const response = await fetch(`${API_URL}/users/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceFingerprint }),
      });

      const data = await response.json();

      if (data.success) {
        setUser(data.user);
      } else {
        setError(data.error || "Registration failed");
      }
    } catch (err) {
      setError("Network error - is your API running?");
      console.error("Registration error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative">
      {isClient && <div ref={mountRef} className="absolute inset-0" />}

      <div className="absolute inset-0">
        {stars.map((star) => (
          <div
            key={star.key}
            className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              animationDelay: `${star.delay}s`,
              animationDuration: `${star.duration}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen py-8 px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-6 sm:space-y-8 max-w-4xl mx-auto w-full">
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-6 sm:mb-8">
            <div className="p-2 sm:p-3 rounded-full bg-blue-500/20 backdrop-blur-sm border border-blue-500/30">
              <MapPin className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400" />
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-green-400 bg-clip-text text-transparent">
              StepExplorer
            </h1>
          </div>

          <div className="space-y-4 px-2 sm:px-0">
            {checking ? (
              <div className="space-y-4">
                <Badge className="border-blue-800 bg-blue-700 text-white backdrop-blur-sm px-4 py-2">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Checking Device...
                </Badge>
              </div>
            ) : (
              <>
                <Badge className="border-sky-800 bg-sky-700 text-white backdrop-blur-sm px-4 py-2">
                  <Zap className="w-4 h-4 mr-2" />
                  Coming Soon
                </Badge>

                <h2 className="text-xl sm:text-2xl md:text-4xl font-semibold text-gray-200 px-2">
                  Explore the world,{" "}
                  <span className="bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                    one step at a time
                  </span>
                </h2>

                <p className="text-base sm:text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed px-2">
                  Discover a gamified walking experience that reveals the world
                  as you explore. Like fog of war, but for real life adventures.
                </p>
              </>
            )}
          </div>
          {user && (
            <div className="text-center mt-6">
              <Badge className="bg-green-700 text-white px-4 py-2">
                Welcome back,{" "}
                <span className="font-semibold">{user.username}</span>!
              </Badge>
              <p className="text-sm text-gray-400 mt-2">
                We are working hard to bring you the full experience. Stay
                tuned!
              </p>
            </div>
          )}
          {!checking && !user && (
            <div className="space-y-4 px-2 sm:px-0">
              {!showRegistration ? (
                <Button
                  onClick={() => setShowRegistration(true)}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 sm:px-8 rounded-lg transition-all transform hover:scale-105 backdrop-blur-sm text-sm sm:text-base"
                >
                  Register Your Device Now
                </Button>
              ) : (
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-4 sm:p-6 max-w-md mx-auto">
                  {error && (
                    <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 mb-4">
                      <p className="text-red-200 text-sm">{error}</p>
                    </div>
                  )}

                  <Button
                    onClick={registerUser}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-all flex items-center justify-center text-sm sm:text-base"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        Creating Explorer...
                      </>
                    ) : (
                      "Start Your Journey"
                    )}
                  </Button>

                  <p className="text-xs text-gray-400 mt-3 text-center">
                    Anonymous registration • No email required
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 my-8 sm:my-12 px-2 sm:px-0">
            <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-colors">
              <CardContent className="p-4 sm:p-6 text-center">
                <div className="w-8 h-8 text-blue-400 mx-auto mb-4">🗺️</div>
                <h3 className="font-semibold text-white mb-2 text-sm sm:text-base">
                  Interactive Maps
                </h3>
                <p className="text-gray-400 text-xs sm:text-sm">
                  Reveal the world as you walk and explore new territories
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-colors">
              <CardContent className="p-4 sm:p-6 text-center">
                <Users className="w-8 h-8 text-green-400 mx-auto mb-4" />
                <h3 className="font-semibold text-white mb-2 text-sm sm:text-base">
                  Social Exploration
                </h3>
                <p className="text-gray-400 text-xs sm:text-sm">
                  Join friends and explore together in real-time
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-colors sm:col-span-2 md:col-span-1">
              <CardContent className="p-4 sm:p-6 text-center">
                <Zap className="w-8 h-8 text-purple-400 mx-auto mb-4" />
                <h3 className="font-semibold text-white mb-2 text-sm sm:text-base">
                  Gamified Walking
                </h3>
                <p className="text-gray-400 text-xs sm:text-sm">
                  Turn every walk into an adventure with achievements
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="pt-6 sm:pt-8 text-gray-500 text-xs sm:text-sm px-2 sm:px-0">
            <p>Built with ❤️ for explorers everywhere</p>
            {user && (
              <p className="mt-2 text-xs">
                More features coming soon! Your journey continues. 🚶‍♂️
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
