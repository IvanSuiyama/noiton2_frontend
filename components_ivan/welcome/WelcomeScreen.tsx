import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {StackNavigationProp} from '@react-navigation/stack';
import {RootStackParamList} from '../router';
import GoogleSignInService from '../../services/googleSignInService';
import { setupActiveWorkspace } from '../../services/authService';

type WelcomeScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Welcome'
>;

type Props = {
  navigation: WelcomeScreenNavigationProp;
};

const WelcomeScreen: React.FC<Props> = ({navigation}) => {
  const [loading, setLoading] = useState<boolean>(false);

  const handleLogin = () => {
    navigation.navigate('Login');
  };

  const handleSignup = () => {
    navigation.navigate('CadastroUsuario');
  };

  const handleGoogleSignIn = async (): Promise<void> => {
    setLoading(true);
    try {
      // 1. Fazer Google Sign-In
      const resultado = await GoogleSignInService.signIn();

      if (resultado.success && resultado.user) {
        const { email, name } = resultado.user;
        
        console.log('🔍 Google Sign-In bem-sucedido:', email);
        
        // 2. Verificar se email existe no backend
        const response = await fetch(`http://192.168.15.14:3000/auth/verificar-email?email=${encodeURIComponent(email)}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        const checkResult = await response.json();
        
        if (checkResult.exists) {
          // 3a. Usuário existe - fazer login e ir para Home
          console.log('✅ Usuário já existe - fazendo login automático');
          
          const loginResponse = await fetch('http://192.168.15.14:3000/auth/login-google', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              email: email,
              name: name || email.split('@')[0] // Incluir nome também
            }),
          });
          
          const loginData = await loginResponse.json();
          
          if (loginResponse.ok && loginData.token) {
            // Salvar token e email corretamente
            await AsyncStorage.setItem('auth_token', loginData.token);
            await AsyncStorage.setItem('user_email', loginData.email || email);
            
            console.log('✅ Token e email salvos após Google Sign-In');
            
            // Verificar se os dados foram salvos corretamente
            const tokenSalvo = await AsyncStorage.getItem('auth_token');
            const emailSalvo = await AsyncStorage.getItem('user_email');
            console.log('🔍 Verificação pós-salvamento - Token:', !!tokenSalvo, 'Email:', emailSalvo);
            
            // Configurar workspace ativo
            try {
              const workspaceSetup = await setupActiveWorkspace();
              console.log('✅ Workspace configurado:', workspaceSetup);
            } catch (workspaceError) {
              console.error('⚠️ Erro ao configurar workspace:', workspaceError);
              // Continua mesmo se houver erro no workspace
            }
            
            Alert.alert('Login com Google', `Bem-vindo de volta, ${name || email}!`, [
              {
                text: 'Continuar',
                onPress: () => {
                  navigation.navigate('Home');
                },
              },
            ]);
          } else {
            Alert.alert('Erro', 'Erro ao fazer login automático');
          }
          
        } else {
          // 3b. Usuário não existe - ir para cadastro com dados pré-preenchidos
          console.log('👤 Usuário não existe - redirecionando para cadastro');
          
          Alert.alert(
            'Primeiro acesso', 
            `Olá ${name || email}! Como é seu primeiro acesso, vamos fazer seu cadastro.`,
            [
              {
                text: 'Continuar',
                onPress: () => {
                  navigation.navigate('CadastroUsuario', {
                    googleData: {
                      nome: name || '',
                      email: email,
                      isFromGoogle: true,
                    },
                  });
                },
              },
            ]
          );
        }
        
      } else {
        Alert.alert('Erro', resultado.error || 'Erro ao fazer login com Google');
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido no Google Sign-In';
      Alert.alert('Erro', errorMessage);
      console.error('Erro no Google Sign-In:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header com logo/ícone */}
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoText}>N</Text>
          </View>
        </View>

        {/* Título de boas-vindas */}
        <View style={styles.welcomeContainer}>
          <Text style={styles.welcomeTitle}>Bem-vindo ao</Text>
          <Text style={styles.appName}>Noiton2</Text>
          <Text style={styles.welcomeSubtitle}>
            Organize suas ideias e tarefas{'\n'}de forma intuitiva e eficiente
          </Text>
        </View>

        {/* Botões de ação */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <Text style={styles.loginButtonText}>Fazer Login</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.signupButton} onPress={handleSignup}>
            <Text style={styles.signupButtonText}>Criar Conta</Text>
          </TouchableOpacity>

          {/* Divisor */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ou</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Botão do Google */}
          <TouchableOpacity 
            style={[styles.googleButton, loading && styles.disabledButton]} 
            onPress={handleGoogleSignIn}
            disabled={loading}
          >
            <Text style={styles.googleButtonText}>
              {loading ? '⏳ Entrando...' : '🔍 Entrar com Google'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Texto informativo */}
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            Uma nova experiência de produtividade{'\n'}inspirada no Notion
          </Text>
        </View>

        {/* Botão Admin (discreto) */}
        <TouchableOpacity 
          style={styles.adminButton}
          onPress={() => navigation.navigate('AdminLogin')}
        >
          <Text style={styles.adminButtonText}>👨‍💼</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    marginBottom: 48,
  },
  logoIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: 'rgba(108, 117, 125, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  logoText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
  },
  welcomeContainer: {
    alignItems: 'center',
    marginBottom: 64,
  },
  welcomeTitle: {
    fontSize: 24,
    color: '#b0b0b0',
    marginBottom: 8,
    textAlign: 'center',
  },
  appName: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    letterSpacing: -1,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#b0b0b0',
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonsContainer: {
    width: '100%',
    marginBottom: 32,
  },
  loginButton: {
    backgroundColor: 'rgba(108, 117, 125, 0.8)',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  signupButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'rgba(108, 117, 125, 0.6)',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  signupButtonText: {
    color: '#b0b0b0',
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoContainer: {
    alignItems: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#b0b0b0',
    textAlign: 'center',
    lineHeight: 20,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(176, 176, 176, 0.3)',
  },
  dividerText: {
    fontSize: 14,
    color: '#b0b0b0',
    marginHorizontal: 16,
  },
  googleButton: {
    backgroundColor: '#4285f4',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  googleButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.6,
  },
  adminButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminButtonText: {
    fontSize: 20,
  },
});

export default WelcomeScreen;