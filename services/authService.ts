import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'http://10.241.191.119:3000';
const TOKEN_KEY = 'auth_token';
const EMAIL_KEY = 'user_email';
const USER_ID_KEY = 'user_id';
const ACTIVE_WORKSPACE_KEY = 'active_workspace_id';
const ACTIVE_WORKSPACE_NAME_KEY = 'active_workspace_name';

// =====================================================
// 1️⃣ FUNÇÃO DE LOGIN (OBTER TOKEN)
// =====================================================
export const login = async (email: string, senha: string) => {
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({email, senha}),
    });

    const data = await response.json();

    if (response.ok) {
      // SALVAR TOKEN + EMAIL
      await AsyncStorage.setItem(TOKEN_KEY, data.token);
      await AsyncStorage.setItem(EMAIL_KEY, data.email);
      // Para simplificar, vamos assumir que o ID será obtido de outra forma
      // ou que o backend retorna o ID junto com o token
      await AsyncStorage.setItem(USER_ID_KEY, '1'); // Temporário

      return {sucesso: true, token: data.token, email: data.email};
    }

    return {sucesso: false, erro: data.error};
  } catch (error) {
    return {sucesso: false, erro: 'Conexão falhou'};
  }
};

// =====================================================
// 2️⃣ FUNÇÃO PARA OBTER TOKEN DO STORAGE
// =====================================================
export const getToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch (error) {
    console.error('Erro ao obter token:', error);
    return null;
  }
};

// =====================================================
// 3️⃣ FUNÇÃO PARA OBTER ID DO USUÁRIO
// =====================================================
export const getUserId = async (): Promise<number | null> => {
  try {
    const userId = await AsyncStorage.getItem(USER_ID_KEY);
    return userId ? parseInt(userId, 10) : null;
  } catch (error) {
    console.error('Erro ao obter ID do usuário:', error);
    return null;
  }
};

// =====================================================
// 4️⃣ FUNÇÃO PARA OBTER EMAIL DO USUÁRIO
// =====================================================
export const getUserEmail = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(EMAIL_KEY);
  } catch (error) {
    console.error('Erro ao obter email do usuário:', error);
    return null;
  }
};

// =====================================================
// 5️⃣ FUNÇÃO PARA REQUISIÇÕES AUTENTICADAS (Atualizada para incluir workspace)
// =====================================================
export const apiCall = async (
  endpoint: string,
  method = 'GET',
  body: any = null,
  includeWorkspace = false,
) => {
  const token = await getToken();

  if (!token) {
    throw new Error('Token não encontrado. Faça login novamente.');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // Incluir workspace ID no header se necessário
  if (includeWorkspace) {
    const workspaceId = await getActiveWorkspaceId();
    if (workspaceId) {
      headers['X-Workspace-ID'] = workspaceId.toString();
    }
  }

  const config: RequestInit = {
    method,
    headers,
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, config);

  // SE TOKEN EXPIROU (401)
  if (response.status === 401) {
    await logout(); // Limpar storage
    throw new Error('Token expirado. Faça login novamente.');
  }

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Erro na requisição');
  }

  return response.json();
};

// =====================================================
// 6️⃣ VERIFICAR SE TOKEN EXISTE E É VÁLIDO
// =====================================================
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    const token = await getToken();
    if (!token) {
      return false;
    }

    // TESTAR TOKEN COM REQUISIÇÃO SIMPLES
    const response = await fetch(`${API_BASE}/auth/verify`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.ok;
  } catch {
    return false;
  }
};

// =====================================================
// 7️⃣ LOGOUT (LIMPAR TOKEN E WORKSPACE)
// =====================================================
export const logout = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([
      TOKEN_KEY, 
      EMAIL_KEY, 
      USER_ID_KEY, 
      ACTIVE_WORKSPACE_KEY, 
      ACTIVE_WORKSPACE_NAME_KEY
    ]);
  } catch (error) {
    console.error('Erro ao fazer logout:', error);
  }
};

// =====================================================
// 8️⃣ FUNÇÃO UTILITÁRIA PARA REQUISIÇÕES COM AUTENTICAÇÃO
// =====================================================
export const makeAuthenticatedRequest = async (
  url: string,
  options: RequestInit = {},
): Promise<Response> => {
  const token = await getToken();

  if (!token) {
    throw new Error('Usuário não autenticado');
  }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    await logout();
    throw new Error('Token expirado. Faça login novamente.');
  }

  return response;
};

// =====================================================
// 9️⃣ VERIFICAR STATUS DA AUTENTICAÇÃO NA INICIALIZAÇÃO
// =====================================================
export const checkAuthStatus = async () => {
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    // Limpar dados inválidos
    await logout();
    return false;
  }

  return true;
};

// =====================================================
// 🏠 GERENCIAMENTO DE WORKSPACE ATIVO
// =====================================================

