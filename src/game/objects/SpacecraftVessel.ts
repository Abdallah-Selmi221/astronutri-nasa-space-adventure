import Phaser from 'phaser';
import { soundManager } from '../../utils/sound';

export type HatchState = 'CLOSED' | 'OPENING' | 'OPEN' | 'CLOSING';

/**
 * Encapsulated OOP Spacecraft Vessel class.
 * Renders the canonical illustrated spaceship asset (`spaceship_canonical.png`)
 * with ion thruster plasma glow, pneumatic hatch ramp, and liftoff sequence.
 */
export class SpacecraftVessel {
  private scene: Phaser.Scene;
  public container: Phaser.GameObjects.Container;
  public hatchState: HatchState = 'CLOSED';

  private spaceshipSprite?: Phaser.GameObjects.Image;
  private hullGraphics: Phaser.GameObjects.Graphics;
  private hatchDoor: Phaser.GameObjects.Graphics;
  private thrusterGlow: Phaser.GameObjects.Arc;
  private onBoardedCallback?: () => void;

  constructor(scene: Phaser.Scene, x: number, y: number, scale: number = 1) {
    this.scene = scene;
    this.container = scene.add.container(x, y).setScale(scale);

    this.hullGraphics = scene.add.graphics();
    this.hatchDoor = scene.add.graphics();
    this.thrusterGlow = scene.add.circle(-75, 15, 18, 0x38bdf8, 0.45);

    this.container.add([this.thrusterGlow, this.hullGraphics, this.hatchDoor]);

    this.buildVessel();
    this.setupThrusters();
  }

  public static preloadAssets(scene: Phaser.Scene): void {
    if (!scene.textures.exists('canonical-spaceship')) {
      scene.load.image('canonical-spaceship', '/assets/art/spaceship_canonical.png');
    }
  }

  private buildVessel(): void {
    if (this.scene.textures.exists('canonical-spaceship')) {
      this.spaceshipSprite = this.scene.add.image(0, 0, 'canonical-spaceship');
      const maxDim = Math.max(this.spaceshipSprite.width || 300, this.spaceshipSprite.height || 300);
      const targetScale = 220 / maxDim;
      this.spaceshipSprite.setScale(targetScale);
      this.container.add(this.spaceshipSprite);
    } else {
      // Fallback sleek aerodynamic fuselage
      const g = this.hullGraphics;
      g.clear();
      g.fillStyle(0xf8fafc, 1);
      g.lineStyle(3, 0x0284c7, 1);
      g.beginPath();
      g.moveTo(90, 0);
      g.lineTo(40, -32);
      g.lineTo(-70, -32);
      g.lineTo(-85, -15);
      g.lineTo(-85, 25);
      g.lineTo(-65, 32);
      g.lineTo(40, 32);
      g.closePath();
      g.fillPath();
      g.strokePath();

      // Wing accents
      g.fillStyle(0x0284c7, 1);
      g.beginPath();
      g.moveTo(-20, -32);
      g.lineTo(-60, -65);
      g.lineTo(-75, -32);
      g.closePath();
      g.fillPath();

      g.beginPath();
      g.moveTo(-20, 32);
      g.lineTo(-60, 65);
      g.lineTo(-75, 32);
      g.closePath();
      g.fillPath();
    }

    this.renderHatch(0);
  }

  private renderHatch(openRatio: number): void {
    const hd = this.hatchDoor;
    hd.clear();

    if (openRatio > 0.05) {
      // Lighted interior ramp folding downward with amber guide lights
      hd.fillStyle(0xfde047, 0.9);
      hd.fillRoundedRect(-20, 10, 34, 18 * openRatio, 4);
      hd.lineStyle(2, 0xffffff, 1);
      hd.strokeRoundedRect(-20, 10, 34, 18 * openRatio, 4);
    }
  }

  private setupThrusters(): void {
    this.scene.tweens.add({
      targets: this.thrusterGlow,
      scale: { from: 0.8, to: 1.4 },
      alpha: { from: 0.35, to: 0.8 },
      duration: 750,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  public resetState(x: number = 120, y: number = -15, scale: number = 0.85): void {
    this.hatchState = 'CLOSED';
    this.container.setPosition(x, y);
    this.container.setScale(scale);
    this.container.setAlpha(1);
    this.renderHatch(0);
  }

  /**
   * Complete animated boarding sequence:
   * 1. Pneumatic unlatch & ramp descends.
   * 2. Player character walks into the hatch.
   * 3. Hatch seals shut.
   * 4. Liftoff tween and callback trigger!
   */
  public triggerBoardingSequence(onBoarded: () => void): void {
    if (this.hatchState !== 'CLOSED') {
      this.resetState();
    }
    this.hatchState = 'OPENING';
    this.onBoardedCallback = onBoarded;

    soundManager.playPneumatic();

    const tweenObj = { ratio: 0 };
    this.scene.tweens.add({
      targets: tweenObj,
      ratio: 1,
      duration: 450,
      ease: 'Back.easeOut',
      onUpdate: () => {
        this.renderHatch(tweenObj.ratio);
      },
      onComplete: () => {
        this.hatchState = 'OPEN';
        soundManager.playFanfare();

        this.scene.time.delayedCall(300, () => {
          this.closeHatchAndLaunch();
        });
      }
    });
  }

  private closeHatchAndLaunch(): void {
    this.hatchState = 'CLOSING';
    soundManager.playPneumatic();

    const tweenObj = { ratio: 1 };
    this.scene.tweens.add({
      targets: tweenObj,
      ratio: 0,
      duration: 350,
      ease: 'Quad.easeIn',
      onUpdate: () => {
        this.renderHatch(tweenObj.ratio);
      },
      onComplete: () => {
        this.hatchState = 'CLOSED';

        this.scene.tweens.add({
          targets: this.container,
          x: this.container.x + 140,
          y: this.container.y - 150,
          scale: 0.60,
          alpha: 0,
          duration: 750,
          ease: 'Cubic.easeIn',
          onComplete: () => {
            if (this.onBoardedCallback) {
              this.onBoardedCallback();
            }
          }
        });
      }
    });
  }

  public setPosition(x: number, y: number): this {
    this.container.setPosition(x, y);
    return this;
  }

  public destroy(): void {
    this.container.destroy();
  }
}
