import { useEffect, useState, useMemo, useRef } from 'react';
import { financialApi, scenariosApi, aiApi, alertsApi, forecastApi } from '@/lib/api';
import { formatCurrency, getMonthLabel } from '@/lib/utils';
import MetricCard from '@/components/MetricCard';
import { AlertsBanner, AlertsPanel } from '@/components/AlertsPanel';
import { ExplainButton } from '@/components/ExplainModal';
import CashflowChart from '@/components/CashflowChart';
import type { CashflowDataPoint, Scenario as ChartScenario } from '@/components/CashflowChart';
import LoadingSpinner from '@/components/LoadingSpinner';
import {
  DollarSign, TrendingDown, Percent, Calendar,
  ChevronDown, ToggleLeft, ToggleRight,
  X, Info, Plus, Trash2,
  Send, MoreHorizontal, ArrowLeft, Sparkles, Loader2, BarChart3, TrendingUp
} from 'lucide-react';

// ============================================
// TYPES
// ============================================
interface MetricValue {
  value: number;
  change: number;
}

interface DashboardData {
  cashBalance: MetricValue;
  burnRate: MetricValue;
  runway: MetricValue;
  growth: MetricValue;
  transactionCount: number;
}

interface DREData {
  [month: string]: { [code: string]: number };
}

interface CashflowRaw {
  month: string;
  income: number;
  expense: number;
  expenses?: number;
  net: number;
}

interface Scenario {
  id: string;
  name: string;
  type: string;
  description?: string;
  adjustments: any;
  isActive: boolean;
  isNew?: boolean;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  scenariosCreated?: Scenario[];
}

type ScenarioType = 'PROJECT' | 'ORGANIZATIONAL_CHANGE' | 'INVESTMENT' | 'DIVESTMENT';
type SidebarTab = 'scenarios' | 'conversations';

interface ForecastPoint {
  month: string;
  income: number;
  expense: number;
  net: number;
  isForecast: true;
  scenario: string;
}

interface ForecastMetadata {
  forecastAvailable: boolean;
  historicalMonths: number;
  minimumRequired: number;
  drivers: {
    avgCmvPercent: number;
    avgTaxPercent: number;
    avgFixed: number;
    avgVariable: number;
    revenueGrowthRate: number;
  };
  scenario: string;
}

interface ForecastData {
  historical: any[];
  forecast: ForecastPoint[];
  metadata: ForecastMetadata;
}

type ForecastScenario = 'realistic' | 'optimistic' | 'pessimistic';

const SCENARIO_TYPES: { value: ScenarioType; label: string; color: string }[] = [
  { value: 'PROJECT', label: 'Projeto', color: 'bg-purple-100 text-purple-700' },
  { value: 'INVESTMENT', label: 'Investimento', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'DIVESTMENT', label: 'Desinvestimento', color: 'bg-red-100 text-red-700' },
  { value: 'ORGANIZATIONAL_CHANGE', label: 'Mudança Org.', color: 'bg-amber-100 text-amber-700' },
];

function getTypeInfo(type: string) {
  return SCENARIO_TYPES.find(t => t.value === type) || SCENARIO_TYPES[0];
}

// ============================================
// HELPERS
// ============================================
function extractValue(metric: any): number {
  if (metric === null || metric === undefined) return 0;
  if (typeof metric === 'number') return metric;
  if (typeof metric === 'object' && metric.value !== undefined) return Number(metric.value) || 0;
  return Number(metric) || 0;
}

function extractChange(metric: any): number | undefined {
  if (metric === null || metric === undefined) return undefined;
  if (typeof metric === 'object' && metric.change !== undefined) {
    const change = Number(metric.change);
    if (isNaN(change) || change === 0) return undefined;
    return change;
  }
  return undefined;
}

/** Renderiza markdown básico (negrito, itálico, listas) em JSX */
function renderMarkdown(text: string): React.ReactNode {
  // Divide por linhas para tratar listas e parágrafos
  const lines = text.split('\n');
  return lines.map((line, li) => {
    // Processa inline: **bold** e *italic*
    const parts: React.ReactNode[] = [];
    let remaining = line;
    let key = 0;
    while (remaining.length > 0) {
      // Bold: **text**
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
      if (boldMatch && boldMatch.index !== undefined) {
        if (boldMatch.index > 0) {
          parts.push(<span key={key++}>{remaining.slice(0, boldMatch.index)}</span>);
        }
        parts.push(<strong key={key++} className="font-semibold">{boldMatch[1]}</strong>);
        remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
      } else {
        parts.push(<span key={key++}>{remaining}</span>);
        break;
      }
    }
    return (
      <span key={li}>
        {parts}
        {li < lines.length - 1 && <br />}
      </span>
    );
  });
}

function ChevronRight(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m9 18 6-6-6-6"/>
    </svg>
  );
}

