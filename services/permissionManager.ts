import { PermissionsAndroid, Alert, Platform } from 'react-native';

interface PermissionRequest {
  permission: any; // Usar any para evitar problemas de tipo com PermissionsAndroid
  title: string;
  message: string;
  buttonPositive: string;
}

class PermissionManager {
  private static instance: PermissionManager;
  private isRequestingPermissions = false;

  static getInstance(): PermissionManager {
    if (!PermissionManager.instance) {
      PermissionManager.instance = new PermissionManager();
    }
    return PermissionManager.instance;
  }

  // Lista de permissões necessárias em ordem de prioridade
  private getPermissionsList(): PermissionRequest[] {
    return [
      {
        permission: PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        title: 'Permissão de Microfone',
        message: 'O app precisa acessar o microfone para a funcionalidade de criação de tarefas por voz e filtros por voz.',
        buttonPositive: 'Permitir'
      },
      {
        permission: PermissionsAndroid.PERMISSIONS.READ_CALENDAR,
        title: 'Permissão de Calendário',
        message: 'O app precisa acessar o calendário para sincronizar suas tarefas com eventos.',
        buttonPositive: 'Permitir'
      },
      {
        permission: PermissionsAndroid.PERMISSIONS.WRITE_CALENDAR,
        title: 'Permissão de Calendário (Escrita)',
        message: 'O app precisa criar eventos no calendário para lembrar você das tarefas.',
        buttonPositive: 'Permitir'
      },
      {
        permission: PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        title: 'Permissão de Notificações',
        message: 'O app precisa enviar notificações para lembrar você das tarefas importantes.',
        buttonPositive: 'Permitir'
      },
      {
        permission: PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        title: 'Permissão de Armazenamento',
        message: 'O app precisa acessar arquivos para anexar documentos às tarefas.',
        buttonPositive: 'Permitir'
      }
    ];
  }

