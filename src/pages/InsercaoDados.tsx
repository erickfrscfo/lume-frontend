import { useState, useRef, useCallback } from 'react';
import { uploadApi, financialApi } from '@/lib/api';
import { formatCurrencyFull, formatDate } from '@/lib/utils';
import LoadingSpinner from '@/components/LoadingSpinner';
import {
  Upload, FileSpreadsheet, CheckCircle2, XCircle, Download,
  Loader2, Trash2, Plus, AlertTriangle, Info
} from 'lucide-react';

interface UploadResult {
  success: boolean;
  imported: number;
  classified: number;
  errors: string[];
  transactions?: any[];
}

interface ManualTransaction {
  date: string;
  description: string;
  amount: string;
  type: 'INCOME' | 'EXPENSE';
}

export default function InsercaoDados() {
  const [activeTab, setActiveTab] = useState<'upload' | 'manual' | 'history'>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual entry
  const [manualForm, setManualForm] = useState<ManualTransaction>({
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    type: 'EXPENSE',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const handleUpload = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setError('Por favor, selecione um arquivo CSV.');
      return;
    }

    setIsUploading(true);
    setError('');
    setUploadResult(null);

    try {
      const res = await uploadApi.csv(file);
      setUploadResult(res.data.data || res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao fazer upload. Verifique o formato do arquivo.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleManualSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    setError('');

    try {
      await financialApi.createTransaction({
        date: manualForm.date,
        description: manualForm.description,
        amount: parseFloat(manualForm.amount.replace(',', '.')),
        type: manualForm.type,
      });
      setSaveSuccess(true);
      setManualForm({ date: new Date().toISOString().split('T')[0], description: '', amount: '', type: 'EXPENSE' });
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao salvar transação.');
    } finally {
      setIsSaving(false);
    }
  };

  const downloadTemplate = () => {
    const csv = 'data,descricao,valor,tipo\n2025-01-15,Venda de produto,5000.00,receita\n2025-01-16,Aluguel escritório,-3500.00,despesa\n2025-01-17,Serviço consultoria,8000.00,receita\n2025-01-18,Folha de pagamento,-12000.00,despesa';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_lume.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Inserção de Dados</h2>
        <p className="text-sm text-slate-500 mt-1">Importe transações via CSV ou insira manualmente</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {[
          { id: 'upload' as const, label: 'Upload CSV', icon: Upload },
          { id: 'manual' as const, label: 'Entrada Manual', icon: Plus },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setError(''); setUploadResult(null); }}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Upload Tab */}
      {activeTab === 'upload' && (
        <div className="space-y-4">
          {/* Template Download */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Info className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-blue-800">Template CSV</p>
                <p className="text-xs text-blue-600">Baixe o modelo para garantir o formato correto</p>
              </div>
            </div>
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              Baixar Template
            </button>
          </div>

          {/* Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
            }`}
          >
            <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />
            {isUploading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                <p className="text-sm font-medium text-slate-700">Processando arquivo...</p>
                <p className="text-xs text-slate-500">A IA está classificando suas transações automaticamente</p>
              </div>
            ) : (
              <>
                <FileSpreadsheet className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-700">
                  Arraste seu arquivo CSV aqui ou <span className="text-blue-600">clique para selecionar</span>
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  Colunas: data, descricao, valor, tipo (receita/despesa)
                </p>
              </>
            )}
          </div>

          {/* Upload Result */}
          {uploadResult && (
            <div className={`rounded-xl border p-6 ${uploadResult.success ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
              <div className="flex items-center gap-3 mb-4">
                {uploadResult.success
                  ? <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  : <AlertTriangle className="w-6 h-6 text-amber-500" />}
                <h3 className="text-lg font-semibold text-slate-900">
                  {uploadResult.success ? 'Upload Concluído!' : 'Upload com Avisos'}
                </h3>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-white rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-slate-900">{uploadResult.imported}</p>
                  <p className="text-xs text-slate-500">Importadas</p>
                </div>
                <div className="bg-white rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-blue-600">{uploadResult.classified}</p>
                  <p className="text-xs text-slate-500">Classificadas pela IA</p>
                </div>
                <div className="bg-white rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-red-500">{uploadResult.errors?.length || 0}</p>
                  <p className="text-xs text-slate-500">Erros</p>
                </div>
              </div>
              {uploadResult.errors && uploadResult.errors.length > 0 && (
                <div className="bg-white rounded-lg p-3">
                  <p className="text-xs font-medium text-slate-700 mb-2">Erros encontrados:</p>
                  {uploadResult.errors.slice(0, 5).map((err, i) => (
                    <p key={i} className="text-xs text-red-600">{err}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Manual Tab */}
      {activeTab === 'manual' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Nova Transação</h3>

          {saveSuccess && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="text-sm text-emerald-700">Transação salva com sucesso!</span>
            </div>
          )}

          <form onSubmit={handleManualSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Data</label>
                <input
                  type="date"
                  value={manualForm.date}
                  onChange={(e) => setManualForm(prev => ({ ...prev, date: e.target.value }))}
                  required
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Tipo</label>
                <select
                  value={manualForm.type}
                  onChange={(e) => setManualForm(prev => ({ ...prev, type: e.target.value as 'INCOME' | 'EXPENSE' }))}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="EXPENSE">Despesa</option>
                  <option value="INCOME">Receita</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Descrição</label>
              <input
                type="text"
                value={manualForm.description}
                onChange={(e) => setManualForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Ex: Pagamento fornecedor XYZ"
                required
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Valor (R$)</label>
              <input
                type="text"
                value={manualForm.amount}
                onChange={(e) => setManualForm(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="0,00"
                required
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
            >
              {isSaving ? 'Salvando...' : 'Salvar Transação'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
