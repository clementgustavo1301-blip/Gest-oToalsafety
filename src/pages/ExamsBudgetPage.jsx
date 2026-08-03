import React, { useState } from 'react';
import { 
  Stethoscope, Search, Plus, Trash2, Copy, Check, MessageSquare, 
  RefreshCw, DollarSign, Calculator, FileText, AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Exames transcritos fielmente da Tabela Oficial ECOCLINIC (Anexo I - Tabela de Valores de Procedimentos)
const ECOCLINIC_EXAMS = [
  // CONSULTAS E PROCEDIMENTOS OCUPACIONAIS
  { id: '1', name: 'ASO – Atestado de Saúde Ocupacional', category: 'Ocupacional', price: 40.00 },
  { id: '2', name: 'Consulta Ocupacional PCD', category: 'Ocupacional', price: 69.00 },
  { id: '3', name: 'Homologação de PCD', category: 'Ocupacional', price: 69.00 },
  { id: '4', name: 'Questionário de Saúde', category: 'Ocupacional', price: 29.00 },
  { id: '5', name: 'Questionário de Epilepsia', category: 'Ocupacional', price: 35.00 },
  { id: '6', name: 'Anamnese do Sono / Questionário Epworth', category: 'Ocupacional', price: 28.00 },

  // EXAMES COMPLEMENTARES / AUDIÇÃO E VISÃO
  { id: '7', name: 'Audiometria (Tonal e Vocal)', category: 'Auditivo', price: 45.00 },
  { id: '8', name: 'Acuidade Visual / Discriminação de Cores', category: 'Visão', price: 35.00 },
  { id: '9', name: 'Teste de Ishihara', category: 'Visão', price: 0.00 }, // Incluso

  // EXAMES CARDIOLÓGICOS, NEUROLÓGICOS E RESPIRATÓRIOS
  { id: '10', name: 'Eletrocardiograma (ECG)', category: 'Cardiológico', price: 45.00 },
  { id: '11', name: 'Eletroencefalograma (EEG)', category: 'Neurológico', price: 80.00 },
  { id: '12', name: 'Espirometria', category: 'Respiratório', price: 60.00 },
  { id: '13', name: 'Avaliação Psicossocial (Teste Palográfico)', category: 'Psicológico', price: 105.00 },

  // RADIOLOGIA E ULTRASSONOGRAFIA
  { id: '14', name: 'Raio X de Tórax (OIT)', category: 'Radiologia', price: 69.00 },
  { id: '15', name: 'Ultrassonografia de Abdômen', category: 'Imagem', price: 45.00 },

  // TOXICOLOGIA E BIOMONITORIZAÇÃO URINÁRIA / SANGUÍNEA
  { id: '16', name: 'Toxicologia (Drogas Urinárias)', category: 'Toxicologia', price: 150.00 },
  { id: '17', name: 'Acetona Urinária', category: 'Toxicologia', price: 30.00 },
  { id: '18', name: 'Ácido Butoxiacético na Urina', category: 'Toxicologia', price: 28.00 },
  { id: '19', name: 'Ácido Delta Amino Levulínico Urinário (ALA-U)', category: 'Toxicologia', price: 25.00 },
  { id: '20', name: 'Ácido Hipúrico (para Tolueno)', category: 'Toxicologia', price: 23.00 },
  { id: '21', name: 'Ácido Mandélico (para Estireno)', category: 'Toxicologia', price: 28.00 },
  { id: '22', name: 'Ácido Metil-Hipúrico (para Xilenos)', category: 'Toxicologia', price: 23.00 },
  { id: '23', name: 'Ácido Trans,Trans-Mucônico Urinário', category: 'Toxicologia', price: 48.00 },
  { id: '24', name: 'Anti-HVA (Metabólito da N-Hexano)', category: 'Toxicologia', price: 31.00 },
  { id: '25', name: 'Arsênio', category: 'Toxicologia', price: 49.00 },
  { id: '26', name: 'Carboxi-hemoglobina', category: 'Toxicologia', price: 26.00 },
  { id: '27', name: 'Chumbo no Sangue', category: 'Toxicologia', price: 31.00 },
  { id: '28', name: 'Chumbo Urinário', category: 'Toxicologia', price: 29.00 },
  { id: '29', name: 'Cobre no Sangue', category: 'Toxicologia', price: 39.00 },
  { id: '30', name: 'Cobre Urinário', category: 'Toxicologia', price: 33.00 },
  { id: '31', name: 'Colinesterase Plasmática', category: 'Toxicologia', price: 11.00 },
  { id: '32', name: 'Acetilcolinesterase Eritrocitária', category: 'Toxicologia', price: 15.00 },
  { id: '33', name: 'Cromo Urinário', category: 'Toxicologia', price: 42.00 },
  { id: '34', name: 'Dosagem de Cádmio na Urina', category: 'Toxicologia', price: 34.00 },
  { id: '35', name: 'Dosagem de Magnésio na Urina', category: 'Toxicologia', price: 18.00 },
  { id: '36', name: 'Dosagem de Manganês (Sérico e Urinário)', category: 'Toxicologia', price: 44.00 },
  { id: '37', name: 'Dosagem de Mercúrio na Urina', category: 'Toxicologia', price: 39.00 },
  { id: '38', name: 'Estanho Urinário', category: 'Toxicologia', price: 127.00 },
  { id: '39', name: 'Fenol Urinário', category: 'Toxicologia', price: 24.00 },
  { id: '40', name: 'Fluoreto Urinário', category: 'Toxicologia', price: 24.00 },
  { id: '41', name: 'Hexanodiona Urinária', category: 'Toxicologia', price: 77.00 },
  { id: '42', name: 'Metanol na Urina', category: 'Toxicologia', price: 28.00 },
  { id: '43', name: 'Metil-Etil-Cetona', category: 'Toxicologia', price: 25.00 },
  { id: '44', name: 'Orto-Cresol na Urina', category: 'Toxicologia', price: 207.00 },
  { id: '45', name: 'Triclorocompostos Totais Urinários', category: 'Toxicologia', price: 7.00 },
  { id: '46', name: 'Zinco Sérico', category: 'Toxicologia', price: 24.00 },

  // EXAMES LABORATORIAIS / BIOQUÍMICA / HEMATOLOGIA
  { id: '47', name: 'Hemograma Completo', category: 'Laboratorial', price: 14.00 },
  { id: '48', name: 'Hemoglobina', category: 'Laboratorial', price: 28.00 },
  { id: '49', name: 'Glicemia (Jejum/Pós-Dextrosol)', category: 'Laboratorial', price: 10.00 },
  { id: '50', name: 'Hemoglobina Glicada (Glicosilada)', category: 'Laboratorial', price: 27.00 },
  { id: '51', name: 'Grupo Sanguíneo ABO e RH', category: 'Laboratorial', price: 10.00 },
  { id: '52', name: 'Colesterol Total e Frações (Lipidograma)', category: 'Laboratorial', price: 39.00 },
  { id: '53', name: 'Triglicerídeos', category: 'Laboratorial', price: 25.00 },
  { id: '54', name: 'Creatinina (Sérica)', category: 'Laboratorial', price: 7.00 },
  { id: '55', name: 'Creatina', category: 'Laboratorial', price: 57.00 },
  { id: '56', name: 'Ureia (Sérica)', category: 'Laboratorial', price: 11.00 },
  { id: '57', name: 'Ácido Úrico', category: 'Laboratorial', price: 13.00 },
  { id: '58', name: 'TGO (AST)', category: 'Laboratorial', price: 9.00 },
  { id: '59', name: 'TGP (ALT)', category: 'Laboratorial', price: 9.00 },
  { id: '60', name: 'Gama-Glutamil Transferase (GGT)', category: 'Laboratorial', price: 10.00 },
  { id: '61', name: 'Fosfatase Alcalina', category: 'Laboratorial', price: 10.00 },
  { id: '62', name: 'Albumina', category: 'Laboratorial', price: 23.00 },
  { id: '63', name: 'Bilirrubinas Total e Frações', category: 'Laboratorial', price: 12.00 },
  { id: '64', name: 'Cálcio', category: 'Laboratorial', price: 12.00 },
  { id: '65', name: 'Coagulograma', category: 'Laboratorial', price: 18.00 },
  { id: '66', name: 'Contagem de Plaquetas', category: 'Laboratorial', price: 10.00 },
  { id: '67', name: 'Determinação de VHS', category: 'Laboratorial', price: 11.00 },
  { id: '68', name: 'Ferritina', category: 'Laboratorial', price: 28.00 },
  { id: '69', name: 'Ferro Sérico', category: 'Laboratorial', price: 9.00 },
  { id: '70', name: 'Dosagem de Potássio', category: 'Laboratorial', price: 9.00 },
  { id: '71', name: 'Sódio', category: 'Laboratorial', price: 11.00 },
  { id: '72', name: 'Proteína C Reativa (PCR)', category: 'Laboratorial', price: 21.00 },
  { id: '73', name: 'PSA Total e Frações', category: 'Laboratorial', price: 60.00 },
  { id: '74', name: 'T3 Total', category: 'Laboratorial', price: 17.00 },
  { id: '75', name: 'T4 Livre', category: 'Laboratorial', price: 22.00 },
  { id: '76', name: 'Beta HCG', category: 'Laboratorial', price: 21.00 },
  { id: '77', name: 'Mucoproteínas', category: 'Laboratorial', price: 15.00 },
  { id: '78', name: 'Reticulócitos', category: 'Laboratorial', price: 11.00 },

  // URINA, FEZES E PARASITOLOGIA / MICROBIOLOGIA
  { id: '79', name: 'Sumário de Urina (EAS/Urina Rotina)', category: 'Urina/Fezes', price: 9.00 },
  { id: '80', name: 'Urocultura', category: 'Urina/Fezes', price: 40.00 },
  { id: '81', name: 'Exame Parasitológico de Fezes (EPF)', category: 'Urina/Fezes', price: 12.00 },
  { id: '82', name: 'Coprocultura', category: 'Urina/Fezes', price: 35.00 },
  { id: '83', name: 'Pesquisa de Sangue Oculto nas Fezes', category: 'Urina/Fezes', price: 22.00 },
  { id: '84', name: 'Pesquisa de BAAR no Escarro', category: 'Microbiologia', price: 23.00 },
  { id: '85', name: 'Micológico de Unhas', category: 'Microbiologia', price: 22.00 },

  // SOROLOGIA E IMUNOLOGIA
  { id: '86', name: 'Sífilis (VDRL)', category: 'Sorologia', price: 9.00 },
  { id: '87', name: 'HBsAg (Hepatite B)', category: 'Sorologia', price: 27.00 },
  { id: '88', name: 'Anti-HBs (Sorologia para Hepatite B)', category: 'Sorologia', price: 25.00 },
  { id: '89', name: 'Anti-HBc Total', category: 'Sorologia', price: 25.00 },
  { id: '90', name: 'Sorologia para Hepatite B (Anti-HBc IgM)', category: 'Sorologia', price: 39.00 },
  { id: '91', name: 'Anti-HCV (Hepatite C)', category: 'Sorologia', price: 38.00 },
  { id: '92', name: 'Hepatite C - Anti-HCV IgM', category: 'Sorologia', price: 40.00 },
  { id: '93', name: 'Anti-HAV IgG', category: 'Sorologia', price: 30.00 },
  { id: '94', name: 'Anti-HAV IgM', category: 'Sorologia', price: 30.00 },
  { id: '95', name: 'Chagas (Machado Guerreiro)', category: 'Sorologia', price: 33.00 },
  { id: '96', name: 'COVID-19 - Testes', category: 'Sorologia', price: 58.00 },
  { id: '97', name: 'IgE Específica (Abelhas/Vespas/Marimbondo)', category: 'Imunologia', price: 45.00 },
  { id: '98', name: 'IgE Total', category: 'Imunologia', price: 22.00 },
];

const CATEGORIES = [
  'Todos', 'Ocupacional', 'Auditivo', 'Visão', 'Cardiológico', 'Neurológico', 
  'Respiratório', 'Psicológico', 'Radiologia', 'Imagem', 'Toxicologia', 
  'Laboratorial', 'Urina/Fezes', 'Microbiologia', 'Sorologia', 'Imunologia'
];

const ExamsBudgetPage = () => {
  const { activeLink } = useAuth();
  
  // State for exam catalog & selected items
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [selectedExams, setSelectedExams] = useState([
    { id: '1', name: 'ASO – Atestado de Saúde Ocupacional', category: 'Ocupacional', price: 40.00, qty: 1 },
    { id: '7', name: 'Audiometria (Tonal e Vocal)', category: 'Auditivo', price: 45.00, qty: 1 }
  ]);

  // Discount & Payment terms state
  const [discountType, setDiscountType] = useState('none'); // 'none', 'fixed', 'percent'
  const [discountValue, setDiscountValue] = useState(0);
  const [paymentTerms, setPaymentTerms] = useState('');
  const [observations, setObservations] = useState('');

  // Custom exam creation modal/inputs
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] = useState('Ocupacional');
  const [customPrice, setCustomPrice] = useState('');

  // Toast / Copy notification
  const [copied, setCopied] = useState(false);

  // Filter exams from catalog
  const filteredCatalog = ECOCLINIC_EXAMS.filter(exam => {
    const matchesSearch = exam.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Todos' || exam.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Handle adding exam to selection
  const handleAddExam = (exam) => {
    const existing = selectedExams.find(item => item.id === exam.id);
    if (existing) {
      setSelectedExams(selectedExams.map(item => 
        item.id === exam.id ? { ...item, qty: item.qty + 1 } : item
      ));
    } else {
      setSelectedExams([...selectedExams, { ...exam, qty: 1 }]);
    }
  };

  // Handle quantity changes
  const handleQuantityChange = (id, delta) => {
    setSelectedExams(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.qty + delta;
        return newQty > 0 ? { ...item, qty: newQty } : item;
      }
      return item;
    }));
  };

  // Handle direct price change for selected item
  const handlePriceChange = (id, newPrice) => {
    const val = parseFloat(newPrice) || 0;
    setSelectedExams(prev => prev.map(item => item.id === id ? { ...item, price: val } : item));
  };

  // Remove exam from selection
  const handleRemoveExam = (id) => {
    setSelectedExams(prev => prev.filter(item => item.id !== id));
  };

  // Add Custom Exam
  const handleCreateCustomExam = (e) => {
    e.preventDefault();
    if (!customName.trim()) return;
    const newExam = {
      id: `custom_${Date.now()}`,
      name: customName.trim(),
      category: customCategory,
      price: parseFloat(customPrice) || 0,
      qty: 1
    };
    setSelectedExams(prev => [...prev, newExam]);
    setCustomName('');
    setCustomPrice('');
    setShowCustomModal(false);
  };

  // Reset/Clear selection
  const handleClearSelection = () => {
    if (window.confirm('Tem certeza que deseja limpar todos os exames selecionados?')) {
      setSelectedExams([]);
      setDiscountType('none');
      setDiscountValue(0);
      setObservations('');
    }
  };

  // Calculations
  const subtotal = selectedExams.reduce((acc, item) => acc + (item.price * item.qty), 0);
  
  let calculatedDiscount = 0;
  if (discountType === 'fixed') {
    calculatedDiscount = Math.min(discountValue, subtotal);
  } else if (discountType === 'percent') {
    calculatedDiscount = (subtotal * Math.min(discountValue, 100)) / 100;
  }

  const grandTotal = Math.max(0, subtotal - calculatedDiscount);

  // Helper to format currency
  const formatBRL = (val) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Generate Budget Text
  const generateBudgetText = () => {
    if (selectedExams.length === 0) {
      return 'Nenhum exame selecionado ainda.';
    }

    let text = `🏥 *ORÇAMENTO DE EXAMES - ECOCLINIC*\n\n`;
    text += `📋 *EXAMES SELECIONADOS:*\n`;

    selectedExams.forEach((item, index) => {
      const itemTotal = item.price * item.qty;
      text += `${index + 1}. *${item.name}*\n`;
      text += `   • Qtd: ${item.qty}x | Unitário: ${formatBRL(item.price)} | Subtotal: ${formatBRL(itemTotal)}\n`;
    });

    text += `\n-----------------------------------\n`;
    text += `💰 *Subtotal:* ${formatBRL(subtotal)}\n`;

    if (calculatedDiscount > 0) {
      text += `🏷️ *Desconto aplicado:* -${formatBRL(calculatedDiscount)}\n`;
    }

    text += `⭐ *VALOR TOTAL:* *${formatBRL(grandTotal)}*\n`;

    if (paymentTerms.trim()) {
      text += `-----------------------------------\n`;
      text += `💳 *Condições de Pagamento:* ${paymentTerms.trim()}\n`;
    }

    if (observations.trim()) {
      text += `📝 *Observações:* ${observations.trim()}\n`;
    }

    return text;
  };

  const budgetText = generateBudgetText();

  // Copy to Clipboard
  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(budgetText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Erro ao copiar texto:', err);
    }
  };

  // Send via WhatsApp
  const handleSendWhatsApp = () => {
    const encodedText = encodeURIComponent(budgetText);
    window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank');
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', paddingBottom: '2rem' }}>
      
      {/* Header */}
      <header className="header-responsive" style={{ marginBottom: '1.5rem', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ 
              backgroundColor: 'var(--primary-light)', color: 'var(--primary)', 
              padding: '0.25rem 0.625rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: '600' 
            }}>
              Tabela Oficial Ecoclinic ({ECOCLINIC_EXAMS.length} Exames)
            </span>
          </div>
          <h1 className="text-h1" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <Stethoscope color="var(--primary)" size={28} />
            Orçamento de Exames Ocupacionais
          </h1>
          <p className="text-subtitle">
            Selecione os exames da tabela oficial Ecoclinic, ajuste quantidades e valores para gerar o orçamento de envio.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            className="btn btn-secondary"
            onClick={handleClearSelection}
            disabled={selectedExams.length === 0}
            style={{ fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
          >
            <RefreshCw size={15} /> Limpar
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => setShowCustomModal(true)}
            style={{ fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
          >
            <Plus size={16} /> Exame Avulso
          </button>
        </div>
      </header>

      {/* Main Grid: Catalog (Left) + Selected & Budget Preview (Right) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(340px, 1fr)', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: Exam Catalog */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Search size={18} color="var(--primary)" />Tabela de Exames
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {filteredCatalog.length} de {ECOCLINIC_EXAMS.length}
              </span>
            </div>

            {/* Search Bar */}
            <div style={{ position: 'relative', marginBottom: '1rem' }}>
              <input
                type="text"
                className="modal-input"
                placeholder="Buscar por nome do exame (ex: ASO, Orto-Cresol, Acid. Hipúrico)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '2.5rem' }}
              />
              <Search size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            </div>

            {/* Category Filter Pills */}
            <div style={{ display: 'flex', gap: '0.375rem', overflowX: 'auto', paddingBottom: '0.5rem', marginBottom: '0.5rem', scrollbarWidth: 'thin' }}>
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: '0.25rem 0.625rem',
                    borderRadius: '1rem',
                    fontSize: '0.75rem',
                    fontWeight: '500',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    border: '1px solid',
                    transition: 'all 0.2s',
                    backgroundColor: selectedCategory === cat ? 'var(--primary)' : 'var(--surface)',
                    color: selectedCategory === cat ? 'white' : 'var(--text-secondary)',
                    borderColor: selectedCategory === cat ? 'var(--primary)' : 'var(--border)'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Exam Items List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '520px', overflowY: 'auto', paddingRight: '0.25rem' }}>
              {filteredCatalog.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  Nenhum exame encontrado.
                </div>
              ) : (
                filteredCatalog.map(exam => {
                  const isSelected = selectedExams.some(item => item.id === exam.id);
                  const selectedItem = selectedExams.find(item => item.id === exam.id);

                  return (
                    <div 
                      key={exam.id}
                      style={{
                        padding: '0.625rem 0.875rem',
                        borderRadius: 'var(--radius-md)',
                        border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)',
                        backgroundColor: isSelected ? 'var(--primary-light)' : 'var(--surface)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                        transition: 'var(--transition)'
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.8125rem', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {exam.name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.125rem' }}>
                          <span style={{ fontSize: '0.6875rem', padding: '0.125rem 0.375rem', borderRadius: '4px', backgroundColor: 'var(--background)', color: 'var(--text-secondary)', fontWeight: '500' }}>
                            {exam.category}
                          </span>
                          <span style={{ fontSize: '0.8125rem', fontWeight: '700', color: 'var(--primary)' }}>
                            {exam.price === 0 ? 'R$ 0,00 (Incluso)' : formatBRL(exam.price)}
                          </span>
                        </div>
                      </div>

                      <button
                        className={isSelected ? "btn btn-secondary" : "btn btn-primary"}
                        onClick={() => handleAddExam(exam)}
                        style={{ padding: '0.375rem 0.625rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', whiteSpace: 'nowrap' }}
                      >
                        {isSelected ? (
                          <>
                            <span>+{selectedItem?.qty}</span>
                            <Plus size={14} />
                          </>
                        ) : (
                          <>
                            <Plus size={14} /> Incluir
                          </>
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Selected Exams, Adjustments & Text Output */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Selected Exams Table/Card */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calculator size={18} color="var(--primary)" />
                Exames Selecionados ({selectedExams.length})
              </h3>
              {selectedExams.length > 0 && (
                <span style={{ fontSize: '0.8125rem', fontWeight: '700', color: 'var(--primary)' }}>
                  Subtotal: {formatBRL(subtotal)}
                </span>
              )}
            </div>

            {selectedExams.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                <AlertCircle size={24} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                <p>Nenhum exame selecionado.</p>
                <p style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Clique no botão "Incluir" na tabela para adicionar.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', maxHeight: '320px', overflowY: 'auto' }}>
                {selectedExams.map(item => (
                  <div 
                    key={item.id}
                    style={{
                      padding: '0.625rem 0.875rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--background)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.5rem',
                      flexWrap: 'wrap'
                    }}
                  >
                    <div style={{ flex: '1 1 180px', minWidth: 0 }}>
                      <div style={{ fontSize: '0.8125rem', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.125rem' }}>
                        Total: {formatBRL(item.price * item.qty)}
                      </div>
                    </div>

                    {/* Controls: Price + Qty + Remove */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {/* Price override input */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>R$</span>
                        <input
                          type="number"
                          step="0.50"
                          min="0"
                          value={item.price}
                          onChange={(e) => handlePriceChange(item.id, e.target.value)}
                          style={{
                            width: '70px',
                            padding: '0.25rem 0.375rem',
                            fontSize: '0.75rem',
                            borderRadius: '4px',
                            border: '1px solid var(--border)',
                            backgroundColor: 'var(--surface)',
                            fontWeight: '600',
                            color: 'var(--text-primary)'
                          }}
                        />
                      </div>

                      {/* Qty Counter */}
                      <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: '4px', overflow: 'hidden', backgroundColor: 'var(--surface)' }}>
                        <button 
                          onClick={() => handleQuantityChange(item.id, -1)}
                          style={{ padding: '0.25rem 0.5rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}
                        >
                          -
                        </button>
                        <span style={{ padding: '0.25rem 0.375rem', fontSize: '0.75rem', fontWeight: '600', minWidth: '24px', textAlign: 'center' }}>
                          {item.qty}
                        </span>
                        <button 
                          onClick={() => handleQuantityChange(item.id, 1)}
                          style={{ padding: '0.25rem 0.5rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}
                        >
                          +
                        </button>
                      </div>

                      {/* Delete */}
                      <button 
                        onClick={() => handleRemoveExam(item.id)}
                        style={{ padding: '0.25rem', color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}
                        title="Remover"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Discount & Payment terms config */}
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label className="modal-label" style={{ fontSize: '0.75rem' }}>Tipo de Desconto</label>
                <select 
                  className="modal-input" 
                  value={discountType} 
                  onChange={(e) => setDiscountType(e.target.value)}
                  style={{ padding: '0.375rem 0.5rem', fontSize: '0.75rem' }}
                >
                  <option value="none">Sem Desconto</option>
                  <option value="fixed">Valor Fixo (R$)</option>
                  <option value="percent">Porcentagem (%)</option>
                </select>
              </div>

              {discountType !== 'none' && (
                <div>
                  <label className="modal-label" style={{ fontSize: '0.75rem' }}>
                    {discountType === 'fixed' ? 'Valor do Desconto (R$)' : 'Porcentagem (%)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step={discountType === 'fixed' ? '1' : '0.5'}
                    className="modal-input"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                    style={{ padding: '0.375rem 0.5rem', fontSize: '0.75rem' }}
                  />
                </div>
              )}
            </div>

            {/* Payment & Observations */}
            <div style={{ marginTop: '0.75rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label className="modal-label" style={{ fontSize: '0.75rem' }}>Condição de Pagamento</label>
                <input
                  type="text"
                  className="modal-input"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  placeholder="Ex: À vista / Faturamento faturado"
                  style={{ padding: '0.375rem 0.5rem', fontSize: '0.75rem' }}
                />
              </div>
              <div>
                <label className="modal-label" style={{ fontSize: '0.75rem' }}>Observações Opcionais</label>
                <input
                  type="text"
                  className="modal-input"
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Ex: Atendimento in company..."
                  style={{ padding: '0.375rem 0.5rem', fontSize: '0.75rem' }}
                />
              </div>
            </div>

            {/* Final Summary Footer */}
            <div style={{ 
              marginTop: '1rem', padding: '0.875rem 1rem', 
              backgroundColor: 'var(--surface-light)', borderRadius: 'var(--radius-md)', 
              border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Valor Final com Desconto:</span>
                <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--secondary-hover)' }}>
                  {formatBRL(grandTotal)}
                </div>
              </div>
              {calculatedDiscount > 0 && (
                <span style={{ fontSize: '0.75rem', color: 'var(--danger)', fontWeight: '600', backgroundColor: '#fee2e2', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                  Economia: {formatBRL(calculatedDiscount)}
                </span>
              )}
            </div>
          </div>

          {/* GENERATED TEXT PREVIEW CARD */}
          <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={18} color="var(--primary)" />
                Texto Formatado para Envio
              </h3>
              {copied && (
                <span style={{ fontSize: '0.75rem', color: '#059669', backgroundColor: '#d1fae5', padding: '0.25rem 0.625rem', borderRadius: '1rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Check size={14} /> Copiado!
                </span>
              )}
            </div>

            {/* Preview Box */}
            <textarea
              className="modal-input"
              rows={10}
              readOnly
              value={budgetText}
              style={{
                fontFamily: 'monospace',
                fontSize: '0.8125rem',
                lineHeight: '1.4',
                backgroundColor: 'var(--background)',
                color: 'var(--text-primary)',
                resize: 'vertical'
              }}
            />

            {/* ACTION BUTTONS */}
            <div className="grid-responsive-2" style={{ gap: '0.75rem' }}>
              <button
                className="btn btn-secondary"
                onClick={handleCopyText}
                disabled={selectedExams.length === 0}
                style={{ justifyContent: 'center', padding: '0.625rem', fontSize: '0.875rem', gap: '0.5rem', fontWeight: '600' }}
              >
                <Copy size={16} /> Copiar Texto
              </button>

              <button
                className="btn btn-primary"
                onClick={handleSendWhatsApp}
                disabled={selectedExams.length === 0}
                style={{ 
                  justifyContent: 'center', padding: '0.625rem', fontSize: '0.875rem', gap: '0.5rem', fontWeight: '600',
                  backgroundColor: '#25D366', borderColor: '#25D366', color: 'white'
                }}
              >
                <MessageSquare size={16} /> Enviar via WhatsApp
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* MODAL: ADD CUSTOM EXAM */}
      {showCustomModal && (
        <div className="modal-overlay" onClick={() => setShowCustomModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Adicionar Exame Avulso</h2>
              <button onClick={() => setShowCustomModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCustomExam} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="modal-label">Nome do Exame</label>
                <input
                  type="text"
                  className="modal-input"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Ex: Ultrassonografia da Tireoide"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="modal-label">Categoria</label>
                <select
                  className="modal-input"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                >
                  {CATEGORIES.filter(c => c !== 'Todos').map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="modal-label">Preço Unitário (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="modal-input"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  placeholder="0,00"
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCustomModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={!customName.trim()}>
                  Adicionar ao Orçamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default ExamsBudgetPage;
