import Phaser from 'phaser';
import { EventBus } from '../EventBus';
import { soundManager } from '../../utils/sound';

interface IslandInteractiveProp {
  container: Phaser.GameObjects.Container;
  name: string;
  type: 'crystal' | 'mushroom' | 'spaceship' | 'beacon';
  x: number;
  y: number;
  interactionCount: number;
}

export class HomeIslandScene extends Phaser.Scene {
  private bgGraphics!: Phaser.GameObjects.Graphics;
  private earthSprite!: Phaser.GameObjects.Image;
  private saturnSprite!: Phaser.GameObjects.Image;

  private islandContainer!: Phaser.GameObjects.Container;
  private islandSprite!: Phaser.GameObjects.Image;
  private islandShadow!: Phaser.GameObjects.Ellipse;

  private spaceshipContainer!: Phaser.GameObjects.Container;
  private spaceshipSprite!: Phaser.GameObjects.Image;
  private spaceshipGlow!: Phaser.GameObjects.Arc;

  private roboContainer!: Phaser.GameObjects.Container;
  private roboSprite!: Phaser.GameObjects.Image;
  private roboShadow!: Phaser.GameObjects.Ellipse;
  private isMoving: boolean = false;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: { [key: string]: Phaser.Input.Keyboard.Key };

  private props: IslandInteractiveProp[] = [];
  private sparkleEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;

  // Walkable boundary polygon on the island surface (relative to island center)
  private walkableBounds: { minX: number; maxX: number; minY: number; maxY: number } = {
    minX: -240,
    maxX: 240,
    minY: -220,
    maxY: 60
  };

  constructor() {
    super({ key: 'HomeIslandScene' });
  }

  public preload(): void {
    // 1. High-resolution canonical assets
    this.load.image('island-base', '/assets/art/island_floating_base.png');
    this.load.image('robo-hero', '/assets/art/robo_canonical_wave.png');
    this.load.image('spaceship-hero', '/assets/art/spaceship_canonical.png');

    // 2. Cosmic celestial sprites
    this.load.image('planet-earth', '/assets/sprites/space/planet-earth.png');
    this.load.image('planet-saturn', '/assets/sprites/space/planet-saturn.png');
    this.load.image('asteroid-purple', '/assets/sprites/space/asteroid-purple.png');
  }

  public create(): void {
    const { width, height } = this.scale;

    // Generate sparkle particle texture
    if (!this.textures.exists('particle-sparkle-star')) {
      const g = this.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0xffe69a, 1);
      g.fillCircle(8, 8, 6);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(8, 8, 3);
      g.generateTexture('particle-sparkle-star', 16, 16);
      g.destroy();
    }

    // 1. VIBRANT COLORFUL SPACE BACKGROUND (Avoid dark navy per Art Direction)
    // Coordinated colors: Aqua, Sky Blue, Lavender, Warm Sun Glow, Pearl White
    this.bgGraphics = this.add.graphics();
    this.bgGraphics.setScrollFactor(0);
    this.bgGraphics.setDepth(0);
    this.drawAtmosphericBackground(width, height);

