import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Building2, Calendar, Banknote, Download } from "lucide-react"
import * as XLSX from "xlsx"

interface ResumoFinanceiroProps {
  credor: string
  cnpj: string
  valorTotal: string
  dataEmissao: string
}

export function ResumoFinanceiro({
  credor,
  cnpj,
  valorTotal,
  dataEmissao,
}: ResumoFinanceiroProps) {
  const handleExportExcel = () => {
    const dataToExport = [
      {
        Credor: credor,
        CNPJ: cnpj,
        "Valor Total": valorTotal,
        "Data de Emissão": dataEmissao,
      },
    ]
    const ws = XLSX.utils.json_to_sheet(dataToExport)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Resumo do Título")
    XLSX.writeFile(wb, `ProofChain_Resumo_${cnpj}.xlsx`)
  }

  return (
    <Card className="bg-card border-border shadow-sm mb-8">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 flex-1">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Building2 className="h-4 w-4" />
                Credor
              </div>
              <p className="font-medium text-foreground">{credor}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Building2 className="h-4 w-4" />
                CNPJ
              </div>
              <p className="font-medium text-foreground font-mono text-sm">{cnpj}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Banknote className="h-4 w-4" />
                Valor Total
              </div>
              <p className="font-semibold text-foreground text-lg">{valorTotal}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Calendar className="h-4 w-4" />
                Data de Emissão
              </div>
              <p className="font-medium text-foreground">{dataEmissao}</p>
            </div>
          </div>
          <Button variant="outline" className="gap-2 ml-6 shrink-0" onClick={handleExportExcel}>
            <Download className="h-4 w-4" />
            Exportar para Excel
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
