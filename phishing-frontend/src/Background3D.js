import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function Background3D({ theme = "neutral" }) {
  const mountRef = useRef(null);
  const materialRef = useRef(null);
  const materialRef2 = useRef(null);
  const lineMaterialRef = useRef(null);
  const animationIdRef = useRef(null);
  const themeRef = useRef(theme);
  const pointerRef = useRef({ x: 0, y: 0 });
  const smoothPointerRef = useRef({ x: 0, y: 0 });
  const pulseRef = useRef(0);

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  useEffect(() => {
    if (!mountRef.current) return;
    const mountEl = mountRef.current;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.18);

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(window.innerWidth, window.innerHeight);

    mountEl.appendChild(renderer.domElement);

    const themeToHex = (t) => {
      if (t === "phishing") return 0xef4444; // red
      if (t === "safe") return 0x22c55e; // green
      return 0x00ffcc; // cyan
    };

    const themeToHex2 = (t) => {
      if (t === "phishing") return 0xf97316; // orange-red
      if (t === "safe") return 0x06b6d4; // teal
      return 0x22c55e; // green-cyan
    };

    const t = themeRef.current;

    const isMobile = window.innerWidth < 600;
    const particleCount = isMobile ? 1400 : 3200;
    const radius = isMobile ? 3.2 : 3.5;
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      // Visual point cloud in a sphere
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = Math.cbrt(Math.random()) * radius;

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      positions[i * 3 + 0] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
    }

    // Group so we can rotate layers together
    const group = new THREE.Group();
    scene.add(group);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );

    const material = new THREE.PointsMaterial({
      size: 0.04,
      color: themeToHex(t),
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      sizeAttenuation: true,
    });

    materialRef.current = material;

    const particles = new THREE.Points(geometry, material);
    group.add(particles);

    // Secondary glow layer (smaller + slightly different hue)
    const geometry2 = new THREE.BufferGeometry();
    geometry2.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );

    const material2 = new THREE.PointsMaterial({
      size: 0.018,
      color: themeToHex2(t),
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
    });

    materialRef2.current = material2;

    const particles2 = new THREE.Points(geometry2, material2);
    group.add(particles2);

    // Subtle connection lines (random edges)
    const edgeCount = isMobile ? 280 : 720;
    const linePositions = new Float32Array(edgeCount * 2 * 3);
    for (let e = 0; e < edgeCount; e++) {
      const a = Math.floor(Math.random() * particleCount);
      const b = Math.floor(Math.random() * particleCount);

      linePositions[e * 2 * 3 + 0] = positions[a * 3 + 0];
      linePositions[e * 2 * 3 + 1] = positions[a * 3 + 1];
      linePositions[e * 2 * 3 + 2] = positions[a * 3 + 2];

      linePositions[e * 2 * 3 + 3] = positions[b * 3 + 0];
      linePositions[e * 2 * 3 + 4] = positions[b * 3 + 1];
      linePositions[e * 2 * 3 + 5] = positions[b * 3 + 2];
    }

    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(linePositions, 3)
    );

    const lineMaterial = new THREE.LineBasicMaterial({
      color: themeToHex(t),
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
    });

    lineMaterialRef.current = lineMaterial;

    const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    group.add(lines);

    const updatePointerFromClientXY = (clientX, clientY) => {
      const nx = (clientX / window.innerWidth) * 2 - 1; // -1..1
      const ny = -((clientY / window.innerHeight) * 2 - 1); // -1..1 (invert Y)
      pointerRef.current.x = Math.max(-1, Math.min(1, nx));
      pointerRef.current.y = Math.max(-1, Math.min(1, ny));
    };

    const onPointerMove = (e) => {
      if (e.touches && e.touches.length > 0) {
        updatePointerFromClientXY(e.touches[0].clientX, e.touches[0].clientY);
        return;
      }
      updatePointerFromClientXY(e.clientX, e.clientY);
    };

    const onPointerDown = () => {
      pulseRef.current = performance.now();
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });

    // Touch fallback (some devices/browsers behave differently with pointer events)
    const onTouchMove = (e) => {
      if (e.touches && e.touches.length > 0) {
        updatePointerFromClientXY(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const onTouchStart = () => {
      pulseRef.current = performance.now();
    };
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);

      const time = performance.now() * 0.001;

      // Smooth the pointer so it doesn't jitter on mobile
      const targetX = pointerRef.current.x;
      const targetY = pointerRef.current.y;
      smoothPointerRef.current.x +=
        (targetX - smoothPointerRef.current.x) * 0.06;
      smoothPointerRef.current.y +=
        (targetY - smoothPointerRef.current.y) * 0.06;

      const px = smoothPointerRef.current.x;
      const py = smoothPointerRef.current.y;

      const rotY = 0.35 * time + px * 0.6;
      const rotX = 0.18 * time + py * 0.35;

      particles.rotation.y = rotY;
      particles.rotation.x = rotX;
      particles2.rotation.y = rotY * 0.9;
      particles2.rotation.x = rotX * 1.05;

      lines.rotation.y = rotY * 0.6;
      lines.rotation.x = rotX * 0.4;

      // Pulse on tap/click (decays quickly) + gentle idle motion
      const age = pulseRef.current ? performance.now() - pulseRef.current : 0;
      const pulse = age > 0 ? Math.exp(-age / 450) : 0;
      const idle1 = 0.75 + 0.12 * Math.sin(time * 1.1);
      const idle2 = 0.12 + 0.07 * Math.sin(time * 0.9);

      if (materialRef.current) {
        materialRef.current.opacity = idle1 + pulse * 0.18;
        materialRef.current.size = (isMobile ? 0.03 : 0.04) * (1 + pulse * 0.9);
      }
      if (materialRef2.current) {
        materialRef2.current.opacity = 0.6 + pulse * 0.22;
        materialRef2.current.size = (isMobile ? 0.013 : 0.018) * (1 + pulse * 0.9);
      }
      if (lineMaterialRef.current) {
        lineMaterialRef.current.opacity = idle2 + pulse * 0.22;
      }

      // Parallax shift for more depth
      group.position.x = px * 0.25;
      group.position.y = py * 0.12;

      renderer.render(scene, camera);
    };

    animate();

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchstart", onTouchStart);

      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }

      if (mountEl && renderer.domElement) {
        mountEl.removeChild(renderer.domElement);
      }

      geometry.dispose();
      geometry2.dispose();
      lineGeometry.dispose();
      material.dispose();
      material2.dispose();
      lineMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    if (!materialRef.current) return;

    const themeToHex = (t) => {
      if (t === "phishing") return 0xef4444;
      if (t === "safe") return 0x22c55e;
      return 0x00ffcc;
    };

    const themeToHex2 = (t) => {
      if (t === "phishing") return 0xf97316;
      if (t === "safe") return 0x06b6d4;
      return 0x22c55e;
    };

    materialRef.current.color.setHex(themeToHex(theme));
    if (materialRef2.current) materialRef2.current.color.setHex(themeToHex2(theme));
    if (lineMaterialRef.current) lineMaterialRef.current.color.setHex(themeToHex(theme));
  }, [theme]);

  return (
    <div
      ref={mountRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    />
  );
}
