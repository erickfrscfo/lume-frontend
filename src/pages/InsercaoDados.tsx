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

interface ExtractedTax {
  tipo: string;
  base?: number | null;
  aliquota_percentual?: number | null;
  valor: number;
  retido?: boolean;
}

interface ExtractedData {
  tipo_documento: string;
  document_role?: string;
  fornecedor_ou_cliente: string;
  cnpj_cpf: string | null;
  valor_total: number;
  data_emissao: string | null;
  data_vencimento: string | null;
  linha_digitavel?: string | null;
  codigo_barras?: string | null;
  multa_atraso_percentual?: number | null;
  multa_atraso_valor?: number | null;
  juros_mora_percentual_dia?: number | null;
  juros_mora_valor?: number | null;
  desconto_antecipacao_valor?: number | null;
  desconto_antecipacao_percentual?: number | null;
  desconto_antecipacao_validade?: string | null;
  data_limite_pagamento?: string | null;
  impostos?: ExtractedTax[];
  valor_impostos_total?: number | null;
  valor_retencoes_total?: number | null;
  tipo_transacao: string;
  descricao: string;
  referencia: string | null;
  categoria_sugerida: string | null;
  categoria_codigo: string | null;
  categoria_match: { id: string; name: string; code: string } | null;
  tipo_custo: string | null;
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
  counterpartyName: '',
  documentNumber: '',
  dueDate: '',
  notes: '',
};

