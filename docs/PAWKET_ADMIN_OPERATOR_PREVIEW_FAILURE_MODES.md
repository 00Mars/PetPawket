# Pawket Admin Operator Preview Failure Modes

Status: expected local runner failures.

The preview runner should fail closed and return a nonzero result when it cannot safely build a local read-only preview.

## Safe Failures

- Missing vault path: usage error, exit code `2`.
- Help mode: safe success, exit code `0`, no vault read.
- Public path: rejected before reading.
- Nonexistent path: rejected.
- Non-directory path: rejected.
- Malformed NDJSON: rejected with a safe error message.
- Operator shell validation failure: rejected.
- UI adapter validation failure: rejected.
- Raw document content: rejected.
- Forbidden export artifact: rejected.
- Forbidden official report or balance artifact: rejected.
- Forbidden runner write target: rejected.

## Error Output

Usage and validation errors may be written to stderr. Successful previews write stdout only.

## No Recovery Mutation

The runner must not attempt to fix malformed records, rewrite files, clean export artifacts, create cache files, or alter vault state.
