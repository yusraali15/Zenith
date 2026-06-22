'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import SatelliteLayer from './SatelliteLayer';
import PlanetLayer from './PlanetLayer';
import { azElToVector3 } from '@/lib/coordinates';
import type { Observer } from '@/types';

interface Props {
  observer: Observer;
}

const STAR_COUNT = 2400;
const DOME_RADIUS = 500;

function createStarField() {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(STAR_COUNT * 3);
  const colors = new Float32Array(STAR_COUNT * 3);

  for (let i = 0; i < STAR_COUNT; i += 1) {
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const radius = DOME_RADIUS - 5;
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    const brightness = 0.8 + Math.random() * 0.2;
    colors[i * 3] = brightness;
    colors[i * 3 + 1] = brightness;
    colors[i * 3 + 2] = 1.0;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 2.4,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0.92,
  });

  return new THREE.Points(geometry, material);
}

export default function SkyDome({ observer }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const [sceneReady, setSceneReady] = useState(false);
  const starField = useMemo(() => createStarField(), []);

  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 1200);
    camera.position.set(0, 0, 0.65);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000011, 1);
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';

    containerRef.current.appendChild(renderer.domElement);

    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(DOME_RADIUS, 64, 64),
      new THREE.MeshBasicMaterial({
        color: 0x000012,
        side: THREE.BackSide,
        transparent: true,
        opacity: 0.0,
      })
    );
    scene.add(dome);
    scene.add(starField);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.minDistance = 0.01;
    controls.maxDistance = 0.01;
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.rotateSpeed = -0.35;

    const ambient = new THREE.AmbientLight(0xffffff, 0.35);
    scene.add(ambient);

    const clock = new THREE.Clock();
    let requestId: number;

    function onResize() {
      if (!containerRef.current) return;
      const newWidth = containerRef.current.clientWidth;
      const newHeight = containerRef.current.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    }

    function animate() {
      controls.update();
      renderer.render(scene, camera);
      requestId = requestAnimationFrame(animate);
    }

    animate();
    window.addEventListener('resize', onResize);

    rendererRef.current = renderer;
    cameraRef.current = camera;
    sceneRef.current = scene;
    controlsRef.current = controls;
    setSceneReady(true);

    return () => {
      window.removeEventListener('resize', onResize);
      if (requestId) cancelAnimationFrame(requestId);
      controls.dispose();
      renderer.dispose();
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((item) => item.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, [starField]);

  useEffect(() => {
    if (!sceneReady || !sceneRef.current) return;
    sceneRef.current.rotation.y = ((observer.lng % 360) * Math.PI) / 180;
  }, [observer, sceneReady]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[2rem] border border-cyan-400/10 bg-black/60 shadow-xl">
      <div ref={containerRef} className="relative h-[72vh] w-full" />
      {sceneRef.current ? (
        <>
          <SatelliteLayer scene={sceneRef.current} observer={observer} />
          <PlanetLayer scene={sceneRef.current} observer={observer} />
        </>
      ) : null}
      <div className="pointer-events-none absolute inset-x-0 bottom-6 mx-auto flex max-w-3xl items-center justify-between rounded-3xl bg-slate-950/70 px-5 py-4 text-sm text-slate-200 shadow-2xl backdrop-blur-xl">
        <div>
          <p className="font-semibold text-white">Observer</p>
          <p>{observer.name}</p>
        </div>
        <div className="font-mono text-right text-xs text-slate-400">
          {observer.lat.toFixed(4)}°, {observer.lng.toFixed(4)}°
        </div>
      </div>
    </div>
  );
}
