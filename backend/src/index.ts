import { WebSocketServer, WebSocket } from "ws";

interface Word {
  id: number;
  text: string;
  nome: string; // Alterado de email
  used: boolean;
}

interface Ranking {
  nome: string; 
  points: number;
}

let words: Word[] = [];
let currentWord: Word | null = null;
let pendingWord: Word | null = null;
let ranking: Ranking[] = [];

const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;

const wss = new WebSocketServer({ port: PORT });

function broadcast(message: any) {
  const msg = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) client.send(msg);
  });
}

function updateRanking(nome: string, points: number) {
  const existing = ranking.find((r) => r.nome === nome);
  if (existing) {
    existing.points += points;
  } else {
    ranking.push({ nome, points });
  }
  ranking.sort((a, b) => b.points - a.points);
  broadcast({ type: "ranking", ranking });
}

wss.on("connection", (ws) => {
  console.log("Novo cliente conectado");

  // Envia estado inicial
  ws.send(JSON.stringify({ type: "current-word", word: currentWord }));
  ws.send(JSON.stringify({ type: "pending-word", word: pendingWord }));
  ws.send(JSON.stringify({ type: "word-list", words }));
  ws.send(JSON.stringify({ type: "ranking", ranking }));

  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.type === "add-word") {
        const wordText = msg.word.trim().toLowerCase();
        const newWord: Word = {
          id: words.length ? Math.max(...words.map((w) => w.id)) + 1 : 1,
          text: wordText,
          nome: msg.nome.trim(),
          used: false,
        };
        words.push(newWord);
        console.log("Nova palavra:", newWord.text);
        broadcast({ type: "word-list", words });
      }

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

      if (msg.type === "mark-used") {
        if (currentWord) {
          const wordText = currentWord.text.toLowerCase();

          const usadasAgora = words.filter(
            (w) => w.text.toLowerCase() === wordText && !w.used
          );

          if (usadasAgora.length > 0) {
            usadasAgora.forEach((w) => {
              w.used = true;
              updateRanking(w.nome, 1); 
            });
          }

          currentWord = null;
          broadcast({ type: "current-word", word: null });
          broadcast({ type: "word-list", words });
        }
      }

      if (msg.type === "reset-game") {
        words = [];
        ranking = []; 
        currentWord = null;
        pendingWord = null;
        
        console.log("Jogo resetado. Todos os dados foram limpos.");

        broadcast({ type: "word-list", words: [] });
        broadcast({ type: "ranking", ranking: [] });
        broadcast({ type: "current-word", word: null });
        broadcast({ type: "pending-word", word: null });
      }

    } catch (err) {
      console.error("Erro WS:", err);
    }
  });
});

console.log(`Servidor WebSocket rodando em ws://localhost:${PORT}`);