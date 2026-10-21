import React, { useState, useEffect } from 'react';
import { X, Building2, UserCheck, ShieldCheck, Clock } from 'lucide-react';
import { getProfiles } from '../services/storageService';

const VISITAS_OPCOES = [
  { value: '7', label: '7 dias (Semanal)' },
  { value: '15', label: '15 dias (Quinzenal)' },
  { value: '30', label: '30 dias (Mensal)' },
  { value: '60', label: '60 dias (Bimestral)' },
  { value: 'N/A', label: 'N/A (Não se aplica)' },
];

const AddGroupModal = ({ onClose, onSave, initialGroup = null }) => {
  const [name, setName] = useState(initialGroup?.name || '');
  const [supervisor, setSupervisor] = useState(initialGroup?.supervisor || '');
  const [tecnicoResponsavel, setTecnicoResponsavel] = useState(
    initialGroup?.tecnicoResponsavel || initialGroup?.tecnico_responsavel || ''
  );
  const [visitasTecnicas, setVisitasTecnicas] = useState(
    initialGroup?.visitasTecnicas || initialGroup?.visitas_tecnicas || 'N/A'
  );
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadProfiles() {
      const profs = await getProfiles();
      setProfiles(profs || []);
    }
    loadProfiles();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    await onSave({
      name: name.trim(),
      supervisor: supervisor.trim(),
      tecnicoResponsavel: tecnicoResponsavel.trim(),
      visitasTecnicas: visitasTecnicas || 'N/A',
    });
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Building2 size={18} color="white" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: '600', margin: 0 }}>
                {initialGroup ? 'Editar Grupo Econômico' : 'Novo Grupo Econômico'}
              </h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Configurações padrão aplicadas a todas as empresas do grupo
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ padding: '0.375rem', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label className="modal-label" htmlFor="group-name">Nome do Grupo *</label>
              <input
                id="group-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Grupo LD Agropecuária"
                className="modal-input"
                autoFocus
                required
                disabled={loading}
              />
            </div>

            {/* Painel: No Grupo, mas aparece em todas as empresas */}
            <div style={{
              padding: '1rem',
              backgroundColor: 'var(--surface-hover, #f8fafc)',
              borderRadius: 'var(--radius-md, 8px)',
              border: '1px solid var(--border, #e2e8f0)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={16} color="var(--primary)" />
                Equipe e Visitas Técnicas (Herança para as Empresas)
              </div>
              <div style={{ padding: '0.5rem 0.75rem', backgroundColor: '#eff6ff', borderRadius: 'var(--radius-sm)', border: '1px solid #bfdbfe', fontSize: '0.75rem', color: '#1e40af', lineHeight: 1.4 }}>
                💡 <strong>Padronização de Equipe:</strong> Ao definir o Supervisor e o Técnico Responsável aqui, <strong>todas as empresas</strong> deste grupo serão automaticamente sincronizadas com estes mesmos responsáveis.
              </div>

              <div>
                <label className="modal-label" htmlFor="group-supervisor" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <ShieldCheck size={14} color="var(--primary)" /> Supervisor
                </label>
                <select
                  id="group-supervisor"
                  className="modal-input"
                  value={supervisor}
                  onChange={(e) => setSupervisor(e.target.value)}
                  disabled={loading}
                >
                  <option value="">Selecione o supervisor do grupo...</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.name}>
                      {p.name} {p.role ? `(${p.role})` : ''}
                    </option>
                  ))}
                  {supervisor && !profiles.some(p => p.name === supervisor) && (
                    <option value={supervisor}>{supervisor} (Manual)</option>
                  )}
                </select>
              </div>

              <div>
                <label className="modal-label" htmlFor="group-tecnico" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <UserCheck size={14} color="var(--primary)" /> Técnico Responsável
                </label>
                <select
                  id="group-tecnico"
                  className="modal-input"
                  value={tecnicoResponsavel}
                  onChange={(e) => setTecnicoResponsavel(e.target.value)}
                  disabled={loading}
                >
                  <option value="">Selecione o técnico responsável...</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.name}>
                      {p.name} {p.role ? `(${p.role})` : ''}
                    </option>
                  ))}
                  {tecnicoResponsavel && !profiles.some(p => p.name === tecnicoResponsavel) && (
                    <option value={tecnicoResponsavel}>{tecnicoResponsavel} (Manual)</option>
                  )}
                </select>
              </div>

              <div>
                <label className="modal-label" htmlFor="group-visitas" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <Clock size={14} color="var(--primary)" /> Periodicidade de Visitas Técnicas
                </label>
                <select
                  id="group-visitas"
                  className="modal-input"
                  value={visitasTecnicas}
                  onChange={(e) => setVisitasTecnicas(e.target.value)}
                  disabled={loading}
                >
                  {VISITAS_OPCOES.map(op => (
                    <option key={op.value} value={op.value}>{op.label}</option>
                  ))}
                  {visitasTecnicas && !VISITAS_OPCOES.some(op => op.value === visitasTecnicas) && (
                    <option value={visitasTecnicas}>{visitasTecnicas}</option>
                  )}
                </select>
                <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                  Esta periodicidade será exibida em todas as empresas deste grupo.
                </span>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={!name.trim() || loading}>
              {loading ? 'Salvando...' : (initialGroup ? 'Salvar Alterações' : 'Criar Grupo')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddGroupModal;
