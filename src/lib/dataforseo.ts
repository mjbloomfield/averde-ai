// DataForSEO uses HTTP Basic auth — login is the account email, password is
// the API password from app.dataforseo.com/api-access (not the account
// password). Returns null when no credentials are configured, so every caller
// degrades to "we didn't run this check" rather than failing the audit.
export function dfsAuth(): string | null {
  const login = import.meta.env.DATAFORSEO_LOGIN;
  const password = import.meta.env.DATAFORSEO_PASSWORD;
  if (!login || !password) return null;
  return Buffer.from(`${login}:${password}`).toString('base64');
}

export async function dfsPost(
  path: string,
  body: unknown,
  timeoutMs: number,
  auth?: string | null,
): Promise<Record<string, unknown> | null> {
  const credentials = auth ?? dfsAuth();
  if (!credentials) return null;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`https://api.dataforseo.com/v3/${path}`, {
      method: 'POST',
      headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.status_code !== 20000) return null;
    return data;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

// First result of the first task, which is where every v3 endpoint puts it.
export function firstResult(data: Record<string, unknown> | null): Record<string, unknown> | null {
  const task = ((data?.tasks as Array<Record<string, unknown>>) || [])[0];
  if (!task || task.status_code !== 20000) return null;
  return ((task.result as Array<Record<string, unknown>>) || [])[0] ?? null;
}
