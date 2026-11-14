import Phaser from 'phaser';
import { FOOD_DATABASE } from '../../data/foodItems';
import { CargoItemEntry, FoodItem } from '../../types/game';
import {
  EventBus,
  NutritionRoboStatePayload,
  NutritionSyncCargoPayload
} from '../EventBus';
import { ProceduralRobo } from '../objects/ProceduralRobo';
import { CelestialBody, EarthPlanet } from '../objects/CelestialBody';
import { soundManager } from '../../utils/sound';

interface HandrailNode {
  container: Phaser.GameObjects.Container;
  bar: Phaser.GameObjects.Graphics;
  glow: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  width: number;
  height: number;
  orientation: 'horizontal' | 'vertical';
}

interface FoodPodNode {
  item: FoodItem;
  container: Phaser.GameObjects.Container;
  bgCircle: Phaser.GameObjects.Arc;
  glowRing: Phaser.GameObjects.Arc;
  sprite: Phaser.GameObjects.Image;
  labelBg: Phaser.GameObjects.Graphics;
  labelText: Phaser.GameObjects.Text;
  badgeText: Phaser.GameObjects.Text;
  defaultBadgeLabel: string;
  defaultBadgeBg: string;
  homeX: number;
  homeY: number;
  baseScale: number;
  floatTween: Phaser.Tweens.Tween;
  dragStartX: number;
  dragStartY: number;
  dragStartTime: number;
  isDelivering: boolean;
  hasCelebrated?: boolean;
}

export class NutritionLabScene extends Phaser.Scene {
  private static readonly MAX_CARGO_CAPACITY = 4;

  private bgGraphics!: Phaser.GameObjects.Graphics;
  private earthPlanet?: EarthPlanet;
  private observationWindowGraphics!: Phaser.GameObjects.Graphics;

  private robo!: ProceduralRobo;

  private crateContainer!: Phaser.GameObjects.Container;
  private crateBeamGraphics!: Phaser.GameObjects.Graphics;
  private crateSprite!: Phaser.GameObjects.Image;
  private crateGlowCircle!: Phaser.GameObjects.Arc;
  private crateStatusText!: Phaser.GameObjects.Text;
  private packedSpritesContainer!: Phaser.GameObjects.Container;

  private foodPods: FoodPodNode[] = [];
  private hazardEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

  // Zero-G Physics & Handrail Slingshot Traversal
  private handrails: HandrailNode[] = [];
  private trajectoryGraphics!: Phaser.GameObjects.Graphics;
  private isAimingSlingshot: boolean = false;
  private slingshotAnchorX: number = 0;
  private slingshotAnchorY: number = 0;

  private currentCargo: CargoItemEntry[] = [];
  private committedItemIds: Set<string> = new Set();
  private celebratedItemIds: Set<string> = new Set();
  private lastSuccessSoundTime: number = 0;
  private crateWorldX: number = 0;
  private crateWorldY: number = 0;
  private crateDropRadius: number = 145;

  constructor() {
    super({ key: 'NutritionLabScene' });
  }

  public preload(): void {
    ProceduralRobo.preloadAssets(this);
    CelestialBody.preloadAssets(this);

    this.load.image('lab-crate', '/assets/sprites/environment/cargo-crate-clean.png');

    for (const item of FOOD_DATABASE) {
      if (item.svgAsset) {
        this.load.image(`food-${item.id}`, item.svgAsset);
      }
    }
  }

  public create(): void {
    const { width, height } = this.scale;

    // Generate crumb/bubble hazard texture if not yet created
    if (!this.textures.exists('hazard-crumb-dot')) {
      const g = this.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0xfbbf24, 1);
      g.fillCircle(8, 8, 7);
      g.lineStyle(2, 0xf43f5e, 1);
      g.strokeCircle(8, 8, 7);
      g.generateTexture('hazard-crumb-dot', 16, 16);
      g.destroy();
    }

    // 1. MULTI-LAYER CLEAN SPACE LAB PARALLAX BACKGROUND (Zero Full Screenshots)
    this.bgGraphics = this.add.graphics();
    this.bgGraphics.setDepth(0);

    // Distant twinkling stars particle emitter
    this.add
      .particles(0, 0, 'robo-thruster-dot', {
        x: { min: 0, max: 1920 },
        y: { min: 0, max: 600 },
        scale: { min: 0.08, max: 0.24 },
        alpha: { start: 0.85, end: 0.15 },
        lifespan: { min: 2400, max: 4500 },
        frequency: 140,
        quantity: 1,
        blendMode: Phaser.BlendModes.ADD
      })
      .setDepth(1);

    // Panoramic Space Galley Observation Window (Upper Wall of Galley)
    const winWidth = Math.min(width * 0.88, 880);
    const winHeight = 130;
    const winX = width * 0.5;
    const winY = 85;

    this.observationWindowGraphics = this.add.graphics().setDepth(1);
    this.observationWindowGraphics.fillStyle(0x030712, 0.95);
    this.observationWindowGraphics.fillRoundedRect(winX - winWidth / 2, winY - winHeight / 2, winWidth, winHeight, 18);
    this.observationWindowGraphics.lineStyle(3, 0x0284c7, 0.9);
    this.observationWindowGraphics.strokeRoundedRect(winX - winWidth / 2, winY - winHeight / 2, winWidth, winHeight, 18);

