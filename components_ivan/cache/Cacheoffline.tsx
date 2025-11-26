// CacheOffline.tsx - Componente invisível de monitoramento de conectividade
import React, { useEffect, useState } from "react";
import { NativeModules, NativeEventEmitter, View, Text, Modal, StyleSheet, TouchableOpacity } from "react-native";
import { useTheme } from '../theme/ThemeContext';

const { DBModule, SyncModule } = NativeModules;

// EventEmitter → ouvir eventos emitidos pelo módulo Java
const syncEvents = new NativeEventEmitter(SyncModule);

interface CacheOfflineProps {
  onConnectivityChange?: (isConnected: boolean) => void;
  showReconnectingMessage?: boolean;
}

export default function CacheOffline({ 
  onConnectivityChange, 
  showReconnectingMessage = true 
}: CacheOfflineProps) {
  const { theme } = useTheme();
  const [pendingOps, setPendingOps] = useState<any[]>([]);
  const [wifi, setWifi] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReconnectModal, setShowReconnectModal] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);

  // ---------------------------------------------------------------------------
  // EVENTOS DO MÓDULO JAVA
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const ev1 = syncEvents.addListener("onWifiConnected", () => {
      console.log("📶 Wifi conectado!");
      setWifi(true);
      setIsReconnecting(false);
      setShowReconnectModal(false);
      if (onConnectivityChange) {
        onConnectivityChange(true);
      }
    });

    const ev2 = syncEvents.addListener("onWifiDisconnected", () => {
      console.log("📵 Wifi desconectado!");
      setWifi(false);
      if (showReconnectingMessage) {
        setIsReconnecting(true);
        setShowReconnectModal(true);
      }
      if (onConnectivityChange) {
        onConnectivityChange(false);
      }
    });

    const ev3 = syncEvents.addListener("onSyncStart", () => {
      console.log("🔄 Sincronização iniciada...");
      setSyncing(true);
    });

    const ev4 = syncEvents.addListener("onSyncSuccess", () => {
      console.log("✅ Sync concluído com sucesso");
      setSyncing(false);
      setError(null);
      loadPending();
    });

    const ev5 = syncEvents.addListener("onSyncError", (err) => {
      console.log("❌ Erro no sync:", err);
      setError(err?.error || "Erro desconhecido");
      setSyncing(false);
    });

    // Carregar pendentes no início
    loadPending();

    return () => {
      ev1.remove();
      ev2.remove();
      ev3.remove();
      ev4.remove();
      ev5.remove();
    };
  }, []);

  // ---------------------------------------------------------------------------
  // CARREGAR OPERAÇÕES PENDENTES
  // ---------------------------------------------------------------------------
  const loadPending = async () => {
    try {
      const ops = await DBModule.getPendingOps();
      setPendingOps(JSON.parse(ops));
    } catch (err) {
      console.log("Erro ao carregar pendentes:", err);
    }
  };

  // ---------------------------------------------------------------------------
  // EXEMPLO → salvar operação offline REAL baseado no seu backend
  // ---------------------------------------------------------------------------
  const adicionarOperacaoOffline = async () => {
    const op = {
      op_id: Date.now().toString(),
      op_type: "CREATE", // ← backend espera isso
      entity: "tarefa",  // ← entidade real
      payload: {
        titulo: "Tarefa offline",
        descricao: "Criada sem internet",
        id_workspace: 1,
        id_usuario: 1,
      },
    };

    try {
      await DBModule.savePendingOp(JSON.stringify(op));
      console.log("📝 Operação offline salva:", op);
      loadPending();
    } catch (err) {
      console.log("Erro ao salvar operação:", err);
    }
  };

  // ---------------------------------------------------------------------------
  // FORÇAR SYNC MANUAL
  // ---------------------------------------------------------------------------
  const syncNow = async () => {
    console.log("🔁 Forçando sync manual...");
    await SyncModule.startSync();
  };

  // ---------------------------------------------------------------------------
  // FUNÇÃO PARA SALVAR OPERAÇÃO OFFLINE (EXPOSIÇÃO PÚBLICA)
  // ---------------------------------------------------------------------------
  const saveOfflineOperation = async (operation: {
    op_type: 'CREATE' | 'UPDATE' | 'DELETE';
    entity: string;
    payload: any;
  }) => {
    const op = {
      op_id: Date.now().toString(),
      op_type: operation.op_type,
      entity: operation.entity,
      payload: operation.payload,
    };

    try {
      await DBModule.savePendingOp(JSON.stringify(op));
      console.log("📝 Operação offline salva:", op);
      loadPending();
      return true;
    } catch (err) {
      console.log("Erro ao salvar operação:", err);
      return false;
    }
  };

  // ---------------------------------------------------------------------------
  // UI - COMPONENTE INVISÍVEL COM MODAL DE RECONEXÃO
  // ---------------------------------------------------------------------------
  return (
    <>
      {/* Modal de Reconectando */}
      <Modal
        visible={showReconnectModal && isReconnecting}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={[
            styles.reconnectModal,
            { backgroundColor: theme.colors.surface }
          ]}>
            <Text style={[
              styles.modalTitle,
              { color: theme.colors.text }
            ]}>
              📡 Sem Conexão
            </Text>
            
            <Text style={[
              styles.modalMessage,
              { color: theme.colors.textSecondary }
            ]}>
              Aguardando reconexão com a internet...
            </Text>
            
            <View style={styles.loadingContainer}>
              <Text style={[
                styles.loadingText,
                { color: theme.colors.primary }
              ]}>
                🔄 Reconectando
              </Text>
            </View>

            {pendingOps.length > 0 && (
              <Text style={[
                styles.pendingText,
                { color: theme.colors.warning }
              ]}>
                📝 {pendingOps.length} operação(ões) pendente(s)
              </Text>
            )}

            <TouchableOpacity
              style={[
                styles.dismissButton,
                { backgroundColor: theme.colors.primary }
              ]}
              onPress={() => setShowReconnectModal(false)}
            >
              <Text style={styles.dismissButtonText}>
                Continuar Offline
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Componente invisível - não renderiza nada visível normalmente */}
      <View style={{ position: 'absolute', opacity: 0 }} pointerEvents="none">
        <Text>Cache Offline Monitor Active</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reconnectModal: {
    margin: 20,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    minWidth: 280,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  loadingContainer: {
    marginVertical: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  pendingText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '500',
  },
  dismissButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  dismissButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
