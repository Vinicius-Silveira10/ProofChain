import { useState } from "react"
import { UserPlus } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface NovoUsuarioModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddUser: (user: { nome: string; email: string; role: string }) => void
}

export function NovoUsuarioModal({ open, onOpenChange, onAddUser }: NovoUsuarioModalProps) {
  const [nome, setNome] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    // Simular chamada de API
    await new Promise((resolve) => setTimeout(resolve, 1500))
    
    setIsLoading(false)
    onAddUser({ nome, email, role })
    onOpenChange(false)
    
    // Reset form
    setNome("")
    setEmail("")
    setRole("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
              <UserPlus className="h-5 w-5 text-slate-700" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-foreground">
                Cadastrar Novo Usuário
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Preencha as informações do novo colaborador.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="nome" className="text-sm font-medium text-foreground">
              Nome Completo
            </Label>
            <Input
              id="nome"
              type="text"
              placeholder="Ex: João da Silva"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="bg-white border-slate-200"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-foreground">
              E-mail Corporativo
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="joao.silva@empresa.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-white border-slate-200"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role" className="text-sm font-medium text-foreground">
              Nível de Acesso
            </Label>
            <Select value={role} onValueChange={setRole} required>
              <SelectTrigger className="bg-white border-slate-200">
                <SelectValue placeholder="Selecione uma função..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMINISTRADOR">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-slate-800" />
                    Administrador
                  </span>
                </SelectItem>
                <SelectItem value="AUDITOR">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                    Auditor
                  </span>
                </SelectItem>
                <SelectItem value="OPERADOR">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-slate-400" />
                    Operador
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-slate-200"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-slate-900 hover:bg-slate-800 text-white"
            >
              {isLoading ? "Salvando..." : "Salvar Usuário"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
