const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const out = fs.openSync(path.join(root, '.vite-dev.out.log'), 'a');
const err = fs.openSync(path.join(root, '.vite-dev.err.log'), 'a');
const viteBin = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');

const child = spawn(process.execPath, [viteBin, '--host', '127.0.0.1', '--port', '5173'], {
  cwd: root,
  detached: true,
  stdio: ['ignore', out, err],
  windowsHide: true,
});

child.unref();
console.log(`started vite pid=${child.pid}`);
