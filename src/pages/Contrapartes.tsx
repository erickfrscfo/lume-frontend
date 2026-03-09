import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Edit2, Trash2, Building2, User, Phone, Mail,
  FileText, Loader2, CheckCircle, XCircle, ChevronDown, ChevronUp,
  DollarSign, TrendingUp, AlertTriangle, X
} from 'lucide-react';
import { counterpartiesApi } from '../lib/api';

interface Counterparty {
  id: string;
  name: string;
  document: string;
  type: 'SUPPLIER' | 'CLIENT' | 'BOTH';
  email: string;
  phone: string;
  address: string;
  notes: string;
  isActive: boolean;
  totalTransactions: number;
  totalAmount: number;
  avgPaymentDays: number;
  lastTransactionDate: string;
  createdAt: string;
}

const emptyForm = {
  name: '',
  document: '',
  type: 'SUPPLIER' as 'SUPPLIER' | 'CLIENT' | 'BOTH',
  email: '',
  phone: '',
  address: '',
  notes: '',
};

export default function Contrapartes() {
  const [counterparties, setCounterparties] = useState<Counterparty[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  // Form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Expanded detail
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Action feedback
  const [actionResult, setActionResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    loadCounterparties();
  }, [filterType, showInactive]);

  const loadCounterparties = async () => {
    setLoading(true);
    try {
      const res = await counterpartiesApi.list({
        type: filterType || undefined,
        isActive: showInactive ? undefined : true,
        search: search || undefined,
      });
      setCounterparties(res.data?.data || []);
    } catch (err) {
      console.error('Erro ao carregar contrapartes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadCounterparties();
  };

  const handleSave = async () => {
    if (!form.name) {
      setFormError('Nome é obrigatório');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      if (editingId) {
        await counterpartiesApi.update(editingId, form);
        setActionResult({ success: true, message: 'Contraparte atualizada!' });
      } else {
        await counterpartiesApi.create(form);
        setActionResult({ success: true, message: 'Contraparte criada!' });
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ ...emptyForm });
      loadCounterparties();
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Erro ao salvar');
    } finally {
      setSaving(false);
      setTimeout(() => setActionResult(null), 3000);
    }
  };

  const handleEdit = (cp: Counterparty) => {
    setForm({
      name: cp.name,
      document: cp.document || '',
      type: cp.type,
      email: cp.email || '',
      phone: cp.phone || '',
      address: cp.address || '',
      notes: cp.notes || '',
    });
    setEditingId(cp.id);
    setShowForm(true);
    setFormError('');
  };

  const handleToggleActive = async (cp: Counterparty) => {
    try {
      if (cp.isActive) {
        await counterpartiesApi.delete(cp.id);
        setActionResult({ success: true, message: `${cp.name} desativado` });
      } else {
        await counterpartiesApi.update(cp.id, { isActive: true } as any);
        setActionResult({ success: true, message: `${cp.name} reativado` });
      }
      loadCounterparties();
    } catch (err) {
      setActionResult({ success: false, message: 'Erro ao alterar status' });
    }
    setTimeout(() => setActionResult(null), 3000);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'SUPPLIER': return { label: 'Fornecedor', color: 'bg-purple-100 text-purple-700' };
      case 'CLIENT': return { label: 'Cliente', color: 'bg-blue-100 text-blue-700' };
      case 'BOTH': return { label: 'Ambos', color: 'bg-gray-100 text-gray-700' };
      default: return { label: type, color: 'bg-gray-100 text-gray-700' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contrapartes</h1>
          <p className="text-gray-500 mt-1">Gerencie fornecedores e clientes</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setForm({ ...emptyForm }); setFormError(''); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Nova Contraparte
        </button>
      </div>

      {/* Action Result Toast */}
      {actionResult && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
          actionResult.success ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {actionResult.success ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          <span className="text-sm font-medium">{actionResult.message}</span>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome, CNPJ/CPF..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="">Todos os tipos</option>
          <option value="SUPPLIER">Fornecedores</option>
          <option value="CLIENT">Clientes</option>
          <option value="BOTH">Ambos</option>
        </select>
        <button
          onClick={() => setShowInactive(!showInactive)}
          className={`px-3 py-2 border rounded-lg text-sm ${
            showInactive ? 'bg-gray-100 border-gray-400' : 'border-gray-300 hover:bg-gray-50'
          }`}
        >
          {showInactive ? 'Mostrando inativos' : 'Mostrar inativos'}
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingId ? 'Editar Contraparte' : 'Nova Contraparte'}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Nome da empresa ou pessoa"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ/CPF</label>
                  <input
                    type="text"
                    value={form.document}
                    onChange={(e) => setForm(f => ({ ...f, document: e.target.value }))}
                    placeholder="00.000.000/0000-00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm(f => ({ ...f, type: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="SUPPLIER">Fornecedor</option>
                    <option value="CLIENT">Cliente</option>
                    <option value="BOTH">Ambos</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="email@empresa.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="(11) 99999-9999"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="Rua, número, cidade..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Notas adicionais..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>

            {formError && (
              <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                {formError}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {editingId ? 'Atualizar' : 'Criar'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2.5 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : counterparties.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="font-medium text-gray-700">Nenhuma contraparte encontrada</p>
          <p className="text-sm text-gray-500 mt-1">Cadastre fornecedores e clientes para começar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {counterparties.map((cp) => {
            const typeConfig = getTypeLabel(cp.type);
            const isExpanded = expandedId === cp.id;

            return (
              <div key={cp.id} className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${!cp.isActive ? 'opacity-60' : ''}`}>
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : cp.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-gray-500" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{cp.name}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeConfig.color}`}>
                            {typeConfig.label}
                          </span>
                          {!cp.isActive && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Inativo</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          {cp.document || 'Sem documento'} {cp.email ? `| ${cp.email}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden md:block">
                        <p className="text-sm font-semibold text-gray-900">{formatCurrency(cp.totalAmount)}</p>
                        <p className="text-xs text-gray-500">{cp.totalTransactions || 0} transações</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEdit(cp); }}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleToggleActive(cp); }}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          {cp.isActive ? <Trash2 className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        </button>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </div>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 border-t border-gray-100">
                    <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500 text-xs block mb-0.5">Total Transações</span>
                        <span className="font-medium text-gray-900">{cp.totalTransactions || 0}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 text-xs block mb-0.5">Volume Total</span>
                        <span className="font-medium text-gray-900">{formatCurrency(cp.totalAmount)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 text-xs block mb-0.5">Prazo Médio Pgto</span>
                        <span className="font-medium text-gray-900">{cp.avgPaymentDays || 0} dias</span>
                      </div>
                      <div>
                        <span className="text-gray-500 text-xs block mb-0.5">Última Transação</span>
                        <span className="font-medium text-gray-900">
                          {cp.lastTransactionDate ? new Date(cp.lastTransactionDate).toLocaleDateString('pt-BR') : '-'}
                        </span>
                      </div>
                      {cp.phone && (
                        <div>
                          <span className="text-gray-500 text-xs block mb-0.5">Telefone</span>
                          <span className="font-medium text-gray-900">{cp.phone}</span>
                        </div>
                      )}
                      {cp.address && (
                        <div className="col-span-2">
                          <span className="text-gray-500 text-xs block mb-0.5">Endereço</span>
                          <span className="font-medium text-gray-900">{cp.address}</span>
                        </div>
                      )}
                      {cp.notes && (
                        <div className="col-span-2 md:col-span-4">
                          <span className="text-gray-500 text-xs block mb-0.5">Observações</span>
                          <span className="text-gray-700">{cp.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
