/**
 * qcm-parser.ts — Parseur QCM déterministe « sans failles ».
 *
 * Extrait des questions à choix multiples depuis du texte brut issu d'un
 * copier-coller, d'un PDF ou d'un document Word. Conçu pour absorber les
 * formats réellement rencontrés (manuellement, examens burkinabè, exports
 * Word/PDF chaotiques) :
 *
 *   NUMÉROTATION DES QUESTIONS
 *     « 1. » « 1) » « 1- » « 1 : » « Q1. » « Ques. 1 : » « Question 1 : »
 *     « N°1 » « n° 1) » — et les questions SANS numéro (ligne finissant
 *     par « ? » ou « : ») — plus les sauts « Exercice 2 » / « Partie II ».
 *
 *   OPTIONS
 *     « a) » « A. » « (a) » « a- » « a: » « R1 : » « 1. » (options
 *     numérotées) « I. II. III. IV. » (romains) — et PLUSIEURS OPTIONS
 *     SUR UNE MÊME LIGNE (« A) xx B) yy C) zz D) ww »).
 *
 *   BONNES RÉPONSES
 *     • ligne dédiée : « Réponse: a » « Rép : A » « La réponse est B »
 *       « Bonne réponse : C » « Réponse correcte : D » « Correction: B »
 *       « Answer: A » — lettre seule sur sa propre ligne — réponse par
 *       NUMÉRO d'option (« Réponse : 2 »).
 *     • marquage EN LIGNE : ✅ ✔ ✓ ☑ ✗-inverse, « * », « (x) »,
 *       « (correct) », « (vrai) », « (juste) », « **gras** ».
 *     • CORRIGÉ GLOBAL en fin de document : « RÉPONSES » / « CORRIGÉ »
 *       suivi de « 1. A 2. C » / « 1-A 2-C » / « 1) A » ...
 *
 *   EXPLICATIONS
 *     « Explication: » « Justification: » « Raisonnement: »
 *     « Commentaire: » « Explanation: » « → ».
 */

export interface ParsedQuestion {
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string; // "A" | "B" | "C" | "D"
  explanation: string;
  warnings: string[];
}

/* ------------------------------------------------------------------ */
/* Normalisation du texte source                                       */
/* ------------------------------------------------------------------ */

/** Liste (listes à puces/numéros de page) → nettoyage non destructif. */
export function normalizeSource(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ") // espaces insécables
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\f/g, "\n")
    // Pieds de page « Page 3/12 », « - 4 - » isolés
    .replace(/^\s*(?:page\s*)?\d{1,3}\s*(?:\/|sur)\s*\d{1,3}\s*$/gim, "")
    .replace(/^\s*[-–—]\s*\d{1,3}\s*[-–—]\s*$/gm, "")
    .split("\n")
    .map((l) => l.replace(/[ \t]+/g, " ").trimEnd())
    .join("\n");
}

/* ------------------------------------------------------------------ */
/* Expressions                                                         */
/* ------------------------------------------------------------------ */

/** Options : lettre (a-d), chiffre (1-9), romain (I-V). */
const OPT_PREFIX =
  "(?:\\(?([a-dA-D]|[1-9]|[iIvV]{1,4})[\\)\\.\\-:\\]]|\\(([a-dA-D])\\)|([iIvV]{1,4})[\\)\\.])";

/** Ligne option → (marqueur brut, lettre canonique provisoire, texte). */
const OPTION_LINE_RE = new RegExp(`^\\s*(?:${OPT_PREFIX})\\s*(.*)$`, "u");

/**
 * Question numérotée : « 1. », « Q1) », « Question 3 : », « N°2 - » …
 * Le préfixe lettre/romain est volontairement exclu (ce sont des options).
 */
const QUESTION_LINE_RE =
  /^\s*(?:(?:q(?:uestion)?|ques|exo|exercice|n[o°]?|num(?:ero)?)\s*[.\-:]?\s*)?(\d{1,3})\s*[\)\.\-:]\s*(.+)$/i;

/** Question romaine « I. » utilisée comme NUMÉRO de question (rare). */
const ROMAN_QUESTION_RE = /^\s*(?:question\s*)?([iI]{1,3})\s*[\)\.\-:]\s*(.+)$/;

/** Ligne question sans numéro : finit par « ? » ou « : ». */
const UNNUMBERED_Q_RE = /^(.+[?:])\s*$/u;

