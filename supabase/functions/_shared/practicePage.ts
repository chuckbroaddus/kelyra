type PracticeItem = { id?: string; prompt: string; answerKey?: string };

export type PracticeBeat = {
  id: string;
  stem: string;
  hint?: string;
  accept: string[];
  choices?: string[];
};

export type PracticePageSpec = {
  title: string;
  worldTint: string;
  accent: string;
  glow: string;
  beats: PracticeBeat[];
};

export const PRACTICE_PACK_PREFIX = 'prac-';

export function isPracticePackId(id: string | null | undefined): boolean {
  return Boolean(id && id.startsWith(PRACTICE_PACK_PREFIX));
}

export function specFromItems(title: string, items: PracticeItem[]): PracticePageSpec {
  const beats = items
    .map((item, index) => {
      const stem = item.prompt.trim();
      const key = item.answerKey?.trim();
      return {
        id: `q${index + 1}`,
        stem,
        ...(key ? { hint: 'Try the same steps you used in class.', accept: [key] } : { accept: [] as string[] }),
      };
    })
    .filter((beat) => beat.stem);
  return {
    title: title.trim() || 'Practice',
    worldTint: '#0b1a2b',
    accent: '#1d4ed8',
    glow: '#7dd3fc',
    beats,
  };
}

export function parsePracticePageSpec(raw: unknown, fallback: PracticePageSpec): PracticePageSpec {
  const row = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const beats = Array.isArray(row.beats)
    ? row.beats
        .map((item, index) => parseBeat(item, fallback.beats[index], index))
        .filter((beat): beat is PracticeBeat => Boolean(beat?.stem))
    : [];
  return {
    title: String(row.title ?? fallback.title).trim() || fallback.title,
    worldTint: asColor(row.worldTint, fallback.worldTint),
    accent: asColor(row.accent, fallback.accent),
    glow: asColor(row.glow, fallback.glow),
    beats: beats.length ? beats : fallback.beats,
  };
}

function parseBeat(raw: unknown, fallback: PracticeBeat | undefined, index: number): PracticeBeat | null {
  const row = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const stem = String(row.stem ?? row.prompt ?? fallback?.stem ?? '').trim();
  if (!stem) return null;
  const accept = asStringList(row.accept ?? row.answerKey ?? fallback?.accept);
  const choices = asStringList(row.choices);
  const hint = String(row.hint ?? fallback?.hint ?? '').trim();
  return {
    id: String(row.id ?? fallback?.id ?? `q${index + 1}`).replace(/[^A-Za-z0-9._-]/g, '') || `q${index + 1}`,
    stem,
    accept,
    ...(hint ? { hint } : {}),
    ...(choices.length ? { choices } : {}),
  };
}

function asStringList(raw: unknown): string[] {
  if (typeof raw === 'string' && raw.trim()) return [raw.trim()];
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => String(item ?? '').trim()).filter(Boolean).slice(0, 6);
}

function asColor(raw: unknown, fallback: string): string {
  const value = String(raw ?? '').trim();
  return /^#[0-9A-Fa-f]{6}$/.test(value) ? value : fallback;
}

export function practiceBeatWindow(spec: PracticePageSpec): { start: string; end: string } {
  const first = spec.beats[0]?.id ?? 'q1';
  return { start: first, end: 'done' };
}

/** One hosted index.html. Protocol: HUD pips, Check, #markDone, __kelyraPackReport. */
export function buildPracticeLessonHtml(spec: PracticePageSpec): string {
  const beats = spec.beats.filter((beat) => beat.stem.trim());
  if (!beats.length) throw new Error('Need at least one practice question.');
  const payload = {
    title: spec.title,
    worldTint: spec.worldTint,
    accent: spec.accent,
    glow: spec.glow,
    beats,
  };
  const json = JSON.stringify(payload).replace(/</g, '\\u003c');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(spec.title)} · Kelyra</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:ital,wght@0,450;0,600;0,700;1,450&display=swap" rel="stylesheet" />
