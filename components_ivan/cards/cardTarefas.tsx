import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  Alert,
  ScrollView,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../router';
import {
  apiCall,
  getActiveWorkspaceId,
  getUserEmail,
  getUserId,
} from '../../services/authService';
import { deletarTarefa } from '../tarefa/dellTarefa';

type CardTarefasNavigationProp = StackNavigationProp<RootStackParamList>;

interface CardTarefasProps {
  navigation: CardTarefasNavigationProp;
  refreshKey?: any;
}

import TarefaMultiplaInterface from '../tarefa/tarefaMultiplaInterface';
import { getActiveWorkspaceName } from '../../services/authService';

// Usar a interface padrão do projeto
interface Tarefa extends TarefaMultiplaInterface {
  concluida?: boolean; // Campo adicional para compatibilidade
}

interface Filtros {
  palavras_chave?: string;
  status?: string;
  prioridade?: string;
  categoria_nome?: string;
  minhas_tarefas?: boolean;
  recorrentes?: boolean;
  tipo_recorrencia?: 'diaria' | 'semanal' | 'mensal';
}

const PRIORIDADE_CORES = {
  baixa: '#28a745',
  media: '#ffc107',
  alta: '#fd7e14',
  urgente: '#dc3545',
};

const STATUS_LABELS = {
  a_fazer: 'A Fazer',
  em_andamento: 'Em Andamento',
  concluido: 'Concluído',
  atrasada: 'Atrasada',
};

const PRIORIDADE_LABELS = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  urgente: 'Urgente',
};

