/**
 * Gantt Chart Renderer Module
 * Renders a professional Gantt chart using pure HTML/CSS within the slide container
 */
const GanttRenderer = {
    /** Category color mapping */
    categoryColors: {
        'Documentação': '#2196F3',
        'Treinamentos': '#FF9800',
        'Laudos Técnicos': '#4CAF50',
        'Exames/ASO': '#E91E63',
        'Gestão': '#9C27B0',
        'Implantação': '#00BCD4',
        'Monitoramento': '#607D8B'
    },

    /** Phase labels */
    phaseLabels: {
        1: 'Fase 1 — Implantação',
        2: 'Fase 2 — Execução',
        3: 'Fase 3 — Monitoramento'
    },

    /** Current view mode */
    viewMode: 'months',

    /**
     * Render the full Gantt chart
     * @param {Object} data - The project data with deliverables
     * @param {HTMLElement} container - The gantt container element
     * @param {HTMLElement} legendContainer - The legend container element
     */
    render(data, container, legendContainer) {
        if (!data || !data.deliverables || data.deliverables.length === 0) {
            container.innerHTML = '<p style="text-align:center;color:#999;padding:40px;">Nenhum entregável para exibir.</p>';
            return;
        }

        this.data = data;
        this.container = container;
        this.legendContainer = legendContainer;

        // Calculate timeline boundaries
        this.calculateTimeline();
        
        // Build the chart HTML
        this.buildChart();
        
        // Build the legend
        this.buildLegend();
    },

    /**
     * Calculate the timeline start/end dates
     */
    calculateTimeline() {
        const startDate = new Date(this.data.startDate + 'T00:00:00');
        const durationMonths = parseInt(this.data.contractDuration) || 12;
        
        // Start from the first day of the start month
        this.timelineStart = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
        
        // End date: add contract duration + 1 month buffer
        this.timelineEnd = new Date(startDate.getFullYear(), startDate.getMonth() + durationMonths + 1, 0);
        
        // Total days in timeline
        this.totalDays = Math.ceil((this.timelineEnd - this.timelineStart) / (1000 * 60 * 60 * 24));
        
        // Generate month columns
        this.months = [];
        const current = new Date(this.timelineStart);
        while (current <= this.timelineEnd) {
            this.months.push({
                date: new Date(current),
                label: current.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
                shortLabel: current.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
                daysInMonth: new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate()
            });
            current.setMonth(current.getMonth() + 1);
        }

        // Calculate deliverable positions
        this.calculateDeliverablePositions();
    },

    /**
     * Calculate the start/end positions of each deliverable bar
     */
    calculateDeliverablePositions() {
        const startDate = new Date(this.data.startDate + 'T00:00:00');
        let currentDate = new Date(startDate);
        
        // Sort deliverables by phase, then by original order
        const sortedDeliverables = [...this.data.deliverables].sort((a, b) => {
            if (a.phase !== b.phase) return a.phase - b.phase;
            return a.id - b.id;
        });

        // Track dates per phase for staggering
        const phaseDates = { 1: new Date(startDate), 2: null, 3: null };
        
        // First pass: calculate phase start dates
        let phase1End = new Date(startDate);
        let phase2End = new Date(startDate);
        
        for (const d of sortedDeliverables) {
            if (d.phase === 1) {
                const endDate = this.addBusinessDays(phaseDates[1], d.durationDays);
                if (endDate > phase1End) phase1End = new Date(endDate);
                // Stagger within phase
                phaseDates[1] = this.addBusinessDays(phaseDates[1], Math.max(5, Math.floor(d.durationDays * 0.3)));
            }
        }
        
        phaseDates[2] = new Date(phase1End);
        phaseDates[2].setDate(phaseDates[2].getDate() + 7); // 1 week gap
        
        for (const d of sortedDeliverables) {
            if (d.phase === 2) {
                const endDate = this.addBusinessDays(phaseDates[2], d.durationDays);
                if (endDate > phase2End) phase2End = new Date(endDate);
                phaseDates[2] = this.addBusinessDays(phaseDates[2], Math.max(5, Math.floor(d.durationDays * 0.3)));
            }
        }
        
        phaseDates[3] = new Date(phase2End);
        phaseDates[3].setDate(phaseDates[3].getDate() + 7);

        // Second pass: assign positions
        const phaseCounters = { 1: new Date(new Date(startDate)), 2: new Date(phaseDates[2]), 3: new Date(phaseDates[3]) };
        
        this.positionedDeliverables = sortedDeliverables.map(d => {
            const phase = d.phase || 1;
            
            // Se o usuário definiu uma data manual, usamos ela. Senão usamos o contador da fase.
            let barStart;
            if (d.manualStartDate) {
                barStart = new Date(d.manualStartDate + 'T00:00:00');
            } else {
                barStart = new Date(phaseCounters[phase]);
                // Advance the phase counter only if it was automatically placed
                phaseCounters[phase] = this.addBusinessDays(phaseCounters[phase], Math.max(3, Math.floor(d.durationDays * 0.25)));
            }
            
            const barEnd = this.addBusinessDays(barStart, d.durationDays);
            
            // Calculate percentage positions
            const startOffset = Math.max(0, (barStart - this.timelineStart) / (1000 * 60 * 60 * 24));
            const endOffset = Math.max(0, (barEnd - this.timelineStart) / (1000 * 60 * 60 * 24));
            
            return {
                ...d,
                barStart,
                barEnd,
                leftPercent: (startOffset / this.totalDays) * 100,
                widthPercent: ((endOffset - startOffset) / this.totalDays) * 100,
                startLabel: barStart.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                endLabel: barEnd.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
            };
        });
    },

    /**
     * Add business days to a date
     */
    addBusinessDays(startDate, numDays) {
        const result = new Date(startDate);
        let added = 0;
        while (added < numDays) {
            result.setDate(result.getDate() + 1);
            const dayOfWeek = result.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                added++;
            }
        }
        return result;
    },

    /**
     * Build the Gantt chart HTML
     */
    buildChart() {
        let html = '<div class="gantt-chart">';
        
        // Header row with month columns
        html += '<div class="gantt-header-row">';
        html += '<div class="gantt-label-col">Entregáveis</div>';
        html += '<div class="gantt-timeline">';
        
        for (const month of this.months) {
            html += `<div class="gantt-month-col">${month.shortLabel.toUpperCase()}</div>`;
        }
        
        html += '</div></div>';
        
        // Body rows grouped by phase
        html += '<div class="gantt-body">';
        
        let currentPhase = 0;
        
        for (const d of this.positionedDeliverables) {
            // Phase separator
            if (d.phase !== currentPhase) {
                currentPhase = d.phase;
                html += `
                    <div class="gantt-phase-row">
                        <div class="gantt-phase-label">${this.phaseLabels[currentPhase] || `Fase ${currentPhase}`}</div>
                        <div class="gantt-phase-timeline"></div>
                    </div>
                `;
            }
            
            const color = this.categoryColors[d.category] || '#607D8B';
            const barMinWidth = Math.max(d.widthPercent, 2);
            
            html += `
                <div class="gantt-row" title="${d.name}\n${d.startLabel} — ${d.endLabel}\n${d.description || ''}">
                    <div class="gantt-row-label">
                        <span class="gantt-row-cat-dot" style="background:${color}"></span>
                        <span>${this.truncateText(d.name, 35)}</span>
                    </div>
                    <div class="gantt-row-timeline">
                        <div class="gantt-grid-lines">
                            ${this.months.map(() => '<div class="gantt-grid-line"></div>').join('')}
                        </div>
                        <div class="gantt-bar" 
                             onclick="window.promptEditDuration('${d.id}')"
                             title="Clique para editar o prazo de ${d.durationDays}d"
                             style="
                            left: ${d.leftPercent}%;
                            width: ${barMinWidth}%;
                            background: linear-gradient(135deg, ${color}, ${this.adjustColor(color, -20)});
                            cursor: pointer;
                        ">
                            <span class="gantt-bar-label">${d.durationDays}d</span>
                        </div>
                    </div>
                </div>
            `;
        }
        
        html += '</div></div>';
        
        this.container.innerHTML = html;
    },

    /**
     * Build the legend
     */
    buildLegend() {
        if (!this.legendContainer) return;
        
        // Get unique categories from deliverables
        const categories = [...new Set(this.positionedDeliverables.map(d => d.category))];
        
        let html = '';
        for (const cat of categories) {
            const color = this.categoryColors[cat] || '#607D8B';
            html += `
                <div class="legend-item">
                    <div class="legend-color" style="background: ${color}"></div>
                    <span>${cat}</span>
                </div>
            `;
        }
        
        this.legendContainer.innerHTML = html;
    },

    /**
     * Truncate text to a max length
     */
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 1) + '…';
    },

    /**
     * Adjust a hex color brightness
     */
    adjustColor(hex, amount) {
        hex = hex.replace('#', '');
        const num = parseInt(hex, 16);
        let r = Math.min(255, Math.max(0, (num >> 16) + amount));
        let g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
        let b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
        return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
    },

    /**
     * Update the cover slide with project data
     */
    updateCoverSlide(data) {
        const coverTitle = document.getElementById('coverTitle');
        const coverProject = document.getElementById('coverProject');
        const coverClient = document.getElementById('coverClient');
        const coverDate = document.getElementById('coverDate');
        const slideClientName = document.getElementById('slideClientName');
        
        if (coverTitle) coverTitle.textContent = 'Cronograma de Entregáveis';
        if (coverProject) coverProject.textContent = data.projectName || 'Projeto';
        if (coverClient) coverClient.textContent = data.clientName || '';
        if (coverDate) {
            const now = new Date();
            coverDate.textContent = now.toLocaleDateString('pt-BR', { 
                day: 'numeric', month: 'long', year: 'numeric' 
            });
        }
        if (slideClientName) slideClientName.textContent = data.clientName || '';
    },

    /**
     * Set view mode (months/weeks)
     */
    setViewMode(mode) {
        this.viewMode = mode;
        if (this.data) {
            this.calculateTimeline();
            this.buildChart();
        }
    }
};

window.promptEditDuration = function(id) {
    if (!GanttRenderer.data) return;
    const deliverable = GanttRenderer.data.deliverables.find(d => d.id === id);
    if (!deliverable) return;
    
    const newDuration = prompt(`Digite o novo prazo em dias úteis para:\n${deliverable.name}`, deliverable.durationDays);
    if (newDuration !== null) {
        const parsed = parseInt(newDuration, 10);
        if (!isNaN(parsed) && parsed > 0) {
            deliverable.durationDays = parsed;
            GanttRenderer.render(GanttRenderer.data, GanttRenderer.container, GanttRenderer.legendContainer);
            if (window.App && typeof window.App.showToast === 'function') {
                window.App.showToast('Prazo atualizado com sucesso!', 'success');
            }
        } else {
            alert('Por favor, insira um número válido maior que 0.');
        }
    }
};
