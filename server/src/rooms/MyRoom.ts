import { Room, Client } from "@colyseus/core";
import { MyState, Player, Coin } from "./schema/MyRoomState";

const WORLD_SIZE = 200; // Increased from 100
const COIN_COUNT = 500; // Increased from 100
const BOT_COUNT = 5;
const COIN_RESPAWN_TIME = 5; // seconds
const BOT_UPDATE_INTERVAL = 0.1; // Reduced from 0.5 for smoother movement

export class MyRoom extends Room<MyState> {
  private coinRespawnTimers: Map<string, NodeJS.Timeout> = new Map();
  private botUpdateInterval: NodeJS.Timeout | null = null;

  // Called when the room is created
  onCreate() {
    console.log("Room created");
    this.setState(new MyState());
    this.onMessage("move", this.handlePlayerMove.bind(this));
    this.onMessage("restart", this.handleRestart.bind(this));
  }

  // Called when a client joins the room
  onJoin(client: Client) {
    console.log("Client joined:", client.sessionId);

    // Spawn coins for first player
    if (this.state.players.size === 0) {
      this.spawnCoins();
      this.spawnBots();
    }

    // Create player
    const player = new Player();
    player.x = Math.random() * WORLD_SIZE - WORLD_SIZE / 2;
    player.y = Math.random() * WORLD_SIZE - WORLD_SIZE / 2;
    player.size = 1;
    this.state.players.set(client.sessionId, player);
  }

  // Called when a client leaves the room
  onLeave(client: Client) {
    console.log("Client left:", client.sessionId);
    this.state.players.delete(client.sessionId);

    // Clean up timers if last player
    if (this.state.players.size === 0) {
      this.coinRespawnTimers.forEach((timer) => clearTimeout(timer));
      this.coinRespawnTimers.clear();
      if (this.botUpdateInterval) {
        clearInterval(this.botUpdateInterval);
        this.botUpdateInterval = null;
      }
    }
  }

  // Called when the room is disposed
  onDispose() {
    console.log("Room disposed");
  }

  private spawnCoins() {
    for (let i = 0; i < COIN_COUNT; i++) {
      this.spawnCoin();
    }
  }

  private spawnCoin() {
    const coin = new Coin();
    coin.x = Math.random() * WORLD_SIZE - WORLD_SIZE / 2;
    coin.y = Math.random() * WORLD_SIZE - WORLD_SIZE / 2;
    const coinId = `coin_${this.state.coins.size}`;
    this.state.coins.set(coinId, coin);
    return coinId;
  }

  private spawnBots() {
    for (let i = 0; i < BOT_COUNT; i++) {
      const botId = `bot_${i}`;
      const bot = new Player();
      bot.x = Math.random() * WORLD_SIZE - WORLD_SIZE / 2;
      bot.y = Math.random() * WORLD_SIZE - WORLD_SIZE / 2;
      bot.size = 1;
      this.state.players.set(botId, bot);
    }

    // Start bot update interval
    this.botUpdateInterval = setInterval(
      () => this.updateBots(),
      BOT_UPDATE_INTERVAL * 1000
    );
  }

  private calculateSpeed(size: number): number {
    const baseSpeed = 0.5;
    const sizePenalty = 1 / Math.pow(size, 0.4); // Increased from 0.15 to 0.4 for stronger size penalty
    return baseSpeed * sizePenalty;
  }

  private updateBots() {
    this.state.players.forEach((player, id) => {
      if (id.startsWith("bot_")) {
        // Bot movement logic
        const nearestTarget = this.findNearestTarget(
          player.x,
          player.y,
          player.size
        );
        if (nearestTarget) {
          const dx = nearestTarget.x - player.x;
          const dy = nearestTarget.y - player.y;
          const length = Math.sqrt(dx * dx + dy * dy);
          if (length > 0) {
            const speed = this.calculateSpeed(player.size);

            // Add slight randomness to movement for more natural behavior
            const randomOffset = 0.05;
            player.x +=
              (dx / length) * speed + (Math.random() - 0.5) * randomOffset;
            player.y +=
              (dy / length) * speed + (Math.random() - 0.5) * randomOffset;

            // Keep bot in bounds
            player.x = Math.max(
              -WORLD_SIZE / 2,
              Math.min(WORLD_SIZE / 2, player.x)
            );
            player.y = Math.max(
              -WORLD_SIZE / 2,
              Math.min(WORLD_SIZE / 2, player.y)
            );

            // Check collisions for bots too
            this.checkCollisions(id);
          }
        }
      }
    });
  }

