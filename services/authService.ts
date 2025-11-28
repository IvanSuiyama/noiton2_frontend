import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules } from 'react-native';
import { databaseService } from './databaseService'; // 🟢 IMPORTAR SERVICE REAL

const { SyncService } = NativeModules;

const API_BASE = 'http://192.168.15.14:3000';
const TOKEN_KEY = 'auth_token';
const EMAIL_KEY = 'user_email';
const USER_ID_KEY = 'user_id';
const ACTIVE_WORKSPACE_KEY = 'active_workspace_id';
const ACTIVE_WORKSPACE_NAME_KEY = 'active_workspace_name';
const LAST_SYNC_KEY = 'last_sync_timestamp';
const HAS_LOCAL_DATA_KEY = 'has_local_data';

// =====================================================
// 🆕 FUNÇÕES DE SINCRONIZAÇÃO - AGORA USANDO SERVICE REAL
// =====================================================

/**
 * Verifica se está conectado à internet
 */
const checkConnection = async (): Promise<boolean> => {
  try {
    return await SyncService.isConnected();
  } catch (error) {
    console.error('Erro ao verificar conexão:', error);
    return false;
  }
};

/**
 * Verifica se existe dados locais no SQLite (AGORA REAL)
 */
const hasLocalData = async (): Promise<boolean> => {
  try {
    // 🟢 AGORA USA DATABASE SERVICE REAL
    return await databaseService.hasLocalData();
  } catch (error) {
    console.error('Erro ao verificar dados locais:', error);
    return false;
  }
};

/**
 * Sincroniza dados do PostgreSQL para SQLite (AGORA REAL)
 */
