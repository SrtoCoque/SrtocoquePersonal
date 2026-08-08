"use client";

import { useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Edges, OrbitControls } from "@react-three/drei";
import { NoToneMapping } from "three";
import type { PyramidCubePlacement } from "@/lib/productivity";
import {
  squarePyramidCapacity,
  squarePyramidLevelsFor,
} from "@/lib/productivity";

/** Separación de centros; el cubo es un poco más pequeño para que se vea la junta */
const GAP = 1;
const CUBE_SIZE = 0.92;

function Cube({
  placement,
  active,
  onHover,
}: {
  placement: PyramidCubePlacement;
  active: boolean;
  onHover: (key: string | null) => void;
}) {
  return (
    <mesh
      position={[
        placement.x * GAP,
        placement.y * GAP + 0.5,
        placement.z * GAP,
      ]}
      castShadow
      receiveShadow
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(placement.key);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        onHover(null);
        document.body.style.cursor = "auto";
      }}
    >
      <boxGeometry args={[CUBE_SIZE, CUBE_SIZE, CUBE_SIZE]} />
      <meshStandardMaterial
        color={placement.color}
        roughness={1}
        metalness={0}
        toneMapped={false}
        emissive={placement.color}
        emissiveIntensity={active ? 0.12 : 0}
      />
      <Edges
        threshold={15}
        color={active ? "#ffffff" : "#111111"}
        scale={1.001}
      />
    </mesh>
  );
}

function PyramidScene({
  placements,
  onHover,
  hoveredKey,
}: {
  placements: PyramidCubePlacement[];
  hoveredKey: string | null;
  onHover: (key: string | null) => void;
}) {
  const maxY = useMemo(
    () => placements.reduce((m, p) => Math.max(m, p.y), 0),
    [placements],
  );
  const baseSize = useMemo(() => {
    // Lado de la capa más baja presente
    const base = placements.filter((p) => p.y === 0);
    if (base.length === 0) return 1;
    const xs = base.map((p) => p.x);
    return Math.round(Math.max(...xs) - Math.min(...xs)) + 1;
  }, [placements]);

  return (
    <>
      <ambientLight intensity={0.95} />
      <directionalLight
        castShadow
        position={[8, 14, 6]}
        intensity={0.45}
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-6, 4, -4]} intensity={0.2} />
      <group>
        {placements.map((p) => (
          <Cube
            key={p.key}
            placement={p}
            active={hoveredKey === p.key}
            onHover={onHover}
          />
        ))}
      </group>
      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={0.38}
        scale={Math.max(12, baseSize * 4)}
        blur={2.2}
        far={8}
      />
      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={Math.max(4, baseSize * 1.2)}
        maxDistance={Math.max(14, baseSize * 5)}
        maxPolarAngle={Math.PI * 0.49}
        target={[0, Math.max(0.4, maxY * GAP * 0.45), 0]}
      />
    </>
  );
}

export function ProductivityPyramid3D({
  placements,
}: {
  placements: PyramidCubePlacement[];
}) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const levels = useMemo(
    () => squarePyramidLevelsFor(placements.length),
    [placements.length],
  );
  const nextLevelNeed = useMemo(() => {
    if (placements.length === 0) return 0;
    return squarePyramidCapacity(levels) - placements.length;
  }, [levels, placements.length]);
  const cameraDistance = Math.max(6, levels * 2.4 + 3);
  const hovered = useMemo(
    () => placements.find((p) => p.key === hoveredKey) ?? null,
    [placements, hoveredKey],
  );

  return (
    <div className="relative h-[min(70vh,520px)] w-full overflow-hidden rounded-xl bg-gradient-to-b from-[var(--surface-2)] to-[var(--background)]">
      <Canvas
        shadows
        camera={{
          position: [
            cameraDistance * 0.78,
            cameraDistance * 0.52,
            cameraDistance * 0.78,
          ],
          fov: 42,
          near: 0.1,
          far: 200,
        }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true, toneMapping: NoToneMapping }}
      >
        <PyramidScene
          placements={placements}
          hoveredKey={hoveredKey}
          onHover={setHoveredKey}
        />
      </Canvas>

      <p className="pointer-events-none absolute left-3 top-3 max-w-[14rem] rounded-lg bg-[var(--surface)]/85 px-2.5 py-1 text-xs text-[var(--muted)] backdrop-blur-sm">
        {placements.length} bloque{placements.length === 1 ? "" : "s"}
        {" · "}
        base {levels}×{levels}
        {nextLevelNeed > 0
          ? ` · faltan ${nextLevelNeed} para nivel ${levels + 1}`
          : null}
      </p>

      {hovered ? (
        <p className="pointer-events-none absolute right-3 top-3 inline-flex items-center gap-2 rounded-lg bg-[var(--surface)]/90 px-2.5 py-1 text-xs backdrop-blur-sm">
          <span
            className="h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: hovered.color }}
          />
          {hovered.tagName} · 1 h
        </p>
      ) : null}

      <p className="pointer-events-none absolute bottom-3 left-0 right-0 text-center text-xs text-[var(--muted)]">
        Arrastra para girar · scroll para zoom
        <span className="mt-0.5 block opacity-80">
          Primero se completa la base; luego se apila el siguiente nivel
        </span>
      </p>
    </div>
  );
}
