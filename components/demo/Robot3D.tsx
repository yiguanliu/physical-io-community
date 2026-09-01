"use client";

import { useEffect, useRef } from "react";
// three/webgpu ships the WebGPU renderer plus the standard materials, which it
// auto-converts to node materials for the WebGPU (or WebGL2 fallback) backend.
import * as THREE from "three/webgpu";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// three ships no type declarations (and no @types/three is installed), so the
// values from `three/webgpu` are `any`. Alias the handful of types we annotate
// with; the runtime objects are unaffected.
type TObject3D = any;
type TMesh = any;
type TVec3 = any;
type TMaterial = any;

/** Projected surface basis: a centre point plus the screen-space vectors of the
 *  robot-local +X (right) and +Y (up) axes, so DOM panels can be corner-pinned
 *  flat onto the robot's front plane and tilt with it. */
export interface Basis {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  ux: number;
  uy: number;
}
export interface ScreenQuad {
  /** Projected screen corners in CSS px, order: TL, TR, BR, BL. */
  corners: { x: number; y: number }[];
  /** Dot of the screen's normal with the view direction: 1 = head-on, <0 = away. */
  facing: number;
  /** Per-control projected surface bases on the robot. */
  anchors: {
    left: Basis;
    right: Basis;
    topRight: Basis;
    body: Basis;
  };
}

