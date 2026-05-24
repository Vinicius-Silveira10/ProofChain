import { Shield, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Shield className="size-6 text-foreground" />
          <span className="text-xl font-semibold tracking-tight text-foreground">
            ProofChain
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <div className="size-1.5 rounded-full bg-success" />
            Verificador Público
          </div>

          <Link to="/login">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
            >
              <Lock className="size-3.5" />
              Acesso Corporativo
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

export { Header as VerificationHeader };

