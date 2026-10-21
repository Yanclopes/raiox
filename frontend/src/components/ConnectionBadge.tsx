import type { ConnectionStatus } from "../lib/useGame";

const styles: Record<ConnectionStatus, { dot: string; label: string }> = {
  open: { dot: "bg-emerald-500", label: "Conectado" },
  connecting: { dot: "bg-amber-400 animate-pulse", label: "Conectando…" },
  closed: { dot: "bg-red-500 animate-pulse", label: "Reconectando…" },
};

export default function ConnectionBadge({
  status,
  className = "",
}: {
  status: ConnectionStatus;
  className?: string;
}) {
  const { dot, label } = styles[status];
  return (
    <span className={`inline-flex items-center gap-2 text-xs ${className}`}>
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
