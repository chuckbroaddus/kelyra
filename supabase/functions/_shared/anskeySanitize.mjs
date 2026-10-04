/**
 * Answer-key post-filters for analyze-answer-key.
 * Pure functions — unit-tested offline (scripts/anskey-sanitize.test.mjs). Shared by Edge
 * analyze-answer-key and scripts/ai-dev-server.mjs; edit here only.
 */

/** Concrete example rows historically used in analyzeKeyPrompt (must never appear as output). */
export const PROMPT_EXAMPLE_ROWS = Object.freeze([
  { stem: '12 + 9 =', answer: '21' },
  { stem: '7 + 8 =', answer: '15' },
]);

const RUBRIC_ANSWER_RE =
  /^(?:see\s+rubric|teacher\s+judgment|use\s+rubric|rubric|see\s+teacher|teacher\s+scored?)(?:\b|[—–\-:].*)?$/i;

const SIMPLE_ADD_RE = /^(\d{1,3})\s*[+＋]\s*(\d{1,3})\s*=?\s*$/;
const SIMPLE_SUB_RE = /^(\d{1,3})\s*[−\-–]\s*(\d{1,3})\s*=?\s*$/;
const SIMPLE_MUL_RE = /^(\d{1,3})\s*[×xX*]\s*(\d{1,3})\s*=?\s*$/;

function normCompact(s) {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function stemKey(stem) {
  return normCompact(stem)
    .replace(/\s+/g, '')
    .replace(/=+$/g, '');
}

function answerKey(answer) {
  return normCompact(answer).replace(/\s+/g, '');
}

export function isPromptExampleLeak(item) {
  const sk = stemKey(item?.stem);
  const ak = answerKey(item?.answer);
  if (!sk && !ak) return false;
  for (const ex of PROMPT_EXAMPLE_ROWS) {
    const esk = stemKey(ex.stem);
    const eak = answerKey(ex.answer);
    if (sk && (sk === esk || sk === esk.replace(/=/g, '')) && (!ak || ak === eak)) return true;
    if (sk === esk && ak === eak) return true;
    if (sk.startsWith(esk.replace(/=/g, '')) && ak === eak && esk.includes('+')) return true;
  }
  return false;
}

/** True when stem is a tiny arithmetic fact and answer equals the computed result. */
export function isSolvedTrivialArithmetic(item) {
  const stem = String(item?.stem ?? '').trim();
  const answer = String(item?.answer ?? '').trim();
  if (!stem || !answer) return false;
  if (/^[A-Ea-e]$/.test(answer)) return false;
  let m = stem.match(SIMPLE_ADD_RE);
  if (m) return Number(answer) === Number(m[1]) + Number(m[2]);
  m = stem.match(SIMPLE_SUB_RE);
  if (m) return Number(answer) === Number(m[1]) - Number(m[2]);
  m = stem.match(SIMPLE_MUL_RE);
  if (m) return Number(answer) === Number(m[1]) * Number(m[2]);
  return false;
}

export function isRubricPlaceholderAnswer(answer) {
  const a = String(answer ?? '').trim();
  if (!a) return false;
  if (RUBRIC_ANSWER_RE.test(a)) return true;
  if (/see\s+rubric/i.test(a) && a.length <= 80) return true;
  return false;
}

export function isAnswerEqualsItemNumber(item) {
  const n = Number(item?.n);
  const a = String(item?.answer ?? '').trim();
  if (!Number.isFinite(n) || !a) return false;
  return a === String(n) || a === `${n}.` || a === `(${n})`;
}

export function parseKeyItemsFromModel(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row, index) => {
      let stem = String(row?.stem ?? '').trim();
      const n = Number(row?.n ?? index + 1);
      const nStr = String(n);
      if (stem.startsWith(nStr + '. ')) stem = stem.slice(nStr.length + 2);
      else if (stem.startsWith(nStr + ') ')) stem = stem.slice(nStr.length + 2);
      else if (stem.startsWith(nStr + ' + ')) stem = stem.slice(nStr.length + 3);
      else if (stem.startsWith(nStr + ' ')) {
        const rest = stem.slice(nStr.length + 1);
        if (/^[+\-×÷=]/.test(rest) || /^\d/.test(rest)) stem = rest;
      }
      let answer = String(row?.answer ?? row?.expected ?? '').trim();
      const typeRaw = row?.type;
      const type =
        typeRaw === 'mc' || typeRaw === 'numeric' || typeRaw === 'short' || typeRaw === 'work'
          ? typeRaw
          : undefined;
      const choices = Array.isArray(row?.choices)
        ? row.choices.map((c) => String(c)).filter(Boolean)
        : undefined;
      const letterLead = answer.match(/^([A-Ea-e])[).:\s]/);
      if (letterLead && (type === 'mc' || choices?.length)) answer = letterLead[1].toUpperCase();
      if (answer && stem.length > answer.length + 1 && stem.endsWith(answer)) {
        const head = stem.slice(0, stem.length - answer.length).trimEnd();
        if (/[=:]$/.test(head)) stem = head;
      }
      const unreadable =
        row?.unreadable === true ||
        /^unreadable$/i.test(answer) ||
        /^illegible$/i.test(answer) ||
        /^cannot\s*read$/i.test(answer);
      if (unreadable) answer = '';
      let needsTeacher = row?.needsTeacher === true || !answer || unreadable;
      let note = typeof row?.note === 'string' && row.note.trim() ? row.note.trim() : undefined;
      const conf =
        typeof row?.confidence === 'number' && Number.isFinite(row.confidence)
          ? Math.max(0, Math.min(1, row.confidence))
          : undefined;
      if (conf != null && conf < 0.45) {
        needsTeacher = true;
        if (answer && conf < 0.3) {
          note = note || 'low confidence';
          answer = '';
        }
      }
      return {
        n: Number.isFinite(n) ? n : index + 1,
        stem,
        answer,
        points: Number.isFinite(Number(row?.points)) ? Number(row.points) : 1,
        needsTeacher,
        note,
        type,
        choices,
        unreadable: unreadable || undefined,
        confidence: conf,
      };
    })
    .filter((row) => row.stem || row.answer || row.needsTeacher)
    .slice(0, 40);
}

