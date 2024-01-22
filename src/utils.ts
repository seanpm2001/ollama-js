import type { Fetch, ErrorResponse } from './interfaces.js'

const checkOk = async (response: Response): Promise<void> => {
  if (!response.ok) {
    let message = `Error ${response.status}: ${response.statusText}`

    if (response.headers.get('content-type')?.includes('application/json')) {
      try {
        const errorResponse = (await response.json()) as ErrorResponse
        message = errorResponse.error || message
      } catch (error) {
        console.log('Failed to parse error response as JSON')
      }
    } else {
      try {
        console.log('Getting text from response')
        const textResponse = await response.text()
        message = textResponse || message
      } catch (error) {
        console.log('Failed to get text from error response')
      }
    }

    throw new Error(message)
  }
}

export const get = async (fetch: Fetch, host: string): Promise<Response> => {
  const response = await fetch(host)

  await checkOk(response)

  return response
}

export const head = async (fetch: Fetch, host: string): Promise<Response> => {
  const response = await fetch(host, {
    method: 'HEAD',
  })

  await checkOk(response)

  return response
}

export const post = async (
  fetch: Fetch,
  host: string,
  data?: Record<string, unknown> | BodyInit,
): Promise<Response> => {
  const isRecord = (input: any): input is Record<string, unknown> => {
    return input !== null && typeof input === 'object' && !Array.isArray(input)
  }

  const formattedData = isRecord(data) ? JSON.stringify(data) : data

  const response = await fetch(host, {
    method: 'POST',
    body: formattedData,
  })

  await checkOk(response)

  return response
}

export const del = async (
  fetch: Fetch,
  host: string,
  data?: Record<string, unknown>,
): Promise<Response> => {
  const response = await fetch(host, {
    method: 'DELETE',
    body: JSON.stringify(data),
  })

  await checkOk(response)

  return response
}

export const parseJSON = async function* <T = unknown>(
  itr: ReadableStream<Uint8Array>,
): AsyncGenerator<T> {
  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  // TS is a bit strange here, ReadableStreams are AsyncIterable but TS doesn't see it.
  for await (const chunk of itr as unknown as AsyncIterable<Uint8Array>) {
    buffer += decoder.decode(chunk)

    const parts = buffer.split('\n')

    buffer = parts.pop() ?? ''

    for (const part of parts) {
      try {
        yield JSON.parse(part)
      } catch (error) {
        console.warn('invalid json: ', part)
      }
    }
  }

  for (const part of buffer.split('\n').filter((p) => p !== '')) {
    try {
      yield JSON.parse(part)
    } catch (error) {
      console.warn('invalid json: ', part)
    }
  }
}

export const formatHost = (host: string): string => {
  if (!host) {
    return 'http://127.0.0.1:11434'
  }

  let isExplicitProtocol = host.includes('://')

  if (host.startsWith(':')) {
    // if host starts with ':', prepend the default hostname
    host = `http://127.0.0.1${host}`
    isExplicitProtocol = false
  }

  if (!isExplicitProtocol) {
    host = `http://${host}`
  }

  const url = new URL(host)

  let port = url.port
  if (!port) {
    if (!isExplicitProtocol) {
      port = '11434'
    } else {
      // Assign default ports based on the protocol
      port = url.protocol === 'https:' ? '443' : '80'
    }
  }

  let formattedHost = `${url.protocol}//${url.hostname}:${port}${url.pathname}`
  // remove trailing slashes
  if (formattedHost.endsWith('/')) {
    formattedHost = formattedHost.slice(0, -1)
  }

  return formattedHost
}
