import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { apiCall, isAuthenticated } from '../../services/authService';
import UserInterface from './userInterface';

interface RouteParams {
  userEmail: string;
}

const EditUsuario: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { userEmail } = route.params as RouteParams;

  const [usuario, setUsuario] = useState<UserInterface>({
    id_usuario: 0,
    nome: '',
    email: '',
    senha: '',
    telefone: '',
  });

  const [senhaConfirmacao, setSenhaConfirmacao] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  // Buscar dados do usuário ao carregar o componente
  useEffect(() => {
    const verificarAutenticacaoECarregarDados = async () => {
      try {
        const authenticated = await isAuthenticated();
        if (!authenticated) {
          Alert.alert(
            'Erro de Autenticação',
            'Você não está autenticado. Faça login novamente.',
            [
              { text: 'OK', onPress: () => navigation.goBack() }
            ]
          );
          return;
        }
        
        await buscarDadosUsuario();
      } catch (error) {
        console.error('Erro na verificação de autenticação:', error);
        Alert.alert('Erro', 'Erro ao verificar autenticação');
        navigation.goBack();
      }
    };

    verificarAutenticacaoECarregarDados();
  }, []);

  const buscarDadosUsuario = async () => {
    try {
      setLoadingInitial(true);
      const userData = await apiCall(`/usuarios/email/${encodeURIComponent(userEmail)}`);
      
      setUsuario({
        ...userData,
        senha: '', // Não preencher senha por segurança
      });
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao carregar dados do usuário';
      
      if (errorMessage.includes('Token expirado') || errorMessage.includes('não autenticado')) {
        Alert.alert('Sessão Expirada', 'Faça login novamente.', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert('Erro', errorMessage, [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } finally {
      setLoadingInitial(false);
    }
  };

  const validarFormulario = (): boolean => {
    const newErrors: {[key: string]: string} = {};

    // Validar nome
    if (!usuario.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório';
    } else if (usuario.nome.trim().length < 2) {
      newErrors.nome = 'Nome deve ter pelo menos 2 caracteres';
    }

    // Validar telefone (opcional, mas se preenchido deve ser válido)
    if (usuario.telefone && usuario.telefone.trim()) {
      const telefoneRegex = /^\(\d{2}\)\s\d{4,5}-\d{4}$/;
      if (!telefoneRegex.test(usuario.telefone.trim())) {
        newErrors.telefone = 'Formato: (11) 99999-9999';
      }
    }

    // Validar senha (opcional para edição)
    if (usuario.senha) {
      if (usuario.senha.length < 6) {
        newErrors.senha = 'Senha deve ter pelo menos 6 caracteres';
      }
      
      if (usuario.senha !== senhaConfirmacao) {
        newErrors.senhaConfirmacao = 'Senhas não coincidem';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const formatarTelefone = (text: string): string => {
    // Remove todos os caracteres não numéricos
    const numeros = text.replace(/\D/g, '');
    
    // Aplica a máscara (11) 99999-9999
    if (numeros.length <= 2) {
      return `(${numeros}`;
    } else if (numeros.length <= 7) {
      return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
    } else {
      return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7, 11)}`;
    }
  };

  const handleTelefoneChange = (text: string) => {
    const telefoneFormatado = formatarTelefone(text);
    setUsuario({ ...usuario, telefone: telefoneFormatado });
  };

  const handleSalvar = async () => {
    if (!validarFormulario()) {
      return;
    }

    try {
      setLoading(true);

      // Preparar dados para envio (apenas campos que foram alterados)
      const dadosParaEnvio: any = {
        nome: usuario.nome,
      };

      // Incluir telefone se foi preenchido ou modificado
      if (usuario.telefone && usuario.telefone.trim()) {
        dadosParaEnvio.telefone = usuario.telefone;
      }

      // Incluir senha apenas se foi preenchida
      if (usuario.senha && usuario.senha.trim()) {
        dadosParaEnvio.senha = usuario.senha;
      }

      await apiCall(`/usuarios/${encodeURIComponent(userEmail)}`, 'PUT', dadosParaEnvio);

      Alert.alert('Sucesso', 'Usuário editado com sucesso!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Erro ao editar usuário:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao editar usuário';
      
      if (errorMessage.includes('Token expirado') || errorMessage.includes('não autenticado')) {
        Alert.alert('Sessão Expirada', 'Faça login novamente.', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert('Erro', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loadingInitial) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#6c757d" />
        <Text style={styles.loadingText}>Carregando dados do usuário...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        <View style={styles.formContainer}>
          <Text style={styles.title}>Editar Usuário</Text>
          <Text style={styles.description}>
            Atualize as informações do usuário. A senha só será alterada se preenchida.
          </Text>

          {/* Campo Nome */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Nome *</Text>
            <TextInput
              style={[styles.input, errors.nome ? styles.inputError : null]}
              value={usuario.nome}
              onChangeText={(text) => setUsuario({ ...usuario, nome: text })}
              placeholder="Digite o nome completo"
              placeholderTextColor="#6c757d"
            />
            {errors.nome && <Text style={styles.errorText}>{errors.nome}</Text>}
          </View>

          {/* Campo Email (readonly) */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={usuario.email}
              editable={false}
              placeholder="Email (não pode ser alterado)"
              placeholderTextColor="#6c757d"
            />
            <Text style={styles.infoText}>
              O email não pode ser alterado após o cadastro
            </Text>
          </View>

          {/* Campo Telefone */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Telefone</Text>
            <TextInput
              style={[styles.input, errors.telefone ? styles.inputError : null]}
              value={usuario.telefone}
              onChangeText={handleTelefoneChange}
              placeholder="(11) 99999-9999"
              placeholderTextColor="#6c757d"
              keyboardType="numeric"
              maxLength={15}
            />
            {errors.telefone && <Text style={styles.errorText}>{errors.telefone}</Text>}
          </View>

          {/* Campo Nova Senha */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Nova Senha</Text>
            <TextInput
              style={[styles.input, errors.senha ? styles.inputError : null]}
              value={usuario.senha}
              onChangeText={(text) => setUsuario({ ...usuario, senha: text })}
              placeholder="Digite a nova senha (opcional)"
              placeholderTextColor="#6c757d"
              secureTextEntry
            />
            {errors.senha && <Text style={styles.errorText}>{errors.senha}</Text>}
            <Text style={styles.infoText}>
              Deixe em branco para manter a senha atual
            </Text>
          </View>

          {/* Campo Confirmar Nova Senha */}
          {usuario.senha && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirmar Nova Senha *</Text>
              <TextInput
                style={[styles.input, errors.senhaConfirmacao ? styles.inputError : null]}
                value={senhaConfirmacao}
                onChangeText={setSenhaConfirmacao}
                placeholder="Confirme a nova senha"
                placeholderTextColor="#6c757d"
                secureTextEntry
              />
              {errors.senhaConfirmacao && (
                <Text style={styles.errorText}>{errors.senhaConfirmacao}</Text>
              )}
            </View>
          )}

          {/* Botões */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSalvar}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Salvar Alterações</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.buttonSecondary}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={styles.buttonSecondaryText}>Cancelar</Text>
          </TouchableOpacity>

          <Text style={styles.requiredText}>
            * Campos obrigatórios
          </Text>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  keyboardContainer: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
    paddingVertical: 20,
    minHeight: '100%',
  },
  formContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#404040',
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    color: '#ffffff',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    color: '#6c757d',
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#ffffff',
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#404040',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#1a1a1a',
    color: '#ffffff',
    minHeight: 48,
    textAlignVertical: 'center',
  },
  inputDisabled: {
    backgroundColor: '#2a2a2a',
    color: '#6c757d',
  },
  inputError: {
    borderColor: '#dc3545',
  },
  errorText: {
    color: '#dc3545',
    fontSize: 14,
    marginTop: 6,
  },
  infoText: {
    color: '#6c757d',
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
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
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: 'rgba(108, 117, 125, 0.4)',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonSecondary: {
    borderWidth: 1.5,
    borderColor: 'rgba(108, 117, 125, 0.8)',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: 'transparent',
  },
  buttonSecondaryText: {
    color: '#6c757d',
    fontSize: 18,
    fontWeight: 'bold',
  },
  requiredText: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 16,
  },
  loadingText: {
    color: '#6c757d',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
});

export default EditUsuario;
