import { useState, useCallback } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { ToastContainer } from './components/Toast';
import { CampaignForm, PartnerForm } from './components/Modals';
import { DashboardPage } from './pages/DashboardPage';
import { CalendarPage } from './pages/CalendarPage';
import { MapPage } from './pages/MapPage';
import { CampaignsPage } from './pages/CampaignsPage';
import { PartnersPage } from './pages/PartnersPage';
import { ReportsPage as IPAReportsPage } from './pages/IPAReportsPage';
import { TvControlCenterPage } from './pages/TvControlCenterPage';
import { useCampaigns, usePartners } from './useData';
import type { Campaign, PartnerAppointment, ToastType, ToastItem } from './types';
import './index.css';
import './ipa-layout.css';
import './ipa-tables.css';
import './ipa-reports.css';
import './ipa-map-calendar.css';
import './tv2.css';

let toastCounter = 0;

function MainLayout() {
  const location = useLocation();
  const { campaigns, addCampaign, updateCampaign, deleteCampaign } = useCampaigns();
  const { partners, addPartner, updatePartner, deletePartner } = usePartners();

  // Toast notification state
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++toastCounter;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Global modals
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | undefined>();
  const [defaultCampaignDate, setDefaultCampaignDate] = useState<string | undefined>();

  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [editingPartner, setEditingPartner] = useState<PartnerAppointment | undefined>();
  const [defaultPartnerDate, setDefaultPartnerDate] = useState<string | undefined>();

  // Handlers to open modals
  const handleOpenNewCampaign = useCallback((date?: string) => {
    setEditingCampaign(undefined);
    setDefaultCampaignDate(date);
    setShowCampaignModal(true);
  }, []);

  const handleOpenEditCampaign = useCallback((camp: Campaign) => {
    setEditingCampaign(camp);
    setDefaultCampaignDate(undefined);
    setShowCampaignModal(true);
  }, []);

  const handleOpenNewPartner = useCallback((date?: string) => {
    setEditingPartner(undefined);
    setDefaultPartnerDate(date);
    setShowPartnerModal(true);
  }, []);

  const handleOpenEditPartner = useCallback((part: PartnerAppointment) => {
    setEditingPartner(part);
    setDefaultPartnerDate(undefined);
    setShowPartnerModal(true);
  }, []);




  if (location.pathname === '/ipa/tv') {
    return (
      <div className="tv-fullscreen-wrapper">
        <TvControlCenterPage campaigns={campaigns} partners={partners} />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    );
  }

  return (
    <>
      <div className="ipa-system-wrapper">
        <Routes>
            <Route
              path="/"
              element={
                <DashboardPage
                  campaigns={campaigns}
                  partners={partners}
                  onNewCampaign={() => handleOpenNewCampaign()}
                  onNewPartner={() => handleOpenNewPartner()}
                />
              }
            />
            <Route
              path="/tv"
              element={<TvControlCenterPage campaigns={campaigns} partners={partners} />}
            />
            <Route
              path="/calendar"
              element={
                <CalendarPage
                  campaigns={campaigns}
                  partners={partners}
                  updateCampaign={updateCampaign}
                  updatePartner={updatePartner}
                  deleteCampaign={deleteCampaign}
                  deletePartner={deletePartner}
                  onNewCampaign={handleOpenNewCampaign}
                  onNewPartner={handleOpenNewPartner}
                  onEditCampaign={handleOpenEditCampaign}
                  onEditPartner={handleOpenEditPartner}
                  showToast={showToast}
                />
              }
            />
            <Route
              path="/map"
              element={<MapPage campaigns={campaigns} partners={partners} />}
            />
            <Route
              path="/campaigns"
              element={
                <CampaignsPage
                  campaigns={campaigns}
                  addCampaign={addCampaign}
                  updateCampaign={updateCampaign}
                  deleteCampaign={deleteCampaign}
                  showToast={showToast}
                />
              }
            />
            <Route
              path="/partners"
              element={
                <PartnersPage
                  partners={partners}
                  addPartner={addPartner}
                  updatePartner={updatePartner}
                  deletePartner={deletePartner}
                  showToast={showToast}
                />
              }
            />
            <Route
              path="/reports"
              element={
                <IPAReportsPage
                  campaigns={campaigns}
                  partners={partners}
                  showToast={showToast}
                />
              }
            />
            <Route
              path="*"
              element={
                <div className="empty-route-fallback">
                  <h3>Página não encontrada</h3>
                  <p>A rota acessada não existe no sistema IPA.</p>
                </div>
              }
            />
          </Routes>
      </div>

      {/* Global Campaign Modal */}
      {showCampaignModal && (
        <CampaignForm
          initial={editingCampaign}
          defaultDate={defaultCampaignDate}
          existingCompanies={[...new Set(campaigns.map(c => c.company))]}
          onClose={() => setShowCampaignModal(false)}
          onSave={data => {
            if (editingCampaign) {
              updateCampaign(editingCampaign.id, data);
              showToast('Campanha atualizada com sucesso!', 'success');
            } else {
              addCampaign(data);
              showToast('Nova campanha cadastrada com sucesso!', 'success');
            }
          }}
        />
      )}

      {/* Global Partner Modal */}
      {showPartnerModal && (
        <PartnerForm
          initial={editingPartner}
          defaultDate={defaultPartnerDate}
          onClose={() => setShowPartnerModal(false)}
          onSave={data => {
            if (editingPartner) {
              updatePartner(editingPartner.id, data);
              showToast('Agendamento parceiro atualizado!', 'success');
            } else {
              addPartner(data);
              showToast('Novo agendamento parceiro cadastrado!', 'success');
            }
          }}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}

export default function IPASystem() {
  return <MainLayout />;
}
