import { marked } from 'marked'

const TEXT_NODE = 3
const ELEMENT_NODE = 1
const HTML_PLACEHOLDER_PREFIX = '@@TAOYUANHTML'
const HTML_PLACEHOLDER_SUFFIX = '@@'
const INLINE_CODE_PLACEHOLDER_PREFIX = '@@TAOYUANINLINECODE'
const HTML_TAG_RE = /<\/?[a-zA-Z][\w:-]*(?:\s+[^<>]*?)?\s*\/?>/g
const STANDALONE_HTML_RE = /^<(?:img|br|hr)\b[^>]*\/?>$|^<([a-zA-Z][\w:-]*)(?:\s+[^<>]*?)?>[\s\S]*<\/\1>$/i
const URL_SCHEME_RE = /^([a-z][a-z0-9+.-]*):/i
const MARKDOWN_HR_RE = /^(?:-{3,}|\*{3,}|_{3,})$/
const TABLE_SEPARATOR_CELL_RE = /^:?-{3,}:?$/

const STRICT_ALLOWED_HTML_TAGS = new Set([
  'a',
  'blockquote',
  'br',
  'code',
  'dd',
  'del',
  'details',
  'div',
  'dl',
  'dt',
  'em',
  'figcaption',
  'figure',
  'h1',
  'h2',
  'h3',
  'hr',
  'i',
  'img',
  'input',
  'kbd',
  'li',
  'ol',
  'p',
  'pre',
  'span',
  'strong',
  'sub',
  'summary',
  'sup',
  'table',
  'tbody',
  'td',
  'th',
  'thead',
  'tr',
  'ul',
])

const RICH_ALLOWED_HTML_TAGS = new Set([
  ...STRICT_ALLOWED_HTML_TAGS,
  'b',
  'h4',
  'h5',
  'h6',
  'mark',
  's',
  'small',
  'u',
])

