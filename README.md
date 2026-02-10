# Lume Frontend

**Lume** é uma plataforma de gestão financeira inteligente para empresas, com dashboard interativo, análise de fluxo de caixa, projeções com cenários, reunião executiva com IA e importação de dados via CSV.

---

## Stack Tecnológica

| Tecnologia | Versão | Uso |
|------------|--------|-----|
| **React** | 18+ | Framework de UI |
| **TypeScript** | 5+ | Tipagem estática |
| **Vite** | 5+ | Build tool e dev server |
| **Tailwind CSS** | 3+ | Estilização utilitária |
| **Recharts** | 2+ | Gráficos e visualizações |
| **React Router** | 6+ | Roteamento SPA |
| **xlsx (SheetJS)** | 0.18+ | Exportação de planilhas Excel |

---

## Estrutura de Pastas e Arquivos

```
lume-frontend/
├── public/                        # Arquivos estáticos servidos na raiz
├── src/
│   ├── components/                # Componentes reutilizáveis
│   │   ├── AlertsPanel.tsx        # Painel de alertas financeiros
│   │   ├── CashflowChart.tsx      # Gráfico de fluxo de caixa (entradas/saídas/saldo)
│   │   ├── DateRangePicker.tsx    # Seletor de intervalo de datas
│   │   ├── ExplainModal.tsx       # Modal de explicação por IA dos indicadores
│   │   ├── Layout.tsx             # Layout principal com sidebar e área de conteúdo
│   │   ├── LoadingSpinner.tsx     # Componente de loading/spinner
│   │   ├── MetricCard.tsx         # Card de indicador (Saldo, Burn Rate, Runway)
│   │   ├── ProtectedRoute.tsx     # Wrapper de rota protegida por autenticação
│   │   └── Sidebar.tsx            # Barra lateral de navegação (tema dark)
│   │
│   ├── contexts/                  # Contextos React (estado global)
│   │   └── AuthContext.tsx         # Contexto de autenticação (login/logout/token)
│   │
│   ├── hooks/                     # Hooks customizados
│   │   └── useApi.ts              # Hook para chamadas à API com autenticação
│   │
│   ├── lib/                       # Utilitários e configurações
│   │   ├── api.ts                 # Cliente HTTP (axios) com interceptors e endpoints
│   │   └── utils.ts               # Funções utilitárias (formatCurrency, formatDate, etc.)
│   │
│   ├── pages/                     # Páginas da aplicação
│   │   ├── Dashboard.tsx          # Dashboard principal com indicadores e chat IA
│   │   ├── Dashboards.tsx         # Tela de dashboards com gráficos e transações
│   │   ├── InsercaoDados.tsx      # Tela de importação de dados via CSV
│   │   ├── Integracoes.tsx        # Tela de integrações com serviços externos
│   │   ├── Login.tsx              # Tela de login/autenticação
│   │   └── ReuniaoExecutiva.tsx   # Tela de reunião executiva com IA
│   │
│   ├── App.tsx                    # Componente raiz com rotas e providers
│   ├── main.tsx                   # Ponto de entrada React (ReactDOM.render)
│   ├── index.css                  # Estilos globais e tokens do Tailwind
│   └── vite-env.d.ts             # Tipos de ambiente do Vite
│
├── .env                           # Variáveis de ambiente (API URL, etc.)
├── .env.example                   # Exemplo de variáveis de ambiente
├── .gitignore                     # Arquivos ignorados pelo Git
├── index.html                     # HTML principal (entry point do Vite)
├── package.json                   # Dependências e scripts npm
├── package-lock.json              # Lock de versões das dependências
├── postcss.config.js              # Configuração do PostCSS
├── tailwind.config.js             # Configuração do Tailwind CSS
├── tsconfig.json                  # Configuração do TypeScript
├── vercel.json                    # Configuração de deploy no Vercel
└── vite.config.ts                 # Configuração do Vite (aliases, proxy, etc.)
```

---

## Descrição dos Componentes

### Componentes (`src/components/`)

