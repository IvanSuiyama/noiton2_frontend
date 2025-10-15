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
  Modal,
  FlatList,
} from 'react-native';
import {StackNavigationProp} from '@react-navigation/stack';
import {RouteProp} from '@react-navigation/native';
import {RootStackParamList} from '../router';
import CategoriaInterface from '../categoria/categoriaInterface';
import {apiCall, getActiveWorkspaceId} from '../../services/authService';

type EditTarefaNavigationProp = StackNavigationProp<RootStackParamList>;
type EditTarefaRouteProp = RouteProp<RootStackParamList, 'EditTarefa'>;

interface EditTarefaProps {
  navigation: EditTarefaNavigationProp;
  route: EditTarefaRouteProp;
}

interface TarefaData {
  id_tarefa: number;
  titulo: string;
  descricao: string;
  data_fim: string;
  status: 'a_fazer' | 'em_andamento' | 'concluido' | 'atrasada';
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente';
  recorrente: boolean;
  recorrencia?: 'diaria' | 'semanal' | 'mensal';
  id_workspace: number;
  categorias_selecionadas: number[]; // Array de IDs das categorias (relacionamento via tarefa_categoria)
}

// Opções para os seletores
const PRIORIDADES = [
  {label: 'Baixa', value: 'baixa'},
  {label: 'Média', value: 'media'},
  {label: 'Alta', value: 'alta'},
  {label: 'Urgente', value: 'urgente'},
];

const STATUS_OPTIONS = [
  {label: 'A Fazer', value: 'a_fazer'},
  {label: 'Em Andamento', value: 'em_andamento'},
  {label: 'Concluído', value: 'concluido'},
  {label: 'Atrasada', value: 'atrasada'},
];

const FREQUENCIAS = [
  {label: 'Diária', value: 'diaria'},
  {label: 'Semanal', value: 'semanal'},
  {label: 'Mensal', value: 'mensal'},
];

