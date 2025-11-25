// =====================================================
// 🔐 TOKEN FIXO DO ADMIN
// =====================================================
const ADMIN_TOKEN = 'ADMIN_NOITON_2025_SECURE_TOKEN_XYZ123';
const API_BASE = 'http://192.168.15.14:3000';

// =====================================================
// 🔧 FUNÇÃO PARA CHAMADAS ADMIN
// =====================================================
const adminApiCall = async (endpoint: string, method = 'GET', body: any = null) => {
  const url = `${API_BASE}${endpoint}`;
  
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${ADMIN_TOKEN}`,
    'Content-Type': 'application/json',
  };

  const config: RequestInit = {
    method,
    headers,
  };

  if (body && method !== 'GET') {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      // Tenta obter mais detalhes do erro
      let errorMessage = `Admin API Error: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage += ` - ${errorData.message || errorData.error || response.statusText}`;
      } catch {
        errorMessage += ` ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
};

// =====================================================
// 🔧 FUNÇÕES DE DENÚNCIAS (ADMIN)
// =====================================================

// Listar todas as denúncias
export const listarDenuncias = async (status?: string) => {
  try {
    const endpoint = status ? `/admin/denuncias?status=${status}` : '/admin/denuncias';
    const response = await adminApiCall(endpoint, 'GET');
    return response.denuncias || [];
  } catch (error) {
    throw error;
  }
};

// Buscar denúncia por ID
export const buscarDenunciaPorId = async (id_denuncia: number) => {
  try {
    const response = await adminApiCall(`/admin/denuncias/${id_denuncia}`, 'GET');
    return response;
  } catch (error) {
    throw error;
  }
};

// Atualizar status da denúncia (genérico)
export const atualizarStatusDenuncia = async (id_denuncia: number, status: string, observacoes?: string) => {
  try {
    const payload = {
      status,
      ...(observacoes && { observacoes })
    };
    
    const response = await adminApiCall(`/admin/denuncias/${id_denuncia}/status`, 'PUT', payload);
    return response;
  } catch (error) {
    throw error;
  }
};

// ✅ Aprovar denúncia (apaga só a tarefa, mantém denúncia)
export const aprovarDenuncia = async (id_denuncia: number, id_tarefa?: number) => {
  try {
    // Primeira tentativa: POST /admin/denuncias/:id/aprovar
    try {
      const response = await adminApiCall(`/admin/denuncias/${id_denuncia}/aprovar`, 'POST');
      return response;
    } catch (postError) {
      // Fallback: Atualizar status + deletar tarefa manualmente
      try {
        const updateResponse = await adminApiCall(`/admin/denuncias/${id_denuncia}/status`, 'PUT', {
          status: 'aprovada',
          observacoes: 'Denúncia aprovada pelo administrador - tarefa removida'
        });
        
        // Se temos o id_tarefa, tentamos deletar
        let tarefaDeletada = false;
        if (id_tarefa) {
          try {
            await adminApiCall(`/admin/tarefas/${id_tarefa}`, 'DELETE');
            tarefaDeletada = true;
          } catch (deleteError) {
            tarefaDeletada = false;
          }
        }
        
        return { 
          message: tarefaDeletada 
            ? 'Denúncia e tarefa removidas' 
            : 'Denúncia aprovada (tarefa não pôde ser removida automaticamente)',
          status: 'aprovada',
          tarefaDeletada,
          ...updateResponse 
        };
      } catch (fallbackError) {
        throw new Error('Não foi possível aprovar a denúncia. Tente novamente.');
      }
    }
  } catch (error) {
    throw error;
  }
};

// ❌ Rejeitar denúncia (apaga denúncia silenciosamente, mantém tarefa)
export const rejeitarDenuncia = async (id_denuncia: number) => {
  try {
    const response = await adminApiCall(`/admin/denuncias/${id_denuncia}/rejeitar`, 'DELETE');
    return response;
  } catch (error) {
    throw error;
  }
};

// Obter estatísticas de denúncias (via dashboard)
export const obterEstatisticasDenuncias = async () => {
  try {
    const response = await adminApiCall('/admin/dashboard', 'GET');
    return response.estatisticas.denuncias;
  } catch (error) {
    throw error;
  }
};

// Deletar tarefa (quando denúncia é aprovada)
export const deletarTarefa = async (id_tarefa: number) => {
  try {
    const response = await adminApiCall(`/admin/tarefas/${id_tarefa}`, 'DELETE');
    return response;
  } catch (error) {
    throw error;
  }
};

// Notificar criador da tarefa sobre exclusão (simulado)
export const notificarCriadorTarefaExcluida = async (id_tarefa: number, titulo_tarefa: string) => {
  return { success: true, message: 'Notificação enviada' };
};

// =====================================================
// 👥 FUNÇÕES DE USUÁRIOS (ADMIN)
// =====================================================

// Listar todos os usuários do sistema (admin)
export const listarTodosUsuarios = async () => {
  try {
    const response = await adminApiCall('/admin/usuarios', 'GET');
    return response.usuarios || [];
  } catch (error) {
    throw error;
  }
};

// Buscar detalhes de usuário por ID (admin)
export const buscarUsuarioPorId = async (id_usuario: number) => {
  try {
    const response = await adminApiCall(`/admin/usuarios/${id_usuario}`, 'GET');
    return response;
  } catch (error) {
    throw error;
  }
};

// =====================================================
// 📋 FUNÇÕES DE TAREFAS (ADMIN)
// =====================================================

// Listar todas as tarefas do sistema (admin)
export const listarTodasTarefas = async () => {
  try {
    const response = await adminApiCall('/admin/tarefas', 'GET');
    return response.tarefas || [];
  } catch (error) {
    throw error;
  }
};

// Buscar detalhes de tarefa por ID (admin)
export const buscarTarefaPorId = async (id_tarefa: number) => {
  try {
    const response = await adminApiCall(`/admin/tarefas/${id_tarefa}`, 'GET');
    return response;
  } catch (error) {
    throw error;
  }
};

// =====================================================
// 📊 DASHBOARD ADMIN
// =====================================================

// Buscar estatísticas completas do dashboard
export const buscarDashboardAdmin = async () => {
  try {
    const response = await adminApiCall('/admin/dashboard', 'GET');
    return response;
  } catch (error) {
    throw error;
  }
};