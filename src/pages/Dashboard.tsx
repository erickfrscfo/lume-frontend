import { useEffect, useState, useMemo } from 'react';
import { financialApi, scenariosApi } from '@/lib/api';
import { formatCurrency, getMonthLabel } from '@/lib/utils';
import MetricCard from '@/components/MetricCard';
import CashflowChart from '@/components/CashflowChart';
import type { CashflowDataPoint, Scenario as ChartScenario } from '@/components/CashflowChart';
import LoadingSpinner from '@/components/LoadingSpinner';
import {
  DollarSign, TrendingDown, Wallet, Calendar,
  ChevronDown, ToggleLeft, ToggleRight,
  AlertTriangle, X, Info
} from 'lucide-react';

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

interface CashflowRaw {
  month: string;
  income: number;
  expense: number;
  expenses?: number;
  net: number;
}

interface Scenario {
  id: string;
  name: string;
  type: string;
  description?: string;
  adjustments: any;
  isActive: boolean;
}

function extractValue(metric: any): number {
  if (metric === null || metric === undefined) return 0;
  if (typeof metric === 'number') return metric;
  if (typeof metric === 'object' && metric.value !== undefined) return Number(metric.value) || 0;
  return Number(metric) || 0;
}

function extractChange(metric: any): number | undefined {
  if (metric === null || metric === undefined) return undefined;
  if (typeof metric === 'object' && metric.change !== undefined) {
    const change = Number(metric.change);
    if (isNaN(change) || change === 0) return undefined;
    return change;
  }
  return undefined;
}

function ChevronRight(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m9 18 6-6-6-6"/>
    </svg>
  );
}

export default function Dashboard() {
  const [dashData, setDashData] = useState<DashboardData | null>(null);
  const [cashflowRaw, setCashflowRaw] = useState<CashflowRaw[]>([]);
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
        setCashflowRaw(cashflowRes.value.data.data || cashflowRes.value.data || []);
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

  const cashBalance = extractValue(dashData?.cashBalance);
  const cashBalanceChange = extractChange(dashData?.cashBalance);
  const burnRate = extractValue(dashData?.burnRate);
  const burnRateChange = extractChange(dashData?.burnRate);
  const runway = extractValue(dashData?.runway);
  const runwayChange = extractChange(dashData?.runway);
  const growth = extractValue(dashData?.growth);
  const growthChange = extractChange(dashData?.growth);
  const transactionCount = dashData?.transactionCount || 0;

  const cashflowData: CashflowDataPoint[] = useMemo(() => {
    return cashflowRaw.map(c => ({
      month: c.month,
      income: c.income || 0,
      expense: Math.abs(c.expense || c.expenses || 0),
      net: c.net || 0,
    }));
  }, [cashflowRaw]);

  const chartScenarios: ChartScenario[] = useMemo(() => {
    return scenarios.map(s => ({
      id: s.id,
      name: s.name,
      type: s.type,
      isActive: s.isActive,
      adjustments: s.adjustments || {},
    }));
  }, [scenarios]);

  const forecastStartMonth = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const handleExplain = () => {
    // Placeholder — futura integração com IA para explicar o gráfico
    alert('Em breve: a IA vai explicar o gráfico para você!');
  };

  if (isLoading) return <LoadingSpinner message="Carregando dashboard..." />;

  return (
    <div className="flex gap-6 h-full">
      {/* Main Content */}
      <div className="flex-1 min-w-0 space-y-6">
        {/* Alert */}
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

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>
        )}

        {/* Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Saldo de Caixa" value={cashBalance} icon={DollarSign} change={cashBalanceChange} subtitle="Últimos 6 meses" />
          <MetricCard title="Burn Rate" value={burnRate} icon={TrendingDown} change={burnRateChange} subtitle="Despesas - Receitas (mês)" />
          <MetricCard title="Fluxo de Caixa Líquido" value={growth} icon={Wallet} change={growthChange} format="percent" subtitle="Crescimento mensal" />
          <MetricCard title="Runway" value={runway} icon={Calendar} change={runwayChange} format="days" subtitle="Meses de operação restantes" />
        </div>

        {/* Cash Flow Chart — o componente já inclui seu próprio card, header e botões */}
        <CashflowChart
          data={cashflowData}
          scenarios={chartScenarios}
          initialBalance={0}
          forecastStartMonth={forecastStartMonth}
          onExplain={handleExplain}
        />

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
                    scenario.isActive ? 'border-purple-200 bg-purple-50' : 'border-slate-200 bg-slate-50'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-900 truncate">{scenario.name}</span>
                      <button onClick={() => toggleScenario(scenario.id)} className="flex-shrink-0">
                        {scenario.isActive
                          ? <ToggleRight className="w-6 h-6 text-purple-600" />
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
