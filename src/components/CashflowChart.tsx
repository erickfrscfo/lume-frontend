import React, { useMemo, useCallback } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';

// ============================================
// TYPES
// ============================================
export interface CashflowDataPoint {
  month: string;
  income: number;
  expense: number;
  net: number;
}

export interface Scenario {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  adjustments: {
    monthlyRevenue?: number;
    monthlyExpense?: number;
    oneTimeRevenue?: number;
    oneTimeExpense?: number;
    startMonth?: string;
    endMonth?: string;
    notes?: string;
  };
}

interface CashflowChartProps {
  data: CashflowDataPoint[];
  scenarios?: Scenario[];
  initialBalance?: number;
  forecastStartMonth?: string;
  onExplain?: () => void;
}

// ============================================
// HELPERS
// ============================================
const MONTH_LABELS: Record<number, string> = {
  1: 'Jan', 2: 'Fev', 3: 'Mar', 4: 'Abr', 5: 'Mai', 6: 'Jun',
  7: 'Jul', 8: 'Ago', 9: 'Set', 10: 'Out', 11: 'Nov', 12: 'Dez',
};

function fmtMonth(key: string): string {
  const [y, m] = key.split('-');
  return `${MONTH_LABELS[parseInt(m)] || m} ${y.slice(2)}`;
}

function fmtAxis(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return `R$ ${v.toFixed(0)}`;
}

// ============================================
// CUSTOM TOOLTIP — clean, minimal
// ============================================
function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;

  return (
    <div className="bg-white rounded-lg shadow-xl border border-slate-200 p-3 text-xs min-w-[190px]">
      <p className="font-semibold text-slate-800 text-sm mb-2 pb-1.5 border-b border-slate-100">
        {d.label}
        {d.isForecast && (
          <span className="ml-2 text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">Projeção</span>
        )}
      </p>
      <div className="space-y-1">
        <Row color="#10b981" label="Entrada" value={formatCurrency(d.rawIncome)} />
        <Row color="#ef4444" label="Saída" value={formatCurrency(d.rawExpense)} />
        <div className="border-t border-slate-100 pt-1 mt-1">
          <RowLine color="#1e293b" label="Saldo base" value={formatCurrency(d.baselineBal)} />
        </div>
        {d.hasScenario && (
          <>
            {d.rawScIncome > 0 && <Row color="#a78bfa" label="Cenário (+)" value={formatCurrency(d.rawScIncome)} />}
            {d.rawScExpense > 0 && <Row color="#c4b5fd" label="Cenário (-)" value={formatCurrency(d.rawScExpense)} />}
            <RowLine color="#7c3aed" label="Saldo cenário" value={formatCurrency(d.scenarioBal)} dashed />
          </>
        )}
      </div>
    </div>
  );
}

function Row({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: color }} />
        <span className="text-slate-600">{label}</span>
      </span>
      <span className="font-semibold text-slate-800">{value}</span>
    </div>
  );
}

