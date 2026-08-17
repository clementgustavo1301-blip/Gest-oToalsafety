import React, { useState } from 'react';
import { X, Upload, Trash2, FileText, Plus, Camera, ChevronDown, ChevronUp } from 'lucide-react';
import { generateSSTReport } from '../services/pdfReportGenerator';
import { format } from 'date-fns';

const ReportGeneratorModal = ({ event, onClose, userProfile }) => {
  const [loading, setLoading] = useState(false);
  const [expandedActionId, setExpandedActionId] = useState(1);

  const [formData, setFormData] = useState({
    reportTitle: 'RELATÓRIO DE AÇÕES DE SST',
    reportNumber: `001/${new Date().getFullYear()}`,
    date: event?.date ? format(new Date(event.date + 'T12:00:00'), 'dd/MM/yyyy') : format(new Date(), 'dd/MM/yyyy'),
    companyName: event?.companyName || '',
    siteName: event?.companyName || '',
    technicalNotice: 'Fica estabelecida a obrigatoriedade da elaboração e execução dos projetos de Sistema de Proteção Coletiva (SPQ), Instalações Elétricas Provisórias, aterramentos, área de Vivência, em estrita conformidade com as normas regulamentadoras vigentes.\n\nAlém disso, as demais solicitações conforme notificação do MTE.',
    technicalNoticeRed: 'Visita realizada em periodo noturno, tendo a necessidade de visitas durante o dia para indicar novas adequações in LOCO.',
    technicianName: userProfile?.name || 'Adeylton da Silva Araújo',
    technicianRegister: 'Técnico em Segurança do Trabalho\nSRTE N° 0009823/RN'
  });

  const [actions, setActions] = useState([
    {
      id: 1,
      actionText: event?.title || 'Visita preliminar para inspeções e adequações de ambiente',
      justificationText: 'Adequar obra para futuras fiscalizações MTE',
      irregularities: 'Falta de projetos como: canteiro de obras, instalações elétricas provisórias, projetos SPQ, projetos de aterramentos.\nÁreas com risco de queda, guarda corpo não adequado, sem fixações corretas, sem comprovação de eficiência.',
      recommendations: 'Colocar guarda-corpo nos locais e/ou subir alvenaria como prioridade.\nAdequar guarda corpo conforme niveis relatados nos anexos da norma descrito em item primario',
      photos: []
    }
  ]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleActionChange = (actionId, field, value) => {
    setActions(prev => prev.map(a => a.id === actionId ? { ...a, [field]: value } : a));
  };

  const handlePhotoUpload = (e, actionId) => {
    const files = Array.from(e.target.files);
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setActions(prev => prev.map(a => {
          if (a.id === actionId) {
            return { ...a, photos: [...a.photos, { base64: reader.result, description: '' }] };
          }
          return a;
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const updatePhotoDescription = (actionId, photoIndex, description) => {
    setActions(prev => prev.map(a => {
      if (a.id === actionId) {
        const newPhotos = [...a.photos];
        newPhotos[photoIndex].description = description;
        return { ...a, photos: newPhotos };
      }
      return a;
    }));
  };

  const removePhoto = (actionId, photoIndex) => {
    setActions(prev => prev.map(a => {
      if (a.id === actionId) {
        return { ...a, photos: a.photos.filter((_, i) => i !== photoIndex) };
      }
      return a;
    }));
  };

  const addNewAction = () => {
    const newId = Date.now();
    setActions(prev => [
      ...prev,
      {
        id: newId,
        actionText: 'Nova Ação',
        justificationText: '',
        irregularities: '',
        recommendations: '',
        photos: []
      }
    ]);
    setExpandedActionId(newId);
  };

  const removeAction = (actionId) => {
    if (actions.length === 1) return; // Precisa ter pelo menos uma
    setActions(prev => prev.filter(a => a.id !== actionId));
  };

  const toggleAction = (actionId) => {
    setExpandedActionId(prev => prev === actionId ? null : actionId);
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const reportData = {
        ...formData,
        actions
      };
      await generateSSTReport(reportData);
      onClose();
    } catch (error) {
      console.error('Erro ao gerar relatório', error);
      alert('Ocorreu um erro ao gerar o PDF. Verifique o console para mais detalhes.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '900px', width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={20} color="var(--primary)" /> Gerar Relatório de Ações de SST
          </h2>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>
        
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="modal-label">Título do Relatório</label>
              <input type="text" className="modal-input" name="reportTitle" value={formData.reportTitle} onChange={handleChange} />
            </div>
            <div>
              <label className="modal-label">Nº Relatório (ex: 001/2026)</label>
              <input type="text" className="modal-input" name="reportNumber" value={formData.reportNumber} onChange={handleChange} />
            </div>
            
            <div>
              <label className="modal-label">Empresa</label>
              <input type="text" className="modal-input" name="companyName" value={formData.companyName} onChange={handleChange} />
            </div>
            <div>
              <label className="modal-label">Obra / Local</label>
              <input type="text" className="modal-input" name="siteName" value={formData.siteName} onChange={handleChange} />
            </div>
          </div>

          <div style={{ borderTop: '2px dashed var(--border)', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: 'var(--text-primary)' }}>Ações do Relatório ({actions.length})</h3>
              <button className="btn btn-primary" onClick={addNewAction} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}>
                <Plus size={16} /> Adicionar Nova Ação
              </button>
            </div>

            {actions.map((action, index) => (
              <div key={action.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <div 
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: 'var(--surface)', cursor: 'pointer', borderBottom: expandedActionId === action.id ? '1px solid var(--border)' : 'none' }}
                  onClick={() => toggleAction(action.id)}
                >
                  <div style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {expandedActionId === action.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    Ação {index + 1}: {action.actionText || 'Sem Título'}
                  </div>
                  {actions.length > 1 && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeAction(action.id); }}
                      style={{ color: 'var(--danger)', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem' }}
                    >
                      <Trash2 size={16} /> Remover
                    </button>
                  )}
                </div>

                {expandedActionId === action.id && (
                  <div style={{ padding: '1.5rem', backgroundColor: '#fff', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div>
                      <label className="modal-label">Ação / Título</label>
                      <input type="text" className="modal-input" value={action.actionText} onChange={(e) => handleActionChange(action.id, 'actionText', e.target.value)} />
                    </div>
                    <div>
                      <label className="modal-label">Justificativa da ação</label>
                      <input type="text" className="modal-input" value={action.justificationText} onChange={(e) => handleActionChange(action.id, 'justificationText', e.target.value)} />
                    </div>

                    <div>
                      <label className="modal-label">Irregularidades apontadas (uma por linha)</label>
                      <textarea className="modal-input" rows="3" value={action.irregularities} onChange={(e) => handleActionChange(action.id, 'irregularities', e.target.value)} />
                    </div>

                    {/* Seção de Fotos da Ação */}
                    <div style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--surface)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <label className="modal-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Camera size={16} /> Fotos / Evidências ({action.photos.length})
                        </label>
                        <label className="btn btn-secondary" style={{ cursor: 'pointer', padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }}>
                          <Upload size={14} /> Anexar Fotos
                          <input type="file" multiple accept="image/*" onChange={(e) => handlePhotoUpload(e, action.id)} style={{ display: 'none' }} />
                        </label>
                      </div>
                      
                      {action.photos.length > 0 ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                          {action.photos.map((photo, idx) => (
                            <div key={idx} style={{ position: 'relative', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                              <button 
                                onClick={() => removePhoto(action.id, idx)}
                                style={{ position: 'absolute', top: '0.25rem', right: '0.25rem', background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--danger)' }}
                              >
                                <Trash2 size={14} />
                              </button>
                              <img src={photo.base64} alt={`Evidência ${idx+1}`} style={{ width: '100%', height: '140px', objectFit: 'cover' }} />
                              <textarea 
                                placeholder="Descrição da foto..."
                                value={photo.description}
                                onChange={(e) => updatePhotoDescription(action.id, idx, e.target.value)}
                                style={{ border: 'none', borderTop: '1px solid var(--border)', padding: '0.5rem', fontSize: '0.75rem', resize: 'none', height: '60px', width: '100%' }}
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', fontSize: '0.8125rem', backgroundColor: 'var(--background)', borderRadius: 'var(--radius-md)' }}>
                          Nenhuma foto anexada nesta ação.
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="modal-label">Ação recomendada (uma por linha)</label>
                      <textarea className="modal-input" rows="3" value={action.recommendations} onChange={(e) => handleActionChange(action.id, 'recommendations', e.target.value)} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ borderTop: '2px dashed var(--border)', paddingTop: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
             <div>
              <label className="modal-label" style={{ color: '#d97706' }}>Aviso Técnico (Fundo Amarelo)</label>
              <textarea className="modal-input" name="technicalNotice" rows="4" value={formData.technicalNotice} onChange={handleChange} />
            </div>
            <div>
              <label className="modal-label" style={{ color: 'var(--danger)' }}>Alerta Final (Fundo Vermelho)</label>
              <textarea className="modal-input" name="technicalNoticeRed" rows="4" value={formData.technicalNoticeRed} onChange={handleChange} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="modal-label">Nome do Técnico (Assinatura)</label>
              <input type="text" className="modal-input" name="technicianName" value={formData.technicianName} onChange={handleChange} />
            </div>
            <div>
              <label className="modal-label">Registro do Técnico</label>
              <input type="text" className="modal-input" name="technicianRegister" value={formData.technicianRegister} onChange={handleChange} />
            </div>
          </div>

        </div>

        <div className="modal-footer" style={{ borderTop: '1px solid var(--border)' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleGenerate} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {loading ? 'Gerando...' : <><FileText size={16} /> Gerar PDF do Relatório</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportGeneratorModal;
