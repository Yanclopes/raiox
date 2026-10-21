import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import ConnectionBadge from "../components/ConnectionBadge";
import type { DisplayState } from "../lib/types";
import { useGame } from "../lib/useGame";

/** Fonte menor para textos longos, para caber sempre na tela. */
function sizeFor(text: string) {
  if (text.length <= 12) return "text-[12vw]";
  if (text.length <= 24) return "text-[8vw]";
  if (text.length <= 45) return "text-[6vw]";
  return "text-[4.5vw]";
}

/** Cor viva aleatória, sorteada a cada nova palavra. */
function randomColor() {
  const hue = Math.floor(Math.random() * 360);
  const saturation = Math.floor(Math.random() * 30) + 70;
  const lightness = Math.floor(Math.random() * 20) + 40;
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen?.();
}

export default function DisplayPage() {
  const [params] = useSearchParams();
  const showRanking = params.has("ranking");
  const { state, status } = useGame<DisplayState>({ role: "display" });
  const word = state?.current;
  const wordId = word?.id;
  const backgroundColor = useMemo(() => (wordId ? randomColor() : "#000000"), [wordId]);

  return (
    <div
      onDoubleClick={toggleFullscreen}
      className="relative flex h-screen select-none overflow-hidden text-white transition-colors duration-1000"
      style={{ backgroundColor }}
      title="Clique duas vezes para tela cheia"
    >
      <main className="flex flex-1 items-center justify-center px-[5vw]">
        {word ? (
          <h1
            key={word.id}
            className={`animate-pop break-words text-center font-extrabold leading-tight drop-shadow-lg ${sizeFor(word.text)}`}
          >
            {word.text}
          </h1>
        ) : (
          <p className="animate-pulse text-[4vw] font-semibold text-white/40">Aguardando palavra…</p>
        )}
      </main>

      {showRanking && state && state.ranking.length > 0 && (
        <aside className="flex w-[22vw] flex-col justify-center gap-[1vw] border-l border-white/20 bg-black/20 px-[2vw]">
          <h2 className="text-[1.6vw] font-semibold uppercase tracking-widest text-white/70">Ranking</h2>
          {state.ranking.map((r, i) => (
            <div key={r.name} className="flex justify-between text-[1.6vw]">
              <span className="truncate">
                {i + 1}. {r.name}
              </span>
              <span className="font-bold text-white">{r.points}</span>
            </div>
          ))}
        </aside>
      )}

      <footer className="absolute bottom-4 left-6 right-6 flex justify-between text-sm text-white/60">
        <span>{state ? `${state.stats.queued} na fila · ${state.stats.used} usadas` : ""}</span>
        {status !== "open" && <ConnectionBadge status={status} />}
      </footer>
    </div>
  );
}
