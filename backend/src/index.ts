import { WebSocketServer, WebSocket } from "ws";
import { Game, GameError, MAX_WORD_LENGTH, normalizeText, type Word } from "./game.js";

type Role = "admin" | "display" | "player";

interface Client {
    role: Role;
    name: string | null;
    alive: boolean;
    /** Timestamps dos últimos envios, para limitar spam. */
    sent: number[];
}

const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;
const DATA_FILE = process.env.DATA_FILE ?? "data.json";
const RATE_LIMIT = { max: 10, windowMs: 60_000 };

const game = new Game(DATA_FILE || null);
const clients = new Map<WebSocket, Client>();
const wss = new WebSocketServer({ port: PORT });

// ---------- Estado enviado para cada tipo de cliente ----------

const publicWord = (w: Word | null) => (w ? { id: w.id, text: w.text } : null);

function stats() {
    return {
        queued: game.byStatus("queued").length + (game.pending ? 1 : 0),
        used: game.byStatus("used").length,
        players: new Set(game.all.flatMap((w) => w.authors)).size,
    };
}

function stateFor(client: Client) {
    const current = game.current;

    if (client.role === "admin") {
        return {
            role: "admin",
            current,
            pending: game.pending,
            queue: game.queue,
            used: game.history("used"),
            rejected: game.history("rejected"),
            ranking: game.ranking(),
            stats: stats(),
            online: countOnline(),
        };
    }

    if (client.role === "display") {
        return {
            role: "display",
            current: publicWord(current),
            ranking: game.ranking().slice(0, 5),
            stats: stats(),
        };
    }

    const ranking = game.ranking();
    const name = client.name?.toLowerCase();
    const position = name ? ranking.findIndex((r) => r.name.toLowerCase() === name) : -1;
    return {
        role: "player",
        current: publicWord(current),
        stats: stats(),
        maxLength: MAX_WORD_LENGTH,
        myWords: client.name
            ? game.wordsOf(client.name).map((w) => ({
                  id: w.id,
                  text: w.text,
                  status: w.status === "pending" ? "queued" : w.status,
              }))
            : [],
        myPoints: position >= 0 ? ranking[position].points : 0,
        myPosition: position >= 0 ? position + 1 : null,
    };
}

function countOnline() {
    const online = { admin: 0, display: 0, player: 0 };
    clients.forEach((c) => online[c.role]++);
    return online;
}

function send(ws: WebSocket, message: unknown) {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
}

function broadcastState() {
    clients.forEach((client, ws) => send(ws, { type: "state", state: stateFor(client) }));
}

// ---------- Mensagens ----------

const adminActions: Record<string, (id: number) => void> = {
    draw: () => game.draw(),
    pick: (id) => game.pick(id),
    approve: () => game.approve(),
    "show-now": (id) => game.showNow(id),
    "skip-pending": () => game.skipPending(),
    "reject-pending": () => game.rejectPending(),
    "mark-used": () => game.markUsed(),
    "return-current": () => game.returnCurrent(),
    remove: (id) => game.remove(id),
    restore: (id) => game.restore(id),
    reset: () => game.reset(),
};

function handleMessage(ws: WebSocket, client: Client, msg: any) {
    switch (msg.type) {
        case "join": {
            const role: Role = ["admin", "display", "player"].includes(msg.role) ? msg.role : "player";
            client.role = role;
            client.name = msg.name ? normalizeText(String(msg.name)) : null;
            send(ws, { type: "state", state: stateFor(client) });
            // Admins veem quantos clientes estão online
            broadcastToAdmins();
            return;
        }

        case "add-word": {
            const now = Date.now();
            client.sent = client.sent.filter((t) => now - t < RATE_LIMIT.windowMs);
            if (client.sent.length >= RATE_LIMIT.max)
                throw new GameError("Muitos envios seguidos. Espere um pouco.");
            client.sent.push(now);

            const { word, merged } = game.addWord(msg.word, msg.name);
            client.name = normalizeText(String(msg.name));
            console.log(`Nova palavra: "${word.text}"${merged ? " (repetida)" : ""}`);
            broadcastState();
            return { merged };
        }

        case "admin": {
            if (client.role !== "admin") throw new GameError("Acesso negado.");
            const action = adminActions[msg.action];
            if (!action) throw new GameError("Ação inválida.");
            action(Number(msg.id));
            broadcastState();
            return;
        }
    }
}

function broadcastToAdmins() {
    clients.forEach((client, ws) => {
        if (client.role === "admin") send(ws, { type: "state", state: stateFor(client) });
    });
}

wss.on("connection", (ws) => {
    const client: Client = { role: "player", name: null, alive: true, sent: [] };
    clients.set(ws, client);

    ws.on("pong", () => (client.alive = true));

    ws.on("message", (data) => {
        let msg: any;
        try {
            msg = JSON.parse(data.toString());
        } catch {
            return;
        }

        try {
            const result = handleMessage(ws, client, msg);
            if (msg.reqId) send(ws, { type: "result", reqId: msg.reqId, ok: true, ...result });
        } catch (err) {
            const error = err instanceof GameError ? err.message : "Erro inesperado.";
            if (!(err instanceof GameError)) console.error("Erro WS:", err);
            if (msg.reqId) send(ws, { type: "result", reqId: msg.reqId, ok: false, error });
        }
    });

    ws.on("close", () => {
        clients.delete(ws);
        broadcastToAdmins();
    });
});

// Derruba conexões mortas (e mantém proxies de hospedagem acordados)
setInterval(() => {
    clients.forEach((client, ws) => {
        if (!client.alive) return ws.terminate();
        client.alive = false;
        ws.ping();
    });
}, 30_000);

console.log(`Servidor WebSocket rodando na porta ${PORT}`);
