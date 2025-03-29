import { Room, Client } from "@colyseus/core";
import { MyState, Player } from "./schema/MyRoomState";

export class MyRoom extends Room {
  maxClients = 4;
  state = new MyState();

  // Called when the room is created
  onCreate() {
    console.log("Room created");
    this.onMessage("move", (client, data) => {
      console.log("Received move from client:", client.sessionId, data);
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.x += data.x;
        player.y += data.y;
        console.log("Updated player position:", player.x, player.y);
      } else {
        console.error("Player not found for session:", client.sessionId);
      }
    });
  }

  // Called when a client joins the room
  onJoin(client: Client) {
    console.log("Client joined:", client.sessionId);
    this.state.players.set(client.sessionId, new Player());
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
}
