import type { DocumentFormat } from '../../../types/ast'
import { parseDocx } from '../docx/docxParser'
import { parseMarkdown } from '../markdown/markdownParser'
import { parseGenericText } from '../text/plainTextParser'
import { parseTxtStream } from '../txt/streamingTxtParser'
import { inferFormat } from '../utils/fileType'
import type { ParseContext, ParsedDocumentResult } from '../types'

type ParserFn = (file: File, context: ParseContext) => Promise<ParsedDocumentResult>

const TEXT_LIKE_FORMATS: DocumentFormat[] = ['rtf', 'json', 'xml', 'yaml', 'csv', 'log', 'ini', 'html', 'doc', 'odt']

const parserMap: Record<DocumentFormat, ParserFn | null> = {
  txt: parseTxtStream,
  md: parseMarkdown,
  docx: parseDocx,
  rtf: parseGenericText,
  json: parseGenericText,
  xml: parseGenericText,
  yaml: parseGenericText,
  csv: parseGenericText,
  log: parseGenericText,
  ini: parseGenericText,
  html: parseGenericText,
  doc: parseGenericText,
  odt: parseGenericText,
  pdf: null,
  unknown: null,
}

export function detectFormat(file: File): DocumentFormat {
  return inferFormat(file.name, file.type)
}

export async function parseWithRegistry(file: File, context: Omit<ParseContext, 'format'>): Promise<ParsedDocumentResult> {
  const format = detectFormat(file)

  if (format === 'pdf') {
    throw new Error('PDF parsing pipeline is planned for Phase 3. Use PDF native renderer adapter for now.')
  }

  const parser = parserMap[format]
  if (!parser) {
    throw new Error(`Unsupported format: ${format}`)
  }

  return parser(file, { ...context, format })
}

export function isTextSearchableFormat(format: DocumentFormat): boolean {
  return format === 'txt' || format === 'md' || format === 'docx' || TEXT_LIKE_FORMATS.includes(format)
}