  private findNearestTarget(
    x: number,
    y: number,
    size: number
  ): { x: number; y: number } | null {
    let nearest: { x: number; y: number } | null = null;
    let minDist = Infinity;

    // Check coins
    this.state.coins.forEach((coin) => {
      const dx = coin.x - x;
      const dy = coin.y - y;
      const dist = dx * dx + dy * dy;
      if (dist < minDist) {
        minDist = dist;
        nearest = coin;
      }
    });

    // Check other players (if they're smaller)
    this.state.players.forEach((player, id) => {
      if (player.size < size) {
        const dx = player.x - x;
        const dy = player.y - y;
        const dist = dx * dx + dy * dy;
        if (dist < minDist) {
          minDist = dist;
          nearest = player;
        }
      }
    });

    return nearest;
  }

  private handlePlayerMove(client: Client, message: { x: number; y: number }) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    const speed = this.calculateSpeed(player.size);
    player.x += message.x * speed;
    player.y += message.y * speed;

    // Keep player in bounds
    player.x = Math.max(-WORLD_SIZE / 2, Math.min(WORLD_SIZE / 2, player.x));
    player.y = Math.max(-WORLD_SIZE / 2, Math.min(WORLD_SIZE / 2, player.y));

    this.checkCollisions(client.sessionId);
  }

  private handleRestart(client: Client) {
    // Clear all coins and respawn them
    this.state.coins.clear();
    this.coinRespawnTimers.forEach((timer) => clearTimeout(timer));
    this.coinRespawnTimers.clear();
    this.spawnCoins();

    // Reset all players to starting size
    this.state.players.forEach((player) => {
      player.size = 1;
    });

    // Respawn all players at random positions
    this.state.players.forEach((player) => {
      player.x = Math.random() * WORLD_SIZE - WORLD_SIZE / 2;
      player.y = Math.random() * WORLD_SIZE - WORLD_SIZE / 2;
    });
  }

  private checkCollisions(playerId: string) {
    const player = this.state.players.get(playerId);
    if (!player) return;

    // Check coin collisions
    this.state.coins.forEach((coin, coinId) => {
      const dx = coin.x - player.x;
      const dy = coin.y - player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      // Increased collision distance for easier collection
      const collisionDistance = player.size * 0.6; // Increased from 0.3 to 0.6

      if (distance < collisionDistance) {
        player.size += 0.1;
        this.state.coins.delete(coinId);

        const respawnTimer = setTimeout(() => {
          this.spawnCoin();
        }, COIN_RESPAWN_TIME * 1000);
        this.coinRespawnTimers.set(coinId, respawnTimer);
      }
    });

    // Check player collisions
    this.state.players.forEach((otherPlayer, otherId) => {
      if (otherId !== playerId && otherPlayer.size < player.size) {
        const dx = otherPlayer.x - player.x;
        const dy = otherPlayer.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Increased collision distance for easier eating
        const requiredDistance = (player.size - otherPlayer.size) * 0.6; // Increased from 0.3 to 0.6

        if (distance < requiredDistance) {
          // Player ate other player
          player.size += otherPlayer.size * 0.5;

          // If it's a bot, respawn it
          if (otherId.startsWith("bot_")) {
            otherPlayer.x = Math.random() * WORLD_SIZE - WORLD_SIZE / 2;
            otherPlayer.y = Math.random() * WORLD_SIZE - WORLD_SIZE / 2;
            otherPlayer.size = 1;
          } else {
            // If it's a real player, remove them
            this.state.players.delete(otherId);
          }
        }
      }
    });
  }
}
