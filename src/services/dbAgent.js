import { supabase } from '../lib/supabase';

/**
 * Função executada pela IA para alterar ou consultar o banco de dados.
 */
export const executeDBAction = async (table, action, data = null, filters = null) => {
  try {
    let query = supabase.from(table);
    let response;

    console.log(`[EcoIA DB Agent] Executando: ${action} na tabela ${table}`);

    switch (action) {
      case 'select':
        query = query.select('*');
        if (filters) {
          Object.entries(filters).forEach(([key, value]) => {
            query = query.eq(key, value);
          });
        }
        response = await query;
        break;

      case 'insert':
        if (!data) throw new Error('Dados não fornecidos para inserção.');
        response = await query.insert(data).select();
        break;

      case 'update':
        if (!data) throw new Error('Dados não fornecidos para atualização.');
        if (!filters || Object.keys(filters).length === 0) throw new Error('Filtros não fornecidos para atualização (perigo de update sem where).');
        
        query = query.update(data);
        Object.entries(filters).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
        response = await query.select();
        break;

      case 'delete':
        if (!filters || Object.keys(filters).length === 0) throw new Error('Filtros não fornecidos para deleção (perigo de delete sem where).');
        
        query = query.delete();
        Object.entries(filters).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
        response = await query.select();
        break;

      default:
        throw new Error(`Ação não suportada: ${action}`);
    }

    if (response.error) {
      throw new Error(response.error.message);
    }

    return {
      success: true,
      message: `Operação ${action} executada com sucesso na tabela ${table}.`,
      count: Array.isArray(response.data) ? response.data.length : undefined,
      data: response.data
    };
  } catch (error) {
    console.error('[EcoIA DB Agent] Erro:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
