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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../router';
import {
  apiCall,
  getActiveWorkspaceId,
  getUserEmail,
  getUserId,
} from '../../services/authService';
import { deletarTarefa } from '../tarefa/dellTarefa';
import { useTheme } from '../theme/ThemeContext';
import ModalDenuncia from '../denuncia/ModalDenuncia';
import { databaseService } from '../../services/databaseService';
import { networkMonitor } from '../../services/networkinManager';
import CadVoiceTarefa from '../tarefa/voiceCadTarefa';
import VoiceFilterTarefa from '../tarefa/voiceFilterTarefa';

type CardTarefasNavigationProp = StackNavigationProp<RootStackParamList>;

interface CardTarefasProps {
  navigation: CardTarefasNavigationProp;
  refreshKey?: any;
}

import TarefaMultiplaInterface from '../tarefa/tarefaMultiplaInterface';
import { getActiveWorkspaceName } from '../../services/authService';
import WorkspaceInterface from '../workspace/workspaceInterface';

// Usar a interface padrão do projeto
interface Tarefa extends TarefaMultiplaInterface {
  concluida?: boolean; // Campo adicional para compatibilidade
}

interface Filtros {
  // ✅ Todos os filtros agora suportados pelo backend
  palavras_chave?: string;                               // Busca em título e descrição
  status?: string;                                       // Status exato da tarefa
  prioridade?: string;                                   // Prioridade exata da tarefa
  categoria_nome?: string;                               // Nome da categoria (ILIKE)
  minhas_tarefas?: boolean;                             // Tarefas do usuário logado
  recorrentes?: boolean;                                // Tarefas marcadas como recorrentes
  tipo_recorrencia?: 'diaria' | 'semanal' | 'mensal'; // Tipo específico de recorrência
  tarefas_com_prazo?: boolean;                          // ✨ NOVO: Apenas tarefas com data_fim
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

const CardTarefas: React.FC<CardTarefasProps> = ({ navigation, refreshKey }) => {
  const { theme } = useTheme();
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [loading, setLoading] = useState(false);
  const [palavraChave, setPalavraChave] = useState('');
  const [showFiltroModal, setShowFiltroModal] = useState(false);
  const [filtros, setFiltros] = useState<Filtros>({});
  const [workspaceId, setWorkspaceId] = useState<number | null>(null);
  const [workspaceName, setWorkspaceName] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [workspaceInfo, setWorkspaceInfo] = useState<WorkspaceInterface | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [minhasTarefas, setMinhasTarefas] = useState<boolean>(false);
  const [recorrentes, setRecorrentes] = useState<boolean>(false);
  const [tipoRecorrencia, setTipoRecorrencia] = useState<'diaria' | 'semanal' | 'mensal' | undefined>(undefined);
  const [favoritos, setFavoritos] = useState<number[]>([]);
  const [tarefasComPrazo, setTarefasComPrazo] = useState<boolean>(false);
  
  // Estados do modal de denúncia
  const [showDenunciaModal, setShowDenunciaModal] = useState(false);
  const [tarefaDenuncia, setTarefaDenuncia] = useState<Tarefa | null>(null);

  const STORAGE_KEY = 'tarefas_favoritas';

  // NOVO ESTADO PARA GERENCIAR A VISIBILIDADE DO MODAL DE VOZ
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  
  // ESTADO PARA GERENCIAR O MODAL DE FILTRO POR VOZ
  const [showVoiceFilterModal, setShowVoiceFilterModal] = useState(false);


  // Sempre que refreshKey mudar, ou workspaceId/workspaceInfo/userEmail, recarrega tudo
  useEffect(() => {
    initializeWorkspace();
  }, [refreshKey]);

  // Carrega favoritos na inicialização
  useEffect(() => {
    carregarFavoritos();
  }, []);

  // Só carrega tarefas quando workspaceId mudar
  useEffect(() => {
    if (workspaceId) {
      carregarTarefas();
    } else {
      setTarefas([]);
    }
  }, [workspaceId]);

  const carregarWorkspaceInfo = async (id: number) => {
    try {
      const isOnline = await networkMonitor.checkNetworkStatus();
      
      if (isOnline) {
        // Modo online - buscar da API
        try {
          console.log('🏢 Carregando info do workspace online...');
          const workspaceData = await apiCall(`/workspaces/id/${id}`, 'GET');
          setWorkspaceInfo(workspaceData);
          
          // Validar se o workspace carregado é realmente o esperado
          if (workspaceData.id_workspace !== id) {
            console.error('⚠️ ERRO: ID do workspace não confere!', {
              esperado: id,
              recebido: workspaceData.id_workspace,
              workspace: workspaceData
            });
          }
        } catch (error) {
          // Silenciosamente tentar fallback offline sem mostrar erro
          await carregarWorkspaceInfoOffline(id);
        }
      } else {
        // Modo offline - buscar do SQLite
        console.log('🏢 Carregando info do workspace offline...');
        await carregarWorkspaceInfoOffline(id);
      }
    } catch (error) {
      console.error('Erro ao carregar informações do workspace:', error);
      setWorkspaceInfo(null);
    }
  };

  const carregarWorkspaceInfoOffline = async (id: number) => {
    try {
      const email = await getUserEmail();
      if (!email) {
        return;
      }

      console.log('🔍 Debug: Buscando workspaces para email:', email);
      const result = await databaseService.getWorkspacesByUser(email);
      console.log('🔍 Debug: Resultado do SQLite:', JSON.stringify(result, null, 2));
      
      if (result.success && Array.isArray(result.data)) {
        console.log('🔍 Debug: Workspaces encontrados:', result.data.length);
        console.log('🔍 Debug: IDs dos workspaces:', result.data.map((ws: any) => ws.id_workspace));
        console.log('🔍 Debug: Buscando ID:', id);
        
        const workspace = result.data.find((ws: any) => ws.id_workspace === id);
        if (workspace) {
          setWorkspaceInfo(workspace);
          console.log('🏢 Workspace carregado do cache offline:', workspace.nome);
        } else {
          console.log('🏢 Workspace não encontrado no cache offline - ID não confere');
          setWorkspaceInfo(null);
        }
      } else {
        console.log('🏢 Nenhum workspace offline encontrado ou erro no resultado');
        setWorkspaceInfo(null);
      }
    } catch (error) {
      console.error('Erro ao carregar workspace offline:', error);
      setWorkspaceInfo(null);
    }
  };

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

      // Buscar informações do workspace por id (com suporte offline)
      if (id) {
        await carregarWorkspaceInfo(id);
      }
    } catch (error) {
      console.error('Erro ao obter workspace ativo:', error);
    }
  };

  // Funções para gerenciar favoritos
  const carregarFavoritos = async () => {
    try {
      const favoritosStorage = await AsyncStorage.getItem(STORAGE_KEY);
      if (favoritosStorage) {
        const favoritosData = JSON.parse(favoritosStorage);
        const favoritosIds = favoritosData.map((fav: any) => fav.id);
        setFavoritos(favoritosIds);
      }
    } catch (error) {
      console.error('Erro ao carregar favoritos:', error);
    }
  };

  const toggleFavorito = async (tarefa: Tarefa) => {
    try {
      const favoritosStorage = await AsyncStorage.getItem(STORAGE_KEY);
      let favoritosData = favoritosStorage ? JSON.parse(favoritosStorage) : [];
      
      const isFavorito = favoritosData.some((fav: any) => fav.id === tarefa.id_tarefa);
      
      if (isFavorito) {
        // Remover dos favoritos
        favoritosData = favoritosData.filter((fav: any) => fav.id !== tarefa.id_tarefa);
        Alert.alert('Removido', 'Tarefa removida dos favoritos');
      } else {
        // Adicionar aos favoritos
        const novoFavorito = {
          id: tarefa.id_tarefa,
          isPinned: false,
          pinnedOrder: 0,
          addedAt: new Date().getTime()
        };
        favoritosData.push(novoFavorito);
        Alert.alert('Adicionado', 'Tarefa adicionada aos favoritos!');
      }
      
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(favoritosData));
      
      // Atualizar estado local
      const novosIds = favoritosData.map((fav: any) => fav.id);
      setFavoritos(novosIds);
      
    } catch (error) {
      console.error('Erro ao gerenciar favorito:', error);
      Alert.alert('Erro', 'Erro ao gerenciar favoritos');
    }
  };

  const isFavorito = (tarefaId: number): boolean => {
    return favoritos.includes(tarefaId);
  };

  // Carregar favoritos quando o componente montar
  useEffect(() => {
    carregarFavoritos();
  }, []);

  // Função para verificar se o usuário logado é o criador da tarefa
  const isCreator = (tarefa: Tarefa): boolean => {
    if (!currentUserId && !userEmail) {
      return false;
    }
    
    // 1. Verificar se é o criador do workspace (tem total controle)
    if (workspaceInfo?.criador === userEmail) {
      return true;
    }
    
    // 2. Verificar pelo email do criador da tarefa se disponível
    if ((tarefa as any).criador_email && userEmail) {
      const isCreatorByEmail = (tarefa as any).criador_email === userEmail;
      if (isCreatorByEmail) {
        return true;
      }
    }
    
    // 3. Verificar pelo nível de acesso (0 = criador)
    if (tarefa.nivel_acesso === 0) {
      return true;
    }
    
    // 4. Verificar pelo id_usuario (fallback para workspaces individuais)
    if (tarefa.nivel_acesso === undefined && tarefa.id_usuario === currentUserId) {
      return true;
    }
    
    // 5. Para workspaces individuais, se você está no workspace, pode editar
    if (!workspaceInfo?.equipe && workspaceInfo?.emails?.includes(userEmail)) {
      return true;
    }
    
    return false;
  };

  // Função para verificar se pode editar a tarefa
  const podeEditarTarefa = (tarefa: Tarefa): boolean => {
    // Se o campo pode_editar está definido, usar ele
    if (tarefa.pode_editar !== undefined) {
      return tarefa.pode_editar;
    }
    
    // Fallback: criador (nivel 0) ou editor (nivel 1) podem editar
    return tarefa.nivel_acesso === 0 || tarefa.nivel_acesso === 1 || isCreator(tarefa);
  };

  // Função para verificar se pode apagar a tarefa
  const podeApagarTarefa = (tarefa: Tarefa): boolean => {
    // Se o campo pode_apagar está definido, usar ele
    if (tarefa.pode_apagar !== undefined) {
      return tarefa.pode_apagar;
    }
    
    // Fallback: apenas criador (nivel 0) pode apagar
    return tarefa.nivel_acesso === 0 || isCreator(tarefa);
  };

  // Função para obter ícone de permissão
  const getPermissaoIcon = (tarefa: Tarefa): string => {
    // Não mostrar ícone de permissão para workspaces individuais
    if (!workspaceInfo?.equipe) {
      return '';
    }
    
    if (tarefa.nivel_acesso === 0 || isCreator(tarefa)) {
      return '👑'; // Criador
    } else if (tarefa.nivel_acesso === 1) {
      return '✏️'; // Editor
    } else if (tarefa.nivel_acesso === 2) {
      return '👁️'; // Visualizador
    }
    return '';
  };

  // As permissões agora vêm diretamente do backend nas tarefas

  // ✅ REMOVIDO: Filtros agora são aplicados no backend

  const carregarTarefas = async (filtrosCustom?: Filtros) => {
    if (!workspaceId) {
      setTarefas([]);
      return;
    }
    setLoading(true);
    try {
      const networkStatus = networkMonitor.getCurrentStatus();
      const filtrosAtivos = filtrosCustom || filtros;
      let dadosTarefas: Tarefa[];
      
      if (networkStatus.isOnline) {
        // 🌐 ONLINE: Buscar do backend
        console.log('🌐 Modo ONLINE - Buscando tarefas do backend...');
        
        const temFiltros = Object.keys(filtrosAtivos).length > 0;
        let endpoint: string;
        
        if (temFiltros) {
          // ✨ Usar nova rota de filtros avançados do backend
          const params = new URLSearchParams();
          
          // Mapear filtros para parâmetros da API
          if (filtrosAtivos.palavras_chave?.trim()) {
            params.append('palavras_chave', filtrosAtivos.palavras_chave.trim());
          }
          if (filtrosAtivos.status) {
            params.append('status', filtrosAtivos.status);
          }
          if (filtrosAtivos.prioridade) {
            params.append('prioridade', filtrosAtivos.prioridade);
          }
          if (filtrosAtivos.categoria_nome?.trim()) {
            params.append('categoria_nome', filtrosAtivos.categoria_nome.trim());
          }
          if (filtrosAtivos.minhas_tarefas) {
            params.append('minhas_tarefas', 'true');
          }
          if (filtrosAtivos.recorrentes) {
            params.append('recorrentes', 'true');
          }
          if (filtrosAtivos.tipo_recorrencia) {
            params.append('tipo_recorrencia', filtrosAtivos.tipo_recorrencia);
          }
          if (filtrosAtivos.tarefas_com_prazo) {
            params.append('tarefas_com_prazo', 'true');
          }
          
          endpoint = `/tarefas/workspace/${workspaceId}/filtros-avancados?${params.toString()}`;
          console.log('🔍 Usando filtros do backend:', endpoint);
        } else {
          // Sem filtros: usar endpoint simples
          endpoint = `/tarefas/workspace/${workspaceId}`;
          console.log('📡 Carregando todas as tarefas:', endpoint);
        }
        
        dadosTarefas = await apiCall(endpoint, 'GET');
      } else {
        // 📴 OFFLINE: Buscar do SQLite
        console.log('📴 Modo OFFLINE - Buscando tarefas do SQLite...');
        
        const result = await databaseService.getTarefasByWorkspace(workspaceId);
        
        if (!result.success) {
          throw new Error(result.error || 'Falha ao buscar tarefas offline');
        }
        
        dadosTarefas = result.data || [];
        
        // ✅ Aplicar filtros localmente quando offline
        if (Object.keys(filtrosAtivos).length > 0) {
          dadosTarefas = dadosTarefas.filter(tarefa => {
            // Filtro por palavra-chave
            if (filtrosAtivos.palavras_chave?.trim()) {
              const palavraChaveLocal = filtrosAtivos.palavras_chave.trim().toLowerCase();
              const contemPalavra = tarefa.titulo.toLowerCase().includes(palavraChaveLocal) || 
                                   (tarefa.descricao && tarefa.descricao.toLowerCase().includes(palavraChaveLocal));
              if (!contemPalavra) {
                return false;
              }
            }
            
            // Filtro por status
            if (filtrosAtivos.status && tarefa.status !== filtrosAtivos.status) {
              return false;
            }
            
            // Filtro por prioridade
            if (filtrosAtivos.prioridade && tarefa.prioridade !== filtrosAtivos.prioridade) {
              return false;
            }
            
            // Filtro minhas tarefas
            if (filtrosAtivos.minhas_tarefas && tarefa.id_usuario !== currentUserId) {
              return false;
            }
            
            // Filtro recorrentes
            if (filtrosAtivos.recorrentes && !tarefa.recorrente) {
              return false;
            }
            
            // Filtro tipo recorrência
            if (filtrosAtivos.tipo_recorrencia && tarefa.recorrencia !== filtrosAtivos.tipo_recorrencia) {
              return false;
            }
            
            // Filtro tarefas com prazo
            if (filtrosAtivos.tarefas_com_prazo && !tarefa.data_fim) {
              return false;
            }
            
            return true;
          });
        }
        
        console.log(`💾 Tarefas carregadas do SQLite: ${dadosTarefas.length} tarefas`);
      }
      
      // Tarefas carregadas com sucesso
      const modoConexao = networkStatus.isOnline ? 'ONLINE' : 'OFFLINE';
      console.log(`📄 Tarefas carregadas (${modoConexao}):`, dadosTarefas.length, 'tarefas do workspace', workspaceId);
      
      // VALIDAÇÃO CRÍTICA: Verificar se todas as tarefas pertencem ao workspace correto
      const tarefasInvalidas = dadosTarefas.filter(tarefa => tarefa.id_workspace !== workspaceId);
      if (tarefasInvalidas.length > 0) {
        console.error('🚨 ERRO CRÍTICO: Tarefas de workspace incorreto detectadas!', {
          workspaceAtivo: workspaceId,
          workspaceNome: workspaceInfo?.nome,
          workspaceInfo: workspaceInfo,
          totalTarefas: dadosTarefas.length,
          tarefasInvalidas: tarefasInvalidas.map(t => ({ 
            id: t.id_tarefa, 
            workspace: t.id_workspace, 
            titulo: t.titulo 
          }))
        });
        Alert.alert(
          'Erro de Sincronização', 
          `Detectadas ${tarefasInvalidas.length} tarefa(s) de workspace incorreto!\n\nWorkspace ativo: ${workspaceId} (${workspaceInfo?.nome})\nTarefas inválidas: ${tarefasInvalidas.map(t => t.titulo).join(', ')}`,
          [{ 
            text: 'Recarregar', 
            onPress: async () => {
              setTarefas([]);
              await initializeWorkspace();
            }
          }]
        );
        return;
      }
      
      // ✅ Aplicar filtros locais para funcionalidades não suportadas pelo backend
      let tarefasFiltradas = dadosTarefas;
      
      // ❌ Filtro recorrentes (não existe no backend - aplicar localmente)
      if (filtrosAtivos.recorrentes) {
        tarefasFiltradas = tarefasFiltradas.filter(tarefa => {
          // Verificar se a propriedade existe e é verdadeira
          return Boolean(tarefa.recorrente);
        });
        
        // ❌ Filtro tipo de recorrência (não existe no backend - aplicar localmente)
        if (filtrosAtivos.tipo_recorrencia) {
          tarefasFiltradas = tarefasFiltradas.filter(tarefa => {
            // Verificar se a propriedade existe e corresponde
            return tarefa.recorrencia === filtrosAtivos.tipo_recorrencia;
          });
        }
      }
      
      console.log('🔍 Filtros aplicados - Total tarefas:', tarefasFiltradas.length);
      
      const tarefasOrdenadas = tarefasFiltradas
        .sort((a, b) => {
          const dataA = new Date(a.data_criacao || 0).getTime();
          const dataB = new Date(b.data_criacao || 0).getTime();
          return dataB - dataA;
        });
        
      console.log('✅ Definindo tarefas no estado:', { 
        total: tarefasOrdenadas.length, 
        workspaceId,
        primeiras: tarefasOrdenadas.slice(0, 3).map(t => ({ id: t.id_tarefa, titulo: t.titulo }))
      });
      
      // As permissões já vêm do backend nas tarefas
      setTarefas(tarefasOrdenadas);
    } catch (error) {
      console.error('Erro ao carregar tarefas:', error);
      
      const networkStatus = networkMonitor.getCurrentStatus();
      
      if (!networkStatus.isOnline) {
        // Erro offline - provavelmente não tem dados locais
        Alert.alert(
          'Sem conexão', 
          'Você está offline e não há dados salvos localmente. Conecte-se à internet para sincronizar os dados.',
          [
            { text: 'OK', style: 'default' },
            { text: 'Tentar novamente', onPress: () => carregarTarefas(filtrosCustom) }
          ]
        );
      } else {
        // Erro online - problema de rede ou servidor
        Alert.alert('Erro', 'Não foi possível carregar as tarefas. Verifique sua conexão.');
      }
      
      setTarefas([]); // Limpar tarefas em caso de erro
    } finally {
      setLoading(false);
    }
  };

  const pesquisarPorPalavraChave = async () => {
    const filtrosPesquisa = {
      ...filtros,
      ...(palavraChave.trim() && { palavras_chave: palavraChave.trim() })
    };

    // Atualizar o estado dos filtros para incluir a palavra-chave
    setFiltros(filtrosPesquisa);
    await carregarTarefas(filtrosPesquisa);
  };

  const aplicarFiltros = async (novosFiltros: Filtros) => {
    // Incluir palavra-chave atual nos filtros se ela existir
    const filtrosCompletos = {
      ...novosFiltros,
      ...(palavraChave.trim() && { palavras_chave: palavraChave.trim() })
    };
    
    setFiltros(filtrosCompletos);
    setMinhasTarefas(!!novosFiltros.minhas_tarefas);
    setRecorrentes(!!novosFiltros.recorrentes);
    setTipoRecorrencia(novosFiltros.tipo_recorrencia);
    setTarefasComPrazo(!!novosFiltros.tarefas_com_prazo);
    await carregarTarefas(filtrosCompletos);
    setShowFiltroModal(false);
  };

  const limparFiltros = async () => {
    const filtrosVazios = {};
    setFiltros(filtrosVazios);
    setMinhasTarefas(false);
    setRecorrentes(false);
    setTipoRecorrencia(undefined);
    setTarefasComPrazo(false);
    setPalavraChave('');
    await carregarTarefas(filtrosVazios);
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

  // NOVA FUNÇÃO PARA ABRIR O MODAL DE VOZ
  const abrirModalVoz = () => {
    setShowVoiceModal(true);
  };
  
  // FUNÇÃO PARA FECHAR O MODAL DE VOZ
  const fecharModalVoz = () => {
      setShowVoiceModal(false);
  };

  // FUNÇÕES PARA O MODAL DE FILTRO POR VOZ
  const abrirModalFiltroVoz = () => {
    setShowVoiceFilterModal(true);
  };
  
  const fecharModalFiltroVoz = () => {
    setShowVoiceFilterModal(false);
  };

  // FUNÇÃO PARA APLICAR FILTRO POR VOZ
  const aplicarFiltroVoz = async (filtrosVoz: { palavras_chave?: string; termo_original?: string }) => {
    console.log('🎙️ Aplicando filtro por voz:', filtrosVoz);
    
    // Incluir filtros existentes + filtro por voz
    const filtrosCompletos = {
      ...filtros,
      palavras_chave: filtrosVoz.palavras_chave // Usa o termo normalizado (lowercase)
    };
    
    // Atualizar estado dos filtros
    setFiltros(filtrosCompletos);
    
    // Atualizar campo de palavra-chave no input com o termo original (com capitalização)
    if (filtrosVoz.termo_original) {
      setPalavraChave(filtrosVoz.termo_original);
    } else if (filtrosVoz.palavras_chave) {
      setPalavraChave(filtrosVoz.palavras_chave);
    }
    
    // Aplicar filtros
    await carregarTarefas(filtrosCompletos);
    
    // Fechar modal
    setShowVoiceFilterModal(false);
  };





  const handleToggleConcluida = async (tarefa: Tarefa) => {
    try {
      const novoStatus = tarefa.status === 'concluido' ? 'a_fazer' : 'concluido';
      const novaConcluida = novoStatus === 'concluido';
      
      console.log('🔄 [CardTarefas] Alterando status da tarefa:', {
        id: tarefa.id_tarefa,
        titulo: tarefa.titulo,
        status_atual: tarefa.status,
        novo_status: novoStatus
      });
      
      const networkStatus = networkMonitor.getCurrentStatus();
      
      if (networkStatus.isOnline) {
        try {
          // Modo online - tentar API
          await apiCall(`/tarefas/${tarefa.id_tarefa}`, 'PUT', {
            status: novoStatus,
            concluida: novaConcluida
          });
          
          console.log('✅ [CardTarefas] Status alterado online com sucesso');
        } catch (apiError) {
          console.log('📴 [CardTarefas] Falha na API, salvando offline...', apiError);
          // Se API falhar, salvar offline
          await salvarAlteracaoOffline(tarefa.id_tarefa, { status: novoStatus, concluida: novaConcluida });
        }
      } else {
        // Modo offline - salvar localmente
        console.log('📴 [CardTarefas] Modo offline - salvando localmente');
        await salvarAlteracaoOffline(tarefa.id_tarefa, { status: novoStatus, concluida: novaConcluida });
      }
      
      // Recarregar as tarefas para refletir a mudança
      await carregarTarefas();
    } catch (error) {
      console.error('❌ [CardTarefas] Erro ao alterar status da tarefa:', error);
      Alert.alert('Erro', 'Não foi possível alterar o status da tarefa');
    }
  };

  const salvarAlteracaoOffline = async (idTarefa: number, dadosAtualizacao: any) => {
    try {
      // Atualizar no SQLite local
      const resultUpdate = await databaseService.updateTarefa(idTarefa, dadosAtualizacao);
      
      if (resultUpdate.success) {
        console.log('✅ [CardTarefas] Status atualizado no SQLite local');
        
        Alert.alert(
          '📴 Salvo Offline',
          'A alteração foi salva localmente e será sincronizada quando você estiver online.',
          [{ text: 'OK' }]
        );
      } else {
        console.warn('⚠️ [CardTarefas] Falha ao atualizar no SQLite local:', resultUpdate.error);
        throw new Error(resultUpdate.error);
      }
      
      // TODO: Adicionar à fila de sincronização quando implementarmos
      console.log('📋 [CardTarefas] Alteração marcada para sincronização futura');
      
    } catch (error: any) {
      console.error('❌ [CardTarefas] Erro ao salvar offline:', error);
      throw error;
    }
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

  const handleDenunciarTarefa = (tarefa: Tarefa) => {
    setTarefaDenuncia(tarefa);
    setShowDenunciaModal(true);
  };

  const handleCloseDenunciaModal = () => {
    setShowDenunciaModal(false);
    setTarefaDenuncia(null);
  };

  const renderTarefa = ({ item }: { item: Tarefa }) => {
    const podeEditar = podeEditarTarefa(item);
    const podeApagar = podeApagarTarefa(item);
    const permissaoIcon = getPermissaoIcon(item);
    
    return (
      <View style={[styles.tarefaItem, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.tarefaContent}>
          {/* Checkbox de conclusão */}
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => handleToggleConcluida(item)}>
            <View style={[
              styles.checkbox,
              { borderColor: theme.colors.primary },
              item.status === 'concluido' && { backgroundColor: theme.colors.success }
            ]}>
              {item.status === 'concluido' && (
                <Text style={[styles.checkboxIcon, { color: theme.colors.surface }]}>✓</Text>
              )}
            </View>
          </TouchableOpacity>

          {/* Conteúdo da tarefa */}
          <View style={styles.tarefaInfo}>
            <View style={styles.tarefaTituloContainer}>
              {/* Ícone de criador na frente do título (só para workspaces de equipe) */}
              {permissaoIcon && permissaoIcon.trim() !== '' && workspaceInfo?.equipe && (
                <Text style={styles.permissaoIcon}>{permissaoIcon}</Text>
              )}
              <Text style={[
                styles.tarefaTitulo,
                { color: theme.colors.text },
                item.status === 'concluido' && styles.tarefaTituloConcluida
              ]} numberOfLines={1}>
                {item.titulo}
              </Text>
            </View>
            
            {item.descricao && (
              <Text style={[
                styles.tarefaDescricao,
                { color: theme.colors.textSecondary },
                item.status === 'concluido' && styles.tarefaDescricaoConcluida
              ]} numberOfLines={2}>
                {item.descricao}
              </Text>
            )}

            {/* Botões de ação embaixo da descrição */}
            <View style={styles.tarefaActionsBottom}>
              {/* Ícone de editar - para criadores e editores */}
              {podeEditar && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: theme.colors.primary + '40' }]}
                  onPress={() => handleEditarTarefa(item)}>
                  <Text style={styles.actionIcon}>✏️</Text>
                </TouchableOpacity>
              )}
              
              {/* Ícone de deletar - apenas para criadores */}
              {podeApagar && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: theme.colors.error + '40' }]}
                  onPress={() => handleDelete(item)}>
                  <Text style={styles.actionIcon}>🗑️</Text>
                </TouchableOpacity>
              )}
              
              {/* Ícone de favorito - sempre visível */}
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: isFavorito(item.id_tarefa) ? theme.colors.warning + '40' : theme.colors.textSecondary + '20' }]}
                onPress={() => toggleFavorito(item)}>
                <Text style={styles.actionIcon}>
                  {isFavorito(item.id_tarefa) ? '⭐' : '☆'}
                </Text>
              </TouchableOpacity>

              {/* Ícone de visualizar - sempre visível */}
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleVerTarefa(item)}>
                <Text style={styles.actionIcon}>👁️</Text>
              </TouchableOpacity>
              
              {/* Ícone de denúncia */}
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleDenunciarTarefa(item)}>
                <Text style={styles.actionIcon}>⚠️</Text>
              </TouchableOpacity>
            </View>
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
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Cabeçalho com filtro */}
      <View style={[styles.headerContainer, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.filtroContainer}>
          <TouchableOpacity
            style={[styles.filtroIcon, { backgroundColor: theme.colors.background }]}
            onPress={() => setShowFiltroModal(true)}>
            <Text style={styles.filtroIconText}>⚙️</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.filtroIcon, { backgroundColor: theme.colors.background }]}
            onPress={abrirModalFiltroVoz}>
            <Text style={styles.filtroIconText}>🎙️</Text>
          </TouchableOpacity>
          
          <TextInput
            style={[styles.palavraChaveInput, { 
              backgroundColor: theme.colors.background,
              color: theme.colors.text,
              borderColor: theme.colors.border 
            }]}
            placeholder="Buscar por palavra-chave..."
            placeholderTextColor={theme.colors.textSecondary}
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

      {/* Botões Criar Tarefa */}
      <View style={styles.botoesContainer}>
        <TouchableOpacity
          style={styles.criarTarefaButtonAzul}
          onPress={handleCriarTarefa}
        >
          <Text style={styles.criarTarefaButtonText}>➕ Criar Tarefa</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.criarTarefaButtonVerde}
          onPress={() => {
            abrirModalVoz();
          }}
        >
          <Text style={styles.criarTarefaButtonText}>🎙️ Criar por Voz</Text>
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

      {/* Modal de Denúncia */}
      <ModalDenuncia 
        visible={showDenunciaModal}
        idTarefa={tarefaDenuncia?.id_tarefa || 0}
        tituloTarefa={tarefaDenuncia?.titulo || ''}
        onClose={handleCloseDenunciaModal}
      />

      {/* Modal de Filtros */}
      <Modal
        visible={showFiltroModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFiltroModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.filtroModal, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Filtros</Text>
              <TouchableOpacity onPress={() => setShowFiltroModal(false)}>
                <Text style={[styles.modalClose, { color: theme.colors.textSecondary }]}>✕</Text>
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
                    borderColor: theme.colors.primary,
                    backgroundColor: filtros.minhas_tarefas ? theme.colors.primary : 'transparent',
                    marginRight: 10,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    {filtros.minhas_tarefas && (
                      <Text style={{ color: theme.colors.surface, fontWeight: 'bold', fontSize: 16 }}>✓</Text>
                    )}
                  </View>
                  <Text style={{ color: theme.colors.text, fontSize: 16 }}>
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
                    borderColor: theme.colors.success,
                    backgroundColor: filtros.recorrentes ? theme.colors.success : 'transparent',
                    marginRight: 10,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    {filtros.recorrentes && (
                      <Text style={{ color: theme.colors.surface, fontWeight: 'bold', fontSize: 16 }}>✓</Text>
                    )}
                  </View>
                  <Text style={{ color: theme.colors.text, fontSize: 16 }}>
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

              {/* Filtro Tarefas com Prazo */}
              <View style={styles.filtroSection}>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}
                  onPress={() => setFiltros(prev => ({ ...prev, tarefas_com_prazo: !prev.tarefas_com_prazo }))}
                >
                  <View style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    borderWidth: 2,
                    borderColor: '#ffc107',
                    backgroundColor: filtros.tarefas_com_prazo ? '#ffc107' : 'transparent',
                    marginRight: 10,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    {filtros.tarefas_com_prazo && (
                      <Text style={{ color: '#000', fontWeight: 'bold', fontSize: 16 }}>✓</Text>
                    )}
                  </View>
                  <Text style={{ color: '#fff', fontSize: 16 }}>
                    Mostrar apenas tarefas com prazo definido
                  </Text>
                </TouchableOpacity>
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

      {/* Modal de Voz */}
      {showVoiceModal && (
        <Modal
          visible={showVoiceModal}
          transparent
          animationType="slide"
          onRequestClose={fecharModalVoz}
        >
          <CadVoiceTarefa onClose={fecharModalVoz} />
        </Modal>
      )}

      {/* Modal de Filtro por Voz */}
      <VoiceFilterTarefa
        visible={showVoiceFilterModal}
        onClose={fecharModalFiltroVoz}
        onFilter={aplicarFiltroVoz}
      />

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
  
  botoesContainer: {
    backgroundColor: '#2a2a2a',
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a3a',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  criarTarefaContainer: {
    backgroundColor: '#2a2a2a',
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a3a',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
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

  favoritoButton: {
    backgroundColor: 'rgba(255, 193, 7, 0.3)', // Cor amarelada para favoritos
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
    backgroundColor: '#007bff',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  
  criarTarefaButtonAzul: {
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  
  criarTarefaButtonVerde: {
    backgroundColor: '#28a745',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    flex: 1,
    marginLeft: 8,
    alignItems: 'center',
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
    borderRadius: 12,
    margin: 20,
    maxHeight: '80%',
    width: '90%',
    maxWidth: 400,
    // backgroundColor será aplicada dinamicamente
  },
  
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    // borderBottomColor será aplicada dinamicamente
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
  
  // Novos estilos para permissões
  tarefaTituloContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  
  permissaoIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  
  // Estilos para o checkbox de conclusão
  checkboxContainer: {
    padding: 4,
    marginRight: 12,
  },
  
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#6c757d',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  checkboxChecked: {
    backgroundColor: '#28a745',
    borderColor: '#28a745',
  },
  
  checkboxIcon: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  
  // Estilos para tarefas concluídas
  tarefaTituloConcluida: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  
  tarefaDescricaoConcluida: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  
  // Novo estilo para ações embaixo
  tarefaActionsBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#404040',
  },
});

export default CardTarefas;
