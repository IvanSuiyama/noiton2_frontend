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
import TarefaInterface from './tarefaInterface';
import {getUserId, apiCall} from '../../services/authService';

// Tipo baseado na TarefaInterface, omitindo id_tarefa que é gerado no backend
type FormData = Omit<TarefaInterface, 'id_tarefa' | 'data_criacao'>;

const CadTarefa: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    titulo: '',
    descricao: '',
    data_expiracao: undefined,
    status: 'pendente',
    prioridade: 'media',
    comentarios: '',
    id_usuario: 0, // Será obtido do contexto de autenticação
    id_categoria: undefined,
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<
    Partial<Pick<FormData, 'titulo' | 'descricao'>>
  >({});

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

  // Função para validar formulário
  const validarFormulario = (): boolean => {
    const newErrors: Partial<Pick<FormData, 'titulo' | 'descricao'>> = {};

    if (!formData.titulo.trim()) {
      newErrors.titulo = 'Título é obrigatório';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const cadastrarTarefa = async (): Promise<void> => {
    if (!validarFormulario()) {
      return;
    }

    setLoading(true);
    try {
      await apiCall('/tarefas', 'POST', {
        titulo: formData.titulo,
        descricao: formData.descricao || null,
        data_expiracao: formData.data_expiracao || null,
        status: formData.status,
        prioridade: formData.prioridade,
        comentarios: formData.comentarios || null,
        id_usuario: formData.id_usuario,
        id_categoria: formData.id_categoria || null,
      });

      Alert.alert('Sucesso', 'Tarefa cadastrada com sucesso!', [
        {
          text: 'OK',
          onPress: () => {
            // Limpar formulário
            setFormData(prev => ({
              titulo: '',
              descricao: '',
              data_expiracao: undefined,
              status: 'pendente',
              prioridade: 'media',
              comentarios: '',
              id_usuario: prev.id_usuario, // Manter ID do usuário
              id_categoria: undefined,
            }));
            setErrors({});
          },
        },
      ]);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      Alert.alert('Erro', errorMessage);
      console.error('Erro ao cadastrar tarefa:', error);
    } finally {
      setLoading(false);
    }
  };

  // Função para atualizar campos do formulário
  const updateField = (field: keyof FormData, value: any) => {
    setFormData(prev => ({...prev, [field]: value}));
    // Limpar erro do campo quando usuário começar a digitar
    if (field === 'titulo' || field === 'descricao') {
      if (errors[field as keyof typeof errors]) {
        setErrors(prev => ({...prev, [field]: undefined}));
      }
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
          <Text style={styles.title}>Cadastro de Tarefa</Text>

          {/* Campo Título */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Título *</Text>
            <TextInput
              style={[styles.input, errors.titulo ? styles.inputError : null]}
              placeholder="Digite o título da tarefa"
              placeholderTextColor="#a0a0a0"
              value={formData.titulo}
              onChangeText={text => updateField('titulo', text)}
              autoCapitalize="sentences"
              editable={!loading}
            />
            {errors.titulo && (
              <Text style={styles.errorText}>{errors.titulo}</Text>
            )}
          </View>

          {/* Campo Descrição */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Descrição</Text>
            <TextInput
              style={[styles.textArea]}
              placeholder="Digite a descrição da tarefa (opcional)"
              placeholderTextColor="#a0a0a0"
              value={formData.descricao}
              onChangeText={text => updateField('descricao', text)}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!loading}
            />
          </View>

          {/* Campo Status */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Status</Text>
            <View style={styles.optionsContainer}>
              {['pendente', 'em_andamento', 'concluida', 'cancelada'].map(
                option => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.optionButton,
                      formData.status === option && styles.optionButtonSelected,
                    ]}
                    onPress={() => updateField('status', option)}
                    disabled={loading}>
                    <Text
                      style={[
                        styles.optionText,
                        formData.status === option && styles.optionTextSelected,
                      ]}>
                      {option === 'pendente' && 'Pendente'}
                      {option === 'em_andamento' && 'Em Andamento'}
                      {option === 'concluida' && 'Concluída'}
                      {option === 'cancelada' && 'Cancelada'}
                    </Text>
                  </TouchableOpacity>
                ),
              )}
            </View>
          </View>

          {/* Campo Prioridade */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Prioridade</Text>
            <View style={styles.optionsContainer}>
              {['baixa', 'media', 'alta', 'urgente'].map(option => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.optionButton,
                    formData.prioridade === option &&
                      styles.optionButtonSelected,
                  ]}
                  onPress={() => updateField('prioridade', option)}
                  disabled={loading}>
                  <Text
                    style={[
                      styles.optionText,
                      formData.prioridade === option &&
                        styles.optionTextSelected,
                    ]}>
                    {option === 'baixa' && 'Baixa'}
                    {option === 'media' && 'Média'}
                    {option === 'alta' && 'Alta'}
                    {option === 'urgente' && 'Urgente'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Campo Comentários */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Comentários</Text>
            <TextInput
              style={[styles.textArea]}
              placeholder="Digite comentários adicionais (opcional)"
              placeholderTextColor="#a0a0a0"
              value={formData.comentarios}
              onChangeText={text => updateField('comentarios', text)}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              editable={!loading}
            />
          </View>

          {/* Botão Cadastrar */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={cadastrarTarefa}
            disabled={loading}>
            <Text style={styles.buttonText}>
              {loading ? 'Cadastrando...' : 'Cadastrar Tarefa'}
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
  input: {
    borderWidth: 1.5,
    borderColor: '#ffffff', // Borda branca
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    backgroundColor: 'transparent', // Fundo transparente
    color: '#ffffff', // Texto branco
  },
  textArea: {
    borderWidth: 1.5,
    borderColor: '#ffffff', // Borda branca
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    backgroundColor: 'transparent', // Fundo transparente
    color: '#ffffff', // Texto branco
    minHeight: 100,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    borderWidth: 1.5,
    borderColor: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'transparent',
  },
  optionButtonSelected: {
    backgroundColor: '#007acc',
    borderColor: '#007acc',
  },
  optionText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  optionTextSelected: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  pickerContainer: {
    borderWidth: 1.5,
    borderColor: '#ffffff',
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  picker: {
    color: '#ffffff',
    backgroundColor: 'transparent',
  },
  inputError: {
    borderColor: '#ff6b6b', // Vermelho mais suave para erros
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    marginTop: 6,
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

export default CadTarefa;
