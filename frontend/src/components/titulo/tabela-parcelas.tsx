import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ModalPagamento } from './modal-pagamento';
import { tituloService, type InstallmentItem } from '@/services/tituloService';
import { useToast } from '@/components/ui/use-toast';
import { AlertCircle, RefreshCcw } from 'lucide-react';

// Status do backend → label exibido
type StatusParcela = 'PENDENTE' | 'PAGO' | 'VENCIDO';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('pt-BR');
}

function StatusBadge({ status }: { status: StatusParcela }) {
  switch (status) {
    case 'PAGO':
      return (
        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50">
          Pago
        </Badge>
      );
    case 'VENCIDO':
      return (
        <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50">
          Vencido
        </Badge>
      );
    case 'PENDENTE':
    default:
      return (
        <Badge variant="secondary" className="bg-slate-100 text-slate-600">
          Pendente
        </Badge>
      );
  }
}

interface TabelaParcelasProps {
  /** ID do título para buscar as parcelas reais na API */
  tituloId: string;
}

export function TabelaParcelas({ tituloId }: TabelaParcelasProps) {
  const { toast } = useToast();
  const [parcelas, setParcelas] = useState<InstallmentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal de confirmação de pagamento
  const [modalOpen, setModalOpen] = useState(false);
  const [parcelaSelecionada, setParcelaSelecionada] = useState<InstallmentItem | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  // ─── Fetch de parcelas reais ───────────────────────────────────────────────
  const fetchParcelas = useCallback(async () => {
    if (!tituloId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await tituloService.getInstallments(tituloId);
      setParcelas(data);
    } catch {
      setError('Não foi possível carregar o plano de pagamentos. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }, [tituloId]);

  useEffect(() => {
    fetchParcelas();
  }, [fetchParcelas]);

  // ─── Abrir modal ───────────────────────────────────────────────────────────
  const handleRegistrarPagamento = (parcela: InstallmentItem) => {
    setParcelaSelecionada(parcela);
    setModalOpen(true);
  };

  // ─── Confirmar pagamento via API ───────────────────────────────────────────
  const handleConfirmarPagamento = async () => {
    if (!parcelaSelecionada) return;
    setIsConfirming(true);
    try {
      const updated = await tituloService.confirmarPagamento(parcelaSelecionada.id);
      // Atualiza a parcela localmente sem precisar refazer o fetch completo
      setParcelas((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p))
      );
      setModalOpen(false);
      setParcelaSelecionada(null);
      toast({
        title: '✅ Pagamento confirmado',
        description: `Parcela ${updated.numero} registrada com sucesso. Timestamp de auditoria gerado.`,
      });
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        'Falha ao confirmar o pagamento. Tente novamente.';
      toast({
        title: 'Erro ao confirmar pagamento',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setIsConfirming(false);
    }
  };

  // ─── Estado de loading ─────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-foreground">
            Plano de Pagamentos e Finalidade
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 px-6 pb-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </CardContent>
      </Card>
    );
  }

  // ─── Estado de erro ────────────────────────────────────────────────────────
  if (error) {
    return (
      <Card className="bg-card border-border shadow-sm">
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <AlertCircle className="h-10 w-10 text-red-400" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchParcelas} className="gap-2">
            <RefreshCcw className="h-4 w-4" />
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ─── Estado vazio ──────────────────────────────────────────────────────────
  if (parcelas.length === 0) {
    return (
      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-foreground">
            Plano de Pagamentos e Finalidade
          </CardTitle>
        </CardHeader>
        <CardContent className="py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhuma parcela cadastrada para este título.
          </p>
        </CardContent>
      </Card>
    );
  }

  // ─── Tabela com dados reais ────────────────────────────────────────────────
  return (
    <>
      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-foreground">
            Plano de Pagamentos e Finalidade
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="font-semibold">Nº Parcela</TableHead>
                <TableHead className="font-semibold">Valor</TableHead>
                <TableHead className="font-semibold">Vencimento</TableHead>
                <TableHead className="font-semibold max-w-[280px]">Motivo / Finalidade</TableHead>
                <TableHead className="font-semibold">Autorizado Por</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parcelas.map((parcela) => (
                <TableRow key={parcela.id}>
                  <TableCell className="font-medium">
                    {parcela.numero}/{parcelas.length}
                  </TableCell>
                  <TableCell className="font-mono">
                    {formatCurrency(parcela.valor)}
                  </TableCell>
                  <TableCell>{formatDate(parcela.vencimento)}</TableCell>
                  <TableCell className="max-w-[280px] whitespace-normal text-muted-foreground text-sm">
                    {parcela.motivo || '—'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {parcela.autorizadoPor || '—'}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={parcela.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    {parcela.status === 'PENDENTE' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRegistrarPagamento(parcela)}
                        disabled={isConfirming}
                      >
                        Registrar Pagamento
                      </Button>
                    )}
                    {parcela.status === 'PAGO' && parcela.dataPagamento && (
                      <span className="text-xs text-muted-foreground">
                        Pago em {formatDate(parcela.dataPagamento)}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ModalPagamento
        open={modalOpen}
        onOpenChange={(open) => {
          if (!isConfirming) setModalOpen(open);
        }}
        valor={parcelaSelecionada ? formatCurrency(parcelaSelecionada.valor) : ''}
        numeroParcela={parcelaSelecionada ? String(parcelaSelecionada.numero) : ''}
        onConfirmar={handleConfirmarPagamento}
        isLoading={isConfirming}
      />
    </>
  );
}