const DROP_HTML_TAGS = new Set([
  'audio',
  'button',
  'embed',
  'form',
  'iframe',
  'link',
  'meta',
  'object',
  'script',
  'select',
  'style',
  'textarea',
  'video',
])
const VOID_HTML_TAGS = new Set(['br', 'hr', 'img', 'input'])
const GLOBAL_ALLOWED_ATTRS = new Set(['class', 'id', 'title'])
const SAFE_TARGETS = new Set(['_blank', '_self'])
const SAFE_LOADING = new Set(['eager', 'lazy'])
const SAFE_ALIGN = new Set(['center', 'left', 'right'])
const SAFE_DIMENSION_RE = /^\d{1,4}%?$/
const SAFE_SPAN_RE = /^\d{1,2}$/
const SAFE_FONT_WEIGHT_RE = /^(?:normal|bold|bolder|lighter|[1-9]00)$/i
const SAFE_FONT_STYLE_RE = /^(?:normal|italic|oblique)$/i
const SAFE_TEXT_DECORATION_RE = /^(?:none|underline|line-through|overline)$/i
const SAFE_DISPLAY_RE = /^(?:block|inline|inline-block)$/i
const SAFE_BORDER_STYLE_RE = /^(?:none|solid|dashed|dotted|double)$/i
const SAFE_OBJECT_FIT_RE = /^(?:fill|contain|cover|none|scale-down)$/i
const SAFE_COLOR_RE = /^(?:#[0-9a-f]{3,8}|rgba?\(\s*\d{1,3}\s*(?:,\s*\d{1,3}\s*){2}(?:,\s*(?:0|1|0?\.\d+)\s*)?\)|transparent|currentcolor|inherit|initial|unset|white|black|gray|grey|red|green|blue|yellow|orange|purple|pink|brown|teal|navy|maroon|silver|lime|aqua|fuchsia|olive)$/i
const SAFE_LENGTH_RE = /^(?:\d+(?:\.\d+)?(?:px|%|em|rem)?|0)$/i
const SAFE_CLASS_RE = /^[a-z0-9_-]+(?:\s+[a-z0-9_-]+)*$/i
const SAFE_ID_RE = /^[a-z][\w:-]{0,96}$/i
const SAFE_ORDER_START_RE = /^\d{1,4}$/
const UNSAFE_STYLE_VALUE_RE = /(?:expression\s*\(|javascript:|url\s*\(|var\s*\()/i

type HtmlMode = 'strict' | 'rich'

type RichMarkdownFootnote = {
  content: string
  id: string
  label: string
  referenceIds: string[]
}

const RICH_STYLE_ALLOWLIST = new Set([
  'background-color',
  'border',
  'border-color',
  'border-radius',
  'border-style',
  'border-width',
  'color',
  'display',
  'font-size',
  'font-style',
  'font-weight',
  'height',
  'letter-spacing',
  'line-height',
  'margin',
  'margin-bottom',
  'margin-left',
  'margin-right',
  'margin-top',
  'max-width',
  'min-width',
  'object-fit',
  'padding',
  'padding-bottom',
  'padding-left',
  'padding-right',
  'padding-top',
  'text-align',
  'text-decoration',
  'width',
])

const TAG_ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'rel', 'target']),
  div: new Set(['align']),
  h1: new Set(['align']),
  h2: new Set(['align']),
  h3: new Set(['align']),
  img: new Set(['alt', 'height', 'loading', 'src', 'width']),
  p: new Set(['align']),
  table: new Set(['align', 'width']),
  tbody: new Set([]),
  td: new Set(['align', 'colspan', 'rowspan']),
  th: new Set(['align', 'colspan', 'rowspan']),
  thead: new Set([]),
  tr: new Set(['align']),
}

const RICH_TAG_ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'rel', 'style', 'target']),
  b: new Set(['style']),
  blockquote: new Set(['style']),
  code: new Set(['class', 'style']),
  dd: new Set(['style']),
  del: new Set(['style']),
  details: new Set(['open', 'style']),
  div: new Set(['align', 'style']),
  dl: new Set(['style']),
  dt: new Set(['style']),
  em: new Set(['style']),
  figcaption: new Set(['style']),
  figure: new Set(['style']),
  h1: new Set(['align', 'style']),
  h2: new Set(['align', 'style']),
  h3: new Set(['align', 'style']),
  h4: new Set(['align', 'style']),
  h5: new Set(['align', 'style']),
  h6: new Set(['align', 'style']),
  hr: new Set(['style']),
  i: new Set(['style']),
  img: new Set(['alt', 'height', 'loading', 'src', 'style', 'width']),
  input: new Set(['checked', 'disabled', 'type']),
  kbd: new Set(['style']),
  li: new Set(['style']),
  mark: new Set(['style']),
  ol: new Set(['start', 'style']),
  p: new Set(['align', 'style']),
  pre: new Set(['style']),
  s: new Set(['style']),
  small: new Set(['style']),
  span: new Set(['style']),
  strong: new Set(['style']),
  sub: new Set(['style']),
  summary: new Set(['style']),
  sup: new Set(['style']),
  table: new Set(['align', 'style', 'width']),
  tbody: new Set(['style']),
  td: new Set(['align', 'colspan', 'rowspan', 'style']),
  th: new Set(['align', 'colspan', 'rowspan', 'style']),
  thead: new Set(['style']),
  tr: new Set(['align', 'style']),
  u: new Set(['style']),
  ul: new Set(['style']),
}

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const markedOptions = Object.freeze({
  async: false,
  breaks: false,
  gfm: true,
  pedantic: false,
})

