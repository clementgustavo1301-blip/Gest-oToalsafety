/**
 * Main Application Module
 * Orchestrates the entire workflow: upload → extract → analyze → render → export
 */
const App = {
    /** Application state */
    state: {
        file: null,
        extractedText: '',
        projectData: null,
        apiAvailable: false,
        selectedTemplates: new Set()
    },

    /**
     * Initialize the application
     */
    async init() {
        // Cache DOM references
        this.cacheElements();
        
        // Bind event listeners
        this.bindEvents();
        
        // Set default date
        this.setDefaultDate();
        
        // Render template grid
        this.renderTemplateGrid();
        
        // Check API health
        await this.checkAPIHealth();

        console.log('✅ EcoSafety Cronograma Generator initialized');
    },

    /**
     * Cache frequently used DOM elements
     */
    cacheElements() {
        this.els = {
            // Upload
            uploadZone: document.getElementById('uploadZone'),
            fileInput: document.getElementById('fileInput'),
            fileInfo: document.getElementById('fileInfo'),
            fileName: document.getElementById('fileName'),
            fileSize: document.getElementById('fileSize'),
            btnRemoveFile: document.getElementById('btnRemoveFile'),
            heroSection: document.getElementById('heroSection'),
            
            // Progress
            progressSection: document.getElementById('progressSection'),
            processingText: document.getElementById('processingText'),
            steps: {
                1: document.getElementById('step1'),
                2: document.getElementById('step2'),
                3: document.getElementById('step3'),
                4: document.getElementById('step4')
            },

            // Manual
            manualSection: document.getElementById('manualSection'),
            clientName: document.getElementById('clientName'),
            contractDuration: document.getElementById('contractDuration'),
            startDate: document.getElementById('startDate'),
            templateGrid: document.getElementById('templateGrid'),
            selectAllDeliverables: document.getElementById('selectAllDeliverables'),
            btnGenerate: document.getElementById('btnGenerate'),

            // Deliverables Editor
            deliverablesEditorSection: document.getElementById('deliverablesEditorSection'),
            editorTableBody: document.getElementById('editorTableBody'),
            btnCancelEdit: document.getElementById('btnCancelEdit'),
            btnSaveDeliverables: document.getElementById('btnSaveDeliverables'),

            // Gantt
            ganttSection: document.getElementById('ganttSection'),
            ganttContainer: document.getElementById('ganttContainer'),
            ganttLegend: document.getElementById('ganttLegend'),
            ganttTitle: document.getElementById('ganttTitle'),
            ganttSubtitle: document.getElementById('ganttSubtitle'),
            btnDownload: document.getElementById('btnDownload'),
            btnDownloadBottom: document.getElementById('btnDownloadBottom'),
            btnDownloadPPTX: document.getElementById('btnDownloadPPTX'),
            btnEditDeliverables: document.getElementById('btnEditDeliverables'),
            btnNewSchedule: document.getElementById('btnNewSchedule'),
            viewMonths: document.getElementById('viewMonths'),
            viewWeeks: document.getElementById('viewWeeks'),

            // Settings bar
            editClientName: document.getElementById('editClientName'),
            editStartDate: document.getElementById('editStartDate'),
            editDuration: document.getElementById('editDuration'),
            btnApplySettings: document.getElementById('btnApplySettings'),

            // API Status
            apiStatus: document.getElementById('apiStatus'),

            // Toast
            toastContainer: document.getElementById('toastContainer')
        };
    },

    /**
     * Bind all event listeners
     */
    bindEvents() {
        // Upload zone click
        this.els.uploadZone.addEventListener('click', () => this.els.fileInput.click());
        
        // File input change
        this.els.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        
        // Drag and drop
        this.els.uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.els.uploadZone.classList.add('drag-over');
        });
        
        this.els.uploadZone.addEventListener('dragleave', () => {
            this.els.uploadZone.classList.remove('drag-over');
        });
        
        this.els.uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            this.els.uploadZone.classList.remove('drag-over');
            const files = e.dataTransfer.files;
            if (files.length > 0 && files[0].type === 'application/pdf') {
                this.handleFile(files[0]);
            } else {
                this.showToast('Por favor, envie um arquivo PDF.', 'warning');
            }
        });

        // Remove file
        this.els.btnRemoveFile.addEventListener('click', (e) => {
            e.stopPropagation();
            this.resetUpload();
        });

        // Generate button (manual mode)
        this.els.btnGenerate.addEventListener('click', () => this.generateFromManual());

        // Select All Deliverables
        if(this.els.selectAllDeliverables) {
            this.els.selectAllDeliverables.addEventListener('change', (e) => {
                this.toggleAllTemplates(e.target.checked);
            });
        }

        // Download buttons
        this.els.btnDownload.addEventListener('click', () => this.downloadPDF());
        this.els.btnDownloadBottom.addEventListener('click', () => this.downloadPDF());
        if(this.els.btnDownloadPPTX) {
            this.els.btnDownloadPPTX.addEventListener('click', () => this.downloadPPTX());
        }

        // Edit button
        this.els.btnEditDeliverables.addEventListener('click', () => this.showDeliverablesEditor());

        // New schedule
        this.els.btnNewSchedule.addEventListener('click', () => this.resetAll());

        // View toggles
        this.els.viewMonths.addEventListener('click', () => this.setView('months'));
        this.els.viewWeeks.addEventListener('click', () => this.setView('weeks'));

        // Apply settings
        this.els.btnApplySettings.addEventListener('click', () => this.applySettings());

        // Deliverables Editor buttons
        if (this.els.btnCancelEdit) {
            this.els.btnCancelEdit.addEventListener('click', () => {
                this.els.deliverablesEditorSection.classList.add('hidden');
                this.els.ganttSection.classList.remove('hidden');
            });
        }
        if (this.els.btnSaveDeliverables) {
            this.els.btnSaveDeliverables.addEventListener('click', () => this.saveDeliverablesEdit());
        }
    },

    /**
     * Set default start date to next Monday
     */
    setDefaultDate() {
        const nextMonday = AIAnalyzer.getNextMonday();
        if (this.els.startDate) {
            this.els.startDate.value = nextMonday;
        }
    },

    /**
     * Check API health and update status indicator
     */
    async checkAPIHealth() {
        try {
            this.state.apiAvailable = await AIAnalyzer.checkHealth();
        } catch {
            this.state.apiAvailable = false;
        }

        const dot = this.els.apiStatus.querySelector('.status-dot');
        const text = this.els.apiStatus.querySelector('.status-text');

        if (this.state.apiAvailable) {
            dot.className = 'status-dot online';
            text.textContent = 'IA Online';
        } else {
            dot.className = 'status-dot offline';
            text.textContent = 'Modo Manual';
        }
    },

    /**
     * Handle file selection from input
     */
    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.handleFile(file);
        }
    },

    /**
     * Handle a selected PDF file
     */
    async handleFile(file) {
        if (file.size > 20 * 1024 * 1024) {
            this.showToast('Arquivo muito grande. Máximo: 20MB.', 'error');
            return;
        }

        this.state.file = file;

        // Show file info
        this.els.fileName.textContent = file.name;
        this.els.fileSize.textContent = this.formatFileSize(file.size);
        this.els.fileInfo.classList.remove('hidden');
        this.els.uploadZone.classList.add('hidden');

        // Start processing
        await this.processFile(file);
    },

    /**
     * Process the uploaded PDF file
     */
    async processFile(file) {
        // Show progress section
        this.els.progressSection.classList.remove('hidden');
        this.els.manualSection.classList.add('hidden');
        this.els.ganttSection.classList.add('hidden');

        try {
            // Step 1: Upload complete
            this.setStep(1, 'done');
            this.setStep(2, 'active');
            this.setProcessingText('Extraindo texto do contrato...');

            // Step 2: Extract text
            const extracted = await PDFExtractor.extractFromFile(file);
            this.state.extractedText = extracted.text;

            if (extracted.text.trim().length < 50) {
                this.showToast('Não foi possível extrair texto suficiente do PDF. Tente o modo manual.', 'warning');
                this.setStep(2, 'done');
                this.showManualEditor();
                return;
            }

            this.setStep(2, 'done');
            this.showToast(`Texto extraído: ${extracted.pages} páginas`, 'success');

            // Step 3: AI Analysis
            if (this.state.apiAvailable) {
                this.setStep(3, 'active');
                this.setProcessingText('Analisando contrato com IA...');

                try {
                    const result = await AIAnalyzer.analyzeContract(extracted.text, file.name);
                    this.state.projectData = result;
                    this.setStep(3, 'done');
                    this.showToast(`IA identificou ${result.deliverables.length} entregáveis`, 'success');

                    // Step 4: Render Gantt
                    this.setStep(4, 'active');
                    this.setProcessingText('Gerando cronograma...');
                    
                    await this.delay(500);
                    this.renderGantt(result);
                    this.setStep(4, 'done');

                } catch (error) {
                    if (error.message === 'API_NOT_CONFIGURED') {
                        this.showToast('API não configurada. Abrindo modo manual.', 'warning');
                    } else {
                        this.showToast('Erro na análise da IA. Tente o modo manual.', 'warning');
                    }
                    this.setStep(3, 'done');
                    this.showManualEditor();
                }
            } else {
                // No API - go to manual mode
                this.setStep(3, 'done');
                this.showManualEditor();
            }

        } catch (error) {
            console.error('Processing error:', error);
            this.showToast(error.message || 'Erro ao processar o arquivo.', 'error');
            this.showManualEditor();
        }
    },

    /**
     * Show the manual editor section
     */
    showManualEditor() {
        this.els.progressSection.classList.add('hidden');
        this.els.manualSection.classList.remove('hidden');
        this.els.ganttSection.classList.add('hidden');
        
        // Scroll to manual section
        this.els.manualSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    /**
     * Render the template grid for manual mode
     */
    renderTemplateGrid() {
        const templates = AIAnalyzer.getTemplates();
        let html = '';

        for (const t of templates) {
            const color = GanttRenderer.categoryColors[t.category] || '#607D8B';
            html += `
                <div class="template-item" data-id="${t.id}" onclick="App.toggleTemplate('${t.id}')">
                    <div class="template-checkbox">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
                            <polyline points="20 6 9 17 4 12"/>
                        </svg>
                    </div>
                    <span class="template-cat-dot" style="background: ${color}"></span>
                    <div class="template-label">
                        <span class="template-name">${t.name}</span>
                        <span class="template-desc">${t.category} • ${t.durationDays} dias</span>
                    </div>
                </div>
            `;
        }

        this.els.templateGrid.innerHTML = html;
    },

    /**
     * Toggle template selection
     */
    toggleTemplate(id) {
        if (this.state.selectedTemplates.has(id)) {
            this.state.selectedTemplates.delete(id);
        } else {
            this.state.selectedTemplates.add(id);
        }

        // Update UI
        const item = document.querySelector(`.template-item[data-id="${id}"]`);
        if (item) {
            item.classList.toggle('selected');
        }
        
        // Update Select All checkbox state
        if (this.els.selectAllDeliverables) {
            const total = AIAnalyzer.getTemplates().length;
            this.els.selectAllDeliverables.checked = this.state.selectedTemplates.size === total && total > 0;
        }
    },

    /**
     * Toggle all templates (Select All)
     */
    toggleAllTemplates(checked) {
        const templates = AIAnalyzer.getTemplates();
        if (checked) {
            templates.forEach(t => this.state.selectedTemplates.add(t.id.toString()));
            document.querySelectorAll('.template-item').forEach(el => el.classList.add('selected'));
        } else {
            this.state.selectedTemplates.clear();
            document.querySelectorAll('.template-item').forEach(el => el.classList.remove('selected'));
        }
    },

    /**
     * Generate Gantt from manual input
     */
    generateFromManual() {
        const clientName = this.els.clientName.value.trim();
        const durationMonths = parseInt(this.els.contractDuration.value) || 12;
        const startDate = this.els.startDate.value;

        if (!clientName) {
            this.showToast('Informe o nome do cliente.', 'warning');
            this.els.clientName.focus();
            return;
        }

        if (this.state.selectedTemplates.size === 0) {
            this.showToast('Selecione pelo menos um entregável.', 'warning');
            return;
        }

        if (!startDate) {
            this.showToast('Informe a data de início.', 'warning');
            return;
        }

        // Build project data from templates
        const deliverables = AIAnalyzer.buildFromTemplates(
            [...this.state.selectedTemplates],
            startDate,
            durationMonths
        );

        const projectData = {
            clientName,
            projectName: `Projeto — ${clientName}`,
            contractDuration: durationMonths.toString(),
            startDate,
            deliverables
        };

        this.state.projectData = projectData;
        this.renderGantt(projectData);
    },

    /**
     * Render the Gantt chart and show the section
     */
    renderGantt(data) {
        // Update cover slide
        GanttRenderer.updateCoverSlide(data);

        // Render Gantt chart
        GanttRenderer.render(
            data,
            this.els.ganttContainer,
            this.els.ganttLegend
        );

        // Update toolbar
        this.els.ganttTitle.textContent = 'Cronograma de Entregáveis';

        // Populate settings bar
        this.els.editClientName.value = data.clientName || '';
        this.els.editStartDate.value = data.startDate || '';
        this.els.editDuration.value = parseInt(data.contractDuration) || 12;

        // Show gantt section
        this.els.heroSection.classList.add('hidden');
        this.els.progressSection.classList.add('hidden');
        this.els.manualSection.classList.add('hidden');
        this.els.ganttSection.classList.remove('hidden');

        // Scroll to gantt
        this.els.ganttSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        this.showToast('Cronograma gerado com sucesso!', 'success');
    },

    /**
     * Apply edited settings and re-render
     */
    applySettings() {
        if (!this.state.projectData) return;

        const newClient = this.els.editClientName.value.trim();
        const newStart = this.els.editStartDate.value;
        const newDuration = parseInt(this.els.editDuration.value);

        if (!newStart) {
            this.showToast('Informe a data de início.', 'warning');
            return;
        }
        if (!newDuration || newDuration < 1) {
            this.showToast('Duração deve ser de pelo menos 1 mês.', 'warning');
            return;
        }

        this.state.projectData.clientName = newClient || this.state.projectData.clientName;
        this.state.projectData.projectName = `Projeto — ${this.state.projectData.clientName}`;
        this.state.projectData.startDate = newStart;
        this.state.projectData.contractDuration = newDuration.toString();

        // Re-render
        GanttRenderer.updateCoverSlide(this.state.projectData);
        GanttRenderer.render(
            this.state.projectData,
            this.els.ganttContainer,
            this.els.ganttLegend
        );

        this.showToast('Configurações aplicadas! Cronograma atualizado.', 'success');
    },

    /**
     * Show detailed deliverables editor
     */
    showDeliverablesEditor() {
        if (!this.state.projectData || !this.state.projectData.deliverables) return;
        
        this.els.ganttSection.classList.add('hidden');
        this.els.deliverablesEditorSection.classList.remove('hidden');
        this.els.deliverablesEditorSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

        let html = '';
        this.state.projectData.deliverables.forEach(d => {
            // Get the calculated start date if manual is not set yet
            const pd = GanttRenderer.positionedDeliverables?.find(p => p.id === d.id);
            const defaultStart = d.manualStartDate || (pd ? pd.barStart.toISOString().split('T')[0] : this.state.projectData.startDate);
            
            html += `
                <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 10px;">
                        <strong>${d.name}</strong><br>
                        <span style="font-size: 0.75rem; color: var(--text-muted);">${d.category}</span>
                    </td>
                    <td style="padding: 10px;">
                        <input type="date" class="form-input edit-deliv-start" data-id="${d.id}" value="${defaultStart}">
                    </td>
                    <td style="padding: 10px;">
                        <input type="number" class="form-input edit-deliv-dur" data-id="${d.id}" value="${d.durationDays}" min="1">
                    </td>
                </tr>
            `;
        });
        
        this.els.editorTableBody.innerHTML = html;
    },

    /**
     * Save edited deliverables and re-render
     */
    saveDeliverablesEdit() {
        if (!this.state.projectData || !this.state.projectData.deliverables) return;

        const startInputs = document.querySelectorAll('.edit-deliv-start');
        const durInputs = document.querySelectorAll('.edit-deliv-dur');
        
        startInputs.forEach(input => {
            const idStr = String(input.dataset.id);
            const deliverable = this.state.projectData.deliverables.find(d => String(d.id) === idStr);
            if (deliverable) {
                deliverable.manualStartDate = input.value;
            }
        });

        durInputs.forEach(input => {
            const idStr = String(input.dataset.id);
            const deliverable = this.state.projectData.deliverables.find(d => String(d.id) === idStr);
            if (deliverable) {
                deliverable.durationDays = parseInt(input.value) || 1;
            }
        });

        this.els.deliverablesEditorSection.classList.add('hidden');
        this.els.ganttSection.classList.remove('hidden');
        
        // Re-render chart
        GanttRenderer.render(
            this.state.projectData,
            this.els.ganttContainer,
            this.els.ganttLegend
        );

        this.showToast('Datas dos entregáveis atualizadas!', 'success');
    },

    /**
     * Download the presentation as PDF
     */
    async downloadPDF() {
        const clientName = this.state.projectData?.clientName || 'cliente';
        const filename = ExportManager.generateFilename(clientName, 'pdf');
        await ExportManager.exportToPDF(filename);
    },

    /**
     * Download the presentation as PowerPoint
     */
    async downloadPPTX() {
        const clientName = this.state.projectData?.clientName || 'cliente';
        const filename = ExportManager.generateFilename(clientName, 'pptx');
        await ExportManager.exportToPPTX(filename, this.state.projectData);
    },

    /**
     * Set view mode
     */
    setView(mode) {
        this.els.viewMonths.classList.toggle('active', mode === 'months');
        this.els.viewWeeks.classList.toggle('active', mode === 'weeks');
        GanttRenderer.setViewMode(mode);
    },

    /**
     * Reset the upload state
     */
    resetUpload() {
        this.state.file = null;
        this.state.extractedText = '';
        this.els.fileInput.value = '';
        this.els.fileInfo.classList.add('hidden');
        this.els.uploadZone.classList.remove('hidden');
    },

    /**
     * Reset the entire application
     */
    resetAll() {
        this.resetUpload();
        this.state.projectData = null;
        this.state.selectedTemplates.clear();

        // Reset steps
        for (let i = 1; i <= 4; i++) {
            this.setStep(i, '');
        }

        // Show hero, hide others
        this.els.heroSection.classList.remove('hidden');
        this.els.progressSection.classList.add('hidden');
        this.els.manualSection.classList.add('hidden');
        this.els.ganttSection.classList.add('hidden');

        // Reset template grid selections
        document.querySelectorAll('.template-item.selected').forEach(item => {
            item.classList.remove('selected');
        });

        // Reset form
        this.els.clientName.value = '';
        this.els.contractDuration.value = '12';
        this.setDefaultDate();

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    /**
     * Update step state
     */
    setStep(stepNum, state) {
        const step = this.els.steps[stepNum];
        if (!step) return;

        step.classList.remove('active', 'done');
        if (state) {
            step.classList.add(state);
        }
    },

    /**
     * Update processing text
     */
    setProcessingText(text) {
        if (this.els.processingText) {
            this.els.processingText.textContent = text;
        }
    },

    /**
     * Show a toast notification
     */
    showToast(message, type = 'info') {
        const icons = {
            success: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
            error: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF5350" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
            warning: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF9800" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
            info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2196F3" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || icons.info}</span>
            <span>${message}</span>
        `;

        this.els.toastContainer.appendChild(toast);

        // Auto-remove after 4 seconds
        setTimeout(() => {
            toast.style.animation = 'toastOut 0.3s ease-in forwards';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    },

    /**
     * Format file size in human-readable format
     */
    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    },

    /**
     * Utility: delay execution
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// Global functions for Gantt UI interactions
window.promptEditDuration = function(id) {
    if (!App.state.projectData || !App.state.projectData.deliverables) return;
    
    // Convert to string for robust comparison
    const targetId = String(id);
    const deliverable = App.state.projectData.deliverables.find(d => String(d.id) === targetId);
    
    if (deliverable) {
        const newDuration = window.prompt(`Nova duração em dias para ${deliverable.name}:`, deliverable.durationDays);
        if (newDuration !== null && !isNaN(newDuration) && parseInt(newDuration) > 0) {
            deliverable.durationDays = parseInt(newDuration);
            
            // Re-render
            GanttRenderer.render(
                App.state.projectData,
                App.els.ganttContainer,
                App.els.ganttLegend
            );
            App.showToast(`Duração do ${deliverable.name} atualizada para ${newDuration} dias.`, 'success');
        }
    }
};
