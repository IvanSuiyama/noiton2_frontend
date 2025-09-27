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
import {StackNavigationProp} from '@react-navigation/stack';
import {RootStackParamList} from '../router';
import WorkspaceInterface from './workspaceInterface';
import {getUserEmail, apiCall, setActiveWorkspace} from '../../services/authService';

type CadWorkspaceNavigationProp = StackNavigationProp<
  RootStackParamList,
  'CadastroWorkspace'
>;

type Props = {
  navigation: CadWorkspaceNavigationProp;
};

// Tipo baseado na WorkspaceInterface, omitindo id_workspace que é gerado no backend
type FormData = Omit<WorkspaceInterface, 'id_workspace'>;

const CadWorkspace: React.FC<Props> = ({navigation}) => {
  const [formData, setFormData] = useState<FormData>({
    nome: '',
    equipe: false,
    criador: '', // Será obtido do contexto de autenticação
    emails: [], // Lista de emails dos membros
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
          setFormData(prev => ({
            ...prev, 
            criador: userEmail,
            emails: [userEmail] // Incluir o criador na lista de emails automaticamente
          }));
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
      // Garantir que o criador sempre esteja na lista de emails
      const emailsComCriador = formData.emails.includes(formData.criador) 
        ? formData.emails 
        : [formData.criador, ...formData.emails];

      const response = await apiCall('/workspaces', 'POST', {
        nome: formData.nome,
        equipe: formData.equipe,
        criador: formData.criador,
        emails: emailsComCriador, // Enviar a lista de emails incluindo o criador
      });

      // Definir o workspace recém-criado como ativo (id e nome)
      if (response && response.id_workspace) {
        await setActiveWorkspace(response.id_workspace, formData.nome || 'Workspace');
      }

      Alert.alert('Sucesso', 'Workspace cadastrado com sucesso!', [
        {
          text: 'OK',
          onPress: () => {
            // Redirecionar para a tela principal
            navigation.navigate('Home');
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
  const updateField = (field: keyof FormData, value: string | boolean | string[]) => {
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
              placeholderTextColor="#6c757d"
              value={formData.nome}
              onChangeText={text => updateField('nome', text)}
              autoCapitalize="words"
              editable={!loading}
              keyboardType="default"
              autoCorrect={true}
              // Permite acentos e caracteres especiais normalmente
            />
            {errors.nome && <Text style={styles.errorText}>{errors.nome}</Text>}
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
                trackColor={{false: '#dee2e6', true: 'rgba(108, 117, 125, 0.6)'}}
                thumbColor={formData.equipe ? '#ffffff' : '#6c757d'}
                ios_backgroundColor="#dee2e6"
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
    backgroundColor: '#1a1a1a', // Fundo escuro padronizado
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  formContainer: {
    backgroundColor: '#2a2a2a', // Cinza escuro para o card
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
    borderWidth: 1,
    borderColor: '#404040', // Borda cinza
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
    color: '#6c757d', // Cinza claro padronizado
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
    borderColor: '#404040', // Borda cinza escuro
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#1a1a1a', // Fundo escuro
    color: '#ffffff', // Texto branco
  },
  inputError: {
    borderColor: '#dc3545', // Vermelho para erros
  },
  errorText: {
    color: '#dc3545',
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
    color: '#ffffff', // Texto branco
    marginBottom: 4,
  },
  switchDescription: {
    fontSize: 14,
    color: '#6c757d', // Cinza claro padronizado
    lineHeight: 18,
  },
  infoContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(108, 117, 125, 0.2)', // Fundo cinza transparente mais escuro
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(108, 117, 125, 0.5)', // Borda mais visível no tema escuro
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#ffffff', // Texto branco
    lineHeight: 20,
  },
  button: {
    backgroundColor: 'rgba(108, 117, 125, 0.8)', // Cinza transparente padronizado
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
    backgroundColor: 'rgba(108, 117, 125, 0.4)', // Cinza mais claro quando desabilitado
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  requiredText: {
    fontSize: 12,
    color: '#6c757d', // Cinza claro padronizado
    textAlign: 'center',
    marginTop: 16,
  },
});

export default CadWorkspace;
