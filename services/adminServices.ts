import { apiCall } from './authService';

// =====================================================
// 🔧 FUNÇÕES DE DENÚNCIAS (ADMIN)
// =====================================================

// Listar todas as denúncias
export const listarDenuncias = async (status?: string) => {
  try {
    const endpoint = status ? `/denuncias?status=${status}` : '/denuncias';
    const response = await apiCall(endpoint, 'GET');
    return response;
  } catch (error) {
    console.error('Erro ao listar denúncias:', error);
    throw error;
  }
};

// Buscar denúncia por ID
export const buscarDenunciaPorId = async (id_denuncia: number) => {
  try {
    const response = await apiCall(`/denuncias/${id_denuncia}`, 'GET');
    return response;
  } catch (error) {
    console.error('Erro ao buscar denúncia:', error);
    throw error;
  }
};

// Atualizar status da denúncia
export const atualizarStatusDenuncia = async (id_denuncia: number, status: string, observacoes?: string) => {
  try {
    const response = await apiCall(`/denuncias/${id_denuncia}/status`, 'PUT', {
      status,
      observacoes
    });
    return response;
  } catch (error) {
    console.error('Erro ao atualizar status da denúncia:', error);
    throw error;
  }
};

// Obter estatísticas de denúncias
export const obterEstatisticasDenuncias = async () => {
  try {
    const response = await apiCall('/denuncias/estatisticas', 'GET');
    return response;
  } catch (error) {
    console.error('Erro ao obter estatísticas de denúncias:', error);
    throw error;
  }
};

// Deletar tarefa (quando denúncia é aprovada)
export const deletarTarefa = async (id_tarefa: number) => {
  try {
    const response = await apiCall(`/tarefas/${id_tarefa}`, 'DELETE');
    return response;
  } catch (error) {
    console.error('Erro ao deletar tarefa:', error);
    throw error;
  }
};

// Notificar criador da tarefa sobre exclusão
export const notificarCriadorTarefaExcluida = async (id_tarefa: number, titulo_tarefa: string) => {
  try {
    const response = await apiCall('/notificacoes/tarefa-excluida', 'POST', {
      id_tarefa,
      titulo_tarefa,
      mensagem: `Sua tarefa "${titulo_tarefa}" foi excluída por violar os termos do aplicativo.`
    });
    return response;
  } catch (error) {
    console.error('Erro ao notificar criador da tarefa:', error);
    throw error;
  }
};

// =====================================================
// 👥 FUNÇÕES DE USUÁRIOS (ADMIN)
// =====================================================

// Listar todos os usuários do sistema (admin)
export const listarTodosUsuarios = async () => {
  try {
    const response = await apiCall('/usuarios', 'GET');
    return response;
  } catch (error) {
    console.error('Erro ao listar todos os usuários:', error);
    throw error;
  }
};

// Buscar detalhes de usuário por ID (admin)
export const buscarUsuarioPorId = async (id_usuario: number) => {
  try {
    const response = await apiCall(`/usuarios/${id_usuario}`, 'GET');
    return response;
  } catch (error) {
    console.error('Erro ao buscar usuário por ID:', error);
    throw error;
  }
};

// =====================================================
// 📋 FUNÇÕES DE TAREFAS (ADMIN)
// =====================================================

// Listar todas as tarefas do sistema (admin)
export const listarTodasTarefas = async () => {
  try {
    const response = await apiCall('/tarefas', 'GET');
    return response;
  } catch (error) {
    console.error('Erro ao listar todas as tarefas:', error);
    throw error;
  }
};

// Buscar detalhes de tarefa por ID (admin)
export const buscarTarefaPorId = async (id_tarefa: number) => {
  try {
    const response = await apiCall(`/tarefas/${id_tarefa}`, 'GET');
    return response;
  } catch (error) {
    console.error('Erro ao buscar tarefa por ID:', error);
    throw error;
  }
};