<style>
:root {
  --ink:#16181d; --paper:#f4f2eb; --muted:#3a4050; --accent:${spec.accent};
  --ok:#157347; --ok-bg:#e6f4ec; --no:#b42318; --no-bg:#fdecea;
  --glow:${spec.glow}; --world:${spec.worldTint}; --hud-h:56px;
}
*{box-sizing:border-box}
html,body{margin:0;height:100%;background:#05070c;color:var(--ink);font-family:"Source Sans 3",system-ui,sans-serif}
body{display:flex;flex-direction:column;min-height:100dvh;overflow:hidden}
.world{position:fixed;inset:0;z-index:0;background:radial-gradient(ellipse at 50% 40%, color-mix(in srgb, var(--glow) 28%, var(--world)), var(--world));pointer-events:none}
.world::after{content:"";position:absolute;inset:0;background:radial-gradient(ellipse at 50% 42%, transparent 35%, rgba(0,0,0,.45) 100%)}
.motes{position:absolute;inset:0;opacity:.55;background-image:radial-gradient(2px 2px at 20% 30%, rgba(255,255,255,.35), transparent),radial-gradient(1px 1px at 70% 20%, rgba(255,240,200,.4), transparent),radial-gradient(1.5px 1.5px at 40% 80%, rgba(180,220,255,.3), transparent)}
@media (prefers-reduced-motion:no-preference){.motes{animation:drift 18s linear infinite}}
@keyframes drift{to{transform:translateY(-18px)}}
.hud{position:relative;z-index:3;height:var(--hud-h);min-height:48px;max-height:64px;display:flex;align-items:center;gap:12px;padding:0 16px;background:rgba(8,10,16,.42);border-bottom:1px solid rgba(255,255,255,.22);backdrop-filter:blur(16px);color:#f7f3ea}
.brand{font-size:13px;font-weight:650}.brand small{display:block;font-weight:450;color:rgba(247,243,234,.72);font-size:11px}
.pips{display:flex;gap:0;flex:1;justify-content:center}
.pips button{width:36px;height:36px;border:0;background:transparent;cursor:pointer;position:relative}
.pips button::after{content:"";position:absolute;left:50%;top:50%;width:10px;height:10px;margin:-5px 0 0 -5px;border-radius:50%;border:1px solid rgba(255,255,255,.55)}
.pips button.on::after{background:var(--glow);border-color:var(--glow);box-shadow:0 0 12px var(--glow)}
.pips button.done::after{background:rgba(247,243,234,.85);border-color:rgba(247,243,234,.85)}
.score{font-size:12px;color:rgba(247,243,234,.75)}
.shell{position:relative;z-index:2;flex:1;display:flex;flex-direction:column;min-height:0}
.rail{display:flex;align-items:center;gap:10px;padding:8px 16px;color:#f7f3ea;background:rgba(8,10,16,.28)}
.bot{width:36px;height:48px;border-radius:10px 10px 14px 14px;background:linear-gradient(#d7dde8,#9aa6b8);flex:0 0 auto}
.line{font-size:12px;color:rgba(247,243,234,.82)}
.stage{flex:1;display:flex;align-items:center;justify-content:center;padding:18px 20px 28px}
.card{width:min(720px,100%);background:rgba(255,252,246,.9);border-radius:16px;padding:28px 24px 22px;box-shadow:0 24px 60px rgba(0,0,0,.35)}
.stem{font-size:clamp(22px,4vw,34px);font-weight:650;line-height:1.25;margin:0 0 18px}
.choices{display:flex;flex-direction:column;gap:10px;margin-bottom:14px}
.choices button,.field{min-height:48px;border-radius:10px;border:1px solid #c9c4b8;background:#fff;font:inherit;text-align:left;padding:12px 14px;cursor:pointer}
.choices button.on{border-color:var(--accent);box-shadow:0 0 0 2px color-mix(in srgb, var(--accent) 35%, transparent)}
.field{width:100%;cursor:text}
.row{display:flex;gap:8px;flex-wrap:wrap}
.primary,.ghost,.hintbtn{border-radius:8px;padding:10px 16px;min-height:44px;font:inherit;cursor:pointer;border:1px solid transparent}
.primary{background:var(--accent);color:#fff;font-weight:650}
.ghost,.hintbtn{background:transparent;border-color:#b7b1a4}
.ok{background:var(--ok-bg);color:var(--ok)}
.no{background:var(--no-bg);color:var(--no)}
.done-card{text-align:center}
#markDone{min-width:160px}
@media (prefers-reduced-motion:reduce){.motes{animation:none}}
</style>
</head>
<body>
<div class="world"><div class="motes"></div></div>
<header class="hud">
  <div class="brand">Kelyra<small id="hudTitle"></small></div>
  <div class="pips" id="pips"></div>
  <div class="score" id="score"></div>
</header>
<div class="shell">
  <div class="rail"><div class="bot" aria-hidden="true"></div><div class="line" id="botLine">Your turn.</div></div>
  <main class="stage"><section class="card" id="card"></section></main>
</div>
<script>
window.KELYRA_PRACTICE = ${json};
(function(){
  var spec = window.KELYRA_PRACTICE;
  var beats = (spec.beats||[]).slice();
  beats.push({id:'done', stem:'', accept:[]});
  var i = 0;
  var answers = {};
  var checked = {};
  var key = 'kelyra-practice';
  function n(s){return String(s||'').replace(/\\s+/g,' ').trim().toLowerCase()}
  function save(){
    try{localStorage.setItem(key, JSON.stringify({beat:i, answers:answers, checked:checked, finished:i>=beats.length-1, correct:score().c, attempted:score().a}))}catch(e){}
  }
  function load(){
    try{
      var s = JSON.parse(localStorage.getItem(key)||'{}');
      if(s.answers) answers = s.answers;
      if(s.checked) checked = s.checked;
      if(typeof s.beat==='number' && s.beat>=0 && s.beat<beats.length) i = s.beat;
    }catch(e){}
  }
  function score(){
    var c=0,a=0;
    beats.forEach(function(b){
      if(b.id==='done') return;
      var v = answers[b.id];
      if(v==null || String(v).trim()==='') return;
      a += 1;
      if(ok(b,v)) c += 1;
    });
    return {c:c,a:a};
  }
  function ok(b,v){
    if(!b.accept || !b.accept.length) return false;
    return b.accept.some(function(x){return n(x)===n(v)});
  }
  window.__kelyraPackReport = function(){
    var s = score();
    return {correct:s.c, incorrect:Math.max(0,s.a-s.c), marks:{answers:answers}, extras:{checked:checked}};
  };
  window.__kelyraApplyIdentity = function(identity){
    var pack = identity && identity.pack;
    if(pack && pack.deck_id && pack.version){
      key = 'kelyra-'+pack.deck_id+'-'+pack.version;
      window.__kelyraProgressKey = key;
      load();
      draw();
    }
  };
  function draw(){
    var b = beats[i];
    document.getElementById('hudTitle').textContent = spec.title||'Practice';
    var sc = score();
    document.getElementById('score').textContent = sc.a ? (sc.c+' / '+sc.a) : '';
    var pips = document.getElementById('pips');
    pips.innerHTML = '';
    beats.forEach(function(beat, idx){
      var btn = document.createElement('button');
      btn.type='button';
      btn.className = (idx===i?'on ':'')+(idx<i||checked[beat.id]?'done':'');
      btn.onclick = function(){ i=idx; save(); draw(); };
      pips.appendChild(btn);
    });
    var card = document.getElementById('card');
    var bot = document.getElementById('botLine');
    if(b.id==='done'){
      bot.textContent = 'That set is in.';
      card.className = 'card done-card';
      card.innerHTML = '<p class="stem">Nice work.</p><p>You finished this practice set.</p><p class="row" style="justify-content:center"><button class="primary" id="markDone" type="button">Done</button></p>';
      document.getElementById('markDone').onclick = function(){
        i = beats.length-1;
        save();
        if(window.__kelyraComplete) window.__kelyraComplete();
      };
      return;
    }
    card.className = 'card';
    var html = '<p class="stem"></p>';
    if(b.choices && b.choices.length){
      html += '<div class="choices" id="choices"></div>';
    } else {
      html += '<input class="field" id="ans" autocomplete="off" />';
    }
    html += '<div class="row"><button class="primary" id="check" type="button">Check</button>';
    if(b.hint) html += '<button class="hintbtn" id="hintBtn" type="button">Hint</button>';
    html += '<button class="ghost" id="next" type="button">Next</button></div><p id="fb"></p>';
    card.innerHTML = html;
    card.querySelector('.stem').textContent = b.stem;
    var fb = document.getElementById('fb');
    function setVal(v){ answers[b.id]=v; save(); }
    if(b.choices && b.choices.length){
      var box = document.getElementById('choices');
      b.choices.forEach(function(ch){
        var btn = document.createElement('button');
        btn.type='button';
        btn.textContent = ch;
        if(n(answers[b.id])===n(ch)) btn.className='on';
        btn.onclick = function(){
          Array.prototype.forEach.call(box.children, function(el){ el.className=''; });
          btn.className='on';
          setVal(ch);
        };
        box.appendChild(btn);
      });
    } else {
      var inp = document.getElementById('ans');
      inp.value = answers[b.id]||'';
      inp.oninput = function(){ setVal(inp.value); };
    }
    document.getElementById('check').onclick = function(){
      var v = answers[b.id];
      if(v==null || String(v).trim()===''){ fb.textContent='Write an answer first.'; fb.className='no'; return; }
      checked[b.id]=true;
      var good = b.accept && b.accept.length ? ok(b,v) : true;
      fb.textContent = good ? 'Correct.' : (b.hint ? 'Not yet. Try once more, or Hint.' : 'Not yet. Try once more.');
      fb.className = good ? 'ok' : 'no';
      bot.textContent = good ? 'Onward.' : 'Stay with this one.';
      save();
      document.getElementById('score').textContent = score().c+' / '+score().a;
    };
    var hint = document.getElementById('hintBtn');
    if(hint) hint.onclick = function(){ fb.textContent = b.hint; fb.className=''; };
    document.getElementById('next').onclick = function(){ i = Math.min(beats.length-1, i+1); save(); draw(); };
    bot.textContent = 'Your turn.';
  }
  load();
  draw();
})();
</script>
</body>
</html>
`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const PRACTICE_PAGE_STYLE_PROMPT = `You format follow-up practice as a Kelyra interactive lesson page spec. JSON only:
{"title":"","worldTint":"#0b1a2b","accent":"#1d4ed8","glow":"#7dd3fc","beats":[{"id":"q1","stem":"one sentence","hint":"short","accept":["key"],"choices":["optional","choices"]}]}
Visual rules (copy these, do not invent a worksheet):
- One beat per question. Stem is the biggest type. Check then Next. No numbered worksheet wall.
- Palette: ink + paper + one instructive accent. Green/red only after Check.
- worldTint/accent/glow are #rrggbb. Jewel color, not preschool crayon.
- Do not add Disney/Pixar characters, mascots, or a crowd of icons.
- Keep teacher stems. You may add accept keys and 2-4 choices when the item is multiple-choice friendly.
- Age 10-12. No student names.`;
