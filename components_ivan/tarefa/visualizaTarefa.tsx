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
import networkinManager from '../../services/networkinManager';
import databaseService from '../../services/databaseService';
import syncManager from '../../services/syncManager';

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
  const [workspaceEquipe, setWorkspaceEquipe] = useState<boolean>(false);
  const [permissoesModalVisible, setPermissoesModalVisible] = useState(false);
  const [temComentarios, setTemComentarios] = useState(false);
  const [comentarios, setComentarios] = useState<any[]>([]);

  const [anexos, setAnexos] = useState<AnexoTarefa[]>([]);
  const [loadingAnexos, setLoadingAnexos] = useState(false);

  const { id_tarefa, titulo } = route.params || {};

  useEffect(() => {
    initializeWorkspace();
  }, []);

  useEffect(() => {
    if (id_tarefa && workspaceId) {
      carregarTarefa();
    }
  }, [id_tarefa, workspaceId]);

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

      if (id) {
        const isOnline = networkinManager.checkOnlineStatus();
        
        if (isOnline) {
          try {
            console.log('🏢 Buscando informações do workspace online:', id);
            const workspaceInfo = await apiCall(`/workspaces/id/${id}`, 'GET');
            console.log('🏢 Workspace info recebido:', workspaceInfo);
            setWorkspaceEquipe(workspaceInfo.equipe || false);
          } catch (error) {
            console.log('❌ Erro ao buscar info do workspace online:', error);
            setWorkspaceEquipe(false);
          }
        } else {
          console.log('📴 Modo offline - usando configurações padrão do workspace');
          setWorkspaceEquipe(true); // Assumir permissões padrão offline
        }
      }
    } catch (error) {
      console.error('Erro ao obter workspace ativo:', error);
      Alert.alert('Erro', 'Não foi possível obter o workspace ativo');
    }
  };

  const carregarTarefaOffline = async (): Promise<TarefaCompleta> => {
    try {
      if (!id_tarefa) {
        throw new Error('ID da tarefa não fornecido');
      }
      
      console.log('📱 [VisualizaTarefa] Carregando tarefa offline por ID:', id_tarefa);
      
      // Primeiro, vamos listar todas as tarefas para debug
      console.log('🔍 [DEBUG] Listando todas as tarefas no SQLite...');
      await databaseService.listarTodasTarefasSQLite();
      
      // Buscar tarefa específica por ID
      const result = await databaseService.getTarefaById(id_tarefa);

      console.log('📱 [VisualizaTarefa] Resultado getTarefaById:', JSON.stringify(result, null, 2));

      if (result.success && result.data) {
        console.log('✅ [VisualizaTarefa] Tarefa encontrada offline:', {
          id: result.data.id_tarefa,
          titulo: result.data.titulo,
          id_workspace: result.data.id_workspace,
          categorias: result.data.categorias?.length || 0,
          dados_completos: result.data
        });

        // Retornar tarefa com estrutura mínima necessária
        const tarefaCompleta: TarefaCompleta = {
          ...result.data,
          categorias: result.data.categorias || [],
          pode_editar: true,
          pode_apagar: true,
          nivel_acesso: 'full' as const
        };
        
        return tarefaCompleta;
      } else {
        console.error('❌ [VisualizaTarefa] Tarefa não encontrada:', {
          id_procurado: id_tarefa,
          erro: result.error,
          resultado_completo: result
        });
        throw new Error(`Tarefa ID ${id_tarefa} não encontrada offline: ${result.error}`);
      }
    } catch (error: any) {
      console.error('❌ [VisualizaTarefa] Erro detalhado ao carregar tarefa offline:', error);
      throw new Error(`Tarefa não disponível offline: ${error.message}`);
    }
  };

  const carregarTarefa = async () => {
    console.log('🔍 Iniciando carregarTarefa com:', { id_tarefa, workspaceId, titulo });
    
    if (!workspaceId) {
      console.log('❌ Workspace ID não disponível');
      return;
    }

    setLoading(true);
    try {
      let tarefaData: TarefaCompleta;

      if (id_tarefa) {
        const isOnline = networkinManager.checkOnlineStatus();
        
        if (isOnline) {
          try {
            // Tentar carregar online
            const todasTarefas = await apiCall(`/tarefas/workspace/${workspaceId}`, 'GET');
            const tarefaEncontrada = todasTarefas.find((t: TarefaCompleta) => t.id_tarefa === id_tarefa);
            if (!tarefaEncontrada) {
              throw new Error('Tarefa não encontrada');
            }
            tarefaData = tarefaEncontrada;

            try {
              const categorias = await apiCall(`/tarefas/${id_tarefa}/categorias`, 'GET');
              tarefaData = { ...tarefaData, categorias };
            } catch (catErr) {
              tarefaData = { ...tarefaData, categorias: [] };
            }
          } catch (apiError) {
            console.log('📴 Falha na API, tentando carregar offline...');
            try {
              tarefaData = await carregarTarefaOffline();
            } catch (offlineError) {
              console.error('❌ Erro ao carregar tarefa offline:', offlineError);
              throw new Error('Tarefa não disponível offline');
            }
          }
        } else {
          // Modo offline
          console.log('📴 Modo offline - carregando tarefa do SQLite');
          try {
            tarefaData = await carregarTarefaOffline();
          } catch (offlineError) {
            console.error('❌ Erro ao carregar tarefa offline:', offlineError);
            throw new Error('Tarefa não disponível offline');
          }
        }

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
      const isOnline = networkinManager.checkOnlineStatus();
      
      if (isOnline) {
        try {
          // Tentar carregar online
          const comentariosData = await apiCall(`/comentarios/tarefa/${idTarefa}`);
          console.log('📝 [VisualizaTarefa] Comentários carregados online:', comentariosData?.length || 0);
          if (comentariosData && comentariosData.length > 0) {
            console.log('🔍 [VisualizaTarefa] Primeiro comentário:', JSON.stringify(comentariosData[0], null, 2));
          }
          setComentarios(comentariosData || []);
          setTemComentarios(comentariosData && comentariosData.length > 0);
          return comentariosData || [];
        } catch (error) {
          console.log('📴 [VisualizaTarefa] Falha ao carregar comentários online, tentando offline:', error);
          return await carregarComentariosOffline(idTarefa);
        }
      } else {
        console.log('📴 [VisualizaTarefa] Modo offline - carregando comentários do SQLite');
        return await carregarComentariosOffline(idTarefa);
      }
    } catch (error) {
      console.error('❌ [VisualizaTarefa] Erro ao carregar comentários:', error);
      setComentarios([]);
      setTemComentarios(false);
      return [];
    } finally {
      setLoadingComentarios(false);
    }
  };

  const carregarComentariosOffline = async (idTarefa: number) => {
    try {
      const result = await databaseService.getComentariosByTarefa(idTarefa);
      
      if (result.success && result.data) {
        console.log('📝 [VisualizaTarefa] Comentários carregados offline:', result.data.length);
        setComentarios(result.data);
        setTemComentarios(result.data.length > 0);
        return result.data;
      } else {
        console.log('📴 [VisualizaTarefa] Nenhum comentário encontrado offline');
        setComentarios([]);
        setTemComentarios(false);
        return [];
      }
    } catch (error) {
      console.error('❌ [VisualizaTarefa] Erro ao carregar comentários offline:', error);
      setComentarios([]);
      setTemComentarios(false);
      return [];
    }
  };

  const carregarAnexos = async (idTarefa: number) => {
    setLoadingAnexos(true);
    try {
      const isOnline = networkinManager.checkOnlineStatus();
      
      if (isOnline) {
        try {
          // Tentar carregar online
          const anexosData = await AnexoService.listarAnexos(idTarefa);
          console.log('📎 [VisualizaTarefa] Anexos carregados online:', anexosData?.length || 0);
          setAnexos(anexosData || []);
        } catch (error) {
          console.log('📴 [VisualizaTarefa] Falha ao carregar anexos online, usando dados offline:', error);
          // Fallback offline - retornar array vazio por enquanto
          setAnexos([]);
        }
      } else {
        console.log('📴 [VisualizaTarefa] Modo offline - anexos não disponíveis');
        setAnexos([]);
      }
    } catch (error) {
      console.error('❌ [VisualizaTarefa] Erro ao carregar anexos:', error);
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

    const onDelete = (comentarioId: number) => {
      console.log('✅ Comentário excluído com sucesso! ID:', comentarioId);
      console.log('🔄 Recarregando lista de comentários...');
      if (tarefa && tarefa.id_tarefa) {
        carregarComentarios(tarefa.id_tarefa);
      }
    };

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

  const marcarComoConcluida = async () => {
    await atualizarStatusTarefa('concluido', true);
  };

  const marcarComoNaoConcluida = async () => {
    await atualizarStatusTarefa('a_fazer', false);
  };

  const atualizarStatusTarefa = async (novoStatus: string, concluida: boolean) => {
    try {
      const dadosAtualizacao = {
        status: novoStatus,
        concluida: concluida
      };

      const isOnline = networkinManager.checkOnlineStatus();
      
      if (isOnline) {
        try {
          // Tentar atualizar online
          await apiCall(`/tarefas/${tarefa!.id_tarefa}`, 'PUT', dadosAtualizacao);
          
          // Atualizar estado local
          setTarefa(prev => prev ? { ...prev, status: novoStatus as any, concluida } : null);
          
          Alert.alert('Sucesso', 'Status da tarefa atualizado!');
        } catch (apiError) {
          console.log('📴 Falha na API, salvando offline...');
          await salvarAtualizacaoOffline(dadosAtualizacao);
        }
      } else {
        // Modo offline
        await salvarAtualizacaoOffline(dadosAtualizacao);
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar status:', error);
      Alert.alert('Erro', 'Não foi possível atualizar o status da tarefa');
    }
  };

  const salvarAtualizacaoOffline = async (dadosAtualizacao: any) => {
    try {
      // Atualizar tarefa no SQLite local
      const resultUpdate = await databaseService.updateTarefa(tarefa!.id_tarefa, dadosAtualizacao);
      
      if (resultUpdate.success) {
        console.log('✅ Status da tarefa atualizado no SQLite local');
      } else {
        console.warn('⚠️ Falha ao atualizar no SQLite local:', resultUpdate.error);
      }

      // TODO: Adicionar à fila de sincronização quando implementarmos
      console.log('📋 [VisualizaTarefa] Dados marcados para sincronização:', dadosAtualizacao);
      
      // Atualizar estado local
      setTarefa(prev => prev ? { ...prev, ...dadosAtualizacao } : null);
      
      Alert.alert(
        '📴 Salvo Offline',
        'A alteração foi salva localmente e será sincronizada quando você estiver online.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('❌ Erro ao salvar offline:', error);
      throw error;
    }
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
      {}
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
        {}
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

          {}
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

        {}
        {tarefa.descricao && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📝 Descrição</Text>
            <Text style={styles.description}>{tarefa.descricao}</Text>
          </View>
        )}

        {}
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

        {}
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

        {}

        {}
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

        {}

        {}
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

        {}
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

          {}
          <TouchableOpacity
            style={styles.novoComentarioButton}
            onPress={adicionarComentario}
            activeOpacity={0.7}>
            <Text style={styles.novoComentarioButtonText}>💬 Novo Comentário</Text>
          </TouchableOpacity>
          
          {/* Botão para marcar como concluída/não concluída */}
          {!tarefa.concluida ? (
            <TouchableOpacity
              style={[styles.novoComentarioButton, styles.concluirButton]}
              onPress={marcarComoConcluida}
              activeOpacity={0.7}>
              <Text style={styles.novoComentarioButtonText}>✅ Marcar como Concluída</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.novoComentarioButton, styles.reabrirButton]}
              onPress={marcarComoNaoConcluida}
              activeOpacity={0.7}>
              <Text style={styles.novoComentarioButtonText}>↩️ Reabrir Tarefa</Text>
            </TouchableOpacity>
          )}
        </View>

        {}
                {/* Botão de permissões - aparece para criador da tarefa ou em workspaces de equipe */}
        {(tarefa.nivel_acesso === 0 || workspaceEquipe) && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.permissaoButton}
              onPress={() => setPermissoesModalVisible(true)}>
              <Text style={styles.permissaoButtonText}>👥 Gerenciar Permissões</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {}
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

  concluirButton: {
    backgroundColor: '#28a745',
  },

  reabrirButton: {
    backgroundColor: '#fd7e14',
  },

});

export default VisualizaTarefa;
