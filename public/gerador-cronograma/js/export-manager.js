/**
 * Export Manager Module
 * Handles exporting the Gantt chart to PDF and PowerPoint
 * Uses a robust approach: captures slides one at a time with error handling
 */
const ExportManager = {
    /**
     * Export the presentation slides to a PDF file
     * @param {string} filename - The filename for the PDF
     */
    async exportToPDF(filename = 'cronograma.pdf') {
        const presentation = document.getElementById('ganttPresentation');
        if (!presentation) {
            App.showToast('Elemento de apresentação não encontrado.', 'error');
            return;
        }

        App.showToast('Gerando PDF... Aguarde.', 'info');

        try {
            const slides = presentation.querySelectorAll('.presentation-slide');
            if (slides.length === 0) {
                App.showToast('Nenhum slide encontrado para exportar.', 'error');
                return;
            }

            // Prepare all slides for capture
            const originals = [];
            slides.forEach((slide) => {
                originals.push({
                    boxShadow: slide.style.boxShadow,
                    border: slide.style.border,
                    borderRadius: slide.style.borderRadius,
                    marginBottom: slide.style.marginBottom
                });
                slide.style.boxShadow = 'none';
                slide.style.border = 'none';
                slide.style.borderRadius = '0';
                slide.style.marginBottom = '0';
            });

            // Capture each slide as a canvas
            const canvases = [];
            for (let i = 0; i < slides.length; i++) {
                const canvas = await html2canvas(slides[i], {
                    scale: 1.5,
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: '#FFFFFF',
                    logging: false
                });
                canvases.push(canvas);
            }

            // Restore styles
            slides.forEach((slide, i) => {
                slide.style.boxShadow = originals[i].boxShadow;
                slide.style.border = originals[i].border;
                slide.style.borderRadius = originals[i].borderRadius;
                slide.style.marginBottom = originals[i].marginBottom;
            });

            if (canvases.length === 0) throw new Error('No slides captured');

            // Find jsPDF constructor
            let JsPdfClass = null;
            if (window.jspdf && window.jspdf.jsPDF) {
                JsPdfClass = window.jspdf.jsPDF;
            } else if (window.jsPDF) {
                JsPdfClass = window.jsPDF;
            }

            if (JsPdfClass) {
                const firstCanvas = canvases[0];
                const pageWidth = firstCanvas.width;
                const pageHeight = firstCanvas.height;

                const pdf = new JsPdfClass({
                    orientation: pageWidth > pageHeight ? 'landscape' : 'portrait',
                    unit: 'px',
                    format: [pageWidth, pageHeight],
                    hotfixes: ['px_scaling']
                });

                canvases.forEach((canvas, i) => {
                    if (i > 0) {
                        pdf.addPage([pageWidth, pageHeight], pageWidth > pageHeight ? 'landscape' : 'portrait');
                    }
                    const imgData = canvas.toDataURL('image/jpeg', 0.95);
                    pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight);
                });

                pdf.save(filename);
            } else {
                // VERY Fallback if jsPDF constructor is completely hidden (html2pdf wrapper only)
                const tempContainer = document.createElement('div');
                canvases.forEach((canvas, i) => {
                    const img = document.createElement('img');
                    img.src = canvas.toDataURL('image/jpeg', 0.95);
                    img.style.width = '100%';
                    img.style.display = 'block';
                    if (i > 0) img.style.pageBreakBefore = 'always';
                    tempContainer.appendChild(img);
                });
                
                await html2pdf().set({
                    margin: 0,
                    filename: filename,
                    image: { type: 'jpeg', quality: 0.95 },
                    html2canvas: { scale: 1, logging: false },
                    jsPDF: {
                        unit: 'px',
                        format: [canvases[0].width, canvases[0].height],
                        orientation: canvases[0].width > canvases[0].height ? 'landscape' : 'portrait',
                        hotfixes: ['px_scaling']
                    }
                }).from(tempContainer).save();
            }

            App.showToast('PDF baixado com sucesso!', 'success');
        } catch (error) {
            console.error('PDF export error:', error);
            App.showToast('Erro ao gerar PDF. O tamanho do gráfico pode estar muito grande.', 'error');
        }
    },

    /**
     * Fallback PDF using individual canvas captures
     */
    async fallbackPDF(filename) {
        const presentation = document.getElementById('ganttPresentation');
        const slides = presentation.querySelectorAll('.presentation-slide');
        
        // Store and remove decorative styles
        const originals = [];
        slides.forEach((slide) => {
            originals.push({
                boxShadow: slide.style.boxShadow,
                border: slide.style.border,
                borderRadius: slide.style.borderRadius
            });
            slide.style.boxShadow = 'none';
            slide.style.border = 'none';
            slide.style.borderRadius = '0';
        });

        const canvases = [];
        for (let i = 0; i < slides.length; i++) {
            const canvas = await html2canvas(slides[i], {
                scale: 1.5,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#FFFFFF',
                logging: false
            });
            canvases.push(canvas);
        }

        // Restore styles
        slides.forEach((slide, i) => {
            slide.style.boxShadow = originals[i].boxShadow;
            slide.style.border = originals[i].border;
            slide.style.borderRadius = originals[i].borderRadius;
        });

        if (canvases.length === 0) throw new Error('No slides captured');

        // Build PDF from canvases
        const firstCanvas = canvases[0];
        const pageWidth = firstCanvas.width;
        const pageHeight = firstCanvas.height;

        // Create a simple PDF using html2pdf's internal jsPDF
        const pdf = html2pdf().set({
            margin: 0,
            filename: filename,
            jsPDF: {
                unit: 'px',
                format: [pageWidth, pageHeight],
                orientation: 'landscape',
                hotfixes: ['px_scaling']
            }
        });

        // Alternative: use a temporary container with images
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'fixed';
        tempContainer.style.left = '-99999px';
        tempContainer.style.top = '0';
        
        canvases.forEach((canvas, i) => {
            if (i > 0) {
                const pageBreak = document.createElement('div');
                pageBreak.style.pageBreakBefore = 'always';
                pageBreak.className = 'presentation-slide';
                tempContainer.appendChild(pageBreak);
            }
            const img = document.createElement('img');
            img.src = canvas.toDataURL('image/jpeg', 0.95);
            img.style.width = '100%';
            img.style.display = 'block';
            tempContainer.appendChild(img);
        });

        document.body.appendChild(tempContainer);

        await html2pdf().set({
            margin: 0,
            filename: filename,
            image: { type: 'jpeg', quality: 0.95 },
            html2canvas: { scale: 1, logging: false },
            jsPDF: {
                unit: 'px',
                format: [pageWidth, pageHeight],
                orientation: 'landscape',
                hotfixes: ['px_scaling']
            }
        }).from(tempContainer).save();

        document.body.removeChild(tempContainer);
        App.showToast('PDF baixado com sucesso!', 'success');
    },

    /**
     * Export as PNG image
     */
    async exportToPNG(filename = 'cronograma.png') {
        const ganttSlide = document.getElementById('ganttSlide');
        if (!ganttSlide) return;

        try {
            App.showToast('Gerando imagem...', 'info');
            
            const canvas = await html2canvas(ganttSlide, {
                scale: 1.5,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#FFFFFF',
                logging: false
            });

            const link = document.createElement('a');
            link.download = filename;
            link.href = canvas.toDataURL('image/png');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            App.showToast('Imagem baixada com sucesso!', 'success');
        } catch (error) {
            console.error('PNG export error:', error);
            App.showToast('Erro ao gerar imagem.', 'error');
        }
    },

    /**
     * Export the presentation slides to a PowerPoint file (PPTX)
     * @param {string} filename - The filename for the PPTX
     * @param {Object} projectData - The data used to render the chart
     */
    async exportToPPTX(filename = 'cronograma.pptx', projectData) {
        if (typeof PptxGenJS === 'undefined' && typeof pptxgen === 'undefined') {
            App.showToast('Biblioteca PPTX não carregada. Tente recarregar a página.', 'error');
            return;
        }

        App.showToast('Gerando PowerPoint... Aguarde.', 'info');

        try {
            const PptxGen = typeof PptxGenJS !== 'undefined' ? PptxGenJS : pptxgen;
            const pptx = new PptxGen();
            pptx.layout = 'LAYOUT_16x9';
            pptx.author = 'TotalSafety';
            pptx.company = 'EcoSafety';
            pptx.subject = 'Cronograma de Entregáveis';

            // --- SLIDE 1: Cover ---
            await this.buildCoverSlide(pptx, projectData);

            // --- SLIDE 2: Gantt Chart (image capture) ---
            await this.buildGanttSlide(pptx, projectData);

            // --- SLIDE 3: Deliverables Table ---
            await this.buildTableSlide(pptx, projectData);

            await pptx.writeFile({ fileName: filename });
            App.showToast('PowerPoint baixado com sucesso!', 'success');
        } catch (error) {
            console.error('PPTX export error:', error);
            
            // Fallback: try image-based approach
            try {
                await this.fallbackPPTX(filename);
            } catch (fallbackError) {
                console.error('Fallback PPTX error:', fallbackError);
                App.showToast('Erro ao gerar PowerPoint. Tente novamente.', 'error');
            }
        }
    },

    /**
     * Build cover slide for PPTX using native pptxgen elements
     */
    async buildCoverSlide(pptx, data) {
        const slide = pptx.addSlide();
        
        // Green background
        slide.background = { color: '1B7A3D' };

        // Decorative line
        slide.addShape(pptx.ShapeType ? pptx.ShapeType.rect : 'rect', {
            x: 3.8, y: 1.5, w: 2.4, h: 0.04,
            fill: { color: 'FFFFFF', transparency: 50 }
        });

        // Title
        slide.addText('Cronograma de Entregáveis', {
            x: 0.5, y: 1.8, w: 9, h: 0.9,
            fontSize: 32, fontFace: 'Arial',
            color: 'FFFFFF', bold: true,
            align: 'center'
        });

        // Project name
        slide.addText(data.projectName || 'Projeto', {
            x: 0.5, y: 2.7, w: 9, h: 0.6,
            fontSize: 18, fontFace: 'Arial',
            color: 'FFFFFF', transparency: 15,
            align: 'center'
        });

        // Client name
        slide.addText(data.clientName || '', {
            x: 0.5, y: 3.3, w: 9, h: 0.5,
            fontSize: 14, fontFace: 'Arial',
            color: 'FFFFFF', transparency: 30,
            align: 'center'
        });

        // Date
        const dateStr = new Date().toLocaleDateString('pt-BR', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
        slide.addText(dateStr, {
            x: 0.5, y: 4.0, w: 9, h: 0.4,
            fontSize: 11, fontFace: 'Arial',
            color: 'FFFFFF', transparency: 50,
            align: 'center'
        });

        // Footer
        slide.addShape(pptx.ShapeType ? pptx.ShapeType.rect : 'rect', {
            x: 0, y: 5.0, w: 10, h: 0.56,
            fill: { color: '000000', transparency: 85 }
        });
        slide.addText('Gestão Integrada em Saúde e Segurança do Trabalho', {
            x: 0.5, y: 5.05, w: 9, h: 0.45,
            fontSize: 9, fontFace: 'Arial',
            color: 'FFFFFF', transparency: 40,
            align: 'center'
        });
    },

    /**
     * Build gantt chart slide using image capture
     */
    async buildGanttSlide(pptx, data) {
        const slide = pptx.addSlide();
        slide.background = { color: 'FFFFFF' };

        // Header bar
        slide.addShape(pptx.ShapeType ? pptx.ShapeType.rect : 'rect', {
            x: 0, y: 0, w: 10, h: 0.6,
            fill: { color: '1B7A3D' }
        });
        slide.addText('Cronograma de Entregáveis', {
            x: 0.3, y: 0.05, w: 6, h: 0.5,
            fontSize: 14, fontFace: 'Arial',
            color: 'FFFFFF', bold: true
        });
        slide.addText(data.clientName || '', {
            x: 6, y: 0.05, w: 3.7, h: 0.5,
            fontSize: 10, fontFace: 'Arial',
            color: 'FFFFFF', transparency: 20,
            align: 'right'
        });

        // Try to capture the gantt chart as image
        const ganttSlide = document.getElementById('ganttSlide');
        if (ganttSlide) {
            try {
                const origStyles = {
                    boxShadow: ganttSlide.style.boxShadow,
                    border: ganttSlide.style.border,
                    borderRadius: ganttSlide.style.borderRadius
                };
                ganttSlide.style.boxShadow = 'none';
                ganttSlide.style.border = 'none';
                ganttSlide.style.borderRadius = '0';

                const canvas = await html2canvas(ganttSlide, {
                    scale: 1.5,
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: '#FFFFFF',
                    logging: false
                });

                ganttSlide.style.boxShadow = origStyles.boxShadow;
                ganttSlide.style.border = origStyles.border;
                ganttSlide.style.borderRadius = origStyles.borderRadius;

                const imgData = canvas.toDataURL('image/png');
                slide.addImage({
                    data: imgData,
                    x: 0.15, y: 0.7, w: 9.7, h: 4.6,
                    rounding: false
                });
            } catch (e) {
                console.warn('Could not capture gantt image, using table fallback', e);
                this.addGanttTableFallback(slide, pptx, data);
            }
        } else {
            this.addGanttTableFallback(slide, pptx, data);
        }

        // Footer
        slide.addShape(pptx.ShapeType ? pptx.ShapeType.rect : 'rect', {
            x: 0, y: 5.1, w: 10, h: 0.46,
            fill: { color: 'F8F9FA' }
        });
        slide.addText('Gestão Integrada em SST', {
            x: 0.3, y: 5.12, w: 4, h: 0.4,
            fontSize: 8, fontFace: 'Arial', color: 'ADB5BD'
        });
        slide.addText('Reunião de Kickoff', {
            x: 5, y: 5.12, w: 4.7, h: 0.4,
            fontSize: 8, fontFace: 'Arial', color: 'ADB5BD',
            align: 'right'
        });
    },

    /**
     * Fallback: add deliverables as a table when image capture fails
     */
    addGanttTableFallback(slide, pptx, data) {
        if (!data || !data.deliverables) return;

        const categoryColors = {
            'Documentação': '3673B8',
            'Treinamentos': 'D48806',
            'Laudos Técnicos': '2E8B57',
            'Exames/ASO': 'C2185B',
            'Gestão': '7B1FA2',
            'Implantação': '0097A7',
            'Monitoramento': '546E7A'
        };

        const rows = [
            [
                { text: 'Entregável', options: { bold: true, fontSize: 9, color: 'FFFFFF', fill: { color: '1B7A3D' }, align: 'left' } },
                { text: 'Categoria', options: { bold: true, fontSize: 9, color: 'FFFFFF', fill: { color: '1B7A3D' }, align: 'center' } },
                { text: 'Duração', options: { bold: true, fontSize: 9, color: 'FFFFFF', fill: { color: '1B7A3D' }, align: 'center' } },
                { text: 'Fase', options: { bold: true, fontSize: 9, color: 'FFFFFF', fill: { color: '1B7A3D' }, align: 'center' } }
            ]
        ];

        data.deliverables.forEach(d => {
            const catColor = categoryColors[d.category] || '546E7A';
            rows.push([
                { text: d.name, options: { fontSize: 8, color: '212529', align: 'left' } },
                { text: d.category, options: { fontSize: 8, color: catColor, align: 'center' } },
                { text: `${d.durationDays} dias`, options: { fontSize: 8, color: '495057', align: 'center' } },
                { text: `Fase ${d.phase}`, options: { fontSize: 8, color: '495057', align: 'center' } }
            ]);
        });

        slide.addTable(rows, {
            x: 0.3, y: 0.8, w: 9.4,
            colW: [4.5, 2.0, 1.5, 1.4],
            border: { type: 'solid', pt: 0.5, color: 'DEE2E6' },
            rowH: 0.32,
            fontSize: 8,
            fontFace: 'Arial',
            autoPage: false
        });
    },

    /**
     * Build deliverables summary table slide
     */
    async buildTableSlide(pptx, data) {
        if (!data || !data.deliverables || data.deliverables.length === 0) return;

        const slide = pptx.addSlide();
        slide.background = { color: 'FFFFFF' };

        // Header bar
        slide.addShape(pptx.ShapeType ? pptx.ShapeType.rect : 'rect', {
            x: 0, y: 0, w: 10, h: 0.6,
            fill: { color: '1B7A3D' }
        });
        slide.addText('Detalhamento dos Entregáveis', {
            x: 0.3, y: 0.05, w: 6, h: 0.5,
            fontSize: 14, fontFace: 'Arial',
            color: 'FFFFFF', bold: true
        });

        const categoryColors = {
            'Documentação': '3673B8',
            'Treinamentos': 'D48806',
            'Laudos Técnicos': '2E8B57',
            'Exames/ASO': 'C2185B',
            'Gestão': '7B1FA2',
            'Implantação': '0097A7',
            'Monitoramento': '546E7A'
        };

        const phaseLabels = { 1: 'Implantação', 2: 'Execução', 3: 'Monitoramento' };

        const rows = [
            [
                { text: '#', options: { bold: true, fontSize: 8, color: 'FFFFFF', fill: { color: '343A40' }, align: 'center' } },
                { text: 'Entregável', options: { bold: true, fontSize: 8, color: 'FFFFFF', fill: { color: '343A40' }, align: 'left' } },
                { text: 'Categoria', options: { bold: true, fontSize: 8, color: 'FFFFFF', fill: { color: '343A40' }, align: 'center' } },
                { text: 'Dias', options: { bold: true, fontSize: 8, color: 'FFFFFF', fill: { color: '343A40' }, align: 'center' } },
                { text: 'Fase', options: { bold: true, fontSize: 8, color: 'FFFFFF', fill: { color: '343A40' }, align: 'center' } },
                { text: 'Descrição', options: { bold: true, fontSize: 8, color: 'FFFFFF', fill: { color: '343A40' }, align: 'left' } }
            ]
        ];

        data.deliverables.forEach((d, i) => {
            const isEven = i % 2 === 0;
            const bgColor = isEven ? 'FFFFFF' : 'F8F9FA';
            const catColor = categoryColors[d.category] || '546E7A';
            
            rows.push([
                { text: String(i + 1), options: { fontSize: 7, color: '868E96', fill: { color: bgColor }, align: 'center' } },
                { text: d.name, options: { fontSize: 7, color: '212529', fill: { color: bgColor }, align: 'left', bold: true } },
                { text: d.category, options: { fontSize: 7, color: catColor, fill: { color: bgColor }, align: 'center' } },
                { text: String(d.durationDays), options: { fontSize: 7, color: '495057', fill: { color: bgColor }, align: 'center', bold: true } },
                { text: phaseLabels[d.phase] || `Fase ${d.phase}`, options: { fontSize: 7, color: '495057', fill: { color: bgColor }, align: 'center' } },
                { text: d.description || '—', options: { fontSize: 6.5, color: '868E96', fill: { color: bgColor }, align: 'left' } }
            ]);
        });

        const maxRows = Math.min(rows.length, 16);
        slide.addTable(rows.slice(0, maxRows), {
            x: 0.2, y: 0.75, w: 9.6,
            colW: [0.4, 2.5, 1.3, 0.6, 1.2, 3.6],
            border: { type: 'solid', pt: 0.3, color: 'E9ECEF' },
            rowH: 0.28,
            fontSize: 7,
            fontFace: 'Arial',
            autoPage: false
        });

        // Summary info
        const totalDays = data.deliverables.reduce((sum, d) => sum + d.durationDays, 0);
        slide.addText(
            `Total: ${data.deliverables.length} entregáveis  •  ${totalDays} dias úteis  •  Duração: ${data.contractDuration || 12} meses  •  Início: ${data.startDate || '—'}`,
            {
                x: 0.3, y: 4.9, w: 9.4, h: 0.35,
                fontSize: 8, fontFace: 'Arial',
                color: '868E96', align: 'center',
                fill: { color: 'F1F3F5' },
                shape: pptx.ShapeType ? pptx.ShapeType.roundRect : 'roundRect',
                rectRadius: 0.05
            }
        );

        // Footer
        slide.addShape(pptx.ShapeType ? pptx.ShapeType.rect : 'rect', {
            x: 0, y: 5.1, w: 10, h: 0.46,
            fill: { color: 'F8F9FA' }
        });
        slide.addText('Gestão Integrada em SST', {
            x: 0.3, y: 5.12, w: 4, h: 0.4,
            fontSize: 8, fontFace: 'Arial', color: 'ADB5BD'
        });
    },

    /**
     * Fallback PPTX: capture slides as images
     */
    async fallbackPPTX(filename) {
        const PptxGen = typeof PptxGenJS !== 'undefined' ? PptxGenJS : pptxgen;
        const pptx = new PptxGen();
        pptx.layout = 'LAYOUT_16x9';

        const presentation = document.getElementById('ganttPresentation');
        if (!presentation) throw new Error('Presentation not found');

        const slideEls = presentation.querySelectorAll('.presentation-slide');

        for (let i = 0; i < slideEls.length; i++) {
            const slideEl = slideEls[i];
            
            const origStyles = {
                boxShadow: slideEl.style.boxShadow,
                border: slideEl.style.border,
                borderRadius: slideEl.style.borderRadius
            };
            slideEl.style.boxShadow = 'none';
            slideEl.style.border = 'none';
            slideEl.style.borderRadius = '0';

            const canvas = await html2canvas(slideEl, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#FFFFFF',
                logging: false
            });

            slideEl.style.boxShadow = origStyles.boxShadow;
            slideEl.style.border = origStyles.border;
            slideEl.style.borderRadius = origStyles.borderRadius;

            const dataUrl = canvas.toDataURL('image/png');
            const slide = pptx.addSlide();
            slide.addImage({ data: dataUrl, x: 0, y: 0, w: '100%', h: '100%' });
        }

        await pptx.writeFile({ fileName: filename });
        App.showToast('PowerPoint baixado com sucesso!', 'success');
    },

    /**
     * Generate a filename based on client name and date
     * @param {string} clientName 
     * @param {string} extension
     * @returns {string}
     */
    generateFilename(clientName, extension = 'pdf') {
        const safeName = (clientName || 'cliente')
            .toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
        
        const date = new Date().toISOString().split('T')[0];
        return `cronograma-${safeName}-${date}.${extension}`;
    }
};
