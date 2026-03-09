import React, { useState, useEffect } from 'react';
import {
  AlertTriangle, CheckCircle, Eye, EyeOff, Filter, Loader2,
  TrendingUp, DollarSign, Lightbulb, Shield, RefreshCw, X
} from 'lucide-react';
import { insightsApi } from '../lib/api';

interface Insight {
  id: string;
  severity: string;
  title: string;
  description: string;
  recommendation: string;
  potentialImpact: number;
  potentialSavings: number;
  insightType: string;
  category: string;
  read: boolean;
  dismissed: boolean;
  readAt: string | null;
  createdAt: string;
}

export default function Insights() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState('');
  const [showDismissed, setShowDismissed] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadInsights();
  }, [filterSeverity, showDismissed]);

  const loadInsights = async () => {
    setLoading(true);
    try {
      const res = await insightsApi.list({
        severity: filterSeverity || undefined,
        isDismissed: showDismissed ? undefined : false,
      });
      setInsights(res.data?.data || []);
    } catch (err) {
      console.error('Erro ao carregar insights:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    setActionLoading(id);
    try {
      await insightsApi.markRead(id);
      setInsights(prev => prev.map(i => i.id === id ? { ...i, read: true, readAt: new Date().toISOString() } : i));
    } catch (err) {
      console.error('Erro ao marcar como lido:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDismiss = async (id: string) => {
    setActionLoading(id);
    try {
      await insightsApi.dismiss(id);
      setInsights(prev => showDismissed
        ? prev.map(i => i.id === id ? { ...i, dismissed: true } : i)
        : prev.filter(i => i.id !== id)
      );
    } catch (err) {
      console.error('Erro ao dispensar insight:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return { color: 'border-l-red-500', bg: 'bg-red-50', badge: 'bg-red-100 text-red-700', icon: '🔴', label: 'Crítico' };
      case 'HIGH': return { color: 'border-l-orange-500', bg: 'bg-orange-50', badge: 'bg-orange-100 text-orange-700', icon: '🟠', label: 'Alto' };
      case 'MEDIUM': return { color: 'border-l-yellow-500', bg: 'bg-yellow-50', badge: 'bg-yellow-100 text-yellow-700', icon: '🟡', label: 'Médio' };
      default: return { color: 'border-l-blue-500', bg: 'bg-blue-50', badge: 'bg-blue-100 text-blue-700', icon: '🔵', label: 'Baixo' };
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ANOMALY': return <AlertTriangle className="w-4 h-4" />;
      case 'SAVING': return <DollarSign className="w-4 h-4" />;
      case 'FORECAST': return <TrendingUp className="w-4 h-4" />;
      case 'COMPLIANCE': return <Shield className="w-4 h-4" />;
      default: return <Lightbulb className="w-4 h-4" />;
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const stats = {
    total: insights.length,
    critical: insights.filter(i => i.severity === 'CRITICAL').length,
    unread: insights.filter(i => !i.read).length,
    totalSavings: insights.reduce((sum, i) => sum + (i.potentialSavings || 0), 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alertas Inteligentes</h1>
          <p className="text-gray-500 mt-1">Insights gerados por IA para otimizar suas finanças</p>
        </div>
        <button
          onClick={loadInsights}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <Lightbulb className="w-4 h-4" />
            Total Alertas
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-500 text-sm mb-1">
            <AlertTriangle className="w-4 h-4" />
            Críticos
          </div>
          <p className="text-2xl font-bold text-red-700">{stats.critical}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-blue-500 text-sm mb-1">
            <Eye className="w-4 h-4" />
            Não lidos
          </div>
          <p className="text-2xl font-bold text-blue-700">{stats.unread}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-500 text-sm mb-1">
            <DollarSign className="w-4 h-4" />
            Economia Potencial
          </div>
          <p className="text-2xl font-bold text-green-700">{formatCurrency(stats.totalSavings)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <select
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="">Todas severidades</option>
          <option value="CRITICAL">Crítico</option>
          <option value="HIGH">Alto</option>
          <option value="MEDIUM">Médio</option>
          <option value="LOW">Baixo</option>
        </select>
        <button
          onClick={() => setShowDismissed(!showDismissed)}
          className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-all ${
            showDismissed ? 'bg-gray-100 border-gray-400 text-gray-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}
        >
          {showDismissed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {showDismissed ? 'Ocultando dispensados' : 'Mostrar dispensados'}
        </button>
      </div>

      {/* Insights List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : insights.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <p className="font-medium text-gray-700">Nenhum alerta pendente</p>
          <p className="text-sm text-gray-500 mt-1">Tudo está em ordem por enquanto</p>
        </div>
      ) : (
        <div className="space-y-3">
          {insights.map((insight) => {
            const sev = getSeverityConfig(insight.severity);
            const isExpanded = expandedId === insight.id;

            return (
              <div
                key={insight.id}
                className={`border-l-4 rounded-xl ${sev.color} ${
                  insight.dismissed ? 'opacity-60' : ''
                } ${!insight.read ? 'ring-1 ring-blue-200' : ''} bg-white border border-gray-200 overflow-hidden transition-all`}
              >
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => {
                    setExpandedId(isExpanded ? null : insight.id);
                    if (!insight.read) handleMarkRead(insight.id);
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="mt-0.5">{getTypeIcon(insight.insightType)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${sev.badge}`}>
                            {sev.label}
                          </span>
                          <span className="text-xs text-gray-500 capitalize">
                            {insight.insightType.replace(/_/g, ' ')}
                          </span>
                          {!insight.read && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full" />
                          )}
                          {insight.dismissed && (
                            <span className="text-xs text-gray-400">Dispensado</span>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-gray-900">{insight.title}</p>
                        <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">{insight.description}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {insight.potentialSavings > 0 && (
                        <p className="text-sm font-semibold text-green-600">
                          {formatCurrency(insight.potentialSavings)}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">{formatDate(insight.createdAt)}</p>
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 border-t border-gray-100">
                    <div className="mt-3 space-y-3">
                      {insight.recommendation && (
                        <div className="bg-blue-50 rounded-lg p-3">
                          <p className="text-xs font-medium text-blue-700 mb-1">Recomendação</p>
                          <p className="text-sm text-blue-800">{insight.recommendation}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {insight.potentialImpact > 0 && (
                          <div>
                            <span className="text-gray-500 text-xs">Impacto potencial</span>
                            <p className="font-medium text-gray-900">{formatCurrency(insight.potentialImpact)}</p>
                          </div>
                        )}
                        {insight.potentialSavings > 0 && (
                          <div>
                            <span className="text-gray-500 text-xs">Economia potencial</span>
                            <p className="font-medium text-green-600">{formatCurrency(insight.potentialSavings)}</p>
                          </div>
                        )}
                        {insight.category && (
                          <div>
                            <span className="text-gray-500 text-xs">Categoria</span>
                            <p className="font-medium text-gray-900 capitalize">{insight.category.replace(/_/g, ' ')}</p>
                          </div>
                        )}
                      </div>
                      {!insight.dismissed && (
                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDismiss(insight.id); }}
                            disabled={actionLoading === insight.id}
                            className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1.5"
                          >
                            {actionLoading === insight.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                            Dispensar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
