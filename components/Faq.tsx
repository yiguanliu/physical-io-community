"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { FAQ } from "@/lib/site";
import { useSiteStore } from "@/lib/store";

/** Single-open FAQ accordion — open state in Zustand, height animation via GSAP. */
export default function Faq() {
  const openFaq = useSiteStore((s) => s.openFaq);
  const toggleFaq = useSiteStore((s) => s.toggleFaq);
  const answerRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    answerRefs.current.forEach((el, i) => {
      if (!el) return;
      gsap.to(el, {
        height: openFaq === i ? "auto" : 0,
        duration: reduced ? 0 : 0.35,
        ease: "power2.inOut",
      });
    });
  }, [openFaq]);

  return (
    <div className="faq">
      {FAQ.map((item, i) => (
        <div className="faq-item" key={item.q}>
          <button
            type="button"
            className="faq-q"
            aria-expanded={openFaq === i}
            onClick={() => toggleFaq(i)}
          >
            {item.q}
            <span className="faq-icon" aria-hidden="true">
              +
            </span>
          </button>
          <div
            className="faq-a"
            ref={(el) => {
              answerRefs.current[i] = el;
            }}
          >
            <p className="answer">{item.a}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
