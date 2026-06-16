import * as pdfjsLib from 'pdfjs-dist';

// Configura o worker do pdf.js para rodar de forma assíncrona (essencial no navegador)
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

export const extractTextFromPDF = async (file) => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += `[Página ${pageNum}] ` + pageText + '\n\n';
    }
    
    return fullText;
  } catch (error) {
    console.error('Erro ao ler PDF:', error);
    throw new Error('Falha ao extrair texto do PDF anexado. O arquivo pode estar corrompido ou protegido.');
  }
};
