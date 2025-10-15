// gsapSetup.js - registers GSAP + ScrollTrigger utilities
import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

let registered = false;

export function getGSAP() {
  if (!registered) {
    gsap.registerPlugin(ScrollTrigger);
    registered = true;
  }
  return { gsap, ScrollTrigger };
}

export { gsap, ScrollTrigger };

export function useRegisterScrollTriggers(cb) {
  useEffect(() => {
    const { ScrollTrigger: Trigger } = getGSAP();
    cb();
    return () => {
      Trigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, [cb]);
}
