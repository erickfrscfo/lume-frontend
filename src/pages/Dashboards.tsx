import { useEffect, useState, useMemo, useCallback } from 'react';
import { aiApi, financialApi } from '@/lib/api';
import { formatCurrency, formatCurrencyFull, formatDate } from '@/lib/utils';
import LoadingSpinner from '@/components/LoadingSpinner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Area, AreaChart
} from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight,
  ChevronDown, ChevronUp, ChevronRight, Filter, Info, Download, Loader2
} from 'lucide-react';
import { ExplainButton } from '@/components/ExplainModal';
import DateRangePicker from '@/components/DateRangePicker';
import CostClassificationModal from '@/components/CostClassificationModal';
import ConciliacaoDashboardBlock from '../components/ConciliacaoDashboardBlock';
import TransactionDetailModal from '@/components/TransactionDetailModal';

// ============================================
// TYPES
// ============================================
interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type?: 'INCOME' | 'EXPENSE';
  tipo_transacao?: 'INCOME' | 'EXPENSE';
  tipo_custo?: 'FIXO' | 'VARIAVEL' | null;
  costConfidence?: number | null;
  status?: string;
  source?: string;
  category?: { name: string; group: string; code?: string };
  counterparty?: { id: string; name: string; document: string | null; type: string | null } | null;
  detail?: {
    dueDate: string | null;
    paymentDate: string | null;
    receiptDate: string | null;
    amountOriginal: number | null;
    amountPaid: number | null;
    amountReceived: number | null;
    discount: number | null;
    interest: number | null;
    documentNumber: string | null;
    bankReference: string | null;
    reconciliationStatus: string | null;
    notes: string | null;
  } | null;
  notes?: string;
}

// ============================================
// FRENTE 4: DRERow SEM ebitda
// Estrutura: Receita - CMV - Impostos = Lucro Bruto - Opex = Resultado Líquido
// ============================================
interface DRERow {
  month: string;
  monthKey: string;
  revenue: number;
  cogs: number;
  taxes: number;        // NOVO: Impostos e Tributos (8.x) separados
  grossProfit: number;  // = revenue - cogs - taxes
  opex: number;
  netIncome: number;    // = grossProfit - opex
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
  // Custos de Mercadoria Vendida (CMV)
  '3.0': 'Custos de Mercadoria Vendida',
  '3.1': 'Matéria-Prima',
  '3.2': 'Custos de Mercadoria Vendida',
  '3.3': 'Mão de Obra Direta',
  '3.4': 'Frete sobre Vendas',
  '3.5': 'Custos de Mercadoria Vendida',
  '3.6': 'Serviços de Terceiros (Produção)',
  // Despesas com Pessoal
  '4.0': 'Despesas com Pessoal',
  '4.1': 'Salários e Pró-Labore',
  '4.2': 'Encargos Trabalhistas',
  '4.3': 'Benefícios',
  '4.4': 'Prestadores PJ',
  '4.5': 'Treinamento e Capacitação',
  '4.6': 'INSS Patronal',  // FRENTE 4/5: movido de 8.6 para 4.6
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
  '8.7': 'Outros Tributos',
  // Investimentos
  '9.0': 'Investimentos (Capex)',
  '9.1': 'Equipamentos e Máquinas',
  '9.2': 'Móveis e Utensílios',
  '9.3': 'Veículos',
  '9.4': 'Desenvolvimento de Software',
  '9.5': 'Obras e Reformas',
};

