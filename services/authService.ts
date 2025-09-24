import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'http://192.168.15.15:3000';
const TOKEN_KEY = 'auth_token';
const EMAIL_KEY = 'user_email';
const USER_ID_KEY = 'user_id';

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
// 5️⃣ FUNÇÃO PARA REQUISIÇÕES AUTENTICADAS
// =====================================================
export const apiCall = async (
  endpoint: string,
  method = 'GET',
  body: any = null,
) => {
  const token = await getToken();

  if (!token) {
    throw new Error('Token não encontrado. Faça login novamente.');
  }

  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
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
// 7️⃣ LOGOUT (LIMPAR TOKEN)
// =====================================================
export const logout = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([TOKEN_KEY, EMAIL_KEY, USER_ID_KEY]);
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
