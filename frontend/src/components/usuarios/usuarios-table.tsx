import { MoreHorizontal, Shield, Eye, UserCog, Lock, Unlock } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export type UserRole = "ADMINISTRADOR" | "AUDITOR" | "OPERADOR"
export type UserStatus = "ATIVO" | "REVOGADO"

export interface Usuario {
  id: string
  nome: string
  email: string
  role: UserRole
  status: UserStatus
}

interface UsuariosTableProps {
  usuarios: Usuario[]
  searchTerm: string
  canManage?: boolean
  onDeleteUser?: (id: string, nome: string) => void
}

function getRoleBadgeStyles(role: UserRole) {
  switch (role) {
    case "ADMINISTRADOR":
      return "bg-slate-800 text-white hover:bg-slate-800"
    case "AUDITOR":
      return "bg-blue-100 text-blue-700 hover:bg-blue-100"
    case "OPERADOR":
      return "bg-slate-100 text-slate-700 hover:bg-slate-100"
    default:
      return "bg-slate-100 text-slate-700 hover:bg-slate-100"
  }
}

function getRoleIcon(role: UserRole) {
  switch (role) {
    case "ADMINISTRADOR":
      return <Shield className="h-3 w-3 mr-1" />
    case "AUDITOR":
      return <Eye className="h-3 w-3 mr-1" />
    case "OPERADOR":
      return <UserCog className="h-3 w-3 mr-1" />
    default:
      return null
  }
}

function getStatusBadgeStyles(status: UserStatus) {
  switch (status) {
    case "ATIVO":
      return "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
    case "REVOGADO":
      return "bg-red-100 text-red-600 hover:bg-red-100"
    default:
      return "bg-slate-100 text-slate-700 hover:bg-slate-100"
  }
}

export function UsuariosTable({ usuarios, searchTerm, canManage = true, onDeleteUser }: UsuariosTableProps) {
  const filteredUsuarios = usuarios.filter(
    (usuario) =>
      usuario.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      usuario.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="bg-white border border-slate-200 rounded-md shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50 hover:bg-slate-50">
            <TableHead className="font-semibold text-slate-700">Nome</TableHead>
            <TableHead className="font-semibold text-slate-700">E-mail</TableHead>
            <TableHead className="font-semibold text-slate-700">Função</TableHead>
            <TableHead className="font-semibold text-slate-700">Status</TableHead>
            {canManage && <TableHead className="font-semibold text-slate-700 text-right">Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredUsuarios.map((usuario) => (
            <TableRow
              key={usuario.id}
              className={usuario.status === "REVOGADO" ? "bg-red-50/50" : ""}
            >
              <TableCell className="font-medium text-foreground">{usuario.nome}</TableCell>
              <TableCell className="text-muted-foreground">{usuario.email}</TableCell>
              <TableCell>
                <Badge className={`${getRoleBadgeStyles(usuario.role)} font-medium`}>
                  {getRoleIcon(usuario.role)}
                  {usuario.role}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge className={`${getStatusBadgeStyles(usuario.status)} font-medium`}>
                  {usuario.status === "ATIVO" ? "Ativo" : "Acesso Revogado"}
                </Badge>
              </TableCell>
              {canManage && (
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4 text-slate-500" />
                        <span className="sr-only">Abrir menu de ações</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem className="cursor-pointer">
                        <UserCog className="h-4 w-4 mr-2" />
                        Editar Usuário
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer">
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Histórico
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {usuario.status === "ATIVO" ? (
                        <DropdownMenuItem 
                          className="cursor-pointer text-red-600 focus:text-red-600"
                          onClick={() => onDeleteUser && onDeleteUser(usuario.id, usuario.nome)}
                        >
                          <Lock className="h-4 w-4 mr-2" />
                          Revogar Acesso
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem className="cursor-pointer text-emerald-600 focus:text-emerald-600">
                          <Unlock className="h-4 w-4 mr-2" />
                          Reativar Acesso
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
        <p className="text-sm text-muted-foreground">
          Mostrando {filteredUsuarios.length} de {usuarios.length} usuários
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled>
            Anterior
          </Button>
          <Button variant="outline" size="sm">
            Próxima
          </Button>
        </div>
      </div>
    </div>
  )
}
