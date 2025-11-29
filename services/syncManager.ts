// src/services/syncManager.ts
import { NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { databaseService } from './databaseService';
import { loginOfflineService } from './loginOffline';
import { getToken, getUserEmail } from './authService';
import networkinManager from './networkinManager';

const { SyncService } = NativeModules;

// Chaves para AsyncStorage
const SYNC_QUEUE_KEY = 'sync_queue';
const LAST_SYNC_ATTEMPT_KEY = 'last_sync_attempt';
const SYNC_RETRY_COUNT_KEY = 'sync_retry_count';
const MAX_RETRY_ATTEMPTS = 3;

export interface SyncOperation {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: string;
  payload: any;
  timestamp: string;
  retryCount: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

export interface SyncResult {
  success: boolean;
  operationId: string;
  error?: string;
  retryable?: boolean;
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingOperations: number;
  lastSync: string | null;
  lastSyncAttempt: string | null;
  retryCount: number;
  syncStats: {
    total: number;
    success: number;
    failed: number;
    pending: number;
  };
}

class SyncManager {
  private isOnline: boolean = false;
  private isSyncing: boolean = false;
  private syncQueue: SyncOperation[] = [];
  private syncListeners: Array<(status: SyncStatus) => void> = [];

  constructor() {
    this.initialize();
  }

  /**
   * Inicializa o gerenciador de sincronização
   */
  private async initialize() {
    await this.loadSyncQueue();
    await this.checkConnection();
    this.setupNetworkMonitoring();
    
    console.log('🔄 SyncManager inicializado');
  }

  /**
   * Configura monitoramento de rede
   */
  private setupNetworkMonitoring() {
    try {
      // Usar networkinManager para detectar mudanças de estado
      const networkListener = {
        onOnline: () => {
          const wasOffline = !this.isOnline;
          this.isOnline = true;
          
          if (wasOffline) {
            console.log('🌐 Reconectado! Processando fila de sincronização...');
            this.processSyncQueue();
          }
        },
        onOffline: () => {
          this.isOnline = false;
          console.log('📴 Conexão perdida - modo offline ativado');
        },
        onNetworkChange: (networkState: any) => {
          // Atualizar apenas estado local, o networkinManager já gerencia o estado dele
          console.log('📡 Mudança de rede detectada:', networkState.isOnline ? 'Online' : 'Offline');
        }
      };
      
      networkinManager.addListener(networkListener);
    } catch (error) {
      console.error('❌ Erro ao configurar listener de rede:', error);
    }
    
    // Verificação periódica adicional
    setInterval(() => {
      this.checkConnection();
    }, 60000); // A cada 1 minuto (reduzido de 30s)
  }

  /**
   * Verifica status da conexão
   */
  private async checkConnection() {
    try {
      const wasOnline = this.isOnline;
      this.isOnline = await SyncService.isConnected();
      
      if (!wasOnline && this.isOnline) {
        console.log('🌐 Conexão restaurada - Iniciando sincronização...');
        this.notifyStatusChange();
        this.processSyncQueue();
      } else if (wasOnline && !this.isOnline) {
        console.log('📴 Conexão perdida - Modo offline');
        this.notifyStatusChange();
      }
    } catch (error) {
      console.error('❌ Erro ao verificar conexão:', error);
      this.isOnline = false;
    }
  }

  /**
   * Carrega fila de sincronização do AsyncStorage
   */
  private async loadSyncQueue() {
    try {
      const queue = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
      this.syncQueue = queue ? JSON.parse(queue) : [];
      
      console.log(`📦 Fila de sync carregada: ${this.syncQueue.length} operações`);
    } catch (error) {
      console.error('❌ Erro ao carregar fila de sync:', error);
      this.syncQueue = [];
    }
  }

  /**
   * Salva fila de sincronização no AsyncStorage
   */
  private async saveSyncQueue() {
    try {
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('❌ Erro ao salvar fila de sync:', error);
    }
  }

  /**
   * Adiciona operação à fila de sincronização
   */
  async addToSyncQueue(
    type: 'CREATE' | 'UPDATE' | 'DELETE',
    entity: string,
    payload: any
  ): Promise<SyncResult> {
    const operation: SyncOperation = {
      id: this.generateOperationId(),
      type,
      entity,
      payload,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      status: 'pending'
    };

    this.syncQueue.push(operation);
    await this.saveSyncQueue();

    console.log(`📝 Operação adicionada à fila: ${entity} - ${type} (ID: ${operation.id})`);

    // Se estiver online, tenta processar imediatamente
    if (this.isOnline && !this.isSyncing) {
      this.processSyncQueue();
    }

    this.notifyStatusChange();

    return {
      success: true,
      operationId: operation.id
    };
  }

  /**
   * Processa a fila de sincronização
   */
  private async processSyncQueue() {
    if (this.isSyncing || !this.isOnline || this.syncQueue.length === 0) {
      return;
    }

    this.isSyncing = true;
    this.notifyStatusChange();

    console.log(`🔄 Processando fila de sync: ${this.syncQueue.length} operações`);

    const pendingOperations = this.syncQueue.filter(op => op.status === 'pending');
    let successCount = 0;
    let failedCount = 0;

    for (const operation of pendingOperations) {
      if (!this.isOnline) {
        console.log('⏸️  Sincronização pausada - Conexão perdida');
        break;
      }

      const result = await this.executeSyncOperation(operation);
      
      if (result.success) {
        successCount++;
        operation.status = 'completed';
      } else {
        failedCount++;
        operation.status = 'failed';
        operation.retryCount++;

        // Se ainda pode tentar novamente, mantém na fila
        if (operation.retryCount < MAX_RETRY_ATTEMPTS && result.retryable !== false) {
          operation.status = 'pending';
          console.log(`🔄 Operação ${operation.id} será retentada (tentativa ${operation.retryCount + 1})`);
        } else {
          console.error(`❌ Operação ${operation.id} falhou permanentemente:`, result.error);
        }
      }

      await this.saveSyncQueue();
      this.notifyStatusChange();
    }

    // Remove operações completadas da fila
    this.syncQueue = this.syncQueue.filter(op => op.status !== 'completed');
    await this.saveSyncQueue();

    this.isSyncing = false;
    this.notifyStatusChange();

    console.log(`✅ Sync concluído: ${successCount} sucessos, ${failedCount} falhas`);
    
    // Atualiza última tentativa de sync
    await AsyncStorage.setItem(LAST_SYNC_ATTEMPT_KEY, new Date().toISOString());
  }

  /**
   * Executa uma operação de sincronização individual
   */
  private async executeSyncOperation(operation: SyncOperation): Promise<SyncResult> {
    try {
      const token = await getToken();
      const email = await getUserEmail();

      if (!token || !email) {
        return {
          success: false,
          operationId: operation.id,
          error: 'Usuário não autenticado',
          retryable: true
        };
      }

      console.log(`📤 Executando sync: ${operation.entity} - ${operation.type}`);

      const response = await fetch('http://192.168.15.14:3000/sync/offline', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-User-Email': email
        },
        body: JSON.stringify({
          operacoes: [{
            op_id: operation.id,
            op_type: operation.type,
            entity: operation.entity,
            payload: operation.payload,
            timestamp: operation.timestamp
          }],
          user_email: email
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      
      // Verifica se a operação foi processada com sucesso
      const operationResult = result.resultados?.find((r: any) => r.op_id === operation.id);
      
      if (operationResult && operationResult.success) {
        console.log(`✅ Sync realizado: ${operation.entity} - ${operation.type}`);
        return {
          success: true,
          operationId: operation.id
        };
      } else {
        const error = operationResult?.error || 'Operação falhou no servidor';
        throw new Error(error);
      }

    } catch (error: any) {
      console.error(`❌ Erro no sync ${operation.entity} - ${operation.type}:`, error.message);
      
      return {
        success: false,
        operationId: operation.id,
        error: error.message,
        retryable: this.isErrorRetryable(error)
      };
    }
  }

  /**
   * Verifica se um erro é recuperável
   */
  private isErrorRetryable(error: any): boolean {
    const message = error.message || '';
    
    // Erros não recuperáveis
    if (message.includes('não autenticado') || 
        message.includes('não encontrado') ||
        message.includes('não tem permissão')) {
      return false;
    }
    
    // Erros de rede e servidor são recuperáveis
    return true;
  }

  /**
   * Força sincronização imediata
   */
  async forceSync(): Promise<{ success: boolean; message: string }> {
    if (!this.isOnline) {
      return {
        success: false,
        message: 'Não é possível sincronizar - Sem conexão'
      };
    }

    if (this.syncQueue.length === 0) {
      return {
        success: true,
        message: 'Nenhuma operação pendente para sincronizar'
      };
    }

    console.log('🚀 Forçando sincronização imediata...');
    await this.processSyncQueue();

    const pendingCount = this.getPendingOperationsCount();
    
    if (pendingCount === 0) {
      return {
        success: true,
        message: 'Sincronização forçada concluída com sucesso'
      };
    } else {
      return {
        success: false,
        message: `Sincronização parcial - ${pendingCount} operações falharam`
      };
    }
  }

  /**
   * Sincronização completa - Baixa dados do backend
   */
  async fullSync(): Promise<{ success: boolean; message: string }> {
    try {
      const token = await getToken();
      const email = await getUserEmail();

      if (!token || !email) {
        return {
          success: false,
          message: 'Usuário não autenticado'
        };
      }

      if (!this.isOnline) {
        return {
          success: false,
          message: 'Sem conexão para sincronização completa'
        };
      }

      console.log('🔄 Iniciando sincronização completa do PostgreSQL para SQLite...');

      // Buscar dados completos do backend
      const response = await fetch(`http://192.168.15.14:3000/sync/initial-data/${encodeURIComponent(email)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-User-Email': email
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('📊 Dados recebidos do backend:', {
        workspaces: data.workspaces?.length || 0,
        categorias: data.categorias?.length || 0,
        tarefas: data.tarefas?.length || 0,
        comentarios: data.comentarios?.length || 0,
        anexos: data.anexos?.length || 0
      });

      // Salvar todos os dados no SQLite de uma vez (método otimizado)
      // Adicionar email do usuário aos dados para criar as associações usuário-workspace
      const dataWithUser = {
        ...data,
        user_email: email
      };

      const result = await databaseService.saveFullSyncData(dataWithUser);
      
      if (!result.success) {
        throw new Error(`Erro ao salvar dados no SQLite: ${result.error}`);
      }

      console.log('✅ Dados salvos no SQLite com sucesso');

      // Marcar que temos dados locais
      await AsyncStorage.setItem('has_local_data', 'true');
      await AsyncStorage.setItem('last_sync_timestamp', new Date().toISOString());

      // Calcular total de itens sincronizados
      const totalItems = (data.workspaces?.length || 0) + 
                        (data.categorias?.length || 0) + 
                        (data.tarefas?.length || 0) + 
                        (data.comentarios?.length || 0) + 
                        (data.anexos?.length || 0);

      console.log(`🎉 Sincronização completa finalizada! ${totalItems} itens salvos no SQLite`);

      return {
        success: true,
        message: `Sincronização completa realizada com sucesso. ${totalItems} itens sincronizados.`
      };

    } catch (error: any) {
      console.error('❌ Erro na sincronização completa:', error);
      return {
        success: false,
        message: error.message || 'Erro na sincronização completa'
      };
    }
  }

  /**
   * Obtém status atual da sincronização
   */
  getSyncStatus(): SyncStatus {
    const pendingOperations = this.syncQueue.filter(op => 
      op.status === 'pending' || op.status === 'in_progress'
    ).length;

    const completedOperations = this.syncQueue.filter(op => 
      op.status === 'completed'
    ).length;

    const failedOperations = this.syncQueue.filter(op => 
      op.status === 'failed'
    ).length;

    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      pendingOperations,
      lastSync: null, // TODO: Implementar tracking de último sync
      lastSyncAttempt: null, // TODO: Implementar tracking
      retryCount: 0, // TODO: Implementar tracking
      syncStats: {
        total: this.syncQueue.length,
        success: completedOperations,
        failed: failedOperations,
        pending: pendingOperations
      }
    };
  }

  /**
   * Limpa a fila de sincronização
   */
  async clearSyncQueue(): Promise<void> {
    this.syncQueue = [];
    await this.saveSyncQueue();
    this.notifyStatusChange();
    console.log('🧹 Fila de sync limpa');
  }

  /**
   * Adiciona listener para mudanças de status
   */
  addStatusListener(listener: (status: SyncStatus) => void): void {
    this.syncListeners.push(listener);
  }

  /**
   * Remove listener de status
   */
  removeStatusListener(listener: (status: SyncStatus) => void): void {
    this.syncListeners = this.syncListeners.filter(l => l !== listener);
  }

  /**
   * Notifica mudanças de status para os listeners
   */
  private notifyStatusChange(): void {
    const status = this.getSyncStatus();
    this.syncListeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.error('❌ Erro no listener de sync:', error);
      }
    });
  }

  /**
   * Gera ID único para operação
   */
  private generateOperationId(): string {
    return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Obtém número de operações pendentes
   */
  getPendingOperationsCount(): number {
    return this.syncQueue.filter(op => op.status === 'pending').length;
  }

  /**
   * Verifica se está sincronizando
   */
  getIsSyncing(): boolean {
    return this.isSyncing;
  }

  /**
   * Verifica se está online
   */
  getIsOnline(): boolean {
    return this.isOnline;
  }
}

// Exporta uma instância única (Singleton)
export const syncManager = new SyncManager();

// Export para uso compatível
export default syncManager;