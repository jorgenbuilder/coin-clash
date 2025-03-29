import { Client, Room, getStateCallbacks } from "colyseus.js";
import { MyState, Player, Coin } from "../server/src/rooms/schema/MyRoomState";

let currentRoom: Room<MyState> | null = null;
let myPlayer: Player | null = null;

export async function connect() {
  const client = new Client("http://localhost:2567");
  currentRoom = await client.joinOrCreate<MyState>("my_room");
  if (!currentRoom) return null;

  const $ = getStateCallbacks<MyState>(currentRoom);

  $(currentRoom.state).players.onAdd((player: Player, sessionId: string) => {
    if (sessionId === currentRoom?.sessionId) {
      myPlayer = player;
    }
  });

  $(currentRoom.state).players.onRemove((player: Player, sessionId: string) => {
    if (sessionId === currentRoom?.sessionId) {
      myPlayer = null;
    }
  });

  return currentRoom;
}

export function movePlayer(x: number, y: number) {
  if (currentRoom) {
    currentRoom.send("move", { x, y });
  }
}

export function getPlayerPosition() {
  if (myPlayer) {
    return { x: myPlayer.x, y: myPlayer.y, size: myPlayer.size };
  }
  return { x: 0, y: 0, size: 1 };
}

export function getCoins() {
  if (!currentRoom) return [];
  return Array.from(currentRoom.state.coins.values());
}
