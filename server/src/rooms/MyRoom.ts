import { Room, Client } from "@colyseus/core";
import { MyState, Player } from "./schema/MyRoomState";

export class MyRoom extends Room {
  maxClients = 4;
  state = new MyState();

  // Called when the room is created
  onCreate() {}

  // Called when a client joins the room
  onJoin(client: Client) {
    this.state.players.set(client.sessionId, new Player());
  }

  // Called when a client leaves the room
  onLeave(client: Client) {
    this.state.players.delete(client.sessionId);
  }

  // Called when the room is disposed
  onDispose() {}
}
