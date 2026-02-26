/// <reference lib="webworker" />

import { parseWithRegistry } from '../core/parsers/registry/parserRegistry'
import type { ParseWorkerMessage, ParseWorkerRequest } from '../types/worker'

self.onmessage = async (event: MessageEvent<ParseWorkerRequest>) => {
  const payload = event.data
  if (!payload || payload.type !== 'parse') return

  const { requestId, file } = payload

  try {
    const result = await parseWithRegistry(file, {
      onProgress: (progress) => {
        const message: ParseWorkerMessage = {
          type: 'progress',
          requestId,
          progress,
        }
        self.postMessage(message)
      },
    })

    const message: ParseWorkerMessage = {
      type: 'success',
      requestId,
      ast: result.ast,
      warnings: result.warnings,
    }
    self.postMessage(message)
  } catch (error) {
    const message: ParseWorkerMessage = {
      type: 'error',
      requestId,
      error: error instanceof Error ? error.message : 'Parser worker failed',
    }
    self.postMessage(message)
  }
}

