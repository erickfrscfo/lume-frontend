import React, { useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceArea,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { ExplainButton } from '@/components/ExplainModal';

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
// COLORS — matching wireframe exactly
// ============================================
const COLORS = {
  income: '#10b981',           // green — base of bar
  incomeForecast: 'rgba(16,185,129,0.35)',
  expense: '#c4a882',          // beige/tan — stacked above green
  expenseForecast: 'rgba(196,168,130,0.40)',
  scenario: '#a78bfa',         // purple — stacked above beige
  scenarioForecast: 'rgba(167,139,250,0.45)',
  baselineLine: '#1e293b',     // dark black line
  scenarioLine: '#7c3aed',     // purple dashed line
  legendIncome: '#10b981',
  legendExpense: '#ef4444',    // legend shows red dot for "Saída"
  legendBaseline: '#1e293b',
  legendScenario: '#a78bfa',
};

// ============================================
// CUSTOM TOOLTIP — matches wireframe style
// ============================================
function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200/80 px-5 py-4 text-sm min-w-[220px]">
      <p className="font-bold text-slate-900 text-base mb-3 pb-2 border-b border-slate-100">
        {d.label}
      </p>
      <div className="space-y-2">
        <TooltipRow color={COLORS.legendIncome} label="Entrada" value={formatCurrency(d.rawIncome)} />
        <TooltipRow color={COLORS.legendExpense} label="Saída" value={formatCurrency(d.rawExpense)} />
        <div className="border-t border-slate-100 pt-2 mt-2">
          <TooltipLineRow color={COLORS.baselineLine} label="Saldo base" value={formatCurrency(d.baselineBal)} bold />
        </div>
        {d.hasScenario && d.rawScTotal > 0 && (
          <>
            <TooltipRow color={COLORS.scenario} label="Meu Cenário" value={formatCurrency(d.rawScTotal)} />
            <TooltipLineRow color={COLORS.scenarioLine} label="Saldo Cenário" value={formatCurrency(d.scenarioBal)} dashed purple />
          </>
        )}
      </div>
    </div>
  );
}

function TooltipRow({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex justify-between items-center gap-6">
      <span className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: color }} />
        <span className="text-slate-600">{label}</span>
      </span>
      <span className="font-semibold text-slate-800 tabular-nums">{value}</span>
    </div>
  );
}

