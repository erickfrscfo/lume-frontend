import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle, Clock, AlertTriangle, ArrowRight, TrendingUp,
  TrendingDown, DollarSign, Loader2, XCircle, Building2
} from 'lucide-react';
import { reconciliationsApi, transactionsApi, insightsApi } from '../lib/api';

interface DashboardData {
  totalTransactions: number;
  reconciled: number;
  pending: number;
  divergent: number;
  reconciledPercentage: number;
  totalPendingAmount: number;
  totalOverdueAmount: number;
}

interface Insight {
  id: string;
  severity: string;
  title: string;
  description: string;
  recommendation: string;
  potentialImpact: number;
  potentialSavings: number;
  insightType: string;
}

export default function ConciliacaoDashboardBlock() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [dashRes, insightsRes] = await Promise.all([
        reconciliationsApi.dashboard().catch(() => ({ data: null })),
        insightsApi.list({ isDismissed: false, severity: undefined }).catch(() => ({ data: { data: [] } })),
      ]);

      // Tentar extrair dados do dashboard
      const dashData = dashRes.data?.data || dashRes.data;
      if (dashData) {
        setData({
          totalTransactions: dashData.totalTransactions || 0,
          reconciled: dashData.reconciled || 0,
          pending: dashData.pending || 0,
          divergent: dashData.divergent || 0,
          reconciledPercentage: dashData.reconciledPercentage || 0,
          totalPendingAmount: dashData.totalPendingAmount || 0,
          totalOverdueAmount: dashData.totalOverdueAmount || 0,
        });
      }

      setInsights((insightsRes.data?.data || []).slice(0, 3));
    } catch (err) {
      console.error('Erro ao carregar dados de conciliação:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'border-l-red-500 bg-red-50';
      case 'HIGH': return 'border-l-orange-500 bg-orange-50';
      case 'MEDIUM': return 'border-l-yellow-500 bg-yellow-50';
      default: return 'border-l-blue-500 bg-blue-50';
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return { label: 'Crítico', color: 'text-red-700 bg-red-100' };
      case 'HIGH': return { label: 'Alto', color: 'text-orange-700 bg-orange-100' };
      case 'MEDIUM': return { label: 'Médio', color: 'text-yellow-700 bg-yellow-100' };
      default: return { label: 'Baixo', color: 'text-blue-700 bg-blue-100' };
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Bloco: Status de Conciliação */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Conciliação Bancária</h3>
          <Link
            to="/conciliacao"
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
          >
            Ver tudo <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {data ? (
          <>
            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm text-gray-600">Taxa de conciliação</span>
                <span className="text-sm font-semibold text-gray-900">
                  {data.reconciledPercentage.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full transition-all duration-500 ${
                    data.reconciledPercentage >= 80 ? 'bg-green-500' :
                    data.reconciledPercentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(100, data.reconciledPercentage)}%` }}
                />
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <DollarSign className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                <p className="text-xl font-bold text-gray-900">{data.totalTransactions}</p>
                <p className="text-xs text-gray-500">Total</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-500 mx-auto mb-1" />
                <p className="text-xl font-bold text-green-700">{data.reconciled}</p>
                <p className="text-xs text-green-600">Conciliadas</p>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
                <p className="text-xl font-bold text-yellow-700">{data.pending}</p>
                <p className="text-xs text-yellow-600">Pendentes</p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-500 mx-auto mb-1" />
                <p className="text-xl font-bold text-red-700">{data.divergent}</p>
                <p className="text-xs text-red-600">Divergentes</p>
              </div>
            </div>

            {/* Amounts */}
            {(data.totalPendingAmount > 0 || data.totalOverdueAmount > 0) && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                {data.totalPendingAmount > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <Clock className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-yellow-600">Valor pendente</p>
                      <p className="text-sm font-semibold text-yellow-800">
                        {formatCurrency(data.totalPendingAmount)}
                      </p>
                    </div>
                  </div>
                )}
                {data.totalOverdueAmount > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-red-600">Valor vencido</p>
                      <p className="text-sm font-semibold text-red-800">
                        {formatCurrency(data.totalOverdueAmount)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-6 text-gray-500">
            <p className="text-sm">Dados de conciliação indisponíveis</p>
            <Link to="/conciliacao" className="text-sm text-blue-600 hover:underline mt-1 inline-block">
              Ir para Conciliação
            </Link>
          </div>
        )}
      </div>

      {/* Bloco: Smart Alerts / AI Insights */}
      {insights.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Alertas Inteligentes</h3>
            <Link
              to="/insights"
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
            >
              Ver todos <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {insights.map((insight) => {
              const sev = getSeverityLabel(insight.severity);
              return (
                <div
                  key={insight.id}
                  className={`border-l-4 rounded-lg p-3 ${getSeverityColor(insight.severity)}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${sev.color}`}>
                          {sev.label}
                        </span>
                        <span className="text-xs text-gray-500 capitalize">
                          {insight.insightType.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 truncate">{insight.title}</p>
                      <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{insight.description}</p>
                    </div>
                    {insight.potentialSavings > 0 && (
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-gray-500">Economia potencial</p>
                        <p className="text-sm font-semibold text-green-600">
                          {formatCurrency(insight.potentialSavings)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
