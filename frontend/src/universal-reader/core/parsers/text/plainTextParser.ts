import {
  createCodeBlock,
  createEmptyDocumentAst,
  createMetadata,
  createParagraph,
  createSection,
  createTable,
} from '../../ast/nodeFactory'
import { safeJsonStringify, sanitizeHtmlContent, sanitizeTextForAst } from '../utils/sanitize'
import type { ParseContext, ParsedDocumentResult } from '../types'

function splitCsvLine(input: string): string[] {
  const cells: string[] = []
  let cell = ''
  let inQuotes = false

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i]

    if (ch === '"') {
      if (inQuotes && input[i + 1] === '"') {
        cell += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (ch === ',' && !inQuotes) {
      cells.push(cell.trim())
      cell = ''
      continue
    }

    cell += ch
  }

  cells.push(cell.trim())
  return cells
}

export async function parseGenericText(file: File, context: ParseContext): Promise<ParsedDocumentResult> {
  const rawText = await file.text()
  const warnings: string[] = []
  let source = sanitizeTextForAst(rawText)

  if (context.format === 'html') {
    source = sanitizeHtmlContent(source)
    warnings.push('HTML scripts and active content were removed by sanitizer.')
  }

  if (context.format === 'json') {
    try {
      source = safeJsonStringify(JSON.parse(source))
    } catch {
      warnings.push('Invalid JSON detected, rendered as plain text.')
    }
  }

  const ast = createEmptyDocumentAst({
    fileName: file.name,
    fileSizeBytes: file.size,
    mimeType: file.type || 'text/plain',
    format: context.format,
    parserWarnings: warnings,
  })

  const lines = source.split('\n')
  const blocks = []
  let words = 0
  let chars = 0

  if (context.format === 'csv') {
    const rows = lines.filter((line) => line.trim()).map((line) => splitCsvLine(line))
    if (rows.length) {
      blocks.push(createTable(rows))
      for (const row of rows) {
        for (const value of row) {
          words += value.split(/\s+/).filter(Boolean).length
          chars += value.length
        }
      }
    }
  } else if (context.format === 'xml' || context.format === 'yaml' || context.format === 'ini') {
    blocks.push(createCodeBlock(source.trim(), context.format))
    words += source.split(/\s+/).filter(Boolean).length
    chars += source.length
  } else {
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i].trimEnd()
      if (!line.trim()) continue
      blocks.push(createParagraph(line))
      words += line.split(/\s+/).filter(Boolean).length
      chars += line.length

      if (i % 1000 === 0) {
        context.onProgress?.({
          phase: 'parsing',
          progress: Math.floor((i / Math.max(lines.length, 1)) * 95),
          loadedBytes: Math.floor((i / Math.max(lines.length, 1)) * file.size),
          totalBytes: file.size,
          message: `Normalizing ${context.format.toUpperCase()} content`,
        })
        await new Promise((resolve) => setTimeout(resolve, 0))
      }
    }
  }

  if (!blocks.length) {
    blocks.push(createParagraph(''))
  }

  ast.sections = [createSection('Content', blocks)]
  ast.metadata.wordCount = words
  ast.metadata.characterCount = chars
  ast.globalMetadata.push(createMetadata('parser', 'generic-text-v1'))

  context.onProgress?.({
    phase: 'normalizing',
    progress: 100,
    loadedBytes: file.size,
    totalBytes: file.size,
    message: 'Text AST completed',
  })

  return { ast, warnings }
}

