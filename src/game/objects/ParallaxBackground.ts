import Phaser from 'phaser';

export interface ParallaxLayerConfig {
  key: string;
  assetPath: string;
  scrollFactorX: number;
  scrollFactorY?: number;
  alpha?: number;
  depth?: number;
  blendMode?: Phaser.BlendModes;
  autoPanSpeed?: number;
}

/**
 * ParallaxBackground — Reusable 2.5D Multi-Layer Parallax Engine for Phaser 3
 * Eliminates dark voids by layering cosmic stars, glowing nebula clouds, and planetary surfaces.
 */
export class ParallaxBackground {
  private scene: Phaser.Scene;
  private layers: {
    tileSprite: Phaser.GameObjects.TileSprite;
    config: ParallaxLayerConfig;
  }[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public static preloadStageLayers(scene: Phaser.Scene, stage: 'STAGE_1' | 'STAGE_2' | 'STAGE_3' | 'STAGE_4'): void {
    if (stage === 'STAGE_3') {
      scene.load.svg('parallax-stars', '/assets/generated/environments/parallax_layer1_deep_cosmos.svg', { width: 1920, height: 1080 });
      scene.load.svg('parallax-nebula', '/assets/generated/environments/parallax_layer2_nebula_clouds.svg', { width: 1920, height: 1080 });
      scene.load.svg('parallax-crater', '/assets/generated/environments/parallax_layer3_lunar_crater.svg', { width: 1920, height: 1080 });
      scene.load.image('lunar-concept-art', '/assets/generated/environments/lunar_outpost_shackleton_2_5d.jpg');
    } else {
      scene.load.svg('parallax-stars', '/assets/generated/environments/parallax_layer1_deep_cosmos.svg', { width: 1920, height: 1080 });
      scene.load.svg('parallax-nebula', '/assets/generated/environments/parallax_layer2_nebula_clouds.svg', { width: 1920, height: 1080 });
    }
  }

  /**
   * Initializes the 3-layer parallax system for the current scene
   */
  public initStage3Lunar(width: number, height: number): void {
    const layerConfigs: ParallaxLayerConfig[] = [
      {
        key: 'parallax-stars',
        assetPath: '/assets/generated/environments/parallax_layer1_deep_cosmos.svg',
        scrollFactorX: 0.05,
        scrollFactorY: 0.02,
        depth: 0,
        autoPanSpeed: 2
      },
      {
        key: 'parallax-nebula',
        assetPath: '/assets/generated/environments/parallax_layer2_nebula_clouds.svg',
        scrollFactorX: 0.15,
        scrollFactorY: 0.05,
        depth: 1,
        blendMode: Phaser.BlendModes.SCREEN,
        autoPanSpeed: 4
      },
      {
        key: 'parallax-crater',
        assetPath: '/assets/generated/environments/parallax_layer3_lunar_crater.svg',
        scrollFactorX: 0.40,
        scrollFactorY: 0.12,
        depth: 2
      }
    ];

    layerConfigs.forEach((cfg) => {
      if (this.scene.textures.exists(cfg.key)) {
        const tile = this.scene.add.tileSprite(0, 0, width, height, cfg.key);
        tile.setOrigin(0, 0);
        tile.setScrollFactor(cfg.scrollFactorX, cfg.scrollFactorY ?? cfg.scrollFactorX);
        tile.setDepth(cfg.depth ?? 0);
        if (cfg.alpha !== undefined) tile.setAlpha(cfg.alpha);
        if (cfg.blendMode !== undefined) tile.setBlendMode(cfg.blendMode);

        this.layers.push({ tileSprite: tile, config: cfg });
      }
    });
  }

  /**
   * Updates parallax auto-pan and camera displacement every frame
   */
  public update(cameraScrollX: number = 0, delta: number = 16): void {
    const dt = delta / 1000;
    this.layers.forEach(({ tileSprite, config }) => {
      // Automatic gentle cosmic drift
      if (config.autoPanSpeed) {
        tileSprite.tilePositionX += config.autoPanSpeed * dt;
      }
      // Camera parallax coupling
      tileSprite.tilePositionX += cameraScrollX * config.scrollFactorX * dt;
    });
  }

  /**
   * Handles viewport resizing
   */
  public resize(width: number, height: number): void {
    this.layers.forEach(({ tileSprite }) => {
      tileSprite.setSize(width, height);
    });
  }

  public destroy(): void {
    this.layers.forEach(({ tileSprite }) => {
      tileSprite.destroy();
    });
    this.layers = [];
  }
}
