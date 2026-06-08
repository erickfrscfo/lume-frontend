import React, { useState, useEffect, useMemo } from 'react';
import { financialApi, counterpartiesApi, categoriesApi } from '@/lib/api';

interface TransactionDetail {
  dueDate: string | null;
  paymentDate: string | null;
  receiptDate: string | null;
  amountOriginal: number | null;
  amountPaid: number | null;
  amountReceived: number | null;
  discount: number | null;
  interest: number | null;
  documentNumber: string | null;
  bankReference: string | null;
  reconciliationStatus: string | null;
  notes: string | null;
}

interface ObligationTax {
  tipo: string;
  base?: number | null;
  aliquota_percentual?: number | null;
  valor: number;
  retido?: boolean;
}

interface FinancialObligation {
  id: string;
  type: string;
  status: string;
  source: string;
  documentNumber: string | null;
  barcode: string | null;
  earlyDiscountAmount: number | null;
  earlyDiscountPercent: number | null;
  earlyDiscountValidUntil: string | null;
  lateFeeAmount: number | null;
  lateFeePercent: number | null;
  lateInterestPercentPerDay: number | null;
  paymentLimitDate: string | null;
  taxDetails: ObligationTax[];
  totalTaxAmount: number | null;
  totalWithholdingAmount: number | null;
}

interface ObligationInstallment {
  id: string;
  installmentNumber: number;
  totalInstallments: number;
  status: string;
  amount: number;
  dueDate: string | null;
  documentNumber: string | null;
  barcode: string | null;
}

interface Counterparty {
  id: string;
  name: string;
  document: string | null;
  type: string | null;
}

interface Category {
  id: string;
  name: string;
  code: string;
  type: 'INCOME' | 'EXPENSE';
  globalCategoryId?: string | null;
  source?: 'GLOBAL' | 'CUSTOM';
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  tipo_transacao?: 'INCOME' | 'EXPENSE';
  type?: 'INCOME' | 'EXPENSE';
  tipo_custo?: 'FIXO' | 'VARIAVEL' | null;
  status?: string;
  source?: string;
  category?: { id?: string; name: string; code?: string };
  counterparty?: Counterparty | null;
  detail?: TransactionDetail | null;
  installment?: ObligationInstallment | null;
  obligation?: FinancialObligation | null;
  notes?: string;
}

