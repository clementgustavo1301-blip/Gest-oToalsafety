import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import RoutingMachine from '../components/RoutingMachine';
import L from 'leaflet';
import {
  MapPin, Navigation, Calendar, ChevronRight, Search
} from 'lucide-react';
import type { Campaign, PartnerAppointment } from '../types';
import { EVENT_TYPE_LABELS } from '../types';
import { fmtDate, fmtCurrency } from '../utils/format';

interface MapPageProps {
  campaigns: Campaign[];
  partners: PartnerAppointment[];
}

// Custom icons using Lucide colors
const createCustomIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-map-pin',
    html: `<div style="
      background-color: ${color};
      width: 28px;
      height: 28px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 2px solid #ffffff;
      box-shadow: 0 4px 10px rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="width: 8px; height: 8px; background: white; border-radius: 50%; transform: rotate(45deg);"></div>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 34],
    popupAnchor: [0, -34],
  });
};

const campaignIcon = createCustomIcon('#0066ff');
const actionIcon = createCustomIcon('#8b5cf6');
const lectureIcon = createCustomIcon('#ffab00');
const partnerIcon = createCustomIcon('#00e5ff');
const baseIcon = L.divIcon({
  className: 'custom-map-pin',
  html: `<div style="
    background-color: #0f172a;
    width: 32px;
    height: 32px;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    border: 3px solid #00e5ff;
    box-shadow: 0 4px 12px rgba(0, 229, 255, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
  ">
    <div style="font-size: 14px; transform: rotate(45deg); color: #00e5ff;">★</div>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 39],
  popupAnchor: [0, -39],
});

// Helper to center map smoothly
function MapCenterController({ center }: { center: [number, number] }) {
  const map = useMap();
  React.useEffect(() => {
    map.flyTo(center, 12, { duration: 1.2 });
  }, [center, map]);
  return null;
}

