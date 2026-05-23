import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const source = await readFile(path.join(projectRoot, 'src', 'utils', 'accountStorage.ts'), 'utf8')

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

assert(source.includes('if (res.status === 401)'), 'forceRefreshCurrentAccountContext must only clear account on confirmed 401')
assert(source.includes('return clearCurrentAccountContext()'), 'confirmed 401 should clear account context')
assert(source.includes('if (res.ok && data?.ok)'), 'successful /api/me should be the only path that overwrites account context')
assert(source.includes('} catch {\n      return buildCurrentAccountContext()'), 'transient /api/me failures must preserve current account context')

console.log('[qa-account-context-guard] OK')
