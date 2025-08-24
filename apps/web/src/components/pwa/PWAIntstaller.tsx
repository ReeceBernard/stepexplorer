"use client";

import { Button } from "@/components/ui/button";
import { Download, Share, X } from "lucide-react";
import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/service-worker.js")
          .then((registration) => {
            console.log("SW registered: ", registration);
          })
          .catch((registrationError) => {
            console.log("SW registration failed: ", registrationError);
          });
      });
    }

    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Detect if already installed (standalone mode)
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    setIsStandalone(standalone);

    // Handle beforeinstallprompt event (Chrome/Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Don't show install prompt immediately on iOS
      if (!iOS && !standalone) {
        setShowInstallPrompt(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Show iOS install prompt if conditions are met
    if (
      iOS &&
      !standalone &&
      !localStorage.getItem("iosInstallPromptDismissed")
    ) {
      // Wait a bit before showing to not be intrusive
      setTimeout(() => {
        setShowInstallPrompt(true);
      }, 3000);
    }

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // iOS - show instructions
      setShowIOSInstructions(true);
      return;
    }

    // Chrome/Edge - use native prompt
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      console.log("User accepted the install prompt");
    } else {
      console.log("User dismissed the install prompt");
    }

    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const dismissPrompt = () => {
    setShowInstallPrompt(false);
    if (isIOS) {
      localStorage.setItem("iosInstallPromptDismissed", "true");
    }
  };

  const dismissIOSInstructions = () => {
    setShowIOSInstructions(false);
    localStorage.setItem("iosInstallPromptDismissed", "true");
  };

  // Don't show anything if already installed
  if (isStandalone) {
    return null;
  }

  return (
    <>
      {/* Install Prompt */}
      {showInstallPrompt && (
        <div className="fixed bottom-0 left-0 right-0 z-[1002] p-4">
          <div className="bg-black/95 backdrop-blur-sm border border-gray-700 rounded-lg p-4 text-white shadow-2xl">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Download className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Install ExploreMap</h3>
                  <p className="text-sm text-gray-300">
                    Get the full app experience with offline maps
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={dismissPrompt}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleInstallClick}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isIOS ? "Install Instructions" : "Install App"}
              </Button>
              <Button
                variant="outline"
                onClick={dismissPrompt}
                className="border-gray-600 text-gray-300 hover:text-white hover:border-gray-500"
              >
                Later
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* iOS Installation Instructions */}
      {showIOSInstructions && (
        <div className="fixed inset-0 z-[1003] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl p-6 max-w-md w-full text-white shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Install ExploreMap</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={dismissIOSInstructions}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-4">
              <p className="text-gray-300 text-sm">
                To install this app on your iPhone:
              </p>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                    1
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Tap the Share button</span>
                    <Share className="h-4 w-4 text-blue-400" />
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                    2
                  </div>
                  <span className="text-sm">
                    Scroll down and tap {`"Add to Home Screen"`}
                  </span>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                    3
                  </div>
                  <span className="text-sm">
                    Tap {`"Add"`} to install the app
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-700">
                <Button
                  onClick={dismissIOSInstructions}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  Got it!
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