function markUnreadable(item, reason) {
  const note =
    item.note && !/unreadable|prompt|example|rubric/i.test(item.note) ? item.note : reason;
  return {
    ...item,
    answer: '',
    needsTeacher: true,
    unreadable: true,
    note,
  };
}

export function sanitizeKeyItems(items, opts = {}) {
  const list = Array.isArray(items) ? items.map((it) => ({ ...it })) : [];
  if (!list.length) return [];

  for (let i = 0; i < list.length; i += 1) {
    if (isRubricPlaceholderAnswer(list[i].answer)) {
      const prior = String(list[i].answer || '').trim();
      list[i] = {
        ...list[i],
        answer: '',
        needsTeacher: true,
        note: list[i].note || prior || 'see rubric',
      };
    }
  }

  for (let i = 0; i < list.length; i += 1) {
    if (isPromptExampleLeak(list[i])) {
      list[i] = markUnreadable(list[i], 'unreadable (prompt example suppressed)');
    }
  }

  const pageState = opts.pageState || 'unsure';
  const trivial = list.map((it) => isSolvedTrivialArithmetic(it));
  const trivialCount = trivial.filter(Boolean).length;
  const letterCount = list.filter((it) => /^[A-Ea-e]$/.test(String(it.answer || '').trim())).length;
  const ratio = list.length ? trivialCount / list.length : 0;
  const cluster =
    trivialCount >= 3 &&
    ratio >= 0.4 &&
    letterCount === 0 &&
    (pageState === 'filled' || pageState === 'unsure' || opts.forceArithmeticCluster);
  if (cluster) {
    for (let i = 0; i < list.length; i += 1) {
      if (trivial[i] || isPromptExampleLeak(list[i])) {
        const stem = String(list[i].stem || '').trim();
        const nOnly =
          !stem || SIMPLE_ADD_RE.test(stem) || SIMPLE_SUB_RE.test(stem) || SIMPLE_MUL_RE.test(stem);
        list[i] = {
          ...markUnreadable(list[i], 'unreadable'),
          stem: nOnly ? String(list[i].n) : stem,
          type: list[i].type || (nOnly ? 'mc' : list[i].type),
        };
      }
    }
  }

  const numAsAns = list.filter((it) => isAnswerEqualsItemNumber(it));
  if (numAsAns.length >= 3 && numAsAns.length / list.length >= 0.5) {
    for (let i = 0; i < list.length; i += 1) {
      if (isAnswerEqualsItemNumber(list[i])) {
        list[i] = markUnreadable(list[i], 'unreadable');
      }
    }
  }

  const byN = new Map();
  for (const it of list) {
    const n = Number(it.n);
    if (!Number.isFinite(n)) continue;
    const prev = byN.get(n);
    if (!prev) {
      byN.set(n, it);
      continue;
    }
    const prevAns = String(prev.answer || '').trim();
    const nextAns = String(it.answer || '').trim();
    if (!prevAns && nextAns) byN.set(n, it);
  }

  const ordered = [...byN.values()]
    .sort((a, b) => Number(a.n) - Number(b.n))
    .filter((it) => it.stem || it.answer || it.needsTeacher)
    .slice(0, 40);

  return ordered.map((it) => {
    let answer = String(it.answer || '').trim();
    const m = answer.match(/^([A-Ea-e])\s*[).:\-]\s*(.+)$/);
    if (m && m[2] && m[2].length <= 40) {
      if (it.type === 'mc' || /which|true\/false|\bmc\b|capital|choose/i.test(String(it.stem || ''))) {
        answer = m[1].toUpperCase();
      }
    }
    if (/^(true|false)$/i.test(answer)) {
      answer = answer.toLowerCase() === 'true' ? 'True' : 'False';
    }
    if (/^[Tt]$/.test(answer) && (it.type === 'mc' || /true|false|t\/f/i.test(String(it.stem || '')))) {
      answer = 'True';
    } else if (/^[Ff]$/.test(answer) && (it.type === 'mc' || /true|false|t\/f/i.test(String(it.stem || '')))) {
      answer = 'False';
    } else if (/^[Tt]$/.test(answer)) {
      answer = 'True';
    } else if (/^[Ff]$/.test(answer)) {
      answer = 'False';
    }
    // Bare "MC" is not an answer letter.
    if (/^mc$/i.test(answer)) {
      answer = '';
    }
    const needsTeacher = it.needsTeacher === true || !answer;
    return { ...it, answer, needsTeacher };
  });
}

