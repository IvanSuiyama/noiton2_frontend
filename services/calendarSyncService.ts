import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { apiCall, getActiveWorkspaceId } from './authService';
import GoogleCalendarService from './googleCalendarService';

interface TarefaCalendar {
  id_tarefa: number;
  titulo: string;
  descricao?: string;
  data_fim: string;
  status: string;
  prioridade?: string;
  google_calendar_event_id?: string;
}

interface CalendarSyncResult {
  success: boolean;
  eventosRegistrados: number;
  notificacoesEnviadas: number;
  errors: string[];
}

class CalendarSyncService {
  private syncKey = '@calendar_sync_last_check';
  private eventsKey = '@calendar_sync_events';
  private isRunning = false;

  async isAutoSyncEnabled(): Promise<boolean> {
    try {
      const enabled = await AsyncStorage.getItem('@calendar_auto_sync_enabled');
      return enabled === 'true';
    } catch (error) {
      return false;
    }
  }

  async setAutoSyncEnabled(enabled: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem('@calendar_auto_sync_enabled', enabled.toString());
    } catch (error) {
      console.error('Erro ao salvar configuração de sincronização:', error);
    }
  }

  private async shouldRunSync(): Promise<boolean> {
    try {
      const lastCheck = await AsyncStorage.getItem(this.syncKey);
      if (!lastCheck) {
        return true;
      }

      const lastCheckDate = new Date(lastCheck);
      const now = new Date();

      const hoursSinceLastCheck = (now.getTime() - lastCheckDate.getTime()) / (1000 * 60 * 60);

      return hoursSinceLastCheck >= 4;
    } catch (error) {
      return true;
    }
  }

  private async saveLastSyncTime(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.syncKey, new Date().toISOString());
    } catch (error) {
      console.error('Erro ao salvar timestamp de sincronização:', error);
    }
  }

  private async getRegisteredEvents(): Promise<{[key: number]: string}> {
    try {
      const stored = await AsyncStorage.getItem(this.eventsKey);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      return {};
    }
  }

  private async saveRegisteredEvent(tarefaId: number, eventId: string): Promise<void> {
    try {
      const events = await this.getRegisteredEvents();
      events[tarefaId] = eventId;
      await AsyncStorage.setItem(this.eventsKey, JSON.stringify(events));
    } catch (error) {
      console.error('Erro ao salvar evento registrado:', error);
    }
  }

  private async loadTasksWithDeadlines(): Promise<TarefaCalendar[]> {
    try {
      const workspaceId = await getActiveWorkspaceId();
      if (!workspaceId) {
        throw new Error('Nenhum workspace ativo encontrado');
      }

      const response = await apiCall(`/tarefas/workspace/${workspaceId}`, 'GET');
      const tarefas = response || [];

      return tarefas.filter((tarefa: any) =>
        tarefa.data_fim &&
        tarefa.status !== 'concluido'
      );
    } catch (error) {
      // Silenciar erro de token expirado para não poluir logs
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      if (!errorMessage.includes('Token expirado')) {
        console.error('Erro ao carregar tarefas:', error);
      }
      return [];
    }
  }

  private isTaskNearDeadline(dataFim: string): boolean {
    const deadline = new Date(dataFim);
    const now = new Date();

    deadline.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);

    const diffInDays = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return diffInDays >= 0 && diffInDays <= 1;
  }

  private async createDeadlineNotification(tarefa: TarefaCalendar): Promise<boolean> {
    const deadline = new Date(tarefa.data_fim);
    const now = new Date();

    deadline.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);

    const diffInDays = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    let message: string;
    if (diffInDays === 0) {
      message = `⚠️ A tarefa "${tarefa.titulo}" vence HOJE!`;
    } else if (diffInDays === 1) {
      message = `📅 A tarefa "${tarefa.titulo}" vence AMANHÃ!`;
    } else {
      return false;
    }

    Alert.alert('🔔 Lembrete de Prazo', message);

    return true;
  }

  async runSync(forceSync: boolean = false): Promise<CalendarSyncResult> {
    const result: CalendarSyncResult = {
      success: false,
      eventosRegistrados: 0,
      notificacoesEnviadas: 0,
      errors: []
    };

    if (this.isRunning) {
      result.errors.push('Sincronização já em execução');
      return result;
    }

    try {
      this.isRunning = true;

      const autoSyncEnabled = await this.isAutoSyncEnabled();
      const shouldSync = forceSync || (autoSyncEnabled && await this.shouldRunSync());

      if (!shouldSync) {
        result.success = true;
        return result;
      }

      console.log('🔄 Iniciando sincronização com Google Calendar...');

      const hasPermissions = await GoogleCalendarService.hasCalendarPermissions();
      if (!hasPermissions) {
        result.errors.push('Permissões de calendário não concedidas');
        return result;
      }

      const tarefas = await this.loadTasksWithDeadlines();
      const registeredEvents = await this.getRegisteredEvents();

      console.log(`📝 Encontradas ${tarefas.length} tarefas com prazo definido`);

      for (const tarefa of tarefas) {
        try {

          const isAlreadyRegistered = registeredEvents[tarefa.id_tarefa];

          if (!isAlreadyRegistered) {

            console.log(`📅 Registrando tarefa no calendário: ${tarefa.titulo}`);

            const success = await GoogleCalendarService.onTaskCreated(
              tarefa.titulo,
              `Prazo: ${new Date(tarefa.data_fim).toLocaleDateString('pt-BR')}`
            );

            if (success) {
              await this.saveRegisteredEvent(tarefa.id_tarefa, `task_${tarefa.id_tarefa}_${Date.now()}`);
              result.eventosRegistrados++;
              console.log(`✅ Tarefa registrada: ${tarefa.titulo}`);
            } else {
              result.errors.push(`Erro ao registrar tarefa: ${tarefa.titulo}`);
            }
          }

          if (this.isTaskNearDeadline(tarefa.data_fim)) {
            const notificationSent = await this.createDeadlineNotification(tarefa);
            if (notificationSent) {
              result.notificacoesEnviadas++;
            }
          }

        } catch (taskError) {
          console.error(`Erro ao processar tarefa ${tarefa.titulo}:`, taskError);
          result.errors.push(`Erro ao processar tarefa: ${tarefa.titulo}`);
        }
      }

      await this.saveLastSyncTime();

      result.success = true;
      console.log(`✅ Sincronização concluída: ${result.eventosRegistrados} eventos, ${result.notificacoesEnviadas} notificações`);

    } catch (error) {
      console.error('Erro na sincronização do calendário:', error);
      result.errors.push(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      this.isRunning = false;
    }

    return result;
  }

  async runManualSync(): Promise<void> {
    try {
      const result = await this.runSync(true);

      if (result.success) {
        let message = 'Sincronização concluída!\n\n';
        message += `📅 Eventos registrados: ${result.eventosRegistrados}\n`;
        message += `🔔 Notificações: ${result.notificacoesEnviadas}`;

        if (result.errors.length > 0) {
          message += `\n\n⚠️ Alguns erros ocorreram:\n${result.errors.join('\n')}`;
        }

        Alert.alert('✅ Sincronização', message);
      } else {
        Alert.alert('❌ Erro', `Erro na sincronização:\n${result.errors.join('\n')}`);
      }
    } catch (error) {
      Alert.alert('❌ Erro', 'Erro inesperado na sincronização.');
    }
  }

  async initializeAutoSync(): Promise<void> {
    try {
      console.log('🔄 Inicializando sincronização automática com Google Calendar...');
      
      // Executar sincronização inicial após 5 segundos
      setTimeout(async () => {
        await this.runSync();
        await this.runDailyCheck();
      }, 5000);

      // Executar sincronização a cada 4 horas
      setInterval(async () => {
        await this.runSync();
      }, 4 * 60 * 60 * 1000);

      // Executar check diário a cada 6 horas (4x por dia)
      setInterval(async () => {
        await this.runDailyCheck();
      }, 6 * 60 * 60 * 1000);

      console.log('✅ Sincronização automática inicializada com sucesso');
    } catch (error) {
      console.error('❌ Erro ao inicializar sincronização automática:', error);
    }
  }

  private async runDailyCheck(): Promise<void> {
    try {
      console.log('🕐 Executando verificação diária de prazos...');
      
      const calendarEnabled = await GoogleCalendarService.isCalendarEnabled();
      if (!calendarEnabled) {
        console.log('ℹ️ Google Calendar não habilitado - pulando check diário');
        return;
      }

      const tarefas = await this.loadTasksWithDeadlines();
      console.log(`📝 Verificando ${tarefas.length} tarefas com prazos`);
      
      await GoogleCalendarService.dailyDeadlineCheck(tarefas);
      console.log('✅ Verificação diária concluída');
      
    } catch (error) {
      console.error('❌ Erro no check diário:', error);
    }
  }

  async clearSyncCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.eventsKey);
      await AsyncStorage.removeItem(this.syncKey);
      console.log('🧹 Cache de sincronização limpo');
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
    }
  }

  async syncSingleTask(tarefa: {id: number, titulo: string, descricao?: string, data_fim?: string}): Promise<boolean> {
    try {
      console.log(`🔍 DEBUG: syncSingleTask chamado para tarefa ${tarefa.id}: ${tarefa.titulo}`);
      console.log(`📅 Data fim: ${tarefa.data_fim || 'não informada'}`);

      const registeredEvents = await this.getRegisteredEvents();

      if (registeredEvents[tarefa.id]) {
        console.log(`✅ Tarefa ${tarefa.id} já registrada no calendário`);
        return true;
      }

      console.log(`📞 Chamando GoogleCalendarService.onTaskCreated...`);
      const success = await GoogleCalendarService.onTaskCreated(tarefa.titulo, tarefa.descricao, tarefa.data_fim);

      if (success) {
        await this.saveRegisteredEvent(tarefa.id, `event_${tarefa.id}_${Date.now()}`);
        console.log(`✅ Tarefa ${tarefa.id} sincronizada com Google Calendar`);
        return true;
      } else {
        console.log(`❌ Falha na sincronização da tarefa ${tarefa.id}`);
      }

      return false;
    } catch (error) {
      console.error('Erro ao sincronizar tarefa individual:', error);
      return false;
    }
  }

  async updateSingleTask(tarefa: {id: number, titulo: string, descricao?: string, data_fim?: string}): Promise<boolean> {
    try {
      const success = await GoogleCalendarService.onTaskEdited(tarefa.titulo, tarefa.descricao, tarefa.data_fim);
      console.log(`📝 Tarefa ${tarefa.id} atualizada no Google Calendar`);
      return success;
    } catch (error) {
      console.error('Erro ao atualizar tarefa individual:', error);
      return false;
    }
  }

  async completeSingleTask(tarefa: {id: number, titulo: string, descricao?: string}): Promise<boolean> {
    try {
      const success = await GoogleCalendarService.onTaskCompleted(tarefa.titulo, tarefa.descricao);
      console.log(`✅ Tarefa ${tarefa.id} marcada como concluída no Google Calendar`);
      return success;
    } catch (error) {
      console.error('Erro ao marcar tarefa como concluída:', error);
      return false;
    }
  }

  async getSyncStats(): Promise<{lastSync: string | null, registeredEvents: number}> {
    try {
      const lastSync = await AsyncStorage.getItem(this.syncKey);
      const events = await this.getRegisteredEvents();

      return {
        lastSync: lastSync ? new Date(lastSync).toLocaleString('pt-BR') : null,
        registeredEvents: Object.keys(events).length
      };
    } catch (error) {
      return {
        lastSync: null,
        registeredEvents: 0
      };
    }
  }
}

export default new CalendarSyncService();
