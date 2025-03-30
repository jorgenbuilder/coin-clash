import { Player, Coin, Portal } from "../schema/MyRoomState";

type SpatialObject = {
  x: number;
  y: number;
  id: string;
  type: "player" | "coin" | "portal";
  data: Player | Coin | Portal;
};

export class SpatialHash {
  private cellSize: number;
  private cells: Map<string, Set<SpatialObject>>;
  private worldSize: number;

  constructor(cellSize: number, worldSize: number) {
    this.cellSize = cellSize;
    this.worldSize = worldSize;
    this.cells = new Map();
  }

  private getCellKey(x: number, y: number): string {
    const cellX = Math.floor(x / this.cellSize);
    const cellY = Math.floor(y / this.cellSize);
    return `${cellX},${cellY}`;
  }

  private getNearbyCellKeys(x: number, y: number): string[] {
    const cellX = Math.floor(x / this.cellSize);
    const cellY = Math.floor(y / this.cellSize);
    const keys: string[] = [];

    // Get current cell and all adjacent cells
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = `${cellX + dx},${cellY + dy}`;
        keys.push(key);
      }
    }

    return keys;
  }

  add(object: SpatialObject): void {
    const key = this.getCellKey(object.x, object.y);
    if (!this.cells.has(key)) {
      this.cells.set(key, new Set());
    }
    this.cells.get(key)!.add(object);
  }

  remove(object: SpatialObject): void {
    const key = this.getCellKey(object.x, object.y);
    const cell = this.cells.get(key);
    if (cell) {
      cell.delete(object);
    }
  }

  getNearbyObjects(x: number, y: number, range: number): SpatialObject[] {
    const nearbyObjects: SpatialObject[] = [];
    const cellKeys = this.getNearbyCellKeys(x, y);

    for (const key of cellKeys) {
      const cell = this.cells.get(key);
      if (cell) {
        for (const obj of cell) {
          const dx = obj.x - x;
          const dy = obj.y - y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance <= range) {
            nearbyObjects.push(obj);
          }
        }
      }
    }

    return nearbyObjects;
  }

  clear(): void {
    this.cells.clear();
  }
}
