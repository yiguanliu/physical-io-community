"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import LogoMark from "./LogoMark";
import styles from "./MemberNetwork.module.css";

type Member = {
  id: number;
  name: string;
  role: string;
  location: string;
  discipline: string;
};

type Point = { id: number; x: number; y: number; member?: Member };

const members: Member[] = [
  { id: 0, name: "Amelia Brooks", role: "Robotics engineer", location: "London", discipline: "Robotics" },
  { id: 1, name: "Kofi Mensah", role: "Creative technologist", location: "London", discipline: "Creative technology" },
  { id: 2, name: "Leila Farah", role: "Interaction designer", location: "London", discipline: "Design" },
  { id: 3, name: "Rowan Bell", role: "Founder, Form Labs", location: "London", discipline: "Hardware" },
  { id: 4, name: "Sofia Santos", role: "ML researcher", location: "Cambridge", discipline: "AI research" },
  { id: 5, name: "Nikhil Patel", role: "Product designer", location: "London", discipline: "Design" },
  { id: 6, name: "Mara Okafor", role: "Wearables engineer", location: "London", discipline: "Wearables" },
  { id: 7, name: "Evan Cooper", role: "Spatial computing lead", location: "London", discipline: "Spatial computing" },
  { id: 8, name: "Yuki Tanaka", role: "Design engineer", location: "London", discipline: "Hardware" },
  { id: 9, name: "Theo Williams", role: "Venture partner", location: "London", discipline: "Investment" },
  { id: 10, name: "Aisha Khan", role: "Research scientist", location: "Oxford", discipline: "AI research" },
  { id: 11, name: "Jonas Meyer", role: "Founder, Vanta", location: "Berlin", discipline: "Robotics" },
];

