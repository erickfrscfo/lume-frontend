import { useState, useEffect } from 'react';
import { alertsApi } from '../lib/api';
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Handshake,
  CalendarClock,
  Sparkles,
  X,
  ChevronRight,
  Bell,
  CheckCircle2,
  DollarSign,
  Eye,
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

// ============================================
// BADGE DE ALERTAS (para o header/sidebar)
// ============================================
export function AlertsBadge({ onClick }: { onClick: () => void }) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    alertsApi.list()
      .then((res) => {
        const summary = res.data?.data?.summary;
        if (summary) setUnreadCount(summary.unread);
      })
      .catch(() => {});
  }, []);

  if (unreadCount === 0) return null;

  return (
    <button
      onClick={onClick}
      className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors"
      title={`${unreadCount} alertas não lidos`}
    >
      <Bell className="w-5 h-5 text-gray-600" />
      <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
        {unreadCount > 9 ? '9+' : unreadCount}
      </span>
    </button>
  );
}

// ============================================
// BANNER DE ALERTAS (resumo no Dashboard)
// ============================================
export function AlertsBanner({ onViewAll }: { onViewAll: () => void }) {
  const [summary, setSummary] = useState<AlertsSummary | null>(null);
  const [topAlert, setTopAlert] = useState<Alert | null>(null);

  useEffect(() => {
    alertsApi.list()
      .then((res) => {
        const data = res.data?.data;
        if (data) {
          setSummary(data.summary);
          if (data.alerts.length > 0) {
            setTopAlert(data.alerts[0]);
          }
        }
      })
      .catch(() => {});
  }, []);

  if (!summary || summary.total === 0) return null;

  const severityColor = summary.bySeverity.critical > 0 || summary.bySeverity.high > 0
    ? 'from-red-50 to-orange-50 border-red-200'
    : 'from-amber-50 to-yellow-50 border-amber-200';

  const iconColor = summary.bySeverity.critical > 0 || summary.bySeverity.high > 0
    ? 'text-red-500'
    : 'text-amber-500';

  return (
    <div className={`bg-gradient-to-r ${severityColor} border rounded-2xl p-4 mb-6`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-xl bg-white/80 ${iconColor}`}>
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 text-sm">
              Esnork identificou {summary.total} {summary.total === 1 ? 'insight' : 'insights'}
            </h3>
            {summary.totalSavings > 0 && (
              <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                Economia potencial: R$ {summary.totalSavings.toLocaleString('pt-BR')}
              </span>
            )}
          </div>
          {topAlert && (
            <p className="text-sm text-gray-600 line-clamp-2">
              {topAlert.text}
            </p>
          )}
        </div>
        <button
          onClick={onViewAll}
          className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap"
        >
          Ver todos
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ============================================
// PAINEL COMPLETO DE ALERTAS (sidebar/modal)
// ============================================
export function AlertsPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [summary, setSummary] = useState<AlertsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadAlerts();
    }
  }, [isOpen]);

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

  const handleMarkRead = async (id: string) => {
    try {
      await alertsApi.markRead(id);
      setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, isRead: true } : a));
      if (summary) setSummary({ ...summary, unread: Math.max(0, summary.unread - 1) });
    } catch (err) {
      console.error('Erro ao marcar como lido:', err);
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await alertsApi.dismiss(id);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
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
      case 'SEASONAL_ANOMALY': return <CalendarClock className="w-5 h-5" />;
      case 'SEASONAL_OPPORTUNITY': return <Sparkles className="w-5 h-5" />;
      default: return <AlertTriangle className="w-5 h-5" />;
    }
  };

  const getAlertColor = (type: string, severity: string) => {
    if (type === 'EXPENSE_DROP' || type === 'SEASONAL_OPPORTUNITY') {
      return { bg: 'bg-green-50', border: 'border-green-200', icon: 'text-green-600', badge: 'bg-green-100 text-green-700' };
    }
    if (severity === 'CRITICAL' || severity === 'HIGH') {
      return { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-600', badge: 'bg-red-100 text-red-700' };
    }
    return { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-600', badge: 'bg-amber-100 text-amber-700' };
  };

  const getAlertTypeLabel = (type: string) => {
    switch (type) {
      case 'EXPENSE_SPIKE': return 'Aumento de Gasto';
      case 'EXPENSE_DROP': return 'Redução de Gasto';
      case 'NEGOTIATION_OPPORTUNITY': return 'Oportunidade';
      case 'SEASONAL_ANOMALY': return 'Sazonalidade';
      case 'SEASONAL_OPPORTUNITY': return 'Crescimento';
      default: return 'Alerta';
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'Crítico';
      case 'HIGH': return 'Alto';
      case 'MEDIUM': return 'Médio';
      case 'LOW': return 'Baixo';
      default: return severity;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Painel lateral */}
      <div className="relative w-full max-w-lg bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Alertas Inteligentes</h2>
              <p className="text-sm text-blue-100">
                {summary ? `${summary.total} insights • ${summary.unread} não lidos` : 'Carregando...'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumo de economia */}
        {summary && summary.totalSavings > 0 && (
          <div className="mx-5 mt-4 p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-green-800">
                Economia potencial identificada
              </p>
              <p className="text-lg font-bold text-green-700">
                R$ {summary.totalSavings.toLocaleString('pt-BR')}/ano
              </p>
            </div>
          </div>
        )}

        {/* Lista de alertas */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <div className="w-8 h-8 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin mb-3" />
              <p className="text-sm">Analisando seus dados...</p>
            </div>
          ) : alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <CheckCircle2 className="w-12 h-12 mb-3 text-green-400" />
              <p className="font-medium text-gray-600">Tudo em ordem!</p>
              <p className="text-sm text-center mt-1">
                Nenhum alerta no momento. O Esnork está monitorando seus dados continuamente.
              </p>
            </div>
          ) : (
            alerts.map((alert) => {
              const colors = getAlertColor(alert.type, alert.severity);
              const isExpanded = expandedId === alert.id;

              return (
                <div
                  key={alert.id}
                  className={`${colors.bg} border ${colors.border} rounded-xl p-4 transition-all ${!alert.isRead ? 'ring-2 ring-blue-200' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg bg-white/80 ${colors.icon} flex-shrink-0`}>
                      {getAlertIcon(alert.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${colors.badge}`}>
                          {getAlertTypeLabel(alert.type)}
                        </span>
                        <span className="text-[10px] text-gray-500 uppercase">
                          {getSeverityLabel(alert.severity)}
                        </span>
                        {!alert.isRead && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full" />
                        )}
                      </div>
                      <h4 className="font-semibold text-gray-900 text-sm mb-1">
                        {alert.title}
                      </h4>
                      <p className={`text-sm text-gray-700 ${isExpanded ? '' : 'line-clamp-3'}`}>
                        {alert.text}
                      </p>

                      {alert.potentialSavings && alert.potentialSavings > 0 && (
                        <div className="mt-2 flex items-center gap-1.5 text-green-700">
                          <DollarSign className="w-3.5 h-3.5" />
                          <span className="text-xs font-semibold">
                            Economia potencial: R$ {alert.potentialSavings.toLocaleString('pt-BR')}/ano
                          </span>
                        </div>
                      )}

                      {/* Ações */}
                      <div className="flex items-center gap-2 mt-3">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : alert.id)}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                          {isExpanded ? 'Ver menos' : 'Ver mais'}
                        </button>
                        {!alert.isRead && (
                          <button
                            onClick={() => handleMarkRead(alert.id)}
                            className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            Marcar como lido
                          </button>
                        )}
                        <button
                          onClick={() => handleDismiss(alert.id)}
                          className="text-xs text-gray-400 hover:text-red-500 ml-auto"
                        >
                          Descartar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 text-center">
          <p className="text-xs text-gray-400">
            Alertas gerados automaticamente pelo Esnork • Atualizado a cada upload
          </p>
        </div>
      </div>
    </div>
  );
}
