import { useState, useRef, useEffect } from "react";
import { FileText, DollarSign, Calendar, Building2, User, Loader2, CheckCircle, ExternalLink, RotateCcw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { tituloService } from "@/services/tituloService";

interface SuccessData {
  id: string;
  hash: string;
  txHash: string;
  operador: string;
  gasCost: string;
  timestamp: string;
}

export function EmissaoForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState<SuccessData | null>(null);
  const [tipoPagamento, setTipoPagamento] = useState("a_vista");
  const [qtdParcelas, setQtdParcelas] = useState("2");
  const [formData, setFormData] = useState({
    cnpj: "",
    credor: "",
    valor: "",
    vencimento: "",
  });

  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    return numbers
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2")
      .slice(0, 18);
  };

  const formatCurrency = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (!numbers) return "";
    const amount = parseInt(numbers, 10) / 100;
    return amount.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const calcularParcela = () => {
    if (!formData.valor || tipoPagamento !== "parcelado" || !qtdParcelas) return null;
    const totalRaw = formData.valor.replace(/\D/g, "");
    if (!totalRaw) return null;
    
    const totalFloat = parseInt(totalRaw, 10) / 100;
    const parcelasInt = parseInt(qtdParcelas, 10);
    
    if (parcelasInt <= 0) return null;
    
    const valorParcela = totalFloat / parcelasInt;
    return valorParcela.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Converte de "1.234,56" para 1234.56
    const valorFloat = parseFloat(formData.valor.replace(/\./g, "").replace(",", "."));

    // Task 4.1: Gerar UUID idempotente no cliente
    const idempotencyKey = crypto.randomUUID();

    try {
      const payload: any = {
        cnpjEmissor: formData.cnpj.replace(/\D/g, ""), // Limpa máscara
        credor: formData.credor,
        valorTotal: valorFloat,
        tipoPagamento: tipoPagamento,
        vencimento: formData.vencimento, 
        qtdParcelas: tipoPagamento === "parcelado" ? parseInt(qtdParcelas, 10) : 1
      };

      const response = await tituloService.criarTitulo(payload, idempotencyKey);
      
      toast({
        title: "Submissão Aceita",
        description: "O título foi enviado e está aguardando processamento na blockchain (Polling iniciado).",
        variant: "default",
      });

      // Task 4.2: Loop de Polling (Consultando a API a cada 3s com limite de 20 tentativas = 60s)
      let tentativas = 0;
      const maxTentativas = 20;
      let finalizou = false;

      while (tentativas < maxTentativas && !finalizou && isMounted.current) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        if (!isMounted.current) break; // Se desmontou durante o sleep, sai imediatamente
        
        tentativas++;

        try {
          const tituloAtualizado = await tituloService.getTituloById(response.id);
          
          if (tituloAtualizado.status === "VERIFIED") {
            finalizou = true;
            // Task 4.3: Feedback Visual On-Chain
            setSuccess({
              id: tituloAtualizado.id,
              hash: tituloAtualizado.dbHash || "N/A",
              txHash: tituloAtualizado.txHash || "0x...", 
              operador: "Operador Atual", // Em um app real, viria do AuthContext
              gasCost: "-", 
              timestamp: tituloAtualizado.blockTimestamp || new Date().toISOString()
            });
            break;
          } else if (tituloAtualizado.status === "FAILED_ON_CHAIN" || tituloAtualizado.status === "COMPROMISED") {
            finalizou = true;
            toast({
              title: "Falha na Ancoragem",
              description: "Ocorreu um erro durante o registro on-chain.",
              variant: "destructive",
            });
            break;
          }
          // Se for "PENDING", o loop continua...
        } catch (pollError) {
          console.error("Erro no polling:", pollError);
        }
      }

      if (!finalizou && isMounted.current) {
        toast({
          title: "Timeout",
          description: "A ancoragem está demorando muito. Você pode consultar o status depois no Portfólio.",
          variant: "destructive",
        });
      }

    } catch (error: any) {
      const message = error.response?.data?.message || "Falha ao registrar título ou servidor indisponível.";
      toast({
        title: "Erro na Submissão",
        description: message,
        variant: "destructive",
      });
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  };

  const handleReset = () => {
    setSuccess(null);
    setFormData({ cnpj: "", credor: "", valor: "", vencimento: "" });
  };

  if (success) {
    return (
      <Card className="border-emerald-200 bg-emerald-50">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle className="h-8 w-8 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-emerald-900">
                Título registrado e ancorado com sucesso!
              </h3>
              <p className="text-sm text-emerald-700 mt-1">
                O registro foi persistido no banco de dados e ancorado na blockchain Ethereum Sepolia.
              </p>
            </div>

            <div className="w-full mt-4 space-y-3 text-left">
              <div className="bg-white rounded-md border border-emerald-200 p-4 space-y-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    ID do Título
                  </p>
                  <p className="font-mono text-sm text-foreground mt-1 break-all">
                    {success.id}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Hash SHA-256
                  </p>
                  <p className="font-mono text-xs text-foreground mt-1 break-all">
                    {success.hash}
                  </p>
                </div>
                <div>
                  <a
                    href={`https://sepolia.etherscan.io/tx/${success.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:text-emerald-800 hover:underline"
                  >
                    Ver recibo on-chain no Etherscan
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            </div>

            <Button
              onClick={handleReset}
              variant="outline"
              className="mt-4 gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Emitir novo título
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Dados do Título
        </CardTitle>
        <CardDescription>
          Preencha as informações do título de dívida a ser registrado.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
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
                onChange={(e) =>
                  setFormData({ ...formData, cnpj: formatCNPJ(e.target.value) })
                }
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
                onChange={(e) =>
                  setFormData({ ...formData, credor: e.target.value })
                }
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="valor" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                Valor do Título
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  R$
                </span>
                <Input
                  id="valor"
                  placeholder="0,00"
                  className="pl-10"
                  value={formData.valor}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      valor: formatCurrency(e.target.value),
                    })
                  }
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Tipo de Pagamento
              </Label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tipoPagamento"
                    value="a_vista"
                    checked={tipoPagamento === "a_vista"}
                    onChange={() => setTipoPagamento("a_vista")}
                    disabled={isLoading}
                    className="cursor-pointer"
                  />
                  <span className="text-sm">À Vista</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tipoPagamento"
                    value="parcelado"
                    checked={tipoPagamento === "parcelado"}
                    onChange={() => setTipoPagamento("parcelado")}
                    disabled={isLoading}
                    className="cursor-pointer"
                  />
                  <span className="text-sm">Parcelado</span>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vencimento" className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Data de Vencimento {tipoPagamento === 'parcelado' ? '(1ª Parcela)' : ''}
              </Label>
              <Input
                id="vencimento"
                type="date"
                value={formData.vencimento}
                onChange={(e) =>
                  setFormData({ ...formData, vencimento: e.target.value })
                }
                required
                disabled={isLoading}
              />
            </div>

            {tipoPagamento === "parcelado" && (
              <div className="space-y-2 md:col-span-2">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="qtdParcelas">Quantidade de Parcelas</Label>
                    <Input
                      id="qtdParcelas"
                      type="number"
                      min="2"
                      max="120"
                      value={qtdParcelas}
                      onChange={(e) => setQtdParcelas(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2 flex flex-col justify-end">
                    <div className="rounded-md bg-slate-50 border border-slate-200 p-3 h-10 flex items-center justify-between">
                      <span className="text-sm text-slate-500">Prévia da Parcela:</span>
                      <span className="font-semibold text-slate-900">
                        {calcularParcela() || "R$ 0,00"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button
              type="submit"
              disabled={isLoading}
              className="min-w-[280px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Ancorando na blockchain... (isso pode levar até 60s)
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
