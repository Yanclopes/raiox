import { useEffect, useState } from "react";

interface Word {
  id: number;
  text: string;
  used: boolean;
}

export default function ManagerPage() {
  const [words, setWords] = useState<Word[]>([]);
  const [pendingWord, setPendingWord] = useState<Word | null>(null);
  const [currentWord, setCurrentWord] = useState<Word | null>(null);
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

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Painel do Gerenciador</h1>

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
    </div>
  );
}
