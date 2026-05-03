# Codex Recovery Notes

Last updated: 2026-05-03

## Session Recovery Issue

The original compressed session file could not be used directly because it failed with:

```text
stream did not contain valid UTF-8
```

The working recovery was made by creating a clean UTF-8 `.jsonl` version of the session data. Future recovery work should treat the clean UTF-8 `.jsonl` as the usable source and should not rely on the invalid compressed stream as authoritative.

## Continuity Outcome

Continuity has now been preserved in repo-local docs:

- `docs/PET_PAWKET_CANON.md`
- `docs/PET_PAWKET_CURRENT_STATE.md`
- `docs/CODEX_RECOVERY_NOTES.md`
- `AGENTS.md`

Future Codex sessions should read the canon and current-state documents before implementation work.

## Practical Guidance

- If a future compressed session artifact fails with the same UTF-8 error, do not keep retrying it blindly.
- Convert or reconstruct a clean UTF-8 `.jsonl` recovery artifact.
- Use repo-local continuity docs for product canon, current implementation state, and active decisions.
- Update these docs when major product, architecture, naming, launch, or privacy decisions change.

## Restart Guidance

Before implementation after a machine restart, read:

1. `AGENTS.md`
2. `docs/PET_PAWKET_CANON.md`
3. `docs/PET_PAWKET_CURRENT_STATE.md`

Then restart the local app if needed:

```bash
cd /home/lumi/PetPawket
PORT=3001 node server.js
```

Recent launch-prep work has left a broad dirty worktree intentionally. Do not reset or revert unrelated files just to make the tree clean.

The most recent active surface before restart was `/loop.html`, the Pawket Pass hub and claim page. Public naming should remain Pawket Passes while the internal Loop API/storage/database contracts are preserved unless a coordinated migration is requested.
