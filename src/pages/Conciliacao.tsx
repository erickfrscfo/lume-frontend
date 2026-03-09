import { useState, useEffect, useCallback } from 'react';
import { transactionsApi, reconciliationsApi, counterpartiesApi, documentsApi } from '@/lib/api';
import {
  GitCompareArrows,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  X,
  FileCheck,
  Loader2,
} from 'lucide-react';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  tipo_transacao: 'INCOME' | 'EXPENSE';
  category?: { id: string; name: string; code: string };
  detail?: {
    id: string;
    reconciliationStatus: string;
    counterpartyId?: string;
    dueDate?: string;
    paymentDate?: string;
    documentNumber?: string;
    counterparty?: { id: string; name: string };
  };
}

interface DashboardData {
  summary: {
    totalTransactions: number;
    reconciled: number;
    pending: number;
    divergent: number;
    partial: number;
    percentReconciled: number;
  };
  byMethod: Array<{ method: string; count: number }>;
  recentReconciliations: any[];
}

interface Counterparty {
  id: string;
  name: string;
  document?: string;
  type: string;
}

interface Document {
  id: string;
  type: string;
  number: string;
  amount: number;
  issueDate: string;
  counterparty?: { id: string; name: string };
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('pt-BR');

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  RECONCILED: { bg: 'rgba(34,197,94,0.15)', text: '#22c55e', label: 'Conciliado' },
  PENDING: { bg: 'rgba(234,179,8,0.15)', text: '#eab308', label: 'Pendente' },
  DIVERGENT: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444', label: 'Divergente' },
  PARTIAL: { bg: 'rgba(59,130,246,0.15)', text: '#3b82f6', label: 'Parcial' },
};

