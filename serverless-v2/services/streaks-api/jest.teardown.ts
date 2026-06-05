/**
 * Jest `setupFilesAfterEnv` hook (S7-8) — runs once per test file, after the
 * framework is installed, so `afterAll` is available.
 *
 * Registers a global `afterAll` that destroys the shared DynamoDB client. The
 * v3 client's keep-alive HTTP sockets are the open handle that previously
 * required `--forceExit`; tearing them down here lets the process exit cleanly
 * (exit 0, no open-handle warning) without `--forceExit`.
 *
 * Unit tests that mock `shared/config/dynamo` get the mock's (no-op-or-absent)
 * `closeDb`; we guard for that so the teardown is safe everywhere.
 */
// Namespace import (not a named binding): unit tests `jest.mock` this module
// with a partial shape, so `closeDb` may be absent — the runtime guard below
// handles that. The `shared/` CommonJS interop point is the documented `any`
// exception (CLAUDE.md Inv 9, TECH_STACK §3).
import * as dynamo from '../../shared/config/dynamo';

afterAll(() => {
  const closeDb = (dynamo as { closeDb?: () => void }).closeDb;
  if (typeof closeDb === 'function') {
    closeDb();
  }
});
