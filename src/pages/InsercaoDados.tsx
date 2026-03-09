import React, { useState, useEffect, useCallback } from 'react';
import {
  Upload, FileText, Plus, ChevronDown, ChevronUp, Download,
  AlertCircle, CheckCircle, X, Loader2, Calendar, DollarSign,
  User, FileCheck, Building2, Hash
} from 'lucide-react';
import { uploadApi, financialApi, counterpartiesApi, categoriesApi } from '../lib/api';

interface Category {
  id: string;
  name: string;
  code: string;
  type: 'INCOME' | 'EXPENSE';
}

interface Counterparty {
  id: string;
  name: string;
  type: 'SUPPLIER' | 'CLIENT' | 'BOTH';
}

interface ManualTransaction {
  date: string;
  description: string;
  amount: string;
  type: 'INCOME' | 'EXPENSE';
  categoryId: string;
  notes: string;
  // Campos avançados (colapsáveis)
  counterpartyId: string;
  documentNumber: string;
  dueDate: string;
  bankReference: string;
}

const emptyTransaction: ManualTransaction = {
  date: new Date().toISOString().split('T')[0],
  description: '',
  amount: '',
  type: 'EXPENSE',
  categoryId: '',
  notes: '',
  counterpartyId: '',
  documentNumber: '',
  dueDate: '',
  bankReference: '',
};