const ANSWER_LINE_RE =
  /^\s*(?:r(?:é|e)ponse(?:s)?\s*(?:correcte|exacte|bonne)?|r(?:é|e)p|bonne\s+r(?:é|e)ponse|la\s+(?:bonne\s+)?r(?:é|e)ponse\s+est|correct\s+answer|answer|correction)\s*(?:est)?\s*[:\-–]?\s*([a-dA-D1-9])\b[\s\S]*$/i;

/** Lettre isolée (« B ») en fin de groupe d'options. */
const BARE_LETTER_RE = /^\s*[([]?([a-dA-D])[).\]]?\s*:?\s*$/;

const EXPL_LINE_RE =
  /^\s*(?:explication|justification|raisonnement|raison|commentaire|explanation|note|pourquoi)\s*[:\-–]?\s*(.*)$/i;

const INLINE_MARKERS: RegExp[] = [
  /\s*[\u2705]\s*$/u, // ✅
  /\s*[\u2714\u2713\u2611]\uFE0F?\s*$/u, // ✔ ✓ ☑
  /\s*\u2716\uFE0F?\s*$/u, // ✖ (jamais correct — ignoré)
  /\s*\(x\)\s*$/i,
  /\s*\(correct(?:e)?\)\s*$/i,
  /\s*\(vrai\)\s*$/i,
  /\s*\(juste\)\s*$/i,
  /\s*\(bonne(?:\s+r(?:é|e)ponse)?\)\s*$/i,
  /\s*\*\s*$/,
];

/** Séparateur de corrigé global : « 1. A », « 1 - A », « 1) A », « 12 : A ». */
const KEY_ITEM_RE = /(\d{1,3})\s*[\)\.\-:]\s*([a-dA-D])\b/g;

/** En-tête de corrigé global. */
const KEY_HEADER_RE =
  /^\s*(?:r(?:é|e)ponses?\s*(?:au\s*q(?:uiz|uestionnaire))?|corr(?:i|e)g(?:é|e)|correction|answer\s*key|cl(?:é|e)\s+des\s+r(?:é|e)ponses)\s*:?\s*$/i;

const SECTION_HEADER_RE =
  /^\s*(?:exercice|partie|s(?:é|e)rie|chapitre|section|test|sujet)\s*(?:n[o°]\s*)?\d{0,3}\s*[:\-–]?\s*(?:.*)?$/i;

/* ------------------------------------------------------------------ */
/* Aides                                                               */
/* ------------------------------------------------------------------ */

const ROMAN_TO_LETTER: Record<string, string> = {
  i: "A", ii: "B", iii: "C", iv: "D", v: "E",
  I: "A", II: "B", III: "C", IV: "D", V: "E",
};

function stripInlineMarker(s: string): { text: string; marked: boolean } {
  let marked = false;
  let out = s.trim();
  // **gras** autour de toute l'option
  const bold = out.match(/^\*\*(.+)\*\*$/u);
  if (bold) {
    marked = true;
    out = bold[1].trim();
  }
  for (const re of INLINE_MARKERS) {
    if (re.test(out)) {
      // ✖ n'est jamais un marqueur de bonne réponse
      if (re.source.includes("\\u2716")) continue;
      marked = true;
      out = out.replace(re, "").trimEnd();
    }
  }
  return { text: out.trim(), marked };
}

/** Lettre canonique d'un marqueur d'option : a→A, 2→B (2ᵉ option), ii→B. */
function canonicalLetter(token: string, numericIndexBase = 0): string | null {
  const t = token.trim();
  if (/^[a-dA-D]$/.test(t)) return t.toUpperCase();
  if (/^[1-9]$/.test(t)) {
    const idx = parseInt(t, 10) - 1 + numericIndexBase;
    return idx >= 0 && idx <= 3 ? "ABCD"[idx] : null;
  }
  if (/^[iIvV]{1,4}$/.test(t)) {
    const L = ROMAN_TO_LETTER[t] ?? ROMAN_TO_LETTER[t.toLowerCase()];
    return L && L !== "E" ? L : null;
  }
  return null;
}

