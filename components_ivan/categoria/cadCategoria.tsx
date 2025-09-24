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
} from 'react-native';
import CategoriaInterface from './categoriaInterface';
import {getUserId, apiCall} from '../../services/authService';

// Tipo baseado na CategoriaInterface, omitindo id_categoria que é gerado no backend
type FormData = Omit<CategoriaInterface, 'id_categoria'>;

const CadCategoria: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    nome: '',
    cor: '',
    id_usuario: 0, // Será obtido do contexto de autenticação
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<Partial<Pick<FormData, 'nome'>>>({});

  // Obter ID do usuário logado ao inicializar o componente
  useEffect(() => {
    const obterUsuarioLogado = async () => {
      try {
        const userId = await getUserId();
        if (userId) {
          setFormData(prev => ({...prev, id_usuario: userId}));
        }
      } catch (error) {
        console.error('Erro ao obter ID do usuário:', error);
        Alert.alert(
          'Erro',
          'Erro ao obter dados do usuário. Faça login novamente.',
        );
      }
    };

    obterUsuarioLogado();
  }, []);

  // Cores predefinidas para categoria
  const coresPredefinidas = [
    '#ff6b6b',
    '#4ecdc4',
    '#45b7d1',
    '#96ceb4',
    '#ffeaa7',
    '#dda0dd',
    '#98d8c8',
    '#f7dc6f',
    '#bb8fce',
    '#85c1e9',
  ];

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

    setLoading(true);
    try {
      await apiCall('/categorias', 'POST', {
        nome: formData.nome,
        cor: formData.cor || null,
        id_usuario: formData.id_usuario,
      });

      Alert.alert('Sucesso', 'Categoria cadastrada com sucesso!', [
        {
          text: 'OK',
          onPress: () => {
            // Limpar formulário
            setFormData(prev => ({
              nome: '',
              cor: '',
              id_usuario: prev.id_usuario, // Manter ID do usuário
            }));
            setErrors({});
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
  const updateField = (field: keyof FormData, value: string | number) => {
    setFormData(prev => ({...prev, [field]: value}));
    // Limpar erro do campo quando usuário começar a digitar
    if (field === 'nome' && errors.nome) {
      setErrors(prev => ({...prev, nome: undefined}));
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

          {/* Campo Nome */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Nome *</Text>
            <TextInput
              style={[styles.input, errors.nome ? styles.inputError : null]}
              placeholder="Digite o nome da categoria"
              placeholderTextColor="#a0a0a0"
              value={formData.nome}
              onChangeText={text => updateField('nome', text)}
              autoCapitalize="words"
              editable={!loading}
            />
            {errors.nome && <Text style={styles.errorText}>{errors.nome}</Text>}
          </View>

          {/* Campo Cor */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Cor da Categoria</Text>
            <Text style={styles.subLabel}>
              Selecione uma cor ou digite o código hexadecimal
            </Text>

            {/* Cores predefinidas */}
            <View style={styles.colorsContainer}>
              {coresPredefinidas.map(cor => (
                <TouchableOpacity
                  key={cor}
                  style={[
                    styles.colorButton,
                    {backgroundColor: cor},
                    formData.cor === cor && styles.colorButtonSelected,
                  ]}
                  onPress={() => updateField('cor', cor)}
                  disabled={loading}
                />
              ))}
            </View>

            {/* Input para cor personalizada */}
            <TextInput
              style={styles.input}
              placeholder="Ex: #ff6b6b (opcional)"
              placeholderTextColor="#a0a0a0"
              value={formData.cor}
              onChangeText={text => updateField('cor', text)}
              autoCapitalize="none"
              editable={!loading}
            />

            {/* Preview da cor selecionada */}
            {formData.cor && (
              <View style={styles.previewContainer}>
                <Text style={styles.previewLabel}>Preview:</Text>
                <View
                  style={[styles.previewColor, {backgroundColor: formData.cor}]}
                />
              </View>
            )}
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
    marginBottom: 32,
    color: '#ffffff', // Texto branco
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
  subLabel: {
    fontSize: 14,
    marginBottom: 12,
    color: '#a0a0a0', // Cinza claro para texto secundário
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
  colorsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  colorButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorButtonSelected: {
    borderColor: '#ffffff',
    shadowColor: '#ffffff',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 8,
  },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  previewLabel: {
    color: '#ffffff',
    fontSize: 14,
    marginRight: 12,
  },
  previewColor: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#ffffff',
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

export default CadCategoria;
