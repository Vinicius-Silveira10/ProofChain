import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Shield, LayoutDashboard, Briefcase, FileText, FileSearch, Users, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

export function AuthLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();           // Limpa token + user do localStorage e zera o AuthContext
    navigate("/login");
  };

  const links = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Portfólio", href: "/portfolio", icon: Briefcase },
    { name: "Emissão", href: "/emissao", icon: FileText },
    { name: "Auditoria", href: "/auditoria", icon: FileSearch },
    { name: "Usuários", href: "/usuarios", icon: Users },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-white shadow-sm">
        <div className="flex h-16 items-center px-6">
          <div className="flex items-center gap-2 mr-8">
            <Shield className="h-6 w-6 text-slate-900" />
            <span className="text-xl font-bold tracking-tight text-slate-900">
              ProofChain
            </span>
            <span className="ml-2 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
              Corporativo
            </span>
          </div>

          <nav className="flex flex-1 items-center justify-end gap-2">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    isActive
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {link.name}
                </Link>
              );
            })}
            
            <div className="w-px h-6 bg-slate-200 mx-2" />
            
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </nav>
        </div>
      </header>
      
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
    </div>
  );
}
