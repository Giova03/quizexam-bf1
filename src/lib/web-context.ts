/**
 * web-context.ts — Recherche web légère pour l'assistant QuizExam.
 *
 * Objectif : permettre à l'assistant de s'appuyer sur des données ACTUALISÉES
 * trouvées sur le web (encyclopédie, actualité, culture générale) sans clé
 * d'API payante ni tracker :
 *
 *   1. Wikipedia (fr puis en en repli) — recherche + résumé des premiers
 *      articles. Fiable, légal, sans clé.
 *   2. DuckDuckGo Instant Answer (api.duckduckgo.com) — définitions rapides
 *      et sujets liés. Sans clé.
 *
 * Propriétés :
 *   - 100 % best-effort : tout échec (réseau, timeout, parse) renvoie [] ;
 *     l'assistant répond alors avec ses connaissances internes.
 *   - Cache mémoire (TTL 30 min) pour ne pas marteler les API publiques.
 *   - Timeouts courts (3,5 s par source) : n'ajoute que peu de latence.
 *   - Sanitisation : les extraits sont tronqués et nettoyés (pas de HTML).
 */

export interface WebSource {
  title: string;
  url: string;
  snippet: string;
}

/* ------------------------------------------------------------------ */
/* Cache mémoire (TTL 30 min, max 200 entrées)                         */
/* ------------------------------------------------------------------ */

const CACHE_TTL_MS = 30 * 60 * 1000;
const CACHE_MAX_ENTRIES = 200;
const cache = new Map<string, { at: number; value: WebSource[] }>();

function cacheGet(key: string): WebSource[] | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}

function cacheSet(key: string, value: WebSource[]): void {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { at: Date.now(), value });
}

/* ------------------------------------------------------------------ */
/* Utilitaires                                                         */
/* ------------------------------------------------------------------ */

const SOURCE_TIMEOUT_MS = 3_500;
const SNIPPET_MAX_CHARS = 420;

function withTimeout(ms: number): { signal: AbortSignal } {
  return { signal: AbortSignal.timeout(ms) };
}

