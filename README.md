# Esnork - Frontend

## 📋 Visão Geral

Frontend web da plataforma Esnork, um sistema de inteligência financeira para PMEs. A aplicação entrega autenticação, dashboard financeiro, análise com IA, upload de dados, OCR de documentos, alertas, dashboards operacionais e montagem de relatórios gerenciais.

O projeto usa React com TypeScript, Vite, Tailwind CSS e integração REST com o backend hospedado por padrão em Railway.

## 🚀 Quick Start

### Pré-requisitos

- Node.js 18+ recomendado
- npm 9+
- Backend Esnork disponível localmente ou em produção

### Instalação

```bash
cd lume-frontend
npm install
```

### Configuração

Crie ou ajuste o arquivo `.env` na raiz de `lume-frontend`:

```env
VITE_API_URL=https://lume-mvp-production.up.railway.app
```

Para rodar contra o backend local:

```env
VITE_API_URL=http://localhost:3001
```

### Rodar em desenvolvimento

```bash
npm run dev
```

O Vite inicia a aplicação em `http://localhost:5173` por padrão.

### Build e preview

```bash
npm run build
npm run preview
```

## 📁 Estrutura do Projeto

```text
lume-frontend/
├── public/                    # Arquivos estáticos
├── src/
│   ├── components/            # Componentes reutilizáveis
│   ├── contexts/              # Contextos React
│   ├── hooks/                 # Hooks customizados
│   ├── lib/                   # Cliente de API e utilitários
│   ├── pages/                 # Páginas/rotas da aplicação
│   ├── App.tsx                # Rotas principais
│   ├── main.tsx               # Entrada React
│   └── index.css              # Estilos globais Tailwind
├── .env.example               # Exemplo de variáveis de ambiente
├── package.json               # Scripts e dependências
├── tailwind.config.js         # Configuração Tailwind
├── vercel.json                # Rewrites e cache para deploy Vercel
└── vite.config.ts             # Configuração Vite e alias @
```

### Páginas atuais

| Página | Rota | Descrição |
| --- | --- | --- |
| `Login.tsx` | `/login` | Login por usuário, senha e código da empresa. |
| `AdminOnboarding.tsx` | `/admin/onboarding?key=...` | Cadastro administrativo de empresa, usuário e plano de contas. Requer chave admin validada no backend. |
| `Dashboard.tsx` | `/` | Visão geral financeira com indicadores, alertas, gráficos e blocos operacionais. |
| `ReuniaoExecutiva.tsx` | `/reuniao` | Assistente de reunião executiva com IA financeira. |
| `InsercaoDados.tsx` | `/dados` | Inserção por CSV, cadastro manual e OCR de documentos fiscais. |
| `Dashboards.tsx` | `/dashboards` | Dashboards, DRE, fluxo de caixa, transações e exportação. |
| `AlertasIA.tsx` | `/alertas` | Central de alertas financeiros e insights acionáveis. |
| `ReportBuilder.tsx` | `/relatorio` | Montagem de relatório com indicadores padrão/customizados e preview. |
| `Conciliacao.tsx` | `/conciliacao` | Conciliação financeira, marcação de pagamentos/recebimentos e conciliação em lote. |
| `Integracoes.tsx` | `/integracoes` | Tela de integrações externas, atualmente preparada para evolução. |

> Observação: existem arquivos `Contrapartes.tsx`, `Documentos.tsx` e `Insights.tsx`, mas eles não estão registrados nas rotas atuais de `src/App.tsx`.

### Componentes principais

| Componente | Uso |
| --- | --- |
| `Layout.tsx` e `Sidebar.tsx` | Estrutura autenticada, navegação lateral, badge de alertas e logout. |
| `ProtectedRoute.tsx` | Bloqueia rotas privadas sem token JWT. |
| `MetricCard.tsx` | Cards de indicadores financeiros. |
| `CashflowChart.tsx` | Visualização de fluxo de caixa com Recharts. |
| `AlertsPanel.tsx` | Exibição de alertas financeiros. |
| `ExplainModal.tsx` | Explicação de métricas via IA. |
| `TransactionDetailModal.tsx` | Detalhamento e edição contextual de transações. |
| `CostClassificationModal.tsx` | Classificação de custo fixo/variável. |
| `ReportPreview.tsx` | Preview do relatório gerencial. |
| `CustomIndicatorDialog.tsx` | Criação de indicadores customizados via IA. |

## 🔧 Funcionalidades

- Autenticação com JWT e persistência em `localStorage`.
- Cadastro administrativo de empresas com plano de contas padrão ou customizado.
- Dashboard financeiro com saldo, burn rate, runway, alertas e gráficos.
- Fluxo de caixa e DRE por período.
- Listagem, criação, edição e exclusão de transações.
- Upload de CSV com histórico de importações.
- Inserção manual de transações.
- OCR de documentos fiscais com extração via IA, sugestão de categoria, contraparte e confirmação de transação.
- Assistente financeiro com histórico de conversa.
- Explicação de indicadores por IA.
- Alertas financeiros com marcação como lido, dispensa e geração manual.
- Classificação de custos fixos e variáveis.
- Montagem de relatório com indicadores padrão, indicadores customizados e template persistido.
- Conciliação financeira acessível por rota protegida e navegação lateral.
- Exportação de dados para planilha nas telas que usam `xlsx`.
- Deploy SPA preparado para Vercel com rewrite para `index.html`.

## 📦 Dependências

Versões principais conforme `package.json`:

