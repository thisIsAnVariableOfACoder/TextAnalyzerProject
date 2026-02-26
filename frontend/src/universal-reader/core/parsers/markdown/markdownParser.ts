import {
  createCodeBlock,
  createEmptyDocumentAst,
  createHeading,
  createMetadata,
  createParagraph,
  createSection,
  createTable,
} from '../../ast/nodeFactory'
import { sanitizeTextForAst } from '../utils/sanitize'
import type { ParseContext, ParsedDocumentResult } from '../types'

export async function parseMarkdown(file: File, context: ParseContext): Promise<ParsedDocumentResult> {
  const raw = await file.text()
  const source = sanitizeTextForAst(raw)
  const lines = source.split('\n')

  const blocks: Array<ReturnType<typeof createParagraph> | ReturnType<typeof createHeading> | ReturnType<typeof createCodeBlock> | ReturnType<typeof createTable>> = []
  const warnings: string[] = []

  let inCode = false
  let codeLanguage = ''
  let codeBuffer: string[] = []
  let paragraphBuffer: string[] = []
  let words = 0
  let chars = 0

  const flushParagraph = () => {
    const text = paragraphBuffer.join(' ').trim()
    if (!text) {
      paragraphBuffer = []
      return
    }
    blocks.push(createParagraph(text))
    words += text.split(/\s+/).filter(Boolean).length
    chars += text.length
    paragraphBuffer = []
  }

  const flushCode = () => {
    const code = codeBuffer.join('\n').trimEnd()
    if (!code) {
      codeBuffer = []
      return
    }
    blocks.push(createCodeBlock(code, codeLanguage || undefined))
    words += code.split(/\s+/).filter(Boolean).length
    chars += code.length
    codeBuffer = []
    codeLanguage = ''
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const trimmed = line.trimEnd()

    if (trimmed.startsWith('```')) {
      if (inCode) {
        flushCode()
        inCode = false
      } else {
        flushParagraph()
        inCode = true
        codeLanguage = trimmed.replace('```', '').trim()
      }
      continue
    }

    if (inCode) {
      codeBuffer.push(line)
      continue
    }

    if (!trimmed.trim()) {
      flushParagraph()
      continue
    }

    const heading = /^(#{1,6})\s+(.+)$/.exec(trimmed)
    if (heading) {
      flushParagraph()
      const level = Math.min(heading[1].length, 6) as 1 | 2 | 3 | 4 | 5 | 6
      const headingText = heading[2].trim()
      blocks.push(createHeading(headingText, level))
      words += headingText.split(/\s+/).filter(Boolean).length
      chars += headingText.length
      continue
    }

    if (trimmed.includes('|') && index + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[index + 1])) {
      flushParagraph()
      const rows: string[][] = []
      const start = index
      while (index < lines.length && lines[index].includes('|') && lines[index].trim()) {
        const cells = lines[index]
          .split('|')
          .map((cell) => cell.trim())
          .filter((cell, cellIndex, all) => !(cellIndex === 0 && cell === '' && all.length > 1))
        if (cells.length > 0) rows.push(cells)
        index += 1
      }
      index -= 1

      const tableRows = rows.filter((_, rowIndex) => rowIndex !== 1 || rowIndex <= start)
      if (tableRows.length) {
        blocks.push(createTable(tableRows))
      }
      continue
    }

    paragraphBuffer.push(trimmed.trim())

    context.onProgress?.({
      phase: 'parsing',
      progress: Math.floor((index / Math.max(lines.length, 1)) * 95),
      loadedBytes: Math.floor((index / Math.max(lines.length, 1)) * file.size),
      totalBytes: file.size,
      message: 'Parsing markdown sections',
    })
  }

  flushParagraph()
  if (inCode) {
    warnings.push('Unclosed markdown code fence detected. Parsed remaining lines as code block.')
    flushCode()
  }

  const ast = createEmptyDocumentAst({
    fileName: file.name,
    fileSizeBytes: file.size,
    mimeType: file.type || 'text/markdown',
    format: context.format,
    parserWarnings: warnings,
  })

  ast.sections = [createSection('Markdown', blocks)]
  ast.metadata.wordCount = words
  ast.metadata.characterCount = chars
  ast.globalMetadata.push(createMetadata('parser', 'markdown-adapter-v1'))

  context.onProgress?.({
    phase: 'normalizing',
    progress: 100,
    loadedBytes: file.size,
    totalBytes: file.size,
    message: 'Markdown AST ready',
  })

  return { ast, warnings }
}

