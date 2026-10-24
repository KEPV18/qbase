import type { Locator } from '@playwright/test';

/**
 * The Quick-Jump record selector, located precisely.
 *
 * The e2e specs used `page.locator('select').first()`, which is a guess:
 * the sidebar renders project and month filters as `<select>` elements too,
 * so "the first select on the page" is the sidebar's, not the record
 * jump's.  The jump control carries a stable title, so target that.
 */
export const QUICK_JUMP = 'select[title="Jump to any record in this form"]';

/**
 * Select the `<option>` whose visible text contains `needle`.
 *
 * Playwright's `selectOption` accepts a `label` only as an EXACT string.
 * A regular expression is silently stringified, so
 * `selectOption({ label: /F\/40-002/ })` looks for an option literally
 * named `/F\/40-002/` and times out — the test fails for a reason that
 * has nothing to do with the app.
 *
 * The text is also the only stable handle: the Quick-Jump select numbers
 * its options by list position (`value` is the index, the text is
 * "3 — F/40-002"), so both the value and the index move whenever the
 * record set changes, while the serial in the text does not.
 */
export async function selectOptionByText(select: Locator, needle: string): Promise<void> {
  const index = await select.evaluate((el, wanted) => {
    const options = Array.from((el as HTMLSelectElement).options);
    return options.findIndex(o => (o.textContent || '').includes(wanted));
  }, needle);

  if (index < 0) {
    const found = await select.evaluate(
      el => Array.from((el as HTMLSelectElement).options).map(o => o.textContent || ''),
    );
    throw new Error(
      `No <option> whose text contains ${JSON.stringify(needle)}. Options: ${JSON.stringify(found)}`,
    );
  }

  await select.selectOption({ index });
}
