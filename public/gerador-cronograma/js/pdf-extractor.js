/**
 * PDF Text Extractor Module
 * Uses PDF.js to extract text content from uploaded PDF files
 */
const PDFExtractor = {
    /**
     * Initialize PDF.js worker
     */
    init() {
        if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'js/pdf.worker.min.js';
        }
    },

    /**
     * Extract text from a PDF file
     * @param {File} file - The PDF file object
     * @returns {Promise<{text: string, pages: number}>}
     */
    async extractFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    const arrayBuffer = e.target.result;
                    const result = await this.extractFromArrayBuffer(arrayBuffer);
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => reject(new Error('Erro ao ler o arquivo PDF.'));
            reader.readAsArrayBuffer(file);
        });
    },

    /**
     * Extract text from an ArrayBuffer (PDF content)
     * @param {ArrayBuffer} arrayBuffer
     * @returns {Promise<{text: string, pages: number}>}
     */
    async extractFromArrayBuffer(arrayBuffer) {
        try {
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const numPages = pdf.numPages;
            let fullText = '';

            for (let i = 1; i <= numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                
                // Process text items maintaining some structure
                let lastY = null;
                let pageText = '';
                
                for (const item of textContent.items) {
                    if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
                        pageText += '\n';
                    }
                    pageText += item.str + ' ';
                    lastY = item.transform[5];
                }
                
                fullText += pageText + '\n\n--- Página ' + i + ' ---\n\n';
            }

            return {
                text: fullText.trim(),
                pages: numPages
            };
        } catch (error) {
            console.error('PDF extraction error:', error);
            throw new Error('Não foi possível extrair o texto do PDF. Verifique se o arquivo não está protegido ou corrompido.');
        }
    },

    /**
     * Extract text from base64-encoded PDF
     * @param {string} base64 - Base64-encoded PDF content
     * @returns {Promise<{text: string, pages: number}>}
     */
    async extractFromBase64(base64) {
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        return this.extractFromArrayBuffer(bytes.buffer);
    }
};

// Initialize on load
PDFExtractor.init();
