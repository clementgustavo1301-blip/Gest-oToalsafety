import React, { useState } from 'react';
import { X, Building2 } from 'lucide-react';

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
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !cnpj.trim()) return;
    setLoading(true);
    await onSave({ name: name.trim(), cnpj, contact: contact.trim(), phone: phone.trim() });
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
              <input
                id="company-cnpj"
                type="text"
                value={cnpj}
                onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
                placeholder="00.000.000/0000-00"
                className="modal-input"
                required
                maxLength={18}
                disabled={loading}
              />
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
