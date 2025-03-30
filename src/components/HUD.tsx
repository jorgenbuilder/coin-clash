import { Hud, OrthographicCamera } from "@react-three/drei";
import { useThree } from "@react-three/fiber";

export function HUD() {
  const { size } = useThree();

  return (
    <Hud>
      <OrthographicCamera makeDefault position={[0, 0, 10]} />
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[size.width - 50, size.height - 50]} />
        <meshBasicMaterial color="white" transparent opacity={0.5} wireframe />
      </mesh>
    </Hud>
  );
}
