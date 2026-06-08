import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, AlertTriangle, Building2, FileText, RefreshCw, ReceiptText } from 'lucide-react';
import { financialApi } from '@/lib/api';

interface ObligationInstallment {
  id: string;
  obligationId: string;
  installmentNumber: number;
  totalInstallments: number;
  status: string;
  amount: number;
  dueDate: string | null;
  documentNumber: string | null;
  barcode: string | null;
  lateFeePercent: number | null;
  daysUntilDue: number | null;
  isOverdue: boolean;
  obligation: {
    id: string;
    type: 'PAYABLE' | 'RECEIVABLE';
    description: string;
    documentNumber: string | null;
    totalInstallments: number;
    counterparty: { name: string; document: string | null } | null;
    category: { code: string; name: string } | null;
  } | null;
  transaction: { id: string; status: string; description: string } | null;
}

interface Bucket {
  key: string;
  label: string;
  count: number;
  totalAmount: number;
  items: ObligationInstallment[];
}

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatDate = (value: string | null) => {
  if (!value) return 'Sem vencimento';
  return new Date(value).toLocaleDateString('pt-BR');
};

const statusLabel: Record<string, string> = {
  PENDING: 'Pendente',
  OVERDUE: 'Vencida',
  PARTIAL: 'Parcial',
  PAID: 'Paga',
  CANCELLED: 'Cancelada',
};

export default function ObrigacoesFinanceiras() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [type, setType] = useState<'PAYABLE' | 'RECEIVABLE' | 'all'>('PAYABLE');
  const [activeBucket, setActiveBucket] = useState('30');
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [summary, setSummary] = useState({ count: 0, totalAmount: 0, overdueAmount: 0, horizonDays: 120 });

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await financialApi.obligations(120, type);
      const data = res.data?.data;
      setBuckets(data?.buckets || []);
      setSummary(data?.summary || { count: 0, totalAmount: 0, overdueAmount: 0, horizonDays: 120 });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao carregar obrigações financeiras.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [type]);

  const activeItems = useMemo(() => {
    return buckets.find((bucket) => bucket.key === activeBucket)?.items || [];
  }, [buckets, activeBucket]);

  const topBuckets = buckets.filter((bucket) => ['overdue', '30', '60', '90', '120'].includes(bucket.key));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Obrigações Financeiras</h1>
          <p className="mt-1 text-sm text-slate-500">Parcelas a pagar ou receber por vencimento nos próximos 120 dias.</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 bg-white p-1">
            {[
              { value: 'PAYABLE', label: 'A pagar' },
              { value: 'RECEIVABLE', label: 'A receber' },
              { value: 'all', label: 'Tudo' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setType(option.value as typeof type)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  type === option.value ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button
            onClick={loadData}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total em aberto</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{formatCurrency(summary.totalAmount)}</p>
          <p className="mt-1 text-sm text-slate-500">{summary.count} parcela(s) no horizonte</p>
        </div>
        <div className="rounded-lg border border-red-100 bg-red-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-red-600">Vencidas</p>
          <p className="mt-2 text-2xl font-bold text-red-700">{formatCurrency(summary.overdueAmount)}</p>
          <p className="mt-1 text-sm text-red-600">Exige atenção imediata</p>
        </div>
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-blue-600">Horizonte</p>
          <p className="mt-2 text-2xl font-bold text-blue-700">{summary.horizonDays} dias</p>
          <p className="mt-1 text-sm text-blue-600">Visão por parcelas futuras</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
        {topBuckets.map((bucket) => (
          <button
            key={bucket.key}
            onClick={() => setActiveBucket(bucket.key)}
            className={`rounded-lg border p-4 text-left transition-colors ${
              activeBucket === bucket.key
                ? 'border-blue-300 bg-blue-50'
                : bucket.key === 'overdue'
                  ? 'border-red-100 bg-white hover:bg-red-50'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">{bucket.label}</p>
              {bucket.key === 'overdue' ? <AlertTriangle className="h-4 w-4 text-red-500" /> : <CalendarClock className="h-4 w-4 text-blue-500" />}
            </div>
            <p className="mt-2 text-xl font-bold text-slate-900">{formatCurrency(bucket.totalAmount)}</p>
            <p className="mt-1 text-xs text-slate-500">{bucket.count} parcela(s)</p>
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="font-semibold text-slate-900">{topBuckets.find((bucket) => bucket.key === activeBucket)?.label || 'Parcelas'}</h2>
            <p className="text-sm text-slate-500">Obrigações com vencimento no período selecionado.</p>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Carregando obrigações...</div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-red-600">{error}</div>
        ) : activeItems.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">Nenhuma parcela encontrada para este período.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {activeItems.map((item) => (
              <div key={item.id} className="grid grid-cols-1 gap-4 px-5 py-4 lg:grid-cols-[1.5fr_1fr_1fr_1fr_auto] lg:items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-slate-400" />
                    <p className="font-medium text-slate-900">{item.obligation?.counterparty?.name || 'Contraparte não identificada'}</p>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{item.obligation?.description || 'Obrigação financeira'}</p>
                  {item.obligation?.category && (
                    <p className="mt-1 text-xs text-slate-400">{item.obligation.category.code} - {item.obligation.category.name}</p>
                  )}
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Parcela</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {item.installmentNumber}/{item.totalInstallments}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{item.documentNumber || item.obligation?.documentNumber || 'Sem referência'}</p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Vencimento</p>
                  <p className={`mt-1 text-sm font-semibold ${item.isOverdue ? 'text-red-600' : 'text-slate-900'}`}>{formatDate(item.dueDate)}</p>
                  {item.daysUntilDue !== null && !item.isOverdue && (
                    <p className="mt-1 text-xs text-slate-500">em {item.daysUntilDue} dia(s)</p>
                  )}
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Valor</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{formatCurrency(item.amount)}</p>
                  {item.lateFeePercent && <p className="mt-1 text-xs text-red-500">Multa {item.lateFeePercent}%</p>}
                </div>

                <div className="flex items-center gap-2 lg:justify-end">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    item.status === 'OVERDUE' ? 'bg-red-100 text-red-700' :
                    item.status === 'PARTIAL' ? 'bg-blue-100 text-blue-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {statusLabel[item.status] || item.status}
                  </span>
                  {item.transaction ? (
                    <span title="Transação vinculada" className="rounded-full bg-emerald-50 p-1.5 text-emerald-600">
                      <ReceiptText className="h-4 w-4" />
                    </span>
                  ) : (
                    <span title="Sem transação vinculada" className="rounded-full bg-slate-100 p-1.5 text-slate-400">
                      <FileText className="h-4 w-4" />
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
