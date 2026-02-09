import { useEffect, useState } from 'react';
import { financialApi } from '@/lib/api';
import { formatCurrency, formatCurrencyFull, formatDate } from '@/lib/utils';
import LoadingSpinner from '@/components/LoadingSpinner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Area, AreaChart
} from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight,
  ChevronDown, ChevronUp, Filter
} from 'lucide-react';

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  category?: { name: string; group: string };
}

interface DREData {
  month: string;
  revenue: number;
  cogs: number;
  grossProfit: number;
  opex: number;
  ebitda: number;
  netIncome: number;
}

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function Dashboards() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dreData, setDreData] = useState<DREData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState<'overview' | 'dre' | 'transactions'>('overview');
  const [dreOpen, setDreOpen] = useState(true);
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
        financialApi.dre(7),
      ]);
      if (dreRes.status === 'fulfilled') {
        setDreData(dreRes.value.data.data || dreRes.value.data || []);
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
  const expensesByCategory = transactions
    .filter(t => t.type === 'EXPENSE')
    .reduce((acc, t) => {
      const cat = t.category?.name || 'Outros';
      acc[cat] = (acc[cat] || 0) + Math.abs(t.amount);
      return acc;
    }, {} as Record<string, number>);

  const pieData = Object.entries(expensesByCategory)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

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

      {/* Overview */}
      {activeView === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Trend */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Tendência de Receita</h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={dreData}>
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
              <div className="flex items-center justify-center h-[250px] text-sm text-slate-400">
                Nenhuma despesa registrada
              </div>
            )}
            <div className="flex flex-wrap gap-2 mt-2">
              {pieData.map((item, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs text-slate-600">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  {item.name}
                </div>
              ))}
            </div>
          </div>

          {/* Margins */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 lg:col-span-2">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Margens</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={dreData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `${v}%`} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="grossProfit" stroke="#10b981" strokeWidth={2} name="Margem Bruta" dot={{ r: 3 }} />
                <Line type="monotone" dataKey="ebitda" stroke="#3b82f6" strokeWidth={2} name="EBITDA" dot={{ r: 3 }} />
                <Line type="monotone" dataKey="netIncome" stroke="#8b5cf6" strokeWidth={2} name="Lucro Líquido" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* DRE */}
      {activeView === 'dre' && (
        <div className="bg-white rounded-xl border border-slate-200">
          <button
            onClick={() => setDreOpen(!dreOpen)}
            className="w-full flex items-center justify-between p-6 border-b border-slate-100"
          >
            <h3 className="text-lg font-semibold text-slate-900">Demonstração de Resultado do Exercício</h3>
            {dreOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </button>
          {dreOpen && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left py-3 px-6 text-slate-500 font-medium">Conta</th>
                    {dreData.map((d, i) => (
                      <th key={i} className="text-right py-3 px-4 text-slate-500 font-medium">{d.month}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-100 font-semibold">
                    <td className="py-3 px-6 text-slate-900">Receita Bruta</td>
                    {dreData.map((d, i) => (
                      <td key={i} className="py-3 px-4 text-right text-emerald-600">{formatCurrency(d.revenue)}</td>
                    ))}
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-3 px-6 text-slate-700">(-) Custo dos Produtos/Serviços</td>
                    {dreData.map((d, i) => (
                      <td key={i} className="py-3 px-4 text-right text-red-500">{formatCurrency(-d.cogs)}</td>
                    ))}
                  </tr>
                  <tr className="border-b border-slate-200 bg-blue-50 font-semibold">
                    <td className="py-3 px-6 text-slate-900">Lucro Bruto</td>
                    {dreData.map((d, i) => (
                      <td key={i} className="py-3 px-4 text-right text-blue-700">{formatCurrency(d.grossProfit)}</td>
                    ))}
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-3 px-6 text-slate-700">(-) Despesas Operacionais</td>
                    {dreData.map((d, i) => (
                      <td key={i} className="py-3 px-4 text-right text-red-500">{formatCurrency(-d.opex)}</td>
                    ))}
                  </tr>
                  <tr className="border-b border-slate-200 bg-blue-50 font-semibold">
                    <td className="py-3 px-6 text-slate-900">EBITDA</td>
                    {dreData.map((d, i) => (
                      <td key={i} className="py-3 px-4 text-right text-blue-700">{formatCurrency(d.ebitda)}</td>
                    ))}
                  </tr>
                  <tr className="bg-emerald-50 font-bold">
                    <td className="py-3 px-6 text-slate-900">Resultado Líquido</td>
                    {dreData.map((d, i) => (
                      <td key={i} className={`py-3 px-4 text-right ${d.netIncome >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                        {formatCurrency(d.netIncome)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Transactions */}
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
