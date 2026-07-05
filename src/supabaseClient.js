import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Fail-fast fetch: intet netværkskald må hænge i det uendelige på dårligt mobilnet.
// Uden dette kan ét hængende kald (fx token-refresh ved opstart) reelt låse hele
// appen. Med et loft fejler kaldet hurtigt, så UI'et kan falde tilbage på gemte data
// (offline-cachen) i stedet for at spinne. Storage-uploads/-downloads kan legitimt
// tage lang tid på svagt net, så de får et højt loft; alt andet (auth, læsninger,
// små skrivninger) fejler efter DEFAULT_TIMEOUT_MS.
const DEFAULT_TIMEOUT_MS = 20000
const STORAGE_TIMEOUT_MS = 120000

const timeoutFetch = (input, init = {}) => {
  const url = typeof input === 'string' ? input : (input?.url || input?.href || String(input || ''))
  const timeout = url.includes('/storage/v1/') ? STORAGE_TIMEOUT_MS : DEFAULT_TIMEOUT_MS

  const controller = new AbortController()
  // Respektér et evt. medsendt signal (fx en afbrudt AI-stream) — kombinér med vores timeout.
  const external = init.signal
  const onExternalAbort = () => controller.abort(external?.reason)
  if (external) {
    if (external.aborted) controller.abort(external.reason)
    else external.addEventListener('abort', onExternalAbort, { once: true })
  }
  const timer = setTimeout(
    () => controller.abort(new DOMException('Forbindelsen timede ud', 'TimeoutError')),
    timeout,
  )

  return fetch(input, { ...init, signal: controller.signal }).finally(() => {
    clearTimeout(timer)
    if (external) external.removeEventListener('abort', onExternalAbort)
  })
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: timeoutFetch },
})

// Returnér Authorization-header med brugerens aktuelle access token (eller {}),
// så vores /api/*-endpoints kan verificere kalderen. Brug ved fetch mod egne API'er.
export async function authHeaders() {
    try {
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token
        return token ? { Authorization: `Bearer ${token}` } : {}
    } catch {
        return {}
    }
}
