import { cleanCpf, formatCpf, validateCpf } from '../services/cpfService.js';

const normalizeHeader = (value) => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLowerCase();

const normalizeName = (value) => String(value ?? '')
  .replace(/\s+/g, ' ')
  .trim();

const normalizeCpfCell = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(Math.trunc(value)).padStart(11, '0');
  }
  return cleanCpf(value);
};

export function parseTrainingParticipantRows(rows = []) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('A planilha está vazia. Use o modelo com as colunas Nome e CPF.');
  }

  const headerSearchLimit = Math.min(rows.length, 10);
  let headerRowIndex = -1;
  let nameColumnIndex = -1;
  let cpfColumnIndex = -1;

  for (let rowIndex = 0; rowIndex < headerSearchLimit; rowIndex += 1) {
    const normalizedCells = (rows[rowIndex] || []).map(normalizeHeader);
    const currentNameIndex = normalizedCells.findIndex(cell => cell === 'nome' || cell === 'nome completo');
    const currentCpfIndex = normalizedCells.findIndex(cell => cell === 'cpf');

    if (currentNameIndex >= 0 && currentCpfIndex >= 0) {
      headerRowIndex = rowIndex;
      nameColumnIndex = currentNameIndex;
      cpfColumnIndex = currentCpfIndex;
      break;
    }
  }

  if (headerRowIndex < 0) {
    throw new Error('Não encontrei as colunas Nome e CPF. Baixe o modelo e mantenha esses cabeçalhos.');
  }

  const participants = [];
  const issues = [];
  const seenCpfs = new Set();
  let filledRowCount = 0;

  rows.slice(headerRowIndex + 1).forEach((row, offset) => {
    const rowNumber = headerRowIndex + offset + 2;
    const rawName = row?.[nameColumnIndex];
    const rawCpf = row?.[cpfColumnIndex];
    const nome = normalizeName(rawName);
    const cpfDigits = normalizeCpfCell(rawCpf);

    if (!nome && !cpfDigits) return;
    filledRowCount += 1;

    if (!nome) {
      issues.push({ rowNumber, message: 'Nome não informado.' });
      return;
    }
    if (!cpfDigits) {
      issues.push({ rowNumber, message: 'CPF não informado.' });
      return;
    }
    if (!validateCpf(cpfDigits)) {
      issues.push({ rowNumber, message: 'CPF inválido.' });
      return;
    }
    if (seenCpfs.has(cpfDigits)) {
      issues.push({ rowNumber, message: 'CPF repetido na planilha.' });
      return;
    }

    seenCpfs.add(cpfDigits);
    participants.push({ nome, cpf: formatCpf(cpfDigits) });
  });

  if (filledRowCount === 0) {
    throw new Error('A planilha não possui participantes preenchidos.');
  }

  return {
    participants,
    issues,
    filledRowCount,
  };
}
