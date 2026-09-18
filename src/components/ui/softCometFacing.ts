/**
 * Soft comet always-facing ball + JS gas trail + phase occlusion (WKWebView / web DOM).
 * Mirrors host inline script: 2D ellipse yaw-rev, z-order front/behind K.
 * Do not use CSS .billboard counter-rotateY or CSS rotateX(90°) gas alone on native WebView.
 */
import { COMET_ORBIT, SOFT_MOTION } from '@/components/ui/softLetterScale';

export type SoftCometFacingHandle = { stop: () => void };

/**
 * Injectable IIFE for native SoftMark WebView (onLoadEnd).
 * Hard-hides .mouth and runs the same always-facing ball + gas-orbit + phase-z
 * logic as startSoftCometFacing. RN WebView often does not execute HTML inline
 * <script>, so SoftMark.tsx must inject this — do not rely on host script alone.
 */
export function softCometFacingInjectScript(): string {
  const period = SOFT_MOTION.orbitMs;
  const cantZDeg = COMET_ORBIT.cantZDeg;
  const ovalY = COMET_ORBIT.ovalY;
  const radiusOfLetter = COMET_ORBIT.radiusOfLetter;
  const facingMode = COMET_ORBIT.facingMode;
  const occlusionMode = COMET_ORBIT.occlusionMode;
  const trailMode = COMET_ORBIT.trailMode;
  const faceMode = COMET_ORBIT.faceMode;

  // Values inlined so WebView has no module imports.
  return `(function(){
  try {
    var root = document.getElementById('soft-root');
    if (!root) return true;
    root.querySelectorAll('.mouth').forEach(function(el){
      el.style.setProperty('display','none','important');
      el.style.setProperty('visibility','hidden','important');
      el.style.setProperty('opacity','0','important');
    });
    if (root.getAttribute('data-soft-facing-injected') === '1') return true;
    root.setAttribute('data-soft-facing-injected','1');
    root.setAttribute('data-soft-facing',${JSON.stringify(facingMode)});
    root.setAttribute('data-soft-occlusion',${JSON.stringify(occlusionMode)});
    root.setAttribute('data-soft-trail',${JSON.stringify(trailMode)});
    root.setAttribute('data-soft-face',${JSON.stringify(faceMode)});
    var scene = root.querySelector('.scene');
    var bit = root.querySelector('.bit.head');
    var gas = root.querySelector('.gas-orbit') || root.querySelector('[data-soft-trail="js-orbit"]');
    if (!scene || !bit) return true;
    var period = ${period};
    var cantDeg = ${cantZDeg};
    var ovalY = ${ovalY};
    var cosC = Math.cos(${cantZDeg} * Math.PI / 180);
    var sinC = Math.sin(${cantZDeg} * Math.PI / 180);
    var radiusOfLetter = ${radiusOfLetter};
    var reduced = false;
    try {
      reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) { reduced = false; }
    var start = null;
    function letterPx(){
      var raw = getComputedStyle(root).getPropertyValue('--s');
      var s = parseFloat(raw) || root.clientWidth || 128;
      return s * 468 / 512;
    }
    function frame(now){
      var on = root.classList.contains('is-on') || root.classList.contains('demo-in') || root.classList.contains('demo-out');
      if (!on) {
        bit.style.transform = 'translate(0px, 0px)';
        if (gas) gas.style.transform = 'none';
        scene.classList.remove('comet-front','comet-behind');
        requestAnimationFrame(frame);
        return;
      }
      if (start == null) start = now;
      var t = reduced ? 0 : (now - start) % period;
      var phase = t / period;
      var theta = -phase * Math.PI * 2;
      var r = letterPx() * radiusOfLetter;
      var x = r * Math.sin(theta);
      var y = r * Math.cos(theta) * ovalY;
      var xr = x * cosC - y * sinC;
      var yr = x * sinC + y * cosC;
      bit.style.transform = 'translate(' + xr.toFixed(2) + 'px,' + yr.toFixed(2) + 'px)';
      if (gas) {
        var deg = phase * -360;
        gas.style.transform = 'rotate(' + cantDeg + 'deg) scale(1,' + ovalY.toFixed(6) + ') rotate(' + deg.toFixed(2) + 'deg)';
      }
      var front = Math.cos(theta) > 0;
      scene.classList.toggle('comet-front', front);
      scene.classList.toggle('comet-behind', !front);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  } catch (err) {}
  return true;
})();`;
}

/** Drive scene-level .bit.head + .gas-orbit + .comet-front/.comet-behind on a Soft host root. */
export function startSoftCometFacing(root: HTMLElement): SoftCometFacingHandle {
  const scene = root.querySelector('.scene') as HTMLElement | null;
  const bit = root.querySelector('.bit.head') as HTMLElement | null;
  const gas =
    (root.querySelector('.gas-orbit') as HTMLElement | null) ||
    (root.querySelector('[data-soft-trail="js-orbit"]') as HTMLElement | null);
  if (!scene || !bit) {
    return { stop() {} };
  }

  root.setAttribute('data-soft-facing', COMET_ORBIT.facingMode);
  root.setAttribute('data-soft-occlusion', COMET_ORBIT.occlusionMode);
  root.setAttribute('data-soft-trail', COMET_ORBIT.trailMode);
  root.setAttribute('data-soft-face', COMET_ORBIT.faceMode);

  const period = SOFT_MOTION.orbitMs;
  const tilt = (COMET_ORBIT.tiltXDeg * Math.PI) / 180;
  const cant = (COMET_ORBIT.cantZDeg * Math.PI) / 180;
  const cantDeg = COMET_ORBIT.cantZDeg;
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
      if (gas) gas.style.transform = 'none';
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
    if (gas) {
      const deg = phase * -360;
      gas.style.transform = `rotate(${cantDeg}deg) scale(1,${ovalY.toFixed(6)}) rotate(${deg.toFixed(2)}deg)`;
    }
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
