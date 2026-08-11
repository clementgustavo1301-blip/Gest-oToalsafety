import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import MobileTopBar from './components/MobileTopBar';
import Dashboard from './pages/Dashboard';
import CalendarView from './pages/CalendarView';
import CompaniesPage from './pages/CompaniesPage';
import CompanyDetailsPage from './pages/CompanyDetailsPage';
import LogisticsPage from './pages/LogisticsPage';
import DeliverablesPage from './pages/DeliverablesPage';
import InventoryPage from './pages/InventoryPage';
import AIAssistant from './pages/AIAssistant';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';
import ConvocationsPage from './pages/ConvocationsPage';
import ContactsPage from './pages/ContactsPage';
import ScheduleGeneratorPage from './pages/ScheduleGeneratorPage';
import ReportsPage from './pages/ReportsPage';
import TeamPage from './pages/TeamPage';
import StorageManagementPage from './pages/StorageManagementPage';
import ExamsBudgetPage from './pages/ExamsBudgetPage';
import PublicCATPage from './pages/PublicCATPage';
import CATPage from './pages/CATPage';
import CertificatesPage from './pages/CertificatesPage';
import ProtectedRoute from './components/ProtectedRoute';
import ProfileSetup from './components/ProfileSetup';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AIProvider } from './context/AIContext';

// Novo componente para proteger o layout dependendo do perfil
const AppLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { userProfile, activeLink } = useAuth();

  if (!activeLink) {
    return (
      <AIProvider>
        <ProfileSetup />
      </AIProvider>
    );
  }

  return (
    <AIProvider>
      <div className="app-layout">
        <MobileTopBar onOpenSidebar={() => setIsSidebarOpen(true)} />
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <div 
          className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`}
          onClick={() => setIsSidebarOpen(false)}
        />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/calendar" element={<CalendarView />} />
            <Route path="/companies" element={<CompaniesPage />} />
            <Route path="/company/:companyId" element={<CompanyDetailsPage />} />
            <Route path="/logistics" element={<LogisticsPage />} />
            <Route path="/deliverables" element={<DeliverablesPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/ai-assistant" element={<AIAssistant />} />
            <Route path="/convocations" element={<ConvocationsPage />} />
            <Route path="/contacts" element={<ContactsPage />} />
            <Route path="/schedule-generator" element={<ScheduleGeneratorPage />} />
            <Route path="/exams-budget" element={
              <ProtectedRoute allowedSectors={['Clínica', 'Diretoria']}>
                <ExamsBudgetPage />
              </ProtectedRoute>
            } />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/team" element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <TeamPage />
              </ProtectedRoute>
            } />
            <Route path="/storage" element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <StorageManagementPage />
              </ProtectedRoute>
            } />
            <Route path="/cat" element={
              <ProtectedRoute allowedSectors={['SST', 'Diretoria', 'Admin']}>
                <CATPage />
              </ProtectedRoute>
            } />
            <Route path="/certificates" element={
              <ProtectedRoute allowedSectors={['SST', 'Diretoria', 'Admin']}>
                <CertificatesPage />
              </ProtectedRoute>
            } />
          </Routes>
        </main>
      </div>
    </AIProvider>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Rota Pública */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/cat-form" element={<PublicCATPage />} />

          {/* Rotas Protegidas */}
          <Route path="/*" element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
