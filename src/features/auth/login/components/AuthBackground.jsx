import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function WormholeParticles({ count = 2000 }) {
  const mesh = useRef();
  
  const [positions, phases] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const p = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
       // Cylinder/Tunnel distribution
       const angle = Math.random() * Math.PI * 2;
       const radius = 2 + Math.random() * 5; // Radius of tunnel
       const z = (Math.random() - 0.5) * 50; // Depth

       pos[i * 3] = Math.cos(angle) * radius;
       pos[i * 3 + 1] = Math.sin(angle) * radius;
       pos[i * 3 + 2] = z;

       p[i] = Math.random() * Math.PI * 2;
    }
    return [pos, p];
  }, [count]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (!mesh.current) return;
    
    // Rotate the entire tunnel
    mesh.current.rotation.z = time * 0.05;

    // Move particles towards the camera to simulate moving through the void
    const positionsAttr = mesh.current.geometry.attributes.position;
    for (let i = 0; i < count; i++) {
      let z = positionsAttr.array[i * 3 + 2];
      z += 0.1; // Forward speed
      if (z > 25) z = -25; // Reset to the back when they pass the camera
      positionsAttr.array[i * 3 + 2] = z;
    }
    positionsAttr.needsUpdate = true;
  });

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color="#818cf8"
        transparent
        opacity={0.6}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export default function AuthBackground() {
  const [isMobile, setIsMobile] = React.useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isMobile) {
    return (
      <div className="absolute inset-0 z-0 bg-[#020617] overflow-hidden pointer-events-none">
         <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/30 via-[#020617] to-[#020617]"></div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-0 bg-[#020617] overflow-hidden pointer-events-none">
      <Canvas camera={{ position: [0, 0, 15], fov: 60 }} dpr={[1, 2]}>
        <fog attach="fog" args={['#020617', 5, 25]} />
        <WormholeParticles />
      </Canvas>
    </div>
  );
}
