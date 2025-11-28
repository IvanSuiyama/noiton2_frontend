// src/services/networkMonitor.ts
import { NativeModules, NativeEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncManager } from './syncManager';
import { databaseService } from './databaseService';
import { loginOfflineService } from './loginOffline';

const { SyncService } = NativeModules;

// Criar EventEmitter para escutar eventos do Java (se disponíveis)
const syncServiceEmitter = new NativeEventEmitter(SyncService);

// Chaves para AsyncStorage
const NETWORK_STATUS_KEY = 'last_network_status';
const OFFLINE_OPERATIONS_KEY = 'offline_operations_count';

export interface NetworkStatus {
  isOnline: boolean;
  isWifi: boolean;
  isCellular: boolean;
  connectionType: 'wifi' | 'cellular' | 'none';
  timestamp: string;
  strength?: number; // Para WiFi (0-100)
}

export interface NetworkListener {
  onOnline: () => void;
  onOffline: () => void;
  onNetworkChange: (status: NetworkStatus) => void;
  onSyncStateChange?: (isSyncing: boolean) => void;
}

export interface NetworkMetrics {
  totalOnlineTime: number;
  totalOfflineTime: number;
  lastOnlineTransition: string | null;
  lastOfflineTransition: string | null;
  syncOperationsWhileOffline: number;
}

class NetworkMonitor {
  private isOnline: boolean = false;
  private isWifi: boolean = false;
  private isSyncing: boolean = false;
  private listeners: NetworkListener[] = [];
  private metrics: NetworkMetrics = {
    totalOnlineTime: 0,
    totalOfflineTime: 0,
    lastOnlineTransition: null,
    lastOfflineTransition: null,
    syncOperationsWhileOffline: 0
  };
  private lastStatusCheck: number = 0;
  private checkInterval: number | null = null; // 🔥 Mudei para number

  constructor() {
    this.initialize();
  }

  /**
   * Inicializa o monitor de rede
   */
  private async initialize() {
    console.log('📡 Inicializando NetworkMonitor...');
    
    await this.loadMetrics();
    await this.checkNetworkStatus();
    this.setupNetworkListeners();
    this.startPeriodicChecks();
    
    console.log('✅ NetworkMonitor inicializado');
  }

  /**
   * Configura listeners de rede
   */
  private setupNetworkListeners() {
    // Listener para mudanças de sync do syncManager
    syncManager.addStatusListener((syncStatus) => {
      this.isSyncing = syncStatus.isSyncing;
      this.notifySyncStateChange();
    });

    // TODO: Quando o Java tiver eventos de rede, adicionar aqui:
    // syncServiceEmitter.addListener('NETWORK_CHANGED', this.handleJavaNetworkEvent);
  }

  /**
   * Inicia verificações periódicas
   */
  private startPeriodicChecks() {
    // Verifica a cada 15 segundos
    this.checkInterval = setInterval(() => {
      this.checkNetworkStatus();
    }, 15000) as unknown as number; // 🔥 Cast para number
  }

  /**
   * Para as verificações periódicas
   */
  private stopPeriodicChecks() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Verifica status completo da rede
   */
  async checkNetworkStatus(): Promise<NetworkStatus> {
    // Evita verificações muito frequentes
    const now = Date.now();
    if (now - this.lastStatusCheck < 5000) { // 5 segundos
      return this.getCurrentStatus();
    }
    
    this.lastStatusCheck = now;

    try {
      const wasOnline = this.isOnline;
      const wasWifi = this.isWifi;

      // 🟢 Verifica status real da rede
      this.isOnline = await SyncService.isConnected();
      this.isWifi = this.isOnline ? await SyncService.isWifiConnected() : false;

      const status: NetworkStatus = {
        isOnline: this.isOnline,
        isWifi: this.isWifi,
        isCellular: this.isOnline && !this.isWifi,
        connectionType: this.isOnline ? (this.isWifi ? 'wifi' : 'cellular') : 'none',
        timestamp: new Date().toISOString()
      };

      // Notifica mudanças significativas
      if (wasOnline !== this.isOnline || wasWifi !== this.isWifi) {
        console.log('📡 Mudança de rede detectada:', {
          from: { online: wasOnline, wifi: wasWifi },
          to: { online: this.isOnline, wifi: this.isWifi }
        });

        await this.saveNetworkStatus(status);
        this.notifyNetworkChange(status);
        
        // Gerencia transições de estado
        if (!wasOnline && this.isOnline) {
          await this.handleOnlineTransition();
        } else if (wasOnline && !this.isOnline) {
          await this.handleOfflineTransition();
        }

        this.updateMetrics(wasOnline, wasWifi);
      }

      return status;
    } catch (error) {
      console.error('❌ Erro ao verificar rede:', error);
      
      const errorStatus: NetworkStatus = {
        isOnline: false,
        isWifi: false,
        isCellular: false,
        connectionType: 'none',
        timestamp: new Date().toISOString()
      };
      
      return errorStatus;
    }
  }

