import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Edit2, Trash2, FileText, Loader2, CheckCircle,
  XCircle, X, AlertTriangle, Download, Eye, Calendar
} from 'lucide-react';
import { documentsApi, counterpartiesApi } from '../lib/api';

interface Document {
  id: string;
  number: string;
  type: string;
  description: string;
  amount: number;
  issueDate: string;
  dueDate: string;
  status: string;
  counterpartyId: string;
  counterparty?: { id: string; name: string };
  notes: string;
  createdAt: string;
}

interface Counterparty { id: string; name: string; }

const docTypes = [
  { value: 'NF', label: 'Nota Fiscal' },
  { value: 'NFS', label: 'NFS-e' },
  { value: 'RECEIPT', label: 'Recibo' },
  { value: 'INVOICE', label: 'Fatura' },
  { value: 'CONTRACT', label: 'Contrato' },
  { value: 'STATEMENT', label: 'Extrato' },
  { value: 'OTHER', label: 'Outro' },
];

const emptyForm = { number: '', type: 'NF', description: '', amount: '', issueDate: '', dueDate: '', counterpartyId: '', notes: '' };

export default function Documentos() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [counterparties, setCounterparties] = useState<Counterparty[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [actionResult, setActionResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => { loadData(); }, [filterType]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [docRes, cpRes] = await Promise.all([
        documentsApi.list({ type: filterType || undefined, search: search || undefined }),
        counterpartiesApi.list({ isActive: true }).catch(() => ({ data: { data: [] } })),
      ]);
      setDocuments(docRes.data?.data || []);
      setCounterparties(cpRes.data?.data || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!form.number || !form.type) { setFormError('Número e tipo são obrigatórios'); return; }
    setSaving(true); setFormError('');
    try {
      const payload = { ...form, amount: form.amount ? parseFloat(form.amount) : undefined };
      if (editingId) { await documentsApi.update(editingId, payload); }
      else { await documentsApi.create(payload); }
      setActionResult({ success: true, message: editingId ? 'Documento atualizado!' : 'Documento criado!' });
      setShowForm(false); setEditingId(null); setForm({ ...emptyForm }); loadData();
    } catch (err: any) { setFormError(err.response?.data?.error || 'Erro ao salvar'); }
    finally { setSaving(false); setTimeout(() => setActionResult(null), 3000); }
  };

  const handleDelete = async (id: string) => {
    try { await documentsApi.delete(id); setActionResult({ success: true, message: 'Documento removido!' }); loadData(); }
    catch { setActionResult({ success: false, message: 'Erro ao remover' }); }
    setTimeout(() => setActionResult(null), 3000);
  };

  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '-';
  const getTypeLabel = (t: string) => docTypes.find(d => d.value === t)?.label || t;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documentos Fiscais</h1>
          <p className="text-gray-500 mt-1">Gerencie notas fiscais, recibos e contratos</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditingId(null); setForm({ ...emptyForm }); setFormError(''); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Novo Documento
        </button>
      </div>

      {actionResult && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${actionResult.success ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {actionResult.success ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          <span className="text-sm font-medium">{actionResult.message}</span>
        </div>
      )}

      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Buscar por número, descrição..." value={search}
            onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && loadData()}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <option value="">Todos os tipos</option>
          {docTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{editingId ? 'Editar Documento' : 'Novo Documento'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Número *</label>
                  <input type="text" value={form.number} onChange={(e) => setForm((f: any) => ({ ...f, number: e.target.value }))} placeholder="NF-001" className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                  <select value={form.type} onChange={(e) => setForm((f: any) => ({ ...f, type: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    {docTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <input type="text" value={form.description} onChange={(e) => setForm((f: any) => ({ ...f, description: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
                  <input type="number" step="0.01" value={form.amount} onChange={(e) => setForm((f: any) => ({ ...f, amount: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Emissão</label>
                  <input type="date" value={form.issueDate} onChange={(e) => setForm((f: any) => ({ ...f, issueDate: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Vencimento</label>
                  <input type="date" value={form.dueDate} onChange={(e) => setForm((f: any) => ({ ...f, dueDate: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Contraparte</label>
                <select value={form.counterpartyId} onChange={(e) => setForm((f: any) => ({ ...f, counterpartyId: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                  <option value="">Selecione...</option>
                  {counterparties.map(cp => <option key={cp.id} value={cp.id}>{cp.name}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                <textarea rows={2} value={form.notes} onChange={(e) => setForm((f: any) => ({ ...f, notes: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none" /></div>
            </div>
            {formError && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{formError}</div>}
            <div className="flex gap-3 pt-2">
              <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} {editingId ? 'Atualizar' : 'Criar'}</button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2.5 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
      ) : documents.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="font-medium text-gray-700">Nenhum documento encontrado</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Número</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contraparte</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Vencimento</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {documents.map(doc => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{doc.number}</td>
                  <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{getTypeLabel(doc.type)}</span></td>
                  <td className="px-4 py-3 text-sm text-gray-600 truncate max-w-[200px]">{doc.description || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{doc.counterparty?.name || '-'}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">{doc.amount ? formatCurrency(doc.amount) : '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 text-center">{formatDate(doc.dueDate)}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => { setForm({ number: doc.number, type: doc.type, description: doc.description || '', amount: doc.amount?.toString() || '', issueDate: doc.issueDate?.split('T')[0] || '', dueDate: doc.dueDate?.split('T')[0] || '', counterpartyId: doc.counterpartyId || '', notes: doc.notes || '' }); setEditingId(doc.id); setShowForm(true); }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(doc.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
