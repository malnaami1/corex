import { useEffect, useState } from "react";

declare global {
  interface Window {
    google: any;
    __corexGmapsCb?: () => void;
  }
}

let loadPromise: Promise<typeof window.google> | null = null;

function loadGoogleMaps(apiKey: string): Promise<typeof window.google> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.google?.maps?.visualization) return Promise.resolve(window.google);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const cbName = "__corexGmapsCb";
    window[cbName] = () => {
      resolve(window.google);
    };
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=visualization&callback=${cbName}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      loadPromise = null; // allow retry on error
      reject(new Error("Failed to load Google Maps"));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}

export function useGoogleMaps(): { google: typeof window.google | null; error: string | null } {
  const [google, setGoogle] = useState<typeof window.google | null>(
    typeof window !== "undefined" && window.google?.maps?.visualization ? window.google : null,
  );
  const [error, setError] = useState<string | null>(null);

  const apiKey = import.meta.env.VITE_GMAPS_KEY as string;

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps(apiKey)
      .then((g) => {
        if (!cancelled) setGoogle(g);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { google, error };
}