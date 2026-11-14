import Phaser from 'phaser';
import { soundManager } from '../../utils/sound';

export type PropInteractionState = 'IDLE' | 'HOVER' | 'ACTIVE' | 'COMPLETED' | 'FAULT';

/**
 * Base OOP Interactive Prop class with unified lifecycle, state machine,
 * pointer events, and visual feedback.
 */
export abstract class InteractiveProp {
  protected scene: Phaser.Scene;
  public container: Phaser.GameObjects.Container;
  public state: PropInteractionState = 'IDLE';
  public id: string;
  public nameAr: string;
  protected hitZone: Phaser.GameObjects.Zone;
  protected isDestroyed: boolean = false;

  constructor(scene: Phaser.Scene, id: string, nameAr: string, x: number, y: number, width: number, height: number) {
    this.scene = scene;
    this.id = id;
    this.nameAr = nameAr;
    this.container = scene.add.container(x, y);

    this.hitZone = scene.add.zone(0, 0, width, height);
    this.hitZone.setInteractive({ useHandCursor: true });
    this.container.add(this.hitZone);

    this.setupBaseListeners();
  }

  private setupBaseListeners(): void {
    this.hitZone.on('pointerover', () => {
      if (this.state === 'IDLE') {
        this.setState('HOVER');
      }
    });

    this.hitZone.on('pointerout', () => {
      if (this.state === 'HOVER') {
        this.setState('IDLE');
      }
    });

    this.hitZone.on('pointerdown', () => {
      this.interact();
    });
  }

  public setState(newState: PropInteractionState): void {
    if (this.state === newState || this.isDestroyed) return;
    this.state = newState;
    this.onStateChanged(newState);
  }

  public abstract interact(): void;
  protected abstract onStateChanged(newState: PropInteractionState): void;

  public setPosition(x: number, y: number): this {
    this.container.setPosition(x, y);
    return this;
  }

  public setDepth(depth: number): this {
    this.container.setDepth(depth);
    return this;
  }

  public destroy(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    this.container.destroy();
  }
}

/**
 * HandrailNode: High-contrast yellow/cyan EVA grab bar for Zero-G locomotion.
 */
export class HandrailNode extends InteractiveProp {
  private barGraphics: Phaser.GameObjects.Graphics;
  private glowGraphics: Phaser.GameObjects.Graphics;
  private labelText: Phaser.GameObjects.Text;
  public orientation: 'horizontal' | 'vertical';
  public barWidth: number;
  public barHeight: number;
  private onGrabCallback?: (node: HandrailNode) => void;

  constructor(
    scene: Phaser.Scene,
    id: string,
    x: number,
    y: number,
    length: number = 140,
    orientation: 'horizontal' | 'vertical' = 'horizontal',
    label: string = 'درابزين'
  ) {
    const w = orientation === 'horizontal' ? length : 24;
    const h = orientation === 'horizontal' ? 24 : length;
    super(scene, id, label, x, y, w, h);

    this.orientation = orientation;
    this.barWidth = w;
    this.barHeight = h;

    this.glowGraphics = scene.add.graphics();
    this.barGraphics = scene.add.graphics();
    this.container.add([this.glowGraphics, this.barGraphics]);

    this.labelText = scene.add.text(0, orientation === 'horizontal' ? -18 : 0, label, {
      fontFamily: 'Cairo, Tahoma, sans-serif',
      fontSize: '11px',
      color: '#38bdf8'
    }).setOrigin(0.5);
    this.container.add(this.labelText);

    this.renderBar(false);
  }

  private renderBar(isHovered: boolean): void {
    this.glowGraphics.clear();
    this.barGraphics.clear();

    const w = this.barWidth;
    const h = this.barHeight;
    const radius = 8;

    // Outer glow
    if (isHovered || this.state === 'ACTIVE') {
      this.glowGraphics.fillStyle(0x38bdf8, 0.45);
      this.glowGraphics.fillRoundedRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8, radius + 2);
    }

    // High-visibility yellow-cyan EVA rail
    this.barGraphics.fillStyle(isHovered ? 0xfacc15 : 0x0284c7, 1);
    this.barGraphics.fillRoundedRect(-w / 2, -h / 2, w, h, radius);

