import type { DocumentFormat } from '../../../types/ast'

export function inferFormat(fileName: string, mimeType: string): DocumentFormat {
  const ext = fileName.includes('.') ? fileName.split('.').pop()?.toLowerCase() ?? '' : ''
  const byExt: Record<string, DocumentFormat> = {
    pdf: 'pdf',
    docx: 'docx',
    doc: 'doc',
    rtf: 'rtf',
    odt: 'odt',
    txt: 'txt',
    md: 'md',
    markdown: 'md',
    json: 'json',
    xml: 'xml',
    yaml: 'yaml',
    yml: 'yaml',
    csv: 'csv',
    log: 'log',
    ini: 'ini',
    html: 'html',
    htm: 'html',
  }

  if (byExt[ext]) return byExt[ext]

  if (mimeType.includes('pdf')) return 'pdf'
  if (mimeType.includes('wordprocessingml')) return 'docx'
  if (mimeType.includes('msword')) return 'doc'
  if (mimeType.includes('rtf')) return 'rtf'
  if (mimeType.includes('opendocument.text')) return 'odt'
  if (mimeType.includes('markdown')) return 'md'
  if (mimeType.includes('json')) return 'json'
  if (mimeType.includes('xml')) return 'xml'
  if (mimeType.includes('yaml') || mimeType.includes('yml')) return 'yaml'
  if (mimeType.includes('csv')) return 'csv'
  if (mimeType.includes('html')) return 'html'
  if (mimeType.startsWith('text/')) return 'txt'

  return 'unknown'
}

