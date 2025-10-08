import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ClientsPage from './pages/ClientsPage';
import ProjectsPage from './pages/ProjectsPage';
import PublishersPage from './pages/PublishersPage';
import GuestBlogSitesPage from './pages/GuestBlogSitesPage';
import OrdersPage from './pages/OrdersPage';
import DataEntryPage from './pages/DataEntryPage';
import SitesPage from './pages/SitesPage';
import GuestBlogPlacementsPage from './pages/GuestBlogPlacementsPage';
import ReportsPage from './pages/ReportsPage';
import UsersPage from './pages/UsersPage';
import AuditPage from './pages/AuditPage';
import LoadingSpinner from './components/common/LoadingSpinner';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <LoadingSpinner />
      </Box>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/clients/*" element={<ClientsPage />} />
        <Route path="/projects/*" element={<ProjectsPage />} />
        <Route path="/publishers/*" element={<PublishersPage />} />
        <Route path="/sites/*" element={<GuestBlogSitesPage />} />
        <Route path="/pricing-sites/*" element={<SitesPage />} />
        <Route path="/data-entry/*" element={<DataEntryPage />} />
        <Route path="/orders/*" element={<OrdersPage />} />
        <Route path="/guest-blog-placements/*" element={<GuestBlogPlacementsPage />} />
        <Route path="/reports/*" element={<ReportsPage />} />
        {user.role === 'SUPER_ADMIN' && (
          <>
            <Route path="/users/*" element={<UsersPage />} />
            <Route path="/audit/*" element={<AuditPage />} />
          </>
        )}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  );
}

export default App;
