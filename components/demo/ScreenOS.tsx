"use client";

import { useEffect, useState } from "react";
import type { Disk } from "./disks";
import { DocIcon, FolderIcon, HappyMac } from "./PixelIcons";

export type Phase = "idle" | "booting" | "running";

interface ScreenOSProps {
  phase: Phase;
  disk: Disk | null;
  admin: boolean;
  onEject: () => void;
  fullscreen: boolean;
  onToggleFullscreen: () => void;
}

/** The pixel Finder rendered inside the Macintosh screen: Happy Mac standby,
 *  a boot readout, then a window of the disk's contents. Black & white only. */
export default function ScreenOS({ phase, disk, admin, onEject, fullscreen, onToggleFullscreen }: ScreenOSProps) {
  const [section, setSection] = useState(0);
  const [bootStep, setBootStep] = useState(0);

  useEffect(() => {
    if (phase !== "booting") return;
    setSection(0);
    setBootStep(0);
    const id = window.setInterval(() => setBootStep((s) => s + 1), 320);
    return () => window.clearInterval(id);
  }, [phase, disk]);

  if (phase === "idle") {
    return (
      <div className="os os-idle">
        <HappyMac className="os-happymac" />
        <p className="os-idle-title">physical&middot;io</p>
        <p className="os-idle-hint">
          Insert a disk <span className="os-blink">▸</span>
        </p>
      </div>
    );
  }

  if (phase === "booting" && disk) {
    return (
      <div className="os os-boot">
        <HappyMac className="os-happymac os-happymac-sm" />
        <p className="os-boot-title">Welcome to physical&middot;io</p>
        <p className="os-boot-line">mounting {disk.file}…</p>
        <div className="os-progress" aria-hidden="true">
          <span style={{ width: `${Math.min(100, bootStep * 26)}%` }} />
        </div>
      </div>
    );
  }

  if (phase === "running" && disk) {
    const sec = disk.sections[section];
    return (
      <div className="os os-run">
        {/* Menu bar */}
        <div className="menubar">
          <span className="menu-logo" aria-hidden="true">◆</span>
          <button className="menu-item">File</button>
          <button className="menu-item">Edit</button>
          <button className="menu-item">View</button>
          <button className="menu-item menu-disk">{disk.kind}</button>
          <button className="menu-item">Help</button>
          <button className="menu-eject" onClick={onEject}>
            Eject ⏏
          </button>
        </div>

        {/* Finder window */}
        <div className="win">
          <div className="win-title">
            <button className="win-close" onClick={onEject} aria-label={`Eject ${disk.file}`} />
            <span className="win-name">{disk.file}</span>
            <button
              className="win-full"
              onClick={onToggleFullscreen}
              aria-label={fullscreen ? "Exit full screen" : "Full screen"}
            >
              {fullscreen ? "⤡" : "⤢"}
            </button>
          </div>

          <div className="win-tabs">
            {disk.sections.map((s, i) => (
              <button
                key={s.label}
                className={`win-tab${i === section ? " is-active" : ""}`}
                onClick={() => setSection(i)}
              >
                <FolderIcon className="win-tab-ico" />
                {s.label}
              </button>
            ))}
          </div>

          <div className="win-body">
            {sec.entries.map((e) => {
              const inner = (
                <>
                  <DocIcon className="file-ico" />
                  <span className="file-name">
                    {e.title}
                    {e.href && <span className="file-link" aria-hidden="true"> ↗</span>}
                  </span>
                  {e.tag && <span className="file-tag">{e.tag}</span>}
                </>
              );
              return e.href ? (
                <a
                  className="file file-has-link"
                  key={e.title}
                  href={e.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={e.body}
                >
                  {inner}
                </a>
              ) : (
                <button className="file" key={e.title} title={e.body}>
                  {inner}
                </button>
              );
            })}
          </div>

          <div className="win-status">
            {sec.entries.length} items &middot; {disk.blurb}
            {disk.admin && admin && <span className="win-admin"> &middot; admin</span>}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
