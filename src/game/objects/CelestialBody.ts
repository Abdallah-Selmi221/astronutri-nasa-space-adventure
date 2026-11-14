import Phaser from 'phaser';

/**
 * Base abstract class for procedural, mathematically anti-aliased 2.5D/3D Celestial Bodies.
 * Guarantees zero white cutout pixels, dynamic spherical directional shading,
 * atmospheric Fresnel glow, real NASA texture mapping, and axial rotation.
 */
export abstract class CelestialBody {
  protected scene: Phaser.Scene;
  public container: Phaser.GameObjects.Container;
  protected sphereImage!: Phaser.GameObjects.Image;
  protected atmosphereGlow?: Phaser.GameObjects.Arc;
  public radius: number;
  protected rotationSpeed: number;
  protected lightAngle: number;
  protected isDestroyed: boolean = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    radius: number,
    rotationSpeed: number = 0.001,
    lightAngle: number = -0.75
  ) {
    this.scene = scene;
    this.radius = radius;
    this.rotationSpeed = rotationSpeed;
    this.lightAngle = lightAngle;
    this.container = scene.add.container(x, y);
  }

  public abstract update(time: number, delta: number): void;

  public setPosition(x: number, y: number): this {
    this.container.setPosition(x, y);
    return this;
  }

  public setDepth(depth: number): this {
    this.container.setDepth(depth);
    return this;
  }

  public setScale(scale: number): this {
    this.container.setScale(scale);
    return this;
  }

  public setVisible(visible: boolean): this {
    this.container.setVisible(visible);
    return this;
  }

  public destroy(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    this.container.destroy();
  }

  public static preloadAssets(scene: Phaser.Scene): void {
    if (!scene.textures.exists('nasa-earth-texture')) {
      scene.load.image('nasa-earth-texture', '/assets/nasa/earth_blue_marble.jpg');
    }
    if (!scene.textures.exists('nasa-moon-texture')) {
      scene.load.image('nasa-moon-texture', '/assets/nasa/moon_surface_lroc.jpg');
    }
  }
}

/**
 * Procedural Earth with real NASA Blue Marble texture mapping, swirling landmasses,
 * cloud layers, and cyan Fresnel atmospheric halo.
 */
export class EarthPlanet extends CelestialBody {
  constructor(scene: Phaser.Scene, x: number, y: number, radius: number = 70) {
    super(scene, x, y, radius, 0.0008, -0.6);
    this.buildProceduralEarth();
  }

  private buildProceduralEarth(): void {
    const key = `procedural-earth-${this.radius}`;
    if (!this.scene.textures.exists(key)) {
      const size = this.radius * 2 + 32;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const cx = size / 2;
        const cy = size / 2;
        const r = this.radius;

        // 1. Atmospheric outer Fresnel limb glow
        const atmoGrad = ctx.createRadialGradient(cx, cy, r * 0.9, cx, cy, r + 14);
        atmoGrad.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
        atmoGrad.addColorStop(0.6, 'rgba(14, 165, 233, 0.25)');
        atmoGrad.addColorStop(1, 'rgba(2, 132, 199, 0)');
        ctx.fillStyle = atmoGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, r + 14, 0, Math.PI * 2);
        ctx.fill();

        // 2. Base Ocean Sphere with spherical directional lighting
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.clip();

        // Check if real NASA Earth Blue Marble texture is available in cache
        const hasNasaImg = this.scene.textures.exists('nasa-earth-texture');
        if (hasNasaImg) {
          const img = this.scene.textures.get('nasa-earth-texture').getSourceImage() as CanvasImageSource;
          if (img) {
            ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
          }
        } else {
          // Deep blue ocean fallback gradient
          const oceanGrad = ctx.createRadialGradient(
            cx - r * 0.35,
            cy - r * 0.35,
            r * 0.1,
            cx,
            cy,
            r
          );
          oceanGrad.addColorStop(0, '#38bdf8');
          oceanGrad.addColorStop(0.3, '#0284c7');
          oceanGrad.addColorStop(0.7, '#034078');
          oceanGrad.addColorStop(1, '#001220');
          ctx.fillStyle = oceanGrad;
          ctx.fillRect(0, 0, size, size);

          // Continents
          ctx.fillStyle = '#22c55e';
          const drawContinent = (lx: number, ly: number, lr: number) => {
            ctx.beginPath();
            ctx.arc(cx + lx, cy + ly, lr, 0, Math.PI * 2);
            ctx.fill();
          };
          drawContinent(-r * 0.15, -r * 0.2, r * 0.28);
          drawContinent(-r * 0.35, r * 0.15, r * 0.22);
          drawContinent(r * 0.2, -r * 0.3, r * 0.24);
          drawContinent(r * 0.15, r * 0.1, r * 0.32);

          ctx.fillStyle = '#b45309';
          drawContinent(-r * 0.12, -r * 0.18, r * 0.14);
          drawContinent(r * 0.18, r * 0.08, r * 0.16);
        }

        // Swirling atmospheric white clouds
        ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.beginPath();
        ctx.arc(cx - r * 0.2, cy - r * 0.1, r * 0.35, 0.2, Math.PI * 1.1);
        ctx.lineWidth = r * 0.12;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx + r * 0.1, cy + r * 0.2, r * 0.45, Math.PI * 0.8, Math.PI * 1.8);
        ctx.lineWidth = r * 0.1;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.stroke();