    // Metallic highlight stripe
    this.barGraphics.lineStyle(2, 0xffffff, 0.85);
    this.barGraphics.strokeRoundedRect(-w / 2, -h / 2, w, h, radius);
  }

  public setOnGrab(callback: (node: HandrailNode) => void): void {
    this.onGrabCallback = callback;
  }

  public interact(): void {
    soundManager.playClick();
    this.setState('ACTIVE');
    if (this.onGrabCallback) {
      this.onGrabCallback(this);
    }
  }

  protected onStateChanged(newState: PropInteractionState): void {
    this.renderBar(newState === 'HOVER' || newState === 'ACTIVE');
  }
}

/**
 * FloatingLooseItem: Microgravity physics object released during emergency jolt.
 */
export class FloatingLooseItem extends InteractiveProp {
  public sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Arc;
  public velocityX: number;
  public velocityY: number;
  public angularVelocity: number;
  public isCaught: boolean = false;
  private onCatchCallback?: (item: FloatingLooseItem) => void;

  constructor(scene: Phaser.Scene, id: string, nameAr: string, x: number, y: number, color: number = 0x38bdf8) {
    super(scene, id, nameAr, x, y, 48, 48);

    this.sprite = scene.add.circle(0, 0, 18, color);
    const label = scene.add.text(0, 24, nameAr, {
      fontFamily: 'Cairo, Tahoma, sans-serif',
      fontSize: '10px',
      color: '#f8fafc',
      backgroundColor: '#0f172a'
    }).setOrigin(0.5);

    this.container.add([this.sprite, label]);

    this.velocityX = Phaser.Math.Between(-80, 80);
    this.velocityY = Phaser.Math.Between(-70, 70);
    this.angularVelocity = Phaser.Math.FloatBetween(-0.04, 0.04);
  }

  public setOnCatch(callback: (item: FloatingLooseItem) => void): void {
    this.onCatchCallback = callback;
  }

  public update(bounds: { minX: number; maxX: number; minY: number; maxY: number }): void {
    if (this.isCaught || this.isDestroyed) return;

    this.container.x += this.velocityX * 0.016;
    this.container.y += this.velocityY * 0.016;
    this.container.rotation += this.angularVelocity;

    // Bounce on room bulkheads
    if (this.container.x < bounds.minX || this.container.x > bounds.maxX) {
      this.velocityX = -this.velocityX;
      this.container.x = Phaser.Math.Clamp(this.container.x, bounds.minX, bounds.maxX);
    }
    if (this.container.y < bounds.minY || this.container.y > bounds.maxY) {
      this.velocityY = -this.velocityY;
      this.container.y = Phaser.Math.Clamp(this.container.y, bounds.minY, bounds.maxY);
    }
  }

  public interact(): void {
    if (this.isCaught) return;
    this.isCaught = true;
    soundManager.playCollect();
    this.setState('ACTIVE');
    if (this.onCatchCallback) {
      this.onCatchCallback(this);
    }
  }

  protected onStateChanged(newState: PropInteractionState): void {
    if (newState === 'COMPLETED') {
      this.container.setAlpha(0.4);
    }
  }
}

/**
 * ECLSSFilterAssembly: Multi-step water filter maintenance unit.
 */
export class ECLSSFilterAssembly extends InteractiveProp {
  public step: 'BOLTS' | 'EXTRACT' | 'REPLACE' | 'COMPLETED' = 'BOLTS';
  private unboltedCount: number = 0;
  private casingPanel: Phaser.GameObjects.Rectangle;
  private boltDots: Phaser.GameObjects.Arc[] = [];
  private filterCore: Phaser.GameObjects.Rectangle;
  private statusText: Phaser.GameObjects.Text;
  private onRepairedCallback?: () => void;

