import { useEffect, useState, useMemo, useCallback } from 'react';
import { financialApi } from '@/lib/api';
import { formatCurrency, formatCurrencyFull, formatDate } from '@/lib/utils';
import LoadingSpinner from '@/components/LoadingSpinner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Area, AreaChart
} from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight,
  ChevronDown, ChevronUp, ChevronRight, Filter, Info
} from 'lucide-react';

// ============================================
// TYPES
// ============================================
interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  category?: { name: string; group: string; code?: string };
}

interface DRERow {
  month: string;
  monthKey: string;
  revenue: number;
  cogs: number;
  grossProfit: number;
  opex: number;
  ebitda: number;
  netIncome: number;
}

/** Mapa de código de categoria -> nome legível */
const CATEGORY_NAMES: Record<string, string> = {
  // Receita Operacional
  '1.0': 'Receita Operacional',
  '1.1': 'Venda de Produtos',
  '1.2': 'Prestação de Serviços',
  '1.3': 'Assinaturas/Recorrência',
  '1.4': 'Comissões Recebidas',
  // Receita Não Operacional
  '2.0': 'Receita Não Operacional',
  '2.1': 'Rendimentos Financeiros',
  '2.2': 'Aluguéis Recebidos',
  '2.3': 'Venda de Ativos',
  '2.4': 'Empréstimos Recebidos',
  '2.5': 'Outras Receitas',
  // Custos Diretos
  '3.0': 'Custos Diretos',
  '3.1': 'Matéria-Prima',
  '3.2': 'Mercadoria para Revenda',
  '3.3': 'Mão de Obra Direta',
  '3.4': 'Frete sobre Vendas',
  '3.5': 'Embalagens',
  '3.6': 'Serviços de Terceiros (Produção)',
  // Despesas com Pessoal
  '4.0': 'Despesas com Pessoal',
  '4.1': 'Salários e Pró-Labore',
  '4.2': 'Encargos Trabalhistas',
  '4.3': 'Benefícios',
  '4.4': 'Prestadores PJ',
  '4.5': 'Treinamento e Capacitação',
  // Despesas Operacionais
  '5.0': 'Despesas Operacionais',
  '5.1': 'Aluguel e Condomínio',
  '5.2': 'Energia e Água',
  '5.3': 'Telecomunicações',
  '5.4': 'Software e Assinaturas',
  '5.5': 'Material de Escritório',
  '5.6': 'Manutenção e Reparos',
  '5.7': 'Seguros',
  '5.8': 'Transporte e Deslocamento',
  // Despesas Comerciais
  '6.0': 'Despesas Comerciais',
  '6.1': 'Marketing Digital',
  '6.2': 'Marketing Offline',
  '6.3': 'Comissões de Vendas',
  '6.4': 'Ferramentas de Vendas',
  '6.5': 'Brindes e Amostras',
  // Despesas Financeiras
  '7.0': 'Despesas Financeiras',
  '7.1': 'Juros de Empréstimos',
  '7.2': 'Tarifas Bancárias',
  '7.3': 'Taxas de Cartão/Maquininha',
  '7.4': 'Multas e Juros Pagos',
  '7.5': 'IOF e Encargos',
  // Impostos
  '8.0': 'Impostos e Tributos',
  '8.1': 'Simples Nacional / DAS',
  '8.2': 'ISS',
  '8.3': 'ICMS',
  '8.4': 'PIS/COFINS',
  '8.5': 'IRPJ/CSLL',
  '8.6': 'INSS Patronal',
  '8.7': 'Outros Tributos',
  // Investimentos
  '9.0': 'Investimentos (Capex)',
  '9.1': 'Equipamentos e Máquinas',
  '9.2': 'Móveis e Utensílios',
  '9.3': 'Veículos',
  '9.4': 'Desenvolvimento de Software',
  '9.5': 'Obras e Reformas',
};

