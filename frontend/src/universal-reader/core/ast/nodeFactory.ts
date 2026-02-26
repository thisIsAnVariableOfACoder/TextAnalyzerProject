import type {
  BlockNode,
  CodeBlockNode,
  DocumentAst,
  DocumentFormat,
  HeadingNode,
  MetadataNode,
  ParagraphNode,
  SectionNode,
  TableCell,
  TableNode,
  TableRow,
  TextRunNode,
} from '../../types/ast'

let localCounter = 0

function nextId(prefix: string): string {
  localCounter += 1
  return `${prefix}-${Date.now()}-${localCounter}`
}

export function createTextRun(text: string, style?: Partial<TextRunNode>): TextRunNode {
  return {
    id: nextId('run'),
    type: 'textRun',
    text,
    ...style,
  }
}

export function createParagraph(text: string): ParagraphNode {
  return {
    id: nextId('p'),
    type: 'paragraph',
    runs: [createTextRun(text)],
  }
}

export function createHeading(text: string, level: HeadingNode['level']): HeadingNode {
  return {
    id: nextId('h'),
    type: 'heading',
    level,
    runs: [createTextRun(text, { bold: true })],
  }
}

export function createCodeBlock(text: string, language?: string): CodeBlockNode {
  return {
    id: nextId('code'),
    type: 'codeBlock',
    language,
    text,
  }
}

export function createTableCell(text: string): TableCell {
  return {
    id: nextId('cell'),
    runs: [createTextRun(text)],
  }
}

export function createTableRow(values: string[]): TableRow {
  return {
    id: nextId('row'),
    cells: values.map((value) => createTableCell(value)),
  }
}

export function createTable(rows: string[][]): TableNode {
  return {
    id: nextId('table'),
    type: 'table',
    rows: rows.map((row) => createTableRow(row)),
  }
}

export function createSection(title?: string, children: BlockNode[] = []): SectionNode {
  return {
    id: nextId('section'),
    type: 'section',
    title,
    children,
  }
}

export function createMetadata(key: string, value: string): MetadataNode {
  return {
    id: nextId('meta'),
    type: 'metadata',
    key,
    value,
  }
}

export function createEmptyDocumentAst(params: {
  fileName: string
  fileSizeBytes: number
  mimeType: string
  format: DocumentFormat
  parserWarnings?: string[]
}): DocumentAst {
  return {
    id: nextId('doc'),
    metadata: {
      fileName: params.fileName,
      fileSizeBytes: params.fileSizeBytes,
      mimeType: params.mimeType,
      format: params.format,
      createdAt: new Date().toISOString(),
      pageCount: 1,
      wordCount: 0,
      characterCount: 0,
      parserWarnings: params.parserWarnings ?? [],
    },
    sections: [createSection('Main')],
    globalMetadata: [],
  }
}

