import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../router';
import { apiCall, getActiveWorkspaceId } from '../../services/authService';
import TarefaMultiplaInterface from './tarefaMultiplaInterface';
import GerenciarPermissoesModal from '../permissoes/GerenciarPermissoesModal';

type VisualizaTarefaNavigationProp = StackNavigationProp<RootStackParamList, 'VisualizaTarefa'>;
type VisualizaTarefaRouteProp = RouteProp<RootStackParamList, 'VisualizaTarefa'>;

interface VisualizaTarefaProps {
  navigation: VisualizaTarefaNavigationProp;
  route: VisualizaTarefaRouteProp;
}

interface TarefaCompleta extends TarefaMultiplaInterface {
  concluida?: boolean;
}

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

const PRIORIDADE_CORES = {
  baixa: '#28a745',
  media: '#ffc107',
  alta: '#fd7e14',
  urgente: '#dc3545',
};

const RECORRENCIA_LABELS = {
  diaria: 'Diária',
  semanal: 'Semanal',
  mensal: 'Mensal',
};

const VisualizaTarefa: React.FC<VisualizaTarefaProps> = ({ navigation, route }) => {
  const [tarefa, setTarefa] = useState<TarefaCompleta | null>(null);
  const [loading, setLoading] = useState(true);
  const [workspaceId, setWorkspaceId] = useState<number | null>(null);
  const [permissoesModalVisible, setPermissoesModalVisible] = useState(false);

  // Parâmetros da rota - pode receber id_tarefa OU titulo
  const { id_tarefa, titulo } = route.params || {};

  useEffect(() => {
    initializeWorkspace();
  }, []);

  useEffect(() => {
    if (workspaceId) {
      carregarTarefa();
    }
  }, [workspaceId]);

  const initializeWorkspace = async () => {
    try {
      const id = await getActiveWorkspaceId();
      setWorkspaceId(id);
    } catch (error) {
      console.error('Erro ao obter workspace ativo:', error);
      Alert.alert('Erro', 'Não foi possível obter o workspace ativo');
    }
  };

  const carregarTarefa = async () => {
    if (!workspaceId) {
      return;
    }

    setLoading(true);
    try {
      let tarefaData: TarefaCompleta;

      if (id_tarefa) {
        // Buscar tarefa pelo workspace (como antes)
        const todasTarefas = await apiCall(`/tarefas/workspace/${workspaceId}`, 'GET');
        const tarefaEncontrada = todasTarefas.find((t: TarefaCompleta) => t.id_tarefa === id_tarefa);
        if (!tarefaEncontrada) {
          throw new Error('Tarefa não encontrada');
        }
        tarefaData = tarefaEncontrada;

        // Buscar categorias da tarefa
        try {
          const categorias = await apiCall(`/tarefas/${id_tarefa}/categorias`, 'GET');
          tarefaData = { ...tarefaData, categorias };
        } catch (catErr) {
          tarefaData = { ...tarefaData, categorias: [] };
        }

        // Verificar se não tem permissão para visualizar (caso implementado no backend)
        if (tarefaData.nivel_acesso === undefined && tarefaData.pode_editar === false && tarefaData.pode_apagar === false) {
          Alert.alert(
            'Permissão negada', 
            'Você não tem permissão para visualizar esta tarefa.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
          return;
        }
      } else if (titulo) {
        tarefaData = await apiCall(`/tarefas/workspace/${workspaceId}/titulo/${encodeURIComponent(titulo)}`, 'GET');
        // Buscar categorias da tarefa por id_tarefa do resultado
        if (tarefaData && tarefaData.id_tarefa) {
          try {
            const categorias = await apiCall(`/tarefas/${tarefaData.id_tarefa}/categorias`, 'GET');
            tarefaData = { ...tarefaData, categorias };
          } catch (catErr) {
            tarefaData = { ...tarefaData, categorias: [] };
          }
        }
      } else {
        throw new Error('ID da tarefa ou título é obrigatório');
      }

      setTarefa(tarefaData);
    } catch (error: any) {
      console.error('Erro ao carregar tarefa:', error);
      Alert.alert(
        'Erro', 
        error.message || 'Não foi possível carregar a tarefa',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const formatarData = (data?: string) => {
    if (!data) {
      return 'Não informado';
    }
    const date = new Date(data);
    return date.toLocaleDateString('pt-BR') + ' às ' + date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatarDataSomente = (data?: string) => {
    if (!data) {
      return 'Não informado';
    }
    const date = new Date(data);
    return date.toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Carregando tarefa...</Text>
      </View>
    );
  }

  if (!tarefa) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Tarefa não encontrada</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalhes da Tarefa</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Título e Status */}
        <View style={styles.section}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{tarefa.titulo}</Text>
            <View style={[
              styles.statusBadge, 
              { backgroundColor: tarefa.status === 'concluido' ? '#28a745' : 
                                 tarefa.status === 'em_andamento' ? '#007bff' :
                                 tarefa.status === 'atrasada' ? '#dc3545' : '#6c757d' }
            ]}>
              <Text style={styles.statusText}>{STATUS_LABELS[tarefa.status]}</Text>
            </View>
          </View>
          
          {/* Prioridade */}
          <View style={styles.priorityContainer}>
            <Text style={styles.priorityLabel}>Prioridade:</Text>
            <View style={[
              styles.priorityBadge,
              { backgroundColor: PRIORIDADE_CORES[tarefa.prioridade] }
            ]}>
              <Text style={styles.priorityText}>{PRIORIDADE_LABELS[tarefa.prioridade]}</Text>
            </View>
          </View>
        </View>

        {/* Descrição */}
        {tarefa.descricao && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📝 Descrição</Text>
            <Text style={styles.description}>{tarefa.descricao}</Text>
          </View>
        )}

        {/* Datas */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 Datas</Text>
          <View style={styles.dateRow}>
            <Text style={styles.dateLabel}>Criado em:</Text>
            <Text style={styles.dateValue}>{formatarData(tarefa.data_criacao)}</Text>
          </View>
          <View style={styles.dateRow}>
            <Text style={styles.dateLabel}>Prazo:</Text>
            <Text style={styles.dateValue}>{formatarDataSomente(tarefa.data_fim)}</Text>
          </View>
        </View>

        {/* Recorrência */}
        {tarefa.recorrente && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔄 Recorrência</Text>
            <View style={styles.recurrenceContainer}>
              <Text style={styles.recurrenceText}>
                Esta tarefa se repete {tarefa.recorrencia ? RECORRENCIA_LABELS[tarefa.recorrencia] : 'diariamente'}
              </Text>
            </View>
          </View>
        )}

        {/* Responsáveis removido (não existe mais no modelo) */}

        {/* Categorias */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏷️ Categorias</Text>
          <View style={styles.categoriasContainer}>
            {tarefa.categorias && tarefa.categorias.length > 0 ? (
              tarefa.categorias.map((categoria, index) => (
                <View key={index} style={[
                  styles.categoriaChip,
                  { backgroundColor: '#6c757d' }
                ]}>
                  <Text style={styles.categoriaText}>{categoria.nome}</Text>
                </View>
              ))
            ) : (
              <Text style={{ color: '#aaa', fontStyle: 'italic' }}>Sem categorias</Text>
            )}
          </View>
        </View>

        {/* Informações Técnicas
        <View style={[styles.section, styles.lastSection]}>
          <Text style={styles.sectionTitle}>ℹ️ Informações</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>ID da Tarefa:</Text>
            <Text style={styles.infoValue}>#{tarefa.id_tarefa}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Concluída:</Text>
            <Text style={[
              styles.infoValue,
              { color: tarefa.concluida ? '#28a745' : '#dc3545' }
            ]}>
              {tarefa.concluida ? 'Sim' : 'Não'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>ID do Criador:</Text>
            <Text style={styles.infoValue}>{tarefa.id_usuario}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>ID do Workspace:</Text>
            <Text style={styles.infoValue}>{tarefa.id_workspace}</Text>
          </View>
        </View> */}

        {/* Botões de Ação */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.permissaoButton}
            onPress={() => setPermissoesModalVisible(true)}>
            <Text style={styles.permissaoButtonText}>👥 Gerenciar Permissões</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal de Gerenciar Permissões */}
      {tarefa && workspaceId && (
        <GerenciarPermissoesModal
          visible={permissoesModalVisible}
          onClose={() => setPermissoesModalVisible(false)}
          idTarefa={tarefa.id_tarefa}
          idWorkspace={workspaceId}
          tituloTarefa={tarefa.titulo}
          onPermissaoAlterada={() => {
            console.log('Permissões alteradas para tarefa:', tarefa.titulo);
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#2a2a2a',
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a3a',
  },
  
  backButton: {
    padding: 8,
  },
  
  backButtonText: {
    color: '#007bff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  
  headerSpacer: {
    width: 40,
  },
  
  content: {
    flex: 1,
    padding: 16,
  },
  
  section: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  
  lastSection: {
    marginBottom: 32,
  },
  
  titleContainer: {
    marginBottom: 16,
  },
  
  title: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    lineHeight: 30,
  },
  
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  
  priorityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  priorityLabel: {
    color: '#6c757d',
    fontSize: 14,
    marginRight: 8,
  },
  
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  
  priorityText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  
  sectionTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  
  description: {
    color: '#e0e0e0',
    fontSize: 16,
    lineHeight: 24,
  },
  
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  
  dateLabel: {
    color: '#6c757d',
    fontSize: 14,
  },
  
  dateValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  
  recurrenceContainer: {
    backgroundColor: '#3a3a3a',
    padding: 12,
    borderRadius: 8,
  },
  
  recurrenceText: {
    color: '#ffc107',
    fontSize: 14,
    fontWeight: '500',
  },
  
  responsavelItem: {
    marginBottom: 4,
  },
  
  responsavelText: {
    color: '#e0e0e0',
    fontSize: 14,
  },
  
  categoriasContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  
  categoriaChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  
  categoriaText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  
  infoLabel: {
    color: '#6c757d',
    fontSize: 14,
  },
  
  infoValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  
  loadingText: {
    color: '#6c757d',
    fontSize: 16,
  },
  
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 20,
  },
  
  errorText: {
    color: '#dc3545',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },

  actionButtons: {
    padding: 16,
    marginTop: 20,
  },

  permissaoButton: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },

  permissaoButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default VisualizaTarefa;
