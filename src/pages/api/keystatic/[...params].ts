export const prerender = false

import { makeHandler } from '@keystatic/astro/api'
import config from '../../../../keystatic.config'
import type { APIContext } from 'astro'

const keystaticHandler = makeHandler({ config })

export async function ALL(context: APIContext) {
  const request = context.request
  const url = new URL(request.url)

  // Vercel's internal routing passes request.url with an ephemeral internal port.
  // Use x-forwarded-host/proto headers to reconstruct the correct public URL.
  // x-forwarded-host may include a port (e.g. "www.averde.ai:59082") — strip it
  const rawHost = request.headers.get('x-forwarded-host') || url.hostname
  const host = rawHost.split(':')[0]
  const proto = request.headers.get('x-forwarded-proto')?.split(',')[0].trim() || 'https'
  const publicUrl = new URL(url.pathname + url.search, `${proto}://${host}`)

  const fixedRequest = new Request(publicUrl.toString(), {
    method: request.method,
    headers: request.headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? null : request.body,
  })

  return keystaticHandler({ ...context, request: fixedRequest })
}
