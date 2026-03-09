import { useState, useEffect, useCallback } from 'react';
import { counterpartiesApi } from '@/lib/api';
import {
  Users,
  Plus,
  Search,
  Edit3,
  Trash2,
  X,
  Loader2,
  Building2,
  User,
  ArrowUpDown,
  FileText,
  GitCompareArrows,
} from 'lucide-react';

interface Counterparty {
  id: string;
  name: string;
  document?: string;
  type: 'SUPPLIER' | 'CLIENT' | 'BOTH';
  email?: string;
  phone?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  _count?: {
    transactionDetails: number;
    documents: number;
  };
}

const typeLabels: Record<string, { label: string; color: string; bg: string }> = {
  SUPPLIER: { label: 'Fornecedor', color: '#f97316', bg: 'rgba(249,115,22,0.15)' },
  CLIENT: { label: 'Cliente', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  BOTH: { label: 'Ambos', color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
};

export default function Contrapartes() {
  const [counterparties, setCounterparties] = useState<Counterparty[]>([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    document: '',
    type: 'SUPPLIER' as 'SUPPLIER' | 'CLIENT' | 'BOTH',
    email: '',
    phone: '',
    notes: '',
  });

  const loadCounterparties = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params: any = { page, limit: 20 };
      if (search) params.search = search;
      if (typeFilter) params.type = typeFilter;

      const res = await counterpartiesApi.list(params);
      const data = res.data;
      setCounterparties(data.data || []);
      setPagination(data.pagination || { page: 1, total: 0, totalPages: 0 });
    } catch (err) {
      console.error('Erro ao carregar contrapartes:', err);
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter]);

  useEffect(() => {
    loadCounterparties();
  }, [search, typeFilter]);

  const openCreateModal = () => {
    setEditingId(null);
    setForm({ name: '', document: '', type: 'SUPPLIER', email: '', phone: '', notes: '' });
    setShowModal(true);
  };

  const openEditModal = (cp: Counterparty) => {
    setEditingId(cp.id);
    setForm({
      name: cp.name,
      document: cp.document || '',
      type: cp.type,
      email: cp.email || '',
      phone: cp.phone || '',
      notes: cp.notes || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      alert('Nome é obrigatório');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await counterpartiesApi.update(editingId, {
          name: form.name,
          document: form.document || undefined,
          type: form.type,
          email: form.email || undefined,
          phone: form.phone || undefined,
          notes: form.notes || undefined,
        });
      } else {
        await counterpartiesApi.create({
          name: form.name,
          document: form.document || undefined,
          type: form.type,
          email: form.email || undefined,
          phone: form.phone || undefined,
          notes: form.notes || undefined,
        });
      }
      setShowModal(false);
      await loadCounterparties(pagination.page);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao salvar contraparte');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deseja realmente desativar "${name}"?`)) return;
    try {
      await counterpartiesApi.delete(id);
      await loadCounterparties(pagination.page);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao desativar contraparte');
    }
  };

  return (
    <div className="p-6 space-y-6" style={{ color: '#e2e8f0' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Users className="w-7 h-7" style={{ color: '#8b5cf6' }} />
            Contrapartes
          </h1>
          <p className="text-sm mt-1" style={{ color: '#64748b' }}>
            Gerencie fornecedores, clientes e parceiros
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
          style={{ backgroundColor: '#8b5cf6', color: '#fff' }}
        >
          <Plus className="w-4 h-4" />
          Nova Contraparte
        </button>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#64748b' }} />
          <input
            type="text"
            placeholder="Buscar por nome, documento ou email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm"
            style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}
          />
        </div>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="px-3 py-2.5 rounded-lg text-sm"
          style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}
        >
          <option value="">Todos os tipos</option>
          <option value="SUPPLIER">Fornecedores</option>
          <option value="CLIENT">Clientes</option>
          <option value="BOTH">Ambos</option>
        </select>
      </div>

      {/* Lista */}
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.06)' }}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#8b5cf6' }} />
          </div>
        ) : counterparties.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-12 h-12 mx-auto mb-3" style={{ color: '#334155' }} />
            <p className="text-sm" style={{ color: '#64748b' }}>Nenhuma contraparte encontrada</p>
            <button
              onClick={openCreateModal}
              className="mt-3 text-sm font-medium"
              style={{ color: '#8b5cf6' }}
            >
              Criar primeira contraparte
            </button>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#64748b' }}>Nome</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#64748b' }}>Documento</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider" style={{ color: '#64748b' }}>Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#64748b' }}>Contato</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider" style={{ color: '#64748b' }}>Transações</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider" style={{ color: '#64748b' }}>Documentos</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider" style={{ color: '#64748b' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {counterparties.map((cp) => {
                  const typeInfo = typeLabels[cp.type] || typeLabels.SUPPLIER;
                  return (
                    <tr
                      key={cp.id}
                      className="transition-colors"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', opacity: cp.isActive ? 1 : 0.5 }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: typeInfo.bg }}>
                            {cp.type === 'SUPPLIER' ? <Building2 className="w-4 h-4" style={{ color: typeInfo.color }} /> :
                             cp.type === 'CLIENT' ? <User className="w-4 h-4" style={{ color: typeInfo.color }} /> :
                             <ArrowUpDown className="w-4 h-4" style={{ color: typeInfo.color }} />}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{cp.name}</p>
                            {!cp.isActive && <span className="text-xs" style={{ color: '#ef4444' }}>Inativo</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono" style={{ color: '#94a3b8' }}>
                        {cp.document || '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium"
                          style={{ backgroundColor: typeInfo.bg, color: typeInfo.color }}
                        >
                          {typeInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {cp.email && <p className="text-xs" style={{ color: '#94a3b8' }}>{cp.email}</p>}
                        {cp.phone && <p className="text-xs" style={{ color: '#64748b' }}>{cp.phone}</p>}
                        {!cp.email && !cp.phone && <span className="text-xs" style={{ color: '#475569' }}>—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <GitCompareArrows className="w-3 h-3" style={{ color: '#64748b' }} />
                          <span className="text-sm" style={{ color: '#94a3b8' }}>{cp._count?.transactionDetails || 0}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <FileText className="w-3 h-3" style={{ color: '#64748b' }} />
                          <span className="text-sm" style={{ color: '#94a3b8' }}>{cp._count?.documents || 0}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditModal(cp)}
                            className="p-1.5 rounded-lg transition-colors"
                            style={{ color: '#64748b' }}
                            title="Editar"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          {cp.isActive && (
                            <button
                              onClick={() => handleDelete(cp.id, cp.name)}
                              className="p-1.5 rounded-lg transition-colors"
                              style={{ color: '#64748b' }}
                              title="Desativar"
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
                  Página {pagination.page} de {pagination.totalPages} ({pagination.total} contrapartes)
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => loadCounterparties(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="px-3 py-1 rounded text-sm disabled:opacity-30"
                    style={{ backgroundColor: '#1e293b', color: '#94a3b8' }}
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => loadCounterparties(pagination.page + 1)}
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
          <div className="w-full max-w-md rounded-xl p-6" style={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-white">
                {editingId ? 'Editar Contraparte' : 'Nova Contraparte'}
              </h3>
              <button onClick={() => setShowModal(false)}>
                <X className="w-5 h-5" style={{ color: '#64748b' }} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium" style={{ color: '#94a3b8' }}>Nome *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-lg text-sm"
                  style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}
                  placeholder="Nome da contraparte"
                />
              </div>

              <div>
                <label className="text-xs font-medium" style={{ color: '#94a3b8' }}>CNPJ/CPF</label>
                <input
                  type="text"
                  value={form.document}
                  onChange={e => setForm(f => ({ ...f, document: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-lg text-sm"
                  style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}
                  placeholder="00.000.000/0001-00"
                />
              </div>

              <div>
                <label className="text-xs font-medium" style={{ color: '#94a3b8' }}>Tipo</label>
                <select
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value as any }))}
                  className="w-full mt-1 px-3 py-2 rounded-lg text-sm"
                  style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}
                >
                  <option value="SUPPLIER">Fornecedor</option>
                  <option value="CLIENT">Cliente</option>
                  <option value="BOTH">Ambos</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium" style={{ color: '#94a3b8' }}>Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 rounded-lg text-sm"
                    style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}
                    placeholder="email@empresa.com"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium" style={{ color: '#94a3b8' }}>Telefone</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 rounded-lg text-sm"
                    style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium" style={{ color: '#94a3b8' }}>Observações</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full mt-1 px-3 py-2 rounded-lg text-sm resize-none"
                  style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}
                  placeholder="Notas sobre esta contraparte..."
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
                style={{ backgroundColor: '#8b5cf6', color: '#fff' }}
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
