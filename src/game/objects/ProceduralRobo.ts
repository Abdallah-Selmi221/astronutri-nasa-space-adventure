import Phaser from 'phaser';
import { PhaserRoboState } from '../EventBus';
import { dialogueManager } from '../../utils/geminiTTS';

/**
 * ProceduralRobo — Phaser 3 Procedural Character Rig (Polished v2.1)
 *
 * Uses the extracted full-body static PNG poses (`robo/*`) and brings them
 * to life via smooth Phaser Tweens (Squash, Stretch, Sinusoidal Bobbing, Banking
 * Rotation, Hovering), Jetpack Particle Trails, Natural Visor Blinking, and
 * smoothed (lerped) Web Audio AnalyserNode voice-wave & nod synchronization
 * with ZERO rapid full-body texture swapping or head-overlay clipping.
 */
export class ProceduralRobo extends Phaser.GameObjects.Container {
  private homeX: number;
  private homeY: number;
  private baseScale: number = 0.76;

  private currentState: PhaserRoboState = 'IDLE';
  private shadowEllipse: Phaser.GameObjects.Ellipse;
  private auraGlow: Phaser.GameObjects.Arc;
  private voiceWaveRing: Phaser.GameObjects.Arc;
  private rigContainer: Phaser.GameObjects.Container;
  private bodySprite: Phaser.GameObjects.Image;
  private visorBlinkGraphics: Phaser.GameObjects.Graphics;
  private badgeIcon: Phaser.GameObjects.Image;

  private jetpackEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private starBurstEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

  private hoverTween: Phaser.Tweens.Tween | null = null;
  private breatheTween: Phaser.Tweens.Tween | null = null;
  private actionTween: Phaser.Tweens.Tween | null = null;
  private blinkTimer: Phaser.Time.TimerEvent | null = null;
  private revertStateTimer: Phaser.Time.TimerEvent | null = null;

  private isBlinking: boolean = false;
  private smoothedAmplitude: number = 0;

  public static preloadAssets(scene: Phaser.Scene): void {
    scene.load.image('robo-idle', '/assets/sprites/robo/robo-idle.png');
    scene.load.image('robo-talking', '/assets/sprites/robo/robo-talking.png');
    scene.load.image('robo-happy', '/assets/sprites/robo/robo-happy.png');
    scene.load.image('robo-pointing', '/assets/sprites/robo/robo-pointing.png');
    scene.load.image('robo-celebrating', '/assets/sprites/robo/robo-celebrating.png');
    scene.load.image('robo-thinking', '/assets/sprites/robo/robo-thinking.png');

    scene.load.image('robo-star-particle', '/assets/sprites/collectibles/star-tier-1.png');
    scene.load.image('robo-badge-ok', '/assets/sprites/collectibles/badge-check-shield.png');
    scene.load.image('robo-badge-warn', '/assets/sprites/collectibles/badge-cross-circle.png');
  }

  constructor(scene: Phaser.Scene, x: number, y: number, scale = 0.76) {
    super(scene, x, y);
    this.homeX = x;
    this.homeY = y;
    this.baseScale = scale;

    if (!scene.textures.exists('robo-thruster-dot')) {
      const g = scene.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0x38bdf8, 1);
      g.fillCircle(12, 12, 12);
      g.fillStyle(0xe0f2fe, 1);
      g.fillCircle(12, 12, 6);
      g.generateTexture('robo-thruster-dot', 24, 24);
      g.destroy();
    }

    // 1. Dynamic contact shadow beneath Robo (scales inversely with hover height)
    this.shadowEllipse = scene.add.ellipse(0, 102 * scale, 114 * scale, 24 * scale, 0x020617, 0.55);
    this.add(this.shadowEllipse);

    // 2. Ambient holographic aura behind Robo
    this.auraGlow = scene.add.circle(0, -6 * scale, 84 * scale, 0x22d3ee, 0.14);
    this.auraGlow.setBlendMode(Phaser.BlendModes.ADD);
    this.add(this.auraGlow);

    // 3. Smooth Voice-Wave Ring (pulses with smoothed audio amplitude during speech)
    this.voiceWaveRing = scene.add.circle(0, -34 * scale, 56 * scale, 0x38bdf8, 0);
    this.voiceWaveRing.setStrokeStyle(3, 0x38bdf8, 0);
    this.voiceWaveRing.setBlendMode(Phaser.BlendModes.ADD);
    this.add(this.voiceWaveRing);

    // 4. Inner Rig Container (receives smooth squash, stretch, bobbing, and banking tweens)
    this.rigContainer = scene.add.container(0, 0);
    this.rigContainer.setScale(this.baseScale);
    this.add(this.rigContainer);