/** Grupos do DRE com seus prefixos de categoria */
const DRE_GROUPS = {
  revenue: { label: 'Receita Bruta', prefixes: ['1', '2'], type: 'income' as const },
  cogs: { label: '(-) Custo dos Produtos/Serviços', prefixes: ['3'], type: 'expense' as const },
  opex: { label: '(-) Despesas Operacionais', prefixes: ['4', '5', '6', '7', '8'], type: 'expense' as const },
} as const;

/** Subgrupos dentro de Despesas Operacionais */
const OPEX_SUBGROUPS: Record<string, string> = {
  '4': 'Despesas com Pessoal',
  '5': 'Despesas Operacionais',
  '6': 'Despesas Comerciais',
  '7': 'Despesas Financeiras',
  '8': 'Impostos e Tributos',
};

interface CategoryDetail {
  code: string;
  name: string;
  values: Record<string, number>; // monthKey -> amount
  totalValue: number;
}

interface SubgroupDetail {
  prefix: string;
  name: string;
  categories: CategoryDetail[];
  totals: Record<string, number>; // monthKey -> total
  totalValue: number;
}

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function formatMonthLabel(monthKey: string): string {
  const [year, m] = monthKey.split('-');
  return `${MONTH_NAMES[parseInt(m) - 1]}/${year.slice(2)}`;
}

// ============================================
// DATA TRANSFORMATION
// ============================================

/**
 * Transforma os dados brutos do backend em DRERow[] consolidados.
 * Backend retorna: { "2025-01": { "1.0": 5000, "3.1": 2000, "5.2": 800 }, ... }
 */
function transformDREData(rawData: any): { rows: DRERow[]; monthKeys: string[] } {
  if (!rawData || typeof rawData !== 'object' || Array.isArray(rawData)) {
    return { rows: [], monthKeys: [] };
  }

  const monthKeys = Object.keys(rawData).sort();

  const rows = monthKeys.map((monthKey) => {
    const cats = rawData[monthKey] || {};
    let revenue = 0;
    let cogs = 0;
    let opex = 0;

    Object.entries(cats).forEach(([code, amount]) => {
      const val = Number(amount) || 0;
      const prefix = code.split('.')[0];
      switch (prefix) {
        case '1': case '2': revenue += val; break;
        case '3': cogs += val; break;
        case '4': case '5': case '6': case '7': case '8': opex += val; break;
      }
    });

    const grossProfit = revenue - cogs;
    const ebitda = grossProfit - opex;

    return {
      month: formatMonthLabel(monthKey),
      monthKey,
      revenue,
      cogs,
      grossProfit,
      opex,
      ebitda,
      netIncome: ebitda,
    };
  });

  return { rows, monthKeys };
}

/**
 * Extrai categorias detalhadas de um grupo DRE a partir dos dados brutos.
 * Retorna apenas categorias que possuem lançamentos (valor != 0).
 */
function extractCategoryDetails(
  rawData: any,
  monthKeys: string[],
  prefixes: string[]
): CategoryDetail[] {
  if (!rawData || monthKeys.length === 0) return [];

  const categoryMap: Record<string, CategoryDetail> = {};

  monthKeys.forEach((monthKey) => {
    const cats = rawData[monthKey] || {};
    Object.entries(cats).forEach(([code, amount]) => {
      const prefix = code.split('.')[0];
      if (!prefixes.includes(prefix)) return;
      // Ignorar códigos de grupo pai (ex: "1.0", "3.0") — agregar apenas subcategorias
      // Mas se o backend retorna no código pai, incluir também
      const val = Number(amount) || 0;
      if (val === 0) return;

      if (!categoryMap[code]) {
        categoryMap[code] = {
          code,
          name: CATEGORY_NAMES[code] || `Categoria ${code}`,
          values: {},
          totalValue: 0,
        };
      }
      categoryMap[code].values[monthKey] = (categoryMap[code].values[monthKey] || 0) + val;
      categoryMap[code].totalValue += val;
    });
  });

  return Object.values(categoryMap)
    .filter(c => c.totalValue !== 0)
    .sort((a, b) => a.code.localeCompare(b.code));
}

