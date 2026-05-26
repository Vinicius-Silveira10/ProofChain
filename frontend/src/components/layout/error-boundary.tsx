import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl shadow-lg p-8 text-center animate-in fade-in zoom-in-95 duration-300">
            <div className="mx-auto w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6">
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            <h1 className="text-2xl font-semibold text-slate-900 mb-2">
              Ops, algo deu errado.
            </h1>
            <p className="text-slate-500 mb-8 leading-relaxed">
              Encontramos uma instabilidade inesperada ao renderizar a tela. Nossa equipe já foi notificada.
            </p>
            
            {/* Opcional: Mostrar detalhes do erro em ambiente de dev */}
            {import.meta.env.DEV && this.state.error && (
              <div className="mb-6 p-4 bg-slate-100 rounded text-left overflow-auto">
                <p className="text-xs font-mono text-slate-700">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            <Button onClick={this.handleReset} className="w-full h-11 gap-2">
              <RotateCcw className="h-4 w-4" />
              Tentar Novamente
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
