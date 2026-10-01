/**
 * ai-engine.ts — Moteur IA unifié multi-fournisseurs de QuizExam BF.
 *
 * PROBLÈME RÉSOLU : le SDK z-ai-web-dev-sdk lit une configuration depuis un
 * fichier `.z-ai-config` (cwd / $HOME / /etc). Ce fichier n'existe QUE dans
 * l'environnement de développement Z.ai — sur Vercel, `ZAI.create()` échoue
 * et toutes les routes IA retombaient sur des réponses scriptées.
 *
 * CHAÎNE DE PROVIDERS (le premier qui répond gagne) :
 *   1. "glm-sandbox" — SDK ZAI (fichier .z-ai-config) → GLM, utilisé par
 *      l'assistant, connecté « à lui-même » dans l'environnement Z.ai.
 *   2. "glm-env"     — endpoint ZAI-compatible via variables d'environnement
 *      ZAI_BASE_URL + ZAI_API_KEY (optionnel : ZAI_TOKEN, ZAI_CHAT_ID,
 *      ZAI_USER_ID). Permet de brancher le même GLM en production.
 *   3. "custom"      — endpoint OpenAI-compatible via AI_BASE_URL +
 *      AI_API_KEY + AI_MODEL (Groq, OpenRouter, DeepSeek, OpenAI…).
 *   4. "free"        — Pollinations anonyme (sans clé, best-effort).
 *
 * Toutes les routes IA de la plateforme (chat, tuteur, extraction QCM,
 * génération de questions) passent par `chatComplete()` : elles deviennent
 * résilientes en production et utilisent GLM dès qu'il est joignable.
 */

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export interface ChatOptions {
  /** Température d'échantillonnage (0-1). Défaut : 0.6. */
  temperature?: number;
  /** Timeout global par provider (ms). Défaut : 25 000. */
  timeoutMs?: number;
  /** Activer le raisonnement étendu (GLM thinking). Défaut : false. */
  thinking?: boolean;
}

export interface ChatResult {
  content: string;
  /** Nom du provider qui a répondu ("glm-sandbox" | "glm-env" | "custom" | "free"). */
  engine: string;
}

/* ------------------------------------------------------------------ */
/* Utilitaires                                                         */
/* ------------------------------------------------------------------ */

const DEFAULT_TIMEOUT = 25_000;

function timeoutSignal(ms: number): { signal: AbortSignal; clear: () => void } {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return { signal: ctrl.signal, clear: () => clearTimeout(t) };
}

/** Extrait le texte d'une réponse au format OpenAI-compatible. */
function pickContent(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const choices = (data as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const msg = (choices[0] as { message?: { content?: unknown } }).message;
  const content = msg?.content;
  if (typeof content === "string" && content.trim()) return content;
  return null;
}

async function fetchJsonWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<unknown | null> {
  const { signal, clear } = timeoutSignal(timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clear();
  }
}

/* ------------------------------------------------------------------ */
/* Provider 1 — GLM via SDK ZAI (fichier .z-ai-config)                 */
/* ------------------------------------------------------------------ */

async function tryGlmSandbox(
  messages: ChatMessage[],
  opts: ChatOptions,
): Promise<ChatResult | null> {
  try {
    const mod = await import("z-ai-web-dev-sdk");
    const ZAI = (mod as { default?: unknown }).default ?? mod;
    const create = (ZAI as { create?: () => Promise<unknown> }).create;
    if (typeof create !== "function") return null;
    const zai = (await create()) as {
      chat: {
        completions: {
          create: (body: unknown) => Promise<{
            choices?: Array<{ message?: { content?: string } }>;
          }>;
        };
      };
    };
    const completion = await zai.chat.completions.create({
      messages,
      thinking: { type: opts.thinking ? "enabled" : "disabled" },
    });
    const content = completion?.choices?.[0]?.message?.content ?? "";
    if (content.trim()) return { content, engine: "glm-sandbox" };
    return null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Provider 2 — GLM via variables d'environnement (Vercel-ready)       */
/* ------------------------------------------------------------------ */

async function tryGlmEnv(
  messages: ChatMessage[],
  opts: ChatOptions,
): Promise<ChatResult | null> {
  const baseUrl = process.env.ZAI_BASE_URL;
  const apiKey = process.env.ZAI_API_KEY;
  if (!baseUrl || !apiKey) return null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
    "X-Z-AI-From": "Z",
  };
  if (process.env.ZAI_CHAT_ID) headers["X-Chat-Id"] = process.env.ZAI_CHAT_ID;
  if (process.env.ZAI_USER_ID) headers["X-User-Id"] = process.env.ZAI_USER_ID;
  if (process.env.ZAI_TOKEN) headers["X-Token"] = process.env.ZAI_TOKEN;

  const data = await fetchJsonWithTimeout(
    `${baseUrl.replace(/\/+$/, "")}/chat/completions`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        messages,
        temperature: opts.temperature ?? 0.6,
        thinking: { type: opts.thinking ? "enabled" : "disabled" },
      }),
    },
    opts.timeoutMs ?? DEFAULT_TIMEOUT,
  );
  const content = pickContent(data);
  return content ? { content, engine: "glm-env" } : null;
}

