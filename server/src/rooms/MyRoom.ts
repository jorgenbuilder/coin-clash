import { Room, Client } from "@colyseus/core";
import { MyState, Player, Coin } from "./schema/MyRoomState";

export class MyRoom extends Room {
  maxClients = 4;
  state = new MyState();
  private readonly COIN_COUNT = 50;

  // Called when the room is created
  onCreate() {
    console.log("Room created");
    this.onMessage("move", (client, data) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.x += data.x;
        player.y += data.y;
        this.checkCoinCollisions(client.sessionId);
      }
    });
  }

  // Called when a client joins the room
  onJoin(client: Client) {
    console.log("Client joined:", client.sessionId);
    this.state.players.set(client.sessionId, new Player());

    // Add initial coins if this is the first player
    if (this.state.players.size === 1) {
      this.spawnCoins();
    }
  }

  // Called when a client leaves the room
  onLeave(client: Client) {
    console.log("Client left:", client.sessionId);
    this.state.players.delete(client.sessionId);
  }

  // Called when the room is disposed
  onDispose() {
    console.log("Room disposed");
  }

  private spawnCoins() {
    for (let i = 0; i < this.COIN_COUNT; i++) {
      const coin = new Coin();
      coin.x = (Math.random() - 0.5) * 100;
      coin.y = (Math.random() - 0.5) * 100;
      this.state.coins.set(i.toString(), coin);
    }
  }

  private checkCoinCollisions(sessionId: string) {
    const player = this.state.players.get(sessionId);
    if (!player) return;

    for (const [coinId, coin] of this.state.coins.entries()) {
      const dx = player.x - coin.x;
      const dy = player.y - coin.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < player.size) {
        // Player collected the coin
        this.state.coins.delete(coinId);
        player.size += 0.1;
      }
    }
  }
}
