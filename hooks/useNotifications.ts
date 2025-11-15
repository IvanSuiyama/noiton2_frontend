import { useState, useEffect, useCallback } from 'react';
import NotificationService, { NotificationResult, PermissionResult, TaskData } from '../services/notificationService';

interface UseNotificationsReturn {
  // Estados
  permissionStatus: PermissionResult | null;
  loading: boolean;
  
  // Funções básicas
  checkPermission: () => Promise<void>;
  requestPermission: () => Promise<void>;
  showNotification: (title: string, message: string) => Promise<NotificationResult>;
  cancelAllNotifications: () => Promise<void>;
  
  // Funções específicas para tarefas
  notifyTaskCreated: (task: TaskData) => Promise<void>;
  notifyTaskDeadline: (task: TaskData) => Promise<void>;
  scheduleTaskReminder: (task: TaskData, minutesBefore?: number) => Promise<void>;
  checkUpcomingTasks: (tasks: TaskData[]) => Promise<void>;
}

export const useNotifications = (): UseNotificationsReturn => {
  const [permissionStatus, setPermissionStatus] = useState<PermissionResult | null>(null);
  const [loading, setLoading] = useState(false);

  /**
   * Verificar permissões de notificação
   */
  const checkPermission = useCallback(async () => {
    try {
      setLoading(true);
      const status = await NotificationService.checkPermission();
      setPermissionStatus(status);
      
      if (!status.enabled) {
        console.warn('⚠️ Notificações não estão habilitadas');
      }
    } catch (error) {
      console.error('Erro ao verificar permissões:', error);
      setPermissionStatus({ enabled: false, status: 'denied' });
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Solicitar permissões de notificação
   */
  const requestPermission = useCallback(async () => {
    try {
      await NotificationService.requestPermission();
      // Após abrir as configurações, verificar novamente as permissões
      setTimeout(async () => {
        await checkPermission();
      }, 1000);
    } catch (error) {
      console.error('Erro ao solicitar permissões:', error);
    }
  }, [checkPermission]);

  /**
   * Mostrar notificação simples
   */
  const showNotification = useCallback(async (title: string, message: string): Promise<NotificationResult> => {
    try {
      if (!permissionStatus?.enabled) {
        console.warn('⚠️ Tentando enviar notificação sem permissão');
      }
      
      return await NotificationService.showNotification(title, message);
    } catch (error) {
      console.error('Erro ao mostrar notificação:', error);
      throw error;
    }
  }, [permissionStatus]);

  /**
   * Cancelar todas as notificações
   */
  const cancelAllNotifications = useCallback(async () => {
    try {
      await NotificationService.cancelAllNotifications();
      console.log('✅ Todas as notificações foram canceladas');
    } catch (error) {
      console.error('Erro ao cancelar notificações:', error);
    }
  }, []);

  /**
   * Notificar criação de tarefa
   */
  const notifyTaskCreated = useCallback(async (task: TaskData) => {
    try {
      if (!permissionStatus?.enabled) {
        return;
      }
      
      await NotificationService.notifyTaskCreated(task);
      console.log('📋 Notificação de tarefa criada enviada:', task.titulo);
    } catch (error) {
      console.error('Erro ao notificar criação de tarefa:', error);
    }
  }, [permissionStatus]);

  /**
   * Notificar prazo de tarefa
   */
  const notifyTaskDeadline = useCallback(async (task: TaskData) => {
    try {
      if (!permissionStatus?.enabled) {
        return;
      }
      
      await NotificationService.notifyTaskDeadline(task);
      console.log('⏰ Notificação de prazo enviada:', task.titulo);
    } catch (error) {
      console.error('Erro ao notificar prazo:', error);
    }
  }, [permissionStatus]);

  /**
   * Agendar lembrete de tarefa
   */
  const scheduleTaskReminder = useCallback(async (task: TaskData, minutesBefore: number = 30) => {
    try {
      if (!permissionStatus?.enabled) {
        return;
      }
      
      await NotificationService.scheduleTaskReminder(task, minutesBefore);
      console.log(`⏰ Lembrete agendado para tarefa: ${task.titulo} (${minutesBefore} min antes)`);
    } catch (error) {
      console.error('Erro ao agendar lembrete:', error);
    }
  }, [permissionStatus]);

  /**
   * Verificar tarefas próximas do prazo
   */
  const checkUpcomingTasks = useCallback(async (tasks: TaskData[]) => {
    try {
      if (!permissionStatus?.enabled) {
        return;
      }
      
      await NotificationService.checkUpcomingTasks(tasks);
      console.log('🔍 Verificação de tarefas próximas concluída');
    } catch (error) {
      console.error('Erro ao verificar tarefas próximas:', error);
    }
  }, [permissionStatus]);

  /**
   * Verificar permissões ao montar o hook
   */
  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  /**
   * Cleanup ao desmontar
   */
  useEffect(() => {
    return () => {
      NotificationService.cleanup();
    };
  }, []);

  return {
    // Estados
    permissionStatus,
    loading,
    
    // Funções básicas
    checkPermission,
    requestPermission,
    showNotification,
    cancelAllNotifications,
    
    // Funções específicas para tarefas
    notifyTaskCreated,
    notifyTaskDeadline,
    scheduleTaskReminder,
    checkUpcomingTasks,
  };
};

export default useNotifications;