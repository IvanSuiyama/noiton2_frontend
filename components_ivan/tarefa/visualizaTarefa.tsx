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
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../router';
import { apiCall, getActiveWorkspaceId } from '../../services/authService';
import TarefaMultiplaInterface from './tarefaMultiplaInterface';
import GerenciarPermissoesModal from '../permissoes/GerenciarPermissoesModal';
import { confirmarDeletarComentario } from '../comentario/dellComentario';
import AnexoService, {AnexoTarefa} from '../../services/anexoService';

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
  const [loadingComentarios, setLoadingComentarios] = useState(false);
  const [workspaceId, setWorkspaceId] = useState<number | null>(null);
  const [permissoesModalVisible, setPermissoesModalVisible] = useState(false);
  const [temComentarios, setTemComentarios] = useState(false);
  const [comentarios, setComentarios] = useState<any[]>([]);
  
  // Estados para anexos
  const [anexos, setAnexos] = useState<AnexoTarefa[]>([]);
  const [loadingAnexos, setLoadingAnexos] = useState(false);

  // Parâmetros da rota - pode receber id_tarefa OU titulo
  const { id_tarefa, titulo } = route.params || {};

  useEffect(() => {
    initializeWorkspace();
  }, []);

  useEffect(() => {
    if (id_tarefa && workspaceId) {
      carregarTarefa();
    }
  }, [id_tarefa, workspaceId]);

  // Recarregar comentários quando a tela volta ao foco
  useFocusEffect(
    React.useCallback(() => {
      if (tarefa && tarefa.id_tarefa) {
        carregarComentarios(tarefa.id_tarefa);
      }
    }, [tarefa])
  );

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
      setLoading(false);
      
      // Carregar comentários e anexos em segundo plano após carregar a tarefa
      setTimeout(() => {
        carregarComentarios(tarefaData.id_tarefa);
        carregarAnexos(tarefaData.id_tarefa);
      }, 100);
      
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
      setLoading(false);
    }
  };

  const carregarComentarios = async (idTarefa: number) => {
    setLoadingComentarios(true);
    try {
      const comentariosData = await apiCall(`/comentarios/tarefa/${idTarefa}`);
      console.log('📝 Comentários carregados:', comentariosData);
      if (comentariosData && comentariosData.length > 0) {
        console.log('🔍 Primeiro comentário completo:', JSON.stringify(comentariosData[0], null, 2));
      }
      setComentarios(comentariosData || []);
      setTemComentarios(comentariosData && comentariosData.length > 0);
      return comentariosData || [];
    } catch (error) {
      console.error('Erro ao carregar comentários:', error);
      setComentarios([]);
      setTemComentarios(false);
      return [];
    } finally {
      setLoadingComentarios(false);
    }
  };

  const carregarAnexos = async (idTarefa: number) => {
    setLoadingAnexos(true);
    try {
      const anexosData = await AnexoService.listarAnexosTarefa(idTarefa);
      setAnexos(anexosData);
    } catch (error) {
      console.error('Erro ao carregar anexos:', error);
      setAnexos([]);
    } finally {
      setLoadingAnexos(false);
    }
  };

  const baixarAnexo = async (anexo: AnexoTarefa) => {
    await AnexoService.baixarAnexo(anexo.id_anexo);
  };

  const editarComentario = (comentario: any) => {
    console.log('✏️ Editando comentário:', comentario);
    navigation.navigate('EditComentario', {
      comentario: comentario,
      id_tarefa: tarefa?.id_tarefa || 0,
      titulo_tarefa: tarefa?.titulo || 'Tarefa'
    });
  };

  const adicionarComentario = () => {
    console.log('💬 Navegando para cadastrar comentário na tarefa:', tarefa?.id_tarefa);
    navigation.navigate('CadComentario', {
      id_tarefa: tarefa?.id_tarefa || 0,
      titulo: tarefa?.titulo || 'Tarefa'
    });
  };

  const excluirComentario = async (comentario: any) => {
    console.log('🗑️ Iniciando exclusão do comentário:', comentario.id_comentario);
    
    // Função callback para recarregar comentários após exclusão
    const onDelete = (comentarioId: number) => {
      console.log('✅ Comentário excluído com sucesso! ID:', comentarioId);
      console.log('🔄 Recarregando lista de comentários...');
      if (tarefa && tarefa.id_tarefa) {
        carregarComentarios(tarefa.id_tarefa);
      }
    };

    // Usar o componente dellComentario padronizado
    try {
      await confirmarDeletarComentario(comentario, onDelete);
    } catch (error) {
      console.error('❌ Erro na exclusão do comentário:', error);
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

        {/* Seção de Anexos */}
        <View style={styles.sectionAnexos}>
          <Text style={styles.sectionTitle}>📎 Anexos</Text>

          {loadingAnexos ? (
            <View style={styles.loadingAnexos}>
              <Text style={styles.loadingAnexosText}>⏳ Carregando anexos...</Text>
            </View>
          ) : anexos.length > 0 ? (
            <View style={styles.anexosListContainer}>
              {anexos.map((anexo) => (
                <View key={anexo.id_anexo} style={styles.anexoItemVisualizacao}>
                  <View style={styles.anexoInfoVisualizacao}>
                    <Text style={styles.anexoIconVisualizacao}>
                      {anexo.tipo_arquivo === 'pdf' ? '📄' : '🖼️'}
                    </Text>
                    <View style={styles.anexoDetailsVisualizacao}>
                      <Text style={styles.anexoNomeVisualizacao} numberOfLines={1}>
                        {anexo.nome_original}
                      </Text>
                      <Text style={styles.anexoTamanhoVisualizacao}>
                        {AnexoService.formatarTamanho(anexo.tamanho_arquivo)}
                      </Text>
                      <Text style={styles.anexoDataVisualizacao}>
                        Anexado em: {new Date(anexo.data_upload).toLocaleDateString('pt-BR')}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.anexoDownloadButton}
                    onPress={() => baixarAnexo(anexo)}>
                    <Text style={styles.anexoDownloadIcon}>⬇️</Text>
                    <Text style={styles.anexoDownloadText}>Baixar</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.semAnexos}>
              <Text style={styles.semAnexosText}>
                Nenhum anexo foi adicionado a esta tarefa.
              </Text>
            </View>
          )}
        </View>

        {/* Seção de Comentários */}
        <View style={styles.sectionComentarios}>
          <Text style={styles.sectionTitle}>💬 Comentários</Text>
          
          {loadingComentarios ? (
            <View style={styles.loadingComentarios}>
              <Text style={styles.loadingComentariosText}>⏳ Carregando comentários...</Text>
            </View>
          ) : comentarios.length > 0 ? (
            <ScrollView 
              style={styles.comentariosScrollView}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}>
              <View style={styles.comentariosContainer}>
                {comentarios.map((comentario, index) => (
                <View key={comentario.id || index} style={styles.comentarioItem}>
                  <View style={styles.comentarioHeader}>
                    <Text style={styles.comentarioAutor}>
                      👤 {comentario.email || comentario.nome_usuario || 'Usuário'}
                    </Text>
                    <Text style={styles.comentarioData}>
                      {comentario.data_criacao ? 
                        new Date(comentario.data_criacao).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        }) : 
                        'Hoje'
                      }
                    </Text>
                  </View>
                  
                  <Text style={styles.comentarioTexto}>
                    {comentario.descricao || comentario.conteudo || comentario.texto || comentario.comentario || comentario.mensagem || 'Comentário sem conteúdo'}
                  </Text>
                  
                  <View style={styles.comentarioAcoes}>
                    <TouchableOpacity 
                      style={[styles.comentarioAcao, styles.comentarioAcaoEdit]}
                      onPress={() => editarComentario(comentario)}
                      activeOpacity={0.7}>
                      <Text style={styles.comentarioAcaoTexto}>✏️ Editar</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.comentarioAcao, styles.comentarioAcaoDelete]}
                      onPress={() => excluirComentario(comentario)}
                      activeOpacity={0.7}>
                      <Text style={styles.comentarioAcaoTexto}>🗑️ Excluir</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                ))}
              </View>
            </ScrollView>
          ) : (
            <View style={styles.loadingComentarios}>
              <Text style={styles.semComentarios}>
                Ainda não há comentários nesta tarefa.
              </Text>
            </View>
          )}
          
          {/* Botão para adicionar novo comentário */}
          <TouchableOpacity
            style={styles.novoComentarioButton}
            onPress={adicionarComentario}
            activeOpacity={0.7}>
            <Text style={styles.novoComentarioButtonText}>💬 Novo Comentário</Text>
          </TouchableOpacity>
        </View>
        
        {/* Botão de Gerenciar Permissões */}
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
    marginBottom: 12,
  },

  comentariosButton: {
    backgroundColor: '#28a745',
  },

  comentariosContainer: {
    paddingVertical: 8,
  },

  comentarioItem: {
    backgroundColor: '#1e1e1e',
    padding: 16,
    marginBottom: 12,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#007bff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },

  comentarioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },

  comentarioAutor: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },

  comentarioData: {
    color: '#6c757d',
    fontSize: 12,
  },

  comentarioTexto: {
    color: '#e0e0e0',
    fontSize: 14,
    lineHeight: 20,
  },

  maisComentarios: {
    color: '#6c757d',
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },

  semComentarios: {
    color: '#6c757d',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 16,
  },

  loadingComentarios: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingComentariosText: {
    color: '#6c757d',
    fontSize: 14,
    fontStyle: 'italic',
  },

  sectionComentarios: {
    backgroundColor: '#2a2a2a',
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3a3a3a',
    minHeight: 300,
    maxHeight: 400,
  },

  comentariosScrollView: {
    flex: 1,
    maxHeight: 280,
  },

  comentarioAcoes: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 8,
    gap: 12,
  },

  comentarioAcao: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#3a3a3a',
    minWidth: 70,
    alignItems: 'center',
  },

  comentarioAcaoEdit: {
    backgroundColor: '#007bff',
  },

  comentarioAcaoDelete: {
    backgroundColor: '#dc3545',
  },

  comentarioAcaoTexto: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },

  verMaisComentarios: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#007bff',
    borderRadius: 8,
    alignItems: 'center',
  },

  verMaisComentariosTexto: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },

  permissaoButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },

  novoComentarioButton: {
    backgroundColor: '#28a745',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },

  novoComentarioButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Estilos para seção de anexos
  sectionAnexos: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },

  loadingAnexos: {
    alignItems: 'center',
    paddingVertical: 20,
  },

  loadingAnexosText: {
    color: '#888',
    fontSize: 14,
    fontStyle: 'italic',
  },

  anexosListContainer: {
    marginTop: 8,
  },

  anexoItemVisualizacao: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#444',
  },

  anexoInfoVisualizacao: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },

  anexoIconVisualizacao: {
    fontSize: 24,
    marginRight: 12,
  },

  anexoDetailsVisualizacao: {
    flex: 1,
  },

  anexoNomeVisualizacao: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },

  anexoTamanhoVisualizacao: {
    color: '#888',
    fontSize: 12,
    marginBottom: 2,
  },

  anexoDataVisualizacao: {
    color: '#888',
    fontSize: 11,
  },

  anexoDownloadButton: {
    backgroundColor: '#007bff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    minWidth: 70,
  },

  anexoDownloadIcon: {
    fontSize: 16,
    marginBottom: 2,
  },

  anexoDownloadText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },

  semAnexos: {
    alignItems: 'center',
    paddingVertical: 24,
  },

  semAnexosText: {
    color: '#888',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
  },

});

export default VisualizaTarefa;
