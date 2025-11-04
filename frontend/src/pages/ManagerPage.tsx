import { useEffect, useState } from "react";

interface Word {
  id: number;
  text: string;
  used: boolean;
  // Note: A interface 'Word' no servidor também tem 'nome',
  // mas como esta página não usa, não é estritamente necessário aqui.
}

interface Ranking {
  nome: string; // <-- ALTERADO DE 'email'
  points: number;
}

export default function ManagerPage() {
  const [, setWords] = useState<Word[]>([]);
  const [pendingWord, setPendingWord] = useState<Word | null>(null);
  const [currentWord, setCurrentWord] = useState<Word | null>(null);
  const [ranking, setRanking] = useState<Ranking[]>([]);
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    const socket = new WebSocket(import.meta.env.VITE_WS_URL);

    socket.onopen = () => console.log("Conectado ao WS do ManagerPage");
    socket.onclose = () => console.log("Desconectado");
    socket.onerror = (err) => console.error(err);

    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      switch (msg.type) {
        case "word-list":
          setWords(msg.words);
          break;
        case "pending-word":
          setPendingWord(msg.word);
          break;
        case "current-word":
          setCurrentWord(msg.word);
          break;
        case "ranking":
          setRanking(msg.ranking);
          break;
      }
    };

    setWs(socket);
    return () => socket.close();
  }, []);

  const sortearPalavra = () => ws?.send(JSON.stringify({ type: "draw-word" }));
  const aprovarPalavra = () =>
    ws?.send(JSON.stringify({ type: "approve-word" }));
  const reprovarPalavra = () =>
    ws?.send(JSON.stringify({ type: "reject-word" }));
  const marcarComoUsada = () =>
    ws?.send(JSON.stringify({ type: "mark-used" }));

  // *** NOVA FUNÇÃO ADICIONADA ***
  const resetarJogo = () => {
    if (
      window.confirm(
        "Tem certeza que deseja limpar TODAS as palavras e o ranking?"
      )
    ) {
      ws?.send(JSON.stringify({ type: "reset-game" }));
    }
  };

  return (
    <div className="flex p-6 gap-8">
      {/* Coluna principal */}
      <div className="flex-1">
        <h1 className="text-2xl font-bold mb-4">Painel do Gerenciador</h1>

        {/* Palavra atual */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold">Palavra atual na tela:</h2>
          {currentWord ? (
            <p className="text-xl mt-2">{currentWord.text}</p>
          ) : (
            <p className="text-gray-500">Nenhuma palavra sendo exibida</p>
          )}
          {currentWord && (
            <button
              onClick={marcarComoUsada}
              className="mt-3 bg-red-500 text-white px-4 py-2 rounded"
            >
              Marcar como usada
            </button>
          )}
        </div>

        {/* Sorteio */}
        <div className="border-t border-gray-300 pt-4">
          <h2 className="text-lg font-semibold mb-2">Sorteio de palavras</h2>
          {pendingWord ? (
            <div>
              <p className="text-xl mb-3">Sorteada: {pendingWord.text}</p>
              <button
                onClick={aprovarPalavra}
                className="bg-green-500 text-white px-4 py-2 rounded mr-2"
              >
                Aprovar
              </button>
              <button
                onClick={reprovarPalavra}
                className="bg-gray-400 text-white px-4 py-2 rounded"
              >
                Reprovar
              </button>
            </div>
          ) : (
            <button
              onClick={sortearPalavra}
              className="bg-blue-500 text-white px-4 py-2 rounded"
            >
              Sortear nova palavra
            </button>
          )}
        </div>

        {/* *** NOVA SEÇÃO ADICIONADA *** */}
        <div className="border-t border-gray-300 pt-4 mt-6">
          <h2 className="text-lg font-semibold mb-2">Ações de Risco</h2>
          <button
            onClick={resetarJogo}
            className="bg-red-700 text-white px-4 py-2 rounded"
          >
            Limpar Jogo (Palavras e Ranking)
          </button>
        </div>
      </div>

      {/* Ranking */}
      <div className="w-96 border-l border-gray-300 pl-6">
        <h2 className="text-lg font-semibold mb-4">Ranking</h2>

        {ranking.length === 0 ? (
          <p className="text-gray-500 text-sm">Nenhum ponto registrado ainda.</p>
        ) : (
          <ul className="space-y-2">
            {ranking.map((r, index) => (
              <li
                key={r.nome} // <-- ALTERADO DE 'r.email'
                className="flex flex-row justify-between gap-2 bg-gray-100 rounded px-3 py-2"
              >
                <div className="font-medium flex">
                  {index + 1}. {r.nome} {/* <-- ALTERADO DE 'r.email' */}
                </div>
                <div className="text-blue-600 flex font-semibold">
                  {r.points} pts
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}