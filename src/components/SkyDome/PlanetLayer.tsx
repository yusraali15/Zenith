'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { azElToVector3 } from '@/lib/coordinates';
import { getPlanetPositions } from '@/lib/astronomy';
import type { Observer } from '@/types';

interface Props {
  scene: THREE.Scene;
  observer: Observer;
}

export default function PlanetLayer({ scene, observer }: Props) {
  const groupRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    const group = new THREE.Group();
    groupRef.current = group;
    scene.add(group);

    const planets = getPlanetPositions(observer);
    planets.forEach((planet) => {
      const position = azElToVector3(planet.azimuth, planet.elevation, 480);
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(Math.max(3.5, 7 - planet.magnitude), 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xffd166 })
      );
      mesh.position.copy(position);
      group.add(mesh);

      const label = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: createLabelTexture(planet.name),
          depthTest: false,
          depthWrite: false,
          transparent: true,
        })
      );
      label.scale.set(40, 12, 1);
      label.position.copy(position).multiplyScalar(1.02);
      group.add(label);
    });

    return () => {
      scene.remove(group);
      group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
        if (child instanceof THREE.Sprite) {
          child.material.dispose();
        }
      });
    };
  }, [scene, observer]);

  return null;
}

function createLabelTexture(text: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  ctx.fillStyle = 'rgba(5, 10, 25, 0.85)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = '24px Inter, sans-serif';
  ctx.fillStyle = '#c8f7ff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}
