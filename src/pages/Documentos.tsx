import { useState, useEffect, useCallback } from 'react';
import { documentsApi, counterpartiesApi } from '@/lib/api';
import {
  FileText,
  Plus,
  Search,
  Edit3,
  Trash2,
  X,
  Loader2,
  Receipt,
  FileCheck,
  FileArchive,
  Filter,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface Document {
  id: string;
  type: 'INVOICE' | 'RECEIPT' | 'BANK_STATEMENT' | 'CONTRACT' | 'OTHER';
  number: string;
  issueDate: string;
  amount: number;
  description?: string;
  status: 'ACTIVE' | 'CANCELLED' | 'ARCHIVED';
  counterpartyId?: string;
  fileUrl?: string;
  counterparty?: { id: string; name: string; document?: string };
  reconciliation?: { id: string; createdAt: string };
  createdAt: string;
}

interface Counterparty {
  id: string;
  name: string;
  document?: string;
}

const typeLabels: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  INVOICE: { label: 'Nota Fiscal', icon: FileText, color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  RECEIPT: { label: 'Recibo', icon: Receipt, color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
  BANK_STATEMENT: { label: 'Extrato', icon: FileCheck, color: '#eab308', bg: 'rgba(234,179,8,0.15)' },
  CONTRACT: { label: 'Contrato', icon: FileArchive, color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
  OTHER: { label: 'Outro', icon: FileText, color: '#64748b', bg: 'rgba(100,116,139,0.15)' },
};

const statusLabels: Record<string, { label: string; color: string; bg: string }> = {
  ACTIVE: { label: 'Ativo', color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
  CANCELLED: { label: 'Cancelado', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  ARCHIVED: { label: 'Arquivado', color: '#64748b', bg: 'rgba(100,116,139,0.15)' },
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('pt-BR');

export default function Documentos() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [counterparties, setCounterparties] = useState<Counterparty[]>([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState({
    search: '',
    type: '',
    status: '',
    startDate: '',
    endDate: '',
  });

  const [form, setForm] = useState({
    type: 'INVOICE' as Document['type'],
    number: '',
    issueDate: '',
    amount: '',
    description: '',
    counterpartyId: '',
    fileUrl: '',
  });

  const loadDocuments = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params: any = { page, limit: 20 };
      if (filters.search) params.search = filters.search;
      if (filters.type) params.type = filters.type;
      if (filters.status) params.status = filters.status;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const res = await documentsApi.list(params);
      const data = res.data;
      setDocuments(data.data || []);
      setPagination(data.pagination || { page: 1, total: 0, totalPages: 0 });
    } catch (err) {
      console.error('Erro ao carregar documentos:', err);
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

  useEffect(() => {
    loadDocuments();
    loadCounterparties();
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [filters]);

  const openCreateModal = () => {
    setEditingId(null);
    setForm({ type: 'INVOICE', number: '', issueDate: '', amount: '', description: '', counterpartyId: '', fileUrl: '' });
    setShowModal(true);
  };

  const openEditModal = (doc: Document) => {
    setEditingId(doc.id);
    setForm({
      type: doc.type,
      number: doc.number,
      issueDate: doc.issueDate ? doc.issueDate.split('T')[0] : '',
      amount: String(doc.amount),
      description: doc.description || '',
      counterpartyId: doc.counterpartyId || '',
      fileUrl: doc.fileUrl || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.number.trim() || !form.issueDate || !form.amount) {
      alert('Número, data de emissão e valor são obrigatórios');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await documentsApi.update(editingId, {
          number: form.number,
          issueDate: form.issueDate,
          amount: parseFloat(form.amount),
          description: form.description || undefined,
          counterpartyId: form.counterpartyId || undefined,
          fileUrl: form.fileUrl || undefined,
        });
      } else {
        await documentsApi.create({
          type: form.type,
          number: form.number,
          issueDate: form.issueDate,
          amount: parseFloat(form.amount),
          description: form.description || undefined,
          counterpartyId: form.counterpartyId || undefined,
          fileUrl: form.fileUrl || undefined,
        });
      }
      setShowModal(false);
      await loadDocuments(pagination.page);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao salvar documento');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (id: string) => {
    if (!confirm('Deseja realmente arquivar este documento?')) return;
    try {
      await documentsApi.delete(id);
      await loadDocuments(pagination.page);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao arquivar documento');
    }
  };

  return (
    <div className="p-6 space-y-6" style={{ color: '#e2e8f0' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <FileText className="w-7 h-7" style={{ color: '#f97316' }} />
            Documentos Fiscais
          </h1>
          <p className="text-sm mt-1" style={{ color: '#64748b' }}>
            Gerencie notas fiscais, recibos, extratos e contratos
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
          style={{ backgroundColor: '#f97316', color: '#fff' }}
        >
          <Plus className="w-4 h-4" />
          Novo Documento
        </button>
      </div>

      {/* Filtros */}
      <div className="rounded-xl p-4" style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#64748b' }} />
            <input
              type="text"
              placeholder="Buscar por número ou descrição..."
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 rounded-lg text-sm"
              style={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}
            />
          </div>

          <select
            value={filters.type}
            onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}
            className="px-3 py-2 rounded-lg text-sm"
            style={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}
          >
            <option value="">Todos os tipos</option>
            <option value="INVOICE">Nota Fiscal</option>
            <option value="RECEIPT">Recibo</option>
            <option value="BANK_STATEMENT">Extrato</option>
            <option value="CONTRACT">Contrato</option>
            <option value="OTHER">Outro</option>
          </select>

          <select
            value={filters.status}
            onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
            className="px-3 py-2 rounded-lg text-sm"
            style={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}
          >
            <option value="">Todos os status</option>
            <option value="ACTIVE">Ativos</option>
            <option value="CANCELLED">Cancelados</option>
            <option value="ARCHIVED">Arquivados</option>
          </select>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
            style={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}
          >
            <Filter className="w-4 h-4" />
            {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
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
              onClick={() => setFilters({ search: '', type: '', status: '', startDate: '', endDate: '' })}
              className="mt-5 text-xs px-3 py-1.5 rounded-lg"
              style={{ color: '#ef4444' }}
            >
              Limpar filtros
            </button>
          </div>
        )}
      </div>

      {/* Tabela */}
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.06)' }}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#f97316' }} />
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="w-12 h-12 mx-auto mb-3" style={{ color: '#334155' }} />
            <p className="text-sm" style={{ color: '#64748b' }}>Nenhum documento encontrado</p>
            <button
              onClick={openCreateModal}
              className="mt-3 text-sm font-medium"
              style={{ color: '#f97316' }}
            >
              Criar primeiro documento
            </button>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#64748b' }}>Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#64748b' }}>Número</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#64748b' }}>Data Emissão</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: '#64748b' }}>Valor</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#64748b' }}>Contraparte</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider" style={{ color: '#64748b' }}>Status</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider" style={{ color: '#64748b' }}>Conciliado</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider" style={{ color: '#64748b' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => {
                  const typeInfo = typeLabels[doc.type] || typeLabels.OTHER;
                  const statusInfo = statusLabels[doc.status] || statusLabels.ACTIVE;
                  const IconComponent = typeInfo.icon;
                  return (
                    <tr
                      key={doc.id}
                      className="transition-colors"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: typeInfo.bg }}>
                            <IconComponent className="w-3.5 h-3.5" style={{ color: typeInfo.color }} />
                          </div>
                          <span className="text-xs font-medium" style={{ color: typeInfo.color }}>{typeInfo.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-mono font-medium text-white">{doc.number}</p>
                        {doc.description && <p className="text-xs mt-0.5 truncate max-w-[200px]" style={{ color: '#64748b' }}>{doc.description}</p>}
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: '#94a3b8' }}>{formatDate(doc.issueDate)}</td>
                      <td className="px-4 py-3 text-sm text-right font-mono font-medium text-white">
                        {formatCurrency(doc.amount)}
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: '#94a3b8' }}>
                        {doc.counterparty?.name || '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ backgroundColor: statusInfo.bg, color: statusInfo.color }}
                        >
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {doc.reconciliation ? (
                          <span className="text-xs" style={{ color: '#22c55e' }}>Sim</span>
                        ) : (
                          <span className="text-xs" style={{ color: '#64748b' }}>Não</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditModal(doc)}
                            className="p-1.5 rounded-lg transition-colors"
                            style={{ color: '#64748b' }}
                            title="Editar"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          {doc.status === 'ACTIVE' && (
                            <button
                              onClick={() => handleArchive(doc.id)}
                              className="p-1.5 rounded-lg transition-colors"
                              style={{ color: '#64748b' }}
                              title="Arquivar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs" style={{ color: '#64748b' }}>
                  Página {pagination.page} de {pagination.totalPages} ({pagination.total} documentos)
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => loadDocuments(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="px-3 py-1 rounded text-sm disabled:opacity-30"
                    style={{ backgroundColor: '#1e293b', color: '#94a3b8' }}
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => loadDocuments(pagination.page + 1)}
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

      {/* Modal Criar/Editar */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-md rounded-xl p-6 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-white">
                {editingId ? 'Editar Documento' : 'Novo Documento'}
              </h3>
              <button onClick={() => setShowModal(false)}>
                <X className="w-5 h-5" style={{ color: '#64748b' }} />
              </button>
            </div>

            <div className="space-y-3">
              {!editingId && (
                <div>
                  <label className="text-xs font-medium" style={{ color: '#94a3b8' }}>Tipo *</label>
                  <select
                    value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value as any }))}
                    className="w-full mt-1 px-3 py-2 rounded-lg text-sm"
                    style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}
                  >
                    <option value="INVOICE">Nota Fiscal</option>
                    <option value="RECEIPT">Recibo</option>
                    <option value="BANK_STATEMENT">Extrato Bancário</option>
                    <option value="CONTRACT">Contrato</option>
                    <option value="OTHER">Outro</option>
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-medium" style={{ color: '#94a3b8' }}>Número *</label>
                <input
                  type="text"
                  value={form.number}
                  onChange={e => setForm(f => ({ ...f, number: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-lg text-sm"
                  style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}
                  placeholder="NF-001234"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium" style={{ color: '#94a3b8' }}>Data de Emissão *</label>
                  <input
                    type="date"
                    value={form.issueDate}
                    onChange={e => setForm(f => ({ ...f, issueDate: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 rounded-lg text-sm"
                    style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium" style={{ color: '#94a3b8' }}>Valor (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 rounded-lg text-sm"
                    style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}
                    placeholder="0,00"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium" style={{ color: '#94a3b8' }}>Contraparte</label>
                <select
                  value={form.counterpartyId}
                  onChange={e => setForm(f => ({ ...f, counterpartyId: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-lg text-sm"
                  style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}
                >
                  <option value="">Selecione...</option>
                  {counterparties.map(cp => (
                    <option key={cp.id} value={cp.id}>{cp.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium" style={{ color: '#94a3b8' }}>Descrição</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full mt-1 px-3 py-2 rounded-lg text-sm resize-none"
                  style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}
                  placeholder="Descrição do documento..."
                />
              </div>

              <div>
                <label className="text-xs font-medium" style={{ color: '#94a3b8' }}>URL do Arquivo</label>
                <input
                  type="url"
                  value={form.fileUrl}
                  onChange={e => setForm(f => ({ ...f, fileUrl: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-lg text-sm"
                  style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium"
                style={{ backgroundColor: '#374151', color: '#94a3b8' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                style={{ backgroundColor: '#f97316', color: '#fff' }}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {editingId ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
