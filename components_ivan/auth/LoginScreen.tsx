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

type LoginScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Login'
>;

type Props = {
  navigation: LoginScreenNavigationProp;
};

const LoginScreen: React.FC<Props> = ({navigation}) => {
  const [formData, setFormData] = useState({
    email: '',
    senha: '',
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<{email?: string; senha?: string}>({});
  const [showFirstTimePopup, setShowFirstTimePopup] = useState<boolean>(false);

  // Função para validar formulário
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
        // Verificar se o usuário já possui workspaces e configurar workspace ativo
        const workspaceSetup = await setupActiveWorkspace();
        
        // Solicitar permissões após login bem-sucedido
        const requestAllPermissions = async () => {
          try {
            // Solicitar permissões do calendário
            await GoogleCalendarService.requestPermissionsWithUserFeedback();
            
            // Aguardar um pouco antes de solicitar permissões de arquivo
            setTimeout(async () => {
              await AnexoService.requestPermissionsWithUserFeedback();
            }, 1000);
          } catch (error) {
            console.log('Usuário optou por não conceder algumas permissões');
          }
        };

        if (workspaceSetup.hasWorkspace) {
          // Se já tem workspaces, vai direto para a Home
          Alert.alert('Sucesso', 'Login realizado com sucesso!', [
            {
              text: 'OK',
              onPress: async () => {
                // Solicitar permissões
                await requestAllPermissions();
                navigation.navigate('Home');
              },
            },
          ]);
        } else {
          // Se não tem workspaces, mostra o popup
          Alert.alert('Sucesso', 'Login realizado com sucesso!', [
            {
              text: 'OK',
              onPress: async () => {
                // Solicitar permissões
                await requestAllPermissions();
                setShowFirstTimePopup(true);
              },
            },
          ]);
        }
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

  // Função para lidar com a criação de workspace
  const handleCreateWorkspace = () => {
    setShowFirstTimePopup(false);
    navigation.navigate('CadastroWorkspace');
  };

  // Função para pular e ir direto para home
  const handleSkipWorkspaceCreation = () => {
    setShowFirstTimePopup(false);
    navigation.navigate('Home');
  };

  // Função para ir para cadastro
  const handleGoToSignup = () => {
    navigation.navigate('CadastroUsuario');
  };

  // Função para atualizar campos do formulário
  const updateField = (field: 'email' | 'senha', value: string) => {
    setFormData(prev => ({...prev, [field]: value}));
    // Limpar erro do campo quando usuário começar a digitar
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

          {/* Campo Email */}
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

          {/* Campo Senha */}
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

          {/* Botão Login */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={fazerLogin}
            disabled={loading}>
            <Text style={styles.buttonText}>
              {loading ? 'Entrando...' : 'Entrar'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.requiredText}>* Campos obrigatórios</Text>

          {/* Link para cadastro */}
          <TouchableOpacity
            style={styles.linkContainer}
            onPress={handleGoToSignup}>
            <Text style={styles.linkText}>
              Não tem uma conta? Cadastre-se aqui
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Popup de primeira vez */}
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