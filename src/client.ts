import { Client, Room, getStateCallbacks } from "colyseus.js";
import { MyState, Player } from "../server/src/rooms/schema/MyRoomState";

let currentRoom: Room<MyState> | null = null;
let myPlayer: Player | null = null;
const INTERPOLATION_DELAY = 50; // Reduced for more responsive movement

// Store previous states for interpolation
const previousStates = new Map<
  string,
  { x: number; y: number; timestamp: number }
>();

export async function connect() {
  const client = new Client("http://localhost:2567");

  // Always join the same room
    // If the room doesn't exist, create it with a fixed ID
    currentRoom = await client.joinOrCreate<MyState>("room", { roomId: "main" });

  if (!currentRoom) return null;

  const $ = getStateCallbacks<MyState>(currentRoom);

  $(currentRoom.state).players.onAdd((player: Player, sessionId: string) => {
    if (sessionId === currentRoom?.sessionId) {
      myPlayer = player;
    }
    // Store initial state
    previousStates.set(sessionId, {
      x: player.x,
      y: player.y,
      timestamp: Date.now(),
    });
  });

  $(currentRoom.state).players.onRemove((player: Player, sessionId: string) => {
    if (sessionId === currentRoom?.sessionId) {
      myPlayer = null;
    }
    previousStates.delete(sessionId);
  });

  // Update previous states on state change
  $(currentRoom.state).players.onChange((player: Player, sessionId: string) => {
    const currentTime = Date.now();
    const prevState = previousStates.get(sessionId);
    if (prevState) {
      // Store previous state for interpolation
      previousStates.set(sessionId, {
        x: prevState.x,
        y: prevState.y,
        timestamp: prevState.timestamp,
      });
    }
    previousStates.set(sessionId, {
      x: player.x,
      y: player.y,
      timestamp: currentTime,
    });
  });

  return currentRoom;
}

export async function joinGame() {
  if (!currentRoom) {
    currentRoom = await connect();
  }
  if (currentRoom) {
    currentRoom.send("join");
  }
}

export function movePlayer(mouseX: number, mouseY: number) {
  if (currentRoom && myPlayer) {
    // Send mouse position to server
    currentRoom.send("move", { mouseX, mouseY });
  }
}

export function getInterpolatedPosition(sessionId: string) {
  const currentTime = Date.now();
  const currentState = currentRoom?.state.players.get(sessionId);
  const prevState = previousStates.get(sessionId);

  if (!currentState || !prevState) {
    return { x: 0, y: 0 };
  }

  const timeDiff = currentTime - prevState.timestamp;
  const alpha = Math.min(1, timeDiff / INTERPOLATION_DELAY);

  return {
    x: lerp(prevState.x, currentState.x, alpha),
    y: lerp(prevState.y, currentState.y, alpha),
  };
}

function lerp(start: number, end: number, alpha: number): number {
  return start + alpha * (end - start);
}

export function getPlayerPosition() {
  if (myPlayer) {
    const interpolated = getInterpolatedPosition(currentRoom?.sessionId || "");
    return {
      x: interpolated.x,
      y: interpolated.y,
      size: myPlayer.size,
      color: myPlayer.color,
    };
  }
  return { x: 0, y: 0, size: 1, color: "blue" };
}

export function getCoins() {
  if (!currentRoom) return [];
  return Array.from(currentRoom.state.coins.values());
}

export function getOtherPlayers() {
  if (!currentRoom) return [];
  return Array.from(currentRoom.state.players.entries())
    .filter(([sessionId]) => sessionId !== currentRoom?.sessionId)
    .map(([sessionId, player]) => {
      const interpolated = getInterpolatedPosition(sessionId);
      return {
        x: interpolated.x,
        y: interpolated.y,
        size: player.size,
        color: player.color,
      };
    });
}

export function restartGame() {
  if (currentRoom) {
    currentRoom.send("restart");
  }
}

export function getLeaderboard() {
  if (!currentRoom) return [];
  return Array.from(currentRoom.state.players.entries())
    .map(([sessionId, player]) => ({
      name: sessionId.startsWith("bot_")
        ? `Bot ${sessionId.split("_")[1]}`
        : "You",
      size: player.size,
      isBot: sessionId.startsWith("bot_"),
    }))
    .sort((a, b) => b.size - a.size);
}

export function getPortals() {
  if (!currentRoom) return [];
  return Array.from(currentRoom.state.portals.values());
}
