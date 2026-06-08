import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  MessageSquare,
  Upload,
  BarChart3,
  Link2,
  LogOut,
  Sparkles,
  Bell,
  FileBarChart2,
  CheckCircle,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { alertsApi } from '@/lib/api';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Geral' },
  { path: '/reuniao', icon: MessageSquare, label: 'Reunião Executiva' },
  { path: '/dados', icon: Upload, label: 'Inserção de Dados' },
  { path: '/dashboards', icon: BarChart3, label: 'Dashboards' },
  { path: '/alertas', icon: Bell, label: 'Alertas Financeiros' },
  { path: '/relatorio', icon: FileBarChart2, label: 'Monte seu Relatório' },
  { path: '/obrigacoes', icon: CalendarClock, label: 'Obrigações Financeiras' },
  { path: '/conciliacao', icon: CheckCircle, label: 'Conciliação' },
  { path: '/integracoes', icon: Link2, label: 'Integrações' },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [alertCount, setAlertCount] = useState(0);

  // Carregar contagem de alertas não dispensados
  useEffect(() => {
    const fetchAlertCount = () => {
      alertsApi.list()
        .then((res) => {
          const summary = res.data?.data?.summary;
          if (summary) setAlertCount(summary.unread);
        })
        .catch(() => {});
    };

    fetchAlertCount();

    // Atualizar a cada 60 segundos
    const interval = setInterval(fetchAlertCount, 60000);
    return () => clearInterval(interval);
  }, []);

  // Escutar evento customizado para atualizar contagem quando alerta é dispensado
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      setAlertCount(prev => Math.max(0, prev - 1));
    };
    window.addEventListener('alert-dismissed' as any, handler);
    window.addEventListener('alert-read' as any, handler);
    return () => {
      window.removeEventListener('alert-dismissed' as any, handler);
      window.removeEventListener('alert-read' as any, handler);
    };
  }, []);

  return (
    <aside
      className={`${collapsed ? 'w-16' : 'w-60'} flex flex-col transition-all duration-300 h-screen sticky top-0`}
      style={{ backgroundColor: '#0c1527', borderRight: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Logo */}
      <div className="p-4 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310419663028517609/ohPrPQZYetPFzdUv.png" alt="Esnork" className="w-8 h-8 object-contain flex-shrink-0" />
        {!collapsed && <span className="text-lg font-bold text-white">Esnork</span>}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto transition-colors"
          style={{ color: '#475569' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#94a3b8')}
          onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const showBadge = item.path === '/alertas' && alertCount > 0;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200`}
              style={
                isActive
                  ? { backgroundColor: '#3b82f6', color: '#ffffff', boxShadow: '0 4px 12px rgba(59,130,246,0.25)' }
                  : { backgroundColor: 'transparent', color: '#94a3b8' }
              }
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.color = '#cbd5e1';
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#94a3b8';
                }
              }}
              title={collapsed ? item.label : undefined}
            >
              <div className="relative flex-shrink-0">
                <item.icon className="w-5 h-5" style={{ color: isActive ? '#ffffff' : '#64748b' }} />
                {showBadge && collapsed && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                    {alertCount > 99 ? '99+' : alertCount}
                  </span>
                )}
              </div>
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">{item.label}</span>
                  {showBadge && (
                    <span className="min-w-[20px] h-[20px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                      {alertCount > 99 ? '99+' : alertCount}
                    </span>
                  )}
                  {isActive && !showBadge && (
                    <ChevronRight className="w-4 h-4 ml-auto" style={{ color: '#ffffff' }} />
                  )}
                </>
              )}
            </button>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        {!collapsed && user && (
          <div className="mb-2 px-3">
            <p className="text-sm font-medium text-white truncate">{user.name}</p>
            <p className="text-xs truncate" style={{ color: '#64748b' }}>{user.company?.name}</p>
            <p className="text-xs font-mono" style={{ color: '#3b82f6' }}>Cód: {user.company?.code}</p>
          </div>
        )}
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all"
          style={{ color: '#64748b' }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)';
            e.currentTarget.style.color = '#f87171';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#64748b';
          }}
          title={collapsed ? 'Sair' : undefined}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && 'Sair'}
        </button>
      </div>
    </aside>
  );
}
