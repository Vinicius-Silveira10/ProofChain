import { Search, Plus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface UsuariosHeaderProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  onNovoUsuario: () => void
  canManage?: boolean
}

export function UsuariosHeader({ searchTerm, onSearchChange, onNovoUsuario, canManage = true }: UsuariosHeaderProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Gestão de Usuários</h1>
        <p className="text-muted-foreground mt-1">
          Administre acessos, credenciais e níveis de permissão da plataforma.
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar por nome ou e-mail..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 bg-white border-slate-200"
          />
        </div>

        {canManage && (
          <Button onClick={onNovoUsuario} className="bg-slate-900 hover:bg-slate-800 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Novo Usuário
          </Button>
        )}
      </div>
    </div>
  )
}
