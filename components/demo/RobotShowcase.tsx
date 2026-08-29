"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Silkscreen } from "next/font/google";
import LogoMark from "@/components/LogoMark";
import ScreenOS, { type Phase } from "./ScreenOS";
import {
  Floppy,
  LockIcon,
  SadMac,
  IconNod,
  IconShake,
  IconTilt,
  IconScan,
  IconSpin,
  IconCamera,
  IconScale,
  IconPower,
  IconFull,
} from "./PixelIcons";
import { DISKS, type Disk } from "./disks";
import type { ScreenQuad } from "./Robot3D";

const Robot3D = dynamic(() => import("./Robot3D"), { ssr: false });

const pixelFont = Silkscreen({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-pixel" });

const BOOT_MS = 1400;

// Head-animation controls with their pixel icons.
const ANIM_CONTROLS: [string, string, React.FC<{ className?: string }>][] = [
  ["nod", "Nod", IconNod],
  ["shake", "Shake", IconShake],
  ["tilt", "Tilt", IconTilt],
  ["scan", "Scan", IconScan],
  ["spin", "Spin", IconSpin],
];

const DEFAULT_VIEW = { az: -0.34, elev: 0.14, zoom: 1.35 };
// Zoom-in preset: a near-front close-up filling the frame with the screen.
const CLOSEUP_VIEW = { az: -0.24, elev: 0.05, zoom: 0.5 };

// Camera view presets for the dropdown (azimuth, elevation, zoom).
const VIEWS: { label: string; az: number; elev: number; zoom: number }[] = [
  { label: "Default", az: -0.34, elev: 0.14, zoom: 1.35 },
  { label: "Front", az: 0, elev: 0.03, zoom: 1.2 },
  { label: "Left", az: -1.15, elev: 0.12, zoom: 1.35 },
  { label: "Right", az: 1.15, elev: 0.12, zoom: 1.35 },
  { label: "Top-down", az: -0.3, elev: 0.6, zoom: 1.45 },
  { label: "Close-up", az: -0.18, elev: 0.05, zoom: 0.75 },
];

// Base pixel box the OS is authored in; a matrix3d transform corner-pins it onto
// the robot's projected (roughly square) screen glass.
const BASE_W = 448;
const BASE_H = 424;

// ---- Homography: map the base box's 4 corners onto the projected quad ----
type M3 = number[];
const adj = (m: M3): M3 => [
  m[4] * m[8] - m[5] * m[7], m[2] * m[7] - m[1] * m[8], m[1] * m[5] - m[2] * m[4],
  m[5] * m[6] - m[3] * m[8], m[0] * m[8] - m[2] * m[6], m[2] * m[3] - m[0] * m[5],
  m[3] * m[7] - m[4] * m[6], m[1] * m[6] - m[0] * m[7], m[0] * m[4] - m[1] * m[3],
];
const mulMM = (a: M3, b: M3): M3 => {
  const c: M3 = [];
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) {
      let s = 0;
      for (let k = 0; k < 3; k++) s += a[3 * i + k] * b[3 * k + j];
      c[3 * i + j] = s;
    }
  return c;
};
const mulMV = (m: M3, v: number[]) => [
  m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
  m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
  m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
];
const basisToPoints = (
  x1: number, y1: number, x2: number, y2: number,
  x3: number, y3: number, x4: number, y4: number
): M3 => {
  const m = [x1, x2, x3, y1, y2, y3, 1, 1, 1];
  const v = mulMV(adj(m), [x4, y4, 1]);
  return mulMM(m, [v[0], 0, 0, 0, v[1], 0, 0, 0, v[2]]);
};
const projection = (s: number[], d: number[]): M3 => {
  const src = basisToPoints(s[0], s[1], s[2], s[3], s[4], s[5], s[6], s[7]);
  const dst = basisToPoints(d[0], d[1], d[2], d[3], d[4], d[5], d[6], d[7]);
  return mulMM(dst, adj(src));
};

interface Flyer {
  id: number;
  from: { x: number; y: number };
  to: { x: number; y: number };
}

export default function RobotShowcase() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [disk, setDisk] = useState<Disk | null>(null);
  const [admin, setAdmin] = useState(false);
  const [insertNonce, setInsertNonce] = useState(0);
  const [denied, setDenied] = useState<string | null>(null);
  const [flyer, setFlyer] = useState<Flyer | null>(null);
  const [flyerGo, setFlyerGo] = useState(false);
  const [anim, setAnim] = useState({ type: "", nonce: 0 });
  const [focus, setFocus] = useState(Math.floor(DISKS.length / 2));
  const [ghost, setGhost] = useState<{ x: number; y: number; over: boolean } | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [view, setView] = useState({ az: -0.34, elev: 0.14, zoom: 1.35, nonce: 0 });
  const [powered, setPowered] = useState(true);
  const [scaledUp, setScaledUp] = useState(false);
  const [camOpen, setCamOpen] = useState(false);
  const wheelLock = useRef(false);
  const dragRef = useRef<{ disk: Disk; sx: number; sy: number; dragging: boolean } | null>(null);
  const suppressClick = useRef(false);
  const fullscreenRef = useRef(false);
  fullscreenRef.current = fullscreen;
  const poweredRef = useRef(true);
  poweredRef.current = powered;

  const play = (type: string) => setAnim((a) => ({ type, nonce: a.nonce + 1 }));

  const applyView = (v: { az: number; elev: number; zoom: number }) => {
    setView((prev) => ({ az: v.az, elev: v.elev, zoom: v.zoom, nonce: prev.nonce + 1 }));
    setCamOpen(false);
  };

  const stepFocus = useCallback((dir: number) => {
    setFocus((f) => Math.max(0, Math.min(DISKS.length - 1, f + dir)));
  }, []);

  // Coverflow slab transform for a cover at signed offset `o` from focus.
  const coverTransform = (o: number) => {
    if (o === 0) return "translateX(0) translateZ(66px) rotateY(0deg) scale(1.05)";
    const dir = o < 0 ? 1 : -1; // left covers face right, right covers face left
    return `translateX(${o * 124}px) translateZ(0px) rotateY(${dir * 52}deg)`;
  };

  const onCoverWheel = (e: React.WheelEvent) => {
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (wheelLock.current || Math.abs(d) < 6) return;
    wheelLock.current = true;
    stepFocus(d > 0 ? 1 : -1);
    window.setTimeout(() => (wheelLock.current = false), 240);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") stepFocus(1);
      else if (e.key === "ArrowLeft") stepFocus(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stepFocus]);

  const overlayRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const bootTimer = useRef<number | null>(null);
  const deniedTimer = useRef<number | null>(null);
  const flyerId = useRef(0);

  // Corner-pin the OS overlay onto the robot's projected screen each frame,
  // fading it out as the screen turns away.
  const onScreen = useCallback((q: ScreenQuad) => {
    const el = overlayRef.current;
    if (!el) return;
    // In full-screen the overlay is a fixed modal — leave its styles alone.
    if (fullscreenRef.current) return;
    // Powered off — screen is dark.
    if (!poweredRef.current) {
      el.style.opacity = "0";
      el.style.pointerEvents = "none";
      return;
    }
    const opacity = Math.max(0, Math.min(1, (q.facing - 0.12) / 0.4));
    el.style.opacity = `${opacity}`;
    el.style.pointerEvents = q.facing > 0.35 ? "auto" : "none";
    if (opacity <= 0) return;
    const [tl, tr, br, bl] = q.corners;
    const t = projection(
      [0, 0, BASE_W, 0, BASE_W, BASE_H, 0, BASE_H],
      [tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y]
    );
    for (let i = 0; i < 9; i++) t[i] = t[i] / t[8];
    const m = [t[0], t[3], 0, t[6], t[1], t[4], 0, t[7], 0, 0, 1, 0, t[2], t[5], 0, t[8]];
    el.style.transform = `matrix3d(${m.join(",")})`;
  }, []);

  const doInsert = useCallback(
    (d: Disk, fromX: number, fromY: number) => {
      if (phase === "booting") return;
      if (d.admin && !admin) {
        setDenied(d.id);
        if (deniedTimer.current) window.clearTimeout(deniedTimer.current);
        deniedTimer.current = window.setTimeout(() => setDenied(null), 1500);
        return;
      }
      if (d.id === disk?.id && phase === "running") return;

      // Fly a floppy from the grab point toward the robot's drive.
      const stage = stageRef.current?.getBoundingClientRect();
      if (stage) {
        const id = ++flyerId.current;
        setFlyer({
          id,
          from: { x: fromX, y: fromY },
          to: { x: stage.left + stage.width / 2, y: stage.top + stage.height * 0.7 },
        });
        setFlyerGo(false);
        requestAnimationFrame(() => requestAnimationFrame(() => setFlyerGo(true)));
        window.setTimeout(() => setFlyer((f) => (f && f.id === id ? null : f)), 640);
      }

      setDisk(d);
      setPhase("booting");
      setInsertNonce((n) => n + 1);
      if (bootTimer.current) window.clearTimeout(bootTimer.current);
      bootTimer.current = window.setTimeout(() => {
        setPhase("running");
        // Once loaded, the robot reacts with a random head animation.
        const reactions = ["nod", "shake", "tilt", "scan"];
        setAnim((a) => ({ type: reactions[Math.floor(Math.random() * reactions.length)], nonce: a.nonce + 1 }));
      }, BOOT_MS);
    },
    [admin, disk, phase]
  );

  // ---- Drag a disk onto the PC to load it (mouse + touch) ----
  const onDragMove = useCallback((e: PointerEvent) => {
    const dr = dragRef.current;
    if (!dr) return;
    if (!dr.dragging && Math.hypot(e.clientX - dr.sx, e.clientY - dr.sy) < 7) return;
    dr.dragging = true;
    const st = stageRef.current?.getBoundingClientRect();
    const over = !!st && e.clientX >= st.left && e.clientX <= st.right && e.clientY >= st.top && e.clientY <= st.bottom;
    setGhost({ x: e.clientX, y: e.clientY, over });
  }, []);

  const onDragUp = useCallback(
    (e: PointerEvent) => {
      window.removeEventListener("pointermove", onDragMove);
      window.removeEventListener("pointerup", onDragUp);
      const dr = dragRef.current;
      dragRef.current = null;
      setGhost(null);
      if (dr?.dragging) {
        suppressClick.current = true;
        window.setTimeout(() => (suppressClick.current = false), 60);
        const st = stageRef.current?.getBoundingClientRect();
        const over =
          !!st && e.clientX >= st.left && e.clientX <= st.right && e.clientY >= st.top && e.clientY <= st.bottom;
        if (over) doInsert(dr.disk, e.clientX, e.clientY);
      }
    },
    [onDragMove, doInsert]
  );

  const onCoverDown = useCallback(
    (d: Disk, e: React.PointerEvent) => {
      dragRef.current = { disk: d, sx: e.clientX, sy: e.clientY, dragging: false };
      window.addEventListener("pointermove", onDragMove);
      window.addEventListener("pointerup", onDragUp);
    },
    [onDragMove, onDragUp]
  );

  const onCoverClick = (d: Disk, o: number, i: number, e: React.MouseEvent) => {
    if (suppressClick.current) return;
    if (o === 0) {
      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
      doInsert(d, r.left + r.width / 2, r.top + r.height / 2);
    } else {
      setFocus(i);
    }
  };

  const eject = useCallback(() => {
    if (bootTimer.current) window.clearTimeout(bootTimer.current);
    setPhase("idle");
    setDisk(null);
    setFullscreen(false);
  }, []);

  // Mount-only cleanup — must NOT depend on the drag callbacks, or a phase
  // change would re-run this and clear the in-flight boot timer.
  useEffect(
    () => () => {
      if (bootTimer.current) window.clearTimeout(bootTimer.current);
      if (deniedTimer.current) window.clearTimeout(deniedTimer.current);
    },
    []
  );

  return (
    <div className={`showcase ${pixelFont.variable}`}>
      {/* Top bar */}
      <header className="sc-topbar">
        <Link href="/" className="sc-brand" aria-label="Physical I/O home">
          <LogoMark />
          <span>physical-io.com</span>
        </Link>
        <div className="sc-topbar-right">
          <button className={`sc-admin${admin ? " is-on" : ""}`} onClick={() => setAdmin((a) => !a)} aria-pressed={admin}>
            <span className="sc-check">{admin ? "☑" : "☐"}</span> admin
          </button>
          <Link href="/" className="sc-exit">
            Exit
          </Link>
        </div>
      </header>

      {/* Robot stage */}
      <main className="robot-stage" ref={stageRef}>
        <Robot3D booted={phase !== "idle"} insertNonce={insertNonce} anim={anim} view={view} onScreen={onScreen} />

        {/* Flat HUD — animations on the left */}
        <div className="hud-left" aria-label="Head animations">
          {ANIM_CONTROLS.map(([type, label, Ico]) => (
            <button key={type} className="rc-btn" data-tip={label} aria-label={label} onClick={() => play(type)}>
              <Ico className="rc-icon" />
            </button>
          ))}
        </div>

        {/* Flat HUD — camera / scale / power on the right */}
        {camOpen && <div className="cam-backdrop" onClick={() => setCamOpen(false)} aria-hidden="true" />}
        <div className="hud-right">
          <button
            className="rc-btn"
            data-tip="Full window"
            aria-label="Full window"
            onClick={() => setFullscreen((f) => !f)}
          >
            <IconFull className="rc-icon" />
          </button>
          <div className="cam-controls">
            <button
              className="rc-btn"
              data-tip="Camera"
              onClick={() => setCamOpen((o) => !o)}
              aria-expanded={camOpen}
              aria-label="Camera view"
            >
              <IconCamera className="rc-icon" />
            </button>
            {camOpen && (
              <div className="cam-menu" role="menu">
                <span className="cam-menu-title">CAMERA</span>
                {VIEWS.map((v) => (
                  <button key={v.label} className="cam-item" role="menuitem" onClick={() => applyView(v)}>
                    {v.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            className="rc-btn"
            data-tip={scaledUp ? "Zoom out" : "Zoom in"}
            aria-label={scaledUp ? "Zoom out" : "Zoom in"}
            onClick={() => {
              const up = !scaledUp;
              setScaledUp(up);
              applyView(up ? CLOSEUP_VIEW : DEFAULT_VIEW);
            }}
          >
            <IconScale className="rc-icon" />
          </button>
          <button
            className={`rc-btn power-flat${powered ? " is-on" : ""}`}
            data-tip={powered ? "Power off" : "Power on"}
            aria-pressed={powered}
            aria-label={powered ? "Power off" : "Power on"}
            onClick={() => setPowered((p) => !p)}
          >
            <IconPower className="rc-icon" />
          </button>
        </div>

        {fullscreen && (
          <div className="screen-modal-backdrop" onClick={() => setFullscreen(false)} aria-hidden="true" />
        )}

        <div
          className={`screen-overlay${fullscreen ? " is-fullscreen" : ""}`}
          ref={overlayRef}
          style={{ width: BASE_W, height: BASE_H, fontSize: BASE_W / 30, opacity: 0 }}
        >
          <ScreenOS
            phase={phase}
            disk={disk}
            admin={admin}
            onEject={eject}
            fullscreen={fullscreen}
            onToggleFullscreen={() => setFullscreen((f) => !f)}
          />
          {denied && (
            <div className="os-denied" role="alert">
              <SadMac className="os-happymac os-happymac-sm" />
              <p className="os-denied-title">Access denied</p>
              <p className="os-denied-sub">admin disk — switch admin on</p>
            </div>
          )}
        </div>

        {ghost?.over && (
          <div className="drop-hint" aria-hidden="true">
            ▼ drop to load
          </div>
        )}

        <p className="mac-caption">Drag a disk onto the PC to load · drag to rotate · scroll to zoom.</p>
      </main>

      {/* Coverflow disk browser */}
      <section className="coverflow-dock" aria-label="Disk library">
        <div className="coverflow" onWheel={onCoverWheel}>
          {DISKS.map((d, i) => {
            const o = i - focus;
            const locked = d.admin && !admin;
            const dark = i % 2 === 1;
            const active = d.id === disk?.id && phase !== "idle";
            const spine = `${d.file} · ${d.blurb}`;
            return (
              <button
                key={d.id}
                className={`cover${o === 0 ? " is-focus" : ""}${dark ? " is-dark" : ""}${
                  locked ? " is-locked" : ""
                }${active ? " is-active" : ""}${denied === d.id ? " is-denied" : ""}`}
                style={{ transform: coverTransform(o), zIndex: 100 - Math.abs(o) }}
                onPointerDown={(e) => onCoverDown(d, e)}
                onClick={(e) => onCoverClick(d, o, i, e)}
                aria-label={o === 0 ? `Insert ${d.file}` : `Select ${d.file}`}
              >
                <span className="cover-front">
                  <Floppy className="cover-ico" />
                  <span className="cover-title">{d.file}</span>
                  <span className="cover-kind">{locked ? "◆ ADMIN" : `.${d.kind}`}</span>
                  {locked && <LockIcon className="cover-lock" />}
                </span>
                <span className="cover-spine cover-spine--l" aria-hidden="true">
                  <span className="spine-text">{spine}</span>
                </span>
                <span className="cover-spine cover-spine--r" aria-hidden="true">
                  <span className="spine-text">{spine}</span>
                </span>
                <span className="cover-edge cover-edge--t" aria-hidden="true" />
                <span className="cover-edge cover-edge--b" aria-hidden="true" />
                <span className="cover-back" aria-hidden="true" />
              </button>
            );
          })}
        </div>
        <p className="coverflow-hint">
          {DISKS[focus]?.file}
          {phase === "running" && disk?.id === DISKS[focus]?.id ? " — running" : " — click to insert"}
          <span className="coverflow-keys"> · ← → to browse</span>
        </p>
      </section>

      {/* Disk being dragged toward the PC */}
      {ghost && (
        <span
          className={`drag-ghost${ghost.over ? " is-over" : ""}`}
          style={{ transform: `translate(calc(${ghost.x}px - 50%), calc(${ghost.y}px - 50%))` }}
          aria-hidden="true"
        >
          <Floppy className="floppy-ico" />
        </span>
      )}

      {/* Flying floppy during insert */}
      {flyer && (
        <span
          className="flying-floppy"
          style={{
            transform: flyerGo
              ? `translate(calc(${flyer.to.x}px - 50%), calc(${flyer.to.y}px - 50%)) scale(0.3)`
              : `translate(calc(${flyer.from.x}px - 50%), calc(${flyer.from.y}px - 50%)) scale(1)`,
            opacity: flyerGo ? 0 : 1,
          }}
          aria-hidden="true"
        >
          <Floppy className="floppy-ico" />
        </span>
      )}
    </div>
  );
}
