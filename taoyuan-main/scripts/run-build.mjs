import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

function runNodeScript(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: repoRoot,
      stdio: 'inherit',
      shell: false,
    })

    child.on('error', reject)
    child.on('exit', code => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`${args.join(' ')} exited with code ${code ?? 1}`))
      }
    })
  })
}

try {
  await runNodeScript(['node_modules/vite/bin/vite.js', 'build'])
  await runNodeScript(['scripts/precompress-docs-assets.mjs'])
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
