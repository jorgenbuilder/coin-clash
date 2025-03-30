import { Room, Client } from "@colyseus/core";
import {
  MyState,
  Player,
  Coin,
  FilteredState,
  Portal,
} from "./schema/MyRoomState";
import { SpatialHash } from "./utils/SpatialHash";

const WORLD_SIZE = 1000;
const COIN_COUNT = 5000;
const BOT_COUNT = WORLD_SIZE / 20;
const COIN_RESPAWN_TIME = 5;
const BOT_UPDATE_INTERVAL = 1 / 60;
const BASE_SPEED = 0.2;
const MAX_SIZE = 50;
const DECAY_THRESHOLD = 40; // Start decaying when size exceeds this
const DECAY_RATE = 0.1; // How much size to lose per second
const DECAY_INTERVAL = 1 / 60; // Update decay every frame
const VISIBILITY_RANGE = 500; // Increased visibility range
const SPATIAL_CELL_SIZE = 200; // Increased cell size for better performance
const PORTAL_SPAWN_INTERVAL = 30; // Spawn a new portal every 30 seconds
const PORTAL_LIFETIME = 30; // Portal exists for 30 seconds
const PORTAL_SIZE = 5;

export class MyRoom extends Room<MyState> {
  private coinRespawnTimers: Map<string, NodeJS.Timeout> = new Map();
  private botUpdateInterval: NodeJS.Timeout | null = null;
  private decayInterval: NodeJS.Timeout | null = null;
  private portalSpawnInterval: NodeJS.Timeout | null = null;
  private portalTimers: Map<string, NodeJS.Timeout> = new Map();
  private spatialHash: SpatialHash;

  async onCreate() {
    console.log("Room created");
    this.setState(new MyState());
    this.spatialHash = new SpatialHash(SPATIAL_CELL_SIZE, WORLD_SIZE);

    this.onMessage("move", this.handlePlayerMove.bind(this));
    this.onMessage("restart", this.handleRestart.bind(this));
    this.onMessage("join", this.handleJoin.bind(this));

    // Set room options
    this.maxClients = 100;
    this.autoDispose = false;
    this.roomId = "main";

    // Initialize the game state immediately
    this.spawnCoins();
    this.spawnBots();
    this.startDecayInterval();
    this.startPortalSpawnInterval();

    // Lock this room to prevent additional rooms from being created
    await this.lock();
  }

  // Override the default state synchronization to implement filtered state
  getState(client: Client): FilteredState {
    const player = this.state.players.get(client.sessionId);
    if (!player) return new FilteredState();

    const filteredState = new FilteredState();

    // Get nearby objects using spatial hash
    const nearbyObjects = this.spatialHash.getNearbyObjects(
      player.x,
      player.y,
      VISIBILITY_RANGE
    );

    // Add visible objects to filtered state
    for (const obj of nearbyObjects) {
      if (obj.type === "player") {
        filteredState.players.set(obj.id, obj.data as Player);
      } else {
        filteredState.coins.set(obj.id, obj.data as Coin);
      }
    }

    return filteredState;
  }

  private handleJoin(client: Client) {
    // Create player
    const player = new Player();
    player.x = Math.random() * WORLD_SIZE - WORLD_SIZE / 2;
    player.y = Math.random() * WORLD_SIZE - WORLD_SIZE / 2;
    player.size = 1;
    player.color = `hsl(${Math.random() * 360}, 100%, 50%)`;
    this.state.players.set(client.sessionId, player);

    // Add player to spatial hash
    this.spatialHash.add({
      x: player.x,
      y: player.y,
      id: client.sessionId,
      type: "player",
      data: player,
    });
  }

