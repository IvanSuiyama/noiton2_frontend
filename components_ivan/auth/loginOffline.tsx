import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../router';
import { useTheme } from '../theme/ThemeContext';
import { loginOffline, setupActiveWorkspace, getUserEmail } from '../../services/authService';
import FirstTimePopup from '../popup/FirstTimePopup';

type LoginOfflineScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'LoginOffline'
>;

type Props = {
  navigation: LoginOfflineScreenNavigationProp;
};

const LoginOfflineScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [hasStoredLogin, setHasStoredLogin] = useState<boolean>(false);
  const [showFirstTimePopup, setShowFirstTimePopup] = useState<boolean>(false);

  useEffect(() => {
    checkStoredLogin();
  }, []);

  const checkStoredLogin = async () => {
    try {
      const email = await getUserEmail();
      if (email) {
        setUserEmail(email);
        setHasStoredLogin(true);
      } else {
        setHasStoredLogin(false);
      }
    } catch (error) {
      console.log('Erro ao verificar login armazenado:', error);
      setHasStoredLogin(false);
    }
  };

  const handleOfflineLogin = async () => {
    setLoading(true);
    try {
      const resultado = await loginOffline();

      if (resultado.sucesso) {
        // Configurar workspace ativo
        const workspaceSetup = await setupActiveWorkspace();

        Alert.alert(
          '✅ Login Offline',
          `Bem-vindo de volta!\n\n📱 Modo: Offline\n📧 Email: ${resultado.email}\n\n⚠️ Algumas funcionalidades podem estar limitadas sem conexão com a internet.`,
          [
            {
              text: 'Continuar',
              onPress: () => {
                if (workspaceSetup.hasWorkspace) {
                  navigation.navigate('Home');
                } else {
                  setShowFirstTimePopup(true);
                }
              },
            },
          ]
        );
      } else {
        Alert.alert(
          '❌ Erro no Login Offline',
          resultado.erro || 'Não foi possível fazer login offline. Tente fazer login online primeiro.'
        );
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      Alert.alert('❌ Erro', errorMessage);
      console.error('Erro ao fazer login offline:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoToOnlineLogin = () => {
    navigation.navigate('Login');
  };

  const handleCreateWorkspace = () => {
    setShowFirstTimePopup(false);
    navigation.navigate('CadastroWorkspace');
  };

  const handleSkipWorkspaceCreation = () => {
    setShowFirstTimePopup(false);
    navigation.navigate('Home');
  };

  if (!hasStoredLogin) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.formContainer, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.icon, { color: theme.colors.primary }]}>
            📱
          </Text>
          
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Login Offline
          </Text>
          
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Nenhum login anterior encontrado
          </Text>

          <View style={styles.messageContainer}>
            <Text style={[styles.messageText, { color: theme.colors.textSecondary }]}>
              Para usar o modo offline, você precisa fazer login online pelo menos uma vez.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.colors.primary }]}
            onPress={handleGoToOnlineLogin}
          >
            <Text style={styles.buttonText}>
              Fazer Login Online
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.formContainer, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.icon, { color: theme.colors.primary }]}>
          🔒
        </Text>
        
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Login Offline
        </Text>
        
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Entre usando seus dados salvos
        </Text>

        <View style={[styles.userInfo, { backgroundColor: theme.colors.background }]}>
          <Text style={[styles.userLabel, { color: theme.colors.textSecondary }]}>
            Último usuário:
          </Text>
          <Text style={[styles.userEmail, { color: theme.colors.text }]}>
            {userEmail}
          </Text>
        </View>

        <View style={styles.warningContainer}>
          <Text style={[styles.warningIcon, { color: theme.colors.warning }]}>
            ⚠️
          </Text>
          <Text style={[styles.warningText, { color: theme.colors.textSecondary }]}>
            No modo offline, algumas funcionalidades podem estar limitadas.
            As operações serão sincronizadas quando a conexão retornar.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.colors.primary }, loading && styles.buttonDisabled]}
          onPress={handleOfflineLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>
              Entrar Offline
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.linkButton, { borderColor: theme.colors.border }]}
          onPress={handleGoToOnlineLogin}
        >
          <Text style={[styles.linkText, { color: theme.colors.primary }]}>
            Fazer Login Online
          </Text>
        </TouchableOpacity>
      </View>

      {/* Popup para primeiro acesso */}
      <FirstTimePopup
        visible={showFirstTimePopup}
        onCreateWorkspace={handleCreateWorkspace}
        onClose={handleSkipWorkspaceCreation}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  formContainer: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  userInfo: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    alignItems: 'center',
  },
  userLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    fontWeight: '600',
  },
  messageContainer: {
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  messageText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  warningIcon: {
    fontSize: 16,
    marginRight: 8,
    marginTop: 2,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  linkButton: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  linkText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default LoginOfflineScreen;
