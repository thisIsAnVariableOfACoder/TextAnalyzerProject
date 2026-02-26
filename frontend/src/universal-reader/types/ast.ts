export type DocumentFormat =
  | 'pdf'
  | 'docx'
  | 'doc'
  | 'rtf'
  | 'odt'
  | 'txt'
  | 'md'
  | 'json'
  | 'xml'
  | 'yaml'
  | 'csv'
  | 'log'
  | 'ini'
  | 'html'
  | 'unknown'

export type AstNodeType =
  | 'section'
  | 'paragraph'
  | 'heading'
  | 'textRun'
  | 'table'
  | 'image'
  | 'codeBlock'
  | 'metadata'

export interface AstNodeBase {
  id: string
  type: AstNodeType
}

export interface TextRunNode extends AstNodeBase {
  type: 'textRun'
  text: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
}

export interface ParagraphNode extends AstNodeBase {
  type: 'paragraph'
  runs: TextRunNode[]
}

export interface HeadingNode extends AstNodeBase {
  type: 'heading'
  level: 1 | 2 | 3 | 4 | 5 | 6
  runs: TextRunNode[]
}

export interface CodeBlockNode extends AstNodeBase {
  type: 'codeBlock'
  language?: string
  text: string
}

export interface TableCell {
  id: string
  runs: TextRunNode[]
}

export interface TableRow {
  id: string
  cells: TableCell[]
}

export interface TableNode extends AstNodeBase {
  type: 'table'
  rows: TableRow[]
}

export interface ImageNode extends AstNodeBase {
  type: 'image'
  altText?: string
  srcRef?: string
  width?: number
  height?: number
}

export interface MetadataNode extends AstNodeBase {
  type: 'metadata'
  key: string
  value: string
}

export type BlockNode = ParagraphNode | HeadingNode | TableNode | ImageNode | CodeBlockNode

export interface SectionNode extends AstNodeBase {
  type: 'section'
  title?: string
  children: BlockNode[]
}

export interface DocumentMetadata {
  fileName: string
  fileSizeBytes: number
  mimeType: string
  format: DocumentFormat
  createdAt: string
  pageCount?: number
  wordCount?: number
  characterCount?: number
  parserWarnings?: string[]
}

export interface DocumentAst {
  id: string
  metadata: DocumentMetadata
  sections: SectionNode[]
  globalMetadata: MetadataNode[]
}