export function finalizeAnswerKeyAnalysis(parsed, signature = {}) {
  let pageState = ['blank', 'filled', 'unsure'].includes(parsed?.pageState)
    ? parsed.pageState
    : 'unsure';
  let items = sanitizeKeyItems(parseKeyItemsFromModel(parsed?.items), { pageState });
  const header =
    typeof parsed?.header === 'string'
      ? parsed.header.replace(/\s+/g, ' ').trim()
      : signature.header || null;
  let teacherNote = typeof parsed?.teacherNote === 'string' ? parsed.teacherNote : null;
  const reject =
    parsed?.reject === true ||
    /not an answer key|not a key|wrong document|student work|syllabus|roster/i.test(
      String(teacherNote || '') + ' ' + String(header || ''),
    );

  if (reject) {
    return {
      pageState: 'unsure',
      header: header || null,
      items: [],
      maxScore: null,
      teacherNote: teacherNote || 'Not an answer key',
      reject: true,
      phash: signature.phash,
      layout: signature.layout,
    };
  }

  const answered = items.filter((it) => String(it.answer || '').trim()).length;
  if (pageState === 'blank' && answered >= 2 && /key|answer/i.test(String(header || ''))) {
    pageState = 'filled';
  }

  const unread = items.filter(
    (it) => it.unreadable || (it.needsTeacher && !String(it.answer || '').trim()),
  ).length;
  if (items.length >= 4 && unread / items.length >= 0.6 && !teacherNote) {
    teacherNote = 'Many items unreadable — check the photo and edit the key.';
  }

  const maxScore =
    typeof parsed?.maxScore === 'number'
      ? parsed.maxScore
      : items.reduce((sum, item) => sum + (item.points ?? 1), 0) || null;

  return {
    pageState,
    header: header || null,
    items,
    maxScore,
    teacherNote,
    reject: false,
    phash: signature.phash,
    layout: signature.layout,
  };
}
