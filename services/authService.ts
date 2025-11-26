import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules } from 'react-native';

const { AuthModule } = NativeModules;
const API_BASE = 'http://192.168.15.14:3000';
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
      // SALVAR TOKEN + EMAIL (AsyncStorage + Java seguro)
      await AsyncStorage.setItem(TOKEN_KEY, data.token);
      await AsyncStorage.setItem(EMAIL_KEY, data.email);
      await AsyncStorage.setItem(USER_ID_KEY, '1'); // Temporário
      
      // Salvar também no módulo Java seguro para login offline
      if (AuthModule) {
        try {
          await AuthModule.saveToken(data.token);
          await AuthModule.saveUser(JSON.stringify({
            email: data.email,
            id: 1,
            loginTime: new Date().toISOString()
          }));
        } catch (javaError) {
          console.log('⚠️ Erro ao salvar no módulo Java:', javaError);
        }
      }

      return {sucesso: true, token: data.token, email: data.email};
    }

    return {sucesso: false, erro: data.error};
  } catch (error) {
    return {sucesso: false, erro: 'Conexão falhou'};
  }
};

// =====================================================
// 2️⃣ FUNÇÃO PARA OBTER TOKEN DO STORAGE (COM FALLBACK JAVA)
// =====================================================
export const getToken = async (): Promise<string | null> => {
  try {
    // Primeiro tenta o AsyncStorage (compatibilidade)
    let token = await AsyncStorage.getItem(TOKEN_KEY);
    
    // Se não encontrar, tenta o módulo Java seguro
    if (!token && AuthModule) {
      token = await AuthModule.getToken();
    }
    
    return token;
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
  const email = await getUserEmail();
  
  // Só logar se houver token (evitar spam após logout)
  if (token) {
    console.log(`📡 apiCall ${method} ${endpoint} - Token existe:`, !!token, 'Email:', email);
  }

  if (!token) {
    // Silenciar erro após logout
    throw new Error('Token não encontrado. Faça login novamente.');
  }

  if (!email) {
    console.error('❌ Email não encontrado para requisição:', endpoint);
    throw new Error('Email do usuário não encontrado. Faça login novamente.');
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'X-User-Email': email, // Incluir email no header
  };

  // Para FormData, não definir Content-Type (deixar o fetch definir automaticamente)
  if (!(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

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
    if (body instanceof FormData) {
      config.body = body; // FormData vai como está
    } else {
      config.body = JSON.stringify(body); // JSON normal
    }
  }

  const response = await fetch(`${API_BASE}${endpoint}`, config);

  // SE TOKEN EXPIROU (401)
  if (response.status === 401) {
    console.error('❌ Token expirado (401) para requisição:', endpoint);
    await logout(); // Limpar storage
    throw new Error('Token expirado. Faça login novamente.');
  }

  // SE NÃO TEM PERMISSÃO (403)
  if (response.status === 403) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Você não tem permissão para realizar esta ação.');
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
// 🔧 FUNÇÃO AUXILIAR PARA BUSCAR WORKSPACE POR EMAIL
// =====================================================
export const getWorkspaceByEmail = async (email: string) => {
  try {
    return await apiCall(`/workspaces/email/${email}`, 'GET');
  } catch (error) {
    console.error('Erro ao buscar workspace por email:', error);
    throw error;
  }
};

// =====================================================
// 7️⃣ OBTER WORKSPACES DO USUÁRIO LOGADO
// =====================================================
// =====================================================
// 🔒 FUNÇÃO DE LOGIN OFFLINE (USA TOKEN SALVO)
// =====================================================
export const loginOffline = async () => {
  try {
    if (!AuthModule) {
      return { sucesso: false, erro: 'Módulo de autenticação não disponível' };
    }

    // Buscar token e dados do usuário salvos no módulo Java
    const token = await AuthModule.getToken();
    const userDataString = await AuthModule.getUser();

    if (!token) {
      return { sucesso: false, erro: 'Nenhum login anterior encontrado' };
    }

    let userData = null;
    if (userDataString) {
      try {
        userData = JSON.parse(userDataString);
      } catch (parseError) {
        console.log('⚠️ Erro ao fazer parse dos dados do usuário');
      }
    }

    // Restaurar dados no AsyncStorage para compatibilidade
    await AsyncStorage.setItem(TOKEN_KEY, token);
    if (userData?.email) {
      await AsyncStorage.setItem(EMAIL_KEY, userData.email);
      await AsyncStorage.setItem(USER_ID_KEY, userData.id?.toString() || '1');
    }

    return {
      sucesso: true,
      token,
      email: userData?.email || 'offline@user.com',
      modo: 'offline'
    };

  } catch (error) {
    console.error('Erro no login offline:', error);
    return { sucesso: false, erro: 'Falha ao fazer login offline' };
  }
};

export const logout = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([
      TOKEN_KEY, 
      EMAIL_KEY, 
      USER_ID_KEY, 
      ACTIVE_WORKSPACE_KEY, 
      ACTIVE_WORKSPACE_NAME_KEY
    ]);
    
    // Limpar também do módulo Java
    if (AuthModule) {
      try {
        await AuthModule.clearToken();
      } catch (javaError) {
        console.log('⚠️ Erro ao limpar módulo Java:', javaError);
      }
    }
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

  if (response.status === 403) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Você não tem permissão para realizar esta ação.');
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
    const token = await getToken();
    const email = await getUserEmail();
    
    // Só logar se houver token (evitar spam após logout)
    if (token) {
      console.log('🔍 getUserWorkspaces - Token existe:', !!token);
      console.log('🔍 getUserWorkspaces - Email:', email);
    }
    
    if (!email) {
      throw new Error('Usuário não autenticado');
    }

    if (!token) {
      throw new Error('Token não encontrado');
    }

    console.log('📡 Fazendo requisição para buscar workspaces...');
    // Primeira tentativa: endpoint com email na URL
    try {
      const response = await apiCall(`/workspaces/email/${encodeURIComponent(email)}`, 'GET');
      console.log('✅ Workspaces recebidos:', response?.length || 0);
      return response;
    } catch (error) {
      console.log('⚠️ Primeira tentativa falhou, tentando endpoint alternativo...');
      // Segunda tentativa: endpoint genérico que usa o email do header
      const response = await apiCall('/workspaces/meus', 'GET');
      console.log('✅ Workspaces recebidos (tentativa 2):', response?.length || 0);
      return response;
    }
  } catch (error) {
    // Silenciar erro se não há token (usuário fez logout)
    const token = await getToken();
    if (token) {
      console.error('Erro ao buscar workspaces do usuário:', error);
    }
    throw error;
  }
};

export const hasUserWorkspaces = async (): Promise<boolean> => {
  try {
    const workspaces = await getUserWorkspaces();
    return workspaces && workspaces.length > 0;
  } catch (error) {
    console.error('Erro ao verificar workspace:', error);
    return false;
  }
};

// Função para configurar workspace ativo após login
export const setupActiveWorkspace = async (): Promise<{hasWorkspace: boolean, workspace?: any}> => {
  try {
    // Aguardar um pouco para garantir que o token foi salvo
    await new Promise<void>(resolve => setTimeout(() => resolve(), 100));
    
    console.log('🔍 Verificando autenticação antes de buscar workspaces...');
    const token = await getToken();
    const email = await getUserEmail();
    
    if (!token || !email) {
      console.error('❌ Token ou email não encontrados');
      throw new Error('Usuário não autenticado');
    }
    
    console.log('✅ Token e email verificados, buscando workspaces...');
    const workspaces = await getUserWorkspaces();
    
    if (workspaces && workspaces.length > 0) {
      // Se tem workspace(s), define o primeiro como ativo
      const firstWorkspace = workspaces[0];
      await setActiveWorkspace(firstWorkspace.id_workspace, firstWorkspace.nome);
      console.log('✅ Workspace ativo configurado:', firstWorkspace.nome);
      return {
        hasWorkspace: true,
        workspace: firstWorkspace
      };
    }
    
    console.log('ℹ️ Usuário não possui workspaces');
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

// =====================================================
// 🔐 FUNÇÕES PARA GERENCIAR PERMISSÕES DE TAREFAS
// =====================================================

// Buscar workspace por ID específico
export const buscarWorkspacePorId = async (id_workspace: number): Promise<any> => {
  try {
    const response = await apiCall(`/workspaces/id/${id_workspace}`, 'GET');
    return response; // Agora retorna: { id_workspace, nome, equipe, criador, emails }
  } catch (error) {
    console.error('Erro ao buscar workspace por ID:', error);
    throw error;
  }
};

// Adicionar ou atualizar permissão em uma tarefa
export const adicionarPermissaoTarefa = async (id_tarefa: number, id_usuario: number, nivel_acesso: number) => {
  try {
    const response = await apiCall(`/tarefas/${id_tarefa}/permissoes`, 'POST', {
      id_tarefa,
      id_usuario,
      nivel_acesso
    });
    return response;
  } catch (error) {
    console.error('Erro ao adicionar permissão:', error);
    throw error;
  }
};

// Listar todas as permissões de uma tarefa
export const listarPermissoesTarefa = async (id_tarefa: number) => {
  try {
    const response = await apiCall(`/tarefas/${id_tarefa}/permissoes`, 'GET');
    return response;
  } catch (error) {
    console.error('Erro ao listar permissões da tarefa:', error);
    throw error;
  }
};

// Verificar minha permissão em uma tarefa específica
export const verificarMinhaPermissao = async (id_tarefa: number) => {
  try {
    const response = await apiCall(`/tarefas/${id_tarefa}/minha-permissao`, 'GET');
    return response;
  } catch (error) {
    console.error('Erro ao verificar permissão:', error);
    throw error;
  }
};

// Remover permissão de um usuário em uma tarefa
export const removerPermissaoTarefa = async (id_tarefa: number, id_usuario: number) => {
  try {
    const response = await apiCall(`/tarefas/${id_tarefa}/permissoes/${id_usuario}`, 'DELETE');
    return response;
  } catch (error) {
    console.error('Erro ao remover permissão:', error);
    throw error;
  }
};

// =====================================================
// 💰 FUNÇÕES DE PONTOS DO USUÁRIO
// =====================================================

// Buscar pontos do usuário logado
export const getPontosUsuario = async (): Promise<number> => {
  try {
    const response = await apiCall('/usuarios/meus-pontos', 'GET');
    return response.pontos || 0;
  } catch (error) {
    console.error('Erro ao buscar pontos do usuário:', error);
    return 0;
  }
};

// Função para comprar item na lojinha (deduz pontos)
export const comprarItemLojinha = async (valorItem: number): Promise<boolean> => {
  try {
    // Buscar pontos atuais
    const pontosAtuais = await getPontosUsuario();
    
    if (pontosAtuais < valorItem) {
      throw new Error('Pontos insuficientes');
    }
    
    // ✅ Usar rota real do backend para remover pontos
    const response = await apiCall('/usuarios/remover-pontos', 'POST', { 
      pontos: valorItem 
    });
    
    console.log(`✅ Compra realizada! ${valorItem} pontos removidos. Pontos restantes: ${response.pontosRestantes}`);
    return true;
  } catch (error) {
    console.error('Erro ao comprar item:', error);
    return false;
  }
};




