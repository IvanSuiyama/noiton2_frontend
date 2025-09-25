import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
} from 'react-native';
import {StackNavigationProp} from '@react-navigation/stack';
import {RootStackParamList} from '../router';

type WelcomeScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Welcome'
>;

type Props = {
  navigation: WelcomeScreenNavigationProp;
};

const WelcomeScreen: React.FC<Props> = ({navigation}) => {
  const handleLogin = () => {
    navigation.navigate('Login');
  };

  const handleSignup = () => {
    navigation.navigate('CadastroUsuario');
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
        </View>

        {/* Texto informativo */}
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            Uma nova experiência de produtividade{'\n'}inspirada no Notion
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
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
    backgroundColor: 'rgba(108, 117, 125, 0.8)', // Cinza transparente
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
    color: '#ffffff',
  },
  welcomeContainer: {
    alignItems: 'center',
    marginBottom: 64,
  },
  welcomeTitle: {
    fontSize: 24,
    color: '#6c757d',
    marginBottom: 8,
    textAlign: 'center',
  },
  appName: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
    letterSpacing: -1,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonsContainer: {
    width: '100%',
    marginBottom: 32,
  },
  loginButton: {
    backgroundColor: 'rgba(108, 117, 125, 0.8)', // Cinza transparente
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
    color: '#ffffff',
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
    color: '#495057',
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoContainer: {
    alignItems: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default WelcomeScreen;