  // Called when a client joins the room
  onJoin(client: Client) {
    console.log("Client joined:", client.sessionId);

    // Create player if they don't exist
    if (!this.state.players.has(client.sessionId)) {
      const player = new Player();
      player.x = Math.random() * WORLD_SIZE - WORLD_SIZE / 2;
      player.y = Math.random() * WORLD_SIZE - WORLD_SIZE / 2;
      player.size = 1;
      player.color = `hsl(${Math.random() * 360}, 100%, 50%)`;
      this.state.players.set(client.sessionId, player);
    }
  }

  // Called when a client leaves the room
  onLeave(client: Client) {
    console.log("Client left:", client.sessionId);
    const player = this.state.players.get(client.sessionId);
    if (player) {
      this.spatialHash.remove({
        x: player.x,
        y: player.y,
        id: client.sessionId,
        type: "player",
        data: player,
      });
    }
    this.state.players.delete(client.sessionId);
  }

  // Called when the room is disposed
  onDispose() {
    console.log("Room disposed");
    this.coinRespawnTimers.forEach((timer) => clearTimeout(timer));
    this.coinRespawnTimers.clear();
    if (this.botUpdateInterval) {
      clearInterval(this.botUpdateInterval);
      this.botUpdateInterval = null;
    }
    if (this.decayInterval) {
      clearInterval(this.decayInterval);
      this.decayInterval = null;
    }
    if (this.portalSpawnInterval) {
      clearInterval(this.portalSpawnInterval);
      this.portalSpawnInterval = null;
    }
    this.portalTimers.forEach((timer) => clearTimeout(timer));
    this.portalTimers.clear();
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

    // Add coin to spatial hash
    this.spatialHash.add({
      x: coin.x,
      y: coin.y,
      id: coinId,
      type: "coin",
      data: coin,
    });

    return coinId;
  }

  private spawnBots() {
    for (let i = 0; i < BOT_COUNT; i++) {
      const botId = `bot_${i}`;
      const bot = new Player();
      bot.x = Math.random() * WORLD_SIZE - WORLD_SIZE / 2;
      bot.y = Math.random() * WORLD_SIZE - WORLD_SIZE / 2;
      bot.size = 1;
      bot.color = `hsl(${Math.random() * 360}, 100%, 50%)`;
      this.state.players.set(botId, bot);

      // Add bot to spatial hash
      this.spatialHash.add({
        x: bot.x,
        y: bot.y,
        id: botId,
        type: "player",
        data: bot,
      });
    }

    // Start bot update interval
    this.botUpdateInterval = setInterval(
      () => this.updateBots(),
      BOT_UPDATE_INTERVAL * 1000
    );
  }

  private calculateSpeed(size: number): number {
    const sizePenalty = 1 / Math.pow(size, 0.4);
    return BASE_SPEED * sizePenalty;
  }

