/**
 * Soft comet always-facing + phase occlusion (WKWebView / web DOM).
 * Mirrors host inline script: 2D ellipse yaw-rev, z-order front/behind K.
 * Do not use CSS .billboard counter-rotateY alone on native WebView.
 */
import { COMET_ORBIT, SOFT_MOTION } from '@/components/ui/softLetterScale';

export type SoftCometFacingHandle = { stop: () => void };

/** Drive scene-level .bit.head + .comet-front/.comet-behind on a Soft host root. */
export function startSoftCometFacing(root: HTMLElement): SoftCometFacingHandle {
  const scene = root.querySelector('.scene') as HTMLElement | null;
  const bit = root.querySelector('.bit.head') as HTMLElement | null;
  if (!scene || !bit) {
    return { stop() {} };
  }

  root.setAttribute('data-soft-facing', COMET_ORBIT.facingMode);
  root.setAttribute('data-soft-occlusion', COMET_ORBIT.occlusionMode);

  const period = SOFT_MOTION.orbitMs;
  const tilt = (COMET_ORBIT.tiltXDeg * Math.PI) / 180;
  const cant = (COMET_ORBIT.cantZDeg * Math.PI) / 180;
  const ovalY = COMET_ORBIT.ovalY;
  const cosC = Math.cos(cant);
  const sinC = Math.sin(cant);

  let reduced = false;
  try {
    reduced = !!(
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  } catch {
    reduced = false;
  }

  let start: number | null = null;
  let raf = 0;
  let alive = true;

  function letterPx(): number {
    const raw = getComputedStyle(root).getPropertyValue('--s');
    const s = parseFloat(raw) || root.clientWidth || 128;
    return s * 468 / 512;
  }

  function frame(now: number) {
    if (!alive) return;
    const on =
      root.classList.contains('is-on') ||
      root.classList.contains('demo-in') ||
      root.classList.contains('demo-out');
    if (!on) {
      bit!.style.transform = 'translate(0px, 0px)';
      scene!.classList.remove('comet-front', 'comet-behind');
      raf = requestAnimationFrame(frame);
      return;
    }
    if (start == null) start = now;
    const t = reduced ? 0 : (now - start) % period;
    const phase = t / period;
    const theta = -phase * Math.PI * 2; // yaw-rev
    const r = letterPx() * COMET_ORBIT.radiusOfLetter;
    const x = r * Math.sin(theta);
    const y = r * Math.cos(theta) * ovalY;
    const xr = x * cosC - y * sinC;
    const yr = x * sinC + y * cosC;
    bit!.style.transform = `translate(${xr.toFixed(2)}px,${yr.toFixed(2)}px)`;
    const front = Math.cos(theta) > 0;
    scene!.classList.toggle('comet-front', front);
    scene!.classList.toggle('comet-behind', !front);
    raf = requestAnimationFrame(frame);
  }

  raf = requestAnimationFrame(frame);
  return {
    stop() {
      alive = false;
      if (raf) cancelAnimationFrame(raf);
    },
  };
}
