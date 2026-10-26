// ============================================================================
// QBase — Where a form's table actually lives
//
// The catalogue and the document were two independent descriptions of the
// same form, and for eight forms they did not agree on the NAME of the
// table:
//
//   F/13  the catalogue says `items`      the document writes `items_table`
//   F/15  the catalogue says nothing      the document writes `items`
//   F/23  the catalogue says nothing      the document writes `records`
//   F/24  the catalogue says `items`      the document writes `objectives`
//   F/25  the catalogue says `agenda`     the document writes `audit_matrix`
//   F/45  the catalogue says nothing      the document writes `documents`
//   F/50  the catalogue says `items`      the document writes `entries`
//
// The consequence was not cosmetic: the catalogue's table was ALWAYS EMPTY
// and the document's table was ALWAYS UNDECLARED, so every table-driven
// feature — the compare page, the export, the schema view — read a table
// that no record has ever held.
//
// The fix is an ALIAS LAYER, not a migration.  The catalogue now names the
// table the DOCUMENT writes, and the key a record may also hold is declared
// as an alias.  Nothing is rewritten: a record that holds `items` is read
// through the alias, and a record that holds `items_table` is read through
// the canonical key.  Both keep their own key, and an edit is written back
// under the key the record already used — so no data moves, and no data
// disappears.
//
// THE RULE FOR THE WRITE PATH: the key a record already holds is the key it
// keeps.  A new record — one that holds neither — gets the canonical key.
// ============================================================================

import { coerceTableRows } from "@/lib/tableRows";

/** The part of a schema field this module needs. */
export interface TableFieldLike {
  key: string;
  type?: string;
  /** Other keys the same value may be stored under. */
  aliasKeys?: string[];
}

/** A record's data, or nothing. */
type Source = Record<string, unknown> | undefined | null;

/**
 * The keys a field's value may be stored under: its own key first, then its
 * aliases.  The order matters — the canonical key is the one a NEW record
 * gets, and the aliases are the ones older records happen to carry.
 */
export function fieldStorageKeys(field: TableFieldLike): string[] {
  return [field.key, ...(field.aliasKeys ?? [])].filter(
    (key, index, all) => typeof key === "string" && key.length > 0 && all.indexOf(key) === index,
  );
}

/**
 * The key this field's value is actually stored under in these records.
 *
 * The first key that is PRESENT wins — a key that is present but empty is
 * still where the value lives, and writing an empty value back under a
 * different key would split one table into two.
 */
export function effectiveFieldKey(field: TableFieldLike, ...sources: Source[]): string {
  for (const key of fieldStorageKeys(field)) {
    for (const source of sources) {
      if (source && source[key] !== undefined) return key;
    }
  }
  return field.key;
}

/**
 * The value of a field, wherever it happens to be stored.
 *
 * The sources are read in order, so the caller decides the precedence: the
 * record's own `form_data` first, then the top level of the record.
 */
export function readFieldValue(field: TableFieldLike, ...sources: Source[]): unknown {
  for (const key of fieldStorageKeys(field)) {
    for (const source of sources) {
      if (source && source[key] !== undefined) return source[key];
    }
  }
  return undefined;
}

/**
 * The rows of a table field, wherever they happen to be stored.
 *
 * A table stored as a JSON string — what the pre-wave-6 templates wrote —
 * is parsed, so the rows are shown instead of 25 blank ones.
 */
export function readTableRows(
  field: TableFieldLike,
  ...sources: Source[]
): Record<string, unknown>[] {
  const raw = readFieldValue(field, ...sources);
  const rows = coerceTableRows(raw);
  if (!rows) return [];
  return rows.filter((row): row is Record<string, unknown> => typeof row === "object" && row !== null);
}
