import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShieldAlert, ChevronDown, ChevronUp, Search, Calendar, User, Activity, FileText } from 'lucide-react';

interface AuditLog {
  id: string;
  tituloDividaId: string;
  userId: string;
  action: string;
  clientIp: string;
  diff_snapshot: any | null;
  timestamp: string;
  user: { name: string; email: string; role: string };
  tituloDivida: { id: string; credor: string } | null;
}

export function AuditTrail() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Filtros
  const [filterTituloId, setFilterTituloId] = useState('');
  const [filterAction, setFilterAction] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (filterTituloId) params.append('tituloDividaId', filterTituloId.trim());
      if (filterAction) params.append('action', filterAction);

      const response = await axios.get(`/api/audit-logs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLogs(response.data.data);
    } catch (err) {
      console.error('Erro ao buscar logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterAction]); // Auto-recarrega ao mudar a ação. O TituloID espera o Enter.

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs();
  };

  const toggleDiff = (id: string) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  const renderSafeJson = (data: any): string => {
    try {
      if (!data) return '{}';
      // React escaping inherently protects against script tags, 
      // mas garantimos que a árvore não vá dar throw em serializações circulares ou inválidas.
      return typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    } catch (e) {
      return '[Erro de Parse] Payload de auditoria corrompido ou ininteligível.';
    }
  };

  const formatAction = (action: string) => {
    const map: Record<string, string> = {
      INSERT: 'Emissão',
      UPDATE: 'Atualização',
      STATUS_CHANGE: 'Mudança de Status',
      INTEGRITY_BREACH_DETECTED: 'Fraude Detectada',
      PAYMENT_REGISTERED: 'Pagamento',
      VERIFICATION_REQUESTED: 'Auditoria Solicitada',
    };
    return map[action] || action;
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20 px-4 pb-12 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Trilha Forense</h1>
            <p className="text-gray-500 font-medium mt-1">Inspeção profunda de eventos e anomalias de segurança.</p>
          </div>
        </div>

        {/* Painel de Filtros */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 items-end">
          <form onSubmit={handleSearchSubmit} className="flex-1 w-full">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Filtrar por UUID do Título</label>
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
              <input 
                type="text" 
                placeholder="Ex: 550e8400-e29b..."
                value={filterTituloId}
                onChange={e => setFilterTituloId(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-mono text-sm transition-all"
              />
            </div>
          </form>
          
          <div className="w-full md:w-64">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Tipo de Evento</label>
            <select 
              value={filterAction}
              onChange={e => setFilterAction(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm font-medium transition-all appearance-none"
            >
              <option value="">Todos os Eventos</option>
              <option value="INSERT">Emissão (INSERT)</option>
              <option value="INTEGRITY_BREACH_DETECTED">Fraude (BREACH)</option>
              <option value="UPDATE">Atualização (UPDATE)</option>
              <option value="PAYMENT_REGISTERED">Pagamento</option>
            </select>
          </div>
        </div>

        {/* Tabela de Alta Densidade */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-900 text-white text-xs uppercase tracking-wider">
                  <th className="p-4 font-bold rounded-tl-2xl">Data / Hora</th>
                  <th className="p-4 font-bold">Ação</th>
                  <th className="p-4 font-bold">Autor / IP</th>
                  <th className="p-4 font-bold">Título Afetado</th>
                  <th className="p-4 font-bold text-right rounded-tr-2xl">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">
                      Carregando trilha de auditoria...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500 font-medium">
                      Nenhum evento forense encontrado para os filtros atuais.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const isBreach = log.action === 'INTEGRITY_BREACH_DETECTED';
                    const isExpanded = expandedLogId === log.id;
                    const hasDiff = log.diff_snapshot && Object.keys(log.diff_snapshot).length > 0;

                    return (
                      <React.Fragment key={log.id}>
                        <tr className={`transition-colors hover:bg-gray-50 ${isBreach ? 'bg-red-50/50 hover:bg-red-50' : ''}`}>
                          <td className="p-4 align-top">
                            <div className="flex items-center gap-2 text-gray-900 font-medium">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              {new Date(log.timestamp).toLocaleString('pt-BR')}
                            </div>
                            <div className="text-xs text-gray-500 mt-1 ml-6 font-mono">ID: {log.id.split('-')[0]}...</div>
                          </td>
                          <td className="p-4 align-top">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${
                              isBreach ? 'bg-red-100 text-red-800 border border-red-200' : 
                              log.action === 'INSERT' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {isBreach && <ShieldAlert className="w-3.5 h-3.5" />}
                              {formatAction(log.action)}
                            </span>
                          </td>
                          <td className="p-4 align-top">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-400" />
                              <span className="font-bold text-gray-900">{log.user.name}</span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1 ml-6">{log.user.role}</div>
                            <div className="text-xs font-mono text-gray-400 mt-0.5 ml-6">IP: {log.clientIp}</div>
                          </td>
                          <td className="p-4 align-top">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-gray-400" />
                              <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-800">
                                {log.tituloDividaId}
                              </span>
                            </div>
                            {log.tituloDivida && (
                              <div className="text-xs text-gray-500 mt-1 ml-6 font-medium">Credor: {log.tituloDivida.credor}</div>
                            )}
                          </td>
                          <td className="p-4 align-top text-right">
                            {hasDiff && (
                              <button 
                                onClick={() => toggleDiff(log.id)}
                                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                  isExpanded ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                Ver Diff Snapshot
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                            )}
                          </td>
                        </tr>

                        {/* Diff Viewer Expandível */}
                        {isExpanded && hasDiff && (
                          <tr>
                            <td colSpan={5} className="p-0 border-0">
                              <div className="bg-gray-900 p-6 shadow-inner animate-in slide-in-from-top-2 duration-200">
                                <h4 className="text-gray-300 text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                                  <Activity className="w-4 h-4" /> Análise de Snapshot Forense (Before/After)
                                </h4>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                  <div className="space-y-2">
                                    <div className="inline-block px-3 py-1 bg-red-900/30 border border-red-800/50 text-red-400 text-xs font-bold uppercase rounded-md">
                                      Estado Anterior (Before)
                                    </div>
                                    <pre className="bg-[#0d1117] p-4 rounded-xl text-red-300 font-mono text-xs overflow-x-auto border border-gray-800">
                                      {renderSafeJson(log.diff_snapshot.before)}
                                    </pre>
                                  </div>
                                  <div className="space-y-2">
                                    <div className="inline-block px-3 py-1 bg-green-900/30 border border-green-800/50 text-green-400 text-xs font-bold uppercase rounded-md">
                                      Estado Pós-Mutação (After)
                                    </div>
                                    <pre className="bg-[#0d1117] p-4 rounded-xl text-green-300 font-mono text-xs overflow-x-auto border border-gray-800">
                                      {renderSafeJson(log.diff_snapshot.after)}
                                    </pre>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
