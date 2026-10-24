// ============================================================================
// QBase — the e2e credentials, read from the environment
// ============================================================================
//
// These specs used to fill the login form with an account's e-mail address
// and its password written literally into the source file.  That put a LIVE
// credential into the repository — and into its history, where changing the
// file does not remove it.
//
// The credential now comes from the environment:
//
//     E2E_EMAIL=...            the account the specs sign in with
//     E2E_PASSWORD=...         its password
//
// Either export them in the shell, or put them in a `.env.e2e` file next to
// `package.json` (git-ignored — see `.gitignore`).  Nothing is printed and
// nothing is defaulted: a missing credential is a hard error, because a
// default would be a credential in the source file again.
//
// The password for the account this replaced has to be treated as exposed
// and rotated.  A credential that was ever in a repository has to be
// rotated, not just moved.
// ============================================================================

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/** Load `.env.e2e` if it is there.  Playwright does not read it for us. */
function loadLocalEnvFile(): void {
  if (typeof process.loadEnvFile !== 'function') return;
  const file = resolve(process.cwd(), '.env.e2e');
  if (!existsSync(file)) return;
  try {
    process.loadEnvFile(file);
  } catch {
    // Deliberately swallowed: the check below produces a better message
    // than a parse error, and a malformed file is a setup problem, not a
    // reason to abort the whole run with a stack trace.
  }
}

loadLocalEnvFile();

const email = process.env.E2E_EMAIL?.trim();
const password = process.env.E2E_PASSWORD;

if (!email || !password) {
  throw new Error(
    'The e2e suite needs a sign-in account.\n' +
      '  Set E2E_EMAIL and E2E_PASSWORD in the environment, or put them in a\n' +
      '  .env.e2e file next to package.json:\n' +
      '\n' +
      '      E2E_EMAIL=<the account>\n' +
      '      E2E_PASSWORD=<its password>\n',
  );
}

/** The e-mail address of the account the specs sign in with. */
export const E2E_EMAIL = email;

/** The password of that account. */
export const E2E_PASSWORD = password;
