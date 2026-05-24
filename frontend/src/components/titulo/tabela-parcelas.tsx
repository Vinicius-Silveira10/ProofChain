import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ModalPagamento } from "./modal-pagamento"

type StatusParcela = "pendente" | "pago" | "vencido"

interface Parcela {
  numero: string
  valor: string
  valorNumerico: number
  vencimento: string
  comentario: string
  autorizadoPor: string
  status: StatusParcela
}

const parcelas: Parcela[] = [
  {
    numero: "1/3",
    valor: "R$ 15.000.000,00",
    valorNumerico: 15000000,
    vencimento: "15/04/2026",
    comentario: "Aquisição de servidores para o novo data center",
    autorizadoPor: "Carlos Silva - CFO",
    status: "pendente",
  },
  {
    numero: "2/3",
    valor: "R$ 15.000.000,00",
    valorNumerico: 15000000,
    vencimento: "15/07/2026",
    comentario: "Licenciamento de software empresarial",
    autorizadoPor: "Carlos Silva - CFO",
    status: "pago",
  },
  {
    numero: "3/3",
    valor: "R$ 15.000.000,00",
    valorNumerico: 15000000,
    vencimento: "15/10/2025",
    comentario: "Consultoria de implantação e treinamento",
    autorizadoPor: "Ana Rodrigues - COO",
    status: "vencido",
  },
]

function StatusBadge({ status }: { status: StatusParcela }) {
  switch (status) {
    case "pago":
      return (
        <Badge className="bg-success/15 text-success border-success/30 hover:bg-success/15">
          Pago
        </Badge>
      )
    case "vencido":
      return (
        <Badge className="bg-warning/15 text-warning-foreground border-warning/30 hover:bg-warning/15">
          Vencido
        </Badge>
      )
    case "pendente":
    default:
      return (
        <Badge variant="secondary" className="bg-muted text-muted-foreground">
          Pendente
        </Badge>
      )
  }
}

export function TabelaParcelas() {
  const [modalOpen, setModalOpen] = useState(false)
  const [parcelaSelecionada, setParcelaSelecionada] = useState<Parcela | null>(null)

  const handleRegistrarPagamento = (parcela: Parcela) => {
    setParcelaSelecionada(parcela)
    setModalOpen(true)
  }

  const handleConfirmarPagamento = () => {
    // Aqui seria a lógica de confirmação
    setModalOpen(false)
    setParcelaSelecionada(null)
  }

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
                <TableHead className="font-semibold max-w-[300px]">Comentário / Motivo</TableHead>
                <TableHead className="font-semibold">Autorizado Por</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parcelas.map((parcela, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{parcela.numero}</TableCell>
                  <TableCell className="font-mono">{parcela.valor}</TableCell>
                  <TableCell>{parcela.vencimento}</TableCell>
                  <TableCell className="max-w-[300px] whitespace-normal text-muted-foreground">
                    {parcela.comentario}
                  </TableCell>
                  <TableCell className="text-sm">{parcela.autorizadoPor}</TableCell>
                  <TableCell>
                    <StatusBadge status={parcela.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    {parcela.status === "pendente" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRegistrarPagamento(parcela)}
                      >
                        Registrar Pagamento
                      </Button>
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
        onOpenChange={setModalOpen}
        valor={parcelaSelecionada?.valor || ""}
        numeroParcela={parcelaSelecionada?.numero.split("/")[0] || ""}
        onConfirmar={handleConfirmarPagamento}
      />
    </>
  )
}