    // 2. DISTANT PARALLAX CELESTIALS (Scroll Factor: 0.15 - 0.25)
    this.earthSprite = this.add.image(width * 0.18, height * 0.22, 'planet-earth');
    this.earthSprite.setScale(0.85).setAlpha(0.75).setScrollFactor(0.12).setDepth(1);
    this.tweens.add({
      targets: this.earthSprite,
      y: this.earthSprite.y - 15,
      duration: 7000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.saturnSprite = this.add.image(width * 0.82, height * 0.18, 'planet-saturn');
    this.saturnSprite.setScale(0.75).setAlpha(0.65).setScrollFactor(0.15).setDepth(1);
    this.tweens.add({
      targets: this.saturnSprite,
      y: this.saturnSprite.y + 12,
      duration: 8500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // 3. THE FLOATING ISLAND ROOT CONTAINER (Center of the world)
    const centerX = width * 0.5;
    const centerY = height * 0.52;

    // Distant soft island shadow on nebula clouds
    this.islandShadow = this.add.ellipse(centerX, centerY + 310, 480, 80, 0x0a142e, 0.45);
    this.islandShadow.setDepth(2);

    this.islandContainer = this.add.container(centerX, centerY);
    this.islandContainer.setDepth(5);

    // The high-res rendered 3D organic floating island
    this.islandSprite = this.add.image(0, 0, 'island-base');
    this.islandSprite.setOrigin(0.5, 0.5);
    this.islandSprite.setScale(0.78);
    this.islandContainer.add(this.islandSprite);

    // Gentle Island Float Sine Wave Tween
    this.tweens.add({
      targets: this.islandContainer,
      y: centerY - 14,
      duration: 5200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        if (this.islandShadow) {
          const dy = this.islandContainer.y - centerY;
          this.islandShadow.setScale(1 - dy * 0.015);
          this.islandShadow.setAlpha(0.45 - dy * 0.01);
        }
      }
    });

    // 4. DOCKED CARTOON SPACESHIP (Parked on the Island's right rock terrace)
    this.createSpaceshipEntity();

    // 5. INTERACTIVE PROPS ON THE ISLAND
    this.createInteractiveProps();

    // 6. CANONICAL ROBO CHARACTER ENTITY (Playable Explorer)
    this.createRoboEntity();

    // 7. PARTICLE EMITTER FOR INTERACTIVE SPARKLES
    this.sparkleEmitter = this.add.particles(0, 0, 'particle-sparkle-star', {
      speed: { min: 40, max: 140 },
      scale: { start: 1.2, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 800,
      gravityY: -40,
      emitting: false
    });
    this.sparkleEmitter.setDepth(30);

    // 8. INPUT CONTROLS (Click to move & Keyboard WASD / Arrows)
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasdKeys = {
        W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
      };
    }

    // Click on island terrain to move Robo there
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // If clicking directly on an interactive prop or UI, don't override
      if ((pointer.event.target as HTMLElement)?.tagName === 'BUTTON') return;

      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const relX = worldPoint.x - this.islandContainer.x;
      const relY = worldPoint.y - this.islandContainer.y;

      // Check if click is within walkable island surface
      if (
        relX >= this.walkableBounds.minX &&
        relX <= this.walkableBounds.maxX &&
        relY >= this.walkableBounds.minY &&
        relY <= this.walkableBounds.maxY
      ) {
        this.moveRoboTo(relX, relY);
      }
    });

    // Listen for External React Trigger (e.g. User clicks big "ابدأ المغامرة" button)
    EventBus.on('home-start-adventure-action', this.handleExternalStartAdventure);

    // Responsive resize listener
    this.scale.on('resize', this.handleResize, this);
  }

  private drawAtmosphericBackground(width: number, height: number): void {
    this.bgGraphics.clear();

    // Beautiful Colorful Sky: Twilight turquoise (#1a294d) to warm sun-kissed teal (#25446b)
    this.bgGraphics.fillGradientStyle(
      0x162c4a, 0x162c4a,
      0x274d73, 0x1b3454,
      1
    );
    this.bgGraphics.fillRect(0, 0, width, height);

    // Soft warm sunshine rays from top left
    this.bgGraphics.fillStyle(0xffe69a, 0.06);
    this.bgGraphics.fillTriangle(0, 0, width * 0.7, 0, 0, height * 0.9);
    this.bgGraphics.fillStyle(0x8de8f4, 0.08);
    this.bgGraphics.fillTriangle(0, 0, width, 0, 0, height * 0.6);

    // Ambient floating nebula cloud circles
    this.bgGraphics.fillStyle(0xc9b8ff, 0.12);
    this.bgGraphics.fillCircle(width * 0.85, height * 0.25, 260);
    this.bgGraphics.fillStyle(0xffc3d8, 0.09);
    this.bgGraphics.fillCircle(width * 0.15, height * 0.75, 300);
    this.bgGraphics.fillStyle(0x7ae582, 0.07);
    this.bgGraphics.fillCircle(width * 0.5, height * 0.35, 220);
  }

