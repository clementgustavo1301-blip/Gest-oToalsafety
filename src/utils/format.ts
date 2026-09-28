// Utilitários de formatação e exportação para o Sistema IPA

export const fmtDate = (d: string): string => {
  if (!d) return '-';
  const parts = d.split('-');
  if (parts.length !== 3) return d;
  const [y, m, day] = parts;
  return `${day}/${m}/${y}`;
};

export const fmtLongDate = (d: string): string => {
  if (!d) return '';
  const [y, m, day] = d.split('-').map(Number);
  if (!y || !m || !day) return d;
  const dateObj = new Date(y, m - 1, day);
  return dateObj.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

export const fmtCurrency = (val: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(val);
};

export const exportToCSV = (filename: string, rows: Record<string, any>[]): void => {
  if (!rows || !rows.length) return;
  const separator = ';';
  const keys = Object.keys(rows[0]);
  const csvContent =
    keys.join(separator) +
    '\n' +
    rows.map(row => {
      return keys.map(k => {
        let cell = row[k] === null || row[k] === undefined ? '' : row[k];
        cell = cell instanceof Date ? cell.toLocaleString('pt-BR') : cell.toString().replace(/"/g, '""');
        if (cell.search(/("|\n|;)/g) >= 0) {
          cell = `"${cell}"`;
        }
        return cell;
      }).join(separator);
    }).join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
