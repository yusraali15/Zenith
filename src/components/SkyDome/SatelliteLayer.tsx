'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { azElToVector3 } from '@/lib/coordinates';
import type { Observer, SatelliteResult } from '@/types';

interface Props {
  scene: THREE.Scene;
  observer: Observer;
}

const CATEGORY_COLORS: Record<SatelliteResult['category'], number> = {
  ISS: 0xffffff,
  starlink: 0x00d4ff,
  active: 0x6ef0a2,
  debris: 0xff8c8c,
  rocket: 0xffcc66,
};

function createSatellitePoints(results: SatelliteResult[]) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(results.length * 3);
  const colors = new Float32Array(results.length * 3);

  results.forEach((sat, index) => {
    const position = azElToVector3(sat.azimuth, sat.elevation, 485);
    positions[index * 3] = position.x;
    positions[index * 3 + 1] = position.y;
    positions[index * 3 + 2] = position.z;

    const color = new THREE.Color(CATEGORY_COLORS[sat.category] ?? 0x89d9ff);
    colors[index * 3] = color.r;
    colors[index * 3 + 1] = color.g;
    colors[index * 3 + 2] = color.b;
  });

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 3.2,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
  });

  return new THREE.Points(geometry, material);
}

export default function SatelliteLayer({ scene, observer }: Props) {
  const currentPointsRef = useRef<THREE.Points | null>(null);

  useEffect(() => {
    if (!scene) return;

    const group = new THREE.Group();
    scene.add(group);

    const worker = new Worker(new URL('../../workers/satellite.worker.ts', import.meta.url), {
      type: 'module',
    });

    let cancelled = false;
    let intervalId: number | null = null;

    async function refreshSatellites() {
      try {
        const response = await fetch('/api/satellites');
        if (!response.ok) return;

        const tles = (await response.json()) as Array<{ name: string; line1: string; line2: string }>;
        if (cancelled || !tles.length) return;

        worker.postMessage({ tles, observer });
      } catch {
        // ignore network errors while refreshing
      }
    }

    worker.onmessage = (event: MessageEvent<SatelliteResult[]>) => {
      if (cancelled) return;

      const satellites = event.data as SatelliteResult[];
      if (!satellites.length) return;

      const points = createSatellitePoints(satellites);
      if (currentPointsRef.current) {
        group.remove(currentPointsRef.current);
        currentPointsRef.current.geometry.dispose();
        currentPointsRef.current.material.dispose();
      }

      currentPointsRef.current = points;
      group.add(points);
    };

    refreshSatellites();
    intervalId = window.setInterval(refreshSatellites, 15000);

    return () => {
      cancelled = true;
      if (intervalId) window.clearInterval(intervalId);
      worker.terminate();
      if (currentPointsRef.current) {
        group.remove(currentPointsRef.current);
        currentPointsRef.current.geometry.dispose();
        currentPointsRef.current.material.dispose();
      }
      scene.remove(group);
    };
  }, [scene, observer]);

  return null;
}
