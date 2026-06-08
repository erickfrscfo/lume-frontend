import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import Login from '@/pages/Login';
import AdminOnboarding from '@/pages/AdminOnboarding';
import Dashboard from '@/pages/Dashboard';
import ReuniaoExecutiva from '@/pages/ReuniaoExecutiva';
import InsercaoDados from '@/pages/InsercaoDados';
import Dashboards from '@/pages/Dashboards';
import Integracoes from '@/pages/Integracoes';
import AlertasIA from '@/pages/AlertasIA';
import ReportBuilder from '@/pages/ReportBuilder';
import Conciliacao from '@/pages/Conciliacao';
import ObrigacoesFinanceiras from '@/pages/ObrigacoesFinanceiras';

export default function App() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Routes>
      {/* Rota pública: apenas login */}
      <Route
        path="/login"
        element={isAuthenticated && !isLoading ? <Navigate to="/" replace /> : <Login />}
      />

      {/* Rota admin: onboarding protegido por chave na URL */}
      <Route path="/admin/onboarding" element={<AdminOnboarding />} />

      {/* Rotas protegidas: requerem autenticação */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/reuniao" element={<ReuniaoExecutiva />} />
        <Route path="/dados" element={<InsercaoDados />} />
        <Route path="/dashboards" element={<Dashboards />} />
        <Route path="/alertas" element={<AlertasIA />} />
        <Route path="/relatorio" element={<ReportBuilder />} />
        <Route path="/obrigacoes" element={<ObrigacoesFinanceiras />} />
        <Route path="/conciliacao" element={<Conciliacao />} />
        <Route path="/integracoes" element={<Integracoes />} />
      </Route>

      {/* Catch-all: redireciona para home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
