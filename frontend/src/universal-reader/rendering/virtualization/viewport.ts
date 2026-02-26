import type { LayoutDocument, ViewportState } from '../../types/layout'

export interface VirtualSlice {
  startIndex: number
  endIndex: number
}

export function computeVirtualSlice(layout: LayoutDocument, viewport: ViewportState): VirtualSlice {
  const minY = Math.max(0, viewport.scrollTop - viewport.overscan)
  const maxY = viewport.scrollTop + viewport.viewportHeight + viewport.overscan

  let startIndex = 0
  let endIndex = layout.blocks.length

  for (let i = 0; i < layout.blocks.length; i += 1) {
    const block = layout.blocks[i]
    if (block.y + block.height >= minY) {
      startIndex = i
      break
    }
  }

  for (let i = startIndex; i < layout.blocks.length; i += 1) {
    const block = layout.blocks[i]
    if (block.y > maxY) {
      endIndex = i
      break
    }
  }

  return { startIndex, endIndex }
}

