// ============================================================================
// QBase — AI content parsing helpers (Prime §D5)
// ---------------------------------------------------------------------------
// The relay returns plain text. Tools that need a structured payload ask the
// model for a single JSON object and parse it here — with an honest error
// (never a silent fabricated default) when the model produced unparseable
// output.
// ============================================================================

/**
 * Extract the first JSON object embedded in AI text (the model may wrap it in
 * prose or a ```json fence). Throws a readable error when none parses.
 */
export function parseAiJsonObject<T>(content: string): T {
  if (!content || !content.trim()) {
    throw new Error('AI returned an empty response — cannot build a proposal.');
  }

  // Fast path: the whole response is a JSON object.
  const trimmed = content.trim();
  try {
    const direct = JSON.parse(trimmed);
    if (direct && typeof direct === 'object' && !Array.isArray(direct)) {
      return direct as T;
    }
  } catch {
    // fall through to fence/brace extraction
  }

  // Preferred: a fenced ```json block.
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidates: string[] = [];
  if (fenced?.[1]) candidates.push(fenced[1].trim());
  // Fallback: outermost brace span.
  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first !== -1 && last > first) candidates.push(trimmed.slice(first, last + 1));

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as T;
      }
    } catch {
      // try the next candidate
    }
  }

  throw new Error(
    'AI response did not contain a parseable JSON object — regenerate or draft the content manually.'
  );
}