// Salvar workspace ativo
export const setActiveWorkspace = async (workspaceId: number, workspaceName: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(ACTIVE_WORKSPACE_KEY, workspaceId.toString());
    await AsyncStorage.setItem(ACTIVE_WORKSPACE_NAME_KEY, workspaceName);
  } catch (error) {
    console.error('Erro ao salvar workspace ativo:', error);
  }
};

// Obter ID do workspace ativo
export const getActiveWorkspaceId = async (): Promise<number | null> => {
  try {
    const workspaceId = await AsyncStorage.getItem(ACTIVE_WORKSPACE_KEY);
    return workspaceId ? parseInt(workspaceId, 10) : null;
  } catch (error) {
    console.error('Erro ao obter workspace ativo:', error);
    return null;
  }
};

// Obter nome do workspace ativo
export const getActiveWorkspaceName = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(ACTIVE_WORKSPACE_NAME_KEY);
  } catch (error) {
    console.error('Erro ao obter nome do workspace ativo:', error);
    return null;
  }
};

// Limpar workspace ativo
export const clearActiveWorkspace = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([ACTIVE_WORKSPACE_KEY, ACTIVE_WORKSPACE_NAME_KEY]);
  } catch (error) {
    console.error('Erro ao limpar workspace ativo:', error);
  }
};

// =====================================================
// 🏠 VERIFICAR SE USUÁRIO TEM WORKSPACE (Rota correta do backend)
// =====================================================
export const getUserWorkspaces = async () => {
  try {
    const email = await getUserEmail();
    if (!email) {
      throw new Error('Usuário não autenticado');
    }

    const response = await apiCall(`/workspaces/email/${encodeURIComponent(email)}`, 'GET');
    return response;
  } catch (error) {
    console.error('Erro ao buscar workspaces do usuário:', error);
    throw error;
  }
};

export const hasUserWorkspaces = async (): Promise<boolean> => {
  try {
    const workspaces = await getUserWorkspaces();
    return workspaces && workspaces.length > 0;
  } catch (error) {
    console.error('Erro ao verificar workspaces:', error);
    return false;
  }
};

// Função para configurar workspace ativo após login
export const setupActiveWorkspace = async (): Promise<{hasWorkspace: boolean, workspace?: any}> => {
  try {
    const workspaces = await getUserWorkspaces();
    
    if (workspaces && workspaces.length > 0) {
      // Se tem workspaces, define o primeiro como ativo
      const firstWorkspace = workspaces[0];
      await setActiveWorkspace(firstWorkspace.id_workspace, firstWorkspace.nome);
      
      return {
        hasWorkspace: true,
        workspace: firstWorkspace
      };
    }
    
    return {hasWorkspace: false};
  } catch (error) {
    console.error('Erro ao configurar workspace ativo:', error);
    return {hasWorkspace: false};
  }
};

// =====================================================
// 🔟 FUNÇÕES PARA COMENTÁRIOS
// =====================================================

// Criar comentário em uma tarefa
export const criarComentario = async (id_tarefa: number, conteudo: string) => {
  try {
    const email = await getUserEmail();
    if (!email) {
      throw new Error('Usuário não autenticado');
    }

    const response = await apiCall('/comentarios', 'POST', {
      id_tarefa,
      conteudo,
      email_autor: email,
    });

    return response;
  } catch (error) {
    console.error('Erro ao criar comentário:', error);
    throw error;
  }
};

// Buscar comentários de uma tarefa
export const buscarComentariosPorTarefa = async (id_tarefa: number) => {
  try {
    const response = await apiCall(`/comentarios/tarefa/${id_tarefa}`, 'GET');
    return response;
  } catch (error) {
    console.error('Erro ao buscar comentários:', error);
    throw error;
  }
};

// Atualizar comentário (apenas o autor pode atualizar)
export const atualizarComentario = async (id_comentario: number, conteudo: string) => {
  try {
    const response = await apiCall(`/comentarios/${id_comentario}`, 'PUT', {
      conteudo,
    });

    return response;
  } catch (error) {
    console.error('Erro ao atualizar comentário:', error);
    throw error;
  }
};

// Deletar comentário (apenas o autor pode deletar)
export const deletarComentario = async (id_comentario: number) => {
  try {
    const response = await apiCall(`/comentarios/${id_comentario}`, 'DELETE');
    return response;
  } catch (error) {
    console.error('Erro ao deletar comentário:', error);
    throw error;
  }
};

// Buscar comentários por autor
export const buscarComentariosPorAutor = async (email_autor: string) => {
  try {
    const response = await apiCall(`/comentarios/autor/${encodeURIComponent(email_autor)}`, 'GET');
    return response;
  } catch (error) {
    console.error('Erro ao buscar comentários por autor:', error);
    throw error;
  }
};
