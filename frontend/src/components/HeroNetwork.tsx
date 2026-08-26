import { useRef, useMemo, useEffect, useState, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { platforms } from "../data/platforms";

/* -------------------------------------------------------------------------- */
/*  Platform node configuration                                                */
/*                                                                             */
/*  We expose the active platforms (everyone except the "more" placeholder)    */
/*  and lay them out around the central core in a soft spherical ring.        */
/* -------------------------------------------------------------------------- */

interface NodeDef {
  id: string;
  name: string;
  position: [number, number, number];
  color: THREE.Color;
  logo: string;
}

/** Build a ring of platform nodes around the core. The Y axis is perturbed    */
/*  per-index so the network feels 3D rather than perfectly circular.         */
function buildNodes(): NodeDef[] {
  const active = platforms.filter((p) => p.id !== "more");
  const radius = 3.4;
  return active.map((p, i) => {
    const angle = (i / active.length) * Math.PI * 2;
    const y = Math.sin(i * 1.9) * 1.0;
    return {
      id: p.id,
      name: p.name,
      position: [
        Math.cos(angle) * radius,
        y,
        Math.sin(angle) * radius,
      ],
      color: new THREE.Color(p.accentColor),
      logo: p.logo,
    };
  });
}

/* -------------------------------------------------------------------------- */
/*  Shared texture cache                                                       */
/*                                                                             */
/*  We never want to create a TextureLoader per node or per frame. The map is  */
/*  built once per session, keyed by logo URL, and disposed on unmount.      */
/* -------------------------------------------------------------------------- */

const textureCache = new Map<string, THREE.Texture>();
const loader = new THREE.TextureLoader();

function getLogoTexture(url: string): THREE.Texture {
  let tex = textureCache.get(url);
  if (tex) return tex;
  tex = loader.load(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.minFilter = THREE.LinearMipMapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  textureCache.set(url, tex);
  return tex;
}

/* -------------------------------------------------------------------------- */
/*  PlatformLogoSprite                                                         */
/*                                                                             */
/*  A THREE.Sprite that always faces the camera, textured with the platform's */
/*  real logo PNG. Sprites are the right tool here: they don't need a custom  */
/*  billboard shader and remain crisp at any angle.                           */
/* -------------------------------------------------------------------------- */

interface PlatformLogoSpriteProps {
  logo: string;
  /** Sprite scale in world units. Sprites are 1x1 by default. */
  scale: number;
}

function PlatformLogoSprite({ logo, scale }: PlatformLogoSpriteProps) {
  const texture = useMemo(() => getLogoTexture(logo), [logo]);
  return (
    <sprite scale={[scale, scale, scale]}>
      {/* Sprites ignore materials' color — the texture is drawn as-is, so   */}
      {/* the brand logo keeps its real colors and is never tinted.           */}
      <spriteMaterial
        map={texture}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </sprite>
  );
}

/* -------------------------------------------------------------------------- */
/*  PlatformNode                                                               */
/*                                                                             */
/*  Wraps a logo sprite with:                                                  */
/*   - a soft accent-colored glow halo behind the logo (additive sprite)       */
/*   - subtle pulsing scale animation                                          */
/*   - gentle vertical bobbing motion                                          */
/*  The logo itself is never tinted — the accent color is used only for the   */
/*  halo, so the brand mark remains recognizable.                            */
/* -------------------------------------------------------------------------- */

interface PlatformNodeProps extends NodeDef {
  mobile: boolean;
}

function PlatformNode({ position, color, logo, mobile }: PlatformNodeProps) {
  // Outer group holds the node at its base position; the inner ref group is  */
  // used for per-frame bob/scale without disturbing the base transform.      */
  const inner = useRef<THREE.Group>(null);
  const haloRef = useRef<THREE.SpriteMaterial>(null);
  const seed = useMemo(() => Math.random() * Math.PI * 2, []);

  // Procedurally build the halo texture once. A radial gradient disc gives a */
  // soft glow without needing an extra PNG asset.                            */
  const haloTexture = useMemo(() => {
    const size = 128;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d")!;
    const grad = ctx.createRadialGradient(
      size / 2, size / 2, 0,
      size / 2, size / 2, size / 2
    );
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.35, "rgba(255,255,255,0.45)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  useFrame(({ clock }) => {
    if (!inner.current) return;
    const t = clock.getElapsedTime();
    // Vertical bob — small, slow, desynchronized per node via `seed`.
    inner.current.position.y = Math.sin(t * 0.6 + seed) * 0.18;
    // Pulse — gentle scale breathing.
    const pulse = 1 + Math.sin(t * 1.4 + seed) * 0.06;
    inner.current.scale.setScalar(pulse);
    // Halo opacity pulse — synchronized so it never reads as a strobe.
    if (haloRef.current) {
      haloRef.current.opacity =
        0.32 + Math.sin(t * 1.4 + seed) * 0.10;
    }
  });

  // Sprite scales: bigger on desktop, slightly smaller on mobile to keep the */
  // network readable at the smaller scene scale.                              */
  const logoScale = mobile ? 0.62 : 0.78;
  const haloScale = mobile ? 1.4 : 1.7;

  return (
    <group position={position}>
      <group ref={inner}>
        {/* Soft accent-colored halo behind the logo. */}
        <sprite scale={[haloScale, haloScale, haloScale]} renderOrder={-1}>
          <spriteMaterial
            ref={haloRef}
            map={haloTexture}
            color={color}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
            opacity={0.35}
          />
        </sprite>
        {/* The real brand logo, always facing the camera. */}
        <PlatformLogoSprite logo={logo} scale={logoScale} />
      </group>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  NetworkLinks                                                               */
/*                                                                             */
/*  Subtle neon connecting lines between nearby platform nodes. Drawn as a    */
/*  single lineSegments geometry so the whole web is one draw call.           */
/* -------------------------------------------------------------------------- */

function NetworkLinks({ nodes }: { nodes: NodeDef[] }) {
  const matRef = useRef<THREE.LineBasicMaterial>(null);

  const geometry = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const maxDist = 4.6;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = new THREE.Vector3(...nodes[i].position);
        const b = new THREE.Vector3(...nodes[j].position);
        if (a.distanceTo(b) < maxDist) {
          points.push(a, b);
        }
      }
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [nodes]);

  useFrame(({ clock }) => {
    if (!matRef.current) return;
    matRef.current.opacity =
      0.10 + Math.sin(clock.getElapsedTime() * 0.8) * 0.04;
  });

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial
        ref={matRef}
        color="#C6FF3D"
        transparent
        opacity={0.14}
        depthWrite={false}
        toneMapped={false}
      />
    </lineSegments>
  );
}

/* -------------------------------------------------------------------------- */
/*  CoreNode                                                                   */
/*                                                                             */
/*  A polished futuristic core:                                                */
/*   - wireframe icosahedron (the "shell")                                     */
/*   - soft inner sphere (warm red, emissive-feel via additive glow)          */
/*   - slowly rotating energy ring                                             */
/*   - subtle pulsing scale                                                    */
/* -------------------------------------------------------------------------- */

function CoreNode() {
  const shell = useRef<THREE.Mesh>(null);
  const inner = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);
  const glowMat = useRef<THREE.SpriteMaterial>(null);

  // Soft radial glow texture, generated once. Reused via memo — we don't     */
  // recreate it every frame.                                                  */
  const glowTexture = useMemo(() => {
    const size = 256;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d")!;
    const g = ctx.createRadialGradient(
      size / 2, size / 2, 0,
      size / 2, size / 2, size / 2
    );
    g.addColorStop(0, "rgba(255,120,80,1)");
    g.addColorStop(0.3, "rgba(255,80,40,0.55)");
    g.addColorStop(1, "rgba(255,40,20,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (shell.current) {
      shell.current.rotation.y = t * 0.18;
      shell.current.rotation.x = t * 0.09;
      const s = 1 + Math.sin(t * 1.1) * 0.05;
      shell.current.scale.setScalar(s);
    }
    if (inner.current) {
      // Counter-rotate so the inner sphere feels independent of the shell.
      inner.current.rotation.y = -t * 0.12;
    }
    if (ring.current) {
      // Energy ring tilts and slowly spins on a different axis than the shell.
      ring.current.rotation.z = t * 0.35;
      ring.current.rotation.x = Math.PI / 2 + Math.sin(t * 0.4) * 0.2;
    }
    if (glowMat.current) {
      glowMat.current.opacity = 0.55 + Math.sin(t * 1.4) * 0.10;
    }
  });

  return (
    <group>
      {/* Ambient warm glow sprite — gives the core a soft halo. */}
      <sprite scale={[2.2, 2.2, 2.2]}>
        <spriteMaterial
          ref={glowMat}
          map={glowTexture}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
          opacity={0.6}
        />
      </sprite>

      {/* Wireframe shell — the primary icosahedron. */}
      <mesh ref={shell}>
        <icosahedronGeometry args={[0.55, 1]} />
        <meshBasicMaterial
          color="#FF3B3B"
          wireframe
          transparent
          opacity={0.55}
          toneMapped={false}
        />
      </mesh>

      {/* Inner sphere — small, warm, solid. Reads as the "core" of the core. */}
      <mesh ref={inner}>
        <sphereGeometry args={[0.22, 24, 24]} />
        <meshBasicMaterial
          color="#FFB37A"
          transparent
          opacity={0.9}
          toneMapped={false}
        />
      </mesh>

      {/* Energy ring — a thin torus, tilted and rotating independently. */}
      <mesh ref={ring}>
        <torusGeometry args={[0.85, 0.012, 8, 80]} />
        <meshBasicMaterial
          color="#FF6A3D"
          transparent
          opacity={0.6}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  ParticleField                                                              */
/*                                                                             */
/*  Subtle floating motes — small enough to read as atmosphere rather than as  */
/*  snow. We render a single THREE.Points with additive blending.            */
/* -------------------------------------------------------------------------- */

function ParticleField({ count, mobile }: { count: number; mobile: boolean }) {
  // Reduce particle count on mobile to protect frame budget.
  const actualCount = mobile ? Math.min(count, 60) : count;

  const geometry = useMemo(() => {
    const positions = new Float32Array(actualCount * 3);
    for (let i = 0; i < actualCount; i++) {
      const i3 = i * 3;
      // Spherical distribution — particles fill the volume around the network.
      const r = 4 + Math.random() * 4;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = r * Math.cos(phi) * 0.6;
      positions[i3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [actualCount]);

  const matRef = useRef<THREE.PointsMaterial>(null);

  useFrame(({ clock }) => {
    if (!matRef.current) return;
    // Gentle alpha breathing so the field never feels completely static.
    matRef.current.opacity =
      0.35 + Math.sin(clock.getElapsedTime() * 0.5) * 0.08;
  });

  // Dispose geometry on unmount to avoid GPU memory leaks across HMR / route  */
  // changes.                                                                  */
  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  return (
    <points geometry={geometry}>
      <pointsMaterial
        ref={matRef}
        color="#EDD9B9"
        size={0.025}
        sizeAttenuation
        transparent
        opacity={0.4}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}

/* -------------------------------------------------------------------------- */
/*  Scene                                                                      */
/*                                                                             */
/*  Composes the entire network, applies the camera parallax + slow auto-      */
/*  rotation, and scales the scene down on small viewports.                   */
/* -------------------------------------------------------------------------- */

function Scene({ mobile }: { mobile: boolean }) {
  const nodes = useMemo(() => buildNodes(), []);
  const groupRef = useRef<THREE.Group>(null);
  const { viewport } = useThree();

  useFrame((state) => {
    const { pointer } = state;
    if (!groupRef.current) return;
    // Smooth parallax towards mouse position, plus a constant slow auto-rotation.
    groupRef.current.rotation.y +=
      (pointer.x * 0.4 - groupRef.current.rotation.y) * 0.03 + 0.0009;
    groupRef.current.rotation.x +=
      (pointer.y * 0.2 - groupRef.current.rotation.x) * 0.03;
  });

  // Responsive scale — shrink the network on small viewports so it never      */
  // overlaps the hero text on phones.                                         */
  const sceneScale = Math.min(1, viewport.width / 8) * (mobile ? 0.75 : 1);

  return (
    <group ref={groupRef} scale={sceneScale}>
      <CoreNode />
      <NetworkLinks nodes={nodes} />
      {nodes.map((n) => (
        <PlatformNode key={n.id} {...n} mobile={mobile} />
      ))}
      <ParticleField count={180} mobile={mobile} />
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  HeroNetwork                                                                */
/*                                                                             */
/*  Public component — wraps the Canvas + Suspense fallback. The Canvas       */
/*  dpr is capped at [1, 1.75] on desktop and [1, 1.25] on mobile to balance  */
/*  crispness against perf.                                                    */
/* -------------------------------------------------------------------------- */

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < breakpoint : false
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);
  return isMobile;
}

function CanvasShell() {
  const mobile = useIsMobile();
  return (
    <Canvas
      camera={{ position: [0, 0.6, 8.2], fov: 42 }}
      dpr={mobile ? [1, 1.25] : [1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
    >
      <Suspense fallback={null}>
        <Scene mobile={mobile} />
      </Suspense>
    </Canvas>
  );
}

export function HeroNetwork() {
  return (
    <div
      className="pointer-events-none absolute inset-0 opacity-95"
      aria-hidden="true"
    >
      <CanvasShell />
    </div>
  );
}
