import { useEffect, useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import { connect, movePlayer, getPlayerPosition } from "./client";

function App() {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    connect();

    const updatePosition = () => {
      setPosition(getPlayerPosition());
      requestAnimationFrame(updatePosition);
    };

    requestAnimationFrame(updatePosition);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const speed = 1;
      switch (event.key.toLowerCase()) {
        case "w":
          movePlayer(0, -speed);
          break;
        case "s":
          movePlayer(0, speed);
          break;
        case "a":
          movePlayer(-speed, 0);
          break;
        case "d":
          movePlayer(speed, 0);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Coin Clash</h1>
      <div className="card">
        <p>Use WASD to move</p>
        <p>
          Position: ({position.x.toFixed(1)}, {position.y.toFixed(1)})
        </p>
      </div>
    </>
  );
}

export default App;
