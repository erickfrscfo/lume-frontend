import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { ExplainButton } from '@/components/ExplainModal';

type ColorTheme = 'blue' | 'red' | 'green';

interface MetricCardProps {
  title: string;
  value: number;
  change?: number;
  icon: LucideIcon;
  format?: 'currency' | 'percent' | 'number' | 'months';
  subtitle?: string;
  showChange?: boolean;
  colorTheme?: ColorTheme;
}

const THEME_STYLES: Record<ColorTheme, {
  bg: string;
  border: string;
  iconBg: string;
  iconColor: string;
  valueColor: string;
}> = {
  blue: {
    bg: '#eff6ff',
    border: '#dbeafe',
    iconBg: '#dbeafe',
    iconColor: '#2563eb',
    valueColor: '#1d4ed8',
  },
  red: {
    bg: '#fef2f2',
    border: '#fecaca',
    iconBg: '#fecaca',
    iconColor: '#dc2626',
    valueColor: '#dc2626',
  },
  green: {
    bg: '#f0fdf4',
    border: '#bbf7d0',
    iconBg: '#bbf7d0',
    iconColor: '#16a34a',
    valueColor: '#15803d',
  },
};

export default function MetricCard({ title, value, change, icon: Icon, format = 'currency', subtitle, showChange = true, colorTheme = 'blue' }: MetricCardProps) {
  const safeValue = typeof value === 'number' && !isNaN(value) ? value : 0;

  const formattedValue = format === 'currency'
    ? formatCurrency(safeValue)
    : format === 'percent'
    ? `${safeValue.toFixed(1)}%`
    : format === 'months'
    ? `${safeValue > 120 ? '∞' : safeValue.toFixed(1)} meses`
    : safeValue.toLocaleString('pt-BR');

  const hasChange = showChange && change !== undefined && change !== null && typeof change === 'number' && !isNaN(change) && change !== 0;
  const isPositive = hasChange && change! > 0;
  const isNegative = hasChange && change! < 0;

  const theme = THEME_STYLES[colorTheme];

  return (
    <div
      className="rounded-xl p-5 hover:shadow-md transition-shadow group relative"
      style={{ backgroundColor: theme.bg, border: `1px solid ${theme.border}` }}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm text-slate-500 underline decoration-dotted underline-offset-2 decoration-slate-300 cursor-help">{title}</p>
        <div className="flex items-center gap-1.5">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <ExplainButton
              metric={title}
              value={formattedValue}
              variant="icon"
            />
          </div>
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: theme.iconBg }}
          >
            <Icon className="w-5 h-5" style={{ color: theme.iconColor }} />
          </div>
        </div>
      </div>
      <p className="text-2xl font-bold" style={{ color: theme.valueColor }}>{formattedValue}</p>
      <div className="flex items-center gap-2 mt-1">
        {hasChange && (
          <div className={`flex items-center gap-1 text-xs font-medium ${
            isPositive ? 'text-emerald-700' :
            isNegative ? 'text-red-700' :
            'text-slate-600'
          }`}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> :
             isNegative ? <TrendingDown className="w-3 h-3" /> :
             <Minus className="w-3 h-3" />}
            {formatPercent(change!)}
          </div>
        )}
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>
    </div>
  );
}
