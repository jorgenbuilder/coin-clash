import { Canvas } from "@react-three/fiber";
import { useEffect, useState, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import { movePlayer, getPlayerPosition, getCoins } from "../client";

function Coin({ position }: { position: Vector3 }) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.2, 16, 16]} />
      <meshStandardMaterial color="gold" />
    </mesh>
  );
}

function Game() {
  const [coins, setCoins] = useState<Array<{ x: number; y: number }>>([]);
  const [playerPos, setPlayerPos] = useState({ x: 0, y: 0, size: 1 });
  const visualPos = useRef({ x: 0, y: 0, size: 1 });
  const velocity = useRef({ x: 0, y: 0 });
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
    const deltaTime = Math.min(now - lastUpdate.current, 1 / 30);
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

    // Movement parameters
    const maxSpeed = 8.0;
    const acceleration = 0.5;
    const deceleration = 0.92;
    const sizePenalty = 1 / Math.pow(playerPos.size, 0.15);

    // Calculate target velocity
    const targetSpeed = maxSpeed * sizePenalty;
    const targetVelocity = {
      x: dx * targetSpeed,
      y: dy * targetSpeed,
    };

    // Apply acceleration or deceleration
    if (dx !== 0 || dy !== 0) {
      velocity.current.x +=
        (targetVelocity.x - velocity.current.x) * acceleration;
      velocity.current.y +=
        (targetVelocity.y - velocity.current.y) * acceleration;
    } else {
      velocity.current.x *= deceleration;
      velocity.current.y *= deceleration;
    }

    // Apply movement
    if (
      Math.abs(velocity.current.x) > 0.01 ||
      Math.abs(velocity.current.y) > 0.01
    ) {
      movePlayer(
        velocity.current.x * deltaTime,
        velocity.current.y * deltaTime
      );
    }

    // Update state
    setPlayerPos(getPlayerPosition());
    setCoins(getCoins());

    // Smoothly interpolate visual position to server position
    const positionInterpSpeed = 0.2; // How quickly visual position catches up to server position
    visualPos.current.x +=
      (playerPos.x - visualPos.current.x) * positionInterpSpeed;
    visualPos.current.y +=
      (playerPos.y - visualPos.current.y) * positionInterpSpeed;
    visualPos.current.size +=
      (playerPos.size - visualPos.current.size) * positionInterpSpeed;

    // Update camera target
    cameraTarget.current.x = playerPos.x;
    cameraTarget.current.y = playerPos.y;

    // Smooth camera interpolation
    const cameraHeight = 20;
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
      <mesh
        position={[visualPos.current.x, 0, visualPos.current.y]}
        scale={visualPos.current.size}
      >
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial color="hotpink" />
      </mesh>
      {coins.map((coin, index) => (
        <Coin key={index} position={new Vector3(coin.x, 0, coin.y)} />
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#303030" />
      </mesh>
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