const escapeHtml = (value: string): string => {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const normalizeLegacyUploadUrl = (value: string): string => {
  if (/^\/taoyuan\/hall\/uploads\//i.test(value)) return `/api${value}`
  if (/^taoyuan\/hall\/uploads\//i.test(value)) return `/api/${value}`
  return value
}

const normalizeRichMarkdownAnchor = (value: string, fallback: string): string => {
  const slug = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
  return slug || fallback
}

const extractRichMarkdownFootnotes = (source: string): { markdown: string; footnotes: RichMarkdownFootnote[] } => {
  const lines = source.split('\n')
  const keptLines: string[] = []
  const footnotes: RichMarkdownFootnote[] = []
  const footnoteByLabel = new Map<string, RichMarkdownFootnote>()

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? ''
    const match = line.match(/^\[\^([^\]]+)\]:\s*(.*)$/)
    if (!match) {
      keptLines.push(line)
      continue
    }

    const label = String(match[1] || '').trim()
    const contentLines = [String(match[2] || '').trim()]
    while (index + 1 < lines.length && /^(?: {2,}|\t)\S/.test(lines[index + 1] ?? '')) {
      index += 1
      contentLines.push(String(lines[index] || '').replace(/^(?: {2,}|\t)/, '').trim())
    }

    const id = `fn-${normalizeRichMarkdownAnchor(label, String(footnotes.length + 1))}`
    const footnote: RichMarkdownFootnote = {
      content: contentLines.join('\n').trim(),
      id,
      label,
      referenceIds: [],
    }
    footnotes.push(footnote)
    footnoteByLabel.set(label, footnote)
  }

  const referenceCounts = new Map<string, number>()
  const markdown = keptLines.join('\n').replace(/\[\^([^\]]+)\]/g, (token, rawLabel: string) => {
    const label = String(rawLabel || '').trim()
    const footnote = footnoteByLabel.get(label)
    if (!footnote) return token

    const count = (referenceCounts.get(label) || 0) + 1
    referenceCounts.set(label, count)
    const referenceId = count === 1 ? `fnref-${footnote.id}` : `fnref-${footnote.id}-${count}`
    footnote.referenceIds.push(referenceId)
    return `<sup id="${referenceId}"><a href="#${footnote.id}" class="footnote-ref">${escapeHtml(label)}</a></sup>`
  })

  return { markdown, footnotes }
}

const renderRichMarkdownFootnotes = (footnotes: RichMarkdownFootnote[]): string => {
  const referencedFootnotes = footnotes.filter(footnote => footnote.referenceIds.length > 0)
  if (!referencedFootnotes.length) return ''

  const items = referencedFootnotes
    .map(footnote => {
      const contentHtml = marked.parseInline(footnote.content || footnote.label, markedOptions) as string
      const backrefs = footnote.referenceIds
        .map(referenceId => `<a href="#${referenceId}" class="footnote-backref" title="返回正文">return</a>`)
        .join(' ')
      return `<li id="${footnote.id}">${contentHtml} ${backrefs}</li>`
    })
    .join('')

  return `<div class="footnotes"><hr /><ol>${items}</ol></div>`
}

const hasUnsafeUrlCharacter = (value: string): boolean => {
  for (let index = 0; index < value.length; index += 1) {
    const charCode = value.charCodeAt(index)
    if (charCode <= 32 || charCode === 127) return true
  }
  return false
}

const sanitizeUrl = (value: string): string => {
  const trimmed = normalizeLegacyUploadUrl(value.trim())
  if (!trimmed) return ''
  if (hasUnsafeUrlCharacter(trimmed)) return ''
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) return trimmed

  const schemeMatch = trimmed.match(URL_SCHEME_RE)
  if (!schemeMatch) return ''

  const scheme = String(schemeMatch[1] || '').toLowerCase()
  if (scheme === 'http' || scheme === 'https' || scheme === 'mailto' || scheme === 'tel') return trimmed
  return ''
}

const buildAttributeString = (attrs: Map<string, string>): string => {
  return Array.from(attrs.entries())
    .map(([name, value]) => ` ${name}="${escapeHtml(value)}"`)
    .join('')
}

