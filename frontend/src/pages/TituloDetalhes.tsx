import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { BreadcrumbHeader } from "@/components/titulo/breadcrumb-header";
import { ResumoFinanceiro } from "@/components/titulo/resumo-financeiro";
import { TabelaParcelas } from "@/components/titulo/tabela-parcelas";
import { tituloService } from "@/services/tituloService";
import type { Titulo } from "@/types";
import { Copy, CheckCheck, ExternalLink, Loader2, AlertCircle, ShieldCheck, Blocks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import api from "@/services/api";
import { ModalProvaBlockchain } from "@/components/titulo/modal-prova-blockchain";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("pt-BR");
}

export default function TituloDetalhes() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  const [titulo, setTitulo] = useState<Titulo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [blockchainModalOpen, setBlockchainModalOpen] = useState(false);
  const [verificationData, setVerificationData] = useState<any>(null);
  const [isLoadingProof, setIsLoadingProof] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchTitulo = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await tituloService.getTituloById(id);
        setTitulo(data);
      } catch {
        setError("Não foi possível carregar os dados deste título. Verifique sua conexão ou tente novamente.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTitulo();
  }, [id]);

  const handleCopyUUID = async () => {
    if (!titulo?.uuid) return;
    try {
      await navigator.clipboard.writeText(titulo.uuid);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback silencioso
    }
  };

  const handleVerifyNow = async () => {
    if (!id) return;
    setIsVerifying(true);
    try {
      const response = await api.post<any>(`/titulos/${id}/verify-now`);
      const result = response.data;

      // Atualizar o badge de status localmente
      if (titulo) {
        setTitulo({ ...titulo, status: result.status });
      }

      toast({
        title: result.isMatch ? "✅ Integridade Confirmada" : "⚠️ Atenção",
        description: result.isMatch
          ? `Hash SQL e Blockchain coincidem. Status: ${result.status}`
          : `Divergência detectada! Status: ${result.status}`,
        variant: result.isMatch ? "default" : "destructive",
      });
    } catch (err: any) {
      toast({
        title: "Erro na verificação",
        description: err?.response?.data?.error || "Não foi possível verificar a integridade agora.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleOpenBlockchainModal = async () => {
    setBlockchainModalOpen(true);
    if (!id) return;
    setIsLoadingProof(true);
    try {
      const response = await api.post<any>(`/titulos/${id}/verify-now`);
      setVerificationData(response.data);
      // Sync status
      if (titulo) {
        setTitulo({ ...titulo, status: response.data.status });
      }
    } catch {
      // Modal will show fallback data from titulo object
    } finally {
      setIsLoadingProof(false);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Loader2 className="h-10 w-10 animate-spin text-slate-400" />
          <p className="text-sm">Carregando dados do título...</p>
        </div>
      </main>
    );
  }

  if (error || !titulo) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="max-w-md text-center space-y-4 px-6">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto" />
          <h2 className="text-lg font-semibold text-foreground">Título não encontrado</h2>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" asChild>
            <Link to="/portfolio">← Voltar ao Portfólio</Link>
          </Button>
        </div>
      </main>
    );
  }

  const uuid = titulo.uuid || titulo.id;

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <BreadcrumbHeader />

        {/* UUID — exibição completa com copiar e link para verificador */}
        <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
              UUID do Título (Identificador Blockchain)
            </p>
            <p className="font-mono text-sm text-slate-800 break-all select-all">
              {uuid}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-8 text-xs"
              onClick={handleCopyUUID}
            >
              {copied ? (
                <>
                  <CheckCheck className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-emerald-600">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copiar UUID
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-8 text-xs"
              asChild
            >
              <a
                href={`/?uuid=${uuid}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Verificar
              </a>
            </Button>
          </div>
        </div>

        {/* Badge de status + botão verificar agora */}
        <div className="mb-6 flex items-center gap-3 flex-wrap">
          {titulo.status === "VERIFIED" && (
            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200">
              ✓ Íntegro (Blockchain Validada)
            </Badge>
          )}
          {titulo.status === "COMPROMISED" && (
            <Badge className="bg-red-50 text-red-700 border border-red-200">
              ⚠ Alerta de Fraude Detectada
            </Badge>
          )}
          {titulo.status === "PENDING" && (
            <Badge className="bg-amber-50 text-amber-700 border border-amber-200">
              ⏳ Verificação Pendente
            </Badge>
          )}

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-8 text-xs"
            onClick={handleVerifyNow}
            disabled={isVerifying}
          >
            {isVerifying ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Verificando...
              </>
            ) : (
              <>
                <ShieldCheck className="h-3.5 w-3.5" />
                Verificar Integridade Agora
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-8 text-xs"
            onClick={handleOpenBlockchainModal}
          >
            <Blocks className="h-3.5 w-3.5" />
            Ver na Blockchain
          </Button>
        </div>

        <ResumoFinanceiro
          credor={titulo.credor}
          cnpj={titulo.cnpjEmissor}
          valorTotal={formatCurrency(titulo.valorTotal)}
          dataEmissao={formatDate(titulo.dataEmissao)}
        />

        <TabelaParcelas tituloId={titulo.id} />

        {/* Modal de Prova On-Chain */}
        <ModalProvaBlockchain
          open={blockchainModalOpen}
          onOpenChange={setBlockchainModalOpen}
          titulo={titulo}
          verificationData={verificationData}
          isLoading={isLoadingProof}
        />
      </div>
    </main>
  );
}
