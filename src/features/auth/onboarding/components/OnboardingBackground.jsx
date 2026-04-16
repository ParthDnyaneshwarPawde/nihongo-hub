import React, { useRef, useMemo, memo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// --- PARALLAX CAMERA CONTROLLER ---
function ParallaxCamera() {
  const { camera } = useThree();
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e) => {
      mouse.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.current.y = -(e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  useFrame(() => {
    camera.position.x += (mouse.current.x * 1.8 - camera.position.x) * 0.025;
    camera.position.y += (mouse.current.y * 1.2 - camera.position.y) * 0.025;
    camera.lookAt(0, 0, 0);
  });

  return null;
}

// --- KINETIC SCULPTURE — Knowledge Pathway Nodes & Lines ---
function KineticSculpture() {
  const groupRef = useRef();

  // Build geometry imperatively to avoid R3F v9 bufferAttribute API issues
  const { lineGeo, nodeGeo } = useMemo(() => {
    const nodeCount = 80;
    const nodes = [];

    for (let i = 0; i < nodeCount; i++) {
      const phi = Math.acos(-1 + (2 * i) / nodeCount);
      const theta = Math.sqrt(nodeCount * Math.PI) * phi;
      const radius = 9 + Math.random() * 15;
      nodes.push(new THREE.Vector3(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        -22 - Math.random() * 18
      ));
    }

    // Node points geometry
    const nodeGeo = new THREE.BufferGeometry().setFromPoints(nodes);

    // Connection line geometry
    const linePoints = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (nodes[i].distanceTo(nodes[j]) < 7.5) {
          linePoints.push(nodes[i].clone(), nodes[j].clone());
        }
      }
    }
    const lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints);

    return { lineGeo, nodeGeo };
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (!groupRef.current) return;
    groupRef.current.rotation.y = t * 0.035;
    groupRef.current.rotation.x = Math.sin(t * 0.018) * 0.18;
    groupRef.current.rotation.z = Math.cos(t * 0.012) * 0.08;
  });

  return (
    <group ref={groupRef}>
      <lineSegments geometry={lineGeo}>
        <lineBasicMaterial color="#4f46e5" transparent opacity={0.3} />
      </lineSegments>
      <points geometry={nodeGeo}>
        <pointsMaterial
          size={0.35} color="#a5b4fc" transparent opacity={0.9}
          blending={THREE.AdditiveBlending} depthWrite={false}
        />
      </points>
    </group>
  );
}

// --- HALO PARTICLE FIELD — Torus distribution, clear center void ---
function HaloParticles({ count = 2000 }) {
  const meshRef = useRef();

  const geo = useMemo(() => {
    const points = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 11 + Math.random() * 24; // inner 11 = clear void
      const z = (Math.random() - 0.5) * 50;
      points.push(new THREE.Vector3(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        z
      ));
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [count]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (!meshRef.current) return;
    meshRef.current.rotation.z = t * 0.008;
    meshRef.current.rotation.y = t * 0.004;
  });

  return (
    <points ref={meshRef} geometry={geo}>
      <pointsMaterial
        size={0.06} color="#818cf8" transparent opacity={0.35}
        blending={THREE.AdditiveBlending} depthWrite={false}
      />
    </points>
  );
}

// --- MAIN BACKGROUND — React.memo for render isolation ---
const OnboardingBackground = memo(function OnboardingBackground() {
  const [isMobile, setIsMobile] = React.useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isMobile) {
    return (
      <div
        className="absolute inset-0 z-0 pointer-events-none overflow-hidden bg-[#020617]"
        style={{ width: '100vw', height: '100vh' }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 70% 70% at 50% 50%, rgba(99,102,241,0.15) 0%, rgba(2,6,23,1) 100%)',
          }}
        />
      </div>
    );
  }

  return (
    <div
      className="absolute inset-0 z-0 pointer-events-none overflow-hidden"
      style={{ width: '100vw', height: '100vh' }}
    >
      <Canvas
        camera={{ position: [0, 0, 18], fov: 65 }}
        style={{ background: '#020617' }}
        dpr={[1, 2]}
      >
        <fog attach="fog" args={['#020617', 18, 55]} />

        {/* Cinematic dual-tone rim lighting */}
        <ambientLight intensity={0.4} color="#1e1b4b" />
        <directionalLight position={[-10, 10, 6]} intensity={2.0} color="#6366f1" />
        <directionalLight position={[10, -10, -6]} intensity={1.2} color="#e11d48" />
        <pointLight position={[0, 0, -8]} intensity={0.8} color="#4338ca" distance={30} />

        <ParallaxCamera />
        <KineticSculpture />
        <HaloParticles />
      </Canvas>

      {/* CSS Radial Halo — reinforces negative space around modal */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 38% 45% at 50% 50%, transparent 0%, rgba(2,6,23,0.35) 55%, rgba(2,6,23,0.88) 100%)',
        }}
      />
    </div>
  );
});

export default OnboardingBackground;
