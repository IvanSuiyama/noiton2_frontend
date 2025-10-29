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
  Switch,
  Modal,
  FlatList,
} from 'react-native';
import {CriarTarefaInterface} from './tarefaMultiplaInterface';
import CategoriaInterface from '../categoria/categoriaInterface';
import {apiCall, getUserEmail, getUserId, getActiveWorkspaceId} from '../../services/authService';
import GoogleCalendarService from '../../services/googleCalendarService';

// Tipo baseado na CriarTarefaInterface
type FormData = CriarTarefaInterface;

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

const CadTarefa: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [formData, setFormData] = useState<FormData>({
    titulo: '',
    descricao: '',
    data_fim: '',
    status: 'a_fazer',
    prioridade: 'media',
    recorrente: false,
    recorrencia: undefined,
    id_workspace: 1, // Será atualizado ao montar
    id_usuario: 1, // Será atualizado ao montar
    categorias_selecionadas: [],
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<
    Partial<Pick<FormData, 'titulo' | 'data_fim'>>
  >({});
  const [categoriasDisponiveis, setCategoriasDisponiveis] = useState<
    CategoriaInterface[]
  >([]);
  const [workspaceAtual, setWorkspaceAtual] = useState<number>(1);

  // Estados para modals dos seletores
  const [modalPrioridade, setModalPrioridade] = useState<boolean>(false);
  const [modalStatus, setModalStatus] = useState<boolean>(false);
  const [modalCategoria, setModalCategoria] = useState<boolean>(false);
  const [modalFrequencia, setModalFrequencia] = useState<boolean>(false);

  // Sempre manter o id do workspace atualizado no formData
  useEffect(() => {
    let mounted = true;
    const atualizarWorkspace = async () => {
      const id = await getActiveWorkspaceId();
      if (mounted) {
        setWorkspaceAtual(id || 1);
        setFormData(prev => ({
          ...prev,
          id_workspace: id || 1,
        }));
      }
    };
    atualizarWorkspace();
    // Atualiza periodicamente (a cada 1s)
    const interval = setInterval(atualizarWorkspace, 1000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Ao montar, busca id do usuário, email e atualiza formData/responsáveis
  useEffect(() => {
    const inicializar = async () => {
      try {
        const userId = await getUserId();
        setFormData(prev => ({
          ...prev,
          id_usuario: userId || 1,
        }));
      } catch (error) {
        // fallback
      }
    };
    inicializar();
  }, []);

  // Obter categorias do workspace ao inicializar o componente
  useEffect(() => {
    const carregarCategorias = async () => {
      try {
        const categorias = await apiCall(
          `/categorias/workspace/${workspaceAtual}`,
          'GET',
        );
        setCategoriasDisponiveis(categorias);
      } catch (error) {
        console.error('Erro ao carregar categorias:', error);
      }
    };

    carregarCategorias();
  }, [workspaceAtual]);

  // Função para validar formulário
  const validarFormulario = (): boolean => {
    const newErrors: Partial<Pick<FormData, 'titulo' | 'data_fim'>> = {};

    if (!formData.titulo.trim()) {
      newErrors.titulo = 'Título é obrigatório';
    }

    // Validar data de expiração se fornecida
    if (formData.data_fim) {
      const dataFim = new Date(formData.data_fim);
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0); // Zerar horas para comparação apenas da data

      if (dataFim < hoje) {
        newErrors.data_fim =
          'Data de expiração não pode ser anterior à hoje';
      }
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
      // Buscar email e id do usuário logado para garantir
      const [userId, userEmail] = await Promise.all([
        getUserId(),
        getUserEmail(),
      ]);

      const dadosEnvio = {
        titulo: formData.titulo,
        descricao: formData.descricao,
        data_fim: formData.data_fim || null,
        status: formData.status,
        prioridade: formData.prioridade,
        recorrente: formData.recorrente,
        recorrencia: formData.recorrente ? formData.recorrencia : null,
        id_workspace: formData.id_workspace,
        id_usuario: userId || formData.id_usuario,
      };

      // Criar a tarefa primeiro
      const tarefaCriada = await apiCall('/tarefas', 'POST', dadosEnvio);

      // Se há categorias selecionadas, associá-las à tarefa
      if (formData.categorias_selecionadas.length > 0) {
        await apiCall(
          `/tarefas/${tarefaCriada.id_tarefa}/categorias`,
          'POST',
          { categorias: formData.categorias_selecionadas }
        );
      }

      // Integração com Google Calendar
      try {
        // Sempre criar evento de "tarefa criada"
        await GoogleCalendarService.createTaskCreatedEvent(formData.titulo);

        // Se tem data de fim, criar evento de prazo
        if (formData.data_fim) {
          const dataFim = new Date(formData.data_fim);
          await GoogleCalendarService.createTaskDeadlineEvent(formData.titulo, dataFim);
        }

        // Se é recorrente, criar evento de recorrência
        if (formData.recorrente && formData.recorrencia) {
          await GoogleCalendarService.createRecurringTaskEvent(
            formData.titulo,
            formData.recorrencia
          );
        }
      } catch (calendarError) {
        console.log('Erro ao criar eventos no calendário:', calendarError);
        // Não interromper o fluxo se houver erro no calendário
      }

      Alert.alert('Sucesso', 'Tarefa cadastrada com sucesso!', [
        {
          text: 'OK',
          onPress: () => {
            // Limpar formulário
            setFormData({
              titulo: '',
              descricao: '',
              data_fim: '',
              status: 'a_fazer',
              prioridade: 'media',
              recorrente: false,
              recorrencia: undefined,
              id_workspace: workspaceAtual,
              id_usuario: userId || 1,
              categorias_selecionadas: [],
            });
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
    if ((field === 'titulo' || field === 'data_fim') && errors[field]) {
      setErrors(prev => ({...prev, [field]: undefined}));
    }
  };

  // Função para toggle do checkbox recorrente
  const toggleRecorrente = (value: boolean) => {
    setFormData(prev => ({
      ...prev,
      recorrente: value,
      // Se não for recorrente, limpar frequência
      recorrencia: value ? prev.recorrencia : undefined,
    }));
  };

  // Função para formatar data para input
  const formatarDataParaInput = (data: string) => {
    if (!data) {
      return '';
    }
    return data.split('T')[0]; // Pegar apenas a parte da data (YYYY-MM-DD)
  };

  // Função para formatar data do input
  const formatarDataDoInput = (data: string) => {
    if (!data) {
      return '';
    }
    return data + 'T00:00:00.000Z'; // Adicionar horário padrão
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled">
        <View style={styles.formContainer}>
          <Text style={styles.title}>Nova Tarefa</Text>

          <Text style={styles.description}>Workspace: #{workspaceAtual}</Text>

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
              keyboardType="default"
              autoCorrect={true}
              importantForAutofill="yes"
              autoComplete="off"
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
              placeholder="Digite a descrição da tarefa (opcional)"
              placeholderTextColor="#6c757d"
              value={formData.descricao}
              onChangeText={text => updateField('descricao', text)}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!loading}
              keyboardType="default"
              autoCorrect={true}
              importantForAutofill="yes"
              autoComplete="off"
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
              keyboardType="default"
              autoCorrect={true}
              importantForAutofill="yes"
              autoComplete="off"
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

          {/* Switch Recorrente */}
          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Tarefa Recorrente?</Text>
            <Switch
              value={formData.recorrente}
              onValueChange={toggleRecorrente}
              trackColor={{false: '#dee2e6', true: 'rgba(108, 117, 125, 0.6)'}}
              thumbColor={formData.recorrente ? '#ffffff' : '#6c757d'}
              disabled={loading}
            />
          </View>

          {/* Campo Frequência de Recorrência (condicional) */}
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
          <View style={styles.modalContentCategoria}>
            <Text style={styles.modalTitle}>Selecione a Categoria</Text>
            <View style={styles.categoriaListContainer}>
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
                contentContainerStyle={{paddingBottom: 8}}
                style={{flexGrow: 0}}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={<Text style={{color:'#fff',textAlign:'center',marginTop:12}}>Nenhuma categoria encontrada</Text>}
              />
            </View>
            <View style={styles.modalButtonsCategoriaCol}>
              <TouchableOpacity
                style={styles.modalCreateButtonSmall}
                onPress={() => {
                  setModalCategoria(false);
                  setTimeout(() => navigation.navigate('CadastroCategoria'), 200);
                }}>
                <Text style={styles.modalCreateButtonText}>Criar nova categoria</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmButtonSmall}
                onPress={() => setModalCategoria(false)}>
                <Text style={styles.modalConfirmButtonText}>Confirmar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalCloseButtonSmall}
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
  modalContentCategoria: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 18,
    width: '92%',
    maxWidth: 420,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#404040',
    alignSelf: 'center',
    justifyContent: 'flex-start',
  },
  categoriaListContainer: {
    flexGrow: 1,
    minHeight: 80,
    maxHeight: 220,
    marginBottom: 12,
  },
  modalButtonsCategoriaCol: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 8,
    marginTop: 8,
  },
  modalCreateButtonSmall: {
    backgroundColor: '#007bff',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    marginBottom: 4,
  },
  modalCreateButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  modalConfirmButtonSmall: {
    backgroundColor: '#28a745',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    marginBottom: 4,
  },
  modalConfirmButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  modalCloseButtonSmall: {
    backgroundColor: '#dc3545',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: 'center',
    alignSelf: 'flex-end',
    minWidth: 80,
  },
  modalCloseButton: {
    backgroundColor: '#dc3545',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
    alignItems: 'center',
    alignSelf: 'flex-end',
    minWidth: 90,
    marginTop: 8,
  },
  modalCloseButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
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
  textArea: {
    height: 100,
    paddingTop: 14,
  },
  inputError: {
    borderColor: '#dc3545', // Vermelho para erros
  },
  errorText: {
    color: '#dc3545',
    fontSize: 14,
    marginTop: 6,
  },
  pickerButton: {
    borderWidth: 1.5,
    borderColor: '#404040', // Borda cinza escuro
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a1a', // Fundo escuro
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#ffffff', // Texto branco
    flex: 1,
  },
  pickerArrow: {
    fontSize: 16,
    color: '#6c757d', // Cinza claro
    marginLeft: 10,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingVertical: 8,
  },
  switchLabel: {
    color: '#ffffff', // Texto branco
    fontSize: 16,
    flex: 1,
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
  // Estilos dos Modais
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)', // Overlay mais escuro
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#2a2a2a', // Fundo escuro do modal
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxHeight: '70%',
    borderWidth: 1,
    borderColor: '#404040', // Borda cinza
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff', // Texto branco
    textAlign: 'center',
    marginBottom: 20,
  },
  modalItem: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#404040', // Borda cinza
  },
  modalItemSelected: {
    backgroundColor: 'rgba(108, 117, 125, 0.8)', // Cinza transparente padronizado
    borderColor: 'rgba(108, 117, 125, 0.8)',
  },
  modalItemText: {
    fontSize: 16,
    color: '#ffffff', // Texto branco
    textAlign: 'center',
  },
  modalItemTextSelected: {
    color: '#ffffff',
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
  // ...existing code...
});

export default CadTarefa;
