import { useCallback, useEffect, useMemo, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Link } from "react-router-dom";
import ConnectionBadge from "../components/ConnectionBadge";
import type { AdminAction, AdminState, Word } from "../lib/types";
import { useGame } from "../lib/useGame";

const timeAgo = (ts: number) => {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "agora";
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  return `${Math.floor(s / 3600)} h`;
};

export default function ManagerPage() {
  const { state, status, request } = useGame<AdminState>({ role: "admin" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 4000);
    return () => clearTimeout(t);
  }, [error]);

  const act = useCallback(
    async (action: AdminAction, id?: number) => {
      setBusy(true);
      const res = await request({ type: "admin", action, id });
      setBusy(false);
      if (!res.ok) setError(res.error ?? "Erro ao executar ação.");
    },
    [request],
  );

  // Atalhos de teclado
  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || e.ctrlKey || e.metaKey || e.altKey || busy) return;
      const key = e.key.toLowerCase();
      if (key === "s" && state.queue.length > 0) act("draw");
      else if (key === "a" && state.pending) act("approve");
      else if (key === "p" && state.pending) act("skip-pending");
      else if (key === "d" && state.pending) act("reject-pending");
      else if (key === "u" && state.current) act("mark-used");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, busy, act]);

  if (!state) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100 text-slate-500">
        <ConnectionBadge status={status} className="text-base" />
      </div>
    );
  }

  const canDraw = state.queue.length > 0;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <h1 className="text-xl font-bold">Painel do jogo</h1>
          <ConnectionBadge status={status} className="text-slate-500" />
          <span className="text-xs text-slate-500">
            {state.online.display} tela(s) · {state.online.player} jogador(es) online
          </span>
          <nav className="ml-auto flex items-center gap-2 text-sm">
            <Link to="/display" target="_blank" className="rounded-lg bg-slate-900 px-3 py-1.5 text-white hover:bg-slate-700">
              Abrir tela ↗
            </Link>
            <Link to="/" target="_blank" className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50">
              Formulário ↗
            </Link>
            <button
              onClick={() => {
                if (confirm("Apagar TODAS as palavras e o ranking? Isso não pode ser desfeito.")) act("reset");
              }}
              className="rounded-lg border border-red-200 px-3 py-1.5 text-red-600 hover:bg-red-50"
            >
              Reiniciar jogo
            </button>
          </nav>
        </div>
      </header>

      {error && (
        <div className="fixed bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-lg bg-red-600 px-4 py-2 text-sm text-white shadow-lg">
          {error}
        </div>
      )}

      <div className="mx-auto grid max-w-7xl gap-4 p-4 lg:grid-cols-[1.1fr_1fr_0.8fr]">
        {/* Coluna 1: tela e sorteio */}
        <div className="space-y-4">
          <Card title="Na tela agora">
            {state.current ? (
              <>
                <WordHero word={state.current} tone="amber" />
                <div className="mt-4 flex flex-wrap gap-2">
                  <Btn color="emerald" disabled={busy} onClick={() => act("mark-used")} hint="U">
                    ✓ Usada (pontuar)
                  </Btn>
                  <Btn color="slate" disabled={busy} onClick={() => act("return-current")}>
                    ↩ Devolver à fila
                  </Btn>
                </div>
              </>
            ) : (
              <Empty>Nenhuma palavra na tela.</Empty>
            )}
          </Card>

          <Card title="Sorteio">
            {state.pending ? (
              <>
                <WordHero word={state.pending} tone="indigo" />
                {state.current && (
                  <p className="mt-2 text-xs text-slate-500">
                    Ao aprovar, “{state.current.text}” será marcada como usada.
                  </p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Btn color="indigo" disabled={busy} onClick={() => act("approve")} hint="A">
                    Mostrar na tela
                  </Btn>
                  <Btn color="slate" disabled={busy} onClick={() => act("skip-pending")} hint="P">
                    Pular
                  </Btn>
                  <Btn color="red" disabled={busy} onClick={() => act("reject-pending")} hint="D">
                    Descartar
                  </Btn>
                  <Btn color="white" disabled={busy || !canDraw} onClick={() => act("draw")} hint="S">
                    🎲 Sortear outra
                  </Btn>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 py-4">
                <Btn color="indigo" big disabled={busy || !canDraw} onClick={() => act("draw")} hint="S">
                  🎲 Sortear palavra
                </Btn>
                {!canDraw && <Empty>A fila está vazia.</Empty>}
              </div>
            )}
          </Card>

          <div className="grid grid-cols-3 gap-3">
            <Stat label="Na fila" value={state.stats.queued} />
            <Stat label="Usadas" value={state.stats.used} />
            <Stat label="Participantes" value={state.stats.players} />
          </div>
        </div>

        {/* Coluna 2: fila e histórico */}
        <QueuePanel state={state} busy={busy} act={act} />

        {/* Coluna 3: ranking */}
        <Card title={`Ranking (${state.ranking.length})`}>
          {state.ranking.length === 0 ? (
            <Empty>Nenhum ponto registrado ainda.</Empty>
          ) : (
            <ol className="space-y-1.5">
              {state.ranking.map((r, i) => (
                <li key={r.name} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <span className="w-6 text-center font-bold text-slate-400">
                    {["🥇", "🥈", "🥉"][i] ?? `${i + 1}º`}
                  </span>
                  <span className="min-w-0 flex-1 truncate" title={r.name}>
                    {r.name}
                  </span>
                  <span className="font-semibold text-indigo-600">{r.points} pts</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </div>
  );
}

// ---------- Fila / histórico ----------

type Tab = "queue" | "used" | "rejected";

function QueuePanel({
  state,
  busy,
  act,
}: {
  state: AdminState;
  busy: boolean;
  act: (action: AdminAction, id?: number) => void;
}) {
  const [tab, setTab] = useState<Tab>("queue");
  const [search, setSearch] = useState("");

  const lists: Record<Tab, Word[]> = { queue: state.queue, used: state.used, rejected: state.rejected };
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return lists[tab];
    return lists[tab].filter(
      (w) => w.text.toLowerCase().includes(q) || w.authors.some((a) => a.toLowerCase().includes(q)),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, tab, search]);

  const tabs: { id: Tab; label: string }[] = [
    { id: "queue", label: `Fila (${state.queue.length})` },
    { id: "used", label: `Usadas (${state.used.length})` },
    { id: "rejected", label: `Descartadas (${state.rejected.length})` },
  ];

  return (
    <section className="flex max-h-[calc(100vh-6rem)] flex-col rounded-2xl bg-white p-4 shadow-sm">
      <div className="mb-3 flex gap-1 rounded-lg bg-slate-100 p-1 text-sm">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-md px-2 py-1.5 font-medium transition ${
              tab === t.id ? "bg-white shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <input
        type="search"
        placeholder="Buscar palavra ou nome…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
      />

      <ul className="-mr-2 flex-1 space-y-1.5 overflow-y-auto pr-2">
        {filtered.length === 0 && <Empty>{search ? "Nada encontrado." : "Nenhuma palavra aqui."}</Empty>}
        {filtered.map((w) => (
          <li key={w.id} className="group flex items-center gap-2 rounded-lg border border-slate-100 px-3 py-2 hover:bg-slate-50">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="break-words font-medium">{w.text}</span>
                {w.authors.length > 1 && (
                  <span className="rounded-full bg-amber-100 px-1.5 text-xs font-semibold text-amber-700">
                    ×{w.authors.length}
                  </span>
                )}
              </div>
              <div className="truncate text-xs text-slate-400" title={w.authors.join(", ")}>
                {w.authors.join(", ")} · {timeAgo(tab === "queue" ? w.createdAt : w.updatedAt)}
              </div>
            </div>
            <div className="flex shrink-0 gap-1 opacity-70 transition group-hover:opacity-100">
              {tab === "queue" ? (
                <>
                  <IconBtn title="Separar para o sorteio" disabled={busy} onClick={() => act("pick", w.id)}>
                    ☝
                  </IconBtn>
                  <IconBtn title="Mostrar na tela agora" disabled={busy} onClick={() => act("show-now", w.id)}>
                    ▶
                  </IconBtn>
                  <IconBtn title="Descartar" danger disabled={busy} onClick={() => act("remove", w.id)}>
                    ✕
                  </IconBtn>
                </>
              ) : (
                <IconBtn title="Voltar para a fila" disabled={busy} onClick={() => act("restore", w.id)}>
                  ↩
                </IconBtn>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------- Componentes menores ----------

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
      {children}
    </section>
  );
}

function WordHero({ word, tone }: { word: Word; tone: "amber" | "indigo" }) {
  const toneClass = tone === "amber" ? "bg-amber-50 text-amber-900" : "bg-indigo-50 text-indigo-900";
  return (
    <div className={`rounded-xl px-4 py-5 text-center ${toneClass}`}>
      <div className="break-words text-3xl font-extrabold">{word.text}</div>
      <div className="mt-1 text-xs opacity-60">
        enviada por {word.authors.join(", ")}
      </div>
    </div>
  );
}

const btnColors = {
  indigo: "bg-indigo-600 text-white hover:bg-indigo-500",
  emerald: "bg-emerald-600 text-white hover:bg-emerald-500",
  red: "bg-red-50 text-red-700 hover:bg-red-100",
  slate: "bg-slate-200 text-slate-800 hover:bg-slate-300",
  white: "border border-slate-300 bg-white hover:bg-slate-50",
};

function Btn({
  color,
  big,
  hint,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  color: keyof typeof btnColors;
  big?: boolean;
  hint?: string;
}) {
  return (
    <button
      {...props}
      className={`inline-flex items-center gap-2 rounded-lg font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
        big ? "px-6 py-3 text-lg" : "px-3 py-2 text-sm"
      } ${btnColors[color]}`}
    >
      {props.children}
      {hint && <kbd className="rounded bg-black/10 px-1.5 text-[10px] font-normal">{hint}</kbd>}
    </button>
  );
}

function IconBtn({
  danger,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { danger?: boolean }) {
  return (
    <button
      {...props}
      className={`h-8 w-8 rounded-md text-sm transition disabled:opacity-40 ${
        danger ? "text-red-500 hover:bg-red-50" : "text-slate-600 hover:bg-slate-200"
      }`}
    />
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white px-2 py-3 text-center shadow-sm">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="py-2 text-center text-sm text-slate-400">{children}</p>;
}
