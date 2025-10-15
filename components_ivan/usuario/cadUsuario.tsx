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
import UserInterface from './userInterface';

type CadUsuarioNavigationProp = StackNavigationProp<
  RootStackParamList,
  'CadastroUsuario'
>;

type Props = {
  navigation: CadUsuarioNavigationProp;
};

// Tipo baseado na UserInterface, omitindo id_usuario que é gerado no backend
type FormData = Omit<UserInterface, 'id_usuario'>;

const CadUsuario: React.FC<Props> = ({navigation}) => {
  const [formData, setFormData] = useState<FormData>({
    nome: '',
    email: '',
    senha: '',
    telefone: '',
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<Partial<FormData>>({});

  // Função para validar formulário
  const validarFormulario = (): boolean => {
    const newErrors: Partial<FormData> = {};

    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Formato de email inválido';
    }

    if (!formData.senha.trim()) {
      newErrors.senha = 'Senha é obrigatória';
    } else if (formData.senha.length < 6) {
      newErrors.senha = 'Senha deve ter pelo menos 6 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const cadastrarUsuario = async (): Promise<void> => {
    if (!validarFormulario()) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://10.250.160.119:3000/usuarios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nome: formData.nome,
          email: formData.email,
          senha: formData.senha,
          telefone: formData.telefone || null,
        }),
      });

      if (response.ok) {
        Alert.alert('Sucesso', 'Usuário cadastrado com sucesso!', [
          {
            text: 'OK',
            onPress: () => {
              // Redirecionar para a tela de login
              navigation.navigate('Login');
            },
          },
        ]);
      } else {
        const errorData = await response.json();
        Alert.alert('Erro', errorData.error || 'Erro ao cadastrar usuário');
      }
    } catch (error) {
      Alert.alert('Erro', 'Erro de conexão com o servidor');
      console.error('Erro ao cadastrar usuário:', error);
    } finally {
      setLoading(false);
    }
  };

  // Função para atualizar campos do formulário
  const updateField = (field: keyof FormData, value: string) => {
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
          <Text style={styles.title}>Cadastro de Usuário</Text>

          {/* Campo Nome */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Nome *</Text>
            <TextInput
              style={[styles.input, errors.nome ? styles.inputError : null]}
              placeholder="Digite seu nome"
              placeholderTextColor="#a0a0a0"
              value={formData.nome}
              onChangeText={text => updateField('nome', text)}
              autoCapitalize="words"
              editable={!loading}
            />
            {errors.nome && <Text style={styles.errorText}>{errors.nome}</Text>}
          </View>

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

          {/* Campo Telefone (Opcional) */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Telefone</Text>
            <TextInput
              style={styles.input}
              placeholder="Digite seu telefone (opcional)"
              placeholderTextColor="#a0a0a0"
              value={formData.telefone}
              onChangeText={text => updateField('telefone', text)}
              keyboardType="phone-pad"
              editable={!loading}
            />
          </View>

          {/* Botão Cadastrar */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={cadastrarUsuario}
            disabled={loading}>
            <Text style={styles.buttonText}>
              {loading ? 'Cadastrando...' : 'Cadastrar'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.requiredText}>* Campos obrigatórios</Text>
        </View>
      </ScrollView>
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
    marginBottom: 32,
    color: '#fff',
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
});

export default CadUsuario;