    // 5. Jetpack Thruster Particle Trail Emitter
    this.jetpackEmitter = scene.add.particles(x, y + 42 * scale, 'robo-thruster-dot', {
      speedY: { min: 35, max: 90 },
      speedX: { min: -18, max: 18 },
      scale: { start: 0.5 * scale, end: 0.04 },
      alpha: { start: 0.7, end: 0 },
      lifespan: { min: 360, max: 640 },
      frequency: 55,
      blendMode: Phaser.BlendModes.ADD
    });
    this.jetpackEmitter.setDepth(this.depth - 1);

    // 6. Star Celebration Burst Emitter
    this.starBurstEmitter = scene.add.particles(x, y - 30 * scale, 'robo-star-particle', {
      speed: { min: 90, max: 220 },
      angle: { min: 200, max: 340 },
      scale: { start: 0.52 * scale, end: 0.08 },
      alpha: { start: 1, end: 0 },
      rotate: { min: -180, max: 180 },
      gravityY: 180,
      lifespan: 820,
      emitting: false
    });
    this.starBurstEmitter.setDepth(this.depth + 5);

    // 7. Base Body Sprite (single unified full-body pose per state — zero helmet clipping!)
    this.bodySprite = scene.add.image(0, 0, 'robo-idle');
    this.bodySprite.setOrigin(0.5, 0.55);
    this.rigContainer.add(this.bodySprite);

    // 8. Clean Visor Eyelid Blink Graphics (drawn strictly inside the dark visor glass area)
    this.visorBlinkGraphics = scene.add.graphics();
    this.visorBlinkGraphics.fillStyle(0x030c26, 0.96);
    this.visorBlinkGraphics.fillRoundedRect(-44, -74, 92, 42, 16);
    this.visorBlinkGraphics.lineStyle(3.5, 0x38bdf8, 0.95);
    this.visorBlinkGraphics.beginPath();
    this.visorBlinkGraphics.arc(-20, -52, 11, 0.15, Math.PI - 0.15, false);
    this.visorBlinkGraphics.strokePath();
    this.visorBlinkGraphics.beginPath();
    this.visorBlinkGraphics.arc(22, -52, 11, 0.15, Math.PI - 0.15, false);
    this.visorBlinkGraphics.strokePath();
    this.visorBlinkGraphics.setVisible(false);
    this.rigContainer.add(this.visorBlinkGraphics);

    // 9. Floating Status Badge Icon (Checkmark or Hazard Cross)
    this.badgeIcon = scene.add.image(66, -86, 'robo-badge-ok');
    this.badgeIcon.setScale(0.55);
    this.badgeIcon.setAlpha(0);
    this.rigContainer.add(this.badgeIcon);

    this.bodySprite.setInteractive({ useHandCursor: true });
    this.bodySprite.on('pointerdown', () => {
      this.pulseHappyBounce();
      this.emit('robo-clicked');
    });

    scene.add.existing(this);

