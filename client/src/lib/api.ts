export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// Todas las llamadas llevan la cookie de sesión; los errores del servidor vienen como { error }.
export async function api<T = unknown>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  const res = await fetch(`/api${path}`, {
    credentials: "include",
    ...rest,
    headers: { ...(json !== undefined && { "Content-Type": "application/json" }), ...headers },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data?.error ?? "Error de red");
  return data as T;
}
