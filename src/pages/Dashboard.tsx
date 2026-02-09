import { useEffect, useState, useMemo } from 'react';
import { financialApi, scenariosApi } from '@/lib/api';
import { formatCurrency, getMonthLabel } from '@/lib/utils';
import MetricCard from '@/components/MetricCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import {
  DollarSign, TrendingUp, TrendingDown, Wallet, Calendar,
  ChevronDown, ChevronUp, ToggleLeft, ToggleRight, Plus, Trash2,
  AlertTriangle, X, Info
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell, Legend, LineChart, Line
} from 'recharts';

// O backend retorna métricas como objetos { value, change }
interface MetricValue {
  value: number;
  change: number;
}

interface DashboardData {
  cashBalance: MetricValue;
  burnRate: MetricValue;
  runway: MetricValue;
  growth: MetricValue;
  transactionCount: number;
}

interface CashflowData {
  month: string;
  income: number;
  expense: number;  // backend retorna 'expense' (sem s)
  expenses?: number; // compatibilidade
  net: number;
  isProjection?: boolean;
}

interface Scenario {
  id: string;
  name: string;
  type: string;
  description?: string;
  adjustments: any;
  isActive: boolean;
}

// Helper para extrair valor numérico de uma métrica (pode ser objeto ou número)
function extractValue(metric: any): number {
  if (metric === null || metric === undefined) return 0;
  if (typeof metric === 'number') return metric;
  if (typeof metric === 'object' && metric.value !== undefined) return Number(metric.value) || 0;
  return Number(metric) || 0;
}

// Helper para extrair change de uma métrica
function extractChange(metric: any): number | undefined {
  if (metric === null || metric === undefined) return undefined;
  if (typeof metric === 'object' && metric.change !== undefined) {
    const change = Number(metric.change);
    // Se change é 0 ou NaN, não mostrar variação
    if (isNaN(change) || change === 0) return undefined;
    return change;
  }
  return undefined;
}