const sanitizeStyleValue = (property: string, rawValue: string): string => {
  const value = rawValue.trim()
  if (!value || UNSAFE_STYLE_VALUE_RE.test(value)) return ''

  if (property === 'color' || property === 'background-color') {
    return SAFE_COLOR_RE.test(value) ? value : ''
  }

  if (property === 'text-align') {
    return SAFE_ALIGN.has(value.toLowerCase()) ? value.toLowerCase() : ''
  }

  if (property === 'font-size' || property === 'width' || property === 'height' || property === 'max-width' || property === 'min-width' || property === 'letter-spacing' || property === 'border-radius') {
    return SAFE_LENGTH_RE.test(value) ? value : ''
  }

  if (property === 'line-height') {
    return /^(?:\d+(?:\.\d+)?|\d+(?:\.\d+)?(?:px|%|em|rem))$/i.test(value) ? value : ''
  }

  if (property === 'font-weight') {
    return SAFE_FONT_WEIGHT_RE.test(value) ? value.toLowerCase() : ''
  }

  if (property === 'font-style') {
    return SAFE_FONT_STYLE_RE.test(value) ? value.toLowerCase() : ''
  }

  if (property === 'text-decoration') {
    return SAFE_TEXT_DECORATION_RE.test(value) ? value.toLowerCase() : ''
  }

  if (property === 'display') {
    return SAFE_DISPLAY_RE.test(value) ? value.toLowerCase() : ''
  }

  if (property === 'border-style') {
    return SAFE_BORDER_STYLE_RE.test(value) ? value.toLowerCase() : ''
  }

  if (property === 'border-width' || property === 'margin' || property === 'margin-top' || property === 'margin-right' || property === 'margin-bottom' || property === 'margin-left' || property === 'padding' || property === 'padding-top' || property === 'padding-right' || property === 'padding-bottom' || property === 'padding-left') {
    const parts = value.split(/\s+/)
    if (!parts.length || parts.length > 4) return ''
    return parts.every(part => SAFE_LENGTH_RE.test(part)) ? parts.join(' ') : ''
  }

  if (property === 'border-color') {
    const parts = value.split(/\s+/)
    if (!parts.length || parts.length > 4) return ''
    return parts.every(part => SAFE_COLOR_RE.test(part)) ? parts.join(' ') : ''
  }

  if (property === 'border') {
    const parts = value.split(/\s+/)
    if (!parts.length || parts.length > 3) return ''
    let hasWidth = false
    let hasStyle = false
    let hasColor = false
    for (const part of parts) {
      if (!hasWidth && SAFE_LENGTH_RE.test(part)) {
        hasWidth = true
        continue
      }
      if (!hasStyle && SAFE_BORDER_STYLE_RE.test(part)) {
        hasStyle = true
        continue
      }
      if (!hasColor && SAFE_COLOR_RE.test(part)) {
        hasColor = true
        continue
      }
      return ''
    }
    return parts.join(' ')
  }

  if (property === 'object-fit') {
    return SAFE_OBJECT_FIT_RE.test(value) ? value.toLowerCase() : ''
  }

  return ''
}

const sanitizeStyleAttribute = (value: string): string => {
  const styleParts: string[] = []

  for (const rawDeclaration of value.split(';')) {
    const separatorIndex = rawDeclaration.indexOf(':')
    if (separatorIndex <= 0) continue

    const property = rawDeclaration.slice(0, separatorIndex).trim().toLowerCase()
    const rawStyleValue = rawDeclaration.slice(separatorIndex + 1)
    if (!RICH_STYLE_ALLOWLIST.has(property)) continue

    const safeValue = sanitizeStyleValue(property, rawStyleValue)
    if (safeValue) styleParts.push(`${property}: ${safeValue}`)
  }

  return styleParts.join('; ')
}

