import * as THREE from "three";
import { Hud, OrthographicCamera } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { getPlayerPosition, getPortals } from "../client";
import { useState } from "react";

export function HUD() {
  const [portals, setPortals] = useState<
    Array<{ x: number; y: number; timeRemaining: number }>
  >([]);

  useFrame(() => {
    setPortals(getPortals());
  });

  return (
    <Hud>
      <OrthographicCamera makeDefault position={[0, 0, 10]} />
      {/* <mesh position={[0, 0, 0]}>
        <planeGeometry args={[size.width - 50, size.height - 50]} />
        <meshBasicMaterial color="white" transparent opacity={0.5} wireframe />
      </mesh> */}

      {portals.map((portal, index) => (
        <WorldPointIndicator
          key={`portal_${index}`}
          worldPosition={new THREE.Vector2(portal.x, portal.y)}
          color="#00ffff"
          timeRemaining={portal.timeRemaining}
        />
      ))}
    </Hud>
  );
}

function WorldPointIndicator({
  worldPosition,
  color = "white",
}: {
  worldPosition: THREE.Vector2;
  color?: string;
  timeRemaining?: number;
}) {
  const { size } = useThree();
  const [screenPos, setScreenPos] = useState<THREE.Vector2>(
    new THREE.Vector2()
  );

  useFrame(() => {
    const playerPosition = getPlayerPosition();
    const direction = new THREE.Vector2(
      worldPosition.x - playerPosition.x,
      worldPosition.y - playerPosition.y
    ).normalize();

    // Calculate the intersection with the screen rectangle
    const screenWidth = size.width - 50;
    const screenHeight = size.height - 50;

    // Calculate the intersection point with the rectangle
    let x, y;

    // Calculate the slope of the direction line
    const slope = direction.y / direction.x;

    // Calculate the y-intercept
    const yIntercept = 0;

    // Calculate intersection with vertical edges
    const xAtRightEdge = screenWidth / 2;
    const yAtRightEdge = slope * xAtRightEdge + yIntercept;

    const xAtLeftEdge = -screenWidth / 2;
    const yAtLeftEdge = slope * xAtLeftEdge + yIntercept;

    // Calculate intersection with horizontal edges
    const yAtTopEdge = screenHeight / 2;
    const xAtTopEdge = (yAtTopEdge - yIntercept) / slope;

    const yAtBottomEdge = -screenHeight / 2;
    const xAtBottomEdge = (yAtBottomEdge - yIntercept) / slope;

    // Determine which edge we intersect with first
    if (Math.abs(yAtRightEdge) <= screenHeight / 2 && direction.x > 0) {
      x = xAtRightEdge;
      y = yAtRightEdge;
    } else if (Math.abs(yAtLeftEdge) <= screenHeight / 2 && direction.x < 0) {
      x = xAtLeftEdge;
      y = yAtLeftEdge;
    } else if (Math.abs(xAtTopEdge) <= screenWidth / 2 && direction.y > 0) {
      x = xAtTopEdge;
      y = yAtTopEdge;
    } else {
      x = xAtBottomEdge;
      y = yAtBottomEdge;
    }

    setScreenPos(new THREE.Vector2(x, -y));
  });

  return (
    <group position={[screenPos.x, screenPos.y, 0]}>
      <mesh>
        <sphereGeometry args={[10, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}
