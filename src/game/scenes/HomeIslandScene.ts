import Phaser from 'phaser';
import { EventBus } from '../EventBus';
import { soundManager } from '../../utils/sound';
import { ArticulatedRobo } from '../objects/ArticulatedRobo';
import { CelestialBody, EarthPlanet, SaturnPlanet } from '../objects/CelestialBody';
import { SpacecraftVessel } from '../objects/SpacecraftVessel';

export interface IslandConfig {
  index: number;
  key: string;
  nameAr: string;
  subtitleAr: string;
  themeColor: number;
  skyTint: { top: number; bottom: number };
}

export const ARCHIPELAGO_ISLANDS: IslandConfig[] = [
  {
    index: 0,
    key: 'NutritionLab',
    nameAr: 'حديقة ومختبر التغذية الفضائية',
    subtitleAr: 'صوبة هيدروبونيك ووجبات فضائية خالية من الفتات',
    themeColor: 0x10b981,
    skyTint: { top: 0x0f2a44, bottom: 0x0b1f35 }
  },
  {
    index: 1,
    key: 'SpaceScience',
    nameAr: 'أكاديمية الكواكب ورادار ناسا',
    subtitleAr: 'قبة مرصد وتليسكوب وكويكب 2010 PK ببيانات ناسا الحقيقية',
    themeColor: 0x0ea5e9,
    skyTint: { top: 0x0c1e3d, bottom: 0x08152e }
  },
  {
    index: 2,
    key: 'SuitRoom',
    nameAr: 'مركز اللياقة وبدلات الفضاء',
    subtitleAr: 'معايرة خوذة الذهب، ضغط 4.3 PSI وتمارين عضلات القلب',
    themeColor: 0x8b5cf6,
    skyTint: { top: 0x1e143b, bottom: 0x0e0924 }
  },
  {
    index: 3,
    key: 'LaunchPad',
    nameAr: 'منصة الإطلاق وبرج الصواريخ',
    subtitleAr: 'برج الإطلاق، صمامات الوقود وعد تنازلي 3-2-1',
    themeColor: 0xf59e0b,
    skyTint: { top: 0x2b1810, bottom: 0x150b06 }
  },
  {
    index: 4,
    key: 'LunarDashboard',
    nameAr: 'مستعمرة القمر أرتميس',
    subtitleAr: 'فوهة شاكلتون، لغز شبكة مياه ECLSS وحفار الجليد',
    themeColor: 0x3b82f6,
    skyTint: { top: 0x0f172a, bottom: 0x020617 }
  },
  {
    index: 5,
    key: 'ReturnToEarth',
    nameAr: 'كبسولة العودة إلى الأرض',
    subtitleAr: 'ممر الغلاف الجوي 20°-24°، موازنة ≤100 كجم ومظلات الهبوط',
    themeColor: 0x14b8a6,
    skyTint: { top: 0x092b30, bottom: 0x03171a }
  }
];

export class HomeIslandScene extends Phaser.Scene {
  private bgGraphics!: Phaser.GameObjects.Graphics;
  private speedLinesGraphics!: Phaser.GameObjects.Graphics;
  private earthPlanet!: EarthPlanet;
  private saturnPlanet!: SaturnPlanet;

  private islandContainer!: Phaser.GameObjects.Container;
  private propsContainer!: Phaser.GameObjects.Container;

  private islandContainers: Phaser.GameObjects.Container[] = [];
  private islandShadows: Phaser.GameObjects.Ellipse[] = [];
  private islandPropsContainers: Phaser.GameObjects.Container[] = [];
  private islandStatusLabels: Phaser.GameObjects.Text[] = [];
  private routeArcGraphics!: Phaser.GameObjects.Graphics;
  private flightTrailGraphics!: Phaser.GameObjects.Graphics;
  private unlockedKeys: Set<string> = new Set(['NutritionLab']);
  private completedKeys: Set<string> = new Set();
  private readonly ISLAND_SPACING = 620;
  private readonly ISLAND_ICONS = ['🍏', '🪐', '🧑‍🚀', '🚀', '🌕', '🌍'];

  private spacecraftVessel!: SpacecraftVessel;
  private robo!: ArticulatedRobo;

  public currentIslandIndex: number = 0;
  private isMoving: boolean = false;
  private isTransitioning: boolean = false;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: { [key: string]: Phaser.Input.Keyboard.Key };
  private sparkleEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;

  private walkableBounds = {
    minX: -240,
    maxX: 240,
    minY: -220,
    maxY: 60
  };

  constructor() {
    super({ key: 'HomeIslandScene' });
  }

  public preload(): void {
    ArticulatedRobo.preloadAssets(this);
    CelestialBody.preloadAssets(this);
    SpacecraftVessel.preloadAssets(this);
    this.load.image('island-base', '/assets/art/island_floating_base.png');
  }

  public create(): void {
    const { width, height } = this.scale;

    this.isTransitioning = false;
    this.isMoving = false;

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.shutdown, this);