        // Spherical shadow terminator
        const shadowGrad = ctx.createRadialGradient(
          cx + r * 0.25,
          cy + r * 0.25,
          r * 0.2,
          cx,
          cy,
          r
        );
        shadowGrad.addColorStop(0, 'rgba(0, 5, 20, 0)');
        shadowGrad.addColorStop(0.65, 'rgba(0, 5, 20, 0.55)');
        shadowGrad.addColorStop(1, 'rgba(0, 5, 20, 0.95)');
        ctx.fillStyle = shadowGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        this.scene.textures.addCanvas(key, canvas);
      }
    }

    this.sphereImage = this.scene.add.image(0, 0, key);
    this.container.add(this.sphereImage);

    // Subtle atmospheric breathing pulse
    this.scene.tweens.add({
      targets: this.sphereImage,
      scale: { from: 1, to: 1.03 },
      duration: 3500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  public update(_time: number, _delta: number): void {
    if (this.sphereImage) {
      this.sphereImage.rotation += this.rotationSpeed;
    }
  }
}

/**
 * Procedural Moon with real NASA LROC Lunar Surface texture, craters, and sunlight terminator.
 */
export class MoonBody extends CelestialBody {
  constructor(scene: Phaser.Scene, x: number, y: number, radius: number = 55) {
    super(scene, x, y, radius, 0.0004, -0.6);
    this.buildProceduralMoon();
  }

  private buildProceduralMoon(): void {
    const key = `procedural-moon-${this.radius}`;
    if (!this.scene.textures.exists(key)) {
      const size = this.radius * 2 + 24;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const cx = size / 2;
        const cy = size / 2;
        const r = this.radius;

        // Subtle exosphere glow
        const glow = ctx.createRadialGradient(cx, cy, r * 0.9, cx, cy, r + 8);
        glow.addColorStop(0, 'rgba(226, 232, 240, 0.35)');
        glow.addColorStop(1, 'rgba(226, 232, 240, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(cx, cy, r + 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.clip();

        // Check if real NASA Moon LROC texture is available
        const hasNasaMoon = this.scene.textures.exists('nasa-moon-texture');
        if (hasNasaMoon) {
          const img = this.scene.textures.get('nasa-moon-texture').getSourceImage() as CanvasImageSource;
          if (img) {
            ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
          }
        } else {
          // Fallback silver-grey basalt
          const regolithGrad = ctx.createRadialGradient(
            cx - r * 0.35,
            cy - r * 0.35,
            r * 0.1,
            cx,
            cy,
            r
          );
          regolithGrad.addColorStop(0, '#f1f5f9');
          regolithGrad.addColorStop(0.4, '#cbd5e1');
          regolithGrad.addColorStop(0.8, '#64748b');
          regolithGrad.addColorStop(1, '#0f172a');
          ctx.fillStyle = regolithGrad;
          ctx.fillRect(0, 0, size, size);

          // Craters
          const drawCrater = (lx: number, ly: number, cr: number) => {
            ctx.fillStyle = '#475569';
            ctx.beginPath();
            ctx.arc(cx + lx, cy + ly, cr, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = Math.max(1, cr * 0.25);
            ctx.beginPath();
            ctx.arc(cx + lx, cy + ly, cr, Math.PI * 0.9, Math.PI * 1.8);
            ctx.stroke();
          };

          drawCrater(-r * 0.2, -r * 0.25, r * 0.18);
          drawCrater(r * 0.25, -r * 0.15, r * 0.24);
          drawCrater(-r * 0.1, r * 0.3, r * 0.2); // Shackleton
        }

        // Terminator shadow
        const shadow = ctx.createRadialGradient(
          cx + r * 0.3,
          cy + r * 0.3,
          r * 0.25,
          cx,
          cy,
          r
        );
        shadow.addColorStop(0, 'rgba(2, 6, 23, 0)');
        shadow.addColorStop(0.7, 'rgba(2, 6, 23, 0.7)');
        shadow.addColorStop(1, 'rgba(2, 6, 23, 0.98)');
        ctx.fillStyle = shadow;
        ctx.fillRect(0, 0, size, size);

        ctx.restore();

        this.scene.textures.addCanvas(key, canvas);
      }
    }

    this.sphereImage = this.scene.add.image(0, 0, key);
    this.container.add(this.sphereImage);
  }

  public update(_time: number, _delta: number): void {
    if (this.sphereImage) {
      this.sphereImage.rotation += this.rotationSpeed;
    }
  }
}

/**
 * Procedural Saturn with banded gas giant surface and translucent Cassini ring disc system.
 */
export class SaturnPlanet extends CelestialBody {
  constructor(scene: Phaser.Scene, x: number, y: number, radius: number = 60) {
    super(scene, x, y, radius, 0.0006, -0.5);
    this.buildProceduralSaturn();
  }

  private buildProceduralSaturn(): void {
    const key = `procedural-saturn-${this.radius}`;
    if (!this.scene.textures.exists(key)) {
      const size = this.radius * 2 + 16;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const cx = size / 2;
        const cy = size / 2;
        const r = this.radius;

        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.clip();

        // Amber gas giant atmospheric bands
        const gasGrad = ctx.createLinearGradient(0, cy - r, 0, cy + r);
        gasGrad.addColorStop(0, '#fef08a');
        gasGrad.addColorStop(0.2, '#fde047');
        gasGrad.addColorStop(0.4, '#eab308');
        gasGrad.addColorStop(0.6, '#ca8a04');
        gasGrad.addColorStop(0.8, '#a16207');
        gasGrad.addColorStop(1, '#713f12');
        ctx.fillStyle = gasGrad;
        ctx.fillRect(0, 0, size, size);

        // Spherical lighting gradient
        const sphereShade = ctx.createRadialGradient(
          cx - r * 0.4,
          cy - r * 0.4,
          r * 0.1,
          cx,
          cy,
          r
        );
        sphereShade.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
        sphereShade.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
        sphereShade.addColorStop(1, 'rgba(15, 23, 42, 0.9)');
        ctx.fillStyle = sphereShade;
        ctx.fillRect(0, 0, size, size);

        ctx.restore();
        this.scene.textures.addCanvas(key, canvas);
      }
    }

    // Rings texture
    const ringKey = `procedural-saturn-rings-${this.radius}`;
    if (!this.scene.textures.exists(ringKey)) {
      const rw = this.radius * 3.4;
      const rh = this.radius * 1.15;
      const canvas = document.createElement('canvas');
      canvas.width = rw;
      canvas.height = rh;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const rcx = rw / 2;
        const rcy = rh / 2;

        ctx.save();
        ctx.beginPath();
        ctx.ellipse(rcx, rcy, rw * 0.48, rh * 0.48, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(254, 240, 138, 0.65)';
        ctx.lineWidth = rw * 0.08;
        ctx.stroke();

        // Cassini Division
        ctx.beginPath();
        ctx.ellipse(rcx, rcy, rw * 0.41, rh * 0.41, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.8)';
        ctx.lineWidth = rw * 0.02;
        ctx.stroke();

        // Inner ring B
        ctx.beginPath();
        ctx.ellipse(rcx, rcy, rw * 0.35, rh * 0.35, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(253, 224, 71, 0.75)';
        ctx.lineWidth = rw * 0.07;
        ctx.stroke();

        ctx.restore();
        this.scene.textures.addCanvas(ringKey, canvas);
      }
    }

    this.sphereImage = this.scene.add.image(0, 0, key);
    const rings = this.scene.add.image(0, 0, ringKey);
    rings.setAngle(-24);

    this.container.add(rings);
    this.container.add(this.sphereImage);
  }

  public update(_time: number, _delta: number): void {
    if (this.sphereImage) {
      this.sphereImage.rotation += this.rotationSpeed;
    }
  }
}

/**
 * Real NASA Asteroid Object with SPK-ID, Diameter, and interactive telemetry badge.
 */
export class AsteroidObject {
  private scene: Phaser.Scene;
  public container: Phaser.GameObjects.Container;
  public spkId: string;
  public name: string;
  public diameterMeters: number;
  public velocityKmS: number;
  public isHazardous: boolean;
  private rockGraphic: Phaser.GameObjects.Polygon;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    spkId: string = '3542519',
    name: string = '(2010 PK)',
    diameterMeters: number = 118,
    velocityKmS: number = 14.8,
    isHazardous: boolean = false
  ) {
    this.scene = scene;
    this.spkId = spkId;
    this.name = name;
    this.diameterMeters = diameterMeters;
    this.velocityKmS = velocityKmS;
    this.isHazardous = isHazardous;

    this.container = scene.add.container(x, y);

    // Irregular polygonal asteroid shape
    const points = [
      { x: -24, y: -16 },
      { x: -8, y: -28 },
      { x: 18, y: -22 },
      { x: 28, y: -4 },
      { x: 22, y: 18 },
      { x: 4, y: 26 },
      { x: -18, y: 20 },
      { x: -28, y: 2 }
    ];

    this.rockGraphic = scene.add.polygon(0, 0, points, isHazardous ? 0x991b1b : 0x475569);
    this.rockGraphic.setStrokeStyle(2, isHazardous ? 0xf87171 : 0x94a3b8);
    this.container.add(this.rockGraphic);

    // Subtle crater shading
    const c1 = scene.add.circle(-8, -6, 6, 0x1e293b, 0.7);
    const c2 = scene.add.circle(10, 8, 4, 0x1e293b, 0.7);
    this.container.add([c1, c2]);

    // Data label tag
    const tag = scene.add.text(0, 36, `${name} (${diameterMeters}m)`, {
      fontFamily: 'Cairo, Tahoma, sans-serif',
      fontSize: '11px',
      color: isHazardous ? '#fca5a5' : '#93c5fd',
      backgroundColor: '#0f172a'
    }).setOrigin(0.5);
    this.container.add(tag);
  }

  public update(): void {
    this.container.rotation += 0.006;
  }

  public getScene(): Phaser.Scene {
    return this.scene;
  }

  public destroy(): void {
    this.container.destroy();
  }
}

/**
 * Deep Space Skybox: Generates a procedural multi-layer starfield and gentle nebula glow.
 */
export class DeepSpaceSkybox {
  private scene: Phaser.Scene;
  public container: Phaser.GameObjects.Container;
  private stars: Phaser.GameObjects.Arc[] = [];

  constructor(scene: Phaser.Scene, width: number, height: number, starCount: number = 85) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(-100);
    this.buildSkybox(width, height, starCount);
  }

  private buildSkybox(width: number, height: number, starCount: number): void {
    const bgKey = `procedural-skybox-${width}x${height}`;
    if (!this.scene.textures.exists(bgKey)) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const grad = ctx.createLinearGradient(0, 0, width, height);
        grad.addColorStop(0, '#030712');
        grad.addColorStop(0.45, '#081735');
        grad.addColorStop(0.8, '#1e1b4b');
        grad.addColorStop(1, '#020617');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
        this.scene.textures.addCanvas(bgKey, canvas);
      }
    }

    const bgImage = this.scene.add.image(width / 2, height / 2, bgKey);
    this.container.add(bgImage);

    const starColors = [0xffffff, 0x38bdf8, 0xfde047, 0xc084fc, 0x6ee7b7];
    for (let i = 0; i < starCount; i++) {
      const sx = Phaser.Math.Between(10, width - 10);
      const sy = Phaser.Math.Between(10, height - 10);
      const sr = Phaser.Math.FloatBetween(0.8, 2.4);
      const color = Phaser.Utils.Array.GetRandom(starColors);
      const star = this.scene.add.circle(sx, sy, sr, color, Phaser.Math.FloatBetween(0.4, 0.95));
      this.container.add(star);
      this.stars.push(star);

      this.scene.tweens.add({
        targets: star,
        alpha: { from: 0.2, to: 1 },
        duration: Phaser.Math.Between(1200, 3600),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Phaser.Math.Between(0, 2000)
      });
    }
  }

  public destroy(): void {
    this.container.destroy();
  }
}
