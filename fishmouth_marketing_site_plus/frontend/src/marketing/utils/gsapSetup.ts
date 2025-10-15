// gsapSetup.ts - registers GSAP + ScrollTrigger and safe lenis hook (optional)
import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

export function useRegisterScrollTriggers(cb: () => void) {
  useEffect(() => {
    cb();
    return () => ScrollTrigger.getAll().forEach(t => t.kill());
  }, []);
}

export { gsap, ScrollTrigger };
