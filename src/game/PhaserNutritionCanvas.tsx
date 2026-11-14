import React, { useEffect, useRef } from 'react';
import type Phaser from 'phaser';

export interface PhaserNutritionCanvasProps {
  className?: string;
}

/**
 * Mounts the Phaser 3 WebGL/Canvas Game Layer for the Nutrition Lab mission.
 * Features safe dimension guards and synchronous canvas detachment to eliminate P0 WebGL collisions.
 */
export const PhaserNutritionCanvas: React.FC<PhaserNutritionCanvasProps> = ({ className = '' }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    const parentEl = containerRef.current;
    if (!parentEl) return;

    let cancelled = false;

    // Purge any stale child canvas before mounting a fresh engine
    while (parentEl.firstChild) {
      parentEl.removeChild(parentEl.firstChild);
    }

    void (async () => {
      const [PhaserModule, { NutritionLabScene }] = await Promise.all([
        import('phaser'),
        import('./scenes/NutritionLabScene')
      ]);

      if (cancelled || !containerRef.current) return;

      const PhaserEngine = PhaserModule.default || PhaserModule;

      if (gameRef.current) {
        try {
          gameRef.current.destroy(true, false);
        } catch {
          // ignore
        }
        gameRef.current = null;
      }

      // Safe positive dimension calculation
      const safeWidth = Math.max(720, containerRef.current.clientWidth || 960);
      const safeHeight = Math.max(480, containerRef.current.clientHeight || 540);

      const config: Phaser.Types.Core.GameConfig = {
        type: PhaserEngine.AUTO,
        parent: containerRef.current,
        width: safeWidth,
        height: safeHeight,
        transparent: true,
        backgroundColor: '#04102c',
        scale: {
          mode: PhaserEngine.Scale.RESIZE,
          autoCenter: PhaserEngine.Scale.CENTER_BOTH
        },
        physics: {
          default: 'arcade',
          arcade: {
            gravity: { x: 0, y: 0 },
            debug: false
          }
        },
        input: {
          activePointers: 2,
          touch: {
            capture: true
          }
        },
        scene: [NutritionLabScene]
      };

      gameRef.current = new PhaserEngine.Game(config);
    })();

    return () => {
      cancelled = true;
      if (gameRef.current) {
        try {
          gameRef.current.destroy(true, false);
        } catch {
          // ignore
        }
        gameRef.current = null;
      }
      if (parentEl) {
        while (parentEl.firstChild) {
          parentEl.removeChild(parentEl.firstChild);
        }
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full min-h-[460px] overflow-hidden rounded-3xl select-none touch-none ${className}`}
      style={{ touchAction: 'none' }}
    />
  );
};

export default PhaserNutritionCanvas;
