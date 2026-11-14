import Phaser from 'phaser';
import { EventBus } from '../EventBus';
import { soundManager } from '../../utils/sound';
import { ArticulatedRobo } from '../objects/ArticulatedRobo';
import { ParallaxBackground } from '../objects/ParallaxBackground';

export class LunarOutpostScene extends Phaser.Scene {
  private parallax!: ParallaxBackground;
  private robo!: ArticulatedRobo;
  private isMoving: boolean = false;

  private bioDomeContainer!: Phaser.GameObjects.Container;
  private waterSiloContainer!: Phaser.GameObjects.Container;
  private iceRocks: Phaser.GameObjects.Container[] = [];
  private drillEffectEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;

  private isStormActive: boolean = false;
  private stormGlowGraphics!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: 'LunarOutpostScene' });
  }

  public preload(): void {
    ParallaxBackground.preloadStageLayers(this, 'STAGE_3');
    ArticulatedRobo.preloadAssets(this);

    // Preload lunar surface props
    this.load.image('lunar-ice-core', '/assets/sprites/collectibles/star-tier-1.png');
  }

  public create(): void {
    const { width, height } = this.scale;

    // 1. Initialize 2.5D Multi-Layer Parallax Architecture
    this.parallax = new ParallaxBackground(this);
    this.parallax.initStage3Lunar(width, height);

    // 2. Solar Storm Warning Atmospheric Glow Overlay
    this.stormGlowGraphics = this.add.graphics();
    this.stormGlowGraphics.setDepth(5).setAlpha(0);

    // 3. Drill Sparkle Particle Texture
    if (!this.textures.exists('particle-ice-spark')) {
      const g = this.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0xa5f3fc, 1);
      g.fillCircle(6, 6, 5);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(6, 6, 2.5);
      g.generateTexture('particle-ice-spark', 12, 12);
      g.destroy();
    }

    this.drillEffectEmitter = this.add.particles(0, 0, 'particle-ice-spark', {
      speed: { min: 40, max: 120 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 0.9, end: 0 },
      lifespan: 450,
      blendMode: Phaser.BlendModes.ADD
    });
    this.drillEffectEmitter.setDepth(18);
    this.drillEffectEmitter.stop();

    // 4. Create Interactive Lunar Base Props
    this.createInteractiveBaseProps(width, height);

    // 5. Spawn Articulated Robo in Lunar 0.16g Kangaroo Hop Mode
    this.robo = new ArticulatedRobo(this, width * 0.45, height * 0.62, 0.65);
    this.robo.setDepth(15);
    this.robo.setLocomotionMode('LUNAR_016G');

    this.robo.on('robo-clicked', () => {
      soundManager.playDropSuccess();
      this.robo.setRoboState('TALKING');
      this.robo.playWavingArm();
      EventBus.emit('lunar:robo-clicked');
    });

    // 6. Click on ground to hop Robo over in 0.16g
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Ignore clicks on UI cards
      if (pointer.y > height * 0.55 && pointer.y < height * 0.92) {
        this.hopRoboTo(pointer.x, pointer.y);
      }
    });

    // Listen to Solar Storm state changes from React
    EventBus.on('lunar:storm-alert', this.handleStormAlert);

    this.scale.on('resize', this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.shutdown, this);
  }

  private handleStormAlert = (active: boolean): void => {
    this.isStormActive = active;
    if (active) {
      this.robo.setRoboState('WARNING');
      this.tweens.add({
        targets: this.stormGlowGraphics,
        alpha: 0.45,
        duration: 600,
        yoyo: true,
        repeat: -1
      });
    } else {
      this.tweens.killTweensOf(this.stormGlowGraphics);
      this.stormGlowGraphics.setAlpha(0);
      this.robo.setRoboState('IDLE');
    }
  };

  private createInteractiveBaseProps(width: number, height: number): void {
    const groundY = height * 0.70;

    // A. Hydroponic Bio-Dome
    this.bioDomeContainer = this.add.container(width * 0.20, groundY);
    this.bioDomeContainer.setDepth(8);

    const domeHitArea = this.add.circle(0, -30, 48, 0xffffff, 0.001);
    domeHitArea.setInteractive({ useHandCursor: true });
    this.bioDomeContainer.add(domeHitArea);

    domeHitArea.on('pointerdown', () => {
      soundManager.playClick();
      this.hopRoboTo(this.bioDomeContainer.x + 65, this.bioDomeContainer.y);
      this.time.delayedCall(800, () => {
        this.robo.setRoboState('HAPPY');
        EventBus.emit('lunar:prop-inspected', {
          title: 'قبة الزراعة المائية (Lunar Bio-Dome)',
          message: 'محاصيل الفضاء تنمو بنجاح! النباتات تستهلك ثاني أكسيد الكربون وتنتج أكسجين نقي وغذاء طازج للطاقم.'
        });
      });
    });

    // B. ECLSS Water Storage Silo
    this.waterSiloContainer = this.add.container(width * 0.72, groundY);
    this.waterSiloContainer.setDepth(8);

    const siloHitArea = this.add.rectangle(0, -35, 70, 90, 0xffffff, 0.001);
    siloHitArea.setInteractive({ useHandCursor: true });
    this.waterSiloContainer.add(siloHitArea);

    siloHitArea.on('pointerdown', () => {
      soundManager.playClick();
      this.hopRoboTo(this.waterSiloContainer.x - 70, this.waterSiloContainer.y);
      this.time.delayedCall(800, () => {
        this.robo.setRoboState('TALKING');
        EventBus.emit('lunar:prop-inspected', {
          title: 'نظام تدوير المياه المغلق ECLSS',
          message: 'تقنية ناسا تعيد تدوير 98% من كل قطرة ماء في القاعدة.. لا نهدر قطرة واحدة في الفضاء!'
        });
      });
    });

    // C. Artemis Lunar Lander
    const landerContainer = this.add.container(width * 0.88, groundY - 15);
    landerContainer.setDepth(8);

    const landerG = this.add.graphics();
    // Gold thermal foil descent module
    landerG.fillStyle(0xd97706, 1);
    landerG.fillRoundedRect(-24, -20, 48, 24, 6);
    // Upper ascent cabin
    landerG.fillStyle(0xe2e8f0, 1);
    landerG.fillCircle(0, -28, 16);
    // Window
    landerG.fillStyle(0x0284c7, 1);
    landerG.fillCircle(0, -28, 6);
    // Landing struts
    landerG.lineStyle(3, 0x94a3b8, 1);
    landerG.lineBetween(-18, 4, -28, 20);
    landerG.lineBetween(18, 4, 28, 20);
    landerG.lineBetween(0, 4, 0, 20);
    landerContainer.add(landerG);

    const landerHit = this.add.circle(0, -18, 34, 0xffffff, 0.001);
    landerHit.setInteractive({ useHandCursor: true });
    landerContainer.add(landerHit);

    landerHit.on('pointerdown', () => {
      soundManager.playClick();
      this.hopRoboTo(landerContainer.x - 55, landerContainer.y + 15);
      this.time.delayedCall(800, () => {
        this.robo.setRoboState('HAPPY');
        EventBus.emit('lunar:prop-inspected', {
          title: 'مركبة الهبوط القمرية (Artemis Lunar Lander)',
          message: 'مركبة الهبوط جاهزة لإعادة الطاقم والعينات الثمينة إلى مدار القمر!'
        });
      });
    });

    // D. Lunar Ice Rocks (Extractable Samples)
    const rockPositions = [
      { x: width * 0.36, y: groundY + 18 },
      { x: width * 0.54, y: groundY - 15 },
      { x: width * 0.64, y: groundY + 16 }
    ];

    rockPositions.forEach((pos, idx) => {
      const rockContainer = this.add.container(pos.x, pos.y);
      rockContainer.setDepth(10);

      // Stylized Lunar Rock with Frozen Water Ice Crystals
      const rockG = this.add.graphics();
      rockG.fillStyle(0x475569, 1);
      rockG.fillRoundedRect(-18, -14, 36, 26, 8);
      // Ice crystal shine
      rockG.fillStyle(0x38bdf8, 1);
      rockG.fillTriangle(-8, -12, 0, -22, 6, -12);
      rockG.fillTriangle(4, -6, 12, -18, 16, -6);
      rockContainer.add(rockG);

      const hitArea = this.add.circle(0, 0, 24, 0xffffff, 0.001);
      hitArea.setInteractive({ useHandCursor: true });
      rockContainer.add(hitArea);

      hitArea.on('pointerdown', () => {
        this.extractLunarIceSample(rockContainer, idx);
      });

      this.iceRocks.push(rockContainer);
    });
  }

  /**
   * Robo kangaroo-hops to rock, fires laser drill, and extracts frozen water ice
   */
  private extractLunarIceSample(rockContainer: Phaser.GameObjects.Container, idx: number): void {
    if (this.isMoving) return;
    soundManager.playClick();

    const targetX = rockContainer.x - 45;
    const targetY = rockContainer.y;
    this.hopRoboTo(targetX, targetY);

    const dist = Phaser.Math.Distance.Between(this.robo.x, this.robo.y, targetX, targetY);
    const hopDuration = Math.max(400, dist * 5.5);

    this.time.delayedCall(hopDuration + 100, () => {
      // Fire Drill particles
      this.drillEffectEmitter.setPosition(rockContainer.x, rockContainer.y);
      this.drillEffectEmitter.start();
      soundManager.playCrystalSparkle();
      this.robo.pointAt(rockContainer.x, rockContainer.y);

      this.time.delayedCall(900, () => {
        this.drillEffectEmitter.stop();
        // Float ice crystal up into cargo
        const crystal = this.add.image(rockContainer.x, rockContainer.y, 'lunar-ice-core');
        crystal.setScale(0.7).setDepth(22);

        this.tweens.add({
          targets: crystal,
          y: crystal.y - 65,
          alpha: 0,
          scale: 1.2,
          duration: 750,
          ease: 'Back.easeOut',
          onComplete: () => {
            crystal.destroy();
            this.robo.setRoboState('HAPPY');
            soundManager.playFanfare();
            EventBus.emit('lunar:sample-extracted', { sampleIndex: idx });
          }
        });
      });
    });
  }

  /**
   * Bouncy 0.16g low-gravity kangaroo hop to target coordinate
   */
  private hopRoboTo(targetX: number, targetY: number): void {
    if (this.isMoving) {
      this.tweens.killTweensOf(this.robo);
    }

    this.isMoving = true;
    this.robo.setRoboState('WALKING');

    const dist = Phaser.Math.Distance.Between(this.robo.x, this.robo.y, targetX, targetY);
    const duration = Math.max(350, dist * 5.5);

    this.tweens.add({
      targets: this.robo,
      x: targetX,
      y: targetY,
      duration: duration,
      ease: 'Quad.easeInOut',
      onComplete: () => {
        this.isMoving = false;
        this.robo.setRoboState('IDLE');
        this.robo.setDepth(15 + Math.floor(targetY * 0.05));
      }
    });
  }

  public update(time: number, delta: number): void {
    if (this.parallax) {
      this.parallax.update(0, delta);
    }
    if (this.robo && this.robo.active) {
      this.robo.preUpdate(time, delta);
    }

    // Draw solar storm alert pulse
    if (this.isStormActive) {
      const { width, height } = this.scale;
      this.stormGlowGraphics.clear();
      this.stormGlowGraphics.fillStyle(0xef4444, 0.15);
      this.stormGlowGraphics.fillRect(0, 0, width, height);
    }
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    const { width, height } = gameSize;
    if (this.parallax) this.parallax.resize(width, height);
    if (this.robo) {
      this.robo.y = height * 0.62;
    }
  }

  public shutdown(): void {
    EventBus.off('lunar:storm-alert', this.handleStormAlert);
    this.scale.off('resize', this.handleResize, this);
    this.events.off(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
    this.events.off(Phaser.Scenes.Events.DESTROY, this.shutdown, this);
    if (this.parallax) this.parallax.destroy();
  }
}
