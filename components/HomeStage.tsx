"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import gsap from "gsap";
import LogoMark from "./LogoMark";
import HeaderActions from "./HeaderActions";
import { useSiteStore } from "@/lib/store";

// WebGL light-rays overlay — client only (uses WebGL/window).
const LightRays = dynamic(() => import("./LightRays"), { ssr: false });

const AUTO_MS = 10000;
const INTERACTION_RESUME_MS = 20000;
const WHEEL_THRESHOLD = 80;
const WHEEL_SETTLE_MS = 260;
const COUNT = 5;

/** One carousel slide. When it becomes active, its [data-anim] children
 *  blur-in in sequence (title → … → buttons). Reduced-motion: instant. */
function Slide({
  active,
  className,
  children,
}: {
  active: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const items = el.querySelectorAll<HTMLElement>("[data-anim]");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!active) {
      gsap.set(items, { autoAlpha: 0, y: 14, filter: "blur(12px)" });
      return;
    }
    if (reduced) {
      gsap.set(items, { autoAlpha: 1, y: 0, filter: "blur(0px)" });
      return;
    }
    const tl = gsap.timeline();
    tl.fromTo(
      items,
      { autoAlpha: 0, y: 14, filter: "blur(12px)" },
      { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 0.7, ease: "power2.out", stagger: 0.14 }
    );
    return () => {
      tl.kill();
    };
  }, [active]);

  return (
    <div
      ref={ref}
      className={`slide${active ? " is-active" : ""}${className ? " " + className : ""}`}
      aria-hidden={!active}
      inert={!active}
    >
      {children}
    </div>
  );
}

