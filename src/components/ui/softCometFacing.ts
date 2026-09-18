/**
 * Soft comet always-facing ball + JS bead gas trail + phase occlusion (WKWebView / web DOM).
 * Mirrors host inline script: 2D ellipse yaw-rev, z-order front/behind K.
 * Do not use CSS .billboard counter-rotateY or CSS rotateX(90°) gas alone on native WebView.
 * Trail: DOM .gas-beads (data-soft-trail-draw=js-beads) — never SVG stroke-dash / feGaussianBlur-only on WKWebView.
 */
import { COMET_ORBIT, SOFT_MOTION } from '@/components/ui/softLetterScale';

export type SoftCometFacingHandle = { stop: () => void };

const BEAD_N = 14;
const TRAIL_SPAN = 0.38;

/**
 * Injectable IIFE for native SoftMark WebView (onLoadEnd).
 * Hard-hides .mouth and runs the same always-facing ball + gas-beads + phase-z
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
    root.setAttribute('data-soft-trail-draw','js-beads');
    root.setAttribute('data-soft-face',${JSON.stringify(faceMode)});
    var scene = root.querySelector('.scene');
    var bit = root.querySelector('.bit.head');
    if (!scene || !bit) return true;
    var beadsHost = root.querySelector('.gas-beads');
    if (!beadsHost) {
      beadsHost = document.createElement('div');
      beadsHost.className = 'gas-beads';
      beadsHost.setAttribute('data-soft-trail','js-beads');
      beadsHost.setAttribute('data-soft-trail-draw','js-beads');
      beadsHost.setAttribute('aria-hidden','true');
      scene.appendChild(beadsHost);
    }
    var BEAD_N = ${BEAD_N};
    var TRAIL_SPAN = ${TRAIL_SPAN};
    var beads = [];
    function ensureBeads(){
      if (beads.length === BEAD_N) return;
      beadsHost.innerHTML = '';
      beads = [];
      for (var i = 0; i < BEAD_N; i++) {
        var el = document.createElement('span');
        el.className = 'gas-bead';
        beadsHost.appendChild(el);
        beads.push(el);
      }
    }
    ensureBeads();
    var period = ${period};
    var ovalY = ${ovalY};
    var cosC = Math.cos(${cantZDeg} * Math.PI / 180);
    var sinC = Math.sin(${cantZDeg} * Math.PI / 180);
    var radiusOfLetter = ${radiusOfLetter};
    var reduced = false;
    try {
      reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) { reduced = false; }
    function letterPx(){
      var raw = getComputedStyle(root).getPropertyValue('--s');
      var s = parseFloat(raw) || root.clientWidth || 128;
      return s * 468 / 512;
    }
    function place(theta, r){
      var x = r * Math.sin(theta);
      var y = r * Math.cos(theta) * ovalY;
      return { x: x * cosC - y * sinC, y: x * sinC + y * cosC };
    }
    var start = null;
    function frame(now){
      var on = root.classList.contains('is-on') || root.classList.contains('demo-in') || root.classList.contains('demo-out');
      if (!on) {
        bit.style.transform = 'translate(0px, 0px)';
        for (var hi = 0; hi < beads.length; hi++) beads[hi].style.opacity = '0';
        scene.classList.remove('comet-front','comet-behind');
        requestAnimationFrame(frame);
        return;
      }
      if (start == null) start = now;
      var t = reduced ? 0 : (now - start) % period;
      var phase = t / period;
      var theta = -phase * Math.PI * 2;
      var letter = letterPx();
      var r = letter * radiusOfLetter;
      var head = place(theta, r);
      bit.style.transform = 'translate(' + head.x.toFixed(2) + 'px,' + head.y.toFixed(2) + 'px)';
      for (var b = 0; b < BEAD_N; b++) {
        var lag = ((b + 1) / (BEAD_N + 1)) * TRAIL_SPAN;
        var p = place(-(phase - lag) * Math.PI * 2, r);
        var tFrac = (b + 1) / BEAD_N;
        // Visible on ~40px chrome: head ~letter*0.14 → ~letter*0.045 (was ballPx*0.72 ≈ 2px)
        var size = letter * (0.14 - 0.095 * tFrac);
        var op = 0.95 - 0.70 * tFrac;
        var el = beads[b];
        el.style.width = size.toFixed(2) + 'px';
        el.style.height = size.toFixed(2) + 'px';
        el.style.opacity = String(op.toFixed(3));
        el.style.transform = 'translate(' + (p.x - size / 2).toFixed(2) + 'px,' + (p.y - size / 2).toFixed(2) + 'px)';
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

/** Drive scene-level .bit.head + .gas-beads + .comet-front/.comet-behind on a Soft host root. */
export function startSoftCometFacing(root: HTMLElement): SoftCometFacingHandle {
  const scene = root.querySelector('.scene') as HTMLElement | null;
  const bit = root.querySelector('.bit.head') as HTMLElement | null;
  if (!scene || !bit) {
    return { stop() {} };
  }

  let beadsHost = root.querySelector('.gas-beads') as HTMLElement | null;
  if (!beadsHost) {
    beadsHost = document.createElement('div');
    beadsHost.className = 'gas-beads';
    beadsHost.setAttribute('data-soft-trail', 'js-beads');
    beadsHost.setAttribute('data-soft-trail-draw', 'js-beads');
    beadsHost.setAttribute('aria-hidden', 'true');
    scene.appendChild(beadsHost);
  }

  const beads: HTMLElement[] = [];
  function ensureBeads() {
    if (beads.length === BEAD_N) return;
    beadsHost!.innerHTML = '';
    beads.length = 0;
    for (let i = 0; i < BEAD_N; i++) {
      const el = document.createElement('span');
      el.className = 'gas-bead';
      beadsHost!.appendChild(el);
      beads.push(el);
    }
  }
  ensureBeads();

  root.setAttribute('data-soft-facing', COMET_ORBIT.facingMode);
  root.setAttribute('data-soft-occlusion', COMET_ORBIT.occlusionMode);
  root.setAttribute('data-soft-trail', COMET_ORBIT.trailMode);
  root.setAttribute('data-soft-trail-draw', 'js-beads');
  root.setAttribute('data-soft-face', COMET_ORBIT.faceMode);

  const period = SOFT_MOTION.orbitMs;
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

  function place(theta: number, r: number) {
    const x = r * Math.sin(theta);
    const y = r * Math.cos(theta) * ovalY;
    return { x: x * cosC - y * sinC, y: x * sinC + y * cosC };
  }

  function frame(now: number) {
    if (!alive) return;
    const on =
      root.classList.contains('is-on') ||
      root.classList.contains('demo-in') ||
      root.classList.contains('demo-out');
    if (!on) {
      bit!.style.transform = 'translate(0px, 0px)';
      for (const el of beads) el.style.opacity = '0';
      scene!.classList.remove('comet-front', 'comet-behind');
      raf = requestAnimationFrame(frame);
      return;
    }
    if (start == null) start = now;
    const t = reduced ? 0 : (now - start) % period;
    const phase = t / period;
    const theta = -phase * Math.PI * 2; // yaw-rev
    const letter = letterPx();
    const r = letter * COMET_ORBIT.radiusOfLetter;
    const head = place(theta, r);
    bit!.style.transform = `translate(${head.x.toFixed(2)}px,${head.y.toFixed(2)}px)`;
    for (let b = 0; b < BEAD_N; b++) {
      const lag = ((b + 1) / (BEAD_N + 1)) * TRAIL_SPAN;
      const p = place(-(phase - lag) * Math.PI * 2, r);
      const tFrac = (b + 1) / BEAD_N;
      // Visible on ~40px chrome: head ~letter*0.14 → ~letter*0.045 (was ballPx*0.72 ≈ 2px)
      const size = letter * (0.14 - 0.095 * tFrac);
      const op = 0.95 - 0.70 * tFrac;
      const el = beads[b];
      el.style.width = `${size.toFixed(2)}px`;
      el.style.height = `${size.toFixed(2)}px`;
      el.style.opacity = op.toFixed(3);
      el.style.transform = `translate(${(p.x - size / 2).toFixed(2)}px,${(p.y - size / 2).toFixed(2)}px)`;
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
