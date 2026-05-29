import { readdirSync } from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const serverRoot = path.resolve(__dirname, '..')
const sourceRoot = path.join(serverRoot, 'src')

const collectJavaScriptFiles = directory => {
  const entries = readdirSync(directory, { withFileTypes: true })
  return entries.flatMap(entry => {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) return collectJavaScriptFiles(fullPath)
    return entry.isFile() && entry.name.endsWith('.js') ? [fullPath] : []
  })
}

const files = collectJavaScriptFiles(sourceRoot).sort((left, right) => left.localeCompare(right, 'en'))
if (files.length === 0) {
  throw new Error(`No JavaScript files found under ${sourceRoot}`)
}

const failures = []
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], {
    cwd: serverRoot,
    encoding: 'utf8',
  })
  if (result.status !== 0) {
    failures.push({
      file: path.relative(serverRoot, file),
      output: `${result.stdout || ''}${result.stderr || ''}`.trim(),
    })
  }
}

if (failures.length > 0) {
  console.error('[qa-server-node-check] failed')
  for (const failure of failures) {
    console.error(`- ${failure.file}`)
    if (failure.output) console.error(failure.output)
  }
  process.exit(1)
}

console.log(`[qa-server-node-check] passed ${files.length} files`)