const sanitizeElementStartTag = (element: Element, tagName: string, mode: HtmlMode): string | null => {
  const allowedAttrs = new Set([
    ...((mode === 'rich' ? RICH_TAG_ALLOWED_ATTRS[tagName] : TAG_ALLOWED_ATTRS[tagName]) ?? []),
    ...GLOBAL_ALLOWED_ATTRS,
  ])
  const attrs = new Map<string, string>()

  for (const attr of Array.from(element.attributes)) {
    const name = attr.name.toLowerCase()
    const value = attr.value.trim()

    if (name.startsWith('on') || !allowedAttrs.has(name)) continue

    if (name === 'href' || name === 'src') {
      const safeUrl = sanitizeUrl(value)
      if (safeUrl) attrs.set(name, safeUrl)
      continue
    }

    if (name === 'class') {
      if (mode === 'rich' && SAFE_CLASS_RE.test(value)) attrs.set(name, value)
      continue
    }

    if (name === 'id') {
      if (mode === 'rich' && SAFE_ID_RE.test(value)) attrs.set(name, value)
      continue
    }

    if (name === 'style' && mode === 'rich') {
      const safeStyle = sanitizeStyleAttribute(value)
      if (safeStyle) attrs.set(name, safeStyle)
      continue
    }

    if (name === 'target') {
      const safeTarget = value.toLowerCase()
      if (SAFE_TARGETS.has(safeTarget)) attrs.set(name, safeTarget)
      continue
    }

    if (name === 'loading') {
      const safeLoading = value.toLowerCase()
      if (SAFE_LOADING.has(safeLoading)) attrs.set(name, safeLoading)
      continue
    }

    if (name === 'align') {
      const safeAlign = value.toLowerCase()
      if (SAFE_ALIGN.has(safeAlign)) attrs.set(name, safeAlign)
      continue
    }

    if (name === 'width' || name === 'height') {
      if (SAFE_DIMENSION_RE.test(value)) attrs.set(name, value)
      continue
    }

    if (name === 'start') {
      if (SAFE_ORDER_START_RE.test(value)) attrs.set(name, value)
      continue
    }

    if (name === 'colspan' || name === 'rowspan') {
      if (SAFE_SPAN_RE.test(value)) attrs.set(name, value)
      continue
    }

    if (name === 'type' && tagName === 'input') {
      if (value.toLowerCase() === 'checkbox') attrs.set(name, 'checkbox')
      continue
    }

    if ((name === 'checked' || name === 'disabled') && tagName === 'input') {
      attrs.set(name, name)
      continue
    }

    if (name === 'open' && tagName === 'details') {
      attrs.set(name, name)
      continue
    }

    if (name === 'rel') continue

    if (name === 'alt' || name === 'title') {
      attrs.set(name, value)
      continue
    }
  }

  if (tagName === 'a') {
    if (!attrs.has('href')) return null
    const target = attrs.get('target') ?? '_blank'
    attrs.set('target', target)
    if (target === '_blank') attrs.set('rel', 'noopener noreferrer')
  }

  if (tagName === 'img') {
    if (!attrs.has('src')) return null
    if (!attrs.has('loading')) attrs.set('loading', 'lazy')
  }

  if (tagName === 'input') {
    if (attrs.get('type') !== 'checkbox') return null
    attrs.set('disabled', 'disabled')
  }

  return `<${tagName}${buildAttributeString(attrs)}>`
}

const sanitizeHtmlNodeByMode = (node: Node, mode: HtmlMode): string => {
  if (node.nodeType === TEXT_NODE) return escapeHtml(node.textContent || '')
  if (node.nodeType !== ELEMENT_NODE) return ''

  const element = node as Element
  const tagName = element.tagName.toLowerCase()
  const allowedTags = mode === 'rich' ? RICH_ALLOWED_HTML_TAGS : STRICT_ALLOWED_HTML_TAGS

  if (DROP_HTML_TAGS.has(tagName)) return ''
  if (!allowedTags.has(tagName)) {
    return Array.from(element.childNodes).map(child => sanitizeHtmlNodeByMode(child, mode)).join('')
  }

  const startTag = sanitizeElementStartTag(element, tagName, mode)
  if (!startTag) return Array.from(element.childNodes).map(child => sanitizeHtmlNodeByMode(child, mode)).join('')
  if (VOID_HTML_TAGS.has(tagName)) return startTag

  const childrenHtml = Array.from(element.childNodes).map(child => sanitizeHtmlNodeByMode(child, mode)).join('')
  return `${startTag}${childrenHtml}</${tagName}>`
}

const sanitizeHtmlFragment = (value: string): string => {
  return sanitizeHtmlFragmentByMode(value, 'strict')
}

const sanitizeHtmlFragmentByMode = (value: string, mode: HtmlMode): string => {
  if (typeof document === 'undefined') return escapeHtml(value)

  const template = document.createElement('template')
  template.innerHTML = value
  return Array.from(template.content.childNodes).map(node => sanitizeHtmlNodeByMode(node, mode)).join('')
}

const sanitizeHtmlTagToken = (value: string, mode: HtmlMode): string => {
  const match = value.match(/^<\s*(\/)?\s*([a-zA-Z][\w:-]*)/i)
  if (!match) return escapeHtml(value)

  const isClosing = Boolean(match[1])
  const tagName = String(match[2] || '').toLowerCase()
  const allowedTags = mode === 'rich' ? RICH_ALLOWED_HTML_TAGS : STRICT_ALLOWED_HTML_TAGS

  if (DROP_HTML_TAGS.has(tagName)) return ''
  if (!allowedTags.has(tagName)) return escapeHtml(value)

  if (isClosing) return VOID_HTML_TAGS.has(tagName) ? '' : `</${tagName}>`
  if (typeof document === 'undefined') return escapeHtml(value)

  const template = document.createElement('template')
  template.innerHTML = value
  const element = template.content.firstElementChild
  if (!element || element.tagName.toLowerCase() !== tagName) return escapeHtml(value)

  return sanitizeElementStartTag(element, tagName, mode) ?? ''
}

