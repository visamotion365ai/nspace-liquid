"use client";

import { useEffect } from "react";
import { captureInstallPrompt } from "@/lib/install";

export function PwaBridge() {
  useEffect(() => {
    captureInstallPrompt();

    if ("serviceWorker" in navigator) {
      const register = () => {
        navigator.serviceWorker
          .register("/sw.js", { scope: "/" })
          .catch(() => undefined);
      };
      if (document.readyState === "complete") register();
      else window.addEventListener("load", register, { once: true });
    }
  }, []);

  return null;
}
