import { Client, getStateCallbacks } from "colyseus.js";

export async function connect() {
  const client = new Client("http://localhost:2567");
  const room = await client.joinOrCreate("my_room", {
    /* custom join options */
  });
  const $ = getStateCallbacks(room);

  // Listen to 'player' instance additions
  $(room.state).players.onAdd((player, sessionId) => {
    console.log("Player joined:", player);
  });

  // Listen to 'player' instance removals
  $(room.state).players.onRemove((player, sessionId) => {
    console.log("Player left:", player);
  });

  return room;
}
