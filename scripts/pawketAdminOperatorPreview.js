import { runOperatorPreview } from '../utils/pawketAdminOperatorPreviewRunner.js';

const result = runOperatorPreview(process.argv.slice(2), process.env, {
  stdout: process.stdout,
  stderr: process.stderr,
});

process.exitCode = result.exit_code || (result.ok ? 0 : 1);
