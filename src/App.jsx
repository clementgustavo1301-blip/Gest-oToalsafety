import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { AIProvider } from './context/AIContext';

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Rota Pública */}
          <Route path="/login" element={<LoginPage />} />

          {/* Rotas Protegidas */}
          <Route path="/*" element={
            <ProtectedRoute>
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
                      <Route path="/deliverables" element={<DeliverablesPage />} />
                      <Route path="/inventory" element={<InventoryPage />} />
                      <Route path="/ai-assistant" element={<AIAssistant />} />
                      <Route path="/settings" element={<SettingsPage />} />
                    </Routes>
                  </main>
                </div>
              </AIProvider>
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
