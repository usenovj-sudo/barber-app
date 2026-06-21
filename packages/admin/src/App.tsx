import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/auth';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ReportsPage } from './pages/ReportsPage';
import { InventoryPage } from './pages/InventoryPage';
import { MenuPage } from './pages/MenuPage';
import { AuditPage } from './pages/AuditPage';
import { KitchenPage } from './pages/KitchenPage';
import { PosTablesPage } from './pages/PosTablesPage';
import { PosOrderPage } from './pages/PosOrderPage';
import { GuestMenuPage } from './pages/GuestMenuPage';
import { ClientsPage } from './pages/ClientsPage';
import { ReservationsPage } from './pages/ReservationsPage';

function Protected({ children }: { children: JSX.Element }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      {/* Public guest QR ordering — no auth */}
      <Route path="/order/:qrCode" element={<GuestMenuPage />} />
      {/* Fullscreen kitchen display — no admin chrome */}
      <Route
        path="/kitchen"
        element={
          <Protected>
            <KitchenPage />
          </Protected>
        }
      />
      <Route
        path="/"
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="pos" element={<PosTablesPage />} />
        <Route path="pos/table/:tableId" element={<PosOrderPage />} />
        <Route path="reservations" element={<ReservationsPage />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="menu" element={<MenuPage />} />
        <Route path="audit" element={<AuditPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
