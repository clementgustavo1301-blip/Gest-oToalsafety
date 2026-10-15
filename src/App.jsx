import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import MobileTopBar from './components/MobileTopBar';
import Dashboard from './pages/Dashboard';
import CalendarView from './pages/CalendarView';
import CompaniesPage from './pages/CompaniesPage';
import CompanyDetailsPage from './pages/CompanyDetailsPage';

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
import IPASystem from './App.tsx';

// Novo componente para proteger o layout dependendo do perfil
const AppLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { activeLink } = useAuth();

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
            <Route path="/" element={
              activeLink?.sector === 'Treinamento' ? <Navigate to="/certificates" replace /> : <Dashboard />
            } />
            <Route path="/calendar" element={
              <ProtectedRoute allowedSectors={['SST', 'Clínica', 'Administrativo', 'Diretoria', 'Admin', 'IPA']}>
                <CalendarView />
              </ProtectedRoute>
            } />
            <Route path="/companies" element={
              <ProtectedRoute allowedSectors={['SST', 'Clínica', 'Administrativo', 'Diretoria', 'Admin', 'IPA']}>
                <CompaniesPage />
              </ProtectedRoute>
            } />
            <Route path="/company/:companyId" element={
              <ProtectedRoute allowedSectors={['SST', 'Clínica', 'Administrativo', 'Diretoria', 'Admin', 'IPA']}>
                <CompanyDetailsPage />
              </ProtectedRoute>
            } />

            <Route path="/deliverables" element={
              <ProtectedRoute allowedSectors={['SST', 'Clínica', 'Administrativo', 'Diretoria', 'Admin', 'IPA']}>
                <DeliverablesPage />
              </ProtectedRoute>
            } />
            <Route path="/inventory" element={
              <ProtectedRoute allowedSectors={['SST', 'Diretoria', 'Admin']}>
                <InventoryPage />
              </ProtectedRoute>
            } />
            <Route path="/ai-assistant" element={
              <ProtectedRoute allowedSectors={['SST', 'Clínica', 'Administrativo', 'Diretoria', 'Admin', 'IPA']}>
                <AIAssistant />
              </ProtectedRoute>
            } />
            <Route path="/convocations" element={
              <ProtectedRoute allowedSectors={['Diretoria', 'Admin']}>
                <ConvocationsPage />
              </ProtectedRoute>
            } />
            <Route path="/contacts" element={
              <ProtectedRoute allowedSectors={['SST', 'Clínica', 'Administrativo', 'Diretoria', 'Admin', 'IPA']}>
                <ContactsPage />
              </ProtectedRoute>
            } />
            <Route path="/schedule-generator" element={
              <ProtectedRoute allowedSectors={['SST', 'Clínica', 'Administrativo', 'Diretoria', 'Admin', 'IPA']}>
                <ScheduleGeneratorPage />
              </ProtectedRoute>
            } />
            <Route path="/exams-budget" element={
              <ProtectedRoute allowedSectors={['Clínica', 'Diretoria']}>
                <ExamsBudgetPage />
              </ProtectedRoute>
            } />
            <Route path="/reports" element={
              <ProtectedRoute allowedSectors={['Diretoria', 'Admin']}>
                <ReportsPage />
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute allowedSectors={['SST', 'Clínica', 'Administrativo', 'Diretoria', 'Admin', 'IPA']}>
                <SettingsPage />
              </ProtectedRoute>
            } />
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
              <ProtectedRoute allowedSectors={['SST', 'Treinamento', 'Diretoria', 'Admin']}>
                <CertificatesPage />
              </ProtectedRoute>
            } />
            <Route path="/ipa/*" element={
              <ProtectedRoute allowedSectors={['IPA']}>
                <IPASystem />
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
