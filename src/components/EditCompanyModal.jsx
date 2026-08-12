import React, { useState, useEffect } from 'react';
import { X, Building2, MapPin, Loader2, CheckCircle2 } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Conserta os ícones do Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Centro de Mossoró (fallback)
const DEFAULT_CENTER = { lat: -5.1882, lng: -37.3415 };

function formatCNPJ(value) {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

function LocationMarker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  return position === null ? null : (
    <Marker 
      position={position}
      draggable={true}
      eventHandlers={{
        dragend: (e) => {
          setPosition(e.target.getLatLng());
        }
      }}
    />
  );
}

const EditCompanyModal = ({ company, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [contact, setContact] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState('TotalSafety');
  const [address, setAddress] = useState('');
  const [position, setPosition] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchingCNPJ, setFetchingCNPJ] = useState(false);
  const [autoLocationFound, setAutoLocationFound] = useState(false);

  const fetchCnpjData = async (cnpjStr) => {
    const clean = cnpjStr.replace(/\D/g, '');
    if (clean.length !== 14) return;
    
    setFetchingCNPJ(true);
    setAutoLocationFound(false);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${clean}`);
      if (res.ok) {
        const data = await res.json();
        
        // Preenche campos manuais com os dados do CNPJ
        if (!phone && data.ddd_telefone_1) setPhone(data.ddd_telefone_1);
        
        let contactName = '';
        if (data.qsa && data.qsa.length > 0) {
           contactName = data.qsa[0].nome_socio;
        } else if (data.nome_fantasia) {
           contactName = data.nome_fantasia;
        }
        if (!contact && contactName) setContact(contactName);

        const addressParts = [];
        if (data.logradouro) {
           const street = data.descricao_tipo_de_logradouro ? `${data.descricao_tipo_de_logradouro} ${data.logradouro}` : data.logradouro;
           addressParts.push(street);
        }
        if (data.numero) addressParts.push(data.numero);
        if (data.bairro) addressParts.push(data.bairro);
        if (data.municipio) addressParts.push(data.municipio);
        if (data.uf) addressParts.push(data.uf);
        if (data.cep) addressParts.push(data.cep);
        
        if (addressParts.length > 0) {
          setAddress(addressParts.join(', '));
        }

        if (data.cep) {
          const cepRes = await fetch(`https://brasilapi.com.br/api/cep/v2/${data.cep.replace(/\D/g, '')}`);
          if (cepRes.ok) {
            const cepData = await cepRes.json();
            
            if (cepData.location?.coordinates?.latitude) {
              setPosition({
                lat: parseFloat(cepData.location.coordinates.latitude),
                lng: parseFloat(cepData.location.coordinates.longitude)
              });
              setAutoLocationFound(true);
              
              // Remove the success message after 5 seconds
              setTimeout(() => setAutoLocationFound(false), 5000);
            }
          }
        }
      }
    } catch (err) {
      console.error("Erro ao buscar BrasilAPI", err);
    } finally {
      setFetchingCNPJ(false);
    }
  };

  const handleCnpjChange = (e) => {
    const val = formatCNPJ(e.target.value);
    setCnpj(val);
    if (val.length === 18) {
      fetchCnpjData(val);
    }
  };

  useEffect(() => {
    if (company) {
      setName(company.name || '');
      setCnpj(company.cnpj || '');
      setContact(company.contact || '');
      setPhone(company.phone || '');
      setAddress(company.address || '');
      setCategory(company.category || 'TotalSafety');
      if (company.latitude && company.longitude) {
        setPosition({ lat: company.latitude, lng: company.longitude });
      }
    }
  }, [company]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !cnpj.trim()) return;
    setLoading(true);
    await onSave(company.id, { 
      name: name.trim(), 
      cnpj, 
      contact: contact.trim(), 
      phone: phone.trim(), 
      address: address.trim(),
      category,
      latitude: position?.lat || null,
      longitude: position?.lng || null
    });
    setLoading(false);
  };

  const center = position || DEFAULT_CENTER;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--secondary), var(--secondary-hover))',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Building2 size={18} color="white" />
            </div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Editar Empresa</h2>
          </div>
          <button onClick={onClose} style={{ padding: '0.375rem', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '70vh', overflowY: 'auto' }}>
            <div className="grid-responsive-2">
              <div>
                <label className="modal-label" htmlFor="company-name">Razão Social</label>
                <input
                  id="company-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: LD Agropecuária LTDA"
                  className="modal-input"
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <label className="modal-label" htmlFor="company-cnpj">CNPJ</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="company-cnpj"
                    type="text"
                    value={cnpj}
                    onChange={handleCnpjChange}
                    placeholder="00.000.000/0000-00"
                    className="modal-input"
                    required
                    maxLength={18}
                    disabled={loading || fetchingCNPJ}
                  />
                  {fetchingCNPJ && (
                    <Loader2 size={18} className="spin" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)' }} />
                  )}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginTop: '4px' }}>
                  Aviso: Alterar o CNPJ buscará os dados atualizados da Receita Federal.
                </span>
                {autoLocationFound && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.5rem', color: '#059669' }}>
                    <CheckCircle2 size={14} />
                    <span style={{ fontSize: '0.75rem', fontWeight: '600' }}>Localização atualizada no mapa!</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="grid-responsive-2">
              <div>
                <label className="modal-label" htmlFor="company-contact">Contato</label>
                <input
                  id="company-contact"
                  type="text"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="Nome do responsável"
                  className="modal-input"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="modal-label" htmlFor="company-phone">Telefone</label>
                <input
                  id="company-phone"
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 99999-0000"
                  className="modal-input"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="modal-label" htmlFor="company-address">Endereço (Rua, Número, Bairro, Cidade, Estado, CEP)</label>
              <textarea
                id="company-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ex: Rua das Flores, 123, Centro, São Paulo, SP, 01000-000"
                className="modal-input"
                rows="2"
                style={{ resize: 'vertical' }}
                disabled={loading}
              />
            </div>

            <div>
              <label className="modal-label" htmlFor="company-category">Categoria</label>
              <select
                id="company-category"
                className="modal-input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={loading}
                required
              >
                <option value="TotalSafety">TotalSafety</option>
                <option value="Consultoria Fixa">Consultoria Fixa</option>
              </select>
            </div>
            
            {/* Mapa de Localização */}
            <div style={{ marginTop: '0.5rem' }}>
              <label className="modal-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapPin size={16} className="text-primary"/> 
                Localização Geográfica (Opcional)
              </label>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                Clique no mapa para adicionar o pino ou arraste-o para a posição exata da empresa. Isso é usado no painel de Logística.
              </p>
              
              <div style={{ 
                height: '250px', 
                width: '100%', 
                borderRadius: 'var(--radius-md)', 
                overflow: 'hidden',
                border: '1px solid var(--border)'
              }}>
                <MapContainer 
                  center={[center.lat, center.lng]} 
                  zoom={position ? 15 : 12} 
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <LocationMarker position={position} setPosition={setPosition} />
                </MapContainer>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button 
                  type="button" 
                  onClick={() => setPosition(null)}
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--danger)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: position ? 'block' : 'none'
                  }}
                >
                  Remover Localização
                </button>
              </div>
            </div>

          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={!name.trim() || !cnpj.trim() || loading}>
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditCompanyModal;
