import { Schema, MapSchema, type } from "@colyseus/schema";

export class Coin extends Schema {
  @type("number") x: number = 0;
  @type("number") y: number = 0;
}

export class Player extends Schema {
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") size: number = 1;
}

export class MyState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type({ map: Coin }) coins = new MapSchema<Coin>();
}