const syncPostgreSQLToSQLite = async (email: string, token: string): Promise<boolean> => {
  try {
    console.log('🔄 Iniciando sincronização PostgreSQL → SQLite (REAL)...');

    // Buscar dados completos do backend
    const response = await fetch(`${API_BASE}/sync/initial-data/${encodeURIComponent(email)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    const dados = await response.json();
    
    console.log('📥 Dados recebidos para sincronização:', {
      workspaces: dados.workspaces?.length || 0,
      categorias: dados.categorias?.length || 0,
      tarefas: dados.tarefas?.length || 0,
      comentarios: dados.comentarios?.length || 0,
      anexos: dados.anexos?.length || 0
    });

    // 🟢 AGORA USA DATABASE SERVICE REAL
    const syncResult = await databaseService.saveFullSyncData({
      ...dados,
      user_email: email
    });

    if (!syncResult.success) {
      throw new Error(syncResult.error || 'Falha ao salvar dados no SQLite');
    }

    await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());

    console.log('✅ Sincronização PostgreSQL → SQLite concluída (REAL)');
    return true;

  } catch (error) {
    console.error('❌ Erro na sincronização:', error);
    return false;
  }
};

/**
 * Lógica principal de sincronização baseada nas regras definidas (AGORA REAL)
 */
const handleSyncLogic = async (email: string, token: string): Promise<void> => {
  const isConnected = await checkConnection();
  const hasData = await hasLocalData();

  console.log(`🔍 Status sync - Conectado: ${isConnected}, Tem dados locais: ${hasData}`);

  if (isConnected) {
    // 📱 COM INTERNET
    if (!hasData) {
      // 🔄 Primeiro login - cria cópia do PostgreSQL
      console.log('🆕 Primeiro login - Criando cópia do PostgreSQL para SQLite (REAL)');
      const syncSuccess = await syncPostgreSQLToSQLite(email, token);
      
      if (!syncSuccess) {
        throw new Error('Falha na sincronização inicial');
      }
    } else {
      // 📊 Já tem dados locais - verificar se precisa atualizar
      const lastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);
      console.log(`📅 Última sincronização: ${lastSync || 'Nunca'}`);
      
      // Por enquanto sempre sincroniza quando online
      // Futuramente podemos implementar verificação de mudanças
      console.log('🔄 Sincronizando dados atualizados...');
      const syncSuccess = await syncPostgreSQLToSQLite(email, token);
      
      if (!syncSuccess) {
        console.warn('⚠️  Sincronização falhou, mas continuando com dados locais');
      }
    }
  } else {
    // 📴 SEM INTERNET
    if (!hasData) {
      console.log('⚠️  Sem internet e sem dados locais - Login offline não possível');
      throw new Error('Conecte-se à internet para fazer o primeiro login');
    } else {
      console.log('📴 Modo offline - Usando dados locais do SQLite (REAL)');
      // Nada a fazer - já temos dados locais
    }
  }
};

// =====================================================
// 1️⃣ FUNÇÃO DE LOGIN - ATUALIZADA COM SINCRONIZAÇÃO REAL
// =====================================================
export const login = async (email: string, senha: string) => {
  try {
    const isConnected = await checkConnection();
    
    if (!isConnected) {
      // 🔄 Tenta login offline se não tem conexão
      console.log('📴 Sem conexão - Tentando login offline...');
      return await loginOffline();
    }

    // 🌐 Login online normal
    console.log('🌐 Fazendo login online...');
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({email, senha}),
    });

    const data = await response.json();

    if (response.ok) {
      // Salvar credenciais
      await AsyncStorage.setItem(TOKEN_KEY, data.token);
      await AsyncStorage.setItem(EMAIL_KEY, data.email);
      await AsyncStorage.setItem(USER_ID_KEY, data.id_usuario?.toString() || '1');

      console.log('✅ Login online realizado - Iniciando sincronização...');

      // 🔄 EXECUTAR LÓGICA DE SINCRONIZAÇÃO REAL
      try {
        await handleSyncLogic(data.email, data.token);
        console.log('🎉 Login e sincronização completos! (REAL)');
      } catch (syncError: any) {
        console.error('⚠️  Erro na sincronização, mas login foi realizado:', syncError);
        // Continua mesmo com erro de sync - pelo menos temos credenciais
      }

      return {
        sucesso: true, 
        token: data.token, 
        email: data.email,
        modo: 'online' as const
      };
    }

    return {sucesso: false, erro: data.error};
  } catch (error: any) {
    console.error('❌ Erro no login:', error);
    
    // 🔄 Fallback para login offline
    console.log('🔄 Tentando fallback para login offline...');
    const offlineResult = await loginOffline();
    
    if (offlineResult.sucesso) {
      return {
        ...offlineResult,
        mensagem: `Modo offline (erro online: ${error.message})`
      };
    }
    
    return {
      sucesso: false, 
      erro: error.message || 'Conexão falhou'
    };
  }
};

// =====================================================
// 🔒 FUNÇÃO DE LOGIN OFFLINE - ATUALIZADA COM DADOS REAIS
// =====================================================
export const loginOffline = async (): Promise<{
  sucesso: boolean;
  token?: string;
  email?: string;
  modo?: 'offline';
  erro?: string;
  mensagem?: string;
}> => {
  try {
    // Buscar token e dados salvos
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    const email = await AsyncStorage.getItem(EMAIL_KEY);
    
    // 🟢 AGORA VERIFICA DADOS REAIS NO SQLITE
    const hasData = await hasLocalData();

    if (!token || !email) {
      return { 
        sucesso: false, 
        erro: 'Nenhum login anterior encontrado' 
      };
    }

    if (!hasData) {
      return {
        sucesso: false,
        erro: 'Nenhum dado local encontrado. Conecte-se à internet primeiro.'
      };
    }

    console.log('🔐 Login offline realizado com sucesso - Dados locais disponíveis');

    return {
      sucesso: true,
      token,
      email,
      modo: 'offline' as const,
      mensagem: 'Login offline realizado com sucesso'
    };

  } catch (error: any) {
    console.error('Erro no login offline:', error);
    return { 
      sucesso: false, 
      erro: 'Falha ao fazer login offline' 
    };
  }
};

// =====================================================
// 🚪 FUNÇÃO DE LOGOUT - ATUALIZADA COM LIMPEZA REAL
// =====================================================
export const logout = async (): Promise<void> => {
  try {
    // Limpar AsyncStorage
    await AsyncStorage.multiRemove([
      TOKEN_KEY, 
      EMAIL_KEY, 
      USER_ID_KEY, 
      ACTIVE_WORKSPACE_KEY, 
      ACTIVE_WORKSPACE_NAME_KEY,
      LAST_SYNC_KEY
    ]);

    // 🟢 AGORA LIMPA BANCO SQLITE REAL
    try {
      const clearResult = await databaseService.clearDatabase();
      if (clearResult.success) {
        console.log('🧹 Dados locais limpos do SQLite (REAL)');
      } else {
        console.error('❌ Erro ao limpar SQLite:', clearResult.error);
      }
    } catch (dbError) {
      console.error('Erro ao limpar banco local:', dbError);
    }

    console.log('✅ Logout realizado com sucesso');
  } catch (error) {
    console.error('Erro ao fazer logout:', error);
  }
};

// =====================================================
// 🆕 FUNÇÕES ADICIONAIS PARA SINCRONIZAÇÃO REAL
// =====================================================

/**
 * Força sincronização dos dados (AGORA REAL)
 */
export const forceSync = async (): Promise<boolean> => {
  try {
    const token = await getToken();
    const email = await getUserEmail();
    
    if (!token || !email) {
      throw new Error('Usuário não autenticado');
    }

    console.log('🔄 Forçando sincronização...');
    return await syncPostgreSQLToSQLite(email, token);
  } catch (error) {
    console.error('❌ Erro na sincronização forçada:', error);
    return false;
  }
};

/**
 * Verifica status da sincronização (AGORA REAL)
 */
export const getSyncStatus = async () => {
  const isConnected = await checkConnection();
  
  // 🟢 AGORA USA DATABASE SERVICE REAL
  const hasData = await hasLocalData();
  const lastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);

  // 🟢 BUSCA ESTATÍSTICAS REAIS DO BANCO
  let stats = null;
  try {
    const statsResult = await databaseService.getDatabaseStats();
    if (statsResult.success) {
      stats = statsResult.data;
    }
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
  }

  return {
    isConnected,
    hasLocalData: hasData,
    lastSync,
    canWorkOffline: hasData,
    databaseStats: stats
  };
};

/**
 * Obtém informações do banco local (AGORA REAL)
 */
export const getDatabaseInfo = async () => {
  try {
    const infoResult = await databaseService.getDatabaseInfo();
    return infoResult;
  } catch (error) {
    console.error('Erro ao buscar info do banco:', error);
    return { success: false, error: 'Falha ao buscar informações' };
  }
};

// =====================================================
// 🔧 FUNÇÕES ORIGINAIS (MANTIDAS)
// =====================================================

export const getToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch (error) {
    console.error('Erro ao obter token:', error);
    return null;
  }
};

export const getUserId = async (): Promise<number | null> => {
  try {
    const userId = await AsyncStorage.getItem(USER_ID_KEY);
    return userId ? parseInt(userId, 10) : null;
  } catch (error) {
    console.error('Erro ao obter ID do usuário:', error);
    return null;
  }
};

export const getUserEmail = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(EMAIL_KEY);
  } catch (error) {
    console.error('Erro ao obter email do usuário:', error);
    return null;
  }
};

// =====================================================
// 5️⃣ FUNÇÃO PARA REQUISIÇÕES AUTENTICADAS
// =====================================================
export const apiCall = async (
  endpoint: string,
  method = 'GET',
  body: any = null,
  includeWorkspace = false,
) => {
  const token = await getToken();
  const email = await getUserEmail();
  
  if (token) {
    console.log(`📡 apiCall ${method} ${endpoint} - Token:`, !!token, 'Email:', email);
  }

  if (!token) {
    throw new Error('Token não encontrado. Faça login novamente.');
  }

  if (!email) {
    console.error('❌ Email não encontrado para requisição:', endpoint);
    throw new Error('Email do usuário não encontrado. Faça login novamente.');
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'X-User-Email': email,
  };

  if (!(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

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
    config.body = body instanceof FormData ? body : JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, config);

  if (response.status === 401) {
    console.error('❌ Token expirado (401) para requisição:', endpoint);
    await logout();
    throw new Error('Token expirado. Faça login novamente.');
  }

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
// 🏠 VERIFICAR SE USUÁRIO TEM WORKSPACE
// =====================================================
export const getUserWorkspaces = async () => {
  try {
    const token = await getToken();
    const email = await getUserEmail();
    
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
    return response;
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