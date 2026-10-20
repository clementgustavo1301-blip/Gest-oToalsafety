import React, { useState, useEffect, useRef } from 'react';
import { 
  Award, FileText, Plus, Trash2, Download, Loader, 
  Upload, CheckCircle2, AlertCircle, Users, Sparkles, 
  HelpCircle, ClipboardCopy, RefreshCw, Layers, Link as LinkIcon,
  Copy, Check, ExternalLink, Calendar, Search, Filter,
  Edit, Key, ShieldCheck, ChevronRight, UserCheck, X, User,
  Eye, CheckCircle, Clock, BookOpen, Briefcase, MapPin, Building
} from 'lucide-react';
import { generateTrainingPPTX } from '../utils/trainingPptxGenerator';
import { formatCpf } from '../services/cpfService';
import { getProfiles, getCompanies, getGroups } from '../services/storageService';
import { 
  getTrainingClasses, saveTrainingClass, deleteTrainingClass,
  getTrainingEnrollments, updateStudent, deleteStudent, subscribeToEnrollments 
} from '../services/trainingClassesService';

const DEFAULT_API_TOKEN = '5ae973d7a997af13f0aaf2bf60e65803';

// Presets completos e inteligentes de Treinamentos Oficiais SST / NRs
const COURSE_PRESETS = [
  {
    category: 'Normas Regulamentadoras (NRs)',
    name: 'NR-35 Trabalho em Altura',
    duration: '8 horas',
    content: '1. Normas e regulamentações aplicáveis ao trabalho em altura (NR-35)\n2. Análise de Risco e condições impeditivas\n3. Sistemas, equipamentos e procedimentos de proteção coletiva e individual\n4. EPIs para trabalho em altura: seleção, inspeção, conservação e limitação de uso\n5. Condutas em situações de emergência e noções de primeiros socorros'
  },
  {
    category: 'Normas Regulamentadoras (NRs)',
    name: 'NR-06 Equipamentos de Proteção Individual',
    duration: '4 horas',
    content: '1. Disposições gerais e exigências da Norma Regulamentadora NR-06\n2. Direitos e deveres do empregador e do trabalhador\n3. Tipos de EPIs e seleção adequada para cada risco operacional\n4. Procedimentos de inspeção, higienização, guarda e conservação periódica\n5. Critérios técnicos para substituição e descarte responsável'
  },
  {
    category: 'Normas Regulamentadoras (NRs)',
    name: 'NR-10 Segurança em Instalações e Serviços em Eletricidade',
    duration: '40 horas',
    content: '1. Introdução à segurança com eletricidade e riscos em instalações elétricas\n2. Técnicas de Análise de Risco no setor elétrico\n3. Medidas de controle do risco elétrico (desenergização, aterramento, barreiras)\n4. Normas Técnicas Brasileiras (NBR da ABNT e NR-10)\n5. Primeiros socorros e combate a princípios de incêndios com eletricidade'
  },
  {
    category: 'Normas Regulamentadoras (NRs)',
    name: 'NR-10 SEP Sistema Elétrico de Potência',
    duration: '40 horas',
    content: '1. Organização do Sistema Elétrico de Potência (SEP)\n2. Trabalho sob tensão e métodos de trabalho (ao contato, ao potencial, à distância)\n3. Procedimentos de trabalho e liberação de instalações no SEP\n4. Técnicas de análise de risco e inspeção de equipamentos especiais\n5. Condições impeditivas, resgate de vítimas e primeiros socorros'
  },
  {
    category: 'Normas Regulamentadoras (NRs)',
    name: 'NR-33 Segurança em Espaços Confinados (Trabalhadores e Vigias)',
    duration: '16 horas',
    content: '1. Definições, identificação e reconhecimento de espaços confinados\n2. Critérios de indicação e uso de equipamentos de ventilação e medição de gases\n3. Procedimentos de Permissão de Entrada e Trabalho (PET)\n4. Monitoramento contínuo da atmosfera e controle dos riscos ocupacionais\n5. Técnicas de resgate e primeiros socorros em espaços confinados'
  },
  {
    category: 'Normas Regulamentadoras (NRs)',
    name: 'NR-33 Supervisor de Entrada em Espaço Confinado',
    duration: '40 horas',
    content: '1. Reconhecimento, avaliação e controle de riscos em espaços confinados\n2. Legislação de segurança e saúde no trabalho aplicável (NR-33 e NBR 16577)\n3. Emissão, preenchimento e encerramento da Permissão de Entrada e Trabalho (PET)\n4. Operação e calibração de detectores de gases e sistemas de insuflamento\n5. Operações de salvamento, plano de resgate e suporte básico à vida'
  },
  {
    category: 'Normas Regulamentadoras (NRs)',
    name: 'NR-01 Disposições Gerais e Gerenciamento de Riscos (GRO/PGR)',
    duration: '4 horas',
    content: '1. Campo de aplicação e princípios gerais da NR-01\n2. Identificação de perigos e inventário de riscos ocupacionais (GRO/PGR)\n3. Medidas preventivas, hierarquia de controle e plano de ação\n4. Direitos e deveres na gestão de segurança do trabalho\n5. Comunicação de incidentes e análise preliminar'
  },
  {
    category: 'Normas Regulamentadoras (NRs)',
    name: 'NR-05 CIPA - Prevenção de Acidentes e Assédio',
    duration: '20 horas',
    content: '1. Estudo do ambiente, condições de trabalho e riscos operacionais\n2. Metodologia de investigação e análise de acidentes e doenças do trabalho\n3. Prevenção e combate ao assédio sexual e a outras formas de violência no trabalho\n4. Noções sobre acidentes e medidas preventivas de saúde ocupacional\n5. Campanhas de segurança, SIPAT e mapa de riscos'
  },
  {
    category: 'Normas Regulamentadoras (NRs)',
    name: 'NR-11 Operador de Empilhadeira',
    duration: '16 horas',
    content: '1. Legislação aplicável (NR-11 e Código de Trânsito Brasileiro)\n2. Componentes mecânicos, elétricos e hidráulicos do equipamento\n3. Centro de gravidade, estabilidade e capacidade de carga\n4. Inspeção diária de segurança (Checklist de pré-uso)\n5. Manobras operacionais, empilhamento e desempilhamento de cargas'
  },
  {
    category: 'Normas Regulamentadoras (NRs)',
    name: 'NR-11 Operador de Ponte Rolante e Içamento',
    duration: '16 horas',
    content: '1. Conceitos fundamentais e dispositivos de segurança em pontes rolantes\n2. Acessórios de içamento (cintas, cabos de aço, manilhas e ganchos)\n3. Critérios para descarte de materiais de içamento e tabelas de carga\n4. Comunicação visual padronizada (sinais por gestos)\n5. Prática operacional de movimentação aérea e segurança'
  },
  {
    category: 'Normas Regulamentadoras (NRs)',
    name: 'NR-12 Segurança no Trabalho em Máquinas e Equipamentos',
    duration: '16 horas',
    content: '1. Princípios gerais e conceitos de proteção da NR-12\n2. Dispositivos de parada de emergência e intertravamentos de segurança\n3. Procedimentos de Bloqueio e Etiquetagem de Energias Perigosas (LOTO)\n4. Riscos adicionais (ruído, calor, substâncias químicas e projeção)\n5. Operação segura e procedimentos operacionais padronizados'
  },
  {
    category: 'Normas Regulamentadoras (NRs)',
    name: 'NR-18 Segurança e Saúde na Indústria da Construção',
    duration: '4 horas',
    content: '1. Comunicação prévia e diretrizes do plano de segurança na construção\n2. Proteções coletivas contra quedas em periferias de lajes e vãos\n3. Segurança em andaimes, plataformas e escavações\n4. Instalações elétricas provisórias em canteiros de obras\n5. Ordem, limpeza e descarte de resíduos'
  },
  {
    category: 'Normas Regulamentadoras (NRs)',
    name: 'NR-20 Segurança com Inflamáveis e Combustíveis (Básico)',
    duration: '8 horas',
    content: '1. Características, propriedades, perigos e riscos de inflamáveis e combustíveis\n2. Controles coletivos e individuais em áreas classificadas\n3. Fontes de ignição e métodos sistemáticos de prevenção\n4. Procedimentos básicos de emergência e combate a princípio de incêndio\n5. Estudo e aplicação da Permissão de Trabalho (PT)'
  },
  {
    category: 'Normas Regulamentadoras (NRs)',
    name: 'NR-20 Inflamáveis e Combustíveis (Intermediário)',
    duration: '16 horas',
    content: '1. Inflamáveis: propriedades, perigos e riscos químicos\n2. Instalações de transferência e estocagem de combustíveis\n3. Análise preliminar de riscos e métodos de controle operacional\n4. Proteção contra incêndios em tanques e tubulações\n5. Resposta a emergências com vazamentos e derramamentos'
  },
  {
    category: 'Emergência & Primeiros Socorros',
    name: 'Brigada de Incêndio e Emergência',
    duration: '8 horas',
    content: '1. Teoria do fogo e métodos de propagação térmica\n2. Classes de incêndio e agentes extintores específicos\n3. Operação prática de extintores portáteis e linha de hidrantes\n4. Rotas de fuga, sinalização de segurança e plano de abandono de área\n5. Primeiros socorros aplicados a queimaduras e inalação de fumaça'
  },
  {
    category: 'Emergência & Primeiros Socorros',
    name: 'Primeiros Socorros e Suporte Básico de Vida',
    duration: '8 horas',
    content: '1. Avaliação primária e secundária da vítima (Protocolo XABCDE)\n2. Reanimação Cardiopulmonar (RCP) e operação do DEA\n3. Controle de hemorragias graves e técnicas de contenção\n4. Imobilização de fraturas e transporte seguro de acidentados\n5. Desmaios, convulsões e engasgamento (Manobra de Heimlich)'
  },
  {
    category: 'Operacional & Trânsito',
    name: 'Direção Defensiva e Prevenção de Acidentes',
    duration: '8 horas',
    content: '1. Conceitos de Direção Defensiva e Código de Trânsito Brasileiro (CTB)\n2. Condições adversas (tempo, luz, trânsito, via, veículo e condutor)\n3. Distância de segurança, tempo de reação e frenagem\n4. Cuidados especiais com pedestres, ciclistas e veículos pesados\n5. Inspeção preventiva diária de veículos e ergonomia veicular'
  }
];

// Lista de usuários padrão do sistema (fallback resiliente)
const FALLBACK_PROFILES = [
  { id: '1', name: 'Adeylton', role: 'Técnico em Segurança do Trabalho' },
  { id: '2', name: 'Gustavo Onraed', role: 'Diretoria / Admin' },
  { id: '3', name: 'Lucas Paiva', role: 'Diretoria / Admin' },
  { id: '4', name: 'Caio Vinicius', role: 'Técnico em Segurança do Trabalho' },
  { id: '5', name: 'Pedro Praxedes', role: 'Supervisor SST' },
  { id: '6', name: 'Nailton Soares', role: 'Técnico em Segurança do Trabalho' },
  { id: '7', name: 'Fernanda', role: 'Técnico em Segurança do Trabalho' },
  { id: '8', name: 'luzian teixeira', role: 'Técnico em Segurança do Trabalho' },
  { id: '9', name: 'Raul Campelo', role: 'Supervisor SST' },
  { id: '10', name: 'Cadu', role: 'Técnico em Segurança do Trabalho' },
  { id: '11', name: 'Katty Marinho', role: 'Enfermagem' },
  { id: '12', name: 'leiliana nunes', role: 'Enfermagem' }
];