export const MapPage: React.FC<MapPageProps> = ({ campaigns, partners }) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'campaign' | 'partner'>('all');
  const baseCoords: [number, number] = [-5.2077, -37.3314];
  const [selectedPoint, setSelectedPoint] = useState<[number, number]>(baseCoords);
  const [searchTerm, setSearchTerm] = useState('');

  // Default coordinate mapper if missing
  const pointsWithCoords = [
    ...campaigns.map(c => ({
      id: `c_${c.id}`,
      name: c.company,
      location: c.location,
      date: c.date,
      category: 'campaign' as const,
      type: c.eventType,
      count: c.expectedCount,
      status: c.kitReady ? 'Kit Pronto' : 'Kit Pendente',
      isKitReady: c.kitReady,
      lat: c.lat ?? -5.2077,
      lng: c.lng ?? -37.3314,
    })),
    ...partners.map(p => ({
      id: `p_${p.id}`,
      name: p.client,
      location: `${p.partnerClinic} (${p.state})`,
      date: p.date,
      category: 'partner' as const,
      type: 'partner' as const,
      count: p.value,
      status: p.paid ? 'Pago' : 'Faturamento Pendente',
      isKitReady: true,
      lat: p.lat ?? -5.2077,
      lng: p.lng ?? -37.3314,
    })),
  ];

  const filteredPoints = pointsWithCoords.filter(pt => {
    if (activeFilter === 'campaign' && pt.category !== 'campaign') return false;
    if (activeFilter === 'partner' && pt.category !== 'partner') return false;
    if (searchTerm) {
      const match =
        pt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pt.location.toLowerCase().includes(searchTerm.toLowerCase());
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="page-wrapper map-layout-wrapper">
      <div className="map-view-container">
        {/* Map Header with Filters */}
        <div className="map-top-bar">
          <div className="map-filter-group">
            <button
              className={`filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setActiveFilter('all')}
            >
              Todos os Itinerários ({pointsWithCoords.length})
            </button>
            <button
              className={`filter-btn ${activeFilter === 'campaign' ? 'active' : ''}`}
              onClick={() => setActiveFilter('campaign')}
            >
              Unidades Móveis ({campaigns.length})
            </button>
            <button
              className={`filter-btn ${activeFilter === 'partner' ? 'active' : ''}`}
              onClick={() => setActiveFilter('partner')}
            >
              Clínicas Parceiras ({partners.length})
            </button>
          </div>

          <div className="map-search-box">
            <Search size={15} className="search-icon" />
            <input
              type="text"
              placeholder="Buscar ponto no mapa..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Map & Sidebar Split */}
        <div className="map-content-grid">
          {/* Main Leaflet Map */}
          <div className="card map-card" style={{ padding: 0, overflow: 'hidden', height: '640px' }}>
            <MapContainer
              center={selectedPoint}
              zoom={11}
              scrollWheelZoom
              style={{ height: '100%', width: '100%' }}
            >
              <MapCenterController center={selectedPoint} />
              {(selectedPoint[0] !== baseCoords[0] || selectedPoint[1] !== baseCoords[1]) && (
                <RoutingMachine start={baseCoords} end={selectedPoint} color="#00e5ff" />
              )}
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Base / Matriz Ponto de Partida */}
              <Marker position={baseCoords} icon={baseIcon}>
                <Popup className="custom-leaflet-popup">
                  <div className="map-popup-card">
                    <div className="popup-badge-row">
                      <span className="popup-type-tag" style={{ background: '#0f172a', color: '#00e5ff' }}>PONTO DE PARTIDA</span>
                    </div>
                    <div className="popup-body">
                      <h3>Ecoclinic (Anexo ao Ed. CACIM)</h3>
                      <p>Tv. Filgueira Filho, 2 - Alto de São Manoel</p>
                      <p style={{ color: '#00e5ff', fontWeight: 600 }}>Sede Operacional (Mossoró - RN)</p>
                    </div>
                  </div>
                </Popup>
              </Marker>

              {filteredPoints.map(pt => {
                let icon = campaignIcon;
                if (pt.category === 'campaign') {
                  if (pt.type === 'acao') icon = actionIcon;
                  else if (pt.type === 'palestra') icon = lectureIcon;
                } else {
                  icon = partnerIcon;
                }

                return (
                  <Marker
                    key={pt.id}
                    position={[pt.lat, pt.lng]}
                    icon={icon}
                    eventHandlers={{
                      click: () => setSelectedPoint([pt.lat, pt.lng])
                    }}
                  >
                    <Popup className="custom-leaflet-popup">
                      <div className="map-popup-card">
                        <div className="popup-badge-row">
                          <span className={`popup-type-tag ${pt.category}`}>
                            {pt.category === 'campaign' ? EVENT_TYPE_LABELS[pt.type as keyof typeof EVENT_TYPE_LABELS] : 'Clínica Parceira'}
                          </span>
                          <span className={`popup-status ${pt.isKitReady ? 'ok' : 'warn'}`}>
                            {pt.status}
                          </span>
                        </div>
                        <h4 className="popup-title">{pt.name}</h4>
                        <div className="popup-info-line">
                          <MapPin size={13} /> {pt.location}
                        </div>
                        <div className="popup-info-line">
                          <Calendar size={13} /> {fmtDate(pt.date)}
                        </div>
                        <div className="popup-footer">
                          {pt.category === 'campaign' ? (
                            <span>👥 <strong>{pt.count}</strong> vidas previstas</span>
                          ) : (
                            <span>💰 <strong>{fmtCurrency(pt.count)}</strong></span>
                          )}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>

          {/* Itinerary Side Panel */}
          <div className="card itinerary-panel">
            <div className="itinerary-header">
              <div className="itinerary-title-wrap">
                <Navigation size={18} className="text-blue" />
                <h3>Roteiro de Atendimentos</h3>
              </div>
              <span className="itinerary-count-badge">
                {filteredPoints.length} pontos
              </span>
            </div>

            <div className="itinerary-scroll-list">
              {filteredPoints.map(pt => (
                <div
                  key={pt.id}
                  className={`itinerary-item-card ${selectedPoint[0] === pt.lat && selectedPoint[1] === pt.lng ? 'selected' : ''}`}
                  onClick={() => setSelectedPoint([pt.lat, pt.lng])}
                >
                  <div className="itinerary-item-left">
                    <div className="itinerary-date-col">
                      <span className="itinerary-date-day">{pt.date.split('-')[2]}</span>
                      <span className="itinerary-date-month">OUT</span>
                    </div>
                    <div className="itinerary-item-info">
                      <strong className="itinerary-company">{pt.name}</strong>
                      <span className="itinerary-loc">
                        <MapPin size={12} /> {pt.location}
                      </span>
                      <div className="itinerary-tags">
                        <span className={`mini-pill ${pt.category}`}>
                          {pt.category === 'campaign' ? EVENT_TYPE_LABELS[pt.type as keyof typeof EVENT_TYPE_LABELS] : 'Parceira'}
                        </span>
                        <span className={`mini-pill-status ${pt.isKitReady ? 'ok' : 'pending'}`}>
                          {pt.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={16} className="itinerary-arrow" />
                </div>
              ))}
            </div>

            {/* Map Legend */}
            <div className="map-legend-box">
              <span className="legend-title">Legenda de Cores:</span>
              <div className="legend-items">
                <span className="legend-item"><span className="legend-dot bg-blue" /> Unidade Móvel</span>
                <span className="legend-item"><span className="legend-dot bg-purple" /> Ação In-Company</span>
                <span className="legend-item"><span className="legend-dot bg-amber" /> Palestra</span>
                <span className="legend-item"><span className="legend-dot bg-cyan" /> Parceira</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
