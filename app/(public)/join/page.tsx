'use client';

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import StatusBar from "@/components/StatusBar";
import { setSessionId as setApiSessionId } from "@/lib/api";
import { connect, on, isConnected } from "@/lib/socket";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000").replace(
  /\/+$/,
  ""
);

async function getState(query: string = ""): Promise<any> {
  const res = await fetch(`${API_BASE}/game/state${query}`, { cache: "no-store" });
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  return res.json();
}

async function postJson<T>(path: string, body: unknown, query: string = ""): Promise<T> {
  const res = await fetch(`${API_BASE}${path}${query}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  return res.json();
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return (
    <input
      {...rest}
      className={`w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-600 ${className}`}
    />
  );
}

function PrimaryBtn(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = "", ...rest } = props;
  return (
    <button
      {...rest}
      className={`rounded-md bg-blue-600 px-3 py-2 text-sm text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    />
  );
}

function TabBtn(
  { active, className = "", ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    active?: boolean;
  }
) {
  const base = active
    ? "bg-neutral-800 text-neutral-100 border-neutral-700"
    : "bg-neutral-900 text-neutral-300 border-transparent hover:bg-neutral-800";
  return (
    <button
      {...rest}
      className={`rounded-md border px-3 py-2 text-sm transition-colors ${base} ${className}`}
    />
  );
}

function getStoredSessionId(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const stored = window.localStorage.getItem("mp_session_id");
  if (stored && stored.trim() && stored !== "default") {
    return stored.trim();
  }
  return undefined;
}

