import type { LayoutBlock } from '../../types/layout'

export interface TextLayerSpan {
  id: string
  blockId: string
  text: string
  x: number
  y: number
  width: number
  height: number
}

export function buildTextLayer(blocks: LayoutBlock[], zoom: number): TextLayerSpan[] {
  const spans: TextLayerSpan[] = []

  for (const block of blocks) {
    const fontSize = block.fontSize * zoom
    const lineHeight = block.fontSize * block.lineHeight * zoom

    for (let i = 0; i < block.lines.length; i += 1) {
      const line = block.lines[i]
      spans.push({
        id: `${block.id}-${i}`,
        blockId: block.id,
        text: line.text,
        x: block.x * zoom,
        y: (block.y + line.yOffset) * zoom,
        width: Math.max(8, line.text.length * fontSize * 0.56),
        height: Math.max(lineHeight, fontSize + 4),
      })
    }
  }

  return spans
}

