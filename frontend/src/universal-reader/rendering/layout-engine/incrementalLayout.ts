import type { DocumentAst } from '../../types/ast'
import type { LayoutDocument } from '../../types/layout'
import { buildLayout } from './layoutEngine'

function idle(): Promise<void> {
  return new Promise((resolve) => {
    const done = () => resolve()
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(done, { timeout: 20 })
      return
    }
    setTimeout(done, 0)
  })
}

export async function buildLayoutIncremental(ast: DocumentAst, viewportWidth: number): Promise<LayoutDocument> {
  await idle()
  return buildLayout(ast, { viewportWidth })
}

