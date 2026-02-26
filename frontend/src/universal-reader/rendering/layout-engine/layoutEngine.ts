import type { BlockNode, DocumentAst } from '../../types/ast'
import type { LayoutBlock, LayoutDocument, ViewportState } from '../../types/layout'

interface LayoutOptions {
  viewportWidth: number
  pageHeight?: number
  pageWidth?: number
  margin?: number
  baseFontSize?: number
  lineHeight?: number
}

function extractTextFromBlock(block: BlockNode): string {
  if (block.type === 'codeBlock') return block.text
  if (block.type === 'table') {
    return block.rows
      .map((row) => row.cells.map((cell) => cell.runs.map((run) => run.text).join('')).join(' | '))
      .join('\n')
  }
  if (block.type === 'image') return block.altText || ''
  return block.runs.map((run) => run.text).join('')
}

function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    if (!word) continue
    const candidate = current ? `${current} ${word}` : word
    if (candidate.length <= maxCharsPerLine) {
      current = candidate
    } else {
      if (current) lines.push(current)
      current = word
    }
  }

  if (current) lines.push(current)
  return lines.length ? lines : ['']
}

export function buildLayout(ast: DocumentAst, options: LayoutOptions): LayoutDocument {
  const pageHeight = options.pageHeight ?? 1200
  const pageWidth = options.pageWidth ?? Math.max(900, options.viewportWidth)
  const margin = options.margin ?? 48
  const baseFontSize = options.baseFontSize ?? 16
  const lineHeight = options.lineHeight ?? 1.6
  const contentWidth = pageWidth - margin * 2

  const blocks: LayoutBlock[] = []
  let currentY = margin
  let pageIndex = 0

  for (const section of ast.sections) {
    for (const node of section.children) {
      const text = extractTextFromBlock(node)
      const nodeFont = node.type === 'heading' ? Math.max(18, baseFontSize + (7 - node.level) * 1.2) : baseFontSize
      const maxCharsPerLine = Math.max(20, Math.floor(contentWidth / (nodeFont * 0.56)))
      const wrapped = node.type === 'codeBlock' ? text.split('\n') : wrapText(text, maxCharsPerLine)
      const linePx = nodeFont * lineHeight
      const blockHeight = Math.max(linePx, wrapped.length * linePx + 10)

      if (currentY + blockHeight + margin > (pageIndex + 1) * pageHeight) {
        pageIndex += 1
        currentY = pageIndex * pageHeight + margin
      }

      blocks.push({
        id: `layout-${node.id}`,
        nodeId: node.id,
        kind: node.type === 'heading' ? 'heading' : node.type === 'codeBlock' ? 'code' : node.type,
        pageIndex,
        x: margin,
        y: currentY,
        width: contentWidth,
        height: blockHeight,
        fontSize: nodeFont,
        lineHeight,
        fontWeight: node.type === 'heading' ? 700 : 400,
        color: '#0f172a',
        lines: wrapped.map((line, index) => ({ text: line, yOffset: index * linePx })),
        searchableText: text,
      })

      currentY += blockHeight + (node.type === 'heading' ? 12 : 8)
    }
  }

  const totalHeight = Math.max((pageIndex + 1) * pageHeight, currentY + margin)
  return {
    blocks,
    totalHeight,
    pageCount: pageIndex + 1,
  }
}

export function getVisibleBlocks(layout: LayoutDocument, viewport: ViewportState): LayoutBlock[] {
  const minY = Math.max(0, viewport.scrollTop - viewport.overscan)
  const maxY = viewport.scrollTop + viewport.viewportHeight + viewport.overscan

  return layout.blocks.filter((block) => {
    const end = block.y + block.height
    return end >= minY && block.y <= maxY
  })
}