export default function InsercaoDados() {
  const [activeTab, setActiveTab] = useState<'csv' | 'manual'>('csv');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [uploadError, setUploadError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  // Manual form
  const [transaction, setTransaction] = useState<ManualTransaction>({ ...emptyTransaction });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null);

  // Lookups
  const [categories, setCategories] = useState<Category[]>([]);
  const [counterparties, setCounterparties] = useState<Counterparty[]>([]);
  const [uploadHistory, setUploadHistory] = useState<any[]>([]);

  useEffect(() => {
    loadLookups();
    loadUploadHistory();
  }, []);

  const loadLookups = async () => {
    try {
      const [catRes, cpRes] = await Promise.all([
        categoriesApi.list().catch(() => ({ data: { data: [] } })),
        counterpartiesApi.list({ isActive: true }).catch(() => ({ data: { data: [] } })),
      ]);
      setCategories(catRes.data?.data || catRes.data || []);
      setCounterparties(cpRes.data?.data || cpRes.data || []);
    } catch (err) {
      console.error('Erro ao carregar lookups:', err);
    }
  };

  const loadUploadHistory = async () => {
    try {
      const res = await uploadApi.history();
      setUploadHistory(res.data?.data || res.data || []);
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
    }
  };

  // ============================================
  // CSV Upload
  // ============================================
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.csv')) {
      setFile(droppedFile);
      setUploadError('');
    } else {
      setUploadError('Apenas arquivos .csv são aceitos');
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setUploadError('');
      setUploadResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setUploadError('');
    setUploadResult(null);
    try {
      const res = await uploadApi.csv(file);
      setUploadResult(res.data);
      setFile(null);
      loadUploadHistory();
    } catch (err: any) {
      setUploadError(err.response?.data?.error || 'Erro ao processar o arquivo CSV');
    } finally {
      setUploading(false);
    }
  };

  // ============================================
  // Manual Transaction
  // ============================================
  const handleSaveTransaction = async () => {
    if (!transaction.description || !transaction.amount || !transaction.date) {
      setSaveResult({ success: false, message: 'Preencha os campos obrigatórios: data, descrição e valor' });
      return;
    }

    setSaving(true);
    setSaveResult(null);
    try {
      await financialApi.createTransaction({
        date: transaction.date,
        description: transaction.description,
        amount: parseFloat(transaction.amount),
        type: transaction.type,
        categoryId: transaction.categoryId || undefined,
        notes: transaction.notes || undefined,
      });
      setSaveResult({ success: true, message: 'Transação criada com sucesso!' });
      setTransaction({ ...emptyTransaction });
      setShowAdvanced(false);
    } catch (err: any) {
      setSaveResult({ success: false, message: err.response?.data?.error || 'Erro ao salvar transação' });
    } finally {
      setSaving(false);
    }
  };

  const filteredCategories = categories.filter(c => c.type === transaction.type);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Inserção de Dados</h1>
        <p className="text-gray-500 mt-1">Importe transações via CSV ou cadastre manualmente</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('csv')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'csv'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Upload className="w-4 h-4" />
          Upload CSV
        </button>
        <button
          onClick={() => setActiveTab('manual')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'manual'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Plus className="w-4 h-4" />
          Cadastro Manual
        </button>
      </div>

      {/* ============================================ */}
      {/* TAB: CSV Upload */}
      {/* ============================================ */}
      {activeTab === 'csv' && (
        <div className="space-y-6">
          {/* Template Download */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
            <FileText className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-medium text-blue-900">Template CSV (9 colunas)</h3>
              <p className="text-sm text-blue-700 mt-1">
                O CSV agora aceita 9 colunas: <strong>data, descricao, valor, tipo, categoria, contraparte, documento_numero, vencimento, referencia_bancaria</strong>.
                Apenas as 4 primeiras são obrigatórias.
              </p>
              <button
                onClick={() => uploadApi.downloadTemplate()}
                className="mt-2 flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:text-blue-900 transition-colors"
              >
                <Download className="w-4 h-4" />
                Baixar template CSV
              </button>
            </div>
          </div>

          {/* Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
              dragOver
                ? 'border-blue-500 bg-blue-50'
                : file
                ? 'border-green-400 bg-green-50'
                : 'border-gray-300 bg-gray-50 hover:border-gray-400'
            }`}
          >
            {file ? (
              <div className="space-y-3">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                <div>
                  <p className="font-medium text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Enviar e Processar
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => { setFile(null); setUploadResult(null); }}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                <div>
                  <p className="font-medium text-gray-700">Arraste o arquivo CSV aqui</p>
                  <p className="text-sm text-gray-500">ou clique para selecionar</p>
                </div>
                <label className="inline-block px-4 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-sm font-medium text-gray-700">
                  Selecionar arquivo
                  <input type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />
                </label>
              </div>
            )}
          </div>

          {/* Upload Error */}
          {uploadError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-800">Erro no upload</p>
                <p className="text-sm text-red-700">{uploadError}</p>
              </div>
            </div>
          )}

          {/* Upload Result */}
          {uploadResult && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-green-800">Upload processado com sucesso!</p>
                  <p className="text-sm text-green-700 mt-1">
                    {uploadResult.transactionsCreated || uploadResult.count || 0} transações importadas
                  </p>
                  {uploadResult.errors?.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-medium text-amber-700">
                        {uploadResult.errors.length} linhas com erro:
                      </p>
                      <ul className="text-sm text-amber-600 mt-1 list-disc list-inside">
                        {uploadResult.errors.slice(0, 5).map((err: any, i: number) => (
                          <li key={i}>Linha {err.line}: {err.message}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Upload History */}
          {uploadHistory.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="px-4 py-3 border-b border-gray-200">
                <h3 className="font-medium text-gray-900">Histórico de Uploads</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {uploadHistory.slice(0, 5).map((upload: any) => (
                  <div key={upload.id} className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{upload.filename}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(upload.createdAt).toLocaleDateString('pt-BR')} - {upload.totalRows || 0} transações
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      upload.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                      upload.status === 'ERROR' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {upload.status === 'COMPLETED' ? 'Concluído' :
                       upload.status === 'ERROR' ? 'Erro' : 'Processando'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================ */}
      {/* TAB: Manual Transaction */}
      {/* ============================================ */}
      {activeTab === 'manual' && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-600" />
            Nova Transação
          </h3>

          {/* Campos obrigatórios */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Tipo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setTransaction(t => ({ ...t, type: 'EXPENSE', categoryId: '' }))}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-all ${
                    transaction.type === 'EXPENSE'
                      ? 'bg-red-50 border-red-300 text-red-700'
                      : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Despesa
                </button>
                <button
                  onClick={() => setTransaction(t => ({ ...t, type: 'INCOME', categoryId: '' }))}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-all ${
                    transaction.type === 'INCOME'
                      ? 'bg-green-50 border-green-300 text-green-700'
                      : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Receita
                </button>
              </div>
            </div>

            {/* Data */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="w-3.5 h-3.5 inline mr-1" />
                Data *
              </label>
              <input
                type="date"
                value={transaction.date}
                onChange={(e) => setTransaction(t => ({ ...t, date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Valor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <DollarSign className="w-3.5 h-3.5 inline mr-1" />
                Valor (R$) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={transaction.amount}
                onChange={(e) => setTransaction(t => ({ ...t, amount: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Descrição */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição *</label>
              <input
                type="text"
                placeholder="Ex: Pagamento fornecedor XYZ"
                value={transaction.description}
                onChange={(e) => setTransaction(t => ({ ...t, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Categoria */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
              <select
                value={transaction.categoryId}
                onChange={(e) => setTransaction(t => ({ ...t, categoryId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Selecione...</option>
                {filteredCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.code} - {cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Campos avançados (colapsáveis) */}
          <div className="border-t border-gray-200 pt-4">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Campos Avançados (contraparte, documento, vencimento)
            </button>

            {showAdvanced && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Contraparte */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Building2 className="w-3.5 h-3.5 inline mr-1" />
                    Contraparte
                  </label>
                  <select
                    value={transaction.counterpartyId}
                    onChange={(e) => setTransaction(t => ({ ...t, counterpartyId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Selecione...</option>
                    {counterparties.map(cp => (
                      <option key={cp.id} value={cp.id}>
                        {cp.name} ({cp.type === 'SUPPLIER' ? 'Fornecedor' : cp.type === 'CLIENT' ? 'Cliente' : 'Ambos'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Nº Documento */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Hash className="w-3.5 h-3.5 inline mr-1" />
                    Nº Documento
                  </label>
                  <input
                    type="text"
                    placeholder="NF-001, REC-001..."
                    value={transaction.documentNumber}
                    onChange={(e) => setTransaction(t => ({ ...t, documentNumber: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Vencimento */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Calendar className="w-3.5 h-3.5 inline mr-1" />
                    Vencimento
                  </label>
                  <input
                    type="date"
                    value={transaction.dueDate}
                    onChange={(e) => setTransaction(t => ({ ...t, dueDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Referência Bancária */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <FileCheck className="w-3.5 h-3.5 inline mr-1" />
                    Referência Bancária
                  </label>
                  <input
                    type="text"
                    placeholder="TED-123, PIX-456..."
                    value={transaction.bankReference}
                    onChange={(e) => setTransaction(t => ({ ...t, bankReference: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Notas */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                  <textarea
                    rows={2}
                    placeholder="Notas adicionais..."
                    value={transaction.notes}
                    onChange={(e) => setTransaction(t => ({ ...t, notes: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Save Result */}
          {saveResult && (
            <div className={`p-3 rounded-lg flex items-center gap-2 ${
              saveResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {saveResult.success ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span className="text-sm">{saveResult.message}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSaveTransaction}
              disabled={saving}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 font-medium"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Salvar Transação
                </>
              )}
            </button>
            <button
              onClick={() => { setTransaction({ ...emptyTransaction }); setSaveResult(null); setShowAdvanced(false); }}
              className="px-4 py-2.5 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Limpar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
