import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from '@vue/compiler-sfc'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const appRoot = path.resolve(__dirname, '..')
const warnOnly = process.argv.includes('--warn-only')

const scanRoots = [
  path.join(appRoot, 'src', 'views', 'game'),
  path.join(appRoot, 'src', 'components', 'game', 'online'),
]

const denylist = [
  { term: 'per-member receipt', suggestion: '改为“成员结算记录”；技术详情可保留 per-member receipt' },
  { term: '服务端状态冲突', suggestion: '改为“房间信息有更新，请刷新后继续”' },
  { term: '服务端落账', suggestion: '改为“奖励已记录”' },
  { term: 'idempotency', suggestion: '改为“重复提交保护”；技术详情可保留 idempotency key' },
  { term: 'record-only', suggestion: '改为“仅记录本次结果”；技术详情可保留 record-only mode' },
  { term: '开始 ready', suggestion: '改为“开始准备”' },
  { term: '模拟断线', suggestion: '改为“网络异常测试”，并移入调试或技术详情折叠区' },
  { term: '降级入口', suggestion: '改为“备用操作”' },
  { term: 'fallback', suggestion: '改为“备用操作”；技术详情可保留 fallback path' },
  { term: 'revision', suggestion: '改为“版本记录”；技术详情可保留 state revision' },
  { term: 'receipt', suggestion: '改为“结算记录”；技术详情可保留 receipt payload' },
  { term: 'ledger', suggestion: '改为“记录明细”；技术详情可保留 ledger record' },
  { term: 'hash', suggestion: '改为“凭证校验码”；技术详情可保留 receipt hash' },
  { term: 'mock', suggestion: '改为“演示数据”，正式玩家路径应移入测试或调试入口' },
].sort((a, b) => b.term.length - a.term.length)

const allowlist = [
  {
    file: 'src/components/game/online/OnlineTechnicalDetails.vue',
    term: '*',
    reason: '技术详情组件默认折叠，允许展示协议字段、凭证字段和调试字段。',
  },
]

const allowedTerms = new Set(allowlist.map(entry => `${entry.file}::${entry.term.toLowerCase()}`))
const technicalDetailFiles = new Set(
  allowlist
    .filter(entry => entry.term === '*')
    .map(entry => entry.file),
)

const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const normalizeWhitespace = value => value.replace(/\s+/g, ' ').trim()

const countLines = value => (value.match(/\n/g) ?? []).length

const toRelativePath = absolutePath => path.relative(appRoot, absolutePath).replaceAll(path.sep, '/')

const collectVueFiles = async root => {
  const entries = await readdir(root, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const absolutePath = path.join(root, entry.name)
    if (entry.isDirectory()) {
      files.push(...await collectVueFiles(absolutePath))
    } else if (entry.isFile() && entry.name.endsWith('.vue')) {
      files.push(absolutePath)
    }
  }
  return files
}