    // Procedural Earth visible strictly through Galley observation window
    this.earthPlanet = new EarthPlanet(this, winX + winWidth * 0.28, winY, 46);
    this.earthPlanet.setDepth(2);

    // 2. CENTER INTERACTIVE 3D SPACE CARGO CRATE DROP ZONE
    this.crateContainer = this.add.container(width * 0.42, height * 0.34).setDepth(10);

    this.crateGlowCircle = this.add.circle(0, 0, 125, 0x22d3ee, 0.16);
    this.crateGlowCircle.setBlendMode(Phaser.BlendModes.ADD);
    this.crateContainer.add(this.crateGlowCircle);

    this.crateBeamGraphics = this.add.graphics();
    this.crateContainer.add(this.crateBeamGraphics);

    this.crateSprite = this.add.image(0, 14, 'lab-crate');
    this.crateContainer.add(this.crateSprite);

    this.packedSpritesContainer = this.add.container(0, -16);
    this.crateContainer.add(this.packedSpritesContainer);

    this.crateStatusText = this.add
      .text(0, -90, 'اسحب أو اضغط على طعام الفضاء لوضعه في الصندوق 🎯', {
        fontFamily: 'Cairo, Tajawal, sans-serif',
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#e0f2fe',
        backgroundColor: '#082f49cc',
        padding: { x: 12, y: 5 }
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    this.crateContainer.add(this.crateStatusText);

    // Gentle floating pulse on the crate tractor beam
    this.tweens.add({
      targets: this.crateGlowCircle,
      scaleX: { from: 0.94, to: 1.08 },
      scaleY: { from: 0.94, to: 1.08 },
      alpha: { from: 0.12, to: 0.26 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Particle Emitter for Banned Zero-G Food Hazard Feedback
    this.hazardEmitter = this.add
      .particles(0, 0, 'hazard-crumb-dot', {
        speed: { min: 70, max: 190 },
        angle: { min: 0, max: 360 },
        scale: { start: 1.1, end: 0.1 },
        alpha: { start: 1, end: 0 },
        lifespan: 750,
        emitting: false
      })
      .setDepth(30);

    // Trajectory vector graphics for Zero-G slingshot aiming
    this.trajectoryGraphics = this.add.graphics().setDepth(45);

    // 3. PROCEDURAL ROBO CHARACTER RIG (Right side of lab stage for RTL layout)
    this.robo = new ProceduralRobo(this, width * 0.78, height * 0.33, 0.74);
    this.robo.setDepth(15);

    // Enable Zero-G Arcade Physics on Robo with momentum & low drag
    this.physics.world.enable(this.robo);
    const roboBody = this.robo.body as Phaser.Physics.Arcade.Body;
    roboBody.setCollideWorldBounds(true);
    roboBody.setBounce(0.75, 0.75);
    roboBody.setDrag(18, 18);
    roboBody.setSize(70, 95);
    roboBody.setOffset(-35, -45);

    this.robo.setInteractive(new Phaser.Geom.Rectangle(-40, -50, 80, 100), Phaser.Geom.Rectangle.Contains);
    this.robo.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.startSlingshot(this.robo.x, this.robo.y, pointer);
    });
    this.robo.on('robo-clicked', () => {
      EventBus.emit('nutrition:robo-clicked');
    });

    // 4. INTERACTIVE EVA HANDRAILS (Grab & Slingshot Traversal)
    this.createHandrails();

    // 5. INTERACTIVE ZERO-G FOOD PODS (All 9 NASA Food Items with Stable Shelf Slots)
    this.createFoodPods();

    // Global Slingshot Trajectory Preview & Launch Handlers
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isAimingSlingshot) return;
      this.trajectoryGraphics.clear();
      const startX = this.slingshotAnchorX;
      const startY = this.slingshotAnchorY;
      const dragDist = Phaser.Math.Distance.Between(startX, startY, pointer.x, pointer.y);
      const angle = Phaser.Math.Angle.Between(pointer.x, pointer.y, startX, startY);

      // Elastic bungee cord
      this.trajectoryGraphics.lineStyle(3, 0xfacc15, 0.85);
      this.trajectoryGraphics.lineBetween(startX, startY, pointer.x, pointer.y);

      // Propulsion forecast vector
      const launchSpeed = Math.min(dragDist * 3.8, 550);
      const forecastDist = Math.min(220, launchSpeed * 0.4);
      const targetX = startX + Math.cos(angle) * forecastDist;
      const targetY = startY + Math.sin(angle) * forecastDist;

      this.trajectoryGraphics.lineStyle(4, 0x38bdf8, 0.9);
      this.trajectoryGraphics.lineBetween(startX, startY, targetX, targetY);

      for (let i = 1; i <= 5; i++) {
        const frac = i / 5;
        const dotX = startX + Math.cos(angle) * forecastDist * frac;
        const dotY = startY + Math.sin(angle) * forecastDist * frac;
        this.trajectoryGraphics.fillStyle(0x38bdf8, 1 - frac * 0.15);
        this.trajectoryGraphics.fillCircle(dotX, dotY, 4.5 - frac * 0.5);
      }
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!this.isAimingSlingshot) return;
      this.trajectoryGraphics.clear();
      this.isAimingSlingshot = false;

      const startX = this.slingshotAnchorX;
      const startY = this.slingshotAnchorY;
      const dragDist = Phaser.Math.Distance.Between(startX, startY, pointer.x, pointer.y);

      if (dragDist > 18) {
        this.tweens.killTweensOf(this.robo);
        const angle = Phaser.Math.Angle.Between(pointer.x, pointer.y, startX, startY);
        const speed = Math.min(dragDist * 4.2, 580);
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;

        const rBody = this.robo.body as Phaser.Physics.Arcade.Body;
        rBody.setVelocity(vx, vy);

        soundManager.playPressurizeHiss();
        this.robo.setRoboState('FLYING');
      }
    });

    // 6. INITIAL RESPONSIVE LAYOUT & RESIZE LISTENER
    this.layoutScene(width, height);
    const onResize = (gameSize: Phaser.Structs.Size) => {
      if (this.scene && this.sys && this.sys.isActive()) {
        this.layoutScene(gameSize.width, gameSize.height);
      }
    };
    this.scale.on('resize', onResize);

    // 6. SUBSCRIBE TO REACT EVENT BUS
    const onSyncCargo = (payload: NutritionSyncCargoPayload) => {
      this.currentCargo = payload.cargoItems;
      this.committedItemIds = new Set(payload.cargoItems.map((e) => e.item.id));
      for (const id of Array.from(this.celebratedItemIds)) {
        if (!this.committedItemIds.has(id)) {
          this.celebratedItemIds.delete(id);
        }
      }
      this.syncFoodPodVisualStates();
      this.renderPackedCargoSprites();
    };

    const onRoboState = (payload: NutritionRoboStatePayload) => {
      if (this.robo && this.robo.active) {
        this.robo.setRoboState(payload.state, payload.targetX, payload.targetY);
      }
    };

    let lastCelebrateTime = 0;
    const onCelebrate = () => {
      const now = performance.now();
      if (now - lastCelebrateTime < 1500) return;
      lastCelebrateTime = now;
      if (this.robo && this.robo.active) {
        this.robo.setRoboState('CELEBRATING');
      }
      this.tweens.add({
        targets: this.crateContainer,
        scaleX: 1.08,
        scaleY: 1.08,
        duration: 180,
        yoyo: true,
        ease: 'Back.easeOut'
      });
    };

    EventBus.on('nutrition:sync-cargo', onSyncCargo);
    EventBus.on('nutrition:robo-state', onRoboState);
    EventBus.on('nutrition:celebrate', onCelebrate);

    // Expose scene inspection helper for automated viewport & touch-target QA
    (window as unknown as Record<string, unknown>).__ASTRONUTRI_NUTRITION_SCENE__ = {
      getLayoutMetrics: () => ({
        canvasWidth: this.scale.width,
        canvasHeight: this.scale.height,
        crate: {
          x: Math.round(this.crateWorldX),
          y: Math.round(this.crateWorldY),
          dropRadius: this.crateDropRadius
        },
        robo: {
          x: Math.round(this.robo.x),
          y: Math.round(this.robo.y),
          state: (this.robo as unknown as { currentState: string }).currentState
        },
        pods: this.foodPods.map((p) => ({
          id: p.item.id,
          nameAr: p.item.nameAr,
          isBanned: p.item.isBanned,
          x: Math.round(p.container.x),
          y: Math.round(p.container.y),
          hitDiameterPx: Math.round(96 * p.baseScale)
        }))
      }),
      simulateTapPod: (itemId: string) => {
        const pod = this.foodPods.find((p) => p.item.id === itemId);
        if (pod) {
          EventBus.emit('nutrition:food-inspected', { item: pod.item });
          this.animateFoodDeliveryToCrate(pod);
          return true;
        }
        return false;
      },
      simulateDragPodToCrate: (itemId: string) => {
        const pod = this.foodPods.find((p) => p.item.id === itemId);
        if (pod) {
          pod.floatTween.pause();
          EventBus.emit('nutrition:food-inspected', { item: pod.item });
          this.robo.setRoboState('FLYING', this.crateWorldX, this.crateWorldY);
          pod.container.setPosition(this.crateWorldX, this.crateWorldY - 10);
          this.animateFoodDeliveryToCrate(pod);
          return true;
        }
        return false;
      }
    };

    const cleanupScene = () => {
      EventBus.off('nutrition:sync-cargo', onSyncCargo);
      EventBus.off('nutrition:robo-state', onRoboState);
      EventBus.off('nutrition:celebrate', onCelebrate);
      this.scale.off('resize', onResize);
      delete (window as unknown as Record<string, unknown>).__ASTRONUTRI_NUTRITION_SCENE__;
    };

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanupScene);
    this.events.once(Phaser.Scenes.Events.DESTROY, cleanupScene);

    EventBus.emit('nutrition:scene-ready');
  }

  public override update(time: number, delta: number): void {
    if (this.earthPlanet) {
      this.earthPlanet.update(time, delta);
    }
    if (this.robo && this.robo.active) {
      this.robo.preUpdate(time, delta);

      const body = this.robo.body as Phaser.Physics.Arcade.Body | undefined;
      if (body) {
        const speed = Math.sqrt(body.velocity.x * body.velocity.x + body.velocity.y * body.velocity.y);
        if (speed > 25 && this.robo.currentState !== 'FLYING') {
          this.robo.setRoboState('FLYING');
        } else if (speed <= 25 && this.robo.currentState === 'FLYING') {
          this.robo.setRoboState('IDLE');
        }
      }
    }
  }

  private startSlingshot(anchorX: number, anchorY: number, _pointer: Phaser.Input.Pointer): void {
    this.isAimingSlingshot = true;
    this.slingshotAnchorX = anchorX;
    this.slingshotAnchorY = anchorY;

    soundManager.playClick();
    this.robo.setRoboState('IDLE');
    const roboBody = this.robo.body as Phaser.Physics.Arcade.Body;
    roboBody.setVelocity(0, 0);

    this.tweens.killTweensOf(this.robo);
    this.tweens.add({
      targets: this.robo,
      x: anchorX,
      y: anchorY + 30,
      duration: 180,
      ease: 'Quad.easeOut'
    });
  }

  private createHandrails(): void {
    this.handrails = [];

    const railConfigs: Array<{
      id: string;
      label: string;
      orientation: 'horizontal' | 'vertical';
      width: number;
      height: number;
    }> = [
      { id: 'eva-top', label: 'درابزين السقف 🚀 (اسحب للإطلاق)', orientation: 'horizontal', width: 260, height: 26 },
      { id: 'eva-mid', label: 'درابزين المنصة 🕹️ (اسحب للانطلاق)', orientation: 'horizontal', width: 280, height: 26 },
      { id: 'eva-left', label: 'درابزين الجدار الأيسر', orientation: 'vertical', width: 26, height: 160 },
      { id: 'eva-right', label: 'درابزين الجدار الأيمن', orientation: 'vertical', width: 26, height: 160 }
    ];

    railConfigs.forEach((cfg) => {
      const container = this.add.container(0, 0).setDepth(12);

      const glow = this.add.graphics();
      container.add(glow);

      const bar = this.add.graphics();
      container.add(bar);

      // Draw metallic high-visibility rail
      bar.fillStyle(0x0f172a, 0.9);
      bar.lineStyle(3, 0x38bdf8, 1);
      if (cfg.orientation === 'horizontal') {
        bar.fillRoundedRect(-cfg.width / 2, -cfg.height / 2, cfg.width, cfg.height, 8);
        bar.strokeRoundedRect(-cfg.width / 2, -cfg.height / 2, cfg.width, cfg.height, 8);
        // Yellow safety hazard grips
        bar.fillStyle(0xfacc15, 0.85);
        bar.fillRoundedRect(-cfg.width / 2 + 10, -cfg.height / 2 + 4, 32, cfg.height - 8, 4);
        bar.fillRoundedRect(cfg.width / 2 - 42, -cfg.height / 2 + 4, 32, cfg.height - 8, 4);
      } else {
        bar.fillRoundedRect(-cfg.width / 2, -cfg.height / 2, cfg.width, cfg.height, 8);
        bar.strokeRoundedRect(-cfg.width / 2, -cfg.height / 2, cfg.width, cfg.height, 8);
        // Yellow safety hazard grips
        bar.fillStyle(0xfacc15, 0.85);
        bar.fillRoundedRect(-cfg.width / 2 + 4, -cfg.height / 2 + 10, cfg.width - 8, 28, 4);
        bar.fillRoundedRect(-cfg.width / 2 + 4, cfg.height / 2 - 38, cfg.width - 8, 28, 4);
      }

      // Handrail label
      const label = this.add
        .text(0, cfg.orientation === 'horizontal' ? -cfg.height / 2 - 14 : cfg.height / 2 + 12, cfg.label, {
          fontFamily: 'Cairo, Tajawal, sans-serif',
          fontSize: '11px',
          fontStyle: 'bold',
          color: '#38bdf8',
          backgroundColor: '#030712cc',
          padding: { x: 6, y: 2 }
        })
        .setOrigin(0.5);
      container.add(label);

      // Make handrail interactive
      const hitZone = new Phaser.Geom.Rectangle(-cfg.width / 2 - 10, -cfg.height / 2 - 10, cfg.width + 20, cfg.height + 20);
      container.setInteractive(hitZone, Phaser.Geom.Rectangle.Contains);

      container.on('pointerover', () => {
        glow.clear();
        glow.lineStyle(6, 0xfacc15, 0.6);
        if (cfg.orientation === 'horizontal') {
          glow.strokeRoundedRect(-cfg.width / 2 - 4, -cfg.height / 2 - 4, cfg.width + 8, cfg.height + 8, 10);
        } else {
          glow.strokeRoundedRect(-cfg.width / 2 - 4, -cfg.height / 2 - 4, cfg.width + 8, cfg.height + 8, 10);
        }
      });

      container.on('pointerout', () => {
        if (!this.isAimingSlingshot) {
          glow.clear();
        }
      });

      container.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        this.startSlingshot(container.x, container.y, pointer);
      });

      this.handrails.push({ container, bar, glow, label, width: cfg.width, height: cfg.height, orientation: cfg.orientation });
    });
  }

  private createFoodPods(): void {
    this.foodPods = [];

    FOOD_DATABASE.forEach((item, index) => {
      const container = this.add.container(0, 0).setDepth(20);

      // Outer pulsing ring
      const glowRing = this.add.circle(0, 0, 52, 0x38bdf8, 0.22);
      glowRing.setStrokeStyle(3, 0x38bdf8, 0.85);
      container.add(glowRing);

      // Pod circular glass base (48px radius = 96px base touch diameter)
      const bgCircle = this.add.circle(0, 0, 48, 0x0f172a, 0.88);
      bgCircle.setStrokeStyle(3, 0x7dd3fc, 0.9);
      container.add(bgCircle);

      // Crisp 32bppArgb Food Sprite
      const sprite = this.add.image(0, -3, `food-${item.id}`);
      const maxDim = Math.max(sprite.width || 80, sprite.height || 80);
      const targetScale = 64 / maxDim;
      sprite.setScale(targetScale);
      container.add(sprite);

      // Category tag pill (Top-right of pod)
      const catLabel =
        item.category === 'protein'
          ? 'بروتين 💪'
          : item.category === 'carbs'
          ? 'طاقة ⚡'
          : item.category === 'special'
          ? 'ترطيب 💧'
          : 'افحص 🔎';
      const defaultBadgeBg = item.isBanned ? '#475569ee' : '#0284c7ee';
      const badgeText = this.add
        .text(0, -48, catLabel, {
          fontFamily: 'Cairo, Tajawal, sans-serif',
          fontSize: '11px',
          fontStyle: 'bold',
          color: '#ffffff',
          backgroundColor: defaultBadgeBg,
          padding: { x: 6, y: 2 }
        })
        .setOrigin(0.5);
      container.add(badgeText);

      // Bottom Arabic Food Name Label
      const labelBg = this.add.graphics();
      container.add(labelBg);

      const labelText = this.add
        .text(0, 46, item.nameAr || item.name, {
          fontFamily: 'Cairo, Tajawal, sans-serif',
          fontSize: '13px',
          fontStyle: 'bold',
          color: '#0f172a',
          align: 'center'
        })
        .setOrigin(0.5);

      const textW = Math.max(92, labelText.width + 18);
      labelBg.fillStyle(0xf8fafc, 0.96);
      labelBg.lineStyle(2, 0x38bdf8, 1);
      labelBg.fillRoundedRect(-textW / 2, 33, textW, 25, 10);
      labelBg.strokeRoundedRect(-textW / 2, 33, textW, 25, 10);
      container.add(labelText);

      // Make Pod Interactive for both Drag-and-Drop and Tap/Click
      bgCircle.setInteractive({ useHandCursor: true, draggable: true });

      const floatTween = this.tweens.add({
        targets: container,
        y: '+=7',
        duration: 1500 + index * 110,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      const podNode: FoodPodNode = {
        item,
        container,
        bgCircle,
        glowRing,
        sprite,
        labelBg,
        labelText,
        badgeText,
        defaultBadgeLabel: catLabel,
        defaultBadgeBg,
        homeX: 0,
        homeY: 0,
        baseScale: 1,
        floatTween,
        dragStartX: 0,
        dragStartY: 0,
        dragStartTime: 0,
        isDelivering: false
      };

      // Hover effects
      bgCircle.on('pointerover', () => {
        if (podNode.container.depth < 40 && !podNode.isDelivering) {
          this.tweens.add({
            targets: podNode.container,
            scaleX: podNode.baseScale * 1.1,
            scaleY: podNode.baseScale * 1.1,
            duration: 140,
            ease: 'Back.easeOut'
          });
        }
      });

      bgCircle.on('pointerout', () => {
        if (podNode.container.depth < 40 && !podNode.isDelivering) {
          this.tweens.add({
            targets: podNode.container,
            scaleX: podNode.baseScale,
            scaleY: podNode.baseScale,
            duration: 140,
            ease: 'Sine.easeOut'
          });
        }
      });

      // Drag Start
      bgCircle.on('dragstart', (pointer: Phaser.Input.Pointer) => {
        if (podNode.isDelivering) return;

        podNode.floatTween.pause();

        podNode.dragStartX = pointer.x;
        podNode.dragStartY = pointer.y;
        podNode.dragStartTime = this.time.now;

        podNode.container.setDepth(50);
        podNode.container.setScale(podNode.baseScale * 1.18);
        podNode.glowRing.setStrokeStyle(4, 0xfacc15, 1);

        // Notify React inspector card & have Robo fly/lean toward dragged item
        EventBus.emit('nutrition:food-inspected', { item: podNode.item });
        this.robo.setRoboState('FLYING', pointer.x, pointer.y);
      });

      // Drag Move
      bgCircle.on('drag', (pointer: Phaser.Input.Pointer) => {
        if (podNode.isDelivering) return;

        podNode.container.setPosition(pointer.x, pointer.y);

        const dist = Phaser.Math.Distance.Between(
          pointer.x,
          pointer.y,
          this.crateWorldX,
          this.crateWorldY
        );

        if (dist <= this.crateDropRadius) {
          this.crateGlowCircle.setFillStyle(0x34d399, 0.36);
          this.crateSprite.setScale(this.crateSprite.scaleX * 1.01);
        } else {
          this.crateGlowCircle.setFillStyle(0x22d3ee, 0.18);
        }
      });

      // Drag End (or Single Tap!)
      bgCircle.on('dragend', (pointer: Phaser.Input.Pointer) => {
        if (podNode.isDelivering) return;

        const dragDist = Phaser.Math.Distance.Between(
          podNode.dragStartX,
          podNode.dragStartY,
          pointer.x,
          pointer.y
        );
        const elapsed = this.time.now - podNode.dragStartTime;

        const distToCrate = Phaser.Math.Distance.Between(
          podNode.container.x,
          podNode.container.y,
          this.crateWorldX,
          this.crateWorldY
        );

        // If user tapped the item without dragging (< 16px movement) OR dropped it inside the crate drop zone:
        if ((dragDist < 16 && elapsed < 450) || distToCrate <= this.crateDropRadius) {
          this.animateFoodDeliveryToCrate(podNode);
        } else {
          // Return smoothly to shelf slot
          this.returnPodHome(podNode);
          this.robo.setRoboState('IDLE');
        }
      });

      this.foodPods.push(podNode);
    });
  }

  private syncFoodPodVisualStates(): void {
    for (const pod of this.foodPods) {
      if (pod.item.isBanned) continue;

      if (this.committedItemIds.has(pod.item.id)) {
        pod.glowRing.setStrokeStyle(3, 0x10b981, 0.95);
        pod.bgCircle.setStrokeStyle(3, 0x34d399, 1);
        pod.badgeText.setText('تم التعبئة ✅');
        pod.badgeText.setBackgroundColor('#059669');
      } else {
        pod.glowRing.setStrokeStyle(3, 0x38bdf8, 0.85);
        pod.bgCircle.setStrokeStyle(3, 0x7dd3fc, 0.9);
        pod.badgeText.setText(pod.defaultBadgeLabel);
        pod.badgeText.setBackgroundColor(pod.defaultBadgeBg);
      }
    }
  }

  private animateFoodDeliveryToCrate(podNode: FoodPodNode): void {
    if (podNode.isDelivering) return;

    const { item, container } = podNode;

    // 1. BANNED ZERO-G FOOD HAZARD (Crumbs or Fizzy Gas) -> Always Reject!
    if (item.isBanned) {
      podNode.isDelivering = true;
      this.tweens.add({
        targets: container,
        x: this.crateWorldX,
        y: this.crateWorldY - 18,
        scaleX: podNode.baseScale * 0.9,
        scaleY: podNode.baseScale * 0.9,
        duration: 220,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          this.pulseCrateFeedback('warning');
          if (this.hazardEmitter) {
            this.hazardEmitter.setPosition(this.crateWorldX, this.crateWorldY - 24);
            this.hazardEmitter.explode(18);
          }

          this.robo.setRoboState('WARNING');
          EventBus.emit('nutrition:food-banned', { item });

          // Mark pod ring crimson so child remembers it's hazardous in Zero-G
          podNode.glowRing.setStrokeStyle(4, 0xf43f5e, 1);
          podNode.bgCircle.setStrokeStyle(3, 0xfb7185, 1);
          podNode.badgeText.setText('ممنوع 🚫');
          podNode.badgeText.setBackgroundColor('#e11d48');

          // Deflect & bounce back to shelf slot
          this.returnPodHome(podNode);
        }
      });
      return;
    }

    // 2. DUPLICATE CHECK: Repeated tap or drag on an already packed item must NOT duplicate it!
    if (this.committedItemIds.has(item.id)) {
      podNode.isDelivering = true;
      this.pulseCrateFeedback('warning');
      this.robo.setRoboState('WARNING');
      EventBus.emit('nutrition:cargo-duplicate', { item });
      this.returnPodHome(podNode);
      return;
    }

    // 3. STRICT CAPACITY CHECK: Once 4 valid items are packed, prevent any additional items!
    if (this.committedItemIds.size >= NutritionLabScene.MAX_CARGO_CAPACITY) {
      podNode.isDelivering = true;
      this.tweens.add({
        targets: container,
        x: this.crateWorldX,
        y: this.crateWorldY - 24,
        scaleX: podNode.baseScale * 0.92,
        scaleY: podNode.baseScale * 0.92,
        duration: 180,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          this.pulseCrateFeedback('warning');
          this.robo.setRoboState('WARNING');
          EventBus.emit('nutrition:cargo-full', { item });
          this.returnPodHome(podNode);
        }
      });
      return;
    }

    // 4. ACCEPTED SPACE FOOD (Slot #1..#4): Reserve synchronously to prevent rapid-click races!
    podNode.isDelivering = true;
    this.committedItemIds.add(item.id);
    EventBus.emit('nutrition:food-packed', { item });

    this.tweens.add({
      targets: container,
      x: this.crateWorldX,
      y: this.crateWorldY - 18,
      scaleX: podNode.baseScale * 0.9,
      scaleY: podNode.baseScale * 0.9,
      duration: 240,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.pulseCrateFeedback('success');

        // Clean pop feedback & debounced sound
        if (!this.celebratedItemIds.has(item.id)) {
          this.celebratedItemIds.add(item.id);
          podNode.hasCelebrated = true;

          const now = performance.now();
          if (now - this.lastSuccessSoundTime > 350) {
            this.lastSuccessSoundTime = now;
            soundManager.playDropSuccess();
          }
        }

        this.robo.setRoboState('HAPPY');

        // Reset pod back to shelf slot with a pop-in
        container.setPosition(podNode.homeX, podNode.homeY);
        container.setScale(0.1);
        container.setDepth(20);
        podNode.glowRing.setStrokeStyle(3, 0x10b981, 0.95);
        podNode.bgCircle.setStrokeStyle(3, 0x34d399, 1);
        podNode.badgeText.setText('تم التعبئة ✅');
        podNode.badgeText.setBackgroundColor('#059669');

        this.tweens.add({
          targets: container,
          scaleX: podNode.baseScale,
          scaleY: podNode.baseScale,
          duration: 260,
          ease: 'Back.easeOut',
          onComplete: () => {
            podNode.isDelivering = false;
            podNode.floatTween.resume();
          }
        });
      }
    });
  }

  private returnPodHome(podNode: FoodPodNode): void {
    this.tweens.add({
      targets: podNode.container,
      x: podNode.homeX,
      y: podNode.homeY,
      scaleX: podNode.baseScale,
      scaleY: podNode.baseScale,
      duration: 300,
      ease: 'Back.easeOut',
      onComplete: () => {
        podNode.container.setDepth(20);
        podNode.isDelivering = false;
        podNode.floatTween.resume();
      }
    });
  }

  private pulseCrateFeedback(kind: 'success' | 'warning'): void {
    const color = kind === 'success' ? 0x10b981 : 0xf43f5e;
    this.crateGlowCircle.setFillStyle(color, 0.45);

    this.tweens.add({
      targets: this.crateContainer,
      scaleX: kind === 'success' ? 1.07 : 0.94,
      scaleY: kind === 'success' ? 0.94 : 1.06,
      angle: kind === 'warning' ? { from: -5, to: 5 } : 0,
      duration: 120,
      yoyo: true,
      repeat: kind === 'warning' ? 2 : 0,
      onComplete: () => {
        this.crateContainer.setAngle(0);
        this.crateContainer.setScale(1);
        this.crateGlowCircle.setFillStyle(0x22d3ee, 0.16);
      }
    });
  }

  private renderPackedCargoSprites(): void {
    if (!this.packedSpritesContainer) return;
    this.packedSpritesContainer.removeAll(true);

    const flatItems: FoodItem[] = [];
    for (const entry of this.currentCargo) {
      for (let i = 0; i < entry.quantity; i++) {
        flatItems.push(entry.item);
      }
    }

    const boundedItems = flatItems.slice(0, NutritionLabScene.MAX_CARGO_CAPACITY);
    const count = boundedItems.length;
    if (count === 0) {
      this.crateStatusText.setText('اسحب أو اضغط على طعام الفضاء لوضعه في الصندوق 🎯');
      return;
    }

    if (count >= NutritionLabScene.MAX_CARGO_CAPACITY) {
      this.crateStatusText.setText(
        'الصندوق ممتلئ! تم تجهيز 4/4 وجبات فضائية — اضغط على «موافق» للإقلاع! 🚀'
      );
    } else {
      this.crateStatusText.setText(
        `تم تجهيز ${count}/4 وجبات فضائية داخل الصندوق (اضغط على أي عنصر لإزالته)`
      );
    }

    const spacing = Math.min(48, 220 / Math.max(1, count));
    const startX = -((count - 1) * spacing) / 2;

    boundedItems.forEach((item, idx) => {
      const mini = this.add.image(startX + idx * spacing, -14 - (idx % 2) * 10, `food-${item.id}`);
      const maxDim = Math.max(mini.width || 70, mini.height || 70);
      mini.setScale(42 / maxDim);
      mini.setInteractive({ useHandCursor: true });

      this.tweens.add({
        targets: mini,
        y: mini.y - 6,
        duration: 900 + idx * 120,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      mini.on('pointerdown', () => {
        EventBus.emit('nutrition:remove-food', item.id);
      });

      this.packedSpritesContainer.add(mini);
    });
  }

  /**
   * Dynamically positions background layers, Cargo Crate, Robo, and the 9 Food Pods
   * across Desktop, Tablet, and Mobile Portrait/Landscape viewports.
   */
  private layoutScene(width: number, height: number): void {
    const isCompact = width < 720;
    const isShort = height < 560;

    // 1. Redraw clean futuristic space laboratory background layers
    this.bgGraphics.clear();

    // Deep space window sky gradient
    this.bgGraphics.fillGradientStyle(0x04102c, 0x04102c, 0x0b2960, 0x0b2960, 1);
    this.bgGraphics.fillRect(0, 0, width, height);

    // Panoramic Space Lab Observation Window Frame
    const deckTopY = height * (isCompact ? 0.45 : 0.48);
    this.bgGraphics.lineStyle(3, 0x38bdf8, 0.35);
    this.bgGraphics.strokeRoundedRect(16, 12, width - 32, deckTopY - 18, 28);

    // Metallic Lab Floor Deck & Anti-Gravity Shelf Area
    this.bgGraphics.fillGradientStyle(0x082046, 0x082046, 0x020617, 0x020617, 0.95);
    this.bgGraphics.fillRect(0, deckTopY, width, height - deckTopY);
    this.bgGraphics.lineStyle(3, 0x22d3ee, 0.55);
    this.bgGraphics.lineBetween(0, deckTopY, width, deckTopY);

    // Subtle Holographic Perspective Grid on Lab Floor
    this.bgGraphics.lineStyle(1, 0x0ea5e9, 0.16);
    for (let gx = 0; gx <= width; gx += Math.max(60, Math.floor(width / 12))) {
      this.bgGraphics.lineBetween(gx, deckTopY, gx, height);
    }

    // 2. Position Parallax Space Objects & Observation Window
    if (this.earthPlanet) {
      this.earthPlanet.setPosition(width * 0.5 + Math.min(width * 0.44, 440) * 0.5, 85);
      this.earthPlanet.setScale(isCompact ? 0.65 : 0.95);
    }

    // 3. Position Center Cargo Crate & Right Procedural Robo
    this.crateWorldX = isCompact ? width * 0.36 : width * 0.41;
    this.crateWorldY = isCompact ? deckTopY * 0.62 : deckTopY * 0.64;
    this.crateDropRadius = isCompact ? 115 : 155;

    const crateScale = isCompact ? 0.48 : isShort ? 0.56 : 0.68;
    this.crateContainer.setPosition(this.crateWorldX, this.crateWorldY);
    this.crateSprite.setScale(crateScale);
    this.crateGlowCircle.setRadius(165 * crateScale);
    this.crateStatusText.setPosition(0, -118 * crateScale);
    this.crateStatusText.setFontSize(isCompact ? 11 : 13);

    // Draw tractor beam funnel above crate
    this.crateBeamGraphics.clear();
    this.crateBeamGraphics.fillStyle(0x22d3ee, 0.11);
    const bw = 210 * crateScale;
    const bh = 95 * crateScale;
    this.crateBeamGraphics.fillTriangle(-bw, -bh, bw, -bh, 0, 20 * crateScale);

    // Position Robo on the right side of the upper stage
    const roboX = isCompact ? width * 0.79 : width * 0.77;
    const roboY = isCompact ? deckTopY * 0.58 : deckTopY * 0.60;
    const roboScale = isCompact ? 0.52 : isShort ? 0.62 : 0.76;
    this.robo.setHomeTransform(roboX, roboY, roboScale);

    // Position EVA Handrails for Zero-G grab & slingshot traversal (clean non-overlapping clearance)
    if (this.handrails.length >= 4) {
      this.handrails[0].container.setPosition(width * 0.5, 26);
      this.handrails[1].container.setPosition(width * 0.5, deckTopY + 18);
      this.handrails[2].container.setPosition(80, deckTopY * 0.5);
      this.handrails[3].container.setPosition(width - 80, deckTopY * 0.5);
    }

    // 4. Layout the 9 Interactive Zero-G Food Pods in the Lower Lab Shelf Area
    const shelfTop = deckTopY + (isCompact ? 34 : 44);
    const shelfHeight = Math.max(145, height - shelfTop - 18);

    if (isCompact) {
      // 3x3 Responsive Grid for Mobile Portrait (e.g. Android 390x844)
      const cols = 3;
      const rows = 3;
      const cellW = (width - 20) / cols;
      const cellH = shelfHeight / rows;
      const podScale = Math.max(0.56, Math.min(0.7, Math.min(cellW / 128, cellH / 118)));

      this.foodPods.forEach((pod, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const px = 10 + cellW * (col + 0.5);
        const py = shelfTop + cellH * (row + 0.44);
        pod.homeX = px;
        pod.homeY = py;
        pod.baseScale = podScale;
        pod.container.setPosition(px, py);
        pod.container.setScale(podScale);
      });
    } else {
      // 2-Row Balanced Rack for Desktop (1920x1080), Laptop (1366x768) & Tablet (768x1024)
      const row1Count = 5;
      const row2Count = 4;
      const rowH = shelfHeight / 2;
      const podScale = Math.max(0.62, Math.min(0.92, Math.min((width - 64) / (row1Count * 140), rowH / 122)));

      this.foodPods.forEach((pod, idx) => {
        const isRow1 = idx < row1Count;
        const countInRow = isRow1 ? row1Count : row2Count;
        const colIdx = isRow1 ? idx : idx - row1Count;
        const usableW = Math.min(width - 48, countInRow * 162);
        const startX = (width - usableW) / 2 + usableW / (countInRow * 2);
        const stepX = countInRow > 1 ? (usableW - usableW / countInRow) / (countInRow - 1) : 0;

        const px = startX + colIdx * stepX;
        const py = shelfTop + (isRow1 ? rowH * 0.38 : rowH * 1.38);

        pod.homeX = px;
        pod.homeY = py;
        pod.baseScale = podScale;
        pod.container.setPosition(px, py);
        pod.container.setScale(podScale);
      });
    }
  }
}
