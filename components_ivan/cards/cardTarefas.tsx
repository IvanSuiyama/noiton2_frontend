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
}

import TarefaMultiplaInterface from '../tarefa/tarefaMultiplaInterface';

// Usar a interface padrão do projeto
interface Tarefa extends TarefaMultiplaInterface {
  concluida?: boolean; // Campo adicional para compatibilidade
}

interface Filtros {
  palavras_chave?: string;
  status?: string;
  prioridade?: string;
  categoria_nome?: string;
  responsavel_email?: string;
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

const CardTarefas: React.FC<CardTarefasProps> = ({ navigation }) => {
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [loading, setLoading] = useState(false);
  const [palavraChave, setPalavraChave] = useState('');
  const [showFiltroModal, setShowFiltroModal] = useState(false);
  const [filtros, setFiltros] = useState<Filtros>({});
  const [workspaceId, setWorkspaceId] = useState<number | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [workspaceInfo, setWorkspaceInfo] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  useEffect(() => {
    initializeWorkspace();
  }, []);

  useEffect(() => {
    if (workspaceId) {
      carregarTarefas();
    }
  }, [workspaceId]);

  const initializeWorkspace = async () => {
    try {
      const id = await getActiveWorkspaceId();
      const email = await getUserEmail();
      const userId = await getUserId();
      
      setWorkspaceId(id);
      setUserEmail(email || '');
      setCurrentUserId(userId);

      // Buscar informações do workspace para saber se é de equipe
      if (id) {
        try {
          const workspaceData = await apiCall(`/workspaces/${id}`, 'GET');
          setWorkspaceInfo(workspaceData);
        } catch (error) {
          console.error('Erro ao obter informações do workspace:', error);
        }
      }
    } catch (error) {
      console.error('Erro ao obter workspace ativo:', error);
    }
  };

  // Função para verificar se o usuário logado é o criador da tarefa
  const isCreator = (tarefa: Tarefa): boolean => {
    if (!userEmail || !workspaceInfo) {
      return false;
    }
    
    // VERIFICAÇÃO DIRETA: Se temos o ID do usuário atual, comparar com id_usuario da tarefa
    if (currentUserId && tarefa.id_usuario === currentUserId) {
      return true; // É o criador direto da tarefa
    }
    
    // VERIFICAÇÃO ALTERNATIVA baseada nas regras de negócio:
    
    // 1. Se é o criador do workspace, pode editar todas as tarefas do workspace
    if (workspaceInfo.criador === userEmail) {
      return true;
    }
    
    // 2. Se é workspace de equipe E o usuário está nos responsáveis, pode editar
    if (workspaceInfo.equipe === true && tarefa.responsaveis.includes(userEmail)) {
      return true;
    }
    
    // 3. Para workspace pessoal, só pode editar se não há outros responsáveis 
    // (assumindo que é o criador da tarefa)
    if (workspaceInfo.equipe !== true) {
      // Se só tem o próprio usuário como responsável ou não há responsáveis específicos
      if (tarefa.responsaveis.length === 0 || 
          (tarefa.responsaveis.length === 1 && tarefa.responsaveis.includes(userEmail))) {
        return true;
      }
    }
    
    return false;
  };

  // Função para validar se o usuário tem permissão de ver a tarefa
  const podeVerTarefa = (tarefa: Tarefa): boolean => {
    if (!userEmail || !workspaceInfo) {
      return false;
    }

    // 1. Se é um workspace de equipe, todas as tarefas são visíveis para membros da equipe
    if (workspaceInfo.equipe === true) {
      return true;
    }

    // 2. Se o usuário é o criador do workspace (pode ver todas as tarefas)
    if (workspaceInfo.criador === userEmail) {
      return true;
    }

    // 3. Se o email do usuário está na lista de responsáveis
    if (tarefa.responsaveis && tarefa.responsaveis.includes(userEmail)) {
      return true;
    }

    // 4. Se é o criador da tarefa
    if (isCreator(tarefa)) {
      return true;
    }

    // 5. Para workspace pessoal, só pode ver tarefas que criou ou é responsável
    return false;
  };

  const carregarTarefas = async (filtrosCustom?: Filtros) => {
    if (!workspaceId) {
      return;
    }

    setLoading(true);
    try {
      let endpoint = `/tarefas/workspace/${workspaceId}`;
      let dadosTarefas: Tarefa[] = [];

      // Se há filtros, usar o endpoint de filtros
      if (filtrosCustom && Object.keys(filtrosCustom).length > 0) {
        const params = new URLSearchParams();
        Object.entries(filtrosCustom).forEach(([key, value]) => {
          if (value) {
            params.append(key, value);
          }
        });
        
        endpoint = `/tarefas/workspace/${workspaceId}/filtros?${params.toString()}`;
        dadosTarefas = await apiCall(endpoint, 'GET');
      } else {
        // Buscar todas as tarefas do workspace
        dadosTarefas = await apiCall(endpoint, 'GET');
      }

      // Aplicar todos os filtros de validação
      const tarefasFiltradas = dadosTarefas
        .filter(tarefa => {
          // 1. Não pode ser recorrente
          if (tarefa.recorrente) {
            return false;
          }
          
          // 2. Se não há filtros específicos, não mostrar tarefas concluídas nas 10 mais recentes
          if (!filtrosCustom || Object.keys(filtrosCustom).length === 0) {
            if (tarefa.concluida) {
              return false;
            }
          }
          
          // 3. Se há filtro de status "concluido", mostrar apenas concluídas
          if (filtrosCustom?.status === 'concluido') {
            if (!tarefa.concluida) {
              return false;
            }
          }
          
          // 4. Validar permissões do usuário
          return podeVerTarefa(tarefa);
        })
        .sort((a, b) => {
          // Ordenar por data de criação (mais recentes primeiro)
          const dataA = new Date(a.data_criacao || 0).getTime();
          const dataB = new Date(b.data_criacao || 0).getTime();
          return dataB - dataA;
        })
        .slice(0, 10); // Limitar a 10 tarefas

      setTarefas(tarefasFiltradas);
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
    await carregarTarefas(novosFiltros);
    setShowFiltroModal(false);
  };

  const limparFiltros = async () => {
    setFiltros({});
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

              {/* Filtro por Responsável */}
              <View style={styles.filtroSection}>
                <Text style={styles.filtroLabel}>Responsável (email):</Text>
                <TextInput
                  style={styles.filtroInput}
                  placeholder="Digite o email do responsável..."
                  placeholderTextColor="#6c757d"
                  value={filtros.responsavel_email || ''}
                  onChangeText={(text) =>
                    setFiltros(prev => ({ ...prev, responsavel_email: text }))
                  }
                />
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