// ============================================
// AI SCENARIO PARSER
// Parses AI response to extract scenario data
// ============================================
function parseAiScenarios(aiText: string): Array<{
  name: string;
  type: ScenarioType;
  description?: string;
  adjustments: Record<string, any>;
}> {
  // Try to extract JSON from the AI response
  const jsonMatch = aiText.match(/\[[\s\S]*?\]/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed)) {
        return parsed.map((item: any) => ({
          name: item.name || item.nome || 'Cenário',
          type: mapType(item.type || item.tipo || 'PROJECT'),
          description: item.description || item.descricao || undefined,
          adjustments: {
            monthlyRevenue: parseNum(item.adjustments?.monthlyRevenue || item.receita_mensal),
            monthlyExpense: parseNum(item.adjustments?.monthlyExpense || item.despesa_mensal),
            oneTimeRevenue: parseNum(item.adjustments?.oneTimeRevenue || item.receita_unica),
            oneTimeExpense: parseNum(item.adjustments?.oneTimeExpense || item.despesa_unica),
            startMonth: item.adjustments?.startMonth || item.inicio || undefined,
            endMonth: item.adjustments?.endMonth || item.fim || undefined,
          },
        }));
      }
    } catch (e) {
      // JSON parse failed, continue
    }
  }
  return [];
}

function mapType(t: string): ScenarioType {
  const upper = t.toUpperCase();
  if (upper.includes('INVEST') && !upper.includes('DES')) return 'INVESTMENT';
  if (upper.includes('DESINVEST') || upper.includes('DIVEST')) return 'DIVESTMENT';
  if (upper.includes('ORG') || upper.includes('HIRE') || upper.includes('CONTRAT')) return 'ORGANIZATIONAL_CHANGE';
  return 'PROJECT';
}

function parseNum(v: any): number | undefined {
  if (v === null || v === undefined) return undefined;
  const n = Number(String(v).replace(/[^\d.-]/g, ''));
  return isNaN(n) || n === 0 ? undefined : n;
}

// ============================================
// NEW SCENARIO FORM (Manual)
// ============================================
interface NewScenarioFormProps {
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}

