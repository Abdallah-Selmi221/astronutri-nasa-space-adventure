import React, { useEffect, useRef } from 'react';
import type Phaser from 'phaser';

export interface PhaserNutritionCanvasProps {
  className?: string;
}

/**
 * Mounts the Phaser 3 WebGL/Canvas Game Layer for the Nutrition Lab mission.
 * Dynamically imports Phaser 3 and NutritionLabScene on demand so the 1.5MB game engine
 * is never downloaded during Main Menu / Station Map navigation.
 */
export const PhaserNutritionCanvas: React.FC<PhaserNutritionCanvasProps> = ({ className = '' }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    const parentEl = containerRef.current;
    if (!parentEl) return;

    let cancelled = false;

    void (async () => {
      const [PhaserModule, { NutritionLabScene }] = await Promise.all([
        import('phaser'),
        import('./scenes/NutritionLabScene')
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
        width: containerRef.current.clientWidth || 960,
        height: containerRef.current.clientHeight || 540,
        transparent: true,
        backgroundColor: '#04102c',
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
        scene: [NutritionLabScene]
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
      className={`relative w-full h-full overflow-hidden rounded-3xl select-none touch-none ${className}`}
      style={{ touchAction: 'none' }}
    />
  );
};