| Pacote | Versão | Uso |
| --- | --- | --- |
| `react` / `react-dom` | `^18.3.1` | UI React. |
| `react-router-dom` | `^6.26.0` | Rotas SPA. |
| `axios` | `^1.7.2` | Cliente HTTP. |
| `lucide-react` | `^0.453.0` | Ícones. |
| `recharts` | `^2.15.2` | Gráficos. |
| `xlsx` | `^0.18.5` | Exportação de planilhas. |
| `typescript` | `^5.5.4` | Tipagem. |
| `vite` | `^5.4.0` | Build e dev server. |
| `tailwindcss` | `^3.4.10` | CSS utilitário. |

## 🔌 Integrations

### Backend REST

O frontend centraliza chamadas em `src/lib/api.ts`, com `baseURL` em:

```ts
`${VITE_API_URL}/api`
```

Principais grupos de API consumidos:

- `/auth`: login, sessão, onboarding administrativo.
- `/financial`: dashboard, fluxo de caixa, DRE, transações e breakdown de custos.
- `/upload`: importação CSV e histórico.
- `/ocr`: extração e confirmação de documentos.
- `/ai`: chat, explicações, prompts e classificação de custos.
- `/alerts`: alertas financeiros.
- `/forecast`: projeções de caixa.
- `/transactions`: transações operacionais para conciliação.
- `/counterparties`: contrapartes.
- `/reconciliations`: dashboard e conciliação em lote.
- `/documents`: documentos fiscais.
- `/insights`: insights de IA.
- `/categories`: plano de contas.
- `/report`: indicadores, template e geração de relatório.

### Deploy

O arquivo `vercel.json` configura:

- Rewrite de todas as rotas para `index.html`, necessário para SPA.
- Cache imutável para assets em `/assets/*`.

## 🐛 Troubleshooting

### Login retorna 401

Verifique se `VITE_API_URL` aponta para o backend correto e se o código da empresa está correto. Ao receber 401, o interceptor remove `lume_token` e `lume_user` do `localStorage`.

### Tela em branco após deploy

Confirme que o deploy usou `npm run build` e que o rewrite do `vercel.json` está ativo.

### Chamadas para API falham em desenvolvimento

Use `VITE_API_URL=http://localhost:3001` quando o backend estiver local. Reinicie o Vite após alterar `.env`.

### OCR ou IA não responde

O frontend apenas envia as requisições. Verifique no backend se `OPENAI_API_KEY` está configurada e se a API está acessível.

## 📝 Changelog

### 2026-06-06 — OCR com papel financeiro do documento

- A revisão de OCR passou a exibir o papel financeiro detectado do documento, como fiscal e cobrança, instrumento de cobrança, conta recorrente ou comprovante.
- A mensagem de confirmação agora diferencia criação de nova obrigação financeira de vínculo a uma obrigação existente.

### 2026-06-06 — Cards executivos na Visão Geral

- A aba `Dashboards > Visão Geral` passou a exibir 8 cards no topo: Saldo de Caixa, Fluxo do Mês, A Receber, A Pagar, Vencidos, Inadimplência, Margem Líquida e Runway.
- Os cards reaproveitam dados de `/financial/dashboard` e DRE, mantendo os gráficos existentes abaixo da visão executiva.
- Layout dos cards refinado para leitura em 4 colunas no desktop, com visual mais suave e botão `Explica pra mim` em cada indicador.
- Adicionada seção `Prazos e ciclo financeiro` com PMR, PMP, Ciclo de Caixa, % Recebido no Prazo e % Pago no Prazo.

### 2026-06-06 — Correção DRE de impostos

- O DRE passou a exibir Receita Líquida, Resultado Operacional e IRPJ/CSLL em linhas separadas.
- A linha de deduções antes do Lucro Bruto agora considera apenas impostos sobre faturamento (`8.1` a `8.4`), evitando deduzir IRPJ/CSLL da margem bruta.
- Cards e contexto de explicação do DRE foram atualizados para usar a nova estrutura.

### 2026-06-02 — Correção OCR de categoria fiscal

- A revisão de documentos via OCR passou a exibir um select de Categoria antes da confirmação.
- O frontend agora preserva e envia `categoryId` e `categoryCode` retornados pelo backend, evitando que uma NF seja confirmada sem categoria quando há match no plano de contas.
- Ao trocar o tipo entre Despesa e Receita na revisão OCR, a categoria selecionada é limpa para evitar categoria incompatível com o tipo da transação.

### 2026-06-02 — Correções funcionais

- Registrada a rota protegida `/conciliacao` em `src/App.tsx`.
- Adicionado item "Conciliação" na navegação lateral.
- O modal de detalhes de transação passou a enviar `categoryCode`, compatível com categorias resolvidas por empresa.
- Categorias customizadas sem vínculo com categoria global aparecem como indisponíveis para seleção no modal, evitando falha de FK no backend.

### 2026-06-02

- README atualizado para refletir o estado atual do frontend.
- Documentadas rotas reais registradas em `src/App.tsx`.
- Documentadas APIs consumidas por `src/lib/api.ts`.
- Atualizadas versões reais de React, Vite, Tailwind e demais dependências.
- Incluídas funcionalidades de OCR, relatório customizado, alertas, custos e onboarding administrativo.

### Histórico anterior

- Dashboard financeiro com indicadores e gráficos.
- Importação CSV e classificação de transações.
- Assistente financeiro com IA.
- Alertas financeiros e reunião executiva.