export default function Dashboard() {
  const [dashData, setDashData] = useState<DashboardData | null>(null);
  const [cashflow, setCashflow] = useState<CashflowData[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [scenariosOpen, setScenariosOpen] = useState(true);
  const [showAlert, setShowAlert] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [metricsRes, cashflowRes, scenariosRes] = await Promise.allSettled([
        financialApi.dashboard(),
        financialApi.cashflow(12),
        scenariosApi.list(),
      ]);

      if (metricsRes.status === 'fulfilled') {
        const raw = metricsRes.value.data.data || metricsRes.value.data;
        setDashData(raw);
      }
      if (cashflowRes.status === 'fulfilled') {
        setCashflow(cashflowRes.value.data.data || cashflowRes.value.data || []);
      }
      if (scenariosRes.status === 'fulfilled') {
        setScenarios(scenariosRes.value.data.data || scenariosRes.value.data || []);
      }
    } catch (err: any) {
      setError('Erro ao carregar dados. Verifique a conexão com o servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleScenario = async (id: string) => {
    try {
      await scenariosApi.toggle(id);
      setScenarios(prev => prev.map(s => s.id === id ? { ...s, isActive: !s.isActive } : s));
    } catch (err) {
      console.error('Erro ao alternar cenário:', err);
    }
  };

  // Extrair valores das métricas de forma segura
  const cashBalance = extractValue(dashData?.cashBalance);
  const cashBalanceChange = extractChange(dashData?.cashBalance);
  const burnRate = extractValue(dashData?.burnRate);
  const burnRateChange = extractChange(dashData?.burnRate);
  const runway = extractValue(dashData?.runway);
  const runwayChange = extractChange(dashData?.runway);
  const growth = extractValue(dashData?.growth);
  const growthChange = extractChange(dashData?.growth);
  const transactionCount = dashData?.transactionCount || 0;
  const totalIncome = Math.max(cashBalance, 0); // Aproximação para DRE
  const totalExpenses = burnRate > 0 ? burnRate : 0;

  // Dados do gráfico com projeção
  const chartData = useMemo(() => {
    if (!cashflow.length) {
      // Sem dados — mostrar gráfico vazio com meses
      const now = new Date();
      return Array.from({ length: 12 }, (_, i) => {
        const date = new Date(now.getFullYear(), now.getMonth() - 6 + i, 1);
        return {
          month: getMonthLabel(date.getMonth()),
          receitas: 0,
          despesas: 0,
          isProjection: i >= 6,
        };
      });
    }
    return cashflow.map((c, i) => ({
      month: c.month,
      receitas: c.income || 0,
      despesas: -Math.abs(c.expense || c.expenses || 0),
      isProjection: c.isProjection || i >= cashflow.length - 4,
    }));
  }, [cashflow]);

  const activeScenarios = scenarios.filter(s => s.isActive);

  if (isLoading) return <LoadingSpinner message="Carregando dashboard..." />;

  return (
    <div className="flex gap-6 h-full">
      {/* Main Content */}
      <div className="flex-1 min-w-0 space-y-6">
        {/* Alert Popup */}
        {showAlert && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800">Alertas Financeiros</p>
              <p className="text-xs text-amber-600 mt-1">
                {transactionCount > 0
                  ? `${transactionCount} transações registradas. Saldo: ${formatCurrency(cashBalance)}`
                  : 'Nenhuma transação registrada ainda. Importe seu extrato CSV para começar.'}
              </p>
            </div>
            <button onClick={() => setShowAlert(false)} className="text-amber-400 hover:text-amber-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Saldo de Caixa"
            value={cashBalance}
            icon={DollarSign}
            change={cashBalanceChange}
            subtitle="Últimos 6 meses"
          />
          <MetricCard
            title="Burn Rate"
            value={burnRate}
            icon={TrendingDown}
            change={burnRateChange}
            subtitle="Despesas - Receitas (mês)"
          />
          <MetricCard
            title="Fluxo de Caixa Líquido"
            value={growth}
            icon={Wallet}
            change={growthChange}
            format="percent"
            subtitle="Crescimento mensal"
          />
          <MetricCard
            title="Runway"
            value={runway}
            icon={Calendar}
            change={runwayChange}
            format="days"
            subtitle="Meses de operação restantes"
          />
        </div>

        {/* Cash Flow Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Fluxo de Caixa</h3>
              <p className="text-sm text-slate-500">Realizado vs. Projeção</p>
            </div>
            {activeScenarios.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-full">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <span className="text-xs font-medium text-blue-700">
                  {activeScenarios.length} cenário{activeScenarios.length > 1 ? 's' : ''} ativo{activeScenarios.length > 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-6 mb-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-emerald-500 rounded-sm" />
              <span className="text-slate-600">Receitas (Realizado)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-emerald-300 rounded-sm opacity-50" />
              <span className="text-slate-600">Receitas (Projeção)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-sm" />
              <span className="text-slate-600">Despesas (Realizado)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-300 rounded-sm opacity-50" />
              <span className="text-slate-600">Despesas (Projeção)</span>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(value: number) => formatCurrency(Math.abs(value))}
                labelStyle={{ fontWeight: 600 }}
                contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
              />
              <ReferenceLine y={0} stroke="#cbd5e1" />
              <Bar dataKey="receitas" name="Receitas" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.isProjection ? '#86efac' : '#10b981'} opacity={entry.isProjection ? 0.5 : 1} />
                ))}
              </Bar>
              <Bar dataKey="despesas" name="Despesas" radius={[0, 0, 4, 4]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.isProjection ? '#fca5a5' : '#ef4444'} opacity={entry.isProjection ? 0.5 : 1} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* DRE Summary */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Resumo DRE</h3>
          {transactionCount === 0 ? (
            <div className="text-center py-8">
              <Info className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Nenhuma transação registrada</p>
              <p className="text-xs text-slate-400 mt-1">Importe um CSV para ver o DRE</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-slate-500 font-medium">Categoria</th>
                    <th className="text-right py-3 px-4 text-slate-500 font-medium">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="py-3 px-4 font-semibold text-slate-900">Saldo de Caixa</td>
                    <td className={`py-3 px-4 text-right font-semibold ${cashBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {formatCurrency(cashBalance)}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-3 px-4 text-slate-700">Burn Rate (mensal)</td>
                    <td className="py-3 px-4 text-right text-red-600">{formatCurrency(burnRate)}</td>
                  </tr>
                  <tr className="bg-blue-50">
                    <td className="py-3 px-4 font-bold text-slate-900">Runway</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {runway > 90 ? '∞ (sustentável)' : `${runway.toFixed(1)} meses`}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Scenarios Sidebar */}
      <div className={`${scenariosOpen ? 'w-80' : 'w-12'} transition-all duration-300 flex-shrink-0`}>
        <div className="bg-white rounded-xl border border-slate-200 h-full">
          <button
            onClick={() => setScenariosOpen(!scenariosOpen)}
            className="w-full flex items-center justify-between p-4 border-b border-slate-100"
          >
            {scenariosOpen && <span className="text-sm font-semibold text-slate-900">Cenários</span>}
            {scenariosOpen ? <ChevronRight className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {scenariosOpen && (
            <div className="p-4 space-y-3">
              {scenarios.length === 0 ? (
                <div className="text-center py-8">
                  <Info className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">Nenhum cenário criado</p>
                  <p className="text-xs text-slate-400 mt-1">Crie cenários para simular projeções</p>
                </div>
              ) : (
                scenarios.map((scenario) => (
                  <div key={scenario.id} className={`p-3 rounded-lg border transition-all ${
                    scenario.isActive ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-slate-50'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-900 truncate">{scenario.name}</span>
                      <button onClick={() => toggleScenario(scenario.id)} className="flex-shrink-0">
                        {scenario.isActive
                          ? <ToggleRight className="w-6 h-6 text-blue-600" />
                          : <ToggleLeft className="w-6 h-6 text-slate-400" />}
                      </button>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      scenario.type === 'PROJECT' ? 'bg-purple-100 text-purple-700' :
                      scenario.type === 'INVESTMENT' ? 'bg-emerald-100 text-emerald-700' :
                      scenario.type === 'DIVESTMENT' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {scenario.type === 'PROJECT' ? 'Projeto' :
                       scenario.type === 'INVESTMENT' ? 'Investimento' :
                       scenario.type === 'DIVESTMENT' ? 'Desinvestimento' :
                       'Mudança Org.'}
                    </span>
                    {scenario.description && (
                      <p className="text-xs text-slate-500 mt-2 line-clamp-2">{scenario.description}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ChevronRight(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m9 18 6-6-6-6"/>
    </svg>
  );
}
