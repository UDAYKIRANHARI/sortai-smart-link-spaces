"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Float, Stars, Text } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";

function DataNode({ position, color, label }: { position: [number, number, number], color: string, label: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
      meshRef.current.rotation.y += 0.01;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <group position={position}>
        <mesh ref={meshRef}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={color} roughness={0.2} metalness={0.8} />
        </mesh>
        <Text
          position={[0, -1.2, 0]}
          fontSize={0.3}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          {label}
        </Text>
      </group>
    </Float>
  );
}

function ConnectionLines() {
  // A simple glowing line connecting the nodes
  return (
    <line>
      <bufferGeometry attach="geometry">
        <bufferAttribute
          attach="attributes-position"
          count={3}
          array={new Float32Array([
            -3, 0, 0,
            0, 2, -2,
            3, -1, 1,
          ])}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial attach="material" color="#4ade80" opacity={0.5} transparent linewidth={2} />
    </line>
  );
}

export default function ThreeScene() {
  return (
    <div className="w-full h-full min-h-[400px]">
      <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#4f46e5" />
        
        <Stars radius={50} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />

        <DataNode position={[-3, 0, 0]} color="#3b82f6" label="Tech" />
        <DataNode position={[0, 2, -2]} color="#10b981" label="Career" />
        <DataNode position={[3, -1, 1]} color="#8b5cf6" label="Fitness" />
        
        <ConnectionLines />

        <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.5} />
      </Canvas>
    </div>
  );
}
