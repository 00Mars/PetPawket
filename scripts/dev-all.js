// scripts/dev-all.js
import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const petPort = process.env.PETPAWKET_PORT || process.env.PORT || '3001';
const charmPort = process.env.CHARM_PORT || '3011';
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';

const commands = [
  {
    name: 'petpawket',
    cmd: 'node',
    args: ['--watch', 'server.js'],
    cwd: process.cwd(),
    env: { ...process.env, PORT: petPort }
  },
  {
    name: 'charmfoundation',
    cmd: 'node',
    args: ['--watch', 'apps/charmfoundation/server.js'],
    cwd: process.cwd(),
    env: { ...process.env, PORT: charmPort }
  },
  {
    name: 'pawketpals',
    cmd: npxCmd,
    args: ['expo', 'start'],
    cwd: path.resolve(process.cwd(), 'apps', 'pawketpals'),
    env: { ...process.env },
    shell: process.platform === 'win32'
  }
];

const children = commands.map(({ name, cmd, args, cwd, env, shell }) => {
  const child = spawn(cmd, args, {
    cwd,
    stdio: 'inherit',
    env: env || process.env,
    shell: shell || false
  });

  child.on('exit', (code) => {
    if (code && code !== 0) {
      console.error(`[dev-all] ${name} exited with code ${code}`);
      shutdown(code);
    }
  });

  return child;
});

function shutdown(code = 0) {
  children.forEach((child) => {
    if (child && !child.killed) {
      child.kill();
    }
  });
  if (code) process.exit(code);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
