import type { DocumentAst } from '../../types/ast'
import type { LayoutBlock } from '../../types/layout'

export interface SearchHit {
  id: string
  blockId?: string
  nodeId: string
  excerpt: string
  score: number
  pageIndex: number
}

function normalize(input: string): string {
  return input.toLowerCase().replace(/\s+/g, ' ').trim()
}

function buildExcerpt(content: string, query: string, radius = 42): string {
  const lower = content.toLowerCase()
  const idx = lower.indexOf(query.toLowerCase())
  if (idx < 0) return content.slice(0, radius * 2)
  const start = Math.max(0, idx - radius)
  const end = Math.min(content.length, idx + query.length + radius)
  return `${start > 0 ? '…' : ''}${content.slice(start, end)}${end < content.length ? '…' : ''}`
}

export function searchLayoutBlocks(blocks: LayoutBlock[], rawQuery: string): SearchHit[] {
  const query = normalize(rawQuery)
  if (!query) return []

  const hits: SearchHit[] = []

  for (const block of blocks) {
    const content = block.searchableText || ''
    const normalized = normalize(content)
    const first = normalized.indexOf(query)
    if (first < 0) continue

    let count = 0
    let from = 0
    while (true) {
      const i = normalized.indexOf(query, from)
      if (i < 0) break
      count += 1
      from = i + query.length
    }

    const score = count * 10 + Math.max(0, 100 - first)
    hits.push({
      id: `hit-${block.id}-${first}`,
      blockId: block.id,
      nodeId: block.nodeId,
      excerpt: buildExcerpt(content, rawQuery),
      score,
      pageIndex: block.pageIndex,
    })
  }

  return hits.sort((a, b) => b.score - a.score)
}

export function searchAst(ast: DocumentAst, rawQuery: string): SearchHit[] {
  const query = normalize(rawQuery)
  if (!query) return []

  const hits: SearchHit[] = []

  for (const section of ast.sections) {
    for (const block of section.children) {
      const content =
        block.type === 'table'
          ? block.rows
              .map((row) => row.cells.map((cell) => cell.runs.map((run) => run.text).join('')).join(' | '))
              .join('\n')
          : block.type === 'codeBlock'
            ? block.text
            : block.type === 'image'
              ? block.altText || ''
              : block.runs.map((run) => run.text).join('')

      const normalized = normalize(content)
      const first = normalized.indexOf(query)
      if (first < 0) continue

      hits.push({
        id: `ast-hit-${block.id}-${first}`,
        nodeId: block.id,
        excerpt: buildExcerpt(content, rawQuery),
        score: Math.max(0, 100 - first),
        pageIndex: 0,
      })
    }
  }

  return hits.sort((a, b) => b.score - a.score)
}

