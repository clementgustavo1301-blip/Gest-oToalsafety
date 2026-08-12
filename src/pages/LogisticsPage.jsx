import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import 'leaflet-routing-machine';
import { MapPin, Navigation, Info, Loader2, FileText } from 'lucide-react';
import LogisticsReport from '../components/LogisticsReport';

// Correção dos ícones padrão do Leaflet no Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Ícone personalizado para a Sede
const hqIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Coordenadas da EcoSafety (Travessa Filgueira Filho, 2 - Prédio do Cacim, Mossoró/RN)
const HQ_COORDS = { lat: -5.1955, lng: -37.3308, name: "EcoSafety (Sede)" };

// Componente para desenhar as rotas
const RoutingControl = ({ waypoints }) => {
  const map = useMap();
  
  useEffect(() => {
    if (!map || waypoints.length < 2) return;
    
    // Remove controles antigos se existirem
    if (map.routingControl) {
      map.removeControl(map.routingControl);
    }
    
    const control = L.Routing.control({
      waypoints: waypoints.map(wp => L.latLng(wp.lat, wp.lng)),
      routeWhileDragging: false,
      showAlternatives: true,
      fitSelectedRoutes: true,
      lineOptions: {
        styles: [{ color: '#0ea5e9', weight: 4 }]
      },
      createMarker: () => null // Desativa os marcadores padrão da rota para usarmos os nossos
    }).addTo(map);

    map.routingControl = control;

    return () => {
      if (map && map.routingControl) {
        map.removeControl(map.routingControl);
        map.routingControl = null;
      }
    };
  }, [map, waypoints]);

  return null;
};