  /**
   * Ações quando a conexão volta (Online → Online)
   */
  private async handleOnlineTransition() {
    console.log('🌐 TRANSIÇÃO: Offline → Online - Coordenando serviços...');
    
    try {
      // 1. Notificar serviços da nova conexão
      await loginOfflineService.checkConnection();

      // 2. Iniciar sincronização pendente (se houver)
      const pendingOperations = syncManager.getPendingOperationsCount();
      if (pendingOperations > 0) {
        console.log(`🔄 Iniciando sync de ${pendingOperations} operações pendentes...`);
        
        if (this.isSafeForLargeOperations()) {
          // WiFi - sync completo
          await syncManager.forceSync();
        } else {
          // Dados móveis - sync básico
          await this.optimizedSync();
        }
      }

      // 3. Verificar necessidade de sync completo
      const hasLocalData = await databaseService.hasLocalData();
      if (!hasLocalData) {
        console.log('🆕 Sem dados locais - Sugerindo sync completo na próxima oportunidade...');
        // Poderia disparar evento para UI
      }

      // 4. Atualizar métricas
      this.metrics.lastOnlineTransition = new Date().toISOString();
      await this.saveMetrics();

      console.log('✅ Transição para ONLINE concluída');

    } catch (error) {
      console.error('❌ Erro na transição para online:', error);
    }
  }

  /**
   * Ações quando a conexão é perdida (Online → Offline)
   */
  private async handleOfflineTransition() {
    console.log('📴 TRANSIÇÃO: Online → Offline - Ajustando serviços...');
    
    try {
      // 1. Notificar serviços
      await loginOfflineService.checkConnection();

      // 2. Salvar estado atual para recovery
      await this.saveOfflineState();

      // 3. Atualizar métricas
      this.metrics.lastOfflineTransition = new Date().toISOString();
      this.metrics.syncOperationsWhileOffline = syncManager.getPendingOperationsCount();
      await this.saveMetrics();

      console.log('✅ Transição para OFFLINE concluída');

    } catch (error) {
      console.error('❌ Erro na transição para offline:', error);
    }
  }

  /**
   * Sync otimizado para redes móveis
   */
  private async optimizedSync() {
    console.log('📱 Sync otimizado para dados móveis...');
    
    // Em redes móveis, podemos:
    // - Sync apenas operações críticas
    // - Limitar tamanho dos dados
    // - Usar compressão
    await syncManager.forceSync();
  }

  /**
   * Atualiza métricas de rede
   */
  private updateMetrics(wasOnline: boolean, wasWifi: boolean) {
    const now = Date.now();
    
    // TODO: Implementar tracking preciso de tempo online/offline
    // Por enquanto apenas conta transições
    
    console.log('📊 Métricas de rede atualizadas');
  }

  /**
   * Salva estado offline para recovery
   */
  private async saveOfflineState() {
    try {
      const offlineState = {
        timestamp: new Date().toISOString(),
        pendingOperations: syncManager.getPendingOperationsCount(),
        hasLocalData: await databaseService.hasLocalData()
      };
      
      await AsyncStorage.setItem(OFFLINE_OPERATIONS_KEY, JSON.stringify(offlineState));
      console.log('💾 Estado offline salvo para recovery');
    } catch (error) {
      console.error('❌ Erro ao salvar estado offline:', error);
    }
  }

