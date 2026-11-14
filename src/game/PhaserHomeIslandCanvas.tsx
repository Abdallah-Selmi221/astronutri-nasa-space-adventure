import React, { useEffect, useRef } from 'react';
import type Phaser from 'phaser';

export interface PhaserHomeIslandCanvasProps {
  className?: string;
}

/**
 * Mounts the Phaser 3 2.5D Game Layer for the Home Island exploration world.
 * Features safe dimension guards and synchronous canvas detachment to eliminate P0 WebGL collisions.
 */
export const PhaserHomeIslandCanvas: React.FC<PhaserHomeIslandCanvasProps> = ({ className = '' }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    const parentEl = containerRef.current;
    if (!parentEl) return;

    let cancelled = false;

    // Purge any stale child canvas before mounting
    while (parentEl.firstChild) {
      parentEl.removeChild(parentEl.firstChild);
    }

    void (async () => {
      const [PhaserModule, { HomeIslandScene }] = await Promise.all([
        import('phaser'),
        import('./scenes/HomeIslandScene')
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

      const safeWidth = Math.max(320, containerRef.current.clientWidth || 390);
      const safeHeight = Math.max(420, containerRef.current.clientHeight || 640);

      const config: Phaser.Types.Core.GameConfig = {
        type: PhaserEngine.AUTO,
        parent: containerRef.current,
        width: safeWidth,
        height: safeHeight,
        transparent: true,
        scale: {
          mode: PhaserEngine.Scale.RESIZE,
          autoCenter: PhaserEngine.Scale.CENTER_BOTH
        },
        input: {
          activePointers: 2,
          touch: {
            capture: true
          }
        },
        scene: [HomeIslandScene]
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
      className={`relative w-full h-full min-h-[460px] overflow-hidden select-none touch-none ${className}`}
      style={{ touchAction: 'none' }}
    />
  );
};

export default PhaserHomeIslandCanvas;
