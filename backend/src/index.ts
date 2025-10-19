import { WebSocketServer, WebSocket } from "ws";

interface Word {
  id: number;
  text: string;
  used: boolean;
}

let words: Word[] = [];

let currentWord: Word | null = null;
let pendingWord: Word | null = null;

const wss = new WebSocketServer({ port: 8080 });

function broadcast(message: any) {
  const msg = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) client.send(msg);
  });
}

wss.on("connection", (ws) => {
  console.log("Novo cliente conectado");

  // envia estado inicial
  ws.send(JSON.stringify({ type: "current-word", word: currentWord }));
  ws.send(JSON.stringify({ type: "pending-word", word: pendingWord }));
  ws.send(JSON.stringify({ type: "word-list", words }));

  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString());

      // FormPage envia palavra
      if (msg.type === "add-word") {
        const newWord: Word = {
          id: words.length ? Math.max(...words.map((w) => w.id)) + 1 : 1,
          text: msg.word,
          used: false,
        };
        words.push(newWord);
        console.log("Nova palavra:", newWord.text);
        broadcast({ type: "word-list", words });
      }

      // Sorteia palavra pendente
      if (msg.type === "draw-word") {
        const restantes = words.filter((w) => !w.used);
        if (restantes.length === 0) {
          pendingWord = null;
        } else {
          pendingWord =
            restantes[Math.floor(Math.random() * restantes.length)];
        }
        broadcast({ type: "pending-word", word: pendingWord });
      }

      // Aprovar palavra pendente
      if (msg.type === "approve-word") {
        if (pendingWord) {
          currentWord = pendingWord;
          pendingWord = null;
          broadcast({ type: "current-word", word: currentWord });
          broadcast({ type: "pending-word", word: null });
        }
      }

      // Reprovar palavra pendente
      if (msg.type === "reject-word") {
        if (pendingWord) {
          words = words.filter((w) => w.id !== pendingWord?.id);
          broadcast({ type: "word-list", words });
          pendingWord = null;
          broadcast({ type: "pending-word", word: null });
        }
      }

      // Marca palavra como usada
      if (msg.type === "mark-used") {
        if (currentWord) {
          words = words.map((w) =>
            w.id === currentWord!.id ? { ...w, used: true } : w
          );
          currentWord = null;
          broadcast({ type: "current-word", word: null });
          broadcast({ type: "word-list", words });
        }
      }
    } catch (err) {
      console.error("Erro WS:", err);
    }
  });
});

console.log("Servidor WebSocket rodando em ws://localhost:8080");
