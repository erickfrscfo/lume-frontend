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
  ReferenceLine,
  ReferenceArea,
  Cell,
  Legend,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';

// ============================================
// TYPES
// ============================================
export interface CashflowDataPoint {
  month: string;       // "2025-01"
  income: number;      // Entradas (positivo)
  expense: number;     // Saídas (positivo, será invertido no gráfico)
  net: number;         // Saldo líquido do mês
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
  forecastStartMonth?: string; // Mês a partir do qual é projeção (ex: "2026-02")
}

// ============================================
// HELPERS
// ============================================
const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function formatMonthLabel(monthKey: string): string {
  const [year, m] = monthKey.split('-');
  return `${MONTH_NAMES[parseInt(m) - 1]}/${year.slice(2)}`;
}

function formatAxisValue(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `R$${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `R$${(value / 1_000).toFixed(0)}K`;
  return `R$${value.toFixed(0)}`;
}

// ============================================
// CUSTOM TOOLTIP
// ============================================
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs min-w-[180px]">
      <p className="font-semibold text-slate-900 mb-2 text-sm">{data.monthLabel}</p>
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
            Entradas
          </span>
          <span className="font-medium text-emerald-600">{formatCurrency(data.inflow)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-red-400 inline-block" />
            Saídas
          </span>
          <span className="font-medium text-red-500">{formatCurrency(Math.abs(data.outflow))}</span>
        </div>
        <div className="border-t border-slate-100 pt-1.5 flex justify-between items-center">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-slate-800 inline-block" />
            Saldo Base
          </span>
          <span className="font-semibold text-slate-900">{formatCurrency(data.baselineBalance)}</span>
        </div>
        {data.hasScenario && (
          <>
            {(data.scenarioInflow !== 0 || data.scenarioOutflow !== 0) && (
              <>
                {data.scenarioInflow > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-purple-400 inline-block" />
                      Cenário +
                    </span>
                    <span className="font-medium text-purple-600">{formatCurrency(data.scenarioInflow)}</span>
                  </div>
                )}
                {data.scenarioOutflow < 0 && (
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-purple-300 inline-block" />
                      Cenário -
                    </span>
                    <span className="font-medium text-purple-500">{formatCurrency(Math.abs(data.scenarioOutflow))}</span>
                  </div>
                )}
              </>
            )}
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-purple-600 inline-block" />
                Saldo Cenário
              </span>
              <span className="font-semibold text-purple-700">{formatCurrency(data.scenarioBalance)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================
// CUSTOM LEGEND
// ============================================
function CustomLegend({ hasScenario, scenarioName }: { hasScenario: boolean; scenarioName: string }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-4 text-sm">
      <div className="flex items-center gap-2">
        <div className="w-4 h-0.5 bg-slate-800 rounded" />
        <span className="text-slate-600">Saldo de caixa base</span>
      </div>
      {hasScenario && (
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-purple-600 rounded" />
          <span className="text-slate-600">{scenarioName}</span>
        </div>
      )}
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-sm bg-emerald-500" />
        <span className="text-slate-600">Entradas</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-sm bg-red-400" />
        <span className="text-slate-600">Saídas</span>
      </div>
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
}: CashflowChartProps) {
  // Cenários ativos combinados
  const activeScenarios = useMemo(
    () => scenarios.filter(s => s.isActive),
    [scenarios]
  );
  const hasScenario = activeScenarios.length > 0;
  const scenarioName = activeScenarios.length === 1
    ? activeScenarios[0].name
    : activeScenarios.length > 1
      ? `${activeScenarios.length} cenários`
      : '';

  // Determinar mês de corte actuals/forecast
  const forecastStart = useMemo(() => {
    if (forecastStartMonth) return forecastStartMonth;
    // Se não especificado, usar mês atual como corte
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, [forecastStartMonth]);

  // Transformar dados para o gráfico
  const chartData = useMemo(() => {
    let baselineRunning = initialBalance;
    let scenarioRunning = initialBalance;

    return data.map((point) => {
      const isForecast = point.month >= forecastStart;
      const monthLabel = formatMonthLabel(point.month);

      // Baseline
      const inflow = point.income;
      const outflow = -point.expense; // Negativo para ficar abaixo do zero
      baselineRunning += point.net;

      // Cenário: calcular ajustes adicionais
      let scenarioInflow = 0;
      let scenarioOutflow = 0;

      activeScenarios.forEach(s => {
        const adj = s.adjustments;
        const start = adj.startMonth || point.month;
        const end = adj.endMonth || '9999-12';

        if (point.month >= start && point.month <= end) {
          if (adj.monthlyRevenue) scenarioInflow += adj.monthlyRevenue;
          if (adj.monthlyExpense) scenarioOutflow -= adj.monthlyExpense;
        }

        // One-time no mês de início
        if (point.month === start) {
          if (adj.oneTimeRevenue) scenarioInflow += adj.oneTimeRevenue;
          if (adj.oneTimeExpense) scenarioOutflow -= adj.oneTimeExpense;
        }
      });

      scenarioRunning += point.net + scenarioInflow + scenarioOutflow;

      return {
        month: point.month,
        monthLabel,
        isForecast,
        // Barras baseline
        inflow,
        outflow,
        // Barras cenário (empilhadas sobre baseline)
        scenarioInflow: hasScenario ? scenarioInflow : 0,
        scenarioOutflow: hasScenario ? scenarioOutflow : 0,
        // Linhas de saldo
        baselineBalance: baselineRunning,
        scenarioBalance: hasScenario ? scenarioRunning : undefined,
        // Flag
        hasScenario,
      };
    });
  }, [data, activeScenarios, initialBalance, forecastStart, hasScenario]);

  // Encontrar índice do mês de transição para ReferenceArea
  const forecastIndex = useMemo(() => {
    const idx = chartData.findIndex(d => d.isForecast);
    return idx >= 0 ? idx : -1;
  }, [chartData]);

  // Encontrar mês anterior ao forecast para a zona de transição
  const transitionMonth = forecastIndex > 0 ? chartData[forecastIndex - 1].month : null;
  const transitionMonthForecast = forecastIndex >= 0 ? chartData[forecastIndex].month : null;

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] text-slate-400">
        <svg className="w-12 h-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
        <p className="text-sm font-medium">Nenhum dado de fluxo de caixa</p>
        <p className="text-xs mt-1">Importe transações via CSV para visualizar o fluxo</p>
      </div>
    );
  }

  return (
    <div>
      {/* Labels Actuals / Forecasts */}
      {forecastIndex >= 0 && (
        <div className="flex justify-center gap-8 mb-2">
          <div className="flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded">
            <span>&larr;</span> Realizado
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-800 text-white px-3 py-1 rounded">
            Projeção <span>&rarr;</span>
          </div>
        </div>
      )}

      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
          barCategoryGap="20%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />

          {/* Zona de transição Actuals → Forecasts */}
          {transitionMonth && transitionMonthForecast && (
            <ReferenceArea
              x1={transitionMonth}
              x2={transitionMonthForecast}
              fill="#f8f5ff"
              fillOpacity={0.8}
              stroke="none"
            />
          )}

          {/* Zona de forecast (leve sombreamento) */}
          {forecastIndex >= 0 && chartData.length > 0 && (
            <ReferenceArea
              x1={chartData[forecastIndex].month}
              x2={chartData[chartData.length - 1].month}
              fill="#faf5ff"
              fillOpacity={0.3}
              stroke="none"
            />
          )}

          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickFormatter={formatMonthLabel}
            axisLine={{ stroke: '#e2e8f0' }}
            tickLine={false}
          />

          {/* Eixo Y esquerdo (barras) */}
          <YAxis
            yAxisId="bars"
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            tickFormatter={formatAxisValue}
            axisLine={false}
            tickLine={false}
            width={70}
          />

          {/* Eixo Y direito (linhas de saldo) */}
          <YAxis
            yAxisId="lines"
            orientation="right"
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            tickFormatter={formatAxisValue}
            axisLine={false}
            tickLine={false}
            width={70}
          />

          {/* Linha zero */}
          <ReferenceLine y={0} yAxisId="bars" stroke="#cbd5e1" strokeWidth={1} />

          <Tooltip content={<CustomTooltip />} />

          {/* ===== BARRAS ===== */}

          {/* Inflow (verde, acima do zero) */}
          <Bar
            yAxisId="bars"
            dataKey="inflow"
            stackId="positive"
            fill="#10b981"
            radius={[2, 2, 0, 0]}
            maxBarSize={40}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`inflow-${index}`}
                fill="#10b981"
                fillOpacity={entry.isForecast ? 0.5 : 0.85}
              />
            ))}
          </Bar>

          {/* Cenário Inflow (roxo, empilhado sobre verde) */}
          {hasScenario && (
            <Bar
              yAxisId="bars"
              dataKey="scenarioInflow"
              stackId="positive"
              fill="#a78bfa"
              radius={[2, 2, 0, 0]}
              maxBarSize={40}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`sinflow-${index}`}
                  fill="#a78bfa"
                  fillOpacity={entry.isForecast ? 0.6 : 0.8}
                />
              ))}
            </Bar>
          )}

          {/* Outflow (vermelho, abaixo do zero) */}
          <Bar
            yAxisId="bars"
            dataKey="outflow"
            stackId="negative"
            fill="#f87171"
            radius={[0, 0, 2, 2]}
            maxBarSize={40}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`outflow-${index}`}
                fill="#f87171"
                fillOpacity={entry.isForecast ? 0.4 : 0.7}
              />
            ))}
          </Bar>

          {/* Cenário Outflow (roxo claro, empilhado abaixo) */}
          {hasScenario && (
            <Bar
              yAxisId="bars"
              dataKey="scenarioOutflow"
              stackId="negative"
              fill="#c4b5fd"
              radius={[0, 0, 2, 2]}
              maxBarSize={40}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`soutflow-${index}`}
                  fill="#c4b5fd"
                  fillOpacity={entry.isForecast ? 0.5 : 0.7}
                />
              ))}
            </Bar>
          )}

          {/* ===== LINHAS DE SALDO ===== */}

          {/* Baseline cash balance (preta) */}
          <Line
            yAxisId="lines"
            type="monotone"
            dataKey="baselineBalance"
            stroke="#1e293b"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, fill: '#1e293b' }}
            name="Saldo base"
          />

          {/* Scenario cash balance (roxa) */}
          {hasScenario && (
            <Line
              yAxisId="lines"
              type="monotone"
              dataKey="scenarioBalance"
              stroke="#7c3aed"
              strokeWidth={2}
              strokeDasharray="0"
              dot={false}
              activeDot={{ r: 4, fill: '#7c3aed' }}
              name="Cenário"
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {/* Custom Legend */}
      <CustomLegend hasScenario={hasScenario} scenarioName={scenarioName} />
    </div>
  );
}
