import { useEffect, useState } from "react";
import "./App.css";
import { connect, restartGame, getLeaderboard } from "./client";
import { GameScene } from "./components/GameScene";
import { GameSceneSVG } from "./components/GameSceneSVG";

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
  const [useSVG, setUseSVG] = useState(false);
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
      <div className="controls">
        <button className="restart-button" onClick={restartGame}>
          Restart Game
        </button>
        <button className="renderer-toggle" onClick={() => setUseSVG(!useSVG)}>
          Switch to {useSVG ? "3D" : "2D"}
        </button>
      </div>
      <Leaderboard entries={leaderboard} />
      {useSVG ? <GameSceneSVG /> : <GameScene />}
    </div>
  );
}

export default App;
