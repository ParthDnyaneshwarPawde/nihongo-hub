import React, { useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, Environment, Float, Center } from '@react-three/drei';
import { EffectComposer, DepthOfField, Bloom, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';

// Highly reliable Google Font raw OTF (Works flawlessly with troika SDF text!)
const KANJI_FONT_URL = 'https://fonts.gstatic.com/ea/notosansjapanese/v6/NotoSansJP-Bold.otf';

function LightningKanji({ text, position, rotation, delay, scale = 1, zOffset = 0 }) {
  const groupRef = useRef();
  const materialRef = useRef();

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime() + delay;

    // 1. Kinetic Physics: Drift
    const driftY = Math.sin(t * 0.4) * 0.4;
    const driftX = Math.cos(t * 0.3) * 0.2;
    
    // 2. Mouse Magnetism 
    const mx = (state.pointer.x * Math.PI) / 12; 
    const my = -(state.pointer.y * Math.PI) / 12;

    groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, rotation[1] + mx, 0.05);
    groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, rotation[0] + my, 0.05);

    // 3. Scroll Mapping
    const scrollContainer = document.querySelector('.premium-scroll');
    if (scrollContainer) {
      const scrollY = scrollContainer.scrollTop;
      const progress = Math.min(scrollY / window.innerHeight, 1); 
      const targetZ = position[2] + zOffset - (progress * 30);
      groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, targetZ, 0.1);

      const targetOpacity = 1 - (progress * 1.5); 
      if (materialRef.current) {
        materialRef.current.opacity = THREE.MathUtils.lerp(
          materialRef.current.opacity, 
          Math.max(targetOpacity, 0), 
          0.1
        );
      }
      groupRef.current.position.y = position[1] + driftY;
      groupRef.current.position.x = position[0] + driftX;
    } else {
      groupRef.current.position.y = position[1] + driftY;
      groupRef.current.position.x = position[0] + driftX;
    }

    // 4. LIGHTNING EFFECT (Erratic Emissive Flashing)
    if (materialRef.current) {
      // 2% chance every frame to strike a massive lightning flash
      if (Math.random() > 0.98) {
         materialRef.current.emissiveIntensity = 8 + Math.random() * 20; // Massive blast of bloom energy
      } else {
         // Rapid decay back to baseline glow
         materialRef.current.emissiveIntensity = THREE.MathUtils.lerp(materialRef.current.emissiveIntensity, 0.5, 0.15);
      }
    }
  });

  return (
    <Float floatIntensity={2.5} rotationIntensity={1} speed={1.5}>
      <Center ref={groupRef} position={position}>
        <Text
          font={KANJI_FONT_URL}
          fontSize={scale}
          characters="武創指揮" // Prevents fetching unneeded characters
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          {text}
          <meshStandardMaterial 
            ref={materialRef}
            transparent={true}
            opacity={0.9}
            color="#e0e7ff" // very light indigo
            emissive="#4f46e5" // pure indigo
            emissiveIntensity={0.5}
            roughness={0.2}
            metalness={0.8}
          />
        </Text>
      </Center>
    </Float>
  );
}

export default function BackgroundCanvas({ isDarkMode }) {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none w-full h-full overflow-hidden" 
         style={{ pointerEvents: 'none' }}>
      {/* 🚀 PERFORMANCE UPGRADE: Capping Device Pixel Ratio and enabling adaptive resolution */}
      <Canvas 
        eventSource={typeof window !== 'undefined' ? document.body : undefined} 
        eventPrefix="client" 
        camera={{ position: [0, 0, 20], fov: 45 }}
        dpr={[1, 1.5]} 
        performance={{ min: 0.5 }} 
      >
        <Suspense fallback={null}>
          <Environment preset="city" />
          
          <ambientLight intensity={isDarkMode ? 0.2 : 0.8} />

          {/* Lightning Kanji Distribution */}
          <LightningKanji text="武" position={[8, -2, -5]} rotation={[0.1, -0.2, 0]} scale={5} delay={0} zOffset={0} />
          <LightningKanji text="創" position={[-10, 6, -10]} rotation={[-0.1, 0.3, 0.1]} scale={4.5} delay={2} zOffset={-5} />
          <LightningKanji text="指揮" position={[3, 8, -15]} rotation={[0.2, -0.1, -0.05]} scale={4} delay={4} zOffset={-10} />

          {/* Post Processing: Massive optimization by removing DepthOfField & Noise, disabling mipmapBlur */}
          <EffectComposer disableNormalPass multisampling={0}>
            <Bloom luminanceThreshold={2} luminanceSmoothing={0.9} intensity={2.5} />
          </EffectComposer>
        </Suspense>
      </Canvas>
    </div>
  );
}