    this.startContinuousIdleTweens();
    this.scheduleNextBlink();
  }

  public setHomeTransform(x: number, y: number, scale: number): void {
    this.homeX = x;
    this.homeY = y;
    this.baseScale = scale;
    this.setPosition(x, y);
    this.rigContainer.setScale(scale);
    this.shadowEllipse.setPosition(0, 102 * scale);
    this.shadowEllipse.setSize(114 * scale, 24 * scale);
    this.auraGlow.setRadius(84 * scale);
    this.voiceWaveRing.setPosition(0, -34 * scale);
    this.voiceWaveRing.setRadius(56 * scale);
    if (this.jetpackEmitter) {
      this.jetpackEmitter.setPosition(x, y + 42 * scale);
    }
    if (this.starBurstEmitter) {
      this.starBurstEmitter.setPosition(x, y - 30 * scale);
    }
  }

  private startContinuousIdleTweens(): void {
    if (this.hoverTween) this.hoverTween.stop();
    if (this.breatheTween) this.breatheTween.stop();

    // Smooth sinusoidal zero-G bobbing + inverse contact shadow scaling
    this.hoverTween = this.scene.tweens.add({
      targets: this.rigContainer,
      y: { from: -7, to: 7 },
      duration: 1900,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
      onUpdate: () => {
        const normalizedHeight = (7 - this.rigContainer.y) / 14;
        this.shadowEllipse.setScale(1.04 - normalizedHeight * 0.2);
        this.shadowEllipse.setAlpha(0.6 - normalizedHeight * 0.2);
        if (this.jetpackEmitter) {
          this.jetpackEmitter.setPosition(
            this.x + this.rigContainer.x,
            this.y + this.rigContainer.y + 42 * this.baseScale
          );
        }
      }
    });

    // Gentle organic breathing squash & stretch
    this.breatheTween = this.scene.tweens.add({
      targets: this.rigContainer,
      scaleX: { from: this.baseScale * 0.988, to: this.baseScale * 1.018 },
      scaleY: { from: this.baseScale * 1.014, to: this.baseScale * 0.986 },
      duration: 1900,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });
  }

  private scheduleNextBlink(): void {
    if (!this.scene) return;
    const delay = Phaser.Math.Between(3100, 5000);
    this.blinkTimer = this.scene.time.delayedCall(delay, () => {
      if (!this.scene || !this.active) return;
      if (this.currentState === 'IDLE') {
        this.triggerBlink();
      }
      this.scheduleNextBlink();
    });
  }

  private triggerBlink(): void {
    if (this.isBlinking || this.currentState !== 'IDLE') return;
    this.isBlinking = true;
    this.visorBlinkGraphics.setVisible(true);

    this.scene.time.delayedCall(135, () => {
      this.isBlinking = false;
      this.visorBlinkGraphics.setVisible(false);
    });
  }

  public pulseHappyBounce(): void {
    this.scene.tweens.add({
      targets: this.rigContainer,
      scaleX: this.baseScale * 1.1,
      scaleY: this.baseScale * 0.91,
      duration: 110,
      yoyo: true,
      ease: 'Quad.easeOut'
    });
  }

  private transitionTextureSmoothly(textureKey: string): void {
    if (this.bodySprite.texture.key === textureKey) return;
    this.bodySprite.setTexture(textureKey);
    this.scene.tweens.add({
      targets: this.bodySprite,
      scaleX: { from: 0.94, to: 1.0 },
      scaleY: { from: 1.06, to: 1.0 },
      duration: 160,
      ease: 'Sine.easeOut'
    });
  }

  public setRoboState(newState: PhaserRoboState, targetWorldX?: number, targetWorldY?: number): void {
    if (!this.scene) return;
    this.currentState = newState;

    if (this.actionTween) {
      this.actionTween.stop();
      this.actionTween = null;
    }
    if (this.revertStateTimer) {
      this.revertStateTimer.remove(false);
      this.revertStateTimer = null;
    }

    this.rigContainer.setAngle(0);
    this.visorBlinkGraphics.setVisible(false);

    switch (newState) {
      case 'IDLE': {
        this.transitionTextureSmoothly('robo-idle');
        this.auraGlow.setFillStyle(0x22d3ee, 0.14);
        this.voiceWaveRing.setStrokeStyle(3, 0x38bdf8, 0);
        if (this.jetpackEmitter) this.jetpackEmitter.setFrequency(55);
        this.scene.tweens.add({
          targets: this,
          x: this.homeX,
          y: this.homeY,
          duration: 420,
          ease: 'Sine.easeOut'
        });
        break;
      }

      case 'FLYING': {
        this.transitionTextureSmoothly('robo-pointing');
        this.auraGlow.setFillStyle(0x38bdf8, 0.26);
        if (this.jetpackEmitter) this.jetpackEmitter.setFrequency(20);

        const destX =
          targetWorldX !== undefined
            ? Phaser.Math.Clamp(this.homeX + (targetWorldX - this.homeX) * 0.22, this.homeX - 65, this.homeX + 45)
            : this.homeX - 20;
        const destY =
          targetWorldY !== undefined
            ? Phaser.Math.Clamp(this.homeY + (targetWorldY - this.homeY) * 0.14, this.homeY - 32, this.homeY + 28)
            : this.homeY - 14;

        const bankAngle = destX < this.x ? -8 : 7;
        this.actionTween = this.scene.tweens.add({
          targets: this.rigContainer,
          angle: bankAngle,
          duration: 260,
          ease: 'Sine.easeOut'
        });

        this.scene.tweens.add({
          targets: this,
          x: destX,
          y: destY,
          duration: 340,
          ease: 'Quad.easeOut'
        });
        break;
      }

      case 'TALKING': {
        this.transitionTextureSmoothly('robo-talking');
        this.auraGlow.setFillStyle(0x38bdf8, 0.22);
        if (this.jetpackEmitter) this.jetpackEmitter.setFrequency(42);
        this.actionTween = this.scene.tweens.add({
          targets: this.rigContainer,
          angle: { from: -2.2, to: 2.2 },
          duration: 420,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
        break;
      }

      case 'HAPPY':
      case 'CELEBRATING': {
        this.transitionTextureSmoothly(newState === 'CELEBRATING' ? 'robo-celebrating' : 'robo-happy');
        this.auraGlow.setFillStyle(0x10b981, 0.32);
        if (this.jetpackEmitter) this.jetpackEmitter.setFrequency(24);

        this.badgeIcon.setTexture('robo-badge-ok');
        this.badgeIcon.setAlpha(1);
        this.badgeIcon.setScale(0.1);
        this.scene.tweens.add({
          targets: this.badgeIcon,
          scale: 0.6,
          alpha: { from: 1, to: 0 },
          y: { from: -80, to: -118 },
          duration: 1100,
          ease: 'Back.easeOut'
        });

        if (this.starBurstEmitter) {
          this.starBurstEmitter.setPosition(this.x, this.y - 35 * this.baseScale);
          this.starBurstEmitter.explode(newState === 'CELEBRATING' ? 18 : 10);
        }

        this.scene.tweens.chain({
          targets: this.rigContainer,
          tweens: [
            {
              scaleX: this.baseScale * 1.12,
              scaleY: this.baseScale * 0.88,
              y: 8,
              duration: 95,
              ease: 'Quad.easeOut'
            },
            {
              scaleX: this.baseScale * 0.91,
              scaleY: this.baseScale * 1.12,
              y: -26,
              angle: -4,
              duration: 200,
              ease: 'Back.easeOut'
            },
            {
              scaleX: this.baseScale,
              scaleY: this.baseScale,
              y: 0,
              angle: 0,
              duration: 260,
              ease: 'Bounce.easeOut'
            }
          ]
        });

        this.revertStateTimer = this.scene.time.delayedCall(2000, () => {
          this.setRoboState(dialogueManager.getIsSpeaking() ? 'TALKING' : 'IDLE');
        });
        break;
      }

      case 'WARNING': {
        this.transitionTextureSmoothly('robo-thinking');
        this.auraGlow.setFillStyle(0xf43f5e, 0.35);

        this.badgeIcon.setTexture('robo-badge-warn');
        this.badgeIcon.setAlpha(1);
        this.badgeIcon.setScale(0.1);
        this.scene.tweens.add({
          targets: this.badgeIcon,
          scale: 0.65,
          alpha: { from: 1, to: 0 },
          y: { from: -80, to: -118 },
          duration: 1200,
          ease: 'Back.easeOut'
        });

        this.actionTween = this.scene.tweens.add({
          targets: this.rigContainer,
          x: { from: -9, to: 9 },
          angle: { from: -5.5, to: 5.5 },
          duration: 70,
          yoyo: true,
          repeat: 4,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            this.rigContainer.setX(0);
            this.rigContainer.setAngle(0);
          }
        });

        this.revertStateTimer = this.scene.time.delayedCall(1900, () => {
          this.setRoboState(dialogueManager.getIsSpeaking() ? 'TALKING' : 'IDLE');
        });
        break;
      }
    }
  }

  /**
   * Smooth per-frame voice synchronization using exponential moving average (lerp).
   * Prevents any rapid body shaking or texture flickering while speaking.
   */
  public preUpdate(time: number, _delta: number): void {
    const isSpeaking = dialogueManager.getIsSpeaking();
    const isLoading = dialogueManager.getIsLoading();

    if (isSpeaking) {
      if (this.currentState === 'IDLE') {
        this.setRoboState('TALKING');
      }

      const rawAmp = dialogueManager.getAudioAmplitude();
      const targetAmp = rawAmp > 0.03 ? rawAmp : 0.22 + Math.sin(time * 0.014) * 0.14;
      this.smoothedAmplitude = Phaser.Math.Linear(this.smoothedAmplitude, targetAmp, 0.22);

      // Gentle voice-wave halo & micro-breathing modulation (max ±2.8% — zero body jitter!)
      const pulse = 1 + this.smoothedAmplitude * 0.028;
      this.bodySprite.setScale(1 / pulse, pulse);
      this.voiceWaveRing.setScale(1 + this.smoothedAmplitude * 0.42);
      this.voiceWaveRing.setStrokeStyle(3, 0x38bdf8, 0.25 + this.smoothedAmplitude * 0.55);
    } else {
      this.smoothedAmplitude = Phaser.Math.Linear(this.smoothedAmplitude, 0, 0.25);
      this.bodySprite.setScale(1, 1);
      this.voiceWaveRing.setStrokeStyle(3, 0x38bdf8, 0);

      if (isLoading && this.currentState === 'IDLE') {
        this.transitionTextureSmoothly('robo-thinking');
      } else if (this.currentState === 'TALKING' && !isSpeaking) {
        this.setRoboState('IDLE');
      }
    }
  }

  public override destroy(fromScene?: boolean): void {
    if (this.blinkTimer) this.blinkTimer.remove(false);
    if (this.revertStateTimer) this.revertStateTimer.remove(false);
    if (this.jetpackEmitter) this.jetpackEmitter.destroy();
    if (this.starBurstEmitter) this.starBurstEmitter.destroy();
    super.destroy(fromScene);
  }
}
