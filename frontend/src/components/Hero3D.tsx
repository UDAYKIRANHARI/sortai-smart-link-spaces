import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Environment, ContactShadows, Text } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";

function DataCard({ position, rotation, label, color }: { position: [number, number, number], rotation: [number, number, number], label: string, color: string }) {
  const group = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (group.current) {
      group.current.position.y = position[1] + Math.sin(state.clock.elapsedTime + position[0]) * 0.2;
    }
  });

  return (
    <group position={position} rotation={rotation} ref={group}>
      <Float floatIntensity={2} rotationIntensity={0.5} speed={2}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[2.5, 3.5, 0.1]} />
          <meshPhysicalMaterial 
            color={color}
            roughness={0.2}
            metalness={0.8}
            clearcoat={1}
            clearcoatRoughness={0.1}
          />
        </mesh>
        <Text
          position={[0, 0, 0.06]}
          fontSize={0.4}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf"
        >
          {label}
        </Text>
      </Float>
    </group>
  );
}

export default function Hero3D() {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none opacity-60 md:opacity-100">
      <Canvas camera={{ position: [0, 0, 10], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} penumbra={1} intensity={1} castShadow />
        <Environment preset="city" />
        
        {/* Floating Link Cards representing different spaces */}
        <DataCard position={[-4, 1, -2]} rotation={[0.2, 0.4, -0.1]} label="Tech" color="#1e1b4b" />
        <DataCard position={[0, 0, 0]} rotation={[0, 0, 0]} label="Career" color="#064e3b" />
        <DataCard position={[4, -1, -1]} rotation={[-0.2, -0.4, 0.1]} label="Design" color="#4c1d95" />

        <ContactShadows position={[0, -3, 0]} opacity={0.4} scale={20} blur={2} far={4.5} />
      </Canvas>
    </div>
  );
}
