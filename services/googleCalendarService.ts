import { PermissionsAndroid, Platform, Alert } from 'react-native';
import { NativeModules } from 'react-native';

export interface CalendarEvent {
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  location?: string;
}

class GoogleCalendarService {
  private hasPermission: boolean = false;

  /**
   * Solicita permissões do calendário
   */
  async requestCalendarPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }

    try {
      const readPermission = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_CALENDAR,
        {
          title: 'Permissão de Calendário',
          message: 'O app precisa acessar seu calendário para criar lembretes de tarefas.',
          buttonNeutral: 'Perguntar depois',
          buttonNegative: 'Cancelar',
          buttonPositive: 'OK',
        }
      );

      const writePermission = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_CALENDAR,
        {
          title: 'Permissão de Calendário',
          message: 'O app precisa criar eventos no seu calendário para lembrá-lo das tarefas.',
          buttonNeutral: 'Perguntar depois',
          buttonNegative: 'Cancelar',
          buttonPositive: 'OK',
        }
      );

      const hasPermissions = 
        readPermission === PermissionsAndroid.RESULTS.GRANTED &&
        writePermission === PermissionsAndroid.RESULTS.GRANTED;

      this.hasPermission = hasPermissions;
      return hasPermissions;
    } catch (error) {
      console.error('Erro ao solicitar permissões do calendário:', error);
      return false;
    }
  }

  /**
   * Verifica se já tem permissões do calendário
   */
  async checkCalendarPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }

    try {
      const readPermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.READ_CALENDAR
      );
      const writePermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.WRITE_CALENDAR
      );

      const hasPermissions = readPermission && writePermission;
      this.hasPermission = hasPermissions;
      return hasPermissions;
    } catch (error) {
      console.error('Erro ao verificar permissões do calendário:', error);
      return false;
    }
  }

  /**
   * Cria um evento no calendário do Google usando Intent do Android
   */
  async createCalendarEvent(event: CalendarEvent): Promise<boolean> {
    if (!this.hasPermission) {
      const granted = await this.requestCalendarPermissions();
      if (!granted) {
        Alert.alert(
          'Permissão Negada',
          'Não foi possível criar o evento no calendário. Permissão necessária.'
        );
        return false;
      }
    }

    try {
      // Tentar usar o módulo nativo personalizado primeiro
      const { CalendarModule } = NativeModules;
      
      if (CalendarModule) {
        try {
          const success = await CalendarModule.createEvent(
            event.title,
            event.description || '',
            event.startDate.getTime(),
            event.endDate.getTime(),
            event.location || ''
          );
          
          if (success) {
            console.log('Evento criado com sucesso usando módulo nativo');
            return true;
          }
        } catch (nativeError) {
          console.log('Erro no módulo nativo, tentando fallback:', nativeError);
        }
      }

      // Fallback usando Intent genérico
      return await this.createEventWithIntent(event);
    } catch (error) {
      console.error('Erro ao criar evento no calendário:', error);
      return await this.createEventWithIntent(event);
    }
  }

  /**
   * Fallback: Cria evento usando Intent do Android
   */
  private async createEventWithIntent(event: CalendarEvent): Promise<boolean> {
    try {
      const { Linking } = require('react-native');
      
      const startTime = event.startDate.getTime();
      const endTime = event.endDate.getTime();
      
      // URL para abrir o app de calendário com dados pré-preenchidos
      const calendarUrl = `content://com.android.calendar/events?` +
        `title=${encodeURIComponent(event.title)}&` +
        `description=${encodeURIComponent(event.description || '')}&` +
        `beginTime=${startTime}&` +
        `endTime=${endTime}&` +
        `hasAlarm=1&` +
        `alarmTime=1`;

      // Tenta abrir o app de calendário
      const canOpen = await Linking.canOpenURL('content://com.android.calendar/events');
      
      if (canOpen) {
        await Linking.openURL(calendarUrl);
        return true;
      } else {
        // Fallback: usar intent genérico
        const intentUrl = `intent://calendar.google.com/calendar/event?` +
          `action=TEMPLATE&` +
          `text=${encodeURIComponent(event.title)}&` +
          `details=${encodeURIComponent(event.description || '')}&` +
          `dates=${this.formatDateForGoogle(event.startDate)}/${this.formatDateForGoogle(event.endDate)}#Intent;` +
          `scheme=https;` +
          `package=com.google.android.calendar;` +
          `end`;

        await Linking.openURL(intentUrl);
        return true;
      }
    } catch (error) {
      console.error('Erro ao usar Intent para calendário:', error);
      Alert.alert(
        'Erro',
        'Não foi possível abrir o calendário. Verifique se você tem um app de calendário instalado.'
      );
      return false;
    }
  }

  /**
   * Formata data para o Google Calendar
   */
  private formatDateForGoogle(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }

  /**
   * Cria evento para tarefa criada
   */
  async createTaskCreatedEvent(taskTitle: string): Promise<boolean> {
    const now = new Date();
    const endTime = new Date(now.getTime() + (30 * 60 * 1000)); // 30 minutos

    const event: CalendarEvent = {
      title: `✅ Tarefa Criada: ${taskTitle}`,
      description: `A tarefa "${taskTitle}" foi criada no seu app de gerenciamento de tarefas.`,
      startDate: now,
      endDate: endTime,
    };

    return await this.createCalendarEvent(event);
  }

  /**
   * Cria evento para prazo da tarefa
   */
  async createTaskDeadlineEvent(taskTitle: string, deadlineDate: Date): Promise<boolean> {
    // Criar lembrete 1 dia antes do prazo
    const reminderDate = new Date(deadlineDate.getTime() - (24 * 60 * 60 * 1000));
    const reminderEndDate = new Date(reminderDate.getTime() + (30 * 60 * 1000)); // 30 minutos

    const reminderEvent: CalendarEvent = {
      title: `⏰ Lembrete: ${taskTitle}`,
      description: `A tarefa "${taskTitle}" vence amanhã (${deadlineDate.toLocaleDateString('pt-BR')}).`,
      startDate: reminderDate,
      endDate: reminderEndDate,
    };

    // Criar evento no dia do prazo
    const deadlineStartDate = new Date(deadlineDate);
    deadlineStartDate.setHours(9, 0, 0, 0); // 9:00 AM
    const deadlineEndDate = new Date(deadlineStartDate.getTime() + (60 * 60 * 1000)); // 1 hora

    const deadlineEvent: CalendarEvent = {
      title: `📅 Prazo: ${taskTitle}`,
      description: `Hoje é o prazo final para a tarefa "${taskTitle}".`,
      startDate: deadlineStartDate,
      endDate: deadlineEndDate,
    };

    // Criar ambos os eventos
    const reminderSuccess = await this.createCalendarEvent(reminderEvent);
    const deadlineSuccess = await this.createCalendarEvent(deadlineEvent);

    return reminderSuccess || deadlineSuccess;
  }

  /**
   * Cria evento para tarefa recorrente
   */
  async createRecurringTaskEvent(
    taskTitle: string, 
    recurrence: 'diaria' | 'semanal' | 'mensal'
  ): Promise<boolean> {
    const now = new Date();
    const endTime = new Date(now.getTime() + (30 * 60 * 1000)); // 30 minutos

    let description = `Tarefa recorrente "${taskTitle}" `;
    switch (recurrence) {
      case 'diaria':
        description += 'configurada para repetir diariamente.';
        break;
      case 'semanal':
        description += 'configurada para repetir semanalmente.';
        break;
      case 'mensal':
        description += 'configurada para repetir mensalmente.';
        break;
    }

    const event: CalendarEvent = {
      title: `🔄 Tarefa Recorrente: ${taskTitle}`,
      description: description,
      startDate: now,
      endDate: endTime,
    };

    return await this.createCalendarEvent(event);
  }

  /**
   * Solicita permissões de forma amigável
   */
  async requestPermissionsWithUserFeedback(): Promise<boolean> {
    const hasPermissions = await this.checkCalendarPermissions();
    
    if (hasPermissions) {
      return true;
    }

    return new Promise((resolve) => {
      Alert.alert(
        '📅 Integração com Calendário',
        'Para uma melhor experiência, o app pode criar lembretes das suas tarefas diretamente no Google Calendar.\n\nDeseja permitir?',
        [
          {
            text: 'Agora não',
            onPress: () => resolve(false),
            style: 'cancel',
          },
          {
            text: 'Permitir',
            onPress: async () => {
              const granted = await this.requestCalendarPermissions();
              resolve(granted);
            },
          },
        ]
      );
    });
  }

  /**
   * Abre o app de calendário
   */
  async openCalendarApp(): Promise<boolean> {
    try {
      const { CalendarModule } = NativeModules;
      
      if (CalendarModule) {
        try {
          const success = await CalendarModule.openCalendarApp();
          return success;
        } catch (nativeError) {
          console.log('Erro ao abrir calendário pelo módulo nativo:', nativeError);
        }
      }

      // Fallback usando Intent
      const { Linking } = require('react-native');
      
      // Tentar abrir Google Calendar
      const googleCalendarUrl = 'content://com.android.calendar/time';
      const canOpen = await Linking.canOpenURL(googleCalendarUrl);
      
      if (canOpen) {
        await Linking.openURL(googleCalendarUrl);
        return true;
      } else {
        // Tentar Intent genérico para qualquer app de calendário
        const intentUrl = 'intent://calendar.google.com#Intent;scheme=https;package=com.google.android.calendar;end';
        await Linking.openURL(intentUrl);
        return true;
      }
    } catch (error) {
      console.error('Erro ao abrir app de calendário:', error);
      Alert.alert(
        'Erro',
        'Não foi possível abrir o calendário. Verifique se você tem um app de calendário instalado.'
      );
      return false;
    }
  }
}

export default new GoogleCalendarService();