| Componente | Descrição |
|------------|-----------|
| **AlertsPanel.tsx** | Exibe alertas financeiros gerados automaticamente (ex: saldo negativo, burn rate alto). Inclui ícones de severidade e ações sugeridas. |
| **CashflowChart.tsx** | Gráfico de barras e linhas com Recharts. Entradas (verde) acima da linha zero, saídas (vermelho) abaixo. Linha de saldo acumulado. Suporta cenários e projeções futuras. |
| **DateRangePicker.tsx** | Componente de seleção de período com calendário. Usado nos filtros de transações e dashboards. |
| **ExplainModal.tsx** | Modal que envia dados de um indicador para a IA e exibe uma explicação em linguagem natural. Botão "Explicar" presente nos cards e gráficos. |
| **Layout.tsx** | Wrapper de layout que renderiza o Sidebar à esquerda e o conteúdo da página à direita. Gerencia o estado de collapse do sidebar. |
| **LoadingSpinner.tsx** | Spinner animado exibido durante carregamentos de dados. |
| **MetricCard.tsx** | Card de indicador financeiro com suporte a temas de cor (`blue` para Saldo, `red` para Burn Rate, `green` para Runway). Exibe título, valor, variação percentual e ícone. |
| **ProtectedRoute.tsx** | HOC que verifica se o usuário está autenticado antes de renderizar a rota. Redireciona para `/login` se não autenticado. |
| **Sidebar.tsx** | Barra lateral de navegação com tema dark (fundo #0c1527). Item ativo em azul brilhante com seta indicadora. Suporta collapse/expand. Exibe nome do usuário e botão de logout no rodapé. |

### Páginas (`src/pages/`)

| Página | Rota | Descrição |
|--------|------|-----------|
| **Login.tsx** | `/login` | Tela de autenticação com email e senha. Redireciona para o Dashboard após login bem-sucedido. |
| **Dashboard.tsx** | `/` | Dashboard principal com indicadores (Saldo de Caixa, Taxa de Queima, Runway), chat com IA financeira e alertas. |
| **Dashboards.tsx** | `/dashboards` | Tela de dashboards detalhados com gráfico de fluxo de caixa (CashflowChart), tabela de transações com filtros (tipo, período), paginação e exportação Excel. |
| **InsercaoDados.tsx** | `/insercao-dados` | Tela de importação de dados via upload de arquivo CSV. Exibe progresso de upload e histórico de importações. |
| **Integracoes.tsx** | `/integracoes` | Tela de integrações com serviços externos (bancos, ERPs, etc.). |
| **ReuniaoExecutiva.tsx** | `/reuniao-executiva` | Tela de reunião executiva com IA que analisa os dados financeiros e gera insights e recomendações. |

### Contextos, Hooks e Libs

| Arquivo | Descrição |
|---------|-----------|
| **AuthContext.tsx** | Contexto React que gerencia autenticação: login, logout, token JWT, dados do usuário e empresa. Persiste sessão via localStorage. |
| **useApi.ts** | Hook customizado que encapsula chamadas à API com headers de autenticação e tratamento de erros. |
| **api.ts** | Cliente HTTP configurado com axios. Define base URL, interceptors de autenticação e todos os endpoints da API (dashboard, transações, upload, IA, etc.). |
| **utils.ts** | Funções utilitárias: `formatCurrency` (R$ xx.xxx,xx), `formatDate` (DD/MM/AAAA), `cn` (classnames), entre outras. |

---

## Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com base no `.env.example`:

```env
VITE_API_URL=https://sua-api.railway.app
```

| Variável | Descrição |
|----------|-----------|
| `VITE_API_URL` | URL base da API backend (Railway) |

---

## Scripts Disponíveis

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview do build de produção
npm run preview
```

---

## Deploy

O projeto está configurado para deploy automático no **Vercel** via push para a branch `main`.

```bash
# Após fazer alterações:
git add .
git commit -m "descrição da mudança"
git push origin main
```

O Vercel detecta o push automaticamente e faz o deploy em ~1-2 minutos. A configuração de rewrite para SPA está no `vercel.json`.

---

## Funcionalidades Principais

1. **Dashboard com Indicadores** — Saldo de Caixa (azul), Taxa de Queima (vermelho), Runway (verde) com variação percentual e explicação por IA.

2. **Gráfico de Fluxo de Caixa** — Barras verdes (entradas) acima da linha zero, barras vermelhas (saídas) abaixo. Linha de saldo acumulado. Suporte a cenários e projeções.

3. **Tabela de Transações** — Listagem paginada com filtros por tipo (Receita/Despesa) e período. Exportação para Excel (.xlsx) respeitando os filtros ativos.

4. **Importação de Dados** — Upload de CSV com mapeamento automático de colunas e classificação por IA.

5. **Chat com IA** — Assistente financeiro que responde perguntas sobre os dados da empresa.

6. **Reunião Executiva** — Sessão de análise com IA que gera relatório executivo baseado nos dados financeiros.

7. **Alertas Financeiros** — Notificações automáticas sobre situações críticas (saldo negativo, burn rate elevado, etc.).

---

## Dependências Principais

```json
{
  "react": "^18.x",
  "react-dom": "^18.x",
  "react-router-dom": "^6.x",
  "recharts": "^2.x",
  "axios": "^1.x",
  "xlsx": "^0.18.x",
  "lucide-react": "^0.x",
  "tailwindcss": "^3.x",
  "typescript": "^5.x",
  "vite": "^5.x"
}
```
