import { runDesktopPanelRendererInspection } from '../utils/pawketAdminDesktopPanelRenderer.js';

const result = runDesktopPanelRendererInspection(process.argv.slice(2), process.env, {
  stdout: process.stdout,
  stderr: process.stderr,
});

process.exitCode = result.exit_code || (result.ok ? 0 : 1);
