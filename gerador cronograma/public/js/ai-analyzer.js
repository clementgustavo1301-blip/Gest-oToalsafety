/**
 * AI Analyzer Module
 * Communicates with the backend Gemini API proxy to analyze contract text
 */
const AIAnalyzer = {
    /**
     * Check if the AI API is configured and available
     * @returns {Promise<boolean>}
     */
    async checkHealth() {
        try {
            const response = await fetch('/api/health');
            const data = await response.json();
            return data.apiConfigured === true;
        } catch (error) {
            console.warn('API health check failed:', error);
            return false;
        }
    },

    /**
     * Analyze contract text using the Gemini API
     * @param {string} text - Extracted contract text
     * @param {string} contractName - Original file name
     * @returns {Promise<Object>} - Structured deliverables data
     */
    async analyzeContract(text, contractName) {
        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, contractName })
            });

            if (!response.ok) {
                const errorData = await response.json();
                
                if (errorData.error === 'API_KEY_NOT_CONFIGURED') {
                    throw new Error('API_NOT_CONFIGURED');
                }
                
                throw new Error(errorData.error || 'Erro na análise do contrato');
            }

            const data = await response.json();
            return this.validateAndNormalize(data);
        } catch (error) {
            if (error.message === 'API_NOT_CONFIGURED') {
                throw error;
            }
            console.error('AI Analysis error:', error);
            throw new Error('Falha na análise do contrato pela IA. ' + error.message);
        }
    },

    /**
     * Validate and normalize the AI response
     * @param {Object} data - Raw AI response
     * @returns {Object} - Normalized data
     */
    validateAndNormalize(data) {
        // Ensure required fields
        const normalized = {
            clientName: data.clientName || 'Cliente',
            projectName: data.projectName || 'Projeto',
            contractDuration: data.contractDuration || '12',
            startDate: data.startDate || this.getNextMonday(),
            deliverables: []
        };

        if (Array.isArray(data.deliverables)) {
            normalized.deliverables = data.deliverables.map((d, index) => ({
                id: d.id || index + 1,
                name: d.name || `Entregável ${index + 1}`,
                category: this.normalizeCategory(d.category),
                durationDays: Math.max(1, parseInt(d.durationDays) || 5),
                dependencies: Array.isArray(d.dependencies) ? d.dependencies : [],
                phase: Math.min(3, Math.max(1, parseInt(d.phase) || 1)),
                description: d.description || ''
            }));
        }

        return normalized;
    },

    /**
     * Normalize category names
     */
    normalizeCategory(category) {
        const validCategories = [
            'Documentação', 'Treinamentos', 'Laudos Técnicos',
            'Exames/ASO', 'Gestão', 'Implantação', 'Monitoramento'
        ];

        if (!category) return 'Gestão';

        // Find best match
        const lowerCat = category.toLowerCase();
        const match = validCategories.find(c => 
            lowerCat.includes(c.toLowerCase()) || c.toLowerCase().includes(lowerCat)
        );

        return match || 'Gestão';
    },

    /**
     * Get the next Monday from today
     */
    getNextMonday() {
        const today = new Date();
        const day = today.getDay();
        const daysUntilMonday = day === 0 ? 1 : (8 - day);
        const nextMonday = new Date(today);
        nextMonday.setDate(today.getDate() + daysUntilMonday);
        return nextMonday.toISOString().split('T')[0];
    },

    /**
     * Default deliverable templates for manual mode
     */
    getTemplates() {
        return [
            {
                id: 'pgr',
                name: 'PGR - Programa de Gerenciamento de Riscos',
                category: 'Documentação',
                durationDays: 30,
                phase: 1,
                description: 'Elaboração do Programa de Gerenciamento de Riscos conforme NR-1'
            },
            {
                id: 'pcmso',
                name: 'PCMSO - Programa de Controle Médico',
                category: 'Documentação',
                durationDays: 20,
                phase: 1,
                description: 'Programa de Controle Médico de Saúde Ocupacional conforme NR-7'
            },
            {
                id: 'ltcat',
                name: 'LTCAT - Laudo Técnico',
                category: 'Laudos Técnicos',
                durationDays: 25,
                phase: 1,
                description: 'Laudo Técnico das Condições Ambientais do Trabalho'
            },
            {
                id: 'ppra',
                name: 'Inventário de Riscos',
                category: 'Documentação',
                durationDays: 20,
                phase: 1,
                description: 'Inventário de Riscos Ocupacionais - Levantamento preliminar'
            },
            {
                id: 'asos',
                name: 'Exames Admissionais/Periódicos (ASOs)',
                category: 'Exames/ASO',
                durationDays: 15,
                phase: 2,
                description: 'Gestão de exames admissionais, periódicos, demissionais e complementares'
            },
            {
                id: 'nr_basic',
                name: 'Treinamentos NR (Básicos)',
                category: 'Treinamentos',
                durationDays: 20,
                phase: 2,
                description: 'NR-5, NR-6, NR-10, NR-12, NR-35 e demais normas aplicáveis'
            },
            {
                id: 'nr_cipa',
                name: 'CIPA / CIPAMIN',
                category: 'Treinamentos',
                durationDays: 15,
                phase: 2,
                description: 'Constituição e treinamento da CIPA conforme NR-5'
            },
            {
                id: 'sipat',
                name: 'SIPAT',
                category: 'Treinamentos',
                durationDays: 5,
                phase: 2,
                description: 'Semana Interna de Prevenção de Acidentes do Trabalho'
            },
            {
                id: 'laudo_insalubridade',
                name: 'Laudo de Insalubridade',
                category: 'Laudos Técnicos',
                durationDays: 20,
                phase: 1,
                description: 'Laudo técnico de avaliação de insalubridade'
            },
            {
                id: 'laudo_periculosidade',
                name: 'Laudo de Periculosidade',
                category: 'Laudos Técnicos',
                durationDays: 15,
                phase: 1,
                description: 'Laudo técnico de avaliação de periculosidade'
            },
            {
                id: 'laudo_ergonomico',
                name: 'AET - Análise Ergonômica',
                category: 'Laudos Técnicos',
                durationDays: 25,
                phase: 2,
                description: 'Análise Ergonômica do Trabalho conforme NR-17'
            },
            {
                id: 'esocial',
                name: 'Gestão eSocial SST',
                category: 'Gestão',
                durationDays: 30,
                phase: 2,
                description: 'Envio de eventos SST ao eSocial (S-2210, S-2220, S-2240)'
            },
            {
                id: 'implantacao',
                name: 'Implantação do Sistema de Gestão',
                category: 'Implantação',
                durationDays: 15,
                phase: 1,
                description: 'Implantação da plataforma de gestão integrada SST'
            },
            {
                id: 'visita_tecnica',
                name: 'Visitas Técnicas e Inspeções',
                category: 'Monitoramento',
                durationDays: 10,
                phase: 3,
                description: 'Visitas técnicas periódicas e inspeções de segurança'
            },
            {
                id: 'indicadores',
                name: 'Relatórios e Indicadores SST',
                category: 'Monitoramento',
                durationDays: 10,
                phase: 3,
                description: 'Dashboards e relatórios de indicadores de SST'
            },
            {
                id: 'epis',
                name: 'Gestão de EPIs',
                category: 'Gestão',
                durationDays: 10,
                phase: 2,
                description: 'Controle de entrega, validade e CA dos EPIs'
            }
        ];
    },

    /**
     * Build deliverables from selected templates
     * @param {string[]} selectedIds - Array of template IDs
     * @param {string} startDate - Start date YYYY-MM-DD
     * @param {number} durationMonths - Contract duration in months
     * @returns {Object[]} - Array of deliverables
     */
    buildFromTemplates(selectedIds, startDate, durationMonths) {
        const templates = this.getTemplates();
        const selected = templates.filter(t => selectedIds.includes(t.id));
        
        // Scale durations based on contract length
        const scaleFactor = Math.max(0.5, Math.min(2, durationMonths / 12));
        
        return selected.map((t, index) => ({
            id: index + 1,
            name: t.name,
            category: t.category,
            durationDays: Math.round(t.durationDays * scaleFactor),
            dependencies: [],
            phase: t.phase,
            description: t.description
        }));
    }
};
