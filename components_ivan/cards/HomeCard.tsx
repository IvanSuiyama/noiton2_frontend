import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../router';
import {
  apiCall,
  getActiveWorkspaceId,
  getActiveWorkspaceName,
  getUserEmail,
  getUserId,
  getWorkspaceByEmail,
} from '../../services/authService';
import TarefaMultiplaInterface from '../tarefa/tarefaMultiplaInterface';

interface HomeCardProps {
  navigation?: StackNavigationProp<RootStackParamList>;
}

interface DashboardStats {
  tarefasPendentes: number;
  tarefasConcluidasHoje: number;
  tarefasEmProgresso: number;
  tarefasAtrasadas: number;
  tarefasRecorrentes: number;
  totalTarefas: number;
}

interface AtividadeRecente {
  id_tarefa: number;
  titulo: string;
  acao: 'criada' | 'atualizada' | 'concluida';
  data: string;
}

const HomeCard: React.FC<HomeCardProps> = ({ navigation }) => {
  const [stats, setStats] = useState<DashboardStats>({
    tarefasPendentes: 0,
    tarefasConcluidasHoje: 0,
    tarefasEmProgresso: 0,
    tarefasAtrasadas: 0,
    tarefasRecorrentes: 0,
    totalTarefas: 0,
  });
  
  const [tarefasHoje, setTarefasHoje] = useState<TarefaMultiplaInterface[]>([]);
  const [atividades, setAtividades] = useState<AtividadeRecente[]>([]);
  const [loading, setLoading] = useState(true);
  const [workspaceId, setWorkspaceId] = useState<number | null>(null);
  const [workspaceName, setWorkspaceName] = useState<string>('');
  const [workspaceInfo, setWorkspaceInfo] = useState<any>(null);

  useEffect(() => {
    initializeData();
  }, []);

  const initializeData = async () => {
    try {
      const id = await getActiveWorkspaceId();
      const name = await getActiveWorkspaceName();
      setWorkspaceId(id);
      setWorkspaceName(name || '');

      if (id && name) {
        await Promise.all([
          carregarEstatisticas(id),
          carregarTarefasHoje(id),
          carregarWorkspaceInfo(name),
        ]);
      }
    } catch (error) {
      console.error('Erro ao inicializar dados do Home:', error);
    } finally {
      setLoading(false);
    }
  };

  // Busca workspace por nome (rota correta do backend)
  const carregarWorkspaceInfo = async (nome: string) => {
    try {
      const workspaceData = await apiCall(`/workspaces/nome/${encodeURIComponent(nome)}`, 'GET');
      setWorkspaceInfo(workspaceData);
    } catch (error) {
      console.error('Erro ao obter informações do workspace:', error);
    }
  };

  // Sempre buscar tarefas pelo id do workspace
  const carregarEstatisticas = async (wsId: number) => {
    try {
      const todasTarefas = await apiCall(`/tarefas/workspace/${wsId}`, 'GET');
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const amanha = new Date(hoje);
      amanha.setDate(amanha.getDate() + 1);

      const estatisticas = todasTarefas.reduce((acc: DashboardStats, tarefa: TarefaMultiplaInterface) => {
        acc.totalTarefas++;
        switch (tarefa.status) {
          case 'a_fazer':
            acc.tarefasPendentes++;
            break;
          case 'em_andamento':
            acc.tarefasEmProgresso++;
            break;
          case 'concluido':
            const dataConclusao = new Date(tarefa.data_criacao);
            if (dataConclusao >= hoje && dataConclusao < amanha) {
              acc.tarefasConcluidasHoje++;
            }
            break;
          case 'atrasada':
            acc.tarefasAtrasadas++;
            break;
        }
        if (tarefa.recorrente) {
          acc.tarefasRecorrentes++;
        }
        return acc;
      }, {
        tarefasPendentes: 0,
        tarefasConcluidasHoje: 0,
        tarefasEmProgresso: 0,
        tarefasAtrasadas: 0,
        tarefasRecorrentes: 0,
        totalTarefas: 0,
      });
      setStats(estatisticas);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  // Sempre buscar tarefas pelo id do workspace
  const carregarTarefasHoje = async (wsId: number) => {
    try {
      const todasTarefas = await apiCall(`/tarefas/workspace/${wsId}`, 'GET');
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const amanha = new Date(hoje);
      amanha.setDate(amanha.getDate() + 1);
      const tarefasParaHoje = todasTarefas.filter((tarefa: TarefaMultiplaInterface) => {
        if (tarefa.status === 'concluido') {
          return false;
        }
        if (tarefa.data_fim) {
          const dataFim = new Date(tarefa.data_fim);
          return dataFim >= hoje && dataFim < amanha;
        }
        return tarefa.prioridade === 'urgente' || tarefa.prioridade === 'alta';
      }).slice(0, 3);
      setTarefasHoje(tarefasParaHoje);
    } catch (error) {
      console.error('Erro ao carregar tarefas de hoje:', error);
    }
  };

  const handleNavigation = (screen: keyof RootStackParamList, params?: any) => {
    if (navigation) {
      navigation.navigate(screen as any, params);
    }
  };

  const formatarData = (data: string) => {
    const date = new Date(data);
    return date.toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'short',
    });
  };

  const getPrioridadeCor = (prioridade: string) => {
    switch (prioridade) {
      case 'baixa': return '#28a745';
      case 'media': return '#ffc107';
      case 'alta': return '#fd7e14';
      case 'urgente': return '#dc3545';
      default: return '#6c757d';
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6c757d" />
          <Text style={styles.loadingText}>Carregando dashboard...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🏠 Dashboard</Text>
        {workspaceInfo && (
          <Text style={styles.subtitle}>
            {workspaceInfo.equipe ? '👥' : '👤'} {workspaceInfo.nome}
          </Text>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Resumo de Estatísticas */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>📊 Resumo Geral</Text>
          <View style={styles.statsContainer}>
            <TouchableOpacity 
              style={styles.statItem}
              onPress={() => handleNavigation('Home')} // Navegar para tab tarefas
            >
              <Text style={[styles.statNumber, { color: '#ffc107' }]}> 
                {stats.tarefasPendentes}
              </Text>
              <Text style={styles.statLabel}>Pendentes</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.statItem}
              onPress={() => handleNavigation('Home')} // Navegar para tab tarefas
            >
              <Text style={[styles.statNumber, { color: '#28a745' }]}> 
                {stats.tarefasConcluidasHoje}
              </Text>
              <Text style={styles.statLabel}>Hoje</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.statItem}
              onPress={() => handleNavigation('Home')} // Navegar para tab tarefas
            >
              <Text style={[styles.statNumber, { color: '#17a2b8' }]}> 
                {stats.tarefasEmProgresso}
              </Text>
              <Text style={styles.statLabel}>Em Andamento</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.statsSecondRow}>
            <TouchableOpacity 
              style={styles.statItem}
              onPress={() => handleNavigation('Home')} // Navegar para tab recorrentes
            >
              <Text style={[styles.statNumber, { color: '#6f42c1' }]}> 
                {stats.tarefasRecorrentes}
              </Text>
              <Text style={styles.statLabel}>Recorrentes</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.statItem}
              onPress={() => handleNavigation('Home')}
            >
              <Text style={[styles.statNumber, { color: '#dc3545' }]}> 
                {stats.tarefasAtrasadas}
              </Text>
              <Text style={styles.statLabel}>Atrasadas</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.statItem}
              onPress={() => handleNavigation('Home')}
            >
              <Text style={[styles.statNumber, { color: '#6c757d' }]}> 
                {stats.totalTarefas}
              </Text>
              <Text style={styles.statLabel}>Total</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    flex: 1,
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  
  loadingText: {
    color: '#6c757d',
    fontSize: 16,
    marginTop: 12,
  },
  
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  
  subtitle: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
  },
  
  content: {
    flex: 1,
  },
  
  summarySection: {
    marginBottom: 24,
  },
  
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  
  sectionAction: {
    color: '#6c757d',
    fontSize: 14,
    fontWeight: '500',
  },
  
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  
  statsSecondRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 16,
  },
  
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  
  statLabel: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
  },
  
  todaySection: {
    marginBottom: 24,
  },
  
  quickAccessSection: {
    marginBottom: 16,
  },
  
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  
  quickActionButton: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#404040',
  },
  
  quickActionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  
  quickActionText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  
  emptyState: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
  },
  
  emptyIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  
  emptyText: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 6,
    fontWeight: '500',
  },
  
  emptySubtext: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 16,
  },
  
  addTaskButton: {
    backgroundColor: 'rgba(108, 117, 125, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  
  addTaskButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  
  tasksContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
  },
  
  taskItem: {
    backgroundColor: '#2a2a2a',
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#404040',
  },
  
  taskContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  taskInfo: {
    flex: 1,
    marginRight: 12,
  },
  
  taskTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  
  taskDescription: {
    color: '#6c757d',
    fontSize: 14,
    marginBottom: 8,
  },
  
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  
  priorityText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  
  taskDate: {
    color: '#6c757d',
    fontSize: 12,
  },
  
  taskRecurring: {
    fontSize: 14,
  },
  
  taskArrow: {
    padding: 4,
  },
  
  arrowText: {
    color: '#6c757d',
    fontSize: 20,
    fontWeight: '300',
  },
  
  viewAllButton: {
    backgroundColor: 'rgba(108, 117, 125, 0.3)',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 4,
  },
  
  viewAllButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default HomeCard;
