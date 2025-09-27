import React, {useState, useEffect} from 'react';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../router';
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
import CategoriaInterface from './categoriaInterface';
import {getUserEmail, apiCall} from '../../services/authService';

// Tipo baseado na CategoriaInterface, omitindo id_categoria que é gerado no backend
type FormData = Omit<CategoriaInterface, 'id_categoria'>;

const CadCategoria: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [formData, setFormData] = useState<FormData>({
    nome: '',
    cor: '', // cor será definida aleatoriamente no cadastro
    id_workspace: 1, // TODO: Obter do contexto/parâmetro de navegação
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<Partial<Pick<FormData, 'nome'>>>({});
  const [workspaceAtual, setWorkspaceAtual] = useState<number>(1); // TODO: Implementar seleção de workspace

  // Obter workspace atual ao inicializar o componente
  useEffect(() => {
    const inicializarWorkspace = async () => {
      try {
        // TODO: Implementar obtenção do workspace atual
        // Por enquanto, usar workspace padrão (ID = 1)
        const workspaceId = 1; // Será obtido do contexto de navegação/parâmetro
        setWorkspaceAtual(workspaceId);
        setFormData(prev => ({...prev, id_workspace: workspaceId}));
      } catch (error) {
        console.error('Erro ao inicializar workspace:', error);
        Alert.alert(
          'Erro',
          'Erro ao obter dados do workspace.',
        );
      }
    };

    inicializarWorkspace();
  }, []);



  // Função para validar formulário
  const validarFormulario = (): boolean => {
    const newErrors: Partial<Pick<FormData, 'nome'>> = {};

    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const cadastrarCategoria = async (): Promise<void> => {
    if (!validarFormulario()) {
      return;
    }

    // Seleciona uma cor aleatória
    const coresPredefinidas = [
      '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3', '#ff9f43', '#10ac84', '#ee5a24'
    ];
    const corAleatoria = coresPredefinidas[Math.floor(Math.random() * coresPredefinidas.length)];

    setLoading(true);
    try {
      await apiCall('/categorias', 'POST', {
        nome: formData.nome,
        cor: corAleatoria,
        id_workspace: formData.id_workspace,
      });

      Alert.alert('Sucesso', 'Categoria cadastrada com sucesso!', [
        {
          text: 'OK',
          onPress: () => {
            // Limpar formulário
            setFormData(prev => ({
              nome: '',
              cor: '',
              id_workspace: prev.id_workspace,
            }));
            setErrors({});
            // Redirecionar para Home
            navigation.reset({
              index: 0,
              routes: [{ name: 'Home' }],
            });
          },
        },
      ]);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      Alert.alert('Erro', errorMessage);
      console.error('Erro ao cadastrar categoria:', error);
    } finally {
      setLoading(false);
    }
  };

  // Função para atualizar campos do formulário
  const updateField = (field: keyof FormData, value: any) => {
    setFormData(prev => ({...prev, [field]: value}));
    // Limpar erro do campo quando usuário começar a digitar
    if (field === 'nome' && errors[field]) {
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
          <Text style={styles.title}>Cadastro de Categoria</Text>

          <Text style={styles.description}>
            Workspace: #{workspaceAtual}
          </Text>

          {/* Campo Nome */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Nome da Categoria *</Text>
            <TextInput
              style={[styles.input, errors.nome ? styles.inputError : null]}
              placeholder="Digite o nome da categoria"
              placeholderTextColor="#6c757d"
              value={formData.nome}
              onChangeText={text => updateField('nome', text)}
              autoCapitalize="words"
              editable={!loading}
            />
            {errors.nome && <Text style={styles.errorText}>{errors.nome}</Text>}
          </View>



          {/* Botão Cadastrar */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={cadastrarCategoria}
            disabled={loading}>
            <Text style={styles.buttonText}>
              {loading ? 'Cadastrando...' : 'Cadastrar Categoria'}
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
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#404040', // Fundo cinza escuro
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#555555', // Borda mais clara
  },
  colorPreview: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#ffffff', // Borda branca
  },
  colorPreviewText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  colorScrollContainer: {
    paddingVertical: 8,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: '#ffffff',
    borderWidth: 3,
    transform: [{scale: 1.1}],
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

export default CadCategoria;