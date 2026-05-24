import { EmissaoForm } from "@/components/emissao/emissao-form";

export default function Emissao() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto max-w-3xl px-4 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground">
            Nova Emissão de Título
          </h1>
          <p className="text-muted-foreground mt-1">
            Registre a dívida no banco de dados e ancore o hash criptográfico na
            Ethereum Sepolia.
          </p>
        </div>

        <EmissaoForm />
      </div>
    </main>
  );
}
