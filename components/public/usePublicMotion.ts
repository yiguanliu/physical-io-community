'use client';

import { useLayoutEffect, type RefObject } from 'react';
import { usePathname } from 'next/navigation';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(ScrollTrigger, SplitText);

// Shared public-site motion. Keep navigation and the interactive robot out of blur effects.
const motion = { page: 0.35, reveal: 0.65, word: 0.55, stagger: 0.045, distance: 18, blur: 6 };

export function usePublicMotion(ref: RefObject<HTMLElement | null>, enabled = true, home = false) {
  const pathname = usePathname();

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root || !enabled) return;
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      const splits: SplitText[] = [];
      const reveals: { element: HTMLElement; tween: gsap.core.Tween }[] = [];
      const page = root.matches('main') ? root : root.querySelector('main');
      const entrance = page ? gsap.fromTo(page, { opacity: 0 }, {
        opacity: 1, duration: motion.page, ease: 'power2.out', clearProps: 'opacity',
      }) : null;

      // Only split editorial headings: never inputs, live chat, or interactive labels.
      const headings = root.querySelectorAll<HTMLElement>(home
        ? '[data-motion-heading]'
        : '.public-hero h1, .public-section-heading h2, .public-closing h2');
      headings.forEach(heading => {
        if (heading.querySelector('a, button, input')) return;
        const accessibleText = heading.getAttribute('aria-label') || heading.innerText.replace(/\s+/g, ' ').trim();
        const split = SplitText.create(heading, { type: 'words', tag: 'span', aria: 'auto' });
        heading.setAttribute('aria-label', accessibleText);
        splits.push(split);
        const tween = gsap.fromTo(split.words, { opacity: 0, y: 10, filter: `blur(${motion.blur}px)` }, {
          opacity: 1, y: 0, filter: 'blur(0px)', duration: motion.word,
          stagger: { each: motion.stagger, amount: Math.min(0.3, split.words.length * motion.stagger) },
          ease: 'power3.out', clearProps: 'opacity,transform,filter',
          scrollTrigger: { trigger: heading, start: 'top 92%', once: true },
        });
        reveals.push({ element: heading, tween });
      });

      const targets = root.querySelectorAll<HTMLElement>(home ? '[data-motion-reveal]' :
        '.public-hero > p, .public-eyebrow, .public-actions, .public-section-heading > p, .public-card, .public-steps > li, .public-event-list > li, .public-closing, .public-footer');
      targets.forEach((element, index) => {
        // Avoid compounded opacity and movement on nested reveal targets.
        if (reveals.some(item => item.element.contains(element))) return;
        const tween = gsap.fromTo(element, { opacity: 0, y: motion.distance }, {
          opacity: 1, y: 0, duration: motion.reveal,
          delay: element.getBoundingClientRect().top < innerHeight ? Math.min(index * 0.035, 0.14) : 0,
          ease: 'power3.out', clearProps: 'opacity,transform',
          scrollTrigger: { trigger: element, start: 'top 92%', once: true },
        });
        reveals.push({ element, tween });
      });

      // Keyboard users must never land inside an invisible card or section.
      const revealFocused = (event: FocusEvent) => {
        entrance?.progress(1);
        const target = event.target as Node;
        reveals.forEach(({ element, tween }) => {
          if (element.contains(target)) tween.progress(1);
        });
      };
      root.addEventListener('focusin', revealFocused);
      let disposed = false;
      void document.fonts.ready.then(() => { if (!disposed) ScrollTrigger.refresh(); });
      return () => {
        disposed = true;
        root.removeEventListener('focusin', revealFocused);
        splits.forEach(split => split.revert());
      };
    }, root);
    return () => media.revert();
  }, [ref, pathname, enabled, home]);
}
