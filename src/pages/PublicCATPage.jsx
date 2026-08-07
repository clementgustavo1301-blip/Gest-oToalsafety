import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { AlertTriangle, Clock, CheckCircle, Copy, Download, Printer, ShieldCheck } from 'lucide-react';

const PublicCATPage = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [protocol, setProtocol] = useState('');
  
  const [formData, setFormData] = useState({
    company_name: '',
    company_cnpj: '',
    employee_name: '',
    employee_cpf: '',
    
    tp_cat: 'Inicial',
    tp_acid: 'Típico',
    a_data: '',
    a_hora: '',
    a_hrstrab: '',
    a_ultimodia: '',
    afast: 'Não',
    a_diasafast: '',
    a_retorno: '',
    obito: 'Não',
    a_dtobito: '',
    policia: 'Não',
    a_descricao: '',
    a_agente: '',
    a_natureza: '',
    
    l_tipo: '',
    l_cnpj_terceiro: '',
    l_rua: '',
    l_num: '',
    l_compl: '',
    l_bairro: '',
    l_cidade: '',
    l_uf: '',
    l_cep: '',
    l_especifico: '',
    
    p_parte: '',
    p_lateral: 'Não aplicável',
    p_outras: '',
    
    m_data: '',
    m_hora: '',
    m_unidade: '',
    m_unid_end: '',
    m_cnes: '',
    intern: 'Não',
    m_cid: '',
    m_diag: '',
    m_durtrat: '',
    m_desclesao: '',
    m_medico: '',
    m_crm: '',
    m_crmuf: ''
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const generateSummary = () => {
    let t = 'COMUNICAÇÃO DE ACIDENTE DE TRABALHO — COLETA DE DADOS\n';
    t += '======================================================\n\n';
    
    t += '01. DADOS DO ACIDENTE\n';
    t += `Tipo do acidente: ${formData.tp_acid}\n`;
    t += `Data: ${formData.a_data}\n`;
    t += `Hora: ${formData.a_hora}\n`;
    t += `Houve afastamento: ${formData.afast}\n`;
    if(formData.a_diasafast) t += `Dias de afastamento: ${formData.a_diasafast}\n`;
    if(formData.a_retorno) t += `Previsão de retorno: ${formData.a_retorno}\n`;
    t += `Houve óbito: ${formData.obito}\n`;
    if(formData.a_dtobito) t += `Data do óbito: ${formData.a_dtobito}\n`;
    t += `Registro policial: ${formData.policia}\n`;
    if(formData.a_descricao) t += `Situação geradora:\n${formData.a_descricao}\n`;

    t += '\n02. LOCAL DO ACIDENTE\n';
    t += `Tipo de local: ${formData.l_tipo}\n`;
    if(formData.l_cnpj_terceiro) t += `CNPJ do local de terceiros: ${formData.l_cnpj_terceiro}\n`;
    const end = [formData.l_rua, formData.l_num, formData.l_compl].filter(Boolean).join(', ');
    t += `Endereço: ${end}\n`;
    t += `Bairro: ${formData.l_bairro}\n`;
    t += `Cidade/UF: ${[formData.l_cidade, formData.l_uf].filter(Boolean).join('/')}\n`;
    t += `CEP: ${formData.l_cep}\n`;
    t += `Local específico: ${formData.l_especifico}\n`;

    t += '\n03. LESÃO\n';
    t += `Parte do corpo atingida: ${formData.p_parte}\n`;
    t += `Lateralidade: ${formData.p_lateral}\n`;
    if(formData.p_outras) t += `Outras partes/observações: ${formData.p_outras}\n`;

    t += '\n04. ATENDIMENTO MÉDICO\n';
    t += `Data do atendimento: ${formData.m_data}\n`;
    t += `Hora do atendimento: ${formData.m_hora}\n`;
    t += `Internação: ${formData.intern}\n`;
    t += `CID-10: ${formData.m_cid}\n`;
    t += `Duração provável do tratamento (dias): ${formData.m_durtrat}\n`;
    if(formData.m_desclesao) t += `Descrição da lesão: ${formData.m_desclesao}\n`;
    t += `Médico emitente: ${formData.m_medico}\n`;
    t += `CRM/UF: ${[formData.m_crm, formData.m_crmuf].filter(Boolean).join('-')}\n`;

    t += '\n------------------------------------------------------\n';
    t += `Formulário enviado em: ${new Date().toLocaleString('pt-BR')}\n`;
    t += 'Ecosafety Consultoria — Saúde e Segurança do Trabalho\n';
    return t;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateSummary());
    alert('Resumo copiado para a área de transferência!');
  };

  const handleDownload = () => {
    const text = generateSummary();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CAT_Formulario.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = { ...formData };
      
      // Parse integers
      payload.a_diasafast = payload.a_diasafast ? parseInt(payload.a_diasafast) : null;
      payload.m_durtrat = payload.m_durtrat ? parseInt(payload.m_durtrat) : null;
      
      // Parse dates (empty string must be null for Postgres)
      const dateFields = ['a_data', 'a_ultimodia', 'a_retorno', 'a_dtobito', 'm_data'];
      dateFields.forEach(field => {
        if (!payload[field]) {
          payload[field] = null;
        }
      });

      const { error: dbError } = await supabase
        .from('cat_records')
        .insert(payload);

      if (dbError) {
        console.error('Erro ao inserir no Supabase:', dbError);
        setError('Erro ao salvar no banco: ' + dbError.message);
        setLoading(false);
        return;
      }
      
      setSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error(err);
      setError('Ocorreu um erro ao enviar o formulário. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ backgroundColor: 'var(--background)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div className="card" style={{ maxWidth: '600px', width: '100%', padding: '3rem 2rem', textAlign: 'center' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#E8F5E9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <CheckCircle size={40} color="#2E7D32" />
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
            Formulário Enviado com Sucesso!
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: '1.6' }}>
            A equipe de SST da Ecosafety Consultoria recebeu os dados da CAT. 
            Em breve daremos andamento à transmissão.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            <button className="btn btn-secondary" onClick={handleCopy} style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
              <Copy size={16} /> Copiar Resumo TXT
            </button>
            <button className="btn btn-secondary" onClick={handleDownload} style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
              <Download size={16} /> Baixar Comprovante
            </button>
            <button className="btn btn-primary" onClick={() => window.print()} style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
              <Printer size={16} /> Imprimir Tela
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: 'var(--background)', minHeight: '100vh', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        
        {/* Header Public Form */}
        <header style={{ backgroundColor: 'var(--surface)', padding: '2.5rem', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '1.5rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'relative', zIndex: 2 }}>
            <p style={{ fontSize: '0.75rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: '700', marginBottom: '0.75rem' }}>
              Ecosafety Consultoria · Saúde e Segurança do Trabalho
            </p>
            <h1 style={{ fontSize: '1.875rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '1rem', lineHeight: '1.2' }}>
              Formulário de Coleta de Dados<br/>
              Comunicação de Acidente de Trabalho (CAT)
            </h1>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '700px', lineHeight: '1.6' }}>
              Preencha o formulário abaixo para envio imediato à equipe técnica. Estes dados são obrigatórios para a emissão da CAT e transmissão do evento S-2210 do eSocial. Campos marcados com * são indispensáveis.
            </p>
          </div>
          <div style={{ position: 'absolute', right: '-40px', top: '-40px', width: '220px', height: '220px', borderRadius: '50%', border: '24px solid rgba(var(--primary-rgb), 0.05)', zIndex: 1 }}></div>
        </header>

        {/* Warning */}
        <div style={{ backgroundColor: '#FFF4E5', borderLeft: '4px solid #FF9800', padding: '1.25rem 1.5rem', borderRadius: '0 8px 8px 0', display: 'flex', gap: '1.25rem', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <Clock size={24} color="#E65100" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h4 style={{ color: '#E65100', fontWeight: '700', fontSize: '0.9375rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>
              Prazo legal de comunicação (S-2210)
            </h4>
            <p style={{ color: '#5D4037', fontSize: '0.9375rem', lineHeight: '1.5', margin: 0 }}>
              Até o <b>primeiro dia útil seguinte</b> ao acidente (Lei 8.213/91, art. 22). Em caso de <b>óbito, a comunicação é imediata</b>. Envie este formulário no mesmo dia da ocorrência, ainda que com campos pendentes — o complemento pode ser feito depois.
            </p>
          </div>
        </div>

        {error && (
          <div style={{ backgroundColor: 'var(--error-light)', color: 'var(--error)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={20} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* BLOCO 01: Dados do acidente */}
          <section className="card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
              <span style={{ backgroundColor: 'var(--primary)', color: 'white', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700' }}>01</span>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>Dados do Acidente</h2>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
              <div>
                <label className="modal-label">Tipo do Acidente <span style={{color: 'var(--error)'}}>*</span></label>
                <select className="modal-input" name="tp_acid" value={formData.tp_acid} onChange={handleChange} required>
                  <option>Típico</option>
                  <option>Trajeto</option>
                  <option>Doença ocupacional</option>
                </select>
              </div>
              <div>
                <label className="modal-label">Data do Acidente <span style={{color: 'var(--error)'}}>*</span></label>
                <input type="date" className="modal-input" name="a_data" value={formData.a_data} onChange={handleChange} required />
              </div>
              <div>
                <label className="modal-label">Hora do Acidente <span style={{color: 'var(--error)'}}>*</span></label>
                <input type="time" className="modal-input" name="a_hora" value={formData.a_hora} onChange={handleChange} required />
              </div>
              <div>
                <label className="modal-label">Houve Afastamento? <span style={{color: 'var(--error)'}}>*</span></label>
                <select className="modal-input" name="afast" value={formData.afast} onChange={handleChange} required>
                  <option>Não</option>
                  <option>Sim</option>
                </select>
              </div>
              <div>
                <label className="modal-label">Dias Afastamento</label>
                <input type="number" min="0" className="modal-input" name="a_diasafast" value={formData.a_diasafast} onChange={handleChange} />
              </div>
              <div>
                <label className="modal-label">Houve Óbito? <span style={{color: 'var(--error)'}}>*</span></label>
                <select className="modal-input" name="obito" value={formData.obito} onChange={handleChange} required>
                  <option>Não</option>
                  <option>Sim</option>
                </select>
              </div>
              <div>
                <label className="modal-label">Data Óbito</label>
                <input type="date" className="modal-input" name="a_dtobito" value={formData.a_dtobito} onChange={handleChange} />
              </div>
            </div>

            <div>
              <label className="modal-label">Descrição da situação geradora do acidente <span style={{color: 'var(--error)'}}>*</span></label>
              <textarea className="modal-input" style={{ minHeight: '80px', resize: 'vertical' }} name="a_descricao" value={formData.a_descricao} onChange={handleChange} required placeholder="Relate objetivamente o que o trabalhador fazia, o que aconteceu e o que provocou a lesão..."></textarea>
            </div>
          </section>

          {/* BLOCO 02: Local */}
          <section className="card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
              <span style={{ backgroundColor: 'var(--primary)', color: 'white', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700' }}>02</span>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>Local do Acidente</h2>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
              <div>
                <label className="modal-label">Tipo de Local <span style={{color: 'var(--error)'}}>*</span></label>
                <select className="modal-input" name="l_tipo" value={formData.l_tipo} onChange={handleChange} required>
                  <option value="">Selecione...</option>
                  <option>Estabelecimento do próprio empregador</option>
                  <option>Estabelecimento de terceiros onde presta serviço</option>
                  <option>Via pública</option>
                  <option>Área rural</option>
                  <option>Embarcação</option>
                  <option>Outros</option>
                </select>
              </div>
              <div>
                <label className="modal-label">CNPJ Terceiros</label>
                <input type="text" className="modal-input" name="l_cnpj_terceiro" value={formData.l_cnpj_terceiro} onChange={handleChange} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="modal-label">Logradouro <span style={{color: 'var(--error)'}}>*</span></label>
                <input type="text" className="modal-input" name="l_rua" value={formData.l_rua} onChange={handleChange} required />
              </div>
              <div>
                <label className="modal-label">Número <span style={{color: 'var(--error)'}}>*</span></label>
                <input type="text" className="modal-input" name="l_num" value={formData.l_num} onChange={handleChange} required />
              </div>
              <div>
                <label className="modal-label">Complemento</label>
                <input type="text" className="modal-input" name="l_compl" value={formData.l_compl} onChange={handleChange} />
              </div>
              <div>
                <label className="modal-label">Bairro <span style={{color: 'var(--error)'}}>*</span></label>
                <input type="text" className="modal-input" name="l_bairro" value={formData.l_bairro} onChange={handleChange} required />
              </div>
              <div>
                <label className="modal-label">Cidade <span style={{color: 'var(--error)'}}>*</span></label>
                <input type="text" className="modal-input" name="l_cidade" value={formData.l_cidade} onChange={handleChange} required />
              </div>
              <div>
                <label className="modal-label">UF <span style={{color: 'var(--error)'}}>*</span></label>
                <input type="text" className="modal-input" name="l_uf" value={formData.l_uf} onChange={handleChange} required />
              </div>
              <div>
                <label className="modal-label">CEP <span style={{color: 'var(--error)'}}>*</span></label>
                <input type="text" className="modal-input" name="l_cep" value={formData.l_cep} onChange={handleChange} required />
              </div>
            </div>
            <div>
              <label className="modal-label">Local específico dentro do estabelecimento <span style={{color: 'var(--error)'}}>*</span></label>
              <input type="text" className="modal-input" name="l_especifico" value={formData.l_especifico} onChange={handleChange} required placeholder="Ex: pátio de estocagem, rampa de acesso..." />
            </div>
          </section>

          {/* BLOCO 03: Lesão */}
          <section className="card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
              <span style={{ backgroundColor: 'var(--primary)', color: 'white', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700' }}>03</span>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>Lesão (Parte Atingida)</h2>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
              <div>
                <label className="modal-label">Parte do corpo atingida <span style={{color: 'var(--error)'}}>*</span></label>
                <input type="text" className="modal-input" name="p_parte" value={formData.p_parte} onChange={handleChange} required placeholder="Ex: Dedo da Mão, Olho, Tornozelo..." />
              </div>
              <div>
                <label className="modal-label">Lateralidade <span style={{color: 'var(--error)'}}>*</span></label>
                <select className="modal-input" name="p_lateral" value={formData.p_lateral} onChange={handleChange} required>
                  <option>Esquerdo</option>
                  <option>Direito</option>
                  <option>Ambos</option>
                  <option>Não aplicável</option>
                </select>
              </div>
            </div>
            <div>
              <label className="modal-label">Outras partes atingidas / observações</label>
              <textarea className="modal-input" style={{ minHeight: '60px', resize: 'vertical' }} name="p_outras" value={formData.p_outras} onChange={handleChange}></textarea>
            </div>
          </section>

          {/* BLOCO 04: Atendimento */}
          <section className="card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
              <span style={{ backgroundColor: 'var(--primary)', color: 'white', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700' }}>04</span>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>Atendimento Médico e Atestado</h2>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
              <div>
                <label className="modal-label">Data do Atendimento <span style={{color: 'var(--error)'}}>*</span></label>
                <input type="date" className="modal-input" name="m_data" value={formData.m_data} onChange={handleChange} required />
              </div>
              <div>
                <label className="modal-label">Hora do Atendimento</label>
                <input type="time" className="modal-input" name="m_hora" value={formData.m_hora} onChange={handleChange} />
              </div>
              <div>
                <label className="modal-label">Houve Internação? <span style={{color: 'var(--error)'}}>*</span></label>
                <select className="modal-input" name="intern" value={formData.intern} onChange={handleChange} required>
                  <option>Não</option>
                  <option>Sim</option>
                </select>
              </div>
              <div>
                <label className="modal-label">CID-10 <span style={{color: 'var(--error)'}}>*</span></label>
                <input type="text" className="modal-input" name="m_cid" value={formData.m_cid} onChange={handleChange} required placeholder="Ex: S62.6" />
              </div>
              <div>
                <label className="modal-label">Duração Tratamento (dias)</label>
                <input type="number" min="0" className="modal-input" name="m_durtrat" value={formData.m_durtrat} onChange={handleChange} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="modal-label">Nome do Médico Emitente <span style={{color: 'var(--error)'}}>*</span></label>
                <input type="text" className="modal-input" name="m_medico" value={formData.m_medico} onChange={handleChange} required />
              </div>
              <div>
                <label className="modal-label">CRM <span style={{color: 'var(--error)'}}>*</span></label>
                <input type="text" className="modal-input" name="m_crm" value={formData.m_crm} onChange={handleChange} required />
              </div>
              <div>
                <label className="modal-label">UF do CRM <span style={{color: 'var(--error)'}}>*</span></label>
                <input type="text" className="modal-input" name="m_crmuf" value={formData.m_crmuf} onChange={handleChange} required />
              </div>
            </div>
          </section>

          <div style={{ position: 'sticky', bottom: 0, padding: '1.5rem', backgroundColor: 'var(--surface)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', zIndex: 10, borderRadius: '8px', boxShadow: '0 -4px 12px rgba(0,0,0,0.05)' }}>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={loading}
              style={{ padding: '0.875rem 2rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <ShieldCheck size={20} />
              {loading ? 'Processando e Enviando...' : 'Assinar e Transmitir CAT'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default PublicCATPage;