interface Props {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

function formatDateInput(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toISOString().split('T')[0];
  } catch {
    return '';
  }
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatOptionalCurrency(value: number | null | undefined): string {
  return value ? formatCurrency(value) : '—';
}

function formatPercent(value: number | null | undefined, suffix = '%'): string {
  if (value === null || value === undefined) return '—';
  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 3 })}${suffix}`;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  } catch {
    return dateStr;
  }
}

/** Agrupa categorias por prefixo do código para exibir no select */
const CATEGORY_GROUP_LABELS: Record<string, string> = {
  '1': 'Receita Operacional',
  '2': 'Receita Não Operacional',
  '3': 'Custos Diretos (CMV/CSP)',
  '4': 'Despesas com Pessoal',
  '5': 'Despesas Operacionais',
  '6': 'Despesas Comerciais',
  '7': 'Despesas Financeiras',
  '8': 'Impostos e Tributos',
  '9': 'Investimentos (Capex)',
};

export default function TransactionDetailModal({ transaction, isOpen, onClose, onSave }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [counterparties, setCounterparties] = useState<Counterparty[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    date: '',
    notes: '',
    counterpartyId: '',
    categoryCode: '',
    dueDate: '',
    paymentDate: '',
    receiptDate: '',
    amountPaid: '',
    amountReceived: '',
    discount: '',
    interest: '',
    documentNumber: '',
    bankReference: '',
  });

  useEffect(() => {
    if (transaction && isOpen) {
      setFormData({
        description: transaction.description || '',
        amount: String(Math.abs(transaction.amount)),
        date: formatDateInput(transaction.date),
        notes: transaction.notes || '',
        counterpartyId: transaction.counterparty?.id || '',
        categoryCode: transaction.category?.code || '',
        dueDate: formatDateInput(transaction.detail?.dueDate),
        paymentDate: formatDateInput(transaction.detail?.paymentDate),
        receiptDate: formatDateInput(transaction.detail?.receiptDate),
        amountPaid: transaction.detail?.amountPaid ? String(transaction.detail.amountPaid) : '',
        amountReceived: transaction.detail?.amountReceived ? String(transaction.detail.amountReceived) : '',
        discount: transaction.detail?.discount ? String(transaction.detail.discount) : '',
        interest: transaction.detail?.interest ? String(transaction.detail.interest) : '',
        documentNumber: transaction.detail?.documentNumber || '',
        bankReference: transaction.detail?.bankReference || '',
      });
      setIsEditing(false);
      setSuccessMessage('');
      loadCounterparties();
      loadCategories();
    }
  }, [transaction, isOpen]);

  const loadCounterparties = async () => {
    try {
      const res = await counterpartiesApi.list();
      setCounterparties(res.data.data || []);
    } catch (err) {
      console.error('Erro ao carregar contrapartes:', err);
    }
  };

  const loadCategories = async () => {
    if (categoriesLoaded && categories.length > 0) return; // Cache: não recarrega se já tem
    try {
      const res = await categoriesApi.list();
      const data = res.data.data || res.data || [];
      setCategories(data);
      setCategoriesLoaded(true);
    } catch (err) {
      console.error('Erro ao carregar categorias:', err);
    }
  };

  /** Prefixos de receita (1.x, 2.x) vs custos/despesas (3.x a 9.x) */
  const INCOME_PREFIXES = ['1', '2'];
  const EXPENSE_PREFIXES = ['3', '4', '5', '6', '7', '8', '9'];

  /**
   * Agrupa categorias por prefixo do código, filtrando pelo tipo da transação:
   * - INCOME: mostra apenas categorias de receita (1.x, 2.x)
   * - EXPENSE: mostra apenas categorias de custo/despesa (3.x a 9.x)
   */
  const groupedCategories = useMemo(() => {
    const txType = transaction?.tipo_transacao || transaction?.type;
    const allowedPrefixes = txType === 'INCOME' ? INCOME_PREFIXES : EXPENSE_PREFIXES;

    const groups: Record<string, Category[]> = {};
    categories
      .sort((a, b) => (a.code || '').localeCompare(b.code || ''))
      .forEach((cat) => {
        const prefix = (cat.code || '').split('.')[0];
        if (!allowedPrefixes.includes(prefix)) return; // Filtra por tipo
        if (!groups[prefix]) groups[prefix] = [];
        groups[prefix].push(cat);
      });
    return groups;
  }, [categories, transaction]);

  const handleSave = async () => {
    if (!transaction) return;
    setIsSaving(true);
    try {
      await financialApi.updateTransaction(transaction.id, {
        description: formData.description,
        amount: parseFloat(formData.amount),
        date: formData.date,
        notes: formData.notes || undefined,
        counterpartyId: formData.counterpartyId || undefined,
        categoryCode: formData.categoryCode || undefined,
        dueDate: formData.dueDate || null,
        paymentDate: formData.paymentDate || null,
        receiptDate: formData.receiptDate || null,
        amountPaid: formData.amountPaid ? parseFloat(formData.amountPaid) : undefined,
        amountReceived: formData.amountReceived ? parseFloat(formData.amountReceived) : undefined,
        discount: formData.discount ? parseFloat(formData.discount) : undefined,
        interest: formData.interest ? parseFloat(formData.interest) : undefined,
        documentNumber: formData.documentNumber || undefined,
        bankReference: formData.bankReference || undefined,
      });
      setSuccessMessage('Transação atualizada com sucesso!');
      setIsEditing(false);
      setTimeout(() => {
        setSuccessMessage('');
        onSave();
      }, 1500);
    } catch (err) {
      console.error('Erro ao salvar transação:', err);
      alert('Erro ao salvar. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!transaction) return;
    setIsDeleting(true);
    try {
      await financialApi.deleteTransaction(transaction.id);
      setShowDeleteConfirm(false);
      setSuccessMessage('Transação excluída com sucesso!');
      setTimeout(() => {
        setSuccessMessage('');
        onSave();
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Erro ao excluir transação:', err);
      alert('Erro ao excluir. Tente novamente.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen || !transaction) return null;

  const txType = transaction.tipo_transacao || transaction.type;
  const isExpense = txType === 'EXPENSE';
  const isIncome = txType === 'INCOME';
  const obligation = transaction.obligation;
  const obligationTerms = obligation ? [
    obligation.barcode && { label: 'Linha digitável / código de barras', value: obligation.barcode, wide: true },
    obligation.documentNumber && { label: 'Documento da obrigação', value: obligation.documentNumber },
    obligation.lateFeePercent !== null && obligation.lateFeePercent !== undefined && { label: 'Multa prevista', value: formatPercent(obligation.lateFeePercent) },
    obligation.lateFeeAmount !== null && obligation.lateFeeAmount !== undefined && { label: 'Multa estimada', value: formatCurrency(obligation.lateFeeAmount) },
    obligation.lateInterestPercentPerDay !== null && obligation.lateInterestPercentPerDay !== undefined && { label: 'Juros de mora', value: `${formatPercent(obligation.lateInterestPercentPerDay)} ao dia` },
    obligation.earlyDiscountPercent !== null && obligation.earlyDiscountPercent !== undefined && { label: 'Desconto antecipação', value: formatPercent(obligation.earlyDiscountPercent) },
    obligation.earlyDiscountAmount !== null && obligation.earlyDiscountAmount !== undefined && { label: 'Desconto em valor', value: formatCurrency(obligation.earlyDiscountAmount) },
    obligation.earlyDiscountValidUntil && { label: 'Validade desconto', value: formatDate(obligation.earlyDiscountValidUntil) },
    obligation.paymentLimitDate && { label: 'Limite de pagamento', value: formatDate(obligation.paymentLimitDate) },
  ].filter(Boolean) as Array<{ label: string; value: string; wide?: boolean }> : [];
  const obligationTaxes = obligation?.taxDetails || [];
  const hasObligationTaxSummary = Boolean(obligation?.totalTaxAmount || obligation?.totalWithholdingAmount);

  const statusLabels: Record<string, { label: string; color: string }> = {
    PENDING: { label: 'Pendente', color: 'bg-amber-100 text-amber-700 border-amber-200' },
    COMPLETED: { label: 'Concluída', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    OVERDUE: { label: 'Vencida', color: 'bg-red-100 text-red-700 border-red-200' },
    PARTIAL: { label: 'Parcial', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  };

  const reconciliationLabels: Record<string, { label: string; color: string }> = {
    PENDING: { label: 'Pendente', color: 'bg-amber-50 text-amber-600' },
    RECONCILED: { label: 'Conciliada', color: 'bg-emerald-50 text-emerald-600' },
    DIVERGENT: { label: 'Divergente', color: 'bg-red-50 text-red-600' },
    PARTIAL: { label: 'Parcial', color: 'bg-blue-50 text-blue-600' },
  };

  // Status derivado: baseado em paymentDate/receiptDate, não no campo status
  const derivedStatus = (() => {
    if (isExpense && transaction.detail?.paymentDate) return 'COMPLETED';
    if (isIncome && transaction.detail?.receiptDate) return 'COMPLETED';
    if (transaction.detail?.dueDate && new Date(transaction.detail.dueDate) < new Date()) return 'OVERDUE';
    return 'PENDING';
  })();
  const statusInfo = statusLabels[derivedStatus];
  const reconcInfo = reconciliationLabels[transaction.detail?.reconciliationStatus || 'PENDING'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="relative w-full max-w-lg h-full bg-white shadow-2xl overflow-y-auto animate-slide-in-right">
        {/* Header */}
        <div className={`sticky top-0 z-10 px-6 py-4 border-b ${isExpense ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${isExpense ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                {isExpense ? '↓' : '↑'}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {isEditing ? 'Editar Transação' : 'Detalhes da Transação'}
                </h2>
                <p className="text-xs text-slate-500">
                  {isExpense ? 'Saída' : 'Entrada'} • {formatDate(transaction.date)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 transition-colors"
                  >
                    ✏️ Editar
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-3 py-1.5 text-sm bg-white border border-red-200 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                    title="Excluir transação"
                  >
                    🗑️ Excluir
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500 transition-colors"
                >
                  Cancelar
                </button>
              )}
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/80 text-slate-400 hover:text-slate-600 transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* Success message */}
        {successMessage && (
          <div className="mx-6 mt-4 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm flex items-center gap-2">
            <span>✓</span> {successMessage}
          </div>
        )}

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Valor principal */}
          <div className="text-center py-4">
            {isEditing ? (
              <div className="flex items-center justify-center gap-2">
                <span className="text-slate-500 text-lg">R$</span>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="text-3xl font-bold text-center w-48 border-b-2 border-blue-300 focus:border-blue-500 outline-none bg-transparent"
                />
              </div>
            ) : (
              <p className={`text-3xl font-bold ${isExpense ? 'text-red-600' : 'text-emerald-600'}`}>
                {isExpense ? '-' : '+'}{formatCurrency(Math.abs(transaction.amount))}
              </p>
            )}
          </div>

          {/* Status badges */}
          <div className="flex items-center justify-center gap-3">
            <span className={`text-xs px-3 py-1 rounded-full border font-medium ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
            <span className={`text-xs px-3 py-1 rounded-full font-medium ${reconcInfo.color}`}>
              Conciliação: {reconcInfo.label}
            </span>
            {transaction.tipo_custo && (
              <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                transaction.tipo_custo === 'FIXO'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                {transaction.tipo_custo === 'FIXO' ? 'Custo Fixo' : 'Custo Variável'}
              </span>
            )}
          </div>

          {/* Informações básicas */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <span className="w-5 h-5 bg-slate-200 rounded flex items-center justify-center text-xs">📋</span>
              Informações Básicas
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 block mb-1">Descrição</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                  />
                ) : (
                  <p className="text-sm text-slate-900 font-medium">{transaction.description}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Data da Transação</label>
                  {isEditing ? (
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                    />
                  ) : (
                    <p className="text-sm text-slate-900">{formatDate(transaction.date)}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Categoria</label>
                  {isEditing ? (
                    <select
                      value={formData.categoryCode}
                      onChange={(e) => setFormData({ ...formData, categoryCode: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none bg-white"
                    >
                      <option value="">Selecionar categoria...</option>
                      {Object.entries(groupedCategories).map(([prefix, cats]) => (
                        <optgroup key={prefix} label={CATEGORY_GROUP_LABELS[prefix] || `Grupo ${prefix}`}>
                          {cats.map((cat) => (
                            <option key={cat.id} value={cat.code} disabled={cat.source === 'CUSTOM' && !cat.globalCategoryId}>
                              {cat.code} — {cat.name}{cat.source === 'CUSTOM' && !cat.globalCategoryId ? ' (custom sem vínculo)' : ''}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  ) : (
                    <p className="text-sm text-slate-900">
                      {transaction.category ? (
                        <span className="inline-flex items-center gap-1">
                          <span className="text-xs text-slate-400">{transaction.category.code}</span>
                          {transaction.category.name}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Sem categoria</span>
                      )}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-500 block mb-1">Contraparte (Fornecedor/Cliente)</label>
                {isEditing ? (
                  <select
                    value={formData.counterpartyId}
                    onChange={(e) => setFormData({ ...formData, counterpartyId: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none bg-white"
                  >
                    <option value="">Nenhuma</option>
                    {counterparties.map((cp) => (
                      <option key={cp.id} value={cp.id}>
                        {cp.name} {cp.document ? `(${cp.document})` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm text-slate-900">
                    {transaction.counterparty ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
                          {transaction.counterparty.name.charAt(0)}
                        </span>
                        {transaction.counterparty.name}
                        {transaction.counterparty.document && (
                          <span className="text-xs text-slate-400">({transaction.counterparty.document})</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Não informada</span>
                    )}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs text-slate-500 block mb-1">Observações</label>
                {isEditing ? (
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none resize-none"
                    placeholder="Adicionar observação..."
                  />
                ) : (
                  <p className="text-sm text-slate-900">
                    {transaction.notes || <span className="text-slate-400 italic">Nenhuma</span>}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Datas financeiras */}
          <div className="bg-blue-50/50 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <span className="w-5 h-5 bg-blue-100 rounded flex items-center justify-center text-xs">📅</span>
              Datas Financeiras
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 block mb-1">Data de Vencimento</label>
                {isEditing ? (
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                  />
                ) : (
                  <p className="text-sm text-slate-900">
                    {transaction.detail?.dueDate ? (
                      <span className={`inline-flex items-center gap-1 ${
                        new Date(transaction.detail.dueDate) < new Date() && !transaction.detail.paymentDate && !transaction.detail.receiptDate
                          ? 'text-red-600 font-medium'
                          : ''
                      }`}>
                        {formatDate(transaction.detail.dueDate)}
                        {new Date(transaction.detail.dueDate) < new Date() && !transaction.detail.paymentDate && !transaction.detail.receiptDate && (
                          <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">Vencida</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Não informada</span>
                    )}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {isExpense ? (
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Data de Pagamento</label>
                    {isEditing ? (
                      <input
                        type="date"
                        value={formData.paymentDate}
                        onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                      />
                    ) : (
                      <p className="text-sm text-slate-900">
                        {transaction.detail?.paymentDate
                          ? formatDate(transaction.detail.paymentDate)
                          : <span className="text-amber-600 italic">Não pago</span>}
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Data de Recebimento</label>
                    {isEditing ? (
                      <input
                        type="date"
                        value={formData.receiptDate}
                        onChange={(e) => setFormData({ ...formData, receiptDate: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                      />
                    ) : (
                      <p className="text-sm text-slate-900">
                        {transaction.detail?.receiptDate
                          ? formatDate(transaction.detail.receiptDate)
                          : <span className="text-amber-600 italic">Não recebido</span>}
                      </p>
                    )}
                  </div>
                )}
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Origem</label>
                  <p className="text-sm text-slate-900">
                    {transaction.source === 'UPLOAD' ? '📄 Upload' :
                     transaction.source === 'OCR' ? '🔍 OCR' :
                     transaction.source === 'MANUAL' ? '✏️ Manual' :
                     transaction.source === 'BANK_SYNC' ? '🏦 Banco' :
                     transaction.source || 'Não informada'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Valores detalhados */}
          <div className="bg-amber-50/50 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <span className="w-5 h-5 bg-amber-100 rounded flex items-center justify-center text-xs">💰</span>
              Valores Detalhados
            </h3>

            <div className="grid grid-cols-2 gap-3">
              {isExpense ? (
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Valor Pago</label>
                  {isEditing ? (
                    <input
                      type="number"
                      step="0.01"
                      value={formData.amountPaid}
                      onChange={(e) => setFormData({ ...formData, amountPaid: e.target.value })}
                      placeholder="0,00"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                    />
                  ) : (
                    <p className="text-sm text-slate-900">
                      {transaction.detail?.amountPaid
                        ? formatCurrency(transaction.detail.amountPaid)
                        : <span className="text-slate-400">—</span>}
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Valor Recebido</label>
                  {isEditing ? (
                    <input
                      type="number"
                      step="0.01"
                      value={formData.amountReceived}
                      onChange={(e) => setFormData({ ...formData, amountReceived: e.target.value })}
                      placeholder="0,00"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                    />
                  ) : (
                    <p className="text-sm text-slate-900">
                      {transaction.detail?.amountReceived
                        ? formatCurrency(transaction.detail.amountReceived)
                        : <span className="text-slate-400">—</span>}
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="text-xs text-slate-500 block mb-1">Desconto</label>
                {isEditing ? (
                  <input
                    type="number"
                    step="0.01"
                    value={formData.discount}
                    onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                    placeholder="0,00"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                  />
                ) : (
                  <p className="text-sm text-slate-900">
                    {transaction.detail?.discount
                      ? <span className="text-emerald-600">-{formatCurrency(transaction.detail.discount)}</span>
                      : <span className="text-slate-400">—</span>}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs text-slate-500 block mb-1">Juros / Multa</label>
                {isEditing ? (
                  <input
                    type="number"
                    step="0.01"
                    value={formData.interest}
                    onChange={(e) => setFormData({ ...formData, interest: e.target.value })}
                    placeholder="0,00"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                  />
                ) : (
                  <p className="text-sm text-slate-900">
                    {transaction.detail?.interest
                      ? <span className="text-red-600">+{formatCurrency(transaction.detail.interest)}</span>
                      : <span className="text-slate-400">—</span>}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs text-slate-500 block mb-1">Nº Documento</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.documentNumber}
                    onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                    placeholder="NF, boleto..."
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                  />
                ) : (
                  <p className="text-sm text-slate-900">
                    {transaction.detail?.documentNumber || <span className="text-slate-400">—</span>}
                  </p>
                )}
              </div>

              {transaction.installment && (
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Parcela</label>
                  <p className="text-sm text-slate-900">
                    {transaction.installment.installmentNumber}/{transaction.installment.totalInstallments}
                  </p>
                </div>
              )}
            </div>
          </div>

          {obligation && (obligationTerms.length > 0 || obligationTaxes.length > 0 || hasObligationTaxSummary) && (
            <div className="bg-slate-50 rounded-xl p-4 space-y-4">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <span className="w-5 h-5 bg-slate-200 rounded flex items-center justify-center text-xs">#</span>
                Dados da Obrigação Financeira
              </h3>

              {obligationTerms.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {obligationTerms.map((term) => (
                    <div key={term.label} className={term.wide ? 'col-span-2' : ''}>
                      <label className="text-xs text-slate-500 block mb-1">{term.label}</label>
                      <p className="text-sm font-medium text-slate-900 break-words">{term.value}</p>
                    </div>
                  ))}
                </div>
              )}

              {(obligationTaxes.length > 0 || hasObligationTaxSummary) && (
                <div className="border-t border-slate-200 pt-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">Impostos destacados</label>
                      <p className="text-sm font-medium text-slate-900">{formatOptionalCurrency(obligation.totalTaxAmount)}</p>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">Retenções</label>
                      <p className="text-sm font-medium text-slate-900">{formatOptionalCurrency(obligation.totalWithholdingAmount)}</p>
                    </div>
                  </div>

                  {obligationTaxes.length > 0 && (
                    <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100 max-h-48 overflow-auto">
                      {obligationTaxes.map((tax, index) => (
                        <div key={`${tax.tipo}-${index}`} className="px-3 py-2">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-medium text-slate-900">
                              {tax.tipo}{tax.retido ? ' retido' : ''}
                            </span>
                            <span className="text-sm font-semibold text-slate-900">{formatCurrency(tax.valor)}</span>
                          </div>
                          <p className="mt-0.5 text-xs text-slate-500">
                            Base {formatOptionalCurrency(tax.base)} · Alíquota {formatPercent(tax.aliquota_percentual)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Botão salvar (modo edição) */}
          {isEditing && (
            <div className="sticky bottom-0 bg-white border-t border-slate-100 pt-4 pb-2">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <span className="animate-spin">⟳</span> Salvando...
                  </>
                ) : (
                  <>💾 Salvar Alterações</>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Dialog de confirmação de exclusão */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 animate-scale-in">
            <div className="text-center">
              <div className="w-14 h-14 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">⚠️</span>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Excluir Transação</h3>
              <p className="text-sm text-slate-500 mb-1">
                Tem certeza que deseja excluir esta transação?
              </p>
              <p className="text-sm font-medium text-slate-700 mb-1">
                {transaction.description}
              </p>
              <p className={`text-lg font-bold mb-4 ${isExpense ? 'text-red-600' : 'text-emerald-600'}`}>
                {isExpense ? '-' : '+'}{formatCurrency(Math.abs(transaction.amount))}
              </p>
              <p className="text-xs text-red-500 mb-5">
                Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2.5 px-4 text-sm font-medium bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 px-4 text-sm font-medium bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <><span className="animate-spin">⟳</span> Excluindo...</>
                  ) : (
                    <>🗑️ Sim, Excluir</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.25s ease-out;
        }
        @keyframes scaleIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-scale-in {
          animation: scaleIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
