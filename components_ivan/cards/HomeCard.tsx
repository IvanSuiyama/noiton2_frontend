import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../router';
import {
  apiCall,
  getActiveWorkspaceId,
  getActiveWorkspaceName,
} from '../../services/authService';
import TarefaMultiplaInterface from '../tarefa/tarefaMultiplaInterface';
import { useTheme } from '../theme/ThemeContext';
import ProgressChart from '../charts/ProgressChart';

interface HomeCardProps {
  navigation: StackNavigationProp<RootStackParamList>;
}

const HomeCard: React.FC<HomeCardProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const [tarefasRecentes, setTarefasRecentes] = useState<TarefaMultiplaInterface[]>([]);
  const [tarefasUrgentes, setTarefasUrgentes] = useState<TarefaMultiplaInterface[]>([]);
  const [loading, setLoading] = useState(true);
  const [workspaceId, setWorkspaceId] = useState<number | null>(null);
  const [workspaceName, setWorkspaceName] = useState<string>('');
  const [workspaceIsTeam, setWorkspaceIsTeam] = useState<boolean>(false);
  const [progressData, setProgressData] = useState({
    usuario: { total: 0, concluidas: 0, atrasadas: 0 },
    equipe: { total: 0, concluidas: 0, atrasadas: 0 },
  });

  useEffect(() => {
    initializeData();
  }, []);

  const initializeData = async () => {
    try {
      const id = await getActiveWorkspaceId();
      const name = await getActiveWorkspaceName();
      setWorkspaceId(id);
      setWorkspaceName(name || '');

      if (id) {
        // Carregar informações do workspace
        await carregarInfoWorkspace(id);
        
        await Promise.all([
          carregarTarefasRecentes(id),
          carregarTarefasUrgentes(id),
          carregarDadosProgresso(id),
        ]);
      }
    } catch (error) {
      console.error('Erro ao inicializar dados do Home:', error);
    } finally {
      setLoading(false);
    }
  };

  // Carregar informações do workspace (se é de equipe ou individual)
  const carregarInfoWorkspace = async (wsId: number) => {
    try {
      const response = await apiCall(`/workspaces/id/${wsId}`, 'GET');
      setWorkspaceIsTeam(response.equipe || false);
    } catch (error) {
      console.error('Erro ao carregar informações do workspace:', error);
      setWorkspaceIsTeam(false);
    }
  };

  // Carregar dados de progresso (tarefas do usuário e da equipe)
  const carregarDadosProgresso = async (wsId: number) => {
    try {
      const todasTarefas = await apiCall(`/tarefas/workspace/${wsId}`, 'GET');
      const usuarioId = await apiCall('/usuarios/me', 'GET').then(res => res.id_usuario);
      const hoje = new Date();

      // Calcular estatísticas do usuário
      const tarefasUsuario = todasTarefas.filter((tarefa: TarefaMultiplaInterface) => 
        tarefa.id_usuario === usuarioId
      );
      
      const usuarioStats = calcularEstatisticas(tarefasUsuario, hoje);
      
      // Calcular estatísticas da equipe (todas as tarefas)
      const equipeStats = calcularEstatisticas(todasTarefas, hoje);

      setProgressData({
        usuario: usuarioStats,
        equipe: equipeStats,
      });
    } catch (error) {
      console.error('Erro ao carregar dados de progresso:', error);
    }
  };

  // Função auxiliar para calcular estatísticas
  const calcularEstatisticas = (tarefas: TarefaMultiplaInterface[], hoje: Date) => {
    const total = tarefas.length;
    const concluidas = tarefas.filter(t => t.status === 'concluido').length;
    
    const atrasadas = tarefas.filter(t => {
      if (t.status === 'concluido' || !t.data_fim) {
        return false;
      }
      const dataFim = new Date(t.data_fim);
      return dataFim < hoje;
    }).length;

    return { total, concluidas, atrasadas };
  };

  // Carregar as 3 tarefas mais recentes criadas
  const carregarTarefasRecentes = async (wsId: number) => {
    try {
      const todasTarefas = await apiCall(`/tarefas/workspace/${wsId}`, 'GET');
      const tarefasOrdenadas = todasTarefas
        .filter((tarefa: TarefaMultiplaInterface) => tarefa.status !== 'concluido')
        .sort((a: TarefaMultiplaInterface, b: TarefaMultiplaInterface) => {
          const dataA = new Date(a.data_criacao || 0).getTime();
          const dataB = new Date(b.data_criacao || 0).getTime();
          return dataB - dataA;
        })
        .slice(0, 3);
      
      setTarefasRecentes(tarefasOrdenadas);
    } catch (error) {
      console.error('Erro ao carregar tarefas recentes:', error);
    }
  };

  // Carregar as 3 tarefas mais urgentes (data fim próxima)
  const carregarTarefasUrgentes = async (wsId: number) => {
    try {
      const todasTarefas = await apiCall(`/tarefas/workspace/${wsId}`, 'GET');
      const hoje = new Date();
      
      const tarefasComDataFim = todasTarefas
        .filter((tarefa: TarefaMultiplaInterface) => {
          return tarefa.status !== 'concluido' && tarefa.data_fim;
        })
        .sort((a: TarefaMultiplaInterface, b: TarefaMultiplaInterface) => {
          const dataA = new Date(a.data_fim!).getTime();
          const dataB = new Date(b.data_fim!).getTime();
          const diffA = Math.abs(dataA - hoje.getTime());
          const diffB = Math.abs(dataB - hoje.getTime());
          return diffA - diffB;
        })
        .slice(0, 3);
      
      setTarefasUrgentes(tarefasComDataFim);
    } catch (error) {
      console.error('Erro ao carregar tarefas urgentes:', error);
    }
  };

    const handleVerTarefa = (tarefa: TarefaMultiplaInterface) => {
    try {
      navigation.navigate('VisualizaTarefa', { 
        id_tarefa: tarefa.id_tarefa,
        titulo: tarefa.titulo 
      });
    } catch (error) {
      console.error('Erro ao navegar para visualizar tarefa:', error);
    }
  };

  const formatarDataHoje = () => {
    const hoje = new Date();
    return hoje.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatarDataTarefa = (data: string | Date) => {
    const date = new Date(data);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    });
  };

  const renderTarefa = (tarefa: TarefaMultiplaInterface) => (
    <View key={tarefa.id_tarefa} style={[styles.tarefaItem, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.tarefaContent}>
        <View style={styles.tarefaInfo}>
          <Text style={[styles.tarefaTitulo, { color: theme.colors.text }]} numberOfLines={1}>
            {tarefa.titulo}
          </Text>
          {tarefa.descricao && (
            <Text style={[styles.tarefaDescricao, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {tarefa.descricao}
            </Text>
          )}
          {tarefa.data_fim && (
            <Text style={[styles.tarefaData, { color: theme.colors.textSecondary }]}>
              📅 {formatarDataTarefa(tarefa.data_fim)}
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={[styles.visualizarButton, { backgroundColor: theme.colors.background }]}
          onPress={() => handleVerTarefa(tarefa)}>
          <Text style={styles.visualizarIcon}>👁️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>Carregando dashboard...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>🏠 Dashboard</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>{workspaceName}</Text>
      </View>

      {/* Dia atual */}
      <View style={[styles.dateSection, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.dateText, { color: theme.colors.text }]}>{formatarDataHoje()}</Text>
      </View>

      {/* Gráficos de Progresso */}
      <View style={styles.progressSection}>
        {workspaceIsTeam ? (
          // Workspace de Equipe - Mostrar dois gráficos
          <>
            <ProgressChart
              title="📊 Progresso Individual"
              totalTasks={progressData.usuario.total}
              completedTasks={progressData.usuario.concluidas}
              overdueTasks={progressData.usuario.atrasadas}
            />
            <ProgressChart
              title="👥 Progresso da Equipe"
              totalTasks={progressData.equipe.total}
              completedTasks={progressData.equipe.concluidas}
              overdueTasks={progressData.equipe.atrasadas}
            />
          </>
        ) : (
          // Workspace Individual - Mostrar apenas um gráfico
          <ProgressChart
            title="📊 Meu Progresso"
            totalTasks={progressData.usuario.total}
            completedTasks={progressData.usuario.concluidas}
            overdueTasks={progressData.usuario.atrasadas}
          />
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Tarefas Mais Recentes */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>📝 Tarefas Recentes</Text>
          <View style={[styles.tarefasContainer, { backgroundColor: theme.colors.background }]}>
            {tarefasRecentes.length > 0 ? (
              tarefasRecentes.map(renderTarefa)
            ) : (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>Nenhuma tarefa recente</Text>
              </View>
            )}
          </View>
        </View>

        {/* Tarefas Mais Urgentes */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>🚨 Tarefas Urgentes</Text>
          <View style={[styles.tarefasContainer, { backgroundColor: theme.colors.background }]}>
            {tarefasUrgentes.length > 0 ? (
              tarefasUrgentes.map(renderTarefa)
            ) : (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>Nenhuma tarefa urgente</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    margin: 8,
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    marginBottom: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  dateSection: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressSection: {
    marginBottom: 16,
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  tarefasContainer: {
    borderRadius: 8,
    padding: 8,
  },
  tarefaItem: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  tarefaContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tarefaInfo: {
    flex: 1,
    marginRight: 8,
  },
  tarefaTitulo: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  tarefaDescricao: {
    fontSize: 12,
    marginBottom: 4,
  },
  tarefaData: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  visualizarButton: {
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visualizarIcon: {
    fontSize: 16,
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
});

export default HomeCard;