function seeded(index: number, salt: number) {
  const value = Math.sin((index + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function makePoints(): Point[] {
  return Array.from({ length: 164 }, (_, id) => ({
    id,
    // A slightly denser, organic centre rather than an evenly distributed grid.
    x: 0.08 + seeded(id, 1) * 0.84,
    y: 0.08 + seeded(id, 2) * 0.84,
    member: members.find((member) => member.id === id),
  }));
}

const points = makePoints();

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function makeEdges() {
  return points.flatMap((point) => {
    const neighbours = points
      .filter((candidate) => candidate.id > point.id)
      .map((candidate) => ({ candidate, distance: distance(point, candidate) }))
      .filter(({ distance: d }) => d < 0.13)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 2);
    return neighbours.map(({ candidate }) => [point.id, candidate.id] as const);
  });
}

const edges = makeEdges();

export default function MemberNetwork() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const activeIdRef = useRef<number | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All members");
  activeIdRef.current = activeId;
  const activeMember = members.find((member) => member.id === activeId) ?? null;
  const filteredMembers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return members.filter((member) => {
      const matchesTerm = !term || `${member.name} ${member.role} ${member.location}`.toLowerCase().includes(term);
      const matchesFilter = filter === "All members" || member.discipline === filter;
      return matchesTerm && matchesFilter;
    });
  }, [filter, search]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let renderedFocus: number | null = null;
    let focusProgress = 0;

    const resize = () => {
      const bounds = parent.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };

    const observer = new ResizeObserver(resize);
    observer.observe(parent);
    resize();
    const ctx = canvas.getContext("2d");
    if (!ctx) return () => observer.disconnect();

    const draw = (now: number) => {
      if (!width || !height) {
        frameRef.current = requestAnimationFrame(draw);
        return;
      }
      const nextFocus = activeIdRef.current;
      if (nextFocus !== null && nextFocus !== renderedFocus) {
        renderedFocus = nextFocus;
        focusProgress = 0;
      }
      const targetProgress = nextFocus === null ? 0 : 1;
      focusProgress += (targetProgress - focusProgress) * 0.08;
      if (targetProgress === 0 && focusProgress < 0.003) {
        focusProgress = 0;
        renderedFocus = null;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const focusPoint = renderedFocus === null ? null : points[renderedFocus];
      const scale = 1 + focusProgress * 1.15;
      const centerX = focusPoint ? focusPoint.x * width : width / 2;
      const centerY = focusPoint ? focusPoint.y * height : height / 2;
      const map = (point: Point) => ({
        x: (point.x * width - centerX) * scale + width / 2,
        y: (point.y * height - centerY) * scale + height / 2,
      });

      ctx.lineWidth = 1;
      for (const [from, to] of edges) {
        const a = points[from];
        const b = points[to];
        const isFocusEdge = renderedFocus !== null && (from === renderedFocus || to === renderedFocus);
        const opacity = isFocusEdge ? 0.31 : 0.065 + focusProgress * 0.025;
        const start = map(a);
        const end = map(b);
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.strokeStyle = `rgba(13, 17, 20, ${opacity})`;
        ctx.stroke();
      }

      for (const point of points) {
        const { x, y } = map(point);
        const isActive = point.id === renderedFocus;
        const isDirect = renderedFocus !== null && edges.some(([a, b]) => (a === renderedFocus && b === point.id) || (b === renderedFocus && a === point.id));
        const pulse = isActive ? 1 + Math.sin(now / 260) * 0.13 : 1;
        const radius = isActive ? 6.5 * pulse : point.member ? 3.2 : isDirect ? 2.6 : 1.8;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = isActive ? "#ee4b1a" : point.member ? "#15191c" : "rgba(21, 25, 28, 0.42)";
        ctx.fill();
        if (isActive) {
          ctx.beginPath();
          ctx.arc(x, y, 15 + Math.sin(now / 360) * 1.5, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(238, 75, 26, 0.25)";
          ctx.stroke();
        }
      }
      frameRef.current = requestAnimationFrame(draw);
    };
    frameRef.current = requestAnimationFrame(draw);
    return () => {
      observer.disconnect();
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <Link className={styles.brand} href="/" aria-label="Physical I/O home"><LogoMark /><span>Physical I/O</span></Link>
        <div className={styles.networkTitle}><span className={styles.liveDot} />Member network <small>Prototype</small></div>
        <button className={styles.profile} type="button" aria-label="Open your profile">YL</button>
      </header>

      <section className={styles.shell}>
        <aside className={styles.directory}>
          <div className={styles.directoryHeading}>
            <p>Community directory</p>
            <h1>Members</h1>
            <span>164 people in the network</span>
          </div>
          <label className={styles.search}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.6" /><path d="m16 16 4 4" /></svg>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search members" />
          </label>
          <div className={styles.filters} aria-label="Filter members">
            {["All members", "Robotics", "Design", "Hardware", "AI research"].map((option) => (
              <button key={option} className={filter === option ? styles.filterActive : ""} onClick={() => setFilter(option)} type="button">{option}</button>
            ))}
          </div>
          <div className={styles.tableHead}><span>Member</span><span>Location</span></div>
          <div className={styles.memberList}>
            {filteredMembers.map((member) => (
              <button
                className={`${styles.memberRow} ${activeId === member.id ? styles.memberActive : ""}`}
                key={member.id}
                type="button"
                onMouseEnter={() => setActiveId(member.id)}
                onFocus={() => setActiveId(member.id)}
                onClick={() => setActiveId(member.id === activeId ? null : member.id)}
              >
                <span className={styles.memberName}>{member.name}<small>{member.role}</small></span>
                <span>{member.location}</span>
              </button>
            ))}
          </div>
          <footer className={styles.directoryFooter}><span>Showing {filteredMembers.length} of 164</span><button type="button">View all</button></footer>
        </aside>

        <div className={styles.graphArea}>
          <canvas ref={canvasRef} aria-label="An abstract map of members and their connections" />
          <div className={styles.graphHeader}>
            <div><span>NETWORK VIEW</span><strong>Shared interests &amp; introductions</strong></div>
            <button type="button" onClick={() => setActiveId(null)}>Reset view</button>
          </div>
          <div className={styles.legend}><span><i className={styles.memberPoint} />Member</span><span><i className={styles.connectionPoint} />Connection</span><span><i className={styles.youPoint} />You</span></div>
          {activeMember ? (
            <section className={styles.focusCard} aria-live="polite">
              <div className={styles.focusAvatar}>{activeMember.name.split(" ").map((name) => name[0]).join("")}</div>
              <div><span>IN YOUR NETWORK</span><h2>{activeMember.name}</h2><p>{activeMember.role} · {activeMember.location}</p></div>
              <button type="button">View profile <span>↗</span></button>
            </section>
          ) : (
            <div className={styles.tip}>Hover a member to explore their position in the network.</div>
          )}
        </div>
      </section>
    </main>
  );
}
