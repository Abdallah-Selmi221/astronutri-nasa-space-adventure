import { useEffect, useState } from 'react';

export type GraphicsQuality = 'low' | 'medium' | 'ultra';

export interface DisplayControlSettings {
  cameraSensitivity: number; // 0.2 .. 2.0 (default 1.15)
  cameraSmoothness: number; // 0.2 .. 1.0 (default 0.78)
  graphicsQuality: GraphicsQuality;
}

const STORAGE_KEY = 'astronutri_display_settings_v1';

export const DEFAULT_DISPLAY_SETTINGS: DisplayControlSettings = {
  cameraSensitivity: 1.15,
  cameraSmoothness: 0.78,
  graphicsQuality: 'medium'
};

const listeners = new Set<(s: DisplayControlSettings) => void>();

function clampSettings(raw: Partial<DisplayControlSettings>): DisplayControlSettings {
  const sens = Number(raw.cameraSensitivity);
  const smooth = Number(raw.cameraSmoothness);
  const quality: GraphicsQuality =
    raw.graphicsQuality === 'low' || raw.graphicsQuality === 'ultra' ? raw.graphicsQuality : 'medium';

  return {
    cameraSensitivity: Number.isFinite(sens) ? Math.max(0.2, Math.min(2.0, Number(sens.toFixed(2)))) : 1.15,
    cameraSmoothness: Number.isFinite(smooth) ? Math.max(0.2, Math.min(1.0, Number(smooth.toFixed(2)))) : 0.78,
    graphicsQuality: quality
  };
}

let currentSettings: DisplayControlSettings = (() => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return clampSettings(JSON.parse(saved) as Partial<DisplayControlSettings>);
      }
    }
  } catch {
    // Ignore storage read errors in restricted WebViews
  }
  return { ...DEFAULT_DISPLAY_SETTINGS };
})();

export function getDisplaySettings(): DisplayControlSettings {
  return currentSettings;
}

export function updateDisplaySettings(patch: Partial<DisplayControlSettings>): DisplayControlSettings {
  currentSettings = clampSettings({ ...currentSettings, ...patch });
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(currentSettings));
    }
  } catch {
    // Ignore storage errors
  }
  listeners.forEach((cb) => cb(currentSettings));
  return currentSettings;
}

export function useDisplaySettings(): [DisplayControlSettings, typeof updateDisplaySettings] {
  const [settings, setSettings] = useState<DisplayControlSettings>(() => getDisplaySettings());

  useEffect(() => {
    const onChange = (next: DisplayControlSettings) => setSettings(next);
    listeners.add(onChange);
    return () => {
      listeners.delete(onChange);
    };
  }, []);

  return [settings, updateDisplaySettings];
}

export function getQualityRenderConfig(quality: GraphicsQuality): {
  maxPixelRatio: number;
  shadowsEnabled: boolean;
  targetFpsIntervalMs: number;
  particleDensity: number;
} {
  if (quality === 'low') {
    return {
      maxPixelRatio: 1.0,
      shadowsEnabled: false,
      targetFpsIntervalMs: 33, // ~30fps battery saver
      particleDensity: 0.45
    };
  }
  if (quality === 'ultra') {
    return {
      maxPixelRatio: 1.75,
      shadowsEnabled: true,
      targetFpsIntervalMs: 0, // uncapped 60fps+
      particleDensity: 1.0
    };
  }
  return {
    maxPixelRatio: 1.35,
    shadowsEnabled: false,
    targetFpsIntervalMs: 0,
    particleDensity: 0.78
  };
}

export async function toggleFullscreenLandscape(): Promise<boolean> {
  if (typeof document === 'undefined') return false;
  try {
    if (!document.fullscreenElement) {
      const rootEl = document.documentElement;
      if (rootEl.requestFullscreen) {
        await rootEl.requestFullscreen();
      }
      const scr = window.screen as unknown as {
        orientation?: { lock?: (mode: string) => Promise<void> };
      };
      await scr?.orientation?.lock?.('landscape').catch(() => {});
      return true;
    }
    if (document.exitFullscreen) {
      await document.exitFullscreen();
    }
    return false;
  } catch {
    return Boolean(document.fullscreenElement);
  }
}
