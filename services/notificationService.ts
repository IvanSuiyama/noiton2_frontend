import { NativeModules, NativeEventEmitter, DeviceEventEmitter } from 'react-native';

const { NotificationModule } = NativeModules;

interface NotificationData {
  title?: string;
  message?: string;
  taskId?: string;
  type?: 'task_reminder' | 'task_deadline' | 'task_created' | 'general';
}

interface TaskData {
  id_tarefa?: number;
  titulo?: string;
  descricao?: string;
  data_fim?: string;
  status?: string;
  prioridade?: string;
}

interface NotificationResult {
  success: boolean;
  message: string;
  notificationId?: number;
  type?: string;
  taskId?: string;
}

interface PermissionResult {
  enabled: boolean;
  status: 'granted' | 'denied';
}

class NotificationService {
  private eventEmitter: NativeEventEmitter | null;

  constructor() {
    // Verificar se o módulo de notificação existe antes de criar o EventEmitter
    if (NotificationModule && typeof NotificationModule.addListener === 'function') {
      this.eventEmitter = new NativeEventEmitter(NotificationModule);
      this.setupEventListeners();
    } else {
      this.eventEmitter = null;
      // NotificationModule não disponível - funcionalidades de notificação desabilitadas (silencioso)
    }
  }

  /**
   * Configurar listeners para eventos das notificações
   */
  private setupEventListeners() {
    // Listener para quando tarefa é marcada como concluída via notificação
    DeviceEventEmitter.addListener('onTaskCompleteFromNotification', (data) => {
      console.log('📋 Tarefa concluída via notificação:', data.taskId);
      this.handleTaskCompleteFromNotification(data.taskId);
    });

    // Listener para quando tarefa é adiada via notificação
    DeviceEventEmitter.addListener('onTaskSnoozeFromNotification', (data) => {
      console.log('⏰ Tarefa adiada via notificação:', data.taskId);
      this.handleTaskSnoozeFromNotification(data.taskId);
    });
  }

  /**
   * Verificar se as notificações estão habilitadas
   */
  async checkPermission(): Promise<PermissionResult> {
    try {
      if (!NotificationModule || !NotificationModule.checkNotificationPermission) {
        return { enabled: false, status: 'denied' };
      }
      return await NotificationModule.checkNotificationPermission();
    } catch (error) {
      console.error('Erro ao verificar permissões de notificação:', error);
      return { enabled: false, status: 'denied' };
    }
  }

  /**
   * Solicitar permissões de notificação (abre configurações do Android)
   */
  async requestPermission(): Promise<NotificationResult> {
    try {
      if (!NotificationModule || !NotificationModule.requestNotificationPermission) {
        throw new Error('NotificationModule não disponível');
      }
      return await NotificationModule.requestNotificationPermission();
    } catch (error) {
      console.error('Erro ao solicitar permissões de notificação:', error);
      throw error;
    }
  }

  /**
   * Mostrar notificação simples
   */
  async showNotification(title: string, message: string): Promise<NotificationResult> {
    try {
      if (!NotificationModule || !NotificationModule.showNotification) {
        return { success: false, message: 'NotificationModule não disponível' };
      }
      return await NotificationModule.showNotification(title, message);
    } catch (error) {
      console.error('Erro ao mostrar notificação:', error);
      throw error;
    }
  }

  /**
   * Mostrar notificação com dados customizados
   */
  async showNotificationWithData(data: NotificationData): Promise<NotificationResult> {
    try {
      if (!NotificationModule || !NotificationModule.showNotificationWithExtras) {
        return { success: false, message: 'NotificationModule não disponível' };
      }
      return await NotificationModule.showNotificationWithExtras(data);
    } catch (error) {
      console.error('Erro ao mostrar notificação customizada:', error);
      throw error;
    }
  }

  /**
   * Mostrar lembrete de tarefa
   */
  async showTaskReminder(taskData: TaskData): Promise<NotificationResult> {
    try {
      if (!NotificationModule || !NotificationModule.showTaskReminder) {
        return { success: false, message: 'NotificationModule não disponível' };
      }
      console.log('📋 Enviando lembrete de tarefa:', taskData.titulo);
      return await NotificationModule.showTaskReminder(taskData);
    } catch (error) {
      console.error('Erro ao mostrar lembrete de tarefa:', error);
      throw error;
    }
  }

  /**
   * Cancelar notificação específica
   */
  async cancelNotification(notificationId: number): Promise<NotificationResult> {
    try {
      if (!NotificationModule || !NotificationModule.cancelNotification) {
        return { success: false, message: 'NotificationModule não disponível' };
      }
      return await NotificationModule.cancelNotification(notificationId);
    } catch (error) {
      console.error('Erro ao cancelar notificação:', error);
      throw error;
    }
  }

