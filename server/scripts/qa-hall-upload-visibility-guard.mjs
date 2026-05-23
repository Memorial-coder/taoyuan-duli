import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const serverRoot = path.resolve(__dirname, '..')

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const indexSource = await readFile(path.join(serverRoot, 'src', 'index.js'), 'utf8')
const apiSource = await readFile(path.join(serverRoot, 'src', 'routes', 'api.js'), 'utf8')

const requiredGuardChecks = [
  'createHallUploadVisibilityGuard',
  'isUploadedImageVisibleByStoredName',
  "res.status(404).send('Not found')",
]

for (const marker of requiredGuardChecks) {
  assert(indexSource.includes(marker), `index.js missing hall upload guard marker: ${marker}`)
  assert(apiSource.includes(marker), `routes/api.js missing hall upload guard marker: ${marker}`)
}

assert(
  indexSource.includes("app.use('/taoyuan/hall/uploads', createHallUploadVisibilityGuard(), express.static"),
  'index.js hall upload static mount must run visibility guard before express.static',
)
assert(
  apiSource.includes("router.use('/taoyuan/hall/uploads', createHallUploadVisibilityGuard(), express.static"),
  'routes/api.js /api hall upload static mount must run visibility guard before express.static',
)

console.log('[qa-hall-upload-visibility-guard] OK')
