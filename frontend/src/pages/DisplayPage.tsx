import { useEffect, useState } from "react";

interface Word {
  id: number;
  text: string;
}

export default function DisplayPage() {
  const [word, setWord] = useState<Word | null>(null);
  // Estado para controlar a cor de fundo, começando com preto
  const [backgroundColor, setBackgroundColor] = useState("#000000");

  useEffect(() => {
    const ws = new WebSocket(import.meta.env.VITE_WS_URL);

    ws.onopen = () => console.log("Conectado ao WS da DisplayPage");
    ws.onclose = () => console.log("Desconectado");
    ws.onerror = (err) => console.error(err);

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "current-word") setWord(msg.word);
    };

    return () => ws.close();
  }, []);

  useEffect(() => {
    if (word) {
      const hue = Math.floor(Math.random() * 360); 
      const saturation = Math.floor(Math.random() * 30) + 70;
      const lightness = Math.floor(Math.random() * 20) + 50;
      
      setBackgroundColor(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
    } else {
      setBackgroundColor("#000000");
    }
  }, [word]);

  return (
    <div
      className="h-screen flex items-center justify-center text-white text-6xl font-bold transition-colors duration-1000"
      style={{ backgroundColor: backgroundColor }}
    >
      {word ? word.text : "Aguardando palavra..."}
    </div>
  );
}