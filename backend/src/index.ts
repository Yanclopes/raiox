import { WebSocketServer, WebSocket } from "ws";

interface Word {
    id: number;
    text: string;
    email: string;
    used: boolean;
}

interface Ranking {
    email: string;
    points: number;
}

let words: Word[] = [];
let currentWord: Word | null = null;
let pendingWord: Word | null = null;
let ranking: Ranking[] = [];

const wss = new WebSocketServer({ port: 8080 });

function broadcast(message: any) {
    const msg = JSON.stringify(message);
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) client.send(msg);
    });
}

function updateRanking(email: string, points: number) {
    const existing = ranking.find((r) => r.email === email);
    if (existing) {
        existing.points += points;
    } else {
        ranking.push({ email, points });
    }
    // Ordena do maior para o menor
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

            // FormPage envia palavra
            if (msg.type === "add-word") {
                const wordText = msg.word.trim().toLowerCase();
                const newWord: Word = {
                    id: words.length ? Math.max(...words.map((w) => w.id)) + 1 : 1,
                    text: wordText,
                    email: msg.email.trim().toLowerCase(),
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

            // Marca palavra como usada e atualiza ranking
            if (msg.type === "mark-used") {
                if (currentWord) {
                    const wordText = currentWord.text.toLowerCase();

                    // Marca todas as palavras iguais (case-insensitive) como usadas
                    const usadasAgora = words.filter(
                        (w) => w.text.toLowerCase() === wordText && !w.used
                    );

                    if (usadasAgora.length > 0) {
                        usadasAgora.forEach((w) => {
                            w.used = true;
                            updateRanking(w.email, 1);
                        });
                    }

                    // Atualiza lista e reseta palavra atual
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
