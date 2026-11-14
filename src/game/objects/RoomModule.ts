import Phaser from 'phaser';
import { InteractiveProp } from './InteractiveProp';

export interface RoomBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Encapsulated OOP Room Module representing an interactive compartment
 * (e.g., Food Quarter, Spacesuit Bay, Cockpit, Galley, Medical Bay, ECLSS Room, Airlock).
 */
export class RoomModule {
  public id: string;
  public nameAr: string;
  public bounds: RoomBounds;
  public props: InteractiveProp[] = [];
  public isPlayerInside: boolean = false;
  private container: Phaser.GameObjects.Container;
  private bulkheadGraphics: Phaser.GameObjects.Graphics;
  private roomLabel: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    id: string,
    nameAr: string,
    bounds: RoomBounds,
    themeColor: number = 0x0284c7
  ) {
    this.id = id;
    this.nameAr = nameAr;
    this.bounds = bounds;

    this.container = scene.add.container(bounds.x, bounds.y);
    this.bulkheadGraphics = scene.add.graphics();
    this.container.add(this.bulkheadGraphics);

    // Architectural Bulkheads & Floor Deck
    this.renderBulkheads(themeColor);

    this.roomLabel = scene.add.text(bounds.width / 2, 16, nameAr, {
      fontFamily: 'Cairo, Tahoma, sans-serif',
      fontSize: '14px',
      color: '#38bdf8',
      backgroundColor: '#0f172a'
    }).setOrigin(0.5);
    this.container.add(this.roomLabel);
  }

  private renderBulkheads(themeColor: number): void {
    const g = this.bulkheadGraphics;
    g.clear();

    // Floor deck
    g.fillStyle(0x0a192f, 0.7);
    g.fillRoundedRect(0, 0, this.bounds.width, this.bounds.height, 16);

    // High-tech bulkhead border
    g.lineStyle(2, themeColor, 0.85);
    g.strokeRoundedRect(0, 0, this.bounds.width, this.bounds.height, 16);

    // Soft top accent strip
    g.fillStyle(themeColor, 0.25);
    g.fillRoundedRect(4, 4, this.bounds.width - 8, 28, 8);
  }

  public addProp(prop: InteractiveProp): void {
    this.props.push(prop);
  }

  public containsPoint(x: number, y: number): boolean {
    return (
      x >= this.bounds.x &&
      x <= this.bounds.x + this.bounds.width &&
      y >= this.bounds.y &&
      y <= this.bounds.y + this.bounds.height
    );
  }

  public setPlayerInside(inside: boolean): void {
    if (this.isPlayerInside === inside) return;
    this.isPlayerInside = inside;
    this.bulkheadGraphics.setAlpha(inside ? 1 : 0.65);
  }

  public destroy(): void {
    this.props.forEach(p => p.destroy());
    this.props = [];
    this.container.destroy();
  }
}
