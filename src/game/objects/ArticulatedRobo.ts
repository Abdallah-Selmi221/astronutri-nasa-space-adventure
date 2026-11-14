import Phaser from 'phaser';
import { PhaserRoboState } from '../EventBus';
import { dialogueManager } from '../../utils/geminiTTS';

export type LocomotionMode = 'EARTH_1G' | 'TRANSIT_0G' | 'LUNAR_016G';

export interface RoboEmoteOptions {
  eyes: 'NORMAL' | 'BLINK' | 'HAPPY' | 'SURPRISED' | 'WARNING' | 'THINKING';
  mouth?: boolean;
}

/**
 * ArticulatedRobo — Premium Articulated 2.5D Character Rig for Phaser 3
 *
 * Implements:
 * 1. Kinematic velocity-coupled gait (\Delta \phi = \frac{|\Delta x|}{K_{stride}} \cdot 2\pi) with ZERO foot sliding.
 * 2. Multi-world locomotion modes: Earth (1.0g walk), Transit (0.0g float & thrusters), Lunar (0.16g kangaroo hops).
 * 3. Organic multi-layered idle breathing (torso & head counter-bobbing).
 * 4. Procedural visor emote atlas (Normal, Blink, Happy, Surprised, Warning, Thinking).
 * 5. Dynamic Web Audio amplitude sync for speech nodding & mouth pulsing.
 * 6. Smooth transitions between IDLE, WALKING, RUNNING, WAVING, POINTING, CELEBRATING, and WARNING.
 */
export class ArticulatedRobo extends Phaser.GameObjects.Container {
  public homeX: number;
  public homeY: number;
  public baseScale: number;

  public currentState: PhaserRoboState = 'IDLE';
  public locomotionMode: LocomotionMode = 'EARTH_1G';

  // Hierarchical Container Tree
  private shadowEllipse!: Phaser.GameObjects.Ellipse;
  private auraGlow!: Phaser.GameObjects.Arc;
  private voiceWaveRing!: Phaser.GameObjects.Arc;
  private rigContainer!: Phaser.GameObjects.Container;

  // Body Parts
  private torsoContainer!: Phaser.GameObjects.Container;
  private torsoSprite!: Phaser.GameObjects.Image;
  private chestBadge!: Phaser.GameObjects.Image;

  private headContainer!: Phaser.GameObjects.Container;
  private headSprite!: Phaser.GameObjects.Image;
  private visorGraphics!: Phaser.GameObjects.Graphics;
  private antennaGlow!: Phaser.GameObjects.Arc;

  private leftArmContainer!: Phaser.GameObjects.Container;
  private leftArmSprite!: Phaser.GameObjects.Image;
  private rightArmContainer!: Phaser.GameObjects.Container;
  private rightArmSprite!: Phaser.GameObjects.Image;

  private leftLegContainer!: Phaser.GameObjects.Container;
  private leftLegSprite!: Phaser.GameObjects.Image;
  private rightLegContainer!: Phaser.GameObjects.Container;
  private rightLegSprite!: Phaser.GameObjects.Image;

  // Particle Emitters
  private jetpackEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private starBurstEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

  // Animation Timers & States
  private walkPhase: number = 0;
  private strideConstant: number = 70; // pixels per full walk cycle
  private lastX: number = 0;
  private lastY: number = 0;
  private currentEmote: RoboEmoteOptions = { eyes: 'NORMAL' };
  private blinkTimer: Phaser.Time.TimerEvent | null = null;
  private isBlinking: boolean = false;
  private smoothedAmplitude: number = 0;
  private breathePhase: number = 0;
  private waveTween: Phaser.Tweens.Tween | null = null;
  private hopTween: Phaser.Tweens.Tween | null = null;

  public static preloadAssets(scene: Phaser.Scene): void {
    // Generate modular procedural rig parts textures if not already present
    ArticulatedRobo.generateRigTextures(scene);

    // Preload particle & badge assets
    if (!scene.textures.exists('robo-star-particle')) {
      scene.load.image('robo-star-particle', '/assets/sprites/collectibles/star-tier-1.png');
    }
    if (!scene.textures.exists('robo-badge-ok')) {
      scene.load.image('robo-badge-ok', '/assets/sprites/collectibles/badge-check-shield.png');
    }
    if (!scene.textures.exists('robo-badge-warn')) {
      scene.load.image('robo-badge-warn', '/assets/sprites/collectibles/badge-cross-circle.png');
    }
  }

