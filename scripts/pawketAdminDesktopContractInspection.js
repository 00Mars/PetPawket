import { runDesktopContractInspection } from '../utils/pawketAdminDesktopContractInspection.js';

const result = runDesktopContractInspection(process.argv.slice(2), process.env, {
  stdout: process.stdout,
  stderr: process.stderr,
});

process.exitCode = result.exit_code || (result.ok ? 0 : 1);