const preserveSafeHtmlTags = (value: string, mode: HtmlMode): { text: string; placeholders: string[] } => {
  const placeholders: string[] = []

  const text = value.replace(HTML_TAG_RE, match => {
    const safeTag = sanitizeHtmlTagToken(match, mode)
    if (!safeTag) return ''
    const token = `${HTML_PLACEHOLDER_PREFIX}${placeholders.length}${HTML_PLACEHOLDER_SUFFIX}`
    placeholders.push(safeTag)
    return token
  })

  return { text, placeholders }
}

const restoreSafeHtmlTags = (value: string, placeholders: string[]): string => {
  if (!placeholders.length) return value

  return value.replace(
    new RegExp(`${escapeRegExp(HTML_PLACEHOLDER_PREFIX)}(\\d+)${escapeRegExp(HTML_PLACEHOLDER_SUFFIX)}`, 'g'),
    (_, index: string) => placeholders[Number(index)] || '',
  )
}

const renderInlineMarkdown = (value: string, mode: HtmlMode = 'strict'): string => {
  const inlineCodeBlocks: string[] = []
  const withoutInlineCode = value.replace(/`([^`]+?)`/g, (_, code: string) => {
    const index = inlineCodeBlocks.length
    inlineCodeBlocks.push(`<code>${escapeHtml(code)}</code>`)
    return `${INLINE_CODE_PLACEHOLDER_PREFIX}${index}${HTML_PLACEHOLDER_SUFFIX}`
  })
  const { text, placeholders } = preserveSafeHtmlTags(withoutInlineCode, mode)
  let html = escapeHtml(text)

  html = html.replace(/!\[([^\]]*?)\]\(([^)]+?)\)/g, (_, alt: string, url: string) => {
    const safeUrl = sanitizeUrl(url)
    if (!safeUrl) return alt || '鍥剧墖'
    return `<img src="${escapeHtml(safeUrl)}" alt="${escapeHtml(alt || '')}" loading="lazy" />`
  })
  html = html.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/__([^_]+?)__/g, '<strong>$1</strong>')
  html = html.replace(/\*([^*]+?)\*/g, '<em>$1</em>')
  html = html.replace(/_([^_]+?)_/g, '<em>$1</em>')
  html = html.replace(/\[([^\]]+?)\]\(([^)]+?)\)/g, (_, textValue: string, url: string) => {
    const safeUrl = sanitizeUrl(url)
    if (!safeUrl) return textValue
    return `<a href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer">${textValue}</a>`
  })

  const withSafeHtml = restoreSafeHtmlTags(html, placeholders)
  return withSafeHtml.replace(
    new RegExp(`${escapeRegExp(INLINE_CODE_PLACEHOLDER_PREFIX)}(\\d+)${escapeRegExp(HTML_PLACEHOLDER_SUFFIX)}`, 'g'),
    (_, index: string) => inlineCodeBlocks[Number(index)] || '',
  )
}

const renderParagraph = (lines: string[]): string => {
  const content = lines.map(line => renderInlineMarkdown(line)).join('<br />')
  return `<p>${content}</p>`
}

const splitMarkdownTableRow = (value: string): string[] => {
  let row = value.trim()
  if (row.startsWith('|')) row = row.slice(1)
  if (row.endsWith('|')) row = row.slice(0, -1)

  const cells: string[] = []
  let cell = ''
  let escaped = false

  for (const char of row) {
    if (escaped) {
      cell += char
      escaped = false
      continue
    }

    if (char === '\\') {
      escaped = true
      continue
    }

    if (char === '|') {
      cells.push(cell.trim())
      cell = ''
      continue
    }

    cell += char
  }

  cells.push(cell.trim())
  return cells
}

