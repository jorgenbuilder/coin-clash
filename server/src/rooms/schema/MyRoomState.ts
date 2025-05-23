import { Schema, MapSchema, type } from "@colyseus/schema";

export class Coin extends Schema {
  @type("number") x: number = 0;
  @type("number") y: number = 0;
}

export class Player extends Schema {
  @type("string") color: string = "blue";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") size: number = 1;
  @type("number") vx: number = 0;
  @type("number") vy: number = 0;
  @type("number") targetX: number = 0;
  @type("number") targetY: number = 0;
}

export class Portal extends Schema {
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") size: number = 5;
  @type("number") timeRemaining: number = 30; // Time in seconds before portal disappears
}

export class FilteredState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type({ map: Coin }) coins = new MapSchema<Coin>();
  @type({ map: Portal }) portals = new MapSchema<Portal>();
}

export class MyState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type({ map: Coin }) coins = new MapSchema<Coin>();
  @type({ map: Portal }) portals = new MapSchema<Portal>();
}