  private createSpaceshipEntity(): void {
    // Docked on the lower right terrace of the island
    const shipX = 135;
    const shipY = -35;

    this.spaceshipContainer = this.add.container(shipX, shipY);
    this.spaceshipContainer.setDepth(15);

    // Soft landing pad shadow
    const shipShadow = this.add.ellipse(0, 75, 140, 36, 0x091428, 0.45);
    this.spaceshipContainer.add(shipShadow);

    // Thruster exhaust warm aura
    this.spaceshipGlow = this.add.circle(60, 40, 24, 0xffa040, 0.35);
    this.spaceshipContainer.add(this.spaceshipGlow);
    this.tweens.add({
      targets: this.spaceshipGlow,
      alpha: 0.7,
      scale: 1.25,
      duration: 650,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // The high-res rendered spaceship
    this.spaceshipSprite = this.add.image(0, 0, 'spaceship-hero');
    this.spaceshipSprite.setScale(0.24);
    this.spaceshipSprite.setInteractive({ useHandCursor: true });
    this.spaceshipContainer.add(this.spaceshipSprite);

    // Interactive Hover & Click on Spaceship
    this.spaceshipSprite.on('pointerover', () => {
      this.tweens.add({
        targets: this.spaceshipContainer,
        scale: 1.06,
        duration: 180,
        ease: 'Back.easeOut'
      });
    });

    this.spaceshipSprite.on('pointerout', () => {
      this.tweens.add({
        targets: this.spaceshipContainer,
        scale: 1.0,
        duration: 180,
        ease: 'Quad.easeOut'
      });
    });

    this.spaceshipSprite.on('pointerdown', () => {
      soundManager.playFuelCharge();
      this.sparkleEmitter.setPosition(this.islandContainer.x + shipX, this.islandContainer.y + shipY);
      this.sparkleEmitter.explode(18);
      EventBus.emit('home-inspect-spaceship', {
        title: 'مركبة الانطلاق الفضائية 🚀',
        desc: 'مركبة روبو الجاهزة للإقلاع نحو المهمة الأولى: حديقة التغذية الفضائية!'
      });
    });

    this.islandContainer.add(this.spaceshipContainer);
  }

  private createInteractiveProps(): void {
    // Prop 1: Magic Quartz Crystal Cluster (Upper Left Rock Terrace)
    const crystalContainer = this.add.container(-170, -115);
    crystalContainer.setDepth(12);

    const crystalGlow = this.add.circle(0, 0, 32, 0x8de8f4, 0.28);
    crystalContainer.add(crystalGlow);

    const crystalHitArea = this.add.circle(0, 0, 34, 0xffffff, 0.001);
    crystalHitArea.setInteractive({ useHandCursor: true });
    crystalContainer.add(crystalHitArea);

    crystalHitArea.on('pointerdown', () => {
      soundManager.playCrystalSparkle();
      const worldPos = this.islandContainer.x - 170;
      const worldPosY = this.islandContainer.y - 115;
      this.sparkleEmitter.setPosition(worldPos, worldPosY);
      this.sparkleEmitter.explode(15);

      this.tweens.add({
        targets: crystalContainer,
        scaleY: 1.25,
        scaleX: 0.85,
        duration: 120,
        yoyo: true,
        ease: 'Back.easeOut'
      });

      EventBus.emit('home-prop-clicked', {
        prop: 'crystal',
        name: 'بلورات الطاقة الفضائية 💎',
        message: 'عثرت على بلورات الطاقة النقية! روبو يشعر بالحماس!'
      });
    });

    this.islandContainer.add(crystalContainer);
    this.props.push({
      container: crystalContainer,
      name: 'بلورات الكوارتز',
      type: 'crystal',
      x: -170,
      y: -115,
      interactionCount: 0
    });

    // Prop 2: Whimsical Glowing Mushrooms (Central Lawn Area)
    const shroomContainer = this.add.container(25, -20);
    shroomContainer.setDepth(14);

    const shroomHitArea = this.add.circle(0, 0, 28, 0xffffff, 0.001);
    shroomHitArea.setInteractive({ useHandCursor: true });
    shroomContainer.add(shroomHitArea);

    shroomHitArea.on('pointerdown', () => {
      soundManager.playBoing();
      const worldPos = this.islandContainer.x + 25;
      const worldPosY = this.islandContainer.y - 20;
      this.sparkleEmitter.setPosition(worldPos, worldPosY);
      this.sparkleEmitter.explode(10);

      this.tweens.add({
        targets: shroomContainer,
        scaleY: 1.35,
        scaleX: 0.75,
        duration: 150,
        yoyo: true,
        ease: 'Bounce.easeOut'
      });

      EventBus.emit('home-prop-clicked', {
        prop: 'mushroom',
        name: 'فطر الفضاء النطاط 🍄',
        message: 'فطر سحري يفرز رحيقاً آمناً ونظيفاً في انعدام الجاذبية!'
      });
    });

    this.islandContainer.add(shroomContainer);
    this.props.push({
      container: shroomContainer,
      name: 'فطر الفضاء',
      type: 'mushroom',
      x: 25,
      y: -20,
      interactionCount: 0
    });

    // Prop 3: Holographic Mission Terminal (Near Path Center)
    const beaconContainer = this.add.container(-60, -50);
    beaconContainer.setDepth(13);

    // Pulsing holographic ring
    const ring = this.add.circle(0, 0, 26, 0x7ae582, 0.35);
    beaconContainer.add(ring);
    this.tweens.add({
      targets: ring,
      scale: 1.3,
      alpha: 0.1,
      duration: 1200,
      repeat: -1,
      ease: 'Quad.easeOut'
    });

    const beaconHitArea = this.add.circle(0, 0, 30, 0xffffff, 0.001);
    beaconHitArea.setInteractive({ useHandCursor: true });
    beaconContainer.add(beaconHitArea);

    beaconHitArea.on('pointerdown', () => {
      soundManager.playClick();
      EventBus.emit('home-open-world-map');
    });

    this.islandContainer.add(beaconContainer);
  }

  private createRoboEntity(): void {
    // Sits in the central grassy clearing
    const startX = -45;
    const startY = -40;

    this.roboContainer = this.add.container(startX, startY);
    this.roboContainer.setDepth(20);

    // Dynamic Cast Ground Shadow
    this.roboShadow = this.add.ellipse(0, 48, 62, 18, 0x071124, 0.45);
    this.roboContainer.add(this.roboShadow);

    // The high-res canonical Robo sprite
    this.roboSprite = this.add.image(0, 0, 'robo-hero');
    this.roboSprite.setScale(0.18);
    this.roboSprite.setOrigin(0.5, 0.5);
    this.roboSprite.setInteractive({ useHandCursor: true });
    this.roboContainer.add(this.roboSprite);

    // Clicking Robo triggers playful bounce and greeting dialogue
    this.roboSprite.on('pointerdown', () => {
      soundManager.playDropSuccess();
      this.tweens.add({
        targets: this.roboContainer,
        y: this.roboContainer.y - 25,
        duration: 180,
        yoyo: true,
        ease: 'Quad.easeOut'
      });
      EventBus.emit('home-robo-greet');
    });

    // Gentle Idle Bobbing
    this.tweens.add({
      targets: this.roboSprite,
      y: -6,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.islandContainer.add(this.roboContainer);
  }

  private moveRoboTo(targetX: number, targetY: number): void {
    if (this.isMoving) {
      this.tweens.killTweensOf(this.roboContainer);
    }

    this.isMoving = true;

    // Flip Robo sprite according to movement direction
    if (targetX < this.roboContainer.x) {
      this.roboSprite.setFlipX(true);
    } else {
      this.roboSprite.setFlipX(false);
    }

    const dist = Phaser.Math.Distance.Between(
      this.roboContainer.x,
      this.roboContainer.y,
      targetX,
      targetY
    );
    const duration = Math.max(300, dist * 6.5);

    // Step sound
    soundManager.playClick();

    // Floating walk tween
    this.tweens.add({
      targets: this.roboContainer,
      x: targetX,
      y: targetY,
      duration: duration,
      ease: 'Quad.easeInOut',
      onComplete: () => {
        this.isMoving = false;
        this.roboContainer.setDepth(15 + Math.floor(targetY * 0.1));
      }
    });

    // Playful bounce while walking
    this.tweens.add({
      targets: this.roboSprite,
      scaleY: 0.16,
      scaleX: 0.20,
      duration: 160,
      yoyo: true,
      repeat: Math.floor(duration / 320),
      ease: 'Sine.easeInOut'
    });
  }

  public update(): void {
    // Keyboard WASD / Arrow movement support
    if (!this.cursors || this.isMoving) return;

    let dx = 0;
    let dy = 0;
    const speed = 3.2;

    if (this.cursors.left?.isDown || this.wasdKeys.A?.isDown) dx -= speed;
    if (this.cursors.right?.isDown || this.wasdKeys.D?.isDown) dx += speed;
    if (this.cursors.up?.isDown || this.wasdKeys.W?.isDown) dy -= speed;
    if (this.cursors.down?.isDown || this.wasdKeys.S?.isDown) dy += speed;

    if (dx !== 0 || dy !== 0) {
      const nextX = Phaser.Math.Clamp(
        this.roboContainer.x + dx,
        this.walkableBounds.minX,
        this.walkableBounds.maxX
      );
      const nextY = Phaser.Math.Clamp(
        this.roboContainer.y + dy,
        this.walkableBounds.minY,
        this.walkableBounds.maxY
      );

      this.roboContainer.x = nextX;
      this.roboContainer.y = nextY;

      if (dx < 0) this.roboSprite.setFlipX(true);
      if (dx > 0) this.roboSprite.setFlipX(false);

      // Depth sorting based on Y position
      this.roboContainer.setDepth(15 + Math.floor(nextY * 0.1));
    }
  }

  private handleExternalStartAdventure = (): void => {
    // When child clicks the large CTA button:
    // 1. Robo runs towards the spaceship
    // 2. Spaceship thrusters flare up
    // 3. Transitions cleanly to NutritionLab
    this.moveRoboTo(100, -25);
    soundManager.playFanfare();

    this.time.delayedCall(600, () => {
      this.sparkleEmitter.setPosition(this.islandContainer.x + 135, this.islandContainer.y - 35);
      this.sparkleEmitter.explode(25);
      this.tweens.add({
        targets: this.spaceshipContainer,
        y: this.spaceshipContainer.y - 60,
        alpha: 0,
        duration: 700,
        ease: 'Back.easeIn',
        onComplete: () => {
          EventBus.emit('home-launch-mission', 'NutritionLab');
        }
      });
    });
  };

  private handleResize(gameSize: Phaser.Structs.Size): void {
    const { width, height } = gameSize;
    this.drawAtmosphericBackground(width, height);
    if (this.islandContainer) {
      this.islandContainer.setPosition(width * 0.5, height * 0.52);
    }
    if (this.islandShadow) {
      this.islandShadow.setPosition(width * 0.5, height * 0.52 + 310);
    }
  }

  public shutdown(): void {
    EventBus.off('home-start-adventure-action', this.handleExternalStartAdventure);
    this.scale.off('resize', this.handleResize, this);
  }
}
