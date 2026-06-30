import { runDesktopContractSmoke } from '../utils/pawketAdminDesktopContractSmokeRunner.js';

const result = runDesktopContractSmoke(process.argv.slice(2), process.env, {
  stdout: process.stdout,
  stderr: process.stderr,
});

process.exitCode = result.exit_code || (result.ok ? 0 : 1);
