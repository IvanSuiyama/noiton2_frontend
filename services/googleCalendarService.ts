import { Platform, PermissionsAndroid, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { CalendarModule } = NativeModules;

interface TarefaCalendar {
  id_tarefa: number;
  titulo: string;
  descricao?: string;
  data_fim?: string;
  status: string;
  prioridade: string;
}

class GoogleCalendarService {
  async requestCalendarPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      const readPermission = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_CALENDAR,
        {
          title: 'Permissao de Calendario',
          message: 'O Noiton precisa acessar seu calendario para criar lembretes automaticos das suas tarefas.',
          buttonNeutral: 'Perguntar Depois',
          buttonNegative: 'Nao',
          buttonPositive: 'Permitir',
        }
      );

      const writePermission = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_CALENDAR,
        {
          title: 'Permissao de Calendario',
          message: 'O Noiton precisa acessar seu calendario para criar lembretes automaticos das suas tarefas.',
          buttonNeutral: 'Perguntar Depois',
          buttonNegative: 'Nao',
          buttonPositive: 'Permitir',
        }
      );

      const granted = (
        readPermission === PermissionsAndroid.RESULTS.GRANTED &&
        writePermission === PermissionsAndroid.RESULTS.GRANTED
      );

      if (granted) {
        await AsyncStorage.setItem('calendar_enabled', 'true');
        console.log('Permissoes de calendario concedidas');
      }

      return granted;
    } catch (error) {
      console.error('Erro ao solicitar permissoes:', error);
      return false;
    }
  }

  async hasCalendarPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      const readPermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.READ_CALENDAR
      );
      const writePermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.WRITE_CALENDAR
      );

      return readPermission && writePermission;
    } catch (error) {
      console.error('Erro ao verificar permissoes:', error);
      return false;
    }
  }

  async onTaskCreated(titulo: string, descricao?: string): Promise<boolean> {
    try {
      const calendarEnabled = await AsyncStorage.getItem('calendar_enabled');
      if (calendarEnabled !== 'true') {
        return false;
      }

      const hasPermissions = await this.hasCalendarPermissions();
      if (!hasPermissions) {
        return false;
      }

      const now = new Date();
      const startTime = now.getTime();
      const endTime = now.getTime() + (15 * 60 * 1000);

      const eventTitle = `Nova Tarefa: ${titulo}`;
      const eventDescription = `Tarefa criada no Noiton: ${titulo}\n${descricao || ''}`;

      if (CalendarModule && CalendarModule.createEvent) {
        const success = await CalendarModule.createEvent(
          eventTitle,
          eventDescription,
          startTime,
          endTime,
          ''
        );

        if (success) {
          console.log('Evento de criacao registrado:', eventTitle);
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Erro ao registrar criacao da tarefa:', error);
      return false;
    }
  }

  async onTaskEdited(titulo: string, descricao?: string): Promise<boolean> {
    try {
      const calendarEnabled = await AsyncStorage.getItem('calendar_enabled');
      if (calendarEnabled !== 'true') {
        return false;
      }

      const hasPermissions = await this.hasCalendarPermissions();
      if (!hasPermissions) {
        return false;
      }

      const now = new Date();
      const startTime = now.getTime();
      const endTime = now.getTime() + (15 * 60 * 1000);

      const eventTitle = `Tarefa Editada: ${titulo}`;
      const eventDescription = `Tarefa modificada no Noiton: ${titulo}\n${descricao || ''}`;

      if (CalendarModule && CalendarModule.createEvent) {
        const success = await CalendarModule.createEvent(
          eventTitle,
          eventDescription,
          startTime,
          endTime,
          ''
        );

        if (success) {
          console.log('Evento de edicao registrado:', eventTitle);
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Erro ao registrar edicao da tarefa:', error);
      return false;
    }
  }

  async onTaskCompleted(titulo: string, descricao?: string): Promise<boolean> {
    try {
      const calendarEnabled = await AsyncStorage.getItem('calendar_enabled');
      if (calendarEnabled !== 'true') {
        return false;
      }

      const hasPermissions = await this.hasCalendarPermissions();
      if (!hasPermissions) {
        return false;
      }

      const now = new Date();
      const startTime = now.getTime();
      const endTime = now.getTime() + (15 * 60 * 1000);

      const eventTitle = `Tarefa Concluida: ${titulo}`;
      const eventDescription = `Parabens! Tarefa concluida no Noiton: ${titulo}\n${descricao || ''}`;

      if (CalendarModule && CalendarModule.createEvent) {
        const success = await CalendarModule.createEvent(
          eventTitle,
          eventDescription,
          startTime,
          endTime,
          ''
        );

        if (success) {
          console.log('Evento de conclusao registrado:', eventTitle);
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Erro ao registrar conclusao da tarefa:', error);
      return false;
    }
  }

  async dailyDeadlineCheck(tarefas: TarefaCalendar[]): Promise<void> {
    try {
      const calendarEnabled = await AsyncStorage.getItem('calendar_enabled');
      if (calendarEnabled !== 'true') {
        return;
      }

      const hasPermissions = await this.hasCalendarPermissions();
      if (!hasPermissions) {
        return;
      }

      console.log('Verificacao diaria de prazos iniciada...');

      const today = new Date().toDateString();
      const processedToday = await AsyncStorage.getItem(`processed_deadlines_${today}`) || '[]';
      const processedIds = JSON.parse(processedToday);

      for (const tarefa of tarefas) {
        if (tarefa.status !== 'concluido' && tarefa.data_fim) {
          if (!processedIds.includes(tarefa.id_tarefa)) {
            await this.checkAndCreateDeadlineReminder(tarefa);
            processedIds.push(tarefa.id_tarefa);
          }
        }
      }

      await AsyncStorage.setItem(`processed_deadlines_${today}`, JSON.stringify(processedIds));

      console.log('Verificacao diaria concluida');
    } catch (error) {
      console.error('Erro na verificacao diaria:', error);
    }
  }

  private async checkAndCreateDeadlineReminder(tarefa: TarefaCalendar): Promise<void> {
    try {
      if (!tarefa.data_fim) return;

      const dataFim = new Date(tarefa.data_fim);
      const amanha = new Date();
      amanha.setDate(amanha.getDate() + 1);
      amanha.setHours(0, 0, 0, 0);

      const dataFimNormalized = new Date(dataFim);
      dataFimNormalized.setHours(0, 0, 0, 0);

      if (dataFimNormalized.getTime() === amanha.getTime()) {
        console.log(`Criando lembrete para tarefa ${tarefa.id_tarefa}: ${tarefa.titulo}`);

        const now = new Date();
        const startTime = now.getTime();
        const endTime = now.getTime() + (30 * 60 * 1000);

        const eventTitle = `AVISO: ${tarefa.titulo} vence amanha!`;
        const eventDescription = `A tarefa "${tarefa.titulo}" vence amanha (${dataFim.toLocaleDateString()}).\n\n` +
          `Descricao: ${tarefa.descricao || 'Sem descricao'}\n` +
          `Prioridade: ${tarefa.prioridade}\n` +
          `Status: ${tarefa.status}`;

        if (CalendarModule && CalendarModule.createEvent) {
          const success = await CalendarModule.createEvent(
            eventTitle,
            eventDescription,
            startTime,
            endTime,
            ''
          );

          if (success) {
            console.log('Lembrete de prazo criado:', eventTitle);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao criar lembrete de prazo:', error);
    }
  }

  async initializeAfterLogin(): Promise<boolean> {
    try {
      console.log('Inicializando integracao com calendario...');

      const granted = await this.requestCalendarPermissions();

      if (granted) {
        await this.onTaskCreated(
          'Noiton conectado ao seu calendario!',
          'Agora voce recebera lembretes automaticos das suas tarefas.'
        );

        console.log('Calendario configurado com sucesso!');
        return true;
      } else {
        console.log('Usuario nao concedeu permissoes de calendario');
        return false;
      }
    } catch (error) {
      console.error('Erro na inicializacao do calendario:', error);
      return false;
    }
  }

  async isCalendarEnabled(): Promise<boolean> {
    try {
      const enabled = await AsyncStorage.getItem('calendar_enabled');
      return enabled === 'true';
    } catch (error) {
      return false;
    }
  }
}

export default new GoogleCalendarService();
