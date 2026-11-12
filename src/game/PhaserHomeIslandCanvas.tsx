import React, { useEffect, useRef } from 'react';
import type Phaser from 'phaser';

export interface PhaserHomeIslandCanvasProps {
  className?: string;
}

/**
 * Mounts the Phaser 3 2.5D Game Layer for the Home Island exploration world.
 * Dynamically imports Phaser 3 and HomeIslandScene so the game world is rendered
 * and controlled completely by the game engine.
 */
export const PhaserHomeIslandCanvas: React.FC<PhaserHomeIslandCanvasProps> = ({ className = '' }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    const parentEl = containerRef.current;
    if (!parentEl) return;

    let cancelled = false;

    void (async () => {
      const [PhaserModule, { HomeIslandScene }] = await Promise.all([
        import('phaser'),
        import('./scenes/HomeIslandScene')
      ]);

      if (cancelled || !containerRef.current) return;

      const PhaserEngine = PhaserModule.default || PhaserModule;

      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }

      const config: Phaser.Types.Core.GameConfig = {
        type: PhaserEngine.AUTO,
        parent: containerRef.current,
        width: containerRef.current.clientWidth || 1280,
        height: containerRef.current.clientHeight || 720,
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
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden select-none touch-none ${className}`}
      style={{ touchAction: 'none' }}
    />
  );
};
export default PhaserHomeIslandCanvas;
