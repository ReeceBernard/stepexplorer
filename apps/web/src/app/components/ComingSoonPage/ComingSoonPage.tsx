"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Users, Zap } from "lucide-react";
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
} from "./utils";

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

      if (animationId) {
        cancelAnimationFrame(animationId);
      }

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
      // Scene setup
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
        powerPreference: "high-performance",
      });

      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 0);
      currentMount.appendChild(renderer.domElement);

      // Create Earth
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

      // Create clouds
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

      // Create atmosphere
      const atmosphereGeometry = new THREE.SphereGeometry(
        EARTH_CONFIG.atmosphere.radius,
        EARTH_CONFIG.atmosphere.segments,
        EARTH_CONFIG.atmosphere.segments
      );

      const atmosphereMaterial = new THREE.ShaderMaterial({
        vertexShader: `
          varying vec3 vNormal;
          varying vec3 vPosition;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            vPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec3 vNormal;
          varying vec3 vPosition;
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

      const rimLight = new THREE.DirectionalLight(0x4488ff, 0.3);
      rimLight.position.set(-5, 2, -3);
      scene.add(rimLight);

      camera.position.z = 7;

      // Store scene references
      sceneRef.current = {
        scene,
        camera,
        renderer,
        earth,
        clouds,
        atmosphere,
      };

      // Animation loop
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

      // Handle window resize
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

  // Ensure we're on the client before rendering Three.js
  useEffect(() => {
    setIsClient(true);
    setStars(generateStars());
  }, []);
  useThreeScene(mountRef, isClient);

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative">
      {/* Three.js Earth background - only render on client */}
      {isClient && <div ref={mountRef} className="absolute inset-0" />}

      <div className="absolute inset-0">
        {stars.map((star) => (
          <div
            key={star.key}
            className="absolute w-1 h-1 bg-white rounded-full animate-twinkle"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              animationDelay: `${star.delay}s`,
              animationDuration: `${star.duration}s`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        <div className="text-center space-y-8 max-w-4xl mx-auto">
          {/* Logo/Brand */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="p-3 rounded-full bg-blue-500/20 backdrop-blur-sm border border-blue-500/30">
              <MapPin className="w-8 h-8 text-blue-400" />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-green-400 bg-clip-text text-transparent">
              StepExplorer
            </h1>
          </div>

          {/* Coming Soon */}
          <div className="space-y-4">
            <Badge className="border-sky-800 bg-sky-700 text-white backdrop-blur-sm px-4 py-2">
              <Zap className="w-4 h-4 mr-2" />
              Coming Soon
            </Badge>

            <h2 className="text-2xl md:text-4xl font-semibold text-gray-200">
              Explore the world,{" "}
              <span className="bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                one step at a time
              </span>
            </h2>

            <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Discover a gamified walking experience that reveals the world as
              you explore. Like fog of war, but for real life adventures.
            </p>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 my-12">
            <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-colors">
              <CardContent className="p-6 text-center">
                <div className="w-8 h-8 text-blue-400 mx-auto mb-4">🗺️</div>
                <h3 className="font-semibold text-white mb-2">
                  Interactive Maps
                </h3>
                <p className="text-gray-400 text-sm">
                  Reveal the world as you walk and explore new territories
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-colors">
              <CardContent className="p-6 text-center">
                <Users className="w-8 h-8 text-green-400 mx-auto mb-4" />
                <h3 className="font-semibold text-white mb-2">
                  Social Exploration
                </h3>
                <p className="text-gray-400 text-sm">
                  Join friends and explore together in real-time
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-colors">
              <CardContent className="p-6 text-center">
                <Zap className="w-8 h-8 text-purple-400 mx-auto mb-4" />
                <h3 className="font-semibold text-white mb-2">
                  Gamified Walking
                </h3>
                <p className="text-gray-400 text-sm">
                  Turn every walk into an adventure with achievements
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Footer */}
          <div className="pt-8 text-gray-500 text-sm">
            <p>Built with ❤️ for explorers everywhere</p>
          </div>
        </div>
      </div>
    </div>
  );
}
