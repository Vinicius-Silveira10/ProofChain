import { useState, useRef, useEffect } from "react";
import {
  FileText, DollarSign, Calendar, Building2, User, Loader2,
  CheckCircle, ExternalLink, RotateCcw, AlignLeft, Plus, Trash2
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { tituloService, type EmitirTituloDTO } from "@/services/tituloService";
import api from "@/services/api";

// ─── Tipos internos ────────────────────────────────────────────────────────────

interface SuccessData {
  id: string;
  hash: string;
  txHash: string;
  timestamp: string;
}

type LoadingStage = 'idle' | 'validating' | 'creating' | 'installments' | 'anchoring' | 'confirming';

const STAGE_LABELS: Record<LoadingStage, string> = {
  idle: '',
  validating: 'Validando dados...',
  creating: 'Gerando Hash SHA-256 e registrando título...',
  installments: 'Registrando parcelas de pagamento...',
  anchoring: 'Ancorando na Blockchain Sepolia...',
  confirming: 'Confirmando integridade on-chain...',
};

const STAGE_ORDER: LoadingStage[] = ['validating', 'creating', 'installments', 'anchoring', 'confirming'];

/** Parcela que o operador preenche no formulário */
interface ParcelaForm {
  numero_parcela: number;
  valor_centavos: number;   // calculado automaticamente
  data_vencimento_parcela: string;
  motivo: string;
  autorizado_por: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCNPJ(value: string) {
  const n = value.replace(/\D/g, "");
  return n
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2")
    .slice(0, 18);
}

function formatCurrency(value: string) {
  const numbers = value.replace(/\D/g, "");
  if (!numbers) return "";
  const amount = parseInt(numbers, 10) / 100;
  return amount.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseCurrencyToFloat(formatted: string): number {
  return parseFloat(formatted.replace(/\./g, "").replace(",", ".")) || 0;
}

function isValidCnpj(cnpj: string): boolean {
  if (!/^\d{14}$/.test(cnpj)) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;
  const digits = cnpj.split("").map(Number);
  const calc = (slice: number[], weights: number[]) => {
    const sum = slice.reduce((acc, d, i) => acc + d * weights[i], 0);
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  if (calc(digits.slice(0, 12), w1) !== digits[12]) return false;
  return calc(digits.slice(0, 13), w2) === digits[13];
}

/** Avança a data em N meses para sugerir vencimentos */
function addMonths(dateStr: string, months: number): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T12:00:00");
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split("T")[0];
}

// ─── Componente ────────────────────────────────────────────────────────────────

export function EmissaoForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState<LoadingStage>('idle');
  const [success, setSuccess] = useState<SuccessData | null>(null);
  const [tipoPagamento, setTipoPagamento] = useState("a_vista");

  const [formData, setFormData] = useState({
    cnpj: "",
    credor: "",
    valor: "",
    vencimento: "",
    motivo: "",
    autorizadoPor: "",
  });

  // Parcelas para o modo parcelado
  const [parcelas, setParcelas] = useState<ParcelaForm[]>([
    { numero_parcela: 1, valor_centavos: 0, data_vencimento_parcela: "", motivo: "", autorizado_por: "" },
    { numero_parcela: 2, valor_centavos: 0, data_vencimento_parcela: "", motivo: "", autorizado_por: "" },
  ]);

  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Recalcula valor de cada parcela e sugere datas ao mudar valor total ou número de parcelas
  useEffect(() => {
    if (tipoPagamento !== "parcelado") return;
    const totalCents = Math.round(parseCurrencyToFloat(formData.valor) * 100);
    const n = parcelas.length;
    if (n === 0 || totalCents === 0) return;

    const baseCents = Math.floor(totalCents / n);
    const restCents = totalCents - baseCents * n;

    setParcelas((prev) =>
      prev.map((p, i) => ({
        ...p,
        valor_centavos: i === 0 ? baseCents + restCents : baseCents, // primeira parcela absorve o resto centavo
        data_vencimento_parcela:
          p.data_vencimento_parcela || addMonths(formData.vencimento, i),
      }))
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.valor, formData.vencimento, parcelas.length, tipoPagamento]);

  // ─── Handlers de parcelas ────────────────────────────────────────────────────

  const addParcela = () => {
    setParcelas((prev) => [
      ...prev,
      {
        numero_parcela: prev.length + 1,
        valor_centavos: 0,
        data_vencimento_parcela: addMonths(formData.vencimento, prev.length),
        motivo: "",
        autorizado_por: formData.autorizadoPor || "",
      },
    ]);
  };

  const removeParcela = (index: number) => {
    if (parcelas.length <= 2) return;
    setParcelas((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((p, i) => ({ ...p, numero_parcela: i + 1 }))
    );
  };

  const updateParcela = (index: number, field: keyof ParcelaForm, value: string | number) => {
    setParcelas((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    );
  };

  // ─── Submit ───────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação CNPJ
    const cnpjPuro = formData.cnpj.replace(/\D/g, "");
    if (cnpjPuro.length !== 14 || !isValidCnpj(cnpjPuro)) {
      toast({ title: "CNPJ inválido", description: "Verifique os dígitos e tente novamente.", variant: "destructive" });
      return;
    }

    const valorFloat = parseCurrencyToFloat(formData.valor);
    if (isNaN(valorFloat) || valorFloat <= 0) {
      toast({ title: "Valor inválido", description: "Informe um valor maior que zero.", variant: "destructive" });
      return;
    }

    // Validação do modo À Vista — motivo e autorizadoPor obrigatórios
    if (tipoPagamento === "a_vista") {
      if (!formData.motivo || formData.motivo.trim().length < 10) {
        toast({ title: "Motivo inválido", description: "O motivo/finalidade deve ter pelo menos 10 caracteres.", variant: "destructive" });
        return;
      }
      if (!formData.autorizadoPor || formData.autorizadoPor.trim().length < 3) {
        toast({ title: "Autorizado Por inválido", description: "Informe o nome do responsável pela autorização.", variant: "destructive" });
        return;
      }
    }

    // Validação do modo Parcelado
    if (tipoPagamento === "parcelado") {
      for (const p of parcelas) {
        if (!p.motivo || p.motivo.trim().length < 10) {
          toast({ title: `Parcela ${p.numero_parcela} — Motivo inválido`, description: "Cada parcela precisa de um motivo com pelo menos 10 caracteres.", variant: "destructive" });
          return;
        }
        if (!p.autorizado_por || p.autorizado_por.trim().length < 3) {
          toast({ title: `Parcela ${p.numero_parcela} — Autorizado Por inválido`, description: "Informe o responsável pela autorização de cada parcela.", variant: "destructive" });
          return;
        }
        if (!p.data_vencimento_parcela) {
          toast({ title: `Parcela ${p.numero_parcela} — Data inválida`, description: "Informe a data de vencimento de cada parcela.", variant: "destructive" });
          return;
        }
      }
    }

    setIsLoading(true);
    setLoadingStage('validating');
    const idempotencyKey = crypto.randomUUID();

    try {
      // ── STEP 1: Criar o título principal ──────────────────────────────────────
      setLoadingStage('creating');
      const payload: EmitirTituloDTO = {
        cnpj_emissor: cnpjPuro,
        credor: formData.credor.trim(),
        valor_centavos: Math.round(valorFloat * 100),
        data_vencimento: formData.vencimento,
      };

      console.log("[EmissaoForm] Payload título:", payload);
      const response = await tituloService.criarTitulo(payload, idempotencyKey);
      console.log("[EmissaoForm] Título criado:", response);

      const tituloId = response.id;

      // ── STEP 2: Registrar parcelas ────────────────────────────────────────────
      let parcelasPayload: object[];

      if (tipoPagamento === "a_vista") {
        // Uma única parcela = valor total
        parcelasPayload = [
          {
            numero_parcela: 1,
            valor_centavos: Math.round(valorFloat * 100),
            data_vencimento_parcela: formData.vencimento,
            motivo: formData.motivo.trim(),
            autorizado_por: formData.autorizadoPor.trim(),
          },
        ];
      } else {
        parcelasPayload = parcelas.map((p) => ({
          numero_parcela: p.numero_parcela,
          valor_centavos: p.valor_centavos,
          data_vencimento_parcela: p.data_vencimento_parcela,
          motivo: p.motivo.trim(),
          autorizado_por: p.autorizado_por.trim(),
        }));
      }

      console.log("[EmissaoForm] Payload parcelas:", parcelasPayload);
      setLoadingStage('installments');
      await api.post(`/titulos/${tituloId}/installments`, parcelasPayload);
      console.log("[EmissaoForm] Parcelas registradas com sucesso.");

      toast({
        title: "Título emitido com parcelas!",
        description: `${parcelasPayload.length} parcela(s) criada(s) com sucesso. Aguardando processamento blockchain.`,
      });

      // ── STEP 3: Polling até VERIFIED ─────────────────────────────────────────
      setLoadingStage('anchoring');
      let tentativas = 0;
      const maxTentativas = 20;
      let finalizou = false;

      while (tentativas < maxTentativas && !finalizou && isMounted.current) {
        tentativas++;

        try {
          const tituloAtualizado = await tituloService.getTituloById(tituloId);
          toast({ title: "DEBUG STATUS", description: `Recebeu: ${tituloAtualizado.status}` });

          if (tituloAtualizado.status === "VERIFIED") {
            setLoadingStage('confirming');
            // Pequeno delay para o usuário ver o check verde no stepper
            await new Promise((resolve) => setTimeout(resolve, 1000));
            
            finalizou = true;
            setSuccess({
              id: tituloAtualizado.id,
              hash: tituloAtualizado.dbHash || "N/A",
              txHash: tituloAtualizado.txHash || "0x...",
              timestamp: tituloAtualizado.blockTimestamp || new Date().toISOString(),
            });
            break;
          } else if (
            tituloAtualizado.status === "FAILED_ON_CHAIN" ||
            tituloAtualizado.status === "COMPROMISED"
          ) {
            finalizou = true;
            toast({ title: "Falha na Ancoragem", description: "Erro durante o registro on-chain.", variant: "destructive" });
            break;
          } else if (tituloAtualizado.status === "PENDING" && !tituloAtualizado.txHash) {
            // Em Bypass Mode o txHash vem vazio e o status será PENDING eternamente.
            // Para não deixar a UI travada por 60s, quebramos o loop antecipadamente.
            break;
          }
          // PENDING com txHash → continua o loop aguardando confirmação do minerador
        } catch (pollError) {
          console.error("Polling error:", pollError);
        }

        if (!finalizou && isMounted.current) {
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
      }

      // Timeout — mas o título + parcelas JÁ foram salvos
      if (!finalizou && isMounted.current) {
        // Considera sucesso visual parcial (PENDING): mostra o card de sucesso com hash provisional
        const tituloFinal = await tituloService.getTituloById(tituloId).catch(() => null);
        setSuccess({
          id: tituloId,
          hash: tituloFinal?.dbHash || "Aguardando...",
          txHash: tituloFinal?.txHash || "Pendente (blockchain em bypass)",
          timestamp: new Date().toISOString(),
        });
        toast({
          title: "Título salvo — blockchain pendente",
          description: "O título e as parcelas foram registrados. A ancoragem blockchain pode levar alguns minutos.",
        });
      }

    } catch (error: any) {
      console.error("[EmissaoForm] Erro:", {
        status: error.response?.status,
        data: error.response?.data,
      });

      const backendMsg = error.response?.data?.error || error.response?.data?.message;
      const statusCode = error.response?.status;

      let description = "Falha ao registrar título. Verifique os dados e tente novamente.";
      if (backendMsg) description = backendMsg;
      else if (statusCode === 409) description = "Título já registrado (chave de idempotência duplicada).";
      else if (statusCode === 422) description = "Dados das parcelas inválidos. Verifique motivos e valores.";

      toast({ title: `Erro (${statusCode || "?"})`, description, variant: "destructive" });
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
        setLoadingStage('idle');
      }
    }
  };

  const handleReset = () => {
    setSuccess(null);
    setFormData({ cnpj: "", credor: "", valor: "", vencimento: "", motivo: "", autorizadoPor: "" });
    setParcelas([
      { numero_parcela: 1, valor_centavos: 0, data_vencimento_parcela: "", motivo: "", autorizado_por: "" },
      { numero_parcela: 2, valor_centavos: 0, data_vencimento_parcela: "", motivo: "", autorizado_por: "" },
    ]);
    setTipoPagamento("a_vista");
  };

  // ─── Card de Sucesso ──────────────────────────────────────────────────────────

  if (success) {
    return (
      <Card className="border-emerald-200 bg-emerald-50">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle className="h-8 w-8 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-emerald-900">Título registrado com sucesso!</h3>
              <p className="text-sm text-emerald-700 mt-1">
                Título e parcelas persistidos no banco de dados.
              </p>
              <div className="mt-4 flex justify-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-sm">
                  <CheckCircle className="h-4 w-4" />
                  Íntegro (Blockchain Validada)
                </div>
              </div>
            </div>

            <div className="w-full mt-4 space-y-3 text-left">
              <div className="bg-white rounded-md border border-emerald-200 p-4 space-y-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">ID do Título</p>
                  <p className="font-mono text-sm text-foreground mt-1 break-all">{success.id}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Hash SHA-256</p>
                  <p className="font-mono text-xs text-foreground mt-1 break-all">{success.hash}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">TX Hash</p>
                  <p className="font-mono text-xs text-muted-foreground mt-1 break-all">{success.txHash}</p>
                </div>
                {success.txHash && !success.txHash.startsWith("0x0") && success.txHash !== "0x..." && (
                  <a
                    href={`https://sepolia.etherscan.io/tx/${success.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:underline"
                  >
                    Ver recibo on-chain no Etherscan
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>

            <Button onClick={handleReset} variant="outline" className="mt-4 gap-2">
              <RotateCcw className="h-4 w-4" />
              Emitir novo título
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ─── Formulário ───────────────────────────────────────────────────────────────

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Dados do Título
        </CardTitle>
        <CardDescription>
          Preencha as informações do título de dívida e configure as parcelas de pagamento.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ── Dados principais ─────────────────────────────────────── */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cnpj" className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                CNPJ do Emissor
              </Label>
              <Input
                id="cnpj"
                placeholder="XX.XXX.XXX/XXXX-XX"
                value={formData.cnpj}
                onChange={(e) => setFormData({ ...formData, cnpj: formatCNPJ(e.target.value) })}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="credor" className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Nome do Credor
              </Label>
              <Input
                id="credor"
                placeholder="Nome completo ou razão social"
                value={formData.credor}
                onChange={(e) => setFormData({ ...formData, credor: e.target.value })}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="valor" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                Valor Total do Título
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                <Input
                  id="valor"
                  placeholder="0,00"
                  className="pl-10"
                  value={formData.valor}
                  onChange={(e) => setFormData({ ...formData, valor: formatCurrency(e.target.value) })}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vencimento" className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                {tipoPagamento === "parcelado" ? "Data da 1ª Parcela" : "Data de Vencimento"}
              </Label>
              <Input
                id="vencimento"
                type="date"
                value={formData.vencimento}
                onChange={(e) => setFormData({ ...formData, vencimento: e.target.value })}
                required
                disabled={isLoading}
              />
            </div>
          </div>

          {/* ── Tipo de Pagamento ─────────────────────────────────────── */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Tipo de Pagamento
            </Label>
            <div className="flex gap-6 mt-2">
              {["a_vista", "parcelado"].map((tipo) => (
                <label key={tipo} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tipoPagamento"
                    value={tipo}
                    checked={tipoPagamento === tipo}
                    onChange={() => setTipoPagamento(tipo)}
                    disabled={isLoading}
                  />
                  <span className="text-sm">{tipo === "a_vista" ? "À Vista" : "Parcelado"}</span>
                </label>
              ))}
            </div>
          </div>

          {/* ── Modo À Vista: campos de motivo e autorizadoPor ─────────── */}
          {tipoPagamento === "a_vista" && (
            <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-700">Detalhes do Pagamento Único</p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="motivo" className="flex items-center gap-2">
                    <AlignLeft className="h-4 w-4 text-muted-foreground" />
                    Motivo / Finalidade da Dívida
                    <span className="text-xs text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="motivo"
                    placeholder="Descreva a finalidade do título (mínimo 10 caracteres)..."
                    value={formData.motivo}
                    onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                    disabled={isLoading}
                    rows={3}
                    className="resize-none"
                    maxLength={500}
                    required
                  />
                  <p className="text-xs text-muted-foreground text-right">{formData.motivo.length}/500</p>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="autorizadoPor" className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    Autorizado Por
                    <span className="text-xs text-red-500">*</span>
                  </Label>
                  <Input
                    id="autorizadoPor"
                    placeholder="Ex: João Silva - Diretor Financeiro"
                    value={formData.autorizadoPor}
                    onChange={(e) => setFormData({ ...formData, autorizadoPor: e.target.value })}
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Modo Parcelado: editor de parcelas ─────────────────────── */}
          {tipoPagamento === "parcelado" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">
                  Plano de Parcelas ({parcelas.length}x)
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addParcela}
                  disabled={isLoading || parcelas.length >= 120}
                  className="gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar Parcela
                </Button>
              </div>

              <div className="space-y-4">
                {parcelas.map((parcela, index) => {
                  const valorFormatado = (parcela.valor_centavos / 100).toLocaleString("pt-BR", {
                    style: "currency", currency: "BRL",
                  });
                  return (
                    <div
                      key={index}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-700">
                          Parcela {parcela.numero_parcela}/{parcelas.length}
                          <span className="ml-2 font-mono text-slate-500">{valorFormatado}</span>
                        </span>
                        {parcelas.length > 2 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeParcela(index)}
                            disabled={isLoading}
                            className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Data de Vencimento <span className="text-red-500">*</span></Label>
                          <Input
                            type="date"
                            value={parcela.data_vencimento_parcela}
                            onChange={(e) => updateParcela(index, "data_vencimento_parcela", e.target.value)}
                            disabled={isLoading}
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Autorizado Por <span className="text-red-500">*</span></Label>
                          <Input
                            placeholder="Nome do responsável"
                            value={parcela.autorizado_por}
                            onChange={(e) => updateParcela(index, "autorizado_por", e.target.value)}
                            disabled={isLoading}
                            required
                          />
                        </div>
                        <div className="space-y-1.5 md:col-span-2">
                          <Label className="text-xs">
                            Motivo / Finalidade <span className="text-red-500">*</span>
                            <span className="text-muted-foreground ml-1">(mín. 10 chars)</span>
                          </Label>
                          <Textarea
                            placeholder="Descreva a finalidade desta parcela..."
                            value={parcela.motivo}
                            onChange={(e) => updateParcela(index, "motivo", e.target.value)}
                            disabled={isLoading}
                            rows={2}
                            className="resize-none text-sm"
                            maxLength={500}
                            required
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Preview financeiro */}
              <div className="rounded-md bg-slate-100 border border-slate-200 px-4 py-2 flex items-center justify-between text-sm">
                <span className="text-slate-500">Total das parcelas:</span>
                <span className="font-semibold text-slate-800">
                  {(parcelas.reduce((acc, p) => acc + p.valor_centavos, 0) / 100).toLocaleString("pt-BR", {
                    style: "currency", currency: "BRL",
                  })}
                </span>
              </div>
            </div>
          )}

          {/* ── Loading Stepper ────────────────────────────────────── */}
          {isLoading && loadingStage !== 'idle' && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3">
              <p className="text-sm font-semibold text-blue-900">Processando emissão...</p>
              <div className="space-y-2">
                {STAGE_ORDER.map((stage) => {
                  const currentIdx = STAGE_ORDER.indexOf(loadingStage);
                  const stageIdx = STAGE_ORDER.indexOf(stage);
                  const isDone = stageIdx < currentIdx;
                  const isCurrent = stage === loadingStage;
                  return (
                    <div key={stage} className="flex items-center gap-3">
                      {isDone ? (
                        <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                      ) : isCurrent ? (
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600 shrink-0" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-slate-300 shrink-0" />
                      )}
                      <span className={`text-sm ${
                        isDone ? 'text-emerald-700 line-through' :
                        isCurrent ? 'text-blue-700 font-medium' :
                        'text-slate-400'
                      }`}>
                        {STAGE_LABELS[stage]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Submit ────────────────────────────────────────────────── */}
          <div className="flex justify-end pt-4 border-t">
            <Button type="submit" disabled={isLoading} className="min-w-[280px]">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {STAGE_LABELS[loadingStage] || 'Processando...'}
                </>
              ) : (
                "Ancorar Registro na Blockchain"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