function NewScenarioForm({ onSave, onCancel, isSaving }: NewScenarioFormProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<ScenarioType>('PROJECT');
  const [description, setDescription] = useState('');
  const [monthlyRevenue, setMonthlyRevenue] = useState('');
  const [monthlyExpense, setMonthlyExpense] = useState('');
  const [oneTimeRevenue, setOneTimeRevenue] = useState('');
  const [oneTimeExpense, setOneTimeExpense] = useState('');
  const [startMonth, setStartMonth] = useState('');
  const [endMonth, setEndMonth] = useState('');
  const [formError, setFormError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!name.trim()) { setFormError('Nome é obrigatório'); return; }
    const adjustments: Record<string, any> = {};
    if (monthlyRevenue) adjustments.monthlyRevenue = parseFloat(monthlyRevenue);
    if (monthlyExpense) adjustments.monthlyExpense = parseFloat(monthlyExpense);
    if (oneTimeRevenue) adjustments.oneTimeRevenue = parseFloat(oneTimeRevenue);
    if (oneTimeExpense) adjustments.oneTimeExpense = parseFloat(oneTimeExpense);
    if (startMonth) adjustments.startMonth = startMonth;
    if (endMonth) adjustments.endMonth = endMonth;
    try {
      await onSave({ name: name.trim(), type, description: description.trim() || undefined, adjustments, isActive: true });
    } catch (err: any) {
      setFormError(err?.response?.data?.message || 'Erro ao criar cenário');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="bg-violet-50 rounded-lg p-3 border border-violet-200">
        <p className="text-xs font-semibold text-violet-700 mb-2">Novo Cenário (Manual)</p>
        {formError && <div className="bg-red-50 border border-red-200 rounded p-2 mb-2"><p className="text-xs text-red-600">{formError}</p></div>}
        <label className="block mb-2">
          <span className="text-xs text-slate-600 font-medium">Nome *</span>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Novo projeto X" className="mt-0.5 w-full text-xs border border-slate-300 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-400" />
        </label>
        <label className="block mb-2">
          <span className="text-xs text-slate-600 font-medium">Tipo</span>
          <select value={type} onChange={e => setType(e.target.value as ScenarioType)} className="mt-0.5 w-full text-xs border border-slate-300 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-400 bg-white">
            {SCENARIO_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </label>
        <label className="block mb-2">
          <span className="text-xs text-slate-600 font-medium">Descrição</span>
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição opcional..." rows={2} className="mt-0.5 w-full text-xs border border-slate-300 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-400 resize-none" />
        </label>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <label className="block"><span className="text-xs text-slate-600 font-medium">Início</span><input type="month" value={startMonth} onChange={e => setStartMonth(e.target.value)} className="mt-0.5 w-full text-xs border border-slate-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-400" /></label>
          <label className="block"><span className="text-xs text-slate-600 font-medium">Fim</span><input type="month" value={endMonth} onChange={e => setEndMonth(e.target.value)} className="mt-0.5 w-full text-xs border border-slate-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-400" /></label>
        </div>
        <p className="text-xs text-slate-500 font-medium mt-2 mb-1">Ajustes Mensais</p>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <label className="block"><span className="text-xs text-slate-600">+ Receita/mês</span><input type="number" value={monthlyRevenue} onChange={e => setMonthlyRevenue(e.target.value)} placeholder="0" className="mt-0.5 w-full text-xs border border-slate-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-400" /></label>
          <label className="block"><span className="text-xs text-slate-600">- Despesa/mês</span><input type="number" value={monthlyExpense} onChange={e => setMonthlyExpense(e.target.value)} placeholder="0" className="mt-0.5 w-full text-xs border border-slate-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-400" /></label>
        </div>
        <p className="text-xs text-slate-500 font-medium mt-2 mb-1">Ajustes Únicos</p>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <label className="block"><span className="text-xs text-slate-600">+ Receita única</span><input type="number" value={oneTimeRevenue} onChange={e => setOneTimeRevenue(e.target.value)} placeholder="0" className="mt-0.5 w-full text-xs border border-slate-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-400" /></label>
          <label className="block"><span className="text-xs text-slate-600">- Despesa única</span><input type="number" value={oneTimeExpense} onChange={e => setOneTimeExpense(e.target.value)} placeholder="0" className="mt-0.5 w-full text-xs border border-slate-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-400" /></label>
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={isSaving} className="flex-1 text-xs font-medium bg-violet-600 text-white rounded-md py-2 hover:bg-violet-700 disabled:opacity-50 transition-colors">{isSaving ? 'Salvando...' : 'Criar Cenário'}</button>
          <button type="button" onClick={onCancel} className="text-xs font-medium text-slate-600 border border-slate-300 rounded-md px-3 py-2 hover:bg-slate-50 transition-colors">Cancelar</button>
        </div>
      </div>
    </form>
  );
}

// ============================================
// SCENARIO DETAIL VIEW (expanded scenario with adjustments)
// ============================================
interface ScenarioDetailProps {
  scenario: Scenario;
  onBack: () => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

function ScenarioDetail({ scenario, onBack, onToggle, onDelete }: ScenarioDetailProps) {
  const typeInfo = getTypeInfo(scenario.type);
  const adj = scenario.adjustments || {};

  // Build list of adjustments as sub-items
  const adjustmentItems: { name: string; amount?: string; period?: string }[] = [];
  if (adj.monthlyRevenue) adjustmentItems.push({ name: 'Receita Mensal', amount: `${formatCurrency(adj.monthlyRevenue)} mensal`, period: adj.startMonth && adj.endMonth ? `${adj.startMonth} a ${adj.endMonth}` : undefined });
  if (adj.monthlyExpense) adjustmentItems.push({ name: 'Despesa Mensal', amount: `${formatCurrency(adj.monthlyExpense)} mensal`, period: adj.startMonth && adj.endMonth ? `${adj.startMonth} a ${adj.endMonth}` : undefined });
  if (adj.oneTimeRevenue) adjustmentItems.push({ name: 'Receita Única', amount: formatCurrency(adj.oneTimeRevenue) });
  if (adj.oneTimeExpense) adjustmentItems.push({ name: 'Despesa Única', amount: formatCurrency(adj.oneTimeExpense) });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <button onClick={onBack} className="p-1 hover:bg-slate-100 rounded-md transition-colors">
          <ArrowLeft className="w-4 h-4 text-slate-500" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900 truncate">{scenario.name}</h3>
            <button className="p-0.5 text-slate-400 hover:text-slate-600"><MoreHorizontal className="w-4 h-4" /></button>
          </div>
          <p className="text-xs text-slate-500">{adjustmentItems.length} ajuste{adjustmentItems.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => onToggle(scenario.id)} className="flex-shrink-0">
          {scenario.isActive
            ? <ToggleRight className="w-7 h-7 text-blue-500" />
            : <ToggleLeft className="w-7 h-7 text-slate-400" />}
        </button>
      </div>

      {/* Adjustment items */}
      <div className="space-y-2 flex-1 overflow-y-auto">
        {adjustmentItems.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-xs text-slate-400">Nenhum ajuste definido</p>
          </div>
        ) : (
          adjustmentItems.map((item, i) => (
            <div key={i} className="bg-white rounded-lg border border-slate-200 p-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-900">{item.name}</span>
                  {scenario.isNew && <span className="text-xs text-emerald-500 font-medium">New</span>}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => onToggle(scenario.id)} className="flex-shrink-0">
                    {scenario.isActive
                      ? <ToggleRight className="w-5 h-5 text-blue-500" />
                      : <ToggleLeft className="w-5 h-5 text-slate-400" />}
                  </button>
                  <button className="p-0.5 text-slate-400 hover:text-slate-600"><MoreHorizontal className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              {item.amount && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                  <DollarSign className="w-3 h-3" />
                  <span>VALOR <span className="text-slate-700 font-medium underline decoration-dotted">{item.amount}</span></span>
                </div>
              )}
              {item.period && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                  <Calendar className="w-3 h-3" />
                  <span>DE <span className="text-slate-700 font-medium underline decoration-dotted">{item.period.split(' a ')[0]}</span> ATÉ <span className="text-slate-700 font-medium underline decoration-dotted">{item.period.split(' a ')[1]}</span></span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Delete button */}
      <button
        onClick={() => onDelete(scenario.id)}
        className="mt-3 w-full text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md py-2 transition-colors"
      >
        Excluir cenário
      </button>
    </div>
  );
}

// ============================================
// MAIN DASHBOARD
// ============================================
export default function Dashboard() {
  const [dashData, setDashData] = useState<DashboardData | null>(null);
  const [cashflowRaw, setCashflowRaw] = useState<CashflowRaw[]>([]);
  const [dreRaw, setDreRaw] = useState<DREData>({});
  const [dreProfile, setDreProfile] = useState<{ sectorKey: string; sectorLabel: string; directCostLabel: string; grossProfitLabel: string; directCostCodes: string[]; excludeFromDirectCost?: string[] } | null>(null);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [scenariosOpen, setScenariosOpen] = useState(true);
  const [alertsPanelOpen, setAlertsPanelOpen] = useState(false);
  const [pendingCostClassifications, setPendingCostClassifications] = useState(0);
  const [error, setError] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Forecast state
  const [forecastData, setForecastData] = useState<ForecastData | null>(null);
  const [forecastScenario, setForecastScenario] = useState<ForecastScenario>('realistic');
  const [isForecastLoading, setIsForecastLoading] = useState(false);

  // Sidebar tabs & detail view
  const [activeTab, setActiveTab] = useState<SidebarTab>('scenarios');
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  // Reload forecast when scenario changes
  useEffect(() => {
    loadForecast(forecastScenario);
  }, [forecastScenario]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const loadForecast = async (scenario: ForecastScenario) => {
    setIsForecastLoading(true);
    try {
      const res = await forecastApi.get(6, scenario);
      const data = res.data.data || res.data;
      setForecastData(data);
    } catch (err) {
      console.error('Erro ao carregar forecast:', err);
      setForecastData(null);
    } finally {
      setIsForecastLoading(false);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [metricsRes, cashflowRes, scenariosRes, dreRes] = await Promise.allSettled([
        financialApi.dashboard(),
        financialApi.cashflow(12),
        scenariosApi.list(),
        financialApi.dre(3),
      ]);
      if (metricsRes.status === 'fulfilled') setDashData(metricsRes.value.data.data || metricsRes.value.data);
      if (cashflowRes.status === 'fulfilled') setCashflowRaw(cashflowRes.value.data.data || cashflowRes.value.data || []);
      if (scenariosRes.status === 'fulfilled') setScenarios(scenariosRes.value.data.data || scenariosRes.value.data || []);
      if (dreRes.status === 'fulfilled') {
        const dreResponse = dreRes.value.data;
        setDreRaw(dreResponse.data || dreResponse || {});
        if (dreResponse.profile) setDreProfile(dreResponse.profile);
      }
    } catch (err: any) {
      setError('Erro ao carregar dados. Verifique a conexão com o servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleScenario = async (id: string) => {
    try {
      await scenariosApi.toggle(id);
      setScenarios(prev => prev.map(s => s.id === id ? { ...s, isActive: !s.isActive } : s));
      if (selectedScenario?.id === id) setSelectedScenario(prev => prev ? { ...prev, isActive: !prev.isActive } : null);
    } catch (err) { console.error('Erro ao alternar cenário:', err); }
  };

  const createScenario = async (data: any) => {
    setIsSaving(true);
    try {
      const res = await scenariosApi.create(data);
      const newScenario = { ...(res.data.data || res.data), isNew: true };
      setScenarios(prev => [newScenario, ...prev]);
      setShowNewForm(false);
      return newScenario;
    } finally {
      setIsSaving(false);
    }
  };

  const deleteScenario = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este cenário?')) return;
    try {
      await scenariosApi.delete(id);
      setScenarios(prev => prev.filter(s => s.id !== id));
      if (selectedScenario?.id === id) setSelectedScenario(null);
    } catch (err) { console.error('Erro ao excluir cenário:', err); }
  };

  // ============================================
  // AI CHAT - Send message and create scenarios
  // ============================================
  const sendChatMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsChatLoading(true);

    try {
      // Build special system context for scenario creation
      const scenarioPrompt = `O usuário quer criar cenários financeiros para o fluxo de caixa. 
Interprete o pedido abaixo e crie os cenários apropriados.
IMPORTANTE: Responda com um texto amigável E inclua um JSON array com os cenários no formato:
[{"name": "Nome do Cenário", "type": "PROJECT|INVESTMENT|DIVESTMENT|ORGANIZATIONAL_CHANGE", "description": "descrição", "adjustments": {"monthlyRevenue": 0, "monthlyExpense": 0, "oneTimeRevenue": 0, "oneTimeExpense": 0, "startMonth": "2026-03", "endMonth": "2026-06"}}]
Use valores realistas em BRL. Meses no formato YYYY-MM.
Pedido do usuário: ${userMsg}`;

      const history = chatMessages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));
      const res = await aiApi.chat(scenarioPrompt, history);
      const aiText = res.data.data?.message || res.data.message || 'Desculpe, não consegui processar seu pedido.';

      // Parse scenarios from AI response
      const parsedScenarios = parseAiScenarios(aiText);
      const createdScenarios: Scenario[] = [];

      // Create each scenario via API
      for (const sc of parsedScenarios) {
        try {
          const created = await createScenario(sc);
          if (created) createdScenarios.push(created);
        } catch (e) {
          console.error('Erro ao criar cenário da IA:', e);
        }
      }

      // Clean the response text (remove JSON)
      let cleanText = aiText.replace(/\[[\s\S]*?\]/, '').trim();
      if (!cleanText) cleanText = `Criei ${createdScenarios.length} novo(s) ajuste(s) no seu Fluxo de Caixa. Você pode editá-los ou desativá-los a qualquer momento.`;

      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: cleanText,
        scenariosCreated: createdScenarios,
      }]);

      // Switch to scenarios tab to show the new ones
      if (createdScenarios.length > 0) {
        setTimeout(() => setActiveTab('scenarios'), 500);
      }
    } catch (err: any) {
      console.error('Erro no chat:', err);
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro ao processar seu pedido. Tente novamente ou crie o cenário manualmente.',
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // ============================================
  // COMPUTED VALUES
  // ============================================
  const cashBalance = extractValue(dashData?.cashBalance);
  const cashBalanceChange = extractChange(dashData?.cashBalance);
  // growth removido — indicador Fluxo de Caixa Líquido retirado da tela
  const transactionCount = dashData?.transactionCount || 0;

  // Calcular margens do último mês com dados a partir da DRE
  const { margemBruta, margemLiquida } = useMemo(() => {
    // Encontrar o último mês com dados (não necessariamente o mês atual)
    const monthKeys = Object.keys(dreRaw).sort();
    if (monthKeys.length === 0) return { margemBruta: 0, margemLiquida: 0 };

    const lastMonthKey = monthKeys[monthKeys.length - 1];
    const monthData = dreRaw[lastMonthKey];
    if (!monthData) return { margemBruta: 0, margemLiquida: 0 };

    // Receita = códigos 1.x (operacional) + 2.x (não operacional)
    const receita = Object.entries(monthData)
      .filter(([k]) => k.startsWith('1.') || k.startsWith('2.'))
      .reduce((sum, [, v]) => sum + v, 0);

    // Custos Diretos (CMV/CSP/CPV conforme setor) — usa perfil dinâmico
    const directCostCodes = dreProfile?.directCostCodes || ['3.'];
    const excludeCodes = dreProfile?.excludeFromDirectCost || [];

    // Helper: verifica se um código é custo direto
    const isDirectCost = (code: string): boolean => {
      const isDirect = directCostCodes.some(prefix => code.startsWith(prefix));
      const isExcluded = excludeCodes.some(prefix => code.startsWith(prefix));
      return isDirect && !isExcluded;
    };

    const cmv = Object.entries(monthData)
      .filter(([k]) => isDirectCost(k))
      .reduce((sum, [, v]) => sum + v, 0);

    // Despesas Operacionais = categorias 3.x a 8.x que NÃO são custo direto
    // Isso evita contar duas vezes categorias como 4.1 e 4.4 que já estão no CMV/CSP
    const opex = Object.entries(monthData)
      .filter(([k]) => {
        const prefix = k.split('.')[0];
        if (!['3', '4', '5', '6', '7', '8'].includes(prefix)) return false;
        return !isDirectCost(k);
      })
      .reduce((sum, [, v]) => sum + v, 0);

    const lucroBruto = receita - cmv;
    const lucroLiquido = receita - cmv - opex;

    return {
      margemBruta: receita > 0 ? (lucroBruto / receita) * 100 : 0,
      margemLiquida: receita > 0 ? (lucroLiquido / receita) * 100 : 0,
    };
  }, [dreRaw, dreProfile]);


  // Build 12-month sliding window: 5 past + current + 6 forecast
  const cashflowData: CashflowDataPoint[] = useMemo(() => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Historical data (up to current month)
    const historical = cashflowRaw
      .map(c => ({ month: c.month, income: c.income || 0, expense: Math.abs(c.expense || c.expenses || 0), net: c.net || 0 }))
      .filter(c => c.month <= currentMonth)
      .sort((a, b) => a.month.localeCompare(b.month));

    // Take last 6 months of historical (5 past + current)
    const recentHistorical = historical.slice(-6);

    // Forecast data (future months only)
    const forecastPoints: CashflowDataPoint[] = (forecastData?.forecast || [])
      .filter(f => f.month > currentMonth)
      .slice(0, 6)
      .map(f => ({
        month: f.month,
        income: f.income || 0,
        expense: Math.abs(f.expense || 0),
        net: f.net || 0,
      }));

    return [...recentHistorical, ...forecastPoints];
  }, [cashflowRaw, forecastData]);

  const chartScenarios: ChartScenario[] = useMemo(() => {
    return scenarios.map(s => ({ id: s.id, name: s.name, type: s.type, isActive: s.isActive, adjustments: s.adjustments || {} }));
  }, [scenarios]);

  const forecastStartMonth = useMemo(() => {
    const now = new Date();
    // First forecast month is next month
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const forecastAvailable = forecastData?.metadata?.forecastAvailable ?? false;

  // ExplainButton agora está integrado diretamente nos componentes

  if (isLoading) return <LoadingSpinner message="Carregando dashboard..." />;

  // Painel de alertas (renderizado fora do fluxo principal)

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="flex gap-6 h-screen overflow-hidden">
      {/* ===== MAIN CONTENT (scrollable) ===== */}
      <div className="flex-1 min-w-0 overflow-y-auto space-y-6 py-6 pr-2">

        {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>}

        <AlertsBanner onViewAll={() => setAlertsPanelOpen(true)} />

        {/* Banner de Classificações Pendentes */}
        {pendingCostClassifications > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Info className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-amber-900">
                <span className="font-semibold">{pendingCostClassifications} saída{pendingCostClassifications !== 1 ? "s" : ""} não classificada{pendingCostClassifications !== 1 ? "s" : ""}</span> — A IA classificou automaticamente, mas precisa da sua revisão.
              </p>
            </div>
            <a href="/dashboards" className="text-xs font-medium text-amber-700 hover:text-amber-900 border border-amber-300 bg-white rounded-md px-3 py-1.5 transition-colors">
              Revisar
            </a>
          </div>
        )}

        {/* Dica fixa sobre Explica pra mim */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-3 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-sm text-blue-800">
            <span className="font-semibold">Dica:</span> Passe o mouse sobre os <span className="underline decoration-dotted underline-offset-2 decoration-blue-400">termos sublinhados</span> para ver explicações contextualizadas. Clique em <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-blue-200 rounded-md text-xs font-medium text-blue-700 mx-0.5"><Sparkles className="w-3 h-3" />Explica pra mim</span> para uma análise completa da IA.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard title="Saldo de Caixa" value={cashBalance} icon={DollarSign} change={cashBalanceChange} showChange={true} subtitle="Saldo acumulado" colorTheme="blue" />
          <MetricCard title="Margem Bruta" value={margemBruta} icon={TrendingUp} showChange={false} format="percent" subtitle={dreProfile ? `${dreProfile.directCostLabel} → ${dreProfile.grossProfitLabel}` : '(Lucro Bruto / Receita) × 100'} colorTheme={margemBruta >= 30 ? 'green' : 'red'} />
          <MetricCard title="Margem Líquida" value={margemLiquida} icon={Percent} showChange={false} format="percent" subtitle="(Lucro Líquido / Receita) × 100" colorTheme={margemLiquida >= 10 ? 'green' : margemLiquida >= 0 ? 'blue' : 'red'} />
        </div>

        <CashflowChart data={cashflowData} scenarios={chartScenarios} initialBalance={0} forecastStartMonth={forecastStartMonth} />

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Resumo de Fluxo de Caixa</h3>
            {cashflowData.length > 0 && (
              <ExplainButton
                metric="Resumo de Fluxo de Caixa"
                value={`${cashflowData.length} meses | Entradas: ${formatCurrency(cashflowData.reduce((s, d) => s + d.income, 0))} | Saídas: ${formatCurrency(cashflowData.reduce((s, d) => s + d.expense, 0))}`}
                context={`Resumo de Fluxo de Caixa mensal:\n${cashflowData.map(d => `${d.month}: Entradas ${formatCurrency(d.income)} | Saídas ${formatCurrency(d.expense)}`).join('\n')}`}
                variant="small"
              />
            )}
          </div>
          {cashflowData.length === 0 ? (
            <div className="text-center py-8">
              <Info className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Nenhuma transação registrada</p>
              <p className="text-xs text-slate-400 mt-1">Importe um CSV para ver o fluxo de caixa</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-3 text-slate-500 font-medium whitespace-nowrap">Categoria</th>
                    {cashflowData.map(d => (
                      <th key={d.month} className="text-right py-3 px-3 text-slate-500 font-medium whitespace-nowrap text-xs">{d.month}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="py-3 px-3 font-semibold text-emerald-700 whitespace-nowrap">Entradas</td>
                    {cashflowData.map(d => (
                      <td key={d.month} className="py-3 px-3 text-right text-emerald-600 font-medium text-xs whitespace-nowrap">{formatCurrency(d.income)}</td>
                    ))}
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-3 px-3 font-semibold text-red-700 whitespace-nowrap">Saídas</td>
                    {cashflowData.map(d => (
                      <td key={d.month} className="py-3 px-3 text-right text-red-600 font-medium text-xs whitespace-nowrap">{formatCurrency(d.expense)}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ===== SCENARIOS SIDEBAR (fixed, full height) ===== */}
      <div className={`${scenariosOpen ? 'w-[340px]' : 'w-12'} transition-all duration-300 flex-shrink-0 h-screen py-6`}>
        <div className="bg-white rounded-xl border border-slate-200 h-full flex flex-col overflow-hidden">

          {/* Collapsed state */}
          {!scenariosOpen && (
            <button onClick={() => setScenariosOpen(true)} className="w-full h-full flex items-center justify-center">
              <ChevronDown className="w-4 h-4 text-slate-400 -rotate-90" />
            </button>
          )}

          {scenariosOpen && (
            <>
              {/* Tabs Header: Scenarios | Conversations | + New */}
              <div className="flex items-center border-b border-slate-100 px-1 pt-1">
                <button
                  onClick={() => { setActiveTab('scenarios'); setSelectedScenario(null); }}
                  className={`px-3 py-2.5 text-xs font-medium rounded-t-md transition-colors ${activeTab === 'scenarios' ? 'text-slate-900 bg-slate-50 border-b-2 border-blue-500' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Cenários
                </button>
                <button
                  onClick={() => { setActiveTab('conversations'); setSelectedScenario(null); }}
                  className={`px-3 py-2.5 text-xs font-medium rounded-t-md transition-colors ${activeTab === 'conversations' ? 'text-slate-900 bg-slate-50 border-b-2 border-blue-500' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Conversas
                </button>
                <div className="flex-1" />
                <button
                  onClick={() => { setActiveTab('scenarios'); setSelectedScenario(null); setShowNewForm(true); }}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50 mr-1 transition-colors"
                >
                  <Plus className="w-3 h-3" /> New
                </button>
                <button onClick={() => setScenariosOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 mr-1">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* ===== TAB: SCENARIOS ===== */}
              {activeTab === 'scenarios' && (
                <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
                  {/* ===== FORECAST SECTION ===== */}
                  {!selectedScenario && (
                    <div className="mb-3">
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">Previsões de Fluxo de Caixa</h4>
                      {!forecastAvailable ? (
                        <div className="text-center py-5 bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                          <BarChart3 className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                          <p className="text-xs font-medium text-slate-400">Nenhuma Previsão de Forecast</p>
                          <p className="text-[10px] text-slate-300 mt-1 px-4">
                            Não há dados históricos suficientes para realizar previsões de caixa
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {(['optimistic', 'realistic', 'pessimistic'] as ForecastScenario[]).map((sc) => {
                            const labels: Record<ForecastScenario, { name: string; desc: string; color: string; activeColor: string; icon: string }> = {
                              optimistic: { name: 'Previsão Otimista', desc: `Receita +15%, ${dreProfile?.directCostLabel || 'CMV'} -2pp`, color: 'text-emerald-600', activeColor: 'border-emerald-200 bg-emerald-50/50', icon: '📈' },
                              realistic: { name: 'Previsão Realista', desc: 'Baseada no histórico', color: 'text-blue-600', activeColor: 'border-blue-200 bg-blue-50/50', icon: '📊' },
                              pessimistic: { name: 'Previsão Pessimista', desc: `Receita -15%, ${dreProfile?.directCostLabel || 'CMV'} +2pp`, color: 'text-amber-600', activeColor: 'border-amber-200 bg-amber-50/50', icon: '📉' },
                            };
                            const info = labels[sc];
                            const isActive = forecastScenario === sc;
                            return (
                              <div
                                key={sc}
                                className={`flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer ${
                                  isActive ? info.activeColor : 'border-slate-100 bg-white hover:bg-slate-50'
                                }`}
                                onClick={() => setForecastScenario(sc)}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-sm">{info.icon}</span>
                                  <div>
                                    <span className={`text-xs font-medium ${isActive ? info.color : 'text-slate-700'}`}>{info.name}</span>
                                    <p className="text-[10px] text-slate-400">{info.desc}</p>
                                  </div>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); setForecastScenario(sc); }}>
                                  {isActive
                                    ? <ToggleRight className={`w-6 h-6 ${info.color}`} />
                                    : <ToggleLeft className="w-6 h-6 text-slate-300" />}
                                </button>
                              </div>
                            );
                          })}
                          {forecastData?.metadata?.drivers && (() => {
                            const d = forecastData.metadata.drivers;
                            // Ajustar drivers conforme cenário ativo
                            const scenarioAdjustments: Record<ForecastScenario, { cmvDelta: number; revGrowthLabel: string }> = {
                              optimistic: { cmvDelta: -2, revGrowthLabel: `${d.revenueGrowthRate.toFixed(1)}% + 15%` },
                              realistic: { cmvDelta: 0, revGrowthLabel: `${d.revenueGrowthRate.toFixed(1)}%/mês` },
                              pessimistic: { cmvDelta: 2, revGrowthLabel: `${d.revenueGrowthRate.toFixed(1)}% - 15%` },
                            };
                            const adj = scenarioAdjustments[forecastScenario];
                            const displayCmv = d.avgCmvPercent + adj.cmvDelta;
                            return (
                            <div className="mt-2 px-2 py-2 bg-slate-50 rounded-lg">
                              <p className="text-[10px] font-medium text-slate-400 uppercase mb-1.5">Drivers do modelo</p>
                              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                                <span className="text-slate-400">{dreProfile?.directCostLabel || 'CMV'} médio</span>
                                <span className={`font-medium text-right ${adj.cmvDelta < 0 ? 'text-emerald-600' : adj.cmvDelta > 0 ? 'text-amber-600' : 'text-slate-600'}`}>{displayCmv.toFixed(1)}%{adj.cmvDelta !== 0 ? ` (${adj.cmvDelta > 0 ? '+' : ''}${adj.cmvDelta}pp)` : ''}</span>
                                <span className="text-slate-400">Impostos</span>
                                <span className="text-slate-600 font-medium text-right">{d.avgTaxPercent.toFixed(1)}%</span>
                                <span className="text-slate-400">Custos fixos</span>
                                <span className="text-slate-600 font-medium text-right">{formatCurrency(d.avgFixed)}</span>
                                <span className="text-slate-400">Custos variáveis</span>
                                <span className="text-slate-600 font-medium text-right">{formatCurrency(d.avgVariable)}</span>
                                <span className="text-slate-400">Cresc. receita</span>
                                <span className={`font-medium text-right ${forecastScenario === 'optimistic' ? 'text-emerald-600' : forecastScenario === 'pessimistic' ? 'text-amber-600' : 'text-slate-600'}`}>{adj.revGrowthLabel}</span>
                              </div>
                            </div>
                            );
                          })()}
                          {isForecastLoading && (
                            <div className="flex items-center justify-center gap-2 py-2">
                              <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
                              <span className="text-[10px] text-slate-400">Calculando previsão...</span>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="border-b border-slate-100 mt-3 mb-1" />
                    </div>
                  )}

                  {/* Detail view of a selected scenario */}
                  {selectedScenario ? (
                    <ScenarioDetail
                      scenario={selectedScenario}
                      onBack={() => setSelectedScenario(null)}
                      onToggle={toggleScenario}
                      onDelete={deleteScenario}
                    />
                  ) : (
                    <>
                      {/* New scenario form */}
                      {showNewForm && (
                        <NewScenarioForm onSave={createScenario} onCancel={() => setShowNewForm(false)} isSaving={isSaving} />
                      )}

                      {/* Scenario list */}
                      {scenarios.length === 0 && !showNewForm ? (
                        <div className="text-center py-8">
                          <Sparkles className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                          <p className="text-sm font-medium text-slate-500">Nenhum cenário criado</p>
                          <p className="text-xs text-slate-400 mt-1 mb-4 px-4">
                            Descreva um cenário na aba "Conversas" e a IA criará automaticamente, ou clique em "+ New" para criar manualmente.
                          </p>
                        </div>
                      ) : (
                        scenarios.map((scenario) => {
                          const typeInfo = getTypeInfo(scenario.type);
                          return (
                            <div
                              key={scenario.id}
                              className={`p-3 rounded-lg border transition-all cursor-pointer hover:shadow-sm ${
                                scenario.isActive ? 'border-blue-200 bg-blue-50/50' : 'border-slate-200 bg-white'
                              }`}
                              onClick={() => setSelectedScenario(scenario)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <span className="text-sm font-medium text-slate-900 truncate">{scenario.name}</span>
                                  {scenario.isNew && <span className="text-xs text-emerald-500 font-semibold flex-shrink-0">New</span>}
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                                  <button onClick={() => toggleScenario(scenario.id)}>
                                    {scenario.isActive
                                      ? <ToggleRight className="w-6 h-6 text-blue-500" />
                                      : <ToggleLeft className="w-6 h-6 text-slate-400" />}
                                  </button>
                                  <button className="p-0.5 text-slate-400 hover:text-slate-600"><MoreHorizontal className="w-4 h-4" /></button>
                                </div>
                              </div>
                              {scenario.description && (
                                <p className="text-xs text-slate-500 mt-1 line-clamp-1">{scenario.description}</p>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${typeInfo.color}`}>{typeInfo.label}</span>
                                {scenario.adjustments?.monthlyExpense && (
                                  <span className="text-[10px] text-slate-400">{formatCurrency(scenario.adjustments.monthlyExpense)}/mês</span>
                                )}
                                {scenario.adjustments?.monthlyRevenue && (
                                  <span className="text-[10px] text-emerald-500">+{formatCurrency(scenario.adjustments.monthlyRevenue)}/mês</span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ===== TAB: CONVERSATIONS (Chat with AI) ===== */}
              {activeTab === 'conversations' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Chat messages */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {chatMessages.length === 0 && (
                      <div className="text-center py-8">
                        <Sparkles className="w-10 h-10 text-violet-200 mx-auto mb-3" />
                        <p className="text-sm font-medium text-slate-500">Converse com a IA</p>
                        <p className="text-xs text-slate-400 mt-1 px-2">
                          Descreva um cenário em linguagem natural e a IA criará os ajustes automaticamente no seu fluxo de caixa.
                        </p>
                        <div className="mt-4 space-y-2 px-2">
                          <p className="text-[10px] text-slate-400 uppercase font-medium">Exemplos:</p>
                          {[
                            'Quero contratar 2 devs a R$12.000/mês cada a partir de março',
                            'Estamos planejando um evento de R$50.000 em abril',
                            'Vamos investir R$200.000 em marketing por 6 meses',
                          ].map((ex, i) => (
                            <button
                              key={i}
                              onClick={() => { setChatInput(ex); }}
                              className="w-full text-left text-xs text-slate-500 bg-slate-50 rounded-lg p-2.5 hover:bg-slate-100 transition-colors border border-slate-100"
                            >
                              "{ex}"
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {chatMessages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
                          msg.role === 'user'
                            ? 'bg-slate-100 text-slate-800 rounded-br-md'
                            : 'bg-white text-slate-700 border border-slate-100 rounded-bl-md'
                        }`}>
                          {msg.role === 'assistant' ? (
                          <div className="text-xs leading-relaxed whitespace-pre-wrap">{renderMarkdown(msg.content)}</div>
                        ) : (
                          <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        )}
                          {msg.scenariosCreated && msg.scenariosCreated.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-slate-100">
                              <p className="text-[10px] text-slate-400 mb-1">{msg.scenariosCreated.length} cenário(s) criado(s):</p>
                              {msg.scenariosCreated.map((sc, j) => (
                                <button
                                  key={j}
                                  onClick={() => { setActiveTab('scenarios'); setSelectedScenario(sc); }}
                                  className="block w-full text-left text-xs text-violet-600 hover:text-violet-800 font-medium py-0.5"
                                >
                                  → {sc.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {isChatLoading && (
                      <div className="flex justify-start">
                        <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-md px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-3.5 h-3.5 text-violet-500 animate-spin" />
                            <span className="text-xs text-slate-400">Analisando e criando cenários...</span>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Chat input */}
                  <div className="p-3 border-t border-slate-100">
                    <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-200 focus-within:border-violet-300 focus-within:ring-1 focus-within:ring-violet-200 transition-all">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } }}
                        placeholder="Pergunte qualquer coisa..."
                        disabled={isChatLoading}
                        className="flex-1 bg-transparent text-xs text-slate-700 placeholder:text-slate-400 outline-none disabled:opacity-50"
                      />
                      <button
                        onClick={sendChatMessage}
                        disabled={!chatInput.trim() || isChatLoading}
                        className="p-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Chat input — always visible at bottom of sidebar */}
              {activeTab === 'scenarios' && (
                <div className="p-3 border-t border-slate-100">
                  <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-200 focus-within:border-violet-300 focus-within:ring-1 focus-within:ring-violet-200 transition-all">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } }}
                      placeholder="Descreva um cenário..."
                      disabled={isChatLoading}
                      className="flex-1 bg-transparent text-xs text-slate-700 placeholder:text-slate-400 outline-none disabled:opacity-50"
                    />
                    <button
                      onClick={() => { setActiveTab('conversations'); sendChatMessage(); }}
                      disabled={!chatInput.trim() || isChatLoading}
                      className="p-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <AlertsPanel isOpen={alertsPanelOpen} onClose={() => setAlertsPanelOpen(false)} />
    </div>
  );
}
