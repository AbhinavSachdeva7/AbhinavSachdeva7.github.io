import { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';

const PARTICLE_COUNT_DESKTOP = 2000;
const PARTICLE_COUNT_MOBILE = 400;
const ORB_RADIUS = 1.7;
const COLOR_BASE = new THREE.Color('#ff1a5e');
const COLOR_HIGHLIGHT = new THREE.Color('#ff80a0');

// Spring constants for cursor repulsion recovery
// Lower stiffness = more fluid/floaty, higher = snappier
const SPRING_STIFFNESS = 0.8;
const SPRING_DAMPING = 0.58;
const REPULSION_RADIUS = 0.6;    // World-space radius of cursor influence
const REPULSION_STRENGTH = 1.2;  // Max displacement magnitude

const ParticleOrb = forwardRef(function ParticleOrb(_props, ref) {
  const canvasRef = useRef(null);
  const stateRef = useRef({
    isResponding: false,
    animFrame: null,
    scene: null,
    camera: null,
    renderer: null,
    points: null,
    basePositions: null,
    clock: null,
    respondScale: 1,
    respondDirection: 1,
    currentScale: 1,
    // Cursor state in NDC (-1..1)
    cursorNDC: new THREE.Vector2(9999, 9999),
    isHovered: false,
    // Per-particle spring offsets and velocities
    springOffsets: null,
    springVelocities: null,
  });

  useImperativeHandle(ref, () => ({
    respondStart() {
      stateRef.current.respondScale = stateRef.current.currentScale;
      stateRef.current.isResponding = true;
    },
    respondEnd() {
      stateRef.current.isResponding = false;
      stateRef.current.respondScale = stateRef.current.currentScale;
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const isMobile = window.innerWidth < 768;
    const particleCount = isMobile ? PARTICLE_COUNT_MOBILE : PARTICLE_COUNT_DESKTOP;
    const size = isMobile ? 150 : 200;

    // Scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.z = 4;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    // Build particle positions on a sphere
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / particleCount);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;

      positions[i * 3]     = ORB_RADIUS * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = ORB_RADIUS * Math.cos(phi);
      positions[i * 3 + 2] = ORB_RADIUS * Math.sin(phi) * Math.sin(theta);

      const mix = Math.random();
      const col = COLOR_BASE.clone().lerp(COLOR_HIGHLIGHT, mix * 0.4);
      colors[i * 3]     = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: isMobile ? 0.07 : 0.065,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: true,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    const clock = new THREE.Clock();
    const basePositions = positions.slice();

    // Per-particle spring state: 3 components per particle (x, y, z offset)
    const springOffsets    = new Float32Array(particleCount * 3);
    const springVelocities = new Float32Array(particleCount * 3);

    const s = stateRef.current;
    s.scene = scene;
    s.camera = camera;
    s.renderer = renderer;
    s.points = points;
    s.basePositions = basePositions;
    s.clock = clock;
    s.respondScale = 1;
    s.respondDirection = 1;
    s.springOffsets = springOffsets;
    s.springVelocities = springVelocities;

    // Reusable vectors to avoid GC pressure in the animation loop
    const _invMatrix = new THREE.Matrix4();

    // Project cursor NDC into orb's local space for correct interaction
    // regardless of orb rotation/scale
    const _cursorWorld = new THREE.Vector3();
    const _ray         = new THREE.Raycaster();

    function animate() {
      s.animFrame = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      // Rotation
      const rotSpeed = s.isResponding ? 0.012 : 0.004;
      points.rotation.y += rotSpeed;
      points.rotation.x += rotSpeed * 0.3;

      // --- Compute cursor in orb local space ---
      // We want to find where on the sphere the cursor "points to"
      // by unprojecting the NDC cursor through the camera into world space,
      // then transforming into the points object's local space.
      let cursorLocalX = 99999;
      let cursorLocalY = 99999;
      let cursorLocalZ = 99999;

      if (s.isHovered) {
        _ray.setFromCamera(s.cursorNDC, camera);
        // Find intersection depth: ray vs sphere of radius ORB_RADIUS
        // We use the ray direction to find a point at roughly the sphere surface
        const sphereCenter = new THREE.Vector3(0, 0, 0); // world origin (points is at origin)
        const rayOrigin = _ray.ray.origin.clone();
        const rayDir    = _ray.ray.direction.clone();

        // Solve ray-sphere intersection
        const oc = rayOrigin.clone().sub(sphereCenter);
        const a  = rayDir.dot(rayDir);
        const b  = 2.0 * oc.dot(rayDir);
        const c  = oc.dot(oc) - ORB_RADIUS * ORB_RADIUS;
        const discriminant = b * b - 4 * a * c;

        let hitPoint;
        if (discriminant >= 0) {
          // Use the front-facing hit
          const t1 = (-b - Math.sqrt(discriminant)) / (2 * a);
          hitPoint = rayOrigin.clone().addScaledVector(rayDir, t1 > 0 ? t1 : (-b + Math.sqrt(discriminant)) / (2 * a));
        } else {
          // Cursor is near but not hitting sphere — project onto sphere surface
          // by finding closest point on ray to sphere center
          const tClosest = -oc.dot(rayDir) / a;
          const closest  = rayOrigin.clone().addScaledVector(rayDir, tClosest);
          hitPoint = closest.clone().sub(sphereCenter).normalize().multiplyScalar(ORB_RADIUS);
        }

        // Transform hit point from world space → orb local space
        _invMatrix.copy(points.matrixWorld).invert();
        _cursorWorld.copy(hitPoint).applyMatrix4(_invMatrix);
        cursorLocalX = _cursorWorld.x;
        cursorLocalY = _cursorWorld.y;
        cursorLocalZ = _cursorWorld.z;
      }

      // --- Update particles ---
      const posArr = geometry.attributes.position.array;

      for (let i = 0; i < particleCount; i++) {
        const idx = i * 3;
        const bx = basePositions[idx];
        const by = basePositions[idx + 1];
        const bz = basePositions[idx + 2];

        // Idle breathing wave
        const wave = Math.sin(t * 2.5 + bx * 2 + bz * 1.5) * 0.0;

        // Current base target (breathing included)
        const targetX = bx;
        const targetY = by + wave;
        const targetZ = bz;

        // --- Cursor repulsion ---
        // Work in local space: compare base position to local cursor hit point
        let repX = 0, repY = 0, repZ = 0;

        if (s.isHovered) {
          const dx = bx - cursorLocalX;
          const dy = by - cursorLocalY;
          const dz = bz - cursorLocalZ;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist < REPULSION_RADIUS && dist > 0.001) {
            // Smooth falloff: particles close to cursor get pushed furthest
            // Use an ease-out curve so the edge of the influence radius tapers naturally
            const falloff = 1 - dist / REPULSION_RADIUS;
            const strength = REPULSION_STRENGTH * falloff * falloff; // quadratic falloff
            const invDist = 1 / dist;
            repX = dx * invDist * strength;
            repY = dy * invDist * strength;
            repZ = dz * invDist * strength;
          }
        }

        // --- Spring physics ---
        // Each particle's offset springs toward its repulsion target.
        // When cursor leaves, repulsion is 0, so spring pulls offsets back to zero.
        const ox = springOffsets[idx];
        const oy = springOffsets[idx + 1];
        const oz = springOffsets[idx + 2];

        // Spring force: toward (repX, repY, repZ)
        const fx = (repX - ox) * SPRING_STIFFNESS;
        const fy = (repY - oy) * SPRING_STIFFNESS;
        const fz = (repZ - oz) * SPRING_STIFFNESS;

        // Integrate velocity with damping
        springVelocities[idx]     = (springVelocities[idx]     + fx) * SPRING_DAMPING;
        springVelocities[idx + 1] = (springVelocities[idx + 1] + fy) * SPRING_DAMPING;
        springVelocities[idx + 2] = (springVelocities[idx + 2] + fz) * SPRING_DAMPING;

        springOffsets[idx]     = ox + springVelocities[idx];
        springOffsets[idx + 1] = oy + springVelocities[idx + 1];
        springOffsets[idx + 2] = oz + springVelocities[idx + 2];

        posArr[idx]     = targetX + springOffsets[idx];
        posArr[idx + 1] = targetY + springOffsets[idx + 1];
        posArr[idx + 2] = targetZ + springOffsets[idx + 2];
      }

      geometry.attributes.position.needsUpdate = true;

      // Scale & opacity
      if (s.isResponding) {
        s.respondScale += 0.008 * s.respondDirection;
        if (s.respondScale >= 1.1) s.respondDirection = -1;
        if (s.respondScale <= 0.9) s.respondDirection = 1;
        s.currentScale = s.respondScale;
        points.scale.setScalar(s.respondScale);
        material.opacity = 0.95;
      } else {
        const idleScale = 1 + Math.sin(t * 0.8) * 0.03;
        s.currentScale = idleScale;
        points.scale.setScalar(idleScale);
        material.opacity = 0.82 + Math.sin(t * 1.2) * 0.06;
      }

      renderer.render(scene, camera);
    }

    animate();

    // --- Mouse / pointer tracking ---
    // Convert canvas-local pointer position to NDC (-1..1)
    function onPointerMove(e) {
      const rect = canvas.getBoundingClientRect();
      // NDC: center of canvas = (0,0), right/up = positive
      s.cursorNDC.x =  ((e.clientX - rect.left)  / rect.width)  * 2 - 1;
      s.cursorNDC.y = -((e.clientY - rect.top)   / rect.height) * 2 + 1;
    }

    function onPointerEnter() {
      s.isHovered = true;
    }

    function onPointerLeave() {
      s.isHovered = false;
      s.cursorNDC.set(9999, 9999);
    }

    canvas.addEventListener('pointermove',  onPointerMove,  { passive: true });
    canvas.addEventListener('pointerenter', onPointerEnter, { passive: true });
    canvas.addEventListener('pointerleave', onPointerLeave, { passive: true });

    return () => {
      cancelAnimationFrame(s.animFrame);
      canvas.removeEventListener('pointermove',  onPointerMove);
      canvas.removeEventListener('pointerenter', onPointerEnter);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        margin: '0 auto',
        width: 'clamp(380px, 40vw, 500px)',
        height: 'clamp(380px, 40vw, 500px)',
        cursor: 'default',
      }}
    />
  );
});

export default ParticleOrb;
