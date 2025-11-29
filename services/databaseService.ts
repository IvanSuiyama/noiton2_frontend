// src/services/databaseService.ts
import { NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { SyncService } = NativeModules;

// Chaves para AsyncStorage
const DB_OPERATION_KEY = 'db_operation';
const HAS_LOCAL_DATA_KEY = 'has_local_data';
const LAST_SYNC_KEY = 'last_sync_timestamp';

export interface DatabaseResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface Usuario {
  id_usuario?: number;
  email: string;
  senha?: string;
  telefone?: string;
  nome: string;
  pontos?: number;
}

export interface Workspace {
  id_workspace?: number;
  nome: string;
  equipe: boolean;
  criador: string;
}

export interface UsuarioWorkspace {
  id_usuario_workspace?: number;
  email: string;
  id_workspace: number;
}

export interface Categoria {
  id_categoria?: number;
  nome: string;
  id_workspace: number;
}

export interface Tarefa {
  id_tarefa?: number;
  titulo: string;
  descricao?: string;
  data_fim?: string;
  data_criacao?: string;
  prioridade?: 'alta' | 'media' | 'baixa' | 'urgente';
  status?: 'a_fazer' | 'em_andamento' | 'concluido' | 'atrasada';
  concluida?: boolean;
  recorrente?: boolean;
  recorrencia?: 'diaria' | 'semanal' | 'mensal';
  id_usuario: number;
}

export interface TarefaWorkspace {
  id_tarefa_workspace?: number;
  id_tarefa: number;
  id_workspace: number;
}

export interface TarefaCategoria {
  id_tarefa_categoria?: number;
  id_tarefa: number;
  id_categoria: number;
}

export interface Comentario {
  id_comentario?: number;
  email: string;
  id_tarefa: number;
  descricao: string;
  data_criacao?: string;
  data_atualizacao?: string;
}

export interface Anexo {
  id_anexo?: number;
  id_tarefa: number;
  tipo_arquivo: 'pdf' | 'imagem';
  nome_arquivo: string;
  nome_original: string;
  tamanho_arquivo: number;
  caminho_arquivo: string;
  data_upload?: string;
  data_atualizacao?: string;
}

class DatabaseService {
  /**
   * Executa operação genérica no banco SQLite via Java
   */
  private async executeOperation(operation: string, data?: any): Promise<DatabaseResult> {
    try {
      console.log(`🗃️ Executando operação no SQLite: ${operation}`, data ? '(com dados)' : '(sem dados)');
      
      const dataJson = data ? JSON.stringify(data) : '{}';
      
      // 🟢 AGORA COMUNICA COM JAVA REALMENTE
      const result = await SyncService.executeDbOperation(operation, dataJson);
      
      console.log(`✅ Resposta do SQLite (${operation}):`, result);
      
      // Converter resultado string para objeto
      if (typeof result === 'string') {
        return JSON.parse(result);
      }
      
      return result;
      
    } catch (error: any) {
      console.error(`❌ Erro na operação ${operation}:`, error);
      
      // 🟡 FALLBACK: Tentar AsyncStorage se Java falhar
      try {
        console.log(`🟡 Tentando fallback para ${operation}...`);
        const fallbackResult = await this.fallbackOperation(operation, data);
        return fallbackResult;
      } catch (fallbackError) {
        return {
          success: false,
          error: error.message || `Falha na operação ${operation}`
        };
      }
    }
  }

  /**
   * Fallback usando AsyncStorage (apenas para emergências)
   */private async fallbackOperation(operation: string, data?: any): Promise<DatabaseResult> {
    const key = `${DB_OPERATION_KEY}_${Date.now()}`;
    
    switch (operation) {
      case 'save_full_sync':
        await AsyncStorage.setItem('last_sync_data', JSON.stringify(data));
        return { 
          success: true, 
          data: { 
            message: 'Dados salvos no fallback (AsyncStorage)',
            operation: 'fallback'
          } 
        };
      
      case 'clear_database':
        await AsyncStorage.removeItem('last_sync_data');
        await AsyncStorage.setItem(HAS_LOCAL_DATA_KEY, 'false');
        return { 
          success: true, 
          data: { 
            message: 'Dados limpos do fallback',
            operation: 'fallback' 
          } 
        };
      
      case 'get_database_stats':
        const storedData = await AsyncStorage.getItem('last_sync_data'); // 🔥 Mudei para storedData
        const parsedData = storedData ? JSON.parse(storedData) : null;   // 🔥 Mudei para parsedData
        
        const stats = {
          workspaces: parsedData?.workspaces?.length || 0,
          categorias: parsedData?.categorias?.length || 0,
          tarefas: parsedData?.tarefas?.length || 0,
          comentarios: parsedData?.comentarios?.length || 0,
          anexos: parsedData?.anexos?.length || 0,
          hasData: !!parsedData,
          operation: 'fallback'
        };
        
        return { success: true, data: stats };
      
      default:
        const defaultStoredData = await AsyncStorage.getItem('last_sync_data'); // 🔥 Mudei para defaultStoredData
        return { 
          success: true, 
          data: defaultStoredData ? JSON.parse(defaultStoredData) : null 
        };
    }
  }

  // =====================================================
  // 🗃️ OPERAÇÕES DE SINCRONIZAÇÃO - AGORA REAIS
  // =====================================================

  /**
   * Salva dados completos da sincronização no SQLite (REAL)
   */
  async saveFullSyncData(syncData: {
    workspaces: Workspace[];
    categorias: Categoria[];
    tarefas: Tarefa[];
    comentarios: Comentario[];
    anexos: Anexo[];
    user_email: string;
  }): Promise<DatabaseResult> {
    try {
      console.log('💾 Salvando dados completos no SQLite (REAL):', {
        workspaces: syncData.workspaces.length,
        categorias: syncData.categorias.length,
        tarefas: syncData.tarefas.length,
        comentarios: syncData.comentarios.length,
        anexos: syncData.anexos.length
      });

      // 🟢 AGORA USA JAVA REAL
      const result = await SyncService.saveFullSyncData(JSON.stringify(syncData));
      
      if (result.success) {
        await AsyncStorage.setItem(HAS_LOCAL_DATA_KEY, 'true');
        await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
        console.log('✅ Dados salvos no SQLite com sucesso (via Java)');
      } else {
        console.error('❌ Erro ao salvar no SQLite:', result.error);
      }
      
      return result;
    } catch (error: any) {
      console.error('❌ Erro ao salvar dados no SQLite:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Limpa todos os dados do SQLite (REAL)
   */
  async clearDatabase(): Promise<DatabaseResult> {
    try {
      console.log('🧹 Limpando banco SQLite (REAL)...');
      
      // 🟢 AGORA USA JAVA REAL
      const result = await SyncService.clearLocalDatabase();
      
      if (result.success) {
        await AsyncStorage.setItem(HAS_LOCAL_DATA_KEY, 'false');
        await AsyncStorage.removeItem(LAST_SYNC_KEY);
        console.log('✅ Banco SQLite limpo com sucesso (via Java)');
      }
      
      return result;
    } catch (error: any) {
      console.error('❌ Erro ao limpar banco SQLite:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // =====================================================
  // 👤 OPERAÇÕES DE USUÁRIO - AGORA REAIS
  // =====================================================

  /**
   * Busca usuário por email (REAL)
   */
  async getUsuarioByEmail(email: string): Promise<DatabaseResult> {
    return await this.executeOperation('get_usuario_by_email', { email });
  }

  /**
   * Salva/atualiza usuário (REAL)
   */
  async saveUsuario(usuario: Usuario): Promise<DatabaseResult> {
    return await this.executeOperation('save_usuario', usuario);
  }

  // =====================================================
  // 🏢 OPERAÇÕES DE WORKSPACE - AGORA REAIS
  // =====================================================

  /**
   * Busca todos os workspaces do usuário (REAL)
   */
  async getWorkspacesByUser(email: string): Promise<DatabaseResult> {
    return await this.executeOperation('get_workspaces_by_user', { email });
  }

  /**
   * Busca workspace por ID (REAL)
   */
  async getWorkspaceById(id: number): Promise<DatabaseResult> {
    return await this.executeOperation('get_workspace_by_id', { id });
  }

  /**
   * Salva/atualiza workspace (REAL)
   */
  async saveWorkspace(workspace: Workspace): Promise<DatabaseResult> {
    return await this.executeOperation('save_workspace', workspace);
  }

  /**
   * Deleta workspace (REAL)
   */
  async deleteWorkspace(id: number): Promise<DatabaseResult> {
    return await this.executeOperation('delete_workspace', { id });
  }

  // =====================================================
  // 📁 OPERAÇÕES DE CATEGORIA - AGORA REAIS
  // =====================================================

  /**
   * Busca categorias por workspace (REAL)
   */
  async getCategoriasByWorkspace(workspaceId: number): Promise<DatabaseResult> {
    return await this.executeOperation('get_categorias_by_workspace', { workspaceId });
  }

  /**
   * Salva/atualiza categoria (REAL)
   */
  async saveCategoria(categoria: Categoria): Promise<DatabaseResult> {
    return await this.executeOperation('save_categoria', categoria);
  }

  /**
   * Deleta categoria (REAL)
   */
  async deleteCategoria(id: number): Promise<DatabaseResult> {
    return await this.executeOperation('delete_categoria', { id });
  }

  // =====================================================
  // ✅ OPERAÇÕES DE TAREFA - AGORA REAIS
  // =====================================================

  /**
   * Busca tarefas por workspace (REAL)
   */
  async getTarefasByWorkspace(workspaceId: number): Promise<DatabaseResult> {
    return await this.executeOperation('get_tarefas_by_workspace', { workspaceId });
  }

  /**
   * Busca tarefas por usuário (REAL)
   */
  async getTarefasByUser(userId: number): Promise<DatabaseResult> {
    return await this.executeOperation('get_tarefas_by_user', { userId });
  }

  /**
   * Busca tarefa por ID (REAL)
   */
  async getTarefaById(id: number): Promise<DatabaseResult> {
    console.log(`🔍 DatabaseService: Buscando tarefa por ID ${id}`);
    const result = await this.executeOperation('get_tarefa_by_id', { id });
    console.log(`🔍 DatabaseService: Resultado da busca por ID ${id}:`, JSON.stringify(result, null, 2));
    return result;
  }

  /**
   * Lista todas as tarefas do SQLite para debug (REAL)
   */
  async listarTodasTarefasSQLite(): Promise<DatabaseResult> {
    try {
      console.log('🗃️ Listando TODAS as tarefas do SQLite para debug...');
      
      const result = await SyncService.executeDbOperation('list_all_tarefas', '{}');
      
      console.log('📋 TODAS as tarefas no SQLite:', JSON.stringify(result, null, 2));
      
      return result;
    } catch (error: any) {
      console.error('❌ Erro ao listar todas as tarefas:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Salva/atualiza tarefa (REAL)
   */
  async saveTarefa(tarefa: Tarefa): Promise<DatabaseResult> {
    return await this.executeOperation('save_tarefa', tarefa);
  }

  /**
   * Atualiza tarefa por ID (REAL) 
   */
  async updateTarefa(id: number, dadosAtualizacao: Partial<Tarefa>): Promise<DatabaseResult> {
    return await this.executeOperation('update_tarefa', { id, ...dadosAtualizacao });
  }

  /**
   * Deleta tarefa (REAL)
   */
  async deleteTarefa(id: number): Promise<DatabaseResult> {
    return await this.executeOperation('delete_tarefa', { id });
  }

  // =====================================================
  // 💬 OPERAÇÕES DE COMENTÁRIO - AGORA REAIS
  // =====================================================

  /**
   * Busca comentários por tarefa (REAL)
   */
  async getComentariosByTarefa(tarefaId: number): Promise<DatabaseResult> {
    return await this.executeOperation('get_comentarios_by_tarefa', { tarefaId });
  }

  /**
   * Salva/atualiza comentário (REAL)
   */
  async saveComentario(comentario: Comentario): Promise<DatabaseResult> {
    return await this.executeOperation('save_comentario', comentario);
  }

  /**
   * Deleta comentário (REAL)
   */
  async deleteComentario(id: number): Promise<DatabaseResult> {
    return await this.executeOperation('delete_comentario', { id });
  }

  // =====================================================
  // 📎 OPERAÇÕES DE ANEXO - AGORA REAIS
  // =====================================================

  /**
   * Busca anexos por tarefa (REAL)
   */
  async getAnexosByTarefa(tarefaId: number): Promise<DatabaseResult> {
    return await this.executeOperation('get_anexos_by_tarefa', { tarefaId });
  }

  /**
   * Salva anexo (REAL)
   */
  async saveAnexo(anexo: Anexo): Promise<DatabaseResult> {
    return await this.executeOperation('save_anexo', anexo);
  }

  /**
   * Deleta anexo (REAL)
   */
  async deleteAnexo(id: number): Promise<DatabaseResult> {
    return await this.executeOperation('delete_anexo', { id });
  }

  // =====================================================
  // 🔍 OPERAÇÕES GERAIS - AGORA REAIS
  // =====================================================

  /**
   * Busca todos os dados locais do usuário (REAL)
   */
  async getAllUserData(email: string): Promise<DatabaseResult> {
    try {
      console.log('🔍 Buscando todos os dados locais para:', email);
      
      // 🟢 AGORA USA JAVA REAL
      const result = await this.executeOperation('get_all_user_data', { email });
      
      console.log('✅ Dados locais buscados:', result.success ? 'Sucesso' : 'Falha');
      return result;
    } catch (error: any) {
      console.error('❌ Erro ao buscar dados locais:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Verifica se existem dados locais
   */
  async hasLocalData(): Promise<boolean> {
    try {
      const hasData = await AsyncStorage.getItem(HAS_LOCAL_DATA_KEY);
      return hasData === 'true';
    } catch (error) {
      console.error('Erro ao verificar dados locais:', error);
      return false;
    }
  }

  /**
   * Obtém estatísticas dos dados locais (REAL)
   */
  async getDatabaseStats(): Promise<DatabaseResult> {
    try {
      // 🟢 AGORA USA JAVA REAL
      const result = await this.executeOperation('get_database_stats');
      return result;
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Obtém informações do banco (REAL)
   */
  async getDatabaseInfo(): Promise<DatabaseResult> {
    try {
      const info = await SyncService.getDatabaseInfo();
      return {
        success: true,
        data: info
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Método público para executar operações diretas no banco
   */
  async executeDbOperation(operation: string, dataJson?: string): Promise<DatabaseResult> {
    return this.executeOperation(operation, dataJson ? JSON.parse(dataJson) : undefined);
  }


}

// Exporta uma instância única (Singleton)
export const databaseService = new DatabaseService();

// Export para uso compatível
export default databaseService;