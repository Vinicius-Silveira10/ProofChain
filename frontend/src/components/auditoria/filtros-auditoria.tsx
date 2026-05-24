import { useState } from "react";
import { Search, CalendarIcon, Filter } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface FiltrosAuditoriaProps {
  onFilterChange: (filters: {
    uuid: string;
    acao: string;
    dataInicio: Date | undefined;
    dataFim: Date | undefined;
  }) => void;
}

export function FiltrosAuditoria({ onFilterChange }: FiltrosAuditoriaProps) {
  const [uuid, setUuid] = useState("");
  const [acao, setAcao] = useState("todas");
  const [dataInicio, setDataInicio] = useState<Date | undefined>(undefined);
  const [dataFim, setDataFim] = useState<Date | undefined>(undefined);

  const handleApplyFilters = () => {
    onFilterChange({
      uuid,
      acao,
      dataInicio,
      dataFim,
    });
  };

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-end">
      {/* Busca por UUID */}
      <div className="flex flex-1 flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">
          Buscar por UUID
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Ex: 3fa85f64-5717-4562..."
            value={uuid}
            onChange={(e) => setUuid(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Filtro por Ação */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">Ação</label>
        <Select value={acao} onValueChange={setAcao}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as Ações</SelectItem>
            <SelectItem value="TITLE_CREATED">Criação de Título</SelectItem>
            <SelectItem value="INSTALLMENT_PAID">Pagamento</SelectItem>
            <SelectItem value="INTEGRITY_BREACH_DETECTED">
              Alerta de Fraude
            </SelectItem>
            <SelectItem value="USER_LOGIN">Login de Usuário</SelectItem>
            <SelectItem value="TITLE_REMOVED">Remoção de Título</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Date Picker - Data Início */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">De</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal sm:w-[140px]",
                !dataInicio && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dataInicio
                ? format(dataInicio, "dd/MM/yyyy", { locale: ptBR })
                : "Início"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dataInicio}
              onSelect={setDataInicio}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Date Picker - Data Fim */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">Até</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal sm:w-[140px]",
                !dataFim && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dataFim
                ? format(dataFim, "dd/MM/yyyy", { locale: ptBR })
                : "Fim"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dataFim} onSelect={setDataFim} />
          </PopoverContent>
        </Popover>
      </div>

      {/* Botão Aplicar */}
      <Button onClick={handleApplyFilters} className="gap-2">
        <Filter className="h-4 w-4" />
        Filtrar
      </Button>
    </div>
  );
}
