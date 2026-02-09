import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react';
import { formatCurrency, formatPercent } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: number;
  change?: number;
  icon: LucideIcon;
  format?: 'currency' | 'percent' | 'number' | 'days';
  subtitle?: string;
}

export default function MetricCard({ title, value, change, icon: Icon, format = 'currency', subtitle }: MetricCardProps) {
  // Garantir que value é um número válido
  const safeValue = typeof value === 'number' && !isNaN(value) ? value : 0;

  const formattedValue = format === 'currency'
    ? formatCurrency(safeValue)
    : format === 'percent'
    ? `${safeValue.toFixed(1)}%`
    : format === 'days'
    ? `${safeValue > 90 ? '∞' : safeValue.toFixed(0)} dias`
    : safeValue.toLocaleString('pt-BR');

  // Só mostrar change se for um número válido e diferente de zero
  const hasChange = change !== undefined && change !== null && typeof change === 'number' && !isNaN(change) && change !== 0;
  const isPositive = hasChange && change! > 0;
  const isNegative = hasChange && change! < 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
          <Icon className="w-5 h-5 text-blue-600" />
        </div>
        {hasChange && (
          <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
            isPositive ? 'bg-emerald-50 text-emerald-700' :
            isNegative ? 'bg-red-50 text-red-700' :
            'bg-slate-50 text-slate-600'
          }`}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> :
             isNegative ? <TrendingDown className="w-3 h-3" /> :
             <Minus className="w-3 h-3" />}
            {formatPercent(change!)}
          </div>
        )}
      </div>
      <p className="text-sm text-slate-500 mb-1">{title}</p>
      <p className="text-2xl font-bold text-slate-900">{formattedValue}</p>
      {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
    </div>
  );
}