  /**
   * Generates crisp, modular vector textures for Robo's body components
   */
  public static generateRigTextures(scene: Phaser.Scene): void {
    // 1. Torso texture (Chassis with turquoise belt & collar)
    if (!scene.textures.exists('robo-rig-torso')) {
      const g = scene.make.graphics({ x: 0, y: 0 });
      // Main ceramic white body
      g.fillStyle(0xf8fafc, 1);
      g.fillRoundedRect(4, 4, 64, 76, 20);
      // Soft ambient shadow on lower torso
      g.fillStyle(0xe2e8f0, 0.6);
      g.fillRoundedRect(4, 48, 64, 32, { tl: 0, tr: 0, bl: 20, br: 20 });
      // Turquoise cyan chest stripe
      g.fillStyle(0x38bdf8, 1);
      g.fillRoundedRect(16, 20, 40, 14, 6);
      // Coral orange power accent
      g.fillStyle(0xf97316, 1);
      g.fillCircle(36, 52, 6);
      // Border outline
      g.lineStyle(3, 0x0284c7, 0.85);
      g.strokeRoundedRect(4, 4, 64, 76, 20);
      g.generateTexture('robo-rig-torso', 72, 84);
      g.destroy();
    }

    // 2. Head texture (Round helmet with ear modules)
    if (!scene.textures.exists('robo-rig-head')) {
      const g = scene.make.graphics({ x: 0, y: 0 });
      // Ear pods
      g.fillStyle(0x0ea5e9, 1);
      g.fillRoundedRect(2, 28, 12, 24, 6);
      g.fillRoundedRect(76, 28, 12, 24, 6);
      // Main helmet
      g.fillStyle(0xffffff, 1);
      g.fillRoundedRect(10, 8, 70, 64, 26);
      // Top antenna base & stalk
      g.fillStyle(0x94a3b8, 1);
      g.fillRect(42, 0, 6, 10);
      // Visor frame dark interior
      g.fillStyle(0x0f172a, 1);
      g.fillRoundedRect(18, 18, 54, 38, 16);
      // Glass visor reflection shine
      g.lineStyle(2, 0x38bdf8, 0.9);
      g.strokeRoundedRect(18, 18, 54, 38, 16);
      g.generateTexture('robo-rig-head', 90, 80);
      g.destroy();
    }

    // 3. Arm texture (Sleek capsule limb)
    if (!scene.textures.exists('robo-rig-arm')) {
      const g = scene.make.graphics({ x: 0, y: 0 });
      // Shoulder joint ball
      g.fillStyle(0xf97316, 1);
      g.fillCircle(12, 12, 8);
      // Upper & lower arm capsule
      g.fillStyle(0xf1f5f9, 1);
      g.fillRoundedRect(6, 12, 12, 34, 6);
      // Hand / claw
      g.fillStyle(0x38bdf8, 1);
      g.fillCircle(12, 48, 8);
      g.lineStyle(2, 0x0284c7, 0.8);
      g.strokeCircle(12, 48, 8);
      g.generateTexture('robo-rig-arm', 24, 60);
      g.destroy();
    }

    // 4. Leg texture (Jointed astronaut leg with convex rounded foot)
    if (!scene.textures.exists('robo-rig-leg')) {
      const g = scene.make.graphics({ x: 0, y: 0 });
      // Hip joint ball
      g.fillStyle(0x0284c7, 1);
      g.fillCircle(14, 10, 7);
      // Leg cylinder
      g.fillStyle(0xf8fafc, 1);
      g.fillRoundedRect(6, 10, 16, 32, 6);
      // Foot boot (Convex cap)
      g.fillStyle(0x0369a1, 1);
      g.fillRoundedRect(2, 38, 24, 14, 6);
      // Bottom rubber tread
      g.fillStyle(0x0f172a, 1);
      g.fillRect(4, 50, 20, 4);
      g.generateTexture('robo-rig-leg', 28, 58);
      g.destroy();
    }

    // 5. Thruster flame dot
    if (!scene.textures.exists('robo-thruster-dot')) {
      const g = scene.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0x38bdf8, 1);
      g.fillCircle(12, 12, 12);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(12, 12, 5);
      g.generateTexture('robo-thruster-dot', 24, 24);
      g.destroy();
    }
  }

  constructor(scene: Phaser.Scene, x: number, y: number, scale = 0.76) {
    super(scene, x, y);
    this.homeX = x;
    this.homeY = y;
    this.lastX = x;
    this.lastY = y;
    this.baseScale = scale;

    ArticulatedRobo.generateRigTextures(scene);

    // 1. Dynamic Contact Shadow
    this.shadowEllipse = scene.add.ellipse(0, 56 * scale, 84 * scale, 22 * scale, 0x030712, 0.45);
    this.add(this.shadowEllipse);

    // 2. Ambient Holographic Aura
    this.auraGlow = scene.add.circle(0, -6 * scale, 68 * scale, 0x38bdf8, 0.14);
    this.auraGlow.setBlendMode(Phaser.BlendModes.ADD);
    this.add(this.auraGlow);

    // 3. Audio Voice Wave Ring
    this.voiceWaveRing = scene.add.circle(0, -28 * scale, 48 * scale, 0x38bdf8, 0);
    this.voiceWaveRing.setStrokeStyle(3, 0x38bdf8, 0);
    this.voiceWaveRing.setBlendMode(Phaser.BlendModes.ADD);
    this.add(this.voiceWaveRing);

    // 4. Main Hierarchical Rig Container
    this.rigContainer = scene.add.container(0, 0);
    this.rigContainer.setScale(this.baseScale);
    this.add(this.rigContainer);

    // BUILD HIERARCHICAL BODY TREE
    // A. Left & Right Legs (Layer depth: background of torso)
    this.leftLegContainer = scene.add.container(-14, 18);
    this.leftLegSprite = scene.add.image(0, 20, 'robo-rig-leg').setOrigin(0.5, 0.2);
    this.leftLegContainer.add(this.leftLegSprite);
    this.rigContainer.add(this.leftLegContainer);

    this.rightLegContainer = scene.add.container(14, 18);
    this.rightLegSprite = scene.add.image(0, 20, 'robo-rig-leg').setOrigin(0.5, 0.2);
    this.rightLegContainer.add(this.rightLegSprite);
    this.rigContainer.add(this.rightLegContainer);

    // B. Left Arm (Background arm)
    this.leftArmContainer = scene.add.container(-32, -8);
    this.leftArmSprite = scene.add.image(0, 16, 'robo-rig-arm').setOrigin(0.5, 0.15);
    this.leftArmContainer.add(this.leftArmSprite);
    this.rigContainer.add(this.leftArmContainer);

    // C. Torso Container
    this.torsoContainer = scene.add.container(0, -2);
    this.torsoSprite = scene.add.image(0, 0, 'robo-rig-torso').setOrigin(0.5, 0.5);
    this.torsoContainer.add(this.torsoSprite);

    this.chestBadge = scene.add.image(0, 18, 'robo-badge-ok').setScale(0.3).setVisible(false);
    this.torsoContainer.add(this.chestBadge);
    this.rigContainer.add(this.torsoContainer);

    // D. Right Arm (Foreground arm)
    this.rightArmContainer = scene.add.container(32, -8);
    this.rightArmSprite = scene.add.image(0, 16, 'robo-rig-arm').setOrigin(0.5, 0.15);
    this.rightArmContainer.add(this.rightArmSprite);
    this.rigContainer.add(this.rightArmContainer);

    // E. Head Container (Top layer)
    this.headContainer = scene.add.container(0, -44);
    this.headSprite = scene.add.image(0, 0, 'robo-rig-head').setOrigin(0.5, 0.5);
    this.headContainer.add(this.headSprite);

    // Visor Dynamic Emote Display
    this.visorGraphics = scene.add.graphics({ x: 0, y: 0 });
    this.headContainer.add(this.visorGraphics);
    this.drawVisorEmote();

    // Antenna Light Tip
    this.antennaGlow = scene.add.circle(0, -40, 5, 0x38bdf8, 0.85);
    this.antennaGlow.setBlendMode(Phaser.BlendModes.ADD);
    this.headContainer.add(this.antennaGlow);

    this.rigContainer.add(this.headContainer);

    // 5. Thruster Particle Emitter
    this.jetpackEmitter = scene.add.particles(x, y + 36 * scale, 'robo-thruster-dot', {
      speedY: { min: 40, max: 100 },
      speedX: { min: -18, max: 18 },
      scale: { start: 0.45 * scale, end: 0.04 },
      alpha: { start: 0.75, end: 0 },
      lifespan: { min: 320, max: 580 },
      frequency: 45,
      blendMode: Phaser.BlendModes.ADD
    });
    this.jetpackEmitter.setDepth(this.depth - 1);
    this.jetpackEmitter.stop();

    // Setup Interactive Click Trigger
    this.setSize(90 * scale, 130 * scale);
    this.setInteractive({ useHandCursor: true });
    this.on('pointerdown', () => {
      this.playCheerfulBounce();
      this.emit('robo-clicked');
    });

    // Start Natural Eye Blink Cycle
    this.startBlinkTimer();

    // Add to Scene Display List
    scene.add.existing(this);
  }

  /**
   * Main Pre-update loop: drives zero-foot-sliding locomotion, audio amplitude sync, and breathing
   */
  public preUpdate(time: number, delta: number): void {
    const dt = delta / 1000;

    // 1. Organic Idle Breathing (Subtle counter-bobbing between torso and head)
    this.breathePhase += dt * 3.2;
    const breatheOffset = Math.sin(this.breathePhase) * 2;
    this.torsoContainer.y = -2 + breatheOffset * 0.7;
    this.headContainer.y = -44 + breatheOffset * 1.3;
    this.antennaGlow.setAlpha(0.6 + Math.sin(this.breathePhase * 1.5) * 0.4);

    // 2. Velocity-Coupled Locomotion (Zero Foot-Sliding)
    const dx = this.x - this.lastX;
    const dy = this.y - this.lastY;
    const distanceMoved = Math.sqrt(dx * dx + dy * dy);

    if (distanceMoved > 0.1) {
      // Facing direction
      if (Math.abs(dx) > 0.05) {
        const targetFlip = dx < 0;
        this.rigContainer.setScale(targetFlip ? -this.baseScale : this.baseScale, this.baseScale);
      }

      if (this.locomotionMode === 'LUNAR_016G') {
        // Lunar Kangaroo Hop Mode (High buoyant parabolic bounce)
        this.walkPhase += (distanceMoved / this.strideConstant) * Math.PI * 1.5;
        const hopY = -Math.abs(Math.sin(this.walkPhase)) * 24;
        this.rigContainer.y = hopY;
        this.shadowEllipse.setScale(
          (1 - Math.abs(hopY) / 60) * this.baseScale,
          (1 - Math.abs(hopY) / 60) * this.baseScale
        );
        this.leftLegSprite.rotation = Math.sin(this.walkPhase) * 0.35;
        this.rightLegSprite.rotation = Math.sin(this.walkPhase) * 0.35; // Both legs hop together in 0.16g
      } else if (this.locomotionMode === 'TRANSIT_0G') {
        // Zero-G Transit Float Mode (Thrusters active, gentle banking)
        this.walkPhase += dt * 2.5;
        this.rigContainer.rotation = (dx / (distanceMoved || 1)) * 0.18;
        this.leftLegSprite.rotation = Math.sin(this.walkPhase) * 0.15;
        this.rightLegSprite.rotation = Math.cos(this.walkPhase) * 0.15;
        this.jetpackEmitter?.start();
      } else {
        // Earth 1.0G Bipedal Walk (Counter-stride phase)
        this.walkPhase += (distanceMoved / this.strideConstant) * Math.PI * 2;
        const legAngle = Math.sin(this.walkPhase) * 0.55;
        this.leftLegSprite.rotation = legAngle;
        this.rightLegSprite.rotation = -legAngle;

        // Counter-arm swing unless waving/pointing
        if (this.currentState !== 'WAVING' && this.currentState !== 'TALKING') {
          this.leftArmSprite.rotation = -legAngle * 0.65;
          this.rightArmSprite.rotation = legAngle * 0.65;
        }

        // Slight pelvic bobbing
        this.rigContainer.y = -Math.abs(Math.sin(this.walkPhase)) * 3;
      }
    } else {
      // Halted: Smoothly return limbs to neutral A-pose
      this.leftLegSprite.rotation = Phaser.Math.Linear(this.leftLegSprite.rotation, 0, 0.18);
      this.rightLegSprite.rotation = Phaser.Math.Linear(this.rightLegSprite.rotation, 0, 0.18);
      this.rigContainer.y = Phaser.Math.Linear(this.rigContainer.y, 0, 0.18);
      this.rigContainer.rotation = Phaser.Math.Linear(this.rigContainer.rotation, 0, 0.18);

      if (this.currentState !== 'WAVING' && this.currentState !== 'TALKING') {
        this.leftArmSprite.rotation = Phaser.Math.Linear(this.leftArmSprite.rotation, 0, 0.18);
        this.rightArmSprite.rotation = Phaser.Math.Linear(this.rightArmSprite.rotation, 0, 0.18);
      }
    }

    this.lastX = this.x;
    this.lastY = this.y;

    // 3. Audio Speech Nodding & Voice Wave Ring Sync
    if (this.currentState === 'TALKING') {
      const rawAmp = dialogueManager.getAudioAmplitude();
      this.smoothedAmplitude = Phaser.Math.Linear(this.smoothedAmplitude, rawAmp, 0.25);
      const waveRadius = (44 + this.smoothedAmplitude * 42) * this.baseScale;
      this.voiceWaveRing.setRadius(waveRadius);
      this.voiceWaveRing.setStrokeStyle(3, 0x38bdf8, 0.45 + this.smoothedAmplitude * 0.5);
      this.headContainer.rotation = Math.sin(time * 0.012) * (0.04 + this.smoothedAmplitude * 0.09);
    } else {
      this.smoothedAmplitude = Phaser.Math.Linear(this.smoothedAmplitude, 0, 0.15);
      this.voiceWaveRing.setStrokeStyle(3, 0x38bdf8, 0);
      if (this.currentState !== 'CELEBRATING') {
        this.headContainer.rotation = Phaser.Math.Linear(this.headContainer.rotation, 0, 0.15);
      }
    }

    // Update Particle Position with Rig Base
    if (this.jetpackEmitter) {
      this.jetpackEmitter.setPosition(this.x, this.y + 40 * this.baseScale);
    }
  }

  /**
   * Sets Robo's high-level state
   */
  public setRoboState(newState: PhaserRoboState, targetX?: number, targetY?: number): void {
    if (this.currentState === newState && !targetX && !targetY) return;
    this.currentState = newState;

    // Clean up active one-shot tweens
    if (this.waveTween) {
      this.waveTween.stop();
      this.waveTween = null;
    }

    switch (newState) {
      case 'IDLE':
        this.setEmote({ eyes: 'NORMAL' });
        this.chestBadge.setVisible(false);
        this.jetpackEmitter?.stop();
        break;

      case 'WALKING':
        this.setEmote({ eyes: 'NORMAL' });
        this.chestBadge.setVisible(false);
        this.jetpackEmitter?.stop();
        break;

      case 'RUNNING':
        this.setEmote({ eyes: 'NORMAL' });
        this.chestBadge.setVisible(false);
        this.jetpackEmitter?.start();
        break;

      case 'WAVING':
        this.setEmote({ eyes: 'HAPPY' });
        this.playWavingArm(true);
        break;

      case 'POINTING':
        this.setEmote({ eyes: 'NORMAL' });
        if (targetX !== undefined && targetY !== undefined) {
          this.pointAt(targetX, targetY);
        }
        break;

      case 'FLYING':
        this.setEmote({ eyes: 'NORMAL' });
        this.jetpackEmitter?.start();
        if (targetX !== undefined && targetY !== undefined) {
          const angle = Phaser.Math.Angle.Between(this.x, this.y, targetX, targetY);
          this.rigContainer.rotation = (angle - Math.PI / 2) * 0.25;
          this.scene.tweens.add({
            targets: this,
            x: targetX,
            y: targetY,
            duration: 800,
            ease: 'Power2'
          });
        }
        break;

      case 'TALKING':
        this.setEmote({ eyes: 'HAPPY', mouth: true });
        this.chestBadge.setVisible(false);
        this.playWavingArm(false);
        break;

      case 'HAPPY':
        this.setEmote({ eyes: 'HAPPY' });
        this.chestBadge.setTexture('robo-badge-ok').setVisible(true);
        this.playCheerfulBounce();
        break;

      case 'WARNING':
        this.setEmote({ eyes: 'WARNING' });
        this.chestBadge.setTexture('robo-badge-warn').setVisible(true);
        this.playWarningShake();
        break;

      case 'CELEBRATING':
        this.setEmote({ eyes: 'HAPPY' });
        this.chestBadge.setTexture('robo-badge-ok').setVisible(true);
        this.playCelebrationSpin();
        break;
    }
  }

  /**
   * Sets locomotion physics mode (Earth 1g, Transit 0g, Lunar 0.16g)
   */
  public setLocomotionMode(mode: LocomotionMode): void {
    this.locomotionMode = mode;
    if (mode === 'TRANSIT_0G') {
      this.jetpackEmitter?.start();
    } else {
      this.jetpackEmitter?.stop();
    }
  }

  /**
   * Point arm towards world coordinate
   */
  public pointAt(worldX: number, worldY: number): void {
    const angle = Phaser.Math.Angle.Between(this.x + this.rightArmContainer.x, this.y + this.rightArmContainer.y, worldX, worldY);
    this.scene.tweens.add({
      targets: this.rightArmSprite,
      rotation: angle - Math.PI / 2,
      duration: 350,
      ease: 'Back.easeOut'
    });
    this.setEmote({ eyes: 'NORMAL' });
  }

  /**
   * Play friendly waving arm animation
   */
  public playWavingArm(repeat = true): void {
    if (this.waveTween) this.waveTween.stop();
    this.rightArmSprite.rotation = -Math.PI * 0.75;
    this.waveTween = this.scene.tweens.add({
      targets: this.rightArmSprite,
      rotation: -Math.PI * 0.55,
      duration: 260,
      yoyo: true,
      repeat: repeat ? -1 : 3,
      ease: 'Sine.easeInOut'
    });
  }

  /**
   * Play cheerful celebratory bounce
   */
  public playCheerfulBounce(): void {
    this.scene.tweens.add({
      targets: this.rigContainer,
      y: -24,
      scaleX: this.baseScale * 0.92,
      scaleY: this.baseScale * 1.12,
      duration: 220,
      yoyo: true,
      ease: 'Quad.easeOut'
    });
  }

  /**
   * Play warning flinch & horizontal shake
   */
  public playWarningShake(): void {
    this.scene.tweens.add({
      targets: this.rigContainer,
      x: 6,
      duration: 60,
      yoyo: true,
      repeat: 4,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.rigContainer.x = 0;
      }
    });
  }

  /**
   * Play 360 degree spin celebrating victory
   */
  public playCelebrationSpin(): void {
    this.scene.tweens.add({
      targets: this.rigContainer,
      rotation: Math.PI * 2,
      y: -36,
      duration: 750,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.rigContainer.rotation = 0;
        this.rigContainer.y = 0;
      }
    });
  }

  /**
   * Sets dynamic visor emote
   */
  public setEmote(options: RoboEmoteOptions): void {
    this.currentEmote = options;
    this.drawVisorEmote();
  }

  /**
   * Renders the dynamic visor display: eyes, blink, and audio mouth wave
   */
  private drawVisorEmote(): void {
    this.visorGraphics.clear();
    const isBlink = this.isBlinking || this.currentEmote.eyes === 'BLINK';

    if (isBlink) {
      // Blinking closed eye slits
      this.visorGraphics.fillStyle(0x38bdf8, 1);
      this.visorGraphics.fillRoundedRect(-16, -4, 12, 3, 1.5);
      this.visorGraphics.fillRoundedRect(4, -4, 12, 3, 1.5);
      return;
    }

    switch (this.currentEmote.eyes) {
      case 'HAPPY':
        // Happy upward crescents (arcs)
        this.visorGraphics.lineStyle(3.5, 0x38bdf8, 1);
        this.visorGraphics.beginPath();
        this.visorGraphics.arc(-10, -2, 7, Math.PI, 0, false);
        this.visorGraphics.strokePath();

        this.visorGraphics.beginPath();
        this.visorGraphics.arc(10, -2, 7, Math.PI, 0, false);
        this.visorGraphics.strokePath();
        break;

      case 'SURPRISED':
        // Wide circle eyes
        this.visorGraphics.fillStyle(0x38bdf8, 1);
        this.visorGraphics.fillCircle(-10, -2, 8);
        this.visorGraphics.fillCircle(10, -2, 8);
        this.visorGraphics.fillStyle(0xffffff, 1);
        this.visorGraphics.fillCircle(-8, -4, 3);
        this.visorGraphics.fillCircle(12, -4, 3);
        break;

      case 'WARNING':
        // Angled warning eyes
        this.visorGraphics.fillStyle(0xf59e0b, 1);
        this.visorGraphics.fillTriangle(-16, -6, -4, -2, -16, 2);
        this.visorGraphics.fillTriangle(16, -6, 4, -2, 16, 2);
        break;

      case 'THINKING':
        // Looking up-right eyes
        this.visorGraphics.fillStyle(0x38bdf8, 1);
        this.visorGraphics.fillRoundedRect(-14, -8, 10, 10, 4);
        this.visorGraphics.fillRoundedRect(6, -8, 10, 10, 4);
        break;

      case 'NORMAL':
      default:
        // Expressive rounded capsules with specular glint
        this.visorGraphics.fillStyle(0x38bdf8, 1);
        this.visorGraphics.fillRoundedRect(-16, -8, 12, 15, 5);
        this.visorGraphics.fillRoundedRect(4, -8, 12, 15, 5);
        // White eye highlight glints
        this.visorGraphics.fillStyle(0xffffff, 1);
        this.visorGraphics.fillCircle(-13, -5, 2.5);
        this.visorGraphics.fillCircle(7, -5, 2.5);
        break;
    }

    // Audio mouth wave bar when speaking
    if (this.currentEmote.mouth || this.currentState === 'TALKING') {
      this.visorGraphics.fillStyle(0x38bdf8, 0.85);
      const mouthWidth = 14 + this.smoothedAmplitude * 16;
      this.visorGraphics.fillRoundedRect(-mouthWidth / 2, 7, mouthWidth, 3, 1.5);
    }
  }

  /**
   * Natural eye blinking loop
   */
  private startBlinkTimer(): void {
    const nextBlinkMs = Phaser.Math.Between(2600, 5200);
    this.blinkTimer = this.scene.time.delayedCall(nextBlinkMs, () => {
      this.isBlinking = true;
      this.drawVisorEmote();

      this.scene.time.delayedCall(140, () => {
        this.isBlinking = false;
        this.drawVisorEmote();
        this.startBlinkTimer();
      });
    });
  }

  public setHomeTransform(x: number, y: number, scale?: number): void {
    this.homeX = x;
    this.homeY = y;
    this.x = x;
    this.y = y;
    if (scale !== undefined) {
      this.baseScale = scale;
      this.rigContainer.setScale(scale);
      this.shadowEllipse.setScale(scale);
      this.auraGlow.setScale(scale);
      this.voiceWaveRing.setScale(scale);
    }
  }

  public destroy(fromScene?: boolean): void {
    if (this.blinkTimer) this.blinkTimer.remove();
    if (this.waveTween) this.waveTween.stop();
    if (this.hopTween) this.hopTween.stop();
    if (this.jetpackEmitter) this.jetpackEmitter.destroy();
    if (this.starBurstEmitter) this.starBurstEmitter.destroy();
    super.destroy(fromScene);
  }
}
