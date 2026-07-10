/**
 * Token display helper — the single source of truth for how token usage is
 * presented across Script Gen (results card + History). Mirrors the backend
 * Generation Cost Tracker's `formatTokens()` and encodes the null ≠ 0 rule so a
 * genuine no-LLM run shows a "Deterministic" badge, never a scary bare "0".
 */

/** Minimal shape of the backend's GenerationMetrics telemetry (all optional). */
export interface GenerationMetricsLike {
  llmCalls: number;
  totalTokens: number | null;
  cacheHit: boolean;
  provider?: string;
  model?: string;
}

export type TokenKind = 'ai' | 'deterministic' | 'unknown';

export interface TokenDisplay {
  /** Headline value, e.g. "1.7K", "Deterministic", "Unknown". */
  value: string;
  /** Small sub-label, e.g. "AI Tokens", "0 AI tokens · no LLM call". */
  sub: string;
  /** Coarse kind so callers can pick a colour/badge. */
  kind: TokenKind;
  /** Human tooltip explaining the number. */
  tooltip: string;
}

/** Format a raw count like the backend does: <1000 → "N", else "X.XK". */
export function formatAiTokens(total: number): string {
  if (total < 1000) return String(total);
  return `${(total / 1000).toFixed(1)}K`;
}

/**
 * Decide how to present token usage for a generation. Prefers the structured
 * GenerationMetrics telemetry when present; otherwise falls back to the legacy
 * (tokensUsed, model, tokenSource) heuristic so it works before the backend
 * tracker deploys.
 *
 * null ≠ 0: a `null` total means the provider reported no usage (unknown); `0`
 * with a deterministic signal means a genuine no-LLM run (cached/deterministic),
 * shown as a badge — never conflated.
 */
export function resolveTokenDisplay(opts: {
  tokensUsed?: number | null;
  model?: string | null;
  metrics?: GenerationMetricsLike | null;
  tokenSource?: string; // 'test-case-attributed' | 'llm'
}): TokenDisplay {
  const { metrics, tokensUsed, model, tokenSource } = opts;

  // 1. Structured telemetry wins when the backend provides it.
  if (metrics) {
    if (metrics.totalTokens == null) {
      return {
        value: 'Unknown',
        sub: 'no usage reported',
        kind: 'unknown',
        tooltip:
          'The AI provider did not return token usage for this generation, so the exact count is unknown — this is different from a genuine zero.',
      };
    }
    if (metrics.cacheHit || metrics.llmCalls === 0) {
      return {
        value: 'Deterministic',
        sub: '0 AI tokens · no LLM call',
        kind: 'deterministic',
        tooltip:
          'Generated deterministically (steps translated directly to code / served from cache), so no LLM tokens were spent.',
      };
    }
    const calls = `${metrics.llmCalls} LLM call${metrics.llmCalls === 1 ? '' : 's'}`;
    return {
      value: formatAiTokens(metrics.totalTokens),
      sub: `AI Tokens · ${calls}`,
      kind: 'ai',
      tooltip: `${metrics.totalTokens.toLocaleString()} AI tokens across ${calls} — captured from the provider's usage, never estimated.`,
    };
  }

  // 2. Legacy fallback (before the backend tracker deploys).
  const tokens = tokensUsed ?? 0;
  if (tokens > 0) {
    if (tokenSource === 'test-case-attributed') {
      return {
        value: formatAiTokens(tokens),
        sub: 'AI Tokens · from test case',
        kind: 'ai',
        tooltip:
          "This script's attributed share of its source test case's generation cost. Deterministic code generation itself spends 0 LLM tokens.",
      };
    }
    return {
      value: formatAiTokens(tokens),
      sub: 'AI Tokens',
      kind: 'ai',
      tooltip: `${tokens.toLocaleString()} AI tokens — captured from the provider's usage.`,
    };
  }

  // tokens === 0 → deterministic when the model says so; otherwise still honest.
  if (String(model || '').startsWith('deterministic')) {
    return {
      value: 'Deterministic',
      sub: '0 AI tokens · no LLM call',
      kind: 'deterministic',
      tooltip:
        'Generated deterministically from a structured test case — the steps were translated directly into code, so no LLM tokens were spent.',
    };
  }
  return {
    value: '0',
    sub: 'AI Tokens',
    kind: 'ai',
    tooltip: 'No LLM tokens were recorded for this generation.',
  };
}
