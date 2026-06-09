const { spawn, spawnSync } = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const scriptPath = path.join(__dirname, 'prepare-item-icons.py')
const userArgs = process.argv.slice(2)

const addCandidate = (candidates, command, args = []) => {
  if (!command) return
  candidates.push({ command, args })
}

const bundledPython = path.join(
  os.homedir(),
  '.cache',
  'codex-runtimes',
  'codex-primary-runtime',
  'dependencies',
  'python',
  process.platform === 'win32' ? 'python.exe' : 'bin/python',
)

const candidates = []
addCandidate(candidates, process.env.TAOYUAN_PYTHON)
addCandidate(candidates, process.env.PYTHON)
if (fs.existsSync(bundledPython)) addCandidate(candidates, bundledPython)
addCandidate(candidates, 'python3')
addCandidate(candidates, 'python')
if (process.platform === 'win32') addCandidate(candidates, 'py', ['-3'])

const canUsePython = candidate => {
  const result = spawnSync(candidate.command, [...candidate.args, '-c', 'import PIL'], {
    cwd: root,
    stdio: 'ignore',
    shell: false,
  })
  return !result.error && result.status === 0
}

const python = candidates.find(canUsePython)

if (!python) {
  console.error('No usable Python with Pillow found. Set TAOYUAN_PYTHON to a Python executable that can import PIL.')
  process.exit(1)
}

const child = spawn(python.command, [...python.args, scriptPath, ...userArgs], {
  cwd: root,
  stdio: 'inherit',
  shell: false,
})

child.on('exit', code => {
  process.exit(code ?? 1)
})
