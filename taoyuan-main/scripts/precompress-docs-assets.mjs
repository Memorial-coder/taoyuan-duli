import { brotliCompress, gzip } from 'node:zlib'
import { constants } from 'node:zlib'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import fs from 'node:fs/promises'
import path from 'node:path'

const brotliCompressAsync = promisify(brotliCompress)
const gzipAsync = promisify(gzip)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const docsDir = path.join(rootDir, 'docs')

const compressibleExtensions = new Set([
  '.css',
  '.html',
  '.js',
  '.json',
  '.mjs',
  '.svg',
  '.txt',
  '.xml',
])

const minBytes = 1024

async function walkFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => [])
  const files = []
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...await walkFiles(entryPath))
    } else if (entry.isFile()) {
      files.push(entryPath)
    }
  }
  return files
}

async function writeIfChanged(filePath, buffer) {
  const current = await fs.readFile(filePath).catch(() => null)
  if (current && Buffer.compare(current, buffer) === 0) return false
  await fs.writeFile(filePath, buffer)
  return true
}

async function compressFile(filePath) {
  if (filePath.endsWith('.br') || filePath.endsWith('.gz')) return null
  if (!compressibleExtensions.has(path.extname(filePath).toLowerCase())) return null
  const stat = await fs.stat(filePath)
  if (!stat.isFile() || stat.size < minBytes) return null

  const source = await fs.readFile(filePath)
  const [brotliBuffer, gzipBuffer] = await Promise.all([
    brotliCompressAsync(source, {
      params: {
        [constants.BROTLI_PARAM_QUALITY]: 5,
      },
    }),
    gzipAsync(source, { level: constants.Z_BEST_SPEED }),
  ])
  const wroteBrotli = await writeIfChanged(`${filePath}.br`, brotliBuffer)
  const wroteGzip = await writeIfChanged(`${filePath}.gz`, gzipBuffer)
  return {
    filePath,
    sourceBytes: source.length,
    brotliBytes: brotliBuffer.length,
    gzipBytes: gzipBuffer.length,
    wroteBrotli,
    wroteGzip,
  }
}

const files = await walkFiles(docsDir)
const results = (await Promise.all(files.map(compressFile))).filter(Boolean)
const sourceBytes = results.reduce((sum, entry) => sum + entry.sourceBytes, 0)
const brotliBytes = results.reduce((sum, entry) => sum + entry.brotliBytes, 0)
const gzipBytes = results.reduce((sum, entry) => sum + entry.gzipBytes, 0)

console.log(
  `[precompress-docs-assets] compressed ${results.length} files, source=${Math.round(sourceBytes / 1024)}KB, br=${Math.round(brotliBytes / 1024)}KB, gzip=${Math.round(gzipBytes / 1024)}KB`,
)
