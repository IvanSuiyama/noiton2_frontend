import { PermissionsAndroid, Platform, Alert, Linking, NativeModules } from 'react-native';
import { apiCall } from './authService';

const { FilePickerModule } = NativeModules;

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

  /** Solicita todas as permissões necessárias */
  async requestAllPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      const permissions = [
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      ];

      if (Platform.Version >= 33) {
        permissions.push(
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO
        );
      }

      const results = await PermissionsAndroid.requestMultiple(permissions);

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

  /** Solicita permissões com feedback ao usuário */
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

  /** Verifica se o app já tem permissões */
  async checkPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      const storagePermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
      );

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
   * Selecionar arquivo (imagem ou PDF) usando módulo nativo
   */
  async selecionarArquivo(tipo: 'imagem' | 'pdf'): Promise<ArquivoSelecionado | null> {
    // Verificar se o módulo nativo está disponível
    if (!FilePickerModule) {
      Alert.alert('Erro', 'Módulo de seleção de arquivos não está disponível.');
      return null;
    }

    // Verifica permissões
    if (!this.hasStoragePermission) {
      const granted = await this.requestPermissionsWithUserFeedback();
      if (!granted) {
        Alert.alert('Permissão Negada', 'Não é possível selecionar arquivos sem permissão.');
        return null;
      }
    }

    try {
      console.log('📂 Iniciando seleção de arquivo tipo:', tipo);
      console.log('📂 Parâmetro para FilePickerModule:', tipo === 'imagem' ? 'image' : 'pdf');
      
      const fileInfo = await FilePickerModule.pickFile(tipo === 'imagem' ? 'image' : 'pdf');
      
      console.log('📂 Resultado do FilePickerModule:', fileInfo);
      console.log('📂 Tipo do resultado:', typeof fileInfo);

      // Verificar se não há resultado
      if (!fileInfo) {
        console.log('📂 Nenhum arquivo selecionado');
        return null;
      }

      // Lidar com retorno como string (URI apenas) ou objeto
      let uri: string;
      let name: string;
      let size: number;

      if (typeof fileInfo === 'string') {
        // Módulo está retornando apenas URI como string
        console.log('📂 Módulo retornou URI como string:', fileInfo);
        uri = fileInfo;
        name = `arquivo_${tipo}_${Date.now()}`;
        size = 0; // Não temos o tamanho
      } else if (fileInfo && typeof fileInfo === 'object') {
        // Módulo retornou objeto completo
        console.log('📂 Módulo retornou objeto:', fileInfo);
        uri = fileInfo.uri;
        name = fileInfo.name || `arquivo_${tipo}_${Date.now()}`;
        size = fileInfo.size || 0;
      } else {
        console.log('📂 Formato de retorno inválido');
        return null;
      }

      if (!uri) {
        console.log('📂 URI não encontrada no resultado');
        return null;
      }

      // Definir tipo MIME mais específico para imagens
      let mimeType = 'application/pdf';
      if (tipo === 'imagem') {
        // Tentar inferir tipo baseado no nome ou usar genérico
        const extensao = name.toLowerCase().split('.').pop();
        switch (extensao) {
          case 'jpg':
          case 'jpeg':
            mimeType = 'image/jpeg';
            break;
          case 'png':
            mimeType = 'image/png';
            break;
          case 'gif':
            mimeType = 'image/gif';
            break;
          case 'webp':
            mimeType = 'image/webp';
            break;
          default:
            mimeType = 'image/jpeg'; // Padrão para imagens
        }
      }

      const arquivoSelecionado = {
        uri,
        name,
        type: mimeType,
        size,
      };
      
      console.log('📂 Arquivo processado:', arquivoSelecionado);
      return arquivoSelecionado;
    } catch (error: any) {
      console.error('❌ Erro ao selecionar arquivo:', error);
      console.error('❌ Tipo do erro:', typeof error);
      console.error('❌ Mensagem do erro:', error?.message);
      console.error('❌ Stack do erro:', error?.stack);
      
      // Tratar diferentes tipos de erro
      if (error?.message === 'PICKER_CANCELLED') {
        console.log('📂 Usuário cancelou a seleção');
        return null; // Usuário cancelou, não mostrar erro
      }
      
      Alert.alert('Erro', 'Erro ao selecionar arquivo. Tente novamente.');
      return null;
    }
  }

  /** Validar tamanho do arquivo */
  validarTamanho(tamanho: number | undefined, tipo: 'pdf' | 'imagem'): boolean {
    if (!tamanho) {
      return false;
    }

    const maxSizePDF = 10 * 1024 * 1024; // 10MB
    const maxSizeImagem = 15 * 1024 * 1024; // 15MB

    return tipo === 'pdf' ? tamanho <= maxSizePDF : tamanho <= maxSizeImagem;
  }

  /** Fazer upload de anexo */
  async uploadAnexo(idTarefa: number, arquivo: ArquivoSelecionado, tipo: 'pdf' | 'imagem'): Promise<boolean> {
    try {
      // Log de debug para verificar informações do arquivo
      console.log('Arquivo selecionado:', {
        nome: arquivo.name,
        tamanho: arquivo.size,
        tamanhoFormatado: this.formatarTamanho(arquivo.size || 0),
        tipo: tipo,
        uri: arquivo.uri
      });

      // Validação específica para imagens
      if (tipo === 'imagem') {
        // Verificar se a URI é válida
        if (!arquivo.uri || !arquivo.uri.trim()) {
          Alert.alert('Erro', 'URI da imagem inválida.');
          return false;
        }
        
        // Para URIs content://, garantir que não há caracteres especiais problemáticos
        if (arquivo.uri.startsWith('content://')) {
          console.log('📱 URI tipo content:// detectada para imagem');
        } else if (arquivo.uri.startsWith('file://')) {
          console.log('📱 URI tipo file:// detectada para imagem');
        } else {
          console.log('⚠️ URI de tipo desconhecido:', arquivo.uri.substring(0, 50));
        }
      }

      if (!this.validarTamanho(arquivo.size, tipo)) {
        const maxSize = tipo === 'pdf' ? '10MB' : '15MB';
        const tamanhoAtual = this.formatarTamanho(arquivo.size || 0);
        Alert.alert(
          'Arquivo muito grande', 
          `Arquivo: ${tamanhoAtual}\nTamanho máximo para ${tipo}: ${maxSize}`
        );
        return false;
      }

      const formData = new FormData();
      
      // Para imagens, garantir que o tipo MIME esteja correto
      let mimeType = arquivo.type;
      if (tipo === 'imagem' && !mimeType.startsWith('image/')) {
        // Inferir tipo baseado na extensão do nome
        const extensao = arquivo.name.toLowerCase().split('.').pop();
        switch (extensao) {
          case 'jpg':
          case 'jpeg':
            mimeType = 'image/jpeg';
            break;
          case 'png':
            mimeType = 'image/png';
            break;
          case 'gif':
            mimeType = 'image/gif';
            break;
          case 'webp':
            mimeType = 'image/webp';
            break;
          default:
            mimeType = 'image/jpeg';
        }
      }
      
      // Preparar objeto do arquivo com fallbacks
      const fileObject: any = {
        uri: arquivo.uri,
        type: mimeType,
        name: arquivo.name,
      };

      // Para imagens, adicionar informações extras se disponíveis
      if (tipo === 'imagem' && arquivo.size) {
        fileObject.size = arquivo.size;
      }

      // CORREÇÃO ESPECÍFICA PARA IMAGENS COM URI content://
      if (tipo === 'imagem' && arquivo.uri.startsWith('content://')) {
        console.log('🔧 Copiando arquivo content:// para temporário');
        
        try {
          // Usar o novo método nativo para copiar o arquivo
          const tempFile = await FilePickerModule.copyToTempFile(arquivo.uri);
          console.log('✅ Arquivo copiado para temp:', tempFile);
          
          // Atualizar o objeto do arquivo com a nova URI
          fileObject.uri = tempFile.uri;
          fileObject.name = tempFile.name;
          if (tempFile.size) {
            fileObject.size = tempFile.size;
          }
          
          console.log('📱 Usando arquivo temporário:', fileObject.uri);
        } catch (tempError) {
          console.log('⚠️ Erro ao copiar para temp, tentando decodificação:', tempError);
          
          // Fallback: Tentar decodificar a URI
          try {
            let processedUri = arquivo.uri;
            
            // Se a URI contém %3A, decodificar
            if (processedUri.includes('%3A')) {
              processedUri = decodeURIComponent(processedUri);
              console.log('📱 URI decodificada:', processedUri);
            }
            
            fileObject.uri = processedUri;
          } catch (decodeError) {
            console.log('⚠️ Erro ao decodificar URI, usando original');
          }
        }
      }

      console.log('📎 Objeto do arquivo para FormData:', fileObject);
      formData.append('arquivo', fileObject);

      console.log('📤 Fazendo upload para:', `/tarefa/${idTarefa}/anexo`);
      console.log('📤 FormData preparado com arquivo:', fileObject.name);
      console.log('📤 MIME type final:', mimeType);
      console.log('📤 URI sendo enviada:', fileObject.uri);
      
      // Para imagens, usar fetch direto devido a problemas com content:// URIs
      let response;
      if (tipo === 'imagem') {
        console.log('🖼️ Upload de imagem - usando fetch direto');
        try {
          response = await this.uploadImageDirect(idTarefa, formData);
        } catch (xhrError) {
          console.log('⚠️ XHR falhou, tentando com fetch...');
          // Fallback: usar apiCall normal
          response = await apiCall(`/tarefa/${idTarefa}/anexo`, 'POST', formData);
        }
      } else {
        response = await apiCall(`/tarefa/${idTarefa}/anexo`, 'POST', formData);
      }
      console.log('✅ Upload bem-sucedido:', response);
      console.log('✅ Tipo da resposta:', typeof response);

      return true;
    } catch (error: any) {
      console.error('❌ Erro ao fazer upload:', error);
      console.error('❌ Tipo do erro:', typeof error);
      console.error('❌ Mensagem:', error?.message);
      console.error('❌ Network error?', error?.message?.includes('Network request failed'));
      
      // Tratamento específico para diferentes tipos de erro
      if (error?.message?.includes('Network request failed')) {
        Alert.alert(
          'Erro de Conexão',
          'Falha na conexão com o servidor. Verifique sua internet e tente novamente.'
        );
      } else if (error?.message?.includes('413') || error?.message?.includes('too large')) {
        Alert.alert(
          'Arquivo muito grande',
          'O arquivo é muito grande para ser enviado. Tente com uma imagem menor.'
        );
      } else {
        Alert.alert('Erro', `Erro ao enviar ${tipo}: ${error?.message || 'Erro desconhecido'}`);
      }
      return false;
    }
  }

  /** Listar anexos de uma tarefa */
  async listarAnexos(idTarefa: number): Promise<any[]> {
    try {
      console.log('🔍 Listando anexos para tarefa:', idTarefa);
      console.log('🌐 URL da API:', `/tarefa/${idTarefa}/anexos`);
      
      const response = await apiCall(`/tarefa/${idTarefa}/anexos`, 'GET');
      
      console.log('📄 Response tipo:', typeof response);
      console.log('📄 Response é array:', Array.isArray(response));
      console.log('📄 Response length:', response?.length);
      console.log('📄 Anexos encontrados:', JSON.stringify(response, null, 2));
      
      return response || [];
    } catch (error) {
      console.error('❌ Erro ao listar anexos:', error);
      console.error('❌ Detalhes do erro:', JSON.stringify(error, null, 2));
      return [];
    }
  }

  /** Baixar anexo */
  async baixarAnexo(idAnexo: number): Promise<boolean> {
    try {
      console.log('📥 Iniciando download do anexo:', idAnexo);
      
      // Verificar se o módulo nativo está disponível
      if (!FilePickerModule || !FilePickerModule.downloadFile) {
        Alert.alert('Erro', 'Funcionalidade de download não está disponível.');
        return false;
      }
      
      // Buscar informações do anexo
      const anexoInfo = await apiCall(`/anexo/${idAnexo}`, 'GET');
      console.log('📄 Informações do anexo:', anexoInfo);
      
      if (!anexoInfo) {
        Alert.alert('Erro', 'Anexo não encontrado.');
        return false;
      }
      
      // Construir URL de download
      const baseUrl = 'http://192.168.15.14:3000';
      const downloadUrl = `${baseUrl}/anexo/${idAnexo}/download`;
      
      // TODO: Obter token de autenticação do AsyncStorage ou contexto
      const authToken = ''; // Temporariamente vazio
      
      console.log('📥 Iniciando download via módulo nativo...');
      console.log('🌐 URL:', downloadUrl);
      console.log('📄 Arquivo:', anexoInfo.nome_original);
      
      // Chamar módulo nativo para download
      const result = await FilePickerModule.downloadFile(
        downloadUrl,
        anexoInfo.nome_original,
        authToken
      );
      
      console.log('✅ Download iniciado:', result);
      
      Alert.alert(
        'Download iniciado',
        `O arquivo "${anexoInfo.nome_original}" (${this.formatarTamanho(anexoInfo.tamanho_arquivo)}) está sendo baixado.\n\nVerifique a pasta Downloads do seu dispositivo.`,
        [{ text: 'OK' }]
      );
      
      return true;
      
    } catch (error) {
      console.error('❌ Erro ao baixar anexo:', error);
      Alert.alert(
        'Erro no download',
        'Não foi possível iniciar o download. Verifique sua conexão e tente novamente.'
      );
      return false;
    }
  }

  /** Deletar anexo */
  async deletarAnexo(idAnexo: number): Promise<boolean> {
    try {
      await apiCall(`/anexo/${idAnexo}`, 'DELETE');
      return true;
    } catch (error) {
      console.error('Erro ao deletar anexo:', error);
      Alert.alert('Erro', 'Erro ao remover arquivo.');
      return false;
    }
  }

  /** Upload direto para imagens (contorna problemas com content:// URIs) */
  private async uploadImageDirect(idTarefa: number, formData: FormData): Promise<any> {
    const { getToken } = require('./authService');
    const token = await getToken();
    const API_BASE = 'http://192.168.15.14:3000';
    
    if (!token) {
      throw new Error('Token não encontrado para upload XHR');
    }
    
    console.log('🌐 Fazendo upload direto via XHR para:', `${API_BASE}/tarefa/${idTarefa}/anexo`);
    console.log('🔑 Token disponível:', !!token);
    console.log('📊 Tamanho do FormData:', formData instanceof FormData ? 'FormData válido' : 'FormData inválido');
    
    // Teste de conectividade simples antes do upload
    try {
      console.log('🏓 Testando conectividade...');
      const testResponse = await Promise.race([
        fetch(`${API_BASE}/health`, { method: 'GET' }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
      ]) as Response;
      console.log('✅ Conectividade OK:', testResponse.status);
    } catch (connectError) {
      console.log('⚠️ Teste de conectividade falhou, continuando...');
    }
    
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.open('POST', `${API_BASE}/tarefa/${idTarefa}/anexo`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      
      xhr.onload = () => {
        console.log('📊 XHR Status:', xhr.status, xhr.statusText);
        
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText);
            console.log('✅ Upload XHR bem-sucedido:', result);
            resolve(result);
          } catch (parseError) {
            console.error('❌ Erro ao parsear resposta XHR:', parseError);
            reject(new Error('Erro ao processar resposta do servidor'));
          }
        } else {
          console.error('❌ Erro XHR:', xhr.status, xhr.responseText);
          reject(new Error(`Erro ${xhr.status}: ${xhr.responseText}`));
        }
      };
      
      xhr.onerror = (error) => {
        console.error('❌ Erro de rede XHR:', error);
        reject(new Error('Erro de rede no upload'));
      };
      
      xhr.ontimeout = () => {
        console.error('❌ Timeout no XHR após', xhr.timeout / 1000, 'segundos');
        reject(new Error('Timeout no upload - arquivo muito grande ou conexão lenta'));
      };
      
      // Monitorar progresso do upload
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          console.log(`📊 Upload: ${percentComplete.toFixed(1)}% (${e.loaded}/${e.total} bytes)`);
        }
      };
      
      xhr.timeout = 120000; // 2 minutos para imagens (era 1 minuto)
      
      console.log('📤 Enviando FormData via XHR...');
      xhr.send(formData);
    });
  }

  /** Formatar tamanho do arquivo para exibição */
  formatarTamanho(bytes: number): string {
    if (bytes === 0) {
      return '0 Bytes';
    }
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /** Abrir configurações do app */
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