interface Robot3DProps {
  booted: boolean;
  insertNonce: number;
  /** Head-animation trigger: bump `nonce` to play `type` once. */
  anim: { type: string; nonce: number };
  /** Camera view preset: bump `nonce` to ease the camera to az/elev/zoom. */
  view: { az: number; elev: number; zoom: number; nonce: number };
  onScreen: (quad: ScreenQuad) => void;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

const TARGET_HEIGHT = 5.7;
const SCREEN_MATERIAL = "Material.002";
/** Inverted-hull outline thickness, as a fraction of each mesh. */
const OUTLINE = 0.05;

/** Default camera orbit (azimuth, elevation) — a slight 3/4 view. The robot
 *  itself stays locked facing front; only the camera moves. */
const DEFAULT_AZ = -0.34;
const DEFAULT_ELEV = 0.14;

/** Two-tone black/white toon ramp — hard terminator for a stark line-art read. */
function toonGradient() {
  const steps = new Uint8Array([95, 95, 95, 255, 255, 255, 255, 255]);
  const tex = new THREE.DataTexture(steps, 2, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

export default function Robot3D({
  booted,
  insertNonce,
  anim = { type: "", nonce: 0 },
  view = { az: DEFAULT_AZ, elev: DEFAULT_ELEV, zoom: 1.35, nonce: 0 },
  onScreen,
}: Robot3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const state = useRef({
    booted,
    insertAt: -10,
    lastNonce: insertNonce,
    animType: "",
    animAt: -10,
    lastAnimNonce: anim.nonce,
    lastViewNonce: view.nonce,
    viewAz: DEFAULT_AZ,
    viewElev: DEFAULT_ELEV,
    viewZoom: 1.35,
    viewPending: false,
  });
  const cb = useRef(onScreen);
  cb.current = onScreen;

  useEffect(() => {
    state.current.booted = booted;
    if (insertNonce !== state.current.lastNonce) {
      state.current.lastNonce = insertNonce;
      state.current.insertAt = performance.now() / 1000;
    }
    if (anim.nonce !== state.current.lastAnimNonce) {
      state.current.lastAnimNonce = anim.nonce;
      state.current.animType = anim.type;
      state.current.animAt = performance.now() / 1000;
    }
    if (view.nonce !== state.current.lastViewNonce) {
      state.current.lastViewNonce = view.nonce;
      state.current.viewAz = view.az;
      state.current.viewElev = view.elev;
      state.current.viewZoom = view.zoom;
      state.current.viewPending = true;
    }
  }, [booted, insertNonce, anim, view]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let disposed = false;

    const BG = 0x0b0c10;
    const scene = new THREE.Scene();
    // Distance fog fades the 3D grid out toward the dark background.
    scene.fog = new THREE.Fog(BG, 13, 34);
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(0, 0.2, 8.4);

    // 3D perspective grid floor (static — the robot turns on it).
    const grid = new THREE.GridHelper(60, 60, 0x565b66, 0x2a2d34);
    grid.position.y = -2.9;
    (grid.material as TMaterial).transparent = true;
    scene.add(grid);

    const renderer = new THREE.WebGPURenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    const dom = renderer.domElement;
    mount.appendChild(dom);
    dom.style.width = "100%";
    dom.style.height = "100%";
    dom.style.display = "block";
    dom.style.cursor = "grab";
    dom.style.touchAction = "none";

    // ---- Lighting: a hard key + minimal fill for a crisp 2-tone terminator. ----
    scene.add(new THREE.AmbientLight(0xffffff, 0.28));
    const key = new THREE.DirectionalLight(0xffffff, 3.2);
    key.position.set(2.5, 4.5, 5.5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.35);
    fill.position.set(-4, 1.5, 2.5);
    scene.add(fill);

    const gradient = toonGradient();
    const robot = new THREE.Group();
    const inner = new THREE.Group();
    robot.add(inner);
    scene.add(robot);

    let screenMesh: TMesh | null = null;
    let headNode: TObject3D | null = null;
    const headBaseQuat = new THREE.Quaternion();
    // Head-animation scratch (world-axis rotations mapped into head-parent space).
    const AXIS_X = new THREE.Vector3(1, 0, 0);
    const AXIS_Y = new THREE.Vector3(0, 1, 0);
    const AXIS_Z = new THREE.Vector3(0, 0, 1);
    const parentQuat = new THREE.Quaternion();
    const localAxis = new THREE.Vector3();
    const deltaQuat = new THREE.Quaternion();
    const screenCornersLocal = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
    const screenNormalLocal = new THREE.Vector3(0, 0, 1);
    const screenGlassMat = new THREE.MeshBasicMaterial({ color: 0x0a0a0a });

    // Robot-local anchor points that DOM UI panels attach to (filled at load).
    const anchorLocal = {
      left: new THREE.Vector3(),
      right: new THREE.Vector3(),
      topRight: new THREE.Vector3(),
      body: new THREE.Vector3(),
    };
    let anchorsReady = false;

    const loader = new GLTFLoader();
    let ready = false;
    loader.load(
      "/models/robot.glb",
      (gltf: { scene: TObject3D }) => {
        if (disposed) return;
        const model = gltf.scene;

        model.updateWorldMatrix(true, true);
        const box0 = new THREE.Box3().setFromObject(model);
        const size0 = box0.getSize(new THREE.Vector3());
        const center0 = box0.getCenter(new THREE.Vector3());
        const scale = TARGET_HEIGHT / (size0.y || 1);
        model.scale.setScalar(scale);
        model.position.set(-center0.x * scale, -center0.y * scale, -center0.z * scale);

        // Collect meshes first — adding outline children below must not feed
        // back into the traversal (that would recurse infinitely).
        const meshes: TMesh[] = [];
        model.traverse((o: TObject3D) => {
          if ((o as TMesh).isMesh) meshes.push(o as TMesh);
        });

        for (const mesh of meshes) {
          const matName = (mesh.material as TMaterial)?.name ?? "";

          if (/plane/i.test(mesh.name) || /plane/i.test(mesh.parent?.name ?? "")) {
            // Remove (not just hide) — the huge floor plane would otherwise
            // inflate the model's bounding box and throw off the UI anchors.
            mesh.removeFromParent();
            continue;
          }

          if (matName === SCREEN_MATERIAL) {
            mesh.material = screenGlassMat;
            screenMesh = mesh;
            continue;
          }

          // White two-tone toon.
          mesh.material = new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: gradient });

          // Clean black ink outline via an inverted hull, scaled about the
          // geometry centre so it stays even under the model's node scales.
          mesh.geometry.computeBoundingBox();
          const c = mesh.geometry.boundingBox!.getCenter(new THREE.Vector3());
          const outline = new THREE.Mesh(mesh.geometry, new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide }));
          outline.scale.setScalar(1 + OUTLINE);
          outline.position.copy(c).multiplyScalar(-OUTLINE);
          outline.raycast = () => {};
          mesh.add(outline);
        }

        inner.add(model);

        // The head node (holds the screen) — animated independently of the base.
        headNode = model.getObjectByName("head") ?? null;
        if (headNode) headBaseQuat.copy(headNode.quaternion);

        // Measure the model in robot-local space (robot momentarily at identity)
        // to place UI anchor points on the head sides / top / body.
        const sp = robot.position.clone();
        robot.position.set(0, 0, 0);
        robot.rotation.set(0, 0, 0);
        robot.updateMatrixWorld(true);
        const mb = new THREE.Box3().setFromObject(inner);
        robot.position.copy(sp);
        robot.updateMatrixWorld(true);
        const mn = mb.min;
        const mx = mb.max;
        // Controls sit on the robot's front plane (constant z), so they tilt
        // with the object as the camera orbits.
        anchorLocal.left.set(mn.x - 0.55, mx.y * 0.28, mx.z * 0.55);
        anchorLocal.right.set(mx.x + 0.55, mx.y * 0.55, mx.z * 0.55);
        anchorLocal.topRight.set(mx.x * 0.7, mx.y * 1.12, mx.z * 0.55);
        anchorLocal.body.set(mn.x * 0.15, mn.y * 0.52, mx.z * 0.72);
        anchorsReady = true;

        if (screenMesh) {
          const sm = screenMesh as TMesh;
          sm.geometry.computeBoundingBox();
          const gb = sm.geometry.boundingBox!;
          const gs = gb.getSize(new THREE.Vector3());
          const gc = gb.getCenter(new THREE.Vector3());
          const dims: [("x" | "y" | "z"), number][] = [["x", gs.x], ["y", gs.y], ["z", gs.z]];
          dims.sort((a, b) => a[1] - b[1]);
          const nAxis = dims[0][0];
          const aAxis = dims[1][0];
          const bAxis = dims[2][0];
          screenNormalLocal.set(0, 0, 0)[nAxis] = 1;
          const ha = new THREE.Vector3();
          ha[aAxis] = gs[aAxis] / 2;
          const hb = new THREE.Vector3();
          hb[bAxis] = gs[bAxis] / 2;
          screenCornersLocal[0].copy(gc).add(ha).add(hb);
          screenCornersLocal[1].copy(gc).add(ha).sub(hb);
          screenCornersLocal[2].copy(gc).sub(ha).sub(hb);
          screenCornersLocal[3].copy(gc).sub(ha).add(hb);

          sm.updateWorldMatrix(true, false);
          const headBox = new THREE.Box3().setFromObject(model);
          const headC = headBox.getCenter(new THREE.Vector3());
          const scWorld = gc.clone().applyMatrix4(sm.matrixWorld);
          const nWorld0 = screenNormalLocal.clone().transformDirection(sm.matrixWorld);
          if (nWorld0.dot(scWorld.sub(headC)) < 0) screenNormalLocal.multiplyScalar(-1);
          const nOut = screenNormalLocal.clone().transformDirection(sm.matrixWorld);
          inner.rotation.y = -Math.atan2(nOut.x, nOut.z);
        }

        ready = true;
      },
      undefined,
      (err: unknown) => {
        // eslint-disable-next-line no-console
        console.error("[robot.glb] failed to load", err);
      }
    );

