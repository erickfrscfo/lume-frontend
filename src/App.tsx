import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import ReuniaoExecutiva from '@/pages/ReuniaoExecutiva';
import InsercaoDados from '@/pages/InsercaoDados';
import Dashboards from '@/pages/Dashboards';
import Integracoes from '@/pages/Integracoes';
import AlertasIA from '@/pages/AlertasIA';

export default function App() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated && !isLoading ? <Navigate to="/" replace /> : <Login />}
      />
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
        <Route path="/integracoes" element={<Integracoes />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