function RowLine({ color, label, value, dashed }: { color: string; label: string; value: string; dashed?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="flex items-center gap-1.5">
        <span className="w-4 inline-block" style={{ height: 2, backgroundColor: color, borderTop: dashed ? `2px dashed ${color}` : 'none', background: dashed ? 'none' : color }} />
        <span className="text-slate-600">{label}</span>
      </span>
      <span className="font-bold text-slate-800">{value}</span>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function CashflowChart({
  data,
  scenarios = [],
  initialBalance = 0,
  forecastStartMonth,
  onExplain,
}: CashflowChartProps) {
  const activeScenarios = useMemo(() => scenarios.filter(s => s.isActive), [scenarios]);
  const hasScenario = activeScenarios.length > 0;
  const scenarioName = activeScenarios.length === 1
    ? activeScenarios[0].name
    : activeScenarios.length > 1
      ? `${activeScenarios.length} cenários`
      : '';

  const forecastStart = useMemo(() => {
    if (forecastStartMonth) return forecastStartMonth;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, [forecastStartMonth]);

  // Build chart data — single column per month
  const chartData = useMemo(() => {
    let baseBal = initialBalance;
    let scBal = initialBalance;

    return data.map((pt) => {
      const isForecast = pt.month >= forecastStart;
      const label = fmtMonth(pt.month);

      // Baseline bars
      const inflow = pt.income;            // positive → above zero
      const outflow = -pt.expense;         // negative → below zero

      baseBal += pt.net;

      // Scenario adjustments
      let scInflowVal = 0;
      let scOutflowVal = 0;
      let rawScIncome = 0;
      let rawScExpense = 0;

      activeScenarios.forEach(s => {
        const adj = s.adjustments;
        const start = adj.startMonth || pt.month;
        const end = adj.endMonth || '9999-12';
        if (pt.month >= start && pt.month <= end) {
          if (adj.monthlyRevenue) { scInflowVal += adj.monthlyRevenue; rawScIncome += adj.monthlyRevenue; }
          if (adj.monthlyExpense) { scOutflowVal -= adj.monthlyExpense; rawScExpense += adj.monthlyExpense; }
        }
        if (pt.month === start) {
          if (adj.oneTimeRevenue) { scInflowVal += adj.oneTimeRevenue; rawScIncome += adj.oneTimeRevenue; }
          if (adj.oneTimeExpense) { scOutflowVal -= adj.oneTimeExpense; rawScExpense += adj.oneTimeExpense; }
        }
      });

      scBal += pt.net + scInflowVal + scOutflowVal;

      return {
        month: pt.month,
        label,
        isForecast,
        // Bars (all in same stackId "col")
        inflow,
        outflow,
        scInflow: hasScenario ? scInflowVal : 0,
        scOutflow: hasScenario ? scOutflowVal : 0,
        // Lines
        baselineBal: baseBal,
        scenarioBal: hasScenario ? scBal : undefined,
        // Tooltip raw
        rawIncome: pt.income,
        rawExpense: pt.expense,
        rawScIncome,
        rawScExpense,
        hasScenario,
      };
    });
  }, [data, activeScenarios, initialBalance, forecastStart, hasScenario]);

  // Empty state
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Fluxo de Caixa</h3>
            <p className="text-sm text-slate-400 mt-0.5">Visualização de entradas, saídas e saldo de caixa</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center h-[360px] text-slate-400">
          <svg className="w-12 h-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
          <p className="text-sm font-medium">Nenhum dado de fluxo de caixa</p>
          <p className="text-xs mt-1">Importe transações via CSV para visualizar o fluxo</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      {/* ===== HEADER — exatamente como wireframe ===== */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Fluxo de Caixa</h3>
          <p className="text-sm text-slate-400 mt-0.5">Visualização de entradas, saídas e saldo de caixa</p>
        </div>
        <div className="flex items-center gap-3">
          {onExplain && (
            <button
              onClick={onExplain}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-violet-300 text-violet-600 text-sm font-medium hover:bg-violet-50 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3l1.5 3.5L17 8l-3.5 1.5L12 13l-1.5-3.5L7 8l3.5-1.5L12 3z" />
                <path d="M5 16l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2z" />
                <path d="M18 14l.7 1.3 1.3.7-1.3.7-.7 1.3-.7-1.3-1.3-.7 1.3-.7.7-1.3z" />
              </svg>
              Explica pra mim
            </button>
          )}
          {hasScenario && (
            <div className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-violet-300 text-violet-600 text-sm font-medium bg-violet-50">
              Cenário ativo
            </div>
          )}
        </div>
      </div>

      {/* ===== LABELS Realizado / Projeção ===== */}
      <div className="flex justify-center gap-3 mb-4">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-white bg-slate-700 px-4 py-1.5 rounded-md">
          <span>&larr;</span> Realizado
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-white bg-slate-900 px-4 py-1.5 rounded-md">
          Projeção <span>&rarr;</span>
        </div>
      </div>

      {/* ===== CHART ===== */}
      <ResponsiveContainer width="100%" height={420}>
        <ComposedChart
          data={chartData}
          margin={{ top: 5, right: 10, left: 5, bottom: 5 }}
          barCategoryGap="30%"
        >
          {/* Grid: horizontal dashed lines only */}
          <CartesianGrid
            strokeDasharray="4 4"
            stroke="#e2e8f0"
            vertical={false}
          />

          {/* X axis */}
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 500 }}
            tickFormatter={fmtMonth}
            axisLine={{ stroke: '#e2e8f0' }}
            tickLine={false}
          />

          {/* Y axis left — for bars */}
          <YAxis
            yAxisId="bars"
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            tickFormatter={fmtAxis}
            axisLine={false}
            tickLine={false}
            width={75}
          />

          {/* Y axis right — for balance lines (hidden, shares scale) */}
          <YAxis
            yAxisId="lines"
            orientation="right"
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            tickFormatter={fmtAxis}
            axisLine={false}
            tickLine={false}
            width={75}
          />

          {/* Zero line */}
          <ReferenceLine y={0} yAxisId="bars" stroke="#94a3b8" strokeWidth={1} />

          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />

          {/* ===== BARS — ALL SAME stackId="col" → single column ===== */}

          {/* Scenario inflow (purple, stacked above green) */}
          {hasScenario && (
            <Bar yAxisId="bars" dataKey="scInflow" stackId="col" maxBarSize={44}>
              {chartData.map((e, i) => (
                <Cell key={i} fill={e.isForecast ? 'rgba(167,139,250,0.45)' : 'rgba(167,139,250,0.85)'} />
              ))}
            </Bar>
          )}

          {/* Inflow baseline (green, positive → above zero) */}
          <Bar yAxisId="bars" dataKey="inflow" stackId="col" maxBarSize={44}>
            {chartData.map((e, i) => (
              <Cell key={i} fill={e.isForecast ? 'rgba(16,185,129,0.4)' : '#10b981'} />
            ))}
          </Bar>

          {/* Outflow baseline (red, negative → below zero) */}
          <Bar yAxisId="bars" dataKey="outflow" stackId="col" maxBarSize={44}>
            {chartData.map((e, i) => (
              <Cell key={i} fill={e.isForecast ? 'rgba(239,68,68,0.35)' : '#ef4444'} />
            ))}
          </Bar>

          {/* Scenario outflow (purple light, stacked below red) */}
          {hasScenario && (
            <Bar yAxisId="bars" dataKey="scOutflow" stackId="col" maxBarSize={44}>
              {chartData.map((e, i) => (
                <Cell key={i} fill={e.isForecast ? 'rgba(196,181,253,0.4)' : 'rgba(196,181,253,0.8)'} />
              ))}
            </Bar>
          )}

          {/* ===== LINES ===== */}

          {/* Baseline balance — solid black line */}
          <Line
            yAxisId="lines"
            type="monotone"
            dataKey="baselineBal"
            stroke="#1e293b"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, fill: '#1e293b', stroke: '#fff', strokeWidth: 2 }}
          />

          {/* Scenario balance — dashed purple line */}
          {hasScenario && (
            <Line
              yAxisId="lines"
              type="monotone"
              dataKey="scenarioBal"
              stroke="#7c3aed"
              strokeWidth={2.5}
              strokeDasharray="8 5"
              dot={false}
              activeDot={{ r: 5, fill: '#7c3aed', stroke: '#fff', strokeWidth: 2 }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {/* ===== LEGEND — circles, exactly like wireframe ===== */}
      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 mt-5 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: '#1e293b' }} />
          <span className="text-slate-600">Saldo base</span>
        </div>
        {hasScenario && (
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: '#a78bfa' }} />
            <span className="text-slate-600">{scenarioName || 'Meu cenário'}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: '#10b981' }} />
          <span className="text-slate-600">Entrada</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: '#ef4444' }} />
          <span className="text-slate-600">Saída</span>
        </div>
      </div>
    </div>
  );
}