  constructor(scene: Phaser.Scene, id: string, x: number, y: number) {
    super(scene, id, 'وحدة تدوير المياه ECLSS', x, y, 180, 160);

    // Frame
    const base = scene.add.rectangle(0, 0, 180, 160, 0x1e293b, 1);
    base.setStrokeStyle(3, 0x0284c7);

    // Casing panel
    this.casingPanel = scene.add.rectangle(0, 0, 160, 140, 0x334155, 1);
    this.casingPanel.setStrokeStyle(2, 0x94a3b8);

    // Filter core (initially dirty brown)
    this.filterCore = scene.add.rectangle(0, 0, 100, 80, 0x78350f, 1);

    this.statusText = scene.add.text(0, -55, 'فك مسامير الغطاء 🛠️', {
      fontFamily: 'Cairo, Tahoma, sans-serif',
      fontSize: '12px',
      color: '#fde047'
    }).setOrigin(0.5);

    this.container.add([base, this.filterCore, this.casingPanel, this.statusText]);

    // 4 Corner bolts
    const boltOffsets = [
      { x: -65, y: -55 },
      { x: 65, y: -55 },
      { x: -65, y: 55 },
      { x: 65, y: 55 }
    ];

    boltOffsets.forEach((pos, idx) => {
      const bolt = scene.add.circle(pos.x, pos.y, 8, 0xf59e0b, 1);
      bolt.setStrokeStyle(1.5, 0xffffff);
      bolt.setInteractive({ useHandCursor: true });
      bolt.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        pointer.event.stopPropagation();
        this.unbolt(idx, bolt);
      });
      this.container.add(bolt);
      this.boltDots.push(bolt);
    });
  }

  private unbolt(_idx: number, bolt: Phaser.GameObjects.Arc): void {
    if (this.step !== 'BOLTS' || !bolt.visible) return;
    soundManager.playClick();
    bolt.setVisible(false);
    this.unboltedCount++;

    if (this.unboltedCount >= 4) {
      this.step = 'EXTRACT';
      this.statusText.setText('اسحب الفلتر المتسخ 🔄');
      this.scene.tweens.add({
        targets: this.casingPanel,
        alpha: 0.15,
        duration: 400
      });
    }
  }

  public setOnRepaired(callback: () => void): void {
    this.onRepairedCallback = callback;
  }

  public interact(): void {
    if (this.step === 'EXTRACT') {
      soundManager.playClick();
      this.step = 'REPLACE';
      this.statusText.setText('ضع فلتر الكربون النظيف ✨');
      this.filterCore.setFillStyle(0x38bdf8); // Fresh blue filter
    } else if (this.step === 'REPLACE') {
      soundManager.playFanfare();
      this.step = 'COMPLETED';
      this.statusText.setText('تم تدوير المياه 100% ✅');
      this.statusText.setColor('#4ade80');
      this.setState('COMPLETED');
      if (this.onRepairedCallback) {
        this.onRepairedCallback();
      }
    }
  }

  protected onStateChanged(_newState: PropInteractionState): void {}
}

/**
 * EVASuitLocker: Spacesuit inspection locker with live 4.3 PSI regulator.
 */
export class EVASuitLocker extends InteractiveProp {
  public isSealed: boolean = false;
  private pressureGauge: Phaser.GameObjects.Text;
  private suitHealthBar: Phaser.GameObjects.Rectangle;
  private onCalibratedCallback?: () => void;

  constructor(scene: Phaser.Scene, id: string, x: number, y: number, initialCondition: number = 100) {
    super(scene, id, 'بدلة الفضاء EVA', x, y, 120, 160);

    const frame = scene.add.rectangle(0, 0, 120, 160, 0x0f172a, 1);
    frame.setStrokeStyle(3, 0x38bdf8);

    // Suit condition bar
    const barBg = scene.add.rectangle(0, -60, 90, 8, 0x334155, 1);
    this.suitHealthBar = scene.add.rectangle(-45, -60, (initialCondition / 100) * 90, 8, 0x22c55e, 1);
    this.suitHealthBar.setOrigin(0, 0.5);

    const suitGraphic = scene.add.text(0, -10, '🧑‍🚀', { fontSize: '48px' }).setOrigin(0.5);

    this.pressureGauge = scene.add.text(0, 48, '4.3 PSI ✅', {
      fontFamily: 'Cairo, Tahoma, sans-serif',
      fontSize: '12px',
      color: '#38bdf8'
    }).setOrigin(0.5);

    this.container.add([frame, barBg, this.suitHealthBar, suitGraphic, this.pressureGauge]);
  }

  public setOnCalibrated(callback: () => void): void {
    this.onCalibratedCallback = callback;
  }

  public interact(): void {
    if (this.isSealed) return;
    this.isSealed = true;
    soundManager.playFanfare();
    this.pressureGauge.setText('محكم الإغلاق 🔒');
    this.pressureGauge.setColor('#4ade80');
    this.setState('COMPLETED');
    if (this.onCalibratedCallback) {
      this.onCalibratedCallback();
    }
  }

  protected onStateChanged(_newState: PropInteractionState): void {}
}
