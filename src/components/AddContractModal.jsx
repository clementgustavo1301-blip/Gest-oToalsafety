import React, { useState } from 'react';
import { X, ClipboardList } from 'lucide-react';

const AddContractModal = ({ onClose, onSave }) => {
  const [contractNumber, setContractNumber] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [value, setValue] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!contractNumber.trim()) return;
    setLoading(true);
    await onSave({
      contractNumber: contractNumber.trim(),
      description: description.trim(),
      startDate: startDate || null,
      endDate: endDate || null,
      status: 'ativo',
      value: value.trim() || null,
      file: file
    });
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
              <ClipboardList size={18} color="white" />
            </div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Novo Contrato</h2>
          </div>
          <button onClick={onClose} style={{ padding: '0.375rem', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label className="modal-label" htmlFor="contract-number">Número do Contrato</label>
              <input
                id="contract-number"
                type="text"
                value={contractNumber}
                onChange={(e) => setContractNumber(e.target.value)}
                placeholder="Ex: CT-2023-001"
                className="modal-input"
                autoFocus
                required
                disabled={loading}
              />
            </div>
            
            <div>
              <label className="modal-label" htmlFor="contract-description">Descrição (Objeto)</label>
              <input
                id="contract-description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Prestação de serviços de SST..."
                className="modal-input"
                disabled={loading}
              />
            </div>

            <div className="grid-responsive-2">
              <div>
                <label className="modal-label" htmlFor="contract-start">Data de Início</label>
                <input
                  id="contract-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="modal-input"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="modal-label" htmlFor="contract-end">Data de Fim</label>
                <input
                  id="contract-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="modal-input"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="modal-label" htmlFor="contract-value">Valor (Opcional)</label>
              <input
                id="contract-value"
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="R$ 0,00"
                className="modal-input"
                disabled={loading}
              />
            </div>

            <div>
              <label className="modal-label">Anexar PDF (Opcional)</label>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setFile(e.target.files[0])}
                className="modal-input"
                style={{ padding: '0.5rem', cursor: 'pointer' }}
                disabled={loading}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={!contractNumber.trim() || loading}>
              {loading ? 'Salvando...' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddContractModal;
