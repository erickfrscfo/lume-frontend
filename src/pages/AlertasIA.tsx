import { useState, useEffect } from 'react';
import { alertsApi } from '@/lib/api';
import {
  AlertTriangle, TrendingUp, TrendingDown, Handshake,
  Sparkles, CheckCircle2, DollarSign, Eye, X, RefreshCw, Loader2,
  ChevronDown, ChevronUp
} from 'lucide-react';

interface Alert {
  id: string;
  type: string;
  severity: string;
  title: string;
  text: string;
  templateText: string;
  category: string | null;
  potentialSavings: number | null;
  isRead: boolean;
  rawData: any;
  createdAt: string;
}

interface AlertsSummary {
  total: number;
  unread: number;
  totalSavings: number;
  bySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export default function AlertasIA() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [summary, setSummary] = useState<AlertsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const res = await alertsApi.list();
      const data = res.data?.data;
      if (data) {
        setAlerts(data.alerts);
        setSummary(data.summary);
      }
    } catch (err) {
      console.error('Erro ao carregar alertas:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await alertsApi.generate();
      await loadAlerts();
    } catch (err) {
      console.error('Erro ao gerar alertas:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await alertsApi.markRead(id);
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, isRead: true } : a));
      if (summary) setSummary({ ...summary, unread: Math.max(0, summary.unread - 1) });
    } catch (err) {
      console.error('Erro ao marcar como lido:', err);
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await alertsApi.dismiss(id);
      setAlerts(prev => prev.filter(a => a.id !== id));
      if (summary) setSummary({ ...summary, total: summary.total - 1 });
    } catch (err) {
      console.error('Erro ao descartar alerta:', err);
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'EXPENSE_SPIKE': return <TrendingUp className="w-5 h-5" />;
      case 'EXPENSE_DROP': return <TrendingDown className="w-5 h-5" />;
      case 'NEGOTIATION_OPPORTUNITY': return <Handshake className="w-5 h-5" />;
      case 'COST_OPTIMIZATION': return <Sparkles className="w-5 h-5" />;
      case 'MARGIN_DECLINE': return <TrendingDown className="w-5 h-5" />;
      case 'REVENUE_DECLINE_TREND': return <TrendingDown className="w-5 h-5" />;
      case 'EXPENSE_OUTPACING_REVENUE': return <AlertTriangle className="w-5 h-5" />;
      case 'COST_CONCENTRATION': return <AlertTriangle className="w-5 h-5" />;
      default: return <AlertTriangle className="w-5 h-5" />;
    }
  };

  const getAlertColor = (type: string, severity: string) => {
    if (type === 'EXPENSE_DROP') {
      return { bg: 'bg-green-50', border: 'border-green-200', icon: 'text-green-600', badge: 'bg-green-100 text-green-700' };
    }
    if (severity === 'CRITICAL' || severity === 'HIGH') {
      return { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-600', badge: 'bg-red-100 text-red-700' };
    }
    if (severity === 'MEDIUM') {
      return { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-600', badge: 'bg-amber-100 text-amber-700' };
    }
    return { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600', badge: 'bg-blue-100 text-blue-700' };
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'EXPENSE_SPIKE': 'Aumento de Gasto',
      'EXPENSE_DROP': 'Economia Identificada',
      'NEGOTIATION_OPPORTUNITY': 'Oportunidade de Negociação',
      'COST_OPTIMIZATION': 'Otimização de Custo',
      'MARGIN_DECLINE': 'Queda de Margem',
      'REVENUE_DECLINE_TREND': 'Queda de Receita',
      'EXPENSE_OUTPACING_REVENUE': 'Despesas > Receitas',
      'SUPPLIER_PRICE_INCREASE': 'Aumento de Fornecedor',
      'COST_CONCENTRATION': 'Concentração de Custos',
    };
    return labels[type] || 'Alerta';
  };

  const getSeverityLabel = (severity: string) => {
    const labels: Record<string, string> = {
      'CRITICAL': 'Crítico',
      'HIGH': 'Alto',
      'MEDIUM': 'Médio',
      'LOW': 'Baixo',
    };
    return labels[severity] || severity;
  };

  const filteredAlerts = filter === 'unread' ? alerts.filter(a => !a.isRead) : alerts;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl text-white">
              <Sparkles className="w-6 h-6" />
            </div>
            Alertas Inteligentes
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Insights gerados automaticamente pela IA a partir dos seus dados financeiros
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {generating ? 'Analisando...' : 'Gerar Novos Alertas'}
        </button>
      </div>

      {/* Summary Cards */}
      {summary && summary.total > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500 font-medium">Total de Alertas</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{summary.total}</p>
            <p className="text-xs text-slate-400 mt-1">{summary.unread} não lidos</p>
          </div>
          {summary.totalSavings > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-xs text-green-600 font-medium">Economia Potencial</p>
              <p className="text-2xl font-bold text-green-700 mt-1">
                R$ {summary.totalSavings.toLocaleString('pt-BR')}
              </p>
              <p className="text-xs text-green-500 mt-1">identificada pela IA</p>
            </div>
          )}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500 font-medium">Por Severidade</p>
            <div className="flex gap-2 mt-2 flex-wrap">
              {summary.bySeverity.critical > 0 && (
                <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                  {summary.bySeverity.critical} crítico{summary.bySeverity.critical > 1 ? 's' : ''}
                </span>
              )}
              {summary.bySeverity.high > 0 && (
                <span className="text-xs font-medium text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">
                  {summary.bySeverity.high} alto{summary.bySeverity.high > 1 ? 's' : ''}
                </span>
              )}
              {summary.bySeverity.medium > 0 && (
                <span className="text-xs font-medium text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                  {summary.bySeverity.medium} médio{summary.bySeverity.medium > 1 ? 's' : ''}
                </span>
              )}
              {summary.bySeverity.low > 0 && (
                <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                  {summary.bySeverity.low} baixo{summary.bySeverity.low > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            filter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Todos ({alerts.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            filter === 'unread' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Não lidos ({alerts.filter(a => !a.isRead).length})
        </button>
      </div>

      {/* Alert List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <div className="w-10 h-10 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin mb-4" />
          <p className="text-sm">Carregando alertas...</p>
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 bg-white border border-slate-200 rounded-2xl">
          <CheckCircle2 className="w-16 h-16 mb-4 text-green-400" />
          <p className="font-semibold text-slate-600 text-lg">Tudo em ordem!</p>
          <p className="text-sm text-center mt-2 max-w-md">
            {filter === 'unread'
              ? 'Todos os alertas foram lidos. Mude o filtro para ver todos.'
              : 'Nenhum alerta no momento. Clique em "Gerar Novos Alertas" para analisar seus dados.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map(alert => {
            const colors = getAlertColor(alert.type, alert.severity);
            const isExpanded = expandedId === alert.id;

            return (
              <div
                key={alert.id}
                className={`${colors.bg} border ${colors.border} rounded-xl p-5 transition-all ${!alert.isRead ? 'ring-2 ring-blue-200 ring-offset-1' : ''}`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-2.5 rounded-xl bg-white/80 ${colors.icon} flex-shrink-0`}>
                    {getAlertIcon(alert.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${colors.badge}`}>
                        {getTypeLabel(alert.type)}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {getSeverityLabel(alert.severity)}
                      </span>
                      {!alert.isRead && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full" />
                      )}
                      <span className="text-[10px] text-slate-400 ml-auto">
                        {new Date(alert.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <h4 className="font-semibold text-slate-900 text-sm mb-1">{alert.title}</h4>
                    <p className={`text-sm text-slate-600 ${isExpanded ? '' : 'line-clamp-2'}`}>
                      {alert.text}
                    </p>

                    {alert.potentialSavings && alert.potentialSavings > 0 && (
                      <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 rounded-lg">
                        <DollarSign className="w-3.5 h-3.5 text-green-600" />
                        <span className="text-xs font-semibold text-green-700">
                          Economia potencial: R$ {alert.potentialSavings.toLocaleString('pt-BR')}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-3 mt-3">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : alert.id)}
                        className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
                      >
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        {isExpanded ? 'Menos' : 'Mais detalhes'}
                      </button>
                      {!alert.isRead && (
                        <button
                          onClick={() => handleMarkRead(alert.id)}
                          className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> Marcar como lido
                        </button>
                      )}
                      <button
                        onClick={() => handleDismiss(alert.id)}
                        className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" /> Descartar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
