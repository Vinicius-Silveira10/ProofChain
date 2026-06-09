import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface ModalPagamentoProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  valor: string;
  numeroParcela: string;
  onConfirmar: () => void;
  /** Exibe spinner e desabilita botões enquanto a requisição está em andamento */
  isLoading?: boolean;
}

export function ModalPagamento({
  open,
  onOpenChange,
  valor,
  numeroParcela,
  onConfirmar,
  isLoading = false,
}: ModalPagamentoProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-amber-50">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <DialogTitle className="text-lg">Confirmar Pagamento</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
            Confirmar pagamento de{' '}
            <span className="font-semibold text-foreground">{valor}</span>{' '}
            referente à parcela {numeroParcela}?
          </DialogDescription>
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
            O timestamp de auditoria será gerado automaticamente pelo servidor.{' '}
            <span className="text-red-600 font-medium">Esta ação não pode ser desfeita.</span>
          </p>
        </DialogHeader>
        <DialogFooter className="mt-4 gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button onClick={onConfirmar} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Confirmando...
              </>
            ) : (
              'Confirmar Pagamento'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
