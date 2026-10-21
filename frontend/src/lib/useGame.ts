import { useCallback, useEffect, useRef, useState } from "react";

export type ConnectionStatus = "connecting" | "open" | "closed";

export interface JoinPayload {
  role: "admin" | "display" | "player";
  name?: string;
}

export interface RequestResult {
  ok: boolean;
  error?: string;
  [key: string]: unknown;
}

const WS_URL = import.meta.env.VITE_WS_URL as string;

/**
 * Conecta ao servidor, se identifica com `join` e mantém o estado sincronizado.
 * Reconecta sozinho se a conexão cair. Passe `null` para não entrar ainda.
 */
export function useGame<S>(join: JoinPayload | null) {
  const [state, setState] = useState<S | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");

  const wsRef = useRef<WebSocket | null>(null);
  const joinRef = useRef(join);
  const pending = useRef(new Map<string, (r: RequestResult) => void>());

  const sendJoin = useCallback(() => {
    const ws = wsRef.current;
    if (joinRef.current && ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "join", ...joinRef.current }));
    }
  }, []);

  useEffect(() => {
    let retry = 0;
    let timer: ReturnType<typeof setTimeout>;
    let disposed = false;

    const connect = () => {
      setStatus("connecting");
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        retry = 0;
        setStatus("open");
        sendJoin();
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === "state") {
          setState(msg.state);
        } else if (msg.type === "result") {
          pending.current.get(msg.reqId)?.(msg);
          pending.current.delete(msg.reqId);
        }
      };

      ws.onclose = () => {
        setStatus("closed");
        pending.current.forEach((resolve) => resolve({ ok: false, error: "Conexão perdida." }));
        pending.current.clear();
        if (disposed) return;
        const delay = Math.min(1000 * 2 ** retry++, 10_000);
        timer = setTimeout(connect, delay);
      };
    };

    connect();
    return () => {
      disposed = true;
      clearTimeout(timer);
      wsRef.current?.close();
    };
  }, [sendJoin]);

  // Reenvia o join quando os dados de identificação mudam
  const joinKey = JSON.stringify(join);
  useEffect(() => {
    joinRef.current = join;
    sendJoin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinKey, sendJoin]);

  /** Envia uma mensagem e espera a resposta do servidor. */
  const request = useCallback((message: Record<string, unknown>) => {
    return new Promise<RequestResult>((resolve) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        resolve({ ok: false, error: "Sem conexão com o servidor." });
        return;
      }
      const reqId = Math.random().toString(36).slice(2);
      pending.current.set(reqId, resolve);
      ws.send(JSON.stringify({ ...message, reqId }));
    });
  }, []);

  return { state, status, request };
}
