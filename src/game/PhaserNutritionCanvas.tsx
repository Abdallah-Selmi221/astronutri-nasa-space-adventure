import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { NutritionLabScene } from './scenes/NutritionLabScene';

export interface PhaserNutritionCanvasProps {
  className?: string;
}

/**
 * Mounts the Phaser 3 WebGL/Canvas Game Layer for the Nutrition Lab mission.
 * Strictly handles React 18 StrictMode cleanup and touch-action responsiveness.
 */
export const PhaserNutritionCanvas: React.FC<PhaserNutritionCanvasProps> = ({ className = '' }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    const parentEl = containerRef.current;
    if (!parentEl) return;

    // Destroy any stale instance before creating a fresh one
    if (gameRef.current) {
      gameRef.current.destroy(true);
      gameRef.current = null;
    }

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: parentEl,
      width: parentEl.clientWidth || 960,
      height: parentEl.clientHeight || 540,
      transparent: true,
      backgroundColor: '#04102c',
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
      },
      input: {
        activePointers: 2,
        touch: {
          capture: true
        }
      },
      scene: [NutritionLabScene]
    };

    const game = new Phaser.Game(config);
    gameRef.current = game;

    return () => {
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
