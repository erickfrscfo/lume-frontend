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
  ReferenceArea,
  Cell,
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
  forecastStartMonth?: string;
}

// ============================================
// HELPERS
// ============================================
const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function formatMonthLabel(monthKey: string): string {
  const parts = monthKey.split('-');
  if (parts.length < 2) return monthKey;
  const [year, m] = parts;
  const idx = parseInt(m) - 1;
  return `${MONTH_NAMES[idx] || m}/${year.slice(2)}`;
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
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-xl p-3.5 text-xs min-w-[200px]">
      <p className="font-semibold text-slate-900 mb-2.5 text-sm border-b border-slate-100 pb-2">
        {data.monthLabel}
        {data.isForecast && (
          <span className="ml-2 text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
            Projeção
          </span>
        )}
      </p>
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: '#10b981' }} />
            Entradas
          </span>
          <span className="font-semibold text-emerald-600">{formatCurrency(data.rawIncome)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: '#f87171' }} />
            Saídas
          </span>
          <span className="font-semibold text-red-500">{formatCurrency(data.rawExpense)}</span>
        </div>
        <div className="border-t border-slate-100 pt-1.5 flex justify-between items-center">
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-[2px] inline-block" style={{ backgroundColor: '#1e293b' }} />
            Saldo Base
          </span>
          <span className="font-bold text-slate-900">{formatCurrency(data.baselineBalance)}</span>
        </div>
        {data.hasScenario && (
          <>
            {(data.rawScenarioIncome > 0 || data.rawScenarioExpense > 0) && (
              <div className="border-t border-slate-100 pt-1.5 space-y-1">
                {data.rawScenarioIncome > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: '#a78bfa' }} />
                      Cenário (+)
                    </span>
                    <span className="font-medium text-purple-600">{formatCurrency(data.rawScenarioIncome)}</span>
                  </div>
                )}
                {data.rawScenarioExpense > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: '#c4b5fd' }} />
                      Cenário (-)
                    </span>
                    <span className="font-medium text-purple-500">{formatCurrency(data.rawScenarioExpense)}</span>
                  </div>
                )}
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1.5">
                <span className="w-5 h-[2px] inline-block" style={{ backgroundColor: '#7c3aed' }} />
                Saldo Cenário
              </span>
              <span className="font-bold text-purple-700">{formatCurrency(data.scenarioBalance)}</span>
            </div>
          </>
        )}
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

  const forecastStart = useMemo(() => {
    if (forecastStartMonth) return forecastStartMonth;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, [forecastStartMonth]);

  // Transformar dados para o gráfico
  // CHAVE: inflow (positivo) e outflow (negativo) no MESMO stackId = coluna única bidirecional
  const chartData = useMemo(() => {
    let baselineRunning = initialBalance;
    let scenarioRunning = initialBalance;

    return data.map((point) => {
      const isForecast = point.month >= forecastStart;
      const monthLabel = formatMonthLabel(point.month);

      // Valores brutos para tooltip
      const rawIncome = point.income;
      const rawExpense = point.expense;

      // Barras: inflow positivo, outflow negativo → mesma coluna
      const inflow = point.income;
      const outflow = -point.expense;

      // Saldo acumulado baseline
      baselineRunning += point.net;

      // Cenário: calcular ajustes adicionais
      let scenarioInflowVal = 0;
      let scenarioOutflowVal = 0;
      let rawScenarioIncome = 0;
      let rawScenarioExpense = 0;

      activeScenarios.forEach(s => {
        const adj = s.adjustments;
        const start = adj.startMonth || point.month;
        const end = adj.endMonth || '9999-12';

        if (point.month >= start && point.month <= end) {
          if (adj.monthlyRevenue) {
            scenarioInflowVal += adj.monthlyRevenue;
            rawScenarioIncome += adj.monthlyRevenue;
          }
          if (adj.monthlyExpense) {
            scenarioOutflowVal -= adj.monthlyExpense;
            rawScenarioExpense += adj.monthlyExpense;
          }
        }

        if (point.month === start) {
          if (adj.oneTimeRevenue) {
            scenarioInflowVal += adj.oneTimeRevenue;
            rawScenarioIncome += adj.oneTimeRevenue;
          }
          if (adj.oneTimeExpense) {
            scenarioOutflowVal -= adj.oneTimeExpense;
            rawScenarioExpense += adj.oneTimeExpense;
          }
        }
      });

      scenarioRunning += point.net + scenarioInflowVal + scenarioOutflowVal;

      return {
        month: point.month,
        monthLabel,
        isForecast,
        // Barras baseline (mesmo stackId para coluna única)
        inflow,          // positivo → acima do zero (verde)
        outflow,         // negativo → abaixo do zero (vermelho)
        // Barras cenário (mesmo stackId, empilhadas)
        scenarioInflow: hasScenario ? scenarioInflowVal : 0,    // positivo → roxo acima
        scenarioOutflow: hasScenario ? scenarioOutflowVal : 0,  // negativo → roxo abaixo
        // Linhas de saldo
        baselineBalance: baselineRunning,
        scenarioBalance: hasScenario ? scenarioRunning : undefined,
        // Dados brutos para tooltip
        rawIncome,
        rawExpense,
        rawScenarioIncome,
        rawScenarioExpense,
        hasScenario,
      };
    });
  }, [data, activeScenarios, initialBalance, forecastStart, hasScenario]);

  // Índice do primeiro mês de forecast
  const forecastIndex = useMemo(() => {
    const idx = chartData.findIndex(d => d.isForecast);
    return idx >= 0 ? idx : -1;
  }, [chartData]);

  const transitionMonth = forecastIndex > 0 ? chartData[forecastIndex - 1].month : null;
  const transitionMonthForecast = forecastIndex >= 0 ? chartData[forecastIndex].month : null;

  // Cores dinâmicas por barra
  const getInflowColor = useCallback((isForecast: boolean) => {
    return isForecast ? 'rgba(16, 185, 129, 0.45)' : 'rgba(16, 185, 129, 0.85)';
  }, []);

  const getOutflowColor = useCallback((isForecast: boolean) => {
    return isForecast ? 'rgba(248, 113, 113, 0.4)' : 'rgba(248, 113, 113, 0.75)';
  }, []);

  const getScenarioInflowColor = useCallback((isForecast: boolean) => {
    return isForecast ? 'rgba(167, 139, 250, 0.5)' : 'rgba(167, 139, 250, 0.8)';
  }, []);

  const getScenarioOutflowColor = useCallback((isForecast: boolean) => {
    return isForecast ? 'rgba(196, 181, 253, 0.45)' : 'rgba(196, 181, 253, 0.7)';
  }, []);

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
        <div className="flex justify-center gap-6 mb-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded">
            <span>&larr;</span> Realizado
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-white bg-slate-800 px-3 py-1 rounded">
            Projeção <span>&rarr;</span>
          </div>
        </div>
      )}

      <ResponsiveContainer width="100%" height={420}>
        <ComposedChart
          data={chartData}
          margin={{ top: 10, right: 15, left: 15, bottom: 5 }}
          barCategoryGap="25%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />

          {/* Zona de transição Actuals → Forecasts */}
          {transitionMonth && transitionMonthForecast && (
            <ReferenceArea
              x1={transitionMonth}
              x2={transitionMonthForecast}
              fill="#f5f3ff"
              fillOpacity={0.7}
              stroke="none"
            />
          )}

          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 500 }}
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
            width={72}
          />

          {/* Eixo Y direito (linhas de saldo) */}
          <YAxis
            yAxisId="lines"
            orientation="right"
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            tickFormatter={formatAxisValue}
            axisLine={false}
            tickLine={false}
            width={72}
          />

          {/* Linha zero */}
          <ReferenceLine y={0} yAxisId="bars" stroke="#94a3b8" strokeWidth={1} />

          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />

          {/* ===== BARRAS — TODAS NO MESMO stackId PARA COLUNA ÚNICA ===== */}

          {/* Inflow baseline (verde, positivo → acima do zero) */}
          <Bar
            yAxisId="bars"
            dataKey="inflow"
            stackId="column"
            maxBarSize={48}
            isAnimationActive={true}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`inflow-${index}`}
                fill={getInflowColor(entry.isForecast)}
                radius={hasScenario && entry.scenarioInflow > 0 ? 0 : [3, 3, 0, 0] as any}
              />
            ))}
          </Bar>

          {/* Cenário Inflow (roxo, positivo → empilhado acima do verde) */}
          {hasScenario && (
            <Bar
              yAxisId="bars"
              dataKey="scenarioInflow"
              stackId="column"
              maxBarSize={48}
              isAnimationActive={true}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`sinflow-${index}`}
                  fill={getScenarioInflowColor(entry.isForecast)}
                  radius={[3, 3, 0, 0] as any}
                />
              ))}
            </Bar>
          )}

          {/* Outflow baseline (vermelho, negativo → abaixo do zero) */}
          <Bar
            yAxisId="bars"
            dataKey="outflow"
            stackId="column"
            maxBarSize={48}
            isAnimationActive={true}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`outflow-${index}`}
                fill={getOutflowColor(entry.isForecast)}
                radius={hasScenario && entry.scenarioOutflow < 0 ? 0 : [0, 0, 3, 3] as any}
              />
            ))}
          </Bar>

          {/* Cenário Outflow (roxo claro, negativo → empilhado abaixo do vermelho) */}
          {hasScenario && (
            <Bar
              yAxisId="bars"
              dataKey="scenarioOutflow"
              stackId="column"
              maxBarSize={48}
              isAnimationActive={true}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`soutflow-${index}`}
                  fill={getScenarioOutflowColor(entry.isForecast)}
                  radius={[0, 0, 3, 3] as any}
                />
              ))}
            </Bar>
          )}

          {/* ===== LINHAS DE SALDO ===== */}

          {/* Baseline cash balance (preta sólida) */}
          <Line
            yAxisId="lines"
            type="monotone"
            dataKey="baselineBalance"
            stroke="#1e293b"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, fill: '#1e293b', stroke: '#fff', strokeWidth: 2 }}
            name="Saldo base"
          />

          {/* Scenario cash balance (roxa sólida) */}
          {hasScenario && (
            <Line
              yAxisId="lines"
              type="monotone"
              dataKey="scenarioBalance"
              stroke="#7c3aed"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, fill: '#7c3aed', stroke: '#fff', strokeWidth: 2 }}
              name="Cenário"
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {/* Legenda */}
      <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-2 mt-4 text-[13px]">
        <div className="flex items-center gap-2">
          <div className="w-5 h-[2.5px] bg-slate-800 rounded-full" />
          <span className="text-slate-600">Saldo de caixa base</span>
        </div>
        {hasScenario && (
          <div className="flex items-center gap-2">
            <div className="w-5 h-[2.5px] rounded-full" style={{ backgroundColor: '#7c3aed' }} />
            <span className="text-slate-600">{scenarioName}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded-sm" style={{ backgroundColor: 'rgba(16, 185, 129, 0.85)' }} />
          <span className="text-slate-600">Entradas</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded-sm" style={{ backgroundColor: 'rgba(248, 113, 113, 0.75)' }} />
          <span className="text-slate-600">Saídas</span>
        </div>
      </div>
    </div>
  );
}
