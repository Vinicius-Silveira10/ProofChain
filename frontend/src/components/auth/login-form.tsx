import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shield, Eye, EyeOff, AlertCircle, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authService } from "@/services/authService";

export function LoginForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      await authService.login(email, password);
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Falha no login:", error);
      // Sanitização de Mensagens de Erro
      const message = error.response?.data?.message || "Erro de conexão ao tentar autenticar. Tente novamente.";
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex relative">
      {/* Botão Voltar Absoluto */}
      <div className="absolute top-6 left-6 z-10">
        <Link 
          to="/" 
          className="flex items-center gap-2 text-sm font-medium transition-colors lg:text-slate-400 lg:hover:text-white text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para o Início
        </Link>
      </div>

      {/* Lado Esquerdo - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 flex-col justify-center items-center p-12">
        <div className="max-w-md text-center">
          <div className="flex items-center justify-center gap-3 mb-8">
            <Shield className="h-12 w-12 text-white" strokeWidth={1.5} />
            <span className="text-3xl font-semibold text-white tracking-tight">
              ProofChain
            </span>
          </div>
          <h1 className="text-2xl font-medium text-white leading-relaxed text-balance">
            Segurança Institucional e Auditoria Web3 para Títulos de Dívida.
          </h1>
          <p className="mt-6 text-slate-400 text-sm leading-relaxed">
            Plataforma corporativa de custódia com verificação blockchain imutável 
            e rastreabilidade completa de operações.
          </p>
        </div>
      </div>

      {/* Lado Direito - Formulário */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 p-8">
        <div className="w-full max-w-md">
          {/* Logo mobile */}
          <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
            <Shield className="h-8 w-8 text-slate-900" strokeWidth={1.5} />
            <span className="text-xl font-semibold text-slate-900 tracking-tight">
              ProofChain
            </span>
          </div>

          {/* Card do Formulário */}
          <div className="bg-white rounded-md shadow-lg p-8 border border-slate-200">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-slate-900">
                Acesse sua conta
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Insira suas credenciais corporativas.
              </p>
            </div>

            {/* Alerta de Erro */}
            {errorMessage && (
              <div className="mb-6 flex items-center gap-3 rounded-md bg-red-50 border border-red-200 px-4 py-3">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                <p className="text-sm text-red-600">
                  {errorMessage}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Campo Email */}
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-sm font-medium text-slate-700"
                >
                  Email corporativo
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nome@empresa.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11"
                  required
                />
              </div>

              {/* Campo Senha */}
              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-slate-700"
                >
                  Senha
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Link Esqueci Senha */}
              <div className="flex justify-end">
                <a
                  href="#"
                  className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
                >
                  Esqueci minha senha
                </a>
              </div>

              {/* Botão Submit */}
              <Button
                type="submit"
                className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Autenticando...</span>
                  </>
                ) : (
                  "Entrar no Sistema"
                )}
              </Button>
            </form>

            {/* Rodapé */}
            <p className="mt-6 text-center text-xs text-slate-400">
              Ambiente corporativo protegido. Todas as ações são registradas.
            </p>
          </div>

          {/* Copyright */}
          <p className="mt-6 text-center text-xs text-slate-400">
            &copy; {new Date().getFullYear()} ProofChain. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
