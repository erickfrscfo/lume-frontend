# Lume — CFO AI Frontend

Frontend React + TypeScript + Vite do sistema Lume CFO AI, conectado ao backend na Railway.

## Stack

- **React 18** + TypeScript
- **Vite 5** (build tool)
- **Tailwind CSS 3** (estilização)
- **Recharts** (gráficos)
- **Axios** (HTTP client)
- **React Router DOM** (roteamento)
- **Lucide React** (ícones)

## Funcionalidades

- **Login/Cadastro** com autenticação JWT
- **Dashboard** com métricas financeiras e gráfico de fluxo de caixa (Realizado vs Projeção)
- **Reunião Executiva** — Chat com IA (OpenAI) sobre finanças da empresa
- **Inserção de Dados** — Upload de CSV com classificação automática por IA + entrada manual
- **Dashboards** — DRE, gráficos de tendência, despesas por categoria, lista de transações
- **Integrações** — Omie e Conta Azul (preparado para OAuth)
- **Cenários** — Sidebar colapsável com cenários financeiros (Projeto, Investimento, etc.)

## Configuração

```bash
# Instalar dependências
npm install

# Configurar variável de ambiente
cp .env.example .env
# Editar VITE_API_URL se necessário

# Rodar em desenvolvimento
npm run dev

# Build para produção
npm run build
```

## Variáveis de Ambiente

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `VITE_API_URL` | URL do backend API | `https://lume-mvp-production.up.railway.app` |

## Deploy na Vercel

1. Push este código para um repositório GitHub
2. Acesse [vercel.com](https://vercel.com) e importe o repositório
3. Configure:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Environment Variable**: `VITE_API_URL` = `https://lume-mvp-production.up.railway.app`
4. Deploy!

## Estrutura

```
src/
├── components/     # Componentes reutilizáveis
│   ├── Layout.tsx
│   ├── Sidebar.tsx
│   ├── MetricCard.tsx
│   ├── LoadingSpinner.tsx
│   └── ProtectedRoute.tsx
├── contexts/       # React Contexts
│   └── AuthContext.tsx
├── hooks/          # Custom hooks
│   └── useApi.ts
├── lib/            # Utilitários
│   ├── api.ts      # API client (Axios)
│   └── utils.ts    # Formatação, helpers
├── pages/          # Páginas
│   ├── Login.tsx
│   ├── Dashboard.tsx
│   ├── ReuniaoExecutiva.tsx
│   ├── InsercaoDados.tsx
│   ├── Dashboards.tsx
│   └── Integracoes.tsx
├── App.tsx         # Roteamento
├── main.tsx        # Entry point
└── index.css       # Estilos globais
```
