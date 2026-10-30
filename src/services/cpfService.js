/**
 * Serviço de Integração com a API CPF.CNPJ (Pacote 1: CPF A)
 * Base URL: https://api.cpfcnpj.com.br
 */

const DEFAULT_TOKEN = '8ebc7b04958639ecbda124e77ff4667e';
const BASE_URL = 'https://api.cpfcnpj.com.br';

export const cleanCpf = (cpf = '') => {
  return String(cpf).replace(/\D/g, '');
};

export const formatCpf = (cpf = '') => {
  const digits = cleanCpf(cpf).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
};

export const validateCpf = (cpf = '') => {
  const digits = cleanCpf(cpf);
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits.charAt(i), 10) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(digits.charAt(9), 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits.charAt(i), 10) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(digits.charAt(10), 10)) return false;

  return true;
};

/**
 * Consulta o CPF na API CPF.CNPJ (Pacote 1: CPF A - retorna Nome Completo)
 * @param {string} cpf - Número do CPF
 * @param {string} customToken - Token opcional (se não informado, usa o token de testes configurado)
 * @returns {Promise<{success: boolean, nome?: string, cpf?: string, error?: string, raw?: any}>}
 */
export async function searchCpfA(cpf, customToken = null) {
  const digits = cleanCpf(cpf);
  if (digits.length !== 11) {
    return {
      success: false,
      error: 'Informe um CPF válido com 11 dígitos.'
    };
  }

  // Pré-validação com algoritmo oficial do CPF para não enviar dados inválidos à API (evita erro HTTP 400)
  if (!validateCpf(digits)) {
    return {
      success: false,
      error: 'CPF inválido. Verifique os dígitos digitados.'
    };
  }

  const token = customToken || 
    import.meta.env?.VITE_CPFCNPJ_API_TOKEN || 
    (typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem('cpfcnpj_api_token') : null) || 
    DEFAULT_TOKEN;
  const url = `${BASE_URL}/${token}/1/${digits}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    let data = null;
    try {
      data = await response.json();
    } catch (_) {
      // Falha ao ler JSON
    }

    if (!response.ok) {
      if (response.status === 429) {
        return {
          success: false,
          error: 'Limite de requisições excedido. Tente novamente em alguns instantes.'
        };
      }
      if (response.status === 400) {
        const msg = data?.erro || data?.message;
        return {
          success: false,
          error: msg ? `Não foi possível localizar o CPF: ${msg}` : 'CPF não encontrado ou inválido na Receita Federal.',
          raw: data
        };
      }
      return {
        success: false,
        error: data?.erro || data?.message || 'Serviço de consulta de CPF temporariamente indisponível.',
        raw: data
      };
    }

    if (data && data.status === 1) {
      return {
        success: true,
        nome: data.nome,
        cpf: data.cpf || formatCpf(digits),
        raw: data
      };
    } else {
      return {
        success: false,
        error: data?.erro || 'CPF não encontrado ou inválido na Receita Federal.',
        erroCodigo: data?.erroCodigo,
        raw: data
      };
    }
  } catch (error) {
    console.error('Erro na consulta do CPF A:', error);
    return {
      success: false,
      error: 'Não foi possível conectar ao servidor de consulta de CPF. Você pode preencher o nome manualmente.'
    };
  }
}