  /**
   * Salva status da rede
   */
  private async saveNetworkStatus(status: NetworkStatus) {
    try {
      await AsyncStorage.setItem(NETWORK_STATUS_KEY, JSON.stringify(status));
    } catch (error) {
      console.error('❌ Erro ao salvar status de rede:', error);
    }
  }

  /**
   * Carrega métricas salvas
   */
  private async loadMetrics() {
    try {
      // TODO: Carregar métricas do AsyncStorage
      console.log('📊 Carregando métricas de rede...');
    } catch (error) {
      console.error('❌ Erro ao carregar métricas:', error);
    }
  }

  /**
   * Salva métricas
   */
  private async saveMetrics() {
    try {
      // TODO: Salvar métricas no AsyncStorage
    } catch (error) {
      console.error('❌ Erro ao salvar métricas:', error);
    }
  }

  // =====================================================
  // 📡 API PÚBLICA
  // =====================================================

  /**
   * Adiciona listener para mudanças de rede
   */
  addListener(listener: NetworkListener): void {
    this.listeners.push(listener);
    console.log(`👂 Listener de rede adicionado. Total: ${this.listeners.length}`);
  }

  /**
   * Remove listener
   */
  removeListener(listener: NetworkListener): void {
    this.listeners = this.listeners.filter(l => l !== listener);
    console.log(`👂 Listener de rede removido. Total: ${this.listeners.length}`);
  }

  /**
   * Notifica mudanças de rede para os listeners
   */
  private notifyNetworkChange(status: NetworkStatus): void {
    console.log('📢 Notificando mudança de rede para listeners...');
    
    this.listeners.forEach((listener, index) => {
      try {
        listener.onNetworkChange(status);
        
        if (status.isOnline) {
          listener.onOnline();
        } else {
          listener.onOffline();
        }
        
        console.log(`📢 Listener ${index + 1} notificado`);
      } catch (error) {
        console.error(`❌ Erro no listener ${index + 1} de rede:`, error);
      }
    });
  }

  /**
   * Notifica mudanças de estado de sync
   */
  private notifySyncStateChange(): void {
    this.listeners.forEach(listener => {
      try {
        if (listener.onSyncStateChange) {
          listener.onSyncStateChange(this.isSyncing);
        }
      } catch (error) {
        console.error('❌ Erro no listener de sync state:', error);
      }
    });
  }

  /**
   * Obtém status atual da rede
   */
  getCurrentStatus(): NetworkStatus {
    return {
      isOnline: this.isOnline,
      isWifi: this.isWifi,
      isCellular: this.isOnline && !this.isWifi,
      connectionType: this.isOnline ? (this.isWifi ? 'wifi' : 'cellular') : 'none',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Verifica se é seguro fazer operações pesadas (WiFi)
   */
  isSafeForLargeOperations(): boolean {
    return this.isOnline && this.isWifi;
  }

  /**
   * Verifica se pode fazer sync (conexão boa)
   */
  isGoodForSync(): boolean {
    return this.isOnline && !this.isSyncing;
  }

  /**
   * Verifica se está sincronizando
   */
  getIsSyncing(): boolean {
    return this.isSyncing;
  }

  /**
   * Obtém métricas de rede
   */
  getMetrics(): NetworkMetrics {
    return { ...this.metrics };
  }

  /**
   * Força verificação de rede
   */
  async forceNetworkCheck(): Promise<NetworkStatus> {
    console.log('🔍 Forçando verificação de rede...');
    return await this.checkNetworkStatus();
  }

  /**
   * Destrói o monitor (para cleanup)
   */
  destroy() {
    this.stopPeriodicChecks();
    this.listeners = [];
    console.log('🧹 NetworkMonitor destruído');
  }
}

// Exporta uma instância única (Singleton)
export const networkMonitor = new NetworkMonitor();

// Export para uso compatível
export default networkMonitor;