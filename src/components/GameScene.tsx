import { Canvas } from "@react-three/fiber";
import { useState, useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3, Raycaster, Plane, InstancedMesh, Matrix4 } from "three";
import {
  movePlayer,
  getPlayerPosition,
  getCoins,
  getOtherPlayers,
  getPortals,
  joinGame,
} from "../client";
import { HUD } from "./HUD";

const WORLD_SIZE = 1000;

interface GameSceneProps {
  onGameOver: () => void;
}

function InstancedCoins({ coins }: { coins: Array<{ x: number; y: number }> }) {
  const meshRef = useRef<InstancedMesh>(null);
  const matrix = new Matrix4();

  useFrame(() => {
    if (!meshRef.current) return;

    coins.forEach((coin, i) => {
      matrix.setPosition(coin.x, 0, coin.y);
      meshRef.current!.setMatrixAt(i, matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, coins.length]}>
      <sphereGeometry args={[0.2, 16, 16]} />
      <meshBasicMaterial color="gold" />
    </instancedMesh>
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

function Game({ onGameOver }: GameSceneProps) {
  const [coins, setCoins] = useState<Array<{ x: number; y: number }>>([]);
  const [portals, setPortals] = useState<
    Array<{ x: number; y: number; size: number; timeRemaining: number }>
  >([]);
  const [playerPos, setPlayerPos] = useState({
    x: 0,
    y: 0,
    size: 1,
    color: "blue",
  });
  const [otherPlayers, setOtherPlayers] = useState<
    Array<{ x: number; y: number; size: number; color: string }>
  >([]);
  const visualPos = useRef({ x: 0, y: 0, size: 1, color: "blue" });
  const visualOtherPlayers = useRef<
    Map<number, { x: number; y: number; size: number; color: string }>
  >(new Map());
  const lastUpdate = useRef(0);
  const { camera, mouse } = useThree();
  const cameraTarget = useRef({ x: 0, y: 0 });
  const raycaster = useRef(new Raycaster());
  const plane = useRef(new Plane(new Vector3(0, 1, 0), 0));

  useEffect(() => {
    // Join the game when component mounts
    joinGame();
  }, []);

  useFrame((state) => {
    const now = state.clock.getElapsedTime();
    lastUpdate.current = now;

    // Calculate mouse position in world space using raycaster
    raycaster.current.setFromCamera(mouse, camera);
    const mouseWorldPos = new Vector3();
    raycaster.current.ray.intersectPlane(plane.current, mouseWorldPos);

    // Apply movement based on mouse position
    movePlayer(mouseWorldPos.x, mouseWorldPos.z);

    // Update state
    const newPlayerPos = getPlayerPosition();
    setPlayerPos(newPlayerPos);
    setCoins(getCoins());
    setOtherPlayers(getOtherPlayers());
    setPortals(getPortals());

    // Check if player was eaten (size is 0 or undefined)
    if (!newPlayerPos || newPlayerPos.size <= 0) {
      onGameOver();
      return;
    }

    // Smoothly interpolate visual position to server position
    const positionInterpSpeed = 0.1;
    const sizeInterpSpeed = 0.05;

    // Position interpolation with separate X and Z components
    visualPos.current.x +=
      (playerPos.x - visualPos.current.x) * positionInterpSpeed;
    visualPos.current.y +=
      (playerPos.y - visualPos.current.y) * positionInterpSpeed;
    visualPos.current.size +=
      (playerPos.size - visualPos.current.size) * sizeInterpSpeed;
    visualPos.current.color = playerPos.color;

    // Smoothly interpolate other players with the same speeds
    otherPlayers.forEach((player, index) => {
      if (!visualOtherPlayers.current.has(index)) {
        visualOtherPlayers.current.set(index, { ...player });
      } else {
        const visual = visualOtherPlayers.current.get(index)!;
        visual.x += (player.x - visual.x) * positionInterpSpeed;
        visual.y += (player.y - visual.y) * positionInterpSpeed;
        visual.size += (player.size - visual.size) * sizeInterpSpeed;
        visual.color = player.color;
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

    // Dynamic camera zoom based on player size with smoother interpolation
    const baseHeight = 20;
    const zoomFactor = 0.5;
    const targetCameraHeight = baseHeight + playerPos.size * zoomFactor;
    const cameraInterpSpeed = 0.05;

    // Lerp camera position with separate components
    camera.position.x +=
      (cameraTarget.current.x - camera.position.x) * cameraInterpSpeed;
    camera.position.z +=
      (cameraTarget.current.y - camera.position.z) * cameraInterpSpeed;
    camera.position.y +=
      (targetCameraHeight - camera.position.y) * cameraInterpSpeed;

    // Lock camera rotation to top-down view
    camera.rotation.x = -Math.PI / 2;
    camera.rotation.y = 0;
    camera.rotation.z = 0;
  });

  return (
    <>
      {/* Player */}
      <mesh
        position={[visualPos.current.x, 0, visualPos.current.y]}
        scale={visualPos.current.size}
      >
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshBasicMaterial color={visualPos.current.color} />
      </mesh>

      {/* Other Players */}
      {Array.from(visualOtherPlayers.current.values()).map((player, index) => (
        <mesh
          key={index}
          position={[player.x, 0, player.y]}
          scale={player.size}
        >
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshBasicMaterial color={player.color} />
        </mesh>
      ))}

      {/* Coins */}
      <InstancedCoins coins={coins} />

      {/* Portals */}
      {portals.map((portal, index) => (
        <mesh
          key={`portal_${index}`}
          position={[portal.x, 0, portal.y]}
          scale={portal.size}
        >
          <ringGeometry args={[0.4, 0.5, 32]} />
          <meshBasicMaterial color="#00ffff" />
        </mesh>
      ))}

      {/* Floor with Grid */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[WORLD_SIZE, WORLD_SIZE]} />
        <meshBasicMaterial color="#000" />
      </mesh>
      <Grid size={WORLD_SIZE} divisions={WORLD_SIZE / 5} />
      <HUD />
    </>
  );
}

export function GameScene({ onGameOver }: GameSceneProps) {
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Canvas camera={{ position: [0, 20, 0], fov: 75 }}>
        <Game onGameOver={onGameOver} />
      </Canvas>
    </div>
  );
}
