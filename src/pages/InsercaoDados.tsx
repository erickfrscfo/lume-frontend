import { useState, useEffect, useCallback } from 'react';
import {
  Upload, FileText, Plus, AlertCircle, CheckCircle, Loader2,
  Calendar, DollarSign, ChevronDown, ChevronUp, Building2,
  Hash, FileCheck, Download, Camera, Eye, Edit3, X, FileImage
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';

// ============================================
// TYPES
// ============================================
interface Category {
  id: string;
  name: string;
  code: string;
  type: string;
}

interface Counterparty {
  id: string;
  name: string;
  type: string;
}

interface ExtractedData {
  tipo_documento: string;
  fornecedor_ou_cliente: string;
  cnpj_cpf: string | null;
  valor_total: number;
  data_emissao: string | null;
  data_vencimento: string | null;
  tipo_transacao: string;
  descricao: string;
  referencia: string | null;
  itens: Array<{ descricao: string; valor: number }>;
  confianca: number;
}

interface OcrResult {
  documentId: string;
  fileName: string;
  extractedData: ExtractedData;
}

const emptyTransaction = {
  type: 'EXPENSE',
  date: new Date().toISOString().split('T')[0],
  amount: '',
  description: '',
  categoryId: '',
  counterpartyId: '',
  documentNumber: '',
  dueDate: '',
  bankReference: '',
  notes: '',
};

// ============================================
// COMPONENT
// ============================================
export default function InsercaoDados() {
  const { token } = useAuth();

  // Tab state
  const [activeTab, setActiveTab] = useState<'csv' | 'manual' | 'ocr'>('csv');

  // CSV state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadHistory, setUploadHistory] = useState<any[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  // Manual state
  const [transaction, setTransaction] = useState({ ...emptyTransaction });
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // OCR state
  const [ocrFile, setOcrFile] = useState<File | null>(null);
  const [ocrTipoTransacao, setOcrTipoTransacao] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrPreview, setOcrPreview] = useState<string | null>(null);
  const [ocrConfirming, setOcrConfirming] = useState(false);
  const [ocrConfirmResult, setOcrConfirmResult] = useState<{ success: boolean; message: string } | null>(null);
  const [ocrEditData, setOcrEditData] = useState<any>(null);
  const [ocrIsDragOver, setOcrIsDragOver] = useState(false);

  // Shared state
  const [categories, setCategories] = useState<Category[]>([]);
  const [counterparties, setCounterparties] = useState<Counterparty[]>([]);

  // ============================================
  // LOAD DATA
  // ============================================
  useEffect(() => {
    loadCategories();
    loadCounterparties();
    loadUploadHistory();
  }, []);

  const loadCategories = async () => {
    try {
      const res = await api.get('/categories');
      if (res.data?.success) {
        setCategories(res.data.data || []);
      }
    } catch (err) {
      console.error('Erro ao carregar categorias:', err);
    }
  };

  const loadCounterparties = async () => {
    try {
      const res = await api.get('/counterparties');
      if (res.data?.success) {
        setCounterparties(res.data.data?.counterparties || res.data.data || []);
      }
    } catch (err) {
      console.error('Erro ao carregar contrapartes:', err);
    }
  };

  const loadUploadHistory = async () => {
    try {
      const res = await api.get('/upload/history');
      if (res.data?.success) {
        setUploadHistory(res.data.data || []);
      }
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
    }
  };

  const filteredCategories = categories.filter(
    (cat) => cat.type === transaction.type || cat.type === 'BOTH'
  );

  // ============================================
  // CSV UPLOAD HANDLERS
  // ============================================
  const handleCsvDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.csv') || file.type === 'text/csv')) {
      setCsvFile(file);
      setUploadError(null);
    } else {
      setUploadError('Apenas arquivos CSV são aceitos.');
    }
  }, []);

  const handleCsvUpload = async () => {
    if (!csvFile) return;
    setUploading(true);
    setUploadError(null);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('file', csvFile);

      const res = await api.post('/upload/csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.success) {
        setUploadResult(res.data.data || res.data);
        setCsvFile(null);
        loadUploadHistory();
      } else {
        setUploadError(res.data?.error || 'Erro no upload');
      }
    } catch (err: any) {
      setUploadError(err.response?.data?.error || 'Erro ao enviar arquivo');
    } finally {
      setUploading(false);
    }
  };

  // ============================================
  // MANUAL TRANSACTION HANDLERS
  // ============================================
  const handleSaveTransaction = async () => {
    if (!transaction.description || !transaction.amount || !transaction.date) {
      setSaveResult({ success: false, message: 'Preencha os campos obrigatórios: Descrição, Valor e Data.' });
      return;
    }

    setSaving(true);
    setSaveResult(null);

    try {
      const payload: any = {
        description: transaction.description,
        amount: parseFloat(transaction.amount),
        tipo_transacao: transaction.type,
        date: transaction.date,
        source: 'manual',
      };

      if (transaction.categoryId) payload.categoryId = transaction.categoryId;
      if (transaction.counterpartyId) payload.counterpartyId = transaction.counterpartyId;
      if (transaction.documentNumber) payload.documentNumber = transaction.documentNumber;
      if (transaction.dueDate) payload.dueDate = transaction.dueDate;
      if (transaction.bankReference) payload.bankReference = transaction.bankReference;
      if (transaction.notes) payload.notes = transaction.notes;

      const res = await api.post('/transactions', payload);

      if (res.data?.success) {
        setSaveResult({ success: true, message: 'Transação salva com sucesso!' });
        setTransaction({ ...emptyTransaction });
        setShowAdvanced(false);
      } else {
        setSaveResult({ success: false, message: res.data?.error || 'Erro ao salvar' });
      }
    } catch (err: any) {
      setSaveResult({ success: false, message: err.response?.data?.error || 'Erro ao salvar transação' });
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // OCR HANDLERS
  // ============================================
  const handleOcrFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setOcrIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleOcrFileSelect(file);
    }
  }, []);

  const handleOcrFileSelect = (file: File) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setOcrError('Tipo de arquivo não suportado. Use PDF, JPG, PNG ou WebP.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setOcrError('Arquivo muito grande. Máximo 10MB.');
      return;
    }
    setOcrFile(file);
    setOcrError(null);
    setOcrResult(null);
    setOcrEditData(null);
    setOcrConfirmResult(null);

    // Preview para imagens
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setOcrPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setOcrPreview(null);
    }
  };

  const handleOcrUpload = async () => {
    if (!ocrFile) return;
    setOcrProcessing(true);
    setOcrError(null);
    setOcrResult(null);
    setOcrEditData(null);
    setOcrConfirmResult(null);

    try {
      const formData = new FormData();
      formData.append('file', ocrFile);
      formData.append('tipo_transacao', ocrTipoTransacao);

      const res = await api.post('/ocr/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.success) {
        const result = res.data.data as OcrResult;
        setOcrResult(result);
        // Pré-preencher formulário de edição
        setOcrEditData({
          descricao: result.extractedData.descricao || '',
          valor: result.extractedData.valor_total?.toString() || '',
          tipo_transacao: result.extractedData.tipo_transacao || ocrTipoTransacao,
          data: result.extractedData.data_emissao || new Date().toISOString().split('T')[0],
          data_vencimento: result.extractedData.data_vencimento || '',
          contraparte_nome: result.extractedData.fornecedor_ou_cliente || '',
          contraparte_documento: result.extractedData.cnpj_cpf || '',
          referencia: result.extractedData.referencia || '',
          categoria: '',
        });
      } else {
        setOcrError(res.data?.error || 'Erro ao processar documento');
      }
    } catch (err: any) {
      setOcrError(err.response?.data?.error || 'Erro ao enviar documento para processamento');
    } finally {
      setOcrProcessing(false);
    }
  };

  const handleOcrConfirm = async () => {
    if (!ocrResult || !ocrEditData) return;
    setOcrConfirming(true);
    setOcrConfirmResult(null);

    try {
      const res = await api.post(`/ocr/confirm/${ocrResult.documentId}`, ocrEditData);

      if (res.data?.success) {
        setOcrConfirmResult({ success: true, message: 'Transação criada com sucesso a partir do documento!' });
        // Reset
        setTimeout(() => {
          setOcrFile(null);
          setOcrResult(null);
          setOcrEditData(null);
          setOcrPreview(null);
          setOcrConfirmResult(null);
        }, 3000);
      } else {
        setOcrConfirmResult({ success: false, message: res.data?.error || 'Erro ao confirmar' });
      }
    } catch (err: any) {
      setOcrConfirmResult({ success: false, message: err.response?.data?.error || 'Erro ao confirmar documento' });
    } finally {
      setOcrConfirming(false);
    }
  };

  const handleOcrReset = () => {
    setOcrFile(null);
    setOcrResult(null);
    setOcrEditData(null);
    setOcrPreview(null);
    setOcrError(null);
    setOcrConfirmResult(null);
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Inserção de Dados</h1>
        <p className="text-gray-500 mt-1">Importe transações via CSV, registre manualmente ou importe documentos com IA</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('csv')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
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
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
            activeTab === 'manual'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Plus className="w-4 h-4" />
          Registro Manual
        </button>
        <button
          onClick={() => setActiveTab('ocr')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
            activeTab === 'ocr'
              ? 'bg-white text-purple-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Camera className="w-4 h-4" />
          Importar Documento
        </button>
      </div>

      {/* ============================================ */}
      {/* TAB: CSV Upload */}
      {/* ============================================ */}
      {activeTab === 'csv' && (
        <div className="space-y-4">
          {/* Template Download */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium text-blue-900">Template CSV</p>
                <p className="text-sm text-blue-700">
                  Colunas: data, descricao, valor, tipo, categoria, contraparte, documento, vencimento, referencia_bancaria
                </p>
              </div>
            </div>
            <a
              href="/templates/template-transacoes.csv"
              download
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
            >
              <Download className="w-3.5 h-3.5" />
              Baixar
            </a>
          </div>

          {/* Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleCsvDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
              isDragOver
                ? 'border-blue-500 bg-blue-50'
                : csvFile
                ? 'border-green-300 bg-green-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            {csvFile ? (
              <div className="space-y-3">
                <CheckCircle className="w-10 h-10 text-green-500 mx-auto" />
                <div>
                  <p className="font-medium text-gray-900">{csvFile.name}</p>
                  <p className="text-sm text-gray-500">{(csvFile.size / 1024).toFixed(1)} KB</p>
                </div>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={handleCsvUpload}
                    disabled={uploading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {uploading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Processando...</>
                    ) : (
                      <><Upload className="w-4 h-4" /> Enviar</>
                    )}
                  </button>
                  <button
                    onClick={() => { setCsvFile(null); setUploadError(null); }}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Remover
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-10 h-10 text-gray-400 mx-auto" />
                <p className="text-gray-600">Arraste um arquivo CSV aqui ou</p>
                <label className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700">
                  Selecionar Arquivo
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) { setCsvFile(file); setUploadError(null); }
                    }}
                  />
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
                        {cp.name} ({cp.type === 'supplier' ? 'Fornecedor' : cp.type === 'customer' ? 'Cliente' : 'Ambos'})
                      </option>
                    ))}
                  </select>
                </div>

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
                <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
              ) : (
                <><Plus className="w-4 h-4" /> Salvar Transação</>
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

      {/* ============================================ */}
      {/* TAB: OCR - Importar Documento */}
      {/* ============================================ */}
      {activeTab === 'ocr' && (
        <div className="space-y-4">
          {/* Step 1: Selecionar tipo */}
          {!ocrResult && (
            <>
              <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-5">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Camera className="w-5 h-5 text-purple-600" />
                  Importar Documento com IA
                </h3>
                <p className="text-sm text-gray-500">
                  Faça upload de uma nota fiscal, boleto, recibo ou outro documento financeiro.
                  A IA irá extrair automaticamente os dados para criar uma transação.
                </p>

                {/* Tipo de transação */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Este documento é referente a: *
                  </label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setOcrTipoTransacao('EXPENSE')}
                      className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium border-2 transition-all ${
                        ocrTipoTransacao === 'EXPENSE'
                          ? 'bg-red-50 border-red-400 text-red-700 shadow-sm'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <DollarSign className="w-5 h-5 mx-auto mb-1" />
                      Despesa (Saída)
                    </button>
                    <button
                      onClick={() => setOcrTipoTransacao('INCOME')}
                      className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium border-2 transition-all ${
                        ocrTipoTransacao === 'INCOME'
                          ? 'bg-green-50 border-green-400 text-green-700 shadow-sm'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <DollarSign className="w-5 h-5 mx-auto mb-1" />
                      Receita (Entrada)
                    </button>
                  </div>
                </div>

                {/* Drop Zone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setOcrIsDragOver(true); }}
                  onDragLeave={() => setOcrIsDragOver(false)}
                  onDrop={handleOcrFileDrop}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                    ocrIsDragOver
                      ? 'border-purple-500 bg-purple-50'
                      : ocrFile
                      ? 'border-green-300 bg-green-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {ocrFile ? (
                    <div className="space-y-3">
                      {ocrPreview ? (
                        <img src={ocrPreview} alt="Preview" className="max-h-48 mx-auto rounded-lg shadow-sm" />
                      ) : (
                        <FileText className="w-12 h-12 text-green-500 mx-auto" />
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{ocrFile.name}</p>
                        <p className="text-sm text-gray-500">{(ocrFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={handleOcrUpload}
                          disabled={ocrProcessing}
                          className="px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2 font-medium"
                        >
                          {ocrProcessing ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Processando com IA...</>
                          ) : (
                            <><Eye className="w-4 h-4" /> Extrair Dados</>
                          )}
                        </button>
                        <button
                          onClick={handleOcrReset}
                          disabled={ocrProcessing}
                          className="px-4 py-2.5 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <FileImage className="w-10 h-10 text-gray-400 mx-auto" />
                      <p className="text-gray-600">Arraste um documento aqui ou</p>
                      <label className="inline-block px-4 py-2 bg-purple-600 text-white rounded-lg cursor-pointer hover:bg-purple-700">
                        Selecionar Arquivo
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.webp"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleOcrFileSelect(file);
                          }}
                        />
                      </label>
                      <p className="text-xs text-gray-400 mt-2">PDF, JPG, PNG ou WebP — Máximo 10MB</p>
                    </div>
                  )}
                </div>

                {/* Processing indicator */}
                {ocrProcessing && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
                      <div>
                        <p className="font-medium text-purple-800">Processando documento...</p>
                        <p className="text-sm text-purple-600">A IA está analisando o documento e extraindo os dados. Isso pode levar alguns segundos.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* OCR Error */}
          {ocrError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-800">Erro no processamento</p>
                <p className="text-sm text-red-700">{ocrError}</p>
              </div>
            </div>
          )}

          {/* Step 2: Revisar dados extraídos */}
          {ocrResult && ocrEditData && (
            <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-purple-600" />
                  Revisar Dados Extraídos
                </h3>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    (ocrResult.extractedData.confianca || 0) >= 0.8
                      ? 'bg-green-100 text-green-700'
                      : (ocrResult.extractedData.confianca || 0) >= 0.5
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    Confiança: {Math.round((ocrResult.extractedData.confianca || 0) * 100)}%
                  </span>
                  <button
                    onClick={handleOcrReset}
                    className="p-1 text-gray-400 hover:text-gray-600"
                    title="Cancelar e voltar"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <p className="text-sm text-gray-500">
                Revise e edite os dados abaixo antes de confirmar. Arquivo: <strong>{ocrResult.fileName}</strong>
              </p>

              {/* Tipo de documento detectado */}
              <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700">
                  Tipo de documento detectado: <strong>{
                    ocrResult.extractedData.tipo_documento === 'nota_fiscal' ? 'Nota Fiscal' :
                    ocrResult.extractedData.tipo_documento === 'boleto' ? 'Boleto' :
                    ocrResult.extractedData.tipo_documento === 'recibo' ? 'Recibo' :
                    ocrResult.extractedData.tipo_documento === 'extrato' ? 'Extrato' :
                    ocrResult.extractedData.tipo_documento === 'contrato' ? 'Contrato' :
                    'Outro'
                  }</strong>
                </span>
              </div>

              {/* Formulário de edição */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Tipo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setOcrEditData((d: any) => ({ ...d, tipo_transacao: 'EXPENSE' }))}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-all ${
                        ocrEditData.tipo_transacao === 'EXPENSE'
                          ? 'bg-red-50 border-red-300 text-red-700'
                          : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      Despesa
                    </button>
                    <button
                      onClick={() => setOcrEditData((d: any) => ({ ...d, tipo_transacao: 'INCOME' }))}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-all ${
                        ocrEditData.tipo_transacao === 'INCOME'
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
                    Data de Emissão *
                  </label>
                  <input
                    type="date"
                    value={ocrEditData.data}
                    onChange={(e) => setOcrEditData((d: any) => ({ ...d, data: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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
                    value={ocrEditData.valor}
                    onChange={(e) => setOcrEditData((d: any) => ({ ...d, valor: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                {/* Descrição */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrição *</label>
                  <input
                    type="text"
                    value={ocrEditData.descricao}
                    onChange={(e) => setOcrEditData((d: any) => ({ ...d, descricao: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                {/* Referência */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Hash className="w-3.5 h-3.5 inline mr-1" />
                    Referência / Nº NF
                  </label>
                  <input
                    type="text"
                    value={ocrEditData.referencia}
                    onChange={(e) => setOcrEditData((d: any) => ({ ...d, referencia: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                {/* Contraparte */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Building2 className="w-3.5 h-3.5 inline mr-1" />
                    Fornecedor / Cliente
                  </label>
                  <input
                    type="text"
                    value={ocrEditData.contraparte_nome}
                    onChange={(e) => setOcrEditData((d: any) => ({ ...d, contraparte_nome: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                {/* CNPJ/CPF */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ / CPF</label>
                  <input
                    type="text"
                    value={ocrEditData.contraparte_documento}
                    onChange={(e) => setOcrEditData((d: any) => ({ ...d, contraparte_documento: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                {/* Vencimento */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Calendar className="w-3.5 h-3.5 inline mr-1" />
                    Data de Vencimento
                  </label>
                  <input
                    type="date"
                    value={ocrEditData.data_vencimento}
                    onChange={(e) => setOcrEditData((d: any) => ({ ...d, data_vencimento: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                {/* Categoria */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                  <select
                    value={ocrEditData.categoria}
                    onChange={(e) => setOcrEditData((d: any) => ({ ...d, categoria: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="">Selecione...</option>
                    {categories
                      .filter(cat => cat.type === ocrEditData.tipo_transacao || cat.type === 'BOTH')
                      .map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.code} - {cat.name}</option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Itens extraídos */}
              {ocrResult.extractedData.itens && ocrResult.extractedData.itens.length > 0 && (
                <div className="border-t border-gray-200 pt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Itens Detectados</h4>
                  <div className="bg-gray-50 rounded-lg divide-y divide-gray-200">
                    {ocrResult.extractedData.itens.map((item, i) => (
                      <div key={i} className="px-4 py-2 flex justify-between items-center">
                        <span className="text-sm text-gray-700">{item.descricao}</span>
                        <span className="text-sm font-medium text-gray-900">
                          R$ {item.valor?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Confirm Result */}
              {ocrConfirmResult && (
                <div className={`p-3 rounded-lg flex items-center gap-2 ${
                  ocrConfirmResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                  {ocrConfirmResult.success ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span className="text-sm">{ocrConfirmResult.message}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2 border-t border-gray-200">
                <button
                  onClick={handleOcrConfirm}
                  disabled={ocrConfirming}
                  className="px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2 font-medium"
                >
                  {ocrConfirming ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Confirmando...</>
                  ) : (
                    <><CheckCircle className="w-4 h-4" /> Confirmar e Criar Transação</>
                  )}
                </button>
                <button
                  onClick={handleOcrReset}
                  disabled={ocrConfirming}
                  className="px-4 py-2.5 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