const formatMoney = (value?: number | string | null) => {
  if (value === null || value === undefined || value === '') return '-';
  const parsed = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
  if (!Number.isFinite(parsed)) return '-';
  return parsed.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatPercent = (value?: number | string | null, suffix = '%') => {
  if (value === null || value === undefined || value === '') return '-';
  const parsed = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
  if (!Number.isFinite(parsed)) return '-';
  return `${parsed.toLocaleString('pt-BR', { maximumFractionDigits: 3 })}${suffix}`;
};

const hasValue = (value: unknown) => value !== null && value !== undefined && value !== '';

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
      if (res.data?.data) {
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
    // CORREÇÃO: Vencimento agora é obrigatório
    if (!transaction.description || !transaction.amount || !transaction.date || !transaction.dueDate) {
      setSaveResult({ success: false, message: 'Preencha os campos obrigatórios: Descrição, Valor, Data e Vencimento.' });
      return;
    }

    setSaving(true);
    setSaveResult(null);

    try {
      const payload: any = {
        description: transaction.description,
        amount: parseFloat(transaction.amount),
        type: transaction.type,  // CORREÇÃO: backend espera "type", não "tipo_transacao"
        date: transaction.date,
        dueDate: transaction.dueDate,
      };

      if (transaction.categoryId) payload.categoryId = transaction.categoryId;
      // CORREÇÃO: Envia counterpartyName (texto livre) em vez de counterpartyId
      if (transaction.counterpartyName) payload.counterpartyName = transaction.counterpartyName;
      if (transaction.documentNumber) payload.documentNumber = transaction.documentNumber;
      if (transaction.notes) payload.notes = transaction.notes;

      // CORREÇÃO: Endpoint correto é /financial/transactions (não /transactions)
      const res = await api.post('/financial/transactions', payload);

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

      const res = await api.post('/ocr/extract', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.success) {
        const result = res.data.data as OcrResult;
        setOcrResult(result);

        // Auto-match de categoria: usar o match do backend se disponível
        let categoriaAutoMatch: Category | null = null;
        if (result.extractedData.categoria_match?.code) {
          categoriaAutoMatch = categories.find(cat =>
            cat.code === result.extractedData.categoria_match?.code &&
            (cat.type === result.extractedData.tipo_transacao || cat.type === 'BOTH')
          ) || {
            id: result.extractedData.categoria_match.id,
            name: result.extractedData.categoria_match.name,
            code: result.extractedData.categoria_match.code,
            type: result.extractedData.tipo_transacao,
          };
        } else if (result.extractedData.categoria_sugerida) {
          // Tentar match local com as categorias carregadas
          const sugerida = result.extractedData.categoria_sugerida.toLowerCase();
          const tipoTx = result.extractedData.tipo_transacao || ocrTipoTransacao;
          const match = categories.find(cat => 
            (cat.type === tipoTx || cat.type === 'BOTH') &&
            cat.name.toLowerCase().includes(sugerida)
          ) || categories.find(cat =>
            (cat.type === tipoTx || cat.type === 'BOTH') &&
            sugerida.includes(cat.name.toLowerCase())
          );
          if (match) {
            categoriaAutoMatch = match;
          }
        }

        // Pré-preencher formulário de edição com dados extraídos + auto-match
        setOcrEditData({
          descricao: result.extractedData.descricao || '',
          valor: result.extractedData.valor_total?.toString() || '',
          tipo_transacao: result.extractedData.tipo_transacao || ocrTipoTransacao,
          data: result.extractedData.data_emissao || new Date().toISOString().split('T')[0],
          data_vencimento: result.extractedData.data_vencimento || '',
          linha_digitavel: result.extractedData.linha_digitavel || '',
          codigo_barras: result.extractedData.codigo_barras || '',
          multa_atraso_percentual: result.extractedData.multa_atraso_percentual ?? null,
          multa_atraso_valor: result.extractedData.multa_atraso_valor ?? null,
          juros_mora_percentual_dia: result.extractedData.juros_mora_percentual_dia ?? null,
          juros_mora_valor: result.extractedData.juros_mora_valor ?? null,
          desconto_antecipacao_valor: result.extractedData.desconto_antecipacao_valor ?? null,
          desconto_antecipacao_percentual: result.extractedData.desconto_antecipacao_percentual ?? null,
          desconto_antecipacao_validade: result.extractedData.desconto_antecipacao_validade || '',
          data_limite_pagamento: result.extractedData.data_limite_pagamento || '',
          impostos: result.extractedData.impostos || [],
          valor_impostos_total: result.extractedData.valor_impostos_total ?? null,
          valor_retencoes_total: result.extractedData.valor_retencoes_total ?? null,
          contraparte_nome: result.extractedData.fornecedor_ou_cliente || '',
          contraparte_documento: result.extractedData.cnpj_cpf || '',
          referencia: result.extractedData.referencia || '',
          categoria: categoriaAutoMatch?.name || '',
          categoryId: categoriaAutoMatch?.id || '',
          categoryCode: categoriaAutoMatch?.code || '',
          tipo_custo: result.extractedData.tipo_custo || '',
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
      // Enviar todos os dados incluindo tipo_custo e data_vencimento
      const payload = {
        ...ocrEditData,
        categoryId: ocrEditData.categoryId || null,
        categoryCode: ocrEditData.categoryCode || null,
        tipo_custo: ocrEditData.tipo_custo || null,
        data_vencimento: ocrEditData.data_vencimento || null,
      };

      const res = await api.post(`/ocr/confirm/${ocrResult.documentId}`, payload);

      if (res.data?.success) {
        setOcrConfirmResult({
          success: true,
          message: res.data?.data?.message || 'Documento confirmado com sucesso.',
        });
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

  const getCategoryOptions = (type: string) => {
    return categories.filter(cat => cat.type === type || cat.type === 'BOTH');
  };

  const financialTerms = ocrEditData ? [
    ocrEditData.linha_digitavel && { label: 'Linha digitável', value: ocrEditData.linha_digitavel, wide: true },
    ocrEditData.codigo_barras && { label: 'Código de barras', value: ocrEditData.codigo_barras, wide: true },
    hasValue(ocrEditData.multa_atraso_percentual) && { label: 'Multa por atraso', value: formatPercent(ocrEditData.multa_atraso_percentual) },
    hasValue(ocrEditData.multa_atraso_valor) && { label: 'Multa em valor', value: formatMoney(ocrEditData.multa_atraso_valor) },
    hasValue(ocrEditData.juros_mora_percentual_dia) && { label: 'Juros de mora', value: `${formatPercent(ocrEditData.juros_mora_percentual_dia)} ao dia` },
    hasValue(ocrEditData.juros_mora_valor) && { label: 'Juros em valor', value: formatMoney(ocrEditData.juros_mora_valor) },
    hasValue(ocrEditData.desconto_antecipacao_percentual) && { label: 'Desconto antecipação', value: formatPercent(ocrEditData.desconto_antecipacao_percentual) },
    hasValue(ocrEditData.desconto_antecipacao_valor) && { label: 'Desconto em valor', value: formatMoney(ocrEditData.desconto_antecipacao_valor) },
    ocrEditData.desconto_antecipacao_validade && { label: 'Validade do desconto', value: ocrEditData.desconto_antecipacao_validade },
    ocrEditData.data_limite_pagamento && { label: 'Limite de pagamento', value: ocrEditData.data_limite_pagamento },
  ].filter(Boolean) as Array<{ label: string; value: string; wide?: boolean }> : [];
  const extractedTaxes = (ocrEditData?.impostos || []) as ExtractedTax[];
  const hasTaxSummary = hasValue(ocrEditData?.valor_impostos_total) || hasValue(ocrEditData?.valor_retencoes_total);

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
          {/* Template Download — DESCRITIVO MELHORADO */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-blue-600" />
                <p className="font-medium text-blue-900">Template CSV</p>
              </div>
              <button
                onClick={() => {
                  const header = 'data;descricao;valor;tipo;contraparte;vencimento;data_pagamento;data_recebimento;documento;observacao';
                  const examples = [
                    '01/01/2025;Pagamento Aluguel;-3500.00;SAIDA;Imobiliaria Central;05/01/2025;03/01/2025;;NF-001;Aluguel sede',
                    '05/01/2025;Recebimento Cliente;12000.00;ENTRADA;ABC Tecnologia;10/01/2025;;08/01/2025;NF-100;Projeto web',
                    '10/01/2025;Compra Material;-850.50;SAIDA;Papelaria Express;15/01/2025;;;NF-050;Material escritorio',
                    '15/01/2025;Salarios;-25000.00;SAIDA;;20/01/2025;18/01/2025;;FOL-001;Folha janeiro',
                    '20/01/2025;Servico Consultoria;8500.00;ENTRADA;Cliente XYZ;25/01/2025;;;NF-200;Consultoria mensal',
                  ];
                  const csvContent = '\uFEFF' + header + '\n' + examples.join('\n') + '\n';
                  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'template_transacoes_v3.csv';
                  a.click();
                  window.URL.revokeObjectURL(url);
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >
                <Download className="w-3.5 h-3.5" />
                Baixar Template
              </button>
            </div>
            <div className="text-sm text-blue-800 space-y-1.5">
              <p className="font-medium">Colunas aceitas (separadas por <code className="bg-blue-100 px-1 rounded">;</code> ou <code className="bg-blue-100 px-1 rounded">,</code>):</p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-1 text-xs">
                <span className="bg-blue-100 px-2 py-1 rounded font-medium">data *</span>
                <span className="bg-blue-100 px-2 py-1 rounded font-medium">descricao *</span>
                <span className="bg-blue-100 px-2 py-1 rounded font-medium">valor *</span>
                <span className="bg-blue-100 px-2 py-1 rounded">tipo</span>
                <span className="bg-blue-100 px-2 py-1 rounded">contraparte</span>
                <span className="bg-blue-100 px-2 py-1 rounded">vencimento</span>
                <span className="bg-blue-100 px-2 py-1 rounded">data_pagamento</span>
                <span className="bg-blue-100 px-2 py-1 rounded">data_recebimento</span>
                <span className="bg-blue-100 px-2 py-1 rounded">documento</span>
                <span className="bg-blue-100 px-2 py-1 rounded">observacao</span>
              </div>
              <div className="mt-2 text-xs text-blue-700 space-y-0.5">
                <p><strong>tipo:</strong> ENTRADA ou SAIDA (se omitido, valores negativos = SAIDA, positivos = ENTRADA)</p>
                <p><strong>data_pagamento / data_recebimento:</strong> define se a transação entra como <em>Concluída</em>. Se vazio = <em>Pendente</em></p>
                <p><strong>Categoria:</strong> classificada automaticamente pela IA após o upload (não precisa preencher)</p>
                <p><strong>Datas:</strong> formato DD/MM/AAAA</p>
              </div>
            </div>
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
            <div className={`border rounded-lg p-4 ${
              uploadResult.errors > 0 && uploadResult.imported > 0
                ? 'bg-amber-50 border-amber-200'
                : uploadResult.imported > 0
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-start gap-3">
                {uploadResult.imported > 0 ? (
                  <CheckCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                    uploadResult.errors > 0 ? 'text-amber-500' : 'text-green-500'
                  }`} />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={`font-medium ${
                    uploadResult.imported > 0 ? (uploadResult.errors > 0 ? 'text-amber-800' : 'text-green-800') : 'text-red-800'
                  }`}>
                    {uploadResult.imported > 0 && uploadResult.errors > 0
                      ? 'Upload processado com alertas'
                      : uploadResult.imported > 0
                      ? 'Upload processado com sucesso!'
                      : 'Falha no processamento do upload'}
                  </p>

                  {/* Contadores principais */}
                  <div className="mt-2 flex flex-wrap gap-4">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-gray-700">Total de linhas:</span>
                      <span className="text-sm font-bold text-gray-900">{uploadResult.totalRows || 0}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                      <span className="text-sm font-medium text-green-700">Importadas:</span>
                      <span className="text-sm font-bold text-green-900">{uploadResult.imported || 0}</span>
                    </div>
                    {(uploadResult.errors > 0) && (
                      <div className="flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                        <span className="text-sm font-medium text-red-700">Com erro:</span>
                        <span className="text-sm font-bold text-red-900">{uploadResult.errors}</span>
                      </div>
                    )}
                    {uploadResult.newCounterparties > 0 && (
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-sm font-medium text-blue-700">Novas contrapartes:</span>
                        <span className="text-sm font-bold text-blue-900">{uploadResult.newCounterparties}</span>
                      </div>
                    )}
                  </div>

                  {/* Detalhes de erros */}
                  {uploadResult.errorDetails && uploadResult.errorDetails.length > 0 && (
                    <div className="mt-3 bg-white/60 rounded-lg p-3">
                      <p className="text-sm font-medium text-amber-700 mb-1">
                        Detalhes dos erros:
                      </p>
                      <ul className="text-sm text-amber-600 space-y-0.5">
                        {uploadResult.errorDetails.slice(0, 5).map((err: any, i: number) => (
                          <li key={i} className="flex items-start gap-1">
                            <span className="text-amber-400 mt-0.5">-</span>
                            <span>Linha {err.line}: {err.message || err.error}</span>
                          </li>
                        ))}
                        {uploadResult.errorDetails.length > 5 && (
                          <li className="text-amber-500 italic">
                            ...e mais {uploadResult.errorDetails.length - 5} erro(s)
                          </li>
                        )}
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
                        <p className="text-sm font-medium text-gray-900">{upload.originalName || upload.filename}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(upload.createdAt).toLocaleDateString('pt-BR')} — {upload.rowCount || 0} transações importadas
                          {upload.errorCount > 0 && (
                            <span className="text-amber-600"> ({upload.errorCount} erro{upload.errorCount > 1 ? 's' : ''})</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      upload.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                      upload.status === 'PARTIAL' ? 'bg-amber-100 text-amber-700' :
                      upload.status === 'FAILED' || upload.status === 'ERROR' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {upload.status === 'COMPLETED' ? 'Concluído' :
                       upload.status === 'PARTIAL' ? 'Parcial' :
                       upload.status === 'FAILED' || upload.status === 'ERROR' ? 'Erro' : 'Processando'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================ */}
      {/* TAB: Manual Transaction — CORRIGIDO */}
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
                placeholder="Ex: Pagamento fornecedor, Recebimento cliente..."
                value={transaction.description}
                onChange={(e) => setTransaction(t => ({ ...t, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Vencimento — MOVIDO PARA CAMPOS OBRIGATÓRIOS */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="w-3.5 h-3.5 inline mr-1" />
                Vencimento *
              </label>
              <input
                type="date"
                value={transaction.dueDate}
                onChange={(e) => setTransaction(t => ({ ...t, dueDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Campos avançados (colapsáveis) — SEM Referência Bancária, Contraparte agora é texto livre */}
          <div className="border-t border-gray-200 pt-4">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Campos Adicionais (contraparte, documento, observações)
            </button>

            {showAdvanced && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Contraparte — CAMPO ABERTO (texto livre) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Building2 className="w-3.5 h-3.5 inline mr-1" />
                    Contraparte
                  </label>
                  <input
                    type="text"
                    placeholder="Nome do fornecedor ou cliente"
                    value={transaction.counterpartyName}
                    onChange={(e) => setTransaction(t => ({ ...t, counterpartyName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
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

                {/* Observações */}
                <div className="md:col-span-2 lg:col-span-3">
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
                    ocrResult.extractedData.tipo_documento === 'INVOICE' ? 'Nota Fiscal' :
                    ocrResult.extractedData.tipo_documento === 'RECEIPT' ? 'Recibo' :
                    ocrResult.extractedData.tipo_documento === 'BANK_STATEMENT' ? 'Extrato' :
                    ocrResult.extractedData.tipo_documento === 'CONTRACT' ? 'Contrato' :
                    ocrResult.extractedData.tipo_documento === 'nota_fiscal' ? 'Nota Fiscal' :
                    ocrResult.extractedData.tipo_documento === 'boleto' ? 'Boleto' :
                    ocrResult.extractedData.tipo_documento === 'recibo' ? 'Recibo' :
                    ocrResult.extractedData.tipo_documento === 'extrato' ? 'Extrato' :
                    ocrResult.extractedData.tipo_documento === 'contrato' ? 'Contrato' :
                    'Outro'
                  }</strong>
                  {ocrResult.extractedData.document_role && (
                    <span className="ml-2 text-gray-500">
                      Papel financeiro: <strong>{
                        ocrResult.extractedData.document_role === 'FISCAL_AND_CHARGE' ? 'Fiscal e cobrança' :
                        ocrResult.extractedData.document_role === 'FISCAL_ONLY' ? 'Apenas fiscal' :
                        ocrResult.extractedData.document_role === 'PAYMENT_INSTRUMENT' ? 'Instrumento de cobrança' :
                        ocrResult.extractedData.document_role === 'UTILITY_BILL' ? 'Conta recorrente' :
                        ocrResult.extractedData.document_role === 'PAYMENT_PROOF' ? 'Comprovante' :
                        ocrResult.extractedData.document_role === 'CONTRACT' ? 'Contrato' :
                        'Outro'
                      }</strong>
                    </span>
                  )}
                </span>
              </div>

              {(financialTerms.length > 0 || extractedTaxes.length > 0 || hasTaxSummary) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {financialTerms.length > 0 && (
                    <div className="border border-blue-100 bg-blue-50/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <DollarSign className="w-4 h-4 text-blue-600" />
                        <h4 className="text-sm font-semibold text-gray-900">Condições de cobrança</h4>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {financialTerms.map((term) => (
                          <div key={term.label} className={term.wide ? 'sm:col-span-2' : ''}>
                            <p className="text-xs font-medium uppercase tracking-wide text-blue-700">{term.label}</p>
                            <p className="mt-0.5 break-words text-sm font-semibold text-gray-900">{term.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(extractedTaxes.length > 0 || hasTaxSummary) && (
                    <div className="border border-amber-100 bg-amber-50/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <FileCheck className="w-4 h-4 text-amber-600" />
                        <h4 className="text-sm font-semibold text-gray-900">Impostos e retenções</h4>
                      </div>
                      {hasTaxSummary && (
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-amber-700">Impostos destacados</p>
                            <p className="mt-0.5 text-sm font-semibold text-gray-900">{formatMoney(ocrEditData.valor_impostos_total)}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-amber-700">Retenções</p>
                            <p className="mt-0.5 text-sm font-semibold text-gray-900">{formatMoney(ocrEditData.valor_retencoes_total)}</p>
                          </div>
                        </div>
                      )}
                      {extractedTaxes.length > 0 && (
                        <div className="max-h-56 overflow-auto rounded-lg border border-amber-100 bg-white divide-y divide-gray-100">
                          {extractedTaxes.map((tax, index) => (
                            <div key={`${tax.tipo}-${index}`} className="px-3 py-2">
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-sm font-medium text-gray-900">
                                  {tax.tipo}{tax.retido ? ' retido' : ''}
                                </span>
                                <span className="text-sm font-semibold text-gray-900">{formatMoney(tax.valor)}</span>
                              </div>
                              <p className="mt-0.5 text-xs text-gray-500">
                                Base {formatMoney(tax.base)} · Alíquota {formatPercent(tax.aliquota_percentual)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Formulário de edição */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Tipo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setOcrEditData((d: any) => ({
                        ...d,
                        tipo_transacao: 'EXPENSE',
                        categoria: '',
                        categoryId: '',
                        categoryCode: '',
                      }))}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-all ${
                        ocrEditData.tipo_transacao === 'EXPENSE'
                          ? 'bg-red-50 border-red-300 text-red-700'
                          : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      Despesa
                    </button>
                    <button
                      onClick={() => setOcrEditData((d: any) => ({
                        ...d,
                        tipo_transacao: 'INCOME',
                        categoria: '',
                        categoryId: '',
                        categoryCode: '',
                        tipo_custo: '',
                      }))}
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

                {/* Categoria */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                  <select
                    value={ocrEditData.categoryCode || ''}
                    onChange={(e) => {
                      const selected = getCategoryOptions(ocrEditData.tipo_transacao).find(cat => cat.code === e.target.value);
                      setOcrEditData((d: any) => ({
                        ...d,
                        categoria: selected?.name || '',
                        categoryId: selected?.id || '',
                        categoryCode: selected?.code || '',
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="">Sem categoria</option>
                    {getCategoryOptions(ocrEditData.tipo_transacao).map((cat) => (
                      <option key={`${cat.type}-${cat.code}`} value={cat.code}>
                        {cat.code} - {cat.name}
                      </option>
                    ))}
                  </select>
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

                {/* Tipo de Custo (apenas para despesas) */}
                {ocrEditData.tipo_transacao === 'EXPENSE' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Custo</label>
                    <select
                      value={ocrEditData.tipo_custo || ''}
                      onChange={(e) => setOcrEditData((d: any) => ({ ...d, tipo_custo: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="">Selecione...</option>
                      <option value="FIXO">Fixo (aluguel, salários, assinaturas)</option>
                      <option value="VARIAVEL">Variável (comissões, frete, marketing)</option>
                    </select>
                  </div>
                )}
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