/** Nettoie un extrait : supprime le HTML, compacte les espaces, tronque. */
function cleanSnippet(raw: string, max = SNIPPET_MAX_CHARS): string {
  const cleaned = raw
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max).replace(/[\s,.;:]+\S*$/, "")}…`;
}

/** Mots utiles pour la recherche (stop-words fr minimal). */
const STOP_WORDS = new Set([
  "le", "la", "les", "un", "une", "des", "du", "de", "d", "l", "et", "ou",
  "à", "a", "au", "aux", "en", "dans", "sur", "pour", "par", "avec", "sans",
  "je", "tu", "il", "elle", "nous", "vous", "ils", "elles", "on", "ce", "cet",
  "cette", "ces", "qui", "que", "quoi", "comment", "pourquoi", "est", "sont",
  "me", "moi", "mon", "ma", "mes", "ton", "ta", "tes", "peux", "pouvoir",
  "explique", "dis", "donne", "parle", "fais", "veux", "salut", "bonjour",
]);

/** Extrait les mots-clés significatifs d'une question utilisateur. */
function extractKeywords(query: string): string {
  const words = query
    .normalize("NFC")
    .replace(/[?!.,;:«»"'()\[\]{}…]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w.toLowerCase()));
  return words.slice(0, 8).join(" ").trim();
}

/* ------------------------------------------------------------------ */
/* Source 1 — Wikipedia (fr → en repli)                                */
/* ------------------------------------------------------------------ */

async function searchWikipedia(
  query: string,
  lang: "fr" | "en",
): Promise<WebSource[]> {
  const endpoint =
    `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&origin=*` +
    `&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=2` +
    `&prop=extracts|info&inprop=url&exintro=1&explaintext=1&exchars=${SNIPPET_MAX_CHARS * 2}`;
  const data = (await (
    await fetch(endpoint, { ...withTimeout(SOURCE_TIMEOUT_MS), cache: "no-store" })
  ).json()) as {
    query?: {
      pages?: Record<
        string,
        { title?: string; extract?: string; fullurl?: string }
      >;
    };
  };
  const pages = data?.query?.pages ?? {};
  return Object.values(pages)
    .filter((p) => p.title && p.extract)
    .slice(0, 2)
    .map((p) => ({
      title: p.title as string,
      url:
        p.fullurl ??
        `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(p.title as string)}`,
      snippet: cleanSnippet(p.extract as string),
    }));
}

/* ------------------------------------------------------------------ */
/* Source 2 — DuckDuckGo Instant Answer                                */
/* ------------------------------------------------------------------ */

async function searchDuckDuckGo(query: string): Promise<WebSource[]> {
  const endpoint =
    `https://api.duckduckgo.com/?format=json&no_html=1&skip_disambig=1&q=` +
    encodeURIComponent(query);
  const data = (await (
    await fetch(endpoint, { ...withTimeout(SOURCE_TIMEOUT_MS), cache: "no-store" })
  ).json()) as {
    Abstract?: string;
    AbstractText?: string;
    AbstractURL?: string;
    Heading?: string;
    RelatedTopics?: Array<{ Text?: string; FirstURL?: string }>;
  };
  const out: WebSource[] = [];
  const abstract = data.AbstractText || data.Abstract;
  if (abstract && data.AbstractURL && data.Heading) {
    out.push({
      title: data.Heading,
      url: data.AbstractURL,
      snippet: cleanSnippet(abstract),
    });
  }
  for (const rt of (data.RelatedTopics ?? []).slice(0, 3)) {
    if (out.length >= 2) break;
    if (rt.Text && rt.FirstURL) {
      out.push({
        title: rt.Text.split(" - ")[0].slice(0, 80),
        url: rt.FirstURL,
        snippet: cleanSnippet(rt.Text),
      });
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* API publique                                                        */
/* ------------------------------------------------------------------ */

/**
 * Recherche web best-effort pour une question utilisateur.
 * Renvoie 0 à 4 sources ; [] si rien trouvé ou en cas d'échec.
 * @param lang préférence linguistique de l'utilisateur ("fr" | "en")
 */
export async function searchWebContext(
  question: string,
  lang: "fr" | "en" = "fr",
): Promise<WebSource[]> {
  const keywords = extractKeywords(question);
  if (!keywords || keywords.split(/\s+/).length === 0) return [];

  const cacheKey = `${lang}::${keywords.toLowerCase()}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const results: WebSource[] = [];
  const tryAdd = (sources: WebSource[]) => {
    for (const s of sources) {
      if (results.length >= 4) break;
      if (
        !results.some(
          (r) => r.url === s.url || r.title.toLowerCase() === s.title.toLowerCase(),
        )
      ) {
        results.push(s);
      }
    }
  };

  // Wikipedia dans la langue de l'utilisateur, puis l'autre en repli.
  try {
    tryAdd(await searchWikipedia(keywords, lang));
  } catch {
    /* best-effort */
  }
  if (results.length < 2 && lang !== "en") {
    try {
      tryAdd(await searchWikipedia(keywords, "en"));
    } catch {
      /* best-effort */
    }
  }
  // DuckDuckGo complète (définitions, sujets liés).
  try {
    tryAdd(await searchDuckDuckGo(keywords));
  } catch {
    /* best-effort */
  }

  cacheSet(cacheKey, results);
  return results;
}

/** Formate les sources en bloc de contexte injectable dans le system prompt. */
export function formatWebContext(sources: WebSource[]): string {
  if (sources.length === 0) return "";
  const lines = sources.map(
    (s, i) => `[S${i + 1}] ${s.title} — ${s.snippet} (source : ${s.url})`,
  );
  return (
    "\n\nCONTEXTE WEB ACTUALISÉ (recherche effectuée à l'instant — utilise ces " +
    "informations si elles sont pertinentes, cite les sources entre [S1], [S2]… " +
    "et signale si elles sont incomplètes) :\n" +
    lines.join("\n")
  );
}
