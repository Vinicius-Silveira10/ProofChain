import { RefreshCw } from "lucide-react";

export function FooterStatus() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto flex max-w-6xl items-center justify-center gap-2 px-4 py-3">
        <RefreshCw className="size-4 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Última varredura de integridade: 23/05/2026 15:15:00 UTC — Processamento em background concluído.
        </p>
      </div>
    </footer>
  );
}
