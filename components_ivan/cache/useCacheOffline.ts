// useCacheOffline.ts - Hook para utilizar funcionalidades do cache offline
import { useRef, useCallback } from 'react';
import { NativeModules } from 'react-native';

const { DBModule, SyncModule } = NativeModules;

export interface OfflineOperation {
  op_type: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: string;
  payload: any;
}

export const useCacheOffline = () => {
  // ---------------------------------------------------------------------------
  // FUNÇÃO PARA SALVAR OPERAÇÃO OFFLINE
  // ---------------------------------------------------------------------------
  const saveOfflineOperation = useCallback(async (operation: OfflineOperation): Promise<boolean> => {
    const op = {
      op_id: Date.now().toString(),
      op_type: operation.op_type,
      entity: operation.entity,
      payload: operation.payload,
    };

    try {
      await DBModule.savePendingOp(JSON.stringify(op));
      console.log("📝 Operação offline salva:", op);
      return true;
    } catch (err) {
      console.log("Erro ao salvar operação:", err);
      return false;
    }
  }, []);

  // ---------------------------------------------------------------------------
  // FUNÇÃO PARA OBTER OPERAÇÕES PENDENTES
  // ---------------------------------------------------------------------------
  const getPendingOperations = useCallback(async (): Promise<any[]> => {
    try {
      const ops = await DBModule.getPendingOps();
      return JSON.parse(ops);
    } catch (err) {
      console.log("Erro ao carregar pendentes:", err);
      return [];
    }
  }, []);

  // ---------------------------------------------------------------------------
  // FUNÇÃO PARA FORÇAR SINCRONIZAÇÃO
  // ---------------------------------------------------------------------------
  const syncNow = useCallback(async (): Promise<void> => {
    try {
      console.log("🔁 Forçando sync manual...");
      await SyncModule.startSync();
    } catch (err) {
      console.log("Erro ao sincronizar:", err);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // FUNÇÃO PARA SALVAR TAREFA OFFLINE
  // ---------------------------------------------------------------------------
  const saveTarefaOffline = useCallback(async (tarefa: {
    titulo: string;
    descricao: string;
    id_workspace: number;
    id_usuario: number;
    data_limite?: string;
    prioridade?: string;
  }): Promise<boolean> => {
    return await saveOfflineOperation({
      op_type: 'CREATE',
      entity: 'tarefa',
      payload: tarefa,
    });
  }, [saveOfflineOperation]);

  // ---------------------------------------------------------------------------
  // FUNÇÃO PARA ATUALIZAR TAREFA OFFLINE
  // ---------------------------------------------------------------------------
  const updateTarefaOffline = useCallback(async (id: number, tarefa: {
    titulo?: string;
    descricao?: string;
    status?: string;
    data_limite?: string;
    prioridade?: string;
  }): Promise<boolean> => {
    return await saveOfflineOperation({
      op_type: 'UPDATE',
      entity: 'tarefa',
      payload: { id, ...tarefa },
    });
  }, [saveOfflineOperation]);

  // ---------------------------------------------------------------------------
  // FUNÇÃO PARA DELETAR TAREFA OFFLINE
  // ---------------------------------------------------------------------------
  const deleteTarefaOffline = useCallback(async (id: number): Promise<boolean> => {
    return await saveOfflineOperation({
      op_type: 'DELETE',
      entity: 'tarefa',
      payload: { id },
    });
  }, [saveOfflineOperation]);

  // ---------------------------------------------------------------------------
  // FUNÇÃO PARA SALVAR COMENTÁRIO OFFLINE
  // ---------------------------------------------------------------------------
  const saveComentarioOffline = useCallback(async (comentario: {
    conteudo: string;
    id_tarefa: number;
    id_usuario: number;
  }): Promise<boolean> => {
    return await saveOfflineOperation({
      op_type: 'CREATE',
      entity: 'comentario',
      payload: comentario,
    });
  }, [saveOfflineOperation]);

  return {
    // Funções gerais
    saveOfflineOperation,
    getPendingOperations,
    syncNow,
    
    // Funções específicas para tarefas
    saveTarefaOffline,
    updateTarefaOffline,
    deleteTarefaOffline,
    
    // Funções específicas para comentários
    saveComentarioOffline,
  };
};

export default useCacheOffline;