export default function HomeStage() {
  const slide = useSiteStore((s) => s.slide);
  const setSlide = useSiteStore((s) => s.setSlide);
  const [resumeAutoAt, setResumeAutoAt] = useState(0);
  const [introGone, setIntroGone] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const didSwipe = useRef(false);
  const wheelDelta = useRef(0);
  const wheelLocked = useRef(false);
  const wheelTimer = useRef<number | null>(null);

  const markInteraction = useCallback(() => {
    setResumeAutoAt(Date.now() + INTERACTION_RESUME_MS);
  }, []);

  const go = useCallback((dir: number, userInitiated = true) => {
    if (userInitiated) markInteraction();
    const currentSlide = useSiteStore.getState().slide;
    setSlide((currentSlide + dir + COUNT) % COUNT);
  }, [markInteraction, setSlide]);

  const settleWheel = useCallback(() => {
    if (wheelTimer.current) window.clearTimeout(wheelTimer.current);
    wheelTimer.current = window.setTimeout(() => {
      wheelDelta.current = 0;
      wheelLocked.current = false;
      wheelTimer.current = null;
    }, WHEEL_SETTLE_MS);
  }, []);

  // Auto-advance every 10s. User interaction adds a 20s grace period before
  // the next automatic move, and reduced-motion disables automatic movement.
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const interactionDelay = Math.max(0, resumeAutoAt - Date.now());
    const id = window.setTimeout(() => setSlide((slide + 1) % COUNT), AUTO_MS + interactionDelay);
    return () => window.clearTimeout(id);
  }, [slide, resumeAutoAt, setSlide]);

  // Left / right arrow keys
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        markInteraction();
        setSlide((useSiteStore.getState().slide + 1) % COUNT);
      }
      if (e.key === "ArrowLeft") {
        markInteraction();
        setSlide((useSiteStore.getState().slide - 1 + COUNT) % COUNT);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [markInteraction, setSlide]);

  useEffect(() => {
    const el = pageRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();

      const dominantDelta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (Math.abs(dominantDelta) < 1) return;

      if (wheelLocked.current) {
        settleWheel();
        return;
      }

      wheelDelta.current += dominantDelta;

      if (Math.abs(wheelDelta.current) >= WHEEL_THRESHOLD) {
        wheelLocked.current = true;
        go(wheelDelta.current > 0 ? 1 : -1);
      }

      settleWheel();
    };

    el.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      el.removeEventListener("wheel", onWheel);
      if (wheelTimer.current) window.clearTimeout(wheelTimer.current);
    };
  }, [go, settleWheel]);

  return (
    <div
      ref={pageRef}
      className="page-home"
      onPointerDown={(e) => {
        startX.current = e.clientX;
        startY.current = e.clientY;
        didSwipe.current = false;
      }}
      onPointerUp={(e) => {
        if (startX.current == null || startY.current == null) return;
        const dx = e.clientX - startX.current;
        const dy = e.clientY - startY.current;
        const isHorizontalSwipe = Math.abs(dx) >= Math.abs(dy) && Math.abs(dx) > 50;
        const isVerticalSwipe = Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 50;

        if (isHorizontalSwipe) {
          didSwipe.current = true;
          go(dx < 0 ? 1 : -1);
        } else if (isVerticalSwipe) {
          didSwipe.current = true;
          go(dy < 0 ? 1 : -1);
        }
        startX.current = null;
        startY.current = null;
      }}
      onPointerCancel={() => {
        startX.current = null;
        startY.current = null;
      }}
    >
      <div className="home-topbar">
        <Link className="home-brand" href="/" aria-label="Physical I/O home">
          <LogoMark />
        </Link>
        <HeaderActions />
      </div>

      <main
        className="stage"
        onClick={(e) => {
          if (didSwipe.current) {
            didSwipe.current = false;
            return;
          }

          const target = e.target as HTMLElement;
          if (target.closest("a, button")) return;

          const rect = e.currentTarget.getBoundingClientRect();
          go(e.clientX < rect.left + rect.width / 2 ? -1 : 1);
        }}
      >
        <div className="carousel">
          <Slide active={slide === 0} className="slide-brand">
            <div className="brand-lockup" data-anim>
              <span className="brand-mark">
                <LogoMark />
              </span>
              <h1 className="brand-word">Physical&nbsp;I/O</h1>
            </div>
          </Slide>

          <Slide active={slide === 1} className="slide-main slide-community-title">
            <span className="eyebrow" data-anim>
              The Community
            </span>
            <h1 className="s-title" data-anim>
              London&apos;s community for Physical&nbsp;AI, Robotics &amp; Spatial&nbsp;Intelligence
            </h1>
          </Slide>

          <Slide active={slide === 2} className="slide-main slide-community-principles">
            <span className="eyebrow" data-anim>
              Our Position
            </span>
            <h2 className="s-title" data-anim>
              Independent. Multidisciplinary.
            </h2>
            <p className="s-sub" data-anim>
              Built in London.
            </p>
          </Slide>

          <Slide active={slide === 3} className="slide-main slide-community-connect">
            <span className="eyebrow" data-anim>
              Community Network
            </span>
            <h2 className="s-title" data-anim>
              Connect with people building physical intelligence.
            </h2>
          </Slide>

          <Slide active={slide === 4} className="slide-main slide-community-builders">
            <span className="eyebrow" data-anim>
              The Builders
            </span>
            <h2 className="s-title" data-anim>
              Founders, engineers, designers, researchers, investors and builders.
            </h2>
            <p className="s-desc" data-anim>
              Exploring Physical AI, Robotics, Spatial Intelligence, Wearables and Intelligent Hardware.
            </p>
          </Slide>

        </div>

        <button className="screen-arrow left" onClick={() => go(-1)} aria-label="Previous slide">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <button className="screen-arrow right" onClick={() => go(1)} aria-label="Next slide">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </main>

      <div className="dots" role="tablist" aria-label="Slides">
        {Array.from({ length: COUNT }, (_, i) => (
          <button
            key={i}
            className={`dot${i === slide ? " is-active" : ""}`}
            role="tab"
            aria-selected={i === slide}
            aria-label={`Slide ${i + 1}`}
            onClick={() => {
              markInteraction();
              setSlide(i);
            }}
          />
        ))}
      </div>

      <p className="stage-foot">© 2026 Physical I/O — London, United Kingdom</p>

      <div className="home-fab-stack">
        <Link className="home-fab" href="/askusanything" aria-label="Ask us anything">
          <span className="fab-glyph" aria-hidden="true">?</span>
        </Link>
      </div>

      <div className="home-rays" aria-hidden="true">
        <LightRays
          raysOrigin="top-center"
          raysColor="#ffffff"
          raysSpeed={1.1}
          lightSpread={1.7}
          rayLength={2.6}
          fadeDistance={1.4}
          followMouse
          mouseInfluence={0.12}
          noiseAmount={0.12}
          distortion={0.05}
        />
      </div>

      {!introGone && (
        <div
          className="home-intro"
          aria-hidden="true"
          onAnimationEnd={(e) => {
            if (e.animationName === "homeIntroBackdrop") setIntroGone(true);
          }}
        >
          <span className="home-intro-logo">
            <LogoMark />
          </span>
        </div>
      )}
    </div>
  );
}
