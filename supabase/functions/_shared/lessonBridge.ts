/** Injected into hosted lesson HTML. Identity/metrics via postMessage, not the URL. */
export const LESSON_BRIDGE_JS = `(function () {
  if (window.__kelyraBridge) return;
  window.__kelyraBridge = true;
  var TYPE_ID = 'kelyra.identity';
  var identity = null;
  var startedAt = Date.now();
  var hintCount = 0;
  var audioUsed = false;
  var kineticUsed = false;
  var completeSent = false;
  var extras = {};

  function post(msg) {
    try {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(msg));
        return;
      }
    } catch (e) {}
    try {
      if (window.parent && window.parent !== window) window.parent.postMessage(msg, '*');
    } catch (e2) {}
  }

  function strip() {
    var el = document.getElementById('kelyra-id-strip');
    if (!el) {
      el = document.createElement('div');
      el.id = 'kelyra-id-strip';
      el.setAttribute('role', 'status');
      el.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:2147483646;box-sizing:border-box;min-height:44px;display:flex;align-items:center;font:12px/1.35 system-ui,sans-serif;padding:0 52px 0 10px;background:rgba(18,18,22,.82);color:#f6f3ee;pointer-events:none;';
      document.documentElement.appendChild(el);
    }
    if (!identity) {
      el.textContent = 'Waiting for Kelyra…';
      return;
    }
    var bits = [];
    if (identity.school && identity.school.name) bits.push(identity.school.name);
    if (identity.class && identity.class.name) bits.push(identity.class.name);
    if (identity.teacher && identity.teacher.name) bits.push(identity.teacher.name);
    if (identity.student && identity.student.name) bits.push(identity.student.name);
    el.textContent = bits.join(' · ');
    if (identity.student && identity.student.id) {
      document.documentElement.setAttribute('data-kelyra-student', identity.student.id);
    }
  }

  function gate() {
    if (identity) return;
    var wrap = document.createElement('div');
    wrap.id = 'kelyra-signin-gate';
    wrap.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#16161c;color:#f6f3ee;display:flex;align-items:center;justify-content:center;padding:24px;font:16px/1.4 system-ui,sans-serif;text-align:center;';
    wrap.textContent = 'Sign in to Kelyra to open this lesson.';
    document.documentElement.appendChild(wrap);
  }

  function fomState() {
    try {
      var raw = null;
      var k = window.__kelyraProgressKey || extras.progress_key || null;
      if (k) raw = localStorage.getItem(k);
      if (!raw) {
        for (var i = 0; i < localStorage.length; i++) {
          var key = localStorage.key(i);
          if (key && key.indexOf('kelyra-') === 0) {
            raw = localStorage.getItem(key);
            k = key;
            break;
          }
        }
      }
      if (k) extras.progress_key = k;
      if (!raw) return {};
      return JSON.parse(raw) || {};
    } catch (e) {
      return {};
    }
  }

  var alreadyFinished = false;
  var bootStateKnown = false;
  function captureBootState() {
    if (bootStateKnown) return;
    var s = fomState();
    if (!s) return;
    if (s.finished !== true && s.beat == null && s.attempted == null) return;
    bootStateKnown = true;
    alreadyFinished = !!s.finished;
  }
  captureBootState();

  function packReport() {
    try {
      if (typeof window.__kelyraPackReport === 'function') return window.__kelyraPackReport() || null;
    } catch (e) {}
    return null;
  }

  function metrics(stateName) {
    var s = fomState();
    var pack = packReport();
    var correct = pack && typeof pack.correct === 'number' ? pack.correct : (typeof s.correct === 'number' ? s.correct : null);
    var incorrect = pack && typeof pack.incorrect === 'number' ? pack.incorrect : null;
    var marks = pack && pack.marks != null
      ? pack.marks
      : ((s.answers || s.stars != null) ? { answers: s.answers || null, stars: s.stars, starred: s.starred || null } : null);
    var hintVal = pack && pack.hints != null ? pack.hints : hintCount;
    var packExtras = pack && pack.extras && typeof pack.extras === 'object' ? pack.extras : {};
    var attempted = pack && typeof pack.correct === 'number' && typeof pack.incorrect === 'number'
      ? pack.correct + pack.incorrect
      : (typeof s.attempted === 'number' ? s.attempted : null);
    return {
      type: 'kelyra.lesson',
      state: stateName,
      metrics: {
        started_at: new Date(startedAt).toISOString(),
        completed_at: stateName === 'complete' ? new Date().toISOString() : null,
        duration_ms: Date.now() - startedAt,
        correct: correct,
        incorrect: incorrect,
        marks: marks,
        hints: hintVal,
        audio_used: audioUsed,
        kinetic_used: kineticUsed || !!s.sliderDone,
        extras: Object.assign({}, extras, packExtras, {
          beat: s.beat,
          item: s.item,
          attempted: attempted,
          finished: !!s.finished,
          slider_done: !!s.sliderDone,
          checked: s.checked || null,
          reduced_motion: !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches),
          who: (identity && identity.student && identity.student.id && identity.student.name) || s.who || null,
          pack_deck_id: identity && identity.pack ? identity.pack.deck_id : null,
          beat_start: identity && identity.pack ? identity.pack.beat_start : null,
          beat_end: identity && identity.pack ? identity.pack.beat_end : null
        })
      }
    };
  }

  function emit(stateName) {
    if (stateName === 'complete') {
      if (completeSent) return;
      completeSent = true;
    }
    post(metrics(stateName));
  }

  function emitComplete() {
    extras.complete_kind = 'this_visit';
    emit('complete');
  }

  function flush(stateName) {
    if (completeSent) return;
    var s = fomState();
    if (s.finished) return;
    emit(stateName === 'abandoned' ? 'abandoned' : 'in_progress');
  }

  window.__kelyraFlush = flush;

  function onMessage(ev) {
    var data = ev.data;
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch (e) { return; }
    }
    if (!data || typeof data !== 'object') return;
    if (data.type === 'kelyra.flush') {
      flush(data.state);
      return;
    }
    if (data.type !== TYPE_ID) return;
    identity = data;
    window.__kelyraIdentity = identity;
    var g = document.getElementById('kelyra-signin-gate');
    if (g) g.remove();
    strip();
    try {
      if (typeof window.__kelyraApplyIdentity === 'function') window.__kelyraApplyIdentity(identity);
    } catch (e3) {}
    captureBootState();
  }

  window.addEventListener('message', onMessage);
  document.addEventListener('message', onMessage);

  try {
    var Orig = window.Audio;
    if (Orig && !Orig.__kelyra) {
      function Wrapped(src) {
        audioUsed = true;
        var a = new Orig(src);
        try { a.setAttribute('playsinline', ''); a.playsInline = true; } catch (e) {}
        return a;
      }
      Wrapped.__kelyra = true;
      Wrapped.prototype = Orig.prototype;
      window.Audio = Wrapped;
    }
  } catch (e) {}

  document.addEventListener('click', function (ev) {
    var t = ev.target;
    if (!t || !t.closest) return;
    if (t.closest('#hearBtn, #stopBtn, audio')) audioUsed = true;
    if (t.closest('#hintBtn, .hint-ico, .hintbtn')) hintCount += 1;
    if (t.closest('.draghint, input[type=range], .tick, [draggable]')) kineticUsed = true;
    if (t.closest('#markDone')) emitComplete();
  }, true);
  document.addEventListener('pointerdown', function (ev) {
    var t = ev.target;
    if (t && t.closest && t.closest('.draghint, input[type=range]')) kineticUsed = true;
  }, true);

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden' && !completeSent) {
      var s = fomState();
      if (s.finished && bootStateKnown && !alreadyFinished) emitComplete();
      else if ((typeof s.beat === 'number' && s.beat > 0) || (typeof s.attempted === 'number' && s.attempted > 0)) {
        emit('in_progress');
      }
    }
  });
  window.addEventListener('pagehide', function () {
    if (!completeSent) {
      var s = fomState();
      if ((typeof s.beat === 'number' && s.beat > 0) || (typeof s.attempted === 'number' && s.attempted > 0)) {
        emit('in_progress');
      }
    }
  });

  strip();
  setTimeout(function () { if (!identity) gate(); }, 2500);
  setInterval(function () {
    try {
      captureBootState();
      if (fomState().finished && bootStateKnown && !alreadyFinished) emitComplete();
    } catch (e) {}
  }, 1500);
})();
`;
