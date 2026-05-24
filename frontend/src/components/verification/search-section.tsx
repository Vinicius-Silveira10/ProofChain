import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SearchSectionProps {
  onSearch: (uuid: string) => void;
  isLoading: boolean;
}

export function SearchSection({ onSearch, isLoading }: SearchSectionProps) {
  const [uuid, setUuid] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (uuid.trim()) {
      onSearch(uuid.trim());
    }
  };

  return (
    <section className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
        Auditoria Pública de Títulos de Dívida
      </h1>
      <p className="mt-4 text-pretty text-muted-foreground">
        Verifique a integridade matemática dos registros financeiros ancorados na blockchain.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Insira o UUID do Título (ex: 550e8400-e29b...)"
            value={uuid}
            onChange={(e) => setUuid(e.target.value)}
            className="h-12 pl-10 text-base"
            disabled={isLoading}
          />
        </div>
        <Button 
          type="submit" 
          size="lg" 
          className="h-12 min-w-[180px]"
          disabled={isLoading || !uuid.trim()}
        >
          {isLoading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              <span className="ml-2 text-sm">Consultando ledger descentralizado...</span>
            </>
          ) : (
            "Verificar Autenticidade"
          )}
        </Button>
      </form>
    </section>
  );
}
