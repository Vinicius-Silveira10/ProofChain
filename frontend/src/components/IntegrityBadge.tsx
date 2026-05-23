import React from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle } from 'lucide-react';

interface IntegrityBadgeProps {
  status: 'VERIFIED' | 'COMPROMISED' | 'PENDING' | 'REMOVED';
  onClickVerified?: () => void;
}

export function IntegrityBadge({ status, onClickVerified }: IntegrityBadgeProps) {
  if (status === 'VERIFIED') {
    return (
      <button 
        onClick={onClickVerified}
        className="flex items-center gap-4 w-full p-5 bg-green-50 border border-green-400 rounded-2xl hover:bg-green-100 transition-all shadow-sm text-left group hover:shadow-md"
      >
        <div className="p-3 bg-green-500 rounded-full text-white group-hover:scale-110 transition-transform shadow-sm">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <div>
          <h3 className="font-extrabold text-green-800 text-xl tracking-tight">✓ REGISTRO ÍNTEGRO</h3>
          <p className="text-green-700 mt-1 font-medium">Os dados não foram alterados e conferem 100% com a blockchain. <span className="underline decoration-green-300">Clique para detalhes.</span></p>
        </div>
      </button>
    );
  }

  if (status === 'COMPROMISED') {
    return (
      <div className="flex items-center gap-4 w-full p-5 bg-red-50 border border-red-400 rounded-2xl shadow-sm text-left">
        <div className="p-3 bg-red-500 rounded-full text-white animate-pulse shadow-sm">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div>
          <h3 className="font-extrabold text-red-800 text-xl tracking-tight">✗ ALERTA DE FRAUDE</h3>
          <p className="text-red-700 mt-1 font-medium">Dados adulterados detectados! O banco de dados relacional diverge da prova criptográfica original.</p>
        </div>
      </div>
    );
  }

  if (status === 'REMOVED') {
    return (
      <div className="flex items-center gap-4 w-full p-5 bg-red-50 border border-red-500 rounded-2xl shadow-sm text-left">
        <div className="p-3 bg-red-600 rounded-full text-white shadow-sm animate-pulse">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div>
          <h3 className="font-extrabold text-red-800 text-xl tracking-tight">✗ REGISTRO EXCLUÍDO (FRAUDE DE OCULTAÇÃO)</h3>
          <p className="text-red-700 mt-1 font-medium">Evidência blockchain localizada, indicando que os dados existiram, mas foram apagados fisicamente do banco de dados.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 w-full p-5 bg-yellow-50 border border-yellow-400 rounded-2xl shadow-sm text-left">
      <div className="p-3 bg-yellow-500 rounded-full text-white shadow-sm">
        <AlertTriangle className="w-8 h-8" />
      </div>
      <div>
        <h3 className="font-extrabold text-yellow-800 text-xl tracking-tight">⚠ VERIFICAÇÃO PENDENTE</h3>
        <p className="text-yellow-700 mt-1 font-medium">A blockchain está temporariamente inacessível. Não foi possível atestar a integridade matemática neste momento.</p>
      </div>
    </div>
  );
}