    // ---- Sizing + zoom ----
    let width = 1;
    let height = 1;
    let baseZ = 8;
    let zoom = 1.35; // default framing pulled back to show the whole machine.
    let targetZoom = 1.35;
    const resize = () => {
      const r = mount.getBoundingClientRect();
      width = Math.max(1, r.width);
      height = Math.max(1, r.height);
      const aspect = width / height;
      camera.aspect = aspect;
      baseZ = Math.min(22, Math.max(7.5, 14.94 / aspect));
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    // Wheel / trackpad zoom, clamped to a sensible range (applied in the loop).
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      targetZoom = clamp(targetZoom + e.deltaY * 0.0013, 0.55, 1.85);
    };
    dom.addEventListener("wheel", onWheel, { passive: false });

    // ---- Drag to orbit + two-finger pinch to zoom ----
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let yaw = DEFAULT_AZ;
    let pitch = DEFAULT_ELEV;
    let targetYaw = DEFAULT_AZ;
    let targetPitch = DEFAULT_ELEV;
    const pointers = new Map<number, { x: number; y: number }>();
    let pinchPrev = 0;
    const pinchDist = () => {
      const p = [...pointers.values()];
      return p.length < 2 ? 0 : Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
    };
    const onDown = (e: PointerEvent) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      dom.setPointerCapture?.(e.pointerId);
      if (pointers.size === 1) {
        dragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
        dom.style.cursor = "grabbing";
      } else if (pointers.size === 2) {
        dragging = false;
        pinchPrev = pinchDist();
      }
    };
    const onMove = (e: PointerEvent) => {
      if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size >= 2) {
        const d = pinchDist();
        if (pinchPrev > 0 && d > 0) {
          targetZoom = clamp(targetZoom * (pinchPrev / d), 0.55, 1.85);
        }
        pinchPrev = d;
        return;
      }
      if (!dragging) return;
      targetYaw = clamp(targetYaw + (e.clientX - lastX) * 0.007, -1.35, 1.35);
      targetPitch = clamp(targetPitch + (e.clientY - lastY) * 0.005, -0.45, 0.5);
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinchPrev = 0;
      if (pointers.size === 0) {
        dragging = false;
        dom.style.cursor = "grab";
      } else {
        const p = [...pointers.values()][0];
        lastX = p.x;
        lastY = p.y;
        dragging = true;
      }
    };
    dom.addEventListener("pointerdown", onDown);
    dom.addEventListener("pointermove", onMove);
    dom.addEventListener("pointerup", onUp);
    dom.addEventListener("pointercancel", onUp);

    const v = new THREE.Vector3();
    const v2 = new THREE.Vector3();
    const nWorld = new THREE.Vector3();
    const screenPos = new THREE.Vector3();
    const viewDir = new THREE.Vector3();
    const proj = [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ];
    const mkBasis = () => ({ cx: 0, cy: 0, rx: 1, ry: 0, ux: 0, uy: 1 });
    const anchorOut = { left: mkBasis(), right: mkBasis(), topRight: mkBasis(), body: mkBasis() };
    const projPx = (p: TVec3, out: { x: number; y: number }) => {
      p.project(camera);
      out.x = (p.x * 0.5 + 0.5) * width;
      out.y = (-p.y * 0.5 + 0.5) * height;
    };
    const tmpA = { x: 0, y: 0 };
    const tmpB = { x: 0, y: 0 };
    const projectBasis = (local: TVec3, out: ReturnType<typeof mkBasis>) => {
      v.copy(local).applyMatrix4(robot.matrixWorld);
      projPx(v, tmpA);
      out.cx = tmpA.x;
      out.cy = tmpA.y;
      // +X world axis in px (per unit)
      v2.copy(local).add(new THREE.Vector3(1, 0, 0)).applyMatrix4(robot.matrixWorld);
      projPx(v2, tmpB);
      out.rx = tmpB.x - out.cx;
      out.ry = tmpB.y - out.cy;
      // +Y world axis in px (per unit)
      v2.copy(local).add(new THREE.Vector3(0, 1, 0)).applyMatrix4(robot.matrixWorld);
      projPx(v2, tmpB);
      out.ux = tmpB.x - out.cx;
      out.uy = tmpB.y - out.cy;
    };
    const clock = new THREE.Clock();

    const framefn = () => {
      const t = clock.getElapsedTime();
      const now = performance.now() / 1000;
      const s = state.current;
      const since = now - s.insertAt;
      const react = since >= 0 && since < 0.9 ? Math.sin((since / 0.9) * Math.PI) : 0;

      // Apply a pending camera-view preset (from the dropdown).
      if (s.viewPending) {
        targetYaw = s.viewAz;
        targetPitch = s.viewElev;
        targetZoom = s.viewZoom;
        s.viewPending = false;
      }

      // The robot stays locked facing front (only a gentle vertical bob);
      // dragging orbits the CAMERA around it instead of turning the object.
      yaw += (targetYaw - yaw) * 0.12;
      pitch += (targetPitch - pitch) * 0.12;
      zoom += (targetZoom - zoom) * 0.15;
      robot.rotation.set(0, 0, 0);
      robot.position.y = Math.sin(t * 0.9) * 0.08 - react * 0.18;

      const dist = baseZ * zoom;
      const ce = Math.cos(pitch);
      camera.position.set(Math.sin(yaw) * ce * dist, Math.sin(pitch) * dist, Math.cos(yaw) * ce * dist);
      camera.lookAt(0, 0, 0);

      // Head-only animations (rotations about WORLD axes, mapped into the head's
      // parent space so nod/shake/tilt read correctly regardless of node frame).
      if (headNode) {
        const ae = now - s.animAt;
        let axis: TVec3 | null = null;
        let angle = 0;
        if (ae >= 0 && ae < 2.2) {
          if (s.animType === "nod") {
            axis = AXIS_X;
            angle = -0.42 * Math.sin(ae * 8) * Math.exp(-ae * 2.1);
          } else if (s.animType === "shake") {
            axis = AXIS_Y;
            angle = 0.5 * Math.sin(ae * 11) * Math.exp(-ae * 2.6);
          } else if (s.animType === "tilt") {
            axis = AXIS_Z;
            angle = 0.5 * Math.sin(ae * 5.5) * Math.exp(-ae * 1.9);
          } else if (s.animType === "spin") {
            axis = AXIS_Y;
            angle = 2 * Math.PI * (1 - Math.pow(1 - Math.min(ae / 0.95, 1), 3));
          } else if (s.animType === "scan") {
            axis = AXIS_Y;
            angle = 0.6 * Math.sin(ae * 2.4) * Math.max(0, 1 - ae / 2.1);
          }
        }
        if (axis && Math.abs(angle) > 1e-4) {
          headNode.parent!.getWorldQuaternion(parentQuat).invert();
          localAxis.copy(axis).applyQuaternion(parentQuat).normalize();
          deltaQuat.setFromAxisAngle(localAxis, angle);
          headNode.quaternion.copy(deltaQuat).multiply(headBaseQuat);
        } else {
          headNode.quaternion.copy(headBaseQuat);
        }
      }

      renderer.render(scene, camera);

      if (ready && screenMesh) {
        const sm = screenMesh;
        sm.updateWorldMatrix(true, false);
        for (let i = 0; i < 4; i++) {
          v.copy(screenCornersLocal[i]).applyMatrix4(sm.matrixWorld);
          v.project(camera);
          proj[i].x = (v.x * 0.5 + 0.5) * width;
          proj[i].y = (-v.y * 0.5 + 0.5) * height;
        }
        const sorted = proj.slice().sort((a, b) => a.y - b.y);
        const top = [sorted[0], sorted[1]].sort((a, b) => a.x - b.x);
        const bot = [sorted[2], sorted[3]].sort((a, b) => a.x - b.x);
        const corners = [top[0], top[1], bot[1], bot[0]];

        sm.getWorldPosition(screenPos);
        nWorld.copy(screenNormalLocal).transformDirection(sm.matrixWorld).normalize();
        viewDir.copy(camera.position).sub(screenPos).normalize();

        if (anchorsReady) {
          robot.updateMatrixWorld();
          projectBasis(anchorLocal.left, anchorOut.left);
          projectBasis(anchorLocal.right, anchorOut.right);
          projectBasis(anchorLocal.topRight, anchorOut.topRight);
          projectBasis(anchorLocal.body, anchorOut.body);
        }

        cb.current({ corners, facing: nWorld.dot(viewDir), anchors: anchorOut });
      }
    };

    renderer.init().then(() => {
      if (disposed) return;
      renderer.setAnimationLoop(framefn);
    });

    return () => {
      disposed = true;
      renderer.setAnimationLoop(null);
      ro.disconnect();
      dom.removeEventListener("wheel", onWheel);
      dom.removeEventListener("pointerdown", onDown);
      dom.removeEventListener("pointermove", onMove);
      dom.removeEventListener("pointerup", onUp);
      dom.removeEventListener("pointercancel", onUp);
      scene.traverse((o: TObject3D) => {
        const m = o as TMesh;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material as TMaterial | TMaterial[] | undefined;
        if (mat) (Array.isArray(mat) ? mat : [mat]).forEach((x) => x.dispose());
      });
      renderer.dispose();
      if (dom.parentNode) dom.parentNode.removeChild(dom);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={mountRef} className="robot-canvas" aria-hidden="true" />;
}