/** Découpe une ligne contenant plusieurs options : « A) xx B) yy C) zz ». */
function splitInlineOptions(
  line: string,
): Array<{ letter: string; text: string }> {
  const markerGlobal = new RegExp(
    `(?:^|\\s)\\(?([a-dA-D])\\)\\s*|\\s+\\(?([a-dA-D])[\\.]\\s+`,
    "gu",
  );
  const hits: Array<{ idx: number; len: number; letter: string }> = [];
  for (const m of line.matchAll(markerGlobal)) {
    const letter = (m[1] ?? m[2] ?? "").toUpperCase();
    if (!letter) continue;
    hits.push({ idx: m.index, len: m[0].length, letter });
  }
  if (hits.length < 2) return [];
  const out: Array<{ letter: string; text: string }> = [];
  for (let i = 0; i < hits.length; i++) {
    const start = hits[i].idx + hits[i].len;
    const end = i + 1 < hits.length ? hits[i + 1].idx : line.length;
    const text = line.slice(start, end).trim();
    if (text) out.push({ letter: hits[i].letter, text });
  }
  return out.every((o) => o.text.length > 0) ? out : [];
}

/* ------------------------------------------------------------------ */
/* Corrigé global (bloc « RÉPONSES » en fin de document)               */
/* ------------------------------------------------------------------ */

interface ExtractedKey {
  key: Map<number, string>;
  /** Texte sans le bloc de corrigé. */
  body: string;
}

function extractAnswerKey(raw: string): ExtractedKey {
  const lines = raw.split("\n");
  const key = new Map<number, string>();

  // Parcours du bas vers le haut : le corrigé est presque toujours à la fin.
  let headerIdx = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (KEY_HEADER_RE.test(lines[i])) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) return { key, body: raw };

  // Collecte les items sur l'en-tête lui-même + jusqu'à 12 lignes sous lui,
  // en s'arrêtant dès 2 lignes consécutives sans item.
  let buffer = lines[headerIdx].replace(KEY_HEADER_RE, "");
  let misses = 0;
  for (let i = headerIdx + 1; i < lines.length && misses < 2; i++) {
    const before = countKeyItems(buffer);
    buffer += " " + lines[i];
    const after = countKeyItems(buffer);
    if (after === before) misses++;
    else misses = 0;
  }
  for (const m of buffer.matchAll(KEY_ITEM_RE)) {
    const num = parseInt(m[1], 10);
    const L = m[2].toUpperCase();
    if (!key.has(num)) key.set(num, L);
  }

  const body = [...lines.slice(0, headerIdx), ...lines.slice(headerIdx + 1)]
    .filter((l) => !KEY_HEADER_RE.test(l) || false)
    .join("\n");
  // corps = tout sauf le bloc corrigé (en-tête + lignes collectées)
  const consumed = new Set<number>([headerIdx]);
  for (let i = headerIdx + 1; i < lines.length; i++) {
    if (!consumed.has(i)) {
      // Les lignes sous le corrigé appartiennent au bloc tant qu'elles
      // contiennent des items ou sont vides — arrêt au premier contenu
      // riche sans item (géré par misses ci-dessus pour la collecte ; ici
      // on retire uniquement les lignes qui contiennent des items).
      if (lines[i].match(KEY_ITEM_RE)) consumed.add(i);
      else if (lines[i].trim() === "") consumed.add(i);
    }
  }
  const cleaned = lines.filter((_, i) => !consumed.has(i)).join("\n");
  void body;
  return { key, body: cleaned || raw };
}

function countKeyItems(s: string): number {
  return [...s.matchAll(KEY_ITEM_RE)].length;
}

/* ------------------------------------------------------------------ */
/* Parseur principal                                                   */
/* ------------------------------------------------------------------ */

interface Draft {
  number: number | null;
  question: string;
  options: Partial<Record<"A" | "B" | "C" | "D", string>>;
  markedOption: "A" | "B" | "C" | "D" | null;
  answerLine: string | null;
  explanation: string;
  explanationPending: boolean;
  numericOptions: boolean;
  nextOptionIdx: number; // prochaine option attendue (mode numérique/romain)
}

function newDraft(): Draft {
  return {
    number: null,
    question: "",
    options: {},
    markedOption: null,
    answerLine: null,
    explanation: "",
    explanationPending: false,
    numericOptions: false,
    nextOptionIdx: 0,
  };
}

function optionCount(d: Draft): number {
  return (["A", "B", "C", "D"] as const).filter((L) => d.options[L]).length;
}