const CardTarefas: React.FC<CardTarefasProps> = ({ navigation, refreshKey }) => {
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [loading, setLoading] = useState(false);
  const [palavraChave, setPalavraChave] = useState('');
  const [showFiltroModal, setShowFiltroModal] = useState(false);
  const [filtros, setFiltros] = useState<Filtros>({});
  const [workspaceId, setWorkspaceId] = useState<number | null>(null);
  const [workspaceName, setWorkspaceName] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [workspaceInfo, setWorkspaceInfo] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [minhasTarefas, setMinhasTarefas] = useState<boolean>(false);
  const [recorrentes, setRecorrentes] = useState<boolean>(false);
  const [tipoRecorrencia, setTipoRecorrencia] = useState<'diaria' | 'semanal' | 'mensal' | undefined>(undefined);


  // Sempre que refreshKey mudar, ou workspaceId/workspaceInfo/userEmail, recarrega tudo
  useEffect(() => {
    initializeWorkspace();
  }, [refreshKey]);

  // Só carrega tarefas quando workspaceId mudar
  useEffect(() => {
    if (workspaceId) {
      carregarTarefas();
    } else {
      setTarefas([]);
    }
  }, [workspaceId]);

  const initializeWorkspace = async () => {
    try {
      const id = await getActiveWorkspaceId();
      const email = await getUserEmail();
      const userId = await getUserId();
      const name = await getActiveWorkspaceName();
      setWorkspaceId(id);
      setWorkspaceName(name || '');
      setUserEmail(email || '');
      setCurrentUserId(userId);

      // Buscar informações do workspace por id
      if (id) {
        try {
          // Usar a rota correta: /workspaces/id/:id_workspace
          const workspaceData = await apiCall(`/workspaces/id/${id}`, 'GET');
          setWorkspaceInfo(workspaceData);
        } catch (err) {
          console.error('Erro ao buscar informações do workspace:', err);
          setWorkspaceInfo(null);
        }
        // Buscar tarefas do workspace imediatamente após obter o id
        await carregarTarefas();
      }
    } catch (error) {
      console.error('Erro ao obter workspace ativo:', error);
    }
  };

  // Função para verificar se o usuário logado é o criador da tarefa
  const isCreator = (tarefa: Tarefa): boolean => {
    if (!currentUserId) {
      return false;
    }
    return tarefa.id_usuario === currentUserId;
  };

  // Função para validar se o usuário tem permissão de ver a tarefa
  const podeVerTarefa = (tarefa: Tarefa): boolean => {
    // Todas as tarefas retornadas pela API já são do workspace correto
    return true;
  };

  const carregarTarefas = async (filtrosCustom?: Filtros) => {
    if (!workspaceId) {
      setTarefas([]);
      return;
    }
    setLoading(true);
    try {
      const endpoint = `/tarefas/workspace/${workspaceId}`;
      const dadosTarefas: Tarefa[] = await apiCall(endpoint, 'GET');
      console.log('Tarefas recebidas da API:', dadosTarefas);
      const tarefasOrdenadas = dadosTarefas
        .sort((a, b) => {
          const dataA = new Date(a.data_criacao || 0).getTime();
          const dataB = new Date(b.data_criacao || 0).getTime();
          return dataB - dataA;
        })
        .slice(0, 10);
      setTarefas(tarefasOrdenadas);
    } catch (error) {
      console.error('Erro ao carregar tarefas:', error);
      Alert.alert('Erro', 'Não foi possível carregar as tarefas');
    } finally {
      setLoading(false);
    }
  };

  const pesquisarPorPalavraChave = async () => {
    if (!palavraChave.trim()) {
      carregarTarefas();
      return;
    }

    const filtrosPesquisa = {
      ...filtros,
      palavras_chave: palavraChave.trim(),
    };

    await carregarTarefas(filtrosPesquisa);
  };

  const aplicarFiltros = async (novosFiltros: Filtros) => {
    setFiltros(novosFiltros);
    setMinhasTarefas(!!novosFiltros.minhas_tarefas);
    setRecorrentes(!!novosFiltros.recorrentes);
    setTipoRecorrencia(novosFiltros.tipo_recorrencia);
    await carregarTarefas(novosFiltros);
    setShowFiltroModal(false);
  };

  const limparFiltros = async () => {
    setFiltros({});
    setMinhasTarefas(false);
    setRecorrentes(false);
    setTipoRecorrencia(undefined);
    setPalavraChave('');
    await carregarTarefas();
    setShowFiltroModal(false);
  };

  const formatarData = (data?: string) => {
    if (!data) {
      return '';
    }
    const date = new Date(data);
    return date.toLocaleDateString('pt-BR');
  };

  const handleCriarTarefa = () => {
    navigation.navigate('CadastroTarefa');
  };

  const handleEditarTarefa = (tarefa: Tarefa) => {
    navigation.navigate('EditTarefa', { id_tarefa: tarefa.id_tarefa });
  };

  const handleVerTarefa = (tarefa: Tarefa) => {
    navigation.navigate('VisualizaTarefa', { id_tarefa: tarefa.id_tarefa });
  };

  const handleComentarTarefa = (tarefa: Tarefa) => {
    // TODO: Navegar para tela de comentários da tarefa
    Alert.alert('Em desenvolvimento', 'Funcionalidade de comentários será implementada em breve');
  };

  const handleDelete = (tarefa: Tarefa) => {
    deletarTarefa({
      id_tarefa: tarefa.id_tarefa,
      titulo: tarefa.titulo,
      onSuccess: () => {
        // Recarregar a lista de tarefas após exclusão bem-sucedida
        carregarTarefas();
      },
      onError: (error) => {
        console.error('Erro ao deletar tarefa:', error);
      },
    });
  };

  const renderTarefa = ({ item }: { item: Tarefa }) => {
    const usuarioEhCriador = isCreator(item);
    
    return (
      <View style={styles.tarefaItem}>
        <View style={styles.tarefaContent}>
          <View style={styles.tarefaInfo}>
            <Text style={styles.tarefaTitulo} numberOfLines={1}>
              {item.titulo}
            </Text>
            {item.descricao && (
              <Text style={styles.tarefaDescricao} numberOfLines={2}>
                {item.descricao}
              </Text>
            )}
          </View>
          
          <View style={styles.tarefaActions}>
            {/* Ícone de editar - apenas para o criador */}
            {usuarioEhCriador && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleEditarTarefa(item)}>
                <Text style={styles.actionIcon}>✏️</Text>
              </TouchableOpacity>
            )}
            
            {/* Ícone de deletar - apenas para o criador */}
            {usuarioEhCriador && (
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => handleDelete(item)}>
                <Text style={styles.actionIcon}>🗑️</Text>
              </TouchableOpacity>
            )}
            
            {/* Ícone de visualizar - sempre visível */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleVerTarefa(item)}>
              <Text style={styles.actionIcon}>👁️</Text>
            </TouchableOpacity>
            
            {/* Ícone de comentário oculto por enquanto */}
            {false && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleComentarTarefa(item)}>
                <Text style={styles.actionIcon}>💬</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📝</Text>
      <Text style={styles.emptyTitle}>Nenhuma tarefa encontrada</Text>
      <Text style={styles.emptyMessage}>
        Que tal criar sua primeira tarefa?
      </Text>
      <TouchableOpacity
        style={styles.criarTarefaButton}
        onPress={handleCriarTarefa}>
        <Text style={styles.criarTarefaButtonText}>➕ Criar Tarefa</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Cabeçalho com filtro */}
      <View style={styles.headerContainer}>
        <View style={styles.filtroContainer}>
          <TouchableOpacity
            style={styles.filtroIcon}
            onPress={() => setShowFiltroModal(true)}>
            <Text style={styles.filtroIconText}>⚙️</Text>
          </TouchableOpacity>
          
          <TextInput
            style={styles.palavraChaveInput}
            placeholder="Buscar por palavra-chave..."
            placeholderTextColor="#6c757d"
            value={palavraChave}
            onChangeText={setPalavraChave}
            returnKeyType="search"
            onSubmitEditing={pesquisarPorPalavraChave}
          />
          
          <TouchableOpacity
            style={styles.lupaIcon}
            onPress={pesquisarPorPalavraChave}>
            <Text style={styles.lupaIconText}>🔍</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filtro recorrentes destacado */}
      <View style={styles.filtroRecorrentesBar}>
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 0 }}
          onPress={() => {
            setRecorrentes(!recorrentes);
            setFiltros(prev => ({ ...prev, recorrentes: !recorrentes, tipo_recorrencia: undefined }));
            setTipoRecorrencia(undefined);
          }}
        >
          <View style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            borderWidth: 2,
            borderColor: '#28a745',
            backgroundColor: recorrentes ? '#28a745' : 'transparent',
            marginRight: 10,
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            {recorrentes && (
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>✓</Text>
            )}
          </View>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
            Mostrar apenas tarefas recorrentes
          </Text>
        </TouchableOpacity>
        {/* Select tipo de recorrência */}
        {recorrentes && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
            <Text style={{ color: '#fff', fontSize: 15, marginRight: 10 }}>Tipo:</Text>
            {['diaria', 'semanal', 'mensal'].map(tipo => (
              <TouchableOpacity
                key={tipo}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: tipoRecorrencia === tipo ? '#28a745' : '#404040',
                  backgroundColor: tipoRecorrencia === tipo ? '#28a745' : 'transparent',
                  marginRight: 8,
                }}
                onPress={() => {
                  setTipoRecorrencia(tipoRecorrencia === tipo ? undefined : tipo as any);
                  setFiltros(prev => ({ ...prev, tipo_recorrencia: prev.tipo_recorrencia === tipo ? undefined : tipo as any }));
                }}
              >
                <Text style={{ color: '#fff', fontWeight: tipoRecorrencia === tipo ? 'bold' : 'normal' }}>
                  {tipo === 'diaria' ? 'Dia' : tipo === 'semanal' ? 'Semana' : 'Mês'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Botão Criar Tarefa */}
        <TouchableOpacity
          style={[styles.criarTarefaButton, { marginTop: 16, alignSelf: 'center' }]}
          onPress={handleCriarTarefa}
        >
          <Text style={styles.criarTarefaButtonText}>➕ Criar Tarefa</Text>
        </TouchableOpacity>
      </View>

      {/* Lista de tarefas */}
      <View style={styles.tarefasContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Carregando tarefas...</Text>
          </View>
        ) : tarefas.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={tarefas}
            keyExtractor={(item) => item.id_tarefa.toString()}
            renderItem={renderTarefa}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          />
        )}
      </View>

      {/* Modal de Filtros */}
      <Modal
        visible={showFiltroModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFiltroModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.filtroModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtros</Text>
              <TouchableOpacity onPress={() => setShowFiltroModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {/* Filtro por Status */}
              <View style={styles.filtroSection}>
                <Text style={styles.filtroLabel}>Status:</Text>
                <View style={styles.filtroOptionsRow}>
                  {Object.entries(STATUS_LABELS).map(([key, label]) => (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.filtroOption,
                        filtros.status === key && styles.filtroOptionSelected,
                      ]}
                      onPress={() =>
                        setFiltros(prev => ({
                          ...prev,
                          status: prev.status === key ? undefined : key,
                        }))
                      }>
                      <Text
                        style={[
                          styles.filtroOptionText,
                          filtros.status === key && styles.filtroOptionTextSelected,
                        ]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Filtro por Prioridade */}
              <View style={styles.filtroSection}>
                <Text style={styles.filtroLabel}>Prioridade:</Text>
                <View style={styles.filtroOptionsRow}>
                  {Object.entries(PRIORIDADE_LABELS).map(([key, label]) => (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.filtroOption,
                        filtros.prioridade === key && styles.filtroOptionSelected,
                      ]}
                      onPress={() =>
                        setFiltros(prev => ({
                          ...prev,
                          prioridade: prev.prioridade === key ? undefined : key,
                        }))
                      }>
                      <Text
                        style={[
                          styles.filtroOptionText,
                          filtros.prioridade === key && styles.filtroOptionTextSelected,
                        ]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>


              {/* Filtro por Nome da Categoria */}
              <View style={styles.filtroSection}>
                <Text style={styles.filtroLabel}>Categoria (nome):</Text>
                <TextInput
                  style={styles.filtroInput}
                  placeholder="Digite o nome da categoria..."
                  placeholderTextColor="#6c757d"
                  value={filtros.categoria_nome || ''}
                  onChangeText={(text) =>
                    setFiltros(prev => ({ ...prev, categoria_nome: text }))
                  }
                />
              </View>

              {/* Filtro Minhas Tarefas */}
              <View style={styles.filtroSection}>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}
                  onPress={() => setFiltros(prev => ({ ...prev, minhas_tarefas: !prev.minhas_tarefas }))}
                >
                  <View style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    borderWidth: 2,
                    borderColor: '#007bff',
                    backgroundColor: filtros.minhas_tarefas ? '#007bff' : 'transparent',
                    marginRight: 10,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    {filtros.minhas_tarefas && (
                      <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>✓</Text>
                    )}
                  </View>
                  <Text style={{ color: '#fff', fontSize: 16 }}>
                    Mostrar apenas minhas tarefas
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Filtro Tarefas Recorrentes */}
              <View style={styles.filtroSection}>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}
                  onPress={() => setFiltros(prev => ({ ...prev, recorrentes: !prev.recorrentes }))}
                >
                  <View style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    borderWidth: 2,
                    borderColor: '#28a745',
                    backgroundColor: filtros.recorrentes ? '#28a745' : 'transparent',
                    marginRight: 10,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    {filtros.recorrentes && (
                      <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>✓</Text>
                    )}
                  </View>
                  <Text style={{ color: '#fff', fontSize: 16 }}>
                    Mostrar apenas tarefas recorrentes
                  </Text>
                </TouchableOpacity>

                {/* Select tipo de recorrência */}
                {filtros.recorrentes && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <Text style={{ color: '#fff', fontSize: 15, marginRight: 10 }}>Tipo:</Text>
                    {['diaria', 'semanal', 'mensal'].map(tipo => (
                      <TouchableOpacity
                        key={tipo}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 6,
                          borderWidth: 1,
                          borderColor: filtros.tipo_recorrencia === tipo ? '#28a745' : '#404040',
                          backgroundColor: filtros.tipo_recorrencia === tipo ? '#28a745' : 'transparent',
                          marginRight: 8,
                        }}
                        onPress={() => setFiltros(prev => ({ ...prev, tipo_recorrencia: prev.tipo_recorrencia === tipo ? undefined : tipo as any }))}
                      >
                        <Text style={{ color: '#fff', fontWeight: filtros.tipo_recorrencia === tipo ? 'bold' : 'normal' }}>
                          {tipo === 'diaria' ? 'Dia' : tipo === 'semanal' ? 'Semana' : 'Mês'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>


            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.limparButton}
                onPress={limparFiltros}>
                <Text style={styles.limparButtonText}>Limpar Filtros</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.aplicarButton}
                onPress={() => aplicarFiltros(filtros)}>
                <Text style={styles.aplicarButtonText}>Aplicar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    overflow: 'hidden',
  },
  
  headerContainer: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a3a',
  },
  
  filtroContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#404040',
  },
  
  filtroIcon: {
    padding: 8,
    marginRight: 8,
  },
  
  filtroIconText: {
    fontSize: 16,
  },
  
  palavraChaveInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  
  lupaIcon: {
    padding: 8,
    marginLeft: 8,
  },
  
  lupaIconText: {
    fontSize: 16,
  },
  
  filtroRecorrentesBar: {
    flexDirection: 'column',
    backgroundColor: '#232e23',
    borderBottomWidth: 1,
    borderBottomColor: '#28a745',
    paddingHorizontal: 18,
    paddingVertical: 12,
    alignItems: 'flex-start',
    gap: 4,
  },
  tarefasContainer: {
    flex: 1,
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  
  loadingText: {
    color: '#6c757d',
    fontSize: 16,
  },
  
  listContainer: {
    padding: 12,
  },
  
  tarefaItem: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#404040',
  },
  
  tarefaContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  
  tarefaInfo: {
    flex: 1,
    marginRight: 12,
  },
  
  tarefaActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  
  actionButton: {
    padding: 6,
    borderRadius: 4,
    backgroundColor: 'rgba(108, 117, 125, 0.3)',
    minWidth: 32,
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  deleteButton: {
    backgroundColor: 'rgba(220, 53, 69, 0.3)', // Cor vermelha para o botão de deletar
  },
  
  actionIcon: {
    fontSize: 16,
  },
  
  tarefaTitulo: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  
  tarefaDescricao: {
    color: '#6c757d',
    fontSize: 14,
    lineHeight: 18,
  },
  
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  
  emptyTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  
  emptyMessage: {
    color: '#6c757d',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  
  criarTarefaButton: {
    backgroundColor: 'rgba(108, 117, 125, 0.8)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  
  criarTarefaButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Estilos do Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  filtroModal: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    margin: 20,
    maxHeight: '80%',
    width: '90%',
    maxWidth: 400,
  },
  
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a3a',
  },
  
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  
  modalClose: {
    fontSize: 18,
    color: '#6c757d',
    padding: 4,
  },
  
  modalContent: {
    maxHeight: 400,
  },
  
  filtroSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a3a',
  },
  
  filtroLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  
  filtroOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  
  filtroOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#404040',
    backgroundColor: 'transparent',
  },
  
  filtroOptionSelected: {
    backgroundColor: 'rgba(108, 117, 125, 0.8)',
    borderColor: 'rgba(108, 117, 125, 0.8)',
  },
  
  filtroOptionText: {
    color: '#ffffff',
    fontSize: 14,
  },
  
  filtroOptionTextSelected: {
    color: '#ffffff',
    fontWeight: '600',
  },
  
  filtroInput: {
    borderWidth: 1,
    borderColor: '#404040',
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#1a1a1a',
    color: '#ffffff',
  },
  
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#3a3a3a',
    gap: 12,
  },
  
  limparButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#dc3545',
    alignItems: 'center',
  },
  
  limparButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  aplicarButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(108, 117, 125, 0.8)',
    alignItems: 'center',
  },
  
  aplicarButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CardTarefas;