// ============================================
// FRENTE 4: OPEX_SUBGROUPS sem grupo 8 (impostos separados)
// ============================================
/** Subgrupos dentro de Despesas Operacionais */
const OPEX_SUBGROUPS: Record<string, string> = {
  '4': 'Despesas com Pessoal',
  '5': 'Despesas Operacionais',
  '6': 'Despesas Comerciais',
  '7': 'Despesas Financeiras',
  // '8' REMOVIDO — Impostos agora são linha separada no DRE (antes do Lucro Bruto)
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

/** Helper: retorna o tipo da transação, compatível com 'type' e 'tipo_transacao' */
function getTxType(tx: Transaction): 'INCOME' | 'EXPENSE' {
  return tx.tipo_transacao || tx.type || 'EXPENSE';
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
 * FRENTE 4: Transforma os dados brutos do backend em DRERow[] consolidados.
 * NOVA ESTRUTURA:
 *   Receita Bruta
 *   (-) Custos Diretos (CMV/CSP/CPV)
 *   (-) Impostos e Tributos (8.x)
 *   = Lucro Bruto
 *   (-) Despesas Operacionais (4.x + 5.x + 6.x + 7.x + 9.x, exceto directCost)
 *   = Resultado Líquido
 */
function transformDREData(rawData: any, profile?: { directCostCodes: string[]; excludeFromDirectCost?: string[]; taxCodes?: string[] } | null): { rows: DRERow[]; monthKeys: string[] } {
  if (!rawData || typeof rawData !== 'object' || Array.isArray(rawData)) {
    return { rows: [], monthKeys: [] };
  }

  const monthKeys = Object.keys(rawData).sort();

  // Usar perfil dinâmico para determinar custos diretos e impostos
  const directCostCodes = profile?.directCostCodes || ['3.'];
  const excludeCodes = profile?.excludeFromDirectCost || [];
  const taxCodes = profile?.taxCodes || ['8.'];

  const rows = monthKeys.map((monthKey) => {
    const cats = rawData[monthKey] || {};
    let revenue = 0;
    let cogs = 0;
    let taxes = 0;
    let opex = 0;

    Object.entries(cats).forEach(([code, amount]) => {
      const val = Number(amount) || 0;
      const prefix = code.split('.')[0];

      // Receita (1.x + 2.x)
      if (prefix === '1' || prefix === '2') {
        revenue += val;
        return;
      }

      // Verificar se é custo direto conforme perfil
      const isDirectCost = directCostCodes.some(p => code.startsWith(p));
      const isExcluded = excludeCodes.some(p => code.startsWith(p));

      // Verificar se é imposto/tributo
      const isTax = taxCodes.some(p => code.startsWith(p));

      if (isDirectCost && !isExcluded) {
        cogs += val;
      } else if (isTax) {
        taxes += val;  // FRENTE 4: Impostos separados
      } else if (['3', '4', '5', '6', '7', '9'].includes(prefix)) {
        opex += val;
      }
    });

    // FRENTE 4: Nova fórmula
    // Lucro Bruto = Receita - CMV - Impostos
    const grossProfit = revenue - cogs - taxes;
    // Resultado Líquido = Lucro Bruto - Opex
    const netIncome = grossProfit - opex;

    return {
      month: formatMonthLabel(monthKey),
      monthKey,
      revenue,
      cogs,
      taxes,
      grossProfit,
      opex,
      netIncome,
    };
  });

  return { rows, monthKeys };
}

/**
 * Extrai categorias detalhadas de um grupo DRE a partir dos dados brutos.
 * Retorna apenas categorias que possuem lançamentos (valor != 0).
 * @param prefixes - prefixos inteiros (ex: ['1', '2']) para match por split('.')[0]
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
 * Extrai categorias que são custo direto conforme o perfil DRE.
 * Usa startsWith para match preciso (ex: "3.3" match "3.3" mas não "3.1").
 */
function extractDirectCostDetails(
  rawData: any,
  monthKeys: string[],
  directCostCodes: string[],
  excludeFromDirectCost: string[] = []
): CategoryDetail[] {
  if (!rawData || monthKeys.length === 0) return [];

  const categoryMap: Record<string, CategoryDetail> = {};

  monthKeys.forEach((monthKey) => {
    const cats = rawData[monthKey] || {};
    Object.entries(cats).forEach(([code, amount]) => {
      // Verificar se é custo direto conforme perfil
      const isDirectCost = directCostCodes.some(p => code.startsWith(p));
      const isExcluded = excludeFromDirectCost.some(p => code.startsWith(p));
      if (!isDirectCost || isExcluded) return;

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
 * FRENTE 4: Extrai categorias de impostos/tributos (8.x) para detalhamento.
 */
function extractTaxDetails(
  rawData: any,
  monthKeys: string[],
  taxCodes: string[] = ['8.']
): CategoryDetail[] {
  if (!rawData || monthKeys.length === 0) return [];

  const categoryMap: Record<string, CategoryDetail> = {};

  monthKeys.forEach((monthKey) => {
    const cats = rawData[monthKey] || {};
    Object.entries(cats).forEach(([code, amount]) => {
      const isTax = taxCodes.some(p => code.startsWith(p));
      if (!isTax) return;

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
 * FRENTE 4: Extrai subgrupos de OPEX (Pessoal, Operacional, Comercial, Financeiro)
 * EXCLUI categorias que já foram contadas como custo direto OU como imposto.
 */
function extractOpexSubgroups(
  rawData: any,
  monthKeys: string[],
  directCostCodes: string[] = [],
  excludeFromDirectCost: string[] = [],
  taxCodes: string[] = ['8.']
): SubgroupDetail[] {
  if (!rawData || monthKeys.length === 0) return [];

  // Função helper: verifica se um código de categoria é custo direto
  const isDirectCostCode = (code: string): boolean => {
    const isExcluded = excludeFromDirectCost.some(p => code.startsWith(p));
    if (isExcluded) return false;
    return directCostCodes.some(p => code.startsWith(p));
  };

  // Função helper: verifica se é imposto
  const isTaxCode = (code: string): boolean => {
    return taxCodes.some(p => code.startsWith(p));
  };

  const subgroups: SubgroupDetail[] = [];

  Object.entries(OPEX_SUBGROUPS).forEach(([prefix, name]) => {
    // Extrair todas as categorias do prefixo
    const allCategories = extractCategoryDetails(rawData, monthKeys, [prefix]);
    // Filtrar: remover categorias que já são custo direto OU imposto
    const categories = allCategories.filter(cat => !isDirectCostCode(cat.code) && !isTaxCode(cat.code));
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
// FRENTE 4: Nova estrutura sem EBITDA, com Impostos separados
// ============================================
function DRETable({
  dreData,
  rawDreData,
  monthKeys,
  dreProfile,
}: {
  dreData: DRERow[];
  rawDreData: any;
  monthKeys: string[];
  dreProfile?: { sectorKey: string; sectorLabel: string; directCostLabel: string; grossProfitLabel: string; directCostCodes: string[]; excludeFromDirectCost?: string[]; taxCodes?: string[] } | null;
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

  // Códigos de custo direto do perfil DRE
  const directCostCodes = useMemo(() => {
    return dreProfile?.directCostCodes || ['3.'];
  }, [dreProfile]);

  const excludeFromDirectCost = useMemo(() => {
    return dreProfile?.excludeFromDirectCost || [];
  }, [dreProfile]);

  const taxCodes = useMemo(() => {
    return dreProfile?.taxCodes || ['8.'];
  }, [dreProfile]);

  // Usar extractDirectCostDetails para filtrar por código preciso (startsWith)
  const cogsDetails = useMemo(
    () => extractDirectCostDetails(rawDreData, monthKeys, directCostCodes, excludeFromDirectCost),
    [rawDreData, monthKeys, directCostCodes, excludeFromDirectCost]
  );

  // FRENTE 4: Detalhes de impostos
  const taxDetails = useMemo(
    () => extractTaxDetails(rawDreData, monthKeys, taxCodes),
    [rawDreData, monthKeys, taxCodes]
  );

  // OPEX: excluir categorias que já são custo direto OU imposto
  const opexSubgroups = useMemo(
    () => extractOpexSubgroups(rawDreData, monthKeys, directCostCodes, excludeFromDirectCost, taxCodes),
    [rawDreData, monthKeys, directCostCodes, excludeFromDirectCost, taxCodes]
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
      case 'taxes': return taxDetails.length > 0;
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
              (-) {dreProfile?.directCostLabel || 'Custos de Mercadoria Vendida (CMV)'}
            </td>
            {dreData.map((d, i) => (
              <td key={i} className="py-3 px-4 text-right text-red-500">{formatCurrency(-d.cogs)}</td>
            ))}
          </tr>
          {expandedSections.has('cogs') && renderCategoryRows(cogsDetails)}

          {/* ========== IMPOSTOS E TRIBUTOS (FRENTE 4: nova linha) ========== */}
          <tr
            className={`border-b border-slate-100 ${hasDetails('taxes') ? 'cursor-pointer hover:bg-amber-50/50' : ''}`}
            onClick={() => hasDetails('taxes') && toggleSection('taxes')}
          >
            <td className="py-3 px-6 text-slate-700">
              {renderExpandIcon('taxes')}
              (-) Impostos e Tributos
            </td>
            {dreData.map((d, i) => (
              <td key={i} className="py-3 px-4 text-right text-amber-600">{formatCurrency(-d.taxes)}</td>
            ))}
          </tr>
          {expandedSections.has('taxes') && renderCategoryRows(taxDetails)}

          {/* ========== LUCRO BRUTO ========== */}
          <tr className="border-b border-slate-200 bg-blue-50 font-semibold">
            <td className="py-3 px-6 text-slate-900">= {dreProfile?.grossProfitLabel || 'Lucro Bruto'}</td>
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

          {/* Subgrupos de OPEX (Pessoal, Operacional, Comercial, Financeiro) */}
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

          {/* ========== RESULTADO LÍQUIDO (FRENTE 4: sem EBITDA) ========== */}
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
  const [dreProfile, setDreProfile] = useState<{ sectorKey: string; sectorLabel: string; directCostLabel: string; grossProfitLabel: string; directCostCodes: string[]; excludeFromDirectCost?: string[]; taxCodes?: string[] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState<'overview' | 'dre' | 'transactions'>('overview');
  const [txPage, setTxPage] = useState(1);
  const [txFilter, setTxFilter] = useState<'all' | 'INCOME' | 'EXPENSE'>('all');
  const [txStartDate, setTxStartDate] = useState('');
  const [txEndDate, setTxEndDate] = useState('');
  const [appliedStartDate, setAppliedStartDate] = useState('');
  const [appliedEndDate, setAppliedEndDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [pendingClassifications, setPendingClassifications] = useState<any[]>([]);
  const [showCostModal, setShowCostModal] = useState(false);
  const [isClassifying, setIsClassifying] = useState(false);
  const [txCategoryFilter, setTxCategoryFilter] = useState<string>('all');
  const [txCostTypeFilter, setTxCostTypeFilter] = useState<'all' | 'FIXO' | 'VARIAVEL'>('all');
  const [txStatusFilter, setTxStatusFilter] = useState<'all' | 'PENDING' | 'COMPLETED' | 'OVERDUE'>('all');
  const [txDueDateStart, setTxDueDateStart] = useState('');
  const [txDueDateEnd, setTxDueDateEnd] = useState('');
  const [appliedDueDateStart, setAppliedDueDateStart] = useState('');
  const [appliedDueDateEnd, setAppliedDueDateEnd] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Ler query params da URL para deep-linking (ex: ?tab=transactions&status=PENDING)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    const status = params.get('status');
    if (tab === 'transactions') {
      setActiveView('transactions');
    }
    if (status === 'PENDING' || status === 'COMPLETED' || status === 'OVERDUE') {
      setTxStatusFilter(status);
    }
  }, []);

  useEffect(() => {
    loadData();
    fetchPendingCostClassifications();
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [txPage, txFilter, appliedStartDate, appliedEndDate, txStatusFilter, appliedDueDateStart, appliedDueDateEnd]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [dreRes] = await Promise.allSettled([
        financialApi.dre(12),
      ]);
      if (dreRes.status === 'fulfilled') {
        const dreResponse = dreRes.value.data;
        const raw = dreResponse.data || dreResponse || {};
        setRawDreData(raw);
        const profile = dreResponse.profile || null;
        setDreProfile(profile);
        const { rows, monthKeys: mks } = transformDREData(raw, profile);
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
      const res = await financialApi.transactions(
        txPage,
        txFilter === 'all' ? undefined : txFilter,
        appliedStartDate || undefined,
        appliedEndDate || undefined,
        txStatusFilter === 'all' ? undefined : txStatusFilter,
        appliedDueDateStart || undefined,
        appliedDueDateEnd || undefined
      );
      setTransactions(res.data.data || []);
    } catch (err) {
      console.error('Erro ao carregar transações:', err);
    }
  };

  const fetchPendingCostClassifications = async () => {
    try {
      const res = await aiApi.getPendingCostClassifications();
      const data = res.data.data || res.data || [];
      if (Array.isArray(data) && data.length > 0) {
        setPendingClassifications(data);
        setShowCostModal(true);
      }
    } catch (err) {
      console.error('Erro ao buscar classificações pendentes:', err);
    }
  };

  const handleClassifyAll = async () => {
    setIsClassifying(true);
    try {
      const ids = pendingClassifications.map((t: any) => t.id);
      await aiApi.classifyCostType(ids);
      setPendingClassifications([]);
      setShowCostModal(false);
      loadTransactions();
    } catch (err) {
      console.error('Erro ao classificar custos:', err);
    } finally {
      setIsClassifying(false);
    }
  };

  const applyDateFilter = () => {
    setAppliedStartDate(txStartDate);
    setAppliedEndDate(txEndDate);
    setTxPage(1);
  };

  const clearDateFilter = () => {
    setTxStartDate('');
    setTxEndDate('');
    setAppliedStartDate('');
    setAppliedEndDate('');
    setTxPage(1);
  };

  // ============================================
  // EXPORT TO EXCEL
  // Busca TODAS as páginas respeitando filtros ativos
  // ============================================
  const exportToExcel = async () => {
    setIsExporting(true);
    try {
      // Buscar todas as transações paginadas com os filtros atuais
      const allTransactions: Transaction[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const res = await financialApi.transactions(
          page,
          txFilter === 'all' ? undefined : txFilter,
          appliedStartDate || undefined,
          appliedEndDate || undefined,
          txStatusFilter === 'all' ? undefined : txStatusFilter,
          appliedDueDateStart || undefined,
          appliedDueDateEnd || undefined
        );
        const txs = res.data.data || [];
        allTransactions.push(...txs);
        hasMore = txs.length >= 50;
        page++;
        // Safety: max 100 pages (5000 transações)
        if (page > 100) break;
      }

      if (allTransactions.length === 0) {
        alert('Nenhuma transação para exportar com os filtros atuais.');
        return;
      }

      // Importar SheetJS dinamicamente
      const XLSX = await import('xlsx');

      // Formatar dados conforme especificação:
      // Ordem: Data, Tipo, Categoria, Descrição, Valor
      // Data: DD/MM/AAAA | Valor: negativo, formato R$xx,xx
      const rows = allTransactions.map((tx) => {
        // Formatar data DD/MM/AAAA
        // CORREÇÃO TIMEZONE: Usar getUTC* para evitar que datas UTC meia-noite
        // (ex: 2026-04-01T00:00:00.000Z) sejam exibidas como dia anterior em UTC-3.
        const d = new Date(tx.date + (tx.date.includes('T') ? '' : 'T00:00:00Z'));
        const dd = String(d.getUTCDate()).padStart(2, '0');
        const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
        const yyyy = d.getUTCFullYear();
        const dataFormatada = `${dd}/${mm}/${yyyy}`;

        // Tipo legível
        const tipo = getTxType(tx) === 'INCOME' ? 'Receita' : 'Despesa';

        // Categoria
        const categoria = tx.category?.name || 'Sem categoria';

        // Descrição
        const descricao = tx.description;

        // Valor: sempre negativo para despesas, positivo para receitas
        // Formato monetário R$xx,xx
        const valorNum = Math.abs(tx.amount);
        const valorFinal = getTxType(tx) === 'EXPENSE' ? -valorNum : valorNum;
        const valorFormatado = `R$ ${valorFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        return {
          'Data': dataFormatada,
          'Tipo': tipo,
          'Categoria': categoria,
          'Descrição': descricao,
          'Valor': valorFormatado,
        };
      });

      // Criar workbook e worksheet
      const ws = XLSX.utils.json_to_sheet(rows);

      // Ajustar largura das colunas
      ws['!cols'] = [
        { wch: 12 },  // Data
        { wch: 10 },  // Tipo
        { wch: 30 },  // Categoria
        { wch: 50 },  // Descrição
        { wch: 18 },  // Valor
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Transações');

      // Gerar nome do arquivo com filtros aplicados
      const parts = ['transacoes'];
      if (txFilter !== 'all') parts.push(txFilter === 'INCOME' ? 'receitas' : 'despesas');
      if (appliedStartDate) parts.push(`de_${appliedStartDate}`);
      if (appliedEndDate) parts.push(`ate_${appliedEndDate}`);
      const fileName = `${parts.join('_')}.xlsx`;

      // Download
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error('Erro ao exportar:', err);
      alert('Erro ao exportar transações. Tente novamente.');
    } finally {
      setIsExporting(false);
    }
  };

  // Agrupar despesas por categoria para pie chart
  const expensesByCategory = useMemo(() => {
    return transactions
      .filter(t => getTxType(t) === 'EXPENSE')
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

  // FRENTE 4: Dados para gráfico de Margens (sem EBITDA)
  const marginsChartData = useMemo(() => {
    return dreData.map(d => ({
      month: d.month,
      margemBruta: d.revenue > 0 ? ((d.grossProfit / d.revenue) * 100) : 0,
      margemLiquida: d.revenue > 0 ? ((d.netIncome / d.revenue) * 100) : 0,
    }));
  }, [dreData]);

  // Categorias únicas para o filtro de categoria
  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>();
    transactions.forEach(t => {
      if (t.category?.name) cats.add(t.category.name);
    });
    return Array.from(cats).sort();
  }, [transactions]);

  // Transações filtradas localmente por categoria e tipo de custo
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (txCategoryFilter !== 'all' && t.category?.name !== txCategoryFilter) return false;
      if (txCostTypeFilter !== 'all') {
        if (!t.tipo_custo) return false;
        if (t.tipo_custo !== txCostTypeFilter) return false;
      }
      return true;
    });
  }, [transactions, txCategoryFilter, txCostTypeFilter]);

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
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900">Tendência de Receita</h3>
              {revenueChartData.length > 0 && (
                <ExplainButton
                  metric="Tendência de Receita"
                  value={`Último mês: ${formatCurrency(revenueChartData[revenueChartData.length - 1]?.revenue || 0)}`}
                  context={`Evolução da receita mensal:\n${revenueChartData.map(d => `${d.month}: R$ ${d.revenue.toLocaleString('pt-BR')}`).join('\n')}`}
                  variant="icon"
                />
              )}
            </div>
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
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900">Despesas por Categoria</h3>
              {pieData.length > 0 && (
                <ExplainButton
                  metric="Despesas por Categoria"
                  value={`Total: ${formatCurrency(pieData.reduce((s, d) => s + d.value, 0))}`}
                  context={`Distribuição de despesas por categoria:\n${pieData.map(d => `- ${d.name}: R$ ${d.value.toLocaleString('pt-BR')}`).join('\n')}`}
                  variant="icon"
                />
              )}
            </div>
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

          {/* FRENTE 4: Margins — sem EBITDA, apenas Margem Bruta e Margem Líquida */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900">Margens</h3>
              {marginsChartData.length > 0 && (
                <ExplainButton
                  metric="Margens Financeiras"
                  value={`Margem Bruta: ${marginsChartData[marginsChartData.length - 1]?.margemBruta.toFixed(1)}% | Margem Líquida: ${marginsChartData[marginsChartData.length - 1]?.margemLiquida.toFixed(1)}%`}
                  context={`Evolução das margens:\n${marginsChartData.map(d => `${d.month}: Margem Bruta ${d.margemBruta.toFixed(1)}% | Margem Líquida ${d.margemLiquida.toFixed(1)}%`).join('\n')}`}
                  variant="icon"
                />
              )}
            </div>
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
                  <Line type="monotone" dataKey="margemLiquida" stroke="#8b5cf6" strokeWidth={2} name="Margem Líquida" dot={{ r: 3 }} />
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
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Demonstração de Resultado do Exercício</h3>
              <p className="text-xs text-slate-400 mt-1">Clique nas linhas principais para expandir o detalhamento por categoria</p>
            </div>
            {dreData.length > 0 && (
              <ExplainButton
                metric="DRE Completo"
                value={`Receita: ${formatCurrency(dreData[dreData.length - 1]?.revenue || 0)} | Lucro Bruto: ${formatCurrency(dreData[dreData.length - 1]?.grossProfit || 0)} | Resultado: ${formatCurrency(dreData[dreData.length - 1]?.netIncome || 0)}`}
                context={`DRE mês a mês:\n${dreData.map(d => `${d.month}: Receita ${formatCurrency(d.revenue)} | Custos ${formatCurrency(d.cogs)} | Impostos ${formatCurrency(d.taxes)} | Lucro Bruto ${formatCurrency(d.grossProfit)} | Opex ${formatCurrency(d.opex)} | Resultado ${formatCurrency(d.netIncome)}`).join('\n')}`}
                variant="small"
              />
            )}
          </div>
          <DRETable dreData={dreData} rawDreData={rawDreData} monthKeys={monthKeys} dreProfile={dreProfile} />
        </div>
      )}
      {/* ========== CONCILIAÇÃO ========== */}
      <ConciliacaoDashboardBlock />

      
      {/* ========== COST CLASSIFICATION MODAL ========== */}
      <CostClassificationModal
        isOpen={showCostModal}
        transactions={pendingClassifications}
        onClose={() => setShowCostModal(false)}
        onClassify={handleClassifyAll}
        isClassifying={isClassifying}
      />

      {/* ========== TRANSACTIONS ========== */}
      {activeView === 'transactions' && (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Transações</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={exportToExcel}
                  disabled={isExporting}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Exportar transações filtradas para Excel"
                >
                  {isExporting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Exportando...</>
                  ) : (
                    <><Download className="w-4 h-4" /> Exportar Excel</>
                  )}
                </button>
              </div>
            </div>

            {/* Linha de filtros */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-500 font-medium">Filtros:</span>
              </div>
              <select
                value={txFilter}
                onChange={(e) => { setTxFilter(e.target.value as any); setTxPage(1); }}
                className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="all">Todas</option>
                <option value="INCOME">Receitas</option>
                <option value="EXPENSE">Despesas</option>
              </select>
              <select
                value={txCategoryFilter}
                onChange={(e) => { setTxCategoryFilter(e.target.value); }}
                className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="all">Todas Categorias</option>
                {uniqueCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <select
                value={txCostTypeFilter}
                onChange={(e) => { setTxCostTypeFilter(e.target.value as any); }}
                className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="all">Fixo/Variável</option>
                <option value="FIXO">Custo Fixo</option>
                <option value="VARIAVEL">Custo Variável</option>
              </select>
              <select
                value={txStatusFilter}
                onChange={(e) => { setTxStatusFilter(e.target.value as any); setTxPage(1); }}
                className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="all">Todos Status</option>
                <option value="COMPLETED">Concluído</option>
                <option value="PENDING">Pendente</option>
                <option value="OVERDUE">Vencido</option>
              </select>
              {(txCategoryFilter !== 'all' || txCostTypeFilter !== 'all' || txStatusFilter !== 'all') && (
                <button
                  onClick={() => { setTxCategoryFilter('all'); setTxCostTypeFilter('all'); setTxStatusFilter('all'); }}
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  Limpar filtros
                </button>
              )}
            </div>

            {/* Filtros de data */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <DateRangePicker
                startDate={txStartDate}
                endDate={txEndDate}
                onChangeStart={setTxStartDate}
                onChangeEnd={setTxEndDate}
                onApply={applyDateFilter}
                onClear={clearDateFilter}
              />
              {appliedStartDate && appliedEndDate && (
                <span className="text-xs text-slate-400">
                  Transações de {new Date(appliedStartDate + 'T12:00:00').toLocaleDateString('pt-BR')} até {new Date(appliedEndDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                </span>
              )}

              <div className="flex items-center gap-2 ml-4">
                <span className="text-xs text-slate-500 font-medium">Vencimento:</span>
                <input
                  type="date"
                  value={txDueDateStart}
                  onChange={(e) => setTxDueDateStart(e.target.value)}
                  className="text-sm border border-slate-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  placeholder="De"
                />
                <span className="text-xs text-slate-400">até</span>
                <input
                  type="date"
                  value={txDueDateEnd}
                  onChange={(e) => setTxDueDateEnd(e.target.value)}
                  className="text-sm border border-slate-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  placeholder="Até"
                />
                <button
                  onClick={() => { setAppliedDueDateStart(txDueDateStart); setAppliedDueDateEnd(txDueDateEnd); setTxPage(1); }}
                  disabled={!txDueDateStart && !txDueDateEnd}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800 disabled:text-slate-300 disabled:cursor-not-allowed px-2 py-1"
                >
                  Aplicar
                </button>
                {(appliedDueDateStart || appliedDueDateEnd) && (
                  <button
                    onClick={() => { setTxDueDateStart(''); setTxDueDateEnd(''); setAppliedDueDateStart(''); setAppliedDueDateEnd(''); setTxPage(1); }}
                    className="text-xs text-red-500 hover:text-red-700 underline"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left py-3 px-4 text-slate-500 font-medium">Data</th>
                  <th className="text-left py-3 px-4 text-slate-500 font-medium">Descrição</th>
                  <th className="text-left py-3 px-4 text-slate-500 font-medium">Contraparte</th>
                  <th className="text-left py-3 px-4 text-slate-500 font-medium">Categoria</th>
                  <th className="text-left py-3 px-4 text-slate-500 font-medium">Vencimento</th>
                  <th className="text-left py-3 px-4 text-slate-500 font-medium">Status</th>
                  <th className="text-right py-3 px-4 text-slate-500 font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      {transactions.length === 0
                        ? 'Nenhuma transação encontrada. Importe um CSV ou adicione manualmente.'
                        : 'Nenhuma transação corresponde aos filtros selecionados.'}
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => {
                    const isOverdue = tx.detail?.dueDate && !tx.detail?.paymentDate && !tx.detail?.receiptDate && new Date(tx.detail.dueDate) < new Date();
                    return (
                      <tr
                        key={tx.id}
                        className={`border-b border-slate-100 hover:bg-blue-50/50 cursor-pointer transition-colors ${isOverdue ? 'bg-red-50/30' : ''}`}
                        onClick={() => { setSelectedTransaction(tx); setShowDetailModal(true); }}
                      >
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{formatDate(tx.date)}</td>
                        <td className="py-3 px-4 text-slate-900 max-w-[200px] truncate" title={tx.description}>{tx.description}</td>
                        <td className="py-3 px-4">
                          {tx.counterparty ? (
                            <span className="inline-flex items-center gap-1.5 text-xs">
                              <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-[10px] font-medium flex-shrink-0">
                                {tx.counterparty.name.charAt(0)}
                              </span>
                              <span className="text-slate-700 truncate max-w-[120px]" title={tx.counterparty.name}>{tx.counterparty.name}</span>
                            </span>
                          ) : (
                            <span className="text-xs text-slate-300">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-xs px-2 py-1 bg-slate-100 rounded-full text-slate-600">
                            {tx.category?.name || 'Sem categoria'}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {tx.detail?.dueDate ? (
                            <span className={`text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-slate-600'}`}>
                              {formatDate(tx.detail.dueDate)}
                              {isOverdue && <span className="ml-1 text-[10px] bg-red-100 text-red-600 px-1 py-0.5 rounded">Vencida</span>}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-300">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {(() => {
                            // Status vem do banco (derivado pelo backend)
                            const status = tx.status || 'PENDING';
                            const labels: Record<string, { label: string; cls: string }> = {
                              PENDING: { label: 'Pendente', cls: 'bg-amber-50 text-amber-600 border-amber-200' },
                              COMPLETED: { label: 'Concluída', cls: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
                              OVERDUE: { label: 'Vencida', cls: 'bg-red-50 text-red-600 border-red-200' },
                              PARTIAL: { label: 'Parcial', cls: 'bg-blue-50 text-blue-600 border-blue-200' },
                            };
                            const s = labels[status] || labels.PENDING;
                            return <span className={`text-xs px-2 py-1 rounded-full border font-medium ${s.cls}`}>{s.label}</span>;
                          })()}
                        </td>
                        <td className={`py-3 px-4 text-right font-medium whitespace-nowrap ${
                          getTxType(tx) === 'INCOME' ? 'text-emerald-600' : 'text-red-600'
                        }`}>
                          {getTxType(tx) === 'INCOME' ? '+' : '-'}{formatCurrencyFull(Math.abs(tx.amount))}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {transactions.length > 0 && (
            <div className="p-4 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {filteredTransactions.length !== transactions.length
                  ? `Mostrando ${filteredTransactions.length} de ${transactions.length} transações`
                  : `${transactions.length} transações`}
              </span>
              <div className="flex items-center gap-2">
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
            </div>
          )}
        </div>
      )}

      {/* Modal de detalhes da transação */}
      <TransactionDetailModal
        transaction={selectedTransaction}
        isOpen={showDetailModal}
        onClose={() => { setShowDetailModal(false); setSelectedTransaction(null); }}
        onSave={() => { setShowDetailModal(false); setSelectedTransaction(null); loadTransactions(); }}
      />
    </div>
  );
}
