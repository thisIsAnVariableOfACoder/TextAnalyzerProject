import JSZip from 'jszip'
import {
  createEmptyDocumentAst,
  createHeading,
  createMetadata,
  createParagraph,
  createSection,
} from '../../ast/nodeFactory'
import { sanitizeTextForAst } from '../utils/sanitize'
import type { ParseContext, ParsedDocumentResult } from '../types'

function parseWordXmlToBlocks(xmlText: string) {
  const parser = new DOMParser()
  const xml = parser.parseFromString(xmlText, 'application/xml')
  const parserError = xml.querySelector('parsererror')

  if (parserError) {
    throw new Error('Invalid DOCX XML structure')
  }

  const paragraphNodes = Array.from(xml.getElementsByTagName('w:p'))
  const blocks: Array<ReturnType<typeof createParagraph> | ReturnType<typeof createHeading>> = []

  for (const p of paragraphNodes) {
    const textNodes = Array.from(p.getElementsByTagName('w:t'))
    const text = textNodes.map((node) => node.textContent || '').join('').trim()
    if (!text) continue

    const styleNode = p.getElementsByTagName('w:pStyle')[0]
    const styleVal = styleNode?.getAttribute('w:val') || ''
    const headingMatch = /^Heading([1-6])$/i.exec(styleVal)

    if (headingMatch) {
      blocks.push(createHeading(text, Number(headingMatch[1]) as 1 | 2 | 3 | 4 | 5 | 6))
    } else {
      blocks.push(createParagraph(text))
    }
  }

  return blocks
}

export async function parseDocx(file: File, context: ParseContext): Promise<ParsedDocumentResult> {
  const warnings: string[] = []
  const buffer = await file.arrayBuffer()

  const zip = await JSZip.loadAsync(buffer)
  const documentXmlFile = zip.file('word/document.xml')

  if (!documentXmlFile) {
    throw new Error('DOCX document.xml not found in OpenXML archive')
  }

  const xmlText = sanitizeTextForAst(await documentXmlFile.async('text'))
  const blocks = parseWordXmlToBlocks(xmlText)

  context.onProgress?.({
    phase: 'parsing',
    progress: 80,
    loadedBytes: file.size,
    totalBytes: file.size,
    message: 'Parsed OpenXML document.xml',
  })

  const ast = createEmptyDocumentAst({
    fileName: file.name,
    fileSizeBytes: file.size,
    mimeType: file.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    format: context.format,
    parserWarnings: warnings,
  })

  ast.sections = [createSection('Document', blocks)]

  const plainText = blocks
    .flatMap((block) => (block.type === 'heading' ? block.runs.map((run) => run.text) : block.runs.map((run) => run.text)))
    .join('\n')

  ast.metadata.wordCount = plainText.split(/\s+/).filter(Boolean).length
  ast.metadata.characterCount = plainText.length
  ast.globalMetadata.push(
    createMetadata('parser', 'docx-openxml-v1'),
    createMetadata('xml-source', 'word/document.xml'),
  )

  context.onProgress?.({
    phase: 'normalizing',
    progress: 100,
    loadedBytes: file.size,
    totalBytes: file.size,
    message: 'DOCX AST completed',
  })

  return { ast, warnings }
}