/* ------------------------------------------------------------------ */
/* Provider 3 — Endpoint OpenAI-compatible (Groq / OpenRouter / etc.)  */
/* ------------------------------------------------------------------ */

async function tryCustomProvider(
  messages: ChatMessage[],
  opts: ChatOptions,
): Promise<ChatResult | null> {
  const baseUrl = process.env.AI_BASE_URL;
  const apiKey = process.env.AI_API_KEY;
  if (!baseUrl || !apiKey) return null;
  const model = process.env.AI_MODEL || "gpt-4o-mini";

  const data = await fetchJsonWithTimeout(
    `${baseUrl.replace(/\/+$/, "")}/chat/completions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: opts.temperature ?? 0.6,
      }),
    },
    opts.timeoutMs ?? DEFAULT_TIMEOUT,
  );
  const content = pickContent(data);
  return content ? { content, engine: "custom" } : null;
}

/* ------------------------------------------------------------------ */
/* Provider 4 — Pollinations anonyme (sans clé, best-effort)           */
/* ------------------------------------------------------------------ */

async function tryFreeProvider(
  messages: ChatMessage[],
  opts: ChatOptions,
): Promise<ChatResult | null> {
  // Convertit le rôle "system" en "assistant" (format attendu par le
  // service anonyme) tout en conservant l'ordre.
  const mapped = messages.map((m) => ({
    role: m.role === "system" ? "assistant" : m.role,
    content: m.content,
  }));
  const data = await fetchJsonWithTimeout(
    "https://text.pollinations.ai/openai",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai",
        messages: mapped,
        temperature: opts.temperature ?? 0.6,
      }),
    },
    Math.min(opts.timeoutMs ?? DEFAULT_TIMEOUT, 14_000),
  );
  const content = pickContent(data);
  return content ? { content, engine: "free" } : null;
}

/* ------------------------------------------------------------------ */
/* API publique                                                        */
/* ------------------------------------------------------------------ */

/**
 * Envoie une conversation au premier provider IA disponible.
 * Retourne null si TOUS les providers échouent (l'appelant applique alors
 * son repli local : réponses scriptées, question de secours…).
 */
export async function chatComplete(
  messages: ChatMessage[],
  opts: ChatOptions = {},
): Promise<ChatResult | null> {
  const chain: Array<
    (m: ChatMessage[], o: ChatOptions) => Promise<ChatResult | null>
  > = [tryGlmSandbox, tryGlmEnv, tryCustomProvider, tryFreeProvider];

  for (const step of chain) {
    const result = await step(messages, opts);
    if (result && result.content.trim()) return result;
  }
  return null;
}

/**
 * Liste les providers configurés (diagnostic — ex. page /api/health).
 */
export function describeAiEngines(): { engine: string; ready: boolean }[] {
  return [
    { engine: "glm-sandbox", ready: true },
    {
      engine: "glm-env",
      ready: Boolean(process.env.ZAI_BASE_URL && process.env.ZAI_API_KEY),
    },
    {
      engine: "custom",
      ready: Boolean(process.env.AI_BASE_URL && process.env.AI_API_KEY),
    },
    { engine: "free", ready: true },
  ];
}