  // Verificar se uma permissão específica já foi concedida
  async checkPermission(permission: any): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true; // iOS gerencia diferente
    }

    try {
      const granted = await PermissionsAndroid.check(permission);
      return granted;
    } catch (error) {
      console.error('Erro ao verificar permissão:', permission, error);
      return false;
    }
  }

  // Solicitar uma permissão específica
  async requestSinglePermission(permissionRequest: PermissionRequest): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      console.log('🔑 Solicitando permissão:', permissionRequest.permission);
      
      const granted = await PermissionsAndroid.request(
        permissionRequest.permission,
        {
          title: permissionRequest.title,
          message: permissionRequest.message,
          buttonPositive: permissionRequest.buttonPositive,
          buttonNegative: 'Cancelar',
        }
      );

      const isGranted = granted === PermissionsAndroid.RESULTS.GRANTED;
      console.log(`✅ Permissão ${permissionRequest.permission}:`, isGranted ? 'CONCEDIDA' : 'NEGADA');
      
      return isGranted;
    } catch (error) {
      console.error('❌ Erro ao solicitar permissão:', permissionRequest.permission, error);
      return false;
    }
  }

  // Delay entre solicitações de permissão
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Solicitar todas as permissões sequencialmente com delay
  async requestAllPermissions(delayBetweenRequests: number = 10000): Promise<{granted: string[], denied: string[]}> {
    if (this.isRequestingPermissions) {
      console.log('⚠️ Permissões já estão sendo solicitadas...');
      return { granted: [], denied: [] };
    }

    if (Platform.OS !== 'android') {
      return { granted: [], denied: [] };
    }

    this.isRequestingPermissions = true;
    const granted: string[] = [];
    const denied: string[] = [];
    const permissionsList = this.getPermissionsList();

    try {
      console.log('🚀 Iniciando solicitação sequencial de permissões...');
      
      for (let i = 0; i < permissionsList.length; i++) {
        const permissionRequest = permissionsList[i];
        
        // Verificar se já tem a permissão
        const alreadyGranted = await this.checkPermission(permissionRequest.permission);
        if (alreadyGranted) {
          console.log(`✅ Permissão já concedida: ${permissionRequest.permission}`);
          granted.push(permissionRequest.permission);
          continue;
        }

        // Solicitar a permissão
        const wasGranted = await this.requestSinglePermission(permissionRequest);
        
        if (wasGranted) {
          granted.push(permissionRequest.permission);
        } else {
          denied.push(permissionRequest.permission);
        }

        // Delay antes da próxima permissão (exceto na última)
        if (i < permissionsList.length - 1) {
          console.log(`⏳ Aguardando ${delayBetweenRequests/1000}s antes da próxima permissão...`);
          await this.delay(delayBetweenRequests);
        }
      }

      console.log('✅ Solicitação de permissões concluída:', {
        concedidas: granted.length,
        negadas: denied.length
      });

      return { granted, denied };

    } catch (error) {
      console.error('❌ Erro durante solicitação de permissões:', error);
      return { granted, denied };
    } finally {
      this.isRequestingPermissions = false;
    }
  }

  // Solicitar apenas permissões críticas (microfone + notificações)
  async requestCriticalPermissions(): Promise<boolean> {
    const criticalPermissions = [
      {
        permission: PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        title: 'Permissão de Microfone Necessária',
        message: 'Para usar as funcionalidades de voz (criar tarefas e filtrar por voz), precisamos acessar o microfone.',
        buttonPositive: 'Permitir'
      },
      {
        permission: PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        title: 'Permissão de Notificações',
        message: 'Para lembrar você das tarefas importantes, precisamos enviar notificações.',
        buttonPositive: 'Permitir'
      }
    ];

    console.log('🎯 Solicitando apenas permissões críticas...');
    
    let allGranted = true;
    
    for (let i = 0; i < criticalPermissions.length; i++) {
      const permissionRequest = criticalPermissions[i];
      
      // Verificar se já tem
      const alreadyGranted = await this.checkPermission(permissionRequest.permission);
      if (alreadyGranted) {
        continue;
      }

      // Solicitar
      const wasGranted = await this.requestSinglePermission(permissionRequest);
      if (!wasGranted) {
        allGranted = false;
      }

      // Delay menor para permissões críticas
      if (i < criticalPermissions.length - 1) {
        await this.delay(3000);
      }
    }

    return allGranted;
  }

  // Verificar se todas as permissões críticas estão concedidas
  async hasCriticalPermissions(): Promise<boolean> {
    const microphoneGranted = await this.checkPermission(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
    const notificationsGranted = await this.checkPermission(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    
    return microphoneGranted && notificationsGranted;
  }

  // Mostrar alerta explicativo antes de solicitar permissões
  async checkAllPermissions(): Promise<{granted: string[], denied: PermissionRequest[]}> {
    if (Platform.OS !== 'android') {
      return { granted: [], denied: [] };
    }

    const granted: string[] = [];
    const denied: PermissionRequest[] = [];
    const permissionsList = this.getPermissionsList();

    for (const permissionRequest of permissionsList) {
      const hasPermission = await this.checkPermission(permissionRequest.permission);
      
      if (hasPermission) {
        granted.push(permissionRequest.permission);
      } else {
        denied.push(permissionRequest);
      }
    }

    return { granted, denied };
  }

  async showPermissionExplanation(): Promise<boolean> {
    return new Promise((resolve) => {
      Alert.alert(
        'Permissões Necessárias',
        'O app Noiton precisa de algumas permissões para funcionar corretamente:\n\n' +
        '🎙️ Microfone - Para criar tarefas por voz\n' +
        '🔔 Notificações - Para lembrar das tarefas\n' +
        '📅 Calendário - Para sincronizar eventos\n' +
        '📁 Arquivos - Para anexar documentos\n\n' +
        'Vamos solicitar uma permissão por vez para não sobrecarregar.',
        [
          {
            text: 'Cancelar',
            style: 'cancel',
            onPress: () => resolve(false)
          },
          {
            text: 'Continuar',
            onPress: () => resolve(true)
          }
        ]
      );
    });
  }
}

export default PermissionManager.getInstance();