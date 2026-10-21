import { useEffect, useRef, useState, type FormEvent } from "react";
import ConnectionBadge from "../components/ConnectionBadge";
import type { PlayerState } from "../lib/types";
import { useGame } from "../lib/useGame";

const NAME_KEY = "raiox:name";

function readSavedName() {
  try {
    return localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

const statusLabel = {
  queued: { text: "Na fila", className: "bg-sky-100 text-sky-700" },
  current: { text: "Na tela!", className: "bg-amber-100 text-amber-700" },
  used: { text: "Usada +1", className: "bg-emerald-100 text-emerald-700" },
  rejected: { text: "Descartada", className: "bg-gray-100 text-gray-500" },
};

export default function FormPage() {
  const [name, setName] = useState(readSavedName);
  const [word, setWord] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const wordInput = useRef<HTMLInputElement>(null);

  const hasName = name.trim().length > 0;
  const { state, status, request } = useGame<PlayerState>({
    role: "player",
    name: hasName ? name.trim() : undefined,
  });

  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 3500);
    return () => clearTimeout(t);
  }, [feedback]);

  const sendWord = async (e: FormEvent) => {
    e.preventDefault();
    if (!hasName) return setFeedback({ ok: false, text: "Informe seu nome." });
    if (!word.trim()) return setFeedback({ ok: false, text: "Digite uma palavra ou frase." });

    setSending(true);
    const res = await request({ type: "add-word", name: name.trim(), word });
    setSending(false);

    if (res.ok) {
      try {
        localStorage.setItem(NAME_KEY, name.trim());
      } catch {
        /* sem storage, segue */
      }
      setWord("");
      setFeedback({
        ok: true,
        text: res.merged ? "Enviada! Alguém já tinha mandado essa também 😉" : "Palavra enviada!",
      });
    } else {
      setFeedback({ ok: false, text: res.error ?? "Não foi possível enviar." });
    }
    wordInput.current?.focus();
  };

  const maxLength = state?.maxLength ?? 80;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-md space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Envie sua palavra</h1>
          <ConnectionBadge status={status} className="text-slate-400" />
        </header>

        {state?.current && (
          <div className="rounded-xl bg-slate-700/60 px-4 py-3 text-sm">
            <span className="text-slate-400">Na tela agora: </span>
            <span className="font-semibold">{state.current.text}</span>
          </div>
        )}

        <form onSubmit={sendWord} className="space-y-3 rounded-2xl bg-white p-5 text-slate-900 shadow-xl">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-600">Seu nome</span>
            <input
              type="text"
              placeholder="Como você quer aparecer no ranking"
              autoComplete="name"
              maxLength={40}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
          </label>

          <label className="block">
            <span className="mb-1 flex justify-between text-sm font-medium text-slate-600">
              Palavra ou frase
              <span className="font-normal text-slate-400">
                {word.length}/{maxLength}
              </span>
            </span>
            <input
              ref={wordInput}
              type="text"
              placeholder="Digite aqui"
              maxLength={maxLength}
              value={word}
              onChange={(e) => setWord(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
          </label>

          <button
            type="submit"
            disabled={sending || status !== "open"}
            className="w-full rounded-lg bg-indigo-600 py-2.5 font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? "Enviando…" : "Enviar"}
          </button>

          {feedback && (
            <p
              role="status"
              className={`rounded-lg px-3 py-2 text-sm ${
                feedback.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
              }`}
            >
              {feedback.text}
            </p>
          )}
        </form>

        {state && (
          <div className="grid grid-cols-3 gap-3 text-center">
            <Stat label="Na fila" value={state.stats.queued} />
            <Stat label="Seus pontos" value={state.myPoints} />
            <Stat label="Posição" value={state.myPosition ? `${state.myPosition}º` : "–"} />
          </div>
        )}

        {hasName && state && state.myWords.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
              Suas palavras ({state.myWords.length})
            </h2>
            <ul className="space-y-2">
              {state.myWords.map((w) => (
                <li
                  key={w.id}
                  className="flex items-center justify-between gap-3 rounded-lg bg-slate-700/60 px-3 py-2"
                >
                  <span className={`break-all ${w.status === "rejected" ? "line-through opacity-60" : ""}`}>
                    {w.text}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusLabel[w.status].className}`}
                  >
                    {statusLabel[w.status].text}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-slate-700/60 px-2 py-3">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  );
}