function buildSessionQuery({ joinCode }: { joinCode?: string } = {}): string {
  const params = new URLSearchParams();
  const code = joinCode?.trim();
  if (code) params.set("join_code", code.toUpperCase());
  const sid = getStoredSessionId();
  if (sid) params.set("session_id", sid);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export default function JoinPage() {
  const router = useRouter();
  const [phaseLabel, setPhaseLabel] = useState<string>("JOIN");
  const [joinLocked, setJoinLocked] = useState<boolean>(false);
  const [tab, setTab] = useState<"create" | "login">("create");
  const [joinCode, setJoinCode] = useState("");

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const creationOpen = !joinLocked;

  const load = useCallback(async () => {
    try {
      const query = buildSessionQuery({ joinCode });
      const state = await getState(query);
      const phase = String(state?.phase_label ?? "JOIN");
      const locked = Boolean(state?.join_locked ?? false);
      setPhaseLabel(phase);
      setJoinLocked(locked);
      if (locked && tab === "create") {
        setTab("login");
      }
      if (state?.session_id && typeof window !== "undefined") {
        window.localStorage.setItem("mp_session_id", state.session_id);
        setApiSessionId(state.session_id);
      }
      if (!joinCode && typeof state?.join_code === "string" && state.join_code.trim()) {
        setJoinCode(state.join_code.trim().toUpperCase());
      }
    } catch {
      // ignored: transient network failure
    }
  }, [joinCode, tab]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedSession = window.localStorage.getItem("mp_session_id");
    if (storedSession && storedSession.trim()) {
      setApiSessionId(storedSession.trim());
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("player_id");
    if (saved) {
      router.push(`/room/${saved}`);
    }
  }, [router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get("code") || params.get("join_code") || "";
    const stored = window.localStorage.getItem("mp_join_code") || "";
    const initial = (fromQuery || stored).trim();
    if (initial) {
      setJoinCode(initial.toUpperCase());
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (joinCode.trim()) {
      window.localStorage.setItem("mp_join_code", joinCode.trim().toUpperCase());
    }
  }, [joinCode]);

  useEffect(() => {
    let alive = true;
    void load();

    void connect();

    const offEvent = on("event", (event: any) => {
      if (!alive) return;
      if (event?.kind === "phase_change" && event?.phase) {
        setPhaseLabel(String(event.phase));
      }
      if (event?.kind === "join_locked") {
        setJoinLocked(true);
        setTab("login");
      }
      if (event?.kind === "join_unlocked") {
        setJoinLocked(false);
        setTab("create");
      }
    });

    const offReconnect = on("ws:reconnect", () => {
      if (!alive) return;
      void load();
    });

    const timer = window.setInterval(() => {
      if (!isConnected()) {
        void load();
      }
    }, 5000);

    return () => {
      alive = false;
      offEvent();
      offReconnect();
      window.clearInterval(timer);
    };
  }, [load]);

  async function doRegister() {
    if (!joinCode.trim()) {
      setErrorMsg("Code session requis.");
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const query = buildSessionQuery({ joinCode });
      const response: any = await postJson("/auth/register", { name, password }, query);
      const pid = response.player_id || response.id;
      if (!pid) throw new Error("player_id manquant");
      localStorage.setItem("player_id", String(pid));
      localStorage.setItem("mp_join_code", joinCode.trim().toUpperCase());
      if (response.session_id) {
        localStorage.setItem("mp_session_id", String(response.session_id));
        setApiSessionId(String(response.session_id));
      }
      router.push(`/room/${pid}`);
    } catch (error: any) {
      setErrorMsg(error?.message || "Impossible de créer le joueur.");
    } finally {
      setLoading(false);
    }
  }


  async function doLogin() {
    if (!joinCode.trim()) {
      setErrorMsg("Code session requis.");
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const query = buildSessionQuery({ joinCode });
      const response: any = await postJson("/auth/login", { name, password }, query);
      const pid = response.player_id || response.id;
      if (!pid) throw new Error("player_id manquant");
      localStorage.setItem("player_id", String(pid));
      localStorage.setItem("mp_join_code", joinCode.trim().toUpperCase());
      if (response.session_id) {
        localStorage.setItem("mp_session_id", String(response.session_id));
        setApiSessionId(String(response.session_id));
      }
      router.push(`/room/${pid}`);
    } catch (error: any) {
      setErrorMsg(error?.message || "Connexion impossible. Vérifie nom/mot de passe.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <StatusBar />
      <main className="mx-auto max-w-lg p-6">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 shadow-lg shadow-black/20">
          <h2 className="mb-1 text-xl font-semibold">Rejoindre la partie</h2>
          <div className="mb-4 text-xs text-neutral-400">
            Phase : <span className="text-neutral-200">{phaseLabel}</span> • Inscriptions :{" "}
            <span className={joinLocked ? "text-rose-300" : "text-emerald-300"}>
              {joinLocked ? "fermées" : "ouvertes"}
            </span>
          </div>

          <div className="mb-4 flex gap-2">
            <TabBtn
              active={tab === "create"}
              onClick={() => setTab("create")}
              disabled={!creationOpen}
              title={creationOpen ? "" : "La création est verrouillée par le MJ."}
            >
              Créer
            </TabBtn>
            <TabBtn active={tab === "login"} onClick={() => setTab("login")}>
              Rejoindre
            </TabBtn>
          </div>

          <div className="mb-4 space-y-1">
            <label htmlFor="join-code" className="text-xs text-neutral-400">
              Code session partagé par le MJ
            </label>
            <Input
              id="join-code"
              placeholder="Ex: ABC123"
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
              required
            />
          </div>

          {tab === "create" && creationOpen && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void doRegister();
              }}
              className="space-y-3"
            >
              <Input
                placeholder="Pseudo / Nom"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
              <Input
                type="password"
                placeholder="Mot de passe"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              {errorMsg && <div className="text-sm text-rose-300">{errorMsg}</div>}
              <PrimaryBtn disabled={loading || !name || !password || !joinCode.trim()}>
                {loading ? "Création..." : "Créer mon joueur"}
              </PrimaryBtn>
            </form>
          )}

          {tab === "login" && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void doLogin();
              }}
              className="space-y-3"
            >
              <Input
                placeholder="Pseudo / Nom"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
              <Input
                type="password"
                placeholder="Mot de passe"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              {errorMsg && <div className="text-sm text-rose-300">{errorMsg}</div>}
              <PrimaryBtn disabled={loading || !name || !password || !joinCode.trim()}>
                {loading ? "Connexion..." : "Rejoindre"}
              </PrimaryBtn>
            </form>
          )}

          <div className="mt-6">
            <button
              className="rounded-md bg-neutral-800 px-3 py-2 text-sm text-neutral-100 hover:bg-neutral-700"
              onClick={() => {
                const saved = localStorage.getItem("player_id");
                if (saved) {
                  router.push(`/room/${saved}`);
                } else {
                  alert("Aucun joueur enregistré sur cet appareil.");
                }
              }}
            >
              Reprendre ma partie
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}