    // Sparkle Particle Texture
    if (!this.textures.exists('particle-sparkle-star')) {
      const g = this.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0xffe69a, 1);
      g.fillCircle(8, 8, 6);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(8, 8, 3);
      g.generateTexture('particle-sparkle-star', 16, 16);
      g.destroy();
    }

    // 1. ATMOSPHERIC PARALLAX BACKGROUND
    this.bgGraphics = this.add.graphics().setScrollFactor(0).setDepth(0);
    this.speedLinesGraphics = this.add.graphics().setScrollFactor(0).setDepth(4);
    this.drawAtmosphericBackground(width, height);

    // 2. PROCEDURAL MATHEMATICALLY ANTI-ALIASED CELESTIAL BODIES (Fixed cosmic parallax)
    this.earthPlanet = new EarthPlanet(this, width * 0.16, height * 0.22, 68);
    this.earthPlanet.setDepth(1);
    this.earthPlanet.container.setScrollFactor(0);

    this.saturnPlanet = new SaturnPlanet(this, width * 0.84, height * 0.18, 56);
    this.saturnPlanet.setDepth(1);
    this.saturnPlanet.container.setScrollFactor(0);

    const earthBaseY = this.earthPlanet.container.y;
    const saturnBaseY = this.saturnPlanet.container.y;

    this.tweens.add({
      targets: this.earthPlanet.container,
      y: earthBaseY - 10,
      duration: 7000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.tweens.add({
      targets: this.saturnPlanet.container,
      y: saturnBaseY + 9,
      duration: 8500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // 3. SIDE-BY-SIDE 6-ISLAND ARCHIPELAGO IN WORLD SPACE
    this.routeArcGraphics = this.add.graphics().setDepth(3);
    this.flightTrailGraphics = this.add.graphics().setDepth(22);

    this.islandContainers = [];
    this.islandShadows = [];
    this.islandPropsContainers = [];
    this.islandStatusLabels = [];

    ARCHIPELAGO_ISLANDS.forEach((cfg, idx) => {
      const pos = this.getIslandWorldPos(idx);

      const shadow = this.add.ellipse(pos.x, pos.y + 295, 450, 74, 0x0a142e, 0.45).setDepth(2);
      const cont = this.add.container(pos.x, pos.y).setDepth(5);

      const baseImg = this.add.image(0, 0, 'island-base');
      baseImg.setOrigin(0.5, 0.5);
      baseImg.setScale(0.76);
      baseImg.setInteractive({ useHandCursor: true });
      baseImg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (this.isTransitioning) return;
        if (idx !== this.currentIslandIndex) {
          this.switchIsland(idx);
          return;
        }
        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const relX = worldPoint.x - cont.x;
        const relY = worldPoint.y - cont.y;
        if (
          relX >= this.walkableBounds.minX &&
          relX <= this.walkableBounds.maxX &&
          relY >= this.walkableBounds.minY &&
          relY <= this.walkableBounds.maxY
        ) {
          this.moveRoboTo(relX, relY);
        }
      });
      cont.add(baseImg);

      const propsCont = this.add.container(0, 0).setDepth(10);
      cont.add(propsCont);

      // Glossy Signpost Flag + Star Slot Status above each island
      this.buildIslandSignpost(idx, cfg, cont);

      // Build this island's 2.5D props inside its dedicated container
      this.islandContainer = cont;
      this.propsContainer = propsCont;
      this.buildIslandProps(idx);

      // Staggered gentle island bobbing
      this.tweens.add({
        targets: cont,
        y: pos.y - 12,
        duration: 5000 + idx * 220,
        delay: idx * 350,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          const dy = cont.y - pos.y;
          shadow.setScale(1 - dy * 0.014);
          shadow.setAlpha(0.45 - dy * 0.009);
        }
      });

      this.islandContainers.push(cont);
      this.islandShadows.push(shadow);
      this.islandPropsContainers.push(propsCont);
    });

    this.drawRouteArcs();

    // Activate starting island container pointers
    this.islandContainer = this.islandContainers[this.currentIslandIndex];
    this.propsContainer = this.islandPropsContainers[this.currentIslandIndex];

    // 4. OOP SPACECRAFT VESSEL docked on the active island
    this.spacecraftVessel = new SpacecraftVessel(this, 120, -15, 0.85);
    this.islandContainer.add(this.spacecraftVessel.container);

    // 5. RESPONSIVE CAMERA ZOOM & CENTER ON ACTIVE ISLAND
    this.applyResponsiveCamera(width, height, true);

    // 6. CANONICAL ARTICULATED ROBO CHARACTER
    this.createRoboEntity();

    // 7. PARTICLE EMITTER FOR INTERACTIVE SPARKLES
    this.sparkleEmitter = this.add.particles(0, 0, 'particle-sparkle-star', {
      speed: { min: 40, max: 140 },
      scale: { start: 1.2, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 800,
      gravityY: -40,
      emitting: false
    }).setDepth(30);

    // 8. KEYBOARD & POINTER INPUT
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasdKeys = {
        W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
      };
    }

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if ((pointer.event.target as HTMLElement)?.tagName === 'BUTTON') return;
      if (this.isTransitioning) return;

      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const relX = worldPoint.x - this.islandContainer.x;
      const relY = worldPoint.y - this.islandContainer.y;

      if (
        relX >= this.walkableBounds.minX &&
        relX <= this.walkableBounds.maxX &&
        relY >= this.walkableBounds.minY &&
        relY <= this.walkableBounds.maxY
      ) {
        this.moveRoboTo(relX, relY);
      }
    });

    // 9. EVENT BUS LISTENERS & SCENE LIFECYCLE CLEANUP
    EventBus.on('home-start-adventure-action', this.handleExternalStartAdventure);
    EventBus.on('home-switch-island', this.handleSwitchIslandEvent);
    EventBus.on('home-islands-sync', this.handleIslandsSync);
    EventBus.on('home-nudge-robo', this.handleNudgeRobo);
    this.scale.on('resize', this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.shutdown, this);
  }

  private getIslandWorldPos(index: number): { x: number; y: number } {
    return {
      x: index * this.ISLAND_SPACING,
      y: Math.sin(index * 0.9) * 28
    };
  }

  private getResponsiveZoom(width: number, height: number): number {
    const z = Math.min(width / 920, height / 700);
    return Phaser.Math.Clamp(z, 0.44, 1.05);
  }

  private applyResponsiveCamera(width: number, height: number, snapToActive: boolean): void {
    const cam = this.cameras.main;
    const zoom = this.getResponsiveZoom(width, height);
    cam.setZoom(zoom);

    const halfW = (width * 0.5) / zoom;
    const halfH = (height * 0.5) / zoom;
    if (this.earthPlanet) {
      this.earthPlanet.setPosition(width * 0.5 - halfW * 0.7, height * 0.5 - halfH * 0.62);
      this.earthPlanet.container.setScale(0.92 / Math.max(0.6, zoom));
    }
    if (this.saturnPlanet) {
      this.saturnPlanet.setPosition(width * 0.5 + halfW * 0.72, height * 0.5 - halfH * 0.66);
      this.saturnPlanet.container.setScale(0.92 / Math.max(0.6, zoom));
    }

    if (snapToActive) {
      const pos = this.getIslandWorldPos(this.currentIslandIndex);
      cam.centerOn(pos.x, pos.y - 12);
    }
  }

  private buildIslandSignpost(
    index: number,
    cfg: (typeof ARCHIPELAGO_ISLANDS)[number],
    parentContainer: Phaser.GameObjects.Container
  ): void {
    const signCont = this.add.container(0, -210).setDepth(25);

    const pole = this.add.graphics();
    pole.fillStyle(0x94a3b8, 0.9);
    pole.fillRoundedRect(-4, 16, 8, 56, 4);
    signCont.add(pole);

    const pillBg = this.add.graphics();
    pillBg.fillStyle(0x0f172a, 0.88);
    pillBg.fillRoundedRect(-124, -44, 248, 62, 18);
    pillBg.lineStyle(3, cfg.themeColor, 0.95);
    pillBg.strokeRoundedRect(-124, -44, 248, 62, 18);
    signCont.add(pillBg);

    const icon = this.ISLAND_ICONS[index] || '🚀';
    const titleText = this.add.text(0, -24, `${icon} ${cfg.nameAr}`, {
      fontFamily: 'Cairo, Tajawal, sans-serif',
      fontSize: '17px',
      fontStyle: 'bold',
      color: '#ffffff',
      rtl: true
    }).setOrigin(0.5);
    signCont.add(titleText);

    const statusText = this.add.text(0, 2, '☆ ☆ ☆  اضغط للاستكشاف', {
      fontFamily: 'Cairo, Tajawal, sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#fde68a',
      rtl: true
    }).setOrigin(0.5);
    signCont.add(statusText);

    const signHit = this.add.zone(0, -14, 248, 64).setInteractive({ useHandCursor: true });
    signHit.on('pointerdown', () => {
      if (this.isTransitioning) return;
      if (index !== this.currentIslandIndex) {
        this.switchIsland(index);
      } else {
        this.robo?.playCheerfulBounce();
      }
    });
    signCont.add(signHit);

    parentContainer.add(signCont);
    this.islandStatusLabels[index] = statusText;
    this.refreshIslandSignpost(index);
  }

  private refreshIslandSignpost(index: number): void {
    const cfg = ARCHIPELAGO_ISLANDS[index];
    const label = this.islandStatusLabels[index];
    if (!cfg || !label) return;

    const isCompleted = this.completedKeys.has(cfg.key);
    const isUnlocked = this.unlockedKeys.has(cfg.key);
    if (isCompleted) {
      label.setText('★ ★ ★  مكتملة ✅');
      label.setColor('#6ee7b7');
    } else if (isUnlocked) {
      label.setText(index === this.currentIslandIndex ? '🚀 المحطة النشطة الآن' : '☆ ☆ ☆  مفتوحة — طر هنا ✈️');
      label.setColor('#67e8f9');
    } else {
      label.setText('🔒 أكمل المحطة السابقة');
      label.setColor('#fcd34d');
    }
  }

  private drawRouteArcs(): void {
    if (!this.routeArcGraphics) return;
    this.routeArcGraphics.clear();

    for (let i = 0; i < ARCHIPELAGO_ISLANDS.length - 1; i++) {
      const a = this.getIslandWorldPos(i);
      const b = this.getIslandWorldPos(i + 1);
      const nextUnlocked = this.unlockedKeys.has(ARCHIPELAGO_ISLANDS[i + 1].key);

      const p0x = a.x + 125;
      const p0y = a.y - 25;
      const p2x = b.x - 105;
      const p2y = b.y - 25;
      const ctrlX = (p0x + p2x) * 0.5;
      const ctrlY = Math.min(p0y, p2y) - 125;

      const dotCount = 16;
      for (let step = 1; step < dotCount; step++) {
        const t = step / dotCount;
        const mt = 1 - t;
        const px = mt * mt * p0x + 2 * mt * t * ctrlX + t * t * p2x;
        const py = mt * mt * p0y + 2 * mt * t * ctrlY + t * t * p2y;

        this.routeArcGraphics.fillStyle(nextUnlocked ? 0x38bdf8 : 0x64748b, nextUnlocked ? 0.5 : 0.25);
        this.routeArcGraphics.fillCircle(px, py, nextUnlocked ? 7 : 5);
        this.routeArcGraphics.fillStyle(nextUnlocked ? 0xfde047 : 0x94a3b8, nextUnlocked ? 0.95 : 0.45);
        this.routeArcGraphics.fillCircle(px, py, nextUnlocked ? 3.5 : 2.5);
      }
    }
  }

  private handleIslandsSync = (payload: { unlockedKeys?: string[]; completedKeys?: string[] }): void => {
    if (Array.isArray(payload?.unlockedKeys)) {
      this.unlockedKeys = new Set(payload.unlockedKeys);
    }
    if (Array.isArray(payload?.completedKeys)) {
      this.completedKeys = new Set(payload.completedKeys);
    }
    ARCHIPELAGO_ISLANDS.forEach((_, idx) => this.refreshIslandSignpost(idx));
    this.drawRouteArcs();
  };

  private handleNudgeRobo = ({ dx = 0, dy = 0 }: { dx?: number; dy?: number }): void => {
    if (!this.robo || this.isTransitioning) return;
    this.moveRoboTo(this.robo.x + dx, this.robo.y + dy);
  };

  private drawAtmosphericBackground(width: number, height: number): void {
    this.bgGraphics.clear();
    const cfg = ARCHIPELAGO_ISLANDS[this.currentIslandIndex] || ARCHIPELAGO_ISLANDS[0];

    const padW = Math.max(2400, width * 3);
    const padH = Math.max(2000, height * 3);
    this.bgGraphics.fillGradientStyle(
      cfg.skyTint.top, cfg.skyTint.top,
      cfg.skyTint.bottom, cfg.skyTint.bottom,
      1
    );
    this.bgGraphics.fillRect(-padW * 0.35, -padH * 0.35, padW, padH);

    // Deep space celestial light accents
    this.bgGraphics.fillStyle(cfg.themeColor, 0.08);
    this.bgGraphics.fillCircle(width * 0.85, height * 0.25, 320);
    this.bgGraphics.fillStyle(0x38bdf8, 0.06);
    this.bgGraphics.fillCircle(width * 0.15, height * 0.75, 340);

    // Twinkling background stars across wide cosmic viewport
    this.bgGraphics.fillStyle(0xffffff, 0.85);
    const starSeed = [
      [-0.35, -0.2, 2], [-0.15, 0.05, 1.8], [0.05, 0.12, 1.5], [0.12, 0.35, 2],
      [0.22, 0.08, 1.5], [0.34, 0.22, 2.5], [0.48, 0.15, 1.5], [0.62, 0.09, 2],
      [0.72, 0.28, 1.5], [0.88, 0.14, 2.5], [0.94, 0.45, 1.5], [1.15, 0.2, 2],
      [-0.25, 0.72, 2], [0.08, 0.65, 2], [0.28, 0.82, 1.5], [0.78, 0.72, 2],
      [0.92, 0.85, 1.5], [1.22, 0.78, 2.2]
    ];
    starSeed.forEach(([rx, ry, s]) => {
      this.bgGraphics.fillCircle(width * rx, height * ry, s);
    });
  }

  /**
   * Builds distinct 2.5D visual props for each of the 6 Space Archipelago Islands.
   */
  private buildIslandProps(index: number): void {
    this.propsContainer.removeAll(true);

    if (index === 0) {
      // =====================================================================
      // ISLAND 0: NUTRITION GARDEN & LAB (حديقة ومختبر التغذية)
      // =====================================================================
      // 1. Hydroponic Greenhouse Dome
      const dome = this.add.graphics();
      dome.lineStyle(3, 0x10b981, 0.9);
      dome.fillStyle(0x064e3b, 0.6);
      dome.beginPath();
      dome.arc(-110, -80, 52, Math.PI, 0, false);
      dome.closePath();
      dome.fillPath();
      dome.strokePath();

      dome.lineStyle(1.5, 0x34d399, 0.7);
      dome.beginPath();
      dome.arc(-110, -80, 52, Math.PI * 1.25, Math.PI * 1.75, false);
      dome.strokePath();

      const plantGlow = this.add.circle(-110, -70, 24, 0x10b981, 0.35);
      this.tweens.add({
        targets: plantGlow,
        alpha: { from: 0.2, to: 0.6 },
        scale: { from: 0.9, to: 1.15 },
        duration: 1600,
        yoyo: true,
        repeat: -1
      });

      const domeZone = this.add.circle(-110, -80, 54, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
      domeZone.on('pointerdown', () => {
        soundManager.playCrystalSparkle();
        this.sparkleEmitter.setPosition(this.islandContainer.x - 110, this.islandContainer.y - 80);
        this.sparkleEmitter.explode(15);
        EventBus.emit('home-prop-clicked', {
          prop: 'dome',
          name: 'صوبة الهيدروبونيك الفضائية 🥬',
          message: 'الصوبة الزراعية تعمل بضوء LED وتنتج الفراولة والبروكلي الطازج لرواد الفضاء!'
        });
      });

      // 2. Crystal Prop
      const crystal = this.add.container(-170, -115);
      const cGlow = this.add.circle(0, 0, 30, 0x34d399, 0.3);
      const cShape = this.add.polygon(0, 0, [0, -22, 14, 0, 0, 22, -14, 0], 0x6ee7b7, 0.9);
      cShape.setStrokeStyle(2, 0xffffff, 1);
      const cZone = this.add.circle(0, 0, 32, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
      cZone.on('pointerdown', () => {
        soundManager.playCrystalSparkle();
        this.sparkleEmitter.setPosition(this.islandContainer.x - 170, this.islandContainer.y - 115);
        this.sparkleEmitter.explode(14);
        EventBus.emit('home-prop-clicked', {
          prop: 'crystal',
          name: 'بلورات طاقة الزراعة 💎',
          message: 'عثرت على بلورات نمو النباتات! تمنح حديقة الفضاء طاقة نقية مستمرة!'
        });
      });
      crystal.add([cGlow, cShape, cZone]);
      this.propsContainer.add([dome, plantGlow, domeZone, crystal]);

    } else if (index === 1) {
      // =====================================================================
      // ISLAND 1: PLANET ACADEMY & NASA RADAR (أكاديمية الكواكب ورادار ناسا)
      // =====================================================================
      const obs = this.add.container(-120, -90);
      const obsDome = this.add.graphics();
      obsDome.lineStyle(3, 0x38bdf8, 0.9);
      obsDome.fillStyle(0x0c4a6e, 0.75);
      obsDome.beginPath();
      obsDome.arc(0, 0, 56, Math.PI, 0, false);
      obsDome.closePath();
      obsDome.fillPath();
      obsDome.strokePath();

      const telescope = this.add.graphics();
      telescope.lineStyle(4, 0xfacc15, 1);
      telescope.beginPath();
      telescope.moveTo(10, -20);
      telescope.lineTo(45, -55);
      telescope.strokePath();

      const radarDish = this.add.arc(70, -20, 26, 0.6, 2.6, false, 0xfde047, 0.85);
      radarDish.setStrokeStyle(2, 0xffffff);
      this.tweens.add({
        targets: radarDish,
        angle: { from: -25, to: 35 },
        duration: 2200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      const orb1 = this.add.circle(-30, -70, 8, 0xef4444, 0.95);
      orb1.setStrokeStyle(1.5, 0xffffff);
      this.tweens.add({
        targets: orb1,
        x: { from: -45, to: 45 },
        y: { from: -75, to: -65 },
        scale: { from: 0.8, to: 1.2 },
        duration: 3200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      const obsZone = this.add.circle(0, -10, 65, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
      obsZone.on('pointerdown', () => {
        soundManager.playClick();
        this.sparkleEmitter.setPosition(this.islandContainer.x - 120, this.islandContainer.y - 90);
        this.sparkleEmitter.explode(15);
        EventBus.emit('home-prop-clicked', {
          prop: 'telescope',
          name: 'مرصد ناسا الفلكي 🔭',
          message: 'التلسكوب يراقب كويكب 2010 PK ببيانات حقيقية! المسافة: 0.038 AU والسرعة: 14.8 كم/ث!'
        });
      });
      obs.add([obsDome, telescope, radarDish, orb1, obsZone]);
      this.propsContainer.add(obs);

    } else if (index === 2) {
      // =====================================================================
      // ISLAND 2: FITNESS & SPACESUITS (مركز اللياقة وبدلات الفضاء)
      // =====================================================================
      const gym = this.add.container(-115, -85);
      const gymDome = this.add.graphics();
      gymDome.lineStyle(3, 0xa855f7, 0.9);
      gymDome.fillStyle(0x3b0764, 0.7);
      gymDome.beginPath();
      gymDome.arc(0, 0, 52, Math.PI, 0, false);
      gymDome.closePath();
      gymDome.fillPath();
      gymDome.strokePath();

      const suitPod = this.add.graphics();
      suitPod.lineStyle(2, 0xc084fc, 1);
      suitPod.fillStyle(0x581c87, 0.85);
      suitPod.fillRoundedRect(-22, -45, 44, 45, 8);
      suitPod.strokeRoundedRect(-22, -45, 44, 45, 8);

      const goldVisor = this.add.ellipse(0, -32, 18, 10, 0xfacc15, 0.95);
      goldVisor.setStrokeStyle(1.5, 0xffffff);

      const barbell = this.add.graphics();
      barbell.lineStyle(3, 0x38bdf8, 1);
      barbell.lineBetween(40, -10, 80, -10);
      barbell.fillStyle(0xe2e8f0, 1);
      barbell.fillCircle(40, -10, 8);
      barbell.fillCircle(80, -10, 8);

      const gymZone = this.add.circle(10, -20, 65, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
      gymZone.on('pointerdown', () => {
        soundManager.playClick();
        this.sparkleEmitter.setPosition(this.islandContainer.x - 115, this.islandContainer.y - 85);
        this.sparkleEmitter.explode(15);
        EventBus.emit('home-prop-clicked', {
          prop: 'suit',
          name: 'حجرة بدلة السير الفضائي EMU 👨‍🚀',
          message: 'ضغط الأكسجين المعتمد في ناسا هو 4.3 PSI! يحميك من التيبس ويسمح بحركة اليد بسهولة.'
        });
      });
      gym.add([gymDome, suitPod, goldVisor, barbell, gymZone]);
      this.propsContainer.add(gym);

    } else if (index === 3) {
      // =====================================================================
      // ISLAND 3: LAUNCHPAD & TOWER (منصة الإطلاق ورحلة 0G)
      // =====================================================================
      const pad = this.add.container(-120, -95);
      const tower = this.add.graphics();
      tower.lineStyle(3, 0xf97316, 1);
      tower.lineBetween(0, 20, 0, -90);
      tower.lineBetween(-20, 20, -20, -90);
      for (let y = 10; y >= -80; y -= 18) {
        tower.lineBetween(-20, y, 0, y - 10);
        tower.lineBetween(0, y, -20, y - 10);
      }
      tower.lineStyle(4, 0xfef08a, 1);
      tower.lineBetween(0, -70, 50, -70);

      const sign = this.add.text(15, -60, '03:00', {
        fontFamily: 'Courier, monospace',
        fontSize: '12px',
        color: '#22c55e',
        backgroundColor: '#020617',
        padding: { x: 4, y: 2 }
      });

      const padZone = this.add.circle(10, -40, 60, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
      padZone.on('pointerdown', () => {
        soundManager.playPneumatic();
        this.sparkleEmitter.setPosition(this.islandContainer.x - 120, this.islandContainer.y - 95);
        this.sparkleEmitter.explode(16);
        EventBus.emit('home-prop-clicked', {
          prop: 'launchtower',
          name: 'برج منصة الإطلاق 🚀',
          message: 'فحص صمامات الأكسجين والوقود اكتمل! العد التنازلي جاهز للإطلاق نحو المدار!'
        });
      });
      pad.add([tower, sign, padZone]);
      this.propsContainer.add(pad);

    } else if (index === 4) {
      // =====================================================================
      // ISLAND 4: LUNAR OUTPOST ARTEMIS (مستعمرة القمر أرتميس)
      // =====================================================================
      const lunar = this.add.container(-120, -85);
      const lunarDome = this.add.graphics();
      lunarDome.lineStyle(3, 0x60a5fa, 0.9);
      lunarDome.fillStyle(0x1e293b, 0.8);
      lunarDome.beginPath();
      lunarDome.arc(0, 0, 50, Math.PI, 0, false);
      lunarDome.closePath();
      lunarDome.fillPath();
      lunarDome.strokePath();

      lunarDome.lineStyle(1.5, 0x93c5fd, 0.6);
      lunarDome.strokeCircle(0, -20, 20);

      const panel = this.add.graphics();
      panel.lineStyle(2, 0x38bdf8, 1);
      panel.fillStyle(0x0284c7, 0.85);
      panel.fillRoundedRect(50, -40, 34, 18, 4);
      panel.strokeRoundedRect(50, -40, 34, 18, 4);
      panel.lineBetween(67, -22, 67, 10);

      const drill = this.add.graphics();
      drill.lineStyle(3, 0x38bdf8, 1);
      drill.lineBetween(-50, 15, -50, -35);
      drill.lineStyle(2, 0x67e8f9, 0.9);
      drill.strokeCircle(-50, -35, 8);

      const lunarZone = this.add.circle(10, -20, 65, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
      lunarZone.on('pointerdown', () => {
        soundManager.playCrystalSparkle();
        this.sparkleEmitter.setPosition(this.islandContainer.x - 120, this.islandContainer.y - 85);
        this.sparkleEmitter.explode(15);
        EventBus.emit('home-prop-clicked', {
          prop: 'lunardome',
          name: 'قاعدة أرتميس القمرية 🌙',
          message: 'فوهة شاكلتون تحتوي على جليد مائي دائم في الظلام! نستخدمه للشرب ولإنتاج وقود الصواريخ.'
        });
      });
      lunar.add([lunarDome, panel, drill, lunarZone]);
      this.propsContainer.add(lunar);

    } else if (index === 5) {
      // =====================================================================
      // ISLAND 5: RETURN TO EARTH CAPSULE (كبسولة العودة إلى الأرض)
      // =====================================================================
      const ret = this.add.container(-110, -85);
      const capsule = this.add.graphics();
      capsule.fillStyle(0xf1f5f9, 1);
      capsule.lineStyle(3, 0x0f766e, 1);
      capsule.beginPath();
      capsule.moveTo(0, -50);
      capsule.lineTo(32, 10);
      capsule.lineTo(-32, 10);
      capsule.closePath();
      capsule.fillPath();
      capsule.strokePath();

      capsule.fillStyle(0x451a03, 1);
      capsule.fillRoundedRect(-34, 10, 68, 8, 3);

      capsule.fillStyle(0x38bdf8, 1);
      capsule.fillCircle(0, -15, 8);

      const parachute = this.add.graphics();
      parachute.lineStyle(2, 0xf97316, 0.9);
      parachute.beginPath();
      parachute.arc(-40, -60, 35, Math.PI * 0.9, Math.PI * 1.9, false);
      parachute.strokePath();
      parachute.lineBetween(-40, -25, 0, -50);

      const retZone = this.add.circle(0, -15, 60, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
      retZone.on('pointerdown', () => {
        soundManager.playFanfare();
        this.sparkleEmitter.setPosition(this.islandContainer.x - 110, this.islandContainer.y - 85);
        this.sparkleEmitter.explode(18);
        EventBus.emit('home-prop-clicked', {
          prop: 'capsule',
          name: 'كبسولة العودة للأرض 🌍',
          message: 'مهمة الهبوط الناجحة! توازن الحمولة ≤100 كجم وزاوية الدخول 22° تحمي الكبسولة من حرارة الاحتكاك!'
        });
      });
      ret.add([parachute, capsule, retZone]);
      this.propsContainer.add(ret);
    }
  }

  private createRoboEntity(): void {
    this.robo = new ArticulatedRobo(this, -20, -50, 0.62);
    this.robo.setDepth(20);
    this.robo.setRoboState('IDLE');
    this.robo.setLocomotionMode('EARTH_1G');

    const clickZone = this.add.circle(0, -35, 45, 0xffffff, 0.001);
    clickZone.setInteractive({ useHandCursor: true });
    clickZone.on('pointerdown', () => {
      soundManager.playClick();
      this.robo.playCheerfulBounce();
      this.sparkleEmitter.setPosition(this.islandContainer.x + this.robo.x, this.islandContainer.y + this.robo.y - 40);
      this.sparkleEmitter.explode(12);
      EventBus.emit('home-robo-greet');
    });

    this.robo.add(clickZone);
    this.islandContainer.add(this.robo);
  }

  private moveRoboTo(targetRelX: number, targetRelY: number, onArrival?: () => void): void {
    if (!this.robo) return;
    this.tweens.killTweensOf(this.robo);

    const clampedX = Phaser.Math.Clamp(targetRelX, this.walkableBounds.minX, this.walkableBounds.maxX);
    const clampedY = Phaser.Math.Clamp(targetRelY, this.walkableBounds.minY, this.walkableBounds.maxY);

    const dist = Phaser.Math.Distance.Between(this.robo.x, this.robo.y, clampedX, clampedY);
    if (dist < 8) {
      if (onArrival) onArrival();
      return;
    }

    this.isMoving = true;
    this.robo.setRoboState('WALKING');

    const duration = Math.max(300, Math.min(1800, dist * 5.5));
    this.tweens.add({
      targets: this.robo,
      x: clampedX,
      y: clampedY,
      duration,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.isMoving = false;
        this.robo.setRoboState('IDLE');
        this.robo.setDepth(15 + Math.floor(clampedY * 0.1));
        if (onArrival) onArrival();
      }
    });
  }

  /**
   * Smooth Spaceship Flight Transition between Islands:
   * Robo boards the spaceship -> thrusters fire -> island slides away ->
   * warp star lines streak -> new island slides in -> ship lands -> Robo exits.
   */
  public switchIsland(newIndex: number): void {
    if (
      newIndex < 0 ||
      newIndex >= ARCHIPELAGO_ISLANDS.length ||
      newIndex === this.currentIslandIndex ||
      this.isTransitioning
    ) {
      return;
    }
    this.isTransitioning = true;

    soundManager.playClick();
    soundManager.playPressurizeHiss();

    const fromCont = this.islandContainers[this.currentIslandIndex];
    const destCont = this.islandContainers[newIndex];
    const destPos = this.getIslandWorldPos(newIndex);

    // 1. Robo walks to spaceship hatch
    this.moveRoboTo(100, -25, () => {
      // 2. Spaceship hatch opens, Robo enters
      this.spacecraftVessel.triggerBoardingSequence(() => {
        this.robo.setVisible(false);
        this.cameras.main.shake(180, 0.003);

        // Reparent spaceship into world space so it flies smoothly along the curved trajectory arc
        const p0 = { x: fromCont.x + 120, y: fromCont.y - 15 };
        const p2 = { x: destPos.x + 120, y: destPos.y - 15 };
        const ctrl = {
          x: (p0.x + p2.x) * 0.5,
          y: Math.min(p0.y, p2.y) - 185
        };

        fromCont.remove(this.spacecraftVessel.container, false);
        this.add.existing(this.spacecraftVessel.container);
        this.spacecraftVessel.container.setPosition(p0.x, p0.y).setDepth(26);

        // Pan camera across the archipelago toward destination island
        const flightDuration = 1050;
        this.cameras.main.pan(destPos.x, destPos.y - 12, flightDuration, 'Sine.easeInOut');

        const flightState = { t: 0 };
        this.tweens.add({
          targets: flightState,
          t: 1,
          duration: flightDuration,
          ease: 'Sine.easeInOut',
          onUpdate: () => {
            const t = flightState.t;
            const mt = 1 - t;
            const bx = mt * mt * p0.x + 2 * mt * t * ctrl.x + t * t * p2.x;
            const by = mt * mt * p0.y + 2 * mt * t * ctrl.y + t * t * p2.y;

            const dx = 2 * mt * (ctrl.x - p0.x) + 2 * t * (p2.x - ctrl.x);
            const dy = 2 * mt * (ctrl.y - p0.y) + 2 * t * (p2.y - ctrl.y);
            const bankAngle = Phaser.Math.Clamp(Math.atan2(dy, dx) * 0.25, -0.35, 0.35);

            this.spacecraftVessel.container.setPosition(bx, by);
            this.spacecraftVessel.container.setRotation(bankAngle);

            // Glowing live flight arc trail behind vessel
            if (this.flightTrailGraphics) {
              this.flightTrailGraphics.clear();
              this.flightTrailGraphics.lineStyle(5, 0x38bdf8, 0.55);
              this.flightTrailGraphics.beginPath();
              this.flightTrailGraphics.moveTo(p0.x, p0.y);
              const subSteps = 20;
              for (let s = 1; s <= subSteps; s++) {
                const st = t * (s / subSteps);
                const smt = 1 - st;
                const sx = smt * smt * p0.x + 2 * smt * st * ctrl.x + st * st * p2.x;
                const sy = smt * smt * p0.y + 2 * smt * st * ctrl.y + st * st * p2.y;
                this.flightTrailGraphics.lineTo(sx, sy);
              }
              this.flightTrailGraphics.strokePath();
            }

            if (Math.random() < 0.35 && this.sparkleEmitter) {
              this.sparkleEmitter.setPosition(bx, by + 18);
              this.sparkleEmitter.explode(1);
            }
          },
          onComplete: () => {
            if (this.flightTrailGraphics) this.flightTrailGraphics.clear();
            this.speedLinesGraphics.clear();

            // Reparent vessel & robo onto destination island
            this.spacecraftVessel.container.setRotation(0);
            this.children.remove(this.spacecraftVessel.container);
            destCont.add(this.spacecraftVessel.container);
            this.spacecraftVessel.setPosition(120, -15);
            this.spacecraftVessel.container.setScale(0.85).setAlpha(1).setDepth(18);

            fromCont.remove(this.robo, false);
            destCont.add(this.robo);

            this.currentIslandIndex = newIndex;
            this.islandContainer = destCont;
            this.propsContainer = this.islandPropsContainers[newIndex];
            this.drawAtmosphericBackground(this.scale.width, this.scale.height);
            ARCHIPELAGO_ISLANDS.forEach((_, idx) => this.refreshIslandSignpost(idx));

            soundManager.playPneumatic();
            this.sparkleEmitter.setPosition(destCont.x + 120, destCont.y - 15);
            this.sparkleEmitter.explode(16);

            this.time.delayedCall(220, () => {
              this.robo.setPosition(60, -35);
              this.robo.setVisible(true);
              this.moveRoboTo(-20, -50, () => {
                this.robo.setRoboState('CELEBRATING');
                this.robo.playCheerfulBounce();
                this.isTransitioning = false;
                EventBus.emit('home-island-changed', {
                  index: newIndex,
                  config: ARCHIPELAGO_ISLANDS[newIndex]
                });
              });
            });
          }
        });
      });
    });
  }

  private handleSwitchIslandEvent = (targetIndex: number): void => {
    this.switchIsland(targetIndex);
  };

  private handleExternalStartAdventure = (): void => {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    const activeIsland = ARCHIPELAGO_ISLANDS[this.currentIslandIndex] || ARCHIPELAGO_ISLANDS[0];

    // Fail-safe timeout so transition lock NEVER sticks
    const safetyTimer = this.time.delayedCall(1200, () => {
      this.isTransitioning = false;
      EventBus.emit('home-launch-mission', activeIsland.key);
    });

    this.robo.setLocomotionMode('TRANSIT_0G');
    this.moveRoboTo(100, -25, () => {
      soundManager.playFanfare();
      this.spacecraftVessel.triggerBoardingSequence(() => {
        safetyTimer.remove(false);
        this.isTransitioning = false;
        EventBus.emit('home-launch-mission', activeIsland.key);
      });
    });
  };

  public override update(time: number, delta: number): void {
    if (this.earthPlanet) this.earthPlanet.update(time, delta);
    if (this.saturnPlanet) this.saturnPlanet.update(time, delta);
    if (this.robo) this.robo.update(time, delta);

    if (!this.robo || !this.cursors || this.isTransitioning) return;

    let dx = 0;
    let dy = 0;
    const speed = 3.2;

    if (this.cursors.left.isDown || this.wasdKeys?.A?.isDown) dx -= speed;
    if (this.cursors.right.isDown || this.wasdKeys?.D?.isDown) dx += speed;
    if (this.cursors.up.isDown || this.wasdKeys?.W?.isDown) dy -= speed;
    if (this.cursors.down.isDown || this.wasdKeys?.S?.isDown) dy += speed;

    if (dx !== 0 || dy !== 0) {
      this.isMoving = false;
      this.tweens.killTweensOf(this.robo);
      this.robo.setRoboState('WALKING');

      const nextX = Phaser.Math.Clamp(this.robo.x + dx, this.walkableBounds.minX, this.walkableBounds.maxX);
      const nextY = Phaser.Math.Clamp(this.robo.y + dy, this.walkableBounds.minY, this.walkableBounds.maxY);

      this.robo.x = nextX;
      this.robo.y = nextY;
      this.robo.setDepth(15 + Math.floor(nextY * 0.1));
    } else if (this.robo && this.robo.currentState === 'WALKING' && !this.isMoving) {
      this.robo.setRoboState('IDLE');
    }
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    const { width, height } = gameSize;
    this.drawAtmosphericBackground(width, height);
    this.applyResponsiveCamera(width, height, !this.isTransitioning);
  }

  public shutdown(): void {
    this.events.off(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
    this.events.off(Phaser.Scenes.Events.DESTROY, this.shutdown, this);
    EventBus.off('home-start-adventure-action', this.handleExternalStartAdventure);
    EventBus.off('home-switch-island', this.handleSwitchIslandEvent);
    EventBus.off('home-islands-sync', this.handleIslandsSync);
    EventBus.off('home-nudge-robo', this.handleNudgeRobo);
    this.scale.off('resize', this.handleResize, this);
    if (this.flightTrailGraphics) {
      this.flightTrailGraphics.destroy();
    }
    if (this.routeArcGraphics) {
      this.routeArcGraphics.destroy();
    }
    if (this.earthPlanet) {
      this.earthPlanet.destroy();
      (this.earthPlanet as unknown) = undefined;
    }
    if (this.saturnPlanet) {
      this.saturnPlanet.destroy();
      (this.saturnPlanet as unknown) = undefined;
    }
    if (this.spacecraftVessel) {
      this.spacecraftVessel.destroy();
      (this.spacecraftVessel as unknown) = undefined;
    }
  }
}
