import { useState } from "react";
import axios from "axios";
import { Header } from "@/components/verification/header";
import { SearchSection } from "@/components/verification/search-section";
import { IntegrityCard, type TitleData, type VerificationStatus } from "@/components/verification/integrity-card";
import { ForensicModal } from "@/components/verification/forensic-modal";
import { AlertCircle } from "lucide-react";

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
      // MOCK PARA TESTES DE FRONTEND
      if (uuid === "f47ac10b-58cc-4372-a567-0e02b2c3d479") {
        setTimeout(() => {
          setSearchResult({
            uuid: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
            creditor: "Empresa de Teste Mock Ltda",
            value: formatCurrency(1500000),
            dueDate: formatDate("2026-12-31"),
            issueDate: formatDate("2026-05-23"),
            status: "VERIFIED",
          });
          setForensicData({
            dbHash: "0xabc123def456hashbancodedados",
            blockchainHash: "0xabc123def456hashblockchain",
            blockTimestamp: new Date().toISOString(),
            txHash: "0xtxhash1234567890abcdef",
          });
          setIsLoading(false);
        }, 1000);
        return;
      }

      const response = await axios.get<ApiResponse>(`/api/titulos/${uuid}/verify`);
      const data = response.data;

      setSearchResult({
        uuid: data.uuid,
        creditor: data.creditor,
        value: formatCurrency(data.total_value),
        dueDate: formatDate(data.due_date),
        issueDate: formatDate(data.issue_date),
        status: data.status,
      });

      setForensicData({
        dbHash: data.db_hash,
        blockchainHash: data.blockchain_hash,
        blockTimestamp: data.block_timestamp,
        txHash: data.tx_hash,
      });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 404) {
          setError("Título não encontrado. Verifique o UUID e tente novamente.");
        } else if (err.response?.status === 400) {
          setError("UUID inválido. O formato deve ser um UUID válido.");
        } else {
          setError("Erro ao consultar o título. Tente novamente mais tarde.");
        }
      } else {
        setError("Erro de conexão. Verifique sua internet e tente novamente.");
      }
    } finally {
      setIsLoading(false);
    }
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
          <div className="px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <IntegrityCard 
              data={searchResult} 
              onOpenForensic={() => setIsForensicOpen(true)} 
            />
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