const getStaticReadableAttributes = tagSource => {
  const attributes = []
  const readableAttributePattern = /(?:^|[\s<])(?:aria-label|title|placeholder|alt)\s*=\s*(["'])([\s\S]*?)\1/gi
  for (const match of tagSource.matchAll(readableAttributePattern)) {
    attributes.push(match[2])
  }
  return attributes
}

const stripVueExpressions = value => normalizeWhitespace(value.replace(/\{\{[\s\S]*?\}\}/g, ' '))

const getTagMeta = tagSource => {
  const trimmed = tagSource.trim()
  if (trimmed.startsWith('<!--')) return { name: '', closing: false, selfClosing: true }
  const closingMatch = trimmed.match(/^<\/\s*([A-Za-z0-9_.:-]+)/)
  if (closingMatch) return { name: closingMatch[1], closing: true, selfClosing: false }
  const openingMatch = trimmed.match(/^<\s*([A-Za-z0-9_.:-]+)/)
  return {
    name: openingMatch?.[1] ?? '',
    closing: false,
    selfClosing: /\/\s*>$/.test(trimmed),
  }
}

const extractVisibleSegments = source => {
  const { descriptor } = parse(source)
  const templateBlock = descriptor.template
  if (!templateBlock) return []

  const template = templateBlock.content
  let lineNumber = templateBlock.loc.start.line
  let inTag = false
  let tagBuffer = ''
  let tagStartLine = lineNumber
  let tagQuote = ''
  let technicalDetailsDepth = 0
  const textByLine = new Map()
  const segments = []

  const appendText = (line, text, inTechnicalDetails) => {
    const key = `${line}:${inTechnicalDetails ? 'technical' : 'player'}`
    textByLine.set(key, {
      line,
      technicalDetails: inTechnicalDetails,
      text: `${textByLine.get(key)?.text ?? ''}${text}`,
    })
  }

  for (const char of template) {
    if (!inTag && char === '<') {
      inTag = true
      tagBuffer = char
      tagStartLine = lineNumber
    } else if (inTag) {
      tagBuffer += char
      if (tagQuote) {
        if (char === tagQuote) tagQuote = ''
      } else if (char === '"' || char === "'") {
        tagQuote = char
      } else if (char === '>') {
        const tagMeta = getTagMeta(tagBuffer)
        const tagIsTechnicalDetails = tagMeta.name === 'OnlineTechnicalDetails'
        const tagInTechnicalDetails = technicalDetailsDepth > 0 || tagIsTechnicalDetails
        for (const attributeText of getStaticReadableAttributes(tagBuffer)) {
          const text = stripVueExpressions(attributeText)
          if (text) segments.push({ line: tagStartLine, text, context: 'attribute', technicalDetails: tagInTechnicalDetails })
        }
        if (tagIsTechnicalDetails) {
          if (tagMeta.closing) {
            technicalDetailsDepth = Math.max(0, technicalDetailsDepth - 1)
          } else if (!tagMeta.selfClosing) {
            technicalDetailsDepth += 1
          }
        }
        inTag = false
        tagQuote = ''
        tagBuffer = ''
      }
    } else {
      appendText(lineNumber, char, technicalDetailsDepth > 0)
    }

    if (char === '\n') {
      lineNumber += 1
    }
  }

  for (const segment of textByLine.values()) {
    const text = stripVueExpressions(segment.text)
    if (text) {
      segments.push({ line: segment.line, text, context: 'text', technicalDetails: segment.technicalDetails })
    }
  }

  return segments
}

const getExcerpt = (text, index, length) => {
  const start = Math.max(0, index - 28)
  const end = Math.min(text.length, index + length + 28)
  return normalizeWhitespace(text.slice(start, end))
}

const isAllowed = (file, term) => {
  const normalizedTerm = term.toLowerCase()
  return technicalDetailFiles.has(file)
    || allowedTerms.has(`${file}::*`)
    || allowedTerms.has(`${file}::${normalizedTerm}`)
}

const collectFindingsForSegment = (relativeFile, segment) => {
  const rawMatches = []
  if (segment.technicalDetails) return rawMatches
  for (const item of denylist) {
    const pattern = new RegExp(escapeRegExp(item.term), 'giu')
    for (const match of segment.text.matchAll(pattern)) {
      if (isAllowed(relativeFile, item.term)) continue
      const index = match.index ?? 0
      rawMatches.push({
        file: relativeFile,
        line: segment.line,
        index,
        term: item.term,
        suggestion: item.suggestion,
        excerpt: getExcerpt(segment.text, index, match[0].length),
      })
    }
  }

  const selected = []
  for (const match of rawMatches.sort((a, b) => a.index - b.index || b.term.length - a.term.length)) {
    const start = match.index
    const end = match.index + match.term.length
    const overlaps = selected.some(existing => start < existing.index + existing.term.length && end > existing.index)
    if (!overlaps) selected.push(match)
  }
  return selected
}

const scannedFiles = (await Promise.all(scanRoots.map(collectVueFiles)))
  .flat()
  .map(toRelativePath)
  .sort()

const findings = []

for (const relativeFile of scannedFiles) {
  const source = await readFile(path.join(appRoot, relativeFile), 'utf8')
  for (const segment of extractVisibleSegments(source)) {
    findings.push(...collectFindingsForSegment(relativeFile, segment))
  }
}

if (findings.length > 0) {
  const label = warnOnly ? 'WARN' : 'FAILED'
  console.error(`[qa-online-player-copy] ${label}`)
  for (const finding of findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.index - b.index)) {
    console.error(`- ${finding.file}:${finding.line}: "${finding.term}" 命中玩家文案禁用词，${finding.suggestion}`)
    console.error(`  摘要：${finding.excerpt}`)
  }
  console.error('')
  console.error(`扫描范围：${scannedFiles.length} 个 Vue 文件；denylist：${denylist.length} 项；allowlist：${allowlist.length} 项。`)
  if (!warnOnly) process.exit(1)
  process.exit(0)
}

console.log(`[qa-online-player-copy] passed (${scannedFiles.length} files, ${denylist.length} denylist terms, ${allowlist.length} allowlist entries)`)