/**
 * Extrai subgrupos de OPEX (Pessoal, Operacional, Comercial, etc.)
 * com suas categorias filhas.
 */
function extractOpexSubgroups(
  rawData: any,
  monthKeys: string[]
): SubgroupDetail[] {
  if (!rawData || monthKeys.length === 0) return [];

  const subgroups: SubgroupDetail[] = [];

  Object.entries(OPEX_SUBGROUPS).forEach(([prefix, name]) => {
    const categories = extractCategoryDetails(rawData, monthKeys, [prefix]);
    if (categories.length === 0) return;

    const totals: Record<string, number> = {};
    monthKeys.forEach(mk => {
      totals[mk] = categories.reduce((sum, cat) => sum + (cat.values[mk] || 0), 0);
    });

    subgroups.push({
      prefix,
      name,
      categories,
      totals,
      totalValue: categories.reduce((sum, c) => sum + c.totalValue, 0),
    });
  });

  return subgroups;
}

// ============================================
// DRE TABLE COMPONENT
// ============================================
function DRETable({
  dreData,
  rawDreData,
  monthKeys,
}: {
  dreData: DRERow[];
  rawDreData: any;
  monthKeys: string[];
}) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [expandedSubgroups, setExpandedSubgroups] = useState<Set<string>>(new Set());

  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
        // Fechar subgrupos quando fechar a seção pai
        if (section === 'opex') {
          setExpandedSubgroups(new Set());
        }
      } else {
        next.add(section);
      }
      return next;
    });
  }, []);

  const toggleSubgroup = useCallback((prefix: string) => {
    setExpandedSubgroups(prev => {
      const next = new Set(prev);
      if (next.has(prefix)) next.delete(prefix);
      else next.add(prefix);
      return next;
    });
  }, []);

  // Pré-computar detalhes de cada seção
  const revenueDetails = useMemo(
    () => extractCategoryDetails(rawDreData, monthKeys, ['1', '2']),
    [rawDreData, monthKeys]
  );

  const cogsDetails = useMemo(
    () => extractCategoryDetails(rawDreData, monthKeys, ['3']),
    [rawDreData, monthKeys]
  );

  const opexSubgroups = useMemo(
    () => extractOpexSubgroups(rawDreData, monthKeys),
    [rawDreData, monthKeys]
  );

  if (dreData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <Info className="w-10 h-10 mb-3" />
        <p className="text-sm font-medium">Nenhum dado para o DRE</p>
        <p className="text-xs mt-1">Importe transações via CSV para gerar o DRE automaticamente</p>
      </div>
    );
  }

  const hasDetails = (section: string) => {
    switch (section) {
      case 'revenue': return revenueDetails.length > 0;
      case 'cogs': return cogsDetails.length > 0;
      case 'opex': return opexSubgroups.length > 0;
      default: return false;
    }
  };

  const renderExpandIcon = (section: string) => {
    if (!hasDetails(section)) return null;
    const isExpanded = expandedSections.has(section);
    return isExpanded
      ? <ChevronDown className="w-4 h-4 text-slate-400 inline-block mr-1" />
      : <ChevronRight className="w-4 h-4 text-slate-400 inline-block mr-1" />;
  };

  const renderSubgroupExpandIcon = (prefix: string) => {
    const isExpanded = expandedSubgroups.has(prefix);
    return isExpanded
      ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 inline-block mr-1" />
      : <ChevronRight className="w-3.5 h-3.5 text-slate-400 inline-block mr-1" />;
  };

  /** Renderiza linhas de categorias detalhadas (subcategorias) */
  const renderCategoryRows = (categories: CategoryDetail[], indent: number = 1) => {
    return categories.map((cat) => (
      <tr key={cat.code} className="border-b border-slate-50 bg-slate-50/50">
        <td className="py-2.5 text-slate-500 text-xs" style={{ paddingLeft: `${1.5 + indent * 1.25}rem` }}>
          <span className="text-slate-300 mr-1.5">{cat.code}</span>
          {cat.name}
        </td>
        {monthKeys.map((mk) => (
          <td key={mk} className="py-2.5 px-4 text-right text-xs text-slate-500">
            {(cat.values[mk] || 0) !== 0 ? formatCurrency(cat.values[mk] || 0) : '—'}
          </td>
        ))}
      </tr>
    ));
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="text-left py-3 px-6 text-slate-500 font-medium min-w-[280px]">Conta</th>
            {dreData.map((d, i) => (
              <th key={i} className="text-right py-3 px-4 text-slate-500 font-medium min-w-[100px]">{d.month}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* ========== RECEITA BRUTA ========== */}
          <tr
            className={`border-b border-slate-100 font-semibold ${hasDetails('revenue') ? 'cursor-pointer hover:bg-emerald-50/50' : ''}`}
            onClick={() => hasDetails('revenue') && toggleSection('revenue')}
          >
            <td className="py-3 px-6 text-slate-900">
              {renderExpandIcon('revenue')}
              Receita Bruta
            </td>
            {dreData.map((d, i) => (
              <td key={i} className="py-3 px-4 text-right text-emerald-600">{formatCurrency(d.revenue)}</td>
            ))}
          </tr>
          {expandedSections.has('revenue') && renderCategoryRows(revenueDetails)}

          {/* ========== CUSTOS DIRETOS ========== */}
          <tr
            className={`border-b border-slate-100 ${hasDetails('cogs') ? 'cursor-pointer hover:bg-red-50/50' : ''}`}
            onClick={() => hasDetails('cogs') && toggleSection('cogs')}
          >
            <td className="py-3 px-6 text-slate-700">
              {renderExpandIcon('cogs')}
              (-) Custo dos Produtos/Serviços
            </td>
            {dreData.map((d, i) => (
              <td key={i} className="py-3 px-4 text-right text-red-500">{formatCurrency(-d.cogs)}</td>
            ))}
          </tr>
          {expandedSections.has('cogs') && renderCategoryRows(cogsDetails)}

          {/* ========== LUCRO BRUTO ========== */}
          <tr className="border-b border-slate-200 bg-blue-50 font-semibold">
            <td className="py-3 px-6 text-slate-900">= Lucro Bruto</td>
            {dreData.map((d, i) => (
              <td key={i} className={`py-3 px-4 text-right font-semibold ${d.grossProfit >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                {formatCurrency(d.grossProfit)}
              </td>
            ))}
          </tr>

          {/* ========== DESPESAS OPERACIONAIS ========== */}
          <tr
            className={`border-b border-slate-100 ${hasDetails('opex') ? 'cursor-pointer hover:bg-red-50/50' : ''}`}
            onClick={() => hasDetails('opex') && toggleSection('opex')}
          >
            <td className="py-3 px-6 text-slate-700">
              {renderExpandIcon('opex')}
              (-) Despesas Operacionais
            </td>
            {dreData.map((d, i) => (
              <td key={i} className="py-3 px-4 text-right text-red-500">{formatCurrency(-d.opex)}</td>
            ))}
          </tr>

          {/* Subgrupos de OPEX (Pessoal, Operacional, Comercial, etc.) */}
          {expandedSections.has('opex') && opexSubgroups.map((sg) => (
            <React.Fragment key={sg.prefix}>
              {/* Linha do subgrupo (ex: Despesas com Pessoal) */}
              <tr
                className="border-b border-slate-50 bg-orange-50/30 cursor-pointer hover:bg-orange-50/60"
                onClick={(e) => { e.stopPropagation(); toggleSubgroup(sg.prefix); }}
              >
                <td className="py-2.5 text-slate-700 text-xs font-semibold" style={{ paddingLeft: '2.25rem' }}>
                  {renderSubgroupExpandIcon(sg.prefix)}
                  {sg.name}
                </td>
                {monthKeys.map((mk) => (
                  <td key={mk} className="py-2.5 px-4 text-right text-xs font-semibold text-red-400">
                    {(sg.totals[mk] || 0) !== 0 ? formatCurrency(-(sg.totals[mk] || 0)) : '—'}
                  </td>
                ))}
              </tr>
              {/* Categorias filhas do subgrupo */}
              {expandedSubgroups.has(sg.prefix) && renderCategoryRows(sg.categories, 2)}
            </React.Fragment>
          ))}

          {/* ========== EBITDA ========== */}
          <tr className="border-b border-slate-200 bg-blue-50 font-semibold">
            <td className="py-3 px-6 text-slate-900">= EBITDA</td>
            {dreData.map((d, i) => (
              <td key={i} className={`py-3 px-4 text-right font-semibold ${d.ebitda >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                {formatCurrency(d.ebitda)}
              </td>
            ))}
          </tr>

          {/* ========== RESULTADO LÍQUIDO ========== */}
          <tr className="bg-emerald-50 font-bold">
            <td className="py-3 px-6 text-slate-900">= Resultado Líquido</td>
            {dreData.map((d, i) => (
              <td key={i} className={`py-3 px-4 text-right ${d.netIncome >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                {formatCurrency(d.netIncome)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================
import React from 'react';

export default function Dashboards() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dreData, setDreData] = useState<DRERow[]>([]);
  const [rawDreData, setRawDreData] = useState<any>(null);
  const [monthKeys, setMonthKeys] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState<'overview' | 'dre' | 'transactions'>('overview');
  const [txPage, setTxPage] = useState(1);
  const [txFilter, setTxFilter] = useState<'all' | 'INCOME' | 'EXPENSE'>('all');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [txPage, txFilter]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [dreRes] = await Promise.allSettled([
        financialApi.dre(12),
      ]);
      if (dreRes.status === 'fulfilled') {
        const raw = dreRes.value.data.data || dreRes.value.data || {};
        setRawDreData(raw);
        const { rows, monthKeys: mks } = transformDREData(raw);
        setDreData(rows);
        setMonthKeys(mks);
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      const res = await financialApi.transactions(txPage, txFilter === 'all' ? undefined : txFilter);
      setTransactions(res.data.data?.transactions || res.data.transactions || res.data.data || []);
    } catch (err) {
      console.error('Erro ao carregar transações:', err);
    }
  };

  // Agrupar despesas por categoria para pie chart
  const expensesByCategory = useMemo(() => {
    return transactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((acc, t) => {
        const cat = t.category?.name || 'Outros';
        acc[cat] = (acc[cat] || 0) + Math.abs(t.amount);
        return acc;
      }, {} as Record<string, number>);
  }, [transactions]);

  const pieData = useMemo(() => {
    return Object.entries(expensesByCategory)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [expensesByCategory]);

  // Dados para gráfico de Tendência de Receita
  const revenueChartData = useMemo(() => {
    if (dreData.length > 0) return dreData;
    return [];
  }, [dreData]);

  // Dados para gráfico de Margens (percentuais)
  const marginsChartData = useMemo(() => {
    return dreData.map(d => ({
      month: d.month,
      margemBruta: d.revenue > 0 ? ((d.grossProfit / d.revenue) * 100) : 0,
      ebitda: d.revenue > 0 ? ((d.ebitda / d.revenue) * 100) : 0,
      lucroLiquido: d.revenue > 0 ? ((d.netIncome / d.revenue) * 100) : 0,
    }));
  }, [dreData]);

  if (isLoading) return <LoadingSpinner message="Carregando dashboards..." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Dashboards</h2>
          <p className="text-sm text-slate-500 mt-1">Visão detalhada das finanças</p>
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {[
            { id: 'overview' as const, label: 'Visão Geral' },
            { id: 'dre' as const, label: 'DRE' },
            { id: 'transactions' as const, label: 'Transações' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                activeView === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ========== OVERVIEW ========== */}
      {activeView === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Trend */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Tendência de Receita</h3>
            {revenueChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={revenueChartData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="url(#colorRevenue)" strokeWidth={2} name="Receita" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[250px] text-slate-400">
                <Info className="w-8 h-8 mb-2" />
                <p className="text-sm">Nenhum dado de receita disponível</p>
                <p className="text-xs mt-1">Importe um CSV para visualizar tendências</p>
              </div>
            )}
          </div>

          {/* Expenses by Category */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Despesas por Categoria</h3>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" nameKey="name" paddingAngle={2}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[250px] text-slate-400">
                <Info className="w-8 h-8 mb-2" />
                <p className="text-sm">Nenhuma despesa registrada</p>
                <p className="text-xs mt-1">Importe um CSV para visualizar categorias</p>
              </div>
            )}
            {pieData.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {pieData.map((item, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs text-slate-600">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    {item.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Margins */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 lg:col-span-2">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Margens</h3>
            {marginsChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={marginsChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `${v.toFixed(0)}%`} />
                  <Tooltip
                    formatter={(v: number) => `${v.toFixed(1)}%`}
                    contentStyle={{ borderRadius: 8, fontSize: 12 }}
                  />
                  <Line type="monotone" dataKey="margemBruta" stroke="#10b981" strokeWidth={2} name="Margem Bruta" dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="ebitda" stroke="#3b82f6" strokeWidth={2} name="EBITDA %" dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="lucroLiquido" stroke="#8b5cf6" strokeWidth={2} name="Lucro Líquido %" dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[250px] text-slate-400">
                <Info className="w-8 h-8 mb-2" />
                <p className="text-sm">Nenhum dado de margem disponível</p>
                <p className="text-xs mt-1">Importe um CSV para visualizar margens</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========== DRE EXPANSÍVEL ========== */}
      {activeView === 'dre' && (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900">Demonstração de Resultado do Exercício</h3>
            <p className="text-xs text-slate-400 mt-1">Clique nas linhas principais para expandir o detalhamento por categoria</p>
          </div>
          <DRETable dreData={dreData} rawDreData={rawDreData} monthKeys={monthKeys} />
        </div>
      )}

      {/* ========== TRANSACTIONS ========== */}
      {activeView === 'transactions' && (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Transações</h3>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={txFilter}
                onChange={(e) => { setTxFilter(e.target.value as any); setTxPage(1); }}
                className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todas</option>
                <option value="INCOME">Receitas</option>
                <option value="EXPENSE">Despesas</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left py-3 px-6 text-slate-500 font-medium">Data</th>
                  <th className="text-left py-3 px-4 text-slate-500 font-medium">Descrição</th>
                  <th className="text-left py-3 px-4 text-slate-500 font-medium">Categoria</th>
                  <th className="text-right py-3 px-6 text-slate-500 font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-400">
                      Nenhuma transação encontrada. Importe um CSV ou adicione manualmente.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-6 text-slate-600">{formatDate(tx.date)}</td>
                      <td className="py-3 px-4 text-slate-900">{tx.description}</td>
                      <td className="py-3 px-4">
                        <span className="text-xs px-2 py-1 bg-slate-100 rounded-full text-slate-600">
                          {tx.category?.name || 'Sem categoria'}
                        </span>
                      </td>
                      <td className={`py-3 px-6 text-right font-medium ${
                        tx.type === 'INCOME' ? 'text-emerald-600' : 'text-red-600'
                      }`}>
                        {tx.type === 'INCOME' ? '+' : '-'}{formatCurrencyFull(Math.abs(tx.amount))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {transactions.length > 0 && (
            <div className="p-4 flex items-center justify-center gap-2">
              <button
                onClick={() => setTxPage(p => Math.max(1, p - 1))}
                disabled={txPage === 1}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg disabled:opacity-50 hover:bg-slate-50"
              >
                Anterior
              </button>
              <span className="text-sm text-slate-500">Página {txPage}</span>
              <button
                onClick={() => setTxPage(p => p + 1)}
                disabled={transactions.length < 50}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg disabled:opacity-50 hover:bg-slate-50"
              >
                Próxima
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
