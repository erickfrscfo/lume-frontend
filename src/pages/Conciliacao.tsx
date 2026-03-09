import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Filter, ChevronDown, ChevronUp, CheckCircle, XCircle,
  Clock, AlertTriangle, DollarSign, FileText, Building2, Calendar,
  ArrowUpDown, Loader2, Check, X, RotateCcw, Eye, ChevronLeft,
  ChevronRight, Download, RefreshCw
} from 'lucide-react';
import { transactionsApi, counterpartiesApi, reconciliationsApi, documentsApi } from '../lib/api';

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  tipo_transacao: 'INCOME' | 'EXPENSE';
  status: string;
  source: string;
  categoryId: string;
  counterpartyId: string;
  category?: { id: string; name: string; code: string };
  counterparty?: { id: string; name: string };
  detail?: TransactionDetail;
  notes: string;
}

interface TransactionDetail {
  id: string;
  reconciliationStatus: string;
  dueDate: string;
  paymentDate: string;
  receiptDate: string;
  documentNumber: string;
  bankReference: string;
  amountOriginal: number;
  amountPaid: number;
  amountReceived: number;
  discount: number;
  interest: number;
  notes: string;
  counterparty?: { id: string; name: string };
}

interface Counterparty {
  id: string;
  name: string;
  type: string;
}

interface Document {
  id: string;
  number: string;
  type: string;
  amount: number;
  description: string;
  counterparty?: { id: string; name: string };
}

