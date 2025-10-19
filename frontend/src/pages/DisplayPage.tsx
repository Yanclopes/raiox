import { useEffect, useState } from "react";

interface Word {
  id: number;
  text: string;
}

export default function DisplayPage() {
  const [word, setWord] = useState<Word | null>(null);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8080");

    ws.onopen = () => console.log("Conectado ao WS da DisplayPage");
    ws.onclose = () => console.log("Desconectado");
    ws.onerror = (err) => console.error(err);

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "current-word") setWord(msg.word);
    };

    return () => ws.close();
  }, []);

  return (
    <div className="h-screen flex items-center justify-center bg-black text-white text-6xl font-bold">
      {word ? word.text : "Aguardando palavra..."}
    </div>
  );
}
