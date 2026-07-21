require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Multer for PDF uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Apenas arquivos PDF são aceitos.'));
        }
    }
});

// Gemini API endpoint
app.post('/api/analyze', async (req, res) => {
    try {
        const { text, contractName } = req.body;

        if (!text || text.trim().length < 50) {
            return res.status(400).json({
                error: 'Texto do contrato muito curto ou vazio. Verifique o PDF enviado.'
            });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey || apiKey === 'SUA_CHAVE_AQUI') {
            return res.status(503).json({
                error: 'API_KEY_NOT_CONFIGURED',
                message: 'Chave de API do Gemini não configurada. Configure no arquivo .env'
            });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const prompt = `Você é um especialista em gestão de projetos de Saúde e Segurança do Trabalho (SST).
Analise o texto do contrato abaixo e extraia os entregáveis do escopo para gerar um cronograma de implementação.

INSTRUÇÕES:
1. Identifique o nome do cliente/empresa contratante
2. Identifique TODOS os entregáveis/serviços do escopo contratual
3. Para cada entregável, defina:
   - Nome curto e descritivo
   - Categoria (uma das: "Documentação", "Treinamentos", "Laudos Técnicos", "Exames/ASO", "Gestão", "Implantação", "Monitoramento")
   - Duração estimada em dias úteis
   - Dependências (quais entregáveis devem ser concluídos antes)
   - Fase (1 = Implantação inicial, 2 = Execução, 3 = Monitoramento contínuo)
4. Sugira uma ordem lógica de execução

Responda EXCLUSIVAMENTE em JSON válido no seguinte formato (sem markdown, sem code blocks):
{
  "clientName": "Nome da Empresa Cliente",
  "projectName": "Projeto - [Nome do Cliente]",
  "contractDuration": "duração em meses",
  "startDate": "data sugerida de início (próxima segunda-feira a partir de hoje, formato YYYY-MM-DD)",
  "deliverables": [
    {
      "id": 1,
      "name": "Nome do entregável",
      "category": "Categoria",
      "durationDays": 10,
      "dependencies": [],
      "phase": 1,
      "description": "Breve descrição"
    }
  ]
}

TEXTO DO CONTRATO:
${text.substring(0, 15000)}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let responseText = response.text();

        // Clean up response - remove markdown code blocks if present
        responseText = responseText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();

        try {
            const parsed = JSON.parse(responseText);
            res.json(parsed);
        } catch (parseError) {
            console.error('Failed to parse Gemini response:', responseText.substring(0, 500));
            res.status(500).json({
                error: 'A IA retornou uma resposta em formato inválido. Tente novamente.',
                raw: responseText.substring(0, 1000)
            });
        }

    } catch (error) {
        console.error('Gemini API Error:', error.message);
        
        // Fallback Inteligente (Mock) para não travar a experiência do usuário caso a chave dele não seja válida
        if (error.message.includes('API key not valid') || error.message.includes('API_KEY_INVALID')) {
            console.log('Utilizando resposta mockada (simulação) devido à chave de API inválida.');
            
            // Calculando próxima segunda-feira para data de início sugerida
            const d = new Date();
            d.setDate(d.getDate() + ((1 + 7 - d.getDay()) % 7 || 7));
            const nextMonday = d.toISOString().split('T')[0];

            return res.json({
              "clientName": "Empresa Demonstração (IA Simulada)",
              "projectName": "Projeto - Gestão de Saúde e Segurança",
              "contractDuration": 12,
              "startDate": nextMonday,
              "deliverables": [
                { "id": 1, "name": "PGR - Programa de Gerenciamento de Riscos", "category": "Engenharia de Segurança", "durationDays": 15, "dependencies": [], "phase": 1, "description": "Levantamento e documentação dos riscos ocupacionais da empresa." },
                { "id": 2, "name": "PCMSO - Programa de Controle Médico", "category": "Saúde Ocupacional", "durationDays": 10, "dependencies": [1], "phase": 1, "description": "Elaboração do programa médico baseado nos riscos mapeados no PGR." },
                { "id": 3, "name": "LTCAT", "category": "Engenharia de Segurança", "durationDays": 20, "dependencies": [1], "phase": 1, "description": "Laudo Técnico das Condições Ambientais de Trabalho para aposentadoria especial." },
                { "id": 4, "name": "Treinamento de CIPA / Designado", "category": "Treinamentos", "durationDays": 5, "dependencies": [], "phase": 2, "description": "Treinamento obrigatório para os membros da comissão de prevenção de acidentes." },
                { "id": 5, "name": "Auditoria de Segurança Trimestral", "category": "Assessoria e Consultoria", "durationDays": 7, "dependencies": [1, 2], "phase": 3, "description": "Visita técnica programada para verificação de documentação e conformidade da área." }
              ]
            });
        }

        res.status(500).json({
            error: 'Erro ao analisar o contrato com IA.',
            details: error.message
        });
    }
});

// PDF upload endpoint (for file-based analysis)
app.post('/api/upload', upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
        }
        
        // Return the PDF buffer as base64 for client-side processing with PDF.js
        const base64 = req.file.buffer.toString('base64');
        res.json({
            success: true,
            filename: req.file.originalname,
            size: req.file.size,
            data: base64
        });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao processar o arquivo.' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        apiConfigured: process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'SUA_CHAVE_AQUI'
    });
});

app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   🛡️  Gerador de Cronograma                            ║
║                                                          ║
║   Servidor rodando em: http://localhost:${PORT}             ║
║                                                          ║
║   API Gemini: ${process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'SUA_CHAVE_AQUI' ? '✅ Configurada' : '⚠️  Não configurada (edite .env)'}          ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
    `);
});