export default function LogisticsPage() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompanies, setSelectedCompanies] = useState([]);
  const [activeTab, setActiveTab] = useState('mapa');
  
  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name');
        
      if (error) throw error;
      
      // Apenas pegamos as empresas exatamente como estão no banco.
      // Quem não tiver latitude/longitude não será renderizado no mapa.
      setCompanies(data);
    } catch (err) {
      console.error('Error fetching companies:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleCompanySelection = (company) => {
    if (!company.latitude || !company.longitude) {
      alert('Esta empresa não tem localização definida. Por favor, edite o endereço dela primeiro.');
      return;
    }
    setSelectedCompanies(prev => {
      const isSelected = prev.find(c => c.id === company.id);
      if (isSelected) {
        return prev.filter(c => c.id !== company.id);
      } else {
        return [...prev, company];
      }
    });
  };

  const waypoints = [
    HQ_COORDS,
    ...selectedCompanies.map(c => ({ lat: c.latitude, lng: c.longitude, name: c.name }))
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1 className="page-title">Logística e Rotas</h1>
            <span style={{ 
              backgroundColor: 'var(--primary)', 
              color: 'white', 
              padding: '0.25rem 0.5rem', 
              borderRadius: '12px', 
              fontSize: '0.7rem', 
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>Demo</span>
            <span style={{
              backgroundColor: '#fff3cd',
              color: '#856404',
              border: '1px solid #ffeeba',
              padding: '0.25rem 0.75rem',
              borderRadius: '12px',
              fontSize: '0.75rem',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
              Os dados ainda não estão 100% corretos nesse relatório pois ainda vai ser ajustado o endereço correto das empresas
            </span>
          </div>
          <p className="page-subtitle">Planeje as melhores rotas para visitação às empresas.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => setActiveTab('mapa')}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            background: 'none', border: 'none', padding: '0.5rem 1rem', cursor: 'pointer',
            fontWeight: activeTab === 'mapa' ? '600' : '500',
            color: activeTab === 'mapa' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'mapa' ? '2px solid var(--primary)' : '2px solid transparent',
            marginBottom: '-9px',
            transition: 'var(--transition)'
          }}
        >
          <Navigation size={18} />
          Mapa de Rotas
        </button>
        <button
          onClick={() => setActiveTab('relatorio')}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            background: 'none', border: 'none', padding: '0.5rem 1rem', cursor: 'pointer',
            fontWeight: activeTab === 'relatorio' ? '600' : '500',
            color: activeTab === 'relatorio' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'relatorio' ? '2px solid var(--primary)' : '2px solid transparent',
            marginBottom: '-9px',
            transition: 'var(--transition)'
          }}
        >
          <FileText size={18} />
          Relatório de Deslocamento
        </button>
      </div>

      {activeTab === 'mapa' ? (
        <div style={{ display: 'flex', gap: '1.5rem', height: 'calc(100vh - 240px)', minHeight: '500px' }}>
        
        {/* Painel Lateral de Empresas */}
        <div className="card" style={{ width: '350px', display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Navigation size={18} className="text-primary" />
            Destinos da Rota
          </h2>
          
          <div style={{ backgroundColor: 'var(--primary-light)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: '600' }}>
              <MapPin size={16} />
              Sede EcoSafety
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Ponto de Partida
            </div>
          </div>

          <div style={{ fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            Selecione as empresas para visitar:
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
              <Loader2 className="spinner text-primary" size={24} />
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '0.5rem' }}>
              {companies.map(company => {
                const isSelected = selectedCompanies.some(c => c.id === company.id);
                return (
                  <div 
                    key={company.id}
                    onClick={() => toggleCompanySelection(company)}
                    style={{ 
                      padding: '0.75rem', 
                      border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                      backgroundColor: isSelected ? 'var(--primary-light)' : 'var(--surface)',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}
                  >
                    <div style={{ 
                      width: '24px', height: '24px', borderRadius: '50%', 
                      border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      backgroundColor: isSelected ? 'var(--primary)' : 'transparent',
                      opacity: (!company.latitude) ? 0.5 : 1
                    }}>
                      {isSelected && <div style={{ width: '8px', height: '8px', backgroundColor: 'white', borderRadius: '50%' }} />}
                    </div>
                    <div style={{ opacity: (!company.latitude) ? 0.5 : 1 }}>
                      <div style={{ fontWeight: '500', fontSize: '0.95rem', color: isSelected ? 'var(--primary)' : 'var(--text-primary)' }}>
                        {company.name}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {(!company.latitude) ? '⚠️ Endereço não configurado' : (company.city || 'Endereço configurado')}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Mapa */}
        <div className="card" style={{ flex: 1, padding: 0, overflow: 'hidden', position: 'relative' }}>
          <MapContainer 
            center={[HQ_COORDS.lat, HQ_COORDS.lng]} 
            zoom={12} 
            style={{ height: '100%', width: '100%', zIndex: 1 }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* Marcador da Sede */}
            <Marker position={[HQ_COORDS.lat, HQ_COORDS.lng]} icon={hqIcon}>
              <Popup>
                <strong>{HQ_COORDS.name}</strong><br />
                Ponto de partida.
              </Popup>
            </Marker>

            {/* Marcadores das Empresas */}
            {companies.filter(c => c.latitude && c.longitude).map(company => (
              <Marker key={company.id} position={[company.latitude, company.longitude]}>
                <Popup>
                  <strong>{company.name}</strong><br />
                  <button 
                    onClick={() => toggleCompanySelection(company)}
                    style={{
                      marginTop: '0.5rem',
                      padding: '0.25rem 0.5rem',
                      backgroundColor: selectedCompanies.some(c => c.id === company.id) ? 'var(--danger)' : 'var(--primary)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.8rem'
                    }}
                  >
                    {selectedCompanies.some(c => c.id === company.id) ? 'Remover da Rota' : 'Adicionar à Rota'}
                  </button>
                </Popup>
              </Marker>
            ))}

            {/* Roteador */}
            <RoutingControl waypoints={waypoints} />
            
          </MapContainer>
          
          <div style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            backgroundColor: 'var(--surface)',
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            zIndex: 1000,
            maxWidth: '300px'
          }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Info size={16} className="text-primary"/> Informação
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
              As rotas são otimizadas automaticamente pela ordem de seleção.
              Empresas que aparecem como "Endereço não configurado" devem ter sua localização editada no menu da Empresa.
            </p>
          </div>
        </div>
      </div>
      ) : (
        <LogisticsReport companies={companies} hqCoords={HQ_COORDS} />
      )}
    </div>
  );
}
