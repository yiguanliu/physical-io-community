"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { DISK_CATEGORIES, DISKS, type Disk, type DiskKind } from "./disks";
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
type ShelfView = "list" | "grid" | "carousel";
type ShelfCategory = DiskKind | "all";
type ShelfDock = "right" | "bottom" | "free";

const NEWS_DISK = DISKS.find((d) => d.id === "news") ?? DISKS[0];
const NEWS_INDEX = Math.max(0, DISKS.findIndex((d) => d.id === NEWS_DISK.id));

const SHELF_VIEWS: { id: ShelfView; label: string; icon: string }[] = [
  { id: "list", label: "List", icon: "☷" },
  { id: "grid", label: "Grid", icon: "▦" },
  { id: "carousel", label: "Carousel", icon: "◧" },
];

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

interface Point {
  x: number;
  y: number;
}

export default function RobotShowcase() {
  const [phase, setPhase] = useState<Phase>("running");
  const [disk, setDisk] = useState<Disk | null>(NEWS_DISK);
  const [admin, setAdmin] = useState(false);
  const [insertNonce, setInsertNonce] = useState(0);
  const [denied, setDenied] = useState<string | null>(null);
  const [flyer, setFlyer] = useState<Flyer | null>(null);
  const [flyerGo, setFlyerGo] = useState(false);
  const [anim, setAnim] = useState({ type: "", nonce: 0 });
  const [focus, setFocus] = useState(NEWS_INDEX);
  const [ghost, setGhost] = useState<{ x: number; y: number; over: boolean } | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [view, setView] = useState({ az: -0.34, elev: 0.14, zoom: 1.35, nonce: 0 });
  const [powered, setPowered] = useState(true);
  const [scaledUp, setScaledUp] = useState(false);
  const [camOpen, setCamOpen] = useState(false);
  const [shelfView, setShelfView] = useState<ShelfView>("carousel");
  const [shelfQuery, setShelfQuery] = useState("");
  const [shelfCategory, setShelfCategory] = useState<ShelfCategory>("all");
  const [shelfOpen, setShelfOpen] = useState(true);
  const [shelfMinimized, setShelfMinimized] = useState(false);
  const [shelfDock, setShelfDock] = useState<ShelfDock>("bottom");
  const [shelfPos, setShelfPos] = useState<Point | null>(null);
  const wheelLock = useRef(false);
  const dragRef = useRef<{ disk: Disk; sx: number; sy: number; dragging: boolean } | null>(null);
  const shelfMoveRef = useRef<{ dx: number; dy: number } | null>(null);
  const suppressClick = useRef(false);
  const fullscreenRef = useRef(false);
  fullscreenRef.current = fullscreen;
  const poweredRef = useRef(true);
  poweredRef.current = powered;
  const shelfSearch = shelfQuery.trim().toLowerCase();
  const searchedDisks = useMemo(
    () =>
      DISKS.filter((d) => {
        if (!shelfSearch) return true;
        const haystack = [
          d.file,
          d.kind,
          d.blurb,
          ...d.sections.flatMap((section) => [
            section.label,
            ...section.entries.flatMap((entry) => [entry.title, entry.body, entry.tag ?? ""]),
          ]),
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(shelfSearch);
      }),
    [shelfSearch]
  );
  const visibleDisks = useMemo(
    () => searchedDisks.filter((d) => shelfCategory === "all" || d.kind === shelfCategory),
    [searchedDisks, shelfCategory]
  );
  const shelfGroups = useMemo(
    () =>
      DISK_CATEGORIES.map((category) => ({
        ...category,
        disks: visibleDisks.filter((d) => d.kind === category.id),
      })).filter((category) => category.disks.length > 0 || shelfCategory === category.id),
    [searchedDisks, shelfCategory, visibleDisks]
  );
  const focusedVisibleIndex = Math.max(
    0,
    visibleDisks.findIndex((d) => d.id === DISKS[focus]?.id)
  );

  const play = (type: string) => setAnim((a) => ({ type, nonce: a.nonce + 1 }));

  const applyView = (v: { az: number; elev: number; zoom: number }) => {
    setView((prev) => ({ az: v.az, elev: v.elev, zoom: v.zoom, nonce: prev.nonce + 1 }));
    setCamOpen(false);
  };

  const stepFocus = useCallback(
    (dir: number) => {
      setFocus((current) => {
        if (!visibleDisks.length) return current;
        const currentId = DISKS[current]?.id;
        const currentVisible = Math.max(
          0,
          visibleDisks.findIndex((d) => d.id === currentId)
        );
        const nextVisible = Math.max(0, Math.min(visibleDisks.length - 1, currentVisible + dir));
        const nextDisk = visibleDisks[nextVisible];
        return nextDisk ? DISKS.findIndex((d) => d.id === nextDisk.id) : current;
      });
    },
    [visibleDisks]
  );

  // Coverflow slab transform for a cover at signed offset `o` from focus.
  const coverTransform = (o: number) => {
    if (o === 0) return "translateX(0) translateZ(66px) rotateY(0deg) scale(1.05)";
    const dir = o < 0 ? 1 : -1; // left covers face right, right covers face left
    return `translateX(${o * 170}px) translateZ(0px) rotateY(${dir * 46}deg)`;
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

  useEffect(() => {
    if (!visibleDisks.length) return;
    const focusedId = DISKS[focus]?.id;
    if (!visibleDisks.some((d) => d.id === focusedId)) {
      const nextFocus = DISKS.findIndex((d) => d.id === visibleDisks[0].id);
      if (nextFocus >= 0) setFocus(nextFocus);
    }
  }, [focus, visibleDisks]);

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

  const onShelfDiskClick = (d: Disk, shouldInsert: boolean, e: React.MouseEvent) => {
    if (suppressClick.current) return;
    if (shouldInsert) {
      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
      doInsert(d, r.left + r.width / 2, r.top + r.height / 2);
    } else {
      const nextFocus = DISKS.findIndex((candidate) => candidate.id === d.id);
      if (nextFocus >= 0) setFocus(nextFocus);
    }
  };

  const onShelfWindowMove = useCallback((e: PointerEvent) => {
    const move = shelfMoveRef.current;
    if (!move) return;
    const width = Math.min(520, Math.max(320, window.innerWidth - 24));
    const height = Math.min(560, Math.max(320, window.innerHeight - 96));
    setShelfPos({
      x: Math.max(12, Math.min(window.innerWidth - width - 12, e.clientX - move.dx)),
      y: Math.max(74, Math.min(window.innerHeight - height - 12, e.clientY - move.dy)),
    });
  }, []);

  const onShelfWindowUp = useCallback(() => {
    shelfMoveRef.current = null;
    window.removeEventListener("pointermove", onShelfWindowMove);
    window.removeEventListener("pointerup", onShelfWindowUp);
  }, [onShelfWindowMove]);

  const onShelfTitleDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (e.button !== 0) return;
      const rect = (e.currentTarget.closest(".software-shelf") as HTMLElement | null)?.getBoundingClientRect();
      if (!rect) return;
      setShelfDock("free");
      setShelfPos({ x: rect.left, y: rect.top });
      shelfMoveRef.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
      window.addEventListener("pointermove", onShelfWindowMove);
      window.addEventListener("pointerup", onShelfWindowUp);
      e.preventDefault();
    },
    [onShelfWindowMove, onShelfWindowUp]
  );

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
      window.removeEventListener("pointermove", onShelfWindowMove);
      window.removeEventListener("pointerup", onShelfWindowUp);
    },
    [onShelfWindowMove, onShelfWindowUp]
  );

  const renderShelfDisk = (d: Disk, shouldInsert: boolean, variant: "card" | "row" | "cover", index?: number) => {
    const locked = d.admin && !admin;
    const active = d.id === disk?.id && phase !== "idle";
    const diskIndex = DISKS.findIndex((candidate) => candidate.id === d.id);
    const focused = DISKS[focus]?.id === d.id;

    if (variant === "cover") {
      const visibleIndex = index ?? 0;
      const o = visibleIndex - focusedVisibleIndex;
      const dark = visibleIndex % 2 === 1;
      const spine = `${d.file} · ${d.blurb}`;
      return (
        <button
          key={d.id}
          className={`cover${o === 0 ? " is-focus" : ""}${dark ? " is-dark" : ""}${
            locked ? " is-locked" : ""
          }${active ? " is-active" : ""}${denied === d.id ? " is-denied" : ""}`}
          style={{ transform: coverTransform(o), zIndex: 100 - Math.abs(o) }}
          onPointerDown={(e) => onCoverDown(d, e)}
          onClick={(e) => onShelfDiskClick(d, o === 0, e)}
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
    }

    return (
      <button
        key={d.id}
        className={`shelf-app shelf-app-${variant}${focused ? " is-focus" : ""}${locked ? " is-locked" : ""}${
          active ? " is-active" : ""
        }${denied === d.id ? " is-denied" : ""}`}
        onPointerDown={(e) => onCoverDown(d, e)}
        onFocus={() => {
          if (diskIndex >= 0) setFocus(diskIndex);
        }}
        onClick={(e) => onShelfDiskClick(d, shouldInsert, e)}
        aria-label={`Insert ${d.file}`}
      >
        <span className="shelf-app-icon" aria-hidden="true">
          <Floppy className="shelf-floppy-ico" />
          {locked && <LockIcon className="shelf-lock-ico" />}
        </span>
        <span className="shelf-app-copy">
          <span className="shelf-app-file">{d.file}</span>
          <span className="shelf-app-blurb">{d.blurb}</span>
        </span>
        <span className="shelf-app-kind">{locked ? "ADMIN" : d.kind}</span>
      </button>
    );
  };

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
            className={`rc-btn shelf-toggle${shelfOpen ? " is-on" : ""}`}
            data-tip={shelfOpen ? "Close disks" : "Disks"}
            aria-label={shelfOpen ? "Close disks panel" : "Open disks panel"}
            aria-expanded={shelfOpen}
            onClick={() => {
              setCamOpen(false);
              setShelfMinimized(false);
              setShelfOpen((open) => !open);
            }}
          >
            <Floppy className="rc-icon" />
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

      {/* Software shelf */}
      {shelfOpen && (
        <section
          className={`software-shelf is-${shelfView} is-open is-${shelfDock}`}
          aria-label="Software shelf"
          style={shelfDock === "free" && shelfPos ? { left: shelfPos.x, top: shelfPos.y } : undefined}
        >
          <div className="shelf-shell">
            <header className="shelf-windowbar">
              <button
                className="shelf-window-btn shelf-window-close"
                type="button"
                data-tip="Close"
                aria-label="Close software shelf"
                onClick={() => {
                  setShelfMinimized(false);
                  setShelfOpen(false);
                }}
              >
                <span aria-hidden="true">×</span>
              </button>
              <button
                className="shelf-window-btn shelf-window-minimize"
                type="button"
                data-tip="Minimize"
                aria-label="Minimize software shelf to desktop"
                onClick={() => {
                  setShelfMinimized(true);
                  setShelfOpen(false);
                }}
              >
                <span aria-hidden="true">−</span>
              </button>
              <button className="shelf-window-title" type="button" onPointerDown={onShelfTitleDown}>
                Software Shelf
              </button>
              <button
                className="shelf-window-btn"
                type="button"
                data-tip="Lock right"
                aria-label="Dock software shelf to right"
                aria-pressed={shelfDock === "right"}
                onClick={() => setShelfDock("right")}
              >
                <LockIcon className="shelf-window-ico" />
              </button>
              <button
                className="shelf-window-btn"
                type="button"
                data-tip="Dock bottom"
                aria-label="Dock software shelf to bottom"
                aria-pressed={shelfDock === "bottom"}
                onClick={() => setShelfDock("bottom")}
              >
                <span aria-hidden="true">▁</span>
              </button>
            </header>

            <div className="shelf-toolbar">
              <label className="shelf-search">
                <span aria-hidden="true">⌕</span>
                <input
                  value={shelfQuery}
                  onChange={(e) => setShelfQuery(e.target.value)}
                  placeholder="Search disks"
                  aria-label="Search disks"
                />
              </label>
              <div className="shelf-view-toggle" aria-label="Shelf layout">
                {SHELF_VIEWS.map((mode) => (
                  <button
                    key={mode.id}
                    className={shelfView === mode.id ? "is-active" : ""}
                    type="button"
                    aria-label={`${mode.label} view`}
                    aria-pressed={shelfView === mode.id}
                    onClick={() => setShelfView(mode.id)}
                  >
                    <span aria-hidden="true">{mode.icon}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="shelf-categories" aria-label="Software categories">
              <button
                className={shelfCategory === "all" ? "is-active" : ""}
                type="button"
                onClick={() => setShelfCategory("all")}
              >
                <span>ALL</span>
                <b>{searchedDisks.length}</b>
              </button>
              {DISK_CATEGORIES.map((category) => (
                <button
                  key={category.id}
                  className={shelfCategory === category.id ? "is-active" : ""}
                  type="button"
                  onClick={() => setShelfCategory(category.id)}
                  title={category.description}
                >
                  <span>{category.label}</span>
                  <b>{searchedDisks.filter((d) => d.kind === category.id).length}</b>
                </button>
              ))}
            </div>

            {visibleDisks.length ? (
              <>
                {shelfView === "carousel" ? (
                  <div className="coverflow" onWheel={onCoverWheel}>
                    {visibleDisks.map((d, i) => renderShelfDisk(d, i === focusedVisibleIndex, "cover", i))}
                  </div>
                ) : (
                  <div className="shelf-groups">
                    {shelfGroups.map((category) => (
                      <section className="shelf-group" key={category.id}>
                        <header className="shelf-group-head">
                          <span>{category.label}</span>
                          <small>{category.description}</small>
                        </header>
                        <div className="shelf-items">
                          {category.disks.map((d) => renderShelfDisk(d, true, shelfView === "list" ? "row" : "card"))}
                        </div>
                      </section>
                    ))}
                  </div>
                )}
                <p className="coverflow-hint">
                  {visibleDisks[focusedVisibleIndex]?.file ?? "No disk"}
                  {phase === "running" && disk?.id === visibleDisks[focusedVisibleIndex]?.id
                    ? " - running"
                    : " - click to insert"}
                  <span className="coverflow-keys"> · ← → to browse</span>
                </p>
              </>
            ) : (
              <div className="shelf-empty">No disks found</div>
            )}
          </div>
        </section>
      )}

      {shelfMinimized && (
        <button
          className="desktop-shelf-icon"
          type="button"
          aria-label="Restore software shelf"
          onClick={() => {
            setShelfOpen(true);
            setShelfMinimized(false);
          }}
        >
          <Floppy className="desktop-shelf-ico" />
          <span>Disks</span>
        </button>
      )}

      {/* Disk being dragged toward the PC */}
      {ghost && (
        <span
          className={`drag-ghost${ghost.over ? " is-over" : ""}`}
          style={{ left: ghost.x, top: ghost.y, transform: "translate(-50%, -50%)" }}
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
