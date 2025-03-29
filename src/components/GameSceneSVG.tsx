import React, { useEffect, useState, useRef } from "react";
import {
  movePlayer,
  getPlayerPosition,
  getCoins,
  getOtherPlayers,
} from "../client";

function Coin({ x, y }: { x: number; y: number }) {
  return <circle cx={x} cy={y} r={0.2} fill="gold" stroke="none" />;
}

function Player({
  x,
  y,
  size,
  color,
}: {
  x: number;
  y: number;
  size: number;
  color: string;
}) {
  return <circle cx={x} cy={y} r={0.5 * size} fill={color} stroke="none" />;
}

function Grid({ size, divisions }: { size: number; divisions: number }) {
  const lines = [];
  const step = size / divisions;
  const halfSize = size / 2;

  // Vertical lines
  for (let i = 0; i <= divisions; i++) {
    const x = -halfSize + i * step;
    lines.push(
      <line
        key={`v${i}`}
        x1={x}
        y1={-halfSize}
        x2={x}
        y2={halfSize}
        stroke={i % 2 === 0 ? "#404040" : "#202020"}
        strokeWidth={0.1}
      />
    );
  }

  // Horizontal lines
  for (let i = 0; i <= divisions; i++) {
    const y = -halfSize + i * step;
    lines.push(
      <line
        key={`h${i}`}
        x1={-halfSize}
        y1={y}
        x2={halfSize}
        y2={y}
        stroke={i % 2 === 0 ? "#404040" : "#202020"}
        strokeWidth={0.1}
      />
    );
  }

  return <>{lines}</>;
}

export function GameSceneSVG() {
  const [coins, setCoins] = useState<Array<{ x: number; y: number }>>([]);
  const [playerPos, setPlayerPos] = useState({ x: 0, y: 0, size: 1 });
  const [otherPlayers, setOtherPlayers] = useState<
    Array<{ x: number; y: number; size: number }>
  >([]);
  const keys = useRef({ w: false, s: false, a: false, d: false });

  // Handle key events
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key in keys.current) {
        keys.current[key as keyof typeof keys.current] = true;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key in keys.current) {
        keys.current[key as keyof typeof keys.current] = false;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Game loop
  useEffect(() => {
    const interval = setInterval(() => {
      // Calculate movement direction
      let dx = 0;
      let dy = 0;
      if (keys.current.w) dy -= 1;
      if (keys.current.s) dy += 1;
      if (keys.current.a) dx -= 1;
      if (keys.current.d) dx += 1;

      // Normalize diagonal movement
      if (dx !== 0 && dy !== 0) {
        const length = Math.sqrt(dx * dx + dy * dy);
        dx /= length;
        dy /= length;
      }

      // Apply movement
      if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
        movePlayer(dx, dy);
      }

      // Update state
      setPlayerPos(getPlayerPosition());
      setCoins(getCoins());
      setOtherPlayers(getOtherPlayers());
    }, 1000 / 60);

    return () => clearInterval(interval);
  }, []);

  return (
    <svg
      viewBox="-100 -100 200 200"
      style={{
        width: "100vw",
        height: "100vh",
        background: "#1a1a1a",
      }}
    >
      {/* Background */}
      <rect x="-100" y="-100" width="200" height="200" fill="#303030" />

      {/* Grid */}
      <Grid size={200} divisions={20} />

      {/* Coins */}
      {coins.map((coin, index) => (
        <Coin key={index} x={coin.x} y={coin.y} />
      ))}

      {/* Other Players */}
      {otherPlayers.map((player, index) => (
        <Player
          key={index}
          x={player.x}
          y={player.y}
          size={player.size}
          color="blue"
        />
      ))}

      {/* Current Player */}
      <Player
        x={playerPos.x}
        y={playerPos.y}
        size={playerPos.size}
        color="hotpink"
      />
    </svg>
  );
}
