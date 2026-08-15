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
  const [region, setRegion] = useState('Natal');
  const [address, setAddress] = useState('');
  const [cepInput, setCepInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingCNPJ, setFetchingCNPJ] = useState(false);
  const [fetchingCEP, setFetchingCEP] = useState(false);
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

  const fetchCepData = async (cepStr) => {
    const cleanCep = cepStr.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;
    
    setFetchingCEP(true);
    try {
      const cepRes = await fetch(`https://brasilapi.com.br/api/cep/v2/${cleanCep}`);
      if (cepRes.ok) {
        const cepData = await cepRes.json();
        
        const parts = [];
        if (cepData.street) parts.push(cepData.street);
        if (cepData.neighborhood) parts.push(cepData.neighborhood);
        if (cepData.city) parts.push(cepData.city);
        if (cepData.state) parts.push(cepData.state);
        if (cepData.cep) parts.push(cepData.cep);
        
        if (parts.length > 0) {
          // Mantém o número se já houver algo no endereço? Mais fácil sobrepor tudo:
          setAddress(parts.join(', ') + ', Nº ');
        }
        
        if (cepData.location?.coordinates?.latitude) {
          setLatitude(parseFloat(cepData.location.coordinates.latitude));
          setLongitude(parseFloat(cepData.location.coordinates.longitude));
        }
      } else {
        alert('CEP não encontrado ou inválido.');
      }
    } catch (err) {
      console.error("Erro ao buscar CEP", err);
      alert('Erro ao conectar com o serviço de CEP.');
    } finally {
      setFetchingCEP(false);
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
    await onSave({ name: name.trim(), cnpj, contact: contact.trim(), phone: phone.trim(), address: address.trim(), category, region, latitude, longitude });
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

            <div style={{ padding: '1rem', backgroundColor: 'var(--surface-hover)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label className="modal-label" htmlFor="company-cep">Preencher Endereço por CEP</label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    id="company-cep"
                    type="text"
                    value={cepInput}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 8);
                      const formatted = val.replace(/^(\d{5})(\d)/, '$1-$2');
                      setCepInput(formatted);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (cepInput.replace(/\D/g, '').length === 8) {
                          fetchCepData(cepInput);
                        }
                      }
                    }}
                    placeholder="00000-000"
                    className="modal-input"
                    maxLength={9}
                    disabled={loading || fetchingCEP}
                    style={{ maxWidth: '150px' }}
                  />
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => fetchCepData(cepInput)}
                    disabled={loading || fetchingCEP || cepInput.replace(/\D/g, '').length !== 8}
                    style={{ padding: '0.5rem 1rem' }}
                  >
                    {fetchingCEP ? <Loader2 size={16} className="spin" /> : 'Buscar CEP'}
                  </button>
                </div>
              </div>

              <div>
                <label className="modal-label" htmlFor="company-address">Endereço Completo</label>
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
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginTop: '4px' }}>
                  O endereço digitado acima será salvo e o mapa usará as coordenadas buscadas pelo CNPJ ou CEP.
                </span>
              </div>
            </div>

            <div className="grid-responsive-2">
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
              <div>
                <label className="modal-label" htmlFor="company-region">Região</label>
                <select
                  id="company-region"
                  className="modal-input"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  disabled={loading}
                  required
                >
                  <option value="Natal">Natal</option>
                  <option value="Mossoró">Mossoró</option>
                </select>
              </div>
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
