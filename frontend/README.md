# ProofChain — Frontend 🖥️

> Painel gerencial e portal público de verificação de autenticidade dos títulos de dívida.

**Stack:** React 19 · TypeScript · Vite · TailwindCSS · Radix UI · React Router · Axios · Recharts

---

## 🗂️ Estrutura de Pastas

```
frontend/src/
├── App.tsx                    # Roteamento principal (React Router)
├── main.tsx                   # Entry point da aplicação
├── index.css                  # Estilos globais + design tokens
├── pages/                     # Páginas da aplicação (1 arquivo = 1 rota)
│   ├── Login.tsx              # Tela de autenticação
│   ├── Dashboard.tsx          # KPIs e métricas do sistema
│   ├── Portfolio.tsx          # Listagem e gestão de títulos
│   ├── TituloDetalhes.tsx     # Detalhes + parcelas + timeline de auditoria
│   ├── Emissao.tsx            # Formulário de emissão de novo título
│   ├── Auditoria.tsx          # Trilha forense de audit logs
│   ├── Usuarios.tsx           # Gestão de usuários (ADMIN only)
│   └── VerificadorPublico.tsx # Portal público — verificação sem login
├── components/                # Componentes reutilizáveis
├── contexts/                  # Context API (ex: AuthContext, ThemeContext)
├── hooks/                     # Custom hooks (ex: useTitulos, useAuth)
├── services/                  # Camada de comunicação com a API REST
├── types/                     # Tipos TypeScript compartilhados
├── lib/                       # Utilitários e helpers
└── utils/                     # Funções puras auxiliares
```

---

## 🚀 Rodando Localmente

> ⚠️ O backend deve estar rodando antes de iniciar o frontend.

```bash
# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento
npm run dev
```

> ✅ Painel disponível em `http://localhost:3000`

---

## 🔑 Variáveis de Ambiente

O frontend não usa `.env` com segredos sensíveis. As configurações de conexão com a API são definidas nos arquivos de serviço em `src/services/`.

Se necessário criar um `.env.local` para apontar para uma API diferente:

```env
VITE_API_BASE_URL=http://localhost:3001
```

---

## 📄 Páginas e Rotas

| Rota | Página | Acesso | Descrição |
|------|--------|--------|-----------|
| `/login` | `Login.tsx` | 🌐 Público | Autenticação com e-mail e senha |
| `/` | `Dashboard.tsx` | 🔒 Autenticado | KPIs e métricas executivas |
| `/portfolio` | `Portfolio.tsx` | 🔒 Autenticado | Listagem de títulos com filtros |
| `/portfolio/:id` | `TituloDetalhes.tsx` | 🔒 Autenticado | Detalhes, parcelas e timeline |
| `/emissao` | `Emissao.tsx` | 🔒 OPERATOR / ADMIN | Formulário de emissão |
| `/auditoria` | `Auditoria.tsx` | 🔒 AUDITOR / ADMIN | Trilha forense de auditoria |
| `/usuarios` | `Usuarios.tsx` | 🔒 ADMIN | Gestão de usuários |
| `/verificar` | `VerificadorPublico.tsx` | 🌐 Público | Verificação de autenticidade sem login |

---

## 🎨 Design System

O frontend usa **TailwindCSS v4** com componentes **Radix UI** primitivos, garantindo acessibilidade nativa (WAI-ARIA).

Principais bibliotecas de UI:
- **Radix UI** — Componentes acessíveis headless (Dialog, Select, Tabs, Toast...)
- **Lucide React** — Ícones
- **Recharts** — Gráficos e visualizações do Dashboard
- **Sonner** — Notificações toast
- **React Hook Form** — Gerenciamento de formulários
- **date-fns** — Manipulação de datas

---

## 📦 Scripts Disponíveis

```bash
npm run dev       # Servidor de desenvolvimento com HMR
npm run build     # Build de produção (output em /dist)
npm run preview   # Serve o build de produção localmente
npm run lint      # Análise estática com ESLint
```

---

## 🔌 Integração com a API

A camada de serviços em `src/services/` encapsula todas as chamadas HTTP via **Axios**. O token JWT é armazenado no estado da aplicação via `AuthContext` e injetado automaticamente nos headers das requisições autenticadas.

```
[Página / Hook]
     │ usa
     ▼
[src/services/]
     │ Axios + Bearer Token
     ▼
[Backend API :3001]
     │ Resposta
     ▼
[Estado Local / Context]
```

---

## 🌐 Portal Público de Verificação

A página `/verificar` é **acessível sem autenticação** e permite que qualquer pessoa no mundo insira o UUID de um título e receba instantaneamente:

- ✅ **VERIFIED** — dados íntegros (hash local == hash on-chain)
- 🚨 **COMPROMISED** — fraude detectada (hashes divergem)
- ⏳ **PENDING** — blockchain temporariamente inacessível