const parseMarkdownTableAlignments = (value: string): Array<'left' | 'center' | 'right' | ''> | null => {
  const cells = splitMarkdownTableRow(value).map(cell => cell.replace(/\s+/g, ''))
  if (cells.length < 2 || cells.some(cell => !TABLE_SEPARATOR_CELL_RE.test(cell))) return null

  return cells.map(cell => {
    const left = cell.startsWith(':')
    const right = cell.endsWith(':')
    if (left && right) return 'center'
    if (right) return 'right'
    if (left) return 'left'
    return ''
  })
}

const renderMarkdownTable = (
  headers: string[],
  alignments: Array<'left' | 'center' | 'right' | ''>,
  rows: string[][],
): string => {
  const columnCount = Math.min(headers.length, alignments.length)
  const normalizeCells = (cells: string[]) => Array.from({ length: columnCount }, (_, index) => cells[index] ?? '')
  const renderCell = (tagName: 'td' | 'th', cell: string, index: number) => {
    const align = alignments[index]
    const alignAttr = align ? ` data-align="${align}"` : ''
    return `<${tagName}${alignAttr}>${renderInlineMarkdown(cell)}</${tagName}>`
  }
  const headerHtml = normalizeCells(headers).map((cell, index) => renderCell('th', cell, index)).join('')
  const rowsHtml = rows
    .map(row => `<tr>${normalizeCells(row).map((cell, index) => renderCell('td', cell, index)).join('')}</tr>`)
    .join('')

  return `<div class="ai-md-table-scroll" role="region" aria-label="Markdown table" tabindex="0"><table><thead><tr>${headerHtml}</tr></thead><tbody>${rowsHtml}</tbody></table></div>`
}

const renderBlockquote = (lines: string[]): string => {
  const paragraphGroups: string[][] = []
  let buffer: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      if (buffer.length) paragraphGroups.push(buffer)
      buffer = []
      continue
    }
    buffer.push(trimmed)
  }

  if (buffer.length) paragraphGroups.push(buffer)
  const content = paragraphGroups.length ? paragraphGroups.map(group => renderParagraph(group)).join('') : '<p></p>'
  return `<blockquote>${content}</blockquote>`
}

const renderStandaloneHtml = (value: string): string | null => {
  if (!STANDALONE_HTML_RE.test(value)) return null
  return sanitizeHtmlFragment(value)
}

const renderRichContentStandaloneHtml = (value: string): string | null => {
  if (!STANDALONE_HTML_RE.test(value)) return null
  return sanitizeHtmlFragmentByMode(value, 'rich')
}

