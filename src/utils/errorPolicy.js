/**
 * Política Centralizada de Segurança e Mascaramento de Erros (Zero-Leak Error Policy)
 *
 * Objetivo:
 * - Impedir que qualquer erro de banco de dados (PostgreSQL / PostgREST / Supabase / RLS),
 *   nomes de tabelas, colunas, constraints, políticas, tokens, URLs internas ou stack traces
 *   sejam expostos na interface, em alertas ou no console do navegador.
 */

const SENSITIVE_ERROR_REGEX =
  /relation\b|column\b|table\b|schema\b|postgres|pgrst|supabase|rls\b|row-level security|policy\b|syntax error|violates|constraint\b|foreign key|null value|uuid\b|jsonb\b|jwt\b|token\b|apikey|api_key|bearer\b|service_role|anon\b|stack\b|pg_catalog|sqlstate|at\s+\w+\s*\(|https?:\/\/[^\s]*supabase/i;

const GENERIC_FALLBACK_MESSAGE =
  'Não foi possível concluir a operação no momento. Tente novamente.';

/**
 * Cria um erro seguro de validação de negócio que pode ser exibido ao usuário.
 */
export function createSafeError(userMessage) {
  const err = new Error(userMessage || GENERIC_FALLBACK_MESSAGE);
  err.isSafeUserError = true;
  return err;
}

/**
 * Converte qualquer erro (Supabase, PostgREST, Auth, Rede ou Runtime) em uma
 * mensagem segura e opaca que não revela nada sobre o banco de dados ou infraestrutura.
 */
export function sanitizeErrorMessage(error, fallback = GENERIC_FALLBACK_MESSAGE) {
  if (!error) return fallback;

  if (
    error?.isSafeUserError === true &&
    typeof error.message === 'string' &&
    !SENSITIVE_ERROR_REGEX.test(error.message)
  ) {
    return error.message;
  }

  const code = String(error?.code || error?.status || '').toUpperCase().trim();
  const rawMsg = String(
    typeof error === 'string'
      ? error
      : error?.message || error?.error_description || ''
  ).trim();

  // 1. Duplicidade (Unique Violation)
  if (code === '23505' || /duplicate key|already exists|unique constraint/i.test(rawMsg)) {
    return 'Já existe um registro cadastrado com estes dados.';
  }

  // 2. Vínculo ativo (Foreign Key Violation)
  if (code === '23503' || /foreign key/i.test(rawMsg)) {
    return 'Este registro possui vínculos ativos e não pode ser removido ou alterado.';
  }

  // 3. Permissão / RLS / Autenticação expirada
  if (
    code === '42501' ||
    code === 'PGRST301' ||
    code === '401' ||
    code === '403' ||
    /permission denied|row-level security|unauthorized|forbidden|not authorized|jwt/i.test(rawMsg)
  ) {
    return 'Acesso não autorizado para realizar esta operação.';
  }

  // 4. Login / Credenciais (sem enumeração de usuários)
  if (
    /invalid login credentials|invalid_grant|email not confirmed|user not found|invalid email or password/i.test(
      rawMsg
    )
  ) {
    return 'E-mail ou senha incorretos.';
  }

  if (/user already registered/i.test(rawMsg)) {
    return 'Não foi possível concluir o cadastro com os dados informados.';
  }

  if (/password should be|weak_password/i.test(rawMsg)) {
    return 'A senha informada não atende aos requisitos mínimos de segurança.';
  }

  // 5. Rate Limit
  if (code === '429' || /rate limit|too many requests|excedido/i.test(rawMsg)) {
    return 'Muitas tentativas em sequência. Aguarde alguns instantes e tente novamente.';
  }

  // 6. Falha de rede / timeout
  if (/network|failed to fetch|load failed|timeout|err_network/i.test(rawMsg)) {
    return 'Falha de conexão com o servidor. Verifique sua internet e tente novamente.';
  }

  // 7. Qualquer código interno de banco (SQLSTATE de 5 caracteres ou PGRST*) ou mensagem com termos sensíveis
  if (
    code.startsWith('PGRST') ||
    /^[0-9A-Z]{5}$/.test(code) ||
    SENSITIVE_ERROR_REGEX.test(rawMsg)
  ) {
    return fallback;
  }

  // 8. Mensagens curtas de validação sem termos técnicos
  if (rawMsg.length > 0 && rawMsg.length <= 160 && !/[{}[\]\\<>]/.test(rawMsg)) {
    return rawMsg;
  }

  return fallback;
}

/**
 * Verifica se um valor parece conter detalhes internos de banco/Supabase.
 */
function isSensitiveObjectOrString(arg) {
  if (!arg) return false;
  if (typeof arg === 'string') {
    return SENSITIVE_ERROR_REGEX.test(arg);
  }
  if (arg instanceof Error) {
    return !arg.isSafeUserError || SENSITIVE_ERROR_REGEX.test(arg.message || '');
  }
  if (typeof arg === 'object') {
    if ('code' in arg || 'details' in arg || 'hint' in arg || 'message' in arg) {
      return true;
    }
  }
  return false;
}

function scrubConsoleArg(arg) {
  if (!arg) return arg;
  if (typeof arg === 'string') {
    return SENSITIVE_ERROR_REGEX.test(arg) ? '[Mensagem interna protegida]' : arg;
  }
  if (arg instanceof Error) {
    return sanitizeErrorMessage(arg);
  }
  if (typeof arg === 'object' && isSensitiveObjectOrString(arg)) {
    return { erro: sanitizeErrorMessage(arg) };
  }
  return arg;
}

/**
 * Log seguro que nunca despeja objetos crus do Supabase/Postgres no console.
 */
export function logSafeError(context, error = null) {
  if (import.meta.env?.PROD) {
    return;
  }
  const safeMsg = error ? sanitizeErrorMessage(error) : '';
  console.warn(`[Aviso] ${context}${safeMsg ? `: ${safeMsg}` : ''}`);
}

let policyInstalled = false;

/**
 * Instala interceptadores globais no navegador para impedir vazamento de detalhes
 * de banco de dados em console.error, console.warn, window.onerror e unhandledrejection.
 */
export function installGlobalErrorPolicy() {
  if (policyInstalled || typeof window === 'undefined') return;
  policyInstalled = true;

  const origError = console.error.bind(console);
  const origWarn = console.warn.bind(console);

  console.error = (...args) => {
    if (import.meta.env?.PROD) {
      const hasSensitive = args.some(isSensitiveObjectOrString);
      if (hasSensitive) return;
    }
    origError(...args.map(scrubConsoleArg));
  };

  console.warn = (...args) => {
    if (import.meta.env?.PROD) {
      const hasSensitive = args.some(isSensitiveObjectOrString);
      if (hasSensitive) return;
    }
    origWarn(...args.map(scrubConsoleArg));
  };

  window.addEventListener('unhandledrejection', (event) => {
    if (event?.reason && isSensitiveObjectOrString(event.reason)) {
      event.preventDefault();
    }
  });

  window.addEventListener('error', (event) => {
    if (event?.error && isSensitiveObjectOrString(event.error)) {
      event.preventDefault();
    }
  });
}
