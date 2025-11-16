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

        const requestAllPermissions = async () => {
          try {

            console.log('📅 Configurando integração com Google Calendar...');
            try {

              const hasPermissions = await GoogleCalendarService.hasCalendarPermissions();

              if (!hasPermissions) {

                Alert.alert(
                  '📅 Integração com Google Calendar',
                  'Para uma melhor experiência, o app pode sincronizar suas tarefas com o Google Calendar e enviar lembretes de prazos.\n\nDeseja ativar esta funcionalidade?',
                  [
                    {
                      text: 'Agora não',
                      onPress: async () => {
                        console.log('ℹ️ Usuário optou por não usar integração com Google Calendar');
                        await GoogleCalendarService.initializeAfterLogin();
                      },
                      style: 'cancel',
                    },
                    {
                      text: 'Ativar',
                      onPress: async () => {
                        const granted = await GoogleCalendarService.requestCalendarPermissions();
                        if (granted) {
                          console.log('✅ Permissões do Google Calendar concedidas - sincronização automática ativada');

                          await GoogleCalendarService.initializeAfterLogin();

                          Alert.alert(
                            '✅ Google Calendar',
                            'Integração ativada com sucesso!\n\n• Tarefas serão sincronizadas automaticamente\n• Você receberá lembretes de prazos\n• Verificação automática a cada 4 horas',
                            [{ text: 'Perfeito!', style: 'default' }]
                          );
                        } else {
                          Alert.alert(
                            'ℹ️ Permissões',
                            'Sem as permissões, não será possível sincronizar com o Google Calendar. Você pode ativar isso depois nas configurações.',
                            [{ text: 'OK', style: 'default' }]
                          );
                          await GoogleCalendarService.initializeAfterLogin();
                        }
                      },
                    },
                  ]
                );
              } else {
                console.log('✅ Permissões do Google Calendar já concedidas');
                await GoogleCalendarService.initializeAfterLogin();
              }
            } catch (calendarError) {
              console.log('⚠️ Erro ao configurar calendário:', calendarError);

              await GoogleCalendarService.initializeAfterLogin();
            }

            const hasFilePermissions = await AnexoService.checkPermissions();

            if (!hasFilePermissions) {
              setTimeout(async () => {
                await AnexoService.requestPermissionsWithUserFeedback();
              }, 1500);
            }

            // Solicitar permissão de notificação
            setTimeout(async () => {
              await checkPermission();
              if (!permissionStatus?.enabled) {
                Alert.alert(
                  '🔔 Permissão de Notificações',
                  'Para receber lembretes sobre suas tarefas (prazos próximos, novas tarefas criadas), precisamos de permissão para enviar notificações.\n\nDeseja ativar as notificações?',
                  [
                    {
                      text: 'Agora não',
                      style: 'cancel',
                      onPress: () => console.log('ℹ️ Usuário optou por não ativar notificações')
                    },
                    {
                      text: 'Ativar',
                      onPress: async () => {
                        await requestPermission();
                        console.log('🔔 Configurações de notificação abertas');
                      }
                    }
                  ]
                );
              }
            }, 2000); // Delay para não sobrecarregar o usuário com muitos dialogs
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