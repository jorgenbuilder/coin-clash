import { Canvas } from "@react-three/fiber";
import { useEffect, useState, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import {
  movePlayer,
  getPlayerPosition,
  getCoins,
  getOtherPlayers,
} from "../client";

function Coin({ position }: { position: Vector3 }) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.2, 16, 16]} />
      <meshStandardMaterial color="gold" />
    </mesh>
  );
}

function Grid({ size, divisions }: { size: number; divisions: number }) {
  return (
    <gridHelper
      args={[size, divisions, "#404040", "#202020"]}
      position={[0, 0.1, 0]}
    />
  );
}

function Game() {
  const [coins, setCoins] = useState<Array<{ x: number; y: number }>>([]);
  const [playerPos, setPlayerPos] = useState({ x: 0, y: 0, size: 1 });
  const [otherPlayers, setOtherPlayers] = useState<
    Array<{ x: number; y: number; size: number }>
  >([]);
  const visualPos = useRef({ x: 0, y: 0, size: 1 });
  const visualOtherPlayers = useRef<
    Map<number, { x: number; y: number; size: number }>
  >(new Map());
  const keys = useRef({ w: false, s: false, a: false, d: false });
  const lastUpdate = useRef(0);
  const { camera } = useThree();
  const cameraTarget = useRef({ x: 0, y: 0 });

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

  useFrame((state) => {
    const now = state.clock.getElapsedTime();
    lastUpdate.current = now;

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

    // Smoothly interpolate visual position to server position
    const positionInterpSpeed = 0.2;
    visualPos.current.x +=
      (playerPos.x - visualPos.current.x) * positionInterpSpeed;
    visualPos.current.y +=
      (playerPos.y - visualPos.current.y) * positionInterpSpeed;
    visualPos.current.size +=
      (playerPos.size - visualPos.current.size) * positionInterpSpeed;

    // Smoothly interpolate other players
    otherPlayers.forEach((player, index) => {
      if (!visualOtherPlayers.current.has(index)) {
        visualOtherPlayers.current.set(index, { ...player });
      } else {
        const visual = visualOtherPlayers.current.get(index)!;
        visual.x += (player.x - visual.x) * positionInterpSpeed;
        visual.y += (player.y - visual.y) * positionInterpSpeed;
        visual.size += (player.size - visual.size) * positionInterpSpeed;
      }
    });

    // Remove players that no longer exist
    for (const [index] of visualOtherPlayers.current) {
      if (!otherPlayers[index]) {
        visualOtherPlayers.current.delete(index);
      }
    }

    // Update camera target
    cameraTarget.current.x = playerPos.x;
    cameraTarget.current.y = playerPos.y;

    // Dynamic camera zoom based on player size
    const baseHeight = 20;
    const zoomFactor = 0.5;
    const cameraHeight = baseHeight + playerPos.size * zoomFactor;
    const cameraInterpSpeed = 0.1;

    // Lerp camera position (X and Y only)
    camera.position.x =
      camera.position.x +
      (cameraTarget.current.x - camera.position.x) * cameraInterpSpeed;
    camera.position.z =
      camera.position.z +
      (cameraTarget.current.y - camera.position.z) * cameraInterpSpeed;
    camera.position.y = cameraHeight;

    // Lock camera rotation to top-down view
    camera.rotation.x = -Math.PI / 2;
    camera.rotation.y = 0;
    camera.rotation.z = 0;
  });

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />

      {/* Player */}
      <mesh
        position={[visualPos.current.x, 0, visualPos.current.y]}
        scale={visualPos.current.size}
      >
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial color="hotpink" />
      </mesh>

      {/* Other Players */}
      {Array.from(visualOtherPlayers.current.values()).map((player, index) => (
        <mesh
          key={index}
          position={[player.x, 0, player.y]}
          scale={player.size}
        >
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshStandardMaterial color="blue" />
        </mesh>
      ))}

      {/* Coins */}
      {coins.map((coin, index) => (
        <Coin key={index} position={new Vector3(coin.x, 0, coin.y)} />
      ))}

      {/* Floor with Grid */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#303030" />
      </mesh>
      <Grid size={200} divisions={20} />
    </>
  );
}

export function GameScene() {
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Canvas camera={{ position: [0, 20, 0], fov: 75 }}>
        <Game />
      </Canvas>
    </div>
  );
}
