import React, { useState } from 'react';
import { X, Building2, Loader2, MapPin, CheckCircle2 } from 'lucide-react';

function formatCNPJ(value) {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

const AddCompanyModal = ({ onClose, onSave }) => {
  const [name, setName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [contact, setContact] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState('TotalSafety');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingCNPJ, setFetchingCNPJ] = useState(false);
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);

  const fetchCnpjData = async (cnpjStr) => {
    const clean = cnpjStr.replace(/\D/g, '');
    if (clean.length !== 14) return;
    
    setFetchingCNPJ(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${clean}`);
      if (res.ok) {
        const data = await res.json();
        
        // Preenche campos manuais com os dados do CNPJ se estiverem vazios
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
              setLatitude(parseFloat(cepData.location.coordinates.latitude));
              setLongitude(parseFloat(cepData.location.coordinates.longitude));
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !cnpj.trim()) return;
    setLoading(true);
    await onSave({ name: name.trim(), cnpj, contact: contact.trim(), phone: phone.trim(), address: address.trim(), category, latitude, longitude });
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--secondary), var(--secondary-hover))',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Building2 size={18} color="white" />
            </div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Nova Empresa</h2>
          </div>
          <button onClick={onClose} style={{ padding: '0.375rem', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label className="modal-label" htmlFor="company-name">Razão Social</label>
              <input
                id="company-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: LD Agropecuária LTDA"
                className="modal-input"
                autoFocus
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
                Digite o CNPJ completo para buscar os dados automaticamente via Receita Federal.
              </span>
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

            {latitude && longitude && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', backgroundColor: '#ecfdf5', border: '1px solid #34d399', borderRadius: '8px' }}>
                <CheckCircle2 size={18} color="#059669" />
                <span style={{ fontSize: '0.85rem', color: '#065f46', fontWeight: '600' }}>
                  Localização GPS e Endereço encontrados automaticamente!
                </span>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={!name.trim() || !cnpj.trim() || loading}>
              {loading ? 'Salvando...' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCompanyModal;
