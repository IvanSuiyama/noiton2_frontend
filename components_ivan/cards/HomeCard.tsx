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
  getUserEmail,
  getUserId,
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
  const [workspaceInfo, setWorkspaceInfo] = useState<any>(null);
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    initializeData();
  }, []);

  const initializeData = async () => {
    try {
      const id = await getActiveWorkspaceId();
      const email = await getUserEmail();
      
      setWorkspaceId(id);
      setUserEmail(email || '');

      if (id) {
        await Promise.all([
          carregarEstatisticas(id),
          carregarTarefasHoje(id),
          carregarWorkspaceInfo(id),
        ]);
      }
    } catch (error) {
      console.error('Erro ao inicializar dados do Home:', error);
    } finally {
      setLoading(false);
    }
  };

  const carregarWorkspaceInfo = async (id: number) => {
    try {
      const workspaceData = await apiCall(`/workspaces/${id}`, 'GET');
      setWorkspaceInfo(workspaceData);
    } catch (error) {
      console.error('Erro ao obter informações do workspace:', error);
    }
  };

  const carregarEstatisticas = async (wsId: number) => {
    try {
      const todasTarefas = await apiCall(`/tarefas/workspace/${wsId}`, 'GET');
      
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const amanha = new Date(hoje);
      amanha.setDate(amanha.getDate() + 1);

      const estatisticas = todasTarefas.reduce((acc: DashboardStats, tarefa: TarefaMultiplaInterface) => {
        acc.totalTarefas++;

        // Contar por status
        switch (tarefa.status) {
          case 'a_fazer':
            acc.tarefasPendentes++;
            break;
          case 'em_andamento':
            acc.tarefasEmProgresso++;
            break;
          case 'concluido':
            // Verificar se foi concluída hoje
            const dataConclusao = new Date(tarefa.data_criacao); // Usando data_criacao como proxy
            if (dataConclusao >= hoje && dataConclusao < amanha) {
              acc.tarefasConcluidasHoje++;
            }
            break;
          case 'atrasada':
            acc.tarefasAtrasadas++;
            break;
        }

        // Contar recorrentes
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

  const carregarTarefasHoje = async (wsId: number) => {
    try {
      const todasTarefas = await apiCall(`/tarefas/workspace/${wsId}`, 'GET');
      
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const amanha = new Date(hoje);
      amanha.setDate(amanha.getDate() + 1);

      // Filtrar tarefas para hoje (com data_fim de hoje ou tarefas pendentes sem data_fim)
      const tarefasParaHoje = todasTarefas.filter((tarefa: TarefaMultiplaInterface) => {
        if (tarefa.status === 'concluido') {
          return false;
        }
        
        if (tarefa.data_fim) {
          const dataFim = new Date(tarefa.data_fim);
          return dataFim >= hoje && dataFim < amanha;
        }
        
        // Se não tem data_fim, considerar tarefas urgentes ou de alta prioridade
        return tarefa.prioridade === 'urgente' || tarefa.prioridade === 'alta';
      }).slice(0, 3); // Limitar a 3 tarefas

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

        {/* Tarefas para Hoje */}
        <View style={styles.todaySection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>� Prioridade Hoje</Text>
            {tarefasHoje.length > 0 && (
              <TouchableOpacity onPress={() => handleNavigation('CadastroTarefa')}>
                <Text style={styles.sectionAction}>+ Nova</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {tarefasHoje.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>✅</Text>
              <Text style={styles.emptyText}>Nenhuma tarefa prioritária</Text>
              <Text style={styles.emptySubtext}>
                Você está em dia com suas tarefas!
              </Text>
              <TouchableOpacity 
                style={styles.addTaskButton}
                onPress={() => handleNavigation('CadastroTarefa')}
              >
                <Text style={styles.addTaskButtonText}>➕ Criar Tarefa</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.tasksContainer}>
              {tarefasHoje.map((tarefa, index) => (
                <TouchableOpacity
                  key={tarefa.id_tarefa}
                  style={styles.taskItem}
                  onPress={() => handleNavigation('VisualizaTarefa', { id_tarefa: tarefa.id_tarefa })}
                >
                  <View style={styles.taskContent}>
                    <View style={styles.taskInfo}>
                      <Text style={styles.taskTitle} numberOfLines={1}>
                        {tarefa.titulo}
                      </Text>
                      {tarefa.descricao && (
                        <Text style={styles.taskDescription} numberOfLines={1}>
                          {tarefa.descricao}
                        </Text>
                      )}
                      <View style={styles.taskMeta}>
                        <View style={[
                          styles.priorityBadge, 
                          { backgroundColor: getPrioridadeCor(tarefa.prioridade) }
                        ]}>
                          <Text style={styles.priorityText}>
                            {tarefa.prioridade.toUpperCase()}
                          </Text>
                        </View>
                        {tarefa.data_fim && (
                          <Text style={styles.taskDate}>
                            📅 {formatarData(tarefa.data_fim)}
                          </Text>
                        )}
                        {tarefa.recorrente && (
                          <Text style={styles.taskRecurring}>🔄</Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.taskArrow}>
                      <Text style={styles.arrowText}>›</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
              
              <TouchableOpacity 
                style={styles.viewAllButton}
                onPress={() => handleNavigation('Home')} // Navegar para tab de tarefas
              >
                <Text style={styles.viewAllButtonText}>Ver Todas as Tarefas</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Acesso Rápido */}
        <View style={styles.quickAccessSection}>
          <Text style={styles.sectionTitle}>� Acesso Rápido</Text>
          
          <View style={styles.quickActionsContainer}>
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => handleNavigation('CadastroTarefa')}
            >
              <Text style={styles.quickActionIcon}>📝</Text>
              <Text style={styles.quickActionText}>Nova Tarefa</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => handleNavigation('CadastroCategoria')}
            >
              <Text style={styles.quickActionIcon}>🏷️</Text>
              <Text style={styles.quickActionText}>Nova Categoria</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => handleNavigation('CadastroWorkspace')}
            >
              <Text style={styles.quickActionIcon}>🏢</Text>
              <Text style={styles.quickActionText}>Workspace</Text>
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
