import { PermissionsAndroid, Platform, Alert, Linking } from 'react-native';
import { apiCall } from './authService';

// Interface simples para arquivo selecionado
export interface ArquivoSelecionado {
  uri: string;
  name: string;
  type: string;
  size?: number;
}

export interface AnexoTarefa {
  id_anexo: number;
  id_tarefa: number;
  tipo_arquivo: 'pdf' | 'imagem';
  nome_arquivo: string;
  nome_original: string;
  tamanho_arquivo: number;
  caminho_arquivo: string;
  data_upload: string;
  data_atualizacao: string;
}

class AnexoService {
  private hasStoragePermission: boolean = false;

  /**
   * Solicita todas as permissões necessárias
   */
  async requestAllPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }

    try {
      const permissions = [
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      ];

      // Para Android 13+ (API 33+), usar as novas permissões
      if (Platform.Version >= 33) {
        permissions.push(
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO
        );
      }

      const results = await PermissionsAndroid.requestMultiple(permissions);

      // Verificar se as permissões essenciais foram concedidas
      const storageGranted = 
        results[PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE] === PermissionsAndroid.RESULTS.GRANTED ||
        results[PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES] === PermissionsAndroid.RESULTS.GRANTED;

      this.hasStoragePermission = storageGranted;
      return storageGranted;
    } catch (error) {
      console.error('Erro ao solicitar permissões:', error);
      return false;
    }
  }

  /**
   * Solicita permissões de forma amigável
   */
  async requestPermissionsWithUserFeedback(): Promise<boolean> {
    return new Promise((resolve) => {
      Alert.alert(
        '📁 Acesso a Arquivos',
        'Para anexar documentos e imagens às tarefas, o app precisa acessar seus arquivos.\n\nDeseja permitir?',
        [
          {
            text: 'Agora não',
            onPress: () => resolve(false),
            style: 'cancel',
          },
          {
            text: 'Permitir',
            onPress: async () => {
              const granted = await this.requestAllPermissions();
              resolve(granted);
            },
          },
        ]
      );
    });
  }

  /**
   * Verifica se tem permissões
   */
  async checkPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }

    try {
      const storagePermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
      );
      
      // Para Android 13+
      let mediaPermission = true;
      if (Platform.Version >= 33) {
        mediaPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
        );
      }

      const hasPermissions = storagePermission || mediaPermission;
      this.hasStoragePermission = hasPermissions;
      return hasPermissions;
    } catch (error) {
      console.error('Erro ao verificar permissões:', error);
      return false;
    }
  }

  /**
   * Abrir seletor de arquivos usando Intent do Android
   */
  async selecionarArquivo(tipo: 'imagem' | 'pdf'): Promise<ArquivoSelecionado | null> {
    if (!this.hasStoragePermission) {
      const granted = await this.requestPermissionsWithUserFeedback();
      if (!granted) {
        Alert.alert('Permissão Negada', 'Não é possível selecionar arquivos sem permissão.');
        return null;
      }
    }

    // Por enquanto, mostrar alerta explicativo
    // Em uma implementação real, usaríamos Intent nativo ou biblioteca externa
    Alert.alert(
      tipo === 'imagem' ? 'Selecionar Imagem' : 'Selecionar PDF',
      `Funcionalidade de seleção de ${tipo} será implementada com biblioteca específica.\n\nPor enquanto, você pode usar a funcionalidade de upload manual.`,
      [{ text: 'OK' }]
    );

    return null;
  }

  /**
   * Validar tamanho do arquivo
   */
  validarTamanho(tamanho: number | undefined, tipo: 'pdf' | 'imagem'): boolean {
    if (!tamanho) {
      return false;
    }

    const maxSizePDF = 10 * 1024 * 1024; // 10MB
    const maxSizeImagem = 15 * 1024 * 1024; // 15MB

    if (tipo === 'pdf') {
      return tamanho <= maxSizePDF;
    }
    
    return tamanho <= maxSizeImagem;
  }

  /**
   * Fazer upload de anexo (versão simplificada)
   */
  async uploadAnexo(idTarefa: number, arquivo: ArquivoSelecionado, tipo: 'pdf' | 'imagem'): Promise<boolean> {
    try {
      // Validar tamanho
      if (!this.validarTamanho(arquivo.size, tipo)) {
        const maxSize = tipo === 'pdf' ? '10MB' : '15MB';
        Alert.alert('Arquivo muito grande', `O tamanho máximo para ${tipo} é ${maxSize}.`);
        return false;
      }

      const formData = new FormData();
      formData.append('arquivo', {
        uri: arquivo.uri,
        type: arquivo.type,
        name: arquivo.name,
      } as any);

      await apiCall(`/anexos/tarefa/${idTarefa}/anexo`, 'POST', formData);

      return true;
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      Alert.alert('Erro', 'Erro ao enviar arquivo. Tente novamente.');
      return false;
    }
  }

  /**
   * Listar anexos de uma tarefa
   */
  async listarAnexosTarefa(idTarefa: number): Promise<AnexoTarefa[]> {
    try {
      const anexos = await apiCall(`/anexos/tarefa/${idTarefa}/anexos`, 'GET');
      return anexos || [];
    } catch (error) {
      console.error('Erro ao listar anexos:', error);
      return [];
    }
  }

  /**
   * Baixar anexo - abre no navegador ou app externo
   */
  async baixarAnexo(idAnexo: number): Promise<boolean> {
    try {
      // Construir URL de download
      const downloadUrl = `/anexos/anexo/${idAnexo}/download`;
      
      // Tentar abrir URL no navegador/app externo
      const supported = await Linking.canOpenURL(downloadUrl);
      if (supported) {
        await Linking.openURL(downloadUrl);
        return true;
      } else {
        Alert.alert('Erro', 'Não é possível abrir o arquivo.');
        return false;
      }
    } catch (error) {
      console.error('Erro ao baixar anexo:', error);
      Alert.alert('Erro', 'Erro ao baixar arquivo.');
      return false;
    }
  }

  /**
   * Deletar anexo
   */
  async deletarAnexo(idAnexo: number): Promise<boolean> {
    try {
      await apiCall(`/anexos/anexo/${idAnexo}`, 'DELETE');
      return true;
    } catch (error) {
      console.error('Erro ao deletar anexo:', error);
      Alert.alert('Erro', 'Erro ao remover arquivo.');
      return false;
    }
  }

  /**
   * Formatar tamanho do arquivo para exibição
   */
  formatarTamanho(bytes: number): string {
    if (bytes === 0) {
      return '0 Bytes';
    }

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Abrir configurações do app para permissões
   */
  async abrirConfiguracoes(): Promise<void> {
    try {
      await Linking.openSettings();
    } catch (error) {
      console.error('Erro ao abrir configurações:', error);
      Alert.alert('Erro', 'Não foi possível abrir as configurações.');
    }
  }
}

export default new AnexoService();