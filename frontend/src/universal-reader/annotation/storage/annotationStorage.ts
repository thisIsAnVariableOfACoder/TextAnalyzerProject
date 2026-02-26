import type { Annotation } from '../../types/annotation'

const PREFIX = 'universal-reader:annotations:'

export function loadAnnotations(documentId: string): Annotation[] {
  try {
    const raw = localStorage.getItem(`${PREFIX}${documentId}`)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveAnnotations(documentId: string, annotations: Annotation[]): void {
  try {
    localStorage.setItem(`${PREFIX}${documentId}`, JSON.stringify(annotations))
  } catch {
    // ignore quota errors for MVP
  }
}

