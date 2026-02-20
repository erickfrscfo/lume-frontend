import { X } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface PendingTransaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  category?: { name: string };
}

interface CostClassificationModalProps {
  isOpen: boolean;
  transactions: PendingTransaction[];
  onClose: () => void;
  onClassify: () => void;
  isClassifying: boolean;
}

export default function CostClassificationModal({
  isOpen,
  transactions,
  onClose,
  onClassify,
  isClassifying,
}: CostClassificationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border-4 border-blue-500 animate-in fade-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h3 className="text-2xl font-bold text-slate-900">
              {transactions.length} saída{transactions.length !== 1 ? 's' : ''} não classificada{transactions.length !== 1 ? 's' : ''}
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              A IA classificou automaticamente, mas precisa da sua revisão
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
          {transactions.slice(0, 10).map((tx) => (
            <div key={tx.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold text-blue-700 truncate">{tx.description}</p>
                {tx.category && (
                  <p className="text-xs text-slate-500 mt-1">{tx.category.name}</p>
                )}
              </div>
              <button
                onClick={onClassify}
                disabled={isClassifying}
                className="ml-4 px-4 py-2 text-sm font-medium text-slate-700 bg-white border-2 border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Classificar
              </button>
            </div>
          ))}
          {transactions.length > 10 && (
            <p className="text-xs text-slate-400 text-center pt-2">
              ... e mais {transactions.length - 10} transações
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            Fechar
          </button>
          <button
            onClick={onClassify}
            disabled={isClassifying}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isClassifying ? 'Classificando...' : `Classificar Todas (${transactions.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}
