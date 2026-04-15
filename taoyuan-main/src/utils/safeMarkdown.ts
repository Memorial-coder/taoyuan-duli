const escapeHtml = (value: string): string => {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const sanitizeUrl = (value: string): string => {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) return trimmed
  return ''
}

const renderInlineMarkdown = (value: string): string => {
  let html = escapeHtml(value)

  html = html.replace(/!\[([^\]]*?)\]\(([^)]+?)\)/g, (_, alt: string, url: string) => {
    const safeUrl = sanitizeUrl(url)
    if (!safeUrl) return alt || '图片'
    return `<img src="${escapeHtml(safeUrl)}" alt="${escapeHtml(alt || '')}" loading="lazy" />`
  })
  html = html.replace(/`([^`]+?)`/g, '<code>$1</code>')
  html = html.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/__([^_]+?)__/g, '<strong>$1</strong>')
  html = html.replace(/\*([^*]+?)\*/g, '<em>$1</em>')
  html = html.replace(/_([^_]+?)_/g, '<em>$1</em>')
  html = html.replace(/\[([^\]]+?)\]\(([^)]+?)\)/g, (_, text: string, url: string) => {
    const safeUrl = sanitizeUrl(url)
    if (!safeUrl) return text
    return `<a href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer">${text}</a>`
  })

  return html
}

const renderParagraph = (lines: string[]): string => {
  const content = lines.map(line => renderInlineMarkdown(line)).join('<br />')
  return `<p>${content}</p>`
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
