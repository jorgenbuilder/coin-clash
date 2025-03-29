import { useEffect } from "react";
import "./App.css";
import { connect } from "./client";
import { GameScene } from "./components/GameScene";

function App() {
  useEffect(() => {
    connect();
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden" }}>
      <GameScene />
    </div>
  );
}

export default App;
