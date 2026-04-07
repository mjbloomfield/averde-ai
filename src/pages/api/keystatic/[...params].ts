export const prerender = false

import { makeHandler } from '@keystatic/astro/api'
import config from '../../../../keystatic.config'
import type { APIContext } from 'astro'

const keystaticHandler = makeHandler({ config })

export async function ALL(context: APIContext) {
  const url = new URL(context.request.url)

  // Astro's Vercel adapter uses req.socket.remotePort as fallback port,
  // injecting a random ephemeral port into request.url. Keystatic uses
  // request.url origin to build the OAuth redirect_uri, so we must fix it.
  const fixedRequest = new Request(
    new URL(url.pathname + url.search, 'https://www.averde.ai').toString(),
    {
      method: context.request.method,
      headers: context.request.headers,
      body: context.request.method === 'GET' || context.request.method === 'HEAD'
        ? null
        : context.request.body,
    }
  )

  // context may be an Astro Proxy — Object.defineProperty won't override getters on it.
  // Wrap in our own Proxy so context.request always returns fixedRequest.
  const patchedContext = new Proxy(context, {
    get(target, prop) {
      if (prop === 'request') return fixedRequest
      return (target as any)[prop]
    },
  })

  return keystaticHandler(patchedContext as APIContext)
}