const TrainingCertificatesPage = () => {
  // Controle de Abas: 'generator' | 'turmas'
  const [activeTab, setActiveTab] = useState('generator');

  // Usuários do Sistema para seleção de instrutores
  const [profiles, setProfiles] = useState(FALLBACK_PROFILES);

  // Estados das Turmas e Inscrições
  const [turmas, setTurmas] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedTurmaIdInGenerator, setSelectedTurmaIdInGenerator] = useState('');
  const [loadingData, setLoadingData] = useState(true);
  const [selectedTurmaFilter, setSelectedTurmaFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modais de Gestão
  const [showTurmaModal, setShowTurmaModal] = useState(false);
  const [editingTurma, setEditingTurma] = useState(null);
  const [turmaFormData, setTurmaFormData] = useState({
    name: '',
    course_name: '',
    duration: '8 horas',
    start_date: new Date().toISOString().split('T')[0],
    location: 'Mossoró - RN',
    company: 'TotalSafety',
    instructor_name: 'Adeylton',
    instructor_role: 'Instrutor e Responsável Técnico',
    instructor_registration: 'SRTE N° 0009823/RN',
    content: '1. Introdução e Contextualização Geral\n2. Normas, Procedimentos e Diretrizes Aplicáveis\n3. Metodologias e Execução Prática\n4. Avaliação e Verificação de Aprendizagem',
    status: 'Aberta'
  });

  // Modal de Configuração do Token de Testes da API
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [apiToken, setApiToken] = useState(() => {
    return localStorage.getItem('cpfcnpj_api_token') || DEFAULT_API_TOKEN;
  });

  // Feedback de Cópia
  const [copiedKey, setCopiedKey] = useState(null);

  // ----------------------------------------------------
  // Estados do Gerador de Certificados (PPTX)
  // ----------------------------------------------------
  const [formData, setFormData] = useState({
    curso: 'NR-35 Trabalho em Altura',
    descricao: 'Certificamos que o participante concluiu com aproveitamento o treinamento com foco nas diretrizes e práticas técnicas estabelecidas.',
    data: new Date().toISOString().split('T')[0],
    duracao: '8 horas',
    local: 'Mossoró - RN',
    empresa: 'TotalSafety',
    instrutorNome: 'Adeylton',
    instrutorCargo: 'Instrutor e Responsável Técnico',
    instrutorRegistro: 'SRTE N° 0009823/RN',
    conteudo: '1. Normas e regulamentações aplicáveis ao trabalho em altura (NR-35)\n2. Análise de Risco e condições impeditivas\n3. Sistemas, equipamentos e procedimentos de proteção coletiva e individual\n4. EPIs para trabalho em altura: seleção, inspeção, conservação e limitação de uso\n5. Condutas em situações de emergência e noções de primeiros socorros'
  });

  const [colaboradores, setColaboradores] = useState([
    { nome: '', cpf: '' }
  ]);

  const [customTemplateFile, setCustomTemplateFile] = useState(null);
  const [customTemplateBuffer, setCustomTemplateBuffer] = useState(null);
  const fileInputRef = useRef(null);

  const [generating, setGenerating] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchText, setBatchText] = useState('');
  const [previewTab, setPreviewTab] = useState('frente'); // 'frente' | 'verso'

  // ----------------------------------------------------
  // Carregamento de Dados (Turmas, Inscrições e Usuários)
  // ----------------------------------------------------
  const loadData = async () => {
    setLoadingData(true);
    try {
      const [classList, studentList, profileList, companyList, groupList] = await Promise.all([
        getTrainingClasses(),
        getTrainingEnrollments(),
        getProfiles(),
        getCompanies(),
        getGroups()
      ]);
      setTurmas(classList || []);
      setEnrollments(studentList || []);
      if (profileList && profileList.length > 0) {
        setProfiles(profileList);
      }
      if (companyList && companyList.length > 0) {
        setCompanies(companyList);
      }
      if (groupList && groupList.length > 0) {
        setGroups(groupList);
      }
    } catch (e) {
      console.error('Erro ao carregar turmas, inscrições e instrutores:', e);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadData();

    // Assina atualizações em tempo real das inscrições
    const unsubscribe = subscribeToEnrollments((newStudent) => {
      setEnrollments(prev => {
        if (prev.some(s => s.id === newStudent.id)) return prev;
        return [newStudent, ...prev];
      });
      setFeedback({ 
        type: 'info', 
        text: `Nova inscrição recebida em tempo real: ${newStudent.nome} (${newStudent.cpf})` 
      });
      setTimeout(() => setFeedback(null), 5000);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // ----------------------------------------------------
  // Ações de Turmas
  // ----------------------------------------------------
  const handleOpenNewTurma = () => {
    setEditingTurma(null);
    setTurmaFormData({
      name: '',
      course_name: '',
      duration: '8 horas',
      start_date: new Date().toISOString().split('T')[0],
      location: 'Mossoró - RN',
      company: 'TotalSafety',
      instructor_name: profiles[0]?.name || 'Adeylton',
      instructor_role: 'Instrutor e Responsável Técnico',
      instructor_registration: 'SRTE N° 0009823/RN',
      content: '1. Introdução e Contextualização Geral\n2. Normas, Procedimentos e Diretrizes Aplicáveis\n3. Metodologias e Execução Prática\n4. Avaliação e Verificação de Aprendizagem',
      status: 'Aberta'
    });
    setShowTurmaModal(true);
  };

  const handleEditTurma = (turma) => {
    setEditingTurma(turma);
    setTurmaFormData({
      name: turma.name || '',
      course_name: turma.course_name || '',
      duration: turma.duration || '8 horas',
      start_date: turma.start_date || new Date().toISOString().split('T')[0],
      location: turma.location || 'Mossoró - RN',
      company: turma.company || '',
      instructor_name: turma.instructor_name || profiles[0]?.name || 'Adeylton',
      instructor_role: turma.instructor_role || 'Instrutor e Responsável Técnico',
      instructor_registration: turma.instructor_registration || 'SRTE N° 0009823/RN',
      content: turma.content || '',
      status: turma.status || 'Aberta'
    });
    setShowTurmaModal(true);
  };

  const handleSaveTurma = async (e) => {
    e.preventDefault();
    if (!turmaFormData.name.trim()) {
      alert('Por favor, informe a identificação da Turma.');
      return;
    }

    try {
      await saveTrainingClass({
        id: editingTurma ? editingTurma.id : null,
        ...turmaFormData
      });
      setShowTurmaModal(false);
      loadData();
      setFeedback({ 
        type: 'success', 
        text: editingTurma ? 'Turma atualizada com sucesso!' : 'Turma criada com sucesso!' 
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar turma.');
    }
  };

  const handleDeleteTurma = async (id, name) => {
    if (!window.confirm(`Deseja realmente excluir a turma "${name}"? Os inscritos ficarão como sem turma.`)) {
      return;
    }
    await deleteTrainingClass(id);
    loadData();
  };

  // Copia o link público da turma ou link geral
  const copyPublicLink = (turmaId = null, key = 'general') => {
    const origin = window.location.origin;
    const url = turmaId ? `${origin}/inscricao?turma=${turmaId}` : `${origin}/inscricao`;
    navigator.clipboard.writeText(url);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Carrega alunos de uma turma direto no gerador de certificados
  const handleLoadTurmaIntoGenerator = (turma) => {
    const studentsInTurma = enrollments.filter(e => String(e.turma_id) === String(turma.id));

    if (studentsInTurma.length === 0) {
      if (!window.confirm(`A turma "${turma.name}" não possui participantes inscritos ainda. Deseja carregar as configurações do curso no gerador mesmo assim?`)) {
        return;
      }
    }

    setSelectedTurmaIdInGenerator(turma.id);

    // Atualiza o formulário do certificado com os dados da turma
    setFormData(prev => ({
      ...prev,
      curso: turma.course_name || turma.name,
      duracao: turma.duration || prev.duracao,
      data: turma.start_date || prev.data,
      local: turma.location || prev.local,
      empresa: turma.company || prev.empresa,
      instrutorNome: turma.instructor_name || prev.instrutorNome,
      instrutorCargo: turma.instructor_role || prev.instrutorCargo,
      instrutorRegistro: turma.instructor_registration || prev.instrutorRegistro,
      conteudo: turma.content || prev.conteudo
    }));

    // Carrega a lista de colaboradores se houver inscritos
    if (studentsInTurma.length > 0) {
      setColaboradores(studentsInTurma.map(s => ({
        nome: s.nome,
        cpf: s.cpf
      })));
      setFeedback({ 
        type: 'success', 
        text: `Turma "${turma.name}" vinculada com ${studentsInTurma.length} participante(s) carregados!` 
      });
    } else {
      setFeedback({ 
        type: 'info', 
        text: `Configurações da turma "${turma.name}" carregadas no formulário do certificado!` 
      });
    }

    setActiveTab('generator');
    setTimeout(() => setFeedback(null), 4500);
  };

  const handleReloadTurmaStudents = async () => {
    if (!selectedTurmaIdInGenerator) return;
    try {
      const allStudents = await getTrainingEnrollments();
      setEnrollments(allStudents || []);
      const studentsInTurma = (allStudents || []).filter(e => String(e.turma_id) === String(selectedTurmaIdInGenerator));
      if (studentsInTurma.length > 0) {
        setColaboradores(studentsInTurma.map(s => ({ nome: s.nome, cpf: s.cpf })));
        setFeedback({ 
          type: 'success', 
          text: `Inscrições sincronizadas! (${studentsInTurma.length} participantes carregados)` 
        });
      } else {
        setFeedback({ 
          type: 'info', 
          text: 'Nenhuma inscrição recente encontrada para esta turma.' 
        });
      }
      setTimeout(() => setFeedback(null), 4000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearTurmaLink = () => {
    setSelectedTurmaIdInGenerator('');
    setFeedback({
      type: 'info',
      text: 'Vínculo com a turma desfeito. Você pode personalizar os campos livremente.'
    });
    setTimeout(() => setFeedback(null), 3000);
  };

  // Aplica um preset inteligente de curso
  const applyPreset = (preset) => {
    setFormData(prev => ({
      ...prev,
      curso: preset.name,
      duracao: preset.duration,
      conteudo: preset.content,
      descricao: `Certificamos que o participante concluiu com aproveitamento o treinamento com foco nas diretrizes e práticas técnicas estabelecidas na ${preset.name.split(' ')[0]}.`
    }));
    setFeedback({
      type: 'success',
      text: `Treinamento ${preset.name} aplicado com conteúdo programático oficial!`
    });
    setTimeout(() => setFeedback(null), 3500);
  };

  // Alteração de turma de um aluno
  const handleStudentTurmaChange = async (studentId, newTurmaId) => {
    await updateStudent(studentId, { turma_id: newTurmaId || null });
    loadData();
  };

  const handleDeleteStudent = async (studentId, studentName) => {
    if (!window.confirm(`Deseja remover ${studentName} da lista de presença?`)) return;
    await deleteStudent(studentId);
    loadData();
  };

  // Salva o Token da API CPF.CNPJ
  const handleSaveApiToken = (e) => {
    e.preventDefault();
    const clean = apiToken.trim();
    if (!clean) return;
    localStorage.setItem('cpfcnpj_api_token', clean);
    setShowTokenModal(false);
    setFeedback({ type: 'success', text: 'Token da API CPF.CNPJ atualizado!' });
    setTimeout(() => setFeedback(null), 3000);
  };

  // ----------------------------------------------------
  // Métodos do Gerador de Certificados
  // ----------------------------------------------------
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleColabChange = (index, field, value) => {
    setColaboradores(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const addColaborador = () => {
    setColaboradores(prev => [...prev, { nome: '', cpf: '' }]);
  };

  const removeColaborador = (index) => {
    if (colaboradores.length <= 1) {
      setColaboradores([{ nome: '', cpf: '' }]);
      return;
    }
    setColaboradores(prev => prev.filter((_, i) => i !== index));
  };

  const clearAllColaboradores = () => {
    if (window.confirm('Deseja limpar todos os participantes da lista?')) {
      setColaboradores([{ nome: '', cpf: '' }]);
    }
  };

  const handleTemplateUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.pptx')) {
      alert('Por favor, selecione um arquivo PowerPoint (.pptx).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setCustomTemplateBuffer(event.target.result);
      setCustomTemplateFile(file);
      setFeedback({ type: 'success', text: `Modelo carregado: ${file.name}` });
      setTimeout(() => setFeedback(null), 4000);
    };
    reader.readAsArrayBuffer(file);
  };

  const removeCustomTemplate = () => {
    setCustomTemplateFile(null);
    setCustomTemplateBuffer(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setFeedback({ type: 'info', text: 'Usando modelo padrão do sistema.' });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleProcessBatch = () => {
    if (!batchText.trim()) return;

    const lines = batchText.split('\n').map(l => l.trim()).filter(Boolean);
    const parsed = [];

    for (const line of lines) {
      const cpfMatch = line.match(/\d{3}\.?\d{3}\.?\d{3}-?\d{2}|\d{11}/);
      let cpf = '';
      let nome = line;

      if (cpfMatch) {
        cpf = cpfMatch[0];
        nome = line.replace(cpf, '').replace(/[-–—,;|]/g, ' ').trim();
      } else {
        const parts = line.split(/[-–—,;|]/);
        if (parts.length > 1) {
          nome = parts[0].trim();
          cpf = parts[1].trim();
        }
      }

      if (nome) {
        parsed.push({ nome, cpf: formatCpf(cpf) });
      }
    }

    if (parsed.length > 0) {
      setColaboradores(parsed);
      setShowBatchModal(false);
      setBatchText('');
      setFeedback({ type: 'success', text: `${parsed.length} participantes importados com sucesso!` });
      setTimeout(() => setFeedback(null), 4000);
    } else {
      alert('Não foi possível identificar nomes na lista informada. Verifique o texto e tente novamente.');
    }
  };

  const handleGenerate = async () => {
    const validColaboradores = colaboradores.filter(c => c.nome.trim());
    if (validColaboradores.length === 0) {
      alert('Informe ao menos um participante com nome para gerar os certificados.');
      return;
    }

    if (!formData.curso.trim()) {
      alert('Informe o Nome do Treinamento/Curso.');
      return;
    }

    setGenerating(true);
    try {
      const blob = await generateTrainingPPTX({
        templateBuffer: customTemplateBuffer,
        curso: formData.curso,
        descricao: formData.descricao,
        data: formData.data,
        duracao: formData.duracao,
        local: formData.local,
        empresa: formData.empresa,
        instrutorNome: formData.instrutorNome,
        instrutorCargo: formData.instrutorCargo,
        instrutorRegistro: formData.instrutorRegistro,
        conteudo: formData.conteudo,
        colaboradores: validColaboradores
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeCourse = formData.curso.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
      a.download = `Certificados_${safeCourse}_${validColaboradores.length}alunos.pptx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setFeedback({ 
        type: 'success', 
        text: `Arquivo PPTX com ${validColaboradores.length} certificado(s) gerado e baixado com sucesso!` 
      });
      setTimeout(() => setFeedback(null), 5000);
    } catch (err) {
      console.error('Erro ao gerar certificados:', err);
      alert('Erro ao gerar apresentação PPTX: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  // Filtro de Inscrições
  const filteredEnrollments = enrollments.filter(e => {
    const matchTurma = selectedTurmaFilter === 'all' 
      ? true 
      : selectedTurmaFilter === 'unassigned' 
        ? !e.turma_id 
        : String(e.turma_id) === String(selectedTurmaFilter);

    const matchSearch = !searchQuery.trim() || 
      e.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.cpf.includes(searchQuery);

    return matchTurma && matchSearch;
  });

  const validCount = colaboradores.filter(c => c.nome.trim()).length;
  const firstStudent = colaboradores.find(c => c.nome.trim());

  return (
    <div className="training-certificates-page" style={{ padding: '1.75rem', maxWidth: '1440px', margin: '0 auto' }}>
      
      {/* ========================================================================= */}
      {/* HERO SECTION / HEADER ELEGANTE                                            */}
      {/* ========================================================================= */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.08) 0%, rgba(99, 102, 241, 0.04) 50%, rgba(15, 23, 42, 0.02) 100%)',
        border: '1px solid rgba(2, 132, 199, 0.18)',
        borderRadius: '1.25rem',
        padding: '1.5rem 1.75rem',
        marginBottom: '1.5rem',
        boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.03)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Glow de fundo */}
        <div style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '220px',
          height: '220px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(2, 132, 199, 0.15) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1.25rem',
          position: 'relative',
          zIndex: 1
        }}>
          {/* Lado Esquerdo: Título e Identidade */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.15rem' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '1rem',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 10px 25px -5px rgba(2, 132, 199, 0.45)',
              flexShrink: 0
            }}>
              <Award size={30} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                  Emissão de Certificados & Treinamentos
                </h1>
                <span style={{ 
                  background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.15) 0%, rgba(56, 189, 248, 0.1) 100%)',
                  border: '1px solid rgba(2, 132, 199, 0.25)',
                  color: '#0284c7', 
                  fontSize: '0.72rem', 
                  fontWeight: '700', 
                  padding: '0.2rem 0.65rem', 
                  borderRadius: '2rem', 
                  textTransform: 'uppercase',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}>
                  <ShieldCheck size={13} />
                  Módulo Treinamento
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Ambiente integrado para geração de apresentações PowerPoint (.pptx) com 2 slides por participante, gestão de turmas e inscrição com CPF A da Receita.
              </p>
            </div>
          </div>

          {/* Lado Direito: Ações Rápidas de Configuração & Inscrição */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn"
              onClick={() => setShowTokenModal(true)}
              style={{ 
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                fontSize: '0.8125rem',
                fontWeight: '600',
                padding: '0.55rem 0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
              title="Configurar Token da API CPF.CNPJ"
            >
              <Key size={14} style={{ color: '#0284c7' }} />
              API CPF A (Receita)
            </button>

            <button
              type="button"
              className="btn"
              onClick={() => copyPublicLink(null, 'general-header')}
              style={{ 
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                fontSize: '0.8125rem',
                fontWeight: '600',
                padding: '0.55rem 0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
            >
              {copiedKey === 'general-header' ? <Check size={14} style={{ color: '#10b981' }} /> : <LinkIcon size={14} style={{ color: '#0284c7' }} />}
              {copiedKey === 'general-header' ? 'Link Copiado!' : 'Copiar Link Público'}
            </button>

            <a
              href="/inscricao"
              target="_blank"
              rel="noopener noreferrer"
              className="btn"
              style={{ 
                backgroundColor: '#0284c7',
                color: '#fff',
                fontSize: '0.8125rem',
                fontWeight: '600',
                padding: '0.55rem 0.95rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.35)',
                textDecoration: 'none'
              }}
              title="Abrir página pública de inscrição"
            >
              <ExternalLink size={14} />
              Portal de Inscrição
            </a>
          </div>
        </div>

        {/* Métricas / Estatísticas Rápidas em Pills */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '0.85rem',
          marginTop: '1.25rem',
          paddingTop: '1.15rem',
          borderTop: '1px solid rgba(2, 132, 199, 0.12)'
        }}>
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(2, 132, 199, 0.15)',
            borderRadius: '0.75rem',
            padding: '0.65rem 1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '0.5rem',
              backgroundColor: 'rgba(2, 132, 199, 0.12)',
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Award size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '700' }}>
                Turmas Ativas
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                {turmas.length} {turmas.length === 1 ? 'turma' : 'turmas'}
              </div>
            </div>
          </div>

          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(16, 185, 129, 0.18)',
            borderRadius: '0.75rem',
            padding: '0.65rem 1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '0.5rem',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Users size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '700' }}>
                Inscrições Recebidas
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                {enrollments.length} {enrollments.length === 1 ? 'participante' : 'participantes'}
              </div>
            </div>
          </div>

          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(99, 102, 241, 0.18)',
            borderRadius: '0.75rem',
            padding: '0.65rem 1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '0.5rem',
              backgroundColor: 'rgba(99, 102, 241, 0.12)',
              color: '#6366f1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Layers size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '700' }}>
                Certificados no Gerador
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                {validCount} {validCount === 1 ? 'aluno pronto' : 'alunos prontos'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alerta de Feedback Global */}
      {feedback && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          padding: '0.85rem 1.15rem',
          marginBottom: '1.25rem',
          borderRadius: '0.75rem',
          backgroundColor: feedback.type === 'success' ? '#f0fdf4' : feedback.type === 'info' ? '#f0f9ff' : '#eff6ff',
          border: feedback.type === 'success' ? '1px solid #bbf7d0' : feedback.type === 'info' ? '1px solid #bae6fd' : '1px solid #bfdbfe',
          color: feedback.type === 'success' ? '#166534' : feedback.type === 'info' ? '#0369a1' : '#1e40af',
          fontSize: '0.875rem',
          fontWeight: '500',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          animation: 'fadeIn 0.2s ease-in-out'
        }}>
          <CheckCircle2 size={18} />
          <span>{feedback.text}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SEGMENTED TAB CONTROL                                                     */}
      {/* ========================================================================= */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0.35rem',
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '0.85rem',
        marginBottom: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        gap: '0.35rem'
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('generator')}
          style={{
            padding: '0.65rem 1.35rem',
            border: 'none',
            borderRadius: '0.65rem',
            backgroundColor: activeTab === 'generator' ? '#0284c7' : 'transparent',
            color: activeTab === 'generator' ? '#fff' : 'var(--text-secondary)',
            fontWeight: activeTab === 'generator' ? '700' : '600',
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.55rem',
            boxShadow: activeTab === 'generator' ? '0 4px 12px rgba(2, 132, 199, 0.35)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          <Award size={17} />
          Gerador de Certificados PPTX
          {validCount > 0 && (
            <span style={{
              backgroundColor: activeTab === 'generator' ? 'rgba(255,255,255,0.25)' : '#10b981',
              color: '#fff',
              fontSize: '0.72rem',
              padding: '2px 8px',
              borderRadius: '1rem',
              fontWeight: '700'
            }}>
              {validCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('turmas')}
          style={{
            padding: '0.65rem 1.35rem',
            border: 'none',
            borderRadius: '0.65rem',
            backgroundColor: activeTab === 'turmas' ? '#0284c7' : 'transparent',
            color: activeTab === 'turmas' ? '#fff' : 'var(--text-secondary)',
            fontWeight: activeTab === 'turmas' ? '700' : '600',
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.55rem',
            boxShadow: activeTab === 'turmas' ? '0 4px 12px rgba(2, 132, 199, 0.35)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          <Users size={17} />
          Turmas & Inscrições Oficiais
          <span style={{
            backgroundColor: activeTab === 'turmas' ? 'rgba(255,255,255,0.25)' : 'var(--border)',
            color: activeTab === 'turmas' ? '#fff' : 'var(--text-secondary)',
            fontSize: '0.72rem',
            padding: '2px 8px',
            borderRadius: '1rem',
            fontWeight: '700'
          }}>
            {enrollments.length}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: GERADOR DE CERTIFICADOS PPTX                                       */}
      {/* ========================================================================= */}
      {activeTab === 'generator' && (
        <div>
          
          {/* BARRA SUPERIOR UNIFICADA: Importar Turma & Template PPTX */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            {/* Card: Carregador Rápido de Turma */}
            <div style={{
              backgroundColor: 'var(--surface)',
              border: selectedTurmaIdInGenerator ? '1.5px solid #0284c7' : '1px solid var(--border)',
              borderRadius: '1rem',
              padding: '1.15rem 1.35rem',
              boxShadow: selectedTurmaIdInGenerator ? '0 4px 14px rgba(2, 132, 199, 0.08)' : '0 2px 6px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '0.85rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Users size={18} style={{ color: '#0284c7' }} />
                  <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                    Vincular / Importar Alunos de uma Turma
                  </span>
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                  {turmas.length} turmas cadastradas
                </span>
              </div>

              <div>
                <select
                  className="input"
                  value={selectedTurmaIdInGenerator || ''}
                  style={{
                    fontSize: '0.875rem',
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '0.65rem',
                    border: '1.5px solid #0284c7',
                    fontWeight: '600',
                    backgroundColor: 'var(--surface)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer'
                  }}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) {
                      handleClearTurmaLink();
                      return;
                    }
                    const found = turmas.find(t => String(t.id) === String(val));
                    if (found) handleLoadTurmaIntoGenerator(found);
                  }}
                >
                  <option value="">Selecione uma turma para carregar alunos e curso...</option>
                  
                  {turmas.some(t => t.status === 'Aberta' || !t.status) && (
                    <optgroup label="🟢 Turmas Abertas (Inscrições Ativas)">
                      {turmas
                        .filter(t => t.status === 'Aberta' || !t.status)
                        .map(t => {
                          const count = enrollments.filter(e => String(e.turma_id) === String(t.id)).length;
                          return (
                            <option key={t.id} value={t.id}>
                              {t.name} — {t.course_name || 'Geral'} ({count} aluno{count !== 1 ? 's' : ''})
                            </option>
                          );
                        })}
                    </optgroup>
                  )}

                  {turmas.some(t => t.status === 'Em Andamento') && (
                    <optgroup label="🔵 Turmas em Andamento">
                      {turmas
                        .filter(t => t.status === 'Em Andamento')
                        .map(t => {
                          const count = enrollments.filter(e => String(e.turma_id) === String(t.id)).length;
                          return (
                            <option key={t.id} value={t.id}>
                              {t.name} — {t.course_name || 'Geral'} ({count} aluno{count !== 1 ? 's' : ''})
                            </option>
                          );
                        })}
                    </optgroup>
                  )}

                  {turmas.some(t => t.status === 'Concluída') && (
                    <optgroup label="⚪ Turmas Concluídas">
                      {turmas
                        .filter(t => t.status === 'Concluída')
                        .map(t => {
                          const count = enrollments.filter(e => String(e.turma_id) === String(t.id)).length;
                          return (
                            <option key={t.id} value={t.id}>
                              {t.name} — {t.course_name || 'Geral'} ({count} aluno{count !== 1 ? 's' : ''})
                            </option>
                          );
                        })}
                    </optgroup>
                  )}
                </select>
              </div>

              {selectedTurmaIdInGenerator && (() => {
                const currentTurma = turmas.find(t => String(t.id) === String(selectedTurmaIdInGenerator));
                const studentCount = enrollments.filter(e => String(e.turma_id) === String(selectedTurmaIdInGenerator)).length;
                if (!currentTurma) return null;
                return (
                  <div style={{
                    backgroundColor: 'rgba(2, 132, 199, 0.06)',
                    border: '1px solid rgba(2, 132, 199, 0.25)',
                    borderRadius: '0.65rem',
                    padding: '0.65rem 0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.5rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <CheckCircle size={16} style={{ color: '#0284c7' }} />
                      <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#0369a1' }}>
                        Turma ativa: {currentTurma.name}
                      </span>
                      <span style={{
                        backgroundColor: '#0284c7',
                        color: '#fff',
                        fontSize: '0.7rem',
                        fontWeight: '700',
                        padding: '1px 7px',
                        borderRadius: '1rem'
                      }}>
                        {studentCount} aluno{studentCount !== 1 ? 's' : ''}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <button
                        type="button"
                        onClick={handleReloadTurmaStudents}
                        className="btn"
                        title="Recarregar inscrições mais recentes da turma"
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          padding: '0.3rem 0.65rem',
                          backgroundColor: '#fff',
                          border: '1px solid rgba(2, 132, 199, 0.35)',
                          color: '#0284c7',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}
                      >
                        <RefreshCw size={12} />
                        Sincronizar
                      </button>

                      <button
                        type="button"
                        onClick={handleClearTurmaLink}
                        className="btn"
                        title="Desvincular e personalizar livremente"
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          padding: '0.3rem 0.65rem',
                          backgroundColor: 'transparent',
                          border: '1px solid var(--border)',
                          color: 'var(--text-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}
                      >
                        <X size={12} />
                        Desvincular
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Card: Arquivo de Modelo PPTX */}
            <div style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '1rem',
              padding: '1.15rem 1.35rem',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                  <Layers size={18} style={{ color: '#0284c7' }} />
                  <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                    Modelo de Certificado (.pptx)
                  </span>
                  {customTemplateFile ? (
                    <span style={{ 
                      backgroundColor: '#dcfce7', 
                      color: '#15803d', 
                      fontSize: '0.7rem', 
                      fontWeight: '700', 
                      padding: '0.15rem 0.55rem', 
                      borderRadius: '1rem' 
                    }}>
                      Personalizado
                    </span>
                  ) : (
                    <span style={{ 
                      backgroundColor: '#f1f5f9', 
                      color: '#475569', 
                      fontSize: '0.7rem', 
                      fontWeight: '700', 
                      padding: '0.15rem 0.55rem', 
                      borderRadius: '1rem' 
                    }}>
                      Padrão TotalSafety
                    </span>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  {customTemplateFile 
                    ? `Arquivo: "${customTemplateFile.name}" (${(customTemplateFile.size / 1024).toFixed(1)} KB)`
                    : 'Usando slide mestre oficial com frente e verso.'}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept=".pptx" 
                  onChange={handleTemplateUpload} 
                  style={{ display: 'none' }} 
                />

                <button
                  type="button"
                  className="btn"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ 
                    backgroundColor: 'var(--surface-hover)', 
                    border: '1px solid var(--border)',
                    fontSize: '0.8rem', 
                    fontWeight: '600',
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.35rem',
                    padding: '0.5rem 0.8rem'
                  }}
                >
                  <Upload size={14} />
                  {customTemplateFile ? 'Trocar PPTX' : 'Carregar PPTX'}
                </button>

                {customTemplateFile && (
                  <button
                    type="button"
                    className="btn"
                    onClick={removeCustomTemplate}
                    title="Restaurar modelo padrão TotalSafety"
                    style={{ 
                      backgroundColor: 'transparent',
                      border: '1px solid var(--border)',
                      fontSize: '0.8rem', 
                      color: 'var(--danger)',
                      padding: '0.5rem 0.75rem'
                    }}
                  >
                    Restaurar
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* GRID PRINCIPAL: DADOS DO TREINAMENTO (ESQ) + ALUNOS & PREVIEW (DIR)      */}
          {/* ========================================================================= */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(380px, 1.25fr) minmax(420px, 1.4fr)',
            gap: '1.5rem',
            alignItems: 'start'
          }}>
            
            {/* ------------------------------------------------------------- */}
            {/* COLUNA ESQUERDA: FORMULÁRIO DO TREINAMENTO & INSTRUTOR       */}
            {/* ------------------------------------------------------------- */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Card 1: Identificação do Curso & Chips Rápidos */}
              <div style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '1rem',
                padding: '1.4rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.15rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                  <h2 style={{ fontSize: '1rem', fontWeight: '800', margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <BookOpen size={18} style={{ color: '#0284c7' }} />
                    Informações do Treinamento
                  </h2>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    Frente do Certificado
                  </span>
                </div>

                {/* Treinamento / Curso Oficial */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <label className="modal-label" style={{ fontWeight: '700', fontSize: '0.8125rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <BookOpen size={15} style={{ color: '#0284c7' }} />
                      Treinamento Oficial / Norma Regulamentadora (NR) *
                    </label>
                    <span style={{ fontSize: '0.72rem', color: '#0284c7', fontWeight: '700' }}>
                      ⚡ Auto-preenchimento
                    </span>
                  </div>

                  {/* SELECT PRINCIPAL DE CURSOS E NRs */}
                  <select
                    className="input"
                    value={COURSE_PRESETS.some(p => p.name.toLowerCase() === formData.curso?.trim().toLowerCase()) ? formData.curso : 'custom'}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'custom') {
                        // mantém para edição
                      } else {
                        const found = COURSE_PRESETS.find(p => p.name === val);
                        if (found) applyPreset(found);
                      }
                    }}
                    style={{
                      width: '100%',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '0.65rem',
                      border: '1.5px solid #0284c7',
                      backgroundColor: 'var(--surface)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      marginBottom: '0.5rem'
                    }}
                  >
                    <option value="" disabled>Selecione uma Norma Regulamentadora ou Curso Padrão...</option>
                    
                    <optgroup label="📋 Normas Regulamentadoras (NRs)">
                      {COURSE_PRESETS.filter(p => p.category === 'Normas Regulamentadoras (NRs)').map((p, idx) => (
                        <option key={idx} value={p.name}>
                          {p.name} ({p.duration})
                        </option>
                      ))}
                    </optgroup>

                    <optgroup label="🚑 Emergência, Brigada & Primeiros Socorros">
                      {COURSE_PRESETS.filter(p => p.category === 'Emergência & Primeiros Socorros').map((p, idx) => (
                        <option key={idx} value={p.name}>
                          {p.name} ({p.duration})
                        </option>
                      ))}
                    </optgroup>

                    <optgroup label="🚗 Operacional, Direção & Trânsito">
                      {COURSE_PRESETS.filter(p => p.category === 'Operacional & Trânsito').map((p, idx) => (
                        <option key={idx} value={p.name}>
                          {p.name} ({p.duration})
                        </option>
                      ))}
                    </optgroup>

                    <option value="custom">✏️ Outro Treinamento (digitar título personalizado)</option>
                  </select>

                  <input
                    type="text"
                    name="curso"
                    className="input"
                    value={formData.curso}
                    onChange={handleChange}
                    placeholder="Ex: NR-35 Trabalho em Altura / Brigada de Incêndio"
                    style={{ width: '100%', fontSize: '0.9rem', fontWeight: '600' }}
                  />
                </div>

                {/* Chips de Seleção Rápida */}
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>
                    Atalhos Rápidos Mais Usados:
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {COURSE_PRESETS.slice(0, 7).map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => applyPreset(p)}
                        style={{
                          backgroundColor: formData.curso === p.name ? 'rgba(2, 132, 199, 0.12)' : 'var(--surface-hover)',
                          border: formData.curso === p.name ? '1.5px solid #0284c7' : '1px solid var(--border)',
                          color: formData.curso === p.name ? '#0284c7' : 'var(--text-primary)',
                          borderRadius: '1.25rem',
                          padding: '0.25rem 0.65rem',
                          fontSize: '0.72rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {p.name.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Carga Horária e Data */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                  <div>
                    <label className="modal-label" style={{ fontWeight: '700', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem' }}>
                      <Clock size={14} style={{ color: '#0284c7' }} />
                      Carga Horária *
                    </label>
                    <select
                      className="input"
                      value={['4 horas', '8 horas', '16 horas', '20 horas', '40 horas'].includes(formData.duracao) ? formData.duracao : 'custom'}
                      onChange={(e) => {
                        if (e.target.value !== 'custom') {
                          setFormData(prev => ({ ...prev, duracao: e.target.value }));
                        }
                      }}
                      style={{ width: '100%', fontSize: '0.85rem', marginBottom: '0.35rem', borderRadius: '0.55rem' }}
                    >
                      <option value="4 horas">4 horas (Integração / NR-06)</option>
                      <option value="8 horas">8 horas (1 dia - NR-35 / Brigada)</option>
                      <option value="16 horas">16 horas (2 dias - NR-33 / NR-11)</option>
                      <option value="20 horas">20 horas (NR-05 CIPA)</option>
                      <option value="40 horas">40 horas (1 semana - NR-10 Básico / SEP)</option>
                      <option value="custom">Outra carga horária (personalizada)...</option>
                    </select>
                    <input
                      type="text"
                      name="duracao"
                      className="input"
                      value={formData.duracao}
                      onChange={handleChange}
                      placeholder="Ex: 8 horas, 16 horas"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label className="modal-label" style={{ fontWeight: '700', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Calendar size={14} style={{ color: '#0284c7' }} />
                      Data de Conclusão *
                    </label>
                    <input
                      type="date"
                      name="data"
                      className="input"
                      value={formData.data}
                      onChange={handleChange}
                      style={{ width: '100%', marginTop: '0.35rem' }}
                    />
                  </div>
                </div>

                {/* Local e Empresa Solicitante */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                  <div>
                    <label className="modal-label" style={{ fontWeight: '700', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <MapPin size={14} style={{ color: '#0284c7' }} />
                      Local / Cidade
                    </label>
                    <input
                      type="text"
                      name="local"
                      className="input"
                      value={formData.local}
                      onChange={handleChange}
                      placeholder="Ex: Mossoró - RN"
                      style={{ width: '100%', marginTop: '0.35rem' }}
                    />
                  </div>
                  <div>
                    <label className="modal-label" style={{ fontWeight: '700', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem' }}>
                      <Building size={14} style={{ color: '#0284c7' }} />
                      Empresa Solicitante
                    </label>
                    <select
                      className="input"
                      value={
                        companies.some(c => c.name.toLowerCase() === formData.empresa?.trim().toLowerCase())
                          ? companies.find(c => c.name.toLowerCase() === formData.empresa?.trim().toLowerCase()).id
                          : (formData.empresa === 'TotalSafety' ? 'totalsafety' : 'custom')
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'totalsafety') {
                          setFormData(prev => ({ ...prev, empresa: 'TotalSafety' }));
                        } else if (val === 'custom') {
                          // mantém para edição
                        } else {
                          const found = companies.find(c => String(c.id) === String(val));
                          if (found) {
                            setFormData(prev => ({ ...prev, empresa: found.name }));
                          }
                        }
                      }}
                      style={{ width: '100%', fontSize: '0.85rem', marginBottom: '0.35rem', borderRadius: '0.55rem' }}
                    >
                      <option value="totalsafety">🏢 TotalSafety (Padrão / Própria)</option>
                      {companies.length > 0 && (
                        <optgroup label="🏢 Empresas Cadastradas no TotalSafety">
                          {[...companies]
                            .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
                            .map(c => {
                              const grp = groups.find(g => g.id === c.groupId);
                              return (
                                <option key={c.id} value={c.id}>
                                  {c.name} {grp ? `(${grp.name.replace(/^\d+\s*-\s*/, '')})` : ''}
                                </option>
                              );
                            })}
                        </optgroup>
                      )}
                      <option value="custom">✍️ Digitar outro nome de empresa...</option>
                    </select>
                    <input
                      type="text"
                      name="empresa"
                      className="input"
                      value={formData.empresa}
                      onChange={handleChange}
                      placeholder="Ex: Nome da Empresa / TotalSafety"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                {/* Descrição / Texto de Conclusão */}
                <div>
                  <label className="modal-label" style={{ fontWeight: '700', fontSize: '0.8125rem' }}>
                    Texto de Certificação / Aproveitamento
                  </label>
                  <textarea
                    name="descricao"
                    className="input"
                    value={formData.descricao}
                    onChange={handleChange}
                    rows={2}
                    style={{ width: '100%', marginTop: '0.35rem', resize: 'vertical', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              {/* Card 2: Instrutor Responsável (Usuário do Sistema) */}
              <div style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '1rem',
                padding: '1.4rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.15rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                  <h2 style={{ fontSize: '1rem', fontWeight: '800', margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <UserCheck size={18} style={{ color: '#0284c7' }} />
                    Instrutor Responsável Técnico
                  </h2>
                  <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <ShieldCheck size={13} />
                    Credencial Oficial
                  </span>
                </div>

                {/* Seletor Integrado com Usuários */}
                <div>
                  <label className="modal-label" style={{ fontWeight: '700', fontSize: '0.8125rem', marginBottom: '0.45rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>Selecionar dos Usuários com Acesso ao Sistema:</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>
                      {profiles.length} instrutores disponíveis
                    </span>
                  </label>
                  <select
                    className="input"
                    value={profiles.some(p => p.name.trim().toLowerCase() === formData.instrutorNome?.trim().toLowerCase()) ? formData.instrutorNome : 'custom'}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'custom') {
                        // Mantém o valor atual para edição livre
                      } else if (val) {
                        const sel = profiles.find(p => p.name === val);
                        setFormData(prev => ({
                          ...prev,
                          instrutorNome: sel ? sel.name : val,
                          instrutorCargo: sel?.role === 'Admin' ? 'Instrutor e Responsável Técnico' : (sel?.role ? `Instrutor / ${sel.role}` : prev.instrutorCargo)
                        }));
                      }
                    }}
                    style={{
                      width: '100%',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '0.65rem',
                      border: '1.5px solid #0284c7',
                      backgroundColor: 'var(--surface)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="" disabled>Selecione um instrutor credenciado...</option>
                    <optgroup label="👥 Usuários Cadastrados no Sistema TotalSafety">
                      {profiles.map(p => (
                        <option key={p.id} value={p.name}>
                          {p.name} {p.role ? `— ${p.role}` : ''}
                        </option>
                      ))}
                    </optgroup>
                    <option value="custom">✏️ Outro Instrutor / Digitar Manualmente</option>
                  </select>
                </div>

                {/* Badge / Card Visual do Instrutor Selecionado */}
                {formData.instrutorNome && (
                  <div style={{
                    backgroundColor: 'rgba(2, 132, 199, 0.05)',
                    border: '1px solid rgba(2, 132, 199, 0.2)',
                    borderRadius: '0.75rem',
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}>
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      backgroundColor: '#0284c7',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '800',
                      fontSize: '0.9rem',
                      flexShrink: 0
                    }}>
                      {formData.instrutorNome.slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                          {formData.instrutorNome}
                        </span>
                        {profiles.some(p => p.name.trim().toLowerCase() === formData.instrutorNome.trim().toLowerCase()) ? (
                          <span style={{
                            backgroundColor: '#dcfce7',
                            color: '#15803d',
                            fontSize: '0.68rem',
                            fontWeight: '700',
                            padding: '1px 6px',
                            borderRadius: '0.75rem'
                          }}>
                            ✓ Usuário do Sistema
                          </span>
                        ) : (
                          <span style={{
                            backgroundColor: '#fef3c7',
                            color: '#b45309',
                            fontSize: '0.68rem',
                            fontWeight: '700',
                            padding: '1px 6px',
                            borderRadius: '0.75rem'
                          }}>
                            Instrutor Externo
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                        {formData.instrutorCargo || 'Instrutor e Responsável Técnico'} • {formData.instrutorRegistro || 'SRTE N° 0009823/RN'}
                      </div>
                    </div>
                  </div>
                )}

                {/* Campos do Instrutor */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
                  <div>
                    <label className="modal-label" style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                      Nome Completo do Instrutor
                    </label>
                    <input
                      type="text"
                      name="instrutorNome"
                      className="input"
                      value={formData.instrutorNome}
                      onChange={handleChange}
                      placeholder="Nome do Instrutor"
                      style={{ width: '100%', marginTop: '0.25rem' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label className="modal-label" style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                        Cargo / Qualificação
                      </label>
                      <input
                        type="text"
                        name="instrutorCargo"
                        className="input"
                        value={formData.instrutorCargo}
                        onChange={handleChange}
                        placeholder="Ex: Técnico em Segurança do Trabalho"
                        style={{ width: '100%', marginTop: '0.25rem' }}
                      />
                    </div>
                    <div>
                      <label className="modal-label" style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                        Registro Profissional (MTE / SRTE)
                      </label>
                      <input
                        type="text"
                        name="instrutorRegistro"
                        className="input"
                        value={formData.instrutorRegistro}
                        onChange={handleChange}
                        placeholder="Ex: SRTE N° 0009823/RN"
                        style={{ width: '100%', marginTop: '0.25rem' }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Conteúdo Programático (Verso do Certificado) */}
              <div style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '1rem',
                padding: '1.4rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                  <h2 style={{ fontSize: '1rem', fontWeight: '800', margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileText size={18} style={{ color: '#0284c7' }} />
                    Conteúdo Programático (Verso)
                  </h2>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    Slide 2 de cada aluno
                  </span>
                </div>

                <textarea
                  name="conteudo"
                  className="input"
                  value={formData.conteudo}
                  onChange={handleChange}
                  rows={5}
                  placeholder="Itens do conteúdo programático que serão impressos no verso do certificado..."
                  style={{ width: '100%', resize: 'vertical', fontFamily: 'monospace', fontSize: '0.8125rem', lineHeight: '1.5' }}
                />
              </div>

            </div>

            {/* ------------------------------------------------------------- */}
            {/* COLUNA DIREITA: PREVIEW DO CERTIFICADO + ALUNOS + EMISSÃO    */}
            {/* ------------------------------------------------------------- */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* CARD PREVIEW INTERATIVO DO CERTIFICADO */}
              <div style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '1rem',
                padding: '1.25rem',
                boxShadow: '0 4px 15px rgba(0,0,0,0.04)',
                background: 'linear-gradient(180deg, var(--surface) 0%, rgba(2, 132, 199, 0.02) 100%)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <Eye size={17} style={{ color: '#0284c7' }} />
                    <span style={{ fontSize: '0.875rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                      Pré-visualização do Certificado
                    </span>
                  </div>

                  {/* Toggle Frente / Verso */}
                  <div style={{
                    display: 'flex',
                    backgroundColor: 'var(--surface-hover)',
                    borderRadius: '0.5rem',
                    padding: '2px',
                    border: '1px solid var(--border)'
                  }}>
                    <button
                      type="button"
                      onClick={() => setPreviewTab('frente')}
                      style={{
                        padding: '0.25rem 0.65rem',
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        borderRadius: '0.35rem',
                        border: 'none',
                        cursor: 'pointer',
                        backgroundColor: previewTab === 'frente' ? '#0284c7' : 'transparent',
                        color: previewTab === 'frente' ? '#fff' : 'var(--text-secondary)'
                      }}
                    >
                      Frente (Slide 1)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTab('verso')}
                      style={{
                        padding: '0.25rem 0.65rem',
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        borderRadius: '0.35rem',
                        border: 'none',
                        cursor: 'pointer',
                        backgroundColor: previewTab === 'verso' ? '#0284c7' : 'transparent',
                        color: previewTab === 'verso' ? '#fff' : 'var(--text-secondary)'
                      }}
                    >
                      Verso (Slide 2)
                    </button>
                  </div>
                </div>

                {/* Moldura do Certificado Mockup */}
                <div style={{
                  border: '2px solid rgba(2, 132, 199, 0.35)',
                  borderRadius: '0.75rem',
                  padding: '1.25rem 1.5rem',
                  backgroundColor: '#ffffff',
                  boxShadow: 'inset 0 0 0 4px rgba(2, 132, 199, 0.05)',
                  minHeight: '190px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  textAlign: 'center',
                  position: 'relative'
                }}>
                  {previewTab === 'frente' ? (
                    <>
                      <div>
                        <div style={{ 
                          fontSize: '0.6875rem', 
                          fontWeight: '800', 
                          color: '#0284c7', 
                          letterSpacing: '2px', 
                          textTransform: 'uppercase',
                          marginBottom: '0.25rem'
                        }}>
                          TOTALSAFETY • CERTIFICADO DE CAPACITAÇÃO
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          Certificamos que
                        </div>
                        <div style={{ 
                          fontSize: '1.1rem', 
                          fontWeight: '800', 
                          color: '#0f172a', 
                          borderBottom: '1px solid #cbd5e1',
                          display: 'inline-block',
                          padding: '0.25rem 1.5rem',
                          margin: '0.25rem auto'
                        }}>
                          {firstStudent?.nome ? firstStudent.nome.toUpperCase() : 'NOME DO PARTICIPANTE'}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: '0.2rem' }}>
                          CPF: <strong>{firstStudent?.cpf ? firstStudent.cpf : '000.000.000-00'}</strong> concluiu com êxito o treinamento:
                        </div>
                        <div style={{ 
                          fontSize: '0.95rem', 
                          fontWeight: '700', 
                          color: '#0284c7', 
                          marginTop: '0.35rem' 
                        }}>
                          {formData.curso}
                        </div>
                      </div>

                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: '1rem',
                        paddingTop: '0.65rem',
                        borderTop: '1px dashed #e2e8f0',
                        fontSize: '0.6875rem',
                        color: '#64748b'
                      }}>
                        <div style={{ textAlign: 'left' }}>
                          <div><strong>Data:</strong> {formData.data ? new Date(formData.data + 'T12:00:00').toLocaleDateString('pt-BR') : 'Data'}</div>
                          <div><strong>Carga:</strong> {formData.duracao} • {formData.local}</div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: '700', color: '#0f172a' }}>{formData.instrutorNome}</div>
                          <div style={{ fontSize: '0.65rem' }}>{formData.instrutorCargo}</div>
                          <div style={{ fontSize: '0.62rem', color: '#94a3b8' }}>{formData.instrutorRegistro}</div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ 
                        fontSize: '0.6875rem', 
                        fontWeight: '800', 
                        color: '#0284c7', 
                        letterSpacing: '1px', 
                        textTransform: 'uppercase',
                        textAlign: 'center',
                        marginBottom: '0.5rem'
                      }}>
                        CONTEÚDO PROGRAMÁTICO OFICIAL
                      </div>
                      <div style={{ 
                        fontSize: '0.72rem', 
                        color: '#334155', 
                        lineHeight: '1.45', 
                        whiteSpace: 'pre-line',
                        maxHeight: '140px',
                        overflowY: 'auto'
                      }}>
                        {formData.conteudo}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* CARD DE ALUNOS PARTICIPANTES */}
              <div style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '1rem',
                padding: '1.4rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  marginBottom: '1rem', 
                  flexWrap: 'wrap', 
                  gap: '0.5rem',
                  borderBottom: '1px solid var(--border)',
                  paddingBottom: '0.75rem'
                }}>
                  <div>
                    <h2 style={{ fontSize: '1rem', fontWeight: '800', margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <Users size={18} style={{ color: '#0284c7' }} />
                      Lista de Participantes ({colaboradores.length})
                    </h2>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {validCount} participante(s) com nome válido para emissão
                    </span>
                  </div>

                  {/* Ações da Lista */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setShowBatchModal(true)}
                      style={{ 
                        backgroundColor: 'var(--surface-hover)', 
                        border: '1px solid var(--border)',
                        fontSize: '0.78rem', 
                        fontWeight: '600',
                        padding: '0.45rem 0.75rem',
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.35rem' 
                      }}
                      title="Colar texto em lote com vários participantes"
                    >
                      <ClipboardCopy size={13} style={{ color: '#0284c7' }} />
                      Colar em Lote
                    </button>

                    <button
                      type="button"
                      className="btn"
                      onClick={addColaborador}
                      style={{ 
                        backgroundColor: 'rgba(2, 132, 199, 0.1)', 
                        border: '1px solid rgba(2, 132, 199, 0.25)',
                        color: '#0284c7',
                        fontSize: '0.78rem', 
                        fontWeight: '700',
                        padding: '0.45rem 0.8rem',
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.35rem' 
                      }}
                    >
                      <Plus size={14} />
                      Adicionar Aluno
                    </button>

                    {colaboradores.length > 1 && (
                      <button
                        type="button"
                        onClick={clearAllColaboradores}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          padding: '0.4rem',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        title="Limpar todos os participantes"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Lista de Alunos com Scroll Suave */}
                <div style={{ 
                  maxHeight: '420px', 
                  overflowY: 'auto', 
                  paddingRight: '0.35rem',
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '0.55rem' 
                }}>
                  {colaboradores.map((colab, idx) => {
                    const isCpfValid = colab.cpf && colab.cpf.replace(/\D/g, '').length === 11;
                    return (
                      <div 
                        key={idx} 
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.55rem',
                          backgroundColor: 'var(--surface-hover)',
                          padding: '0.55rem 0.85rem',
                          borderRadius: '0.75rem',
                          border: '1px solid var(--border)',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {/* Avatar com Índice */}
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          backgroundColor: colab.nome.trim() ? 'rgba(2, 132, 199, 0.15)' : 'var(--border)',
                          color: colab.nome.trim() ? '#0284c7' : 'var(--text-secondary)',
                          fontSize: '0.72rem',
                          fontWeight: '800',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {idx + 1}
                        </div>

                        {/* Nome do Participante */}
                        <input
                          type="text"
                          className="input"
                          placeholder="Nome completo do participante"
                          value={colab.nome}
                          onChange={(e) => handleColabChange(idx, 'nome', e.target.value)}
                          style={{ flex: 2, fontSize: '0.85rem', padding: '0.45rem 0.75rem' }}
                        />

                        {/* CPF com Indicador de Formato */}
                        <div style={{ position: 'relative', flex: 1.2 }}>
                          <input
                            type="text"
                            className="input"
                            placeholder="000.000.000-00"
                            value={colab.cpf}
                            onChange={(e) => handleColabChange(idx, 'cpf', formatCpf(e.target.value))}
                            style={{ 
                              width: '100%', 
                              fontSize: '0.85rem', 
                              padding: '0.45rem 0.75rem', 
                              fontFamily: 'monospace',
                              paddingRight: isCpfValid ? '1.8rem' : '0.75rem'
                            }}
                            maxLength={14}
                          />
                          {isCpfValid && (
                            <Check 
                              size={14} 
                              style={{ 
                                position: 'absolute', 
                                right: '0.6rem', 
                                top: '50%', 
                                transform: 'translateY(-50%)', 
                                color: '#10b981' 
                              }} 
                            />
                          )}
                        </div>

                        {/* Botão Remover */}
                        <button
                          type="button"
                          onClick={() => removeColaborador(idx)}
                          style={{ 
                            background: 'none', 
                            border: 'none', 
                            color: 'var(--text-secondary)', 
                            cursor: 'pointer', 
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            transition: 'color 0.15s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--danger)'}
                          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                          title="Remover participante"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* BOTÃO PRINCIPAL DE GERAÇÃO PPTX */}
                <div style={{ marginTop: '1.25rem', paddingTop: '1.15rem', borderTop: '1px solid var(--border)' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '0.75rem',
                    fontSize: '0.78rem',
                    color: 'var(--text-secondary)'
                  }}>
                    <span>Formato Oficial: <strong>Microsoft PowerPoint (.pptx)</strong></span>
                    <span>Total de slides: <strong>{validCount * 2} slides</strong> (Frente + Verso)</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={generating || validCount === 0}
                    style={{
                      width: '100%',
                      padding: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.65rem',
                      fontSize: '1rem',
                      fontWeight: '800',
                      color: '#ffffff',
                      background: validCount === 0 
                        ? 'var(--border)' 
                        : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                      border: 'none',
                      borderRadius: '0.85rem',
                      cursor: validCount === 0 || generating ? 'not-allowed' : 'pointer',
                      boxShadow: validCount === 0 ? 'none' : '0 10px 25px -5px rgba(2, 132, 199, 0.45)',
                      transition: 'all 0.2s ease',
                      opacity: generating ? 0.8 : 1
                    }}
                  >
                    {generating ? (
                      <>
                        <Loader size={20} className="animate-spin" />
                        Gerando Apresentação com {validCount} Certificados...
                      </>
                    ) : (
                      <>
                        <Download size={20} />
                        Baixar Certificados em PowerPoint (.pptx)
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: TURMAS & INSCRIÇÕES OFICIAIS                                       */}
      {/* ========================================================================= */}
      {activeTab === 'turmas' && (
        <div>
          {/* Card Hero: Link Público Geral */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.08) 0%, rgba(15, 23, 42, 0.03) 100%)',
            border: '1px solid rgba(2, 132, 199, 0.25)',
            borderRadius: '1.15rem',
            padding: '1.35rem 1.6rem',
            marginBottom: '1.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.35rem' }}>
                <span style={{ 
                  backgroundColor: '#0284c7', 
                  color: '#fff', 
                  fontSize: '0.72rem', 
                  fontWeight: '700', 
                  padding: '2px 10px', 
                  borderRadius: '1rem',
                  textTransform: 'uppercase'
                }}>
                  Portal Público de Participação
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: '#10b981', fontWeight: '700' }}>
                  <ShieldCheck size={15} />
                  Validação Oficial Receita (CPF A)
                </span>
              </div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                Envie o link para os alunos preencherem a lista de presença com CPF e Data de Nascimento:
              </h3>
              <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <code style={{ 
                  backgroundColor: 'var(--surface)', 
                  border: '1px solid var(--border)', 
                  padding: '0.45rem 0.95rem', 
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  color: '#0284c7',
                  fontWeight: '700',
                  fontFamily: 'monospace'
                }}>
                  {window.location.origin}/inscricao
                </code>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => copyPublicLink(null, 'banner-general')}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.45rem', 
                  fontSize: '0.875rem',
                  fontWeight: '700',
                  padding: '0.65rem 1.15rem',
                  backgroundColor: '#0284c7',
                  boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
                }}
              >
                {copiedKey === 'banner-general' ? <Check size={16} /> : <Copy size={16} />}
                {copiedKey === 'banner-general' ? 'Copiado para a Área de Transferência!' : 'Copiar Link Público'}
              </button>

              <a
                href="/inscricao"
                target="_blank"
                rel="noopener noreferrer"
                className="btn"
                style={{
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  padding: '0.65rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  textDecoration: 'none'
                }}
              >
                <Eye size={15} />
                Testar Formulário
              </a>
            </div>
          </div>

          {/* Seção de Turmas Cadastradas */}
          <div style={{ marginBottom: '2.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.15rem' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>
                  Turmas de Treinamento ({turmas.length})
                </h2>
                <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  Cada turma possui link próprio, instrutor do sistema e exportação direta de certificados.
                </p>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleOpenNewTurma}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.45rem', 
                  fontSize: '0.875rem',
                  fontWeight: '700',
                  backgroundColor: '#0284c7',
                  padding: '0.6rem 1.15rem',
                  boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
                }}
              >
                <Plus size={16} />
                Nova Turma
              </button>
            </div>

            {loadingData ? (
              <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <Loader size={26} className="animate-spin" style={{ margin: '0 auto 0.65rem', color: '#0284c7' }} />
                Carregando turmas...
              </div>
            ) : turmas.length === 0 ? (
              <div style={{
                padding: '3rem 2rem',
                textAlign: 'center',
                backgroundColor: 'var(--surface)',
                border: '1px dashed var(--border)',
                borderRadius: '1.25rem'
              }}>
                <Award size={40} style={{ color: 'var(--text-secondary)', margin: '0 auto 0.85rem', opacity: 0.4 }} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                  Nenhuma turma criada ainda
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.35rem', marginBottom: '1.25rem' }}>
                  Crie sua primeira turma selecionando um instrutor do sistema para gerar links de presença e certificados em lote.
                </p>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleOpenNewTurma}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.875rem', fontWeight: '700', backgroundColor: '#0284c7' }}
                >
                  <Plus size={16} />
                  Criar Primeira Turma
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.15rem' }}>
                {turmas.map(turma => {
                  const studentCount = enrollments.filter(e => e.turma_id === turma.id).length;
                  return (
                    <div
                      key={turma.id}
                      style={{
                        backgroundColor: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: '1rem',
                        padding: '1.35rem',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                        transition: 'transform 0.15s, box-shadow 0.15s'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                          <span style={{
                            backgroundColor: turma.status === 'Concluída' ? '#f1f5f9' : 'rgba(2, 132, 199, 0.1)',
                            color: turma.status === 'Concluída' ? '#64748b' : '#0284c7',
                            fontSize: '0.72rem',
                            fontWeight: '700',
                            padding: '3px 10px',
                            borderRadius: '1rem',
                            textTransform: 'uppercase'
                          }}>
                            {turma.status || 'Aberta'}
                          </span>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <button
                              type="button"
                              onClick={() => handleEditTurma(turma)}
                              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
                              title="Editar Turma"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTurma(turma.id, turma.name)}
                              style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }}
                              title="Excluir Turma"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-primary)', margin: '0.65rem 0 0.35rem' }}>
                          {turma.name}
                        </h3>
                        {turma.course_name && turma.course_name !== turma.name && (
                          <div style={{ fontSize: '0.85rem', color: '#0284c7', fontWeight: '700', marginBottom: '0.45rem' }}>
                            {turma.course_name}
                          </div>
                        )}

                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                          {turma.instructor_name && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <User size={14} style={{ color: '#0284c7' }} />
                              <span><strong>Instrutor:</strong> {turma.instructor_name}</span>
                            </div>
                          )}
                          {turma.company && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <Building size={14} style={{ color: 'var(--text-secondary)' }} />
                              <span><strong>Empresa:</strong> {turma.company}</span>
                            </div>
                          )}
                          {turma.start_date && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <Calendar size={14} style={{ color: 'var(--text-secondary)' }} />
                              <span><strong>Data:</strong> {new Date(turma.start_date + 'T12:00:00').toLocaleDateString('pt-BR')} • {turma.duration || '8h'}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{
                        paddingTop: '0.85rem',
                        borderTop: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.5rem',
                        flexWrap: 'wrap'
                      }}>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Users size={15} style={{ color: '#0284c7' }} />
                          <strong style={{ color: 'var(--text-primary)' }}>{studentCount}</strong> inscritos
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <button
                            type="button"
                            className="btn"
                            onClick={() => copyPublicLink(turma.id, `turma-${turma.id}`)}
                            style={{ 
                              fontSize: '0.78rem', 
                              padding: '0.4rem 0.75rem', 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '0.3rem',
                              backgroundColor: 'var(--surface-hover)',
                              border: '1px solid var(--border)',
                              fontWeight: '600'
                            }}
                            title="Copiar link de inscrição específico desta turma"
                          >
                            {copiedKey === `turma-${turma.id}` ? <Check size={14} style={{ color: '#10b981' }} /> : <Copy size={14} />}
                            {copiedKey === `turma-${turma.id}` ? 'Link Copiado' : 'Link da Turma'}
                          </button>

                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => handleLoadTurmaIntoGenerator(turma)}
                            style={{ 
                              fontSize: '0.78rem', 
                              padding: '0.4rem 0.85rem', 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '0.35rem',
                              backgroundColor: '#0284c7',
                              fontWeight: '700'
                            }}
                            title="Carregar alunos desta turma no gerador de certificados"
                          >
                            <Award size={14} />
                            Emitir PPTX
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Seção da Tabela de Inscritos */}
          <div>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              flexWrap: 'wrap', 
              gap: '1rem', 
              marginBottom: '1.15rem' 
            }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>
                  Participantes & Lista de Presença ({filteredEnrollments.length})
                </h2>
                <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  Dados em tempo real obtidos com CPF e Data de Nascimento via Receita Federal.
                </p>
              </div>

              {/* Filtros e Busca */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                  <input
                    type="text"
                    placeholder="Buscar por nome ou CPF..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input"
                    style={{ paddingLeft: '2.2rem', width: '240px', fontSize: '0.85rem' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Filter size={15} style={{ color: 'var(--text-secondary)' }} />
                  <select
                    value={selectedTurmaFilter}
                    onChange={(e) => setSelectedTurmaFilter(e.target.value)}
                    className="input"
                    style={{ fontSize: '0.85rem' }}
                  >
                    <option value="all">Todas as Turmas ({enrollments.length})</option>
                    <option value="unassigned">Sem Turma Vinculada ({enrollments.filter(e => !e.turma_id).length})</option>
                    {turmas.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({enrollments.filter(e => e.turma_id === t.id).length})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  className="btn"
                  onClick={loadData}
                  title="Atualizar lista em tempo real"
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '0.6rem',
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--border)'
                  }}
                >
                  <RefreshCw size={15} />
                </button>
              </div>
            </div>

            {/* Tabela de Participantes */}
            <div style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '1rem',
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
            }}>
              {filteredEnrollments.length === 0 ? (
                <div style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <Users size={36} style={{ margin: '0 auto 0.65rem', opacity: 0.3 }} />
                  <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600' }}>
                    {searchQuery ? 'Nenhum aluno encontrado para os filtros atuais.' : 'Nenhuma inscrição recebida ainda.'}
                  </p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--surface-hover)', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        <th style={{ padding: '0.85rem 1.15rem' }}>Participante Oficial</th>
                        <th style={{ padding: '0.85rem 1.15rem' }}>CPF</th>
                        <th style={{ padding: '0.85rem 1.15rem' }}>Nascimento</th>
                        <th style={{ padding: '0.85rem 1.15rem' }}>Turma Vinculada</th>
                        <th style={{ padding: '0.85rem 1.15rem' }}>Inscrição</th>
                        <th style={{ padding: '0.85rem 1.15rem', textAlign: 'right' }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEnrollments.map(student => {
                        return (
                          <tr key={student.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.15s' }}>
                            <td style={{ padding: '0.85rem 1.15rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                <div style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '50%',
                                  backgroundColor: 'rgba(2, 132, 199, 0.1)',
                                  color: '#0284c7',
                                  fontSize: '0.75rem',
                                  fontWeight: '800',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}>
                                  {student.nome?.charAt(0)?.toUpperCase() || 'P'}
                                </div>
                                <div>
                                  <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                                    {student.nome}
                                  </div>
                                  {student.empresa && (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                      {student.empresa} {student.telefone ? `• ${student.telefone}` : ''}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '0.85rem 1.15rem', fontFamily: 'monospace', fontWeight: '600', color: '#0284c7' }}>
                              {student.cpf}
                            </td>
                            <td style={{ padding: '0.85rem 1.15rem', color: 'var(--text-secondary)' }}>
                              {student.data_nascimento ? new Date(student.data_nascimento + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                            </td>
                            <td style={{ padding: '0.85rem 1.15rem' }}>
                              <select
                                value={student.turma_id || ''}
                                onChange={(e) => handleStudentTurmaChange(student.id, e.target.value)}
                                className="input"
                                style={{ fontSize: '0.8125rem', padding: '0.35rem 0.65rem', width: 'auto', maxWidth: '220px' }}
                              >
                                <option value="">(Sem turma vinculada)</option>
                                {turmas.map(t => (
                                  <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                              </select>
                            </td>
                            <td style={{ padding: '0.85rem 1.15rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                              {student.created_at ? new Date(student.created_at).toLocaleDateString('pt-BR') : '-'}
                            </td>
                            <td style={{ padding: '0.85rem 1.15rem', textAlign: 'right' }}>
                              <button
                                type="button"
                                onClick={() => handleDeleteStudent(student.id, student.nome)}
                                style={{ 
                                  background: 'none', 
                                  border: 'none', 
                                  color: 'var(--text-secondary)', 
                                  cursor: 'pointer', 
                                  padding: '5px',
                                  transition: 'color 0.15s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--danger)'}
                                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                                title="Excluir Inscrição"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CRIAR OU EDITAR TURMA                                              */}
      {/* ========================================================================= */}
      {showTurmaModal && (
        <div className="modal-backdrop" onClick={() => setShowTurmaModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px', borderRadius: '1.25rem', padding: '1.75rem' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.85rem', marginBottom: '1.25rem' }}>
              <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', fontSize: '1.15rem', fontWeight: '800' }}>
                <Award size={20} style={{ color: '#0284c7' }} />
                {editingTurma ? 'Editar Turma de Treinamento' : 'Criar Nova Turma de Treinamento'}
              </h2>
              <button className="modal-close" onClick={() => setShowTurmaModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveTurma} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              <div>
                <label className="modal-label" style={{ fontWeight: '700', fontSize: '0.8125rem' }}>Identificação da Turma *</label>
                <input
                  type="text"
                  required
                  className="input"
                  placeholder="Ex: Turma 01 - NR-35 Trabalho em Altura / Março 2026"
                  value={turmaFormData.name}
                  onChange={e => setTurmaFormData(prev => ({ ...prev, name: e.target.value }))}
                  style={{ width: '100%', marginTop: '0.35rem', fontWeight: '600' }}
                />
              </div>

              <div>
                <label className="modal-label" style={{ fontWeight: '700', fontSize: '0.8125rem' }}>Nome Oficial do Curso *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ex: NR-35 - Segurança no Trabalho em Altura"
                  value={turmaFormData.course_name}
                  onChange={e => setTurmaFormData(prev => ({ ...prev, course_name: e.target.value }))}
                  style={{ width: '100%', marginTop: '0.35rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div>
                  <label className="modal-label" style={{ fontWeight: '700', fontSize: '0.8125rem' }}>Carga Horária</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Ex: 8 horas, 16 horas"
                    value={turmaFormData.duration}
                    onChange={e => setTurmaFormData(prev => ({ ...prev, duration: e.target.value }))}
                    style={{ width: '100%', marginTop: '0.35rem' }}
                  />
                </div>
                <div>
                  <label className="modal-label" style={{ fontWeight: '700', fontSize: '0.8125rem' }}>Data de Conclusão / Realização</label>
                  <input
                    type="date"
                    className="input"
                    value={turmaFormData.start_date}
                    onChange={e => setTurmaFormData(prev => ({ ...prev, start_date: e.target.value }))}
                    style={{ width: '100%', marginTop: '0.35rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div>
                  <label className="modal-label" style={{ fontWeight: '700', fontSize: '0.8125rem' }}>Local / Cidade</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Ex: Mossoró - RN"
                    value={turmaFormData.location}
                    onChange={e => setTurmaFormData(prev => ({ ...prev, location: e.target.value }))}
                    style={{ width: '100%', marginTop: '0.35rem' }}
                  />
                </div>
                <div>
                  <label className="modal-label" style={{ fontWeight: '700', fontSize: '0.8125rem' }}>Empresa Solicitante</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Ex: TotalSafety / Nome do Cliente"
                    value={turmaFormData.company}
                    onChange={e => setTurmaFormData(prev => ({ ...prev, company: e.target.value }))}
                    style={{ width: '100%', marginTop: '0.35rem' }}
                  />
                </div>
              </div>

              {/* Instrutor entre os Usuários */}
              <div>
                <label className="modal-label" style={{ fontWeight: '700', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <User size={14} style={{ color: '#0284c7' }} />
                  Instrutor Responsável Técnico *
                </label>
                
                <select
                  className="input"
                  value={profiles.some(p => p.name.trim() === turmaFormData.instructor_name?.trim()) ? turmaFormData.instructor_name : (turmaFormData.instructor_name ? 'custom' : '')}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'custom') {
                      // Custom
                    } else if (val) {
                      const sel = profiles.find(p => p.name === val);
                      setTurmaFormData(prev => ({
                        ...prev,
                        instructor_name: sel ? sel.name : val,
                        instructor_role: sel?.role === 'Admin' ? 'Instrutor e Responsável Técnico' : (sel?.role ? `Instrutor / ${sel.role}` : prev.instructor_role)
                      }));
                    }
                  }}
                  style={{ marginTop: '0.35rem', marginBottom: '0.5rem', width: '100%' }}
                >
                  <option value="">Selecione um instrutor dos usuários do sistema...</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.name}>
                      {p.name} {p.role ? `— ${p.role}` : ''}
                    </option>
                  ))}
                  <option value="custom">Outro / Digitar manualmente</option>
                </select>

                <input
                  type="text"
                  required
                  className="input"
                  placeholder="Nome do Instrutor"
                  value={turmaFormData.instructor_name}
                  onChange={e => setTurmaFormData(prev => ({ ...prev, instructor_name: e.target.value }))}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div>
                  <label className="modal-label" style={{ fontWeight: '700', fontSize: '0.8125rem' }}>Cargo do Instrutor</label>
                  <input
                    type="text"
                    className="input"
                    value={turmaFormData.instructor_role}
                    onChange={e => setTurmaFormData(prev => ({ ...prev, instructor_role: e.target.value }))}
                    style={{ width: '100%', marginTop: '0.35rem' }}
                  />
                </div>
                <div>
                  <label className="modal-label" style={{ fontWeight: '700', fontSize: '0.8125rem' }}>Registro SRTE</label>
                  <input
                    type="text"
                    className="input"
                    value={turmaFormData.instructor_registration}
                    onChange={e => setTurmaFormData(prev => ({ ...prev, instructor_registration: e.target.value }))}
                    style={{ width: '100%', marginTop: '0.35rem' }}
                  />
                </div>
              </div>

              <div>
                <label className="modal-label" style={{ fontWeight: '700', fontSize: '0.8125rem' }}>Status da Turma</label>
                <select
                  className="input"
                  value={turmaFormData.status}
                  onChange={e => setTurmaFormData(prev => ({ ...prev, status: e.target.value }))}
                  style={{ width: '100%', marginTop: '0.35rem' }}
                >
                  <option value="Aberta">Aberta (Aceitando inscrições)</option>
                  <option value="Em Andamento">Em Andamento</option>
                  <option value="Concluída">Concluída</option>
                </select>
              </div>

              <div className="modal-actions" style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowTurmaModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ backgroundColor: '#0284c7', fontWeight: '700' }}>
                  {editingTurma ? 'Salvar Alterações' : 'Criar Turma'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: TOKEN DA API CPF.CNPJ                                              */}
      {/* ========================================================================= */}
      {showTokenModal && (
        <div className="modal-backdrop" onClick={() => setShowTokenModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', borderRadius: '1.25rem', padding: '1.75rem' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.85rem', marginBottom: '1.25rem' }}>
              <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', fontSize: '1.15rem', fontWeight: '800' }}>
                <Key size={18} style={{ color: '#0284c7' }} />
                Configuração da API CPF A
              </h2>
              <button className="modal-close" onClick={() => setShowTokenModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveApiToken} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                A página pública de inscrição utiliza a <strong>API CPF.CNPJ (Pacote 1: CPF A)</strong> para consultar a Receita Federal e validar em tempo real o nome completo do participante ao digitar o CPF.
              </div>

              <div>
                <label className="modal-label" style={{ fontWeight: '700', fontSize: '0.8125rem' }}>Base URL da API</label>
                <input
                  type="text"
                  disabled
                  className="input"
                  value="https://api.cpfcnpj.com.br"
                  style={{ opacity: 0.8, marginTop: '0.35rem', width: '100%' }}
                />
              </div>

              <div>
                <label className="modal-label" style={{ fontWeight: '700', fontSize: '0.8125rem' }}>Token de Acesso (Teste ou Produção)</label>
                <input
                  type="text"
                  required
                  className="input"
                  placeholder="Cole aqui seu token de integração"
                  value={apiToken}
                  onChange={e => setApiToken(e.target.value)}
                  style={{ fontFamily: 'monospace', fontSize: '0.85rem', marginTop: '0.35rem', width: '100%' }}
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.35rem', display: 'block' }}>
                  Token padrão: <code>5ae973d7a997af13f0aaf2bf60e65803</code>
                </span>
              </div>

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowTokenModal(false)}>
                  Fechar
                </button>
                <button type="submit" className="btn btn-primary" style={{ backgroundColor: '#0284c7', fontWeight: '700' }}>
                  Salvar Token
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: COLAR EM LOTE (TEXTO)                                              */}
      {/* ========================================================================= */}
      {showBatchModal && (
        <div className="modal-backdrop" onClick={() => setShowBatchModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '580px', borderRadius: '1.25rem', padding: '1.75rem' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.85rem', marginBottom: '1.25rem' }}>
              <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', fontSize: '1.15rem', fontWeight: '800' }}>
                <ClipboardCopy size={20} style={{ color: '#0284c7' }} />
                Importar Participantes em Lote
              </h2>
              <button className="modal-close" onClick={() => setShowBatchModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                Cole abaixo a lista de participantes, um por linha. O sistema detecta automaticamente nomes e CPFs separados por traço, vírgula, tabulação ou espaço.
              </p>

              <textarea
                className="input"
                rows={9}
                value={batchText}
                onChange={(e) => setBatchText(e.target.value)}
                placeholder={"Exemplo:\nJoão da Silva - 123.456.789-00\nMaria Santos, 98765432100\nCarlos Eduardo Ferreira\nAna Paula de Oliveira - 111.222.333-44"}
                style={{ fontFamily: 'monospace', fontSize: '0.85rem', resize: 'vertical', width: '100%', lineHeight: '1.5' }}
              />

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowBatchModal(false)}>
                  Cancelar
                </button>
                <button type="button" className="btn btn-primary" onClick={handleProcessBatch} style={{ backgroundColor: '#0284c7', fontWeight: '700' }}>
                  Processar Lista
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default TrainingCertificatesPage;