function TooltipLineRow({ color, label, value, bold, dashed, purple }: {
  color: string; label: string; value: string; bold?: boolean; dashed?: boolean; purple?: boolean;
}) {
  return (
    <div className="flex justify-between items-center gap-6">
      <span className="flex items-center gap-2">
        <span className="w-5 inline-block flex-shrink-0" style={{
          height: 2,
          backgroundColor: dashed ? 'transparent' : color,
          borderTop: dashed ? `2px dashed ${color}` : 'none',
        }} />
        <span className={purple ? 'text-violet-600' : 'text-slate-600'}>{label}</span>
      </span>
      <span className={`tabular-nums ${bold ? 'font-bold text-slate-900' : purple ? 'font-semibold text-violet-600' : 'font-semibold text-slate-800'}`}>
        {value}
      </span>
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

  // ============================================
  // BUILD CHART DATA
  // Wireframe structure: ALL bars are POSITIVE, stacked above zero
  // Stack order (bottom to top): income (green) → expense (beige) → scenario (purple)
  // ============================================
  const chartData = useMemo(() => {
    let baseBal = initialBalance;
    let scBal = initialBalance;

    return data.map((pt) => {
      const isForecast = pt.month >= forecastStart;
      const label = fmtMonth(pt.month);

      // All values positive — stacked above zero
      const incomeVal = Math.abs(pt.income);
      const expenseVal = Math.abs(pt.expense);

      baseBal += pt.net;

      // Scenario adjustments
      let scTotal = 0;
      activeScenarios.forEach(s => {
        const adj = s.adjustments;
        const start = adj.startMonth || pt.month;
        const end = adj.endMonth || '9999-12';
        if (pt.month >= start && pt.month <= end) {
          if (adj.monthlyRevenue) scTotal += adj.monthlyRevenue;
          if (adj.monthlyExpense) scTotal += adj.monthlyExpense;
        }
        if (pt.month === start) {
          if (adj.oneTimeRevenue) scTotal += adj.oneTimeRevenue;
          if (adj.oneTimeExpense) scTotal += adj.oneTimeExpense;
        }
      });

      scBal += pt.net + scTotal;

      return {
        month: pt.month,
        label,
        isForecast,
        // Stacked bars (all positive, above zero)
        income: incomeVal,
        expense: expenseVal,
        scenarioBar: hasScenario ? Math.abs(scTotal) : 0,
        // Lines
        baselineBal: baseBal,
        scenarioBal: hasScenario ? scBal : undefined,
        // Tooltip raw values
        rawIncome: pt.income,
        rawExpense: pt.expense,
        rawScTotal: Math.abs(scTotal),
        hasScenario,
      };
    });
  }, [data, activeScenarios, initialBalance, forecastStart, hasScenario]);

  // Find forecast boundary for reference area
  const forecastIdx = chartData.findIndex(d => d.isForecast);

  // ============================================
  // EMPTY STATE
  // ============================================
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
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
      {/* ===== HEADER ===== */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Fluxo de Caixa</h3>
          <p className="text-sm text-slate-400 mt-0.5">Visualização de entradas, saídas e saldo de caixa</p>
        </div>
        <div className="flex items-center gap-3">
          <ExplainButton
            metric="Fluxo de Caixa"
            value={`Entradas: ${formatCurrency(chartData.reduce((s: number, d: any) => s + (d.income || 0), 0))} / Saídas: ${formatCurrency(chartData.reduce((s: number, d: any) => s + (d.expense || 0), 0))}`}
            context={`Dados do gráfico de Fluxo de Caixa (${chartData.length} meses):\n${chartData.map((d: any) => `${d.month}: Entrada R$ ${(d.income||0).toLocaleString('pt-BR')} | Saída R$ ${(d.expense||0).toLocaleString('pt-BR')} | Líquido R$ ${(d.net||0).toLocaleString('pt-BR')}`).join('\n')}`}
          />
          {hasScenario && (
            <div className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-violet-300 text-violet-600 text-sm font-medium bg-violet-50">
              Cenário ativo
            </div>
          )}
        </div>
      </div>

      {/* ===== LABELS Realizado / Projeção ===== */}
      <div className="flex justify-center gap-3 mb-4">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-white bg-slate-600 px-4 py-1.5 rounded-md">
          <span>←</span> Realizado
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-white bg-slate-900 px-4 py-1.5 rounded-md">
          Projeção <span>→</span>
        </div>
      </div>

      {/* ===== CHART ===== */}
      <ResponsiveContainer width="100%" height={420}>
        <ComposedChart
          data={chartData}
          margin={{ top: 10, right: 15, left: 5, bottom: 5 }}
          barCategoryGap="35%"
        >
          {/* Grid: horizontal dashed lines only */}
          <CartesianGrid
            strokeDasharray="4 4"
            stroke="#e2e8f0"
            vertical={false}
          />

          {/* Forecast shaded zone */}
          {forecastIdx > 0 && (
            <ReferenceArea
              x1={chartData[forecastIdx - 1]?.month}
              x2={chartData[forecastIdx]?.month}
              fill="#f1f5f9"
              fillOpacity={0.7}
              strokeOpacity={0}
            />
          )}

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

          {/* Y axis right — for balance lines */}
          <YAxis
            yAxisId="lines"
            orientation="right"
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            tickFormatter={fmtAxis}
            axisLine={false}
            tickLine={false}
            width={75}
          />

          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />

          {/* ===== STACKED BARS — all positive, same stackId ===== */}
          {/* Order: income (green, base) → expense (beige, middle) → scenario (purple, top) */}

          {/* 1. Income — green base */}
          <Bar yAxisId="bars" dataKey="income" stackId="stack" maxBarSize={48} radius={[0, 0, 0, 0]}>
            {chartData.map((e, i) => (
              <Cell key={i} fill={e.isForecast ? COLORS.incomeForecast : COLORS.income} />
            ))}
          </Bar>

          {/* 2. Expense — beige/tan stacked above green */}
          <Bar yAxisId="bars" dataKey="expense" stackId="stack" maxBarSize={48} radius={[0, 0, 0, 0]}>
            {chartData.map((e, i) => (
              <Cell key={i} fill={e.isForecast ? COLORS.expenseForecast : COLORS.expense} />
            ))}
          </Bar>

          {/* 3. Scenario — purple stacked above beige (only when active) */}
          {hasScenario && (
            <Bar yAxisId="bars" dataKey="scenarioBar" stackId="stack" maxBarSize={48} radius={[2, 2, 0, 0]}>
              {chartData.map((e, i) => (
                <Cell key={i} fill={e.isForecast ? COLORS.scenarioForecast : COLORS.scenario} />
              ))}
            </Bar>
          )}

          {/* ===== LINES ===== */}

          {/* Baseline balance — solid dark line */}
          <Line
            yAxisId="lines"
            type="monotone"
            dataKey="baselineBal"
            stroke={COLORS.baselineLine}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, fill: COLORS.baselineLine, stroke: '#fff', strokeWidth: 2 }}
          />

          {/* Scenario balance — dashed purple line */}
          {hasScenario && (
            <Line
              yAxisId="lines"
              type="monotone"
              dataKey="scenarioBal"
              stroke={COLORS.scenarioLine}
              strokeWidth={2.5}
              strokeDasharray="8 5"
              dot={false}
              activeDot={{ r: 5, fill: COLORS.scenarioLine, stroke: '#fff', strokeWidth: 2 }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {/* ===== LEGEND — circles, matching wireframe ===== */}
      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 mt-5 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: COLORS.legendBaseline }} />
          <span className="text-slate-600">Saldo base</span>
        </div>
        {hasScenario && (
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: COLORS.legendScenario }} />
            <span className="text-slate-600">{scenarioName || 'Meu cenário'}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: COLORS.legendIncome }} />
          <span className="text-slate-600">Entrada</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: COLORS.legendExpense }} />
          <span className="text-slate-600">Saída</span>
        </div>
      </div>
    </div>
  );
}
