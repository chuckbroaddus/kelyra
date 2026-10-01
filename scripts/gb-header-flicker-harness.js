/* StickyTable H-scroll harness — mirrors stickyTableHScroll.ts lock rules. */
const EPS = 0.5;
function canDrive(driving, who) {
  return driving === 'none' || driving === who;
}
function needsFollow(last, next, eps) {
  return Math.abs(next - last) > (eps == null ? EPS : eps);
}
function decide(driving, who, x, last) {
  if (!canDrive(driving, who)) return { action: 'ignore' };
  if (!needsFollow(last, x)) return { action: 'ignore' };
  return { action: 'follow', nextDriving: who, nextLastX: x };
}
function beginDrag(_d, who) {
  return who;
}
function release(driving, who) {
  return driving === who ? 'none' : driving;
}

const COLS = 18;
const ROWS = 12;
const students = Array.from({ length: ROWS }, (_, i) => 'Student ' + String.fromCharCode(65 + i));
const titles = Array.from({ length: COLS }, (_, i) => 'HW ' + (i + 1));

function fillHead(el) {
  const row = document.createElement('div');
  row.className = 'row';
  titles.forEach((t) => {
    const c = document.createElement('div');
    c.className = 'cell';
    c.textContent = t;
    row.appendChild(c);
  });
  el.appendChild(row);
}
function fillBody(el) {
  students.forEach((_name, ri) => {
    const row = document.createElement('div');
    row.className = 'row';
    titles.forEach((_t, ci) => {
      const c = document.createElement('div');
      c.className = 'cell' + (ri % 2 ? ' stripe' : '');
      c.textContent = ((ri * 3 + ci * 7) % 11) + '/10';
      row.appendChild(c);
    });
    el.appendChild(row);
  });
}
function fillNames(el) {
  students.forEach((name, ri) => {
    const c = document.createElement('div');
    c.className = 'cell name' + (ri % 2 ? ' stripe' : '');
    c.style.width = '120px';
    c.style.flexBasis = '120px';
    c.textContent = name;
    el.appendChild(c);
  });
}

const head = document.getElementById('head');
const body = document.getElementById('body');
const names = document.getElementById('names');
const status = document.getElementById('status');
fillHead(head);
fillBody(body);
fillNames(names);

let driving = 'none';
let lastX = 0;
let reverseAttempts = 0;
let followCount = 0;
let ignoreCount = 0;
const log = [];

function stamp(msg) {
  log.push({ t: performance.now(), msg, driving, lastX, reverseAttempts, followCount, ignoreCount });
  status.innerHTML =
    '<span class="badge' +
    (reverseAttempts ? ' bad' : '') +
    '">reverse-drive attempts: ' +
    reverseAttempts +
    '</span>  follows=' +
    followCount +
    ' ignores=' +
    ignoreCount +
    ' driver=' +
    driving +
    '\n' +
    msg;
}

function onScroll(who, el) {
  const x = el.scrollLeft;
  const d = decide(driving, who, x, lastX);
  if (d.action === 'ignore') {
    ignoreCount++;
    if (driving !== 'none' && driving !== who) {
      // Peer event while locked — old 80ms unlock path would reverse-drive here.
      stamp('blocked peer onScroll from ' + who + ' at x=' + x.toFixed(1));
    }
    return;
  }
  driving = d.nextDriving;
  lastX = d.nextLastX;
  followCount++;
  const peer = who === 'head' ? body : head;
  peer.scrollLeft = x;
  stamp('follow ' + who + ' -> peer x=' + x.toFixed(1));
}

head.addEventListener('scroll', () => onScroll('head', head), { passive: true });
body.addEventListener('scroll', () => onScroll('body', body), { passive: true });
head.addEventListener('pointerdown', () => {
  driving = beginDrag(driving, 'head');
  stamp('begin head');
});
body.addEventListener('pointerdown', () => {
  driving = beginDrag(driving, 'body');
  stamp('begin body');
});
head.addEventListener('pointerup', () => {
  driving = release(driving, 'head');
  stamp('end head');
});
body.addEventListener('pointerup', () => {
  driving = release(driving, 'body');
  stamp('end body');
});

window.__gbProof = {
  async sweep(steps) {
    const n = steps == null ? 24 : steps;
    reverseAttempts = 0;
    followCount = 0;
    ignoreCount = 0;
    log.length = 0;
    driving = beginDrag(driving, 'body');
    const max = Math.max(0, body.scrollWidth - body.clientWidth);
    for (let i = 0; i <= n; i++) {
      const x = (max * i) / n;
      body.scrollLeft = x;
      head.scrollLeft = Math.max(0, x - (i % 3 === 0 ? 1.25 : 0));
      await new Promise((r) => requestAnimationFrame(r));
    }
    driving = release(driving, 'body');
    head.scrollLeft = body.scrollLeft + 0.25;
    await new Promise((r) => requestAnimationFrame(r));
    return {
      reverseAttempts,
      followCount,
      ignoreCount,
      finalHead: head.scrollLeft,
      finalBody: body.scrollLeft,
      delta: Math.abs(head.scrollLeft - body.scrollLeft),
      log: log.slice(-40),
    };
  },
  state() {
    return {
      reverseAttempts,
      followCount,
      ignoreCount,
      driving,
      lastX,
      head: head.scrollLeft,
      body: body.scrollLeft,
    };
  },
};
stamp('harness ready');
