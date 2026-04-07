export const prerender = false

import { makeHandler } from '@keystatic/astro/api'
import config from '../../../../keystatic.config'
import type { APIContext } from 'astro'

const keystaticHandler = makeHandler({ config })

export async function ALL(context: APIContext) {
  const url = new URL(context.request.url)

  // Astro's Vercel adapter falls back to req.socket.remotePort when
  // x-forwarded-port is absent, injecting a random ephemeral port into the URL.
  // Keystatic uses request.url to build the OAuth redirect_uri, so we must fix it.
  const publicUrl = new URL(
    url.pathname + url.search,
    'https://www.averde.ai'
  )

  const fixedRequest = new Request(publicUrl.toString(), {
    method: context.request.method,
    headers: context.request.headers,
    body: context.request.method === 'GET' || context.request.method === 'HEAD'
      ? null
      : context.request.body,
  })

  // Direct mutation — spread may not override non-enumerable or getter-backed props
  Object.defineProperty(context, 'request', {
    value: fixedRequest,
    writable: true,
    configurable: true,
    enumerable: true,
  })

  return keystaticHandler(context)
}
