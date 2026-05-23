import React from 'react';
import { X, ExternalLink } from 'lucide-react';

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    hash_integridade: string;
    blockchain_hash: string;
    tx_hash: string;
    etherscan_url: string;
    verificado_em: string;
  };
}

export function VerificationModal({ isOpen, onClose, data }: VerificationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200 border border-white/20">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/80">
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Auditoria Criptográfica</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-200 rounded-full transition-colors focus:outline-none">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8">
          <p className="text-base text-gray-600 mb-8 font-medium">
            O ProofChain garante a imutabilidade comparando matematicamente o estado atual do banco de dados relacional com a prova original ancorada na rede Ethereum. Se um único centavo for adulterado, os Hashes abaixo não baterão.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
            {/* Visual separator line for desktop */}
            <div className="hidden md:block absolute inset-y-0 left-1/2 w-px bg-gray-200 -ml-px" />

            <div className="space-y-4">
              <div className="inline-flex items-center px-4 py-1.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-full text-xs font-black uppercase tracking-widest shadow-sm">
                Dados no Banco (PostgreSQL)
              </div>
              <p className="text-sm text-gray-500 font-medium">Hash recalculado no exato instante desta consulta ({new Date(data.verificado_em).toLocaleString('pt-BR')}):</p>
              <div className="p-5 bg-gray-50 rounded-2xl border border-gray-200 break-all font-mono text-sm text-gray-900 shadow-inner">
                {data.hash_integridade}
              </div>
            </div>

            <div className="space-y-4">
              <div className="inline-flex items-center px-4 py-1.5 bg-purple-50 border border-purple-200 text-purple-800 rounded-full text-xs font-black uppercase tracking-widest shadow-sm">
                Prova na Blockchain (Sepolia)
              </div>
              <p className="text-sm text-gray-500 font-medium">Hash imutável registrado de forma permanente através de contrato inteligente:</p>
              <div className="p-5 bg-purple-50 rounded-2xl border border-purple-200 break-all font-mono text-sm text-purple-900 shadow-inner">
                {data.blockchain_hash}
              </div>
            </div>
          </div>

          <div className="mt-10 pt-8 border-t border-gray-100 flex justify-center">
            <a 
              href={data.etherscan_url} 
              target="_blank" 
              rel="noreferrer"
              className="inline-flex items-center gap-3 px-8 py-4 bg-gray-900 hover:bg-black text-white text-lg font-bold rounded-xl transition-all shadow-xl hover:shadow-2xl active:scale-[0.98]"
            >
              Auditar transação na Etherscan 
              <ExternalLink className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
