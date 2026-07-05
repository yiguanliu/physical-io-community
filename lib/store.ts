import { create } from "zustand";

interface SiteState {
  /** Active home-carousel slide index */
  slide: number;
  setSlide: (i: number) => void;
  /** Index of the currently open FAQ item (single-open accordion) */
  openFaq: number | null;
  toggleFaq: (index: number) => void;
}

export const useSiteStore = create<SiteState>((set) => ({
  slide: 0,
  setSlide: (i) => set({ slide: i }),
  openFaq: null,
  toggleFaq: (index) => set((s) => ({ openFaq: s.openFaq === index ? null : index })),
}));
