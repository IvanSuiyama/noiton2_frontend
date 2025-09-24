import React, {useState, useEffect} from 'react';
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
  Switch,
} from 'react-native';
import WorkspaceInterface from './workspaceInterface';
import {getUserEmail, apiCall} from '../../services/authService';

// Tipo baseado na WorkspaceInterface, omitindo id_workspace que é gerado no backend
type FormData = Omit<WorkspaceInterface, 'id_workspace'>;

const CadWorkspace: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    nome: '',
    equipe: false,
    criador: '', // Será obtido do contexto de autenticação
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<
    Partial<Pick<FormData, 'nome' | 'criador'>>
  >({});

  // Obter email do usuário logado ao inicializar o componente
  useEffect(() => {
    const obterUsuarioLogado = async () => {
      try {
        const userEmail = await getUserEmail();
        if (userEmail) {
          setFormData(prev => ({...prev, criador: userEmail}));
        }
      } catch (error) {
        console.error('Erro ao obter email do usuário:', error);
        Alert.alert(
          'Erro',
          'Erro ao obter dados do usuário. Faça login novamente.',
        );
      }
    };

    obterUsuarioLogado();
  }, []);

  // Função para validar formulário
  const validarFormulario = (): boolean => {
    const newErrors: Partial<Pick<FormData, 'nome' | 'criador'>> = {};

    if (!formData.nome?.trim()) {
      newErrors.nome = 'Nome é obrigatório';
    }

    if (!formData.criador?.trim()) {
      newErrors.criador = 'Criador é obrigatório';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const cadastrarWorkspace = async (): Promise<void> => {
    if (!validarFormulario()) {
      return;
    }

    setLoading(true);
    try {
      await apiCall('/workspaces', 'POST', {
        nome: formData.nome,
        equipe: formData.equipe,
        criador: formData.criador,
      });

      Alert.alert('Sucesso', 'Workspace cadastrado com sucesso!', [
        {
          text: 'OK',
          onPress: () => {
            // Limpar formulário
            setFormData(prev => ({
              nome: '',
              equipe: false,
              criador: prev.criador, // Manter email do usuário
            }));
            setErrors({});
          },
        },
      ]);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      Alert.alert('Erro', errorMessage);
      console.error('Erro ao cadastrar workspace:', error);
    } finally {
      setLoading(false);
    }
  };

  // Função para atualizar campos do formulário
  const updateField = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({...prev, [field]: value}));
    // Limpar erro do campo quando usuário começar a digitar
    if ((field === 'nome' || field === 'criador') && errors[field]) {
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
          <Text style={styles.title}>Cadastro de Workspace</Text>

          <Text style={styles.description}>
            Crie um novo workspace para organizar suas tarefas e colaborar com
            sua equipe.
          </Text>

          {/* Campo Nome */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Nome do Workspace *</Text>
            <TextInput
              style={[styles.input, errors.nome ? styles.inputError : null]}
              placeholder="Digite o nome do workspace"
              placeholderTextColor="#a0a0a0"
              value={formData.nome}
              onChangeText={text => updateField('nome', text)}
              autoCapitalize="words"
              editable={!loading}
            />
            {errors.nome && <Text style={styles.errorText}>{errors.nome}</Text>}
          </View>

          {/* Campo Criador */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Criador *</Text>
            <TextInput
              style={[styles.input, errors.criador ? styles.inputError : null]}
              placeholder="Digite o email do criador"
              placeholderTextColor="#a0a0a0"
              value={formData.criador}
              onChangeText={text => updateField('criador', text)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
            {errors.criador && (
              <Text style={styles.errorText}>{errors.criador}</Text>
            )}
          </View>

          {/* Switch Equipe */}
          <View style={styles.switchContainer}>
            <View style={styles.switchContent}>
              <View style={styles.switchTextContainer}>
                <Text style={styles.switchLabel}>Workspace de Equipe</Text>
                <Text style={styles.switchDescription}>
                  Permitir que outros usuários colaborem neste workspace
                </Text>
              </View>
              <Switch
                value={formData.equipe}
                onValueChange={value => updateField('equipe', value)}
                trackColor={{false: '#5a5d61', true: '#007acc'}}
                thumbColor={formData.equipe ? '#ffffff' : '#a0a0a0'}
                ios_backgroundColor="#5a5d61"
                disabled={loading}
              />
            </View>
          </View>

          {/* Informações adicionais se for equipe */}
          {formData.equipe && (
            <View style={styles.infoContainer}>
              <Text style={styles.infoIcon}>👥</Text>
              <Text style={styles.infoText}>
                Como workspace de equipe, você poderá convidar outros usuários
                para colaborar e compartilhar tarefas.
              </Text>
            </View>
          )}

          {/* Botão Cadastrar */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={cadastrarWorkspace}
            disabled={loading}>
            <Text style={styles.buttonText}>
              {loading ? 'Cadastrando...' : 'Criar Workspace'}
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
    backgroundColor: '#2f3437', // Cinza escuro do Notion
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  formContainer: {
    backgroundColor: '#373b3f', // Cinza um pouco mais claro para o card
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    color: '#ffffff', // Texto branco
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    color: '#a0a0a0', // Cinza claro para texto secundário
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#ffffff', // Label branca
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#ffffff', // Borda branca
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    backgroundColor: 'transparent', // Fundo transparente
    color: '#ffffff', // Texto branco
  },
  inputError: {
    borderColor: '#ff6b6b', // Vermelho mais suave para erros
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    marginTop: 6,
  },
  switchContainer: {
    marginBottom: 24,
  },
  switchContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  switchTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  switchDescription: {
    fontSize: 14,
    color: '#a0a0a0',
    lineHeight: 18,
  },
  infoContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 122, 204, 0.1)',
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 204, 0.3)',
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#ffffff',
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#007acc', // Azul do Notion
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#007acc',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: '#5a5d61', // Cinza para desabilitado
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  requiredText: {
    fontSize: 12,
    color: '#a0a0a0', // Cinza claro para texto secundário
    textAlign: 'center',
    marginTop: 16,
  },
});

export default CadWorkspace;
