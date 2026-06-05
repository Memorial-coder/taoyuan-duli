import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'

const root = 'src'
const extensions = new Set(['.vue', '.ts', '.js', '.css'])
const fixedFontSizePattern = /font-size:\s*[0-9]+(?:\.[0-9]+)?px|text-\[[0-9]+(?:\.[0-9]+)?px\]/g

const extname = (file) => {
  const index = file.lastIndexOf('.')
  return index >= 0 ? file.slice(index) : ''
}

const walk = async (dir, files = []) => {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      await walk(path, files)
    } else if (extensions.has(extname(entry.name))) {
      files.push(path)
    }
  }
  return files
}

const failures = []

for (const file of await walk(root)) {
  const content = await readFile(file, 'utf8')
  const lines = content.split(/\r?\n/)
  lines.forEach((line, index) => {
    fixedFontSizePattern.lastIndex = 0
    const matches = [...line.matchAll(fixedFontSizePattern)]
    for (const match of matches) {
      failures.push(`${relative('.', file)}:${index + 1}: ${match[0]}`)
    }
  })
}

if (failures.length > 0) {
  console.error('Fixed px font sizes block user font scaling:')
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log('Font size scaling guard passed.')
