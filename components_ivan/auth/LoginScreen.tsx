import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  PermissionsAndroid,
  Linking,
} from 'react-native';
import {StackNavigationProp} from '@react-navigation/stack';
import {RootStackParamList} from '../router';
import {login, setupActiveWorkspace} from '../../services/authService';
import FirstTimePopup from '../popup/FirstTimePopup';
import GoogleCalendarService from '../../services/googleCalendarService';
import AnexoService from '../../services/anexoService';
import { useNotifications } from '../../hooks/useNotifications';

type LoginScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Login'
>;

type Props = {
  navigation: LoginScreenNavigationProp;
};

const LoginScreen: React.FC<Props> = ({navigation}) => {
  const { checkPermission, requestPermission, permissionStatus } = useNotifications();
  const [formData, setFormData] = useState({
    email: '',
    senha: '',
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<{email?: string; senha?: string}>({});

  // Função para verificar permissão de microfone
  const checkMicrophonePermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      return true; // iOS gerencia diferente
    }

    try {
      const granted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
      );
      return granted;
    } catch (error) {
      console.error('Erro ao verificar permissão de microfone:', error);
      return false;
    }
  };

  // Função para solicitar permissão de microfone
  const requestMicrophonePermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: '🎤 Permissão de Microfone',
          message: 'Para usar as funcionalidades de voz (criar tarefas e filtrar por voz), o app precisa acessar o microfone.',
          buttonPositive: 'Permitir',
          buttonNegative: 'Negar',
        }
      );

      const isGranted = granted === PermissionsAndroid.RESULTS.GRANTED;
      console.log('Permissão de microfone:', isGranted ? 'CONCEDIDA' : 'NEGADA');
      return isGranted;
    } catch (error) {
      console.error('Erro ao solicitar permissão de microfone:', error);
      return false;
    }
  };

  // Função para verificar permissões de arquivos
  const checkFilePermissions = async (): Promise<boolean> => {
    try {
      const hasPermissions = await AnexoService.checkPermissions();
      return hasPermissions;
    } catch (error) {
      console.error('Erro ao verificar permissões de arquivos:', error);
      return false;
    }
  };

  // Função para solicitar permissões de arquivos com redirecionamento
  const requestFilePermissions = async (): Promise<void> => {
    try {
      const granted = await AnexoService.requestPermissionsWithUserFeedback();
      if (!granted) {
        // Se negada, oferecer opção de ir para configurações
        Alert.alert(
          '📁 Permissão de Arquivos',
          'Para anexar documentos às tarefas, precisamos de acesso aos arquivos. Deseja abrir as configurações para habilitar?',
          [
            {
              text: 'Agora não',
              style: 'cancel',
            },
            {
              text: 'Abrir Configurações',
              onPress: () => {
                Linking.openSettings();
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Erro ao solicitar permissões de arquivos:', error);
    }
  };

  // Função para verificar permissões de calendário
  const checkCalendarPermissions = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      return true; // iOS gerencia diferente
    }

    try {
      const readGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.READ_CALENDAR
      );
      const writeGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.WRITE_CALENDAR
      );
      return readGranted && writeGranted;
    } catch (error) {
      console.error('Erro ao verificar permissões de calendário:', error);
      return false;
    }
  };

  // Função para solicitar permissões de calendário
  const requestCalendarPermissions = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      const readPermission = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_CALENDAR,
        {
          title: '📅 Permissão de Calendário (Leitura)',
          message: 'Para sincronizar suas tarefas com eventos do calendário, precisamos acessar seu calendário.',
          buttonPositive: 'Permitir',
          buttonNegative: 'Negar',
        }
      );

      const writePermission = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_CALENDAR,
        {
          title: '📅 Permissão de Calendário (Escrita)',
          message: 'Para criar lembretes no calendário para suas tarefas, precisamos criar eventos.',
          buttonPositive: 'Permitir',
          buttonNegative: 'Negar',
        }
      );

      const readGranted = readPermission === PermissionsAndroid.RESULTS.GRANTED;
      const writeGranted = writePermission === PermissionsAndroid.RESULTS.GRANTED;
      const bothGranted = readGranted && writeGranted;
      
      console.log('Permissões de calendário:', {
        leitura: readGranted ? 'CONCEDIDA' : 'NEGADA',
        escrita: writeGranted ? 'CONCEDIDA' : 'NEGADA'
      });
      
      return bothGranted;
    } catch (error) {
      console.error('Erro ao solicitar permissões de calendário:', error);
      return false;
    }
  };
  const [showFirstTimePopup, setShowFirstTimePopup] = useState<boolean>(false);

  const validarFormulario = (): boolean => {
    const newErrors: {email?: string; senha?: string} = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Formato de email inválido';
    }

    if (!formData.senha.trim()) {
      newErrors.senha = 'Senha é obrigatória';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const fazerLogin = async (): Promise<void> => {
    if (!validarFormulario()) {
      return;
    }

    setLoading(true);
    try {
      const resultado = await login(formData.email, formData.senha);

      if (resultado.sucesso) {

        const workspaceSetup = await setupActiveWorkspace();

        // ===================================
        // 🔄 FILA DE PERMISSÕES SEQUENCIAL
        // ===================================
        interface PermissionTask {
          id: string;
          checkFn: () => Promise<boolean>;
          requestFn: () => Promise<void>;
          name: string;
        }

        const processPermissionQueue = async () => {
          const permissionTasks: PermissionTask[] = [
            {
              id: 'google_calendar',
              name: 'Google Calendar',
              checkFn: async () => {
                try {
                  return await GoogleCalendarService.hasCalendarPermissions();
                } catch (error) {
                  console.log('⚠️ Erro ao verificar permissões Google Calendar:', error);
                  return true; // Skip se houver erro
                }
              },
              requestFn: async () => {
                return new Promise<void>((resolve) => {
                  Alert.alert(
                    '📅 Integração com Google Calendar',
                    'Para uma melhor experiência, o app pode sincronizar suas tarefas com o Google Calendar e enviar lembretes de prazos.\n\nDeseja ativar esta funcionalidade?',
                    [
                      {
                        text: 'Agora não',
                        style: 'cancel',
                        onPress: async () => {
                          console.log('ℹ️ Usuário optou por não usar integração com Google Calendar');
                          resolve();
                        }
                      },
                      {
                        text: 'Ativar',
                        onPress: async () => {
                          try {
                            const granted = await GoogleCalendarService.requestCalendarPermissions();
                            if (granted) {
                              console.log('✅ Permissões do Google Calendar concedidas');
                              Alert.alert(
                                '✅ Google Calendar',
                                'Integração ativada com sucesso!\n\n• Tarefas serão sincronizadas automaticamente\n• Você receberá lembretes de prazos',
                                [{ text: 'Perfeito!', onPress: () => resolve() }]
                              );
                            } else {
                              Alert.alert(
                                'ℹ️ Permissões',
                                'Sem as permissões, não será possível sincronizar com o Google Calendar.',
                                [{ text: 'OK', onPress: () => resolve() }]
                              );
                            }
                          } catch (error) {
                            console.log('⚠️ Erro ao configurar calendário:', error);
                            resolve();
                          }
                        }
                      }
                    ]
                  );
                });
              }
            },
            {
              id: 'microphone',
              name: 'Microfone',
              checkFn: () => checkMicrophonePermission(),
              requestFn: async () => {
                return new Promise<void>((resolve) => {
                  Alert.alert(
                    '🎤 Permissão de Microfone',
                    'Para usar as funcionalidades de voz (criar tarefas e filtrar por voz), precisamos de acesso ao microfone.\n\nDeseja ativar esta funcionalidade?',
                    [
                      {
                        text: 'Agora não',
                        style: 'cancel',
                        onPress: () => {
                          console.log('ℹ️ Usuário optou por não ativar microfone');
                          resolve();
                        }
                      },
                      {
                        text: 'Ativar',
                        onPress: async () => {
                          const granted = await requestMicrophonePermission();
                          if (granted) {
                            Alert.alert(
                              '✅ Microfone Ativado',
                              'Agora você pode usar as funcionalidades de voz para criar e filtrar tarefas!',
                              [{ text: 'Perfeito!', onPress: () => resolve() }]
                            );
                          } else {
                            Alert.alert(
                              'ℹ️ Permissão Necessária',
                              'Sem acesso ao microfone, não será possível usar as funcionalidades de voz.',
                              [{ text: 'OK', onPress: () => resolve() }]
                            );
                          }
                        }
                      }
                    ]
                  );
                });
              }
            },
            {
              id: 'files',
              name: 'Arquivos',
              checkFn: () => checkFilePermissions(),
              requestFn: async () => {
                return new Promise<void>((resolve) => {
                  Alert.alert(
                    '📁 Permissão de Arquivos',
                    'Para anexar documentos às suas tarefas, precisamos de acesso aos arquivos do dispositivo.\n\nDeseja ativar esta funcionalidade?',
                    [
                      {
                        text: 'Agora não',
                        style: 'cancel',
                        onPress: () => {
                          console.log('ℹ️ Usuário optou por não ativar arquivos');
                          resolve();
                        }
                      },
                      {
                        text: 'Ativar',
                        onPress: async () => {
                          await requestFilePermissions();
                          resolve();
                        }
                      }
                    ]
                  );
                });
              }
            },
            {
              id: 'notifications',
              name: 'Notificações',
              checkFn: async () => {
                await checkPermission();
                return !!permissionStatus?.enabled;
              },
              requestFn: async () => {
                return new Promise<void>((resolve) => {
                  Alert.alert(
                    '🔔 Permissão de Notificações',
                    'Para receber lembretes sobre suas tarefas (prazos próximos, novas tarefas criadas), precisamos de permissão para enviar notificações.\n\nDeseja ativar as notificações?',
                    [
                      {
                        text: 'Agora não',
                        style: 'cancel',
                        onPress: () => {
                          console.log('ℹ️ Usuário optou por não ativar notificações');
                          resolve();
                        }
                      },
                      {
                        text: 'Ativar',
                        onPress: async () => {
                          await requestPermission();
                          console.log('🔔 Configurações de notificação abertas');
                          resolve();
                        }
                      }
                    ]
                  );
                });
              }
            }
          ];

          // Processar fila sequencialmente
          for (const task of permissionTasks) {
            try {
              console.log(`🔍 Verificando permissão: ${task.name}`);
              const hasPermission = await task.checkFn();
              
              if (!hasPermission) {
                console.log(`❓ Solicitando permissão: ${task.name}`);
                await task.requestFn();
                // Delay entre permissões para evitar sobreposição
                await new Promise(resolve => setTimeout(resolve, 500));
              } else {
                console.log(`✅ Permissão já concedida: ${task.name}`);
              }
            } catch (error) {
              console.log(`⚠️ Erro ao processar permissão ${task.name}:`, error);
            }
          }

          console.log('✅ Todas as permissões foram processadas!');
        };

        const requestAllPermissions = async () => {
          try {
            console.log('📅 Configurando integração com Google Calendar...');
            await GoogleCalendarService.initializeAfterLogin();
            
            // Iniciar fila de permissões após inicialização
            setTimeout(() => {
              processPermissionQueue();
            }, 1000);
          } catch (error) {
            console.log('Usuário optou por não conceder algumas permissões');
          }
        };

        Alert.alert('Sucesso', 'Login realizado com sucesso!', [
          {
            text: 'OK',
            onPress: async () => {

              await requestAllPermissions();

              if (workspaceSetup.hasWorkspace) {

                navigation.navigate('Home');
              } else {

                setShowFirstTimePopup(true);
              }
            },
          },
        ]);
      } else {
        Alert.alert('Erro', resultado.erro || 'Erro ao fazer login');
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      Alert.alert('Erro', errorMessage);
      console.error('Erro ao fazer login:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorkspace = () => {
    setShowFirstTimePopup(false);
    navigation.navigate('CadastroWorkspace');
  };

  const handleSkipWorkspaceCreation = () => {
    setShowFirstTimePopup(false);
    navigation.navigate('Home');
  };

  const handleGoToSignup = () => {
    navigation.navigate('CadastroUsuario');
  };

  const updateField = (field: 'email' | 'senha', value: string) => {
    setFormData(prev => ({...prev, [field]: value}));

    if (errors[field]) {
      setErrors(prev => ({...prev, [field]: undefined}));
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled">
        <View style={styles.formContainer}>
          <Text style={styles.title}>Login</Text>
          <Text style={styles.subtitle}>Entre na sua conta para continuar</Text>

          {}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={[styles.input, errors.email ? styles.inputError : null]}
              placeholder="Digite seu email"
              placeholderTextColor="#a0a0a0"
              value={formData.email}
              onChangeText={text => updateField('email', text)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
            {errors.email && (
              <Text style={styles.errorText}>{errors.email}</Text>
            )}
          </View>

          {}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Senha *</Text>
            <TextInput
              style={[styles.input, errors.senha ? styles.inputError : null]}
              placeholder="Digite sua senha"
              placeholderTextColor="#a0a0a0"
              value={formData.senha}
              onChangeText={text => updateField('senha', text)}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
            {errors.senha && (
              <Text style={styles.errorText}>{errors.senha}</Text>
            )}
          </View>

          {}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={fazerLogin}
            disabled={loading}>
            <Text style={styles.buttonText}>
              {loading ? 'Entrando...' : 'Entrar'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.requiredText}>* Campos obrigatórios</Text>

          {}
          <TouchableOpacity
            style={styles.linkContainer}
            onPress={handleGoToSignup}>
            <Text style={styles.linkText}>
              Não tem uma conta? Cadastre-se aqui
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      

      {}
      <FirstTimePopup
        visible={showFirstTimePopup}
        onCreateWorkspace={handleCreateWorkspace}
        onClose={handleSkipWorkspaceCreation}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  formContainer: {
    backgroundColor: '#232323',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#fff',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    color: '#b0b0b0',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#e0e0e0',
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#444',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#181818',
    color: '#fff',
  },
  inputError: {
    borderColor: '#dc3545',
  },
  errorText: {
    color: '#dc3545',
    fontSize: 14,
    marginTop: 6,
  },
  button: {
    backgroundColor: 'rgba(108, 117, 125, 0.8)',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: 'rgba(108, 117, 125, 0.4)',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  requiredText: {
    fontSize: 12,
    color: '#b0b0b0',
    textAlign: 'center',
    marginTop: 16,
  },
  linkContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    color: '#b0b0b0',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});

export default LoginScreen;