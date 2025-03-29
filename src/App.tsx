import { useEffect, useState } from "react";
import "./App.css";
import {
  connect,
  getPlayerPosition,
  restartGame,
  getLeaderboard,
} from "./client";
import { GameScene } from "./components/GameScene";

function Leaderboard({
  entries,
}: {
  entries: Array<{ name: string; size: number; isBot: boolean }>;
}) {
  return (
    <div className="leaderboard">
      <h3>Leaderboard</h3>
      {entries.map((entry, index) => (
        <div
          key={index}
          className={`leaderboard-entry ${entry.isBot ? "bot" : "player"}`}
        >
          <span className="rank">{index + 1}</span>
          <span className="name">{entry.name}</span>
          <span className="size">{entry.size.toFixed(1)}</span>
        </div>
      ))}
    </div>
  );
}

function App() {
  const [connected, setConnected] = useState(false);
  const [leaderboard, setLeaderboard] = useState<
    Array<{ name: string; size: number; isBot: boolean }>
  >([]);

  useEffect(() => {
    connect().then(() => {
      setConnected(true);
    });
  }, []);

  useEffect(() => {
    if (connected) {
      const interval = setInterval(() => {
        setLeaderboard(getLeaderboard());
      }, 100);
      return () => clearInterval(interval);
    }
  }, [connected]);

  if (!connected) {
    return <div>Connecting...</div>;
  }

  return (
    <div className="game-container">
      <button className="restart-button" onClick={restartGame}>
        Restart Game
      </button>
      <Leaderboard entries={leaderboard} />
      <GameScene />
    </div>
  );
}

export default App;
