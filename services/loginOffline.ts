// src/services/loginOffline.ts
import { NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { databaseService } from './databaseService'; // 🟢 IMPORTAR SERVICE REAL

const { SyncService } = NativeModules;

// Chaves para AsyncStorage
const OFFLINE_MODE_KEY = 'offline_mode';
const LAST_SYNC_KEY = 'last_sync_timestamp';
const PENDING_OPERATIONS_KEY = 'pending_operations';

export interface LoginOfflineResult {
  sucesso: boolean;
  token?: string;
  email?: string;
  modo: 'online' | 'offline';
  mensagem?: string;
  dadosLocais?: {
    workspaces: any[];
    tarefas: any[];
    categorias: any[];
    comentarios: any[];
    anexos: any[];
    stats?: {
      workspaces: number;
      categorias: number;
      tarefas: number;
      comentarios: number;
      anexos: number;
    };
  };
}

export interface SyncOperation {
  op_id: string;
  op_type: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: string;
  payload: any;
  timestamp: string;
}

class LoginOfflineService {
  private isOnline: boolean = true;
  private pendingOperations: SyncOperation[] = [];

  constructor() {
    this.loadPendingOperations();
    this.checkConnectionStatus();
  }

  /**
   * Verifica status da conexão
   */
  private async checkConnectionStatus() {
    try {
      this.isOnline = await SyncService.isConnected();
      console.log(`📶 Status da conexão: ${this.isOnline ? 'ONLINE' : 'OFFLINE'}`);
    } catch (error) {
      console.error('Erro ao verificar conexão:', error);
      this.isOnline = false; // Assume offline em caso de erro
    }
  }

  /**
   * Carrega operações pendentes do AsyncStorage
   */
  private async loadPendingOperations() {
    try {
      const pending = await AsyncStorage.getItem(PENDING_OPERATIONS_KEY);
      this.pendingOperations = pending ? JSON.parse(pending) : [];
      console.log(`📦 Operações pendentes carregadas: ${this.pendingOperations.length}`);
    } catch (error) {
      console.error('Erro ao carregar operações pendentes:', error);
      this.pendingOperations = [];
    }
  }

  /**
   * Salva operações pendentes no AsyncStorage
   */
  private async savePendingOperations() {
    try {
      await AsyncStorage.setItem(
        PENDING_OPERATIONS_KEY, 
        JSON.stringify(this.pendingOperations)
      );
    } catch (error) {
      console.error('Erro ao salvar operações pendentes:', error);
    }
  }

  /**
   * Login principal - decide entre online e offline
   */
  async login(email: string, senha: string): Promise<LoginOfflineResult> {
    await this.checkConnectionStatus();
    
    if (this.isOnline) {
      console.log('🌐 Modo ONLINE - Fazendo login no backend');
      return await this.loginOnline(email, senha);
    } else {
      console.log('📴 Modo OFFLINE - Tentando login local');
      return await this.loginOffline();
    }
  }

  /**
   * Login online - comunica com backend E sincroniza para SQLite
   */
  private async loginOnline(email: string, senha: string): Promise<LoginOfflineResult> {
    try {
      // Importação dinâmica para evitar circular dependency
      const { login } = await import('./authService');
      
      // Fazer login no backend
      const loginResponse = await login(email, senha);
      
      if (loginResponse.sucesso && loginResponse.token) {
        console.log('✅ Login online realizado - Dados já sincronizados via authService');
        
        return {
          sucesso: true,
          token: loginResponse.token,
          email,
          modo: 'online',
          mensagem: 'Login online realizado com sucesso'
        };
      } else {
        throw new Error(loginResponse.erro || 'Falha no login');
      }
    } catch (error: any) {
      console.error('❌ Erro no login online:', error);
      
      // Tentar fallback offline
      console.log('🔄 Tentando fallback para modo offline...');
      const offlineResult = await this.loginOffline();
      
      if (offlineResult.sucesso) {
        offlineResult.mensagem = `Modo offline (falha online: ${error.message})`;
        return offlineResult;
      }
      
      return {
        sucesso: false,
        modo: 'online',
        mensagem: `Falha no login: ${error.message}`
      };
    }
  }

  /**
   * Login offline - usa APENAS dados locais do SQLite (AGORA REAIS)
   */
  async loginOffline(): Promise<LoginOfflineResult> {
    try {
      // Buscar token e email do AsyncStorage
      const token = await AsyncStorage.getItem('auth_token');
      const email = await AsyncStorage.getItem('user_email');
      
      if (!token || !email) {
        return {
          sucesso: false,
          modo: 'offline',
          mensagem: 'Nenhum login anterior encontrado. Conecte-se para fazer o primeiro login.'
        };
      }

      console.log('🔐 Login offline - Buscando dados reais do SQLite para:', email);

      // 🟢 AGORA BUSCA DADOS REAIS DO SQLITE
      const dadosLocais = await this.getDadosLocais(email);
      
      // Verificar se existem dados locais reais
      const temDados = dadosLocais.workspaces.length > 0 || 
                      dadosLocais.tarefas.length > 0;
      
      if (!temDados) {
        return {
          sucesso: false,
          modo: 'offline',
          mensagem: 'Nenhum dado local encontrado no SQLite. Conecte-se pela primeira vez para sincronizar.'
        };
      }

      console.log('✅ Dados locais encontrados:', {
        workspaces: dadosLocais.workspaces.length,
        tarefas: dadosLocais.tarefas.length,
        categorias: dadosLocais.categorias.length,
        comentarios: dadosLocais.comentarios.length,
        anexos: dadosLocais.anexos.length
      });

      return {
        sucesso: true,
        token,
        email,
        modo: 'offline',
        mensagem: 'Login offline realizado com sucesso - Dados locais disponíveis',
        dadosLocais
      };

    } catch (error: any) {
      console.error('❌ Erro no login offline:', error);
      return {
        sucesso: false,
        modo: 'offline',
        mensagem: error.message || 'Falha no login offline'
      };
    }
  }

  /**
   * Busca dados locais do SQLite (AGORA REAL)
   */
  private async getDadosLocais(email: string): Promise<any> {
    try {
      console.log('📋 Buscando dados reais do SQLite para:', email);
      
      // 🟢 AGORA USA DATABASE SERVICE REAL
      const result = await databaseService.getAllUserData(email);
      
      if (!result.success) {
        throw new Error(result.error || 'Falha ao buscar dados locais');
      }

      const data = result.data || {};
      
      // Estrutura os dados no formato esperado
      const dadosEstruturados = {
        workspaces: data.workspaces || [],
        tarefas: data.tarefas || [],
        categorias: data.categorias || [],
        comentarios: data.comentarios || [],
        anexos: data.anexos || [],
        stats: {
          workspaces: data.workspaces?.length || 0,
          categorias: data.categorias?.length || 0,
          tarefas: data.tarefas?.length || 0,
          comentarios: data.comentarios?.length || 0,
          anexos: data.anexos?.length || 0
        }
      };

      console.log('✅ Dados locais carregados do SQLite:', dadosEstruturados.stats);
      
      return dadosEstruturados;

    } catch (error: any) {
      console.error('❌ Erro ao buscar dados locais do SQLite:', error);
      
      // 🟡 FALLBACK: Tentar buscar dados básicos se a consulta completa falhar
      try {
        console.log('🟡 Tentando fallback para dados básicos...');
        return await this.getDadosBasicosFallback(email);
      } catch (fallbackError) {
        console.error('❌ Fallback também falhou:', fallbackError);
        // Retorna estrutura vazia
        return {
          workspaces: [],
          tarefas: [],
          categorias: [],
          comentarios: [],
          anexos: [],
          stats: { workspaces: 0, categorias: 0, tarefas: 0, comentarios: 0, anexos: 0 }
        };
      }
    }
  }

  /**
   * Fallback para buscar dados básicos se a consulta completa falhar
   */
  private async getDadosBasicosFallback(email: string): Promise<any> {
    try {
      console.log('🟡 Buscando dados básicos como fallback...');
      
      // Buscar workspaces do usuário
      const workspacesResult = await databaseService.getWorkspacesByUser(email);
      const workspaces = workspacesResult.success ? (workspacesResult.data || []) : [];

      // Buscar estatísticas para verificar se há dados
      const statsResult = await databaseService.getDatabaseStats();
      const stats = statsResult.success ? statsResult.data : null;

      console.log('🟡 Dados básicos carregados:', {
        workspaces: workspaces.length,
        stats: stats
      });

      return {
        workspaces: workspaces,
        tarefas: [],
        categorias: [],
        comentarios: [],
        anexos: [],
        stats: stats || {
          workspaces: workspaces.length,
          categorias: 0,
          tarefas: 0,
          comentarios: 0,
          anexos: 0
        }
      };

    } catch (error) {
      console.error('❌ Erro no fallback de dados básicos:', error);
      throw error;
    }
  }

  /**
   * Sincroniza dados do backend para SQLite (APENAS ONLINE)
   */
  private async syncFromBackend(email: string, token: string): Promise<void> {
    // Verificar novamente se está online
    if (!this.isOnline) {
      console.log('⚠️  Não é possível sincronizar - Modo offline');
      return;
    }

    try {
      console.log('🔄 Sincronizando dados do backend para SQLite...');
      
      // Buscar dados completos do backend
      const response = await fetch(`http://192.168.15.14:3000/sync/initial-data/${encodeURIComponent(email)}`, {
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
      console.log('📥 Dados recebidos do backend:', {
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

      // Sincronizar operações pendentes (se houver)
      await this.syncPendingOperations(email, token);

      // Atualizar timestamp da última sincronização
      await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
      
      console.log('✅ Sincronização completa!');

    } catch (error) {
      console.error('❌ Erro ao sincronizar do backend:', error);
      throw error;
    }
  }

  /**
   * Sincroniza operações pendentes com o backend (APENAS ONLINE)
   */
  private async syncPendingOperations(email: string, token: string): Promise<void> {
    if (this.pendingOperations.length === 0) {
      console.log('✅ Nenhuma operação pendente para sincronizar');
      return;
    }

    if (!this.isOnline) {
      console.log('⚠️  Operações pendentes mantidas - Modo offline');
      return;
    }

    try {
      console.log(`🔄 Sincronizando ${this.pendingOperations.length} operações pendentes...`);

      const lastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);

      const response = await fetch('http://192.168.15.14:3000/sync/offline', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-User-Email': email
        },
        body: JSON.stringify({
          operacoes: this.pendingOperations,
          last_sync: lastSync,
          user_email: email
        })
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const resultado = await response.json();
      
      console.log('✅ Operações pendentes sincronizadas:', resultado.relatorio);

      // Limpar operações sincronizadas com sucesso
      this.pendingOperations = [];
      await this.savePendingOperations();

    } catch (error) {
      console.error('❌ Erro ao sincronizar operações pendentes:', error);
      // Manter operações pendentes para tentar novamente quando voltar online
    }
  }

  /**
   * Adiciona operação à fila de sincronização (funciona online e offline)
   */
  async adicionarOperacaoPendente(
    op_type: 'CREATE' | 'UPDATE' | 'DELETE',
    entity: string,
    payload: any
  ): Promise<void> {
    const operacao: SyncOperation = {
      op_id: this.gerarOpId(),
      op_type,
      entity,
      payload,
      timestamp: new Date().toISOString()
    };

    this.pendingOperations.push(operacao);
    await this.savePendingOperations();

    console.log(`📝 Operação pendente adicionada: ${entity} - ${op_type}`);
    
    // Se estiver online, tenta sincronizar imediatamente
    if (this.isOnline) {
      const token = await AsyncStorage.getItem('auth_token');
      const email = await AsyncStorage.getItem('user_email');
      
      if (token && email) {
        this.syncPendingOperations(email, token);
      }
    }
  }

  /**
   * Gera ID único para operação
   */
  private gerarOpId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Verifica status atual da conexão
   */
  async checkConnection(): Promise<boolean> {
    await this.checkConnectionStatus();
    return this.isOnline;
  }

  /**
   * Verifica se há operações pendentes
   */
  hasPendingOperations(): boolean {
    return this.pendingOperations.length > 0;
  }

  /**
   * Obtém número de operações pendentes
   */
  getPendingOperationsCount(): number {
    return this.pendingOperations.length;
  }

  /**
   * Limpa todas as operações pendentes (para logout)
   */
  async clearPendingOperations(): Promise<void> {
    this.pendingOperations = [];
    await this.savePendingOperations();
    console.log('🧹 Operações pendentes limpas');
  }

  /**
   * Obtém estatísticas dos dados locais (AGORA REAL)
   */
  async getDatabaseStats(): Promise<any> {
    try {
      const result = await databaseService.getDatabaseStats();
      return result;
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      return { success: false, error: 'Falha ao buscar estatísticas' };
    }
  }
}

// Exporta uma instância única (Singleton)
export const loginOfflineService = new LoginOfflineService();

// Export para uso compatível
export const loginOffline = loginOfflineService.loginOffline.bind(loginOfflineService);