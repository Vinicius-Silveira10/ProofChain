import { useState } from "react";
import api from "@/services/api";
import { Header } from "@/components/verification/header";
import { SearchSection } from "@/components/verification/search-section";
import { IntegrityCard, type TitleData, type VerificationStatus } from "@/components/verification/integrity-card";
import { ForensicModal } from "@/components/verification/forensic-modal";
import { AlertCircle, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportHtmlToPdf } from "@/utils/pdf";

export default function VerificadorPublico() {
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [searchResult, setSearchResult] = useState<TitleData | null>(null);
  const [forensicData, setForensicData] = useState<{
    dbHash: string;
    blockchainHash: string;
    blockTimestamp: string;
    txHash: string;
  } | null>(null);
  const [isForensicOpen, setIsForensicOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR");
  };

  const handleSearch = async (uuid: string) => {
    // Ponto 1: Sanitização — trim() garante que espaços extras não quebrem a URL
    const cleanUuid = uuid.trim();
    if (!cleanUuid) return;

    setIsLoading(true);
    // Ponto 4: Limpar estados ANTES da nova requisição para não exibir dados obsoletos
    setSearchResult(null);
    setForensicData(null);
    setError(null);

    try {
      // Ponto 3: Chamada real à API — sem mocks residuais.
      // O interceptor do axios.ts já exclui a injeção de JWT para rotas com /public/
      // O app.ts do backend registra o alias: app.use('/api/public/titulos', tituloRoutes)
      const response = await api.get(`/public/titulos/${cleanUuid}/verify`);

      // Ponto 4 — Mapeamento correto do payload REAL do backend.
      // O backend retorna o objeto DIRETO (sem envelope { isValid, titulo }).
      // Campos reais: id, credor, valor_reais (string BRL), data_vencimento,
      //               emitido_em, status, hash_integridade, blockchain_hash,
      //               tx_hash, verificado_em
      const data = response.data;

      // Validação defensiva mínima antes de renderizar
      if (!data || !data.id || !data.status) {
        setError("Resposta inesperada do servidor. Tente novamente.");
        return;
      }

      // Ponto 4: Sucesso — garantir que o estado de erro seja nulo
      setError(null);

      setSearchResult({
        uuid: data.id,                                    // backend: "id"
        creditor: data.credor,                            // backend: "credor"
        value: data.valor_reais ?? "N/A",                 // backend: "valor_reais" (já formatado em BRL)
        dueDate: data.data_vencimento
          ? formatDate(data.data_vencimento)
          : "N/A",
        issueDate: data.emitido_em
          ? formatDate(data.emitido_em)
          : "N/A",
        status: data.status as VerificationStatus,
      });

      setForensicData({
        dbHash: data.hash_integridade ?? "N/A",           // backend: "hash_integridade"
        blockchainHash: data.blockchain_hash ?? "N/A",    // backend: "blockchain_hash"
        blockTimestamp: data.verificado_em ?? new Date().toISOString(),
        txHash: data.tx_hash ?? "0x...",
      });

    } catch (err: any) {
      // Ponto 4: setError acionado APENAS no catch — nunca no fluxo de sucesso
      if (err.response?.status === 404) {
        setError("Título não encontrado. Verifique o UUID e tente novamente.");
      } else if (err.response?.status === 400) {
        setError("UUID inválido. O formato esperado é UUID v4 (ex: 550e8400-e29b-...).");
      } else if (err.response?.status === 429) {
        setError("Muitas requisições. Aguarde um momento e tente novamente.");
      } else {
        setError("Erro de conexão com o servidor. Verifique sua internet ou tente mais tarde.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    await exportHtmlToPdf("proofchain-receipt", `Recibo_ProofChain_${searchResult?.uuid?.split('-')[0]}`);
    setIsExporting(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pb-16">
        {/* Ponto 2: SearchSection já controla o estado local do input com onChange
            e usa e.preventDefault() no onSubmit — nenhuma alteração necessária lá */}
        <SearchSection onSearch={handleSearch} isLoading={isLoading} />
        {error && (
          <div className="mx-auto max-w-2xl px-4 mt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3 rounded-md bg-red-50 border border-red-200 px-4 py-3">
              <AlertCircle className="size-5 text-red-500 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {searchResult && (
          <div className="px-4 mt-4 animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col items-center">
            <div className="w-full max-w-2xl flex justify-end mb-3">
              <Button
                variant="outline"
                onClick={handleExportPDF}
                disabled={isExporting}
                className="gap-2 bg-white"
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {isExporting ? "Gerando PDF..." : "Exportar Recibo (PDF)"}
              </Button>
            </div>

            <div id="proofchain-receipt" className="w-full max-w-2xl bg-background p-2 rounded-xl">
              <IntegrityCard
                data={searchResult}
                onOpenForensic={() => setIsForensicOpen(true)}
              />
            </div>
          </div>
        )}
      </main>

      {forensicData && (
        <ForensicModal
          open={isForensicOpen}
          onOpenChange={setIsForensicOpen}
          dbHash={forensicData.dbHash}
          blockchainHash={forensicData.blockchainHash}
          blockTimestamp={forensicData.blockTimestamp}
          txHash={forensicData.txHash}
        />
      )}
    </div>
  );
}
