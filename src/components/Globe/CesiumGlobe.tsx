'use client';

import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';

interface ObserverPoint {
  lat: number;
  lng: number;
  name?: string;
}

interface Props {
  selected?: ObserverPoint;
  onLocationSelect?: (location: ObserverPoint) => void;
}

export default function CesiumGlobe({ selected, onLocationSelect }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return;

    Cesium.Ion.defaultAccessToken = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN || '';

    const viewer = new Cesium.Viewer(containerRef.current, {
      animation: false,
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      infoBox: false,
      sceneModePicker: false,
      timeline: false,
      navigationHelpButton: false,
      shouldAnimate: true,
      scene3DOnly: true,
      skyBox: true,
    });

    viewer.scene.globe.enableLighting = true;
    viewer.scene.globe.depthTestAgainstTerrain = true;
    viewer.cesiumWidget.creditContainer.style.display = 'none';

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
    handler.setInputAction((click) => {
      const ray = viewer.camera.getPickRay(click.position);
      const cartesian = viewer.scene.globe.pick(ray, viewer.scene);
      if (!cartesian) return;

      const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
      const latitude = Cesium.Math.toDegrees(cartographic.latitude);
      const longitude = Cesium.Math.toDegrees(cartographic.longitude);

      onLocationSelect?.({
        lat: Number(latitude.toFixed(5)),
        lng: Number(longitude.toFixed(5)),
        name: `Lat ${latitude.toFixed(2)} Lon ${longitude.toFixed(2)}`,
      });
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    viewerRef.current = viewer;

    return () => {
      handler.destroy();
      viewer.destroy();
    };
  }, [onLocationSelect]);

  useEffect(() => {
    if (selected && viewerRef.current) {
      const { lat, lng } = selected;
      const destination = Cesium.Cartesian3.fromDegrees(lng, lat, 15000000);
      viewerRef.current.camera.flyTo({ destination, duration: 1.2 });
    }
  }, [selected]);

  return <div ref={containerRef} className="absolute inset-0 h-full w-full" />;
}