  /**
   * Cancelar todas as notificações
   */
  async cancelAllNotifications(): Promise<NotificationResult> {
    try {
      if (!NotificationModule || !NotificationModule.cancelAllNotifications) {
        return { success: false, message: 'NotificationModule não disponível' };
      }
      return await NotificationModule.cancelAllNotifications();
    } catch (error) {
      console.error('Erro ao cancelar todas as notificações:', error);
      throw error;
    }
  }

  /**
   * Notificar criação de nova tarefa
   */
  async notifyTaskCreated(taskData: TaskData): Promise<NotificationResult> {
    const data: NotificationData = {
      title: '📋 Nova tarefa criada',
      message: `Tarefa "${taskData.titulo}" foi criada com sucesso!`,
      taskId: taskData.id_tarefa?.toString(),
      type: 'task_created'
    };

    return this.showNotificationWithData(data);
  }

  /**
   * Notificar prazo de tarefa próximo
   */
  async notifyTaskDeadline(taskData: TaskData): Promise<NotificationResult> {
    const data: NotificationData = {
      title: '⏰ Prazo se aproximando',
      message: `A tarefa "${taskData.titulo}" vence em breve!`,
      taskId: taskData.id_tarefa?.toString(),
      type: 'task_deadline'
    };

    return this.showNotificationWithData(data);
  }

  /**
   * Notificar tarefa atrasada
   */
  async notifyTaskOverdue(taskData: TaskData): Promise<NotificationResult> {
    const data: NotificationData = {
      title: '🚨 Tarefa atrasada',
      message: `A tarefa "${taskData.titulo}" está atrasada!`,
      taskId: taskData.id_tarefa?.toString(),
      type: 'task_deadline'
    };

    return this.showNotificationWithData(data);
  }

  /**
   * Programar lembrete de tarefa
   */
  async scheduleTaskReminder(taskData: TaskData, minutesBeforeDeadline: number = 30): Promise<void> {
    if (!taskData.data_fim) {
      console.log('⚠️ Tarefa sem prazo, não é possível agendar lembrete');
      return;
    }

    const deadlineDate = new Date(taskData.data_fim);
    const reminderDate = new Date(deadlineDate.getTime() - (minutesBeforeDeadline * 60 * 1000));
    const now = new Date();

    if (reminderDate <= now) {
      console.log('⚠️ Prazo de lembrete já passou, enviando notificação imediatamente');
      await this.showTaskReminder(taskData);
      return;
    }

    const delay = reminderDate.getTime() - now.getTime();
    
    console.log(`⏰ Agendando lembrete para ${reminderDate.toLocaleString()}`);
    
    setTimeout(async () => {
      await this.showTaskReminder(taskData);
    }, delay);
  }

  /**
   * Handler para quando tarefa é concluída via notificação
   */
  private async handleTaskCompleteFromNotification(taskId: number) {
    try {
      // Aqui você pode implementar a lógica para marcar a tarefa como concluída
      // Por exemplo, chamar uma API ou atualizar o estado local
      console.log(`🎉 Processando conclusão da tarefa ${taskId}`);
      
      // Exemplo de como você poderia integrar com seu serviço de tarefas
      // await TarefaService.marcarComoConcluida(taskId);
      
      // Mostrar notificação de confirmação
      await this.showNotification(
        '✅ Tarefa Concluída',
        'A tarefa foi marcada como concluída com sucesso!'
      );
    } catch (error) {
      console.error('Erro ao processar conclusão da tarefa:', error);
    }
  }

  /**
   * Handler para quando tarefa é adiada via notificação
   */
  private async handleTaskSnoozeFromNotification(taskId: number) {
    try {
      console.log(`⏰ Processando adiamento da tarefa ${taskId}`);
      
      // Reagendar notificação para 1 hora depois
      setTimeout(async () => {
        // Aqui você poderia buscar os dados atualizados da tarefa
        await this.showNotification(
          '🔔 Lembrete',
          'Sua tarefa adiada está pronta para ser revisada!'
        );
      }, 60 * 60 * 1000); // 1 hora
      
    } catch (error) {
      console.error('Erro ao processar adiamento da tarefa:', error);
    }
  }

  /**
   * Verificar tarefas próximas do prazo e enviar lembretes
   */
  async checkUpcomingTasks(tasks: TaskData[]): Promise<void> {
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + (60 * 60 * 1000));

    for (const task of tasks) {
      if (task.data_fim && task.status !== 'concluido') {
        const deadline = new Date(task.data_fim);
        
        // Se o prazo está entre agora e 1 hora
        if (deadline > now && deadline <= oneHourFromNow) {
          await this.notifyTaskDeadline(task);
        }
        // Se o prazo já passou
        else if (deadline < now) {
          await this.notifyTaskOverdue(task);
        }
      }
    }
  }

  /**
   * Limpar todos os listeners (chamar quando o componente for desmontado)
   */
  cleanup() {
    DeviceEventEmitter.removeAllListeners('onTaskCompleteFromNotification');
    DeviceEventEmitter.removeAllListeners('onTaskSnoozeFromNotification');
  }
}

export default new NotificationService();
export type { NotificationData, TaskData, NotificationResult, PermissionResult };