import { useEffect, useState } from "react";
import "./App.css";
import { connect, getLeaderboard } from "./client";
import { GameScene } from "./components/GameScene";

interface LeaderboardEntry {
  name: string;
  size: number;
  isBot: boolean;
}

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

function StartButton({ onStart }: { onStart: () => void }) {
  return (
    <div className="start-overlay">
      <button className="start-button" onClick={onStart}>
        Start Game
      </button>
    </div>
  );
}

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [isInGame, setIsInGame] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    const setupConnection = async () => {
      const room = await connect();
      if (room) {
        setIsConnected(true);
        // Update leaderboard every second
        const interval = setInterval(() => {
          setLeaderboard(getLeaderboard());
        }, 1000);
        return () => clearInterval(interval);
      }
    };

    setupConnection();
  }, []);

  const handleStart = () => {
    setIsInGame(true);
  };

  const handleGameOver = () => {
    setIsInGame(false);
  };

  if (!isConnected) {
    return <div>Connecting...</div>;
  }

  return (
    <div className="app">
      <div className="game-container">
        <GameScene onGameOver={handleGameOver} />
        {!isInGame && <StartButton onStart={handleStart} />}
      </div>
      <Leaderboard entries={leaderboard} />
    </div>
  );
}

export default App;
