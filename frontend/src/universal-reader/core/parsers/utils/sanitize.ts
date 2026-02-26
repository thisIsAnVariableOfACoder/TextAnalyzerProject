export function sanitizeHtmlContent(input: string): string {
  const parser = new DOMParser()
  const documentNode = parser.parseFromString(input, 'text/html')

  const blockedTags = ['script', 'iframe', 'object', 'embed', 'link', 'style']
  blockedTags.forEach((tag) => {
    documentNode.querySelectorAll(tag).forEach((node) => node.remove())
  })

  documentNode.querySelectorAll('*').forEach((element) => {
    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase()
      const value = attribute.value.toLowerCase()
      if (name.startsWith('on')) {
        element.removeAttribute(attribute.name)
      }
      if ((name === 'href' || name === 'src') && value.startsWith('javascript:')) {
        element.removeAttribute(attribute.name)
      }
    })
  })

  return documentNode.body.innerHTML
}

export function sanitizeTextForAst(input: string): string {
  return input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
}

export function safeJsonStringify(input: unknown): string {
  try {
    return JSON.stringify(input, null, 2)
  } catch {
    return String(input)
  }
}