export default function Conciliacao() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [counterparties, setCounterparties] = useState<Counterparty[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState<string | null>(null);
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  const [showReconcileModal, setShowReconcileModal] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState<Transaction | null>(null);

  // Filtros
  const [filters, setFilters] = useState({
    search: '',
    reconciliationStatus: '',
    tipo_transacao: '',
    startDate: '',
    endDate: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  // Form de conciliação
  const [reconcileForm, setReconcileForm] = useState({
    counterpartyId: '',
    documentId: '',
    notes: '',
  });

  const loadDashboard = useCallback(async () => {
    try {
      const res = await reconciliationsApi.dashboard();
      setDashboard(res.data.data || res.data);
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
    }
  }, []);

  const loadTransactions = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params: any = { page, limit: 20 };
      if (filters.search) params.search = filters.search;
      if (filters.reconciliationStatus) params.reconciliationStatus = filters.reconciliationStatus;
      if (filters.tipo_transacao) params.tipo_transacao = filters.tipo_transacao;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const res = await transactionsApi.list(params);
      const data = res.data;
      setTransactions(data.data || []);
      setPagination(data.pagination || { page: 1, total: 0, totalPages: 0 });
    } catch (err) {
      console.error('Erro ao carregar transações:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadCounterparties = useCallback(async () => {
    try {
      const res = await counterpartiesApi.list({ limit: 100, isActive: true });
      setCounterparties(res.data.data || []);
    } catch (err) {
      console.error('Erro ao carregar contrapartes:', err);
    }
  }, []);

  const loadDocuments = useCallback(async () => {
    try {
      const res = await documentsApi.list({ limit: 100, status: 'ACTIVE' });
      setDocuments(res.data.data || []);
    } catch (err) {
      console.error('Erro ao carregar documentos:', err);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
    loadTransactions();
    loadCounterparties();
    loadDocuments();
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [filters]);

  const handleReconcile = async () => {
    if (!currentTransaction) return;
    setReconciling(currentTransaction.id);
    try {
      await reconciliationsApi.reconcile({
        transactionId: currentTransaction.id,
        counterpartyId: reconcileForm.counterpartyId || undefined,
        documentId: reconcileForm.documentId || undefined,
        notes: reconcileForm.notes || undefined,
      });
      setShowReconcileModal(false);
      setCurrentTransaction(null);
      setReconcileForm({ counterpartyId: '', documentId: '', notes: '' });
      await Promise.all([loadDashboard(), loadTransactions(pagination.page)]);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao conciliar');
    } finally {
      setReconciling(null);
    }
  };

  const handleBatchReconcile = async () => {
    if (selectedTransactions.size === 0) return;
    setReconciling('batch');
    try {
      const items = Array.from(selectedTransactions).map(id => ({ transactionId: id }));
      const res = await reconciliationsApi.batchReconcile({ items, notes: 'Conciliação em lote' });
      const result = res.data.data;
      alert(`Conciliação em lote: ${result.reconciled} conciliadas, ${result.failed} falharam`);
      setSelectedTransactions(new Set());
      await Promise.all([loadDashboard(), loadTransactions(pagination.page)]);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro na conciliação em lote');
    } finally {
      setReconciling(null);
    }
  };

  const handleUndoReconciliation = async (transactionId: string) => {
    if (!confirm('Deseja realmente desfazer esta conciliação?')) return;
    try {
      // Precisamos buscar o reconciliation ID pelo transaction
      const txRes = await transactionsApi.getById(transactionId);
      const tx = txRes.data.data;
      if (tx.detail?.reconciliation?.id) {
        await reconciliationsApi.undo(tx.detail.reconciliation.id);
        await Promise.all([loadDashboard(), loadTransactions(pagination.page)]);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao desfazer conciliação');
    }
  };

  const toggleSelectTransaction = (id: string) => {
    const newSet = new Set(selectedTransactions);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedTransactions(newSet);
  };

  const getStatusInfo = (transaction: Transaction) => {
    const status = transaction.detail?.reconciliationStatus || 'PENDING';
    return statusColors[status] || statusColors.PENDING;
  };

  return (
    <div className="p-6 space-y-6" style={{ color: '#e2e8f0' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <GitCompareArrows className="w-7 h-7" style={{ color: '#3b82f6' }} />
            Conciliação Bancária
          </h1>
          <p className="text-sm mt-1" style={{ color: '#64748b' }}>
            Gerencie e reconcilie suas transações financeiras
          </p>
        </div>
        <button
          onClick={() => { loadDashboard(); loadTransactions(); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
          style={{ backgroundColor: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}
        >
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </button>
      </div>

      {/* Dashboard Cards */}
      {dashboard && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="rounded-xl p-4" style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs font-medium" style={{ color: '#64748b' }}>Total Transações</p>
            <p className="text-2xl font-bold text-white mt-1">{dashboard.summary.totalTransactions}</p>
          </div>
          <div className="rounded-xl p-4" style={{ backgroundColor: '#111827', border: '1px solid rgba(34,197,94,0.2)' }}>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" style={{ color: '#22c55e' }} />
              <p className="text-xs font-medium" style={{ color: '#64748b' }}>Conciliadas</p>
            </div>
            <p className="text-2xl font-bold mt-1" style={{ color: '#22c55e' }}>{dashboard.summary.reconciled}</p>
          </div>
          <div className="rounded-xl p-4" style={{ backgroundColor: '#111827', border: '1px solid rgba(234,179,8,0.2)' }}>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" style={{ color: '#eab308' }} />
              <p className="text-xs font-medium" style={{ color: '#64748b' }}>Pendentes</p>
            </div>
            <p className="text-2xl font-bold mt-1" style={{ color: '#eab308' }}>{dashboard.summary.pending}</p>
          </div>
          <div className="rounded-xl p-4" style={{ backgroundColor: '#111827', border: '1px solid rgba(239,68,68,0.2)' }}>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" style={{ color: '#ef4444' }} />
              <p className="text-xs font-medium" style={{ color: '#64748b' }}>Divergentes</p>
            </div>
            <p className="text-2xl font-bold mt-1" style={{ color: '#ef4444' }}>{dashboard.summary.divergent}</p>
          </div>
          <div className="rounded-xl p-4" style={{ backgroundColor: '#111827', border: '1px solid rgba(59,130,246,0.2)' }}>
            <div className="flex items-center gap-2">
              <FileCheck className="w-4 h-4" style={{ color: '#3b82f6' }} />
              <p className="text-xs font-medium" style={{ color: '#64748b' }}>% Conciliado</p>
            </div>
            <p className="text-2xl font-bold mt-1" style={{ color: '#3b82f6' }}>{dashboard.summary.percentReconciled}%</p>
          </div>
        </div>
      )}

      {/* Filtros e Ações */}
      <div className="rounded-xl p-4" style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#64748b' }} />
            <input
              type="text"
              placeholder="Buscar transações..."
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 rounded-lg text-sm"
              style={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}
            />
          </div>

          <select
            value={filters.reconciliationStatus}
            onChange={e => setFilters(f => ({ ...f, reconciliationStatus: e.target.value }))}
            className="px-3 py-2 rounded-lg text-sm"
            style={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}
          >
            <option value="">Todos os status</option>
            <option value="PENDING">Pendentes</option>
            <option value="RECONCILED">Conciliadas</option>
            <option value="DIVERGENT">Divergentes</option>
          </select>

          <select
            value={filters.tipo_transacao}
            onChange={e => setFilters(f => ({ ...f, tipo_transacao: e.target.value }))}
            className="px-3 py-2 rounded-lg text-sm"
            style={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}
          >
            <option value="">Todos os tipos</option>
            <option value="INCOME">Receitas</option>
            <option value="EXPENSE">Despesas</option>
          </select>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
            style={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}
          >
            <Filter className="w-4 h-4" />
            {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {selectedTransactions.size > 0 && (
            <button
              onClick={handleBatchReconcile}
              disabled={reconciling === 'batch'}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
              style={{ backgroundColor: '#22c55e', color: '#fff' }}
            >
              {reconciling === 'batch' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Conciliar {selectedTransactions.size} selecionadas
            </button>
          )}
        </div>

        {showFilters && (
          <div className="flex items-center gap-3 mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div>
              <label className="text-xs" style={{ color: '#64748b' }}>Data início</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))}
                className="block w-full px-3 py-1.5 rounded-lg text-sm mt-1"
                style={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}
              />
            </div>
            <div>
              <label className="text-xs" style={{ color: '#64748b' }}>Data fim</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))}
                className="block w-full px-3 py-1.5 rounded-lg text-sm mt-1"
                style={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}
              />
            </div>
            <button
              onClick={() => setFilters({ search: '', reconciliationStatus: '', tipo_transacao: '', startDate: '', endDate: '' })}
              className="mt-5 text-xs px-3 py-1.5 rounded-lg"
              style={{ color: '#ef4444' }}
            >
              Limpar filtros
            </button>
          </div>
        )}
      </div>

      {/* Tabela de Transações */}
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.06)' }}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#3b82f6' }} />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-20">
            <GitCompareArrows className="w-12 h-12 mx-auto mb-3" style={{ color: '#334155' }} />
            <p className="text-sm" style={{ color: '#64748b' }}>Nenhuma transação encontrada</p>
            <p className="text-xs mt-1" style={{ color: '#475569' }}>Importe transações na tela de Inserção de Dados</p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: '#64748b' }}>
                    <input
                      type="checkbox"
                      onChange={e => {
                        if (e.target.checked) {
                          const pendingIds = transactions
                            .filter(t => !t.detail || t.detail.reconciliationStatus !== 'RECONCILED')
                            .map(t => t.id);
                          setSelectedTransactions(new Set(pendingIds));
                        } else {
                          setSelectedTransactions(new Set());
                        }
                      }}
                      className="rounded"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#64748b' }}>Data</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#64748b' }}>Descrição</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#64748b' }}>Categoria</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: '#64748b' }}>Valor</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider" style={{ color: '#64748b' }}>Status</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider" style={{ color: '#64748b' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => {
                  const statusInfo = getStatusInfo(tx);
                  const isReconciled = tx.detail?.reconciliationStatus === 'RECONCILED';
                  return (
                    <tr
                      key={tx.id}
                      className="transition-colors"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td className="px-4 py-3">
                        {!isReconciled && (
                          <input
                            type="checkbox"
                            checked={selectedTransactions.has(tx.id)}
                            onChange={() => toggleSelectTransaction(tx.id)}
                            className="rounded"
                          />
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: '#94a3b8' }}>{formatDate(tx.date)}</td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-white truncate max-w-[250px]">{tx.description}</p>
                        {tx.detail?.counterparty && (
                          <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>{tx.detail.counterparty.name}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: '#94a3b8' }}>
                        {tx.category?.name || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono font-medium" style={{ color: tx.tipo_transacao === 'INCOME' ? '#22c55e' : '#ef4444' }}>
                        {tx.tipo_transacao === 'INCOME' ? '+' : '-'}{formatCurrency(Math.abs(tx.amount))}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                          style={{ backgroundColor: statusInfo.bg, color: statusInfo.text }}
                        >
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isReconciled ? (
                          <button
                            onClick={() => handleUndoReconciliation(tx.id)}
                            className="text-xs px-2 py-1 rounded transition-colors"
                            style={{ color: '#ef4444' }}
                            title="Desfazer conciliação"
                          >
                            Desfazer
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setCurrentTransaction(tx);
                              setReconcileForm({ counterpartyId: '', documentId: '', notes: '' });
                              setShowReconcileModal(true);
                            }}
                            className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                            style={{ backgroundColor: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}
                          >
                            Conciliar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Paginação */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs" style={{ color: '#64748b' }}>
                  Mostrando página {pagination.page} de {pagination.totalPages} ({pagination.total} transações)
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => loadTransactions(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="px-3 py-1 rounded text-sm disabled:opacity-30"
                    style={{ backgroundColor: '#1e293b', color: '#94a3b8' }}
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => loadTransactions(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="px-3 py-1 rounded text-sm disabled:opacity-30"
                    style={{ backgroundColor: '#1e293b', color: '#94a3b8' }}
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de Conciliação */}
      {showReconcileModal && currentTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-md rounded-xl p-6" style={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Conciliar Transação</h3>
              <button onClick={() => setShowReconcileModal(false)}>
                <X className="w-5 h-5" style={{ color: '#64748b' }} />
              </button>
            </div>

            <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: '#111827' }}>
              <p className="text-sm font-medium text-white">{currentTransaction.description}</p>
              <p className="text-sm mt-1" style={{ color: currentTransaction.tipo_transacao === 'INCOME' ? '#22c55e' : '#ef4444' }}>
                {formatCurrency(currentTransaction.amount)}
              </p>
              <p className="text-xs mt-1" style={{ color: '#64748b' }}>{formatDate(currentTransaction.date)}</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium" style={{ color: '#94a3b8' }}>Contraparte (opcional)</label>
                <select
                  value={reconcileForm.counterpartyId}
                  onChange={e => setReconcileForm(f => ({ ...f, counterpartyId: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-lg text-sm"
                  style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}
                >
                  <option value="">Selecione...</option>
                  {counterparties.map(cp => (
                    <option key={cp.id} value={cp.id}>{cp.name} {cp.document ? `(${cp.document})` : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium" style={{ color: '#94a3b8' }}>Documento fiscal (opcional)</label>
                <select
                  value={reconcileForm.documentId}
                  onChange={e => setReconcileForm(f => ({ ...f, documentId: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-lg text-sm"
                  style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}
                >
                  <option value="">Selecione...</option>
                  {documents.map(doc => (
                    <option key={doc.id} value={doc.id}>
                      {doc.type} #{doc.number} — {formatCurrency(doc.amount)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium" style={{ color: '#94a3b8' }}>Observações (opcional)</label>
                <textarea
                  value={reconcileForm.notes}
                  onChange={e => setReconcileForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full mt-1 px-3 py-2 rounded-lg text-sm resize-none"
                  style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}
                  placeholder="Notas sobre esta conciliação..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowReconcileModal(false)}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium"
                style={{ backgroundColor: '#374151', color: '#94a3b8' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleReconcile}
                disabled={!!reconciling}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                style={{ backgroundColor: '#22c55e', color: '#fff' }}
              >
                {reconciling ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Conciliar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
