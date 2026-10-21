import fs from "node:fs";

export type WordStatus = "queued" | "pending" | "current" | "used" | "rejected";

export interface Word {
    id: number;
    text: string;
    /** Texto normalizado, usado para agrupar palavras iguais. */
    key: string;
    /** Nomes de quem enviou essa palavra (cada um ganha ponto quando ela é usada). */
    authors: string[];
    status: WordStatus;
    createdAt: number;
    updatedAt: number;
}

export interface RankingEntry {
    name: string;
    points: number;
}

interface PersistedState {
    nextId: number;
    words: Word[];
}

export const MAX_WORD_LENGTH = 80;

export class GameError extends Error {}

export function normalizeText(text: string) {
    return text.trim().replace(/\s+/g, " ");
}

function wordKey(text: string) {
    return normalizeText(text)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "");
}

export const MAX_NAME_LENGTH = 40;

/** Nomes são comparados sem diferenciar maiúsculas/minúsculas. */
const sameName = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export class Game {
    private words: Word[] = [];
    private nextId = 1;
    private saveTimer: NodeJS.Timeout | null = null;

    constructor(private readonly dataFile: string | null) {
        this.load();
    }

    // ---------- Consultas ----------

    get all() {
        return this.words;
    }

    byStatus(status: WordStatus) {
        return this.words.filter((w) => w.status === status);
    }

    get current() {
        return this.words.find((w) => w.status === "current") ?? null;
    }

    get pending() {
        return this.words.find((w) => w.status === "pending") ?? null;
    }

    /** Fila na ordem de chegada. */
    get queue() {
        return this.byStatus("queued").sort((a, b) => a.createdAt - b.createdAt);
    }

    /** Usadas/descartadas, mais recentes primeiro. */
    history(status: "used" | "rejected") {
        return this.byStatus(status).sort((a, b) => b.updatedAt - a.updatedAt);
    }

    ranking(): RankingEntry[] {
        const points = new Map<string, RankingEntry>();
        for (const w of this.byStatus("used")) {
            for (const name of w.authors) {
                const key = name.toLowerCase();
                const entry = points.get(key) ?? { name, points: 0 };
                entry.points++;
                points.set(key, entry);
            }
        }
        return [...points.values()].sort(
            (a, b) => b.points - a.points || a.name.localeCompare(b.name),
        );
    }

    wordsOf(name: string) {
        return this.words
            .filter((w) => w.authors.some((a) => sameName(a, name)))
            .sort((a, b) => b.createdAt - a.createdAt);
    }

    // ---------- Jogadores ----------

    addWord(rawText: string, rawName: string) {
        const text = normalizeText(String(rawText ?? ""));
        const name = normalizeText(String(rawName ?? ""));

        if (!text) throw new GameError("Digite uma palavra ou frase.");
        if (text.length > MAX_WORD_LENGTH)
            throw new GameError(`Máximo de ${MAX_WORD_LENGTH} caracteres.`);
        if (!name) throw new GameError("Informe seu nome.");
        if (name.length > MAX_NAME_LENGTH)
            throw new GameError(`Nome com no máximo ${MAX_NAME_LENGTH} caracteres.`);

        const key = wordKey(text);
        const same = this.words.filter((w) => w.key === key && w.status !== "rejected");

        if (same.some((w) => w.authors.some((a) => sameName(a, name))))
            throw new GameError("Você já enviou essa palavra.");
        if (same.some((w) => w.status === "used"))
            throw new GameError("Essa palavra já foi usada.");

        // Mesma palavra ainda não usada: junta o autor na entrada existente
        const existing = same[0];
        if (existing) {
            existing.authors.push(name);
            existing.updatedAt = Date.now();
            this.save();
            return { word: existing, merged: true };
        }

        const now = Date.now();
        const word: Word = {
            id: this.nextId++,
            text,
            key,
            authors: [name],
            status: "queued",
            createdAt: now,
            updatedAt: now,
        };
        this.words.push(word);
        this.save();
        return { word, merged: false };
    }

    // ---------- Administração ----------

    /** Sorteia uma palavra aleatória da fila para aprovação. */
    draw() {
        const pending = this.pending;
        if (pending) this.setStatus(pending, "queued");

        const options = this.queue.filter((w) => w.id !== pending?.id);
        const pool = options.length ? options : this.queue;
        if (!pool.length) throw new GameError("A fila está vazia.");

        const picked = pool[Math.floor(Math.random() * pool.length)];
        this.setStatus(picked, "pending");
    }

    /** Escolhe manualmente uma palavra da fila para aprovação. */
    pick(id: number) {
        const word = this.find(id, ["queued"]);
        const pending = this.pending;
        if (pending) this.setStatus(pending, "queued");
        this.setStatus(word, "pending");
    }

    /** Coloca a palavra sorteada na tela. Se já houver uma, ela é marcada como usada. */
    approve() {
        const pending = this.pending;
        if (!pending) throw new GameError("Nenhuma palavra sorteada.");
        const current = this.current;
        if (current) this.setStatus(current, "used");
        this.setStatus(pending, "current");
    }

    /** Coloca uma palavra da fila direto na tela. */
    showNow(id: number) {
        const word = this.find(id, ["queued", "pending"]);
        const current = this.current;
        if (current) this.setStatus(current, "used");
        this.setStatus(word, "current");
    }

    /** Devolve a palavra sorteada para a fila (pular). */
    skipPending() {
        const pending = this.pending;
        if (!pending) throw new GameError("Nenhuma palavra sorteada.");
        this.setStatus(pending, "queued");
    }

    /** Descarta a palavra sorteada. */
    rejectPending() {
        const pending = this.pending;
        if (!pending) throw new GameError("Nenhuma palavra sorteada.");
        this.setStatus(pending, "rejected");
    }

    markUsed() {
        const current = this.current;
        if (!current) throw new GameError("Nenhuma palavra na tela.");
        this.setStatus(current, "used");
    }

    /** Tira a palavra da tela sem pontuar, devolvendo para a fila. */
    returnCurrent() {
        const current = this.current;
        if (!current) throw new GameError("Nenhuma palavra na tela.");
        this.setStatus(current, "queued");
    }

    remove(id: number) {
        this.setStatus(this.find(id, ["queued", "pending"]), "rejected");
    }

    /** Volta uma palavra usada/descartada para a fila (desfazer). */
    restore(id: number) {
        this.setStatus(this.find(id, ["used", "rejected"]), "queued");
    }

    reset() {
        this.words = [];
        this.nextId = 1;
        this.save();
    }

    // ---------- Internos ----------

    private find(id: number, allowed: WordStatus[]) {
        const word = this.words.find((w) => w.id === id);
        if (!word || !allowed.includes(word.status))
            throw new GameError("Palavra não encontrada ou já alterada.");
        return word;
    }

    private setStatus(word: Word, status: WordStatus) {
        word.status = status;
        word.updatedAt = Date.now();
        this.save();
    }

    private load() {
        if (!this.dataFile || !fs.existsSync(this.dataFile)) return;
        try {
            const data = JSON.parse(fs.readFileSync(this.dataFile, "utf8")) as PersistedState;
            this.words = data.words ?? [];
            this.nextId = data.nextId ?? this.words.reduce((max, w) => Math.max(max, w.id), 0) + 1;
            console.log(`Estado carregado de ${this.dataFile} (${this.words.length} palavras)`);
        } catch (err) {
            console.error("Falha ao carregar estado salvo:", err);
        }
    }

    private save() {
        if (!this.dataFile || this.saveTimer) return;
        this.saveTimer = setTimeout(() => {
            this.saveTimer = null;
            const data: PersistedState = { nextId: this.nextId, words: this.words };
            fs.promises
                .writeFile(this.dataFile!, JSON.stringify(data))
                .catch((err) => console.error("Falha ao salvar estado:", err));
        }, 300);
    }
}
