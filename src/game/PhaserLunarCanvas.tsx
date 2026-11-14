import React, { useEffect, useRef } from 'react';
import type Phaser from 'phaser';

export interface PhaserLunarCanvasProps {
  className?: string;
}

/**
 * Mounts the Phaser 3 2.5D Lunar Outpost Scene at Shackleton Crater.
 * Features safe dimension guards and synchronous canvas detachment.
 */
export const PhaserLunarCanvas: React.FC<PhaserLunarCanvasProps> = ({ className = '' }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    const parentEl = containerRef.current;
    if (!parentEl) return;

    let cancelled = false;

    while (parentEl.firstChild) {
      parentEl.removeChild(parentEl.firstChild);
    }

    void (async () => {
      const [PhaserModule, { LunarOutpostScene }] = await Promise.all([
        import('phaser'),
        import('./scenes/LunarOutpostScene')
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

      const safeWidth = Math.max(720, containerRef.current.clientWidth || 1280);
      const safeHeight = Math.max(480, containerRef.current.clientHeight || 540);

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
          touch: { capture: true }
        },
        scene: [LunarOutpostScene]
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

export default PhaserLunarCanvas;
