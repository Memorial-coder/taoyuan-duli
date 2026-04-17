const TEXT_NODE = 3
const ELEMENT_NODE = 1
const HTML_PLACEHOLDER_PREFIX = '@@TAOYUANHTML'
const HTML_PLACEHOLDER_SUFFIX = '@@'
const HTML_TAG_RE = /<\/?[a-zA-Z][\w:-]*(?:\s+[^<>]*?)?\s*\/?>/g
const STANDALONE_HTML_RE = /^<(?:img|br|hr)\b[^>]*\/?>$|^<([a-zA-Z][\w:-]*)(?:\s+[^<>]*?)?>[\s\S]*<\/\1>$/i

const ALLOWED_HTML_TAGS = new Set([
  'a',
  'blockquote',
  'br',
  'code',
  'div',
  'em',
  'figcaption',
  'figure',
  'h1',
  'h2',
  'h3',
  'hr',
  'i',
  'img',
  'li',
  'ol',
  'p',
  'pre',
  'span',
  'strong',
  'table',
  'tbody',
  'td',
  'th',
  'thead',
  'tr',
  'ul',
])

const DROP_HTML_TAGS = new Set(['embed', 'iframe', 'link', 'meta', 'object', 'script', 'style'])
const VOID_HTML_TAGS = new Set(['br', 'hr', 'img'])
const GLOBAL_ALLOWED_ATTRS = new Set(['title'])
const SAFE_TARGETS = new Set(['_blank', '_self'])
const SAFE_LOADING = new Set(['eager', 'lazy'])
const SAFE_ALIGN = new Set(['center', 'left', 'right'])
const SAFE_DIMENSION_RE = /^\d{1,4}%?$/
const SAFE_SPAN_RE = /^\d{1,2}$/

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

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

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

const sanitizeUrl = (value: string): string => {
  const trimmed = normalizeLegacyUploadUrl(value.trim())
  if (!trimmed) return ''
  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) return trimmed
  return ''
}

const buildAttributeString = (attrs: Map<string, string>): string => {
  return Array.from(attrs.entries())
    .map(([name, value]) => ` ${name}="${escapeHtml(value)}"`)
    .join('')
}

const sanitizeElementStartTag = (element: Element, tagName: string): string | null => {
  const allowedAttrs = new Set([...(TAG_ALLOWED_ATTRS[tagName] ?? []), ...GLOBAL_ALLOWED_ATTRS])
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

    if (name === 'colspan' || name === 'rowspan') {
      if (SAFE_SPAN_RE.test(value)) attrs.set(name, value)
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

  return `<${tagName}${buildAttributeString(attrs)}>`
}

const sanitizeHtmlNode = (node: Node): string => {
  if (node.nodeType === TEXT_NODE) return escapeHtml(node.textContent || '')
  if (node.nodeType !== ELEMENT_NODE) return ''

  const element = node as Element
  const tagName = element.tagName.toLowerCase()

  if (DROP_HTML_TAGS.has(tagName)) return ''
  if (!ALLOWED_HTML_TAGS.has(tagName)) {
    return Array.from(element.childNodes).map(child => sanitizeHtmlNode(child)).join('')
  }

  const startTag = sanitizeElementStartTag(element, tagName)
  if (!startTag) return Array.from(element.childNodes).map(child => sanitizeHtmlNode(child)).join('')
  if (VOID_HTML_TAGS.has(tagName)) return startTag

  const childrenHtml = Array.from(element.childNodes).map(child => sanitizeHtmlNode(child)).join('')
  return `${startTag}${childrenHtml}</${tagName}>`
}

const sanitizeHtmlFragment = (value: string): string => {
  if (typeof document === 'undefined') return escapeHtml(value)

  const template = document.createElement('template')
  template.innerHTML = value
  return Array.from(template.content.childNodes).map(node => sanitizeHtmlNode(node)).join('')
}

const sanitizeHtmlTagToken = (value: string): string => {
  const match = value.match(/^<\s*(\/)?\s*([a-zA-Z][\w:-]*)/i)
  if (!match) return escapeHtml(value)

  const isClosing = Boolean(match[1])
  const tagName = String(match[2] || '').toLowerCase()

  if (DROP_HTML_TAGS.has(tagName)) return ''
  if (!ALLOWED_HTML_TAGS.has(tagName)) return escapeHtml(value)

  if (isClosing) return VOID_HTML_TAGS.has(tagName) ? '' : `</${tagName}>`
  if (typeof document === 'undefined') return escapeHtml(value)

  const template = document.createElement('template')
  template.innerHTML = value
  const element = template.content.firstElementChild
  if (!element || element.tagName.toLowerCase() !== tagName) return escapeHtml(value)

  return sanitizeElementStartTag(element, tagName) ?? ''
}

const preserveSafeHtmlTags = (value: string): { text: string; placeholders: string[] } => {
  const placeholders: string[] = []

  const text = value.replace(HTML_TAG_RE, match => {
    const safeTag = sanitizeHtmlTagToken(match)
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

const renderInlineMarkdown = (value: string): string => {
  const { text, placeholders } = preserveSafeHtmlTags(value)
  let html = escapeHtml(text)

  html = html.replace(/!\[([^\]]*?)\]\(([^)]+?)\)/g, (_, alt: string, url: string) => {
    const safeUrl = sanitizeUrl(url)
    if (!safeUrl) return alt || '鍥剧墖'
    return `<img src="${escapeHtml(safeUrl)}" alt="${escapeHtml(alt || '')}" loading="lazy" />`
  })
  html = html.replace(/`([^`]+?)`/g, '<code>$1</code>')
  html = html.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/__([^_]+?)__/g, '<strong>$1</strong>')
  html = html.replace(/\*([^*]+?)\*/g, '<em>$1</em>')
  html = html.replace(/_([^_]+?)_/g, '<em>$1</em>')
  html = html.replace(/\[([^\]]+?)\]\(([^)]+?)\)/g, (_, textValue: string, url: string) => {
    const safeUrl = sanitizeUrl(url)
    if (!safeUrl) return textValue
    return `<a href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer">${textValue}</a>`
  })

  return restoreSafeHtmlTags(html, placeholders)
}

const renderParagraph = (lines: string[]): string => {
  const content = lines.map(line => renderInlineMarkdown(line)).join('<br />')
  return `<p>${content}</p>`
}

const renderStandaloneHtml = (value: string): string | null => {
  if (!STANDALONE_HTML_RE.test(value)) return null
  return sanitizeHtmlFragment(value)
}

export const renderSafeMarkdown = (value: string): string => {
  const source = String(value || '').replace(/\r\n/g, '\n')
  if (!source.trim()) return '<p></p>'

  const codeBlocks: string[] = []
  const placeholderPrefix = '__TAOYUAN_CODE_BLOCK_'

  const withoutCode = source.replace(/```([\w-]*)\n([\s\S]*?)```/g, (_, lang: string, code: string) => {
    const index = codeBlocks.length
    const langClass = lang ? ` class="language-${escapeHtml(lang)}"` : ''
    codeBlocks.push(`<pre><code${langClass}>${escapeHtml(code.trimEnd())}</code></pre>`)
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

  for (const rawLine of lines) {
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
