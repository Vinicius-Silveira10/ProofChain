import { useState } from "react";
import { UsuariosHeader } from "@/components/usuarios/usuarios-header";
import { UsuariosTable, type Usuario } from "@/components/usuarios/usuarios-table";
import { NovoUsuarioModal } from "@/components/usuarios/novo-usuario-modal";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
// Dados mockados para demonstração
const mockUsuarios: Usuario[] = [
  {
    id: "usr_001",
    nome: "Carlos Eduardo Mendes",
    email: "carlos.mendes@proofchain.com.br",
    role: "ADMINISTRADOR",
    status: "ATIVO",
  },
  {
    id: "usr_002",
    nome: "Ana Paula Rodrigues",
    email: "ana.rodrigues@proofchain.com.br",
    role: "AUDITOR",
    status: "ATIVO",
  },
  {
    id: "usr_003",
    nome: "Fernando Costa Lima",
    email: "fernando.lima@proofchain.com.br",
    role: "OPERADOR",
    status: "ATIVO",
  },
  {
    id: "usr_004",
    nome: "Mariana Silva Santos",
    email: "mariana.santos@proofchain.com.br",
    role: "AUDITOR",
    status: "ATIVO",
  },
  {
    id: "usr_005",
    nome: "Ricardo Almeida Pereira",
    email: "ricardo.pereira@proofchain.com.br",
    role: "OPERADOR",
    status: "REVOGADO",
  },
  {
    id: "usr_006",
    nome: "Juliana Ferreira Dias",
    email: "juliana.dias@proofchain.com.br",
    role: "OPERADOR",
    status: "ATIVO",
  },
  {
    id: "usr_007",
    nome: "Bruno Machado Oliveira",
    email: "bruno.oliveira@proofchain.com.br",
    role: "ADMINISTRADOR",
    status: "ATIVO",
  },
  {
    id: "usr_008",
    nome: "Patrícia Souza Nunes",
    email: "patricia.nunes@proofchain.com.br",
    role: "AUDITOR",
    status: "REVOGADO",
  },
];

export default function Usuarios() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [usuariosList, setUsuariosList] = useState<Usuario[]>(mockUsuarios);
  const { toast } = useToast();

  const { user } = useAuth();
  const canManage = user?.role === 'ADMINISTRADOR' || user?.role === 'ADMIN';

  const handleAddUser = (novoUser: { nome: string; email: string; role: string }) => {
    console.log("🔒 LOG DE AUDITORIA SALVO: Ação de cadastro executada por", user?.nome, "Data/Hora:", new Date().toISOString());
    const newUsuario: Usuario = {
      id: `usr_${Date.now()}`,
      ...novoUser,
      role: novoUser.role as any,
      status: "ATIVO"
    };
    setUsuariosList(prev => [newUsuario, ...prev]);
    toast({
      title: "Usuário Cadastrado",
      description: `O usuário ${newUsuario.nome} foi adicionado com sucesso.`,
    });
  };

  const handleDeleteUser = (id: string, nome: string) => {
    console.log("🔒 LOG DE AUDITORIA SALVO: Ação de revogação executada por", user?.nome, "Data/Hora:", new Date().toISOString());
    setUsuariosList(prev => prev.filter(u => u.id !== id));
    toast({
      title: "Acesso Revogado",
      description: `O acesso do usuário ${nome} foi removido com sucesso.`,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <UsuariosHeader
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onNovoUsuario={() => setIsModalOpen(true)}
            canManage={canManage}
          />

          <UsuariosTable 
            usuarios={usuariosList} 
            searchTerm={searchTerm} 
            canManage={canManage}
            onDeleteUser={handleDeleteUser}
          />
        </div>
      </main>

      <NovoUsuarioModal 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen} 
        onAddUser={handleAddUser}
      />
    </div>
  );
}