export default function Conciliacao() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [counterparties, setCounterparties] = useState<Counterparty[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [dashboard, setDashboard] = useState<any>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterRecon, setFilterRecon] = useState('');
  const [filterCounterparty, setFilterCounterparty] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Actions
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<{ id: string; success: boolean; message: string } | null>(null);

  useEffect(() => {
    loadData();
  }, [page, filterType, filterStatus, filterRecon, filterCounterparty, dateStart, dateEnd]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [txRes, cpRes, docRes, dashRes] = await Promise.all([
        transactionsApi.list({
          page,
          limit: 20,
          tipo_transacao: filterType || undefined,
          status: filterStatus || undefined,
          reconciliationStatus: filterRecon || undefined,
          counterpartyId: filterCounterparty || undefined,
          startDate: dateStart || undefined,
          endDate: dateEnd || undefined,
          search: search || undefined,
        }),
        counterpartiesApi.list({ isActive: true }).catch(() => ({ data: { data: [] } })),
        documentsApi.list({ status: 'ACTIVE' }).catch(() => ({ data: { data: [] } })),
        reconciliationsApi.dashboard().catch(() => ({ data: null })),
      ]);

      const txData = txRes.data;
      setTransactions(txData.data || []);
      setTotalPages(txData.pagination?.totalPages || 1);
      setTotal(txData.pagination?.total || 0);
      setCounterparties(cpRes.data?.data || []);
      setDocuments(docRes.data?.data || []);
      setDashboard(dashRes.data?.data || dashRes.data || null);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadData();
  };

  // Mark as paid/received
  const handleMarkPaid = async (tx: Transaction) => {
    setActionLoading(tx.id);
    try {
      if (tx.tipo_transacao === 'EXPENSE') {
        await transactionsApi.markPaid(tx.id, {
          paymentDate: new Date().toISOString().split('T')[0],
          amountPaid: tx.amount,
        });
      } else {
        await transactionsApi.markReceived(tx.id, {
          receiptDate: new Date().toISOString().split('T')[0],
          amountReceived: tx.amount,
        });
      }
      setActionResult({ id: tx.id, success: true, message: tx.tipo_transacao === 'EXPENSE' ? 'Marcado como pago!' : 'Marcado como recebido!' });
      loadData();
    } catch (err: any) {
      setActionResult({ id: tx.id, success: false, message: err.response?.data?.error || 'Erro ao atualizar' });
    } finally {
      setActionLoading(null);
      setTimeout(() => setActionResult(null), 3000);
    }
  };

  // Batch reconcile
  const handleBatchReconcile = async () => {
    if (selectedIds.size === 0) return;
    setActionLoading('batch');
    try {
      const items = Array.from(selectedIds).map(id => ({ transactionId: id }));
      await reconciliationsApi.batchReconcile({ items, notes: 'Conciliação em lote' });
      setActionResult({ id: 'batch', success: true, message: `${selectedIds.size} transações conciliadas!` });
      setSelectedIds(new Set());
      loadData();
    } catch (err: any) {
      setActionResult({ id: 'batch', success: false, message: err.response?.data?.error || 'Erro na conciliação em lote' });
    } finally {
      setActionLoading(null);
      setTimeout(() => setActionResult(null), 3000);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === transactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(transactions.map(t => t.id)));
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      COMPLETED: 'bg-green-100 text-green-700',
      PENDING: 'bg-yellow-100 text-yellow-700',
      OVERDUE: 'bg-red-100 text-red-700',
      PARTIAL: 'bg-blue-100 text-blue-700',
    };
    const labels: Record<string, string> = {
      COMPLETED: 'Concluído',
      PENDING: 'Pendente',
      OVERDUE: 'Vencido',
      PARTIAL: 'Parcial',
    };
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getReconBadge = (status: string) => {
    const styles: Record<string, string> = {
      RECONCILED: 'bg-green-100 text-green-700',
      PENDING: 'bg-yellow-100 text-yellow-700',
      DIVERGENT: 'bg-red-100 text-red-700',
    };
    const labels: Record<string, string> = {
      RECONCILED: 'Conciliado',
      PENDING: 'Pendente',
      DIVERGENT: 'Divergente',
    };
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Conciliação Bancária</h1>
          <p className="text-gray-500 mt-1">Gerencie e concilie suas transações financeiras</p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </button>
      </div>

      {/* Dashboard Cards */}
      {dashboard && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <DollarSign className="w-4 h-4" />
              Total Transações
            </div>
            <p className="text-2xl font-bold text-gray-900">{dashboard.totalTransactions || total}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-600 text-sm mb-1">
              <CheckCircle className="w-4 h-4" />
              Conciliadas
            </div>
            <p className="text-2xl font-bold text-green-700">{dashboard.reconciled || 0}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-yellow-600 text-sm mb-1">
              <Clock className="w-4 h-4" />
              Pendentes
            </div>
            <p className="text-2xl font-bold text-yellow-700">{dashboard.pending || 0}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-600 text-sm mb-1">
              <AlertTriangle className="w-4 h-4" />
              Divergentes
            </div>
            <p className="text-2xl font-bold text-red-700">{dashboard.divergent || 0}</p>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por descrição, contraparte..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Buscar
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-all ${
              showFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filtros
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-3 border-t border-gray-200">
            <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="">Todos os tipos</option>
              <option value="INCOME">Receita</option>
              <option value="EXPENSE">Despesa</option>
            </select>
            <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="">Todos os status</option>
              <option value="PENDING">Pendente</option>
              <option value="COMPLETED">Concluído</option>
              <option value="OVERDUE">Vencido</option>
              <option value="PARTIAL">Parcial</option>
            </select>
            <select value={filterRecon} onChange={(e) => { setFilterRecon(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="">Conciliação</option>
              <option value="PENDING">Não conciliado</option>
              <option value="RECONCILED">Conciliado</option>
              <option value="DIVERGENT">Divergente</option>
            </select>
            <select value={filterCounterparty} onChange={(e) => { setFilterCounterparty(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="">Todas contrapartes</option>
              {counterparties.map(cp => (
                <option key={cp.id} value={cp.id}>{cp.name}</option>
              ))}
            </select>
            <input type="date" value={dateStart} onChange={(e) => { setDateStart(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Data início" />
            <input type="date" value={dateEnd} onChange={(e) => { setDateEnd(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Data fim" />
          </div>
        )}
      </div>

      {/* Batch Actions */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
          <span className="text-sm text-blue-700 font-medium">
            {selectedIds.size} transação(ões) selecionada(s)
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleBatchReconcile}
              disabled={actionLoading === 'batch'}
              className="px-4 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-1.5"
            >
              {actionLoading === 'batch' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Conciliar em Lote
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 text-gray-600 text-sm border border-gray-300 rounded-lg hover:bg-white"
            >
              Limpar
            </button>
          </div>
        </div>
      )}

      {/* Action Result Toast */}
      {actionResult && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
          actionResult.success ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {actionResult.success ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          <span className="text-sm font-medium">{actionResult.message}</span>
        </div>
      )}

      {/* Transactions Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">Nenhuma transação encontrada</p>
            <p className="text-sm mt-1">Ajuste os filtros ou importe transações</p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === transactions.length && transactions.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contraparte</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Conciliação</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.map((tx) => (
                  <React.Fragment key={tx.id}>
                    <tr
                      className={`hover:bg-gray-50 transition-colors cursor-pointer ${
                        expandedId === tx.id ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => setExpandedId(expandedId === tx.id ? null : tx.id)}
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(tx.id)}
                          onChange={() => toggleSelect(tx.id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {formatDate(tx.date)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900 truncate max-w-[250px]">
                          {tx.description}
                        </div>
                        {tx.category && (
                          <div className="text-xs text-gray-500">{tx.category.code} - {tx.category.name}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {tx.counterparty?.name || '-'}
                      </td>
                      <td className={`px-4 py-3 text-sm font-semibold text-right whitespace-nowrap ${
                        tx.tipo_transacao === 'INCOME' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {tx.tipo_transacao === 'INCOME' ? '+' : '-'} {formatCurrency(tx.amount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getStatusBadge(tx.status || 'PENDING')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getReconBadge(tx.detail?.reconciliationStatus || 'PENDING')}
                      </td>
                      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          {tx.status !== 'COMPLETED' && (
                            <button
                              onClick={() => handleMarkPaid(tx)}
                              disabled={actionLoading === tx.id}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition-colors"
                              title={tx.tipo_transacao === 'EXPENSE' ? 'Marcar como pago' : 'Marcar como recebido'}
                            >
                              {actionLoading === tx.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Check className="w-4 h-4" />
                              )}
                            </button>
                          )}
                          <button
                            onClick={() => setExpandedId(expandedId === tx.id ? null : tx.id)}
                            className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-md transition-colors"
                            title="Ver detalhes"
                          >
                            {expandedId === tx.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Detail Row */}
                    {expandedId === tx.id && (
                      <tr>
                        <td colSpan={8} className="bg-gray-50 px-6 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500 block text-xs mb-0.5">Tipo</span>
                              <span className={`font-medium ${tx.tipo_transacao === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                                {tx.tipo_transacao === 'INCOME' ? 'Receita' : 'Despesa'}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500 block text-xs mb-0.5">Origem</span>
                              <span className="font-medium text-gray-900">{tx.source || 'Manual'}</span>
                            </div>
                            <div>
                              <span className="text-gray-500 block text-xs mb-0.5">Vencimento</span>
                              <span className="font-medium text-gray-900">
                                {tx.detail?.dueDate ? formatDate(tx.detail.dueDate) : '-'}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500 block text-xs mb-0.5">Pagamento</span>
                              <span className="font-medium text-gray-900">
                                {tx.detail?.paymentDate ? formatDate(tx.detail.paymentDate) : '-'}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500 block text-xs mb-0.5">Nº Documento</span>
                              <span className="font-medium text-gray-900">{tx.detail?.documentNumber || '-'}</span>
                            </div>
                            <div>
                              <span className="text-gray-500 block text-xs mb-0.5">Ref. Bancária</span>
                              <span className="font-medium text-gray-900">{tx.detail?.bankReference || '-'}</span>
                            </div>
                            <div>
                              <span className="text-gray-500 block text-xs mb-0.5">Valor Original</span>
                              <span className="font-medium text-gray-900">
                                {tx.detail?.amountOriginal ? formatCurrency(tx.detail.amountOriginal) : formatCurrency(tx.amount)}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500 block text-xs mb-0.5">Valor Pago/Recebido</span>
                              <span className="font-medium text-gray-900">
                                {tx.detail?.amountPaid ? formatCurrency(tx.detail.amountPaid) :
                                 tx.detail?.amountReceived ? formatCurrency(tx.detail.amountReceived) : '-'}
                              </span>
                            </div>
                            {(tx.detail?.discount || tx.detail?.interest) && (
                              <>
                                <div>
                                  <span className="text-gray-500 block text-xs mb-0.5">Desconto</span>
                                  <span className="font-medium text-green-600">
                                    {tx.detail?.discount ? formatCurrency(tx.detail.discount) : '-'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500 block text-xs mb-0.5">Juros/Multa</span>
                                  <span className="font-medium text-red-600">
                                    {tx.detail?.interest ? formatCurrency(tx.detail.interest) : '-'}
                                  </span>
                                </div>
                              </>
                            )}
                            {tx.notes && (
                              <div className="col-span-2 md:col-span-4">
                                <span className="text-gray-500 block text-xs mb-0.5">Observações</span>
                                <span className="text-gray-700">{tx.notes}</span>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
              <span className="text-sm text-gray-500">
                Mostrando {transactions.length} de {total} transações
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-600">
                  Página {page} de {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
