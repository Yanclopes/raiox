import { useEffect, useState } from "react";

export default function FormPage() {
  const [email, setEmail] = useState("");
  const [word, setWord] = useState("");
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    const socket = new WebSocket(import.meta.env.VITE_WS_URL);
    socket.onopen = () => console.log("Conectado ao WS do FormPage");
    socket.onclose = () => console.log("Desconectado");
    setWs(socket);
    return () => socket.close();
  }, []);

  const sendWord = () => {
    if (!email || !word) return;
    ws?.send(JSON.stringify({ type: "add-word", email, word }));
    setWord("");
  };

  return (
    <div className="p-8 max-w-md mx-auto text-center">
      <h1 className="text-2xl mb-4">Envie sua palavra ou frase</h1>
      <input
        type="email"
        placeholder="Seu e-mail"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="border p-2 w-full mb-2"
      />
      <input
        type="text"
        placeholder="Digite a palavra/frase"
        value={word}
        onChange={(e) => setWord(e.target.value)}
        className="border p-2 w-full mb-2"
      />
      <button
        onClick={sendWord}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        Enviar
      </button>
    </div>
  );
}