export const renderSafeMarkdown = (value: string): string => {
  const source = String(value || '').replace(/\r\n/g, '\n')
  if (!source.trim()) return '<p></p>'

  const codeBlocks: string[] = []
  const placeholderPrefix = '__TAOYUAN_CODE_BLOCK_'

  const withoutCode = source.replace(/```([\w-]*)\n([\s\S]*?)```/g, (_, lang: string, code: string) => {
    const index = codeBlocks.length
    const langClass = lang ? ` class="language-${escapeHtml(lang)}"` : ''
    codeBlocks.push(`<div class="ai-md-code-block"><button type="button" class="ai-md-code-copy" data-ai-copy-code="1" aria-label="复制代码片段">复制</button><pre><code${langClass}>${escapeHtml(code.trimEnd())}</code></pre></div>`)
    return `${placeholderPrefix}${index}__`
  })

  const lines = withoutCode.split('\n')
  const htmlParts: string[] = []
  let paragraphBuffer: string[] = []
  let listType: 'ul' | 'ol' | '' = ''
  let listItems: string[] = []

  const flushParagraph = () => {
    if (!paragraphBuffer.length) return
    htmlParts.push(renderParagraph(paragraphBuffer))
    paragraphBuffer = []
  }

  const flushList = () => {
    if (!listType || !listItems.length) return
    htmlParts.push(`<${listType}>${listItems.map(item => `<li>${renderInlineMarkdown(item)}</li>`).join('')}</${listType}>`)
    listType = ''
    listItems = []
  }

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const rawLine = lines[lineIndex] ?? ''
    const line = rawLine.trimEnd()
    const trimmed = line.trim()

    if (!trimmed) {
      flushParagraph()
      flushList()
      continue
    }

    if (trimmed.startsWith(placeholderPrefix)) {
      flushParagraph()
      flushList()
      htmlParts.push(trimmed)
      continue
    }

    const standaloneHtml = renderStandaloneHtml(trimmed)
    if (standaloneHtml !== null) {
      flushParagraph()
      flushList()
      if (standaloneHtml) htmlParts.push(standaloneHtml)
      continue
    }

    const tableAlignments = lineIndex + 1 < lines.length ? parseMarkdownTableAlignments(lines[lineIndex + 1] ?? '') : null
    if (trimmed.includes('|') && tableAlignments) {
      const headers = splitMarkdownTableRow(trimmed)
      if (headers.length >= 2 && headers.length === tableAlignments.length) {
        const tableRows: string[][] = []
        let rowIndex = lineIndex + 2

        while (rowIndex < lines.length) {
          const rowLine = (lines[rowIndex] ?? '').trim()
          if (!rowLine || rowLine.startsWith(placeholderPrefix) || !rowLine.includes('|')) break

          const cells = splitMarkdownTableRow(rowLine)
          if (cells.length < 2) break
          tableRows.push(cells)
          rowIndex += 1
        }

        flushParagraph()
        flushList()
        htmlParts.push(renderMarkdownTable(headers, tableAlignments, tableRows))
        lineIndex = rowIndex - 1
        continue
      }
    }

    const blockquoteMatch = trimmed.match(/^>\s?(.*)$/)
    if (blockquoteMatch) {
      const blockquoteLines: string[] = [blockquoteMatch[1] ?? '']
      let quoteIndex = lineIndex + 1

      while (quoteIndex < lines.length) {
        const quoteLine = (lines[quoteIndex] ?? '').trim()
        const quoteMatch = quoteLine.match(/^>\s?(.*)$/)
        if (!quoteMatch) break
        blockquoteLines.push(quoteMatch[1] ?? '')
        quoteIndex += 1
      }

      flushParagraph()
      flushList()
      htmlParts.push(renderBlockquote(blockquoteLines))
      lineIndex = quoteIndex - 1
      continue
    }

    if (MARKDOWN_HR_RE.test(trimmed.replace(/\s+/g, ''))) {
      flushParagraph()
      flushList()
      htmlParts.push('<hr />')
      continue
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/)
    if (headingMatch) {
      flushParagraph()
      flushList()
      const headingMarks = headingMatch[1] ?? '#'
      const headingText = headingMatch[2] ?? ''
      const level = headingMarks.length
      htmlParts.push(`<h${level}>${renderInlineMarkdown(headingText)}</h${level}>`)
      continue
    }

    const unorderedMatch = trimmed.match(/^[-*]\s+(.+)$/)
    if (unorderedMatch) {
      flushParagraph()
      if (listType && listType !== 'ul') flushList()
      listType = 'ul'
      const unorderedText = unorderedMatch[1] ?? ''
      listItems.push(unorderedText)
      continue
    }

    const orderedMatch = trimmed.match(/^\d+[.)]\s+(.+)$/)
    if (orderedMatch) {
      flushParagraph()
      if (listType && listType !== 'ol') flushList()
      listType = 'ol'
      const orderedText = orderedMatch[1] ?? ''
      listItems.push(orderedText)
      continue
    }

    if (listType) flushList()
    paragraphBuffer.push(trimmed)
  }

  flushParagraph()
  flushList()

  return htmlParts
    .join('')
    .replace(new RegExp(`${placeholderPrefix}(\\d+)__`, 'g'), (_, index: string) => codeBlocks[Number(index)] || '')
}

export const renderRichContent = (value: string): string => {
  const source = String(value || '').replace(/\r\n/g, '\n')
  if (!source.trim()) return '<p></p>'

  const trimmed = source.trim()
  const standaloneHtml = renderRichContentStandaloneHtml(trimmed)
  if (standaloneHtml !== null) return standaloneHtml || '<p></p>'

  const { markdown, footnotes } = extractRichMarkdownFootnotes(source)
  const rendered = `${marked.parse(markdown, markedOptions) as string}${renderRichMarkdownFootnotes(footnotes)}`

  const sanitized = sanitizeHtmlFragmentByMode(rendered, 'rich')
  return sanitized || '<p></p>'
}
