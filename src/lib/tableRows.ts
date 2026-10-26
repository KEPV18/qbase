// ============================================================================
// QBase — A table, whatever shape the record stored it in
//
// A table's value in `form_data` is a JSONB array of row objects — but a
// LEGACY row (written by the pre-wave-6 templates, or by an import or an
// external script) can hold the same array as a JSON STRING.  The old
// `parseRows` in every template accepted only an array, so a table stored as
// a string fell through to the "no rows" branch and rendered 25 BLANK rows:
// the data was in the record, the form refused to show it, and saving the
// form then wrote those 25 blank rows over it.
//
// The rule is one line: an array is used as it is; a string is parsed when it
// parses to an array; anything else means "there is genuinely nothing to
// show" and the caller falls back to its empty rows.
//
// It lives here, and not in the form kit, because the schema layer needs it
// too: the catalogue has to read the same rows the documents write.
// ============================================================================

/**
 * The rows of a table, from whatever the record holds.
 *
 * - an array is returned as it is
 * - a JSON string that holds an array is parsed and returned
 * - anything else returns `null`, which means "there is nothing to show"
 */
export function coerceTableRows(raw: unknown): unknown[] | null {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed.startsWith("[")) return null;
    try {
      const parsed: unknown = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}
