import React, { useState } from 'react';
import axios from 'axios';
import { Search, Loader2, Link } from 'lucide-react';
import { IntegrityBadge } from '../components/IntegrityBadge';
import { VerificationModal } from '../components/VerificationModal';

export function PublicVerify() {
  const [searchId, setSearchId] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchId.trim()) return;

    setLoading(true);
    setErrorMsg(null);
    setResult(null);

    try {
      const response = await axios.get(`/api/titulos/${searchId.trim()}/verify`);
      setResult(response.data);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setErrorMsg('Título de Dívida não encontrado. Verifique se o UUID (ID) foi digitado corretamente.');
      } else if (err.response?.status === 429) {
        setErrorMsg('Muitas consultas sequenciais do seu endereço de rede. Aguarde alguns instantes e tente novamente (Rate Limit).');
      } else {
        setErrorMsg('Ocorreu um erro ao consultar o oráculo de dados blockchain.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pt-16 px-4 pb-20 font-sans">
      <div className="max-w-4xl w-full mx-auto space-y-12">
        
        {/* Header Section */}
        <div className="text-center space-y-5 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="inline-flex items-center justify-center p-4 bg-white rounded-full shadow-sm border border-gray-100 mb-2">
            <Link className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-5xl font-black text-gray-900 tracking-tight">Portal da Transparência</h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto font-medium">
            Auditoria pública inalterável. Insira o UUID do Título de Dívida para confrontar os dados sistêmicos com a prova criptográfica registrada na blockchain.
          </p>
        </div>

        {/* Search Section */}
        <form onSubmit={handleSearch} className="relative max-w-3xl mx-auto animate-in zoom-in-95 duration-500 delay-100">
          <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
            <Search className="h-7 w-7 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-16 pr-40 py-6 bg-white border border-gray-200 rounded-3xl text-xl shadow-lg focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-gray-300 font-mono"
            placeholder="Ex: 550e8400-e29b-41d4-a716-446655440000"
            value={searchId}
            onChange={e => setSearchId(e.target.value)}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !searchId.trim()}
            className="absolute right-3 bottom-3 top-3 px-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-2xl transition-all shadow-md hover:shadow-lg disabled:opacity-60 flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Auditar'}
          </button>
        </form>

        {loading && (
          <div className="text-center py-16 text-gray-500 flex flex-col items-center gap-5 animate-in fade-in">
            <div className="p-4 bg-white rounded-full shadow-sm">
              <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
            </div>
            <p className="text-xl font-semibold text-gray-600 tracking-tight">Consultando ledger descentralizado...</p>
          </div>
        )}

        {errorMsg && (
          <div className="max-w-3xl mx-auto p-6 bg-red-50 text-red-800 rounded-2xl border border-red-200 text-center shadow-sm animate-in zoom-in-95">
            <p className="text-lg font-bold">{errorMsg}</p>
          </div>
        )}

        {result && result.status === 'REMOVED' && (
          <div className="max-w-3xl mx-auto animate-in slide-in-from-bottom-8 fade-in duration-500">
            <IntegrityBadge status="REMOVED" />
          </div>
        )}

        {result && result.status !== 'REMOVED' && (
          <div className="max-w-4xl mx-auto bg-white rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden animate-in slide-in-from-bottom-8 fade-in duration-500">
            {/* Badge Banner */}
            <div className="p-8 border-b border-gray-100 bg-gray-50/50">
              <IntegrityBadge 
                status={result.status} 
                onClickVerified={() => setIsModalOpen(true)} 
              />
            </div>

            {/* Content Body */}
            <div className="p-8 md:p-10">
              <h3 className="text-xl font-black text-gray-900 mb-8 tracking-tight">Dados Públicos do Título</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12">
                <div className="space-y-1">
                  <span className="block text-xs font-black text-gray-400 uppercase tracking-widest">ID (UUID)</span>
                  <span className="font-mono text-gray-800 text-lg break-all bg-gray-50 px-2 py-1 rounded inline-block border border-gray-100">{result.id}</span>
                </div>
                <div className="space-y-1">
                  <span className="block text-xs font-black text-gray-400 uppercase tracking-widest">Emissor / Credor</span>
                  <span className="font-bold text-gray-900 text-xl">{result.credor}</span>
                </div>
                <div className="space-y-1">
                  <span className="block text-xs font-black text-gray-400 uppercase tracking-widest">Valor Total</span>
                  <span className="font-black text-3xl text-green-600 tracking-tighter">{result.valor_reais}</span>
                </div>
                <div className="space-y-1">
                  <span className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Ciclo de Vida</span>
                  <div className="flex flex-col gap-2 font-medium text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 text-sm">Emissão:</span> 
                      <span>{new Date(result.emitido_em).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-gray-200/60">
                      <span className="text-gray-500 text-sm">Vencimento:</span> 
                      <span className="text-red-600">{new Date(result.data_vencimento).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Installments public block */}
              <div className="mt-12 pt-10 border-t border-gray-100">
                <h3 className="text-xs font-black text-gray-400 mb-6 uppercase tracking-widest">Situação das Parcelas (Visão Pública)</h3>
                <div className="grid grid-cols-3 gap-6 text-center">
                  <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    <span className="block text-4xl font-black text-gray-900">{result.total_parcelas}</span>
                    <span className="text-sm font-bold text-gray-500 uppercase mt-2 block tracking-wide">Total</span>
                  </div>
                  <div className="bg-green-50 p-6 rounded-2xl border border-green-200 shadow-sm hover:shadow-md transition-shadow">
                    <span className="block text-4xl font-black text-green-700">{result.parcelas_pagas}</span>
                    <span className="text-sm font-bold text-green-600 uppercase mt-2 block tracking-wide">Pagas</span>
                  </div>
                  <div className="bg-red-50 p-6 rounded-2xl border border-red-200 shadow-sm hover:shadow-md transition-shadow">
                    <span className="block text-4xl font-black text-red-700">{result.parcelas_vencidas}</span>
                    <span className="text-sm font-bold text-red-600 uppercase mt-2 block tracking-wide">Vencidas</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>

      {result && result.status === 'VERIFIED' && (
        <VerificationModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          data={result} 
        />
      )}
    </div>
  );
}