function looksComplete(d: Draft): boolean {
  return d.question.trim().length > 0 && optionCount(d) >= 2;
}

/**
 * Parse le texte brut → ParsedQuestion[].
 * `externalKey` : corrigé global détecté (numéro → lettre).
 */
export function parseQcmTextSmart(
  rawInput: string,
  externalKey?: Map<number, string>,
): ParsedQuestion[] {
  const { key, body } = externalKey
    ? { key: externalKey, body: rawInput }
    : extractAnswerKey(normalizeSource(rawInput));
  const lines = body.split("\n");

  const drafts: Draft[] = [];
  let cur: Draft | null = null;

  function push() {
    if (cur && looksComplete(cur)) drafts.push(cur);
    cur = null;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const t = line.trim();
    if (!t) continue;

    /* ---- 1. Ligne réponse dédiée ---------------------------------- */
    const aMatch = t.match(ANSWER_LINE_RE);
    if (aMatch && cur) {
      const tok = aMatch[1];
      const L =
        /^[a-dA-D]$/.test(tok) && cur.numericOptions
          ? null
          : canonicalLetter(tok);
      // « Réponse : 2 » → 2ᵉ option de la question
      const byNumber = /^[1-9]$/.test(tok)
        ? "ABCD"[parseInt(tok, 10) - 1]
        : null;
      cur.answerLine = L ?? byNumber ?? cur.answerLine;
      cur.explanationPending = false;
      continue;
    }

    /* ---- 2. Ligne explication ------------------------------------- */
    const eMatch = t.match(EXPL_LINE_RE);
    if (eMatch && cur) {
      cur.explanationPending = true;
      if (eMatch[1]) cur.explanation = eMatch[1].trim();
      continue;
    }

    /* ---- 3. Options multiples sur une même ligne ------------------ */
    const inlineOpts = splitInlineOptions(t);
    if (inlineOpts.length >= 3 && cur) {
      for (const o of inlineOpts) {
        const L = canonicalLetter(o.letter);
        if (L) {
          const { text, marked } = stripInlineMarker(o.text);
          cur.options[L as "A" | "B" | "C" | "D"] = text;
          if (marked) cur.markedOption = L as "A" | "B" | "C" | "D";
          cur.nextOptionIdx = Math.max(
            cur.nextOptionIdx,
            "ABCD".indexOf(L) + 1,
          );
        }
      }
      continue;
    }

    /* ---- 4. Ligne option simple ----------------------------------- */
    const oMatch = t.match(OPTION_LINE_RE);
    if (oMatch && cur) {
      const token = oMatch[1] ?? oMatch[2] ?? oMatch[3] ?? "";
      const rest = oMatch[4] ?? "";
      // Numérotée « 1. » : option SI le contexte attend des options
      // numériques (déjà amorcées, ou énoncé finissant par « ? »/« : »).
      // Sinon → c'est la QUESTION SUIVANTE (cas « 2. Qui est... » après
      // une question à options a-d) : on n'écrase JAMAIS l'option B.
      const isNumeric = /^[1-9]$/.test(token);
      if (isNumeric && !cur.numericOptions) {
        if (optionCount(cur) === 0 && /[?:]\s*$/.test(cur.question.trim())) {
          cur.numericOptions = true;
        } else {
          push();
          cur = newDraft();
          cur.number = parseInt(token, 10);
          cur.question = rest.trim();
          continue;
        }
      }
      const L = canonicalLetter(token);
      if (L) {
        const { text, marked } = stripInlineMarker(rest);
        cur.options[L as "A" | "B" | "C" | "D"] = text;
        if (isNumeric) cur.numericOptions = true;
        if (marked) cur.markedOption = L as "A" | "B" | "C" | "D";
        cur.nextOptionIdx = Math.max(cur.nextOptionIdx, "ABCD".indexOf(L) + 1);
        cur.explanationPending = false;
        continue;
      }
    }

    /* ---- 5. Question numérotée ------------------------------------ */
    const qMatch = t.match(QUESTION_LINE_RE);
    if (qMatch) {
      const num = parseInt(qMatch[1], 10);
      const text = qMatch[2].trim();
      // Numéro correspondant au corrigé global → forte signature question.
      const isLikelyQuestion =
        (key.size > 0 && key.has(num)) ||
        /^(q(?:uestion)?\b|n[o°])/i.test(t) ||
        !cur || // pas de question en cours
        optionCount(cur) >= 2 || // question courante déjà garnie
        (cur && cur.answerLine !== null);
      if (isLikelyQuestion) {
        push();
        cur = newDraft();
        cur.number = num;
        cur.question = text;
        continue;
      }
    }

    /* ---- 6. Question romaine (rare) ------------------------------- */
    const rMatch = t.match(ROMAN_QUESTION_RE);
    if (rMatch && (!cur || optionCount(cur) >= 2)) {
      push();
      cur = newDraft();
      cur.question = rMatch[2].trim();
      continue;
    }

    /* ---- 7. Question sans numéro (finit par ? ou :) --------------- */
    const uMatch = t.match(UNNUMBERED_Q_RE);
    if (uMatch && (!cur || optionCount(cur) >= 2 || cur.answerLine)) {
      // Nouvelle question uniquement si celle en cours est garnie — sinon
      // c'est une continuation d'énoncé.
      if (!cur || optionCount(cur) >= 2 || cur.answerLine !== null) {
        push();
        cur = newDraft();
        cur.question = t;
        continue;
      }
    }

    /* ---- 8. Lettre isolée (« B ») --------------------------------- */
    const bare = t.match(BARE_LETTER_RE);
    if (bare && cur && optionCount(cur) >= 2) {
      cur.answerLine = bare[1].toUpperCase();
      continue;
    }

    /* ---- 9. En-tête de section / contenu orphelin ----------------- */
    if (SECTION_HEADER_RE.test(t) && (!cur || !looksComplete(cur))) {
      continue; // saut de section : ignoré
    }

    /* ---- 10. Continuation ----------------------------------------- */
    if (cur) {
      if (cur.explanationPending) {
        cur.explanation = (cur.explanation + " " + t).trim();
      } else if (optionCount(cur) === 0) {
        cur.question = (cur.question + " " + t).trim();
      } else {
        // Suite d'une option multi-ligne (PDF/Word coupent souvent les
        // options sur deux lignes) → dernier alinéa posé.
        const letters = (["A", "B", "C", "D"] as const).filter(
          (L) => cur!.options[L],
        );
        const last = letters[letters.length - 1];
        if (last) cur.options[last] = (cur.options[last] + " " + t).trim();
        else cur.question = (cur.question + " " + t).trim();
      }
    } else if (t.length > 25 && /\?\s*$/.test(t)) {
      // Question orpheline avant tout draft.
      cur = newDraft();
      cur.question = t;
    }
  }
  push();

  /* ---- Matérialisation + corrigé global --------------------------- */
  const questions: ParsedQuestion[] = [];
  for (const d of drafts) {
    const letters = ["A", "B", "C", "D"] as const;
    let correct = d.answerLine ?? d.markedOption ?? "";
    if (!correct && d.number !== null && key.has(d.number)) {
      correct = key.get(d.number)!;
    }
    if (!correct) {
      // Dernière chance : corrigé par ordre (question n° → entrée n°).
      if (key.size > 0 && d.number === null) {
        const idx = questions.length + 1;
        correct = key.get(idx) ?? "";
      }
    }
    const warnings: string[] = [];
    if (!correct) {
      correct = "A";
      warnings.push("Réponse correcte non détectée — définie sur A (à vérifier)");
    }

    const opts: Record<string, string> = {};
    for (const L of letters) {
      const rawOpt = d.options[L] ?? "";
      const { text } = stripInlineMarker(rawOpt);
      opts[L] = text;
    }

    const q: ParsedQuestion = {
      question: d.question.trim(),
      optionA: opts.A,
      optionB: opts.B,
      optionC: opts.C,
      optionD: opts.D,
      correctAnswer: correct.toUpperCase(),
      explanation: d.explanation.trim(),
      warnings,
    };

    if (letters.some((L) => !q[`option${L}` as "optionA"].trim())) {
      warnings.push("Une ou plusieurs options sont vides");
    }
    const filled = letters
      .map((L) => q[`option${L}` as "optionA"].trim().toLowerCase())
      .filter(Boolean);
    if (filled.length === 4 && new Set(filled).size < 4) {
      warnings.push("Options dupliquées détectées");
    }
    if (!q.explanation) warnings.push("Explication manquante");

    questions.push(q);
  }

  return questions;
}