  private updateBots() {
    this.state.players.forEach((player, id) => {
      if (id.startsWith("bot_")) {
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
            const newX = player.x + (dx / length) * speed;
            const newY = player.y + (dy / length) * speed;

            // Keep bot in bounds
            player.x = Math.max(
              -WORLD_SIZE / 2,
              Math.min(WORLD_SIZE / 2, newX)
            );
            player.y = Math.max(
              -WORLD_SIZE / 2,
              Math.min(WORLD_SIZE / 2, newY)
            );

            // Update bot in spatial hash
            this.spatialHash.remove({
              x: player.x,
              y: player.y,
              id: id,
              type: "player",
              data: player,
            });
            this.spatialHash.add({
              x: player.x,
              y: player.y,
              id: id,
              type: "player",
              data: player,
            });

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
    this.state.players.forEach((player) => {
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

  private handlePlayerMove(
    client: Client,
    message: { mouseX: number; mouseY: number }
  ) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    // Calculate unit vector from player to mouse position
    const dx = message.mouseX - player.x;
    const dy = message.mouseY - player.y;
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length > 0) {
      const speed = this.calculateSpeed(player.size);
      const newX = player.x + (dx / length) * speed;
      const newY = player.y + (dy / length) * speed;

      // Keep player in bounds
      player.x = Math.max(-WORLD_SIZE / 2, Math.min(WORLD_SIZE / 2, newX));
      player.y = Math.max(-WORLD_SIZE / 2, Math.min(WORLD_SIZE / 2, newY));

      // Update player in spatial hash
      this.spatialHash.remove({
        x: player.x,
        y: player.y,
        id: client.sessionId,
        type: "player",
        data: player,
      });
      this.spatialHash.add({
        x: player.x,
        y: player.y,
        id: client.sessionId,
        type: "player",
        data: player,
      });

      this.checkCollisions(client.sessionId);
    }
  }

  private handleRestart() {
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

    // Clear all portals and their timers
    this.state.portals.clear();
    this.portalTimers.forEach((timer) => clearTimeout(timer));
    this.portalTimers.clear();
  }

  private startDecayInterval() {
    this.decayInterval = setInterval(() => {
      this.applyDecay();
    }, DECAY_INTERVAL * 1000);
  }

  private applyDecay() {
    this.state.players.forEach((player) => {
      if (player.size > DECAY_THRESHOLD) {
        // Calculate decay based on how much over threshold
        const overThreshold = player.size - DECAY_THRESHOLD;
        const decayAmount =
          (overThreshold / (MAX_SIZE - DECAY_THRESHOLD)) * DECAY_RATE;
        player.size = Math.max(DECAY_THRESHOLD, player.size - decayAmount);
      }
    });
  }

  private startPortalSpawnInterval() {
    this.portalSpawnInterval = setInterval(() => {
      this.spawnPortal();
    }, PORTAL_SPAWN_INTERVAL * 1000);
  }

  private spawnPortal() {
    const portal = new Portal();
    portal.x = Math.random() * WORLD_SIZE - WORLD_SIZE / 2;
    portal.y = Math.random() * WORLD_SIZE - WORLD_SIZE / 2;
    portal.size = PORTAL_SIZE;
    portal.timeRemaining = PORTAL_LIFETIME;

    const portalId = `portal_${this.state.portals.size}`;
    this.state.portals.set(portalId, portal);

    // Add portal to spatial hash
    this.spatialHash.add({
      x: portal.x,
      y: portal.y,
      id: portalId,
      type: "portal",
      data: portal,
    });

    // Set timer to remove portal
    const timer = setTimeout(() => {
      this.state.portals.delete(portalId);
      this.spatialHash.remove({
        x: portal.x,
        y: portal.y,
        id: portalId,
        type: "portal",
        data: portal,
      });
    }, PORTAL_LIFETIME * 1000);

    this.portalTimers.set(portalId, timer);
  }

  private checkCollisions(playerId: string) {
    const player = this.state.players.get(playerId);
    if (!player) return;

    // Check coin collisions
    this.state.coins.forEach((coin, coinId) => {
      const dx = coin.x - player.x;
      const dy = coin.y - player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const collisionDistance = player.size * 0.6;

      if (distance < collisionDistance) {
        // Only grow if under max size
        if (player.size < MAX_SIZE) {
          player.size = Math.min(MAX_SIZE, player.size + 0.1);
        }
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
        const requiredDistance = (player.size - otherPlayer.size) * 0.6;

        if (distance < requiredDistance) {
          // Only grow if under max size
          if (player.size < MAX_SIZE) {
            player.size = Math.min(
              MAX_SIZE,
              player.size + otherPlayer.size * 0.5
            );
          }

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

    // Check portal collisions
    this.state.portals.forEach((portal, portalId) => {
      const dx = portal.x - player.x;
      const dy = portal.y - player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const collisionDistance = portal.size * 0.8; // Only use portal size for collision, with a smaller multiplier

      if (distance < collisionDistance) {
        // Remove the player from the game
        this.state.players.delete(playerId);
        this.spatialHash.remove({
          x: player.x,
          y: player.y,
          id: playerId,
          type: "player",
          data: player,
        });
      }
    });
  }
}
