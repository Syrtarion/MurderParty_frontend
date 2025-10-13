// lib/api.ts — mini client HTTP (get/post JSON) avec gestion d'erreurs claire

const BASE = (process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000").replace(/\/+$/, "");

async function jsonFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    // essaie d'extraire un message JSON {detail: "..."} sinon statusText
    let msg = res.statusText || `HTTP ${res.status}`;
    try {
      const j = text ? JSON.parse(text) : {};
      msg = j.detail || j.message || text || msg;
    } catch {
      if (text) msg = text;
    }
    throw new Error(msg);
  }

  if (res.status === 204) {
    // No Content
    return undefined as unknown as T;
  }
  return (await res.json()) as T;
}

export const api = {
  // GET générique
  async get<T = any>(path: string) {
    return jsonFetch<T>(path, { method: "GET" });
  },

  // POST générique (JSON)
  async post<T = any>(path: string, body?: any) {
    return jsonFetch<T>(path, {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },

  // DELETE générique
  async del<T = any>(path: string) {
    return jsonFetch<T>(path, { method: "DELETE" });
  },

  // Raccourci utile pour l’état de jeu
  async getGameState<T = any>() {
    return jsonFetch<T>("/game/state", { method: "GET" });
  },
};
