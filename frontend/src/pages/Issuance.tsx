import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { CurrencyInput } from '../components/CurrencyInput';
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import axios from 'axios';

interface IssuanceForm {
  cnpj_emissor: string;
  credor: string;
  valor_centavos: number;
  data_vencimento: string;
}

// Algoritmo matemático para Fail-Fast no Frontend
const isValidCnpjFront = (value: string): boolean => {
  const cnpj = value.replace(/\D/g, '');
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
  let size = cnpj.length - 2;
  let numbers = cnpj.substring(0, size);
  const digits = cnpj.substring(size);
  let sum = 0;
  let pos = size - 7;
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;
  size = size + 1;
  numbers = cnpj.substring(0, size);
  sum = 0;
  pos = size - 7;
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return result === parseInt(digits.charAt(1));
};

export function Issuance() {
  const { register, handleSubmit, control, formState: { errors }, setValue } = useForm<IssuanceForm>({
    defaultValues: { valor_centavos: 0 }
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<any | null>(null);

  const applyCnpjMask = (val: string) => {
    return val
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .slice(0, 18);
  };

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue('cnpj_emissor', applyCnpjMask(e.target.value), { shouldValidate: true });
  };

  const onSubmit = async (data: IssuanceForm) => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessData(null);
    
    // O Valor_Centavos já vem purificado inteiro pelo componente filho CurrencyInput
    const payload = {
      ...data,
      cnpj_emissor: data.cnpj_emissor.replace(/\D/g, '')
    };

    try {
      const token = localStorage.getItem('token') || ''; 
      const response = await axios.post('/api/titulos', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccessData(response.data);
    } catch (err: any) {
      if (err.response?.status === 504) {
        setErrorMsg('A rede Sepolia está congestionada (Timeout). O título NÃO foi gravado. Aguarde e tente novamente.');
      } else {
        setErrorMsg(err.response?.data?.error || 'Erro ao emitir o título.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (successData) {
    return (
      <div className="max-w-2xl mx-auto p-8 bg-white/70 backdrop-blur-md rounded-2xl shadow-xl border border-green-100">
        <div className="flex flex-col items-center gap-4 mb-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <div>
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Emissão Concluída!</h2>
            <p className="text-gray-500 mt-2 text-lg">O título foi ancorado com sucesso na blockchain.</p>
          </div>
        </div>
        
        <div className="space-y-5 bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-xl border border-gray-200">
          <div>
            <span className="block text-xs font-bold tracking-wider text-gray-500 uppercase">ID do Título</span>
            <span className="font-mono text-gray-900 text-lg">{successData.id}</span>
          </div>
          <div>
            <span className="block text-xs font-bold tracking-wider text-gray-500 uppercase">Hash de Integridade (Off-Chain)</span>
            <span className="font-mono text-gray-700 break-all bg-white px-2 py-1 rounded border border-gray-200 mt-1 inline-block">
              {successData.hash_integridade}
            </span>
          </div>
          <div>
            <span className="block text-xs font-bold tracking-wider text-gray-500 uppercase mt-2">Comprovante Blockchain</span>
            <a 
              href={successData.etherscan_url} 
              target="_blank" 
              rel="noreferrer" 
              className="text-blue-600 hover:text-blue-800 hover:underline font-mono break-all inline-flex items-center gap-1 mt-1"
            >
              {successData.tx_hash}
            </a>
          </div>
        </div>
        
        <button 
          onClick={() => setSuccessData(null)}
          className="mt-8 w-full py-4 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl active:scale-[0.98]"
        >
          Emitir Novo Título
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-10 text-center">
        <div className="inline-flex items-center justify-center p-3 bg-blue-50 rounded-2xl mb-4">
          <ShieldCheck className="w-10 h-10 text-blue-600" />
        </div>
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Emissão de Dívida</h1>
        <p className="text-gray-500 mt-3 text-lg">
          Os dados serão convertidos em hash e ancorados na rede Ethereum (Sepolia).
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-white/60 backdrop-blur-xl p-8 rounded-2xl shadow-2xl border border-white/50">
        {errorMsg && (
          <div className="p-4 bg-red-50/80 backdrop-blur-sm text-red-800 rounded-xl flex items-start gap-3 border border-red-100 shadow-sm animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-6 h-6 flex-shrink-0 text-red-500" />
            <p className="font-medium">{errorMsg}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700">CNPJ do Emissor</label>
            <input
              type="text"
              {...register('cnpj_emissor', { 
                required: 'CNPJ é obrigatório',
                validate: value => isValidCnpjFront(value) || 'CNPJ inválido matematicamente'
              })}
              onChange={handleCnpjChange}
              placeholder="00.000.000/0000-00"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all bg-white"
              disabled={loading}
            />
            {errors.cnpj_emissor && <p className="text-red-500 text-sm font-medium">{errors.cnpj_emissor.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700">Credor</label>
            <input
              type="text"
              {...register('credor', { 
                required: 'Credor é obrigatório',
                minLength: { value: 3, message: 'Mínimo 3 caracteres' }
              })}
              placeholder="Nome da instituição"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all bg-white"
              disabled={loading}
            />
            {errors.credor && <p className="text-red-500 text-sm font-medium">{errors.credor.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700">Valor Total</label>
            <Controller
              name="valor_centavos"
              control={control}
              rules={{ validate: val => val > 0 || 'Valor deve ser maior que zero' }}
              render={({ field }) => (
                <CurrencyInput
                  {...field}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all bg-white"
                  disabled={loading}
                />
              )}
            />
            {errors.valor_centavos && <p className="text-red-500 text-sm font-medium">{errors.valor_centavos.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700">Data de Vencimento</label>
            <input
              type="date"
              {...register('data_vencimento', { 
                required: 'Data é obrigatória',
                validate: value => new Date(value) > new Date() || 'A data deve ser no futuro'
              })}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all bg-white"
              disabled={loading}
            />
            {errors.data_vencimento && <p className="text-red-500 text-sm font-medium">{errors.data_vencimento.message}</p>}
          </div>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-blue-400 disabled:to-indigo-400 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3 active:scale-[0.99]"
          >
            {loading ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>Ancorando na blockchain... (pode levar até 60 segundos)</span>
              </>
            ) : (
              'Emitir e Ancorar Título'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
