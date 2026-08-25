import { useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { platforms } from "../data/platforms";

const ACCENT_COLORS: Record<string, string> = {
  spotify: "#1DB954",
  github: "#A78BFA",
  steam: "#66C0F4",
  valorant: "#FF4655",
  movies: "#F5C242",
  smoke: "#8A8B96",
};

interface NodeDef {
  position: [number, number, number];
  color: string;
  id: string;
}

function buildNodes(): NodeDef[] {
  const active = platforms.filter((p) => p.id !== "more");
  const radius = 3.1;
  return active.map((p, i) => {
    const angle = (i / active.length) * Math.PI * 2;
    const y = Math.sin(i * 1.9) * 0.9;
    return {
      id: p.id,
      position: [Math.cos(angle) * radius, y, Math.sin(angle) * radius],
      color: ACCENT_COLORS[p.accent] ?? "#8A8B96",
    };
  });
}

function Node({ position, color }: NodeDef) {
  const ref = useRef<THREE.Mesh>(null);
  const seed = useMemo(() => Math.random() * Math.PI * 2, []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.position.y = position[1] + Math.sin(t * 0.6 + seed) * 0.15;
    const s = 1 + Math.sin(t * 1.4 + seed) * 0.08;
    ref.current.scale.setScalar(s);
  });

  return (
    <group>
      <mesh ref={ref} position={position}>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh position={position}>
        <sphereGeometry args={[0.2, 12, 12]} />
        <meshBasicMaterial color={color} transparent opacity={0.12} />
      </mesh>
    </group>
  );
}

function Links({ nodes }: { nodes: NodeDef[] }) {
  const materialRef = useRef<THREE.LineBasicMaterial>(null);

  const geometry = useMemo(() => {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = new THREE.Vector3(...nodes[i].position);
        const b = new THREE.Vector3(...nodes[j].position);
        if (a.distanceTo(b) < 4.4) {
          points.push(a, b);
        }
      }
    }
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    return geo;
  }, [nodes]);

  useFrame(({ clock }) => {
    if (!materialRef.current) return;
    materialRef.current.opacity =
      0.14 + Math.sin(clock.getElapsedTime() * 0.8) * 0.06;
  });

  return (
    <group>
      <lineSegments geometry={geometry}>
        <lineBasicMaterial
          ref={materialRef}
          color="#C6FF3D"
          transparent
          opacity={0.16}
        />
      </lineSegments>
    </group>
  );
}

function CoreNode() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.rotation.y = t * 0.15;
    ref.current.rotation.x = t * 0.08;
  });
  return (
    <mesh ref={ref}>
      <icosahedronGeometry args={[0.42, 1]} />
      <meshBasicMaterial color="#FF3B3B" wireframe transparent opacity={0.55} />
    </mesh>
  );
}

function Scene() {
  const nodes = useMemo(() => buildNodes(), []);
  const groupRef = useRef<THREE.Group>(null);
  const { viewport } = useThree();

  useFrame((state) => {
    const { pointer } = state;
    if (!groupRef.current) return;
    groupRef.current.rotation.y +=
      (pointer.x * 0.4 - groupRef.current.rotation.y) * 0.03 + 0.0009;
    groupRef.current.rotation.x +=
      (pointer.y * 0.2 - groupRef.current.rotation.x) * 0.03;
  });

  return (
    <group ref={groupRef} scale={Math.min(1, viewport.width / 8)}>
      <CoreNode />
      <Links nodes={nodes} />
      {nodes.map((n) => (
        <Node key={n.id} {...n} />
      ))}
    </group>
  );
}

export function HeroNetwork() {
  return (
    <div
      className="pointer-events-none absolute inset-0 opacity-90"
      aria-hidden="true"
    >
      <Canvas
        camera={{ position: [0, 0.6, 7.2], fov: 45 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
