# gerador-de-cronograma

Uma plataforma web completa para gerar cronogramas de entregáveis (Gantt charts) para gestão integrada em saúde e segurança do trabalho, otimizada para reuniões de kickoff.

## Funcionalidades
- **Design premium** — dark mode com glassmorphism, gradientes verdes e tipografia moderna
- **Upload de PDF** — extração de texto via PDF.js
- **Análise por IA** — integração com Gemini API para extração automática dos entregáveis e datas
- **Modo Manual** — formulário interativo de preenchimento rápido
- **Templates** — opções de seleção rápida de entregáveis padrão
- **Visualização Gantt** — renderização profissional com 3 fases
- **Exportação** — download em PDF (16:9 ajustado) e PowerPoint (.pptx)

## Como Rodar
1. Clone este repositório
2. Rode `npm install`
3. Configure a chave da API do Gemini no `.env`
4. Rode `npm run dev`
5. Acesse `http://localhost:3000`
