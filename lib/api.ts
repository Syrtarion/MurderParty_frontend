const BASE = process.env.NEXT_PUBLIC_API_BASE as string;

async function parse<T>(resp: Response): Promise<T> {
  if (!resp.ok) {
    let msg = `${resp.status} ${resp.statusText}`;
    try { msg += `\n${await resp.text()}`; } catch {}
    throw new Error(msg);
  }
  return resp.json() as Promise<T>;
}

export const api = {
  async getGameState<T=any>() {
    const r = await fetch(`${BASE}/game/state`, { cache: 'no-store' });
    return parse<T>(r);
  },
  async joinPlayer<T=any>(name: string) {
    const r = await fetch(`${BASE}/players/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    return parse<T>(r);
  },
  async triggerEvent<T=any>(payload: any, token?: string) {
    const r = await fetch(`${BASE}/events/trigger`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(payload)
    });
    return parse<T>(r);
  },
  async masterNextStep<T=any>(token?: string) {
    const r = await fetch(`${BASE}/master/next_step`, {
      method: 'POST',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
    });
    return parse<T>(r);
  },
  async generateIndice<T=any>(kind: string, token?: string) {
    const r = await fetch(`${BASE}/generate/indice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ type: kind })
    });
    return parse<T>(r);
  },
};