const EditTarefa: React.FC<EditTarefaProps> = ({navigation, route}) => {
  const {id_tarefa} = route.params;
  
  const [formData, setFormData] = useState<TarefaData>({
    id_tarefa: 0,
    titulo: '',
    descricao: '',
    data_fim: '',
    status: 'a_fazer',
    prioridade: 'media',
    recorrente: false,
    recorrencia: undefined,
    id_workspace: 0,
    categorias_selecionadas: [],
  });
  const [tarefaOriginal, setTarefaOriginal] = useState<TarefaData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingTarefa, setLoadingTarefa] = useState<boolean>(true);
  const [errors, setErrors] = useState<
    Partial<Pick<TarefaData, 'titulo' | 'data_fim'>>
  >({});
  const [categoriasDisponiveis, setCategoriasDisponiveis] = useState<
    CategoriaInterface[]
  >([]);

  // Estados para modals dos seletores
  const [modalPrioridade, setModalPrioridade] = useState<boolean>(false);
  const [modalStatus, setModalStatus] = useState<boolean>(false);
  const [modalCategoria, setModalCategoria] = useState<boolean>(false);
  const [modalFrequencia, setModalFrequencia] = useState<boolean>(false);

  // Carregar dados da tarefa ao inicializar
  useEffect(() => {
    carregarDadosTarefa();
  }, []);

  // Função para carregar dados do usuário logado


  // Carregar categorias quando workspace for definido
  useEffect(() => {
    if (formData.id_workspace) {
      carregarCategorias();
    }
  }, [formData.id_workspace]);

  const carregarDadosTarefa = async () => {
    setLoadingTarefa(true);
    try {
      // Primeiro, buscar o id_workspace ativo se não estiver definido

      let idWorkspace: number = formData.id_workspace;
      if (!idWorkspace) {
        // Se não estiver no formData, tente buscar do serviço
        const ws = await getActiveWorkspaceId();
        if (ws == null) {
          throw new Error('Workspace não definido');
        }
        idWorkspace = ws;
      }
      // Buscar tarefa pela rota correta
      const tarefa = await apiCall(`/tarefas/workspace/${idWorkspace}/tarefa/${id_tarefa}`, 'GET');
      
      // Verificar permissão para editar
      if (tarefa && tarefa.pode_editar === false) {
        Alert.alert(
          'Permissão negada', 
          'Você não tem permissão para editar esta tarefa.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        return;
      }

      // Buscar categorias associadas à tarefa
      let categoriasTarefa = [];
      try {
        const categoriasResponse = await apiCall(`/tarefas/${id_tarefa}/categorias`, 'GET');
        categoriasTarefa = categoriasResponse.map((cat: any) => cat.id_categoria);
      } catch (error) {
        console.log('Nenhuma categoria encontrada para a tarefa:', error);
      }

      const tarefaFormatada: TarefaData = {
        id_tarefa: tarefa.id_tarefa,
        titulo: tarefa.titulo || '',
        descricao: tarefa.descricao || '',
        data_fim: tarefa.data_fim || '',
        status: tarefa.status || 'a_fazer',
        prioridade: tarefa.prioridade || 'media',
        recorrente: tarefa.recorrente || false,
        recorrencia: tarefa.recorrencia,
        id_workspace: tarefa.id_workspace,
        categorias_selecionadas: categoriasTarefa,
      };

      setFormData(tarefaFormatada);
      setTarefaOriginal(tarefaFormatada);
    } catch (error) {
      console.error('Erro ao carregar dados da tarefa:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados da tarefa', [
        {text: 'OK', onPress: () => navigation.goBack()},
      ]);
    } finally {
      setLoadingTarefa(false);
    }
  };

  const carregarCategorias = async () => {
    try {
      const categorias = await apiCall(
        `/categorias/workspace/${formData.id_workspace}`,
        'GET',
      );
      setCategoriasDisponiveis(categorias);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      // Usar categorias mockadas em caso de erro
    }
  };

  // Função para validar formulário
  const validarFormulario = (): boolean => {
    const newErrors: Partial<Pick<TarefaData, 'titulo' | 'data_fim'>> = {};

    if (!formData.titulo.trim()) {
      newErrors.titulo = 'Título é obrigatório';
    }

    // Validar data de expiração se fornecida
    if (formData.data_fim) {
      const dataFim = new Date(formData.data_fim);
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      if (dataFim < hoje) {
        newErrors.data_fim = 'Data de expiração não pode ser anterior à hoje';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const atualizarTarefa = async (): Promise<void> => {
    if (!validarFormulario()) {
      return;
    }

    setLoading(true);
    try {
      // Preparar dados para envio (sem as categorias)
      const dadosEnvio = {
        titulo: formData.titulo,
        descricao: formData.descricao,
        data_fim: formData.data_fim || null,
        status: formData.status,
        prioridade: formData.prioridade,
        recorrente: formData.recorrente,
        recorrencia: formData.recorrente ? formData.recorrencia : null,
      };

      // Atualizar dados básicos da tarefa
      await apiCall(`/tarefas/${id_tarefa}`, 'PUT', dadosEnvio);

      // Atualizar categorias associadas (sempre sobrescreve)
      await apiCall(
        `/tarefas/${id_tarefa}/categorias`,
        'POST',
        { categorias: formData.categorias_selecionadas }
      );

      Alert.alert('Sucesso', 'Tarefa atualizada com sucesso!', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      Alert.alert('Erro', errorMessage);
      console.error('Erro ao atualizar tarefa:', error);
    } finally {
      setLoading(false);
    }
  };

  // Função para atualizar campos do formulário
  const updateField = (field: keyof TarefaData, value: any) => {
    setFormData(prev => ({...prev, [field]: value}));
    // Limpar erro do campo quando usuário começar a digitar
    if ((field === 'titulo' || field === 'data_fim') && errors[field]) {
      setErrors(prev => ({...prev, [field]: undefined}));
    }
  };

  // Função para toggle do checkbox recorrente (com validação)
  const toggleRecorrente = (value: boolean) => {
    if (!tarefaOriginal) {
      return;
    }

    // REGRA: Se a tarefa original não era recorrente, não pode se tornar recorrente
    if (!tarefaOriginal.recorrente && value === true) {
      Alert.alert(
        'Não permitido',
        'Uma tarefa não recorrente não pode ser convertida em recorrente.'
      );
      return;
    }

    // REGRA: Se a tarefa original era recorrente, ela permanece recorrente
    if (tarefaOriginal.recorrente && value === false) {
      Alert.alert(
        'Não permitido',
        'Uma tarefa recorrente não pode ser convertida em não recorrente.'
      );
      return;
    }

    setFormData(prev => ({
      ...prev,
      recorrente: value,
      recorrencia: value ? prev.recorrencia : undefined,
    }));
  };

  // Função para formatar data para input
  const formatarDataParaInput = (data: string) => {
    if (!data) {
      return '';
    }
    return data.split('T')[0];
  };

  // Função para formatar data do input
  const formatarDataDoInput = (data: string) => {
    if (!data) {
      return '';
    }
    return data + 'T00:00:00.000Z';
  };

  // Função para obter label da prioridade
  const getLabelPrioridade = (value: string) => {
    const item = PRIORIDADES.find(p => p.value === value);
    return item ? item.label : value;
  };

  // Função para obter label do status
  const getLabelStatus = (value: string) => {
    const item = STATUS_OPTIONS.find(s => s.value === value);
    return item ? item.label : value;
  };

  // Função para obter label da frequência
  const getLabelFrequencia = (value: string | undefined) => {
    if (!value) {
      return 'Selecione a frequência';
    }
    const item = FREQUENCIAS.find(f => f.value === value);
    return item ? item.label : value;
  };

  // Função para obter texto das categorias selecionadas
  const getTextoCategorias = (ids: number[]) => {
    if (ids.length === 0) {
      return 'Selecione as categorias';
    }
    if (ids.length === 1) {
      const categoria = categoriasDisponiveis.find(c => c.id_categoria === ids[0]);
      return categoria ? categoria.nome : 'Categoria não encontrada';
    }
    return `${ids.length} categorias selecionadas`;
  };

  // Função para toggle da categoria
  const toggleCategoria = (id_categoria: number) => {
    const categorias = [...formData.categorias_selecionadas];
    const index = categorias.indexOf(id_categoria);
    
    if (index > -1) {
      // Remove categoria se já estiver selecionada
      categorias.splice(index, 1);
    } else {
      // Adiciona categoria se não estiver selecionada
      categorias.push(id_categoria);
    }
    
    updateField('categorias_selecionadas', categorias);
  };

  if (loadingTarefa) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Carregando dados da tarefa...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled">
        <View style={styles.formContainer}>
          <Text style={styles.title}>Editar Tarefa</Text>

          <Text style={styles.description}>
            Tarefa #{formData.id_tarefa} - Workspace #{formData.id_workspace}
          </Text>

          {/* Campo Título */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Título *</Text>
            <TextInput
              style={[styles.input, errors.titulo ? styles.inputError : null]}
              placeholder="Digite o título da tarefa"
              placeholderTextColor="#6c757d"
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
              style={[styles.input, styles.textArea]}
              placeholder="Digite a descrição da tarefa"
              placeholderTextColor="#6c757d"
              value={formData.descricao}
              onChangeText={text => updateField('descricao', text)}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!loading}
            />
          </View>

          {/* Campo Data de Expiração */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Data de Expiração</Text>
            <TextInput
              style={[
                styles.input,
                errors.data_fim ? styles.inputError : null,
              ]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#6c757d"
              value={formatarDataParaInput(formData.data_fim || '')}
              onChangeText={text =>
                updateField('data_fim', formatarDataDoInput(text))
              }
              editable={!loading}
            />
            {errors.data_fim && (
              <Text style={styles.errorText}>{errors.data_fim}</Text>
            )}
          </View>

          {/* Campo Prioridade */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Prioridade *</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setModalPrioridade(true)}
              disabled={loading}>
              <Text style={styles.pickerButtonText}>
                {getLabelPrioridade(formData.prioridade)}
              </Text>
              <Text style={styles.pickerArrow}>▼</Text>
            </TouchableOpacity>
          </View>

          {/* Campo Status */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Status *</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setModalStatus(true)}
              disabled={loading}>
              <Text style={styles.pickerButtonText}>
                {getLabelStatus(formData.status)}
              </Text>
              <Text style={styles.pickerArrow}>▼</Text>
            </TouchableOpacity>
          </View>

          {/* Campo Categoria */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Categoria</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setModalCategoria(true)}
              disabled={loading}>
              <Text style={styles.pickerButtonText}>
                {getTextoCategorias(formData.categorias_selecionadas)}
              </Text>
              <Text style={styles.pickerArrow}>▼</Text>
            </TouchableOpacity>
          </View>

          {/* Switch Recorrente (com validação) */}
          <View style={styles.switchContainer}>
            <View style={styles.switchLabelContainer}>
              <Text style={styles.switchLabel}>Tarefa Recorrente?</Text>
              {tarefaOriginal && (
                <Text style={styles.switchHint}>
                  {tarefaOriginal.recorrente 
                    ? '(Permanece recorrente)'
                    : '(Não pode se tornar recorrente)'
                  }
                </Text>
              )}
            </View>
            <Switch
              value={formData.recorrente}
              onValueChange={toggleRecorrente}
              trackColor={{false: '#dee2e6', true: 'rgba(108, 117, 125, 0.6)'}}
              thumbColor={formData.recorrente ? '#ffffff' : '#6c757d'}
              disabled={loading}
            />
          </View>

          {/* Campo Frequência de Recorrência (condicional e editável) */}
          {formData.recorrente && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Recorrência *</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setModalFrequencia(true)}
                disabled={loading}>
                <Text style={styles.pickerButtonText}>
                  {getLabelFrequencia(formData.recorrencia)}
                </Text>
                <Text style={styles.pickerArrow}>▼</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Botão Atualizar */}
          <TouchableOpacity
            style={[styles.button, (loading ) && styles.buttonDisabled]}
            onPress={atualizarTarefa}
            disabled={loading }>
            <Text style={styles.buttonText}>
              {loading ? 'Atualizando...'  : 'Atualizar Tarefa'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.requiredText}>* Campos obrigatórios</Text>
        </View>
      </ScrollView>

      {/* Modals (idênticos aos do cadTarefa.tsx) */}
      {/* Modal Prioridade */}
      <Modal
        visible={modalPrioridade}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalPrioridade(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Selecione a Prioridade</Text>
            <FlatList
              data={PRIORIDADES}
              keyExtractor={item => item.value}
              renderItem={({item}) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    formData.prioridade === item.value &&
                      styles.modalItemSelected,
                  ]}
                  onPress={() => {
                    updateField('prioridade', item.value);
                    setModalPrioridade(false);
                  }}>
                  <Text
                    style={[
                      styles.modalItemText,
                      formData.prioridade === item.value &&
                        styles.modalItemTextSelected,
                    ]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setModalPrioridade(false)}>
              <Text style={styles.modalCloseButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Status */}
      <Modal
        visible={modalStatus}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalStatus(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Selecione o Status</Text>
            <FlatList
              data={STATUS_OPTIONS}
              keyExtractor={item => item.value}
              renderItem={({item}) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    formData.status === item.value && styles.modalItemSelected,
                  ]}
                  onPress={() => {
                    updateField('status', item.value);
                    setModalStatus(false);
                  }}>
                  <Text
                    style={[
                      styles.modalItemText,
                      formData.status === item.value &&
                        styles.modalItemTextSelected,
                    ]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setModalStatus(false)}>
              <Text style={styles.modalCloseButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Categoria */}
      <Modal
        visible={modalCategoria}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalCategoria(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Selecione a Categoria</Text>
            <TouchableOpacity
              style={[
                styles.modalItem,
                formData.categorias_selecionadas.length === 0 && styles.modalItemSelected,
              ]}
              onPress={() => {
                updateField('categorias_selecionadas', []);
                setModalCategoria(false);
              }}>
              <Text
                style={[
                  styles.modalItemText,
                  formData.categorias_selecionadas.length === 0 && styles.modalItemTextSelected,
                ]}>
                Limpar categorias
              </Text>
            </TouchableOpacity>
            <FlatList
              data={categoriasDisponiveis}
              keyExtractor={item => item.id_categoria.toString()}
              renderItem={({item}) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    formData.categorias_selecionadas.includes(item.id_categoria) &&
                      styles.modalItemSelected,
                  ]}
                  onPress={() => toggleCategoria(item.id_categoria)}>
                  <View style={styles.categoriaItem}>
                    <View
                      style={[
                        styles.categoriaColor,
                        {backgroundColor: '#888'},
                      ]}
                    />
                    <Text
                      style={[
                        styles.modalItemText,
                        formData.categorias_selecionadas.includes(item.id_categoria) &&
                          styles.modalItemTextSelected,
                      ]}>
                      {item.nome}
                    </Text>
                    {formData.categorias_selecionadas.includes(item.id_categoria) && (
                      <Text style={styles.checkIcon}>✓</Text>
                    )}
                  </View>
                </TouchableOpacity>
              )}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={() => setModalCategoria(false)}>
                <Text style={styles.modalConfirmButtonText}>Confirmar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setModalCategoria(false)}>
                <Text style={styles.modalCloseButtonText}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Frequência */}
      <Modal
        visible={modalFrequencia}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalFrequencia(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Selecione a Frequência</Text>
            <FlatList
              data={FREQUENCIAS}
              keyExtractor={item => item.value}
              renderItem={({item}) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    formData.recorrencia === item.value &&
                      styles.modalItemSelected,
                  ]}
                  onPress={() => {
                    updateField('recorrencia', item.value);
                    setModalFrequencia(false);
                  }}>
                  <Text
                    style={[
                      styles.modalItemText,
                      formData.recorrencia === item.value &&
                        styles.modalItemTextSelected,
                    ]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setModalFrequencia(false)}>
              <Text style={styles.modalCloseButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  formContainer: {
    backgroundColor: '#2a2a2a',
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
    borderColor: '#404040',
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
    marginBottom: 20,
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
  },
  textArea: {
    height: 100,
    paddingTop: 14,
  },
  inputError: {
    borderColor: '#dc3545',
  },
  errorText: {
    color: '#dc3545',
    fontSize: 14,
    marginTop: 6,
  },
  pickerButton: {
    borderWidth: 1.5,
    borderColor: '#404040',
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#ffffff',
    flex: 1,
  },
  pickerArrow: {
    fontSize: 16,
    color: '#6c757d',
    marginLeft: 10,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingVertical: 8,
  },
  switchLabelContainer: {
    flex: 1,
  },
  switchLabel: {
    color: '#ffffff',
    fontSize: 16,
  },
  switchHint: {
    color: '#6c757d',
    fontSize: 12,
    marginTop: 2,
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
  requiredText: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 16,
  },
  // Estilos dos Modals (idênticos ao cadTarefa)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxHeight: '70%',
    borderWidth: 1,
    borderColor: '#404040',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalItem: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#404040',
  },
  modalItemSelected: {
    backgroundColor: 'rgba(108, 117, 125, 0.8)',
    borderColor: 'rgba(108, 117, 125, 0.8)',
  },
  modalItemText: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
  },
  modalItemTextSelected: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  modalCloseButton: {
    backgroundColor: '#dc3545',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  categoriaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoriaColor: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 12,
  },
  checkIcon: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 'auto',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  modalConfirmButton: {
    backgroundColor: '#28a745',
    borderRadius: 8,
    padding: 12,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  modalConfirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default EditTarefa;