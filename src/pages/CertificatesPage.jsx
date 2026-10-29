import React, { useState, useEffect } from 'react';
import { Award, FileText, Plus, Trash2, Download, Loader, Save, Database, Check, AlertCircle, Copy, X } from 'lucide-react';
import { generateCertificatePPTX } from '../utils/pptxGenerator';
import { getCustomTrainings, saveCustomTraining, deleteCustomTraining } from '../services/storageService';

const CertificatesPage = () => {
  const [formData, setFormData] = useState({
    nr: 'NR - 06',
    descricao: 'Sobre uso e guarda de EPI conforme exigências da Norma Regulamentadora - NR 06',
    data: '',
    local: '',
    empresa: '',
    duracao: '1 hora',
    instrutorNome: '',
    instrutorCargo: '',
    instrutorRegistro: '',
    conteudo: 'a) descrição do equipamento e seus componentes;\nb) risco ocupacional contra o qual o EPI oferece proteção;\nc) restrições e limitações de proteção;\nd) forma adequada de uso e ajuste;\ne) manutenção e substituição; e\nf) cuidados de limpeza, higienização, guarda e conservação.',
  });

  const [colaboradores, setColaboradores] = useState([
    { nome: '', cpf: '' }
  ]);

  const [generating, setGenerating] = useState(false);
  const [isManual, setIsManual] = useState(false);

  // Estados dos treinamentos personalizados (Banco de Dados)
  const [customTrainings, setCustomTrainings] = useState([]);
  const [loadingCustomTrainings, setLoadingCustomTrainings] = useState(true);
  const [savingCustomTraining, setSavingCustomTraining] = useState(false);
  const [selectedCustomId, setSelectedCustomId] = useState(null);
  const [saveFeedback, setSaveFeedback] = useState('');
  const [tableMissingWarning, setTableMissingWarning] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const sqlScriptContent = `-- Execute no SQL Editor do Supabase para criar a tabela de treinamentos
CREATE TABLE IF NOT EXISTS public.custom_trainings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    duracao TEXT,
    conteudo TEXT,
    descricao TEXT,
    instrutor_nome TEXT,
    instrutor_cargo TEXT,
    instrutor_registro TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.custom_trainings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all" ON public.custom_trainings FOR SELECT USING (true);
CREATE POLICY "Enable insert for all" ON public.custom_trainings FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all" ON public.custom_trainings FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all" ON public.custom_trainings FOR DELETE USING (true);
NOTIFY pgrst, 'reload schema';`;

  // Carrega treinamentos personalizados do banco de dados na montagem
  const loadCustomTrainingsList = async () => {
    setLoadingCustomTrainings(true);
    try {
      const { trainings, tableMissing } = await getCustomTrainings();
      setCustomTrainings(trainings || []);
      if (tableMissing) {
        setTableMissingWarning(true);
      } else {
        setTableMissingWarning(false);
      }
    } catch (err) {
      console.error('Erro ao carregar treinamentos personalizados:', err);
    } finally {
      setLoadingCustomTrainings(false);
    }
  };

  useEffect(() => {
    loadCustomTrainingsList();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleColabChange = (index, field, value) => {
    setColaboradores(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addColaborador = () => {
    setColaboradores(prev => [...prev, { nome: '', cpf: '' }]);
  };

  const removeColaborador = (index) => {
    if (colaboradores.length <= 1) return;
    setColaboradores(prev => prev.filter((_, i) => i !== index));
  };

  const nrOptions = [
    { value: 'NR - 01', label: 'NR-01 - Disposições Gerais' },
    { value: 'NR - 05', label: 'NR-05 - CIPA' },
    { value: 'NR - 06', label: 'NR-06 - EPI' },
    { value: 'NR - 10', label: 'NR-10 - Segurança em Instalações Elétricas' },
    { value: 'NR - 11', label: 'NR-11 - Transporte e Movimentação de Materiais' },
    { value: 'NR - 12', label: 'NR-12 - Segurança em Máquinas e Equipamentos' },
    { value: 'NR - 18', label: 'NR-18 - Indústria da Construção' },
    { value: 'NR - 20', label: 'NR-20 - Inflamáveis e Combustíveis' },
    { value: 'NR - 33', label: 'NR-33 - Espaços Confinados' },
    { value: 'NR - 35', label: 'NR-35 - Trabalho em Altura' },
  ];

  const conteudoSugestoes = {
    'NR - 01': 'a) direitos e deveres do empregado e empregador;\nb) riscos ocupacionais e medidas de prevenção;\nc) classificação dos fatores de risco;\nd) noções sobre acidentes e doenças do trabalho;\ne) procedimentos em situações de emergência.',
    'NR - 05': '1. Riscos do ambiente e condições de trabalho / acidentes e doenças ocupacionais / medidas de prevenção / metodologia de análise de acidentes e doenças / higiene do trabalho\n2. Noções de legislações trabalhista e previdenciária de SST / inclusão de pessoas com deficiência e reabilitados\n3. Organização e funcionamento da CIPA\n4. Prevenção e combate ao assédio sexual e a outras formas de violência no trabalho',
    'NR - 06': '1. O que é EPI\n2. Responsabilidades do empregador, trabalhador e fornecedor\n3. Riscos ambientais / Tipos de EPIs\n4. Ficha de controle / Uso correto\n5. Higienização e manutenção',
    'NR - 10': 'a) introdução à segurança com eletricidade;\nb) riscos em instalações e serviços com eletricidade;\nc) técnicas de análise de risco;\nd) medidas de controle do risco elétrico;\ne) equipamentos de proteção coletiva e individual;\nf) rotinas de trabalho e procedimentos.',
    'NR - 11': 'a) tipos de equipamentos de transporte;\nb) procedimentos de segurança na movimentação de materiais;\nc) operação segura de equipamentos;\nd) sinalização;\ne) manutenção preventiva.',
    'NR - 12': '1. Riscos e proteções\n2. Funcionamento das proteções\n3. Como e em que circunstâncias uma proteção pode ser removida, e por quem\n4. O que fazer se uma proteção foi danificada ou perdeu sua função\n5. Princípios de segurança\n6. Segurança para riscos mecânicos, elétricos e outros relevantes\n7. Método de trabalho seguro\n8. Permissão de trabalho\n9. Sistema de bloqueio',
    'NR - 18': '1. Condições e meio ambiente de trabalho / riscos inerentes às atividades desenvolvidas\n2. Equipamentos e proteção coletiva existentes\n3. Uso adequado dos EPI / PGR da obra',
    'NR - 20': 'a) inflamáveis: características e propriedades;\nb) controle coletivo e individual;\nc) fontes de ignição e seu controle;\nd) proteção contra incêndio;\ne) procedimentos em situações de emergência.',
    'NR - 33': 'a) definição de espaço confinado;\nb) reconhecimento, avaliação e controle de riscos;\nc) funcionamento de equipamentos de medição;\nd) procedimentos e utilização da PET;\ne) noções de resgate e primeiros socorros.',
    'NR - 35': 'a) normas e regulamentos aplicáveis;\nb) análise de risco e condições impeditivas;\nc) riscos potenciais inerentes e medidas de prevenção;\nd) sistemas, equipamentos e procedimentos de proteção coletiva;\ne) EPI – seleção, inspeção, conservação e limitação de uso;\nf) acidentes típicos em trabalhos em altura.',
  };

  const descricoes = {
    'NR - 01': 'Sobre Disposições Gerais e Gerenciamento de Riscos Ocupacionais conforme exigências da Norma Regulamentadora - NR 01',
    'NR - 05': 'Sobre Comissão Interna de Prevenção de Acidentes conforme exigências da Norma Regulamentadora - NR 05',
    'NR - 06': 'Sobre uso e guarda de EPI conforme exigências da Norma Regulamentadora - NR 06',
    'NR - 10': 'Sobre Segurança em Instalações e Serviços em Eletricidade conforme exigências da Norma Regulamentadora - NR 10',
    'NR - 11': 'Sobre Transporte, Movimentação, Armazenagem e Manuseio de Materiais conforme exigências da Norma Regulamentadora - NR 11',
    'NR - 12': 'Sobre Segurança no Trabalho em Máquinas e Equipamentos conforme exigências da Norma Regulamentadora - NR 12',
    'NR - 18': 'Sobre Condições e Meio Ambiente de Trabalho na Indústria da Construção conforme exigências da Norma Regulamentadora - NR 18',
    'NR - 20': 'Sobre Segurança e Saúde no Trabalho com Inflamáveis e Combustíveis conforme exigências da Norma Regulamentadora - NR 20',
    'NR - 33': 'Sobre Segurança e Saúde nos Trabalhos em Espaços Confinados conforme exigências da Norma Regulamentadora - NR 33',
    'NR - 35': 'Sobre Trabalho em Altura conforme exigências da Norma Regulamentadora - NR 35',
  };

  const duracoes = {
    'NR - 01': 'A critério da empresa',
    'NR - 05': '8 horas (GR 1) / 12 horas (GR 2) / 16 horas (GR 3) / 20 horas (GR 4)',
    'NR - 06': 'A critério da empresa',
    'NR - 10': '40 horas',
    'NR - 11': 'A critério da empresa',
    'NR - 12': 'A critério da empresa (8h para injetoras)',
    'NR - 18': '4 horas',
    'NR - 20': '4 a 32 horas (depende da classe da instalação)',
    'NR - 33': '16 horas',
    'NR - 35': '8 horas',
  };

  const handleNrChange = (e) => {
    const selected = e.target.value;

    // Se for um treinamento personalizado do banco
    if (selected.startsWith('custom:')) {
      const idOrName = selected.replace('custom:', '');
      const found = customTrainings.find(t => (t.id && String(t.id) === idOrName) || t.name === idOrName);

      if (found) {
        setIsManual(true);
        setSelectedCustomId(found.id || found.name);
        setFormData(prev => ({
          ...prev,
          nr: found.name,
          descricao: found.descricao || prev.descricao,
          conteudo: found.conteudo || prev.conteudo,
          duracao: found.duracao || prev.duracao,
          instrutorNome: found.instrutor_nome || prev.instrutorNome,
          instrutorCargo: found.instrutor_cargo || prev.instrutorCargo,
          instrutorRegistro: found.instrutor_registro || prev.instrutorRegistro
        }));
        setSaveFeedback(`Carregado: ${found.name}`);
        setTimeout(() => setSaveFeedback(''), 3000);
        return;
      }
    }

    if (selected === 'manual') {
      setIsManual(true);
      setSelectedCustomId(null);
      setFormData(prev => ({ ...prev, nr: '' }));
      return;
    }

    setIsManual(false);
    setSelectedCustomId(null);
    if (!selected) return;

    setFormData(prev => ({
      ...prev,
      nr: selected,
      descricao: descricoes[selected] || prev.descricao,
      conteudo: conteudoSugestoes[selected] || prev.conteudo,
      duracao: duracoes[selected] || prev.duracao
    }));
  };

  // Salva explicitamente o treinamento no banco de dados
  const handleSaveToDatabase = async () => {
    if (!formData.nr || !formData.nr.trim()) {
      alert('Informe o Nome do Treinamento antes de salvar no banco.');
      return;
    }

    setSavingCustomTraining(true);
    try {
      const res = await saveCustomTraining({
        name: formData.nr.trim(),
        duracao: formData.duracao,
        conteudo: formData.conteudo,
        descricao: formData.descricao,
        instrutorNome: formData.instrutorNome,
        instrutorCargo: formData.instrutorCargo,
        instrutorRegistro: formData.instrutorRegistro
      });

      await loadCustomTrainingsList();
      setSelectedCustomId(res.data?.id || formData.nr.trim());
      setSaveFeedback('✅ Treinamento salvo no banco de dados com sucesso!');
      setTimeout(() => setSaveFeedback(''), 4000);
    } catch (err) {
      console.error('Erro ao salvar treinamento:', err);
      alert('Erro ao salvar treinamento: ' + err.message);
    } finally {
      setSavingCustomTraining(false);
    }
  };

  // Exclui um treinamento personalizado
  const handleDeleteCustomTraining = async () => {
    if (!selectedCustomId && !formData.nr) return;
    const nameToDel = formData.nr || 'este treinamento';
    
    if (!window.confirm(`Deseja realmente excluir "${nameToDel}" do banco de dados?`)) {
      return;
    }

    try {
      await deleteCustomTraining(selectedCustomId, formData.nr);
      await loadCustomTrainingsList();
      setIsManual(false);
      setSelectedCustomId(null);
      setFormData(prev => ({
        ...prev,
        nr: 'NR - 06',
        descricao: descricoes['NR - 06'],
        conteudo: conteudoSugestoes['NR - 06'],
        duracao: duracoes['NR - 06']
      }));
      setSaveFeedback('🗑️ Treinamento removido do banco.');
      setTimeout(() => setSaveFeedback(''), 3000);
    } catch (err) {
      alert('Erro ao excluir: ' + err.message);
    }
  };

  const handleGenerate = async () => {
    const validColabs = colaboradores.filter(c => c.nome.trim());
    if (validColabs.length === 0) {
      alert('Adicione pelo menos um colaborador com nome preenchido.');
      return;
    }
    if (!formData.data) {
      alert('Preencha a data do treinamento.');
      return;
    }

    // Se for personalizado e tiver nome preenchido, garante que fique salvo no banco de dados
    if (isManual && formData.nr && formData.nr.trim()) {
      saveCustomTraining({
        name: formData.nr.trim(),
        duracao: formData.duracao,
        conteudo: formData.conteudo,
        descricao: formData.descricao,
        instrutorNome: formData.instrutorNome,
        instrutorCargo: formData.instrutorCargo,
        instrutorRegistro: formData.instrutorRegistro
      }).then(() => loadCustomTrainingsList()).catch(e => console.warn('Erro ao salvar em background:', e));
    }

    setGenerating(true);
    try {
      const blob = await generateCertificatePPTX({
        ...formData,
        colaboradores: validColabs
      });
      
      // Download the file
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Certificados_${(formData.nr || 'Treinamento').replace(/\s/g, '_')}_${formData.empresa || 'Empresa'}.pptx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro ao gerar certificados:', err);
      alert('Erro ao gerar o arquivo: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const copySqlCode = () => {
    navigator.clipboard.writeText(sqlScriptContent);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const validCount = colaboradores.filter(c => c.nome.trim()).length;

  // Determina o valor atual do select
  let currentSelectValue = 'manual';
  if (!isManual && nrOptions.some(opt => opt.value === formData.nr)) {
    currentSelectValue = formData.nr;
  } else if (selectedCustomId) {
    currentSelectValue = `custom:${selectedCustomId}`;
  } else if (customTrainings.some(t => t.name === formData.nr)) {
    const match = customTrainings.find(t => t.name === formData.nr);
    currentSelectValue = `custom:${match.id || match.name}`;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <FileText size={28} color="var(--primary)" />
          Gerador de Certificados SST
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
          Gera o arquivo PPTX timbrado com logo e layout padrão TotalSafety. Salve treinamentos personalizados diretamente no banco de dados para reutilizá-los a qualquer momento.
        </p>
      </div>

      {/* Aviso de Tabela SQL pendente no Supabase (se necessário) */}
      {tableMissingWarning && (
        <div style={{
          backgroundColor: '#eff6ff',
          border: '1px solid #93c5fd',
          borderRadius: 'var(--radius-md)',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertCircle size={20} color="#2563eb" />
            <div style={{ fontSize: '0.875rem', color: '#1e3a8a' }}>
              <strong>Sincronização em nuvem:</strong> Seus treinamentos estão sendo salvos com segurança neste navegador. Para habilitar o compartilhamento em tempo real com todos os usuários via Supabase, execute o script SQL da tabela.
            </div>
          </div>
          <button 
            type="button" 
            onClick={() => setShowSqlModal(true)} 
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
          >
            <Database size={14} /> Ver Script SQL
          </button>
        </div>
      )}

      {/* Dados do Treinamento */}
      <div className="card" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
            <Award size={22} className="text-primary" />
            Dados do Treinamento
          </h2>

          {/* Feedback badge */}
          {saveFeedback && (
            <div style={{ 
              backgroundColor: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0',
              padding: '0.35rem 0.85rem', borderRadius: '20px', fontSize: '0.825rem', fontWeight: '600',
              display: 'flex', alignItems: 'center', gap: '0.4rem'
            }}>
              <Check size={14} /> {saveFeedback}
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
          <div>
            <label className="modal-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>NR ou Nome do Treinamento</span>
              {loadingCustomTrainings ? (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Loader size={12} className="spin" /> Carregando banco...
                </span>
              ) : customTrainings.length > 0 ? (
                <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: '600' }}>
                  {customTrainings.length} salvo(s) no banco
                </span>
              ) : null}
            </label>
            <select 
              onChange={handleNrChange} 
              className="modal-input" 
              value={currentSelectValue}
            >
              <option value="" disabled>-- Selecione uma opção --</option>
              
              <optgroup label="📋 Normas Regulamentadoras (NRs Padrão)">
                {nrOptions.map(nr => <option key={nr.value} value={nr.value}>{nr.label}</option>)}
              </optgroup>

              {customTrainings.length > 0 && (
                <optgroup label="💾 Treinamentos Salvos no Banco de Dados">
                  {customTrainings.map(t => (
                    <option key={t.id || t.name} value={`custom:${t.id || t.name}`}>
                      {t.name} {t.duracao ? `• (${t.duracao})` : ''}
                    </option>
                  ))}
                </optgroup>
              )}

              <optgroup label="➕ Personalizado">
                <option value="manual">Outros / Cadastrar Novo Treinamento</option>
              </optgroup>
            </select>
          </div>

          {isManual && (
            <div>
              <label className="modal-label">
                Nome do Treinamento <span style={{color:'var(--error)'}}>*</span>
              </label>
              <input 
                type="text" 
                name="nr" 
                value={formData.nr} 
                onChange={handleChange} 
                className="modal-input" 
                placeholder="Ex: Treinamento de Primeiros Socorros"
              />
            </div>
          )}

          <div>
            <label className="modal-label">Data do Treinamento <span style={{color:'var(--error)'}}>*</span></label>
            <input type="date" name="data" value={formData.data} onChange={handleChange} className="modal-input" />
          </div>

          <div>
            <label className="modal-label">Local <span style={{color:'var(--error)'}}>*</span></label>
            <input type="text" name="local" value={formData.local} onChange={handleChange} className="modal-input" placeholder="Ex: Canteiro De Obras" />
          </div>

          <div>
            <label className="modal-label">Empresa <span style={{color:'var(--error)'}}>*</span></label>
            <input type="text" name="empresa" value={formData.empresa} onChange={handleChange} className="modal-input" placeholder="Ex: MVP Engenharia LTDA" />
          </div>

          <div>
            <label className="modal-label">Carga Horária</label>
            <input type="text" name="duracao" value={formData.duracao} onChange={handleChange} className="modal-input" placeholder="Ex: 8 horas" />
          </div>

          <div>
            <label className="modal-label">Nome do Instrutor</label>
            <input type="text" name="instrutorNome" value={formData.instrutorNome} onChange={handleChange} className="modal-input" />
          </div>

          <div>
            <label className="modal-label">Cargo do Instrutor</label>
            <input type="text" name="instrutorCargo" value={formData.instrutorCargo} onChange={handleChange} className="modal-input" />
          </div>

          <div>
            <label className="modal-label">Registro do Instrutor</label>
            <input type="text" name="instrutorRegistro" value={formData.instrutorRegistro} onChange={handleChange} className="modal-input" />
          </div>
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <label className="modal-label">Descrição do Treinamento (texto do certificado)</label>
          <input 
            type="text" 
            name="descricao" 
            value={formData.descricao} 
            onChange={handleChange} 
            className="modal-input" 
            placeholder="Ex: Sobre capacitação em Primeiros Socorros conforme exigências normativas..."
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label className="modal-label">Conteúdo Programático</label>
          <textarea 
            name="conteudo" 
            value={formData.conteudo} 
            onChange={handleChange} 
            className="modal-input" 
            rows="5" 
            style={{ resize: 'vertical' }}
            placeholder="Ex: a) Introdução e conceitos básicos;&#10;b) Avaliação inicial da vítima;&#10;c) Procedimentos em caso de paradas cardiorrespiratórias..."
          ></textarea>
        </div>

        {/* Barra de Ações para Treinamentos Personalizados (Salvar / Excluir no Banco) */}
        {isManual && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem',
            backgroundColor: 'var(--background)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              <Database size={16} color="var(--primary)" />
              <span>
                {selectedCustomId 
                  ? 'Este treinamento está salvo no banco. Você pode atualizá-lo ou excluí-lo.' 
                  : 'Ao salvar, o nome, carga horária, conteúdo e descrição ficarão gravados no banco de dados.'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {selectedCustomId && (
                <button
                  type="button"
                  onClick={handleDeleteCustomTraining}
                  className="btn"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.375rem',
                    color: 'var(--error)', border: '1px solid var(--error)',
                    fontSize: '0.85rem', padding: '0.45rem 0.9rem', backgroundColor: 'transparent'
                  }}
                  title="Excluir este treinamento do banco de dados"
                >
                  <Trash2 size={15} /> Excluir do Banco
                </button>
              )}

              <button
                type="button"
                onClick={handleSaveToDatabase}
                disabled={savingCustomTraining || !formData.nr.trim()}
                className="btn btn-primary"
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  fontSize: '0.875rem', padding: '0.45rem 1.15rem'
                }}
              >
                {savingCustomTraining ? (
                  <><Loader size={16} className="spin" /> Salvando...</>
                ) : (
                  <><Save size={16} /> Salvar no Banco de Dados</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Lista de Colaboradores */}
      <div className="card" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
            Colaboradores ({colaboradores.length})
          </h2>
          <button onClick={addColaborador} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
            <Plus size={16} /> Adicionar
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {colaboradores.map((colab, i) => (
            <div key={i} style={{ 
              display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1rem', alignItems: 'end',
              padding: '1rem', backgroundColor: 'var(--background)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)'
            }}>
              <div>
                <label className="modal-label" style={{ fontSize: '0.75rem' }}>Nome do Colaborador #{i + 1}</label>
                <input 
                  type="text" value={colab.nome} 
                  onChange={(e) => handleColabChange(i, 'nome', e.target.value)} 
                  className="modal-input" placeholder="Nome completo"
                />
              </div>
              <div>
                <label className="modal-label" style={{ fontSize: '0.75rem' }}>CPF</label>
                <input 
                  type="text" value={colab.cpf} 
                  onChange={(e) => handleColabChange(i, 'cpf', e.target.value)} 
                  className="modal-input" placeholder="000.000.000-00"
                />
              </div>
              <button 
                onClick={() => removeColaborador(i)} 
                disabled={colaboradores.length <= 1}
                style={{ 
                  background: 'none', border: 'none', cursor: colaboradores.length > 1 ? 'pointer' : 'not-allowed', 
                  color: colaboradores.length > 1 ? 'var(--error)' : 'var(--border)',
                  padding: '0.5rem', marginBottom: '0.25rem'
                }}
                title="Remover colaborador"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Botão de Gerar */}
      <div className="card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          {validCount > 0 ? (
            <span>✅ <strong>{validCount}</strong> colaborador(es) → <strong>{validCount * 4}</strong> páginas serão geradas no PPTX timbrado</span>
          ) : (
            <span>⚠️ Preencha ao menos um colaborador para gerar</span>
          )}
        </div>
        <button 
          onClick={handleGenerate} 
          className="btn btn-primary" 
          disabled={generating || validCount === 0 || !formData.data || (!formData.nr || !formData.nr.trim())}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', padding: '0.75rem 2rem' }}
        >
          {generating ? (
            <><Loader size={18} className="spin" /> Gerando PPTX...</>
          ) : (
            <><Download size={18} /> Baixar PPTX</>
          )}
        </button>
      </div>

      {/* Modal Script SQL Supabase */}
      {showSqlModal && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem'
        }}>
          <div className="card" style={{ maxWidth: '650px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <Database size={20} color="var(--primary)" /> Criar Tabela no Supabase
              </h3>
              <button onClick={() => setShowSqlModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem', lineHeight: '1.5' }}>
              Para que os treinamentos fiquem sincronizados na nuvem entre todos os dispositivos, copie o código abaixo e execute no <strong>SQL Editor</strong> do seu painel do Supabase:
            </p>

            <pre style={{
              backgroundColor: '#1e293b', color: '#f8fafc', padding: '1rem', borderRadius: 'var(--radius-md)',
              fontSize: '0.8rem', overflowX: 'auto', marginBottom: '1.25rem', fontFamily: 'monospace'
            }}>
              {sqlScriptContent}
            </pre>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button 
                type="button" 
                onClick={() => setShowSqlModal(false)} 
                className="btn btn-secondary"
              >
                Fechar
              </button>
              <button 
                type="button" 
                onClick={copySqlCode} 
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                {copiedSql ? <><Check size={16} /> Copiado!</> : <><Copy size={16} /> Copiar SQL</>}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CertificatesPage;
