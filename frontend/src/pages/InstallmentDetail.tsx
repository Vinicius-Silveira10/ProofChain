import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Download, CheckCircle, AlertTriangle, XCircle, Clock } from 'lucide-react';

interface Installment {
  id: string;
  numero_parcela: number;
  valor_centavos: string;
  data_vencimento_parcela: string;
  motivo: string;
  autorizado_por: string;
  status_parcela: 'PENDENTE' | 'PAGO' | 'VENCIDO' | 'CANCELADO';
  data_hora_pagamento: string | null;
  usuario_pagamento: { name: string; email: string } | null;
}

export function InstallmentDetail({ tituloId }: { tituloId: string }) {
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Role Control (Simulado pela falta do contexto real de Auth, deve vir do seu Redux/Context)
  const [userRole, setUserRole] = useState<'OPERATOR' | 'AUDITOR' | 'ADMIN'>('OPERATOR');

  // Modal de Confirmação
  const [confirmPaymentId, setConfirmPaymentId] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    // Em uma app real, pegaria o Role do AuthContext.
    // Aqui decodificamos do payload do JWT mockado se existir, ou forçamos.
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserRole(payload.role);
      } catch (e) {}
    }
    fetchInstallments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tituloId]);

  const fetchInstallments = async () => {
    try {
      const response = await axios.get(`/api/titulos/${tituloId}/installments`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setInstallments(response.data);
    } catch (err: any) {
      setErrorMsg('Falha ao carregar parcelas. Acesso Negado ou Titulo não encontrado.');
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async (id: string) => {
    setPaying(true);
    try {
      await axios.patch(`/api/installments/${id}/pay`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      // Atualiza a grade
      await fetchInstallments();
      setConfirmPaymentId(null);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao registrar pagamento.');
    } finally {
      setPaying(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await axios.get(`/api/titulos/${tituloId}/installments/export`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `parcelas_titulo_${tituloId.substring(0,8)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert('Erro na exportação (Verifique suas permissões de auditoria).');
    }
  };

  const formatBRL = (centavosStr: string) => {
    return (Number(centavosStr) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
      case 'PAGO':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold"><CheckCircle className="w-3.5 h-3.5" /> Pago</span>;
      case 'VENCIDO':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold animate-pulse"><AlertTriangle className="w-3.5 h-3.5" /> Vencido</span>;
      case 'CANCELADO':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold line-through"><XCircle className="w-3.5 h-3.5" /> Cancelado</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-bold"><Clock className="w-3.5 h-3.5" /> Pendente</span>;
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Buscando quadro societário de parcelas...</div>;
  if (errorMsg) return <div className="p-8 text-center text-red-600 font-bold">{errorMsg}</div>;

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden mt-12 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="p-8 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Gestão de Parcelas</h2>
          <p className="text-gray-500 text-sm font-medium mt-1">Visão corporativa do plano de quitação de dívida.</p>
        </div>

        {/* Exportação condicional por RBAC */}
        {(userRole === 'ADMIN' || userRole === 'AUDITOR') && (
          <button 
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-black text-white text-sm font-bold rounded-xl transition-all shadow-md active:scale-95"
          >
            <Download className="w-4 h-4" /> Exportar (CSV)
          </button>
        )}
      </div>

      {/* Tabela de Dados */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-white border-b border-gray-200 text-gray-400 text-xs uppercase tracking-widest">
              <th className="p-5 font-black">Nº</th>
              <th className="p-5 font-black">Valor</th>
              <th className="p-5 font-black">Vencimento</th>
              <th className="p-5 font-black">Status</th>
              <th className="p-5 font-black">Autorizador / Motivo</th>
              <th className="p-5 font-black">Pagamento</th>
              <th className="p-5 font-black text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {installments.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-gray-500">Nenhuma parcela cadastrada para este Título.</td></tr>
            )}
            
            {installments.map((inst) => {
              const isVencido = inst.status_parcela === 'VENCIDO';
              return (
                <tr key={inst.id} className={`transition-colors hover:bg-gray-50/50 ${isVencido ? 'bg-amber-50/30' : ''}`}>
                  <td className="p-5 font-black text-gray-900 text-lg">{inst.numero_parcela}</td>
                  <td className="p-5 font-black text-gray-800">{formatBRL(inst.valor_centavos)}</td>
                  <td className="p-5 font-medium text-gray-600">{new Date(inst.data_vencimento_parcela).toLocaleDateString('pt-BR')}</td>
                  <td className="p-5"><StatusBadge status={inst.status_parcela} /></td>
                  <td className="p-5">
                    <div className="font-bold text-gray-900">{inst.autorizado_por}</div>
                    <div className="text-xs text-gray-500 mt-1 max-w-xs truncate" title={inst.motivo}>{inst.motivo}</div>
                  </td>
                  <td className="p-5">
                    {inst.data_hora_pagamento ? (
                      <div>
                        <div className="font-medium text-gray-900">{new Date(inst.data_hora_pagamento).toLocaleDateString('pt-BR')}</div>
                        <div className="text-xs text-gray-400 mt-1">Por: {inst.usuario_pagamento?.name}</div>
                      </div>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                  <td className="p-5 text-right">
                    {inst.status_parcela === 'PENDENTE' && (
                      <button 
                        onClick={() => setConfirmPaymentId(inst.id)}
                        className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white text-sm font-bold rounded-lg transition-colors border border-blue-200"
                      >
                        Registrar Pagamento
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal de Confirmação */}
      {confirmPaymentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full animate-in zoom-in-95">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-center text-gray-900 mb-2">Confirmar Pagamento?</h3>
            <p className="text-center text-gray-500 mb-8 font-medium">
              Esta ação é <strong className="text-red-600">irreversível</strong> e será ancorada permanentemente nos Logs de Auditoria. O sistema carimbará o exato milissegundo atual.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmPaymentId(null)}
                disabled={paying}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl transition"
              >
                Cancelar
              </button>
              <button 
                onClick={() => handlePay(confirmPaymentId)}
                disabled={paying}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition shadow-lg shadow-red-600/20 flex justify-center"
              >
                {paying ? 'Processando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
