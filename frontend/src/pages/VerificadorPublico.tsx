import { useState } from "react";
import api from "@/services/api";
import { Header } from "@/components/verification/header";
import { SearchSection } from "@/components/verification/search-section";
import { IntegrityCard, type TitleData, type VerificationStatus } from "@/components/verification/integrity-card";
import { ForensicModal } from "@/components/verification/forensic-modal";
import { AlertCircle, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportHtmlToPdf } from "@/utils/pdf";

interface ApiResponse {
  uuid: string;
  creditor: string;
  creditor_document: string;
  total_value: number;
  due_date: string;
  issue_date: string;
  status: VerificationStatus;
  db_hash: string;
  blockchain_hash: string;
  block_timestamp: string;
  tx_hash: string;
}

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

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR");
  };

  const handleSearch = async (uuid: string) => {
    setIsLoading(true);
    setSearchResult(null);
    setForensicData(null);
    setError(null);

    try {
      // Task 5.1: Chama a rota pública. Usando api centralizada (ou axios direto se preferir, mas api já tem baseURL)
      const response = await api.get(`/public/titulos/${uuid}/verify`);
      const payload = response.data;

      // O payload esperado tem a chave "titulo" e "isValid"
      if (!payload.isValid || !payload.titulo) {
        setError("Título inválido ou não encontrado na rede.");
        return;
      }

      const data = payload.titulo;

      setSearchResult({
        uuid: data.uuid,
        creditor: data.credor,
        value: formatCurrency(data.valorTotal),
        // Na interface do backend, data.dataEmissao é usada
        dueDate: formatDate(data.dataEmissao), 
        issueDate: formatDate(data.dataEmissao),
        status: data.status,
      });

      setForensicData({
        dbHash: data.dbHash || "N/A",
        blockchainHash: data.blockchainHash || "N/A",
        blockTimestamp: data.blockTimestamp || new Date().toISOString(),
        txHash: data.txHash || "0x...",
      });
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError("Título não encontrado. Verifique o UUID e tente novamente.");
      } else if (err.response?.status === 400) {
        setError("UUID inválido. O formato deve ser um UUID válido.");
      } else {
        setError("Erro de conexão. Verifique sua internet ou tente mais tarde.");
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
        <SearchSection onSearch={handleSearch} isLoading={isLoading} />

        <div className="mx-auto max-w-2xl px-4 mt-2 text-center">
          <p className="text-xs text-slate-500">
            UUID de Teste: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 select-all">f47ac10b-58cc-4372-a567-0e02b2c3d479</code>
          </p>
        </div>

        {error && (
          <div className="mx-auto max-w-2xl px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3 rounded-md bg-red-50 border border-red-200 px-4 py-3">
              <AlertCircle className="size-5 text-red-500 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {searchResult && (
          <div className="px-4 animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col items-center">
            <div className="w-full max-w-2xl flex justify-end mb-3">
              <Button 
                variant="outline" 
                onClick={handleExportPDF} 
                disabled={isExporting}
                className="gap-2 bg-white"
              >
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
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
