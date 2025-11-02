import { Platform, PermissionsAndroid, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { CalendarModule } = NativeModules;

interface TarefaCalendar {
  id_tarefa: number;
  titulo: string;
  descricao?: string;
  data_fim?: string;
  status: string;
  prioridade?: string;
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

  async onTaskCreated(titulo: string, descricao?: string, dataFim?: string): Promise<boolean> {
    try {
      console.log('🔍 DEBUG: Iniciando onTaskCreated para:', titulo);
      
      const calendarEnabled = await AsyncStorage.getItem('calendar_enabled');
      console.log('🔍 DEBUG: calendar_enabled valor:', calendarEnabled);
      
      if (calendarEnabled !== 'true') {
        console.log('❌ Google Calendar não está habilitado - valor atual:', calendarEnabled);
        return false;
      }

      const hasPermissions = await this.hasCalendarPermissions();
      console.log('🔍 DEBUG: hasPermissions resultado:', hasPermissions);
      
      if (!hasPermissions) {
        console.log('❌ Permissões do Google Calendar não concedidas');
        return false;
      }

      console.log('📅 Criando evento no Google Calendar para tarefa:', titulo);

      // Se tem data_fim, criar evento na data da tarefa
      let startTime: number;
      let endTime: number;

      if (dataFim) {
        const dataFimDate = new Date(dataFim);
        // Criar evento no dia da tarefa às 9:00
        dataFimDate.setHours(9, 0, 0, 0);
        startTime = dataFimDate.getTime();
        endTime = dataFimDate.getTime() + (60 * 60 * 1000); // 1 hora de duração
        
        console.log('📅 Evento será criado para:', dataFimDate.toLocaleString('pt-BR'));
      } else {
        // Sem data_fim, criar evento para agora (notificação)
        const now = new Date();
        startTime = now.getTime();
        endTime = now.getTime() + (15 * 60 * 1000);
        
        console.log('📅 Evento será criado para agora (notificação)');
      }

      const eventTitle = dataFim ? `📋 ${titulo}` : `✨ Nova Tarefa: ${titulo}`;
      const eventDescription = dataFim 
        ? `Prazo da tarefa: ${new Date(dataFim).toLocaleDateString('pt-BR')}\n\n${descricao || 'Sem descrição'}\n\n📱 Criado no Noiton`
        : `Tarefa criada no Noiton: ${titulo}\n${descricao || ''}`;

      console.log('🔍 DEBUG: CalendarModule disponível:', !!CalendarModule);
      console.log('🔍 DEBUG: createEvent disponível:', !!(CalendarModule && CalendarModule.createEvent));
      
      if (CalendarModule && CalendarModule.createEvent) {
        console.log('🔄 Chamando CalendarModule.createEvent...');
        console.log('📝 Parâmetros:', {
          title: eventTitle,
          description: eventDescription.substring(0, 50) + '...',
          startTime: new Date(startTime).toLocaleString('pt-BR'),
          endTime: new Date(endTime).toLocaleString('pt-BR')
        });
        
        try {
          const success = await CalendarModule.createEvent(
            eventTitle,
            eventDescription,
            startTime,
            endTime,
            ''
          );

          console.log('🔍 DEBUG: Resultado do CalendarModule:', success);

          if (success) {
            console.log('✅ Evento criado no Google Calendar:', eventTitle);
            return true;
          } else {
            console.log('❌ Falha ao criar evento no Google Calendar - success=false');
          }
        } catch (moduleError) {
          console.error('❌ Erro ao chamar CalendarModule:', moduleError);
        }
      } else {
        console.log('❌ CalendarModule não disponível');
      }

      return false;
    } catch (error) {
      console.error('Erro ao registrar criacao da tarefa:', error);
      return false;
    }
  }

  async onTaskEdited(titulo: string, descricao?: string, dataFim?: string): Promise<boolean> {
    try {
      const calendarEnabled = await AsyncStorage.getItem('calendar_enabled');
      if (calendarEnabled !== 'true') {
        console.log('❌ Google Calendar não está habilitado');
        return false;
      }

      const hasPermissions = await this.hasCalendarPermissions();
      if (!hasPermissions) {
        console.log('❌ Permissões do Google Calendar não concedidas');
        return false;
      }

      console.log('📝 Registrando edição da tarefa no Google Calendar:', titulo);

      const now = new Date();
      const startTime = now.getTime();
      const endTime = now.getTime() + (15 * 60 * 1000);

      const eventTitle = `📝 Tarefa Editada: ${titulo}`;
      const eventDescription = `Tarefa modificada no Noiton: ${titulo}\n\n${descricao || 'Sem descrição'}\n\n` +
        (dataFim ? `📅 Prazo: ${new Date(dataFim).toLocaleDateString('pt-BR')}\n` : '') +
        `⏰ Editada em: ${now.toLocaleString('pt-BR')}\n\n📱 Noiton`;

      if (CalendarModule && CalendarModule.createEvent) {
        try {
          console.log('✏️ Criando evento de edição:', eventTitle);
          
          const success = await CalendarModule.createEvent(
            eventTitle,
            eventDescription,
            startTime,
            endTime,
            ''
          );

          if (success) {
            console.log('✅ Evento de edicao registrado no Google Calendar:', eventTitle);
            return true;
          } else {
            console.log('❌ Falha ao registrar evento de edicao:', eventTitle);
          }
        } catch (moduleError) {
          console.error('❌ Erro no CalendarModule (edicao):', moduleError);
        }
      } else {
        console.log('⚠️ CalendarModule não disponível para edição');
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
        try {
          console.log('✅ Criando evento de conclusão:', eventTitle);
          
          const success = await CalendarModule.createEvent(
            eventTitle,
            eventDescription,
            startTime,
            endTime,
            ''
          );

          if (success) {
            console.log('✅ Evento de conclusão registrado no Google Calendar:', eventTitle);
            return true;
          } else {
            console.log('❌ Falha ao registrar evento de conclusão:', eventTitle);
          }
        } catch (moduleError) {
          console.error('❌ Erro no CalendarModule (conclusão):', moduleError);
        }
      } else {
        console.log('⚠️ CalendarModule não disponível para conclusão');
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
      if (!tarefa.data_fim) {
        return;
      }

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
          `Prioridade: ${tarefa.prioridade || 'Normal'}\n` +
          `Status: ${tarefa.status}`;

        if (CalendarModule && CalendarModule.createEvent) {
          try {
            const success = await CalendarModule.createEvent(
              eventTitle,
              eventDescription,
              startTime,
              endTime,
              ''
            );

            if (success) {
              console.log('✅ Lembrete de prazo criado:', eventTitle);
            } else {
              console.log('❌ Falha ao criar lembrete de prazo:', eventTitle);
            }
          } catch (moduleError) {
            console.error('❌ Erro no CalendarModule:', moduleError);
          }
        } else {
          console.log('⚠️ CalendarModule não disponível');
        }
      }
    } catch (error) {
      console.error('Erro ao criar lembrete de prazo:', error);
    }
  }

  async initializeAfterLogin(): Promise<boolean> {
    try {
      console.log('📅 Inicializando integração com Google Calendar...');

      const granted = await this.requestCalendarPermissions();

      if (granted) {
        console.log('✅ Permissões concedidas - habilitando Google Calendar...');
        
        // Habilitar o calendário
        await AsyncStorage.setItem('calendar_enabled', 'true');
        
        // Criar evento de boas-vindas
        const welcomeSuccess = await this.onTaskCreated(
          'Noiton conectado ao seu calendario!',
          'Agora voce recebera lembretes automaticos das suas tarefas e notificacoes de prazos.'
        );

        if (welcomeSuccess) {
          console.log('✅ Evento de boas-vindas criado no Google Calendar');
        } else {
          console.log('⚠️ Não foi possível criar evento de boas-vindas');
        }

        console.log('🎉 Google Calendar configurado com sucesso!');
        return true;
      } else {
        console.log('❌ Usuário não concedeu permissões de calendário');
        return false;
      }
    } catch (error) {
      console.error('❌ Erro na inicialização do Google Calendar:', error);
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
